import { View } from '@core/view/View';
import { TOKENS } from '../../../tokens';
import { ValidationError } from '@core/errors/ValidationError';
import { DomainError } from '@core/errors/DomainError';
import { SEED_ADMIN_EMAIL, SEED_ADMIN_PASSWORD } from '../services/seedAdmin';

export class LoginView extends View {
  protected override render(): string {
    return `
      <section class="card auth-card">
        <div class="auth-hero">
          <span class="auth-hero__icon" aria-hidden="true">
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z"/><path d="M2 21c0-3 1.85-5.36 5.08-6"/></svg>
          </span>
          <h1 style="margin:0;">Добре дошли в AICO</h1>
          <p class="muted" style="margin:0;">Влезте, за да виждате история и да правите сравнения.</p>
        </div>

        <form id="login-form" novalidate>
          <div class="field">
            <label class="field__label" for="email">Имейл</label>
            <input class="field__input" id="email" name="email" type="email" autocomplete="email" required />
          </div>
          <div class="field">
            <div class="field__label-row">
              <label class="field__label" for="password">Парола</label>
              <a class="field__link" href="#/login" id="forgot-password">Забравена парола?</a>
            </div>
            <input class="field__input" id="password" name="password" type="password"
              autocomplete="current-password" required minlength="8" />
          </div>

          <div id="login-errors" class="field__error" role="alert" aria-live="polite"></div>

          <div class="auth-actions">
            <button type="submit" class="btn btn--primary" style="flex: 1;">Вход</button>
          </div>
          <p class="muted center" style="margin-top: var(--space-3);">
            Нямате профил? <a href="#/register">Регистрация</a>
          </p>
        </form>

        <div class="auth-divider"><span>или продължете с</span></div>

        <div class="auth-social">
          <button class="btn btn--secondary auth-social__btn" data-oauth="github" type="button">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.58.1.79-.25.79-.56v-2.18c-3.2.7-3.87-1.37-3.87-1.37-.52-1.33-1.27-1.69-1.27-1.69-1.04-.71.08-.7.08-.7 1.15.08 1.76 1.18 1.76 1.18 1.02 1.76 2.69 1.25 3.34.96.1-.74.4-1.25.73-1.54-2.55-.29-5.24-1.28-5.24-5.69 0-1.26.45-2.29 1.18-3.1-.12-.29-.51-1.46.11-3.05 0 0 .96-.31 3.15 1.18.91-.25 1.89-.38 2.86-.38.97 0 1.95.13 2.86.38 2.19-1.49 3.15-1.18 3.15-1.18.62 1.59.23 2.76.11 3.05.74.81 1.18 1.84 1.18 3.1 0 4.42-2.69 5.4-5.25 5.68.41.36.78 1.06.78 2.13v3.16c0 .31.21.66.8.55C20.21 21.39 23.5 17.08 23.5 12 23.5 5.65 18.35.5 12 .5z"/></svg>
            GitHub
          </button>
          <button class="btn btn--secondary auth-social__btn" data-oauth="google" type="button">
            <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.99.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.1A6.84 6.84 0 0 1 5.5 12c0-.73.13-1.44.34-2.1V7.06H2.18A11 11 0 0 0 1 12c0 1.78.43 3.46 1.18 4.94l3.66-2.84z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z"/></svg>
            Google
          </button>
        </div>

        <details style="margin-top: var(--space-4);">
          <summary class="muted">Демо администратор</summary>
          <p class="muted" style="margin-top: var(--space-2);">
            Имейл: <code>${SEED_ADMIN_EMAIL}</code><br />
            Парола: <code>${SEED_ADMIN_PASSWORD}</code>
          </p>
        </details>
      </section>

      <style>
        .auth-card {
          max-width: 480px;
          width: 100%;
          margin: var(--space-6) auto;
          display: flex;
          flex-direction: column;
          gap: var(--space-3);
          padding: var(--space-6);
        }
        .auth-hero {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: var(--space-2);
          text-align: center;
          margin-bottom: var(--space-2);
        }
        .auth-hero__icon {
          width: 72px;
          height: 72px;
          border-radius: var(--radius-lg);
          background-color: var(--color-co2-soft);
          color: var(--color-co2e);
          display: inline-flex;
          align-items: center;
          justify-content: center;
        }
        .field__label-row { display: flex; align-items: baseline; justify-content: space-between; gap: var(--space-2); }
        .field__link { font-size: var(--fs-sm); text-decoration: none; }
        .field__link:hover { text-decoration: underline; }
        .auth-actions { display: flex; gap: var(--space-3); margin-top: var(--space-4); }
        .auth-divider {
          display: flex;
          align-items: center;
          gap: var(--space-3);
          color: var(--color-text-muted);
          font-size: var(--fs-sm);
          margin: var(--space-2) 0;
        }
        .auth-divider::before, .auth-divider::after {
          content: '';
          flex: 1;
          height: 1px;
          background-color: var(--color-border);
        }
        .auth-social { display: flex; gap: var(--space-3); }
        .auth-social__btn { flex: 1; gap: var(--space-2); }
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
    const forgot = this.root.querySelector<HTMLAnchorElement>('#forgot-password');
    forgot?.addEventListener('click', (e) => {
      e.preventDefault();
      window.alert('Възстановяването на парола ще бъде достъпно в следваща версия.\n\nЗа момента се свържете с администратор.');
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
