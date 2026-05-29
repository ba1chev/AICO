import { describe, it, expect, beforeEach } from 'vitest';
import { MemoryStorageAdapter } from '@core/storage';
import { ScenarioRepository } from '@domains/scenarios/repository/ScenarioRepository';
import { ScenarioComparisonService } from '@domains/scenarios/services/ScenarioComparisonService';
import { CalculationRepository } from '@domains/calculator/repository/CalculationRepository';
import { Calculation } from '@domains/calculator/models/Calculation';
import { CalculationParams } from '@domains/calculator/models/CalculationParams';
import { CalculationResult } from '@domains/calculator/models/CalculationResult';
import { Hardware } from '@domains/calculator/models/Hardware';
import { Region } from '@domains/calculator/models/Region';
import { DomainError } from '@core/errors/DomainError';

const hw = Hardware.fromJSON({
  id: 'a100', name: 'A100', vendor: 'NVIDIA', category: 'gpu', powerWatts: 400,
});
const rg = Region.fromJSON({
  id: 'bg', name: 'България', countryCode: 'BG',
  carbonIntensityGCO2PerKWh: 360, wueLitersPerKWh: 1.8, defaultPUE: 1.2,
});

function makeCalc(id: string, userId: string | null = 'u1'): Calculation {
  const params = CalculationParams.create({
    hardware: hw, region: rg, durationHours: 10, pue: 1.2, utilization: 1, hardwareCount: 1,
    workloadType: 'training',
  });
  const result = CalculationResult.of(4.8, 1728, 8.64);
  return new Calculation(id, params, result, new Date(), userId, null);
}

function makeService() {
  const storage = new MemoryStorageAdapter();
  const scenarios = new ScenarioRepository(storage);
  const calculations = new CalculationRepository(storage);
  const service = new ScenarioComparisonService(scenarios, calculations);
  calculations.save(makeCalc('c1'));
  calculations.save(makeCalc('c2'));
  calculations.save(makeCalc('c3'));
  calculations.save(makeCalc('c4'));
  return { service, scenarios, calculations };
}

describe('ScenarioComparisonService', () => {
  let env: ReturnType<typeof makeService>;
  beforeEach(() => {
    env = makeService();
  });

  it('create stores a scenario with unique ids', () => {
    const s = env.service.create('Test', 'u1', ['c1', 'c2', 'c1']);
    expect(s.calculationIds).toEqual(['c1', 'c2']);
    expect(env.scenarios.findById(s.id)).not.toBeNull();
  });

  it('create rejects more than MAX', () => {
    expect(() => env.service.create('Test', 'u1', ['c1', 'c2', 'c3', 'c4'])).toThrow(DomainError);
  });

  it('addCalculation respects the limit', () => {
    const s = env.service.create('Test', 'u1', ['c1', 'c2', 'c3']);
    expect(() => env.service.addCalculation(s.id, 'c4')).toThrow(DomainError);
  });

  it('addCalculation is idempotent', () => {
    const s = env.service.create('Test', 'u1', ['c1']);
    const after = env.service.addCalculation(s.id, 'c1');
    expect(after.calculationIds).toEqual(['c1']);
  });

  it('removeCalculation drops the id', () => {
    const s = env.service.create('Test', 'u1', ['c1', 'c2']);
    const after = env.service.removeCalculation(s.id, 'c1');
    expect(after.calculationIds).toEqual(['c2']);
  });

  it('rename persists the new name', () => {
    const s = env.service.create('Old', 'u1', []);
    const after = env.service.rename(s.id, 'New');
    expect(after.name).toBe('New');
  });

  it('populate returns the calculations by ids', () => {
    const s = env.service.create('Test', 'u1', ['c1', 'c2']);
    const populated = env.service.populate(s);
    expect(populated.calculations).toHaveLength(2);
    expect(populated.calculations.map((c) => c.id).sort()).toEqual(['c1', 'c2']);
  });

  it('populate skips missing calculations', () => {
    const s = env.service.create('Test', 'u1', ['c1', 'missing']);
    const populated = env.service.populate(s);
    expect(populated.calculations.map((c) => c.id)).toEqual(['c1']);
  });

  it('listForUser filters by userId', () => {
    env.service.create('Mine', 'u1', []);
    env.service.create('Other', 'u2', []);
    expect(env.service.listForUser('u1')).toHaveLength(1);
    expect(env.service.listForUser('u2')).toHaveLength(1);
  });
});
