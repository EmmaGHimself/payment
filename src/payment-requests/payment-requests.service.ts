import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindManyOptions } from 'typeorm';
import { PaymentRequestEntity } from '../database/entities/payment-request.entity';
import { IntegrationEntity } from '../database/entities/integration.entity';
import { ChargeInfoEntity } from '../database/entities/charge-info.entity';
import { ChargesService } from '../charges/charges.service';
import { CreatePaymentRequestDto } from './dto/create-payment-request.dto';
import { UpdatePaymentRequestDto } from './dto/update-payment-request.dto';
import { HashUtil } from '../common/utils/hash.util';
import { PAYMENT_REQUEST_STATUS } from '../common/constants/status.constants';
import { ERROR_MESSAGES } from '../common/constants/error.constants';
import { CURRENCY_CODES } from '../common/constants';
import { response } from 'express';

export interface FindAllPaymentRequestsOptions {
  integrationId: number;
  page?: number;
  limit?: number;
  status?: string;
}

export interface FindOnePaymentRequestOptions {
  identifier: string;
  integrationId: number;
}

export interface UpdatePaymentRequestOptions {
  identifier: string;
  integrationId: number;
  updateData: UpdatePaymentRequestDto;
}

export interface CreatePaymentRequestOptions extends CreatePaymentRequestDto {
  integrationId: number;
}

@Injectable()
export class PaymentRequestsService {
  private readonly logger = new Logger(PaymentRequestsService.name);

  constructor(
    @InjectRepository(PaymentRequestEntity)
    private readonly paymentRequestRepository: Repository<PaymentRequestEntity>,
    @InjectRepository(IntegrationEntity)
    private readonly integrationRepository: Repository<IntegrationEntity>,
    @InjectRepository(ChargeInfoEntity)
    private readonly chargeInfoRepository: Repository<ChargeInfoEntity>,
    private readonly chargesService: ChargesService,
  ) {}

