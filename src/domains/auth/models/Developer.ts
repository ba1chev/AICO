import { User, type UserCredentials } from './User';
import type { Role, Resource } from './Role';

export class Developer extends User {
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
    return 'developer';
  }

  override canAccess(resource: Resource): boolean {
    switch (resource) {
      case 'calculator':
      case 'history':
      case 'compare':
      case 'reports':
      case 'profile':
        return true;
      default:
        return false;
    }
  }
}
