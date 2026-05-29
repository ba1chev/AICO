declare const require: (m: string) => { webcrypto: Crypto };

if (typeof globalThis.crypto === 'undefined') {
  (globalThis as { crypto?: Crypto }).crypto = require('node:crypto').webcrypto;
}

export {};
