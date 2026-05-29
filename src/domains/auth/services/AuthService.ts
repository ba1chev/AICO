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
}

function extractCredentials(user: User): { passwordHash: string; passwordSalt: string; iterations: number } | null {
  if (user instanceof Developer || user instanceof Researcher) return user.credentials;
  if (user instanceof Organization) return user.credentials;
  if (user instanceof Admin) return user.credentials;
  return null;
}
