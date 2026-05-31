import { View } from '@core/view/View';
import { TOKENS } from '../../../tokens';
import { LineChart, BarChart, PieChart } from '@core/charts';
import { WorkloadLabelBG } from '@domains/calculator/models/WorkloadType';
import type { Calculation } from '@domains/calculator/models/Calculation';
import type { DashboardData, DashboardFilter } from '../services/DashboardService';

const PALETTE = ['#2e7d32', '#0277bd', '#f9a825', '#6d4c41', '#7b1fa2', '#c62828', '#00838f', '#558b2f', '#ef6c00'];

type ChartHandle = { unmount: () => void };

interface MonthlyDelta {
  current: number;
  previous: number;
  pct: number | null;
}

export class DashboardView extends View {
  private from: Date | null = null;
  private to: Date | null = null;
  private scope: 'mine' | 'all' = 'mine';
  private current: DashboardData | null = null;
  private mounted: ChartHandle[] = [];

  protected override onBeforeRender(): void {
    this.recompute();
  }

  protected override render(): string {
    const d = this.current;
    return `
      <header class="page-heading">
        <span class="page-heading__icon page-heading__icon--green" aria-hidden="true">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
        </span>
        <div class="page-heading__main">
          <h1 class="page-heading__title">Общ преглед на емисиите</h1>
          <p class="page-heading__subtitle">Сравнение спрямо предходния месец и последни задачи.</p>
        </div>
        <div class="page-heading__actions">
          <a class="btn btn--primary" href="#/calculator">Ново изчисление</a>
        </div>
      </header>

      <section class="card stack-4">
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
      </section>

      ${d ? this.trendTilesHTML(d) : ''}

      <section class="dash-split">
        <div class="dash-panel">
          <div class="dash-panel__header">
            <div>
              <h2 class="dash-panel__title">Тренденция на емисиите</h2>
              <p class="dash-panel__subtitle">CO₂e по месеци (kg)</p>
            </div>
          </div>
          <div data-chart="trend" style="min-height: 260px;"></div>
        </div>
        <div class="dash-panel">
          <div class="dash-panel__header">
            <div>
              <h2 class="dash-panel__title">Последни задачи</h2>
              <p class="dash-panel__subtitle">Кликнете за детайли</p>
            </div>
          </div>
          ${this.recentJobsHTML()}
        </div>
      </section>

      ${
        d && d.totals.count > 0
          ? `
          <section class="dash-grid">
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
          </section>
        `
          : ''
      }

      <style>
        .dash-form { margin-bottom: 0; }
        .dash-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
          gap: var(--space-4);
        }
        .dash-card {
          padding: var(--space-3);
          background-color: var(--color-bg-elevated);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-lg);
        }
        .dash-card h2 { margin: 0 0 var(--space-2); font-size: var(--fs-md); }
        .trend-tiles {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: var(--space-4);
        }
        @media (max-width: 800px) {
          .trend-tiles { grid-template-columns: 1fr; }
        }
        .format-toggle { display: flex; gap: var(--space-3); }
        .format-toggle__option {
          display: inline-flex; align-items: center; gap: var(--space-2);
          padding: var(--space-2) var(--space-3);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-md);
          cursor: pointer;
        }
        .format-toggle__option:has(input:checked) {
          border-color: var(--color-primary);
          background: color-mix(in srgb, var(--color-primary) 8%, transparent);
        }
      </style>
    `;
  }

  private trendTilesHTML(d: DashboardData): string {
    const items = this.collectVisible();
    const now = new Date();
    const energy = monthlyDelta(items, (c) => c.result.energyKWh, now);
    const co2 = monthlyDelta(items, (c) => c.result.co2eKg, now);
    const water = monthlyDelta(items, (c) => c.result.waterLiters, now);

    void d; // totals available via d if needed
    return `
      <section class="trend-tiles">
        ${this.trendTile('energy', 'Енергия', energy.current, 'kWh', energy)}
        ${this.trendTile('co2', 'CO₂e', co2.current, 'kg', co2)}
        ${this.trendTile('water', 'Вода', water.current, 'литра', water)}
      </section>
    `;
  }

