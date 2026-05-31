import './styles/tokens.css';
import './styles/reset.css';
import './styles/base.css';
import './styles/layout.css';
import './styles/a11y.css';
import './styles/charts.css';

import { App } from './App';
import { Container } from '@core/di/Container';
import { EventBus } from '@core/view/EventBus';
import { Router } from '@core/router/Router';
import { I18nService } from '@core/i18n/I18nService';
import { LocalStorageAdapter } from '@core/storage';

import { TOKENS } from './tokens';
import { HomeView } from './views/HomeView';
import { NotFoundView } from './views/NotFoundView';

import { HardwareCatalog } from '@domains/calculator/services/HardwareCatalog';
import { RegionCatalog } from '@domains/calculator/services/RegionCatalog';
import { RegionFactorsCatalog } from '@domains/calculator/services/RegionFactorsCatalog';
import { StandardCalculationEngine } from '@domains/calculator/services/StandardCalculationEngine';
import { CalculationRepository } from '@domains/calculator/repository/CalculationRepository';

import { UserRepository } from '@domains/auth/repository/UserRepository';
import { PBKDF2PasswordHasher } from '@domains/auth/services/PBKDF2PasswordHasher';
import { SessionManager } from '@domains/auth/services/SessionManager';
import { AuthService } from '@domains/auth/services/AuthService';
import { OAuthProviderStub } from '@domains/auth/services/OAuthProviderStub';
import { seedAdminIfMissing } from '@domains/auth/services/seedAdmin';
import { AuthGuard, GuestOnlyGuard, RoleGuard } from '@domains/auth/guards/AuthGuards';

import { ScenarioRepository } from '@domains/scenarios/repository/ScenarioRepository';
import { ScenarioComparisonService } from '@domains/scenarios/services/ScenarioComparisonService';

import { ReportsService } from '@domains/reports/services/ReportsService';

import { UserManagementService } from '@domains/admin/services/UserManagementService';
import { HardwareProfileService } from '@domains/admin/services/HardwareProfileService';
import { DashboardService } from '@domains/dashboard/services/DashboardService';

