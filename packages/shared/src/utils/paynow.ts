/**
 * Singapore PayNow EMVCo QR Code Generator
 * Conforms to the EMVCo Merchant-Presented Mode and ABS Singapore PayNow standards.
 */

export interface PayNowQrOptions {
  proxyType: 'mobile' | 'uen';
  proxyValue: string; // Phone number e.g. +6591234567 or UEN e.g. 202300000A
  amount?: number; // Exact amount e.g. 14.80 (locks amount if provided)
  reference?: string; // Bill/order reference e.g. NYO-001 (max 25 alphanumeric chars)
  merchantName?: string; // Business/owner name (max 25 chars)
  editable?: boolean; // If true, customer can edit amount in their banking app
  expiryDate?: string; // Optional expiry YYYYMMDD
}

export function formatPayNowPhone(input: string): string {
  const cleaned = input.replace(/[\s\-()]/g, '');
  if (!cleaned) return '';
  if (cleaned.startsWith('+')) return cleaned;
  if (cleaned.startsWith('65') && cleaned.length === 10) return `+${cleaned}`;
  if (cleaned.length === 8 && /^[89]/.test(cleaned)) return `+65${cleaned}`;
  return cleaned;
}

export function emvField(tag: string, value: string): string {
  const len = String(value.length).padStart(2, '0');
  return `${tag}${len}${value}`;
}

export function crc16Ccitt(str: string): string {
  let crc = 0xffff;
  for (let i = 0; i < str.length; i++) {
    crc ^= str.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      if ((crc & 0x8000) !== 0) {
        crc = ((crc << 1) ^ 0x1021) & 0xffff;
      } else {
        crc = (crc << 1) & 0xffff;
      }
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

export function generatePayNowPayload(options: PayNowQrOptions): string {
  const isMobile = options.proxyType === 'mobile';
  const proxy = isMobile
    ? formatPayNowPhone(options.proxyValue)
    : options.proxyValue.trim().toUpperCase();

  const isDynamic = options.amount !== undefined && options.amount > 0;
  const isEditable = options.editable ?? !isDynamic;

  // Subtags for Merchant Account Information (Tag 26)
  const sub00 = emvField('00', 'SG.PAYNOW');
  const sub01 = emvField('01', isMobile ? '0' : '2');
  const sub02 = emvField('02', proxy);
  const sub03 = emvField('03', isEditable ? '1' : '0');
  const sub04 = options.expiryDate ? emvField('04', options.expiryDate) : '';

  const tag26 = emvField('26', `${sub00}${sub01}${sub02}${sub03}${sub04}`);

  const merchantName = (options.merchantName || 'NYO PASTA').substring(0, 25);
  const cleanRef = options.reference ? options.reference.replace(/[^a-zA-Z0-9_-]/g, '').substring(0, 25) : '';
  const tag62 = cleanRef ? emvField('62', emvField('01', cleanRef)) : '';

  const parts = [
    emvField('00', '01'), // Payload Format Indicator
    emvField('01', isDynamic ? '12' : '11'), // Point of Initiation (12 = dynamic, 11 = static)
    tag26,
    emvField('52', '0000'), // Merchant Category Code
    emvField('53', '702'), // Singapore Dollar
  ];

  if (options.amount !== undefined && options.amount > 0) {
    parts.push(emvField('54', options.amount.toFixed(2)));
  }

  parts.push(
    emvField('58', 'SG'),
    emvField('59', merchantName),
    emvField('60', 'Singapore')
  );

  if (tag62) {
    parts.push(tag62);
  }

  const raw = `${parts.join('')}6304`;
  const checksum = crc16Ccitt(raw);
  return `${raw}${checksum}`;
}
