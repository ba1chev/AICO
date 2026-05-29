import type { EventBus } from '@core/view/EventBus';

export class App {
  private readonly host: HTMLElement;
  private outlet!: HTMLElement;

  constructor(host: HTMLElement, private readonly bus: EventBus) {
    this.host = host;
  }

  render(): HTMLElement {
    this.host.innerHTML = this.template();
    this.outlet = this.host.querySelector<HTMLElement>('#main')!;
    this.bindNavHighlight();
    this.bus.on<{ path: string }>('router:navigated', ({ path }) => {
      this.highlightActive(path);
    });
    return this.outlet;
  }

  private template(): string {
    return `
      <header class="app-header" role="banner">
        <div class="app-header__inner">
          <a class="app-logo" href="#/" aria-label="AICO — начало">
            <span class="app-logo__icon" aria-hidden="true">🌿</span>
            <span>AICO</span>
          </a>
          <nav class="app-nav" aria-label="Главна навигация">
            <a class="app-nav__link" href="#/" data-route="/">Начало</a>
            <a class="app-nav__link" href="#/calculator" data-route="/calculator">Калкулатор</a>
            <a class="app-nav__link" href="#/history" data-route="/history">История</a>
            <a class="app-nav__link" href="#/compare" data-route="/compare">Сравнение</a>
            <a class="app-nav__link" href="#/reports" data-route="/reports">Отчети</a>
            <a class="app-nav__link" href="#/dashboard" data-route="/dashboard">Табло</a>
          </nav>
          <div class="app-user">
            <a class="btn btn--ghost" href="#/login">Вход</a>
            <a class="btn btn--primary" href="#/register">Регистрация</a>
          </div>
        </div>
      </header>

      <main id="main" class="app-main" role="main" tabindex="-1"></main>

      <footer class="app-footer" role="contentinfo">
        <p class="app-footer__disclaimer">
          Всички стойности са оценки, базирани на публични коефициенти за
          въглеродна интензивност и енергийна ефективност (PUE, WUE).
          Реалното потребление може да се различава.
        </p>
        <p>© 2026 AICO · ФМИ, СУ „Св. Климент Охридски“</p>
      </footer>
    `;
  }

  private bindNavHighlight(): void {
    const initial = (window.location.hash || '#/').replace(/^#/, '');
    this.highlightActive(initial);
  }

  private highlightActive(path: string): void {
    const links = this.host.querySelectorAll<HTMLAnchorElement>('.app-nav__link');
    for (const link of links) {
      const route = link.dataset['route'] ?? '';
      const isActive = route === '/' ? path === '/' || path === '' : path.startsWith(route);
      link.classList.toggle('app-nav__link--active', isActive);
      if (isActive) link.setAttribute('aria-current', 'page');
      else link.removeAttribute('aria-current');
    }
  }
}
