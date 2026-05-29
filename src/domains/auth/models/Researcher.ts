import { Developer } from './Developer';
import type { Role, Resource } from './Role';
import type { UserCredentials } from './User';

export class Researcher extends Developer {
  constructor(
    id: string,
    email: string,
    displayName: string,
    createdAt: Date,
    credentials: UserCredentials,
    public readonly affiliation: string | null,
    active: boolean = true,
  ) {
    super(id, email, displayName, createdAt, credentials, active);
  }

  override get role(): Role {
    return 'researcher';
  }

  override canAccess(resource: Resource): boolean {
    if (resource === 'dashboard') return true;
    return super.canAccess(resource);
  }
}
