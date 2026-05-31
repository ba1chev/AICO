import { View } from '@core/view/View';
import { TOKENS } from '../../../tokens';
import { ValidationError } from '@core/errors/ValidationError';
import { DomainError } from '@core/errors/DomainError';
import { Researcher } from '@domains/auth/models/Researcher';
import { Organization } from '@domains/auth/models/Organization';
import type { Hardware } from '@domains/calculator/models/Hardware';
import type { Region } from '@domains/calculator/models/Region';
import type { Theme, MetricSystem, NotificationPrefs } from '../services/UserPreferencesService';

type Tab = 'profile' | 'preferences' | 'defaults' | 'notifications' | 'security';

const TABS: Array<{ id: Tab; label: string; icon: string }> = [
  {
    id: 'profile',
    label: 'Профил',
    icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`,
  },
  {
    id: 'preferences',
    label: 'Предпочитания',
    icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>`,
  },
  {
    id: 'defaults',
    label: 'По подразбиране (Хардуер)',
    icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="6" width="20" height="12" rx="2"/><line x1="6" y1="10" x2="6" y2="14"/><line x1="10" y1="10" x2="10" y2="14"/><line x1="14" y1="10" x2="14" y2="14"/><line x1="18" y1="10" x2="18" y2="14"/></svg>`,
  },
  {
    id: 'notifications',
    label: 'Известия',
    icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>`,
  },
  {
    id: 'security',
    label: 'Сигурност',
    icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 1l8 4v7c0 5-3.5 9-8 11-4.5-2-8-6-8-11V5z"/></svg>`,
  },
];

export class SettingsView extends View {
  private tab: Tab = 'profile';
  private hardware: Hardware[] = [];
  private regions: Region[] = [];
  private flash: { kind: 'info' | 'error'; text: string } | null = null;

  protected override async onBeforeRender(): Promise<void> {
    const hwService = this.container.resolve(TOKENS.HardwareProfile);
    const rgCatalog = this.container.resolve(TOKENS.RegionCatalog);
    const [hardware, regions] = await Promise.all([hwService.merged(), rgCatalog.all()]);
    this.hardware = hardware;
    this.regions = regions;
  }

