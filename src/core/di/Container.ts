export interface ServiceToken<T> {
  readonly key: string;
  readonly _phantom?: T;
}

export function createToken<T>(key: string): ServiceToken<T> {
  return { key };
}

type Factory<T> = (c: Container) => T;

interface Registration<T> {
  factory: Factory<T>;
  singleton: boolean;
  instance?: T;
}

export class Container {
  private readonly registry = new Map<string, Registration<unknown>>();

  registerSingleton<T>(token: ServiceToken<T>, factory: Factory<T>): this {
    this.registry.set(token.key, { factory, singleton: true });
    return this;
  }

  registerTransient<T>(token: ServiceToken<T>, factory: Factory<T>): this {
    this.registry.set(token.key, { factory, singleton: false });
    return this;
  }

  registerInstance<T>(token: ServiceToken<T>, instance: T): this {
    this.registry.set(token.key, {
      factory: () => instance,
      singleton: true,
      instance,
    });
    return this;
  }

  resolve<T>(token: ServiceToken<T>): T {
    const reg = this.registry.get(token.key) as Registration<T> | undefined;
    if (!reg) {
      throw new Error(`[Container] Service "${token.key}" is not registered.`);
    }
    if (reg.singleton) {
      if (reg.instance === undefined) {
        reg.instance = reg.factory(this);
      }
      return reg.instance;
    }
    return reg.factory(this);
  }

  has<T>(token: ServiceToken<T>): boolean {
    return this.registry.has(token.key);
  }
}
