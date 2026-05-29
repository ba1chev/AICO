export abstract class Component {
  protected root!: HTMLElement;
  protected readonly disposers: Array<() => void> = [];
  private mounted = false;

  protected abstract render(): string | HTMLElement;

  protected onAfterRender(): void {}

  protected onUnmount(): void {}

  mount(host: HTMLElement): void {
    if (this.mounted) {
      console.warn(`[Component] ${this.constructor.name} is already mounted — skipping.`);
      return;
    }
    this.root = host;
    const out = this.render();
    if (typeof out === 'string') {
      this.root.innerHTML = out;
    } else {
      this.root.replaceChildren(out);
    }
    this.onAfterRender();
    this.mounted = true;
  }

  unmount(): void {
    for (const dispose of this.disposers) {
      try {
        dispose();
      } catch (err) {
        console.error('[Component] Disposer threw:', err);
      }
    }
    this.disposers.length = 0;
    this.onUnmount();
    if (this.root) this.root.innerHTML = '';
    this.mounted = false;
  }

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

  protected $<E extends HTMLElement = HTMLElement>(selector: string): E | null {
    return this.root.querySelector<E>(selector);
  }
}
