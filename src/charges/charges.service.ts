import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { Response } from 'express';
import { ChargeEntity } from '../database/entities/charge.entity';
import { ChargeInfoEntity } from '../database/entities/charge-info.entity';
import { ChargeHistoryEntity } from '../database/entities/charge-history.entity';
import { ChargeMetadataEntity } from '../database/entities/charge-metadata.entity';
import { MerchantEntity } from '../database/entities/merchant.entity';
import { IntegrationEntity } from '../database/entities/integration.entity';
import { PaymentProviderFactory } from '../providers/factory/payment-provider.factory';
import { InitiateChargeDto } from './dto/initiate-charge.dto';
import { ValidateOtpDto } from './dto/validate-otp.dto';
import { RefundChargeDto } from './dto/refund-charge.dto';
import { HashUtil } from '../common/utils/hash.util';
import { MaskUtil } from '../common/utils/mask.util';
import { PaymentException } from '../common/exceptions/payment.exception';
import { CHARGE_STATUS, PAYMENT_REQUEST_STATUS } from '../common/constants/status.constants';
import { PAYMENT_PROVIDERS, CURRENCY_CODES } from '../common/constants/payment.constants';
import { ERROR_CODES, ERROR_MESSAGES } from '../common/constants/error.constants';

interface MerchantInfo {
  id: string;
  name: string;
  logo_url: string | null;
}

interface PaymentResponse {
  status: 'success' | 'error';
  message?: string;
  data?: any;
  error?: {
    message: string;
    code?: number;
    action_required?: string;
  };
}

interface PaymentChannel {
  id: number;
  identifier: string;
  name: string;
  logo_url: string;
  type: string;
  status: string;
  description?: string;
  template_url: string;
  min_amount: number;
  max_amount: number;
}

interface ChargeResponse {
  status: string;
  data: {
    merchant_name: string;
    charge_info_id: number;
    merchant_logo_url: string | null;
    charge_identifier: string;
    channels: PaymentChannel[];
    view_url: string;
    callback: string;
    phone: string | null;
    email: string;
    amount: number;
    currency: string;
    reference: string;
  };
}

enum ChargeStatus {
  PENDING = 'pending',
  SUCCESSFUL = 'successful',
  FAILED = 'failed',
}

@Injectable()
export class ChargesService {
  private readonly logger = new Logger(ChargesService.name);
  private readonly minAmount = 10;

  constructor(
    @InjectRepository(ChargeEntity)
    private readonly chargeRepository: Repository<ChargeEntity>,
    @InjectRepository(ChargeInfoEntity)
    private readonly chargeInfoRepository: Repository<ChargeInfoEntity>,
    @InjectRepository(ChargeHistoryEntity)
    private readonly chargeHistoryRepository: Repository<ChargeHistoryEntity>,
    @InjectRepository(ChargeMetadataEntity)
    private readonly chargeMetadataRepository: Repository<ChargeMetadataEntity>,
    @InjectRepository(MerchantEntity)
    private readonly merchantRepository: Repository<MerchantEntity>,
    @InjectRepository(IntegrationEntity)
    private readonly integrationRepository: Repository<IntegrationEntity>,
    private readonly dataSource: DataSource,
    private readonly configService: ConfigService,
    private readonly paymentProviderFactory: PaymentProviderFactory,
    @InjectQueue('settle-charge') private readonly queue: Queue,
  ) {}

  async initiateCharge(dto: InitiateChargeDto, res: Response): Promise<ChargeResponse> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      this.validateRequestHash(dto);
      await this.checkDuplicateTransaction(dto.reference);

      const { merchantInfo, integrationInfo } = await this.getMerchantOrIntegration(dto);
      const chargeInfo = await this.createChargeInfo(dto, merchantInfo, integrationInfo);
      const channels = await this.getPaymentChannels(chargeInfo.amount);

