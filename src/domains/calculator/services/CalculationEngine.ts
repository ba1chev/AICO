import type { CalculationParams } from '../models/CalculationParams';
import { CalculationResult } from '../models/CalculationResult';

export abstract class CalculationEngine {
  compute(params: CalculationParams): CalculationResult {
    const energyKWh = this.computeEnergyKWh(params);
    const co2eGrams = this.computeCO2eGrams(energyKWh, params);
    const waterLiters = this.computeWaterLiters(energyKWh, params);
    return CalculationResult.of(energyKWh, co2eGrams, waterLiters);
  }

  protected abstract computeEnergyKWh(params: CalculationParams): number;
  protected abstract computeCO2eGrams(energyKWh: number, params: CalculationParams): number;
  protected abstract computeWaterLiters(energyKWh: number, params: CalculationParams): number;
}
