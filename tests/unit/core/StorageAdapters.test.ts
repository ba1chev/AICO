import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MemoryStorageAdapter } from '@core/storage/MemoryStorageAdapter';
import { LocalStorageAdapter } from '@core/storage/LocalStorageAdapter';

describe('MemoryStorageAdapter', () => {
  let s: MemoryStorageAdapter;

  beforeEach(() => {
    s = new MemoryStorageAdapter();
  });

  it('round-trips JSON-serializable values', () => {
    s.set('k', { a: 1, b: 'two' });
    expect(s.get('k')).toEqual({ a: 1, b: 'two' });
  });

  it('returns null for missing keys', () => {
    expect(s.get('nope')).toBeNull();
  });

  it('has() reflects presence', () => {
    expect(s.has('k')).toBe(false);
    s.set('k', 1);
    expect(s.has('k')).toBe(true);
  });

  it('remove() drops a key', () => {
    s.set('k', 1);
    s.remove('k');
    expect(s.get('k')).toBeNull();
  });

  it('keys() lists all stored keys', () => {
    s.set('a', 1);
    s.set('b', 2);
    expect(s.keys().sort()).toEqual(['a', 'b']);
  });

  it('clear() empties the store', () => {
    s.set('a', 1);
    s.set('b', 2);
    s.clear();
    expect(s.keys()).toEqual([]);
  });

  it('returns null when stored value is corrupt JSON', () => {
    // Force-inject bad JSON via internal map (bypasses set's stringify).
    (s as unknown as { map: Map<string, string> }).map.set('bad', '{not-json');
    expect(s.get('bad')).toBeNull();
  });
});

describe('LocalStorageAdapter', () => {
  let store: Record<string, string>;
  let warnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    store = {};
    const stub: Storage = {
      get length() {
        return Object.keys(store).length;
      },
      clear: () => {
        store = {};
      },
      getItem: (k: string) => (k in store ? store[k]! : null),
      key: (i: number) => Object.keys(store)[i] ?? null,
      removeItem: (k: string) => {
        delete store[k];
      },
      setItem: (k: string, v: string) => {
        store[k] = v;
      },
    };
    vi.stubGlobal('localStorage', stub);
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  it('prefixes keys when writing and reading', () => {
    const a = new LocalStorageAdapter('test:');
    a.set('users', [{ id: 1 }]);
    expect(store['test:users']).toBe('[{"id":1}]');
    expect(a.get('users')).toEqual([{ id: 1 }]);
  });

  it('does not double-prefix already-prefixed keys', () => {
    const a = new LocalStorageAdapter('test:');
    a.set('test:users', 1);
    expect(Object.keys(store)).toEqual(['test:users']);
  });

  it('removes corrupt JSON entries on read', () => {
    const a = new LocalStorageAdapter('x:');
    store['x:k'] = '{not-json';
    expect(a.get('k')).toBeNull();
    expect(store['x:k']).toBeUndefined();
    expect(warnSpy).toHaveBeenCalled();
  });

  it('keys() returns prefixed keys with prefix stripped', () => {
    const a = new LocalStorageAdapter('x:');
    a.set('one', 1);
    a.set('two', 2);
    store['other:zzz'] = '"x"';
    expect(a.keys().sort()).toEqual(['one', 'two']);
  });

  it('clear() only removes prefixed entries', () => {
    const a = new LocalStorageAdapter('x:');
    a.set('one', 1);
    store['other:keep'] = '"x"';
    a.clear();
    expect(Object.keys(store)).toEqual(['other:keep']);
  });

  it('has() returns true only for stored prefixed keys', () => {
    const a = new LocalStorageAdapter('x:');
    expect(a.has('k')).toBe(false);
    a.set('k', 1);
    expect(a.has('k')).toBe(true);
  });
});
