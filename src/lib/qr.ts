import QRCode from 'qrcode';

/**
 * Generate a QR code as a base64 PNG data URL.
 * Encodes only the opaque qrToken string (zero PII).
 * Error correction level M for physical ID card printing.
 */
export async function generateQrDataUrl(token: string): Promise<string> {
  return QRCode.toDataURL(token, {
    errorCorrectionLevel: 'M',
    margin: 2,
    color: {
      dark: '#000000',
      light: '#FFFFFF',
    },
    width: 256,
  });
}

/**
 * Generate a QR code as a PNG Buffer (for API route responses).
 */
export async function generateQrBuffer(token: string): Promise<Buffer> {
  return QRCode.toBuffer(token, {
    errorCorrectionLevel: 'M',
    type: 'png',
    margin: 2,
    color: {
      dark: '#000000',
      light: '#FFFFFF',
    },
    width: 300,
  });
}

/**
 * Validate that a given string strictly matches the opaque UUIDv4 token format.
 * Prevents non-opaque payloads or raw PII from being processed as valid tokens.
 */
export function validateQrTokenFormat(token: string): boolean {
  const uuidv4Regex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidv4Regex.test(token.trim());
}

