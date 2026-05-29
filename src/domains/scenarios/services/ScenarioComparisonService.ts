import { generateId } from '@core/utils/id';
import { DomainError } from '@core/errors/DomainError';
import { ScenarioComparison, MAX_SCENARIOS, MIN_SCENARIOS } from '../models/ScenarioComparison';
import type { ScenarioRepository } from '../repository/ScenarioRepository';
import type { CalculationRepository } from '@domains/calculator/repository/CalculationRepository';
import type { Calculation } from '@domains/calculator/models/Calculation';

export interface PopulatedScenario {
  scenario: ScenarioComparison;
  calculations: Calculation[];
}

export class ScenarioComparisonService {
  constructor(
    private readonly scenarios: ScenarioRepository,
    private readonly calculations: CalculationRepository,
  ) {}

  create(name: string, userId: string | null, calculationIds: string[] = []): ScenarioComparison {
    if (calculationIds.length > MAX_SCENARIOS) {
      throw new DomainError(
        'Too many scenarios',
        `Сравнението не може да съдържа повече от ${MAX_SCENARIOS} сценария.`,
      );
    }
    const unique = Array.from(new Set(calculationIds));
    const scenario = new ScenarioComparison(generateId(), name.trim() || 'Ново сравнение', unique, new Date(), userId);
    this.scenarios.save(scenario);
    return scenario;
  }

  addCalculation(scenarioId: string, calculationId: string): ScenarioComparison {
    const scenario = this.scenarios.getById(scenarioId);
    if (scenario.calculationIds.includes(calculationId)) return scenario;
    if (scenario.calculationIds.length >= MAX_SCENARIOS) {
      throw new DomainError(
        'Scenario limit reached',
        `Не може да добавите повече от ${MAX_SCENARIOS} сценария.`,
      );
    }
    const updated = scenario.withCalculation(calculationId);
    this.scenarios.save(updated);
    return updated;
  }

  removeCalculation(scenarioId: string, calculationId: string): ScenarioComparison {
    const scenario = this.scenarios.getById(scenarioId);
    const updated = scenario.withoutCalculation(calculationId);
    this.scenarios.save(updated);
    return updated;
  }

  rename(scenarioId: string, name: string): ScenarioComparison {
    const scenario = this.scenarios.getById(scenarioId);
    const updated = scenario.withName(name.trim() || scenario.name);
    this.scenarios.save(updated);
    return updated;
  }

  delete(scenarioId: string): void {
    this.scenarios.remove(scenarioId);
  }

  populate(scenario: ScenarioComparison): PopulatedScenario {
    const calculations = scenario.calculationIds
      .map((id) => this.calculations.findById(id))
      .filter((c): c is Calculation => c !== null);
    return { scenario, calculations };
  }

  listForUser(userId: string | null): ScenarioComparison[] {
    return this.scenarios.findByUser(userId).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  static get limits(): { min: number; max: number } {
    return { min: MIN_SCENARIOS, max: MAX_SCENARIOS };
  }
}
