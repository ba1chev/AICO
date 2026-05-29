import { Repository } from '@core/storage';
import type { IStorage } from '@core/storage';
import { ScenarioComparison } from '../models/ScenarioComparison';

interface ScenarioDTO {
  id: string;
  name: string;
  calculationIds: string[];
  createdAt: string;
  userId: string | null;
}

export class ScenarioRepository extends Repository<ScenarioComparison> {
  constructor(storage: IStorage) {
    super(storage, 'scenarios');
  }

  protected override serialize(entity: ScenarioComparison): ScenarioDTO {
    return {
      id: entity.id,
      name: entity.name,
      calculationIds: [...entity.calculationIds],
      createdAt: entity.createdAt.toISOString(),
      userId: entity.userId,
    };
  }

  protected override deserialize(raw: unknown): ScenarioComparison {
    const dto = raw as ScenarioDTO;
    if (!dto || typeof dto.id !== 'string' || !Array.isArray(dto.calculationIds)) {
      throw new Error('ScenarioComparison: невалиден JSON.');
    }
    return new ScenarioComparison(
      dto.id,
      dto.name ?? '',
      dto.calculationIds,
      new Date(dto.createdAt),
      dto.userId ?? null,
    );
  }

  findByUser(userId: string | null): ScenarioComparison[] {
    return this.all().filter((s) => s.userId === userId);
  }
}
