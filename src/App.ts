import type { EventBus } from '@core/view/EventBus';
import type { AuthService } from '@domains/auth/services/AuthService';
import { RoleLabelBG } from '@domains/auth/models/Role';
import { I18nService } from '@core/i18n/I18nService';
import type { Locale } from '@core/utils/numbers';

const AUTH_ROUTES = new Set(['/login', '/register']);

export class App {
  private readonly host: HTMLElement;
  private outlet!: HTMLElement;

  constructor(
    host: HTMLElement,
    private readonly bus: EventBus,
    private readonly auth: AuthService,
    private readonly i18n: I18nService,
  ) {
    this.host = host;
  }

  render(): HTMLElement {
    this.host.innerHTML = this.template();
    this.outlet = this.host.querySelector<HTMLElement>('#main')!;
    this.bindNavHighlight();
    this.bindAuthArea();
    this.bindSkipLink();
    this.bindBell();
    this.bindMenuToggle();
    this.bindHelpFab();
    this.applyAuthLayoutFor(this.currentPath());
    this.bus.on<{ path: string }>('router:navigated', ({ path }) => {
      this.highlightActive(path);
      this.applyAuthLayoutFor(path);
      this.updateTopbarTitle();
      this.announceRoute(path);
      this.closeSidebar();
    });
    this.bus.on<{ path: string }>('router:denied', ({ path }) => {
      this.announce(`Достъпът до ${path} е отказан.`);
    });
    this.bus.on('auth:login', () => this.refreshAuthArea());
    this.bus.on('auth:logout', () => this.refreshAuthArea());
    this.bus.on('auth:registered', () => this.refreshAuthArea());
    this.bus.on('auth:restored', () => this.refreshAuthArea());
    return this.outlet;
  }

