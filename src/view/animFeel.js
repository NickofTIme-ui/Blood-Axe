// animFeel.js — Body mechanics shared by the sprite views (heroes, enemies, bosses), laid
// over the painted frames. VIEW ONLY: nothing here touches the fight. Every move's
// startup / active / recovery numbers and every hitbox stay exactly where the sim puts
// them (online lockstep runs the sim, never this), and no input waits on any of it.
//
//   easedSpread  slow-in / slow-out across a move phase's poses: the key poses at either
//                end of a phase (ready stance, full coil, the follow-through) hold longer
//                and the in-betweens fly past, instead of every pose getting equal time.
//   BodyFeel     squash and stretch with a little spring to it: stretched on take-off and
//                at speed in the air, squashed on landing (harder falls, bigger squash),
//                a squash into every hit taken, and lean / shove carried smoothly across
//                a state change instead of snapping (hits and throws still snap).
//
// Everything steps once per GAME tick (world.frame), not per screen refresh, so it plays
// the same at any frame rate and sits still through hit-stop with the rest of the body.

import { movePhase } from '../combat/MoveRunner.js';

const clamp01 = (t) => Math.max(0, Math.min(1, t));
export const smoothstep = (t) => t * t * (3 - 2 * t);

// A pose from a phase's list by how far through the phase we are, eased (smoothstep):
// the first and last poses get the longest holds. Two poses or fewer: an even split,
// same as before (nothing in between to rush).
export function easedSpread(list, t) {
  const n = list.length;
  const e = n > 2 ? smoothstep(clamp01(t)) : clamp01(t);
  return list[Math.min(n - 1, Math.max(0, Math.floor(e * n)))];
}

// A painted attack strip's cell for this tick, tied to the move's own phases: cells =
// { startup: [...], active: [...], recovery: [...] } (cell numbers in the strip). The
// strike cells are on screen exactly while the hitbox is out; wind-up and recovery eased.
export function phaseCell(move, fr, cells) {
  const ph = movePhase(move, fr);
  if (ph === 'startup') return easedSpread(cells.startup, (fr - 1) / Math.max(1, move.startup));
  if (ph === 'active') return easedSpread(cells.active, (fr - move.startup - 1) / Math.max(1, move.active));
  return easedSpread(cells.recovery, (fr - move.startup - move.active - 1) / Math.max(1, move.recovery));
}

// States that land on the body as an impact: their lean and shove start at full strength
// on the first tick, never eased in from the last state.
const SNAP = new Set(['hitstun', 'stagger', 'guardBreak', 'knockdown', 'dead', 'burning', 'executed', 'execute']);

// A damped spring kicked by an impulse: +1 squashed flat, -1 stretched tall.
class Spring {
  constructor(decay, freq) { this.decay = decay; this.freq = freq; this.a = 0; this.age = 99; }
  kick(a) { if (Math.abs(a) >= Math.abs(this.value())) { this.a = a; this.age = 0; } }
  step(dt) { this.age += dt; }
  value() { return this.age > 40 ? 0 : this.a * Math.exp(-this.age / this.decay) * Math.cos(this.age * this.freq); }
}

export class BodyFeel {
  // mass: 1 for a man-sized body; bigger brutes and bosses squash less and settle slower
  constructor(fighter, { mass = 1 } = {}) {
    this.f = fighter;
    this.mass = mass;
    const slow = Math.sqrt(mass);
    this.land = new Spring(3.2 * slow, 0.55 / slow);
    this.hit = new Spring(2.2 * slow, 0.9 / slow);
    this.tick = null;
    this.wasAir = false;
    this.lastVh = 0;
    this.lastFlash = 0;
    this.shape = { sx: 1, sy: 1 };
    // state blend
    this.bState = null; this.bTick = null;
    this.shown = { lean: 0, push: 0, bob: 0 };
    this.prevShown = this.shown;
    this.carry = null;
  }

