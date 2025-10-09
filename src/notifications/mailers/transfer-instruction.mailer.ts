import { Injectable, Logger } from '@nestjs/common';
import { NotificationsService } from '../notifications.service';

export interface TransferInstructionData {
  customer_id: string;
  merchant_reference: string;
  merchant_name: string;
  data: any;
  params: {
    account_number: string;
    account_name: string;
    merchant_name: string;
    amount: number;
    merchant_reference: string;
    bank_name: string;
    customer_name: string;
    email?: string; // Added optional email property
  };
}

@Injectable()
export class TransferInstructionMailer {
  private readonly logger = new Logger(TransferInstructionMailer.name);

  constructor(private readonly notificationsService: NotificationsService) {}

  async instructionMailer(data: TransferInstructionData): Promise<void> {
    try {
      // Extract email from customer data or use a default method to get customer email
      const customerEmail = this.extractCustomerEmail(data);
      
      if (!customerEmail) {
        this.logger.warn(`No email found for customer: ${data.customer_id}`);
        return;
      }

      await this.notificationsService.sendTransferInstructionsEmail({
        email: customerEmail,
        customerName: data.params.customer_name,
        amount: data.params.amount,
        accountNumber: data.params.account_number,
        accountName: data.params.account_name,
        bankName: data.params.bank_name,
        reference: data.params.merchant_reference,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
      });

      this.logger.log(`Transfer instructions sent for reference: ${data.merchant_reference}`);
    } catch (error) {
      this.logger.error(`Failed to send transfer instructions for ${data.merchant_reference}:`, error);
    }
  }

  private extractCustomerEmail(data: TransferInstructionData): string | null {
    // Try to extract email from various possible locations in the data
    if (data.data?.email) return data.data.email;
    if (data.params?.email) return data.params.email;
    
    // In production, you might query a customer service to get email by customer_id
    // For now, return null if no email is found
    return null;
  }
}