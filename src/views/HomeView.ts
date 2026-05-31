import { View } from '@core/view/View';

export class HomeView extends View {
  protected override render(): string {
    return `
      <div class="home-stack">
        <section class="hero-card">
          <div class="hero-card__icon" aria-hidden="true">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z"/><path d="M2 21c0-3 1.85-5.36 5.08-6"/></svg>
          </div>
          <h1 style="margin:0;">AICO — Екологичен отпечатък на AI</h1>
          <p class="muted" style="margin:0; max-width: 60ch;">
            Изчислете енергийния разход (kWh), въглеродните емисии (CO₂e) и
            водния отпечатък на вашите AI натоварвания.
          </p>
          <a class="btn btn--primary" href="#/calculator">Към калкулатора</a>
        </section>

        <div class="grid-2">
          <article class="card">
            <h2>За проекта</h2>
            <p class="muted">
              AICO е университетски HCI проект на ФМИ при СУ „Св. Климент
              Охридски“. Системата позволява на разработчици, изследователи и
              организации да оценят екологичното въздействие на машинното
              обучение и инференса.
            </p>
          </article>
          <article class="card">
            <h2>Започни сега</h2>
            <p class="muted">
              Изберете хардуер, регион и продължителност, и получете моментално
              разбивка на енергийното потребление и емисиите.
            </p>
            <p>
              <a class="btn btn--secondary" href="#/calculator">Започни изчисление</a>
            </p>
          </article>
        </div>
      </div>

      <style>
        .home-stack { display: flex; flex-direction: column; gap: var(--space-6); }
      </style>
    `;
  }
}

export default HomeView;
