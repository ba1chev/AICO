import { View } from '@core/view/View';
import { TOKENS } from '../../../tokens';
import { ValidationError } from '@core/errors/ValidationError';

export class RegisterView extends View {
  protected override render(): string {
    return `
      <section class="card auth-card">
        <h1>Регистрация</h1>
        <p class="muted">Създайте профил, за да пазите изчисления и да генерирате отчети.</p>

        <form id="register-form" novalidate>
          <div class="field">
            <label class="field__label" for="role">Тип потребител</label>
            <select class="field__select" id="role" name="role" required>
              <option value="developer">Разработчик</option>
              <option value="researcher">Изследовател</option>
              <option value="organization">Организация</option>
            </select>
          </div>

          <div class="field">
            <label class="field__label" for="email">Имейл</label>
            <input class="field__input" id="email" name="email" type="email" autocomplete="email" required />
          </div>

          <div class="field">
            <label class="field__label" for="displayName">Име за показване</label>
            <input class="field__input" id="displayName" name="displayName" type="text" required minlength="2" />
          </div>

          <div class="field" id="org-field" hidden>
            <label class="field__label" for="organizationName">Име на организацията</label>
            <input class="field__input" id="organizationName" name="organizationName" type="text" />
          </div>

          <div class="field" id="aff-field" hidden>
            <label class="field__label" for="affiliation">Афилиация (университет / лаборатория)</label>
            <input class="field__input" id="affiliation" name="affiliation" type="text" />
          </div>

          <div class="field">
            <label class="field__label" for="password">Парола</label>
            <input class="field__input" id="password" name="password" type="password"
              autocomplete="new-password" required minlength="8" />
            <span class="field__hint">Поне 8 символа.</span>
          </div>

          <div class="field">
            <label class="field__label" for="passwordConfirm">Повторете паролата</label>
            <input class="field__input" id="passwordConfirm" name="passwordConfirm" type="password"
              autocomplete="new-password" required minlength="8" />
          </div>

          <div id="register-errors" class="field__error" role="alert" aria-live="polite"></div>

          <div class="auth-actions">
            <button type="submit" class="btn btn--primary">Регистрация</button>
            <a class="btn btn--ghost" href="#/login">Вече имам профил</a>
          </div>
        </form>
      </section>

      <style>
        .auth-card { max-width: 520px; margin: 0 auto; }
        .auth-actions { display: flex; gap: var(--space-3); margin-top: var(--space-4); }
      </style>
    `;
  }

  protected override onAfterRender(): void {
    this.on('#role', 'change', () => this.toggleConditionalFields());
    this.on('#register-form', 'submit', (e) => {
      e.preventDefault();
      void this.handleSubmit();
    });
    this.toggleConditionalFields();
  }

  private toggleConditionalFields(): void {
    const role = this.$<HTMLSelectElement>('#role').value;
    this.$('#org-field').hidden = role !== 'organization';
    this.$('#aff-field').hidden = role !== 'researcher';
  }

  private async handleSubmit(): Promise<void> {
    const errBox = this.$('#register-errors');
    errBox.innerHTML = '';
    const form = this.$<HTMLFormElement>('#register-form');
    const data = new FormData(form);

    const auth = this.container.resolve(TOKENS.Auth);
    const orgName = String(data.get('organizationName') ?? '').trim();
    const aff = String(data.get('affiliation') ?? '').trim();
    try {
      await auth.register({
        email: String(data.get('email') ?? ''),
        displayName: String(data.get('displayName') ?? ''),
        password: String(data.get('password') ?? ''),
        passwordConfirm: String(data.get('passwordConfirm') ?? ''),
        role: String(data.get('role') ?? 'developer') as 'developer' | 'researcher' | 'organization',
        ...(orgName ? { organizationName: orgName } : {}),
        ...(aff ? { affiliation: aff } : {}),
      });
      this.container.resolve(TOKENS.Router).navigate('/');
    } catch (e) {
      if (e instanceof ValidationError) {
        errBox.innerHTML = e.errors.map((err) => `<div>• ${err.message}</div>`).join('');
      } else {
        errBox.textContent = (e as Error).message;
      }
    }
  }
}

export default RegisterView;
