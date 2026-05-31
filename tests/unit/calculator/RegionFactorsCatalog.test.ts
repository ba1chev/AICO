import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { RegionFactorsCatalog } from '@domains/calculator/services/RegionFactorsCatalog';

const FIXTURE = [
  {
    regionId: 'bg',
    versions: [
      {
        version: '2024.1',
        effectiveDate: '2024-01-01',
        carbonIntensityGCO2PerKWh: 410,
        wueLitersPerKWh: 1.9,
        source: 'test 2024',
      },
      {
        version: '2026.1',
        effectiveDate: '2026-01-01',
        carbonIntensityGCO2PerKWh: 360,
        wueLitersPerKWh: 1.8,
        source: 'test 2026',
      },
    ],
  },
  {
    regionId: 'fr',
    versions: [
      {
        version: '2026.1',
        effectiveDate: '2026-01-01',
        carbonIntensityGCO2PerKWh: 60,
        wueLitersPerKWh: 1.5,
        source: 'test 2026',
      },
    ],
  },
];

describe('RegionFactorsCatalog', () => {
  beforeEach(() => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => FIXTURE,
    } as unknown as Response) as typeof fetch;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns versions sorted by effectiveDate ascending', async () => {
    const catalog = new RegionFactorsCatalog();
    const versions = await catalog.versionsFor('bg');
    expect(versions.map((v) => v.version)).toEqual(['2024.1', '2026.1']);
  });

  it('latestFor returns the newest version', async () => {
    const catalog = new RegionFactorsCatalog();
    const latest = await catalog.latestFor('bg');
    expect(latest?.version).toBe('2026.1');
    expect(latest?.carbonIntensityGCO2PerKWh).toBe(360);
  });

  it('findVersion locates a specific version', async () => {
    const catalog = new RegionFactorsCatalog();
    const v = await catalog.findVersion('bg', '2024.1');
    expect(v?.carbonIntensityGCO2PerKWh).toBe(410);
  });

  it('findVersion returns undefined for unknown version', async () => {
    const catalog = new RegionFactorsCatalog();
    const v = await catalog.findVersion('bg', '1999.9');
    expect(v).toBeUndefined();
  });

  it('asOf picks the version active at the given date', async () => {
    const catalog = new RegionFactorsCatalog();
    const earlier = await catalog.asOf('bg', new Date('2025-06-01'));
    expect(earlier?.version).toBe('2024.1');
    const later = await catalog.asOf('bg', new Date('2026-06-01'));
    expect(later?.version).toBe('2026.1');
  });

  it('asOf returns undefined when the date precedes any version', async () => {
    const catalog = new RegionFactorsCatalog();
    const before = await catalog.asOf('bg', new Date('2000-01-01'));
    expect(before).toBeUndefined();
  });

  it('returns empty list for unknown region', async () => {
    const catalog = new RegionFactorsCatalog();
    const versions = await catalog.versionsFor('unknown');
    expect(versions).toEqual([]);
  });
});
