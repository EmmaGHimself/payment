import { Controller, Post, Get, Put, Body, Param, UseGuards, HttpStatus, HttpCode, Res } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { ChargesService } from './charges.service';
import { InitiateChargeDto } from './dto/initiate-charge.dto';
import { ValidateOtpDto } from './dto/validate-otp.dto';
import { CancelChargeDto } from './dto/cancel-charge.dto';
import { RefundChargeDto } from './dto/refund-charge.dto';
import { PaystackValidationDto } from './dto/paystack-validation.dto';
import { PaystackRequeryDto } from './dto/paystack-requery.dto';
import { AuthGuard } from '../common/guards/auth.guard';
import { MerchantGuard } from '../common/guards/merchant.guard';
import { Response } from 'express';

@ApiTags('Charges')
@Controller('/v2/charge')
export class ChargesController {
  constructor(private readonly chargesService: ChargesService) {}

  @Post('initiate')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AuthGuard)
  @ApiOperation({ summary: 'Initiate a new charge' })
  @ApiResponse({ status: 200, description: 'Charge initiated successfully' })
  @ApiResponse({ status: 400, description: 'Invalid request data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async initiateCharge(@Body() initiateChargeDto: any, @Res() res: Response): Promise<any> {
    return this.chargesService.initiateCharge(initiateChargeDto, res);
  }

  @Post('initiate/view')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AuthGuard)
  @ApiOperation({ summary: 'Initiate charge with view URL' })
  @ApiResponse({ status: 200, description: 'Charge view URL generated' })
  async initiateChargeView(@Body() initiateChargeDto: InitiateChargeDto, @Res() res: Response): Promise<any> {
    return this.chargesService.initiateCharge({ ...initiateChargeDto, use_view: true }, res);
  }

  @Post('validate/otp')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Validate OTP for charge' })
  @ApiResponse({ status: 200, description: 'OTP validated successfully' })
  async validateOtp(@Body() validateOtpDto: ValidateOtpDto) {
    return this.chargesService.validateOtp(validateOtpDto);
  }

  @Post('submit-validation')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Submit validation data (OTP, PIN, phone, birthday, address)' })
  @ApiResponse({ status: 200, description: 'Validation submitted successfully' })
  async submitValidation(@Body() validationDto: any) {
    return this.chargesService.submitValidation(validationDto);
  }

  @Post('cancel/:identifier')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cancel a charge' })
  @ApiResponse({ status: 200, description: 'Charge cancelled successfully' })
  async cancelCharge(@Param('identifier') identifier: string) {
    return this.chargesService.cancelCharge(identifier);
  }

  @Post('refund')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AuthGuard)
  @ApiOperation({ summary: 'Refund a charge' })
  @ApiResponse({ status: 200, description: 'Refund processed successfully' })
  async refundCharge(@Body() refundChargeDto: RefundChargeDto) {
    return this.chargesService.refundCharge(refundChargeDto);
  }

  @Get('detail/:identifier')
  @UseGuards(AuthGuard)
  @ApiOperation({ summary: 'Get charge details by identifier' })
  @ApiResponse({ status: 200, description: 'Charge details retrieved' })
  async getChargeByIdentifier(@Param('identifier') identifier: string) {
    return this.chargesService.getChargeByIdentifier(identifier);
  }

  @Get('requery/:identifier')
  @UseGuards(AuthGuard)
  @ApiOperation({ summary: 'Requery charge status' })
  @ApiResponse({ status: 200, description: 'Charge status retrieved' })
  async requeryCharge(@Param('identifier') identifier: string) {
    return this.chargesService.requeryCharge(identifier);
  }

  @Post('settle/:charge_id')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AuthGuard, MerchantGuard)
  @ApiOperation({ summary: 'Manually settle a charge' })
  @ApiResponse({ status: 200, description: 'Charge settled successfully' })
  async settleCharge(@Param('charge_id') chargeId: string, @Body() settlementData: { reason: string; extra_data?: Record<string, any> }) {
    return this.chargesService.settleCharge(parseInt(chargeId), settlementData);
  }

  @Post('paystack/validation')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Submit Paystack validation (OTP, phone, birthday, address)' })
  @ApiResponse({ status: 200, description: 'Validation submitted successfully' })
  @ApiResponse({ status: 400, description: 'Invalid validation data' })
  async paystackValidation(@Body() validationDto: PaystackValidationDto, @Res() res: Response){
    return this.chargesService.paystackValidation(validationDto, res);
  }

  @Post('paystack/requery')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Requery Paystack charge status' })
  @ApiResponse({ status: 200, description: 'Charge status retrieved successfully' })
  @ApiResponse({ status: 400, description: 'Invalid charge identifier' })
  async requeryPaystackCharge(@Body() requeryDto: PaystackRequeryDto, @Res() res: Response) {
    return this.chargesService.requeryPaystackCharge(requeryDto, res);
  }
}
