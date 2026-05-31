import { RegionFactor } from '../models/RegionFactor';

interface RegionFactorsBundle {
  regionId: string;
  versions: RegionFactor[];
}

export class RegionFactorsCatalog {
  private cache: Map<string, RegionFactorsBundle> | null = null;

  constructor(private readonly url = '/data/region-factors.json') {}

  async load(): Promise<Map<string, RegionFactorsBundle>> {
    if (this.cache) return this.cache;
    const res = await fetch(this.url);
    if (!res.ok) throw new Error(`RegionFactorsCatalog: HTTP ${res.status}`);
    const raw = (await res.json()) as Array<{ regionId: string; versions: unknown[] }>;
    const map = new Map<string, RegionFactorsBundle>();
    for (const entry of raw) {
      const versions = entry.versions
        .map((v) => RegionFactor.fromJSON(v))
        .sort((a, b) => a.effectiveDate.getTime() - b.effectiveDate.getTime());
      map.set(entry.regionId, { regionId: entry.regionId, versions });
    }
    this.cache = map;
    return map;
  }

  async versionsFor(regionId: string): Promise<RegionFactor[]> {
    const map = await this.load();
    return map.get(regionId)?.versions ?? [];
  }

  async latestFor(regionId: string): Promise<RegionFactor | undefined> {
    const versions = await this.versionsFor(regionId);
    return versions[versions.length - 1];
  }

  async findVersion(regionId: string, version: string): Promise<RegionFactor | undefined> {
    const versions = await this.versionsFor(regionId);
    return versions.find((v) => v.version === version);
  }

  async asOf(regionId: string, date: Date): Promise<RegionFactor | undefined> {
    const versions = await this.versionsFor(regionId);
    let active: RegionFactor | undefined;
    for (const v of versions) {
      if (v.effectiveDate.getTime() <= date.getTime()) active = v;
      else break;
    }
    return active;
  }
}
