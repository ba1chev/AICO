import { describe, it, expect } from 'vitest';
import { Hardware } from '@domains/calculator/models/Hardware';
import { Region } from '@domains/calculator/models/Region';
import { CalculationParams } from '@domains/calculator/models/CalculationParams';
import { StandardCalculationEngine } from '@domains/calculator/services/StandardCalculationEngine';

describe('StandardCalculationEngine', () => {
  const a100 = Hardware.fromJSON({
    id: 'a100',
    name: 'A100',
    vendor: 'NVIDIA',
    category: 'gpu',
    powerWatts: 400,
  });

  const bg = Region.fromJSON({
    id: 'bg',
    name: 'България',
    countryCode: 'BG',
    carbonIntensityGCO2PerKWh: 360,
    wueLitersPerKWh: 1.8,
    defaultPUE: 1.2,
  });

  it('matches the plan acceptance value: 1x A100 x 10h x PUE 1.2 in BG', () => {
    const params = CalculationParams.create({
      hardware: a100,
      region: bg,
      durationHours: 10,
      pue: 1.2,
      utilization: 1.0,
      hardwareCount: 1,
      workloadType: 'training',
    });

    const result = new StandardCalculationEngine().compute(params);

    expect(result.energyKWh).toBeCloseTo(4.8, 6);
    expect(result.co2eKg).toBeCloseTo(1.728, 6);
    expect(result.waterLiters).toBeCloseTo(8.64, 6);
  });

  it('scales linearly with hardware count', () => {
    const single = CalculationParams.create({
      hardware: a100,
      region: bg,
      durationHours: 10,
      pue: 1.2,
      utilization: 1.0,
      hardwareCount: 1,
      workloadType: 'training',
    });
    const quad = CalculationParams.create({
      hardware: a100,
      region: bg,
      durationHours: 10,
      pue: 1.2,
      utilization: 1.0,
      hardwareCount: 4,
      workloadType: 'training',
    });

    const engine = new StandardCalculationEngine();
    expect(engine.compute(quad).energyKWh).toBeCloseTo(engine.compute(single).energyKWh * 4, 6);
  });

  it('utilization scales energy proportionally', () => {
    const full = CalculationParams.create({
      hardware: a100,
      region: bg,
      durationHours: 10,
      pue: 1.2,
      utilization: 1.0,
      hardwareCount: 1,
      workloadType: 'training',
    });
    const half = CalculationParams.create({
      hardware: a100,
      region: bg,
      durationHours: 10,
      pue: 1.2,
      utilization: 0.5,
      hardwareCount: 1,
      workloadType: 'training',
    });
    const engine = new StandardCalculationEngine();
    expect(engine.compute(half).energyKWh).toBeCloseTo(engine.compute(full).energyKWh / 2, 6);
  });
});
