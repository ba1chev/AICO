import { View } from '@core/view/View';
import { TOKENS } from '../../../tokens';
import type { Hardware, HardwareCategory } from '@domains/calculator/models/Hardware';
import type {
  HardwareOverride,
  HardwareOverridePatch,
  HardwareProfileService,
} from '../services/HardwareProfileService';
import { generateId } from '@core/utils/id';

const CATEGORIES: HardwareCategory[] = ['gpu', 'tpu', 'cpu'];
const CategoryLabelBG: Record<HardwareCategory, string> = {
  gpu: 'GPU',
  tpu: 'TPU',
  cpu: 'CPU',
};

export class HardwareProfilesView extends View {
  private base: Hardware[] = [];
  private overrides: HardwareOverride[] = [];
  private editing: { id: string | null } = { id: null };
  private message: { kind: 'info' | 'error'; text: string } | null = null;

  protected override async onBeforeRender(): Promise<void> {
    const svc = this.service();
    this.overrides = svc.loadOverrides();
    const catalog = this.container.resolve(TOKENS.HardwareCatalog);
    this.base = await catalog.all();
  }

  protected override render(): string {
    const merged = buildPreview(this.base, this.overrides);
    return `
      <section class="card stack-4">
        <header>
          <div class="row-between">
            <div>
              <h1>Хардуерни профили</h1>
              <p class="muted">Override-вате параметрите от каталога. Промените се запазват локално.</p>
            </div>
            <a class="btn btn--ghost" href="#/admin">← Към администрация</a>
          </div>
        </header>

        ${this.message ? `<div class="reports-message reports-message--${this.message.kind}" role="status">${escapeHTML(this.message.text)}</div>` : ''}

        <div class="hw-actions">
          <button type="button" class="btn btn--primary" id="btn-add">Добави профил</button>
        </div>

        <div class="hw-table-wrap">
          <table class="hw-table" aria-label="Хардуерни профили">
            <thead>
              <tr>
                <th>Производител</th>
                <th>Модел</th>
                <th>Категория</th>
                <th class="num">Watts</th>
                <th>Източник</th>
                <th>Действия</th>
              </tr>
            </thead>
            <tbody>
              ${merged.map((row) => this.rowHTML(row)).join('')}
            </tbody>
          </table>
        </div>

        ${this.editing.id !== null ? this.editorHTML() : ''}
      </section>

      <style>
        .row-between { display: flex; justify-content: space-between; align-items: center; gap: var(--space-3); }
        .hw-actions { display: flex; gap: var(--space-3); }
        .hw-table-wrap { overflow-x: auto; }
        .hw-table { width: 100%; border-collapse: collapse; font-size: var(--fs-sm); }
        .hw-table th, .hw-table td {
          padding: var(--space-2) var(--space-3);
          text-align: left;
          border-bottom: 1px solid var(--color-border, #e0e3e7);
        }
        .hw-table td.num { text-align: right; font-variant-numeric: tabular-nums; }
        .hw-table tr.is-disabled td { opacity: 0.5; text-decoration: line-through; }
        .hw-source-pill {
          display: inline-block; padding: 2px 8px; border-radius: 999px; font-size: var(--fs-xs);
        }
        .hw-source-pill--catalog { background: color-mix(in srgb, #888 12%, transparent); }
        .hw-source-pill--override { background: color-mix(in srgb, var(--color-primary, #2e7d32) 15%, transparent); }
        .hw-source-pill--custom { background: color-mix(in srgb, #f57c00 15%, transparent); }
        .hw-row__actions { display: flex; gap: var(--space-2); flex-wrap: wrap; }
        .hw-editor {
          margin-top: var(--space-4);
          padding: var(--space-4);
          border: 1px solid var(--color-border, #d0d0d0);
          border-radius: var(--radius-md, 8px);
        }
        .hw-editor h2 { margin-top: 0; }
      </style>
    `;
  }

