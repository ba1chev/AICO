import { describe, it, expect } from 'vitest';
import { MemoryStorageAdapter } from '@core/storage';
import { CalculationRepository } from '@domains/calculator/repository/CalculationRepository';
import { ReportsService } from '@domains/reports/services/ReportsService';
import { Calculation } from '@domains/calculator/models/Calculation';
import { CalculationParams } from '@domains/calculator/models/CalculationParams';
import { CalculationResult } from '@domains/calculator/models/CalculationResult';
import { Hardware } from '@domains/calculator/models/Hardware';
import { Region } from '@domains/calculator/models/Region';

const hw = Hardware.fromJSON({
  id: 'a100', name: 'A100', vendor: 'NVIDIA', category: 'gpu', powerWatts: 400,
});
const rg = Region.fromJSON({
  id: 'bg', name: 'X', countryCode: 'BG',
  carbonIntensityGCO2PerKWh: 360, wueLitersPerKWh: 1.8, defaultPUE: 1.2,
});

function calc(id: string, when: Date, userId: string | null, kWh: number): Calculation {
  const params = CalculationParams.create({
    hardware: hw, region: rg, durationHours: 10, pue: 1.2, utilization: 1, hardwareCount: 1,
    workloadType: 'training',
  });
  const result = CalculationResult.of(kWh, kWh * 360, kWh * 1.8);
  return new Calculation(id, params, result, when, userId, null);
}

function makeService(): { service: ReportsService; repo: CalculationRepository } {
  const storage = new MemoryStorageAdapter();
  const repo = new CalculationRepository(storage);
  const service = new ReportsService(repo);
  return { service, repo };
}

describe('ReportsService', () => {
  it('summarize sums totals across items', () => {
    const items = [
      calc('1', new Date('2026-01-01'), 'u1', 1),
      calc('2', new Date('2026-01-02'), 'u1', 2),
      calc('3', new Date('2026-01-03'), 'u1', 3),
    ];
    const totals = ReportsService.summarize(items);
    expect(totals.count).toBe(3);
    expect(totals.energyKWh).toBeCloseTo(6, 6);
    expect(totals.co2eKg).toBeCloseTo((6 * 360) / 1000, 6);
    expect(totals.waterLiters).toBeCloseTo(6 * 1.8, 6);
  });

  it('build filters by userId', () => {
    const { service, repo } = makeService();
    repo.save(calc('1', new Date('2026-01-01'), 'u1', 1));
    repo.save(calc('2', new Date('2026-01-02'), 'u2', 2));
    const data = service.build({ userId: 'u1', from: null, to: null });
    expect(data.calculations.map((c) => c.id)).toEqual(['1']);
    expect(data.totals.count).toBe(1);
  });

  it('build filters by date range inclusively', () => {
    const { service, repo } = makeService();
    repo.save(calc('a', new Date('2026-01-01'), 'u1', 1));
    repo.save(calc('b', new Date('2026-02-15'), 'u1', 2));
    repo.save(calc('c', new Date('2026-03-30'), 'u1', 3));
    const data = service.build({
      userId: 'u1',
      from: new Date('2026-02-01'),
      to: new Date('2026-03-01'),
    });
    expect(data.calculations.map((c) => c.id)).toEqual(['b']);
  });

  it('build returns ascending chronological order', () => {
    const { service, repo } = makeService();
    repo.save(calc('newer', new Date('2026-03-01'), 'u1', 1));
    repo.save(calc('older', new Date('2026-01-01'), 'u1', 1));
    const data = service.build({ userId: 'u1', from: null, to: null });
    expect(data.calculations.map((c) => c.id)).toEqual(['older', 'newer']);
  });

  it('build with userId=null includes everyone', () => {
    const { service, repo } = makeService();
    repo.save(calc('1', new Date('2026-01-01'), 'u1', 1));
    repo.save(calc('2', new Date('2026-01-02'), 'u2', 1));
    const data = service.build({ userId: null, from: null, to: null });
    expect(data.totals.count).toBe(2);
  });

  it('build with no items yields zero totals', () => {
    const { service } = makeService();
    const data = service.build({ userId: 'u1', from: null, to: null });
    expect(data.totals).toEqual({ count: 0, energyKWh: 0, co2eKg: 0, waterLiters: 0 });
  });
});
