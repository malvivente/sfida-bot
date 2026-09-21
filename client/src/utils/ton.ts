import { Address } from '@ton/core';

/**
 * Safely compares two TON addresses regardless of whether they are in
 * RAW hex format (0:...), user-friendly bounceable (EQ...), or user-friendly non-bounceable (UQ...).
 */
export function areAddressesEqual(a?: string | null, b?: string | null): boolean {
  if (!a || !b) return false;
  if (a.toLowerCase() === b.toLowerCase()) return true;
  try {
    return Address.parse(a).equals(Address.parse(b));
  } catch {
    return false;
  }
}

/**
 * Converts any TON address to user-friendly non-bounceable format (UQ...).
 */
export function toFriendlyAddress(addr?: string | null): string {
  if (!addr) return '';
  try {
    return Address.parse(addr).toString({ bounceable: false });
  } catch {
    return addr;
  }
}
