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
      throw ValidationError.of('region', 'Невалиден region запис.');
    }
    const o = raw as Partial<RegionJSON>;
    if (!o.id || !o.name || !o.countryCode) {
      throw ValidationError.of('region', 'Region: липсват задължителни полета.');
    }
    if (typeof o.carbonIntensityGCO2PerKWh !== 'number' || o.carbonIntensityGCO2PerKWh < 0) {
      throw ValidationError.of('carbonIntensity', 'Region: carbonIntensityGCO2PerKWh трябва да е ≥ 0.');
    }
    if (typeof o.wueLitersPerKWh !== 'number' || o.wueLitersPerKWh < 0) {
      throw ValidationError.of('wue', 'Region: wueLitersPerKWh трябва да е ≥ 0.');
    }
    if (typeof o.defaultPUE !== 'number' || o.defaultPUE < 1) {
      throw ValidationError.of('pue', 'Region: defaultPUE трябва да е ≥ 1.');
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
