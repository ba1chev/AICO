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

  await i18n.load('bg').catch((err) => {
    console.warn('[bootstrap] i18n не успя да зареди:', err);
  });

  const app = new App(host, bus);
  const outlet = app.render();

  const router = new Router(outlet, container, bus);
  container.registerInstance(TOKENS.Router, router);

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
    .registerNotFound(NotFoundView);

  router.start();
}

void bootstrap();
