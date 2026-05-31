import { View } from '@core/view/View';
import { TOKENS } from '../../../tokens';
import type { Hardware } from '../models/Hardware';
import type { Region } from '../models/Region';
import { CalculationParams } from '../models/CalculationParams';
import { Calculation } from '../models/Calculation';
import { ValidationError } from '@core/errors/ValidationError';
import { generateId } from '@core/utils/id';
import { WorkloadLabelBG, WorkloadTypes, type WorkloadType } from '../models/WorkloadType';

export class CalculatorView extends View {
  private hardware: Hardware[] = [];
  private regions: Region[] = [];

  protected override async onBeforeRender(): Promise<void> {
    const hwService = this.container.resolve(TOKENS.HardwareProfile);
    const rgCatalog = this.container.resolve(TOKENS.RegionCatalog);
    const [hardware, regions] = await Promise.all([hwService.merged(), rgCatalog.all()]);
    this.hardware = hardware;
    this.regions = regions;
  }

  protected override render(): string {
    const hwOptions = this.hardware
      .map((h) => `<option value="${h.id}">${h.displayName} — ${h.powerWatts}W</option>`)
      .join('');
    const rgOptions = this.regions
      .map(
        (r) =>
          `<option value="${r.id}" data-pue="${r.defaultPUE}">${r.name} (${r.carbonIntensityGCO2PerKWh} gCO₂/kWh)</option>`,
      )
      .join('');
    const wlOptions = WorkloadTypes.map(
      (w) => `<option value="${w}">${WorkloadLabelBG[w]}</option>`,
    ).join('');

    return `
      <section class="card">
        <h1 class="app-main__title">Калкулатор за екологичен отпечатък</h1>
        <p class="app-main__subtitle">
          Изберете хардуер и регион, въведете продължителност и натиснете „Изчисли“.
        </p>

        <form id="calc-form" novalidate>
          <div class="grid-2">
            <div>
              <div class="field">
                <label class="field__label" for="hardware">Хардуер</label>
                <select class="field__select" id="hardware" name="hardware" required>
                  ${hwOptions}
                </select>
              </div>
              <div class="field">
                <label class="field__label" for="hardwareCount">Брой устройства</label>
                <input class="field__input" type="number" id="hardwareCount" name="hardwareCount"
                  min="1" step="1" value="1" required />
              </div>
              <div class="field">
                <label class="field__label" for="region">Регион</label>
                <select class="field__select" id="region" name="region" required>
                  ${rgOptions}
                </select>
                <span class="field__hint">PUE се попълва автоматично от региона.</span>
              </div>
              <div class="field">
                <label class="field__label" for="workloadType">Тип натоварване</label>
                <select class="field__select" id="workloadType" name="workloadType" required>
                  ${wlOptions}
                </select>
              </div>
            </div>
            <div>
              <div class="field">
                <label class="field__label" for="durationHours">Продължителност (часове)</label>
                <input class="field__input" type="number" id="durationHours" name="durationHours"
                  min="0.1" step="0.1" value="10" required />
              </div>
              <div class="field">
                <label class="field__label" for="pue">PUE (1.0 – 3.0)</label>
                <input class="field__input" type="number" id="pue" name="pue"
                  min="1" max="3" step="0.05" value="1.4" required />
                <span class="field__hint">Power Usage Effectiveness на дейтацентъра.</span>
              </div>
              <div class="field">
                <label class="field__label" for="utilization">Натоварване (0 – 1)</label>
                <input class="field__input" type="number" id="utilization" name="utilization"
                  min="0.05" max="1" step="0.05" value="1" required />
              </div>
            </div>
          </div>

          <div id="form-errors" class="field__error" role="alert" aria-live="polite"></div>

          <div class="stack-3" style="display:flex; gap: var(--space-3); margin-top: var(--space-4);">
            <button type="submit" class="btn btn--primary">Изчисли</button>
            <button type="reset" class="btn btn--ghost">Изчисти</button>
          </div>
        </form>
      </section>
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
      const calc = new Calculation(
        generateId(),
        params,
        result,
        new Date(),
        userId,
        null,
        latest?.version ?? null,
      );

      const repo = this.container.resolve(TOKENS.CalculationRepository);
      repo.save(calc);

      const router = this.container.resolve(TOKENS.Router);
      router.navigate(`/result/${calc.id}`);
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

export default CalculatorView;
