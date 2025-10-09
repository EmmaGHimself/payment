export class MaskUtil {
  static maskCard(cardNumber: string): string {
    if (!cardNumber || cardNumber.length < 6) return cardNumber;
    const first6 = cardNumber.substring(0, 6);
    const last4 = cardNumber.substring(cardNumber.length - 4);
    const middle = '*'.repeat(cardNumber.length - 10);
    return `${first6}${middle}${last4}`;
  }

  static maskEmail(email: string): string {
    if (!email || !email.includes('@')) return email;
    const [name, domain] = email.split('@');
    if (name.length <= 2) return email;
    const maskedName = name.charAt(0) + '*'.repeat(name.length - 2) + name.charAt(name.length - 1);
    return `${maskedName}@${domain}`;
  }

  static maskPhone(phone: string): string {
    if (!phone || phone.length < 6) return phone;
    const first3 = phone.substring(0, 3);
    const last3 = phone.substring(phone.length - 3);
    const middle = '*'.repeat(phone.length - 6);
    return `${first3}${middle}${last3}`;
  }

  static maskAllCharacters(value: string): string {
    return value ? '*'.repeat(value.length) : value;
  }

  static getCardScheme(cardNumber: string): string {
    const cleanCardNumber = cardNumber.replace(/\s/g, '');
    
    if (/^4/.test(cleanCardNumber)) return 'visa';
    if (/^5[1-5]/.test(cleanCardNumber)) return 'mastercard';
    if (/^3[47]/.test(cleanCardNumber)) return 'amex';
    if (/^6(?:011|5)/.test(cleanCardNumber)) return 'discover';
    if (/^35(?:2[89]|[3-8][0-9])/.test(cleanCardNumber)) return 'jcb';
    if (/^30[0-5]/.test(cleanCardNumber)) return 'diners';
    
    return 'unknown';
  }

  static getBinFromCardNumber(cardNumber: string): string {
    return cardNumber.substring(0, 6);
  }
}