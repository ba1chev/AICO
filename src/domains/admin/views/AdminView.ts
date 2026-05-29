import { View } from '@core/view/View';

export class AdminView extends View {
  protected override render(): string {
    return `
      <section class="card stack-4">
        <header>
          <h1>Администрация</h1>
          <p class="muted">Управление на потребители и хардуерни профили.</p>
        </header>

        <div class="admin-cards">
          <a class="admin-card" href="#/admin/users">
            <h2>Потребители</h2>
            <p>Активиране, деактивиране, смяна на роли.</p>
          </a>
          <a class="admin-card" href="#/admin/hardware">
            <h2>Хардуер</h2>
            <p>Промяна на параметрите на профилите от каталога.</p>
          </a>
        </div>
      </section>

      <style>
        .admin-cards {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
          gap: var(--space-3);
        }
        .admin-card {
          display: block;
          padding: var(--space-4);
          border: 1px solid var(--color-border, #d0d0d0);
          border-radius: var(--radius-md, 8px);
          text-decoration: none;
          color: inherit;
          transition: border-color 120ms ease, transform 120ms ease;
        }
        .admin-card:hover {
          border-color: var(--color-primary, #2e7d32);
          transform: translateY(-2px);
        }
        .admin-card h2 { margin: 0 0 var(--space-2); }
        .admin-card p { margin: 0; color: var(--color-text-muted); }
      </style>
    `;
  }
}

export default AdminView;
