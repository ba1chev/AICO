import type { Container } from '../di/Container';
import type { View } from '../view/View';
import type { EventBus } from '../view/EventBus';
import type { RouteDefinition, ViewConstructor } from './Route';

interface CompiledRoute {
  def: RouteDefinition;
  pattern: RegExp;
  paramNames: string[];
}

export class Router {
  private readonly routes: CompiledRoute[] = [];
  private currentView: View | null = null;
  private notFoundFactory: ViewConstructor | null = null;

  constructor(
    private readonly outlet: HTMLElement,
    private readonly container: Container,
    private readonly bus: EventBus,
  ) {}

  register(def: RouteDefinition): this {
    const { pattern, paramNames } = compilePath(def.path);
    this.routes.push({ def, pattern, paramNames });
    return this;
  }

  registerNotFound(view: ViewConstructor): this {
    this.notFoundFactory = view;
    return this;
  }

  start(): void {
    window.addEventListener('hashchange', () => {
      void this.resolve();
    });
    void this.resolve();
  }

  navigate(path: string): void {
    const target = path.startsWith('#') ? path : `#${path}`;
    if (window.location.hash === target) {
      void this.resolve();
    } else {
      window.location.hash = target;
    }
  }

  currentPath(): string {
    const raw = window.location.hash || '#/';
    const stripped = raw.startsWith('#') ? raw.slice(1) : raw;
    const qIdx = stripped.indexOf('?');
    return qIdx === -1 ? stripped : stripped.slice(0, qIdx);
  }

  private async resolve(): Promise<void> {
    const path = this.currentPath();
    const match = this.match(path);

    try {
      if (!match) {
        await this.renderNotFound(path);
        return;
      }

      for (const guard of match.def.guards ?? []) {
        const ok = await guard.canActivate();
        if (!ok) {
          guard.onDenied?.();
          this.bus.emit('router:denied', { path, guard: guard.constructor.name });
          return;
        }
      }

      const ViewCtor = await this.resolveViewConstructor(match.def.view);
      const view = new ViewCtor(this.container, match.params);

      this.currentView?.unmount();
      await view.mount(this.outlet);
      this.currentView = view;

      if (match.def.title) document.title = `${match.def.title} — AICO`;

      this.bus.emit('router:navigated', { path, params: match.params });
    } catch (err) {
      console.error('[Router] Грешка при resolve:', err);
      this.bus.emit('router:error', { path, error: err });
      this.outlet.innerHTML = `<div class="error-banner" role="alert">
        <h2>Възникна грешка</h2>
        <p>${(err as Error).message}</p>
      </div>`;
    }
  }

  private async resolveViewConstructor(
    view: RouteDefinition['view'],
  ): Promise<ViewConstructor> {
    if (typeof view === 'function' && /^class\s/.test(view.toString().slice(0, 20))) {
      return view as ViewConstructor;
    }

    try {
      const result = (view as () => Promise<{ default: ViewConstructor }>)();
      if (result && typeof (result as Promise<unknown>).then === 'function') {
        const mod = await result;
        return mod.default;
      }
    } catch {
    }
    return view as ViewConstructor;
  }

  private match(path: string): { def: RouteDefinition; params: Record<string, string> } | null {
    for (const route of this.routes) {
      const m = route.pattern.exec(path);
      if (m) {
        const params: Record<string, string> = {};
        route.paramNames.forEach((name, i) => {
          const v = m[i + 1];
          if (v !== undefined) params[name] = decodeURIComponent(v);
        });
        return { def: route.def, params };
      }
    }
    return null;
  }

  private async renderNotFound(path: string): Promise<void> {
    if (this.notFoundFactory) {
      const view = new this.notFoundFactory(this.container, { path });
      this.currentView?.unmount();
      await view.mount(this.outlet);
      this.currentView = view;
    } else {
      this.currentView?.unmount();
      this.currentView = null;
      this.outlet.innerHTML = `<div role="alert"><h2>404 — Страницата не е намерена</h2><p>${path}</p></div>`;
    }
    this.bus.emit('router:not-found', { path });
  }
}

function compilePath(path: string): { pattern: RegExp; paramNames: string[] } {
  const paramNames: string[] = [];
  const escaped = path
    .replace(/\/$/, '')
    .replace(/[.+^${}()|[\]\\]/g, '\\$&')
    .replace(/:([A-Za-z_][A-Za-z0-9_]*)/g, (_, name: string) => {
      paramNames.push(name);
      return '([^/]+)';
    });
  const pattern = new RegExp(`^${escaped || '/'}/?$`);
  return { pattern, paramNames };
}
