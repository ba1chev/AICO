import { Region } from '../models/Region';

export class RegionCatalog {
  private cache: Region[] | null = null;

  constructor(private readonly url = '/data/regions.json') {}

  async all(): Promise<Region[]> {
    if (this.cache) return this.cache;
    const res = await fetch(this.url);
    if (!res.ok) throw new Error(`RegionCatalog: HTTP ${res.status}`);
    const raw = (await res.json()) as unknown[];
    this.cache = raw.map((r) => Region.fromJSON(r));
    return this.cache;
  }

  async findById(id: string): Promise<Region | undefined> {
    const list = await this.all();
    return list.find((r) => r.id === id);
  }
}
