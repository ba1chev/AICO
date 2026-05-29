import { User, type UserCredentials } from './User';
import type { Role, Resource } from './Role';

export class Organization extends User {
  constructor(
    id: string,
    email: string,
    displayName: string,
    createdAt: Date,
    public readonly credentials: UserCredentials,
    public readonly organizationName: string,
    active: boolean = true,
  ) {
    super(id, email, displayName, createdAt, active);
  }

  override get role(): Role {
    return 'organization';
  }

  override canAccess(resource: Resource): boolean {
    switch (resource) {
      case 'calculator':
      case 'history':
      case 'compare':
      case 'reports':
      case 'dashboard':
      case 'profile':
        return true;
      default:
        return false;
    }
  }
}
