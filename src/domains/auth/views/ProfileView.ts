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
      <section class="card stack-4 auth-card">
        <header>
          <h1>Профил</h1>
        </header>

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
