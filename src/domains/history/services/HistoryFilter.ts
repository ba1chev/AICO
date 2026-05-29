import type { Calculation } from '@domains/calculator/models/Calculation';
import type { WorkloadType } from '@domains/calculator/models/WorkloadType';

export interface HistoryFilter {
  from?: Date | null;
  to?: Date | null;
  hardwareId?: string | null;
  regionId?: string | null;
  workloadType?: WorkloadType | null;
  search?: string;
}

export type HistorySortKey =
  | 'createdAt'
  | 'energyKWh'
  | 'co2eGrams'
  | 'waterLiters'
  | 'durationHours'
  | 'hardware'
  | 'region';

export type SortDirection = 'asc' | 'desc';

export function applyFilter(items: Calculation[], filter: HistoryFilter): Calculation[] {
  return items.filter((c) => {
    if (filter.from && c.createdAt < filter.from) return false;
    if (filter.to && c.createdAt > filter.to) return false;
    if (filter.hardwareId && c.params.hardware.id !== filter.hardwareId) return false;
    if (filter.regionId && c.params.region.id !== filter.regionId) return false;
    if (filter.workloadType && c.params.workloadType !== filter.workloadType) return false;
    if (filter.search && filter.search.trim()) {
      const needle = filter.search.trim().toLowerCase();
      const hay = [
        c.params.hardware.displayName,
        c.params.region.name,
        c.label ?? '',
      ]
        .join(' ')
        .toLowerCase();
      if (!hay.includes(needle)) return false;
    }
    return true;
  });
}

export function applySort(
  items: Calculation[],
  key: HistorySortKey,
  direction: SortDirection,
): Calculation[] {
  const sorted = [...items].sort((a, b) => compare(a, b, key));
  return direction === 'desc' ? sorted.reverse() : sorted;
}

function compare(a: Calculation, b: Calculation, key: HistorySortKey): number {
  switch (key) {
    case 'createdAt':
      return a.createdAt.getTime() - b.createdAt.getTime();
    case 'energyKWh':
      return a.result.energyKWh - b.result.energyKWh;
    case 'co2eGrams':
      return a.result.co2eGrams - b.result.co2eGrams;
    case 'waterLiters':
      return a.result.waterLiters - b.result.waterLiters;
    case 'durationHours':
      return a.params.durationHours - b.params.durationHours;
    case 'hardware':
      return a.params.hardware.displayName.localeCompare(b.params.hardware.displayName, 'bg');
    case 'region':
      return a.params.region.name.localeCompare(b.params.region.name, 'bg');
  }
}
