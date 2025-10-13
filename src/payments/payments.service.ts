import { Injectable, Logger, BadRequestException, NotFoundException, InternalServerErrorException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Response } from 'express';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { ChargeEntity } from '../database/entities/charge.entity';
import { ChargeInfoEntity } from '../database/entities/charge-info.entity';
import { CardPaymentStrategy } from './strategies/card-payment.strategy';
import { TransferPaymentStrategy } from './strategies/transfer-payment.strategy';
import { CardPaymentDto, TransferPaymentDto, MobilePaymentDto } from './dto/payment.dto';
import { PAYMENT_METHODS, PAYMENT_PROVIDERS } from '../common/constants/payment.constants';
import { CHARGE_STATUS } from '../common/constants/status.constants';

interface PaymentResponse {
  status: 'success' | 'error';
  data?: any;
  error?: {
    message: string;
    code?: number;
    action_required?: string;
  };
}

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    @InjectRepository(ChargeEntity)
    private readonly chargeRepository: Repository<ChargeEntity>,
    @InjectRepository(ChargeInfoEntity)
    private readonly chargeInfoRepository: Repository<ChargeInfoEntity>,
    private readonly cardPaymentStrategy: CardPaymentStrategy,
    private readonly transferPaymentStrategy: TransferPaymentStrategy,
    @InjectQueue('settle-charge') private readonly queue: Queue,
  ) {}

  async processCardPayment(dto: CardPaymentDto, res: Response): Promise<void> {
    try {
      this.logger.log(`Initiating card payment processing: ${dto.identifier}`);

      this.validateCardPaymentDto(dto);
      const chargeInfo = await this.findChargeInfo(dto.charge_info_id);
      const charge = await this.createCharge(chargeInfo, dto.identifier, PAYMENT_PROVIDERS.PAYSTACK);

      const result = await this.cardPaymentStrategy.processPayment({
        amount: chargeInfo.amount,
        currency: chargeInfo.currency,
        email: chargeInfo.email,
        phone: chargeInfo.phone,
        merchant_reference: chargeInfo.merchantReference,
        reference: dto.identifier,
        description: chargeInfo.description,
        pan: dto.pan,
        cvv: dto.cvv,
        expiry: dto.expiry,
        pin: dto.pin,
      });

      await this.queueSettlement(charge.id);
      this.sendResponse(res, { status: 'success', data: result });
    } catch (error) {
      console.log(JSON.stringify(error), error.message || error.data);
      throw new InternalServerErrorException('Failed to process card payment');
    }
  }

  async processTransferPayment(dto: TransferPaymentDto, res: Response): Promise<void> {
    try {
      this.logger.log(`Initiating transfer payment processing: ${dto.identifier}`);

      await this.validateTransferPaymentDto(dto);
      const chargeInfo = await this.findChargeInfo(dto.charge_info_id);
      const charge = await this.createCharge(chargeInfo, dto.identifier);

      const result = await this.transferPaymentStrategy.processPayment({
        amount: chargeInfo.amount,
        currency: chargeInfo.currency,
        email: chargeInfo.email,
        reference: dto.identifier,
        description: chargeInfo.description || dto.description,
        customerName: dto.name,
        merchant_name: chargeInfo.merchantName,
      });

      if (result.status === 'success') {
        await this.queueSettlement(charge.id);
      }

      this.sendResponse(res, { status: 'success', data: result });
    } catch (error) {
      this.handleError(res, error, `Transfer payment processing failed: ${dto.identifier}`);
    }
  }

  async processMobilePayment(dto: MobilePaymentDto): Promise<void> {
    this.logger.warn(`Mobile payment attempted but not implemented: ${dto.identifier}`);
    throw new BadRequestException('Mobile payments are not yet supported');
  }

  async verifyPayment(reference: string, paymentMethod: string = PAYMENT_METHODS.CARD): Promise<PaymentResponse> {
    try {
      this.logger.log(`Verifying payment: ${reference} (method: ${paymentMethod})`);

      if (!reference) {
        throw new BadRequestException('Payment reference is required');
      }

      switch (paymentMethod) {
        case PAYMENT_METHODS.CARD:
          return { status: 'success', data: await this.cardPaymentStrategy.verifyPayment(reference) };
        case PAYMENT_METHODS.BANK_TRANSFER:
          return { status: 'success', data: await this.transferPaymentStrategy.verifyPayment(reference) };
        default:
          throw new BadRequestException(`Unsupported payment method: ${paymentMethod}`);
      }
    } catch (error) {
      this.logger.error(`Payment verification failed: ${reference}`, error.stack);
      return this.formatErrorResponse(error);
    }
  }

  private async findChargeInfo(chargeInfoId: number): Promise<ChargeInfoEntity> {
    if (!chargeInfoId) {
      throw new BadRequestException('Charge info ID is required');
    }

    const chargeInfo = await this.chargeInfoRepository.findOne({
      where: { id: chargeInfoId },
    });

    if (!chargeInfo) {
      throw new NotFoundException(`Charge info not found for ID: ${chargeInfoId}`);
    }

    return chargeInfo;
  }

  private async createCharge(chargeInfo: ChargeInfoEntity, identifier: string, service?: string): Promise<ChargeEntity> {
    try {
      const charge = this.chargeRepository.create({
        identifier,
        amount: chargeInfo.amount,
        currency: chargeInfo.currency,
        description: chargeInfo.description,
        email: chargeInfo.email,
        phone: chargeInfo.phone,
        service,
        customerId: chargeInfo.customerId,
        merchantId: chargeInfo.merchantId,
        merchantName: chargeInfo.merchantName,
        status: CHARGE_STATUS.PENDING,
        successful: false,
        settled: false,
        logoUrl: chargeInfo.logoUrl,
        chargeInfoId: chargeInfo.id,
        livemode: chargeInfo.livemode,
      });

      return await this.chargeRepository.save(charge);
    } catch (error) {
      this.logger.error(`Failed to create charge for identifier: ${identifier}`, error.stack);
      throw new InternalServerErrorException('Failed to create charge');
    }
  }

  private async queueSettlement(chargeId: number): Promise<void> {
    try {
      await this.queue.add('settle', { charge_id: chargeId, settle: true });
      this.logger.log(`Settlement queued for charge ID: ${chargeId}`);
    } catch (error) {
      this.logger.error(`Failed to queue settlement for charge ID: ${chargeId}`, error.stack);
      throw new InternalServerErrorException('Failed to queue settlement');
    }
  }

  private validateCardPaymentDto(dto: CardPaymentDto): void {
    if (!dto.pan || !dto.cvv || !dto.expiry) {
      throw new BadRequestException('Card details are incomplete');
    }
    if (!dto.identifier) {
      throw new BadRequestException('Payment identifier is required');
    }
    if (!dto.charge_info_id) {
      throw new BadRequestException('Charge info ID is required');
    }
  }

  private validateTransferPaymentDto(dto: TransferPaymentDto): void {
    if (!dto.name) {
      throw new BadRequestException('Customer name is required');
    }
    if (!dto.identifier) {
      throw new BadRequestException('Payment identifier is required');
    }
    if (!dto.charge_info_id) {
      throw new BadRequestException('Charge info ID is required');
    }
  }

  private sendResponse(res: Response, response: PaymentResponse): void {
    res.status(response.status === 'success' ? 200 : 400).json(response);
  }

  private handleError(res: Response, error: any, logMessage: string): void {
    this.logger.error(logMessage, error.stack);
    this.sendResponse(res, this.formatErrorResponse(error));
  }

  private formatErrorResponse(error: any): PaymentResponse {
    if (error instanceof BadRequestException || error instanceof NotFoundException || error instanceof InternalServerErrorException) {
      return {
        status: 'error',
        error: {
          message: error.message,
          code: error.getStatus(),
          action_required: 'terminate',
        },
      };
    }

    return {
      status: 'error',
      error: {
        message: 'An unexpected error occurred',
        code: 500,
        action_required: 'terminate',
      },
    };
  }
}

console.log(
  JSON.stringify({
    cvv: '408',
    expiry: '0926',
    charge_info_id: '39',
    pan: '4084084084084081',
    pin: '0000',
    _csrf: 'uQ07nJCf-p_t1srcEh6yWEqihHW9L9ICqzBc',
    token: '87mknv2646vm2sbm30gb8q',
    ip_address: '127.0.0.1',
    customized: 'true',
    callback_url: 'http://127.0.0.1:4200/v2/3dsecure/verify/87mknv2646vm2sbm30gb8q',
    device: {
      httpBrowserLanguage: 'en-GB',
      httpBrowserJavaEnabled: 'false',
      httpBrowserJavaScriptEnabled: 'true',
      httpBrowserColorDepth: '24',
      httpBrowserScreenHeight: '1050',
      httpBrowserScreenWidth: '1680',
      httpBrowserTimeDifference: '-60',
      userAgentBrowserValue: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36',
    },
    customer_name: 'Chioma Adeleke',
    metadata: [{ name: 'mobile_number', value: '+2348012345678' }, { name: 'items', value: [Array] }, { name: 'referrer' }],
    identifier: 'CH_2025101395828_45R1EV',
  }),
);
