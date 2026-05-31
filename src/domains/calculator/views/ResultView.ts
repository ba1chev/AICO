import { View } from '@core/view/View';
import { TOKENS } from '../../../tokens';
import { formatCO2, formatEnergy, formatWater, formatNumber, type Locale } from '@core/utils/numbers';
import { formatDateTimeBG } from '@core/utils/date';
import { WorkloadLabelBG } from '../models/WorkloadType';
import type { Calculation } from '../models/Calculation';
import { CalculationResult } from '../models/CalculationResult';
import type { RegionFactor } from '../models/RegionFactor';
import type { Driver } from '../services/DriverAnalysis';
import type { Recommendation } from '../services/RecommendationService';
import { BarChart, PieChart } from '@core/charts';

export class ResultView extends View {
  private calc: Calculation | null = null;
  private latestFactor: RegionFactor | null = null;
  private recomputed: { result: CalculationResult; factor: RegionFactor } | null = null;
  private drivers: Driver[] = [];
  private recommendations: Recommendation[] = [];
  private barChart: BarChart | null = null;
  private pieChart: PieChart | null = null;
  private driversChart: BarChart | null = null;
  private locale: Locale = 'bg';

  protected override async onBeforeRender(): Promise<void> {
    const id = this.params['id'];
    if (!id) return;
    const repo = this.container.resolve(TOKENS.CalculationRepository);
    this.calc = repo.findById(id);
    this.locale = this.container.resolve(TOKENS.I18n).getLocale();
    if (this.calc) {
      const factors = this.container.resolve(TOKENS.RegionFactors);
      this.latestFactor = (await factors.latestFor(this.calc.params.region.id)) ?? null;
      const analysis = this.container.resolve(TOKENS.DriverAnalysis);
      this.drivers = analysis.forCO2e(this.calc.params);
      const recs = this.container.resolve(TOKENS.Recommendations);
      this.recommendations = await recs.forParams(this.calc.params, this.calc.result.co2eGrams);
    }
  }

