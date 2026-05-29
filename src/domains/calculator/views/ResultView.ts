import { View } from '@core/view/View';
import { TOKENS } from '../../../tokens';
import { formatCO2, formatEnergy, formatWater, formatNumberBG } from '@core/utils/numbers';
import { formatDateTimeBG } from '@core/utils/date';
import { WorkloadLabelBG } from '../models/WorkloadType';
import type { Calculation } from '../models/Calculation';

export class ResultView extends View {
  private calc: Calculation | null = null;

  protected override onBeforeRender(): void {
    const id = this.params['id'];
    if (!id) return;
    const repo = this.container.resolve(TOKENS.CalculationRepository);
    this.calc = repo.findById(id);
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
    const r = c.result;

    return `
      <section class="card stack-4">
        <header>
          <h1>Резултат от изчислението</h1>
          <p class="muted">Създаден на ${formatDateTimeBG(c.createdAt)}</p>
        </header>

        <div class="grid-3">
          ${metricCard('Енергия', formatEnergy(r.energyKWh), 'var(--color-energy)')}
          ${metricCard('CO₂e', formatCO2(r.co2eGrams), 'var(--color-co2)')}
          ${metricCard('Вода', formatWater(r.waterLiters), 'var(--color-water)')}
        </div>

        <div>
          <h2>Графика на емисиите</h2>
          ${this.renderBarChart()}
        </div>

        <div>
          <h2>Параметри</h2>
          <dl class="result-params">
            <dt>Хардуер</dt><dd>${p.hardware.displayName} (${p.hardware.powerWatts}W) × ${p.hardwareCount}</dd>
            <dt>Регион</dt><dd>${p.region.name} — ${p.region.carbonIntensityGCO2PerKWh} gCO₂/kWh, ${p.region.wueLitersPerKWh} L/kWh</dd>
            <dt>Продължителност</dt><dd>${formatNumberBG(p.durationHours, 1)} ч.</dd>
            <dt>PUE</dt><dd>${formatNumberBG(p.pue, 2)}</dd>
            <dt>Натоварване</dt><dd>${formatNumberBG(p.utilization * 100, 0)}%</dd>
            <dt>Тип натоварване</dt><dd>${WorkloadLabelBG[p.workloadType]}</dd>
          </dl>
        </div>

        <div style="display:flex; gap: var(--space-3);">
          <a class="btn btn--primary" href="#/calculator">Ново изчисление</a>
          <a class="btn btn--secondary" href="#/history">Към историята</a>
        </div>
      </section>

      <style>
        .result-params {
          display: grid;
          grid-template-columns: max-content 1fr;
          gap: var(--space-2) var(--space-4);
        }
        .result-params dt { font-weight: var(--fw-semibold); color: var(--color-text-muted); }
        .result-params dd { margin: 0; }
        .metric-card {
          padding: var(--space-4);
          border-radius: var(--radius-md);
          background-color: var(--color-bg-alt);
          border-left: 4px solid;
        }
        .metric-card__label { font-size: var(--fs-sm); color: var(--color-text-muted); text-transform: uppercase; letter-spacing: 0.5px; }
        .metric-card__value { font-size: var(--fs-2xl); font-weight: var(--fw-bold); margin-top: var(--space-1); }
        .bar-chart text { font-family: var(--font-body); font-size: 12px; fill: var(--color-text); }
      </style>
    `;
  }

  private renderBarChart(): string {
    if (!this.calc) return '';
    const r = this.calc.result;
    const series = [
      { label: 'Енергия (kWh)', value: r.energyKWh, color: '#f9a825' },
      { label: 'CO₂e (kg)', value: r.co2eKg, color: '#6d4c41' },
      { label: 'Вода (L)', value: r.waterLiters, color: '#0277bd' },
    ];

    const width = 600;
    const height = 220;
    const padding = { top: 20, right: 20, bottom: 40, left: 110 };
    const innerW = width - padding.left - padding.right;
    const innerH = height - padding.top - padding.bottom;
    const max = Math.max(...series.map((s) => s.value), 0.001);
    const barH = innerH / series.length - 8;

    const bars = series
      .map((s, i) => {
        const w = (s.value / max) * innerW;
        const y = padding.top + i * (barH + 8);
        return `
          <g>
            <text x="${padding.left - 8}" y="${y + barH / 2 + 4}" text-anchor="end">${s.label}</text>
            <rect x="${padding.left}" y="${y}" width="${w}" height="${barH}" fill="${s.color}" rx="4">
              <title>${s.label}: ${formatNumberBG(s.value, 3)}</title>
            </rect>
            <text x="${padding.left + w + 6}" y="${y + barH / 2 + 4}">${formatNumberBG(s.value, 3)}</text>
          </g>
        `;
      })
      .join('');

    return `
      <svg class="bar-chart" viewBox="0 0 ${width} ${height}" role="img"
           aria-labelledby="chart-title chart-desc"
           style="width:100%; height:auto; max-width:${width}px;">
        <title id="chart-title">Сравнителна графика на резултатите</title>
        <desc id="chart-desc">Хоризонтална стълбовидна диаграма с енергия, CO₂e и вода.</desc>
        ${bars}
      </svg>
    `;
  }
}

function metricCard(label: string, value: string, color: string): string {
  return `
    <div class="metric-card" style="border-left-color: ${color};">
      <div class="metric-card__label">${label}</div>
      <div class="metric-card__value">${value}</div>
    </div>
  `;
}

export default ResultView;
