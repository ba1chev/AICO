import { User } from './User';
import type { Role, Resource } from './Role';

export class Guest extends User {
  constructor() {
    super('guest', '', 'Гост', new Date(0));
  }

  override get role(): Role {
    return 'guest';
  }

  override canAccess(resource: Resource): boolean {
    return resource === 'calculator';
  }
}