      const response: ChargeResponse = {
        status: 'success',
        data: {
          merchant_name: merchantInfo.name,
          charge_info_id: chargeInfo.id,
          merchant_logo_url: merchantInfo.logo_url,
          charge_identifier: HashUtil.generateIdentifier(6),
          channels,
          view_url: `${this.configService.get('SDK_BASE_URL')}/${chargeInfo.id}/${HashUtil.generateIdentifier(6)}`,
          callback: chargeInfo.callback,
          phone: chargeInfo.phone,
          email: chargeInfo.email,
          amount: chargeInfo.amount,
          currency: chargeInfo.currency,
          reference: chargeInfo.merchantReference,
        },
      };

      if (dto.use_view) {
        res.status(200).json({ view_url: response.data.view_url });
      } else {
        res.status(200).json(response);
      }

      await queryRunner.commitTransaction();
      return response;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error('Error initiating charge:', error);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async validateOtp(dto: ValidateOtpDto) {
    const charge = await this.findPendingCharge(dto.identifier);
    const provider = this.paymentProviderFactory.getProvider(PAYMENT_PROVIDERS.PAYSTACK);

    try {
      const result = await provider.submitValidation(dto.identifier, {
        type: 'otp',
        otp: dto.otp,
      });

      await this.logChargeHistory(charge.id, {
        description: 'OTP validation attempted',
        responseMessage: result.message,
        status: result.success ? CHARGE_STATUS.SUCCESSFUL : CHARGE_STATUS.FAILED,
        activity: 'OTP_VALIDATION',
        response: result.data,
      });

      if (result.success) {
        await this.markChargeAsSuccessful(charge);
      }

      return result;
    } catch (error) {
      this.logger.error('Error validating OTP:', error);
      await this.logChargeHistory(charge.id, {
        description: 'OTP validation failed',
        responseMessage: error.message,
        status: CHARGE_STATUS.FAILED,
        activity: 'OTP_VALIDATION',
      });
      throw error;
    }
  }

  async submitValidation(dto: any) {
    const charge = await this.findPendingCharge(dto.identifier);
    const provider = this.paymentProviderFactory.getProvider(
      (charge.service as any) || PAYMENT_PROVIDERS.PAYSTACK,
    );

    try {
      const result = await provider.submitValidation(dto.identifier, {
        type: dto.type,
        ...dto.data,
      });

      await this.logChargeHistory(charge.id, {
        description: `${dto.type.toUpperCase()} validation attempted`,
        responseMessage: result.message,
        status: result.success ? CHARGE_STATUS.SUCCESSFUL : CHARGE_STATUS.FAILED,
        activity: `${dto.type.toUpperCase()}_VALIDATION`,
        response: result.data,
      });

      if (
        result.success ||
        (result.action_required && result.action_required.includes('completed'))
      ) {
        await this.markChargeAsSuccessful(charge);
      }

      return result;
    } catch (error) {
      this.logger.error(`Error submitting ${dto.type} validation:`, error);
      await this.logChargeHistory(charge.id, {
        description: `${dto.type.toUpperCase()} validation failed`,
        responseMessage: error.message,
        status: CHARGE_STATUS.FAILED,
        activity: `${dto.type.toUpperCase()}_VALIDATION`,
      });
      throw error;
    }
  }

  async cancelCharge(identifier: string) {
    const charge = await this.findCharge(identifier);
    await this.chargeRepository.update({ id: charge.id }, { status: CHARGE_STATUS.CANCELLED });
    await this.logChargeHistory(charge.id, {
      description: 'Charge cancelled by user',
      responseMessage: 'Cancelled',
      status: CHARGE_STATUS.CANCELLED,
      activity: 'CHARGE_CANCELLED',
    });

    return { message: 'Charge cancelled successfully' };
  }

