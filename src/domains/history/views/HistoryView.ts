import { View } from '@core/view/View';
import { TOKENS } from '../../../tokens';
import type { Calculation } from '@domains/calculator/models/Calculation';
import { WorkloadLabelBG, WorkloadTypes, type WorkloadType } from '@domains/calculator/models/WorkloadType';
import {
  applyFilter,
  applySort,
  type HistoryFilter,
  type HistorySortKey,
  type SortDirection,
} from '../services/HistoryFilter';
import { ScenarioComparisonService } from '@domains/scenarios/services/ScenarioComparisonService';
import { LineChart } from '@core/charts';

export class HistoryView extends View {
  private all: Calculation[] = [];
  private filter: HistoryFilter = {};
  private sortKey: HistorySortKey = 'createdAt';
  private sortDir: SortDirection = 'desc';
  private selected = new Set<string>();
  private trendChart: LineChart | null = null;

  protected override onBeforeRender(): void {
    const repo = this.container.resolve(TOKENS.CalculationRepository);
    const auth = this.container.resolve(TOKENS.Auth);
    const user = auth.current();
    this.all = repo.all().filter((c) => c.userId === user.id);
  }

  protected override render(): string {
    const visible = applySort(applyFilter(this.all, this.filter), this.sortKey, this.sortDir);
    const totalCO2Kg = visible.reduce((sum, c) => sum + c.result.co2eKg, 0);
    const totalKWh = visible.reduce((sum, c) => sum + c.result.energyKWh, 0);
    const totalWater = visible.reduce((sum, c) => sum + c.result.waterLiters, 0);

    const hwOptions = uniqueByKey(this.all, (c) => c.params.hardware.id)
      .map((c) => `<option value="${c.params.hardware.id}">${c.params.hardware.displayName}</option>`)
      .join('');
    const rgOptions = uniqueByKey(this.all, (c) => c.params.region.id)
      .map((c) => `<option value="${c.params.region.id}">${c.params.region.name}</option>`)
      .join('');
    const wlOptions = WorkloadTypes.map(
      (w) => `<option value="${w}">${WorkloadLabelBG[w]}</option>`,
    ).join('');

    return `
      <section class="card">
        <h1>История</h1>
        <p class="muted">Запазени изчисления — филтрирайте, сортирайте и сравнявайте.</p>

        <form id="history-filter" class="history-filter" novalidate>
          <div class="grid-3">
            <div class="field">
              <label class="field__label" for="f-from">От</label>
              <input class="field__input" id="f-from" name="from" type="date" />
            </div>
            <div class="field">
              <label class="field__label" for="f-to">До</label>
              <input class="field__input" id="f-to" name="to" type="date" />
            </div>
            <div class="field">
              <label class="field__label" for="f-search">Търсене</label>
              <input class="field__input" id="f-search" name="search" type="search"
                placeholder="етикет, хардуер, регион…" />
            </div>
            <div class="field">
              <label class="field__label" for="f-hardware">Хардуер</label>
              <select class="field__select" id="f-hardware" name="hardware">
                <option value="">Всички</option>
                ${hwOptions}
              </select>
            </div>
            <div class="field">
              <label class="field__label" for="f-region">Регион</label>
              <select class="field__select" id="f-region" name="region">
                <option value="">Всички</option>
                ${rgOptions}
              </select>
            </div>
            <div class="field">
              <label class="field__label" for="f-workload">Натоварване</label>
              <select class="field__select" id="f-workload" name="workload">
                <option value="">Всички</option>
                ${wlOptions}
              </select>
            </div>
          </div>
          <div class="auth-actions">
            <button type="reset" class="btn btn--ghost">Изчисти филтри</button>
          </div>
        </form>

        <div class="history-summary" role="status" aria-live="polite">
          <strong>${visible.length}</strong> запис${visible.length === 1 ? '' : 'а'} ·
          ${totalKWh.toFixed(2)} kWh ·
          ${totalCO2Kg.toFixed(2)} kg CO₂e ·
          ${totalWater.toFixed(1)} L вода
        </div>

        ${visible.length >= 2 ? `<div class="history-trend"><h2>Тренд на CO₂e</h2><div data-chart="trend"></div></div>` : ''}

        <div class="history-actions">
          <button type="button" class="btn btn--primary" id="btn-compare"
            ${this.selected.size < 2 ? 'disabled' : ''}>
            Сравни (${this.selected.size})
          </button>
          <button type="button" class="btn btn--ghost" id="btn-clear-selection"
            ${this.selected.size === 0 ? 'disabled' : ''}>
            Изчисти избора
          </button>
        </div>

        ${this.tableHTML(visible)}
      </section>

      <style>
        .history-filter { margin-bottom: var(--space-4); }
        .history-summary {
          margin: var(--space-3) 0;
          padding: var(--space-3);
          background: var(--color-surface-2, #f4f6f8);
          border-radius: var(--radius-2, 6px);
        }
        .history-actions {
          display: flex; gap: var(--space-3); margin-bottom: var(--space-3);
        }
        .history-trend { margin: var(--space-4) 0; }
        .history-table { width: 100%; border-collapse: collapse; font-size: var(--fs-sm); }
        .history-table th, .history-table td {
          padding: var(--space-2) var(--space-3);
          text-align: left;
          border-bottom: 1px solid var(--color-border, #e0e3e7);
        }
        .history-table th { cursor: pointer; user-select: none; }
        .history-table th[aria-sort="ascending"]::after { content: " ▲"; }
        .history-table th[aria-sort="descending"]::after { content: " ▼"; }
        .history-table td.num { text-align: right; font-variant-numeric: tabular-nums; }
        .history-empty { padding: var(--space-5); text-align: center; color: var(--color-muted); }
        .history-row__actions { display: flex; gap: var(--space-2); }
      </style>
    `;
  }

