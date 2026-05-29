export interface IStorage {
  get<T>(key: string): T | null;
  set<T>(key: string, value: T): void;
  remove(key: string): void;
  has(key: string): boolean;
  keys(): string[];
  clear(): void;
}
