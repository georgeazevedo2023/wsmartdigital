/** Shared UAZAPI QR code utilities */

/** Normalizes a base64 string to a valid image src */
export const normalizeQrSrc = (qr: string): string =>
  qr.startsWith('data:image') ? qr : `data:image/png;base64,${qr}`;

/** Extracts QR code from various UAZAPI response formats */
export const extractQrCode = (data: any): string | null =>
  data?.instance?.qrcode || data?.qrcode || data?.base64 || null;

/** Checks if instance is connected in UAZAPI response */
export const checkIfConnected = (data: any): boolean =>
  data?.instance?.status === 'connected' ||
  data?.status === 'connected' ||
  data?.status?.connected === true ||
  data?.loggedIn === true;