async function bootstrap(): Promise<void> {
  const host = document.getElementById('app');
  if (!host) throw new Error('Missing #app element in index.html');

  const container = new Container();
  const bus = new EventBus();
  const i18n = new I18nService();
  const storage = new LocalStorageAdapter('aico');

  container.registerInstance(TOKENS.EventBus, bus);
  container.registerInstance(TOKENS.Storage, storage);
  container.registerInstance(TOKENS.I18n, i18n);

  container.registerSingleton(TOKENS.HardwareCatalog, () => new HardwareCatalog());
  container.registerSingleton(TOKENS.RegionFactors, () => new RegionFactorsCatalog());
  container.registerSingleton(
    TOKENS.RegionCatalog,
    (c) => new RegionCatalog(c.resolve(TOKENS.RegionFactors)),
  );
  container.registerSingleton(TOKENS.CalculationEngine, () => new StandardCalculationEngine());
  container.registerSingleton(
    TOKENS.CalculationRepository,
    (c) => new CalculationRepository(c.resolve(TOKENS.Storage)),
  );

  container.registerSingleton(TOKENS.PasswordHasher, () => new PBKDF2PasswordHasher());
  container.registerSingleton(TOKENS.Users, (c) => new UserRepository(c.resolve(TOKENS.Storage)));
  container.registerSingleton(TOKENS.SessionManager, (c) => new SessionManager(c.resolve(TOKENS.Storage)));
  container.registerSingleton(TOKENS.OAuth, () => new OAuthProviderStub());
  container.registerSingleton(
    TOKENS.Auth,
    (c) =>
      new AuthService(
        c.resolve(TOKENS.Users),
        c.resolve(TOKENS.PasswordHasher),
        c.resolve(TOKENS.SessionManager),
        c.resolve(TOKENS.EventBus),
      ),
  );

  container.registerSingleton(
    TOKENS.ScenarioRepository,
    (c) => new ScenarioRepository(c.resolve(TOKENS.Storage)),
  );
  container.registerSingleton(
    TOKENS.ScenarioComparison,
    (c) =>
      new ScenarioComparisonService(
        c.resolve(TOKENS.ScenarioRepository),
        c.resolve(TOKENS.CalculationRepository),
      ),
  );

  container.registerSingleton(
    TOKENS.Reports,
    (c) => new ReportsService(c.resolve(TOKENS.CalculationRepository)),
  );

  container.registerSingleton(
    TOKENS.UserManagement,
    (c) => new UserManagementService(c.resolve(TOKENS.Users), c.resolve(TOKENS.Auth)),
  );
  container.registerSingleton(
    TOKENS.HardwareProfile,
    (c) => new HardwareProfileService(c.resolve(TOKENS.HardwareCatalog), c.resolve(TOKENS.Storage)),
  );
  container.registerSingleton(
    TOKENS.Dashboard,
    (c) => new DashboardService(c.resolve(TOKENS.CalculationRepository)),
  );

  await i18n.load(I18nService.readPersistedLocale()).catch((err) => {
    console.warn('[bootstrap] i18n failed to load:', err);
  });

  await seedAdminIfMissing(container.resolve(TOKENS.Users), container.resolve(TOKENS.PasswordHasher));
  await container.resolve(TOKENS.Auth).restore();

  const app = new App(host, bus, container.resolve(TOKENS.Auth), i18n);
  const outlet = app.render();

  const router = new Router(outlet, container, bus);
  container.registerInstance(TOKENS.Router, router);

  const auth = container.resolve(TOKENS.Auth);
  const authGuard = () => new AuthGuard(auth, router);
  const guestOnly = () => new GuestOnlyGuard(auth, router);
  const adminOnly = () => new RoleGuard(auth, router, ['admin']);
  const dashboardRoles = () => new RoleGuard(auth, router, ['admin', 'organization', 'researcher']);

  router
    .register({ path: '/', view: HomeView, title: 'Начало' })
    .register({
      path: '/calculator',
      view: () => import('./domains/calculator/views/CalculatorView'),
      title: 'Калкулатор',
    })
    .register({
      path: '/result/:id',
      view: () => import('./domains/calculator/views/ResultView'),
      title: 'Резултат',
    })
    .register({
      path: '/login',
      view: () => import('./domains/auth/views/LoginView'),
      guards: [guestOnly()],
      title: 'Вход',
    })
    .register({
      path: '/register',
      view: () => import('./domains/auth/views/RegisterView'),
      guards: [guestOnly()],
      title: 'Регистрация',
    })
    .register({
      path: '/profile',
      view: () => import('./domains/auth/views/ProfileView'),
      guards: [authGuard()],
      title: 'Профил',
    })
    .register({
      path: '/history',
      view: () => import('./domains/history/views/HistoryView'),
      guards: [authGuard()],
      title: 'История',
    })
    .register({
      path: '/compare',
      view: () => import('./domains/scenarios/views/CompareView'),
      guards: [authGuard()],
      title: 'Сравнение',
    })
    .register({
      path: '/reports',
      view: () => import('./domains/reports/views/ReportsView'),
      guards: [authGuard()],
      title: 'Отчети',
    })
    .register({
      path: '/dashboard',
      view: () => import('./domains/dashboard/views/DashboardView'),
      guards: [dashboardRoles()],
      title: 'Табло',
    })
    .register({
      path: '/admin',
      view: () => import('./domains/admin/views/AdminView'),
      guards: [adminOnly()],
      title: 'Администрация',
    })
    .register({
      path: '/admin/users',
      view: () => import('./domains/admin/views/UserManagementView'),
      guards: [adminOnly()],
      title: 'Потребители',
    })
    .register({
      path: '/admin/hardware',
      view: () => import('./domains/admin/views/HardwareProfilesView'),
      guards: [adminOnly()],
      title: 'Хардуерни профили',
    })
    .registerNotFound(NotFoundView);

  router.start();
}

void bootstrap();
