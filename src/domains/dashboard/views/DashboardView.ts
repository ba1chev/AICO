import { View } from '@core/view/View';
import { TOKENS } from '../../../tokens';
import { BarChart, PieChart, LineChart } from '@core/charts';
import { WorkloadLabelBG } from '@domains/calculator/models/WorkloadType';
import type { DashboardData, DashboardFilter } from '../services/DashboardService';

const PALETTE = [
  '#2e7d32',
  '#0277bd',
  '#f9a825',
  '#6d4c41',
  '#7b1fa2',
  '#c62828',
  '#00838f',
  '#558b2f',
  '#ef6c00',
];

type ChartHandle = { unmount: () => void };

export class DashboardView extends View {
  private from: Date | null = null;
  private to: Date | null = null;
  private scope: 'mine' | 'all' = 'all';
  private current: DashboardData | null = null;
  private mounted: ChartHandle[] = [];

  protected override onBeforeRender(): void {
    this.recompute();
  }

  protected override render(): string {
    const d = this.current;
    return `
      <section class="card stack-4">
        <header>
          <div class="row-between">
            <div>
              <h1>Табло</h1>
              <p class="muted">Обобщен изглед на изчисленията. Филтрирайте по период и обхват.</p>
            </div>
          </div>
        </header>

        <form id="dash-form" class="dash-form" novalidate>
          <div class="grid-3">
            <div class="field">
              <label class="field__label" for="d-from">От</label>
              <input class="field__input" id="d-from" name="from" type="date" value="${isoDate(this.from)}" />
            </div>
            <div class="field">
              <label class="field__label" for="d-to">До</label>
              <input class="field__input" id="d-to" name="to" type="date" value="${isoDate(this.to)}" />
            </div>
            <div class="field">
              <span class="field__label">Обхват</span>
              <div class="format-toggle" role="radiogroup" aria-label="Обхват">
                <label class="format-toggle__option">
                  <input type="radio" name="scope" value="mine" ${this.scope === 'mine' ? 'checked' : ''} />
                  <span>Моите</span>
                </label>
                <label class="format-toggle__option">
                  <input type="radio" name="scope" value="all" ${this.scope === 'all' ? 'checked' : ''} />
                  <span>Всички</span>
                </label>
              </div>
            </div>
          </div>
          <div class="auth-actions">
            <button type="reset" class="btn btn--ghost">Изчисти</button>
          </div>
        </form>

        ${d ? this.totalsHTML(d) : ''}

        ${
          d && d.totals.count > 0
            ? `
          <div class="dash-grid">
            <div class="dash-card">
              <h2>По хардуер (CO₂e)</h2>
              <div data-chart="hardware"></div>
            </div>
            <div class="dash-card">
              <h2>По регион (CO₂e)</h2>
              <div data-chart="region"></div>
            </div>
            <div class="dash-card">
              <h2>По тип натоварване</h2>
              <div data-chart="workload"></div>
            </div>
            <div class="dash-card dash-card--wide">
              <h2>Месечен тренд (CO₂e)</h2>
              <div data-chart="month"></div>
            </div>
          </div>
        `
            : `<p class="muted">Няма данни за избрания период.</p>`
        }
      </section>

      <style>
        .row-between { display: flex; justify-content: space-between; align-items: center; gap: var(--space-3); }
        .dash-form { margin-bottom: var(--space-4); }
        .dash-totals {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
          gap: var(--space-3);
          padding: var(--space-3);
          background: var(--color-surface-2, #f4f6f8);
          border-radius: var(--radius-md, 8px);
        }
        .dash-totals__cell { display: flex; flex-direction: column; }
        .dash-totals__label {
          font-size: var(--fs-sm); color: var(--color-text-muted); text-transform: uppercase; letter-spacing: 0.5px;
        }
        .dash-totals__value { font-size: var(--fs-xl, 1.25rem); font-weight: var(--fw-semibold, 600); }
        .dash-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
          gap: var(--space-4);
        }
        .dash-card {
          padding: var(--space-3);
          border: 1px solid var(--color-border, #d0d0d0);
          border-radius: var(--radius-md, 8px);
        }
        .dash-card--wide { grid-column: 1 / -1; }
        .dash-card h2 { margin: 0 0 var(--space-2); font-size: var(--fs-md, 1rem); }
        .format-toggle { display: flex; gap: var(--space-3); }
        .format-toggle__option {
          display: inline-flex; align-items: center; gap: var(--space-2);
          padding: var(--space-2) var(--space-3);
          border: 1px solid var(--color-border, #d0d0d0);
          border-radius: var(--radius-md, 8px);
          cursor: pointer;
        }
        .format-toggle__option:has(input:checked) {
          border-color: var(--color-primary, #2e7d32);
          background: color-mix(in srgb, var(--color-primary, #2e7d32) 8%, transparent);
        }
      </style>
    `;
  }

