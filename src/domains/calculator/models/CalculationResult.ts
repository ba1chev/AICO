
export class CalculationResult {
  private constructor(
    public readonly energyKWh: number,
    public readonly co2eGrams: number,
    public readonly waterLiters: number,
  ) {
    Object.freeze(this);
  }

  static of(energyKWh: number, co2eGrams: number, waterLiters: number): CalculationResult {
    return new CalculationResult(energyKWh, co2eGrams, waterLiters);
  }

  get co2eKg(): number {
    return this.co2eGrams / 1000;
  }

  toJSON(): { energyKWh: number; co2eGrams: number; waterLiters: number } {
    return {
      energyKWh: this.energyKWh,
      co2eGrams: this.co2eGrams,
      waterLiters: this.waterLiters,
    };
  }

  static fromJSON(raw: unknown): CalculationResult {
    const o = raw as Partial<{ energyKWh: number; co2eGrams: number; waterLiters: number }>;
    if (
      typeof o?.energyKWh !== 'number' ||
      typeof o.co2eGrams !== 'number' ||
      typeof o.waterLiters !== 'number'
    ) {
      throw new Error('CalculationResult: invalid JSON.');
    }
    return new CalculationResult(o.energyKWh, o.co2eGrams, o.waterLiters);
  }
}
