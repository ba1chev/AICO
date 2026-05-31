import type { IStorage } from '@core/storage';
import type { EventBus } from '@core/view/EventBus';

export type Theme = 'light' | 'dark';
export type MetricSystem = 'metric' | 'imperial';

export interface NotificationPrefs {
  reportReady: boolean;
  highFootprint: boolean;
  systemUpdates: boolean;
  weeklyDigest: boolean;
}

export interface DefaultsPrefs {
  hardwareId: string | null;
  pue: number;
  regionId: string | null;
}

export interface UserPreferences {
  theme: Theme;
  metric: MetricSystem;
  defaults: DefaultsPrefs;
  notifications: NotificationPrefs;
}

const STORAGE_KEY = 'preferences';

const DEFAULTS: UserPreferences = {
  theme: 'light',
  metric: 'metric',
  defaults: { hardwareId: null, pue: 1.2, regionId: null },
  notifications: {
    reportReady: true,
    highFootprint: true,
    systemUpdates: false,
    weeklyDigest: false,
  },
};

export class UserPreferencesService {
  private current: UserPreferences;

  constructor(
    private readonly storage: IStorage,
    private readonly bus: EventBus,
  ) {
    this.current = this.load();
    this.applyTheme(this.current.theme);
  }

  get(): UserPreferences {
    return this.current;
  }

  update(patch: Partial<UserPreferences>): UserPreferences {
    const next: UserPreferences = {
      ...this.current,
      ...patch,
      defaults: { ...this.current.defaults, ...(patch.defaults ?? {}) },
      notifications: { ...this.current.notifications, ...(patch.notifications ?? {}) },
    };
    this.current = next;
    this.storage.set(STORAGE_KEY, next);
    this.applyTheme(next.theme);
    this.bus.emit('prefs:changed', { prefs: next });
    return next;
  }

  reset(): void {
    this.current = { ...DEFAULTS };
    this.storage.remove(STORAGE_KEY);
    this.applyTheme(this.current.theme);
    this.bus.emit('prefs:changed', { prefs: this.current });
  }

  private load(): UserPreferences {
    const raw = this.storage.get<Partial<UserPreferences>>(STORAGE_KEY);
    if (!raw) return { ...DEFAULTS };
    return {
      theme: raw.theme === 'dark' ? 'dark' : 'light',
      metric: raw.metric === 'imperial' ? 'imperial' : 'metric',
      defaults: { ...DEFAULTS.defaults, ...(raw.defaults ?? {}) },
      notifications: { ...DEFAULTS.notifications, ...(raw.notifications ?? {}) },
    };
  }

  private applyTheme(theme: Theme): void {
    if (typeof document === 'undefined') return;
    if (theme === 'dark') document.documentElement.setAttribute('data-theme', 'dark');
    else document.documentElement.removeAttribute('data-theme');
  }
}
