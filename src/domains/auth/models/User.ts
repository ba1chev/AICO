import type { Identifiable } from '@core/storage';
import type { Role, Resource } from './Role';

export interface UserCredentials {
  passwordHash: string;
  passwordSalt: string;
  iterations: number;
}

export abstract class User implements Identifiable {
  constructor(
    public readonly id: string,
    public readonly email: string,
    public readonly displayName: string,
    public readonly createdAt: Date,
    public readonly active: boolean = true,
  ) {}

  abstract get role(): Role;

  abstract canAccess(resource: Resource): boolean;

  isAuthenticated(): boolean {
    return this.role !== 'guest';
  }

  isAdmin(): boolean {
    return this.role === 'admin';
  }
}
