import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { I18nService } from '@core/i18n/I18nService';

describe('I18nService', () => {
  let warnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('loads translations from the configured base path', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ greeting: 'Здравей' }),
    } as unknown as Response) as typeof fetch;

    const i18n = new I18nService();
    await i18n.load('bg');
    expect(i18n.t('greeting')).toBe('Здравей');
    expect(i18n.getLocale()).toBe('bg');
  });

  it('falls back to keys when fetch fails', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
    } as unknown as Response) as typeof fetch;

    const i18n = new I18nService();
    await i18n.load('xx' as never);
    expect(i18n.t('any.key')).toBe('any.key');
    expect(warnSpy).toHaveBeenCalled();
  });

  it('returns the key itself when missing and warns', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ known: 'OK' }),
    } as unknown as Response) as typeof fetch;

    const i18n = new I18nService();
    await i18n.load('bg');
    expect(i18n.t('missing.key')).toBe('missing.key');
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('missing.key'));
  });

  it('interpolates {{name}} placeholders', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ welcome: 'Здравей, {{name}}! Имаш {{count}} съобщения.' }),
    } as unknown as Response) as typeof fetch;

    const i18n = new I18nService();
    await i18n.load('bg');
    expect(i18n.t('welcome', { name: 'Иван', count: 3 })).toBe(
      'Здравей, Иван! Имаш 3 съобщения.',
    );
  });

  it('replaces all occurrences of the same placeholder', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ echo: '{{x}} и пак {{x}}' }),
    } as unknown as Response) as typeof fetch;

    const i18n = new I18nService();
    await i18n.load('bg');
    expect(i18n.t('echo', { x: 'А' })).toBe('А и пак А');
  });

  it('defaults locale to bg before any load', () => {
    const i18n = new I18nService();
    expect(i18n.getLocale()).toBe('bg');
  });

  it('persists and reads locale via static helpers', () => {
    const store = new Map<string, string>();
    const stub = {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => {
        store.set(k, v);
      },
      removeItem: (k: string) => {
        store.delete(k);
      },
      clear: () => store.clear(),
      key: () => null,
      length: 0,
    } as unknown as Storage;
    vi.stubGlobal('localStorage', stub);

    expect(I18nService.readPersistedLocale()).toBe('bg');
    I18nService.persistLocale('en');
    expect(I18nService.readPersistedLocale()).toBe('en');
    I18nService.persistLocale('bg');
    expect(I18nService.readPersistedLocale()).toBe('bg');
  });
});
