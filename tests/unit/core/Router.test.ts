import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Router } from '@core/router/Router';
import { Container } from '@core/di/Container';
import { EventBus } from '@core/view/EventBus';
import { View } from '@core/view/View';
import type { RouteGuard } from '@core/router/Route';

class StubView extends View {
  static lastInstance: StubView | null = null;
  static rendered = '';
  protected override render(): string {
    StubView.lastInstance = this;
    return `<div data-view="stub">${StubView.rendered}</div>`;
  }
}

class CapturingView extends View {
  static capturedParams: Record<string, string> = {};
  protected override render(): string {
    CapturingView.capturedParams = this.params as Record<string, string>;
    return '<div data-view="captured"></div>';
  }
}

class NotFoundStub extends View {
  static called = false;
  protected override render(): string {
    NotFoundStub.called = true;
    return '<div data-view="404"></div>';
  }
}

function setHash(path: string): void {
  window.location.hash = path.startsWith('#') ? path : `#${path}`;
}

async function flush(): Promise<void> {
  for (let i = 0; i < 10; i++) await Promise.resolve();
}

describe('Router', () => {
  let outlet: HTMLElement;
  let container: Container;
  let bus: EventBus;
  let router: Router;

  beforeEach(() => {
    document.body.innerHTML = '<div id="outlet"></div>';
    outlet = document.getElementById('outlet')!;
    container = new Container();
    bus = new EventBus();
    router = new Router(outlet, container, bus);
    StubView.lastInstance = null;
    NotFoundStub.called = false;
    CapturingView.capturedParams = {};
    setHash('/');
  });

  it('matches a static route and mounts the view', async () => {
    router.register({ path: '/home', view: StubView });
    setHash('/home');
    router.start();
    await flush();
    expect(outlet.querySelector('[data-view="stub"]')).not.toBeNull();
  });

  it('extracts parameters from a dynamic segment', async () => {
    router.register({ path: '/items/:id', view: CapturingView });
    setHash('/items/abc-123');
    router.start();
    await flush();
    expect(CapturingView.capturedParams).toEqual({ id: 'abc-123' });
  });

  it('decodes URL-encoded parameters', async () => {
    router.register({ path: '/q/:term', view: CapturingView });
    setHash('/q/hello%20world');
    router.start();
    await flush();
    expect(CapturingView.capturedParams['term']).toBe('hello world');
  });

  it('falls back to the registered NotFound view on no match', async () => {
    router.register({ path: '/known', view: StubView });
    router.registerNotFound(NotFoundStub);
    setHash('/unknown-path');
    router.start();
    await flush();
    expect(NotFoundStub.called).toBe(true);
  });

  it('blocks navigation when a guard denies and emits router:denied', async () => {
    const denied = vi.fn();
    bus.on('router:denied', denied);
    const guard: RouteGuard = {
      canActivate: () => false,
      onDenied: vi.fn(),
    };
    router.register({ path: '/secure', view: StubView, guards: [guard] });
    setHash('/secure');
    router.start();
    await flush();
    expect(StubView.lastInstance).toBeNull();
    expect(guard.onDenied).toHaveBeenCalled();
    expect(denied).toHaveBeenCalledWith(expect.objectContaining({ path: '/secure' }));
  });

  it('allows navigation when guard approves', async () => {
    const guard: RouteGuard = { canActivate: () => true };
    router.register({ path: '/secure', view: StubView, guards: [guard] });
    setHash('/secure');
    router.start();
    await flush();
    expect(StubView.lastInstance).not.toBeNull();
  });

  it('emits router:navigated with path and params', async () => {
    const handler = vi.fn();
    bus.on('router:navigated', handler);
    router.register({ path: '/items/:id', view: CapturingView });
    setHash('/items/x');
    router.start();
    await flush();
    expect(handler).toHaveBeenCalledWith(
      expect.objectContaining({ path: '/items/x', params: { id: 'x' } }),
    );
  });

  it('currentPath() strips the hash and any query string', () => {
    setHash('/path?foo=bar');
    expect(router.currentPath()).toBe('/path');
  });

  it('navigate() updates window.location.hash', () => {
    router.register({ path: '/calculator', view: StubView });
    router.navigate('/calculator');
    expect(window.location.hash).toBe('#/calculator');
  });
});
