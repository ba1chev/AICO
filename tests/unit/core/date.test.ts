import { describe, it, expect } from 'vitest';
import { isSameDay, startOfDay, endOfDay } from '@core/utils/date';

describe('isSameDay', () => {
  it('returns true for two dates on the same calendar day', () => {
    const a = new Date('2026-05-31T01:00:00');
    const b = new Date('2026-05-31T23:00:00');
    expect(isSameDay(a, b)).toBe(true);
  });

  it('returns false across day boundaries', () => {
    const a = new Date('2026-05-31T23:59:59');
    const b = new Date('2026-06-01T00:00:00');
    expect(isSameDay(a, b)).toBe(false);
  });

  it('returns false across years', () => {
    expect(isSameDay(new Date('2025-12-31T12:00:00'), new Date('2026-12-31T12:00:00'))).toBe(false);
  });
});

describe('startOfDay', () => {
  it('zeroes out hours, minutes, seconds, ms', () => {
    const out = startOfDay(new Date('2026-05-31T15:34:21.456'));
    expect(out.getHours()).toBe(0);
    expect(out.getMinutes()).toBe(0);
    expect(out.getSeconds()).toBe(0);
    expect(out.getMilliseconds()).toBe(0);
  });

  it('does not mutate the input', () => {
    const input = new Date('2026-05-31T15:00:00');
    const before = input.getHours();
    startOfDay(input);
    expect(input.getHours()).toBe(before);
  });
});

describe('endOfDay', () => {
  it('returns the last moment of the day', () => {
    const out = endOfDay(new Date('2026-05-31T01:00:00'));
    expect(out.getHours()).toBe(23);
    expect(out.getMinutes()).toBe(59);
    expect(out.getSeconds()).toBe(59);
    expect(out.getMilliseconds()).toBe(999);
  });
});
