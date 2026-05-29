import { User, type UserCredentials } from './User';
import type { Role, Resource } from './Role';

export class Admin extends User {
  constructor(
    id: string,
    email: string,
    displayName: string,
    createdAt: Date,
    public readonly credentials: UserCredentials,
  ) {
    super(id, email, displayName, createdAt);
  }

  override get role(): Role {
    return 'admin';
  }

  override canAccess(_resource: Resource): boolean {
    return true;
  }
}
