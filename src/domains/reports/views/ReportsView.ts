import { View } from '@core/view/View';
import { TOKENS } from '../../../tokens';
import { CSVExporter } from '../services/CSVExporter';
import { PDFExporter } from '../services/PDFExporter';
import type { ReportData, ReportFilter } from '../services/ReportsService';

type FormatChoice = 'csv' | 'pdf';

export class ReportsView extends View {
  private format: FormatChoice = 'csv';
  private from: Date | null = null;
  private to: Date | null = null;
  private current: ReportData | null = null;
  private message: { kind: 'info' | 'error'; text: string } | null = null;
  private busy = false;

  protected override onBeforeRender(): void {
    this.recompute();
  }

  protected override render(): string {
    const r = this.current;
    return `
      <section class="card stack-4">
        <header>
          <h1>Отчети</h1>
          <p class="muted">Експортирайте обобщение на изчисленията си в CSV или PDF.</p>
        </header>

        <form id="reports-form" class="reports-form" novalidate>
          <div class="grid-3">
            <div class="field">
              <label class="field__label" for="r-from">От</label>
              <input class="field__input" id="r-from" name="from" type="date" value="${isoDate(this.from)}" />
            </div>
            <div class="field">
              <label class="field__label" for="r-to">До</label>
              <input class="field__input" id="r-to" name="to" type="date" value="${isoDate(this.to)}" />
            </div>
            <div class="field">
              <span class="field__label">Формат</span>
              <div class="format-toggle" role="radiogroup" aria-label="Формат за експорт">
                <label class="format-toggle__option">
                  <input type="radio" name="format" value="csv" ${this.format === 'csv' ? 'checked' : ''} />
                  <span>CSV</span>
                </label>
                <label class="format-toggle__option">
                  <input type="radio" name="format" value="pdf" ${this.format === 'pdf' ? 'checked' : ''} />
                  <span>PDF</span>
                </label>
              </div>
            </div>
          </div>
          <div class="auth-actions">
            <button type="reset" class="btn btn--ghost">Изчисти</button>
          </div>
        </form>

        ${r ? this.summaryHTML(r) : ''}

        <div class="reports-actions">
          <button type="button" class="btn btn--primary" id="btn-export"
            ${!r || r.totals.count === 0 || this.busy ? 'disabled' : ''}>
            ${this.busy ? 'Подготовка…' : 'Експорт'}
          </button>
        </div>

        ${this.message ? `<div class="reports-message reports-message--${this.message.kind}" role="status">${escapeHTML(this.message.text)}</div>` : ''}
      </section>

      <style>
        .reports-form { margin-bottom: var(--space-4); }
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
        .reports-summary {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
          gap: var(--space-3);
          padding: var(--space-3);
          background: var(--color-surface-2, #f4f6f8);
          border-radius: var(--radius-md, 8px);
        }
        .reports-summary__cell { display: flex; flex-direction: column; }
        .reports-summary__label {
          font-size: var(--fs-sm); color: var(--color-text-muted); text-transform: uppercase; letter-spacing: 0.5px;
        }
        .reports-summary__value { font-size: var(--fs-xl, 1.25rem); font-weight: var(--fw-semibold, 600); }
        .reports-actions { display: flex; gap: var(--space-3); }
        .reports-message {
          margin-top: var(--space-3);
          padding: var(--space-3);
          border-radius: var(--radius-md, 8px);
        }
        .reports-message--info {
          background: color-mix(in srgb, var(--color-primary, #2e7d32) 10%, transparent);
        }
        .reports-message--error {
          background: color-mix(in srgb, var(--color-danger, #b00020) 10%, transparent);
          color: var(--color-danger, #b00020);
        }
      </style>
    `;
  }

