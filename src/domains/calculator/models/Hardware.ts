import { ValidationError } from '@core/errors/ValidationError';

export type HardwareCategory = 'gpu' | 'tpu' | 'cpu';

export interface HardwareJSON {
  id: string;
  name: string;
  vendor: string;
  category: HardwareCategory;
  powerWatts: number;
  description?: string;
}

export class Hardware {
  private constructor(
    public readonly id: string,
    public readonly name: string,
    public readonly vendor: string,
    public readonly category: HardwareCategory,
    public readonly powerWatts: number,
    public readonly description: string | undefined,
  ) {
    Object.freeze(this);
  }

  static fromJSON(raw: unknown): Hardware {
    if (typeof raw !== 'object' || raw === null) {
      throw ValidationError.of('hardware', 'Invalid hardware record.');
    }
    const o = raw as Partial<HardwareJSON>;
    if (!o.id || !o.name || !o.vendor || !o.category || typeof o.powerWatts !== 'number') {
      throw ValidationError.of('hardware', 'Hardware: missing required fields.');
    }
    if (o.powerWatts <= 0) {
      throw ValidationError.of('powerWatts', 'Hardware: powerWatts must be > 0.');
    }
    if (!['gpu', 'tpu', 'cpu'].includes(o.category)) {
      throw ValidationError.of('category', `Hardware: unknown category "${o.category}".`);
    }
    return new Hardware(o.id, o.name, o.vendor, o.category, o.powerWatts, o.description);
  }

  get displayName(): string {
    return `${this.vendor} ${this.name}`;
  }
}
