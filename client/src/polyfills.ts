import { Buffer } from 'buffer';

// Ensure Buffer and global are globally available for @ton/core and TonConnect
if (typeof window !== 'undefined') {
  (window as any).Buffer = (window as any).Buffer || Buffer;
  (window as any).global = (window as any).global || window;
}