  protected override render(): string {
    const auth = this.container.resolve(TOKENS.Auth);
    const user = auth.current();
    if (!user.isAuthenticated()) {
      return `
        <header class="page-heading">
          <div class="page-heading__main">
            <h1 class="page-heading__title">Настройки</h1>
            <p class="page-heading__subtitle">Влезте, за да управлявате настройките си.</p>
          </div>
        </header>
        <section class="card center"><a class="btn btn--primary" href="#/login">Към вход</a></section>
      `;
    }

    return `
      <header class="page-heading">
        <div class="page-heading__main">
          <h1 class="page-heading__title">Настройки</h1>
          <p class="page-heading__subtitle">Управлявайте вашия профил и предпочитания за системата.</p>
        </div>
      </header>

      <div class="settings-grid">
        <nav class="settings-tabs" role="tablist" aria-label="Раздели на настройките">
          ${TABS.map(
            (t) => `
            <button
              type="button"
              role="tab"
              class="settings-tab${this.tab === t.id ? ' settings-tab--active' : ''}"
              data-tab="${t.id}"
              aria-selected="${this.tab === t.id}">
              <span class="settings-tab__icon" aria-hidden="true">${t.icon}</span>
              <span>${t.label}</span>
            </button>`,
          ).join('')}
        </nav>

        <section class="card settings-panel" role="tabpanel">
          ${this.panelHTML()}
          ${this.flash ? `<div class="settings-flash settings-flash--${this.flash.kind}">${escapeHTML(this.flash.text)}</div>` : ''}
        </section>
      </div>

      <style>
        .settings-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: var(--space-4);
        }
        @media (min-width: 900px) {
          .settings-grid { grid-template-columns: 240px 1fr; }
        }
        .settings-tabs {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .settings-tab {
          display: flex;
          align-items: center;
          gap: var(--space-2);
          padding: var(--space-3);
          background: transparent;
          border: 0;
          border-radius: var(--radius-md);
          cursor: pointer;
          font-size: var(--fs-sm);
          color: var(--color-text-muted);
          text-align: left;
          transition: background-color var(--transition-fast), color var(--transition-fast);
        }
        .settings-tab:hover { background-color: var(--color-sidebar-hover); color: var(--color-text); }
        .settings-tab--active {
          background-color: var(--color-sidebar-active);
          color: var(--color-sidebar-active-fg);
          font-weight: var(--fw-semibold);
        }
        .settings-tab__icon { display: inline-flex; }
        .settings-panel { padding: var(--space-6); }
        .settings-panel h2 { margin-top: 0; }
        .settings-flash {
          margin-top: var(--space-4);
          padding: var(--space-3);
          border-radius: var(--radius-md);
          font-size: var(--fs-sm);
        }
        .settings-flash--info { background: var(--color-co2-soft); color: var(--color-primary-700); }
        .settings-flash--error { background: #fff4f4; color: var(--color-danger-500); }
        .pref-card-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: var(--space-3);
        }
        .pref-card {
          display: flex;
          align-items: center;
          gap: var(--space-3);
          padding: var(--space-3);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-md);
          cursor: pointer;
          transition: border-color var(--transition-fast), background-color var(--transition-fast);
        }
        .pref-card:has(input:checked) {
          border-color: var(--color-co2e);
          background: var(--color-co2-soft);
        }
        .pref-card input { accent-color: var(--color-co2e); }
        .notif-row {
          display: flex;
          align-items: flex-start;
          gap: var(--space-3);
          padding: var(--space-3);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-md);
        }
        .notif-row + .notif-row { margin-top: var(--space-2); }
        .notif-row input { margin-top: 4px; accent-color: var(--color-co2e); }
        .notif-row__title { font-weight: var(--fw-semibold); }
        .notif-row__detail { font-size: var(--fs-sm); color: var(--color-text-muted); }
        .password-card {
          padding: var(--space-3);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-md);
        }
        .password-card__head {
          display: flex;
          align-items: center;
          gap: var(--space-2);
          font-weight: var(--fw-semibold);
          margin-bottom: var(--space-3);
        }
        .danger-link {
          color: var(--color-danger-500);
          background: transparent;
          border: 0;
          cursor: pointer;
          padding: var(--space-2) 0;
          font-weight: var(--fw-semibold);
          font-size: var(--fs-sm);
        }
        .twofa-card {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: var(--space-3);
          padding: var(--space-3);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-md);
        }
      </style>
    `;
  }

  private panelHTML(): string {
    switch (this.tab) {
      case 'profile':
        return this.profilePanel();
      case 'preferences':
        return this.preferencesPanel();
      case 'defaults':
        return this.defaultsPanel();
      case 'notifications':
        return this.notificationsPanel();
      case 'security':
        return this.securityPanel();
    }
  }

  private profilePanel(): string {
    const user = this.container.resolve(TOKENS.Auth).current();
    const orgValue = user instanceof Organization ? user.organizationName : '';
    const affValue = user instanceof Researcher ? (user.affiliation ?? '') : '';
    const showAff = user instanceof Researcher;
    const showOrg = user instanceof Organization;
    return `
      <h2>Информация за профила</h2>
      <form id="profile-form" novalidate>
        <div class="grid-2">
          <div class="field">
            <label class="field__label" for="p-name">Име</label>
            <input class="field__input" id="p-name" name="displayName" type="text" value="${escapeAttr(user.displayName)}" required minlength="2" />
          </div>
          <div class="field">
            <label class="field__label" for="p-email">Имейл</label>
            <input class="field__input" id="p-email" type="email" value="${escapeAttr(user.email)}" disabled />
            <span class="field__hint">Имейлът не може да се променя.</span>
          </div>
        </div>
        ${
          showOrg
            ? `<div class="field">
                <label class="field__label" for="p-org">Организация</label>
                <input class="field__input" id="p-org" name="organizationName" type="text" value="${escapeAttr(orgValue)}" />
              </div>`
            : ''
        }
        ${
          showAff
            ? `<div class="field">
                <label class="field__label" for="p-aff">Афилиация</label>
                <input class="field__input" id="p-aff" name="affiliation" type="text" value="${escapeAttr(affValue)}" />
              </div>`
            : ''
        }
        <div id="profile-errors" class="field__error" role="alert" aria-live="polite"></div>
        <div style="display:flex; justify-content: flex-end; margin-top: var(--space-4);">
          <button type="submit" class="btn btn--primary">💾 Запази промените</button>
        </div>
      </form>
    `;
  }

