import { describe, it, expect } from 'vitest';
import { PBKDF2PasswordHasher } from '@domains/auth/services/PBKDF2PasswordHasher';

describe('PBKDF2PasswordHasher', () => {
  const hasher = new PBKDF2PasswordHasher(10_000);

  it('produces a different hash for the same password (different salt)', async () => {
    const a = await hasher.hash('correct horse battery staple');
    const b = await hasher.hash('correct horse battery staple');
    expect(a.passwordHash).not.toBe(b.passwordHash);
    expect(a.passwordSalt).not.toBe(b.passwordSalt);
  });

  it('verify accepts the correct password', async () => {
    const stored = await hasher.hash('Tr0ub4dor&3');
    expect(await hasher.verify('Tr0ub4dor&3', stored)).toBe(true);
  });

  it('verify rejects a wrong password', async () => {
    const stored = await hasher.hash('Tr0ub4dor&3');
    expect(await hasher.verify('wrong-password', stored)).toBe(false);
  });

  it('records iterations for forward compatibility', async () => {
    const stored = await hasher.hash('x');
    expect(stored.iterations).toBe(10_000);
  });
});