  async findAll(options: FindAllPaymentRequestsOptions) {
    const { integrationId, page = 1, limit = 10, status } = options;

    const queryOptions: FindManyOptions<PaymentRequestEntity> = {
      where: {
        integrationId,
        ...(status && { status: status as any }),
      },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    };

    const [paymentRequests, total] = await this.paymentRequestRepository.findAndCount(queryOptions);

    return {
      data: paymentRequests.map((pr) => this.formatPaymentRequest(pr)),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(options: FindOnePaymentRequestOptions) {
    const { identifier, integrationId } = options;

    const paymentRequest = await this.paymentRequestRepository.findOne({
      where: { identifier, integrationId },
    });

    if (!paymentRequest) {
      throw new NotFoundException(ERROR_MESSAGES.NOT_FOUND);
    }

    return this.formatPaymentRequest(paymentRequest);
  }

  async create(options: CreatePaymentRequestOptions) {
    const { integrationId, ...createData } = options;

    // Verify integration exists
    const integration = await this.integrationRepository.findOne({
      where: { id: integrationId },
    });

    if (!integration) {
      throw new NotFoundException('Integration not found');
    }
    // Generate unique identifier
    const identifier = HashUtil.generateIdentifier(12);

    // Create payment request data object
    const paymentRequestData = {
      identifier,
      integrationId,
      title: createData.title,
      description: createData.description,
      amount: createData.amount,
      bearer: createData.bearer,
      metadata: createData.metadata,
      status: PAYMENT_REQUEST_STATUS.ENABLED, // Use the enum value directly
    };

    // Save directly without using create() method
    const saveResult = await this.paymentRequestRepository.save(paymentRequestData);

    // Handle both single entity and array returns
    const savedRequest = Array.isArray(saveResult) ? saveResult[0] : saveResult;

    this.logger.log(`Payment request created: ${identifier} for integration: ${integrationId}`);

    return this.formatPaymentRequest(savedRequest);
  }

  async update(options: UpdatePaymentRequestOptions) {
    const { identifier, integrationId, updateData } = options;

    // Find existing payment request
    const existingRequest = await this.paymentRequestRepository.findOne({
      where: { identifier, integrationId },
    });

    if (!existingRequest) {
      throw new NotFoundException(ERROR_MESSAGES.NOT_FOUND);
    }

    // Prepare update data with proper typing
    const updatePayload = {
      ...updateData,
      // If status is being updated, ensure it's properly typed
      ...(updateData.status && {
        status: updateData.status.toLowerCase() as any,
      }),
    };

    // Update payment request
    await this.paymentRequestRepository.update({ id: existingRequest.id }, updatePayload);

    // Fetch updated request
    const updatedRequest = await this.paymentRequestRepository.findOne({
      where: { id: existingRequest.id },
    });

    this.logger.log(`Payment request updated: ${identifier}`);

    return this.formatPaymentRequest(updatedRequest);
  }

  async payFromRequest(identifier: string): Promise<any> {
    // Find payment request
    const paymentRequest = await this.paymentRequestRepository.findOne({
      where: { identifier, status: PAYMENT_REQUEST_STATUS.ENABLED },
    });

    if (!paymentRequest) {
      throw new NotFoundException('Payment request not found or disabled');
    }

    // Get integration details
    const integration = await this.integrationRepository.findOne({
      where: { id: paymentRequest.integrationId },
    });

    if (!integration) {
      throw new NotFoundException('Integration not found');
    }

    // Check if amount is required
    if (!paymentRequest.amount) {
      throw new BadRequestException('Amount is required for this payment request');
    }

    // Generate transaction reference
    const transactionReference = HashUtil.generateReference();

    // Create charge info for the payment request
    const chargeData = {
      amount: (paymentRequest.amount * 100).toString(), // Convert to kobo
      description: paymentRequest.description || paymentRequest.title,
      reference: transactionReference,
      customer_id: `customer_${Date.now()}`, // This should come from the request
      email: 'customer@example.com', // This should come from the request
      public_key: integration.publicKey,
      hash: this.generatePaymentHash(
        paymentRequest.amount * 100,
        integration.publicKey,
        transactionReference,
      ),
      currency: CURRENCY_CODES.NGN,
      paymentRequest: identifier,
    };

    // Initiate charge using charges service
    const chargeResult = await this.chargesService.initiateCharge(chargeData, response);

    this.logger.log(`Payment initiated from request: ${identifier} -> ${transactionReference}`);

    return {
      payment_request: this.formatPaymentRequest(paymentRequest),
      charge: chargeResult,
    };
  }

  async disable(identifier: string, integrationId: number) {
    const paymentRequest = await this.paymentRequestRepository.findOne({
      where: { identifier, integrationId },
    });

    if (!paymentRequest) {
      throw new NotFoundException(ERROR_MESSAGES.NOT_FOUND);
    }

    await this.paymentRequestRepository.update(
      { id: paymentRequest.id },
      { status: PAYMENT_REQUEST_STATUS.DISABLED },
    );

    return { message: 'Payment request disabled successfully' };
  }

  async getStats(integrationId: number) {
    const totalRequests = await this.paymentRequestRepository.count({
      where: { integrationId },
    });

    const enabledRequests = await this.paymentRequestRepository.count({
      where: { integrationId, status: PAYMENT_REQUEST_STATUS.ENABLED },
    });

    const disabledRequests = await this.paymentRequestRepository.count({
      where: { integrationId, status: PAYMENT_REQUEST_STATUS.DISABLED },
    });

    // Get payment requests with successful payments
    const requestsWithPayments = await this.chargeInfoRepository
      .createQueryBuilder('ci')
      .innerJoin('ci.charges', 'c')
      .where('ci.integration_id = :integrationId', { integrationId })
      .andWhere('c.successful = :successful', { successful: true })
      .select('COUNT(DISTINCT ci.payment_request_id)', 'count')
      .getRawOne();

    return {
      total: totalRequests,
      enabled: enabledRequests,
      disabled: disabledRequests,
      with_successful_payments: parseInt(requestsWithPayments.count || '0'),
    };
  }

  private formatPaymentRequest(paymentRequest: PaymentRequestEntity) {
    return {
      id: paymentRequest.id,
      identifier: paymentRequest.identifier,
      title: paymentRequest.title,
      description: paymentRequest.description,
      amount: paymentRequest.amount,
      status: paymentRequest.status,
      bearer: paymentRequest.bearer,
      metadata: paymentRequest.metadata,
      integration_id: paymentRequest.integrationId,
      created_at: paymentRequest.createdAt,
      updated_at: paymentRequest.updatedAt,
    };
  }

  private generatePaymentHash(
    amount: number,
    publicKey: string,
    reference: string,
    discountString?: string,
  ): string {
    return HashUtil.generateHash(
      `${amount}${publicKey}${reference}${discountString || ''}`,
      publicKey,
    );
  }
}
