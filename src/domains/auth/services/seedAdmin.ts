import { generateId } from '@core/utils/id';
import { Admin } from '../models/Admin';
import type { UserRepository } from '../repository/UserRepository';
import type { IPasswordHasher } from './IPasswordHasher';

export const SEED_ADMIN_EMAIL = 'admin@aico.local';
export const SEED_ADMIN_PASSWORD = 'admin1234';

export async function seedAdminIfMissing(
  users: UserRepository,
  hasher: IPasswordHasher,
): Promise<void> {
  if (users.emailExists(SEED_ADMIN_EMAIL)) return;
  const credentials = await hasher.hash(SEED_ADMIN_PASSWORD);
  const admin = new Admin(generateId(), SEED_ADMIN_EMAIL, 'Администратор', new Date(), credentials);
  users.save(admin);
  console.info(
    `[seed] Created admin: ${SEED_ADMIN_EMAIL} / ${SEED_ADMIN_PASSWORD} (development only)`,
  );
}
