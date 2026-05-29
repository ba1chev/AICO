import { View } from '@core/view/View';

export class HomeView extends View {
  protected override render(): string {
    return `
      <section class="app-main__hero">
        <h1 class="app-main__title">AICO — Екологичен отпечатък на AI</h1>
        <p class="app-main__subtitle">
          Изчислете енергийния разход (kWh), въглеродните емисии (CO₂e) и
          водния отпечатък на вашите AI натоварвания.
        </p>
        <div class="grid-2 stack-6">
          <article class="card">
            <h2>За проекта</h2>
            <p>
              AICO е университетски HCI проект на ФМИ при СУ „Св. Климент
              Охридски“. Системата позволява на разработчици, изследователи и
              организации да оценят екологичното въздействие на машинното
              обучение и инференса.
            </p>
          </article>
          <article class="card">
            <h2>Започни сега</h2>
            <p>
              Изберете хардуер, регион и продължителност, и получете моментално
              разбивка на енергийното потребление и емисиите.
            </p>
            <p>
              <a class="btn btn--primary" href="#/calculator">Към калкулатора</a>
            </p>
          </article>
        </div>
      </section>
    `;
  }
}

export default HomeView;
