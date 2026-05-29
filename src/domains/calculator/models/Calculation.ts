import type { CalculationParams } from './CalculationParams';
import type { CalculationResult } from './CalculationResult';
import type { Identifiable } from '@core/storage';

export class Calculation implements Identifiable {
  constructor(
    public readonly id: string,
    public readonly params: CalculationParams,
    public readonly result: CalculationResult,
    public readonly createdAt: Date,
    public readonly userId: string | null = null,
    public readonly label: string | null = null,
  ) {
    Object.freeze(this);
  }
}
