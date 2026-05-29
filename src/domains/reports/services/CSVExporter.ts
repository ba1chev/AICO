import type { Calculation } from '@domains/calculator/models/Calculation';
import { WorkloadLabelBG } from '@domains/calculator/models/WorkloadType';

export interface CSVExportOptions {
  bom?: boolean;
  delimiter?: ',' | ';';
}

export class CSVExporter {
  private readonly delimiter: string;
  private readonly bom: boolean;

  constructor(opts: CSVExportOptions = {}) {
    this.delimiter = opts.delimiter ?? ';';
    this.bom = opts.bom ?? true;
  }

  exportCalculations(items: Calculation[]): Blob {
    const text = this.toString(items);
    return new Blob([text], { type: 'text/csv;charset=utf-8' });
  }

  toString(items: Calculation[]): string {
    const headers = [
      'Дата',
      'Етикет',
      'Хардуер',
      'Брой',
      'Регион',
      'Часове',
      'PUE',
      'Натоварване',
      'Тип',
      'kWh',
      'CO2e (g)',
      'CO2e (kg)',
      'Вода (L)',
    ];
    const lines: string[] = [];
    lines.push(this.row(headers));
    for (const c of items) {
      const p = c.params;
      const r = c.result;
      lines.push(
        this.row([
          c.createdAt.toISOString(),
          c.label ?? '',
          p.hardware.displayName,
          String(p.hardwareCount),
          p.region.name,
          formatNumber(p.durationHours, 2),
          formatNumber(p.pue, 2),
          formatNumber(p.utilization, 2),
          WorkloadLabelBG[p.workloadType],
          formatNumber(r.energyKWh, 4),
          formatNumber(r.co2eGrams, 2),
          formatNumber(r.co2eKg, 4),
          formatNumber(r.waterLiters, 3),
        ]),
      );
    }
    const body = lines.join('\r\n');
    return this.bom ? `﻿${body}` : body;
  }

  private row(values: string[]): string {
    return values.map((v) => this.escape(v)).join(this.delimiter);
  }

  private escape(value: string): string {
    if (value === '' || value == null) return '';
    const needsQuote =
      value.includes(this.delimiter) ||
      value.includes('"') ||
      value.includes('\n') ||
      value.includes('\r');
    if (!needsQuote) return value;
    return `"${value.replace(/"/g, '""')}"`;
  }
}

function formatNumber(n: number, decimals: number): string {
  return Number.isFinite(n) ? n.toFixed(decimals) : '';
}