  private rowHTML(row: PreviewRow): string {
    const sourceClass = `hw-source-pill--${row.source}`;
    const sourceLabel =
      row.source === 'catalog' ? 'Каталог' : row.source === 'override' ? 'Override' : 'Custom';
    const disabledClass = row.disabled ? 'is-disabled' : '';
    const toggleLabel = row.disabled ? 'Активирай' : 'Деактивирай';
    const canRemoveCustom = row.source === 'custom';
    return `
      <tr class="${disabledClass}">
        <td>${escapeHTML(row.vendor)}</td>
        <td>${escapeHTML(row.name)}</td>
        <td>${CategoryLabelBG[row.category]}</td>
        <td class="num">${row.powerWatts}</td>
        <td><span class="hw-source-pill ${sourceClass}">${sourceLabel}</span></td>
        <td>
          <div class="hw-row__actions">
            <button class="btn btn--ghost" type="button" data-action="edit" data-id="${row.id}">Редактирай</button>
            <button class="btn btn--ghost" type="button" data-action="toggle" data-id="${row.id}">${toggleLabel}</button>
            ${canRemoveCustom ? `<button class="btn btn--ghost" type="button" data-action="remove" data-id="${row.id}">Изтрий</button>` : ''}
          </div>
        </td>
      </tr>
    `;
  }

  private editorHTML(): string {
    const id = this.editing.id!;
    const isNew = id.startsWith('new:');
    const baseHw = isNew ? null : this.base.find((h) => h.id === id) ?? null;
    const ov = this.overrides.find((o) => o.id === id) ?? null;
    const merged = ov?.patch ?? {};
    const name = merged.name ?? baseHw?.name ?? '';
    const vendor = merged.vendor ?? baseHw?.vendor ?? '';
    const category = merged.category ?? baseHw?.category ?? 'gpu';
    const powerWatts = merged.powerWatts ?? baseHw?.powerWatts ?? 0;
    const description = merged.description ?? baseHw?.description ?? '';
    const headerLabel = isNew ? 'Нов профил' : `Редакция: ${baseHw?.displayName ?? id}`;

    return `
      <form class="hw-editor stack-3" id="hw-form" novalidate>
        <h2>${escapeHTML(headerLabel)}</h2>
        <div class="grid-3">
          <div class="field">
            <label class="field__label" for="hw-vendor">Производител</label>
            <input class="field__input" id="hw-vendor" name="vendor" value="${escapeAttr(vendor)}" required />
          </div>
          <div class="field">
            <label class="field__label" for="hw-name">Модел</label>
            <input class="field__input" id="hw-name" name="name" value="${escapeAttr(name)}" required />
          </div>
          <div class="field">
            <label class="field__label" for="hw-category">Категория</label>
            <select class="field__select" id="hw-category" name="category">
              ${CATEGORIES.map(
                (c) =>
                  `<option value="${c}" ${c === category ? 'selected' : ''}>${CategoryLabelBG[c]}</option>`,
              ).join('')}
            </select>
          </div>
          <div class="field">
            <label class="field__label" for="hw-power">Power (W)</label>
            <input class="field__input" id="hw-power" name="powerWatts" type="number" min="1" step="1"
              value="${powerWatts}" required />
          </div>
          <div class="field" style="grid-column: span 2;">
            <label class="field__label" for="hw-desc">Описание</label>
            <input class="field__input" id="hw-desc" name="description" value="${escapeAttr(description)}" />
          </div>
        </div>
        <div class="auth-actions">
          <button type="submit" class="btn btn--primary">Запази</button>
          <button type="button" class="btn btn--ghost" id="btn-cancel">Отказ</button>
        </div>
      </form>
    `;
  }

  protected override onAfterRender(): void {
    for (const btn of this.$$<HTMLButtonElement>('button[data-action]')) {
      btn.addEventListener('click', () => {
        const id = btn.dataset['id']!;
        const action = btn.dataset['action'];
        if (action === 'edit') {
          this.editing.id = id;
        } else if (action === 'toggle') {
          this.toggleDisabled(id);
        } else if (action === 'remove') {
          if (!confirm('Изтриване на този профил?')) return;
          this.service().removeOverride(id);
          this.overrides = this.service().loadOverrides();
          this.message = { kind: 'info', text: 'Профилът е изтрит.' };
        }
        this.rerender();
      });
    }

    const addBtn = this.root.querySelector<HTMLButtonElement>('#btn-add');
    addBtn?.addEventListener('click', () => {
      this.editing.id = `new:${generateId()}`;
      this.rerender();
    });

    const form = this.root.querySelector<HTMLFormElement>('#hw-form');
    form?.addEventListener('submit', (e) => {
      e.preventDefault();
      this.saveFromForm();
    });

    const cancelBtn = this.root.querySelector<HTMLButtonElement>('#btn-cancel');
    cancelBtn?.addEventListener('click', () => {
      this.editing.id = null;
      this.rerender();
    });
  }

