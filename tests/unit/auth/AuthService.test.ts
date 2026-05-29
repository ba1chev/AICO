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

  it('register създава developer и стартира session', async () => {
    const user = await env.auth.register({
      email: 'Dev@Example.com',
      displayName: 'Дев',
      password: 'parola123',
      passwordConfirm: 'parola123',
      role: 'developer',
    });
    expect(user.role).toBe('developer');
    expect(user.email).toBe('dev@example.com');
    expect(env.auth.isAuthenticated()).toBe(true);
    expect(env.sessions.load()).not.toBeNull();
  });

  it('register с researcher запазва affiliation', async () => {
    const user = await env.auth.register({
      email: 'r@x.bg',
      displayName: 'Рая',
      password: 'parola123',
      passwordConfirm: 'parola123',
      role: 'researcher',
      affiliation: 'ФМИ',
    });
    expect(user).toBeInstanceOf(Researcher);
    expect((user as Researcher).affiliation).toBe('ФМИ');
  });

  it('register отхвърля несъвпадащи пароли', async () => {
    await expect(
      env.auth.register({
        email: 'a@b.bg',
        displayName: 'Алекс',
        password: 'parola123',
        passwordConfirm: 'друго123',
        role: 'developer',
      }),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it('register отхвърля къса парола и невалиден имейл наведнъж', async () => {
    try {
      await env.auth.register({
        email: 'invalid',
        displayName: 'X',
        password: '12',
        passwordConfirm: '12',
        role: 'developer',
      });
      expect.fail('трябваше да хвърли');
    } catch (e) {
      const err = e as ValidationError;
      expect(err.errors.length).toBeGreaterThanOrEqual(3);
      expect(err.hasField('email')).toBe(true);
      expect(err.hasField('password')).toBe(true);
    }
  });

  it('register отхвърля дублиран имейл', async () => {
    await env.auth.register({
      email: 'dup@x.bg',
      displayName: 'Първи',
      password: 'parola123',
      passwordConfirm: 'parola123',
      role: 'developer',
    });
    env.auth.logout();
    await expect(
      env.auth.register({
        email: 'DUP@x.bg',
        displayName: 'Втори',
        password: 'parola123',
        passwordConfirm: 'parola123',
        role: 'developer',
      }),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it('login успява с правилни данни', async () => {
    await env.auth.register({
      email: 'a@b.bg',
      displayName: 'Алекс',
      password: 'parola123',
      passwordConfirm: 'parola123',
      role: 'developer',
    });
    env.auth.logout();
    const user = await env.auth.login('a@b.bg', 'parola123');
    expect(user.email).toBe('a@b.bg');
    expect(env.auth.current().isAuthenticated()).toBe(true);
  });

  it('login отхвърля грешна парола с DomainError', async () => {
    await env.auth.register({
      email: 'a@b.bg',
      displayName: 'Алекс',
      password: 'parola123',
      passwordConfirm: 'parola123',
      role: 'developer',
    });
    env.auth.logout();
    await expect(env.auth.login('a@b.bg', 'wrong')).rejects.toBeInstanceOf(DomainError);
  });

  it('logout връща current на Guest', async () => {
    await env.auth.register({
      email: 'a@b.bg',
      displayName: 'Алекс',
      password: 'parola123',
      passwordConfirm: 'parola123',
      role: 'developer',
    });
    env.auth.logout();
    expect(env.auth.current()).toBeInstanceOf(Guest);
    expect(env.sessions.load()).toBeNull();
  });

  it('restore възстановява потребителя от session-а', async () => {
    await env.auth.register({
      email: 'a@b.bg',
      displayName: 'Алекс',
      password: 'parola123',
      passwordConfirm: 'parola123',
      role: 'developer',
    });
    const restored = await env.auth.restore();
    expect(restored.email).toBe('a@b.bg');
  });
});
