import { describe, it, expect } from 'vitest';
import { CalculationParams } from '@domains/calculator/models/CalculationParams';
import { Hardware } from '@domains/calculator/models/Hardware';
import { Region } from '@domains/calculator/models/Region';
import { ValidationError } from '@core/errors/ValidationError';

const hw = Hardware.fromJSON({
  id: 'x', name: 'X', vendor: 'V', category: 'gpu', powerWatts: 100,
});
const rg = Region.fromJSON({
  id: 'r', name: 'R', countryCode: 'XX', carbonIntensityGCO2PerKWh: 100, wueLitersPerKWh: 1, defaultPUE: 1.2,
});

const base = {
  hardware: hw, region: rg, durationHours: 1, pue: 1.2, utilization: 1, hardwareCount: 1, workloadType: 'training' as const,
};

describe('CalculationParams.create', () => {
  it('приема валидни входни данни', () => {
    expect(() => CalculationParams.create(base)).not.toThrow();
  });

  it('отхвърля durationHours <= 0', () => {
    try {
      CalculationParams.create({ ...base, durationHours: 0 });
      expect.fail('трябваше да хвърли');
    } catch (e) {
      expect(e).toBeInstanceOf(ValidationError);
      expect((e as ValidationError).hasField('durationHours')).toBe(true);
    }
  });

  it('отхвърля PUE < 1', () => {
    try {
      CalculationParams.create({ ...base, pue: 0.5 });
      expect.fail();
    } catch (e) {
      expect((e as ValidationError).hasField('pue')).toBe(true);
    }
  });

  it('отхвърля utilization > 1', () => {
    try {
      CalculationParams.create({ ...base, utilization: 1.5 });
      expect.fail();
    } catch (e) {
      expect((e as ValidationError).hasField('utilization')).toBe(true);
    }
  });

  it('събира всички грешки наведнъж', () => {
    try {
      CalculationParams.create({ ...base, durationHours: -1, pue: 5, utilization: 0 });
      expect.fail();
    } catch (e) {
      const errs = (e as ValidationError).errors;
      expect(errs.length).toBeGreaterThanOrEqual(3);
    }
  });
});
