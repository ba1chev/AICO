import { describe, it, expect } from 'vitest';
import { DriverAnalysis } from '@domains/calculator/services/DriverAnalysis';
import { CalculationParams } from '@domains/calculator/models/CalculationParams';
import { Hardware } from '@domains/calculator/models/Hardware';
import { Region } from '@domains/calculator/models/Region';

function makeParams(overrides: Partial<{ powerWatts: number; durationHours: number; pue: number; utilization: number; hardwareCount: number; carbon: number }> = {}): CalculationParams {
  const hw = Hardware.fromJSON({
    id: 'h', name: 'H', vendor: 'V', category: 'gpu',
    powerWatts: overrides.powerWatts ?? 400,
  });
  const rg = Region.fromJSON({
    id: 'r', name: 'R', countryCode: 'XX',
    carbonIntensityGCO2PerKWh: overrides.carbon ?? 400,
    wueLitersPerKWh: 1.8, defaultPUE: 1.2,
  });
  return CalculationParams.create({
    hardware: hw, region: rg,
    durationHours: overrides.durationHours ?? 10,
    pue: overrides.pue ?? 1.2,
    utilization: overrides.utilization ?? 0.8,
    hardwareCount: overrides.hardwareCount ?? 1,
    workloadType: 'training',
  });
}

describe('DriverAnalysis.forCO2e', () => {
  const analysis = new DriverAnalysis();

  it('returns one entry per input factor', () => {
    const drivers = analysis.forCO2e(makeParams());
    expect(drivers.map((d) => d.key).sort()).toEqual(
      ['carbonIntensity', 'count', 'hours', 'power', 'pue', 'utilization'].sort(),
    );
  });

  it('contributions sum to ~100% when there is any deviation from baseline', () => {
    const drivers = analysis.forCO2e(makeParams());
    const total = drivers.reduce((s, d) => s + d.contributionPct, 0);
    expect(total).toBeGreaterThan(99.9);
    expect(total).toBeLessThan(100.1);
  });

  it('ranks the dominant factor first', () => {
    const drivers = analysis.forCO2e(makeParams({ powerWatts: 100, hardwareCount: 1, durationHours: 1, pue: 1.0, utilization: 1.0, carbon: 1000 }));
    expect(drivers[0]?.key).toBe('carbonIntensity');
  });

  it('a baseline-only setup yields zero magnitudes (all 0%)', () => {
    const drivers = analysis.forCO2e(makeParams({ powerWatts: 100, hardwareCount: 1, durationHours: 1, pue: 1.0, utilization: 1.0, carbon: 50 }));
    for (const d of drivers) expect(d.contributionPct).toBe(0);
  });

  it('exposes raw input values alongside contributions', () => {
    const drivers = analysis.forCO2e(makeParams({ powerWatts: 350 }));
    const power = drivers.find((d) => d.key === 'power');
    expect(power?.value).toBe(350);
  });
});
