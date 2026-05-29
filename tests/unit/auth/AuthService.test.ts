import { describe, it, expect, beforeEach } from 'vitest';
import { MemoryStorageAdapter } from '@core/storage';
import { EventBus } from '@core/view/EventBus';
import { UserRepository } from '@domains/auth/repository/UserRepository';
import { PBKDF2PasswordHasher } from '@domains/auth/services/PBKDF2PasswordHasher';
import { SessionManager } from '@domains/auth/services/SessionManager';
import { AuthService } from '@domains/auth/services/AuthService';
import { ValidationError } from '@core/errors/ValidationError';
import { DomainError } from '@core/errors/DomainError';
import { Guest } from '@domains/auth/models/Guest';
import { Researcher } from '@domains/auth/models/Researcher';

function makeAuth() {
  const storage = new MemoryStorageAdapter();
  const bus = new EventBus();
  const users = new UserRepository(storage);
  const hasher = new PBKDF2PasswordHasher(1000);
  const sessions = new SessionManager(storage);
  const auth = new AuthService(users, hasher, sessions, bus);
  return { auth, users, sessions, bus };
}

describe('AuthService', () => {
  let env: ReturnType<typeof makeAuth>;
  beforeEach(() => {
    env = makeAuth();
  });

  it('register creates a developer and starts a session', async () => {
    const user = await env.auth.register({
      email: 'Dev@Example.com',
      displayName: 'Dev',
      password: 'parola123',
      passwordConfirm: 'parola123',
      role: 'developer',
    });
    expect(user.role).toBe('developer');
    expect(user.email).toBe('dev@example.com');
    expect(env.auth.isAuthenticated()).toBe(true);
    expect(env.sessions.load()).not.toBeNull();
  });

  it('register with researcher persists affiliation', async () => {
    const user = await env.auth.register({
      email: 'r@x.bg',
      displayName: 'Raya',
      password: 'parola123',
      passwordConfirm: 'parola123',
      role: 'researcher',
      affiliation: 'FMI',
    });
    expect(user).toBeInstanceOf(Researcher);
    expect((user as Researcher).affiliation).toBe('FMI');
  });

  it('register rejects mismatched passwords', async () => {
    await expect(
      env.auth.register({
        email: 'a@b.bg',
        displayName: 'Alex',
        password: 'parola123',
        passwordConfirm: 'drugo123',
        role: 'developer',
      }),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it('register rejects short password and invalid email at once', async () => {
    try {
      await env.auth.register({
        email: 'invalid',
        displayName: 'X',
        password: '12',
        passwordConfirm: '12',
        role: 'developer',
      });
      expect.fail('expected to throw');
    } catch (e) {
      const err = e as ValidationError;
      expect(err.errors.length).toBeGreaterThanOrEqual(3);
      expect(err.hasField('email')).toBe(true);
      expect(err.hasField('password')).toBe(true);
    }
  });

  it('register rejects duplicate email', async () => {
    await env.auth.register({
      email: 'dup@x.bg',
      displayName: 'First',
      password: 'parola123',
      passwordConfirm: 'parola123',
      role: 'developer',
    });
    env.auth.logout();
    await expect(
      env.auth.register({
        email: 'DUP@x.bg',
        displayName: 'Second',
        password: 'parola123',
        passwordConfirm: 'parola123',
        role: 'developer',
      }),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it('login succeeds with correct credentials', async () => {
    await env.auth.register({
      email: 'a@b.bg',
      displayName: 'Alex',
      password: 'parola123',
      passwordConfirm: 'parola123',
      role: 'developer',
    });
    env.auth.logout();
    const user = await env.auth.login('a@b.bg', 'parola123');
    expect(user.email).toBe('a@b.bg');
    expect(env.auth.current().isAuthenticated()).toBe(true);
  });

  it('login rejects wrong password with DomainError', async () => {
    await env.auth.register({
      email: 'a@b.bg',
      displayName: 'Alex',
      password: 'parola123',
      passwordConfirm: 'parola123',
      role: 'developer',
    });
    env.auth.logout();
    await expect(env.auth.login('a@b.bg', 'wrong')).rejects.toBeInstanceOf(DomainError);
  });

  it('logout returns current to Guest', async () => {
    await env.auth.register({
      email: 'a@b.bg',
      displayName: 'Alex',
      password: 'parola123',
      passwordConfirm: 'parola123',
      role: 'developer',
    });
    env.auth.logout();
    expect(env.auth.current()).toBeInstanceOf(Guest);
    expect(env.sessions.load()).toBeNull();
  });

  it('restore brings the user back from session', async () => {
    await env.auth.register({
      email: 'a@b.bg',
      displayName: 'Alex',
      password: 'parola123',
      passwordConfirm: 'parola123',
      role: 'developer',
    });
    const restored = await env.auth.restore();
    expect(restored.email).toBe('a@b.bg');
  });
});
