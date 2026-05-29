import { describe, it, expect } from 'vitest';
import { applyFilter, applySort } from '@domains/history/services/HistoryFilter';
import { Calculation } from '@domains/calculator/models/Calculation';
import { CalculationParams } from '@domains/calculator/models/CalculationParams';
import { CalculationResult } from '@domains/calculator/models/CalculationResult';
import { Hardware } from '@domains/calculator/models/Hardware';
import { Region } from '@domains/calculator/models/Region';
import type { WorkloadType } from '@domains/calculator/models/WorkloadType';

const a100 = Hardware.fromJSON({
  id: 'a100', name: 'A100', vendor: 'NVIDIA', category: 'gpu', powerWatts: 400,
});
const h100 = Hardware.fromJSON({
  id: 'h100', name: 'H100', vendor: 'NVIDIA', category: 'gpu', powerWatts: 700,
});
const bg = Region.fromJSON({
  id: 'bg', name: 'България', countryCode: 'BG',
  carbonIntensityGCO2PerKWh: 360, wueLitersPerKWh: 1.8, defaultPUE: 1.2,
});
const fr = Region.fromJSON({
  id: 'fr', name: 'Франция', countryCode: 'FR',
  carbonIntensityGCO2PerKWh: 50, wueLitersPerKWh: 0.5, defaultPUE: 1.2,
});

function calc(opts: {
  id: string;
  hw: Hardware;
  rg: Region;
  hours: number;
  kWh: number;
  co2: number;
  water: number;
  date: Date;
  workload?: WorkloadType;
  label?: string | null;
}): Calculation {
  const params = CalculationParams.create({
    hardware: opts.hw, region: opts.rg, durationHours: opts.hours, pue: 1.2, utilization: 1, hardwareCount: 1,
    workloadType: opts.workload ?? 'training',
  });
  const result = CalculationResult.of(opts.kWh, opts.co2, opts.water);
  return new Calculation(opts.id, params, result, opts.date, 'u1', opts.label ?? null);
}

const items: Calculation[] = [
  calc({ id: '1', hw: a100, rg: bg, hours: 5, kWh: 2, co2: 720, water: 3.6, date: new Date('2026-01-15'), label: 'GPT-pretrain' }),
  calc({ id: '2', hw: h100, rg: fr, hours: 20, kWh: 14, co2: 700, water: 7, date: new Date('2026-03-10'), workload: 'inference' }),
  calc({ id: '3', hw: a100, rg: fr, hours: 8, kWh: 3.2, co2: 160, water: 1.6, date: new Date('2026-04-22'), label: 'Резерв' }),
];

describe('applyFilter', () => {
  it('филтрира по hardwareId', () => {
    expect(applyFilter(items, { hardwareId: 'a100' }).map((c) => c.id)).toEqual(['1', '3']);
  });

  it('филтрира по regionId', () => {
    expect(applyFilter(items, { regionId: 'fr' }).map((c) => c.id)).toEqual(['2', '3']);
  });

  it('филтрира по date range', () => {
    const ids = applyFilter(items, {
      from: new Date('2026-02-01'),
      to: new Date('2026-04-01'),
    }).map((c) => c.id);
    expect(ids).toEqual(['2']);
  });

  it('филтрира по workloadType', () => {
    expect(applyFilter(items, { workloadType: 'inference' }).map((c) => c.id)).toEqual(['2']);
  });

  it('search обхваща етикета и хардуера и региона', () => {
    expect(applyFilter(items, { search: 'gpt' }).map((c) => c.id)).toEqual(['1']);
    expect(applyFilter(items, { search: 'h100' }).map((c) => c.id)).toEqual(['2']);
    expect(applyFilter(items, { search: 'франц' }).map((c) => c.id)).toEqual(['2', '3']);
  });

  it('празен филтър връща всичко', () => {
    expect(applyFilter(items, {})).toHaveLength(3);
  });
});

describe('applySort', () => {
  it('сортира по co2eGrams низходящо', () => {
    expect(applySort(items, 'co2eGrams', 'desc').map((c) => c.id)).toEqual(['1', '2', '3']);
  });

  it('сортира по energyKWh възходящо', () => {
    expect(applySort(items, 'energyKWh', 'asc').map((c) => c.id)).toEqual(['1', '3', '2']);
  });

  it('сортира по дата низходящо', () => {
    expect(applySort(items, 'createdAt', 'desc').map((c) => c.id)).toEqual(['3', '2', '1']);
  });

  it('сортира по hardware с локализирано сравнение', () => {
    const sorted = applySort(items, 'hardware', 'asc').map((c) => c.params.hardware.id);
    expect(sorted[0]).toBe('a100');
  });
});
