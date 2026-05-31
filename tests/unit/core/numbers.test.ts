import { describe, it, expect } from 'vitest';
import {
  round,
  formatNumber,
  formatNumberBG,
  formatEnergy,
  formatCO2,
  formatWater,
  clamp,
} from '@core/utils/numbers';

describe('round', () => {
  it('rounds to the given number of decimals', () => {
    expect(round(1.2345, 2)).toBe(1.23);
    expect(round(1.2355, 2)).toBe(1.24);
  });

  it('defaults to 2 decimals', () => {
    expect(round(1.2345)).toBe(1.23);
  });

  it('handles negative numbers', () => {
    expect(round(-2.5, 0)).toBe(-2);
    expect(round(-1.234, 2)).toBe(-1.23);
  });
});

describe('clamp', () => {
  it('returns value within bounds untouched', () => {
    expect(clamp(5, 0, 10)).toBe(5);
  });
  it('clamps below the minimum', () => {
    expect(clamp(-1, 0, 10)).toBe(0);
  });
  it('clamps above the maximum', () => {
    expect(clamp(11, 0, 10)).toBe(10);
  });
});

describe('formatEnergy', () => {
  it('uses Wh below 1 kWh', () => {
    expect(formatEnergy(0.5)).toMatch(/Wh$/);
  });
  it('uses kWh between 1 and 1000', () => {
    expect(formatEnergy(4.8)).toMatch(/kWh$/);
  });
  it('uses MWh at 1000 or above', () => {
    expect(formatEnergy(1500)).toMatch(/MWh$/);
  });
});

describe('formatCO2', () => {
  it('uses grams below 1 kg', () => {
    expect(formatCO2(500)).toMatch(/g CO₂e$/);
  });
  it('uses kg in the mid range', () => {
    expect(formatCO2(1728)).toMatch(/kg CO₂e$/);
  });
  it('uses tonnes above 1,000,000 g', () => {
    expect(formatCO2(2_500_000)).toMatch(/t CO₂e$/);
  });
});

describe('formatWater', () => {
  it('uses liters under 1000', () => {
    expect(formatWater(8.64)).toMatch(/л$/);
  });
  it('uses cubic meters at or above 1000', () => {
    expect(formatWater(1500)).toMatch(/м³$/);
  });
  it('uses Latin units in EN locale', () => {
    expect(formatWater(8.64, 'en')).toMatch(/L$/);
    expect(formatWater(1500, 'en')).toMatch(/m³$/);
  });
});

describe('formatNumberBG', () => {
  it('respects the requested precision', () => {
    const out = formatNumberBG(1.23456, 3);
    expect(out).toMatch(/1[.,]235/);
  });
});

describe('formatNumber locale', () => {
  it('uses BG decimal comma by default', () => {
    expect(formatNumber(1234.56, 2)).toMatch(/,/);
  });
  it('uses EN decimal point in en locale', () => {
    const out = formatNumber(1234.56, 2, 'en');
    expect(out).toMatch(/\./);
    expect(out).not.toMatch(/,\d{2}$/);
  });
});
