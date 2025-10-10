import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Response } from 'express';
import { ChargeEntity } from '../database/entities/charge.entity';
import { ChargeInfoEntity } from '../database/entities/charge-info.entity';
import { CardPaymentStrategy } from './strategies/card-payment.strategy';
import { TransferPaymentStrategy } from './strategies/transfer-payment.strategy';
import { CardPaymentDto, TransferPaymentDto, MobilePaymentDto } from './dto/payment.dto';
import { PAYMENT_METHODS, PAYMENT_PROVIDERS } from '../common/constants/payment.constants';
import { CHARGE_STATUS } from '../common/constants/status.constants';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';

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
    this.logger.log(`Processing card payment: ${dto.identifier}`);

    const chargeInfo = await this.findChargeInfo(dto.charge_info_id);
    const charge = await this.createCharge(chargeInfo, dto.identifier, PAYMENT_PROVIDERS.PAYSTACK);
    const result = await this.cardPaymentStrategy.processPayment({
      amount: chargeInfo.amount,
      currency: chargeInfo.currency,
      email: chargeInfo.email,
      phone: chargeInfo.phone,
      reference: dto.identifier,
      description: chargeInfo.description,
      pan: dto.pan,
      cvv: dto.cvv,
      expiry: dto.expiry,
      pin: dto.pin,
    });
    this.logger.log(`Card payment processed: ${JSON.stringify(result)}`);

    await this.queue.add('settle', { charge_id: charge.id, settle: true });
    await this.queueingSettlement(charge);
    res.status(200).json({ status: 'success', data: result });
  }

  private async queueingSettlement(charge: any) {
    await this.queue.add('settle', { charge_id: charge.id, settle: true });
  }

  async processTransferPayment(dto: TransferPaymentDto, res: Response): Promise<void> {
    this.logger.log(`Processing transfer payment: ${dto.identifier}`);
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
      await this.queue.add('settle', { charge_id: charge.id, settle: true });
    }

    res.status(200).json({ status: 'success', data: result });
  }

  async processMobilePayment(dto: MobilePaymentDto): Promise<void> {
    this.logger.log(`Processing mobile payment: ${dto.identifier}`);
    throw new BadRequestException('Mobile payments not yet implemented');
  }

  async verifyPayment(
    reference: string,
    paymentMethod: string = PAYMENT_METHODS.CARD,
  ): Promise<any> {
    this.logger.log(`Verifying payment: ${reference}`);

    switch (paymentMethod) {
      case PAYMENT_METHODS.CARD:
        return this.cardPaymentStrategy.verifyPayment(reference);
      case PAYMENT_METHODS.BANK_TRANSFER:
        return this.transferPaymentStrategy.verifyPayment(reference);
      default:
        throw new BadRequestException(`Unsupported payment method: ${paymentMethod}`);
    }
  }

  private async findChargeInfo(chargeInfoId: number): Promise<ChargeInfoEntity> {
    const chargeInfo = await this.chargeInfoRepository.findOne({
      where: { id: chargeInfoId },
    });

    if (!chargeInfo) {
      throw new BadRequestException('Charge info not found');
    }

    return chargeInfo;
  }

  private async createCharge(
    chargeInfo: ChargeInfoEntity,
    identifier: string,
    service?: string,
  ): Promise<ChargeEntity> {
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
      chargeInfoId: chargeInfo.id,
      livemode: chargeInfo.livemode,
    });

    return this.chargeRepository.save(charge);
  }
}
