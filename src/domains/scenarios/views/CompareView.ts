import { View } from '@core/view/View';
import { TOKENS } from '../../../tokens';
import { BarChart } from '@core/charts';
import type { Calculation } from '@domains/calculator/models/Calculation';
import { WorkloadLabelBG } from '@domains/calculator/models/WorkloadType';

type ChartHandle = { unmount: () => void };

export class CompareView extends View {
  private all: Calculation[] = [];
  private selectedA: string | null = null;
  private selectedB: string | null = null;
  private mounted: ChartHandle[] = [];

  protected override onBeforeRender(): void {
    const repo = this.container.resolve(TOKENS.CalculationRepository);
    const auth = this.container.resolve(TOKENS.Auth);
    const userId = auth.current().id;
    this.all = repo
      .all()
      .filter((c) => c.userId === userId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    const ids = parseIdsFromHash();
    if (ids.length >= 2 && ids[0] && ids[1]) {
      this.selectedA = ids[0];
      this.selectedB = ids[1];
    } else if (this.all.length >= 2) {
      this.selectedA = this.all[0]!.id;
      this.selectedB = this.all[1]!.id;
    } else if (this.all.length === 1) {
      this.selectedA = this.all[0]!.id;
    }
  }

  protected override render(): string {
    if (this.all.length < 2) {
      return `
        <header class="page-heading">
          <span class="page-heading__icon page-heading__icon--blue" aria-hidden="true">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="6" r="3"/><path d="M9 6h6"/><path d="M9 18h6"/><path d="M18 9v9"/></svg>
          </span>
          <div class="page-heading__main">
            <h1 class="page-heading__title">Сравнение на сценарии</h1>
            <p class="page-heading__subtitle">Нужни са поне 2 запазени изчисления.</p>
          </div>
        </header>
        <section class="card">
          <p>Все още нямате достатъчно изчисления. Започнете от <a href="#/calculator">калкулатора</a>.</p>
        </section>
      `;
    }

    const optsA = this.optionsHTML(this.selectedA);
    const optsB = this.optionsHTML(this.selectedB);
    const a = this.find(this.selectedA);
    const b = this.find(this.selectedB);

    return `
      <header class="page-heading">
        <span class="page-heading__icon page-heading__icon--blue" aria-hidden="true">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="6" r="3"/><path d="M9 6h6"/><path d="M9 18h6"/><path d="M18 9v9"/></svg>
        </span>
        <div class="page-heading__main">
          <h1 class="page-heading__title">Сравнение на сценарии</h1>
          <p class="page-heading__subtitle">Изберете два сценария от историята.</p>
        </div>
      </header>

      <section class="card">
        <div class="cmp-pick">
          <div class="field">
            <label class="field__label" for="cmp-a">Сценарий А</label>
            <select class="field__select" id="cmp-a">${optsA}</select>
          </div>
          <div class="cmp-vs" aria-hidden="true">vs</div>
          <div class="field">
            <label class="field__label" for="cmp-b">Сценарий Б</label>
            <select class="field__select" id="cmp-b">${optsB}</select>
          </div>
        </div>
      </section>

      ${a && b ? this.diffSection(a, b) : `<section class="card"><p class="muted">Изберете два различни сценария за сравнение.</p></section>`}

      <style>
        .cmp-pick {
          display: grid;
          grid-template-columns: 1fr auto 1fr;
          gap: var(--space-4);
          align-items: end;
        }
        @media (max-width: 700px) {
          .cmp-pick { grid-template-columns: 1fr; }
          .cmp-vs { display: none; }
        }
        .cmp-vs {
          font-weight: var(--fw-bold);
          color: var(--color-text-muted);
          padding-bottom: var(--space-3);
          font-size: var(--fs-lg);
        }
        .cmp-diff-grid {
          display: grid;
          grid-template-columns: minmax(0, 2fr) minmax(280px, 1fr);
          gap: var(--space-4);
        }
        @media (max-width: 900px) {
          .cmp-diff-grid { grid-template-columns: 1fr; }
        }
        .cmp-diff-cards { display: flex; flex-direction: column; gap: var(--space-3); }
        .cmp-diff-card {
          padding: var(--space-4);
          background-color: var(--color-bg-elevated);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-lg);
          box-shadow: var(--shadow-sm);
        }
        .cmp-diff-card__head { display: flex; align-items: center; gap: var(--space-3); }
        .cmp-diff-card__icon {
          width: 36px; height: 36px; border-radius: var(--radius-md);
          display: inline-flex; align-items: center; justify-content: center;
        }
        .cmp-diff-card__icon--energy { background-color: var(--color-energy-soft); color: var(--color-energy); }
        .cmp-diff-card__icon--co2 { background-color: var(--color-co2-soft); color: var(--color-co2e); }
        .cmp-diff-card__icon--water { background-color: var(--color-water-soft); color: var(--color-water); }
        .cmp-diff-card__label { font-size: var(--fs-sm); color: var(--color-text-muted); margin: 0; }
        .cmp-diff-card__delta {
          font-size: var(--fs-2xl); font-weight: var(--fw-bold);
          margin: var(--space-2) 0 4px;
        }
        .cmp-diff-card__delta--positive { color: var(--color-warning-700, #b45309); }
        .cmp-diff-card__delta--negative { color: var(--color-co2e); }
        .cmp-diff-card__delta--flat { color: var(--color-text-muted); }
        .cmp-diff-card__hint { font-size: var(--fs-sm); color: var(--color-text-muted); margin: 0; }
      </style>
    `;
  }

  private diffSection(a: Calculation, b: Calculation): string {
    return `
      <section class="cmp-diff-grid">
        <div class="dash-panel">
          <div class="dash-panel__header">
            <div>
              <h2 class="dash-panel__title">Визуално сравнение</h2>
              <p class="dash-panel__subtitle">${escapeHTML(labelOf(a))} ↔ ${escapeHTML(labelOf(b))}</p>
            </div>
          </div>
          <div data-chart="cmp" style="min-height: 280px;"></div>
        </div>
        <div class="cmp-diff-cards">
          ${this.diffCard('co2', 'CO₂e', a.result.co2eKg, b.result.co2eKg, 'kg')}
          ${this.diffCard('energy', 'Енергия', a.result.energyKWh, b.result.energyKWh, 'kWh')}
          ${this.diffCard('water', 'Вода', a.result.waterLiters, b.result.waterLiters, 'литра')}
        </div>
      </section>

      <section class="card">
        <h2 style="margin-top:0;">Детайли</h2>
        <div class="cmp-table-wrap">
          <table class="cmp-table" aria-label="Сравнение на сценарии">
            <thead>
              <tr>
                <th scope="col">Метрика</th>
                <th scope="col">${escapeHTML(labelOf(a))}</th>
                <th scope="col">${escapeHTML(labelOf(b))}</th>
              </tr>
            </thead>
            <tbody>
              ${row('Хардуер', a.params.hardware.displayName, b.params.hardware.displayName)}
              ${row('Регион', a.params.region.name, b.params.region.name)}
              ${row('Натоварване', WorkloadLabelBG[a.params.workloadType], WorkloadLabelBG[b.params.workloadType])}
              ${row('Часове', a.params.durationHours.toString(), b.params.durationHours.toString())}
              ${row('PUE', a.params.pue.toFixed(2), b.params.pue.toFixed(2))}
              ${numRow('Енергия (kWh)', a.result.energyKWh, b.result.energyKWh, 2)}
              ${numRow('CO₂e (kg)', a.result.co2eKg, b.result.co2eKg, 3)}
              ${numRow('Вода (L)', a.result.waterLiters, b.result.waterLiters, 1)}
            </tbody>
          </table>
        </div>
      </section>

      <style>
        .cmp-table-wrap { overflow-x: auto; }
        .cmp-table { width: 100%; border-collapse: collapse; font-size: var(--fs-sm); }
        .cmp-table th, .cmp-table td {
          padding: var(--space-2) var(--space-3);
          border-bottom: 1px solid var(--color-border);
          vertical-align: top;
        }
        .cmp-table th[scope="col"] { background: var(--color-bg-alt); text-align: left; }
        .cmp-table th[scope="row"] { text-align: left; font-weight: var(--fw-semibold); }
        .cmp-table td.num { text-align: right; font-variant-numeric: tabular-nums; }
      </style>
    `;
  }

  private diffCard(kind: 'energy' | 'co2' | 'water', label: string, vA: number, vB: number, unit: string): string {
    const icons: Record<typeof kind, string> = {
      energy: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>`,
      co2: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z"/></svg>`,
      water: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/></svg>`,
    };
    const diff = vB - vA;
    const flat = Math.abs(diff) < 0.005;
    const pct = vA > 0 ? (diff / vA) * 100 : null;
    const cls = flat ? 'flat' : diff > 0 ? 'positive' : 'negative';
    const sign = diff > 0 ? '+' : '';
    const decimals = kind === 'co2' ? 3 : 2;
    const deltaText = flat ? '≈ еднакво' : `${sign}${diff.toFixed(decimals)} ${unit}`;
    const pctText = pct == null || flat ? '' : ` (${sign}${pct.toFixed(1)}%)`;
    const hint = flat ? 'Без съществена разлика' : diff > 0 ? 'Б е по-зле от А' : 'Б е по-добре от А';
    return `
      <article class="cmp-diff-card">
        <div class="cmp-diff-card__head">
          <span class="cmp-diff-card__icon cmp-diff-card__icon--${kind}" aria-hidden="true">${icons[kind]}</span>
          <p class="cmp-diff-card__label">${label}</p>
        </div>
        <div class="cmp-diff-card__delta cmp-diff-card__delta--${cls}">${deltaText}${pctText}</div>
        <p class="cmp-diff-card__hint">${hint}</p>
      </article>
    `;
  }

  protected override onAfterRender(): void {
    const selA = this.root.querySelector<HTMLSelectElement>('#cmp-a');
    const selB = this.root.querySelector<HTMLSelectElement>('#cmp-b');
    if (selA) {
      this.on('#cmp-a', 'change', () => {
        this.selectedA = selA.value || null;
        this.rerender();
      });
    }
    if (selB) {
      this.on('#cmp-b', 'change', () => {
        this.selectedB = selB.value || null;
        this.rerender();
      });
    }

    const a = this.find(this.selectedA);
    const b = this.find(this.selectedB);
    if (!a || !b) return;
    const host = this.root.querySelector<HTMLElement>('[data-chart="cmp"]');
    if (!host) return;
    const data = [
      { label: 'CO₂e (kg)', value: a.result.co2eKg, color: '#2e7d32', formattedValue: `А: ${a.result.co2eKg.toFixed(3)}` },
      { label: 'CO₂e (kg) — Б', value: b.result.co2eKg, color: '#81c784', formattedValue: `Б: ${b.result.co2eKg.toFixed(3)}` },
      { label: 'Енергия (kWh)', value: a.result.energyKWh, color: '#ef6c00', formattedValue: `А: ${a.result.energyKWh.toFixed(2)}` },
      { label: 'Енергия (kWh) — Б', value: b.result.energyKWh, color: '#ffb74d', formattedValue: `Б: ${b.result.energyKWh.toFixed(2)}` },
      { label: 'Вода (L)', value: a.result.waterLiters, color: '#0277bd', formattedValue: `А: ${a.result.waterLiters.toFixed(1)}` },
      { label: 'Вода (L) — Б', value: b.result.waterLiters, color: '#4fc3f7', formattedValue: `Б: ${b.result.waterLiters.toFixed(1)}` },
    ];
    const chart = new BarChart({
      title: 'Сравнение на отпечатъка',
      description: 'Стълбовидна диаграма със стойностите на двата сценария по три метрики.',
      data,
    });
    chart.mount(host);
    this.mounted.push(chart);
    this.disposers.push(() => {
      for (const c of this.mounted) c.unmount();
      this.mounted = [];
    });
  }

  private optionsHTML(selected: string | null): string {
    return this.all
      .map((c) => {
        const sel = c.id === selected ? ' selected' : '';
        const date = c.createdAt.toLocaleDateString('bg-BG');
        const label = c.label?.trim() || `${c.params.hardware.displayName} · ${c.params.durationHours} ч.`;
        return `<option value="${c.id}"${sel}>${escapeHTML(label)} (${date})</option>`;
      })
      .join('');
  }

  private find(id: string | null): Calculation | null {
    if (!id) return null;
    return this.all.find((c) => c.id === id) ?? null;
  }

  private rerender(): void {
    for (const dispose of this.disposers) dispose();
    this.disposers.length = 0;
    this.mounted = [];
    this.root.innerHTML = this.render();
    this.onAfterRender();
  }
}

function row(label: string, vA: string, vB: string): string {
  return `<tr><th scope="row">${label}</th><td>${escapeHTML(vA)}</td><td>${escapeHTML(vB)}</td></tr>`;
}

function numRow(label: string, vA: number, vB: number, dec: number): string {
  return `<tr><th scope="row">${label}</th><td class="num">${vA.toFixed(dec)}</td><td class="num">${vB.toFixed(dec)}</td></tr>`;
}

function labelOf(c: Calculation): string {
  return c.label?.trim() || `${c.params.hardware.displayName} · ${c.createdAt.toLocaleDateString('bg-BG')}`;
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

export default CompareView;
