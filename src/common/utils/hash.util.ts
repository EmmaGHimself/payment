import * as crypto from 'crypto';

export class HashUtil {
  static validateHash(
    amount: number,
    publicKey: string,
    reference: string,
    hash: string,
    discountString?: string,
  ): boolean {
    try {
      const hashString = `${amount}|${publicKey}|${reference}${discountString ? `|${discountString}` : ''}`;
      const computedHash = crypto.createHash('sha512').update(hashString).digest('hex');
      return computedHash === hash;
    } catch (error) {
      return false;
    }
  }

  static generateHash(data: string, secret: string): string {
    return crypto.createHmac('sha512', secret).update(data).digest('hex');
  }

  static generateIdentifier(length: number = 10): string {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return result;
  }

  static generateReference(): string {
    return `MP_${Date.now()}_${this.generateIdentifier(8)}`;
  }
}