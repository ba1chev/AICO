import { AppError } from './AppError';

export class NotFoundError extends AppError {
  constructor(entity: string, id: string) {
    super(`${entity} с id "${id}" не е намерен`, `${entity} не е намерен.`);
  }
}
