import { describe, it, expect } from 'vitest';
import { PBKDF2PasswordHasher } from '@domains/auth/services/PBKDF2PasswordHasher';

describe('PBKDF2PasswordHasher', () => {
  const hasher = new PBKDF2PasswordHasher(10_000);

  it('генерира различен hash за една и съща парола (различен salt)', async () => {
    const a = await hasher.hash('correct horse battery staple');
    const b = await hasher.hash('correct horse battery staple');
    expect(a.passwordHash).not.toBe(b.passwordHash);
    expect(a.passwordSalt).not.toBe(b.passwordSalt);
  });

  it('verify приема правилна парола', async () => {
    const stored = await hasher.hash('Tr0ub4dor&3');
    expect(await hasher.verify('Tr0ub4dor&3', stored)).toBe(true);
  });

  it('verify отхвърля грешна парола', async () => {
    const stored = await hasher.hash('Tr0ub4dor&3');
    expect(await hasher.verify('wrong-password', stored)).toBe(false);
  });

  it('записва iterations за бъдеща съвместимост', async () => {
    const stored = await hasher.hash('x');
    expect(stored.iterations).toBe(10_000);
  });
});
