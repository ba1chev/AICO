import { describe, it, expect, beforeEach } from 'vitest';
import { MemoryStorageAdapter } from '@core/storage';
import { EventBus } from '@core/view/EventBus';
import { UserRepository } from '@domains/auth/repository/UserRepository';
import { PBKDF2PasswordHasher } from '@domains/auth/services/PBKDF2PasswordHasher';
import { SessionManager } from '@domains/auth/services/SessionManager';
import { AuthService } from '@domains/auth/services/AuthService';
import { UserManagementService } from '@domains/admin/services/UserManagementService';
import { Admin } from '@domains/auth/models/Admin';
import { DomainError } from '@core/errors/DomainError';
import { ValidationError } from '@core/errors/ValidationError';
import { Researcher } from '@domains/auth/models/Researcher';
import { Organization } from '@domains/auth/models/Organization';
import { generateId } from '@core/utils/id';

async function makeEnv() {
  const storage = new MemoryStorageAdapter();
  const bus = new EventBus();
  const users = new UserRepository(storage);
  const hasher = new PBKDF2PasswordHasher(1000);
  const sessions = new SessionManager(storage);
  const auth = new AuthService(users, hasher, sessions, bus);

  const adminCreds = await hasher.hash('parola123');
  const adminId = generateId();
  const adminUser = new Admin(adminId, 'admin@a.bg', 'Admin', new Date(2026, 0, 1), adminCreds, true);
  users.save(adminUser);

  const target = await auth.register({
    email: 'dev@a.bg',
    displayName: 'Dev',
    password: 'parola123',
    passwordConfirm: 'parola123',
    role: 'developer',
  });
  auth.logout();

  await auth.login('admin@a.bg', 'parola123');

  const svc = new UserManagementService(users, auth);
  return { svc, auth, users, adminId, targetId: target.id };
}

describe('UserManagementService', () => {
  let env: Awaited<ReturnType<typeof makeEnv>>;
  beforeEach(async () => {
    env = await makeEnv();
  });

  it('list returns users sorted by createdAt', () => {
    const users = env.svc.list();
    expect(users.length).toBe(2);
    expect(users[0]?.id).toBe(env.adminId);
  });

  it('deactivate flips the active flag and persists', () => {
    const next = env.svc.deactivate(env.targetId);
    expect(next.active).toBe(false);
    expect(env.users.findById(env.targetId)?.active).toBe(false);
  });

  it('activate restores the active flag', () => {
    env.svc.deactivate(env.targetId);
    const next = env.svc.activate(env.targetId);
    expect(next.active).toBe(true);
  });

  it('refuses to deactivate the current admin', () => {
    expect(() => env.svc.deactivate(env.adminId)).toThrow(DomainError);
  });

  it('refuses to change the current admin role', () => {
    expect(() => env.svc.changeRole(env.adminId, 'developer')).toThrow(DomainError);
  });

  it('changeRole to researcher sets affiliation', () => {
    const next = env.svc.changeRole(env.targetId, 'researcher', { affiliation: 'FMI' });
    expect(next).toBeInstanceOf(Researcher);
    expect((next as Researcher).affiliation).toBe('FMI');
  });

  it('changeRole to organization requires organizationName', () => {
    expect(() => env.svc.changeRole(env.targetId, 'organization')).toThrow(ValidationError);
  });

  it('changeRole to organization persists organizationName', () => {
    const next = env.svc.changeRole(env.targetId, 'organization', { organizationName: 'Acme' });
    expect(next).toBeInstanceOf(Organization);
    expect((next as Organization).organizationName).toBe('Acme');
  });

  it('throws DomainError when user is missing', () => {
    expect(() => env.svc.deactivate('nope')).toThrow(DomainError);
  });
});