  async refundCharge(dto: RefundChargeDto) {
    const chargeInfo = await this.chargeInfoRepository.findOne({
      where: { merchantReference: dto.reference, merchantId: dto.merchant_id },
      relations: ['charges'],
    });

    if (!chargeInfo) {
      throw new NotFoundException(ERROR_MESSAGES.TRANSACTION_NOT_FOUND);
    }

    const successfulCharge = chargeInfo.charges.find(
      (c) => c.status === CHARGE_STATUS.SUCCESSFUL && c.successful,
    );

    if (!successfulCharge) {
      throw new BadRequestException('No successful charge found for refund');
    }

    if (dto.amount > chargeInfo.amount) {
      throw new BadRequestException('Refund amount exceeds original charge amount');
    }

    try {
      const provider = this.paymentProviderFactory.getProvider(
        (successfulCharge.service as any) || PAYMENT_PROVIDERS.PAYSTACK,
      );

      await this.logChargeHistory(successfulCharge.id, {
        description: 'Refund requested',
        responseMessage: 'Refund processing',
        status: CHARGE_STATUS.PROCESSING,
        activity: 'REFUND_REQUESTED',
        response: { refund_amount: dto.amount },
      });

      return {
        message: 'Refund request submitted successfully',
        refund_amount: dto.amount,
        original_amount: chargeInfo.amount,
      };
    } catch (error) {
      this.logger.error('Error processing refund:', error);
      throw new PaymentException('Failed to process refund');
    }
  }

  async getChargeByIdentifier(identifier: string) {
    const charge = await this.findCharge(identifier, ['chargeInfo', 'history', 'metadata']);
    return {
      id: charge.id,
      identifier: charge.identifier,
      amount: charge.amount,
      currency: charge.currency,
      status: charge.status,
      successful: charge.successful,
      description: charge.description,
      email: MaskUtil.maskEmail(charge.email),
      phone: charge.phone ? MaskUtil.maskPhone(charge.phone) : null,
      merchant_name: charge.merchantName,
      created_at: charge.createdAt,
      updated_at: charge.updatedAt,
    };
  }

  async requeryCharge(identifier: string) {
    const charge = await this.findCharge(identifier);
    const provider = this.paymentProviderFactory.getProvider(
      (charge.service as any) || PAYMENT_PROVIDERS.PAYSTACK,
    );

    try {
      const result = await provider.verifyTransaction(identifier);
      if (result.success && !charge.successful) {
        await this.markChargeAsSuccessful(charge);
      }

      return {
        status: charge.status,
        successful: charge.successful,
        amount: charge.amount,
        provider_status: result.data,
      };
    } catch (error) {
      this.logger.error('Error querying charge:', error);
      return {
        status: charge.status,
        successful: charge.successful,
        amount: charge.amount,
      };
    }
  }

  async settleCharge(
    chargeId: number,
    settlementData: { reason: string; extra_data?: Record<string, any> },
  ) {
    const charge = await this.findChargeById(chargeId);
    if (charge.settled) {
      throw new BadRequestException('Charge already settled');
    }

    await this.chargeRepository.update({ id: chargeId }, { settled: true });
    await this.logChargeHistory(chargeId, {
      description: settlementData.reason,
      responseMessage: 'Manual settlement',
      status: CHARGE_STATUS.SUCCESSFUL,
      activity: 'MANUAL_SETTLEMENT',
      response: settlementData.extra_data,
    });

    return { message: 'Charge settled successfully' };
  }

  private validateRequestHash(dto: InitiateChargeDto): void {
    const publicKey = dto.public_key || 'temp_key';
    const discountString = dto.discount ? JSON.stringify(dto.discount) : '';
    const isValid = HashUtil.validateHash(
      parseFloat(dto.amount),
      publicKey,
      dto.reference,
      dto.hash,
      discountString,
    );

    if (!isValid) {
      throw new PaymentException(ERROR_MESSAGES.INVALID_HASH, 400, ERROR_CODES.INVALID_HASH);
    }
  }