  private summaryHTML(r: ReportData): string {
    return `
      <div class="reports-summary" aria-live="polite">
        <div class="reports-summary__cell">
          <span class="reports-summary__label">Записи</span>
          <span class="reports-summary__value">${r.totals.count}</span>
        </div>
        <div class="reports-summary__cell">
          <span class="reports-summary__label">Енергия (kWh)</span>
          <span class="reports-summary__value">${r.totals.energyKWh.toFixed(2)}</span>
        </div>
        <div class="reports-summary__cell">
          <span class="reports-summary__label">CO₂e (kg)</span>
          <span class="reports-summary__value">${r.totals.co2eKg.toFixed(3)}</span>
        </div>
        <div class="reports-summary__cell">
          <span class="reports-summary__label">Вода (L)</span>
          <span class="reports-summary__value">${r.totals.waterLiters.toFixed(2)}</span>
        </div>
      </div>
    `;
  }

  protected override onAfterRender(): void {
    this.on('#reports-form', 'change', () => this.readForm());
    this.on('#reports-form', 'input', () => this.readForm());
    this.on('#reports-form', 'reset', () => {
      this.from = null;
      this.to = null;
      this.format = 'csv';
      this.message = null;
      queueMicrotask(() => this.rerender());
    });
    const btn = this.root.querySelector<HTMLButtonElement>('#btn-export');
    btn?.addEventListener('click', () => void this.runExport());
  }

  private readForm(): void {
    const form = this.$<HTMLFormElement>('#reports-form');
    const data = new FormData(form);
    const fromStr = String(data.get('from') ?? '');
    const toStr = String(data.get('to') ?? '');
    this.from = fromStr ? new Date(fromStr) : null;
    this.to = toStr ? endOfDay(toStr) : null;
    const fmt = String(data.get('format') ?? 'csv');
    this.format = fmt === 'pdf' ? 'pdf' : 'csv';
    this.recompute();
    this.rerender();
  }

  private recompute(): void {
    const auth = this.container.resolve(TOKENS.Auth);
    const reports = this.container.resolve(TOKENS.Reports);
    const user = auth.current();
    const filter: ReportFilter = {
      userId: user.id,
      from: this.from,
      to: this.to,
    };
    this.current = reports.build(filter);
  }

  private async runExport(): Promise<void> {
    if (!this.current || this.current.totals.count === 0) return;
    this.busy = true;
    this.message = null;
    this.rerender();
    try {
      const blob =
        this.format === 'csv'
          ? new CSVExporter().exportCalculations(this.current.calculations)
          : await new PDFExporter().export({
              title: 'AICO — Доклад за изчисления',
              subtitle: this.subtitleForFilter(),
              generatedAt: new Date(),
              totals: this.current.totals,
              calculations: this.current.calculations,
            });
      const filename = this.makeFilename();
      downloadBlob(blob, filename);
      this.message = { kind: 'info', text: `Файлът ${filename} беше свален.` };
    } catch (err) {
      console.error('[ReportsView] export failed:', err);
      this.message = { kind: 'error', text: 'Експортът не успя. Опитайте отново.' };
    } finally {
      this.busy = false;
      this.rerender();
    }
  }

  private subtitleForFilter(): string {
    const from = this.from ? this.from.toISOString().slice(0, 10) : 'beginning';
    const to = this.to ? this.to.toISOString().slice(0, 10) : 'today';
    return `Period: ${from} — ${to}`;
  }

  private makeFilename(): string {
    const stamp = new Date().toISOString().slice(0, 10);
    const ext = this.format === 'csv' ? 'csv' : 'pdf';
    return `aico-report-${stamp}.${ext}`;
  }

  private rerender(): void {
    for (const dispose of this.disposers) dispose();
    this.disposers.length = 0;
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

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function escapeHTML(s: string): string {
  return s.replace(/[&<>"']/g, (c) =>
    c === '&' ? '&amp;' : c === '<' ? '&lt;' : c === '>' ? '&gt;' : c === '"' ? '&quot;' : '&#39;',
  );
}

export default ReportsView;