  private totalsHTML(d: DashboardData): string {
    return `
      <div class="dash-totals" aria-live="polite">
        <div class="dash-totals__cell">
          <span class="dash-totals__label">Записи</span>
          <span class="dash-totals__value">${d.totals.count}</span>
        </div>
        <div class="dash-totals__cell">
          <span class="dash-totals__label">Енергия (kWh)</span>
          <span class="dash-totals__value">${d.totals.energyKWh.toFixed(2)}</span>
        </div>
        <div class="dash-totals__cell">
          <span class="dash-totals__label">CO₂e (kg)</span>
          <span class="dash-totals__value">${d.totals.co2eKg.toFixed(3)}</span>
        </div>
        <div class="dash-totals__cell">
          <span class="dash-totals__label">Вода (L)</span>
          <span class="dash-totals__value">${d.totals.waterLiters.toFixed(2)}</span>
        </div>
      </div>
    `;
  }

  protected override onAfterRender(): void {
    this.on('#dash-form', 'change', () => this.readForm());
    this.on('#dash-form', 'input', () => this.readForm());
    this.on('#dash-form', 'reset', () => {
      this.from = null;
      this.to = null;
      this.scope = 'all';
      queueMicrotask(() => this.rerender());
    });
    this.mountCharts();
  }

  private mountCharts(): void {
    if (!this.current || this.current.totals.count === 0) return;
    const d = this.current;

    const hwHost = this.root.querySelector<HTMLElement>('[data-chart="hardware"]');
    if (hwHost) {
      const data = d.byHardware.slice(0, 8).map((b, i) => ({
        label: b.label,
        value: b.co2eKg,
        color: PALETTE[i % PALETTE.length] ?? '#2e7d32',
        formattedValue: `${b.co2eKg.toFixed(3)} kg`,
      }));
      const chart = new BarChart({
        title: 'CO₂e по хардуер',
        description: 'Хоризонтална стълбовидна диаграма с CO₂e сума по хардуер.',
        data,
      });
      chart.mount(hwHost);
      this.mounted.push(chart);
    }

    const regHost = this.root.querySelector<HTMLElement>('[data-chart="region"]');
    if (regHost) {
      const data = d.byRegion.slice(0, 8).map((b, i) => ({
        label: b.label,
        value: b.co2eKg,
        color: PALETTE[i % PALETTE.length] ?? '#2e7d32',
        formattedValue: `${b.co2eKg.toFixed(3)} kg`,
      }));
      const chart = new PieChart({
        title: 'CO₂e по регион',
        description: 'Кръгова диаграма с дела на регионите по CO₂e.',
        data,
      });
      chart.mount(regHost);
      this.mounted.push(chart);
    }

    const wlHost = this.root.querySelector<HTMLElement>('[data-chart="workload"]');
    if (wlHost) {
      const data = d.byWorkload.map((b, i) => ({
        label: WorkloadLabelBG[b.key as keyof typeof WorkloadLabelBG] ?? b.label,
        value: b.energyKWh,
        color: PALETTE[i % PALETTE.length] ?? '#2e7d32',
        formattedValue: `${b.energyKWh.toFixed(2)} kWh`,
      }));
      const chart = new BarChart({
        title: 'Енергия по тип натоварване',
        description: 'Хоризонтална стълбовидна диаграма с енергия по тип натоварване.',
        data,
      });
      chart.mount(wlHost);
      this.mounted.push(chart);
    }

    const mHost = this.root.querySelector<HTMLElement>('[data-chart="month"]');
    if (mHost && d.byMonth.length >= 2) {
      const points = d.byMonth.map((m) => ({
        date: parseMonth(m.month),
        value: m.co2eKg,
      }));
      const chart = new LineChart({
        title: 'Месечен тренд на CO₂e',
        description: 'Линейна диаграма със сумата на CO₂e по месеци.',
        data: points,
        yLabel: 'kg CO₂e',
      });
      chart.mount(mHost);
      this.mounted.push(chart);
    } else if (mHost) {
      mHost.innerHTML = '<p class="muted">Нужни са поне 2 месеца с данни за тренд.</p>';
    }

    this.disposers.push(() => {
      for (const c of this.mounted) c.unmount();
      this.mounted = [];
    });
  }

  private readForm(): void {
    const form = this.$<HTMLFormElement>('#dash-form');
    const data = new FormData(form);
    const fromStr = String(data.get('from') ?? '');
    const toStr = String(data.get('to') ?? '');
    this.from = fromStr ? new Date(fromStr) : null;
    this.to = toStr ? endOfDay(toStr) : null;
    const scope = String(data.get('scope') ?? 'all');
    this.scope = scope === 'mine' ? 'mine' : 'all';
    this.recompute();
    this.rerender();
  }

  private recompute(): void {
    const auth = this.container.resolve(TOKENS.Auth);
    const dashboard = this.container.resolve(TOKENS.Dashboard);
    const user = auth.current();
    const filter: DashboardFilter = {
      userIds: this.scope === 'mine' ? [user.id] : null,
      from: this.from,
      to: this.to,
    };
    this.current = dashboard.build(filter);
  }

  private rerender(): void {
    for (const dispose of this.disposers) dispose();
    this.disposers.length = 0;
    this.mounted = [];
    this.root.innerHTML = this.render();
    this.onAfterRender();
  }
}

function isoDate(d: Date | null): string {
  if (!d) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function endOfDay(iso: string): Date {
  const d = new Date(iso);
  d.setHours(23, 59, 59, 999);
  return d;
}

function parseMonth(key: string): Date {
  const [y, m] = key.split('-');
  return new Date(Number(y), Number(m) - 1, 1);
}

export default DashboardView;