  private trendTile(kind: 'energy' | 'co2' | 'water', label: string, value: number, unit: string, delta: MonthlyDelta): string {
    const icons: Record<typeof kind, string> = {
      energy: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>`,
      co2: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z"/></svg>`,
      water: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/></svg>`,
    };
    const formatted = formatValue(value, kind);
    const deltaHTML = renderDelta(delta);
    return `
      <article class="trend-tile">
        <div class="trend-tile__head">
          <span class="trend-tile__label">${label}</span>
          <span class="trend-tile__icon trend-tile__icon--${kind}" aria-hidden="true">${icons[kind]}</span>
        </div>
        <div class="trend-tile__value">${formatted}<span class="trend-tile__unit">${unit}</span></div>
        ${deltaHTML}
      </article>
    `;
  }

  private recentJobsHTML(): string {
    const items = this.collectVisible()
      .slice()
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, 5);
    if (items.length === 0) {
      return `<p class="muted">Все още няма изчисления. <a href="#/calculator">Започнете първото</a>.</p>`;
    }
    return `
      <div class="recent-jobs">
        ${items
          .map((c) => {
            const title = c.label?.trim() || `${c.params.hardware.displayName} · ${c.params.durationHours} ч.`;
            const date = formatShortDate(c.createdAt);
            const co2 = `${c.result.co2eKg.toFixed(2)} kg CO₂e`;
            return `
              <a class="recent-job" href="#/result/${c.id}">
                <span class="recent-job__icon" aria-hidden="true">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="2" width="16" height="20" rx="2"/><line x1="8" y1="6" x2="16" y2="6"/><circle cx="9" cy="11" r="1"/><circle cx="12" cy="11" r="1"/><circle cx="15" cy="11" r="1"/></svg>
                </span>
                <div class="recent-job__body">
                  <span class="recent-job__title">${escapeHTML(title)}</span>
                  <span class="recent-job__meta">${date} · ${escapeHTML(c.params.region.name)}</span>
                </div>
                <span class="recent-job__value">${co2}</span>
              </a>
            `;
          })
          .join('')}
      </div>
    `;
  }

  protected override onAfterRender(): void {
    this.on('#dash-form', 'change', () => this.readForm());
    this.on('#dash-form', 'input', () => this.readForm());
    this.on('#dash-form', 'reset', () => {
      this.from = null;
      this.to = null;
      this.scope = 'mine';
      queueMicrotask(() => this.rerender());
    });
    this.mountCharts();
  }

  private mountCharts(): void {
    if (!this.current) return;
    const d = this.current;

    const trendHost = this.root.querySelector<HTMLElement>('[data-chart="trend"]');
    if (trendHost) {
      const series = monthlySeries(this.collectVisible(), 6);
      if (series.length >= 2) {
        const chart = new LineChart({
          title: 'Тренденция на емисиите',
          description: 'Линейна диаграма със сумата на CO₂e по месеци.',
          data: series.map((s) => ({ date: s.date, value: s.co2eKg })),
          yLabel: 'kg CO₂e',
        });
        chart.mount(trendHost);
        this.mounted.push(chart);
      } else {
        trendHost.innerHTML = '<p class="muted">Нужни са поне 2 месеца с данни за тренд.</p>';
      }
    }

    if (d.totals.count === 0) {
      this.disposers.push(() => {
        for (const c of this.mounted) c.unmount();
        this.mounted = [];
      });
      return;
    }

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

    this.disposers.push(() => {
      for (const c of this.mounted) c.unmount();
      this.mounted = [];
    });
  }

  private collectVisible(): Calculation[] {
    const repo = this.container.resolve(TOKENS.CalculationRepository);
    const auth = this.container.resolve(TOKENS.Auth);
    const userId = auth.current().id;
    const all = repo.all();
    return all
      .filter((c) => (this.scope === 'mine' ? c.userId === userId : true))
      .filter((c) => (this.from == null ? true : c.createdAt.getTime() >= this.from.getTime()))
      .filter((c) => (this.to == null ? true : c.createdAt.getTime() <= this.to.getTime()));
  }

  private readForm(): void {
    const form = this.$<HTMLFormElement>('#dash-form');
    const data = new FormData(form);
    const fromStr = String(data.get('from') ?? '');
    const toStr = String(data.get('to') ?? '');
    this.from = fromStr ? new Date(fromStr) : null;
    this.to = toStr ? endOfDay(toStr) : null;
    const scope = String(data.get('scope') ?? 'mine');
    this.scope = scope === 'all' ? 'all' : 'mine';
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

function monthlyDelta(
  items: Calculation[],
  pick: (c: Calculation) => number,
  now: Date,
): MonthlyDelta {
  const curMonth = now.getMonth();
  const curYear = now.getFullYear();
  const prevMonth = curMonth === 0 ? 11 : curMonth - 1;
  const prevYear = curMonth === 0 ? curYear - 1 : curYear;
  let current = 0;
  let previous = 0;
  for (const c of items) {
    const m = c.createdAt.getMonth();
    const y = c.createdAt.getFullYear();
    if (y === curYear && m === curMonth) current += pick(c);
    else if (y === prevYear && m === prevMonth) previous += pick(c);
  }
  let pct: number | null = null;
  if (previous > 0) pct = ((current - previous) / previous) * 100;
  else if (current > 0) pct = null;
  return { current, previous, pct };
}

function renderDelta(d: MonthlyDelta): string {
  if (d.pct == null) {
    return `<span class="trend-tile__delta trend-tile__delta--flat">— <span class="trend-tile__delta-suffix">няма данни за миналия месец</span></span>`;
  }
  const up = d.pct > 0;
  const flat = Math.abs(d.pct) < 0.5;
  const cls = flat ? 'flat' : up ? 'up' : 'down';
  const arrow = flat ? '→' : up ? '▲' : '▼';
  const sign = d.pct > 0 ? '+' : '';
  return `<span class="trend-tile__delta trend-tile__delta--${cls}">${arrow} ${sign}${d.pct.toFixed(1)}% <span class="trend-tile__delta-suffix">спрямо м.м.</span></span>`;
}

function monthlySeries(items: Calculation[], months: number): Array<{ date: Date; co2eKg: number }> {
  const map = new Map<string, number>();
  for (const c of items) {
    const key = `${c.createdAt.getFullYear()}-${String(c.createdAt.getMonth() + 1).padStart(2, '0')}`;
    map.set(key, (map.get(key) ?? 0) + c.result.co2eKg);
  }
  const out: Array<{ date: Date; co2eKg: number }> = [];
  const now = new Date();
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    out.push({ date: d, co2eKg: map.get(key) ?? 0 });
  }
  return out;
}

function formatValue(value: number, kind: 'energy' | 'co2' | 'water'): string {
  if (kind === 'co2') return value.toFixed(2);
  return value.toFixed(2);
}

function formatShortDate(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()}`;
}

function escapeHTML(s: string): string {
  return s.replace(/[&<>"']/g, (ch) => {
    switch (ch) {
      case '&': return '&amp;';
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '"': return '&quot;';
      case "'": return '&#39;';
      default: return ch;
    }
  });
}

export default DashboardView;
