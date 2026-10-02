// TickInput.js — One tick of one player's buttons, as a small record.
//
// A hero never reads the keyboard himself. Each game tick his controller is handed a
// record — what's held, what was just pressed, the stick — and that is all he knows.
// Where the record came from doesn't matter: this machine's keyboard or pad, a second
// pad for a friend on the couch, or the internet (net/Session.js). Because the records
// are the ONLY thing that drives the heroes, two machines fed the same records play the
// same game.
//
//   rec = [held bits, pressed bits, moveX, moveZ]     (moves are -100..100)

import { Controller } from './Controller.js';

// Bit order. Append only: both machines must agree on it.
export const ACTIONS = ['left', 'right', 'up', 'down', 'attack', 'heavy', 'block', 'dodge', 'magic', 'kick', 'jump',
  'confirm', 'pause', 'restart', 'menu', 'sprint'];
const BIT = Object.fromEntries(ACTIONS.map((a, i) => [a, 1 << i]));

export const EMPTY = [0, 0, 0, 0];

// Read a device sampler (core/InputManager.js) into a record. presses: include the
// just-pressed buttons (false for a tick that only repeats what's held).
export function capture(sampler, presses = true) {
  if (presses) sampler.read();
  let h = 0;
  let p = 0;
  for (const a of ACTIONS) if (sampler.held[a]) h |= BIT[a];
  if (presses) for (const a of sampler.lastPresses) if (BIT[a]) p |= BIT[a];
  return [h, p, Math.round(sampler.moveX * 100), Math.round(sampler.moveZ * 100)];
}

export const pressed = (rec, action) => !!(rec[1] & BIT[action]);

// The controller a player's hero reads: it just plays back the record it's given.
export class TickController extends Controller {
  constructor() {
    super();
    this.rec = EMPTY;
    this.fresh = false;
  }

  // Called by the arena before each world tick.
  feed(rec) {
    this.rec = rec ?? EMPTY;
    this.fresh = true;
  }

  sample() {
    const [h, p, mx, mz] = this.rec;
    for (const a of ACTIONS) this.held[a] = !!(h & BIT[a]);
    // (a record's presses count once, however many times the hero looks this tick)
    if (this.fresh) {
      for (const a of ACTIONS) if (p & BIT[a]) this.registerPress(a);
      this.fresh = false;
    }
    this.moveX = mx / 100;
    this.moveZ = mz / 100;
  }
}
