import { View } from '@core/view/View';
import { TOKENS } from '../../../tokens';
import type { Calculation } from '@domains/calculator/models/Calculation';
import { WorkloadLabelBG } from '@domains/calculator/models/WorkloadType';
import { ScenarioComparisonService } from '@domains/scenarios/services/ScenarioComparisonService';

export class CompareView extends View {
  private calculations: Calculation[] = [];

  protected override onBeforeRender(): void {
    const ids = parseIdsFromHash();
    const max = ScenarioComparisonService.limits.max;
    const repo = this.container.resolve(TOKENS.CalculationRepository);
    const auth = this.container.resolve(TOKENS.Auth);
    const userId = auth.current().id;
    const owned = new Set(repo.all().filter((c) => c.userId === userId).map((c) => c.id));
    this.calculations = ids
      .filter((id) => owned.has(id))
      .slice(0, max)
      .map((id) => repo.findById(id))
      .filter((c): c is Calculation => c !== null);
  }

  protected override render(): string {
    const { min, max } = ScenarioComparisonService.limits;
    if (this.calculations.length < min) {
      return `
        <section class="card">
          <h1>Сравнение</h1>
          <p>Изберете между ${min} и ${max} изчисления от <a href="#/history">историята</a>.</p>
        </section>
      `;
    }

    const headers = this.calculations
      .map(
        (c, i) => `
          <th scope="col">
            <div class="cmp-head">
              <span class="cmp-head__idx">Сценарий ${String.fromCharCode(65 + i)}</span>
              <span class="cmp-head__date">${c.createdAt.toLocaleDateString('bg-BG')}</span>
              <a class="btn btn--ghost" href="#/result/${c.id}">Виж</a>
            </div>
          </th>`,
      )
      .join('');

    const energy = this.calculations.map((c) => c.result.energyKWh);
    const co2 = this.calculations.map((c) => c.result.co2eKg);
    const water = this.calculations.map((c) => c.result.waterLiters);

    return `
      <section class="card">
        <h1>Сравнение на сценарии</h1>
        <p class="muted">Сравняваме ${this.calculations.length} изчисления. Зеленото е най-добрият (по-малък отпечатък), червеното — най-лошият.</p>

        <div class="cmp-actions">
          <a class="btn btn--ghost" href="#/history">← Към историята</a>
        </div>

        <div class="cmp-table-wrap">
          <table class="cmp-table" aria-label="Сравнение на сценарии">
            <thead>
              <tr>
                <th scope="col">Метрика</th>
                ${headers}
              </tr>
            </thead>
            <tbody>
              ${this.row('Хардуер', this.calculations.map((c) => c.params.hardware.displayName))}
              ${this.row('Регион', this.calculations.map((c) => c.params.region.name))}
              ${this.row('Натоварване', this.calculations.map((c) => WorkloadLabelBG[c.params.workloadType]))}
              ${this.row('Часове', this.calculations.map((c) => c.params.durationHours.toString()))}
              ${this.row('PUE', this.calculations.map((c) => c.params.pue.toFixed(2)))}
              ${this.numericRow('Енергия (kWh)', energy, (n) => n.toFixed(2))}
              ${this.numericRow('CO₂e (kg)', co2, (n) => n.toFixed(3))}
              ${this.numericRow('Вода (L)', water, (n) => n.toFixed(1))}
            </tbody>
          </table>
        </div>
      </section>

      <style>
        .cmp-actions { margin: var(--space-3) 0; }
        .cmp-table-wrap { overflow-x: auto; }
        .cmp-table { width: 100%; border-collapse: collapse; font-size: var(--fs-sm); }
        .cmp-table th, .cmp-table td {
          padding: var(--space-2) var(--space-3);
          border-bottom: 1px solid var(--color-border, #e0e3e7);
          vertical-align: top;
        }
        .cmp-table th[scope="col"] { background: var(--color-surface-2, #f4f6f8); }
        .cmp-table th[scope="row"] { text-align: left; font-weight: 600; }
        .cmp-table td.num { text-align: right; font-variant-numeric: tabular-nums; }
        .cmp-head { display: flex; flex-direction: column; gap: var(--space-1); }
        .cmp-head__idx { font-weight: 700; }
        .cmp-head__date { font-size: var(--fs-sm); color: var(--color-muted); }
        .cmp-best { background: rgba(46, 160, 67, 0.12); }
        .cmp-worst { background: rgba(207, 34, 46, 0.12); }
      </style>
    `;
  }

  private row(label: string, values: string[]): string {
    const cells = values.map((v) => `<td>${v}</td>`).join('');
    return `<tr><th scope="row">${label}</th>${cells}</tr>`;
  }

  private numericRow(label: string, values: number[], fmt: (n: number) => string): string {
    const min = Math.min(...values);
    const max = Math.max(...values);
    const same = min === max;
    const cells = values
      .map((v) => {
        const cls = same ? '' : v === min ? 'cmp-best' : v === max ? 'cmp-worst' : '';
        return `<td class="num ${cls}">${fmt(v)}</td>`;
      })
      .join('');
    return `<tr><th scope="row">${label}</th>${cells}</tr>`;
  }
}

function parseIdsFromHash(): string[] {
  const hash = window.location.hash || '';
  const qIdx = hash.indexOf('?');
  if (qIdx === -1) return [];
  const query = hash.slice(qIdx + 1);
  const params = new URLSearchParams(query);
  const raw = params.get('ids');
  if (!raw) return [];
  return raw.split(',').map((s) => s.trim()).filter(Boolean);
}

export default CompareView;
