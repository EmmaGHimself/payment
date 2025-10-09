import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
  HttpStatus,
  HttpCode,
  Req,
} from '@nestjs/common';
import { Request } from 'express';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { PaymentRequestsService } from './payment-requests.service';
import { CreatePaymentRequestDto } from './dto/create-payment-request.dto';
import { UpdatePaymentRequestDto } from './dto/update-payment-request.dto';
import { MerchantGuard } from '../common/guards/merchant.guard';

interface AuthenticatedRequest extends Request {
  integration?: {
    id: number;
    name: string;
    configs: Record<string, any>;
  };
}

@ApiTags('Payment Requests')
@Controller('payment-requests')
@UseGuards(MerchantGuard)
@ApiBearerAuth()
export class PaymentRequestsController {
  constructor(private readonly paymentRequestsService: PaymentRequestsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all payment requests for integration' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'status', required: false, type: String })
  @ApiResponse({ status: 200, description: 'Payment requests retrieved successfully' })
  async getPaymentRequests(
    @Req() req: AuthenticatedRequest,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('status') status?: string,
  ) {
    return this.paymentRequestsService.findAll({
      integrationId: req.integration.id,
      page,
      limit,
      status,
    });
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new payment request' })
  @ApiResponse({ status: 201, description: 'Payment request created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid request data' })
  async createPaymentRequest(
    @Req() req: AuthenticatedRequest,
    @Body() createPaymentRequestDto: CreatePaymentRequestDto,
  ) {
    return this.paymentRequestsService.create({
      ...createPaymentRequestDto,
      integrationId: req.integration.id,
    });
  }

  @Get(':identifier')
  @ApiOperation({ summary: 'Get a payment request by identifier' })
  @ApiResponse({ status: 200, description: 'Payment request retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Payment request not found' })
  async getPaymentRequest(
    @Req() req: AuthenticatedRequest,
    @Param('identifier') identifier: string,
  ) {
    return this.paymentRequestsService.findOne({
      identifier,
      integrationId: req.integration.id,
    });
  }

  @Put(':identifier')
  @ApiOperation({ summary: 'Update a payment request' })
  @ApiResponse({ status: 200, description: 'Payment request updated successfully' })
  @ApiResponse({ status: 404, description: 'Payment request not found' })
  async updatePaymentRequest(
    @Req() req: AuthenticatedRequest,
    @Param('identifier') identifier: string,
    @Body() updatePaymentRequestDto: UpdatePaymentRequestDto,
  ) {
    return this.paymentRequestsService.update({
      identifier,
      integrationId: req.integration.id,
      updateData: updatePaymentRequestDto,
    });
  }

  @Get('initiate/:identifier')
  @ApiOperation({ summary: 'Initiate payment from a payment request' })
  @ApiResponse({ status: 200, description: 'Payment initiated from request' })
  @ApiResponse({ status: 404, description: 'Payment request not found' })
  async payFromRequest(@Param('identifier') identifier: string) {
    return this.paymentRequestsService.payFromRequest(identifier);
  }
}