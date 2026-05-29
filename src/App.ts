import type { EventBus } from '@core/view/EventBus';
import type { AuthService } from '@domains/auth/services/AuthService';
import { RoleLabelBG } from '@domains/auth/models/Role';

export class App {
  private readonly host: HTMLElement;
  private outlet!: HTMLElement;

  constructor(
    host: HTMLElement,
    private readonly bus: EventBus,
    private readonly auth: AuthService,
  ) {
    this.host = host;
  }

  render(): HTMLElement {
    this.host.innerHTML = this.template();
    this.outlet = this.host.querySelector<HTMLElement>('#main')!;
    this.bindNavHighlight();
    this.bindAuthArea();
    this.bus.on<{ path: string }>('router:navigated', ({ path }) => {
      this.highlightActive(path);
    });
    this.bus.on('auth:login', () => this.refreshAuthArea());
    this.bus.on('auth:logout', () => this.refreshAuthArea());
    this.bus.on('auth:registered', () => this.refreshAuthArea());
    this.bus.on('auth:restored', () => this.refreshAuthArea());
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
          <nav class="app-nav" aria-label="Главна навигация" id="app-nav">
            ${this.navLinksHTML()}
          </nav>
          <div class="app-user" id="app-user">
            ${this.authAreaHTML()}
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

  private navLinksHTML(): string {
    const user = this.auth.current();
    const links: Array<{ href: string; label: string; route: string }> = [
      { href: '#/', label: 'Начало', route: '/' },
      { href: '#/calculator', label: 'Калкулатор', route: '/calculator' },
    ];
    if (user.canAccess('history')) links.push({ href: '#/history', label: 'История', route: '/history' });
    if (user.canAccess('compare')) links.push({ href: '#/compare', label: 'Сравнение', route: '/compare' });
    if (user.canAccess('reports')) links.push({ href: '#/reports', label: 'Отчети', route: '/reports' });
    if (user.canAccess('dashboard')) links.push({ href: '#/dashboard', label: 'Табло', route: '/dashboard' });
    if (user.canAccess('admin')) links.push({ href: '#/admin', label: 'Админ', route: '/admin' });

    return links
      .map(
        (l) =>
          `<a class="app-nav__link" href="${l.href}" data-route="${l.route}">${l.label}</a>`,
      )
      .join('');
  }

  private authAreaHTML(): string {
    const user = this.auth.current();
    if (!user.isAuthenticated()) {
      return `
        <a class="btn btn--ghost" href="#/login">Вход</a>
        <a class="btn btn--primary" href="#/register">Регистрация</a>
      `;
    }
    return `
      <a class="app-user__badge" href="#/profile" title="${user.email}">${RoleLabelBG[user.role]}</a>
      <span class="muted" style="font-size: var(--fs-sm);">${user.displayName}</span>
      <button class="btn btn--ghost" id="app-logout" type="button">Изход</button>
    `;
  }

  private bindAuthArea(): void {
    this.attachLogoutHandler();
  }

  private refreshAuthArea(): void {
    const nav = this.host.querySelector<HTMLElement>('#app-nav');
    if (nav) nav.innerHTML = this.navLinksHTML();
    const userArea = this.host.querySelector<HTMLElement>('#app-user');
    if (userArea) userArea.innerHTML = this.authAreaHTML();
    this.attachLogoutHandler();
    this.bindNavHighlight();
  }

  private attachLogoutHandler(): void {
    const btn = this.host.querySelector<HTMLButtonElement>('#app-logout');
    if (!btn) return;
    btn.addEventListener('click', () => {
      this.auth.logout();
      window.location.hash = '#/';
    });
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
