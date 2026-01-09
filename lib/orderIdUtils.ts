/**
 * Utility functions for generating order IDs
 */

/**
 * Generates a random alphanumeric string of specified length
 */
function generateRandomString(length: number): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Avoiding ambiguous chars: 0, O, 1, I
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Gets current date formatted as YYYYMMDD
 */
function getDateString(): string {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}${month}${day}`;
}

/**
 * Generates an order ID for normal and test orders
 * Format: ORD-{YYYYMMDD}-{6 random alphanumeric}
 * Example: ORD-20260109-A3K9X2
 */
export function generateOrderId(): string {
  return `ORD-${getDateString()}-${generateRandomString(6)}`;
}

/**
 * Generates an order ID for cobuy orders
 * Format: COBUY-{YYYYMMDD}-{6 random alphanumeric}
 * Example: COBUY-20260109-B7M4P8
 */
export function generateCoBuyOrderId(): string {
  return `COBUY-${getDateString()}-${generateRandomString(6)}`;
}
