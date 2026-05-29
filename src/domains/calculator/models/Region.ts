import { ValidationError } from '@core/errors/ValidationError';

export interface RegionJSON {
  id: string;
  name: string;
  countryCode: string;
  carbonIntensityGCO2PerKWh: number;
  wueLitersPerKWh: number;
  defaultPUE: number;
}

export class Region {
  private constructor(
    public readonly id: string,
    public readonly name: string,
    public readonly countryCode: string,
    public readonly carbonIntensityGCO2PerKWh: number,
    public readonly wueLitersPerKWh: number,
    public readonly defaultPUE: number,
  ) {
    Object.freeze(this);
  }

  static fromJSON(raw: unknown): Region {
    if (typeof raw !== 'object' || raw === null) {
      throw ValidationError.of('region', 'Invalid region record.');
    }
    const o = raw as Partial<RegionJSON>;
    if (!o.id || !o.name || !o.countryCode) {
      throw ValidationError.of('region', 'Region: missing required fields.');
    }
    if (typeof o.carbonIntensityGCO2PerKWh !== 'number' || o.carbonIntensityGCO2PerKWh < 0) {
      throw ValidationError.of('carbonIntensity', 'Region: carbonIntensityGCO2PerKWh must be >= 0.');
    }
    if (typeof o.wueLitersPerKWh !== 'number' || o.wueLitersPerKWh < 0) {
      throw ValidationError.of('wue', 'Region: wueLitersPerKWh must be >= 0.');
    }
    if (typeof o.defaultPUE !== 'number' || o.defaultPUE < 1) {
      throw ValidationError.of('pue', 'Region: defaultPUE must be >= 1.');
    }
    return new Region(
      o.id,
      o.name,
      o.countryCode,
      o.carbonIntensityGCO2PerKWh,
      o.wueLitersPerKWh,
      o.defaultPUE,
    );
  }
}
