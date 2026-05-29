import type { Container } from '../di/Container';

export abstract class View {
  protected root!: HTMLElement;
  protected readonly disposers: Array<() => void> = [];

  constructor(
    protected readonly container: Container,
    protected readonly params: Readonly<Record<string, string>> = {},
  ) {}

  async mount(host: HTMLElement): Promise<void> {
    this.root = host;
    await this.onBeforeRender();
    const html = await this.render();
    this.root.innerHTML = html;
    await this.onAfterRender();
  }

  unmount(): void {
    for (const dispose of this.disposers) {
      try {
        dispose();
      } catch (err) {
        console.error('[View] Грешка при освобождаване:', err);
      }
    }
    this.disposers.length = 0;
    this.onUnmount();
    if (this.root) this.root.innerHTML = '';
  }

  protected abstract render(): string | Promise<string>;

  protected onBeforeRender(): void | Promise<void> {}

  protected onAfterRender(): void | Promise<void> {}

  protected onUnmount(): void {}

  protected on<K extends keyof HTMLElementEventMap>(
    selector: string | HTMLElement,
    event: K,
    handler: (ev: HTMLElementEventMap[K], el: HTMLElement) => void,
  ): void {
    const elements: HTMLElement[] =
      typeof selector === 'string'
        ? Array.from(this.root.querySelectorAll<HTMLElement>(selector))
        : [selector];

    for (const el of elements) {
      const wrapped = (e: Event) => handler(e as HTMLElementEventMap[K], el);
      el.addEventListener(event, wrapped);
      this.disposers.push(() => el.removeEventListener(event, wrapped));
    }
  }

  protected $<E extends HTMLElement = HTMLElement>(selector: string): E {
    const el = this.root.querySelector<E>(selector);
    if (!el) throw new Error(`[View] Елемент "${selector}" не е намерен в ${this.constructor.name}`);
    return el;
  }

  protected $$<E extends HTMLElement = HTMLElement>(selector: string): E[] {
    return Array.from(this.root.querySelectorAll<E>(selector));
  }

  protected setTitle(title: string): void {
    document.title = `${title} — AICO`;
  }
}
