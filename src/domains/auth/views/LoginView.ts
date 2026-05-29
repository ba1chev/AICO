import { View } from '@core/view/View';
import { TOKENS } from '../../../tokens';
import { ValidationError } from '@core/errors/ValidationError';
import { DomainError } from '@core/errors/DomainError';
import { SEED_ADMIN_EMAIL, SEED_ADMIN_PASSWORD } from '../services/seedAdmin';

export class LoginView extends View {
  protected override render(): string {
    return `
      <section class="card auth-card">
        <h1>Вход</h1>
        <p class="muted">Влезте, за да виждате история и да правите сравнения.</p>

        <form id="login-form" novalidate>
          <div class="field">
            <label class="field__label" for="email">Имейл</label>
            <input class="field__input" id="email" name="email" type="email" autocomplete="email" required />
          </div>
          <div class="field">
            <label class="field__label" for="password">Парола</label>
            <input class="field__input" id="password" name="password" type="password"
              autocomplete="current-password" required minlength="8" />
          </div>

          <div id="login-errors" class="field__error" role="alert" aria-live="polite"></div>

          <div class="auth-actions">
            <button type="submit" class="btn btn--primary">Вход</button>
            <a class="btn btn--ghost" href="#/register">Нямам профил</a>
          </div>
        </form>

        <hr />

        <div class="stack-2">
          <p class="muted">Или влезте чрез:</p>
          <div style="display:flex; gap: var(--space-2); flex-wrap: wrap;">
            <button class="btn btn--secondary" data-oauth="google" type="button">Google</button>
            <button class="btn btn--secondary" data-oauth="github" type="button">GitHub</button>
          </div>
        </div>

        <hr />

        <details>
          <summary class="muted">Демо администратор</summary>
          <p class="muted" style="margin-top: var(--space-2);">
            Имейл: <code>${SEED_ADMIN_EMAIL}</code><br />
            Парола: <code>${SEED_ADMIN_PASSWORD}</code>
          </p>
        </details>
      </section>

      <style>
        .auth-card { max-width: 480px; margin: 0 auto; }
        .auth-actions { display: flex; gap: var(--space-3); margin-top: var(--space-4); }
      </style>
    `;
  }

  protected override onAfterRender(): void {
    this.on('#login-form', 'submit', (e) => {
      e.preventDefault();
      void this.handleLogin();
    });
    this.on('[data-oauth]', 'click', (_e, btn) => {
      const provider = (btn as HTMLButtonElement).dataset['oauth'] as 'google' | 'github';
      void this.handleOAuth(provider);
    });
  }

  private async handleLogin(): Promise<void> {
    const errBox = this.$('#login-errors');
    errBox.textContent = '';
    const form = this.$<HTMLFormElement>('#login-form');
    const data = new FormData(form);
    const email = String(data.get('email') ?? '');
    const password = String(data.get('password') ?? '');

    const auth = this.container.resolve(TOKENS.Auth);
    try {
      await auth.login(email, password);
      this.container.resolve(TOKENS.Router).navigate('/');
    } catch (e) {
      this.renderError(e);
    }
  }

  private async handleOAuth(provider: 'google' | 'github'): Promise<void> {
    const errBox = this.$('#login-errors');
    errBox.textContent = 'Свързване…';
    try {
      const oauth = this.container.resolve(TOKENS.OAuth);
      const profile = await oauth.authorize(provider);
      const auth = this.container.resolve(TOKENS.Auth);
      await auth.loginWithOAuth(provider, profile.email, profile.displayName);
      this.container.resolve(TOKENS.Router).navigate('/');
    } catch (e) {
      this.renderError(e);
    }
  }

  private renderError(e: unknown): void {
    const errBox = this.$('#login-errors');
    if (e instanceof ValidationError) {
      errBox.innerHTML = e.errors.map((err) => `<div>• ${err.message}</div>`).join('');
    } else if (e instanceof DomainError) {
      errBox.textContent = e.userMessage;
    } else {
      errBox.textContent = (e as Error).message ?? 'Възникна грешка.';
    }
  }
}

export default LoginView;
