import type { IStorage } from './IStorage';

export class MemoryStorageAdapter implements IStorage {
  private readonly map = new Map<string, string>();

  get<T>(key: string): T | null {
    const raw = this.map.get(key);
    if (raw === undefined) return null;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  }

  set<T>(key: string, value: T): void {
    this.map.set(key, JSON.stringify(value));
  }

  remove(key: string): void {
    this.map.delete(key);
  }

  has(key: string): boolean {
    return this.map.has(key);
  }

  keys(): string[] {
    return Array.from(this.map.keys());
  }

  clear(): void {
    this.map.clear();
  }
}
