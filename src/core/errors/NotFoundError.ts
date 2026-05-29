import { AppError } from './AppError';

export class NotFoundError extends AppError {
  constructor(entity: string, id: string) {
    super(`${entity} with id "${id}" not found`, `${entity} не е намерен.`);
  }
}
