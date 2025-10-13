import { Controller, Post, Get, Body, Param, UseGuards, HttpCode, HttpStatus, Res } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { PaymentsService } from './payments.service';
import { CardPaymentDto, TransferPaymentDto, MobilePaymentDto } from './dto/payment.dto';
import { AuthGuard } from '../common/guards/auth.guard';
import { Response } from 'express';

@ApiTags('Payments')
@Controller('/v2')
@UseGuards(AuthGuard)
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('/pay/card')
  @HttpCode(HttpStatus.OK)
  @HttpCode(HttpStatus.INTERNAL_SERVER_ERROR)
  @ApiOperation({ summary: 'Process card payment' })
  @ApiResponse({ status: 200, description: 'Card payment processed' })
  async processCardPayment(@Body() cardPaymentDto: any, @Res() response: Response) {
    return this.paymentsService.processCardPayment(cardPaymentDto, response);
  }

  @Post('/pay/paywithtransfer')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Process bank transfer payment' })
  @ApiResponse({ status: 200, description: 'Transfer payment processed' })
  async processTransferPayment(@Body() transferPaymentDto: any, @Res() response: Response) {
    return this.paymentsService.processTransferPayment(transferPaymentDto, response);
  }
  @Post('mobile')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Process mobile money payment' })
  @ApiResponse({ status: 200, description: 'Mobile payment processed' })
  async processMobilePayment(@Body() mobilePaymentDto: MobilePaymentDto) {
    return this.paymentsService.processMobilePayment(mobilePaymentDto);
  }

  @Get('verify/:reference')
  @ApiOperation({ summary: 'Verify payment status' })
  @ApiResponse({ status: 200, description: 'Payment verification result' })
  async verifyPayment(@Param('reference') reference: string): Promise<any> {
    return this.paymentsService.verifyPayment(reference);
  }
}
