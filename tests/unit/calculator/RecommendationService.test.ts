import { describe, it, expect, beforeEach } from 'vitest';
import { RecommendationService } from '@domains/calculator/services/RecommendationService';
import { StandardCalculationEngine } from '@domains/calculator/services/StandardCalculationEngine';
import { CalculationParams } from '@domains/calculator/models/CalculationParams';
import { Hardware } from '@domains/calculator/models/Hardware';
import { Region } from '@domains/calculator/models/Region';
import type { HardwareCatalog } from '@domains/calculator/services/HardwareCatalog';
import type { RegionCatalog } from '@domains/calculator/services/RegionCatalog';

const HW_HEAVY = Hardware.fromJSON({
  id: 'gpu-a', name: 'Heavy', vendor: 'Acme', category: 'gpu', powerWatts: 400,
});
const HW_LIGHT = Hardware.fromJSON({
  id: 'gpu-b', name: 'Light', vendor: 'Acme', category: 'gpu', powerWatts: 250,
});
const HW_OTHER_CAT = Hardware.fromJSON({
  id: 'cpu-a', name: 'CPU', vendor: 'Acme', category: 'cpu', powerWatts: 100,
});

const RG_DIRTY = Region.fromJSON({
  id: 'rg-d', name: 'Dirty', countryCode: 'XX',
  carbonIntensityGCO2PerKWh: 800, wueLitersPerKWh: 1.8, defaultPUE: 1.4,
});
const RG_CLEAN = Region.fromJSON({
  id: 'rg-c', name: 'Clean', countryCode: 'YY',
  carbonIntensityGCO2PerKWh: 100, wueLitersPerKWh: 1.0, defaultPUE: 1.2,
});

function fakeHardwareCatalog(items: Hardware[]): HardwareCatalog {
  return { all: async () => items, findById: async (id: string) => items.find((h) => h.id === id) } as unknown as HardwareCatalog;
}
function fakeRegionCatalog(items: Region[]): RegionCatalog {
  return { all: async () => items, findById: async (id: string) => items.find((r) => r.id === id) } as unknown as RegionCatalog;
}

function paramsWith(hw: Hardware, rg: Region, pue = 1.5): CalculationParams {
  return CalculationParams.create({
    hardware: hw, region: rg,
    durationHours: 10, pue, utilization: 0.8, hardwareCount: 1,
    workloadType: 'training',
  });
}

describe('RecommendationService', () => {
  let engine: StandardCalculationEngine;
  beforeEach(() => {
    engine = new StandardCalculationEngine();
  });

  it('recommends a cleaner region when one exists', async () => {
    const svc = new RecommendationService(
      engine,
      fakeHardwareCatalog([HW_HEAVY]),
      fakeRegionCatalog([RG_DIRTY, RG_CLEAN]),
    );
    const params = paramsWith(HW_HEAVY, RG_DIRTY);
    const current = engine.compute(params).co2eGrams;
    const recs = await svc.forParams(params, current);
    expect(recs.some((r) => r.kind === 'region')).toBe(true);
    const region = recs.find((r) => r.kind === 'region')!;
    expect(region.savingsPct).toBeGreaterThan(0);
    expect(region.newCO2eGrams).toBeLessThan(current);
  });

  it('recommends more efficient hardware in same category', async () => {
    const svc = new RecommendationService(
      engine,
      fakeHardwareCatalog([HW_HEAVY, HW_LIGHT, HW_OTHER_CAT]),
      fakeRegionCatalog([RG_DIRTY]),
    );
    const params = paramsWith(HW_HEAVY, RG_DIRTY);
    const current = engine.compute(params).co2eGrams;
    const recs = await svc.forParams(params, current);
    const hw = recs.find((r) => r.kind === 'hardware');
    expect(hw).toBeDefined();
    expect(hw!.label).toContain('Light');
  });

  it('recommends improving PUE when above target', async () => {
    const svc = new RecommendationService(
      engine,
      fakeHardwareCatalog([HW_HEAVY]),
      fakeRegionCatalog([RG_DIRTY]),
    );
    const params = paramsWith(HW_HEAVY, RG_DIRTY, 1.8);
    const current = engine.compute(params).co2eGrams;
    const recs = await svc.forParams(params, current);
    const pue = recs.find((r) => r.kind === 'pue');
    expect(pue).toBeDefined();
    expect(pue!.savingsPct).toBeGreaterThan(0);
  });

  it('returns no PUE rec when already at target', async () => {
    const svc = new RecommendationService(
      engine,
      fakeHardwareCatalog([HW_HEAVY]),
      fakeRegionCatalog([RG_DIRTY]),
    );
    const params = paramsWith(HW_HEAVY, RG_DIRTY, 1.05);
    const current = engine.compute(params).co2eGrams;
    const recs = await svc.forParams(params, current);
    expect(recs.find((r) => r.kind === 'pue')).toBeUndefined();
  });

  it('sorts results by savings desc and caps to limit', async () => {
    const svc = new RecommendationService(
      engine,
      fakeHardwareCatalog([HW_HEAVY, HW_LIGHT]),
      fakeRegionCatalog([RG_DIRTY, RG_CLEAN]),
    );
    const params = paramsWith(HW_HEAVY, RG_DIRTY, 1.8);
    const current = engine.compute(params).co2eGrams;
    const recs = await svc.forParams(params, current, 2);
    expect(recs.length).toBeLessThanOrEqual(2);
    for (let i = 1; i < recs.length; i++) {
      expect(recs[i - 1]!.savingsPct).toBeGreaterThanOrEqual(recs[i]!.savingsPct);
    }
  });

  it('returns empty array when no improvements possible', async () => {
    const svc = new RecommendationService(
      engine,
      fakeHardwareCatalog([HW_LIGHT]),
      fakeRegionCatalog([RG_CLEAN]),
    );
    const params = paramsWith(HW_LIGHT, RG_CLEAN, 1.05);
    const current = engine.compute(params).co2eGrams;
    const recs = await svc.forParams(params, current);
    expect(recs).toEqual([]);
  });
});
