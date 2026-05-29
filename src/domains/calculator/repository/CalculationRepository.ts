import { Repository } from '@core/storage';
import type { IStorage } from '@core/storage';
import { Calculation } from '../models/Calculation';
import { CalculationParams } from '../models/CalculationParams';
import { CalculationResult } from '../models/CalculationResult';
import { Hardware } from '../models/Hardware';
import { Region } from '../models/Region';
import type { WorkloadType } from '../models/WorkloadType';

interface CalculationDTO {
  id: string;
  createdAt: string;
  userId: string | null;
  label: string | null;
  params: {
    hardware: unknown;
    region: unknown;
    durationHours: number;
    pue: number;
    utilization: number;
    hardwareCount: number;
    workloadType: WorkloadType;
  };
  result: ReturnType<CalculationResult['toJSON']>;
}

export class CalculationRepository extends Repository<Calculation> {
  constructor(storage: IStorage) {
    super(storage, 'calculations');
  }

  protected override serialize(entity: Calculation): CalculationDTO {
    return {
      id: entity.id,
      createdAt: entity.createdAt.toISOString(),
      userId: entity.userId,
      label: entity.label,
      params: {
        hardware: {
          id: entity.params.hardware.id,
          name: entity.params.hardware.name,
          vendor: entity.params.hardware.vendor,
          category: entity.params.hardware.category,
          powerWatts: entity.params.hardware.powerWatts,
          description: entity.params.hardware.description,
        },
        region: {
          id: entity.params.region.id,
          name: entity.params.region.name,
          countryCode: entity.params.region.countryCode,
          carbonIntensityGCO2PerKWh: entity.params.region.carbonIntensityGCO2PerKWh,
          wueLitersPerKWh: entity.params.region.wueLitersPerKWh,
          defaultPUE: entity.params.region.defaultPUE,
        },
        durationHours: entity.params.durationHours,
        pue: entity.params.pue,
        utilization: entity.params.utilization,
        hardwareCount: entity.params.hardwareCount,
        workloadType: entity.params.workloadType,
      },
      result: entity.result.toJSON(),
    };
  }

  protected override deserialize(raw: unknown): Calculation {
    const dto = raw as CalculationDTO;
    const hardware = Hardware.fromJSON(dto.params.hardware);
    const region = Region.fromJSON(dto.params.region);
    const params = CalculationParams.create({
      hardware,
      region,
      durationHours: dto.params.durationHours,
      pue: dto.params.pue,
      utilization: dto.params.utilization,
      hardwareCount: dto.params.hardwareCount,
      workloadType: dto.params.workloadType,
    });
    const result = CalculationResult.fromJSON(dto.result);
    return new Calculation(
      dto.id,
      params,
      result,
      new Date(dto.createdAt),
      dto.userId,
      dto.label,
    );
  }
}
