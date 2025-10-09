import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ChargeEntity } from '../database/entities/charge.entity';
import { ChargeInfoEntity } from '../database/entities/charge-info.entity';
import { CardPaymentStrategy } from './strategies/card-payment.strategy';
import { TransferPaymentStrategy } from './strategies/transfer-payment.strategy';
import { CardPaymentDto, TransferPaymentDto, MobilePaymentDto } from './dto/payment.dto';
import { PAYMENT_METHODS } from '../common/constants/payment.constants';
import { CHARGE_STATUS } from '../common/constants/status.constants';
import { Response } from 'express';

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
  ) {}

  async processCardPayment(dto: CardPaymentDto, res: Response) {
    this.logger.log(`Processing card payment: ${dto.identifier}`);

    const chargeInfo = await this.chargeInfoRepository.findOne({
      where: { id: dto.charge_info_id },
    });

    if (!chargeInfo) {
      throw new BadRequestException('Charge info not found');
    }

    // Create charge record
    const charge = this.chargeRepository.create({
      identifier: dto.identifier,
      amount: chargeInfo.amount,
      currency: chargeInfo.currency,
      description: chargeInfo.description,
      email: chargeInfo.email,
      phone: chargeInfo.phone,
      customerId: chargeInfo.customerId,
      merchantId: chargeInfo.merchantId,
      merchantName: chargeInfo.merchantName,
      status: CHARGE_STATUS.PENDING,
      successful: false,
      settled: false,
      chargeInfoId: chargeInfo.id,
      livemode: chargeInfo.livemode,
    });

    const savedCharge = await this.chargeRepository.save(charge);

    // Process with card strategy
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

    return res.status(200).json(result);
  }

  async processTransferPayment(dto: TransferPaymentDto, res: Response) {
    this.logger.log(`Processing transfer payment: ${dto.identifier}`);

    const chargeInfo = await this.chargeInfoRepository.findOne({
      where: { id: +dto.charge_info_id },
    });

    if (!chargeInfo) {
      throw new BadRequestException('Charge info not found');
    }

    // Create charge record
    const charge = this.chargeRepository.create({
      identifier: dto.identifier,
      amount: chargeInfo.amount,
      currency: chargeInfo.currency,
      description: chargeInfo.description,
      email: chargeInfo.email,
      phone: chargeInfo.phone,
      customerId: chargeInfo.customerId,
      merchantId: chargeInfo.merchantId,
      merchantName: chargeInfo.merchantName,
      status: CHARGE_STATUS.PENDING,
      successful: false,
      settled: false,
      chargeInfoId: chargeInfo.id,
      livemode: chargeInfo.livemode,
    });

    await this.chargeRepository.save(charge);

    // Process with transfer strategy
    const result = await this.transferPaymentStrategy.processPayment({
      amount: chargeInfo.amount,
      currency: chargeInfo.currency,
      email: chargeInfo.email,
      reference: dto.identifier,
      description: chargeInfo.description || dto.description,
      customerName: dto.name,
      merchant_name: chargeInfo.merchantName,
    });

    return res.status(200).json({ status: 'success', data: result });
  }

  async processMobilePayment(dto: MobilePaymentDto) {
    this.logger.log(`Processing mobile payment: ${dto.identifier}`);
    // Implementation would depend on mobile payment providers
    throw new BadRequestException('Mobile payments not yet implemented');
  }

  async verifyPayment(reference: string, paymentMethod: string = PAYMENT_METHODS.CARD) {
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
}
