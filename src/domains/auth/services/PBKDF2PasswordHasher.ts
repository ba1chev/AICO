import type { HashedPassword, IPasswordHasher } from './IPasswordHasher';

const DEFAULT_ITERATIONS = 100_000;
const SALT_BYTES = 16;
const KEY_BITS = 256;

export class PBKDF2PasswordHasher implements IPasswordHasher {
  constructor(private readonly iterations = DEFAULT_ITERATIONS) {}

  async hash(plaintext: string): Promise<HashedPassword> {
    const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES));
    const hash = await this.derive(plaintext, salt, this.iterations);
    return {
      passwordHash: bytesToBase64(hash),
      passwordSalt: bytesToBase64(salt),
      iterations: this.iterations,
    };
  }

  async verify(plaintext: string, expected: HashedPassword): Promise<boolean> {
    const salt = base64ToBytes(expected.passwordSalt);
    const candidate = await this.derive(plaintext, salt, expected.iterations);
    const actual = base64ToBytes(expected.passwordHash);
    return constantTimeEquals(candidate, actual);
  }

  private async derive(plaintext: string, salt: Uint8Array, iterations: number): Promise<Uint8Array> {
    const enc = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      enc.encode(plaintext),
      { name: 'PBKDF2' },
      false,
      ['deriveBits'],
    );
    const bits = await crypto.subtle.deriveBits(
      { name: 'PBKDF2', salt: salt as BufferSource, iterations, hash: 'SHA-256' },
      keyMaterial,
      KEY_BITS,
    );
    return new Uint8Array(bits);
  }
}

function bytesToBase64(bytes: Uint8Array): string {
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
}

function base64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function constantTimeEquals(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= (a[i]! ^ b[i]!);
  return diff === 0;
}