  protected override render(): string {
    if (!this.calc) {
      return `
        <section class="card center stack-3">
          <h1>Резултатът не е намерен</h1>
          <p class="muted">Възможно е да е изтрит или ID-то да е невалидно.</p>
          <p><a class="btn btn--secondary" href="#/calculator">Към калкулатора</a></p>
        </section>
      `;
    }

    const c = this.calc;
    const p = c.params;
    const r = this.recomputed?.result ?? c.result;
    const showingRecomputed = this.recomputed !== null;
    const usedFactor = this.recomputed?.factor ?? null;
    const stale = this.isStale();

    return `
      <header class="page-heading">
        <span class="page-heading__icon page-heading__icon--green" aria-hidden="true">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
        </span>
        <div class="page-heading__main">
          <h1 class="page-heading__title">Резултат от изчислението</h1>
          <p class="page-heading__subtitle">Създаден на ${formatDateTimeBG(c.createdAt)}${c.label ? ` · ${escapeHTML(c.label)}` : ''}</p>
        </div>
        <span class="estimate-badge" role="note" title="Стойностите са оценки на базата на публични коефициенти.">Оценка</span>
      </header>

      <section class="card stack-4">
        <header>
          <p class="muted estimate-note">
            Резултатите са приблизителни — базират се на средни стойности за PUE, въглеродна интензивност и WUE
            и могат да се различават от реалното потребление на конкретен дейтацентър.
          </p>
          ${this.versionBannerHTML(showingRecomputed, usedFactor, stale)}
        </header>

        <div class="grid-3">
          ${metricTile('Енергия', formatEnergy(r.energyKWh, this.locale), 'energy')}
          ${metricTile('CO₂e', formatCO2(r.co2eGrams, this.locale), 'co2')}
          ${metricTile('Вода', formatWater(r.waterLiters, this.locale), 'water')}
        </div>

        ${this.recommendationsHTML()}

        <div>
          <h2>Графика на емисиите</h2>
          <div data-chart="bar"></div>
        </div>

        <div>
          <h2>Относителен дял</h2>
          <p class="muted">Нормализирано спрямо средни референтни стойности — само за визуално сравнение.</p>
          <div data-chart="pie"></div>
        </div>

        <div>
          <h2>Кои входни фактори влияят най-много</h2>
          <p class="muted">Принос на всеки вход спрямо „чиста“ базова стойност (по-голям бар = по-силно увеличава резултата).</p>
          <div data-chart="drivers"></div>
        </div>

        <div>
          <h2>Параметри</h2>
          <dl class="result-params">
            <dt>Хардуер</dt><dd>${p.hardware.displayName} (${p.hardware.powerWatts}W) × ${p.hardwareCount}</dd>
            <dt>Регион</dt><dd>${p.region.name} — ${p.region.carbonIntensityGCO2PerKWh} gCO₂/kWh, ${p.region.wueLitersPerKWh} L/kWh</dd>
            <dt>Продължителност</dt><dd>${formatNumber(p.durationHours, 1, this.locale)} ч.</dd>
            <dt>PUE</dt><dd>${formatNumber(p.pue, 2, this.locale)}</dd>
            <dt>Натоварване</dt><dd>${formatNumber(p.utilization * 100, 0, this.locale)}%</dd>
            <dt>Тип натоварване</dt><dd>${WorkloadLabelBG[p.workloadType]}</dd>
            <dt>Версия на фактори</dt><dd>${c.factorVersion ?? '—'}</dd>
          </dl>
        </div>

        <div style="display:flex; gap: var(--space-3);">
          <a class="btn btn--primary" href="#/calculator">Ново изчисление</a>
          <a class="btn btn--secondary" href="#/history">Към историята</a>
        </div>
      </section>

      <style>
        .result-heading {
          display: flex;
          align-items: center;
          gap: var(--space-3);
          flex-wrap: wrap;
        }
        .estimate-badge {
          display: inline-block;
          padding: 2px var(--space-2);
          border-radius: var(--radius-pill);
          background: color-mix(in srgb, #f57c00 18%, transparent);
          border: 1px solid color-mix(in srgb, #f57c00 40%, transparent);
          color: #b85e00;
          font-size: var(--fs-xs);
          font-weight: var(--fw-semibold);
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .estimate-note {
          margin-top: var(--space-2);
          font-size: var(--fs-sm);
        }
        .result-params {
          display: grid;
          grid-template-columns: max-content 1fr;
          gap: var(--space-2) var(--space-4);
        }
        .result-params dt { font-weight: var(--fw-semibold); color: var(--color-text-muted); }
        .result-params dd { margin: 0; word-break: break-word; }
        @media (max-width: 480px) {
          .result-params { grid-template-columns: 1fr; gap: var(--space-1) 0; }
          .result-params dd { margin-bottom: var(--space-2); }
        }
        .metric-card {
          padding: var(--space-4);
          border-radius: var(--radius-md);
          background-color: var(--color-bg-alt);
          border-left: 4px solid;
        }
        .metric-card__label { font-size: var(--fs-sm); color: var(--color-text-muted); text-transform: uppercase; letter-spacing: 0.5px; }
        .metric-card__value { font-size: var(--fs-2xl); font-weight: var(--fw-bold); margin-top: var(--space-1); }
        .version-banner {
          margin-top: var(--space-3);
          padding: var(--space-3);
          border-radius: var(--radius-md);
          display: flex;
          gap: var(--space-3);
          align-items: center;
          flex-wrap: wrap;
          justify-content: space-between;
          font-size: var(--fs-sm);
        }
        .version-banner--stale {
          background: color-mix(in srgb, #f57c00 12%, transparent);
          border: 1px solid color-mix(in srgb, #f57c00 30%, transparent);
        }
        .version-banner--recomputed {
          background: color-mix(in srgb, var(--color-primary, #2e7d32) 10%, transparent);
          border: 1px solid color-mix(in srgb, var(--color-primary, #2e7d32) 30%, transparent);
        }
        .btn--sm { padding: var(--space-1) var(--space-3); font-size: var(--fs-sm); }
        .recommendation-list {
          list-style: none;
          padding: 0;
          margin: var(--space-3) 0 0 0;
          display: grid;
          gap: var(--space-2);
        }
        .recommendation {
          display: flex;
          gap: var(--space-3);
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          padding: var(--space-3);
          border-radius: var(--radius-md);
          background: color-mix(in srgb, var(--color-primary, #2e7d32) 8%, transparent);
          border: 1px solid color-mix(in srgb, var(--color-primary, #2e7d32) 25%, transparent);
        }
        .recommendation__main {
          display: flex;
          flex-direction: column;
          gap: 2px;
          min-width: 0;
        }
        .recommendation__label { font-weight: var(--fw-semibold); }
        .recommendation__detail { font-size: var(--fs-sm); }
        .recommendation__savings {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 2px;
          flex-shrink: 0;
        }
        .recommendation__pct {
          font-size: var(--fs-lg);
          font-weight: var(--fw-bold);
          color: var(--color-primary, #2e7d32);
        }
        .recommendation__new { font-size: var(--fs-sm); }
      </style>
    `;
  }

