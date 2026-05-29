import type { Identifiable } from '@core/storage';

export const MAX_SCENARIOS = 3;
export const MIN_SCENARIOS = 2;

export class ScenarioComparison implements Identifiable {
  constructor(
    public readonly id: string,
    public readonly name: string,
    public readonly calculationIds: readonly string[],
    public readonly createdAt: Date,
    public readonly userId: string | null = null,
  ) {
    Object.freeze(this);
    Object.freeze(this.calculationIds);
  }

  withCalculation(calculationId: string): ScenarioComparison {
    if (this.calculationIds.includes(calculationId)) return this;
    if (this.calculationIds.length >= MAX_SCENARIOS) {
      throw new Error(`Cannot add more than ${MAX_SCENARIOS} scenarios.`);
    }
    return new ScenarioComparison(
      this.id,
      this.name,
      [...this.calculationIds, calculationId],
      this.createdAt,
      this.userId,
    );
  }

  withoutCalculation(calculationId: string): ScenarioComparison {
    return new ScenarioComparison(
      this.id,
      this.name,
      this.calculationIds.filter((id) => id !== calculationId),
      this.createdAt,
      this.userId,
    );
  }

  withName(name: string): ScenarioComparison {
    return new ScenarioComparison(this.id, name, this.calculationIds, this.createdAt, this.userId);
  }

  isReady(): boolean {
    return this.calculationIds.length >= MIN_SCENARIOS;
  }
}