  private preferencesPanel(): string {
    const prefs = this.container.resolve(TOKENS.Preferences).get();
    const themeCard = (value: Theme, label: string, icon: string): string => `
      <label class="pref-card">
        <input type="radio" name="theme" value="${value}" ${prefs.theme === value ? 'checked' : ''} />
        <span aria-hidden="true">${icon}</span>
        <span>${label}</span>
      </label>
    `;
    return `
      <h2>Системни предпочитания</h2>
      <form id="prefs-form" novalidate>
        <div class="field">
          <span class="field__label">Тема на приложението</span>
          <div class="pref-card-grid">
            ${themeCard('light', 'Светла', '☀️')}
            ${themeCard('dark', 'Тъмна', '🌙')}
          </div>
        </div>
        <div class="field">
          <label class="field__label" for="pf-metric">Метрична система</label>
          <select class="field__select" id="pf-metric" name="metric">
            <option value="metric" ${prefs.metric === 'metric' ? 'selected' : ''}>Международна (kWh, kg CO₂)</option>
            <option value="imperial" ${prefs.metric === 'imperial' ? 'selected' : ''}>Имперска (kWh, lb CO₂)</option>
          </select>
        </div>
        <div style="display:flex; justify-content: flex-end; margin-top: var(--space-4);">
          <button type="submit" class="btn btn--primary">💾 Запази</button>
        </div>
      </form>
    `;
  }

  private defaultsPanel(): string {
    const prefs = this.container.resolve(TOKENS.Preferences).get();
    const hwOptions = this.hardware
      .map(
        (h) =>
          `<option value="${h.id}" ${prefs.defaults.hardwareId === h.id ? 'selected' : ''}>${escapeHTML(h.displayName)} (${h.powerWatts}W)</option>`,
      )
      .join('');
    const rgOptions = this.regions
      .map(
        (r) =>
          `<option value="${r.id}" ${prefs.defaults.regionId === r.id ? 'selected' : ''}>${escapeHTML(r.name)}</option>`,
      )
      .join('');
    return `
      <h2>Хардуер по подразбиране</h2>
      <p class="muted">Тези стойности ще се зареждат автоматично при отваряне на калкулатора.</p>
      <form id="defaults-form" novalidate>
        <div class="field">
          <label class="field__label" for="d-hw">Предпочитан тип хардуер</label>
          <select class="field__select" id="d-hw" name="hardwareId">
            <option value="">— Без избор —</option>
            ${hwOptions}
          </select>
        </div>
        <div class="field">
          <label class="field__label" for="d-pue">Енергийна ефективност (PUE)</label>
          <input class="field__input" id="d-pue" name="pue" type="number"
            min="1" max="3" step="0.05" value="${prefs.defaults.pue}" />
          <span class="field__hint">Среден PUE за съвременни дейта центрове е около 1.2 до 1.5.</span>
        </div>
        <div class="field">
          <label class="field__label" for="d-region">Регион на потребление</label>
          <select class="field__select" id="d-region" name="regionId">
            <option value="">— Без избор —</option>
            ${rgOptions}
          </select>
        </div>
        <div style="display:flex; justify-content: flex-end; margin-top: var(--space-4);">
          <button type="submit" class="btn btn--primary">💾 Запази</button>
        </div>
      </form>
    `;
  }

  private notificationsPanel(): string {
    const n = this.container.resolve(TOKENS.Preferences).get().notifications;
    const row = (id: keyof NotificationPrefs, title: string, detail: string): string => `
      <label class="notif-row">
        <input type="checkbox" name="${id}" ${n[id] ? 'checked' : ''} />
        <div>
          <div class="notif-row__title">${title}</div>
          <div class="notif-row__detail">${detail}</div>
        </div>
      </label>
    `;
    return `
      <h2>Настройки на известията</h2>
      <form id="notif-form" novalidate>
        ${row('reportReady', 'Генерирани отчети', 'Получавайте известия, когато нов отчет е готов за изтегляне.')}
        ${row('highFootprint', 'Предупреждения за висок отпечатък', 'Уведомяване при надвишаване на зададените лимити за CO₂ емисии.')}
        ${row('systemUpdates', 'Системни обновления', 'Информационни съобщения за нови функции в AICO.')}
        ${row('weeklyDigest', 'Имейл резюме', 'Седмичен отчет на вашата активност, изпратен по имейл.')}
        <div style="display:flex; justify-content: flex-end; margin-top: var(--space-4);">
          <button type="submit" class="btn btn--primary">💾 Запази</button>
        </div>
      </form>
    `;
  }

