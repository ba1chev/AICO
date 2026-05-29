import type { IStorage } from './IStorage';
import { NotFoundError } from '../errors';

export interface Identifiable {
  readonly id: string;
}

export abstract class Repository<T extends Identifiable> {
  protected constructor(
    protected readonly storage: IStorage,
    protected readonly storageKey: string,
  ) {}

  protected abstract serialize(entity: T): unknown;
  protected abstract deserialize(raw: unknown): T;

  all(): T[] {
    const raw = this.storage.get<unknown[]>(this.storageKey);
    if (!Array.isArray(raw)) return [];
    const out: T[] = [];
    for (const r of raw) {
      try {
        out.push(this.deserialize(r));
      } catch (err) {
        console.warn(`[Repository:${this.storageKey}] Skipping corrupt record:`, err);
      }
    }
    return out;
  }

  findById(id: string): T | null {
    return this.all().find((e) => e.id === id) ?? null;
  }

  getById(id: string): T {
    const found = this.findById(id);
    if (!found) throw new NotFoundError(this.storageKey, id);
    return found;
  }

  save(entity: T): T {
    const all = this.all();
    const idx = all.findIndex((e) => e.id === entity.id);
    if (idx >= 0) all[idx] = entity;
    else all.push(entity);
    this.writeAll(all);
    return entity;
  }

  remove(id: string): void {
    const all = this.all().filter((e) => e.id !== id);
    this.writeAll(all);
  }

  count(): number {
    return this.all().length;
  }

  protected writeAll(entities: T[]): void {
    this.storage.set(
      this.storageKey,
      entities.map((e) => this.serialize(e)),
    );
  }
}
