import { describe, it, expect } from 'vitest';
import { CSVExporter } from '@domains/reports/services/CSVExporter';
import { Calculation } from '@domains/calculator/models/Calculation';
import { CalculationParams } from '@domains/calculator/models/CalculationParams';
import { CalculationResult } from '@domains/calculator/models/CalculationResult';
import { Hardware } from '@domains/calculator/models/Hardware';
import { Region } from '@domains/calculator/models/Region';

const hw = Hardware.fromJSON({
  id: 'a100', name: 'A100', vendor: 'NVIDIA', category: 'gpu', powerWatts: 400,
});
const rg = Region.fromJSON({
  id: 'bg', name: 'България', countryCode: 'BG',
  carbonIntensityGCO2PerKWh: 360, wueLitersPerKWh: 1.8, defaultPUE: 1.2,
});

function calc(id: string, label: string | null, hours: number, kWh: number): Calculation {
  const params = CalculationParams.create({
    hardware: hw, region: rg, durationHours: hours, pue: 1.2, utilization: 1, hardwareCount: 1,
    workloadType: 'training',
  });
  const result = CalculationResult.of(kWh, kWh * 360, kWh * 1.8);
  return new Calculation(id, params, result, new Date('2026-03-15T10:00:00Z'), 'u1', label);
}

describe('CSVExporter', () => {
  it('writes a header row and one row per calculation', () => {
    const csv = new CSVExporter({ bom: false }).toString([calc('1', 'GPT', 10, 4.8)]);
    const lines = csv.split('\r\n');
    expect(lines).toHaveLength(2);
    expect(lines[0]).toContain('Дата');
    expect(lines[1]).toContain('GPT');
    expect(lines[1]).toContain('A100');
  });

  it('escapes delimiters and quotes', () => {
    const csv = new CSVExporter({ bom: false, delimiter: ';' }).toString([
      calc('1', 'a; b "c"', 5, 2),
    ]);
    const dataLine = csv.split('\r\n')[1]!;
    expect(dataLine).toContain('"a; b ""c"""');
  });

  it('prepends BOM by default for Excel compatibility', () => {
    const csv = new CSVExporter().toString([]);
    expect(csv.charCodeAt(0)).toBe(0xfeff);
  });

  it('supports comma delimiter when configured', () => {
    const csv = new CSVExporter({ bom: false, delimiter: ',' }).toString([calc('1', null, 5, 2)]);
    const header = csv.split('\r\n')[0]!;
    expect(header.split(',').length).toBeGreaterThan(5);
  });

  it('produces a Blob with text/csv mime type', () => {
    const blob = new CSVExporter().exportCalculations([calc('1', null, 5, 2)]);
    expect(blob.type).toContain('text/csv');
    expect(blob.size).toBeGreaterThan(0);
  });
});
