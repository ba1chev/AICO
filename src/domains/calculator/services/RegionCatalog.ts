import { Region } from '../models/Region';
import { RegionFactorsCatalog } from './RegionFactorsCatalog';

interface RegionRecord {
  id: string;
  name: string;
  countryCode: string;
  defaultPUE: number;
  carbonIntensityGCO2PerKWh?: number;
  wueLitersPerKWh?: number;
}

export class RegionCatalog {
  private cache: Region[] | null = null;
  private versionByRegion: Map<string, string> | null = null;

  constructor(
    private readonly factors: RegionFactorsCatalog,
    private readonly url = '/data/regions.json',
  ) {}

  async all(): Promise<Region[]> {
    if (this.cache) return this.cache;
    const res = await fetch(this.url);
    if (!res.ok) throw new Error(`RegionCatalog: HTTP ${res.status}`);
    const raw = (await res.json()) as RegionRecord[];
    const versionByRegion = new Map<string, string>();
    const list: Region[] = [];
    for (const rec of raw) {
      const latest = await this.factors.latestFor(rec.id);
      const carbon = latest?.carbonIntensityGCO2PerKWh ?? rec.carbonIntensityGCO2PerKWh ?? 0;
      const wue = latest?.wueLitersPerKWh ?? rec.wueLitersPerKWh ?? 0;
      list.push(
        Region.fromJSON({
          id: rec.id,
          name: rec.name,
          countryCode: rec.countryCode,
          defaultPUE: rec.defaultPUE,
          carbonIntensityGCO2PerKWh: carbon,
          wueLitersPerKWh: wue,
        }),
      );
      if (latest) versionByRegion.set(rec.id, latest.version);
    }
    this.cache = list;
    this.versionByRegion = versionByRegion;
    return list;
  }

  async findById(id: string): Promise<Region | undefined> {
    const list = await this.all();
    return list.find((r) => r.id === id);
  }

  async latestVersionFor(regionId: string): Promise<string | undefined> {
    if (!this.versionByRegion) await this.all();
    return this.versionByRegion?.get(regionId);
  }
}