  private async checkDuplicateTransaction(reference: string): Promise<void> {
    const existingCharge = await this.chargeInfoRepository.findOne({
      where: { merchantReference: reference },
    });
    if (existingCharge) {
      throw new PaymentException(
        'Transaction already initiated',
        400,
        ERROR_CODES.TRANSACTION_ALREADY_INITIATED,
      );
    }
  }

  private async getMerchantOrIntegration(dto: InitiateChargeDto): Promise<{
    merchantInfo: any;
    integrationInfo?: IntegrationEntity;
  }> {
    if (dto.merchant_id) {
      return { merchantInfo: await this.getMerchantDetails(dto.merchant_id) };
    } else if (dto.public_key) {
      const integrationInfo = await this.getIntegrationByPublicKey(dto.public_key);
      return {
        merchantInfo: {
          id: integrationInfo.id,
          name: integrationInfo.name,
          logo_url: integrationInfo.configs?.logo_url,
        },
        integrationInfo,
      };
    }
    throw new PaymentException(
      'Merchant ID or public key is required',
      400,
      ERROR_CODES.INVALID_MERCHANT,
    );
  }

  private async getMerchantDetails(merchantId: string): Promise<MerchantInfo> {
    return {
      id: merchantId,
      name: 'Test Merchant',
      logo_url: null,
    };
  }

  private async getIntegrationByPublicKey(publicKey: string): Promise<IntegrationEntity> {
    const integration = await this.integrationRepository.findOne({ where: { publicKey } });
    if (!integration) {
      throw new PaymentException(
        ERROR_MESSAGES.INVALID_MERCHANT,
        400,
        ERROR_CODES.INVALID_MERCHANT,
      );
    }
    return integration;
  }

  private async createChargeInfo(
    dto: InitiateChargeDto,
    merchantInfo: MerchantInfo,
    integrationInfo?: IntegrationEntity,
  ): Promise<ChargeInfoEntity> {
    const chargeInfo = this.chargeInfoRepository.create({
      amount: parseFloat(dto.amount) / 100,
      merchantReference: dto.reference,
      customerId: dto.customer_id,
      description: dto.description,
      email: dto.email,
      phone: dto.phone,
      callback: dto.callback,
      settlementAccount: dto.settlement_account,
      livemode: dto.mode !== 'live',
      currency: dto.currency || CURRENCY_CODES.NGN,
      merchantId: merchantInfo.id,
      integrationId: integrationInfo?.id,
      merchantName: merchantInfo.name,
      logoUrl: merchantInfo.logo_url,
      status: PAYMENT_REQUEST_STATUS.ENABLED,
    });

    return this.chargeInfoRepository.save(chargeInfo);
  }

  private async getPaymentChannels(amount: number): Promise<PaymentChannel[]> {
    return [
      {
        id: 1,
        identifier: 'card',
        name: 'Card',
        logo_url: '/img/credit-card.svg',
        type: 'card',
        status: 'enabled',
        description: 'Make payments with your credit or debit card.',
        template_url: 'card/form',
        min_amount: this.minAmount,
        max_amount: 1000000,
      },
      {
        id: 2,
        identifier: 'bank_transfer',
        name: 'Bank Transfer',
        type: 'transfer',
        status: 'enabled',
        template_url: 'transfer/form',
        logo_url: '/img/transfer-icon.svg',
        min_amount: this.minAmount,
        max_amount: 5000000,
      },
    ];
  }

  private async logChargeHistory(
    chargeId: number,
    data: {
      description: string;
      responseMessage: string;
      status: string;
      activity: string;
      response?: any;
    },
  ): Promise<void> {
    const history = this.chargeHistoryRepository.create({
      chargeId,
      description: data.description,
      responseMessage: data.responseMessage,
      status: data.status as ChargeStatus,
      activity: data.activity,
      response: data.response ? JSON.stringify(data.response) : null,
    });

    await this.chargeHistoryRepository.save(history);
  }

