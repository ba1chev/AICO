import type { CalculationParams, CalculationParamsInput } from '../models/CalculationParams';
import { CalculationParams as Params } from '../models/CalculationParams';
import type { CalculationEngine } from './CalculationEngine';
import type { HardwareCatalog } from './HardwareCatalog';
import type { RegionCatalog } from './RegionCatalog';

export interface Recommendation {
  kind: 'region' | 'hardware' | 'pue';
  label: string;
  detail: string;
  savingsPct: number;
  newCO2eGrams: number;
  newWaterLiters: number;
}

const TARGET_PUE = 1.1;
const MIN_SAVINGS_PCT = 1;

export class RecommendationService {
  constructor(
    private readonly engine: CalculationEngine,
    private readonly hardware: HardwareCatalog,
    private readonly regions: RegionCatalog,
  ) {}

  async forParams(params: CalculationParams, currentCO2eGrams: number, limit = 3): Promise<Recommendation[]> {
    const candidates: Recommendation[] = [];

    const cleanest = await this.cleanestRegion(params);
    if (cleanest) candidates.push(cleanest);

    const efficient = await this.mostEfficientHardware(params);
    if (efficient) candidates.push(efficient);

    const pue = this.improvedPUE(params);
    if (pue) candidates.push(pue);

    return candidates
      .map((c) => ({ ...c, savingsPct: this.savings(currentCO2eGrams, c.newCO2eGrams) }))
      .filter((c) => c.savingsPct >= MIN_SAVINGS_PCT)
      .sort((a, b) => b.savingsPct - a.savingsPct)
      .slice(0, limit);
  }

  private async cleanestRegion(params: CalculationParams): Promise<Recommendation | null> {
    const all = await this.regions.all();
    const cleanest = all
      .filter((r) => r.id !== params.region.id)
      .reduce<typeof all[number] | null>(
        (best, r) =>
          best === null || r.carbonIntensityGCO2PerKWh < best.carbonIntensityGCO2PerKWh ? r : best,
        null,
      );
    if (!cleanest) return null;
    if (cleanest.carbonIntensityGCO2PerKWh >= params.region.carbonIntensityGCO2PerKWh) return null;

    const swapped = this.with(params, { region: cleanest });
    const result = this.engine.compute(swapped);
    return {
      kind: 'region',
      label: `Преместете изчислението в регион ${cleanest.name}`,
      detail: `${params.region.carbonIntensityGCO2PerKWh} → ${cleanest.carbonIntensityGCO2PerKWh} gCO₂/kWh`,
      savingsPct: 0,
      newCO2eGrams: result.co2eGrams,
      newWaterLiters: result.waterLiters,
    };
  }

  private async mostEfficientHardware(params: CalculationParams): Promise<Recommendation | null> {
    const all = await this.hardware.all();
    const sameCategory = all.filter(
      (h) => h.category === params.hardware.category && h.id !== params.hardware.id,
    );
    if (sameCategory.length === 0) return null;
    const best = sameCategory.reduce((b, h) => (h.powerWatts < b.powerWatts ? h : b));
    if (best.powerWatts >= params.hardware.powerWatts) return null;

    const swapped = this.with(params, { hardware: best });
    const result = this.engine.compute(swapped);
    return {
      kind: 'hardware',
      label: `Сменете на по-ефективен хардуер: ${best.displayName}`,
      detail: `${params.hardware.powerWatts}W → ${best.powerWatts}W`,
      savingsPct: 0,
      newCO2eGrams: result.co2eGrams,
      newWaterLiters: result.waterLiters,
    };
  }

  private improvedPUE(params: CalculationParams): Recommendation | null {
    if (params.pue <= TARGET_PUE) return null;
    const swapped = this.with(params, { pue: TARGET_PUE });
    const result = this.engine.compute(swapped);
    return {
      kind: 'pue',
      label: `Изберете по-ефективен дейтацентър (PUE ${TARGET_PUE.toFixed(1)})`,
      detail: `PUE ${params.pue.toFixed(2)} → ${TARGET_PUE.toFixed(2)}`,
      savingsPct: 0,
      newCO2eGrams: result.co2eGrams,
      newWaterLiters: result.waterLiters,
    };
  }

  private savings(current: number, alternative: number): number {
    if (current <= 0) return 0;
    return Math.max(0, ((current - alternative) / current) * 100);
  }

  private with(params: CalculationParams, overrides: Partial<CalculationParamsInput>): CalculationParams {
    return Params.create({
      hardware: overrides.hardware ?? params.hardware,
      region: overrides.region ?? params.region,
      durationHours: overrides.durationHours ?? params.durationHours,
      pue: overrides.pue ?? params.pue,
      utilization: overrides.utilization ?? params.utilization,
      hardwareCount: overrides.hardwareCount ?? params.hardwareCount,
      workloadType: overrides.workloadType ?? params.workloadType,
    });
  }
}
