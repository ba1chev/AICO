import { View } from '@core/view/View';
import { TOKENS } from '../../../tokens';
import { RoleLabelBG } from '@domains/auth/models/Role';
import type { User } from '@domains/auth/models/User';
import type { UserManagementService, ManagedRole } from '../services/UserManagementService';
import { DomainError } from '@core/errors/DomainError';
import { ValidationError } from '@core/errors/ValidationError';

const MANAGED_ROLES: ManagedRole[] = ['developer', 'researcher', 'organization', 'admin'];

export class UserManagementView extends View {
  private message: { kind: 'info' | 'error'; text: string } | null = null;

  protected override render(): string {
    const svc = this.service();
    const users = svc.list();
    const currentId = this.container.resolve(TOKENS.Auth).current().id;

    return `
      <section class="card stack-4">
        <header>
          <div class="row-between">
            <div>
              <h1>Управление на потребители</h1>
              <p class="muted">Общо: ${users.length}</p>
            </div>
            <a class="btn btn--ghost" href="#/admin">← Към администрация</a>
          </div>
        </header>

        ${this.message ? `<div class="reports-message reports-message--${this.message.kind}" role="status">${escapeHTML(this.message.text)}</div>` : ''}

        <div class="users-table-wrap">
          <table class="users-table" aria-label="Списък с потребители">
            <thead>
              <tr>
                <th>Име</th>
                <th>Имейл</th>
                <th>Роля</th>
                <th>Регистрация</th>
                <th>Статус</th>
                <th>Действия</th>
              </tr>
            </thead>
            <tbody>
              ${users.map((u) => this.rowHTML(u, currentId)).join('')}
            </tbody>
          </table>
        </div>
      </section>

      <style>
        .row-between { display: flex; justify-content: space-between; align-items: center; gap: var(--space-3); }
        .users-table-wrap { overflow-x: auto; }
        .users-table { width: 100%; border-collapse: collapse; font-size: var(--fs-sm); }
        .users-table th, .users-table td {
          padding: var(--space-2) var(--space-3);
          text-align: left;
          border-bottom: 1px solid var(--color-border, #e0e3e7);
        }
        .users-table tr.is-self td { background: color-mix(in srgb, var(--color-primary, #2e7d32) 6%, transparent); }
        .users-table tr.is-inactive td { opacity: 0.6; }
        .status-pill {
          display: inline-block; padding: 2px 8px; border-radius: 999px; font-size: var(--fs-xs);
        }
        .status-pill--active { background: color-mix(in srgb, var(--color-primary, #2e7d32) 15%, transparent); }
        .status-pill--inactive { background: color-mix(in srgb, #999 15%, transparent); color: var(--color-text-muted); }
        .users-row__actions { display: flex; gap: var(--space-2); flex-wrap: wrap; }
      </style>
    `;
  }

  private rowHTML(user: User, currentId: string): string {
    const isSelf = user.id === currentId;
    const roleOptions = MANAGED_ROLES.map(
      (r) =>
        `<option value="${r}" ${user.role === r ? 'selected' : ''}>${RoleLabelBG[r]}</option>`,
    ).join('');
    const statusClass = user.active ? 'status-pill--active' : 'status-pill--inactive';
    const statusLabel = user.active ? 'Активен' : 'Деактивиран';
    const toggleLabel = user.active ? 'Деактивирай' : 'Активирай';
    const toggleAction = user.active ? 'deactivate' : 'activate';
    return `
      <tr data-id="${user.id}" class="${isSelf ? 'is-self' : ''} ${user.active ? '' : 'is-inactive'}">
        <td>${escapeHTML(user.displayName)}</td>
        <td>${escapeHTML(user.email)}</td>
        <td>
          <select class="field__select" data-action="role" data-id="${user.id}" ${isSelf ? 'disabled' : ''}>
            ${roleOptions}
          </select>
        </td>
        <td>${user.createdAt.toLocaleDateString('bg-BG')}</td>
        <td><span class="status-pill ${statusClass}">${statusLabel}</span></td>
        <td>
          <div class="users-row__actions">
            <button class="btn btn--ghost" type="button"
              data-action="${toggleAction}" data-id="${user.id}" ${isSelf ? 'disabled' : ''}>
              ${toggleLabel}
            </button>
          </div>
        </td>
      </tr>
    `;
  }

  protected override onAfterRender(): void {
    for (const sel of this.$$<HTMLSelectElement>('select[data-action="role"]')) {
      sel.addEventListener('change', () => {
        const id = sel.dataset['id']!;
        const next = sel.value as ManagedRole;
        this.run(() => this.service().changeRole(id, next));
      });
    }

    for (const btn of this.$$<HTMLButtonElement>('button[data-action="deactivate"], button[data-action="activate"]')) {
      btn.addEventListener('click', () => {
        const id = btn.dataset['id']!;
        const action = btn.dataset['action'];
        this.run(() =>
          action === 'activate' ? this.service().activate(id) : this.service().deactivate(id),
        );
      });
    }
  }

  private run(fn: () => void): void {
    try {
      fn();
      this.message = { kind: 'info', text: 'Промяната е запазена.' };
    } catch (err) {
      if (err instanceof DomainError) {
        this.message = { kind: 'error', text: err.userMessage };
      } else if (err instanceof ValidationError) {
        this.message = { kind: 'error', text: err.errors[0]?.message ?? 'Невалидни данни.' };
      } else {
        this.message = { kind: 'error', text: 'Възникна грешка.' };
        console.error('[UserManagementView]', err);
      }
    }
    this.rerender();
  }

  private service(): UserManagementService {
    return this.container.resolve(TOKENS.UserManagement);
  }

  private rerender(): void {
    for (const dispose of this.disposers) dispose();
    this.disposers.length = 0;
    this.root.innerHTML = this.render();
    this.onAfterRender();
  }
}

function escapeHTML(s: string | null | undefined): string {
  if (s == null) return '';
  return s.replace(/[&<>"']/g, (c) =>
    c === '&' ? '&amp;' : c === '<' ? '&lt;' : c === '>' ? '&gt;' : c === '"' ? '&quot;' : '&#39;',
  );
}

export default UserManagementView;