  private async findPendingCharge(identifier: string): Promise<ChargeEntity> {
    const charge = await this.chargeRepository.findOne({
      where: { identifier, status: CHARGE_STATUS.PENDING },
      relations: ['chargeInfo'],
    });
    if (!charge) {
      throw new NotFoundException(ERROR_MESSAGES.TRANSACTION_NOT_FOUND);
    }
    return charge;
  }

  private async findCharge(identifier: string, relations: string[] = []): Promise<ChargeEntity> {
    const charge = await this.chargeRepository.findOne({ where: { identifier }, relations });
    if (!charge) {
      throw new NotFoundException(ERROR_MESSAGES.TRANSACTION_NOT_FOUND);
    }
    return charge;
  }

  private async findChargeById(id: number): Promise<ChargeEntity> {
    const charge = await this.chargeRepository.findOne({ where: { id } });
    if (!charge) {
      throw new NotFoundException(ERROR_MESSAGES.TRANSACTION_NOT_FOUND);
    }
    return charge;
  }

  private async markChargeAsSuccessful(charge: ChargeEntity): Promise<void> {
    await this.queue.add('settle', { charge_id: charge.id, settle: true }, {});
  }

  async paystackValidation(validationDto: any, res: any) {
    try {
      // Get charge by identifier or charge_info_id
      const chargeIdentifier = validationDto.identifier || validationDto.charge_info_id;

      if (!chargeIdentifier) {
        throw new PaymentException('Either identifier or charge_info_id must be provided');
      }

      const charge = await this.findCharge(chargeIdentifier);

      // Get the Paystack provider
      const paystackProvider = this.paymentProviderFactory.getProvider(PAYMENT_PROVIDERS.PAYSTACK);

      // Call submitValidationWithCharge method from PaystackService
      const result = await (paystackProvider as any).submitValidationWithCharge(
        charge.id,
        validationDto.validation,
        validationDto.token,
      );

      // Log charge history
      await this.logChargeHistory(charge.id, {
        description: 'Paystack validation submitted',
        responseMessage: result.message || 'Validation processed',
        status: result.action_required?.includes('completed')
          ? CHARGE_STATUS.SUCCESSFUL
          : CHARGE_STATUS.PENDING,
        activity: 'PAYSTACK_VALIDATION',
        response: result,
      });

      // Mark charge as successful if completed
      if (result.action_required?.includes('completed')) {
        await this.markChargeAsSuccessful(charge);
      }

      return this.sendResponse(res, {
        status: 'success',
        message: result.message,
        data: {
          action_required: result.action_required,
          ...result.data,
        },
      });
    } catch (error) {
      this.logger.error('Error in Paystack validation:', error);
      throw new PaymentException(error.message || 'Paystack validation failed');
    }
  }

  async requeryPaystackCharge(requeryDto: any, res: any) {
    try {
      const charge = await this.findCharge(requeryDto.identifier || requeryDto.charge_identifier);
      const paystackProvider = this.paymentProviderFactory.getProvider(PAYMENT_PROVIDERS.PAYSTACK);
      const result = await (paystackProvider as any).queryChargeStatus(charge.id);

      await this.logChargeHistory(charge.id, {
        description: 'Paystack charge requery',
        responseMessage: result.message || 'Charge status queried',
        status: result.action_required?.includes('completed')
          ? CHARGE_STATUS.SUCCESSFUL
          : CHARGE_STATUS.PENDING,
        activity: 'PAYSTACK_REQUERY',
        response: result,
      });

      // Mark charge as successful if completed
      if (result.action_required?.includes('completed')) {
        await this.markChargeAsSuccessful(charge);
      }
      return this.sendResponse(res, {
        status: 'success',
        message: result.message,
        data: {
          action_required: result.action_required,
          ...result.data,
        },
      });
    } catch (error) {
      this.logger.error('Error in Paystack requery:', error);
      throw new PaymentException(error.message || 'Paystack requery failed');
    }
  }
  private sendResponse(res: Response, response: PaymentResponse): void {
    res.status(response.status === 'success' ? 200 : 400).json(response);
  }
}
