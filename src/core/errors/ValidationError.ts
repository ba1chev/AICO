import { AppError } from './AppError';

export interface FieldError {
  field: string;
  message: string;
}

export class ValidationError extends AppError {
  public readonly errors: readonly FieldError[];

  constructor(errors: FieldError[], userMessage = 'Невалидни данни') {
    super(`ValidationError: ${errors.map((e) => `${e.field}: ${e.message}`).join('; ')}`, userMessage);
    this.errors = errors;
  }

  hasField(field: string): boolean {
    return this.errors.some((e) => e.field === field);
  }

  getFieldError(field: string): string | undefined {
    return this.errors.find((e) => e.field === field)?.message;
  }

  static of(field: string, message: string): ValidationError {
    return new ValidationError([{ field, message }], message);
  }
}
