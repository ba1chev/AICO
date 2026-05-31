import { describe, it, expect, vi } from 'vitest';
import { EventBus } from '@core/view/EventBus';

describe('EventBus', () => {
  it('delivers payloads to subscribed listeners', () => {
    const bus = new EventBus();
    const listener = vi.fn();
    bus.on<number>('tick', listener);
    bus.emit('tick', 1);
    bus.emit('tick', 2);
    expect(listener).toHaveBeenCalledTimes(2);
    expect(listener).toHaveBeenNthCalledWith(1, 1);
    expect(listener).toHaveBeenNthCalledWith(2, 2);
  });

  it('disposer returned by on() removes the listener', () => {
    const bus = new EventBus();
    const listener = vi.fn();
    const dispose = bus.on('tick', listener);
    bus.emit('tick', 'x');
    dispose();
    bus.emit('tick', 'y');
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('off() removes a specific listener while keeping others', () => {
    const bus = new EventBus();
    const a = vi.fn();
    const b = vi.fn();
    bus.on('tick', a);
    bus.on('tick', b);
    bus.off('tick', a);
    bus.emit('tick', 1);
    expect(a).not.toHaveBeenCalled();
    expect(b).toHaveBeenCalledOnce();
  });

  it('emit on an event with no listeners is a no-op', () => {
    const bus = new EventBus();
    expect(() => bus.emit('nobody', 1)).not.toThrow();
  });

  it('isolates a throwing listener from the rest', () => {
    const bus = new EventBus();
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const bad = vi.fn(() => {
      throw new Error('boom');
    });
    const good = vi.fn();
    bus.on('tick', bad);
    bus.on('tick', good);
    bus.emit('tick', 1);
    expect(bad).toHaveBeenCalled();
    expect(good).toHaveBeenCalled();
    errSpy.mockRestore();
  });

  it('clear() drops all listeners across events', () => {
    const bus = new EventBus();
    const a = vi.fn();
    const b = vi.fn();
    bus.on('one', a);
    bus.on('two', b);
    bus.clear();
    bus.emit('one', 1);
    bus.emit('two', 2);
    expect(a).not.toHaveBeenCalled();
    expect(b).not.toHaveBeenCalled();
  });
});