  protected override onAfterRender(): void {
    if (!this.calc) return;
    const r = this.recomputed?.result ?? this.calc.result;

    const barHost = this.root.querySelector<HTMLElement>('[data-chart="bar"]');
    if (barHost) {
      this.barChart = new BarChart({
        title: 'Сравнителна графика на резултатите',
        description: 'Хоризонтална стълбовидна диаграма с енергия, CO₂e и вода.',
        data: [
          {
            label: 'Енергия (kWh)',
            value: r.energyKWh,
            color: 'var(--color-energy, #f9a825)',
            formattedValue: formatNumber(r.energyKWh, 3, this.locale),
          },
          {
            label: 'CO₂e (kg)',
            value: r.co2eKg,
            color: 'var(--color-co2, #6d4c41)',
            formattedValue: formatNumber(r.co2eKg, 3, this.locale),
          },
          {
            label: 'Вода (L)',
            value: r.waterLiters,
            color: 'var(--color-water, #0277bd)',
            formattedValue: formatNumber(r.waterLiters, 3, this.locale),
          },
        ],
      });
      this.barChart.mount(barHost);
      this.disposers.push(() => this.barChart?.unmount());
    }

    const pieHost = this.root.querySelector<HTMLElement>('[data-chart="pie"]');
    if (pieHost) {
      const pieData = normalizedShares(r.energyKWh, r.co2eKg, r.waterLiters, this.locale);
      this.pieChart = new PieChart({
        title: 'Относителен дял на показателите',
        description: 'Кръгова диаграма с дела на енергия, CO₂e и вода.',
        data: pieData,
      });
      this.pieChart.mount(pieHost);
      this.disposers.push(() => this.pieChart?.unmount());
    }

    const driversHost = this.root.querySelector<HTMLElement>('[data-chart="drivers"]');
    if (driversHost && this.drivers.length > 0) {
      const palette = ['#1f77b4', '#ff7f0e', '#2ca02c', '#d62728', '#9467bd', '#17becf'];
      this.driversChart = new BarChart({
        title: 'Принос на входните фактори',
        description: 'Хоризонтална стълбовидна диаграма с относителния принос на всеки входен параметър.',
        data: this.drivers.map((d, i) => ({
          label: d.label,
          value: d.contributionPct,
          color: palette[i % palette.length] ?? '#1f77b4',
          formattedValue: `${formatNumber(d.contributionPct, 1, this.locale)}%`,
        })),
      });
      this.driversChart.mount(driversHost);
      this.disposers.push(() => this.driversChart?.unmount());
    }

    const recomputeBtn = this.root.querySelector<HTMLButtonElement>('#btn-recompute');
    recomputeBtn?.addEventListener('click', () => this.recomputeWithLatest());
    const revertBtn = this.root.querySelector<HTMLButtonElement>('#btn-revert');
    revertBtn?.addEventListener('click', () => {
      this.recomputed = null;
      this.rerender();
    });
  }

  private isStale(): boolean {
    if (!this.calc || !this.latestFactor) return false;
    return (
      this.calc.factorVersion !== null &&
      this.calc.factorVersion !== this.latestFactor.version
    );
  }

