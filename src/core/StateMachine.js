// StateMachine.js — A simple finite state machine shared by players AND enemies.
//
// A "state" is a plain object with optional functions:
//   enter(owner, params)   runs once when the state starts
//   update(owner, frame)   runs every frame; `frame` counts up from 1
//   exit(owner)            runs once when leaving the state
// The actual fighter states live in src/entities/fighterStates.js.

export class StateMachine {
  constructor(owner, states) {
    this.owner = owner;
    this.states = states;
    this.name = null;      // current state name, e.g. 'light1'
    this.prevName = null;
    this.frame = 0;        // frames spent in the current state
    this.enterCount = 0;   // increases on every state change (handy for AI)
  }

  change(name, params = {}) {
    const next = this.states[name];
    if (!next) throw new Error(`Unknown state: ${name}`);
    this.states[this.name]?.exit?.(this.owner);
    this.prevName = this.name;
    this.name = name;
    this.frame = 0;
    this.enterCount++;
    next.enter?.(this.owner, params);
  }

  update() {
    this.frame++;
    this.states[this.name]?.update?.(this.owner, this.frame);
  }

  is(...names) {
    return names.includes(this.name);
  }
}
