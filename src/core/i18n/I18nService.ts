import type { Locale } from '@core/utils/numbers';

type TranslationMap = Record<string, string>;

const LOCALE_STORAGE_KEY = 'aico:locale';

export class I18nService {
  private translations: TranslationMap = {};
  private locale: Locale = 'bg';

  async load(locale: Locale, basePath = '/data/i18n'): Promise<void> {
    this.locale = locale;
    const url = `${basePath}/${locale}.json`;
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      this.translations = (await res.json()) as TranslationMap;
    } catch (err) {
      console.warn(`[I18n] Failed to load "${url}". Falling back to keys.`, err);
      this.translations = {};
    }
  }

  t(key: string, vars?: Record<string, string | number>): string {
    let value = this.translations[key];
    if (value === undefined) {
      console.warn(`[I18n] Missing key: "${key}"`);
      return key;
    }
    if (vars) {
      for (const [name, val] of Object.entries(vars)) {
        value = value.replace(new RegExp(`\\{\\{\\s*${name}\\s*\\}\\}`, 'g'), String(val));
      }
    }
    return value;
  }

  getLocale(): Locale {
    return this.locale;
  }

  static readPersistedLocale(): Locale {
    try {
      const v = localStorage.getItem(LOCALE_STORAGE_KEY);
      return v === 'en' ? 'en' : 'bg';
    } catch {
      return 'bg';
    }
  }

  static persistLocale(locale: Locale): void {
    try {
      localStorage.setItem(LOCALE_STORAGE_KEY, locale);
    } catch {
      // localStorage unavailable (private mode, quota) — silently no-op
    }
  }
}
