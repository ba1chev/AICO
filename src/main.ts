import './styles/tokens.css';
import './styles/reset.css';
import './styles/base.css';
import './styles/layout.css';
import './styles/a11y.css';

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
import { StandardCalculationEngine } from '@domains/calculator/services/StandardCalculationEngine';
import { CalculationRepository } from '@domains/calculator/repository/CalculationRepository';

import { UserRepository } from '@domains/auth/repository/UserRepository';
import { PBKDF2PasswordHasher } from '@domains/auth/services/PBKDF2PasswordHasher';
import { SessionManager } from '@domains/auth/services/SessionManager';
import { AuthService } from '@domains/auth/services/AuthService';
import { OAuthProviderStub } from '@domains/auth/services/OAuthProviderStub';
import { seedAdminIfMissing } from '@domains/auth/services/seedAdmin';
import { AuthGuard, GuestOnlyGuard } from '@domains/auth/guards/AuthGuards';

async function bootstrap(): Promise<void> {
  const host = document.getElementById('app');
  if (!host) throw new Error('Липсва #app в index.html');

  const container = new Container();
  const bus = new EventBus();
  const i18n = new I18nService();
  const storage = new LocalStorageAdapter('aico');

  container.registerInstance(TOKENS.EventBus, bus);
  container.registerInstance(TOKENS.Storage, storage);
  container.registerInstance(TOKENS.I18n, i18n);

  container.registerSingleton(TOKENS.HardwareCatalog, () => new HardwareCatalog());
  container.registerSingleton(TOKENS.RegionCatalog, () => new RegionCatalog());
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

  await i18n.load('bg').catch((err) => {
    console.warn('[bootstrap] i18n не успя да зареди:', err);
  });

  await seedAdminIfMissing(container.resolve(TOKENS.Users), container.resolve(TOKENS.PasswordHasher));
  await container.resolve(TOKENS.Auth).restore();

  const app = new App(host, bus, container.resolve(TOKENS.Auth));
  const outlet = app.render();

  const router = new Router(outlet, container, bus);
  container.registerInstance(TOKENS.Router, router);

  const auth = container.resolve(TOKENS.Auth);
  const authGuard = () => new AuthGuard(auth, router);
  const guestOnly = () => new GuestOnlyGuard(auth, router);

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
    .registerNotFound(NotFoundView);

  router.start();
}

void bootstrap();
