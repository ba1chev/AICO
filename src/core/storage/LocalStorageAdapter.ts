import type { IStorage } from './IStorage';

export class LocalStorageAdapter implements IStorage {
  private readonly prefix: string;

  constructor(prefix = 'aico:') {
    this.prefix = prefix;
  }

  private k(key: string): string {
    return key.startsWith(this.prefix) ? key : this.prefix + key;
  }

  get<T>(key: string): T | null {
    const raw = localStorage.getItem(this.k(key));
    if (raw === null) return null;
    try {
      return JSON.parse(raw) as T;
    } catch {
      console.warn(`[LocalStorageAdapter] Невалиден JSON за "${key}". Изтриваме.`);
      this.remove(key);
      return null;
    }
  }

  set<T>(key: string, value: T): void {
    try {
      localStorage.setItem(this.k(key), JSON.stringify(value));
    } catch (err) {
      console.error(`[LocalStorageAdapter] Не можа да се запише "${key}":`, err);
    }
  }

  remove(key: string): void {
    localStorage.removeItem(this.k(key));
  }

  has(key: string): boolean {
    return localStorage.getItem(this.k(key)) !== null;
  }

  keys(): string[] {
    const out: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(this.prefix)) out.push(k.slice(this.prefix.length));
    }
    return out;
  }

  clear(): void {
    for (const k of this.keys()) this.remove(k);
  }
}
