import { createToken } from '@core/di/Container';
import type { EventBus } from '@core/view/EventBus';
import type { IStorage } from '@core/storage';
import type { I18nService } from '@core/i18n/I18nService';
import type { Router } from '@core/router/Router';

import type { HardwareCatalog } from '@domains/calculator/services/HardwareCatalog';
import type { RegionCatalog } from '@domains/calculator/services/RegionCatalog';
import type { CalculationEngine } from '@domains/calculator/services/CalculationEngine';
import type { CalculationRepository } from '@domains/calculator/repository/CalculationRepository';

export const TOKENS = {
  EventBus: createToken<EventBus>('EventBus'),
  Storage: createToken<IStorage>('Storage'),
  I18n: createToken<I18nService>('I18nService'),
  Router: createToken<Router>('Router'),

  HardwareCatalog: createToken<HardwareCatalog>('HardwareCatalog'),
  RegionCatalog: createToken<RegionCatalog>('RegionCatalog'),
  CalculationEngine: createToken<CalculationEngine>('CalculationEngine'),
  CalculationRepository: createToken<CalculationRepository>('CalculationRepository'),
} as const;
