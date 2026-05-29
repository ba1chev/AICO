import { Hardware } from '../models/Hardware';

export class HardwareCatalog {
  private cache: Hardware[] | null = null;

  constructor(private readonly url = '/data/hardware.json') {}

  async all(): Promise<Hardware[]> {
    if (this.cache) return this.cache;
    const res = await fetch(this.url);
    if (!res.ok) throw new Error(`HardwareCatalog: HTTP ${res.status}`);
    const raw = (await res.json()) as unknown[];
    this.cache = raw.map((r) => Hardware.fromJSON(r));
    return this.cache;
  }

  async findById(id: string): Promise<Hardware | undefined> {
    const list = await this.all();
    return list.find((h) => h.id === id);
  }
}
