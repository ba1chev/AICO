import { describe, it, expect } from 'vitest';
import { Hardware } from '@domains/calculator/models/Hardware';
import {
  HardwareProfileService,
  type HardwareOverride,
} from '@domains/admin/services/HardwareProfileService';

const a100 = Hardware.fromJSON({
  id: 'a100', name: 'A100', vendor: 'NVIDIA', category: 'gpu', powerWatts: 400,
});
const v100 = Hardware.fromJSON({
  id: 'v100', name: 'V100', vendor: 'NVIDIA', category: 'gpu', powerWatts: 250,
});

describe('HardwareProfileService.applyOverrides', () => {
  it('returns base unchanged when no overrides', () => {
    const merged = HardwareProfileService.applyOverrides([a100, v100], []);
    expect(merged.map((h) => h.id)).toEqual(['a100', 'v100']);
    expect(merged[0]?.powerWatts).toBe(400);
  });

  it('applies a patch on top of an existing catalog item', () => {
    const overrides: HardwareOverride[] = [
      { id: 'a100', patch: { powerWatts: 350 }, custom: false, disabled: false },
    ];
    const merged = HardwareProfileService.applyOverrides([a100, v100], overrides);
    const patched = merged.find((h) => h.id === 'a100');
    expect(patched?.powerWatts).toBe(350);
    expect(patched?.name).toBe('A100');
  });

  it('hides catalog items that are disabled', () => {
    const overrides: HardwareOverride[] = [
      { id: 'v100', patch: {}, custom: false, disabled: true },
    ];
    const merged = HardwareProfileService.applyOverrides([a100, v100], overrides);
    expect(merged.map((h) => h.id)).toEqual(['a100']);
  });

  it('appends custom hardware that has all required fields', () => {
    const overrides: HardwareOverride[] = [
      {
        id: 'custom-1',
        patch: { name: 'Custom', vendor: 'Acme', category: 'gpu', powerWatts: 500 },
        custom: true,
        disabled: false,
      },
    ];
    const merged = HardwareProfileService.applyOverrides([a100], overrides);
    expect(merged.map((h) => h.id)).toEqual(['a100', 'custom-1']);
    expect(merged[1]?.vendor).toBe('Acme');
  });

  it('skips disabled custom items and incomplete custom patches', () => {
    const overrides: HardwareOverride[] = [
      {
        id: 'c1',
        patch: { name: 'C1', vendor: 'A', category: 'gpu', powerWatts: 300 },
        custom: true,
        disabled: true,
      },
      { id: 'c2', patch: { name: 'C2' }, custom: true, disabled: false },
    ];
    const merged = HardwareProfileService.applyOverrides([a100], overrides);
    expect(merged.map((h) => h.id)).toEqual(['a100']);
  });
});
