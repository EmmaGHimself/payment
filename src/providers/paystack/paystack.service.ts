import { BadRequestException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import * as crypto from 'crypto';
import { BasePaymentProvider } from '../base/base-payment-provider';
import { CircuitBreakerService } from '../base/circuit-breaker.service';
import {
  PaymentRequest,
  PaymentResponse,
} from '../../common/interfaces/payment-provider.interface';
import { PAYMENT_PROVIDERS } from '../../common/constants/payment.constants';
import { MaskUtil } from '../../common/utils/mask.util';
import { ChargeMetadataEntity } from '../../database/entities/charge-metadata.entity';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { RESPONSE_STATUS } from '@/common/constants';
import { response } from 'express';

@Injectable()
export class PaystackService extends BasePaymentProvider {
  constructor(
    httpService: HttpService,
    configService: ConfigService,
    circuitBreakerService: CircuitBreakerService,
    @InjectRepository(ChargeMetadataEntity)
    private readonly chargeMetadataRepository: Repository<ChargeMetadataEntity>,
  ) {
    super(httpService, configService, circuitBreakerService, PAYMENT_PROVIDERS.PAYSTACK);
  }

  getName() {
    return PAYMENT_PROVIDERS.PAYSTACK;
  }

  async createCharge(request: PaymentRequest): Promise<any> {
    try {
      const payload = {
        email: request.email,
        amount: request.amount * 100, // Paystack expects amount in kobo
        reference: request.reference,
        currency: 'NGN', // request.currency,
        card: request.card,
        pin: request.pin,
        metadata: {
          custom_fields: [
            {
              display_name: 'Merchant reference',
              variable_name: 'merchant_reference',
              value: request.merchant_reference,
            },
            {
              display_name: 'Identifier',
              variable_name: 'identifier',
              value: request.reference,
            },
          ],
        },
      };

      const response = await this.makeRequest('POST', '/charge', payload);

      const nextAction = this.getNextAction(response.data.status as string);

      if (nextAction.includes('completed')) {
        await Promise.all([
          this.chargeMetadataRepository.save(
            this.chargeMetadataRepository.create([
              {
                name: 'paystack_charge_reference',
                value: response.data.reference,
                chargeId: request.charge.id,
              },
              {
                name: 'paystack_validation_type',
                value: response.data.status,
                chargeId: request.charge.id,
              },
            ]),
          ),
        ]);
        return {
          ...response.data,
          status: RESPONSE_STATUS.SUCCESS,
          message: response.data.message, //response.data.display_text || response.data.message,
          action_required: nextAction,
        };
      }
      if (nextAction === 'terminate') throw new InternalServerErrorException(response);
      await Promise.all([
        this.chargeMetadataRepository.save(
          this.chargeMetadataRepository.create([
            {
              name: 'paystack_charge_reference',
              value: response.data.reference,
              chargeId: request.charge.id,
            },
            {
              name: 'paystack_validation_type',
              value: response.data.status,
              chargeId: request.charge.id,
            },
          ]),
        ),
      ]);
      return {
        data: response.data,
        action_required: nextAction,
        status: RESPONSE_STATUS.SUCCESS,
        message: response.data.message, //response.data.display_text || response.data.message,
      };
    } catch (error) {
      throw new InternalServerErrorException(
        error.response?.data?.data?.message || error?.data?.message || 'Charge creation failed',
      );
    }
  }

  async verifyTransaction(reference: string): Promise<PaymentResponse> {
    try {
      const response = await this.makeRequest('GET', `/transaction/verify/${reference}`);

      if (response.data.status && response.data.data.status === 'success') {
        return {
          success: true,
          reference,
          message: response.data.message,
          data: response.data.data,
        };
      }

      return {
        success: false,
        reference,
        message: response.data.message || 'Transaction verification failed',
        data: response.data.data,
      };
    } catch (error) {
      return this.handleError(error);
    }
  }

  async submitValidation(
    reference: string,
    validationData: Record<string, any>,
  ): Promise<PaymentResponse> {
    try {
      const { type, ...data } = validationData;
      let endpoint = '';

      switch (type) {
        case 'otp':
          endpoint = '/charge/submit_otp';
          break;
        case 'pin':
          endpoint = '/charge/submit_pin';
          break;
        case 'phone':
          endpoint = '/charge/submit_phone';
          break;
        case 'birthday':
          endpoint = '/charge/submit_birthday';
          break;
        case 'address':
          endpoint = '/charge/submit_address';
          break;
        default:
          throw new Error(`Unsupported validation type: ${type}`);
      }

      const payload = {
        reference,
        ...data,
      };

      const response = await this.makeRequest('POST', endpoint, payload);

      return {
        success: response.data.status,
        reference,
        message: response.data.message,
        data: response.data.data,
        action_required: this.getNextAction(response.data?.status),
      };
    } catch (error) {
      throw new BadRequestException(error.message || 'Validation submission failed');
      // return this.handleError(error);
    }
  }

  async submitValidationWithCharge(chargeId: number, validationData: Record<string, any>, token?: string): Promise<any> {
    try {
      // Get charge metadata to retrieve paystack reference and validation type
      const metadata = await this.chargeMetadataRepository.find({
        where: { chargeId },
      });

      const paystackReference = metadata.find((m) => m.name === 'paystack_charge_reference');
      const validationType = metadata.find((m) => m.name === 'paystack_validation_type');

      if (!paystackReference) {
        throw new BadRequestException('Paystack reference not found for this charge');
      }

      // Determine validation type from the data provided
      let detectedType = validationType?.value || '';
      if (validationData.pin) {
        detectedType = 'send_pin';
      } else if (validationData.otp) {
        detectedType = 'send_otp';
      } else if (validationData.phone) {
        detectedType = 'send_phone';
      } else if (validationData.birthday) {
        detectedType = 'send_birthday';
      } else if (validationData.address) {
        detectedType = 'send_address';
      }

      const validationRoute = this.getValidationRoute(detectedType);

      const payload = {
        reference: paystackReference.value,
        ...validationData,
      };

      const response = await this.makeRequest('POST', validationRoute, payload);

      return this.handleChargeResponse(response);
    } catch (error) {
      throw new InternalServerErrorException(
        error.response?.data?.message || error?.message || 'Validation submission failed',
      );
    }
  }

  async queryChargeStatus(chargeId: number): Promise<any> {
    try {
      // Get charge metadata to retrieve paystack reference
      const metadata = await this.chargeMetadataRepository.find({
        where: { chargeId },
      });

      const paystackReference = metadata.find((m) => m.name === 'paystack_charge_reference');

      if (!paystackReference) {
        throw new BadRequestException('Paystack reference not found for this charge');
      }

      const response = await this.makeRequest('GET', `/charge/${paystackReference.value}`);

      return this.handleChargeResponse(response);
    } catch (error) {
      throw new InternalServerErrorException(
        error.response?.data?.message || error?.message || 'Query charge status failed',
      );
    }
  }

  private getValidationRoute(status: string): string {
    const routeMap: Record<string, string> = {
      send_pin: '/charge/submit_pin',
      send_phone: '/charge/submit_phone',
      send_birthday: '/charge/submit_birthday',
      send_address: '/charge/submit_address',
      send_otp: '/charge/submit_otp',
    };

    return routeMap[status] || '/charge/submit_otp';
  }

  private handleChargeResponse(charge: any): any {
    // Check if charge status is false or failed
    if (charge.status === false || charge.data?.status === 'failed') {
      throw new BadRequestException({
        message: charge.data ? charge.data.message : 'Payment failed',
        terminate_request: true,
        action_required: 'terminate',
      });
    }

    // Check if charge is successful
    if (charge.data?.status === 'success') {
      const nextAction = this.getNextAction(charge.data.status);
      return {
        ...charge,
        message: charge.data.display_text || charge.data.message,
        action_required: nextAction,
      };
    }

    const nextAction = this.getNextAction(charge.data?.status);

    // Check if next action is terminate
    if (nextAction === 'terminate') {
      throw new BadRequestException({
        message: charge.data?.display_text || charge.data?.message || 'Transaction failed',
        terminate_request: true,
        action_required: 'terminate',
      });
    }

    return {
      ...charge,
      message: charge.data?.display_text || charge.data?.message,
      action_required: nextAction,
    };
  }

  async processWebhook(payload: Record<string, any>, signature: string): Promise<PaymentResponse> {
    try {
      if (!this.verifyWebhookSignature(payload, signature)) {
        throw new Error('Invalid webhook signature');
      }

      const { event, data } = payload;
      const reference = data.reference;

      let success = false;
      let message = 'Webhook processed';

      switch (event) {
        case 'charge.success':
          success = data.status === 'success';
          message = success ? 'Payment successful' : 'Payment failed';
          break;
        case 'transfer.success':
        case 'transfer.failed':
          success = event === 'transfer.success';
          message = success ? 'Transfer successful' : 'Transfer failed';
          break;
      }

      return {
        success,
        reference,
        message,
        data,
      };
    } catch (error) {
      return this.handleError(error);
    }
  }

  protected getDefaultHeaders(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.config.credentials.secretKey}`,
    };
  }

  private verifyWebhookSignature(payload: any, signature: string): boolean {
    const hash = crypto
      .createHmac('sha512', this.config.credentials.webhookSecret)
      .update(JSON.stringify(payload))
      .digest('hex');

    return hash === signature;
  }

  private getNextAction(status: string): string | undefined {
    const actionMap: Record<string, string> = {
      pending: 'paystack_requery',
      timeout: 'terminate',
      send_pin: 'paystack_enter_pin',
      send_phone: 'paystack_enter_phone',
      send_birthday: 'paystack_enter_birthday',
      send_address: 'paystack_enter_address',
      send_otp: 'paystack_enter_otp',
      open_url: 'paystack_open_url',
      pay_offline: 'paystack_pay_offline',
      failed: 'terminate',
      success: 'paystack_completed',
    };

    return actionMap[status];
  }
}