  private toggleDisabled(id: string): void {
    const existing = this.overrides.find((o) => o.id === id);
    const isCustom = existing?.custom ?? false;
    const next: HardwareOverride = existing
      ? { ...existing, disabled: !existing.disabled }
      : { id, patch: {}, custom: false, disabled: true };
    if (isCustom && next.disabled) {
      this.service().upsertOverride(next);
    } else {
      this.service().upsertOverride(next);
    }
    this.overrides = this.service().loadOverrides();
    this.message = { kind: 'info', text: 'Промяната е запазена.' };
  }

  private saveFromForm(): void {
    if (!this.editing.id) return;
    const form = this.$<HTMLFormElement>('#hw-form');
    const fd = new FormData(form);
    const description = String(fd.get('description') ?? '').trim();
    const patch: HardwareOverridePatch = {
      vendor: String(fd.get('vendor') ?? '').trim(),
      name: String(fd.get('name') ?? '').trim(),
      category: String(fd.get('category') ?? 'gpu') as HardwareCategory,
      powerWatts: Number(fd.get('powerWatts') ?? 0),
    };
    if (description) patch.description = description;
    if (!patch.name || !patch.vendor || !patch.powerWatts || patch.powerWatts <= 0) {
      this.message = { kind: 'error', text: 'Попълнете всички задължителни полета.' };
      this.rerender();
      return;
    }

    const id = this.editing.id;
    const isNew = id.startsWith('new:');
    const finalId = isNew ? id.slice(4) : id;
    const existing = this.overrides.find((o) => o.id === finalId);
    const next: HardwareOverride = {
      id: finalId,
      patch,
      custom: existing?.custom ?? isNew,
      disabled: existing?.disabled ?? false,
    };
    this.service().upsertOverride(next);
    this.overrides = this.service().loadOverrides();
    this.editing.id = null;
    this.message = { kind: 'info', text: 'Профилът е запазен.' };
    this.rerender();
  }

  private service(): HardwareProfileService {
    return this.container.resolve(TOKENS.HardwareProfile);
  }

  private rerender(): void {
    for (const dispose of this.disposers) dispose();
    this.disposers.length = 0;
    this.root.innerHTML = this.render();
    this.onAfterRender();
  }
}

interface PreviewRow {
  id: string;
  name: string;
  vendor: string;
  category: HardwareCategory;
  powerWatts: number;
  source: 'catalog' | 'override' | 'custom';
  disabled: boolean;
}

function buildPreview(base: Hardware[], overrides: HardwareOverride[]): PreviewRow[] {
  const overrideById = new Map<string, HardwareOverride>(overrides.map((o) => [o.id, o]));
  const rows: PreviewRow[] = [];
  for (const item of base) {
    const ov = overrideById.get(item.id);
    if (!ov) {
      rows.push({
        id: item.id,
        name: item.name,
        vendor: item.vendor,
        category: item.category,
        powerWatts: item.powerWatts,
        source: 'catalog',
        disabled: false,
      });
    } else {
      rows.push({
        id: item.id,
        name: ov.patch.name ?? item.name,
        vendor: ov.patch.vendor ?? item.vendor,
        category: ov.patch.category ?? item.category,
        powerWatts: ov.patch.powerWatts ?? item.powerWatts,
        source: 'override',
        disabled: ov.disabled,
      });
    }
  }
  for (const ov of overrides) {
    if (!ov.custom) continue;
    rows.push({
      id: ov.id,
      name: ov.patch.name ?? '(unnamed)',
      vendor: ov.patch.vendor ?? '',
      category: ov.patch.category ?? 'gpu',
      powerWatts: ov.patch.powerWatts ?? 0,
      source: 'custom',
      disabled: ov.disabled,
    });
  }
  return rows;
}

function escapeHTML(s: string | null | undefined): string {
  if (s == null) return '';
  return s.replace(/[&<>"']/g, (c) =>
    c === '&' ? '&amp;' : c === '<' ? '&lt;' : c === '>' ? '&gt;' : c === '"' ? '&quot;' : '&#39;',
  );
}

function escapeAttr(s: string): string {
  return escapeHTML(s);
}

export default HardwareProfilesView;
