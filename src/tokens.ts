import { createToken } from '@core/di/Container';
import type { EventBus } from '@core/view/EventBus';
import type { IStorage } from '@core/storage';
import type { I18nService } from '@core/i18n/I18nService';
import type { Router } from '@core/router/Router';

import type { HardwareCatalog } from '@domains/calculator/services/HardwareCatalog';
import type { RegionCatalog } from '@domains/calculator/services/RegionCatalog';
import type { RegionFactorsCatalog } from '@domains/calculator/services/RegionFactorsCatalog';
import type { CalculationEngine } from '@domains/calculator/services/CalculationEngine';
import type { CalculationRepository } from '@domains/calculator/repository/CalculationRepository';

import type { AuthService } from '@domains/auth/services/AuthService';
import type { UserRepository } from '@domains/auth/repository/UserRepository';
import type { IPasswordHasher } from '@domains/auth/services/IPasswordHasher';
import type { SessionManager } from '@domains/auth/services/SessionManager';
import type { OAuthProviderStub } from '@domains/auth/services/OAuthProviderStub';

import type { ScenarioRepository } from '@domains/scenarios/repository/ScenarioRepository';
import type { ScenarioComparisonService } from '@domains/scenarios/services/ScenarioComparisonService';

import type { ReportsService } from '@domains/reports/services/ReportsService';

import type { UserManagementService } from '@domains/admin/services/UserManagementService';
import type { HardwareProfileService } from '@domains/admin/services/HardwareProfileService';
import type { DashboardService } from '@domains/dashboard/services/DashboardService';

export const TOKENS = {
  EventBus: createToken<EventBus>('EventBus'),
  Storage: createToken<IStorage>('Storage'),
  I18n: createToken<I18nService>('I18nService'),
  Router: createToken<Router>('Router'),

  HardwareCatalog: createToken<HardwareCatalog>('HardwareCatalog'),
  RegionCatalog: createToken<RegionCatalog>('RegionCatalog'),
  RegionFactors: createToken<RegionFactorsCatalog>('RegionFactorsCatalog'),
  CalculationEngine: createToken<CalculationEngine>('CalculationEngine'),
  CalculationRepository: createToken<CalculationRepository>('CalculationRepository'),

  Auth: createToken<AuthService>('AuthService'),
  Users: createToken<UserRepository>('UserRepository'),
  PasswordHasher: createToken<IPasswordHasher>('PasswordHasher'),
  SessionManager: createToken<SessionManager>('SessionManager'),
  OAuth: createToken<OAuthProviderStub>('OAuthProviderStub'),

  ScenarioRepository: createToken<ScenarioRepository>('ScenarioRepository'),
  ScenarioComparison: createToken<ScenarioComparisonService>('ScenarioComparisonService'),

  Reports: createToken<ReportsService>('ReportsService'),

  UserManagement: createToken<UserManagementService>('UserManagementService'),
  HardwareProfile: createToken<HardwareProfileService>('HardwareProfileService'),
  Dashboard: createToken<DashboardService>('DashboardService'),
} as const;
