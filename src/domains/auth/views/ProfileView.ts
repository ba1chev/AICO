import { View } from '@core/view/View';
import { TOKENS } from '../../../tokens';
import { RoleLabelBG } from '../models/Role';
import { Researcher } from '../models/Researcher';
import { Organization } from '../models/Organization';
import { formatDateTimeBG } from '@core/utils/date';

export class ProfileView extends View {
  protected override render(): string {
    const auth = this.container.resolve(TOKENS.Auth);
    const user = auth.current();

    if (!user.isAuthenticated()) {
      return `
        <section class="card center">
          <h1>Не сте влезли</h1>
          <p><a class="btn btn--primary" href="#/login">Към вход</a></p>
        </section>
      `;
    }

    const extra = user instanceof Researcher && user.affiliation
      ? `<dt>Афилиация</dt><dd>${user.affiliation}</dd>`
      : user instanceof Organization
        ? `<dt>Организация</dt><dd>${user.organizationName}</dd>`
        : '';

    return `
      <header class="page-heading">
        <span class="page-heading__icon page-heading__icon--green" aria-hidden="true">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
        </span>
        <div class="page-heading__main">
          <h1 class="page-heading__title">Профил</h1>
          <p class="page-heading__subtitle">Информация за акаунта.</p>
        </div>
      </header>

      <section class="card stack-4 auth-card">
        <dl class="profile-grid">
          <dt>Име</dt><dd>${user.displayName}</dd>
          <dt>Имейл</dt><dd>${user.email}</dd>
          <dt>Роля</dt><dd>${RoleLabelBG[user.role]}</dd>
          <dt>Регистриран на</dt><dd>${formatDateTimeBG(user.createdAt)}</dd>
          ${extra}
        </dl>

        <div>
          <button id="logout-btn" class="btn btn--danger" type="button">Изход</button>
        </div>
      </section>

      <style>
        .auth-card { max-width: 520px; margin: 0 auto; }
        .profile-grid {
          display: grid;
          grid-template-columns: max-content 1fr;
          gap: var(--space-2) var(--space-4);
        }
        .profile-grid dt { font-weight: var(--fw-semibold); color: var(--color-text-muted); }
        .profile-grid dd { margin: 0; word-break: break-word; }
        @media (max-width: 480px) {
          .profile-grid { grid-template-columns: 1fr; gap: var(--space-1) 0; }
          .profile-grid dd { margin-bottom: var(--space-2); }
        }
      </style>
    `;
  }

  protected override onAfterRender(): void {
    const btn = this.root.querySelector('#logout-btn');
    if (!btn) return;
    this.on('#logout-btn', 'click', () => {
      const auth = this.container.resolve(TOKENS.Auth);
      auth.logout();
      this.container.resolve(TOKENS.Router).navigate('/');
    });
  }
}

export default ProfileView;
