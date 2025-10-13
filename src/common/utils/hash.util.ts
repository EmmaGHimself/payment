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

  static generateIdentifier(length: number): string {
    const date = new Date(),
      dformat = [
        date.getFullYear(),
        date.getMonth() + 1,
        date.getDate(),
        date.getHours(),
        date.getMinutes(),
        date.getSeconds(),
      ].join('');
    return `CH_${dformat}_${this.generateRandomCharacter(length)}`;
  }

  static generateRandomCharacter(length: number): string {
    let text = '';
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    for (let i = 0; i < length; i++) {
      text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
  }

  static generateReference(): string {
    return `MP_${Date.now()}_${this.generateIdentifier(8)}`;
  }
}
