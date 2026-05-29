export function round(value: number, decimals = 2): number {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}

export function formatNumberBG(value: number, decimals = 2): string {
  return value.toLocaleString('bg-BG', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export function formatEnergy(kWh: number): string {
  if (kWh < 1) return `${formatNumberBG(kWh * 1000, 0)} Wh`;
  if (kWh < 1000) return `${formatNumberBG(kWh, 2)} kWh`;
  return `${formatNumberBG(kWh / 1000, 2)} MWh`;
}

export function formatCO2(grams: number): string {
  if (grams < 1000) return `${formatNumberBG(grams, 1)} g CO₂e`;
  if (grams < 1_000_000) return `${formatNumberBG(grams / 1000, 2)} kg CO₂e`;
  return `${formatNumberBG(grams / 1_000_000, 2)} t CO₂e`;
}

export function formatWater(liters: number): string {
  if (liters < 1000) return `${formatNumberBG(liters, 2)} л`;
  return `${formatNumberBG(liters / 1000, 2)} м³`;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
