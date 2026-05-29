type TranslationMap = Record<string, string>;

export class I18nService {
  private translations: TranslationMap = {};
  private locale = 'bg';

  async load(locale: string, basePath = '/data/i18n'): Promise<void> {
    this.locale = locale;
    const url = `${basePath}/${locale}.json`;
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      this.translations = (await res.json()) as TranslationMap;
    } catch (err) {
      console.warn(`[I18n] Не успяхме да заредим "${url}". Ще се ползват ключове като fallback.`, err);
      this.translations = {};
    }
  }

  t(key: string, vars?: Record<string, string | number>): string {
    let value = this.translations[key];
    if (value === undefined) {
      console.warn(`[I18n] Липсващ ключ: "${key}"`);
      return key;
    }
    if (vars) {
      for (const [name, val] of Object.entries(vars)) {
        value = value.replace(new RegExp(`\\{\\{\\s*${name}\\s*\\}\\}`, 'g'), String(val));
      }
    }
    return value;
  }

  getLocale(): string {
    return this.locale;
  }
}
