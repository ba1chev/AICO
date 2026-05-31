import { View } from '@core/view/View';
import { TOKENS } from '../../../tokens';
import type { Hardware } from '../models/Hardware';
import type { Region } from '../models/Region';
import { CalculationParams } from '../models/CalculationParams';
import { Calculation } from '../models/Calculation';
import type { CalculationResult } from '../models/CalculationResult';
import { ValidationError } from '@core/errors/ValidationError';
import { generateId } from '@core/utils/id';
import { WorkloadLabelBG, WorkloadTypes, type WorkloadType } from '../models/WorkloadType';

export class CalculatorView extends View {
  private hardware: Hardware[] = [];
  private regions: Region[] = [];
  private latestResult: { calc: Calculation; result: CalculationResult } | null = null;

  protected override async onBeforeRender(): Promise<void> {
    const hwService = this.container.resolve(TOKENS.HardwareProfile);
    const rgCatalog = this.container.resolve(TOKENS.RegionCatalog);
    const prefs = this.container.resolve(TOKENS.Preferences).get();
    const [hardware, regions] = await Promise.all([hwService.merged(), rgCatalog.all()]);
    this.hardware = hardware;
    this.regions = regions;
    void prefs;
  }

  protected override render(): string {
    const prefs = this.container.resolve(TOKENS.Preferences).get();
    const hwOptions = this.hardware
      .map((h) => {
        const sel = h.id === prefs.defaults.hardwareId ? ' selected' : '';
        return `<option value="${h.id}"${sel}>${h.displayName} — ${h.powerWatts}W</option>`;
      })
      .join('');
    const rgOptions = this.regions
      .map((r) => {
        const sel = r.id === prefs.defaults.regionId ? ' selected' : '';
        return `<option value="${r.id}" data-pue="${r.defaultPUE}"${sel}>${r.name} (${r.carbonIntensityGCO2PerKWh} gCO₂/kWh)</option>`;
      })
      .join('');
    const wlOptions = WorkloadTypes.map(
      (w) => `<option value="${w}">${WorkloadLabelBG[w]}</option>`,
    ).join('');
    const defaultPue = String(prefs.defaults.pue ?? 1.4);

    return `
      <header class="page-heading">
        <span class="page-heading__icon page-heading__icon--green" aria-hidden="true">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="2" width="16" height="20" rx="2"/><line x1="8" y1="6" x2="16" y2="6"/><circle cx="9" cy="11" r="1"/><circle cx="12" cy="11" r="1"/><circle cx="15" cy="11" r="1"/><circle cx="9" cy="14" r="1"/><circle cx="12" cy="14" r="1"/><circle cx="15" cy="14" r="1"/><line x1="8" y1="18" x2="12" y2="18"/></svg>
        </span>
        <div class="page-heading__main">
          <h1 class="page-heading__title">Калкулатор на отпечатъка</h1>
          <p class="page-heading__subtitle">Изберете хардуер, локация и продължителност за моментална оценка.</p>
        </div>
      </header>

      <div class="calc-grid">
        <form id="calc-form" class="calc-form" novalidate>
          <section class="card calc-section">
            <header class="calc-section__head">
              <h2 class="calc-section__title">Основни параметри</h2>
              <p class="calc-section__subtitle">Хардуер, локация и натоварване.</p>
            </header>

            <div class="field">
              <label class="field__label" for="label">Име на задачата</label>
              <input class="field__input" type="text" id="label" name="label"
                maxlength="120" placeholder="Напр. Тренирене на ResNet-50" />
              <span class="field__hint">По избор. Помага да разпознавате задачите в историята.</span>
            </div>

            <div class="grid-2">
              <div class="field">
                <label class="field__label" for="hardware">Хардуер</label>
                <select class="field__select" id="hardware" name="hardware" required>${hwOptions}</select>
              </div>
              <div class="field">
                <label class="field__label" for="hardwareCount">Брой устройства</label>
                <input class="field__input" type="number" id="hardwareCount" name="hardwareCount"
                  min="1" step="1" value="1" required />
              </div>
              <div class="field">
                <label class="field__label" for="region">Локация на центъра за данни</label>
                <select class="field__select" id="region" name="region" required>${rgOptions}</select>
                <span class="field__hint">PUE се попълва автоматично от региона.</span>
              </div>
              <div class="field">
                <label class="field__label" for="workloadType">Тип натоварване</label>
                <select class="field__select" id="workloadType" name="workloadType" required>${wlOptions}</select>
              </div>
              <div class="field">
                <label class="field__label" for="durationHours">Продължителност (часове)</label>
                <input class="field__input" type="number" id="durationHours" name="durationHours"
                  min="0.1" step="0.1" value="10" required />
              </div>
            </div>
          </section>

          <section class="card calc-section">
            <header class="calc-section__head">
              <h2 class="calc-section__title">Ефективност</h2>
              <p class="calc-section__subtitle">Параметри, отразяващи реалното натоварване и ефективност на инфраструктурата.</p>
            </header>

            <div class="grid-2">
              <div class="field">
                <label class="field__label" for="pue">PUE (1.0 – 3.0)</label>
                <input class="field__input" type="number" id="pue" name="pue"
                  min="1" max="3" step="0.05" value="${defaultPue}" required />
                <span class="field__hint">Power Usage Effectiveness на дейтацентъра.</span>
              </div>
              <div class="field">
                <label class="field__label" for="utilization">Натоварване (0 – 1)</label>
                <input class="field__input" type="number" id="utilization" name="utilization"
                  min="0.05" max="1" step="0.05" value="0.85" required />
                <span class="field__hint">Среден коефициент на използване на хардуера.</span>
              </div>
            </div>

            <div id="form-errors" class="field__error" role="alert" aria-live="polite"></div>

            <div class="calc-actions">
              <button type="reset" class="btn btn--ghost">Изчисти</button>
              <button type="submit" class="btn btn--primary">Изчисли</button>
            </div>
          </section>
        </form>

        <aside class="calc-preview" aria-live="polite" id="calc-preview">
          ${this.previewHTML()}
        </aside>
      </div>

      <style>
        .calc-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: var(--space-4);
        }
        @media (min-width: 1024px) {
          .calc-grid { grid-template-columns: minmax(0, 1.6fr) minmax(320px, 1fr); align-items: start; }
        }
        .calc-form { display: flex; flex-direction: column; gap: var(--space-4); margin: 0; }
        .calc-section { padding: var(--space-5); }
        .calc-section__head { margin-bottom: var(--space-4); }
        .calc-section__title { margin: 0; font-size: var(--fs-lg); font-weight: var(--fw-semibold); }
        .calc-section__subtitle { margin: 4px 0 0; font-size: var(--fs-sm); color: var(--color-text-muted); }
        .calc-actions {
          display: flex; gap: var(--space-3); justify-content: flex-end;
          margin-top: var(--space-4);
        }
        .calc-preview {
          position: sticky;
          top: calc(var(--space-6) + 64px);
          background-color: var(--color-bg-elevated);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-lg);
          box-shadow: var(--shadow-sm);
          padding: var(--space-5);
          align-self: start;
        }
        .calc-preview__head {
          display: flex; align-items: center; gap: var(--space-3);
          margin-bottom: var(--space-4);
        }
        .calc-preview__head h2 { margin: 0; font-size: var(--fs-lg); font-weight: var(--fw-semibold); }
        .calc-preview__empty {
          display: flex; flex-direction: column; align-items: center; gap: var(--space-2);
          padding: var(--space-6) var(--space-3); text-align: center; color: var(--color-text-muted);
        }
        .calc-preview__empty-icon {
          width: 72px; height: 72px; border-radius: 50%;
          background-color: var(--color-co2-soft); color: var(--color-co2e);
          display: inline-flex; align-items: center; justify-content: center;
        }
        .calc-preview__rows { display: flex; flex-direction: column; gap: var(--space-3); }
        .calc-preview__row {
          display: flex; align-items: center; gap: var(--space-3);
          padding: var(--space-3); border: 1px solid var(--color-border); border-radius: var(--radius-md);
          background-color: var(--color-bg);
        }
        .calc-preview__row-icon {
          width: 40px; height: 40px; border-radius: var(--radius-md);
          display: inline-flex; align-items: center; justify-content: center; flex-shrink: 0;
        }
        .calc-preview__row-icon--energy { background-color: var(--color-energy-soft); color: var(--color-energy); }
        .calc-preview__row-icon--co2 { background-color: var(--color-co2-soft); color: var(--color-co2e); }
        .calc-preview__row-icon--water { background-color: var(--color-water-soft); color: var(--color-water); }
        .calc-preview__row-body { display: flex; flex-direction: column; min-width: 0; flex: 1; }
        .calc-preview__row-label { font-size: var(--fs-sm); color: var(--color-text-muted); }
        .calc-preview__row-value { font-size: var(--fs-xl); font-weight: var(--fw-bold); color: var(--color-text); }
        .calc-preview__row-unit { font-size: var(--fs-sm); color: var(--color-text-muted); margin-left: 4px; font-weight: var(--fw-normal); }
        .calc-preview__cta { display: flex; gap: var(--space-2); margin-top: var(--space-4); }
      </style>
    `;
  }

