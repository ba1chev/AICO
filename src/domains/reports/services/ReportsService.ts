import type { Calculation } from '@domains/calculator/models/Calculation';
import type { CalculationRepository } from '@domains/calculator/repository/CalculationRepository';

export interface ReportFilter {
  userId: string | null;
  from: Date | null;
  to: Date | null;
}

export interface ReportSummary {
  count: number;
  energyKWh: number;
  co2eKg: number;
  waterLiters: number;
}

export interface ReportData {
  filter: ReportFilter;
  calculations: Calculation[];
  totals: ReportSummary;
}

export class ReportsService {
  constructor(private readonly calculations: CalculationRepository) {}

  build(filter: ReportFilter): ReportData {
    const items = this.collect(filter);
    const totals = ReportsService.summarize(items);
    return { filter, calculations: items, totals };
  }

  private collect(filter: ReportFilter): Calculation[] {
    const all = this.calculations.all();
    return all
      .filter((c) => (filter.userId == null ? true : c.userId === filter.userId))
      .filter((c) => (filter.from == null ? true : c.createdAt.getTime() >= filter.from.getTime()))
      .filter((c) => (filter.to == null ? true : c.createdAt.getTime() <= filter.to.getTime()))
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  }

  static summarize(items: Calculation[]): ReportSummary {
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
}