  private securityPanel(): string {
    return `
      <h2>Сигурност на акаунта</h2>
      <form id="password-form" novalidate>
        <div class="password-card">
          <div class="password-card__head">
            <span aria-hidden="true">🛡️</span>
            <span>Смяна на парола</span>
          </div>
          <div class="field">
            <input class="field__input" id="pw-current" name="current" type="password"
              placeholder="Текуща парола" autocomplete="current-password" required minlength="8" />
          </div>
          <div class="field">
            <input class="field__input" id="pw-new" name="next" type="password"
              placeholder="Нова парола" autocomplete="new-password" required minlength="8" />
          </div>
          <div class="field">
            <input class="field__input" id="pw-confirm" name="confirm" type="password"
              placeholder="Повторете новата парола" autocomplete="new-password" required minlength="8" />
          </div>
          <div id="pw-errors" class="field__error" role="alert" aria-live="polite"></div>
        </div>

        <div class="twofa-card" style="margin-top: var(--space-3);">
          <div>
            <div style="font-weight: var(--fw-semibold);">Двуфакторна автентикация (2FA)</div>
            <div class="muted" style="font-size: var(--fs-sm);">Добавете допълнително ниво на сигурност към акаунта си.</div>
          </div>
          <button type="button" class="btn btn--secondary btn--sm" id="btn-2fa" disabled>Активиране</button>
        </div>

        <div style="margin-top: var(--space-4);">
          <button type="button" class="danger-link" id="btn-delete-account">Изтриване на акаунта</button>
        </div>

        <div style="display:flex; justify-content: flex-end; margin-top: var(--space-4);">
          <button type="submit" class="btn btn--primary">💾 Обнови</button>
        </div>
      </form>
    `;
  }

  protected override onAfterRender(): void {
    for (const btn of this.$$<HTMLButtonElement>('.settings-tab')) {
      btn.addEventListener('click', () => {
        const id = btn.dataset['tab'] as Tab;
        this.tab = id;
        this.flash = null;
        this.rerender();
      });
    }

    const profileForm = this.root.querySelector<HTMLFormElement>('#profile-form');
    profileForm?.addEventListener('submit', (e) => {
      e.preventDefault();
      void this.handleProfileSubmit();
    });

    const prefsForm = this.root.querySelector<HTMLFormElement>('#prefs-form');
    prefsForm?.addEventListener('submit', (e) => {
      e.preventDefault();
      this.handlePrefsSubmit();
    });

    const defaultsForm = this.root.querySelector<HTMLFormElement>('#defaults-form');
    defaultsForm?.addEventListener('submit', (e) => {
      e.preventDefault();
      this.handleDefaultsSubmit();
    });

    const notifForm = this.root.querySelector<HTMLFormElement>('#notif-form');
    notifForm?.addEventListener('submit', (e) => {
      e.preventDefault();
      this.handleNotifSubmit();
    });

    const pwForm = this.root.querySelector<HTMLFormElement>('#password-form');
    pwForm?.addEventListener('submit', (e) => {
      e.preventDefault();
      void this.handlePasswordSubmit();
    });

    const delBtn = this.root.querySelector<HTMLButtonElement>('#btn-delete-account');
    delBtn?.addEventListener('click', () => this.handleDeleteAccount());
  }

