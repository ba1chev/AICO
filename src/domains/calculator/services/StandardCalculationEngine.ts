import { CalculationEngine } from './CalculationEngine';
import type { CalculationParams } from '../models/CalculationParams';

export class StandardCalculationEngine extends CalculationEngine {
  protected override computeEnergyKWh(params: CalculationParams): number {
    const { hardware, durationHours, pue, utilization, hardwareCount } = params;
    const watts = hardware.powerWatts * hardwareCount;
    const wattHours = watts * durationHours * pue * utilization;
    return wattHours / 1000;
  }

  protected override computeCO2eGrams(energyKWh: number, params: CalculationParams): number {
    return energyKWh * params.region.carbonIntensityGCO2PerKWh;
  }

  protected override computeWaterLiters(energyKWh: number, params: CalculationParams): number {
    return energyKWh * params.region.wueLitersPerKWh;
  }
}
