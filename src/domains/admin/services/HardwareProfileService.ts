import type { IStorage } from '@core/storage';
import { Hardware, type HardwareCategory } from '@domains/calculator/models/Hardware';
import type { HardwareCatalog } from '@domains/calculator/services/HardwareCatalog';

export interface HardwareOverridePatch {
  name?: string;
  vendor?: string;
  category?: HardwareCategory;
  powerWatts?: number;
  description?: string;
}

export interface HardwareOverride {
  id: string;
  patch: HardwareOverridePatch;
  custom: boolean;
  disabled: boolean;
}

const STORAGE_KEY = 'hardware-overrides';

export class HardwareProfileService {
  constructor(
    private readonly catalog: HardwareCatalog,
    private readonly storage: IStorage,
  ) {}

  loadOverrides(): HardwareOverride[] {
    const raw = this.storage.get<HardwareOverride[]>(STORAGE_KEY);
    return Array.isArray(raw) ? raw : [];
  }

  saveOverrides(list: HardwareOverride[]): void {
    this.storage.set(STORAGE_KEY, list);
  }

  async merged(): Promise<Hardware[]> {
    const base = await this.catalog.all();
    const overrides = this.loadOverrides();
    return HardwareProfileService.applyOverrides(base, overrides);
  }

  static applyOverrides(base: Hardware[], overrides: HardwareOverride[]): Hardware[] {
    const overrideById = new Map<string, HardwareOverride>(overrides.map((o) => [o.id, o]));
    const result: Hardware[] = [];

    for (const item of base) {
      const ov = overrideById.get(item.id);
      if (!ov) {
        result.push(item);
        continue;
      }
      if (ov.disabled) continue;
      result.push(applyPatch(item, ov.patch));
    }

    for (const ov of overrides) {
      if (!ov.custom || ov.disabled) continue;
      const built = buildFromPatch(ov.id, ov.patch);
      if (built) result.push(built);
    }

    return result;
  }

  upsertOverride(override: HardwareOverride): void {
    const list = this.loadOverrides();
    const idx = list.findIndex((o) => o.id === override.id);
    if (idx >= 0) list[idx] = override;
    else list.push(override);
    this.saveOverrides(list);
  }

  removeOverride(id: string): void {
    this.saveOverrides(this.loadOverrides().filter((o) => o.id !== id));
  }
}

function applyPatch(base: Hardware, patch: HardwareOverridePatch): Hardware {
  return Hardware.fromJSON({
    id: base.id,
    name: patch.name ?? base.name,
    vendor: patch.vendor ?? base.vendor,
    category: patch.category ?? base.category,
    powerWatts: patch.powerWatts ?? base.powerWatts,
    description: patch.description ?? base.description,
  });
}

function buildFromPatch(id: string, patch: HardwareOverridePatch): Hardware | null {
  if (!patch.name || !patch.vendor || !patch.category || typeof patch.powerWatts !== 'number') {
    return null;
  }
  return Hardware.fromJSON({
    id,
    name: patch.name,
    vendor: patch.vendor,
    category: patch.category,
    powerWatts: patch.powerWatts,
    description: patch.description,
  });
}