  private recommendationsHTML(): string {
    if (this.recommendations.length === 0) return '';
    const items = this.recommendations
      .map((rec) => {
        const savings = formatNumber(rec.savingsPct, 1, this.locale);
        const newCO2 = formatCO2(rec.newCO2eGrams, this.locale);
        return `
          <li class="recommendation">
            <div class="recommendation__main">
              <span class="recommendation__label">${escapeHTML(rec.label)}</span>
              <span class="recommendation__detail muted">${escapeHTML(rec.detail)}</span>
            </div>
            <div class="recommendation__savings" aria-label="Спестявания ${savings} процента">
              <span class="recommendation__pct">−${savings}%</span>
              <span class="recommendation__new muted">${newCO2}</span>
            </div>
          </li>
        `;
      })
      .join('');
    return `
      <div class="recommendations">
        <h2>По-зелени алтернативи</h2>
        <p class="muted">Препоръки за намаляване на CO₂e — сравнени с текущите параметри.</p>
        <ul class="recommendation-list">${items}</ul>
      </div>
    `;
  }

  private versionBannerHTML(
    showingRecomputed: boolean,
    usedFactor: RegionFactor | null,
    stale: boolean,
  ): string {
    if (showingRecomputed && usedFactor) {
      return `
        <div class="version-banner version-banner--recomputed" role="status">
          <span>Показани са стойности с актуалните фактори (версия ${escapeHTML(usedFactor.version)} — ${escapeHTML(usedFactor.source)}).</span>
          <button type="button" id="btn-revert" class="btn btn--ghost btn--sm">Покажи оригинала</button>
        </div>
      `;
    }
    if (stale && this.latestFactor) {
      return `
        <div class="version-banner version-banner--stale" role="status">
          <span>Налична е по-нова версия на факторите за този регион (${escapeHTML(this.latestFactor.version)}).</span>
          <button type="button" id="btn-recompute" class="btn btn--secondary btn--sm">Преизчисли с актуални</button>
        </div>
      `;
    }
    return '';
  }

  private recomputeWithLatest(): void {
    if (!this.calc || !this.latestFactor) return;
    const factor = this.latestFactor;
    const energyKWh = this.calc.result.energyKWh;
    const co2eGrams = energyKWh * factor.carbonIntensityGCO2PerKWh;
    const waterLiters = energyKWh * factor.wueLitersPerKWh;
    this.recomputed = {
      factor,
      result: CalculationResult.of(energyKWh, co2eGrams, waterLiters),
    };
    this.rerender();
  }

  private rerender(): void {
    for (const dispose of this.disposers) dispose();
    this.disposers.length = 0;
    this.root.innerHTML = this.render();
    this.onAfterRender();
  }
}

function escapeHTML(s: string): string {
  return s.replace(/[&<>"']/g, (c) =>
    c === '&' ? '&amp;' : c === '<' ? '&lt;' : c === '>' ? '&gt;' : c === '"' ? '&quot;' : '&#39;',
  );
}

function normalizedShares(
  energyKWh: number,
  co2eKg: number,
  waterLiters: number,
  locale: Locale,
): Array<{ label: string; value: number; color: string; formattedValue: string }> {
  const energyRef = 5;
  const co2Ref = 2;
  const waterRef = 10;
  const items = [
    {
      label: 'Енергия',
      raw: energyKWh,
      norm: energyKWh / energyRef,
      color: 'var(--color-energy, #f9a825)',
      formatted: formatEnergy(energyKWh, locale),
    },
    {
      label: 'CO₂e',
      raw: co2eKg,
      norm: co2eKg / co2Ref,
      color: 'var(--color-co2, #6d4c41)',
      formatted: `${formatNumber(co2eKg, 3, locale)} kg`,
    },
    {
      label: 'Вода',
      raw: waterLiters,
      norm: waterLiters / waterRef,
      color: 'var(--color-water, #0277bd)',
      formatted: formatWater(waterLiters, locale),
    },
  ];
  return items.map((it) => ({
    label: it.label,
    value: Math.max(it.norm, 0),
    color: it.color,
    formattedValue: it.formatted,
  }));
}

function metricTile(label: string, value: string, kind: 'energy' | 'co2' | 'water'): string {
  const icon =
    kind === 'energy'
      ? `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>`
      : kind === 'co2'
        ? `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z"/></svg>`
        : `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/></svg>`;
  return `
    <div class="metric-tile">
      <span class="metric-tile__icon metric-tile__icon--${kind}" aria-hidden="true">${icon}</span>
      <div class="metric-tile__body">
        <span class="metric-tile__label">${label}</span>
        <span class="metric-tile__value">${value}</span>
      </div>
    </div>
  `;
}

export default ResultView;
