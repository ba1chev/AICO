type Listener<T = unknown> = (payload: T) => void;
type Disposer = () => void;

export class EventBus {
  private readonly listeners = new Map<string, Set<Listener>>();

  on<T>(event: string, listener: Listener<T>): Disposer {
    let set = this.listeners.get(event);
    if (!set) {
      set = new Set();
      this.listeners.set(event, set);
    }
    set.add(listener as Listener);
    return () => this.off(event, listener);
  }

  off<T>(event: string, listener: Listener<T>): void {
    this.listeners.get(event)?.delete(listener as Listener);
  }

  emit<T>(event: string, payload: T): void {
    const set = this.listeners.get(event);
    if (!set) return;
    for (const l of set) {
      try {
        l(payload);
      } catch (err) {
        console.error(`[EventBus] Listener for "${event}" threw:`, err);
      }
    }
  }

  clear(): void {
    this.listeners.clear();
  }
}
