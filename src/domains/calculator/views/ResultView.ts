import { View } from '@core/view/View';
import { TOKENS } from '../../../tokens';
import { formatCO2, formatEnergy, formatWater, formatNumberBG } from '@core/utils/numbers';
import { formatDateTimeBG } from '@core/utils/date';
import { WorkloadLabelBG } from '../models/WorkloadType';
import type { Calculation } from '../models/Calculation';
import { BarChart, PieChart } from '@core/charts';

export class ResultView extends View {
  private calc: Calculation | null = null;
  private barChart: BarChart | null = null;
  private pieChart: PieChart | null = null;

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
          <div data-chart="bar"></div>
        </div>

        <div>
          <h2>Относителен дял</h2>
          <p class="muted">Нормализирано спрямо средни референтни стойности — само за визуално сравнение.</p>
          <div data-chart="pie"></div>
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
      </style>
    `;
  }

  protected override onAfterRender(): void {
    if (!this.calc) return;
    const r = this.calc.result;

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
            formattedValue: formatNumberBG(r.energyKWh, 3),
          },
          {
            label: 'CO₂e (kg)',
            value: r.co2eKg,
            color: 'var(--color-co2, #6d4c41)',
            formattedValue: formatNumberBG(r.co2eKg, 3),
          },
          {
            label: 'Вода (L)',
            value: r.waterLiters,
            color: 'var(--color-water, #0277bd)',
            formattedValue: formatNumberBG(r.waterLiters, 3),
          },
        ],
      });
      this.barChart.mount(barHost);
      this.disposers.push(() => this.barChart?.unmount());
    }

    const pieHost = this.root.querySelector<HTMLElement>('[data-chart="pie"]');
    if (pieHost) {
      const pieData = normalizedShares(r.energyKWh, r.co2eKg, r.waterLiters);
      this.pieChart = new PieChart({
        title: 'Относителен дял на показателите',
        description: 'Кръгова диаграма с дела на енергия, CO₂e и вода.',
        data: pieData,
      });
      this.pieChart.mount(pieHost);
      this.disposers.push(() => this.pieChart?.unmount());
    }
  }
}

function normalizedShares(
  energyKWh: number,
  co2eKg: number,
  waterLiters: number,
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
      formatted: formatEnergy(energyKWh),
    },
    {
      label: 'CO₂e',
      raw: co2eKg,
      norm: co2eKg / co2Ref,
      color: 'var(--color-co2, #6d4c41)',
      formatted: `${formatNumberBG(co2eKg, 3)} kg`,
    },
    {
      label: 'Вода',
      raw: waterLiters,
      norm: waterLiters / waterRef,
      color: 'var(--color-water, #0277bd)',
      formatted: formatWater(waterLiters),
    },
  ];
  return items.map((it) => ({
    label: it.label,
    value: Math.max(it.norm, 0),
    color: it.color,
    formattedValue: it.formatted,
  }));
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
