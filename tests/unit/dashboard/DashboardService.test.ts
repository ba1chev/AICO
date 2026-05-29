import { describe, it, expect } from 'vitest';
import { MemoryStorageAdapter } from '@core/storage';
import { CalculationRepository } from '@domains/calculator/repository/CalculationRepository';
import { DashboardService } from '@domains/dashboard/services/DashboardService';
import { Calculation } from '@domains/calculator/models/Calculation';
import { CalculationParams } from '@domains/calculator/models/CalculationParams';
import { CalculationResult } from '@domains/calculator/models/CalculationResult';
import { Hardware } from '@domains/calculator/models/Hardware';
import { Region } from '@domains/calculator/models/Region';
import type { WorkloadType } from '@domains/calculator/models/WorkloadType';

const a100 = Hardware.fromJSON({
  id: 'a100', name: 'A100', vendor: 'NVIDIA', category: 'gpu', powerWatts: 400,
});
const v100 = Hardware.fromJSON({
  id: 'v100', name: 'V100', vendor: 'NVIDIA', category: 'gpu', powerWatts: 250,
});
const bg = Region.fromJSON({
  id: 'bg', name: 'BG', countryCode: 'BG',
  carbonIntensityGCO2PerKWh: 360, wueLitersPerKWh: 1.8, defaultPUE: 1.2,
});
const de = Region.fromJSON({
  id: 'de', name: 'DE', countryCode: 'DE',
  carbonIntensityGCO2PerKWh: 380, wueLitersPerKWh: 1.5, defaultPUE: 1.2,
});

function calc(
  id: string,
  when: Date,
  userId: string | null,
  hw: Hardware,
  region: Region,
  workload: WorkloadType,
  kWh: number,
): Calculation {
  const params = CalculationParams.create({
    hardware: hw, region, durationHours: 10, pue: 1.2, utilization: 1, hardwareCount: 1,
    workloadType: workload,
  });
  const result = CalculationResult.of(kWh, kWh * region.carbonIntensityGCO2PerKWh, kWh * region.wueLitersPerKWh);
  return new Calculation(id, params, result, when, userId, null);
}

function makeService(): { service: DashboardService; repo: CalculationRepository } {
  const storage = new MemoryStorageAdapter();
  const repo = new CalculationRepository(storage);
  return { service: new DashboardService(repo), repo };
}

describe('DashboardService', () => {
  it('aggregates totals across all calculations when userIds is null', () => {
    const { service, repo } = makeService();
    repo.save(calc('1', new Date('2026-01-01'), 'u1', a100, bg, 'training', 1));
    repo.save(calc('2', new Date('2026-01-02'), 'u2', v100, de, 'inference', 2));
    const data = service.build({ userIds: null, from: null, to: null });
    expect(data.totals.count).toBe(2);
    expect(data.totals.energyKWh).toBeCloseTo(3, 6);
  });

  it('filters by userIds when provided', () => {
    const { service, repo } = makeService();
    repo.save(calc('1', new Date('2026-01-01'), 'u1', a100, bg, 'training', 1));
    repo.save(calc('2', new Date('2026-01-02'), 'u2', v100, de, 'inference', 5));
    const data = service.build({ userIds: ['u1'], from: null, to: null });
    expect(data.totals.count).toBe(1);
    expect(data.totals.energyKWh).toBeCloseTo(1, 6);
  });

  it('groups by hardware, region, and workload sorted by descending CO2e', () => {
    const { service, repo } = makeService();
    repo.save(calc('1', new Date('2026-01-01'), 'u1', a100, bg, 'training', 1));
    repo.save(calc('2', new Date('2026-01-02'), 'u1', a100, bg, 'training', 2));
    repo.save(calc('3', new Date('2026-01-03'), 'u1', v100, de, 'inference', 1));

    const data = service.build({ userIds: null, from: null, to: null });
    expect(data.byHardware[0]?.key).toBe('a100');
    expect(data.byHardware[0]?.count).toBe(2);
    expect(data.byRegion.map((r) => r.key)).toContain('bg');
    expect(data.byWorkload.map((w) => w.key)).toEqual(
      expect.arrayContaining(['training', 'inference']),
    );
  });

  it('buckets monthly totals by YYYY-MM ascending', () => {
    const { service, repo } = makeService();
    repo.save(calc('a', new Date('2026-01-15'), 'u1', a100, bg, 'training', 1));
    repo.save(calc('b', new Date('2026-02-01'), 'u1', a100, bg, 'training', 2));
    repo.save(calc('c', new Date('2026-02-20'), 'u1', a100, bg, 'training', 3));

    const data = service.build({ userIds: null, from: null, to: null });
    expect(data.byMonth.map((m) => m.month)).toEqual(['2026-01', '2026-02']);
    expect(data.byMonth[1]?.energyKWh).toBeCloseTo(5, 6);
    expect(data.byMonth[1]?.count).toBe(2);
  });

  it('respects from/to date filter inclusively', () => {
    const { service, repo } = makeService();
    repo.save(calc('a', new Date('2026-01-01'), 'u1', a100, bg, 'training', 1));
    repo.save(calc('b', new Date('2026-02-15'), 'u1', a100, bg, 'training', 2));
    repo.save(calc('c', new Date('2026-03-30'), 'u1', a100, bg, 'training', 3));
    const data = service.build({
      userIds: null,
      from: new Date('2026-02-01'),
      to: new Date('2026-03-01'),
    });
    expect(data.totals.count).toBe(1);
    expect(data.totals.energyKWh).toBeCloseTo(2, 6);
  });

  it('returns empty buckets when no items match', () => {
    const { service } = makeService();
    const data = service.build({ userIds: ['nobody'], from: null, to: null });
    expect(data.totals).toEqual({ count: 0, energyKWh: 0, co2eKg: 0, waterLiters: 0 });
    expect(data.byHardware).toEqual([]);
    expect(data.byMonth).toEqual([]);
  });
});