  private async handleProfileSubmit(): Promise<void> {
    const form = this.$<HTMLFormElement>('#profile-form');
    const data = new FormData(form);
    const errBox = this.$('#profile-errors');
    errBox.textContent = '';
    try {
      const auth = this.container.resolve(TOKENS.Auth);
      const input: { displayName?: string; organizationName?: string; affiliation?: string } = {
        displayName: String(data.get('displayName') ?? ''),
      };
      const org = data.get('organizationName');
      if (org !== null) input.organizationName = String(org);
      const aff = data.get('affiliation');
      if (aff !== null) input.affiliation = String(aff);
      await auth.updateProfile(input);
      this.flash = { kind: 'info', text: 'Профилът е обновен.' };
      this.rerender();
    } catch (e) {
      if (e instanceof ValidationError) {
        errBox.innerHTML = e.errors.map((err) => `<div>• ${err.message}</div>`).join('');
      } else if (e instanceof DomainError) {
        errBox.textContent = e.userMessage;
      } else {
        errBox.textContent = (e as Error).message;
      }
    }
  }

  private handlePrefsSubmit(): void {
    const form = this.$<HTMLFormElement>('#prefs-form');
    const data = new FormData(form);
    const theme = String(data.get('theme') ?? 'light') as Theme;
    const metric = String(data.get('metric') ?? 'metric') as MetricSystem;
    this.container.resolve(TOKENS.Preferences).update({ theme, metric });
    this.flash = { kind: 'info', text: 'Предпочитанията са запазени.' };
    this.rerender();
  }

  private handleDefaultsSubmit(): void {
    const form = this.$<HTMLFormElement>('#defaults-form');
    const data = new FormData(form);
    const hardwareId = String(data.get('hardwareId') ?? '');
    const regionId = String(data.get('regionId') ?? '');
    const pue = Number(data.get('pue') ?? 1.2);
    this.container.resolve(TOKENS.Preferences).update({
      defaults: {
        hardwareId: hardwareId || null,
        regionId: regionId || null,
        pue: Number.isFinite(pue) ? pue : 1.2,
      },
    });
    this.flash = { kind: 'info', text: 'Стойностите по подразбиране са запазени.' };
    this.rerender();
  }

  private handleNotifSubmit(): void {
    const form = this.$<HTMLFormElement>('#notif-form');
    const data = new FormData(form);
    this.container.resolve(TOKENS.Preferences).update({
      notifications: {
        reportReady: data.get('reportReady') === 'on',
        highFootprint: data.get('highFootprint') === 'on',
        systemUpdates: data.get('systemUpdates') === 'on',
        weeklyDigest: data.get('weeklyDigest') === 'on',
      },
    });
    this.flash = { kind: 'info', text: 'Настройките за известия са запазени.' };
    this.rerender();
  }

  private async handlePasswordSubmit(): Promise<void> {
    const form = this.$<HTMLFormElement>('#password-form');
    const data = new FormData(form);
    const errBox = this.$('#pw-errors');
    errBox.textContent = '';
    try {
      await this.container.resolve(TOKENS.Auth).changePassword(
        String(data.get('current') ?? ''),
        String(data.get('next') ?? ''),
        String(data.get('confirm') ?? ''),
      );
      this.flash = { kind: 'info', text: 'Паролата е сменена.' };
      this.rerender();
    } catch (e) {
      if (e instanceof ValidationError) {
        errBox.innerHTML = e.errors.map((err) => `<div>• ${err.message}</div>`).join('');
      } else if (e instanceof DomainError) {
        errBox.textContent = e.userMessage;
      } else {
        errBox.textContent = (e as Error).message;
      }
    }
  }

  private handleDeleteAccount(): void {
    if (!window.confirm('Сигурни ли сте? Акаунтът и всички свързани изчисления ще бъдат изтрити.')) {
      return;
    }
    this.container.resolve(TOKENS.Auth).deleteAccount();
    this.container.resolve(TOKENS.Router).navigate('/');
  }

  private rerender(): void {
    for (const dispose of this.disposers) dispose();
    this.disposers.length = 0;
    this.root.innerHTML = this.render();
    this.onAfterRender();
  }
}

function escapeHTML(s: string): string {
  return s.replace(/[&<>"']/g, (c) =>
    c === '&' ? '&amp;' : c === '<' ? '&lt;' : c === '>' ? '&gt;' : c === '"' ? '&quot;' : '&#39;',
  );
}

function escapeAttr(s: string): string {
  return escapeHTML(s);
}

export default SettingsView;
