import { Repository } from '@core/storage';
import type { IStorage } from '@core/storage';
import { ValidationError } from '@core/errors/ValidationError';
import { User, type UserCredentials } from '../models/User';
import { Developer } from '../models/Developer';
import { Researcher } from '../models/Researcher';
import { Organization } from '../models/Organization';
import { Admin } from '../models/Admin';
import type { Role } from '../models/Role';

interface UserDTO {
  id: string;
  email: string;
  displayName: string;
  createdAt: string;
  role: Exclude<Role, 'guest'>;
  credentials: UserCredentials;
  affiliation?: string | null;
  organizationName?: string;
}

export class UserRepository extends Repository<User> {
  constructor(storage: IStorage) {
    super(storage, 'users');
  }

  findByEmail(email: string): User | null {
    const normalised = email.trim().toLowerCase();
    return this.all().find((u) => u.email.toLowerCase() === normalised) ?? null;
  }

  emailExists(email: string): boolean {
    return this.findByEmail(email) !== null;
  }

  protected override serialize(entity: User): UserDTO {
    if (entity instanceof Researcher) {
      return {
        id: entity.id,
        email: entity.email,
        displayName: entity.displayName,
        createdAt: entity.createdAt.toISOString(),
        role: 'researcher',
        credentials: entity.credentials,
        affiliation: entity.affiliation,
      };
    }
    if (entity instanceof Developer) {
      return {
        id: entity.id,
        email: entity.email,
        displayName: entity.displayName,
        createdAt: entity.createdAt.toISOString(),
        role: 'developer',
        credentials: entity.credentials,
      };
    }
    if (entity instanceof Organization) {
      return {
        id: entity.id,
        email: entity.email,
        displayName: entity.displayName,
        createdAt: entity.createdAt.toISOString(),
        role: 'organization',
        credentials: entity.credentials,
        organizationName: entity.organizationName,
      };
    }
    if (entity instanceof Admin) {
      return {
        id: entity.id,
        email: entity.email,
        displayName: entity.displayName,
        createdAt: entity.createdAt.toISOString(),
        role: 'admin',
        credentials: entity.credentials,
      };
    }
    throw ValidationError.of('user', `Cannot serialize user with role ${entity.role}.`);
  }

  protected override deserialize(raw: unknown): User {
    const dto = raw as UserDTO;
    const created = new Date(dto.createdAt);
    switch (dto.role) {
      case 'researcher':
        return new Researcher(
          dto.id,
          dto.email,
          dto.displayName,
          created,
          dto.credentials,
          dto.affiliation ?? null,
        );
      case 'developer':
        return new Developer(dto.id, dto.email, dto.displayName, created, dto.credentials);
      case 'organization':
        return new Organization(
          dto.id,
          dto.email,
          dto.displayName,
          created,
          dto.credentials,
          dto.organizationName ?? '',
        );
      case 'admin':
        return new Admin(dto.id, dto.email, dto.displayName, created, dto.credentials);
      default:
        throw ValidationError.of('role', `Invalid role in storage: ${(dto as UserDTO).role}`);
    }
  }
}