  private currentPath(): string {
    return (window.location.hash || '#/').replace(/^#/, '') || '/';
  }

  private applyAuthLayoutFor(path: string): void {
    const isAuth = AUTH_ROUTES.has(path);
    this.host.classList.toggle('app--auth', isAuth);
  }

  private updateTopbarTitle(): void {
    const titleEl = this.host.querySelector<HTMLElement>('#topbar-title');
    if (!titleEl) return;
    const raw = document.title;
    const stripped = raw.replace(/\s—\sAICO$/, '');
    titleEl.textContent = stripped || 'AICO';
  }

  private bindSkipLink(): void {
    const link = this.host.querySelector<HTMLAnchorElement>('#app-skip');
    if (!link) return;
    link.addEventListener('click', (ev) => {
      ev.preventDefault();
      this.outlet.focus();
      this.outlet.scrollIntoView({ block: 'start' });
    });
  }

  private template(): string {
    return `
      <a class="sr-only sr-only--focusable" id="app-skip" href="#" data-skip-to="main">Към основното съдържание</a>
      <aside class="app-sidebar" role="navigation" aria-label="Главна навигация">
        <a class="app-sidebar__brand" href="#/" aria-label="AICO — начало">
          <span class="app-sidebar__brand-icon" aria-hidden="true">🌿</span>
          <span>AICO</span>
        </a>
        <nav class="app-sidebar__nav" id="app-nav">
          ${this.navLinksHTML()}
        </nav>
        <div class="app-sidebar__footer">
          <div class="app-locale" id="app-locale" role="group" aria-label="Език / Language">
            ${this.localeSwitcherHTML()}
          </div>
          <a class="app-nav__link" href="#/settings" data-route="/settings">
            <span class="app-nav__icon" aria-hidden="true">${SETTINGS_ICON}</span>
            <span>Настройки</span>
          </a>
        </div>
      </aside>

      <div class="app-shell">
        <header class="app-topbar" role="banner">
          <div style="display:flex; align-items:center; gap: var(--space-3); min-width: 0;">
            <button class="app-topbar__menu" id="app-menu-toggle" type="button" aria-label="Меню">☰</button>
            <div style="min-width: 0;">
              <div class="app-topbar__title" id="topbar-title">AICO</div>
              <div class="app-topbar__subtitle">Система за оценка на екологичния отпечатък</div>
            </div>
          </div>
          <div class="app-topbar__right">
            <div style="position: relative;">
              <button class="app-bell" id="app-bell" type="button" aria-label="Известия" aria-haspopup="true" aria-expanded="false">
                ${BELL_ICON}
                <span class="app-bell__dot" aria-hidden="true"></span>
              </button>
              <div class="notifications-popover" id="app-notifications" hidden role="menu" aria-label="Известия">
                <div class="notifications-popover__header">
                  <span class="notifications-popover__title">Известия</span>
                  <span class="notifications-popover__count">2 нови</span>
                </div>
                <div class="notification">
                  <span class="notification__icon" style="color: var(--color-co2e);">●</span>
                  <div>
                    <div class="notification__title">Нов отчет е генериран</div>
                    <div class="notification__time">Преди 10 мин.</div>
                  </div>
                </div>
                <div class="notification">
                  <span class="notification__icon" style="color: var(--color-warning-500);">●</span>
                  <div>
                    <div class="notification__title">Висок отпечатък при GPU A100</div>
                    <div class="notification__time">Преди 2 часа</div>
                  </div>
                </div>
                <div class="notification">
                  <span class="notification__icon" style="color: var(--color-water);">●</span>
                  <div>
                    <div class="notification__title">Системно обновление</div>
                    <div class="notification__time">Вчера</div>
                  </div>
                </div>
                <div class="notifications-popover__footer">
                  <button class="notifications-popover__mark" type="button" id="notifications-mark">Маркирай всички като прочетени</button>
                </div>
              </div>
            </div>
            <span class="app-topbar__divider" aria-hidden="true"></span>
            <div class="app-user" id="app-user">
              ${this.authAreaHTML()}
            </div>
          </div>
        </header>

        <main id="main" class="app-main" role="main" tabindex="-1"></main>

        <div id="app-announcer" class="sr-only" role="status" aria-live="polite" aria-atomic="true"></div>

        <footer class="app-footer" role="contentinfo">
          <p class="app-footer__disclaimer">
            Всички стойности са оценки, базирани на публични коефициенти за въглеродна интензивност и енергийна ефективност (PUE, WUE).
          </p>
          <p>© 2026 AICO · ФМИ, СУ „Св. Климент Охридски“</p>
        </footer>
      </div>

      <button class="help-fab" id="app-help" type="button" aria-label="Помощ">?</button>
    `;
  }

  private navLinksHTML(): string {
    const user = this.auth.current();
    const links: Array<{ href: string; label: string; route: string; icon: string }> = [
      { href: '#/dashboard', label: 'Табло', route: '/dashboard', icon: DASHBOARD_ICON },
      { href: '#/calculator', label: 'Калкулатор', route: '/calculator', icon: CALCULATOR_ICON },
      { href: '#/compare', label: 'Сравнение', route: '/compare', icon: COMPARE_ICON },
      { href: '#/history', label: 'История и Отчети', route: '/history', icon: HISTORY_ICON },
    ];
    const visible = links.filter((l) => {
      if (l.route === '/dashboard') return user.canAccess('dashboard');
      if (l.route === '/compare') return user.canAccess('compare');
      if (l.route === '/history') return user.canAccess('history');
      return true;
    });
    if (user.canAccess('reports')) {
      // Reports lives under /reports but in nav we treat /history as combined entry
    }
    if (user.canAccess('admin')) {
      visible.push({ href: '#/admin', label: 'Админ', route: '/admin', icon: ADMIN_ICON });
    }

    return visible
      .map(
        (l) =>
          `<a class="app-nav__link" href="${l.href}" data-route="${l.route}"><span class="app-nav__icon" aria-hidden="true">${l.icon}</span><span>${l.label}</span></a>`,
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
      <span class="app-user__avatar" aria-hidden="true">👤</span>
      <a class="app-user__badge" href="#/profile" title="${user.email}">${RoleLabelBG[user.role]}</a>
      <span style="font-size: var(--fs-sm);">${user.displayName}</span>
      <button class="btn btn--ghost btn--sm" id="app-logout" type="button">Изход</button>
    `;
  }

  private bindAuthArea(): void {
    this.attachLogoutHandler();
    this.attachLocaleHandler();
  }

  private refreshAuthArea(): void {
    const nav = this.host.querySelector<HTMLElement>('#app-nav');
    if (nav) nav.innerHTML = this.navLinksHTML();
    const userArea = this.host.querySelector<HTMLElement>('#app-user');
    if (userArea) userArea.innerHTML = this.authAreaHTML();
    this.attachLogoutHandler();
    this.bindNavHighlight();
  }

  private localeSwitcherHTML(): string {
    const current = this.i18n.getLocale();
    const btn = (l: Locale, label: string): string => {
      const active = l === current;
      return `<button type="button" class="app-locale__btn${active ? ' app-locale__btn--active' : ''}" data-locale="${l}" aria-pressed="${active}">${label}</button>`;
    };
    return `${btn('bg', 'BG')}${btn('en', 'EN')}`;
  }

  private attachLocaleHandler(): void {
    const root = this.host.querySelector<HTMLElement>('#app-locale');
    if (!root) return;
    root.addEventListener('click', (ev) => {
      const target = ev.target;
      if (!(target instanceof HTMLElement)) return;
      const btn = target.closest<HTMLButtonElement>('button[data-locale]');
      if (!btn) return;
      const next = btn.dataset['locale'] as Locale | undefined;
      if (!next || next === this.i18n.getLocale()) return;
      void this.switchLocale(next);
    });
  }

  private async switchLocale(locale: Locale): Promise<void> {
    await this.i18n.load(locale);
    I18nService.persistLocale(locale);
    const root = this.host.querySelector<HTMLElement>('#app-locale');
    if (root) root.innerHTML = this.localeSwitcherHTML();
    this.bus.emit('i18n:changed', { locale });
  }

  private attachLogoutHandler(): void {
    const btn = this.host.querySelector<HTMLButtonElement>('#app-logout');
    if (!btn) return;
    btn.addEventListener('click', () => {
      this.auth.logout();
      window.location.hash = '#/';
    });
  }

  private bindBell(): void {
    const btn = this.host.querySelector<HTMLButtonElement>('#app-bell');
    const popover = this.host.querySelector<HTMLElement>('#app-notifications');
    const mark = this.host.querySelector<HTMLButtonElement>('#notifications-mark');
    const dot = this.host.querySelector<HTMLElement>('.app-bell__dot');
    if (!btn || !popover) return;
    btn.addEventListener('click', (ev) => {
      ev.stopPropagation();
      const open = !popover.hasAttribute('hidden');
      if (open) {
        popover.setAttribute('hidden', '');
        btn.setAttribute('aria-expanded', 'false');
      } else {
        popover.removeAttribute('hidden');
        btn.setAttribute('aria-expanded', 'true');
      }
    });
    document.addEventListener('click', (ev) => {
      if (!popover.contains(ev.target as Node) && ev.target !== btn) {
        popover.setAttribute('hidden', '');
        btn.setAttribute('aria-expanded', 'false');
      }
    });
    mark?.addEventListener('click', () => {
      dot?.remove();
      popover.setAttribute('hidden', '');
      btn.setAttribute('aria-expanded', 'false');
      this.announce('Известията са маркирани като прочетени.');
    });
  }

  private bindMenuToggle(): void {
    const btn = this.host.querySelector<HTMLButtonElement>('#app-menu-toggle');
    btn?.addEventListener('click', () => {
      this.host.classList.toggle('app--sidebar-open');
    });
  }

  private closeSidebar(): void {
    this.host.classList.remove('app--sidebar-open');
  }

  private bindHelpFab(): void {
    const btn = this.host.querySelector<HTMLButtonElement>('#app-help');
    btn?.addEventListener('click', () => {
      window.alert(
        'AICO е калкулатор за екологичен отпечатък на AI задачи.\n\nВъведете параметрите в "Калкулатор" и натиснете "Изчисли", за да получите оценка за енергията, въглеродните емисии и водния отпечатък.',
      );
    });
  }

  private bindNavHighlight(): void {
    this.highlightActive(this.currentPath());
  }

  private announceRoute(path: string): void {
    const title = document.title || path;
    this.announce(`Зареден изглед: ${title}`);
  }

  private announce(message: string): void {
    const region = this.host.querySelector<HTMLElement>('#app-announcer');
    if (!region) return;
    region.textContent = '';
    window.setTimeout(() => {
      region.textContent = message;
    }, 50);
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

const DASHBOARD_ICON = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>`;
const CALCULATOR_ICON = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="2" width="16" height="20" rx="2"/><line x1="8" y1="6" x2="16" y2="6"/><line x1="8" y1="10" x2="8" y2="10"/><line x1="12" y1="10" x2="12" y2="10"/><line x1="16" y1="10" x2="16" y2="10"/><line x1="8" y1="14" x2="8" y2="14"/><line x1="12" y1="14" x2="12" y2="14"/><line x1="16" y1="14" x2="16" y2="14"/><line x1="8" y1="18" x2="12" y2="18"/></svg>`;
const COMPARE_ICON = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="6" r="3"/><path d="M9 6h6"/><path d="M9 18h6"/><path d="M18 9v9"/></svg>`;
const HISTORY_ICON = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 9-9"/><polyline points="3 4 3 9 8 9"/><polyline points="12 7 12 12 15 14"/></svg>`;
const ADMIN_ICON = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 1l8 4v7c0 5-3.5 9-8 11-4.5-2-8-6-8-11V5z"/></svg>`;
const SETTINGS_ICON = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>`;
const BELL_ICON = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>`;
