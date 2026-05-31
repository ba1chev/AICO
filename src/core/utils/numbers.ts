export type Locale = 'bg' | 'en';

const LOCALE_TAG: Record<Locale, string> = {
  bg: 'bg-BG',
  en: 'en-US',
};

const ENERGY_LABELS: Record<Locale, { wh: string; kwh: string; mwh: string }> = {
  bg: { wh: 'Wh', kwh: 'kWh', mwh: 'MWh' },
  en: { wh: 'Wh', kwh: 'kWh', mwh: 'MWh' },
};

const WATER_LABELS: Record<Locale, { l: string; m3: string }> = {
  bg: { l: 'л', m3: 'м³' },
  en: { l: 'L', m3: 'm³' },
};

export function round(value: number, decimals = 2): number {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}

export function formatNumber(value: number, decimals = 2, locale: Locale = 'bg'): string {
  return value.toLocaleString(LOCALE_TAG[locale], {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export function formatNumberBG(value: number, decimals = 2): string {
  return formatNumber(value, decimals, 'bg');
}

export function formatEnergy(kWh: number, locale: Locale = 'bg'): string {
  const labels = ENERGY_LABELS[locale];
  if (kWh < 1) return `${formatNumber(kWh * 1000, 0, locale)} ${labels.wh}`;
  if (kWh < 1000) return `${formatNumber(kWh, 2, locale)} ${labels.kwh}`;
  return `${formatNumber(kWh / 1000, 2, locale)} ${labels.mwh}`;
}

export function formatCO2(grams: number, locale: Locale = 'bg'): string {
  if (grams < 1000) return `${formatNumber(grams, 1, locale)} g CO₂e`;
  if (grams < 1_000_000) return `${formatNumber(grams / 1000, 2, locale)} kg CO₂e`;
  return `${formatNumber(grams / 1_000_000, 2, locale)} t CO₂e`;
}

export function formatWater(liters: number, locale: Locale = 'bg'): string {
  const labels = WATER_LABELS[locale];
  if (liters < 1000) return `${formatNumber(liters, 2, locale)} ${labels.l}`;
  return `${formatNumber(liters / 1000, 2, locale)} ${labels.m3}`;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
