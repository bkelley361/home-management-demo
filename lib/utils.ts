import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Generates an RFC 4122 version 4 UUID.
 *
 * Safe across all React Native / Hermes, Web, and Node environments.
 * Checks for global `crypto.randomUUID()`, then `expo-crypto`,
 * and falls back to a compliant pseudo-random UUID v4 string generator.
 */
export function generateUUID(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  try {
    // Dynamic require so missing native module doesn't fail bundle load
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const ExpoCrypto = require('expo-crypto');
    if (ExpoCrypto && typeof ExpoCrypto.randomUUID === 'function') {
      return ExpoCrypto.randomUUID();
    }
  } catch {
    // ExpoCrypto native module not available in current runtime
  }

  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
