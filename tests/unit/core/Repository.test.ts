import { describe, it, expect, beforeEach } from 'vitest';
import { Repository, type Identifiable } from '@core/storage';
import { MemoryStorageAdapter } from '@core/storage/MemoryStorageAdapter';
import { NotFoundError } from '@core/errors';

interface Widget extends Identifiable {
  id: string;
  name: string;
}

class WidgetRepository extends Repository<Widget> {
  constructor(storage: MemoryStorageAdapter) {
    super(storage, 'widgets');
  }
  protected override serialize(entity: Widget): unknown {
    return { id: entity.id, name: entity.name };
  }
  protected override deserialize(raw: unknown): Widget {
    const o = raw as Partial<Widget>;
    if (!o.id || !o.name) throw new Error('invalid widget');
    return { id: o.id, name: o.name };
  }
}

describe('Repository', () => {
  let storage: MemoryStorageAdapter;
  let repo: WidgetRepository;

  beforeEach(() => {
    storage = new MemoryStorageAdapter();
    repo = new WidgetRepository(storage);
  });

  it('all() returns empty list when storage is empty', () => {
    expect(repo.all()).toEqual([]);
    expect(repo.count()).toBe(0);
  });

  it('save() inserts and findById() retrieves', () => {
    repo.save({ id: 'w1', name: 'Alpha' });
    expect(repo.findById('w1')).toEqual({ id: 'w1', name: 'Alpha' });
    expect(repo.count()).toBe(1);
  });

  it('save() updates an existing entity in place', () => {
    repo.save({ id: 'w1', name: 'Alpha' });
    repo.save({ id: 'w1', name: 'Updated' });
    expect(repo.findById('w1')?.name).toBe('Updated');
    expect(repo.count()).toBe(1);
  });

  it('findById() returns null when missing', () => {
    expect(repo.findById('nope')).toBeNull();
  });

  it('getById() throws NotFoundError when missing', () => {
    expect(() => repo.getById('nope')).toThrow(NotFoundError);
  });

  it('remove() deletes by id', () => {
    repo.save({ id: 'w1', name: 'Alpha' });
    repo.save({ id: 'w2', name: 'Beta' });
    repo.remove('w1');
    expect(repo.findById('w1')).toBeNull();
    expect(repo.findById('w2')).not.toBeNull();
    expect(repo.count()).toBe(1);
  });

  it('skips records that fail deserialization', () => {
    storage.set('widgets', [
      { id: 'w1', name: 'Alpha' },
      { id: 'broken' },
      { id: 'w2', name: 'Beta' },
    ]);
    const list = repo.all();
    expect(list.map((w) => w.id)).toEqual(['w1', 'w2']);
  });

  it('persists through the underlying storage', () => {
    repo.save({ id: 'w1', name: 'Alpha' });
    const fresh = new WidgetRepository(storage);
    expect(fresh.findById('w1')?.name).toBe('Alpha');
  });
});
