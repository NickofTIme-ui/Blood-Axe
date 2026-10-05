// Terrain.js — Raised ground on the floor lane: ledges, steps, pits, lifts and planks
// that give way. Pure logic (view/TerrainView.js draws it), so the tests can drive it.
//
// The floor lane is still the floor lane (x along it, z up and down the screen). A
// BLOCK is a solid column standing on it: a rectangle of the lane (x0..x1, z0..z1)
// raised to `top` px. A fighter's h is ABSOLUTE height (0 = the floor), so a man
// standing on a 90 px ledge has h = 90 and is drawn 90 px higher; his `floor` is the
// ground under his feet and `air` (h - floor) how far he is off it. With no terrain
// every floor is 0 and nothing in the game behaves any differently.
//
// Kinds (data: a stage's `terrain` list):
//   block   { x0, x1, z0, z1, top }                     a ledge, a step, a platform
//   lift    { ..., move: { axis: 'top' | 'x', range, period, phase } }
//           a platform that rides up and down (or along); whoever stands on it rides too
//   crumble { ..., fall: 32, back: 240 }  a rotten plank: stood on, it shakes for `fall`
//           frames, drops, and is back `back` frames later
//   pit     { x0, x1, z0, z1 }   no floor: whoever goes in falls out of the fight
//
// A man can step up STEP px without jumping. Anything taller is a wall to whoever is
// below its top: he stops against it (one axis at a time, so he slides along it).

export const STEP = 10;          // px a man walks up without a jump
export const PIT_FLOOR = -2000;  // "ground" in a pit
export const PIT_LOST = -160;    // fallen this far below the floor: out of the fight
const EDGE = 8;                  // how close a man gets to a wall (px)
export const FOOT = 5;           // feet are this wide each side: a man a few px past a ledge's edge still stands on it

export class Terrain {
  constructor(world, defs = []) {
    this.world = world;
    this.blocks = [];
    this.pits = [];
    let id = 1;
    for (const d of defs) {
      if (d.kind === 'pit') { this.pits.push({ id: id++, ...d }); continue; }
      const b = { id: id++, kind: d.kind ?? 'block', ...d, base: { x0: d.x0, x1: d.x1, top: d.top }, solid: true, dx: 0, dtop: 0 };
      if (b.kind === 'crumble') { b.fall = d.fall ?? 32; b.back = d.back ?? 240; b.shake = 0; b.down = 0; }
      this.blocks.push(b);
    }
  }

  // ------------------------------------------------------------ queries

  inside(b, x, z, pad = 0) {
    return x > b.x0 - pad && x < b.x1 + pad && z >= b.z0 - pad && z <= b.z1 + pad;
  }

  // The highest solid block under (x, z) — what a man there stands on (null: the floor).
  blockAt(x, z) {
    let best = null;
    for (const b of this.blocks) if (b.solid && this.inside(b, x, z) && (!best || b.top > best.top)) best = b;
    return best;
  }

  inPit(x, z) { return this.pits.some((p) => x > p.x0 && x < p.x1 && z >= p.z0 && z <= p.z1); }

  // Height of the ground under (x, z): a block's top, the floor (0) or a pit's nothing.
  // foot > 0: the best ground anywhere under feet that wide (what a man stands on).
  groundAt(x, z, foot = 0) {
    if (foot) return Math.max(this.groundAt(x - foot, z), this.groundAt(x, z), this.groundAt(x + foot, z));
    const b = this.blockAt(x, z);
    if (b) return b.top;
    return this.inPit(x, z) ? PIT_FLOOR : 0;
  }

  // The block a man with feet that wide stands on (the highest under them).
  blockUnder(x, z, foot = 0) {
    let best = null;
    for (const dx of foot ? [-foot, 0, foot] : [0]) {
      const b = this.blockAt(x + dx, z);
      if (b && (!best || b.top > best.top)) best = b;
    }
    return best;
  }

  // A wall at (x, z) for feet at height h: a solid block there rising past h + STEP.
  wallAt(x, z, h) {
    for (const b of this.blocks) if (b.solid && b.top > h + STEP && this.inside(b, x, z, EDGE)) return b;
    return null;
  }

  // A man somewhere he could never have walked to (inside a wall: carried there by a
  // finisher, set down there by a script): the nearest spot just outside it, or null if
  // he isn't inside one. (Walking never gets him there: every step checks wallAt first.)
  pushOut(x, z, h, bounds = null) {
    for (let k = 0; k < 4; k++) {
      const b = this.wallAt(x, z, h);
      if (!b) return k ? { x, z } : null;
      const out = [
        { x: b.x0 - EDGE - 1, z }, { x: b.x1 + EDGE + 1, z },
        { x, z: b.z0 - EDGE - 1 }, { x, z: b.z1 + EDGE + 1 },
      ].filter((q) => !bounds || (q.z >= bounds.minZ && q.z <= bounds.maxZ));
      out.sort((a, c) => Math.abs(a.x - x) + Math.abs(a.z - z) - Math.abs(c.x - x) - Math.abs(c.z - z));
      const free = out.find((q) => !this.wallAt(q.x, q.z, h)) ?? out[0];
      if (!free) return null;
      ({ x, z } = free);
    }
    return { x, z };
  }

  // Is the ground at (x, z) safe to stand on for good (a checkpoint, a respawn): solid,
  // not a pit, not a rotten plank, not a moving lift.
  safeAt(x, z) {
    if (this.inPit(x, z) && !this.blockAt(x, z)) return false;
    const b = this.blockAt(x, z);
    return !b || b.kind === 'block';
  }

  // ------------------------------------------------------------ per tick

  update() {
    const t = this.world.frame;
    for (const b of this.blocks) {
      if (b.kind === 'lift') {
        const m = b.move;
        const k = (Math.sin(((t + (m.phase ?? 0)) / m.period) * Math.PI * 2 - Math.PI / 2) + 1) / 2; // 0..1..0
        const off = k * m.range;
        const prevX0 = b.x0; const prevTop = b.top;
        if (m.axis === 'x') { b.x0 = b.base.x0 + off; b.x1 = b.base.x1 + off; } else b.top = b.base.top + off;
        b.dx = b.x0 - prevX0;
        b.dtop = b.top - prevTop;
      } else if (b.kind === 'crumble') {
        if (b.down > 0) {
          if (--b.down === 0) { b.solid = true; b.shake = 0; this.world.events.emit('plankBack', { block: b }); }
        } else if (b.shake > 0) {
          if (++b.shake >= b.fall) {
            b.solid = false;
            b.shake = 0;
            b.down = b.back;
            this.world.events.emit('plankFall', { block: b });
          }
        }
      }
    }
    // riders: whoever stands on a moving lift moves with it (before they move themselves)
    for (const f of this.world.fighters) {
      const b = f.floorBlock;
      if (!b || !f.grounded) continue;
      if (b.kind === 'lift' && (b.dx || b.dtop)) {
        f.x += b.dx;
        f.h = f.floor = b.top; // (up or down, his feet stay on it: no tiny falls every frame)
      }
      if (b.kind === 'crumble' && b.solid && !b.shake && b.down === 0) {
        b.shake = 1;
        this.world.events.emit('plankCreak', { block: b });
      }
    }
  }
}
