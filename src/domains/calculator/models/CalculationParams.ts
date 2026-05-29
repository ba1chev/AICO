import { ValidationError, type FieldError } from '@core/errors/ValidationError';
import type { Hardware } from './Hardware';
import type { Region } from './Region';
import { isWorkloadType, type WorkloadType } from './WorkloadType';

export interface CalculationParamsInput {
  hardware: Hardware;
  region: Region;
  durationHours: number;
  pue: number;
  utilization: number;
  hardwareCount: number;
  workloadType: WorkloadType;
}

export class CalculationParams {
  public readonly hardware: Hardware;
  public readonly region: Region;
  public readonly durationHours: number;
  public readonly pue: number;
  public readonly utilization: number;
  public readonly hardwareCount: number;
  public readonly workloadType: WorkloadType;

  private constructor(input: CalculationParamsInput) {
    this.hardware = input.hardware;
    this.region = input.region;
    this.durationHours = input.durationHours;
    this.pue = input.pue;
    this.utilization = input.utilization;
    this.hardwareCount = input.hardwareCount;
    this.workloadType = input.workloadType;
    Object.freeze(this);
  }

  static create(input: CalculationParamsInput): CalculationParams {
    const errors: FieldError[] = [];

    if (!input.hardware) errors.push({ field: 'hardware', message: 'Изберете хардуер.' });
    if (!input.region) errors.push({ field: 'region', message: 'Изберете регион.' });

    if (!Number.isFinite(input.durationHours) || input.durationHours <= 0) {
      errors.push({ field: 'durationHours', message: 'Продължителността трябва да е > 0 часа.' });
    }
    if (input.durationHours > 24 * 365) {
      errors.push({ field: 'durationHours', message: 'Продължителността не може да надвишава 1 година.' });
    }

    if (!Number.isFinite(input.pue) || input.pue < 1.0 || input.pue > 3.0) {
      errors.push({ field: 'pue', message: 'PUE трябва да е между 1.0 и 3.0.' });
    }

    if (!Number.isFinite(input.utilization) || input.utilization <= 0 || input.utilization > 1) {
      errors.push({ field: 'utilization', message: 'Натоварването трябва да е в (0, 1].' });
    }

    if (!Number.isInteger(input.hardwareCount) || input.hardwareCount < 1) {
      errors.push({ field: 'hardwareCount', message: 'Броят хардуер трябва да е цяло число ≥ 1.' });
    }

    if (!isWorkloadType(input.workloadType)) {
      errors.push({ field: 'workloadType', message: 'Невалиден тип натоварване.' });
    }

    if (errors.length) {
      throw new ValidationError(errors, 'Моля поправете грешките във формата.');
    }

    return new CalculationParams(input);
  }
}