  // The squash / stretch factors for this tick (multiply into the sprite's x and y scale;
  // the sprites stand on their feet, so the feet stay planted). land: false when the view
  // draws its own landing (an enemy's ledge hop), so the squash isn't doubled.
  step({ land = true } = {}) {
    const f = this.f;
    const tick = f.world?.frame ?? 0;
    if (tick === this.tick) return this.shape;
    const dt = this.tick == null ? 0 : Math.max(0, Math.min(4, tick - this.tick));
    this.tick = tick;
    this.land.step(dt);
    this.hit.step(dt);

    const air = f.h - (f.floor ?? 0) > 0.5 || f.vh > 0;
    const k = 1 / Math.sqrt(this.mass);
    if (air && !this.wasAir && f.vh > 60) this.land.kick(-0.75 * k * clamp01(f.vh / 700));      // take-off: stretched
    if (!air && this.wasAir && land) this.land.kick(1.0 * k * clamp01(0.25 + -this.lastVh / 800));      // landing: squashed
    if (f.flash > this.lastFlash && f.alive !== false) this.hit.kick(0.8 * k);                   // a hit lands on him
    this.wasAir = air;
    this.lastVh = f.vh;
    this.lastFlash = f.flash;

    // in the air: drawn out along the line of travel, round again at the top of the arc
    const fly = air ? -0.45 * k * clamp01((Math.abs(f.vh) - 120) / 700) : 0;
    const q = this.land.value() + fly;
    const h = this.hit.value();
    // squash +q: wider and shorter (roughly keeping volume); a hit squeezes him sideways
    this.shape = {
      sx: (1 + 0.13 * q) * (1 - 0.07 * h),
      sy: (1 - 0.16 * q) * (1 + 0.045 * h),
    };
    return this.shape;
  }

  // Carry lean / shove / bob across a change of state: the new state's offsets are eased
  // in from what was on screen over a few ticks, instead of jumping there. o = {lean,
  // push, bob} for this tick (changed in place). Impacts (SNAP) come in at full strength.
  blend(o, st) {
    const tick = this.f.world?.frame ?? 0;
    if (tick !== this.bTick) {
      if (this.bTick != null && this.carry) this.carry.age += Math.max(0, Math.min(4, tick - this.bTick));
      this.bTick = tick;
      this.prevShown = this.shown;
      if (st !== this.bState) {
        const p = this.prevShown;
        this.carry = this.bState == null || SNAP.has(st) ? null
          : { lean: p.lean - o.lean, push: p.push - o.push, bob: p.bob - o.bob, age: 0 };
        this.bState = st;
      }
    }
    const c = this.carry;
    if (c) {
      const d = Math.exp(-c.age / 2.2) * (1 - smoothstep(clamp01(c.age / 9)));
      if (d < 0.01) this.carry = null;
      else { o.lean += c.lean * d; o.push += c.push * d; o.bob += c.bob * d; }
    }
    this.shown = { lean: o.lean, push: o.push, bob: o.bob };
    return o;
  }
}

// A swing's body over its own frame data, for views that have none of their own: coil
// back through the wind-up (slow in), drive forward on the strike, a damped settle through
// the recovery. k scales it (heavier blows: more). Returns {lean, push, sx, sy, bob}.
export function swingBody(move, fr, k = 1) {
  const out = { lean: 0, push: 0, sx: 1, sy: 1, bob: 0 };
  if (!move) return out;
  const s = Math.max(1, move.startup);
  const a = Math.max(1, move.active);
  if (fr <= s) {
    const t = smoothstep(clamp01(fr / s));
    out.lean = -4 * k * t; out.push = -2.5 * k * t;
    out.sx = 1 - 0.03 * k * t; out.sy = 1 + 0.025 * k * t; out.bob = 1 * k * t;
  } else if (fr <= s + a) {
    const t = (fr - s) / a;
    out.lean = 5 * k * (1 - 0.3 * t); out.push = 4 * k;
    out.sx = 1 + 0.06 * k * (1 - 0.5 * t); out.sy = 1 - 0.035 * k * (1 - 0.5 * t);
  } else {
    const t = clamp01((fr - s - a) / Math.max(1, move.recovery));
    const damp = Math.exp(-3.6 * t);
    out.lean = 3.6 * k * damp * Math.cos(t * 7);
    out.push = 4 * k * (1 - t) ** 3;
    out.sx = 1 + 0.025 * k * damp; out.sy = 1 - 0.018 * k * damp;
  }
  return out;
}