  private previewHTML(): string {
    const r = this.latestResult;
    if (!r) {
      return `
        <div class="calc-preview__head">
          <h2>Преглед</h2>
        </div>
        <div class="calc-preview__empty">
          <span class="calc-preview__empty-icon" aria-hidden="true">
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 2"/></svg>
          </span>
          <p style="margin:0; font-weight: var(--fw-semibold); color: var(--color-text);">Готови за изчисление</p>
          <p style="margin:0;">Попълнете параметрите и натиснете „Изчисли“, за да видите резултата.</p>
        </div>
      `;
    }
    const { result, calc } = r;
    const titleLabel = calc.label?.trim() || 'Резултат';
    return `
      <div class="calc-preview__head">
        <h2>${escapeHTML(titleLabel)}</h2>
      </div>
      <div class="calc-preview__rows">
        <div class="calc-preview__row">
          <span class="calc-preview__row-icon calc-preview__row-icon--energy" aria-hidden="true">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
          </span>
          <div class="calc-preview__row-body">
            <span class="calc-preview__row-label">Енергия</span>
            <span class="calc-preview__row-value">${result.energyKWh.toFixed(2)}<span class="calc-preview__row-unit">kWh</span></span>
          </div>
        </div>
        <div class="calc-preview__row">
          <span class="calc-preview__row-icon calc-preview__row-icon--co2" aria-hidden="true">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z"/></svg>
          </span>
          <div class="calc-preview__row-body">
            <span class="calc-preview__row-label">CO₂e</span>
            <span class="calc-preview__row-value">${result.co2eKg.toFixed(2)}<span class="calc-preview__row-unit">kg</span></span>
          </div>
        </div>
        <div class="calc-preview__row">
          <span class="calc-preview__row-icon calc-preview__row-icon--water" aria-hidden="true">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/></svg>
          </span>
          <div class="calc-preview__row-body">
            <span class="calc-preview__row-label">Вода</span>
            <span class="calc-preview__row-value">${result.waterLiters.toFixed(2)}<span class="calc-preview__row-unit">литра</span></span>
          </div>
        </div>
      </div>
      <div class="calc-preview__cta">
        <a class="btn btn--primary" href="#/result/${calc.id}">Виж детайли</a>
      </div>
    `;
  }

