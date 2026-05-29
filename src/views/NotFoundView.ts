import { View } from '@core/view/View';

export class NotFoundView extends View {
  protected override render(): string {
    const path = this.params['path'] ?? '';
    return `
      <section class="card center stack-3">
        <h1>404 — Страницата не е намерена</h1>
        <p class="muted">Не намерихме маршрут за <code>${path}</code>.</p>
        <p><a class="btn btn--secondary" href="#/">Към началото</a></p>
      </section>
    `;
  }
}

export default NotFoundView;