  private tableHTML(visible: Calculation[]): string {
    if (visible.length === 0) {
      return `<div class="history-empty">Няма записи. <a href="#/calculator">Направете първо изчисление →</a></div>`;
    }
    const headers: Array<{ key: HistorySortKey | ''; label: string; numeric?: boolean }> = [
      { key: '', label: '' },
      { key: 'createdAt', label: 'Дата' },
      { key: 'hardware', label: 'Хардуер' },
      { key: 'region', label: 'Регион' },
      { key: 'durationHours', label: 'Часове', numeric: true },
      { key: 'energyKWh', label: 'kWh', numeric: true },
      { key: 'co2eGrams', label: 'CO₂e (kg)', numeric: true },
      { key: 'waterLiters', label: 'Вода (L)', numeric: true },
      { key: '', label: '' },
    ];
    const headHTML = headers
      .map((h) => {
        if (!h.key) return `<th></th>`;
        const ariaSort =
          this.sortKey === h.key ? (this.sortDir === 'asc' ? 'ascending' : 'descending') : 'none';
        const cls = h.numeric ? 'num' : '';
        return `<th class="${cls}" data-sort="${h.key}" aria-sort="${ariaSort}" tabindex="0">${h.label}</th>`;
      })
      .join('');

    const rowsHTML = visible
      .map((c) => {
        const checked = this.selected.has(c.id) ? 'checked' : '';
        const limit = ScenarioComparisonService.limits.max;
        const disabled = !this.selected.has(c.id) && this.selected.size >= limit ? 'disabled' : '';
        return `
          <tr data-id="${c.id}">
            <td>
              <input type="checkbox" class="history-select" data-id="${c.id}"
                aria-label="Избери за сравнение" ${checked} ${disabled} />
            </td>
            <td>${c.createdAt.toLocaleString('bg-BG')}</td>
            <td>${c.params.hardware.displayName}</td>
            <td>${c.params.region.name}</td>
            <td class="num">${c.params.durationHours}</td>
            <td class="num">${c.result.energyKWh.toFixed(2)}</td>
            <td class="num">${c.result.co2eKg.toFixed(2)}</td>
            <td class="num">${c.result.waterLiters.toFixed(1)}</td>
            <td>
              <div class="history-row__actions">
                <a class="btn btn--ghost" href="#/result/${c.id}">Виж</a>
                <button class="btn btn--ghost" type="button" data-action="delete" data-id="${c.id}">Изтрий</button>
              </div>
            </td>
          </tr>`;
      })
      .join('');

    return `
      <table class="history-table" aria-label="Запазени изчисления">
        <thead><tr>${headHTML}</tr></thead>
        <tbody>${rowsHTML}</tbody>
      </table>
    `;
  }