  protected override onAfterRender(): void {
    this.on('#region', 'change', () => this.syncPUEFromRegion());
    this.on('#calc-form', 'submit', (e) => {
      e.preventDefault();
      void this.handleSubmit();
    });
    this.syncPUEFromRegion();
  }

  private syncPUEFromRegion(): void {
    const select = this.$<HTMLSelectElement>('#region');
    const opt = select.options[select.selectedIndex];
    const pue = opt?.dataset['pue'];
    if (pue) {
      this.$<HTMLInputElement>('#pue').value = pue;
    }
  }

  private async handleSubmit(): Promise<void> {
    const errBox = this.$('#form-errors');
    errBox.textContent = '';

    const f = this.$<HTMLFormElement>('#calc-form');
    const data = new FormData(f);

    const hwId = String(data.get('hardware') ?? '');
    const rgId = String(data.get('region') ?? '');
    const hardware = this.hardware.find((h) => h.id === hwId);
    const region = this.regions.find((r) => r.id === rgId);
    if (!hardware || !region) {
      errBox.textContent = 'Не е избран хардуер или регион.';
      return;
    }

    try {
      const params = CalculationParams.create({
        hardware,
        region,
        durationHours: Number(data.get('durationHours')),
        pue: Number(data.get('pue')),
        utilization: Number(data.get('utilization')),
        hardwareCount: Number(data.get('hardwareCount')),
        workloadType: String(data.get('workloadType')) as WorkloadType,
      });

      const engine = this.container.resolve(TOKENS.CalculationEngine);
      const result = engine.compute(params);
      const auth = this.container.resolve(TOKENS.Auth);
      const user = auth.current();
      const userId = user.isAuthenticated() ? user.id : null;
      const factors = this.container.resolve(TOKENS.RegionFactors);
      const latest = await factors.latestFor(region.id);
      const labelRaw = String(data.get('label') ?? '').trim();
      const label = labelRaw.length > 0 ? labelRaw : null;
      const calc = new Calculation(
        generateId(),
        params,
        result,
        new Date(),
        userId,
        label,
        latest?.version ?? null,
      );

      const repo = this.container.resolve(TOKENS.CalculationRepository);
      repo.save(calc);

      this.latestResult = { calc, result };
      const previewHost = this.$('#calc-preview');
      previewHost.innerHTML = this.previewHTML();
    } catch (e) {
      if (e instanceof ValidationError) {
        errBox.innerHTML = e.errors
          .map((err) => `<div>• ${err.message}</div>`)
          .join('');
      } else {
        errBox.textContent = (e as Error).message;
      }
    }
  }
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

export default CalculatorView;
