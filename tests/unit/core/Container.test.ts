import { describe, it, expect } from 'vitest';
import { Container, createToken } from '@core/di/Container';

describe('Container', () => {
  it('resolves a registered singleton', () => {
    const c = new Container();
    const token = createToken<{ value: number }>('svc');
    c.registerSingleton(token, () => ({ value: 42 }));
    expect(c.resolve(token).value).toBe(42);
  });

  it('singleton returns the same instance every resolve', () => {
    const c = new Container();
    const token = createToken<{ id: number }>('svc');
    let counter = 0;
    c.registerSingleton(token, () => ({ id: ++counter }));
    const a = c.resolve(token);
    const b = c.resolve(token);
    expect(a).toBe(b);
    expect(counter).toBe(1);
  });

  it('transient returns a new instance each resolve', () => {
    const c = new Container();
    const token = createToken<{ id: number }>('svc');
    let counter = 0;
    c.registerTransient(token, () => ({ id: ++counter }));
    const a = c.resolve(token);
    const b = c.resolve(token);
    expect(a).not.toBe(b);
    expect(counter).toBe(2);
  });

  it('registerInstance returns the same provided object', () => {
    const c = new Container();
    const token = createToken<{ tag: string }>('svc');
    const instance = { tag: 'fixed' };
    c.registerInstance(token, instance);
    expect(c.resolve(token)).toBe(instance);
  });

  it('throws when resolving an unregistered token', () => {
    const c = new Container();
    const token = createToken<unknown>('missing');
    expect(() => c.resolve(token)).toThrow(/not registered/);
  });

  it('has() reflects registration state', () => {
    const c = new Container();
    const token = createToken<number>('svc');
    expect(c.has(token)).toBe(false);
    c.registerSingleton(token, () => 1);
    expect(c.has(token)).toBe(true);
  });

  it('factory receives the container so it can resolve dependencies', () => {
    const c = new Container();
    const dep = createToken<number>('dep');
    const consumer = createToken<{ doubled: number }>('consumer');
    c.registerSingleton(dep, () => 21);
    c.registerSingleton(consumer, (cc) => ({ doubled: cc.resolve(dep) * 2 }));
    expect(c.resolve(consumer).doubled).toBe(42);
  });
});
