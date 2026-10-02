// EventBus.js — A tiny publish/subscribe helper. The combat simulation emits events
// ('hit', 'kill', 'parry', ...) and the visual side (gore, camera shake, HUD) listens.
// This keeps game logic separate from art/effects.

export class EventBus {
  constructor() {
    this.listeners = {};
  }

  on(name, fn) {
    (this.listeners[name] ??= []).push(fn);
    return () => this.off(name, fn);
  }

  off(name, fn) {
    this.listeners[name] = (this.listeners[name] ?? []).filter((f) => f !== fn);
  }

  emit(name, data) {
    for (const fn of this.listeners[name] ?? []) fn(data);
  }
}
