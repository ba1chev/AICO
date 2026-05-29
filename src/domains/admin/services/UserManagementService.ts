import { DomainError } from '@core/errors/DomainError';
import { ValidationError } from '@core/errors/ValidationError';
import { User } from '@domains/auth/models/User';
import { Developer } from '@domains/auth/models/Developer';
import { Researcher } from '@domains/auth/models/Researcher';
import { Organization } from '@domains/auth/models/Organization';
import { Admin } from '@domains/auth/models/Admin';
import type { Role } from '@domains/auth/models/Role';
import type { UserRepository } from '@domains/auth/repository/UserRepository';
import type { AuthService } from '@domains/auth/services/AuthService';

export type ManagedRole = Exclude<Role, 'guest'>;

export class UserManagementService {
  constructor(
    private readonly users: UserRepository,
    private readonly auth: AuthService,
  ) {}

  list(): User[] {
    return this.users
      .all()
      .slice()
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  }

  deactivate(userId: string): User {
    const user = this.requireUser(userId);
    this.guardSelfMutation(user, 'Не можете да деактивирате собствения си профил.');
    if (!user.active) return user;
    const next = cloneWithActive(user, false);
    this.users.save(next);
    return next;
  }

  activate(userId: string): User {
    const user = this.requireUser(userId);
    if (user.active) return user;
    const next = cloneWithActive(user, true);
    this.users.save(next);
    return next;
  }

  changeRole(userId: string, nextRole: ManagedRole, opts: { organizationName?: string; affiliation?: string | null } = {}): User {
    const user = this.requireUser(userId);
    if (user.role === nextRole) return user;
    this.guardSelfMutation(user, 'Не можете да променяте собствената си роля.');

    if (nextRole === 'organization' && !opts.organizationName?.trim()) {
      throw ValidationError.of('organizationName', 'Името на организацията е задължително.');
    }

    const next = cloneWithRole(user, nextRole, opts);
    this.users.save(next);
    return next;
  }

  private requireUser(userId: string): User {
    const user = this.users.findById(userId);
    if (!user) {
      throw new DomainError(
        `User not found: ${userId}`,
        'Потребителят не съществува.',
      );
    }
    return user;
  }

  private guardSelfMutation(target: User, message: string): void {
    if (target.id === this.auth.current().id) {
      throw new DomainError('Self-mutation blocked', message);
    }
  }
}

function cloneWithActive(user: User, active: boolean): User {
  if (user instanceof Researcher) {
    return new Researcher(
      user.id,
      user.email,
      user.displayName,
      user.createdAt,
      user.credentials,
      user.affiliation,
      active,
    );
  }
  if (user instanceof Developer) {
    return new Developer(user.id, user.email, user.displayName, user.createdAt, user.credentials, active);
  }
  if (user instanceof Organization) {
    return new Organization(
      user.id,
      user.email,
      user.displayName,
      user.createdAt,
      user.credentials,
      user.organizationName,
      active,
    );
  }
  if (user instanceof Admin) {
    return new Admin(user.id, user.email, user.displayName, user.createdAt, user.credentials, active);
  }
  throw new DomainError(`Cannot toggle active for role ${user.role}`, 'Неподдържан тип потребител.');
}

function cloneWithRole(
  user: User,
  nextRole: ManagedRole,
  opts: { organizationName?: string; affiliation?: string | null },
): User {
  const credentials = extractCredentials(user);
  if (!credentials) {
    throw new DomainError(`User has no credentials: ${user.id}`, 'Невалидни данни.');
  }
  switch (nextRole) {
    case 'developer':
      return new Developer(user.id, user.email, user.displayName, user.createdAt, credentials, user.active);
    case 'researcher':
      return new Researcher(
        user.id,
        user.email,
        user.displayName,
        user.createdAt,
        credentials,
        opts.affiliation ?? (user instanceof Researcher ? user.affiliation : null),
        user.active,
      );
    case 'organization':
      return new Organization(
        user.id,
        user.email,
        user.displayName,
        user.createdAt,
        credentials,
        opts.organizationName?.trim() ?? (user instanceof Organization ? user.organizationName : ''),
        user.active,
      );
    case 'admin':
      return new Admin(user.id, user.email, user.displayName, user.createdAt, credentials, user.active);
  }
}

function extractCredentials(user: User): { passwordHash: string; passwordSalt: string; iterations: number } | null {
  if (user instanceof Developer || user instanceof Researcher) return user.credentials;
  if (user instanceof Organization) return user.credentials;
  if (user instanceof Admin) return user.credentials;
  return null;
}