  protected override onAfterRender(): void {
    this.mountTrendChart();

    this.on('#history-filter', 'input', () => this.readFilters());
    this.on('#history-filter', 'change', () => this.readFilters());
    this.on('#history-filter', 'reset', () => {
      this.filter = {};
      queueMicrotask(() => this.rerender());
    });

    for (const th of this.$$<HTMLTableCellElement>('.history-table th[data-sort]')) {
      th.addEventListener('click', () => this.toggleSort(th.dataset['sort'] as HistorySortKey));
      th.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          this.toggleSort(th.dataset['sort'] as HistorySortKey);
        }
      });
    }

    for (const cb of this.$$<HTMLInputElement>('.history-select')) {
      cb.addEventListener('change', () => {
        const id = cb.dataset['id']!;
        if (cb.checked) this.selected.add(id);
        else this.selected.delete(id);
        this.rerender();
      });
    }

    for (const btn of this.$$<HTMLButtonElement>('button[data-action="delete"]')) {
      btn.addEventListener('click', () => {
        const id = btn.dataset['id']!;
        if (!confirm('Изтриване на този запис?')) return;
        this.container.resolve(TOKENS.CalculationRepository).remove(id);
        this.selected.delete(id);
        this.all = this.all.filter((c) => c.id !== id);
        this.rerender();
      });
    }

    const compareBtn = this.root.querySelector<HTMLButtonElement>('#btn-compare');
    compareBtn?.addEventListener('click', () => this.startCompare());

    const clearBtn = this.root.querySelector<HTMLButtonElement>('#btn-clear-selection');
    clearBtn?.addEventListener('click', () => {
      this.selected.clear();
      this.rerender();
    });
  }

  private mountTrendChart(): void {
    const host = this.root.querySelector<HTMLElement>('[data-chart="trend"]');
    if (!host) return;
    const visible = applySort(applyFilter(this.all, this.filter), 'createdAt', 'asc');
    if (visible.length < 2) return;
    this.trendChart = new LineChart({
      title: 'Тренд на CO₂e във времето',
      description: 'Линейна графика на CO₂e (kg) за всяко изчисление, подредени по дата.',
      yLabel: 'CO₂e (kg)',
      data: visible.map((c) => ({ date: c.createdAt, value: c.result.co2eKg })),
      formatValue: (v) => `${v.toFixed(2)} kg`,
    });
    this.trendChart.mount(host);
    this.disposers.push(() => this.trendChart?.unmount());
  }

  private readFilters(): void {
    const form = this.$<HTMLFormElement>('#history-filter');
    const data = new FormData(form);
    const fromStr = String(data.get('from') ?? '');
    const toStr = String(data.get('to') ?? '');
    const wl = String(data.get('workload') ?? '') as WorkloadType | '';
    const hw = String(data.get('hardware') ?? '');
    const rg = String(data.get('region') ?? '');
    const search = String(data.get('search') ?? '');
    this.filter = {
      from: fromStr ? new Date(fromStr) : null,
      to: toStr ? endOfDay(toStr) : null,
      hardwareId: hw || null,
      regionId: rg || null,
      workloadType: wl || null,
      search,
    };
    this.rerender();
  }

  private toggleSort(key: HistorySortKey): void {
    if (this.sortKey === key) {
      this.sortDir = this.sortDir === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortKey = key;
      this.sortDir = key === 'createdAt' ? 'desc' : 'asc';
    }
    this.rerender();
  }

  private rerender(): void {
    for (const dispose of this.disposers) dispose();
    this.disposers.length = 0;
    this.root.innerHTML = this.render();
    this.onAfterRender();
    this.restoreFilterValues();
  }

  private restoreFilterValues(): void {
    const setVal = (id: string, value: string) => {
      const el = this.root.querySelector<HTMLInputElement | HTMLSelectElement>(id);
      if (el) el.value = value;
    };
    if (this.filter.from) setVal('#f-from', isoDate(this.filter.from));
    if (this.filter.to) setVal('#f-to', isoDate(this.filter.to));
    setVal('#f-hardware', this.filter.hardwareId ?? '');
    setVal('#f-region', this.filter.regionId ?? '');
    setVal('#f-workload', this.filter.workloadType ?? '');
    setVal('#f-search', this.filter.search ?? '');
  }

  private startCompare(): void {
    if (this.selected.size < 2) return;
    const ids = Array.from(this.selected);
    const router = this.container.resolve(TOKENS.Router);
    router.navigate(`/compare?ids=${encodeURIComponent(ids.join(','))}`);
  }
}

function uniqueByKey<T>(items: T[], key: (item: T) => string): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const it of items) {
    const k = key(it);
    if (!seen.has(k)) {
      seen.add(k);
      out.push(it);
    }
  }
  return out;
}

function endOfDay(iso: string): Date {
  const d = new Date(iso);
  d.setHours(23, 59, 59, 999);
  return d;
}

function isoDate(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export default HistoryView;
