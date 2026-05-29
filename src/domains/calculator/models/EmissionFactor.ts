
export interface EmissionFactorJSON {
  version: string;
  effectiveDate: string;
  source: string;
}

export class EmissionFactor {
  private constructor(
    public readonly version: string,
    public readonly effectiveDate: Date,
    public readonly source: string,
  ) {
    Object.freeze(this);
  }

  static fromJSON(raw: unknown): EmissionFactor {
    const o = raw as Partial<EmissionFactorJSON>;
    if (!o?.version || !o.effectiveDate || !o.source) {
      throw new Error('EmissionFactor: missing required fields.');
    }
    const date = new Date(o.effectiveDate);
    if (Number.isNaN(date.getTime())) {
      throw new Error(`EmissionFactor: invalid date "${o.effectiveDate}".`);
    }
    return new EmissionFactor(o.version, date, o.source);
  }
}
