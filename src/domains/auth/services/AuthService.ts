import type { EventBus } from '@core/view/EventBus';
import { ValidationError, type FieldError } from '@core/errors/ValidationError';
import { DomainError } from '@core/errors/DomainError';
import { generateId } from '@core/utils/id';
import { User } from '../models/User';
import { Guest } from '../models/Guest';
import { Developer } from '../models/Developer';
import { Researcher } from '../models/Researcher';
import { Organization } from '../models/Organization';
import { Admin } from '../models/Admin';
import { Session } from '../models/Session';
import type { Role } from '../models/Role';
import type { UserRepository } from '../repository/UserRepository';
import type { IPasswordHasher } from './IPasswordHasher';
import type { SessionManager } from './SessionManager';

export interface RegisterInput {
  email: string;
  displayName: string;
  password: string;
  passwordConfirm: string;
  role: Exclude<Role, 'guest' | 'admin'>;
  organizationName?: string;
  affiliation?: string;
}

export class AuthService {
  private currentUser: User = new Guest();

  constructor(
    private readonly users: UserRepository,
    private readonly hasher: IPasswordHasher,
    private readonly sessions: SessionManager,
    private readonly bus: EventBus,
  ) {}

  async restore(): Promise<User> {
    const session = this.sessions.load();
    if (!session) {
      this.currentUser = new Guest();
      return this.currentUser;
    }
    const user = this.users.findById(session.userId);
    if (!user || !user.active) {
      this.sessions.clear();
      this.currentUser = new Guest();
      return this.currentUser;
    }
    this.currentUser = user;
    this.bus.emit('auth:restored', { user });
    return user;
  }

  current(): User {
    return this.currentUser;
  }

  async register(input: RegisterInput): Promise<User> {
    const errors: FieldError[] = [];
    const email = input.email.trim().toLowerCase();
    if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      errors.push({ field: 'email', message: 'Въведете валиден имейл.' });
    }
    if (!input.displayName || input.displayName.trim().length < 2) {
      errors.push({ field: 'displayName', message: 'Името трябва да е поне 2 символа.' });
    }
    if (!input.password || input.password.length < 8) {
      errors.push({ field: 'password', message: 'Паролата трябва да е поне 8 символа.' });
    }
    if (input.password !== input.passwordConfirm) {
      errors.push({ field: 'passwordConfirm', message: 'Паролите не съвпадат.' });
    }
    if (input.role === 'organization' && !input.organizationName?.trim()) {
      errors.push({ field: 'organizationName', message: 'Името на организацията е задължително.' });
    }
    if (errors.length === 0 && this.users.emailExists(email)) {
      errors.push({ field: 'email', message: 'Имейлът вече се използва.' });
    }
    if (errors.length) throw new ValidationError(errors);

