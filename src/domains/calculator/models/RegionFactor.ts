export interface RegionFactorJSON {
  version: string;
  effectiveDate: string;
  carbonIntensityGCO2PerKWh: number;
  wueLitersPerKWh: number;
  source: string;
}

export class RegionFactor {
  private constructor(
    public readonly version: string,
    public readonly effectiveDate: Date,
    public readonly carbonIntensityGCO2PerKWh: number,
    public readonly wueLitersPerKWh: number,
    public readonly source: string,
  ) {
    Object.freeze(this);
  }

  static fromJSON(raw: unknown): RegionFactor {
    const o = raw as Partial<RegionFactorJSON>;
    if (!o?.version || !o.effectiveDate || !o.source) {
      throw new Error('RegionFactor: missing required fields.');
    }
    if (typeof o.carbonIntensityGCO2PerKWh !== 'number' || o.carbonIntensityGCO2PerKWh < 0) {
      throw new Error('RegionFactor: carbonIntensityGCO2PerKWh must be >= 0.');
    }
    if (typeof o.wueLitersPerKWh !== 'number' || o.wueLitersPerKWh < 0) {
      throw new Error('RegionFactor: wueLitersPerKWh must be >= 0.');
    }
    const date = new Date(o.effectiveDate);
    if (Number.isNaN(date.getTime())) {
      throw new Error(`RegionFactor: invalid effectiveDate "${o.effectiveDate}".`);
    }
    return new RegionFactor(
      o.version,
      date,
      o.carbonIntensityGCO2PerKWh,
      o.wueLitersPerKWh,
      o.source,
    );
  }
}
