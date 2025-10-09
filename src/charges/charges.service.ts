import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { ConfigService } from '@nestjs/config';
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
import { ChargeStatus } from '../common/constants/status.constants';
import { CHARGE_STATUS, PAYMENT_REQUEST_STATUS } from '../common/constants/status.constants';
import { PAYMENT_PROVIDERS, CURRENCY_CODES } from '../common/constants/payment.constants';
import { ERROR_CODES, ERROR_MESSAGES } from '../common/constants/error.constants';
import { PaymentException } from '../common/exceptions/payment.exception';
import { Response } from 'express';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull'

@Injectable()
export class ChargesService {
  private readonly logger = new Logger(ChargesService.name);

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
    @InjectQueue("settle-charge") private readonly queue: Queue
  ) {}

  async initiateCharge(dto: InitiateChargeDto, res: Response) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Validate hash
      const isValidHash = this.validateRequestHash(dto);
      if (!isValidHash) {
        throw new PaymentException(ERROR_MESSAGES.INVALID_HASH, 400, ERROR_CODES.INVALID_HASH);
      }

      // Check for duplicate transaction
      const existingCharge = await this.chargeInfoRepository.findOne({
        where: { merchantReference: dto.reference },
      });

      if (existingCharge) {
        throw new PaymentException(
          'Transaction already initiated',
          400,
          ERROR_CODES.TRANSACTION_ALREADY_INITIATED,
        );
      }

      // Get merchant or integration details
      let merchantInfo: any;
      let integrationInfo: IntegrationEntity;

      if (dto.merchant_id) {
        merchantInfo = await this.getMerchantDetails(dto.merchant_id);
      } else if (dto.public_key) {
        integrationInfo = await this.getIntegrationByPublicKey(dto.public_key);
        merchantInfo = {
          id: integrationInfo.id,
          name: integrationInfo.name,
          logo_url: integrationInfo.configs?.logo_url,
        };
      } else {
        throw new PaymentException(
          'Merchant ID or public key is required',
          400,
          ERROR_CODES.INVALID_MERCHANT,
        );
      }

      // Create charge info
      const chargeInfo = await this.createChargeInfo(dto, merchantInfo, integrationInfo);

      // If view mode requested, return view URL
      if (dto.use_view) {
        res.status(200).json({
          view_url: `${this.configService.get('SDK_BASE_URL')}/${chargeInfo.id}/${chargeInfo.identifier}`,
        });
      }

      // Get available payment channels
      const channels = await this.getPaymentChannels(chargeInfo.amount);

      // Prepare response
      const response = {
        status: 'success',
        data: {
          merchant_name: merchantInfo.name,
          charge_info_id: chargeInfo.id,
          merchant_logo_url: merchantInfo.logo_url,
          charge_identifier: chargeInfo.identifier,
          channels,
          view_url: `${this.configService.get('SDK_BASE_URL')}/${chargeInfo.identifier}`,
          callback: chargeInfo.callback,
          phone: chargeInfo.phone,
          email: chargeInfo.email,
          amount: chargeInfo.amount,
          currency: chargeInfo.currency,
          reference: chargeInfo.merchantReference,
        },
      };

      res.status(200).json(response);

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
    // Find pending charge
    const charge = await this.chargeRepository.findOne({
      where: {
        identifier: dto.identifier,
        status: CHARGE_STATUS.PENDING,
      },
      relations: ['chargeInfo'],
    });

    if (!charge) {
      throw new NotFoundException(ERROR_MESSAGES.TRANSACTION_NOT_FOUND);
    }

    try {
      // Get payment provider
      const provider = this.paymentProviderFactory.getProvider(PAYMENT_PROVIDERS.PAYSTACK);

      // Submit validation to provider
      const result = await provider.submitValidation(dto.identifier, {
        type: 'otp',
        otp: dto.otp,
      });

      // Log charge history
      await this.logChargeHistory(charge.id, {
        description: 'OTP validation attempted',
        responseMessage: result.message,
        status: result.success ? CHARGE_STATUS.SUCCESSFUL : CHARGE_STATUS.FAILED,
        activity: 'OTP_VALIDATION',
        response: result.data,
      });

      // Update charge status if successful
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

  async cancelCharge(identifier: string) {
    const charge = await this.chargeRepository.findOne({
      where: { identifier },
    });

    if (!charge) {
      throw new NotFoundException(ERROR_MESSAGES.TRANSACTION_NOT_FOUND);
    }

    // Update charge status
    await this.chargeRepository.update({ id: charge.id }, { status: CHARGE_STATUS.CANCELLED });

    // Log charge history
    await this.logChargeHistory(charge.id, {
      description: 'Charge cancelled by user',
      responseMessage: 'Cancelled',
      status: CHARGE_STATUS.CANCELLED,
      activity: 'CHARGE_CANCELLED',
    });

    return { message: 'Charge cancelled successfully' };
  }

  async refundCharge(dto: RefundChargeDto) {
    // Find completed charge
    const chargeInfo = await this.chargeInfoRepository.findOne({
      where: {
        merchantReference: dto.reference,
        merchantId: dto.merchant_id,
      },
      relations: ['charges'],
    });

    if (!chargeInfo) {
      throw new NotFoundException(ERROR_MESSAGES.TRANSACTION_NOT_FOUND);
    }

    const successfulCharge = chargeInfo.charges.find(
      c => c.status === CHARGE_STATUS.SUCCESSFUL && c.successful,
    );

    if (!successfulCharge) {
      throw new BadRequestException('No successful charge found for refund');
    }

    if (dto.amount > chargeInfo.amount) {
      throw new BadRequestException('Refund amount exceeds original charge amount');
    }

    try {
      // Get payment provider and process refund
      const provider = this.paymentProviderFactory.getProvider(
        (successfulCharge.service as any) || PAYMENT_PROVIDERS.PAYSTACK,
      );

      // Note: Refund implementation depends on provider capabilities
      // For now, we'll log the refund request
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
    const charge = await this.chargeRepository.findOne({
      where: { identifier },
      relations: ['chargeInfo', 'history', 'metadata'],
    });

    if (!charge) {
      throw new NotFoundException(ERROR_MESSAGES.TRANSACTION_NOT_FOUND);
    }

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
    const charge = await this.chargeRepository.findOne({
      where: { identifier },
    });

    if (!charge) {
      throw new NotFoundException(ERROR_MESSAGES.TRANSACTION_NOT_FOUND);
    }

    try {
      // Query payment provider for current status
      const provider = this.paymentProviderFactory.getProvider(
        (charge.service as any) || PAYMENT_PROVIDERS.PAYSTACK,
      );

      const result = await provider.verifyTransaction(identifier);

      // Update charge status if needed
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
    const charge = await this.chargeRepository.findOne({
      where: { id: chargeId },
    });

    if (!charge) {
      throw new NotFoundException(ERROR_MESSAGES.TRANSACTION_NOT_FOUND);
    }

    if (charge.settled) {
      throw new BadRequestException('Charge already settled');
    }

    // Update charge as settled
    await this.chargeRepository.update({ id: chargeId }, { settled: true });

    // Log settlement
    await this.logChargeHistory(chargeId, {
      description: settlementData.reason,
      responseMessage: 'Manual settlement',
      status: CHARGE_STATUS.SUCCESSFUL,
      activity: 'MANUAL_SETTLEMENT',
      response: settlementData.extra_data,
    });

    return { message: 'Charge settled successfully' };
  }

  private validateRequestHash(dto: InitiateChargeDto): boolean {
    const publicKey = dto.public_key || 'temp_key'; // In production, get actual key
    const discountString = dto.discount ? JSON.stringify(dto.discount) : '';

    return HashUtil.validateHash(
      parseFloat(dto.amount),
      publicKey,
      dto.reference,
      dto.hash,
      discountString,
    );
  }

  private async getMerchantDetails(merchantId: string) {
    // In production, this would fetch from merchant service
    return {
      id: merchantId,
      name: 'Test Merchant',
      logo_url: null,
    };
  }

  private async getIntegrationByPublicKey(publicKey: string): Promise<IntegrationEntity> {
    const integration = await this.integrationRepository.findOne({
      where: { publicKey },
    });

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
    merchantInfo: any,
    integrationInfo?: IntegrationEntity,
  ): Promise<ChargeInfoEntity> {
    const chargeInfo = this.chargeInfoRepository.create({
      amount: parseFloat(dto.amount) / 100, // Convert from kobo to naira
      merchantReference: dto.reference,
      customerId: dto.customer_id,
      description: dto.description,
      email: dto.email,
      phone: dto.phone,
      callback: dto.callback,
      settlementAccount: dto.settlement_account,
      // value is either test or live
      livemode: dto.mode !== 'live',
      currency: dto.currency || CURRENCY_CODES.NGN,
      merchantId: merchantInfo.id,
      integrationId: integrationInfo?.id,
      merchantName: merchantInfo.name,
      logoUrl: merchantInfo.logo_url,
      status: PAYMENT_REQUEST_STATUS.ENABLED,
      identifier: HashUtil.generateIdentifier(10),
    });

    return this.chargeInfoRepository.save(chargeInfo);
  }

  private async getPaymentChannels(amount: number) {
    const min_amount: number = 10;
    // Mock implementation - in production, this would fetch from database
    return [
      {
        id: 1,
        identifier: 'card',
        name: 'card',
        logo_url: '/img/credit-card.svg',
        type: 'card',
        status: 'enabled',
        description: 'Make payments with your credit or debit card.',
        template_url: 'card/form',
        min_amount,
        max_amount: 1000000,
      },
      {
        id: 2,
        identifier: 'bank_transfer',
        name: 'Bank Transfer',
        type: 'transfer',
        status: 'enabled',
        min_amount,
        template_url: 'transfer/form',
        logo_url: '/img/transfer-icon.svg',
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
  ) {
    const history = this.chargeHistoryRepository.create({
      chargeId,
      description: data.description,
      responseMessage: data.responseMessage,
      status: data.status as ChargeStatus,
      activity: data.activity,
      response: data.response ? JSON.stringify(data.response) : null,
    });

    return this.chargeHistoryRepository.save(history);
  }

  private async markChargeAsSuccessful(charge: ChargeEntity) {
    await this.queue.add("settle", { charge_id: charge.id, settle: true }, {})
    // await this.chargeRepository.update(
    //   { id: charge.id },
    //   {
    //     status: CHARGE_STATUS.SUCCESSFUL,
    //     successful: true,
    //   },
    // );

    // await this.chargeInfoRepository.update(
    //   { id: charge.chargeInfoId },
    //   { status: PAYMENT_REQUEST_STATUS.ENABLED },
    // );
  }
}