    const credentials = await this.hasher.hash(input.password);
    const id = generateId();
    const now = new Date();
    let user: User;
    switch (input.role) {
      case 'developer':
        user = new Developer(id, email, input.displayName.trim(), now, credentials);
        break;
      case 'researcher':
        user = new Researcher(
          id,
          email,
          input.displayName.trim(),
          now,
          credentials,
          input.affiliation?.trim() || null,
        );
        break;
      case 'organization':
        user = new Organization(
          id,
          email,
          input.displayName.trim(),
          now,
          credentials,
          input.organizationName!.trim(),
        );
        break;
    }
    this.users.save(user);
    await this.startSession(user);
    this.bus.emit('auth:registered', { user });
    return user;
  }

  async login(email: string, password: string): Promise<User> {
    const user = this.users.findByEmail(email.trim().toLowerCase());
    const creds = user ? extractCredentials(user) : null;
    if (!user || !creds) {
      throw new DomainError('Login failed: user not found', 'Грешен имейл или парола.');
    }
    if (!user.active) {
      throw new DomainError(
        'Login failed: account deactivated',
        'Профилът е деактивиран. Свържете се с администратор.',
      );
    }
    const ok = await this.hasher.verify(password, creds);
    if (!ok) {
      throw new DomainError('Login failed: bad password', 'Грешен имейл или парола.');
    }
    await this.startSession(user);
    this.bus.emit('auth:login', { user });
    return user;
  }

  async loginWithOAuth(provider: 'google' | 'github', email: string, displayName: string): Promise<User> {
    let user = this.users.findByEmail(email);
    if (!user) {
      const credentials = await this.hasher.hash(`oauth:${provider}:${generateId()}`);
      user = new Developer(generateId(), email.trim().toLowerCase(), displayName, new Date(), credentials);
      this.users.save(user);
    }
    await this.startSession(user);
    this.bus.emit('auth:login', { user, provider });
    return user;
  }

  logout(): void {
    const previous = this.currentUser;
    this.sessions.clear();
    this.currentUser = new Guest();
    this.bus.emit('auth:logout', { previous });
  }

  isAuthenticated(): boolean {
    return this.currentUser.isAuthenticated();
  }

  hasRole(...roles: Role[]): boolean {
    return roles.includes(this.currentUser.role);
  }

  private async startSession(user: User): Promise<void> {
    const session = Session.issue(user.id, user.role);
    this.sessions.save(session);
    this.currentUser = user;
  }

  async updateProfile(input: { displayName?: string; organizationName?: string; affiliation?: string }): Promise<User> {
    const current = this.currentUser;
    if (!current.isAuthenticated()) {
      throw new DomainError('Not authenticated', 'Не сте влезли в системата.');
    }
    const errors: FieldError[] = [];
    const displayName = input.displayName?.trim();
    if (displayName !== undefined && displayName.length < 2) {
      errors.push({ field: 'displayName', message: 'Името трябва да е поне 2 символа.' });
    }
    if (errors.length) throw new ValidationError(errors);

    const finalName = displayName ?? current.displayName;
    let updated: User;
    if (current instanceof Organization) {
      updated = new Organization(
        current.id,
        current.email,
        finalName,
        current.createdAt,
        current.credentials,
        input.organizationName?.trim() || current.organizationName,
        current.active,
      );
    } else if (current instanceof Researcher) {
      updated = new Researcher(
        current.id,
        current.email,
        finalName,
        current.createdAt,
        current.credentials,
        input.affiliation?.trim() ?? current.affiliation,
        current.active,
      );
    } else if (current instanceof Developer) {
      updated = new Developer(
        current.id,
        current.email,
        finalName,
        current.createdAt,
        current.credentials,
        current.active,
      );
    } else if (current instanceof Admin) {
      updated = new Admin(current.id, current.email, finalName, current.createdAt, current.credentials, current.active);
    } else {
      throw new DomainError('Cannot update guest profile', 'Не можете да редактирате гост профил.');
    }
    this.users.save(updated);
    this.currentUser = updated;
    this.bus.emit('auth:profile-updated', { user: updated });
    return updated;
  }

  async changePassword(currentPassword: string, newPassword: string, confirmPassword: string): Promise<void> {
    const current = this.currentUser;
    const creds = extractCredentials(current);
    if (!current.isAuthenticated() || !creds) {
      throw new DomainError('Not authenticated', 'Не сте влезли в системата.');
    }
    const errors: FieldError[] = [];
    if (newPassword.length < 8) {
      errors.push({ field: 'newPassword', message: 'Паролата трябва да е поне 8 символа.' });
    }
    if (newPassword !== confirmPassword) {
      errors.push({ field: 'confirmPassword', message: 'Паролите не съвпадат.' });
    }
    if (errors.length) throw new ValidationError(errors);

    const ok = await this.hasher.verify(currentPassword, creds);
    if (!ok) {
      throw new DomainError('Wrong current password', 'Текущата парола е грешна.');
    }
    const newCreds = await this.hasher.hash(newPassword);
    let updated: User;
    if (current instanceof Organization) {
      updated = new Organization(current.id, current.email, current.displayName, current.createdAt, newCreds, current.organizationName, current.active);
    } else if (current instanceof Researcher) {
      updated = new Researcher(current.id, current.email, current.displayName, current.createdAt, newCreds, current.affiliation, current.active);
    } else if (current instanceof Developer) {
      updated = new Developer(current.id, current.email, current.displayName, current.createdAt, newCreds, current.active);
    } else if (current instanceof Admin) {
      updated = new Admin(current.id, current.email, current.displayName, current.createdAt, newCreds, current.active);
    } else {
      throw new DomainError('Cannot change password', 'Не може да се смени парола.');
    }
    this.users.save(updated);
    this.currentUser = updated;
  }

  deleteAccount(): void {
    const current = this.currentUser;
    if (!current.isAuthenticated()) {
      throw new DomainError('Not authenticated', 'Не сте влезли в системата.');
    }
    this.users.remove(current.id);
    this.sessions.clear();
    this.currentUser = new Guest();
    this.bus.emit('auth:logout', { previous: current });
  }
}

function extractCredentials(user: User): { passwordHash: string; passwordSalt: string; iterations: number } | null {
  if (user instanceof Developer || user instanceof Researcher) return user.credentials;
  if (user instanceof Organization) return user.credentials;
  if (user instanceof Admin) return user.credentials;
  return null;
}
