import type { Calculation } from '@domains/calculator/models/Calculation';
import type { CalculationRepository } from '@domains/calculator/repository/CalculationRepository';
import type { WorkloadType } from '@domains/calculator/models/WorkloadType';

export interface DashboardFilter {
  userIds: string[] | null;
  from: Date | null;
  to: Date | null;
}

export interface DashboardBreakdown {
  key: string;
  label: string;
  energyKWh: number;
  co2eKg: number;
  waterLiters: number;
  count: number;
}

export interface DashboardMonthBucket {
  month: string;
  energyKWh: number;
  co2eKg: number;
  waterLiters: number;
  count: number;
}

export interface DashboardData {
  filter: DashboardFilter;
  totals: { count: number; energyKWh: number; co2eKg: number; waterLiters: number };
  byHardware: DashboardBreakdown[];
  byRegion: DashboardBreakdown[];
  byWorkload: DashboardBreakdown[];
  byMonth: DashboardMonthBucket[];
}

export class DashboardService {
  constructor(private readonly calculations: CalculationRepository) {}

  build(filter: DashboardFilter): DashboardData {
    const items = this.collect(filter);
    return {
      filter,
      totals: totals(items),
      byHardware: groupBy(items, (c) => ({
        key: c.params.hardware.id,
        label: c.params.hardware.displayName,
      })),
      byRegion: groupBy(items, (c) => ({ key: c.params.region.id, label: c.params.region.name })),
      byWorkload: groupBy(items, (c) => ({
        key: c.params.workloadType,
        label: c.params.workloadType,
      })),
      byMonth: byMonth(items),
    };
  }

  private collect(filter: DashboardFilter): Calculation[] {
    const all = this.calculations.all();
    const userIds = filter.userIds == null ? null : new Set(filter.userIds);
    return all
      .filter((c) => (userIds == null ? true : c.userId != null && userIds.has(c.userId)))
      .filter((c) => (filter.from == null ? true : c.createdAt.getTime() >= filter.from.getTime()))
      .filter((c) => (filter.to == null ? true : c.createdAt.getTime() <= filter.to.getTime()))
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  }
}

function totals(items: Calculation[]): DashboardData['totals'] {
  let energyKWh = 0;
  let co2eKg = 0;
  let waterLiters = 0;
  for (const c of items) {
    energyKWh += c.result.energyKWh;
    co2eKg += c.result.co2eKg;
    waterLiters += c.result.waterLiters;
  }
  return { count: items.length, energyKWh, co2eKg, waterLiters };
}

function groupBy(
  items: Calculation[],
  keyFn: (c: Calculation) => { key: string; label: string },
): DashboardBreakdown[] {
  const map = new Map<string, DashboardBreakdown>();
  for (const c of items) {
    const { key, label } = keyFn(c);
    const existing = map.get(key);
    if (existing) {
      existing.energyKWh += c.result.energyKWh;
      existing.co2eKg += c.result.co2eKg;
      existing.waterLiters += c.result.waterLiters;
      existing.count += 1;
    } else {
      map.set(key, {
        key,
        label,
        energyKWh: c.result.energyKWh,
        co2eKg: c.result.co2eKg,
        waterLiters: c.result.waterLiters,
        count: 1,
      });
    }
  }
  return Array.from(map.values()).sort((a, b) => b.co2eKg - a.co2eKg);
}

function byMonth(items: Calculation[]): DashboardMonthBucket[] {
  const map = new Map<string, DashboardMonthBucket>();
  for (const c of items) {
    const key = `${c.createdAt.getFullYear()}-${String(c.createdAt.getMonth() + 1).padStart(2, '0')}`;
    const existing = map.get(key);
    if (existing) {
      existing.energyKWh += c.result.energyKWh;
      existing.co2eKg += c.result.co2eKg;
      existing.waterLiters += c.result.waterLiters;
      existing.count += 1;
    } else {
      map.set(key, {
        month: key,
        energyKWh: c.result.energyKWh,
        co2eKg: c.result.co2eKg,
        waterLiters: c.result.waterLiters,
        count: 1,
      });
    }
  }
  return Array.from(map.values()).sort((a, b) => a.month.localeCompare(b.month));
}

export type WorkloadKey = WorkloadType;
