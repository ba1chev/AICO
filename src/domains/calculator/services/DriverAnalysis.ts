import type { CalculationParams } from '../models/CalculationParams';

export interface Driver {
  key: 'power' | 'count' | 'hours' | 'pue' | 'utilization' | 'carbonIntensity';
  label: string;
  value: number;
  contributionPct: number;
}

const BASELINES = {
  power: 100,
  count: 1,
  hours: 1,
  pue: 1.0,
  utilization: 1.0,
  carbonIntensity: 50,
} as const;

const LABELS: Record<Driver['key'], string> = {
  power: 'Мощност на хардуер (W)',
  count: 'Брой устройства',
  hours: 'Продължителност (ч)',
  pue: 'PUE',
  utilization: 'Натоварване',
  carbonIntensity: 'Въглеродна интензивност (gCO₂/kWh)',
};

export class DriverAnalysis {
  forCO2e(params: CalculationParams): Driver[] {
    const ratios: Array<{ key: Driver['key']; value: number; ratio: number }> = [
      { key: 'power', value: params.hardware.powerWatts, ratio: params.hardware.powerWatts / BASELINES.power },
      { key: 'count', value: params.hardwareCount, ratio: params.hardwareCount / BASELINES.count },
      { key: 'hours', value: params.durationHours, ratio: params.durationHours / BASELINES.hours },
      { key: 'pue', value: params.pue, ratio: params.pue / BASELINES.pue },
      { key: 'utilization', value: params.utilization, ratio: params.utilization / BASELINES.utilization },
      {
        key: 'carbonIntensity',
        value: params.region.carbonIntensityGCO2PerKWh,
        ratio: params.region.carbonIntensityGCO2PerKWh / BASELINES.carbonIntensity,
      },
    ];

    const logs = ratios.map((r) => ({ ...r, mag: Math.max(0, Math.log(Math.max(r.ratio, 1e-9))) }));
    const total = logs.reduce((s, r) => s + r.mag, 0);

    return logs
      .map<Driver>((r) => ({
        key: r.key,
        label: LABELS[r.key],
        value: r.value,
        contributionPct: total > 0 ? (r.mag / total) * 100 : 0,
      }))
      .sort((a, b) => b.contributionPct - a.contributionPct);
  }
}
