import { describe, it, expect } from 'vitest';
import { generateId } from '@core/utils/id';

describe('generateId', () => {
  it('produces a UUID-shaped string', () => {
    const id = generateId();
    expect(id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
    );
  });

  it('produces distinct values across calls', () => {
    const ids = new Set<string>();
    for (let i = 0; i < 50; i++) ids.add(generateId());
    expect(ids.size).toBe(50);
  });
});
