import {
  Controller,
  Post,
  Body,
  Headers,
  HttpCode,
  HttpStatus,
  Logger,
  RawBodyRequest,
  Req,
} from '@nestjs/common';
import { Request } from 'express';
import { ApiTags, ApiOperation, ApiResponse, ApiHeader } from '@nestjs/swagger';
import { HooksService } from './hooks.service';
import { PaystackWebhookDto } from './dto/paystack-webhook.dto';
import { TransferWebhookDto } from './dto/transfer-webhook.dto';

@ApiTags('Webhooks')
@Controller('hooks')
export class HooksController {
  private readonly logger = new Logger(HooksController.name);

  constructor(private readonly hooksService: HooksService) {}

  @Post('paystack')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Handle Paystack webhook' })
  @ApiHeader({ name: 'x-paystack-signature', description: 'Paystack signature' })
  @ApiResponse({ status: 200, description: 'Webhook processed successfully' })
  async handlePaystackWebhook(
    @Body() payload: PaystackWebhookDto,
    @Headers('x-paystack-signature') signature: string,
    @Req() req: RawBodyRequest<Request>,
  ) {
    this.logger.log(`Received Paystack webhook: ${payload.event}`);

    try {
      const result = await this.hooksService.handlePaystackWebhook(payload, signature, req.rawBody);

      this.logger.log(`Paystack webhook processed: ${payload.event}`);
      return result;
    } catch (error) {
      this.logger.error(`Error processing Paystack webhook:`, error);
      throw error;
    }
  }
  @Post('knip')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Handle Knip webhook' })
  @ApiResponse({ status: 200, description: 'Webhook processed successfully' })
  async handleKnipWebhook(@Body() payload: any, @Req() req: RawBodyRequest<Request>) {
    this.logger.log(`Received Knip webhook: ${payload.event}`);

    try {
      const result = await this.hooksService.handleKnipWebhook(payload, req.rawBody);

      this.logger.log(`Knip webhook processed: ${payload.event}`);
      return result;
    } catch (error) {
      this.logger.error(`Error processing Knip webhook:`, error);
      throw error;
    }
  }

  @Post('transfer')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Handle transfer webhook' })
  @ApiResponse({ status: 200, description: 'Transfer webhook processed' })
  async handleTransferWebhook(@Body() payload: TransferWebhookDto) {
    this.logger.log(`Received transfer webhook for: ${payload.identifier}`);

    try {
      const result = await this.hooksService.handleTransferWebhook(payload);

      this.logger.log(`Transfer webhook processed: ${payload.identifier}`);
      return result;
    } catch (error) {
      this.logger.error(`Error processing transfer webhook:`, error);
      throw error;
    }
  }

  @Post('klump')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Handle Klump webhook' })
  @ApiHeader({ name: 'x-klump-signature', description: 'Klump signature' })
  @ApiHeader({ name: 'x-klump-webhook-id', description: 'Klump webhook ID' })
  @ApiHeader({ name: 'x-klump-webhook-attempt', description: 'Klump webhook attempt count' })
  @ApiResponse({ status: 200, description: 'Klump webhook processed' })
  async handleKlumpWebhook(
    @Body() payload: any,
    @Headers('x-klump-signature') signature: string,
    @Headers('x-klump-webhook-id') webhookId: string,
    @Headers('x-klump-webhook-attempt') attempt: string,
  ) {
    this.logger.log(`Received Klump webhook: ${payload.event}`);

    try {
      const result = await this.hooksService.handleKlumpWebhook(
        payload,
        signature,
        webhookId,
        attempt,
      );

      this.logger.log(`Klump webhook processed: ${payload.event}`);
      return result;
    } catch (error) {
      this.logger.error(`Error processing Klump webhook:`, error);
      return { status: 'OK' }; // Always return OK for Klump
    }
  }
}
