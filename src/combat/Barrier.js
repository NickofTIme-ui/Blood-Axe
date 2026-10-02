// Barrier.js — The Mage's arcane barriers: a wall across the whole depth of the
// battlefield (top of the floor lane to the bottom) that splits a fight in two.
//
//   INFERNAL WALL    fire. Shorter. Burns, shoves back and sets alight whoever touches it.
//   EARTHEN BULWARK  rock. Longer. Pure blocking; strong enemies can batter it down.
//
// Pure logic on the World (no drawing: view/BarrierView.js draws them from the events),
// so the tests can drive it. Only the caster's enemies are stopped — his own side walks,
// blinks and casts straight through, so a teammate is never trapped.
//
// Each enemy remembers which side of a wall he is on. When the wall goes up, anyone on
// its line is moved cleanly to the nearer side (never left inside it), and from then on
// he simply cannot cross: walk into it and you stop at its face; get blasted into it and
// you hit it and drop. A man who arrives later (a spawn, a runner) is put on whichever
// side he turns up on. The moment a wall starts to come down its collision is gone.
//
// Events (world.events):
//   barrierUp { barrier }   barrierHit { barrier, x, z, h, damage }
//   barrierDown { barrier, broken }   barrierGone { barrier }

import { toWorldBox, overlaps } from './Boxes.js';

export class Barriers {
  constructor(world) {
    this.world = world;
    this.list = [];
    this.nextId = 1;
  }

  // Walls that are standing (not coming down).
  get up() { return this.list.filter((b) => b.state === 'up'); }

  clear() {
    for (const b of this.list) this.world.events.emit('barrierGone', { barrier: b });
    this.list = [];
  }

  // Raise a wall in front of `owner`. kind: 'fire' | 'earth'. cfg: kit.barrier.
  place(owner, kind, cfg) {
    const w = this.world;
    const bd = w.bounds;
    const k = cfg[kind];
    const half = k.thickness / 2;
    const lo = bd.minX + cfg.edgeMargin;
    const hi = bd.maxX - cfg.edgeMargin;
    let x = owner.x + owner.facing * cfg.distance;
    // clamped to the stage, never into its ends (a lane this narrow: its middle)
    x = lo <= hi ? Math.max(lo, Math.min(hi, x)) : (bd.minX + bd.maxX) / 2;
    x = Math.round(x);
    // one wall per caster: a new one takes over from his old one
    for (const old of this.list) if (old.owner === owner && old.state === 'up') this.takeDown(old, false);
    const b = {
      id: this.nextId++, kind, x, half, owner, team: owner.team,
      life: k.duration, duration: k.duration,
      hp: k.hp ?? 0, maxHp: k.hp ?? 0,
      state: 'up', t: 0, collapse: cfg.collapse,
      sides: new Map(), cool: new Map(), hitBy: new WeakSet(), cfg: k,
    };
    // whoever is standing on the line goes to the nearer side, clear of the stone/flame
    for (const f of w.fighters) {
      if (f.team === b.team || f.removeMe) continue;
      let side = Math.sign(f.x - x) || -owner.facing;
      if (Math.abs(f.x - x) < half + cfg.clearance) {
        let nx = x + side * (half + cfg.clearance);
        if (nx < bd.minX || nx > bd.maxX) { side = -side; nx = x + side * (half + cfg.clearance); }
        f.x = Math.max(bd.minX, Math.min(bd.maxX, nx));
        if (f.vx * side < 0) f.vx = 0;
      }
      b.sides.set(f.id, side);
    }
    this.list.push(b);
    w.events.emit('barrierUp', { barrier: b });
    return b;
  }

  takeDown(b, broken) {
    if (b.state !== 'up') return;
    b.state = 'down';
    b.t = 0;
    this.world.events.emit('barrierDown', { barrier: b, broken });
  }

  // A standing wall the given fighter cannot pass that lies between him and x.
  between(f, x) {
    for (const b of this.list) {
      if (b.state !== 'up' || b.team === f.team) continue;
      const side = b.sides.get(f.id) ?? (Math.sign(f.x - b.x) || 1);
      if (Math.sign(x - b.x) === -side) return b;
    }
    return null;
  }

  // Would a blow from `atk` to `def` go through a wall `atk` can't pass?
  blocks(atk, def) { return !!this.between(atk, def.x); }

  // The fire walls standing, as fire regions for effects/Burn.js.
  fireRegions() {
    const bd = this.world.bounds;
    return this.up.filter((b) => b.kind === 'fire')
      .map((b) => ({ x: b.x, z: (bd.minZ + bd.maxZ) / 2, w: b.half * 2 + 14, d: bd.maxZ - bd.minZ + 24 }));
  }

  // One tick (after movement, before hits are checked).
  update() {
    const w = this.world;
    for (const b of this.list) {
      if (b.state === 'down') { b.t++; continue; }
      b.t++;
      b.life--;
      for (const [id, c] of b.cool) { if (c <= 1) b.cool.delete(id); else b.cool.set(id, c - 1); }
      for (const f of w.fighters) {
        if (f.team === b.team || f.removeMe) continue;
        // (a finisher places its victims itself)
        if (f.state === 'executed' || f.state === 'execute') continue;
        let side = b.sides.get(f.id);
        if (side === undefined) {
          side = Math.sign(f.x - b.x) || 1;
          b.sides.set(f.id, side);
        }
        if ((f.x - b.x) * side < b.half) {
          f.x = b.x + side * b.half;
          if (f.vx * side < 0) f.vx = f.state === 'knockdown' ? -f.vx * 0.15 : 0; // slams into it and drops
          f.bowl = null;
        }
        if (b.kind === 'fire') this.scorch(b, f, side);
      }
      if (b.maxHp > 0) this.battered(b);
      if (b.life <= 0 || (b.maxHp > 0 && b.hp <= 0)) this.takeDown(b, b.hp <= 0 && b.maxHp > 0);
    }
    // a wall that has finished coming down is gone
    const gone = this.list.filter((b) => b.state === 'down' && b.t >= b.collapse);
    if (gone.length) {
      this.list = this.list.filter((b) => !gone.includes(b));
      for (const b of gone) w.events.emit('barrierGone', { barrier: b });
    }
  }

  // The fire wall burns whoever is pressed against it, and shoves him back.
  scorch(b, f, side) {
    const k = b.cfg;
    if (!f.alive || f.invincible || f.h > 70 || b.cool.has(f.id)) return;
    if ((f.x - b.x) * side > b.half + 10) return;
    b.cool.set(f.id, k.tickRate);
    const move = {
      cut: 'fire', fx: 'wallBurn', noBlood: true,
      damage: k.damage, hitstun: 16, hitstop: 2, shake: 0,
      knockback: { x: k.knockback, y: 0 }, guardDamage: 8,
    };
    this.world.combat.resolve(b.owner, f, move, {
      kind: 'magic', fromX: b.x, dir: side,
      contact: { x: b.x + side * b.half, h: f.h + f.stats.body.h * 0.45 },
    });
  }

  // Earth: strong enemies' blows chip the stone away.
  battered(b) {
    for (const f of this.world.fighters) {
      const info = f.activeAttack;
      if (!info || f.team === b.team || b.hitBy.has(info)) continue;
      const hb = toWorldBox(f, info.hitbox ?? info.move.hitbox);
      const box = { left: b.x - b.half, right: b.x + b.half, bottom: 0, top: 220, z: f.z };
      if (!overlaps(hb, box, 999)) continue;
      b.hitBy.add(info);
      const dmg = (info.move.damage ?? 8) * (f.stats.meleeMult ?? 1) * (info.move.breaksGuard ? 1.6 : 1);
      b.hp = Math.max(0, b.hp - dmg);
      this.world.events.emit('barrierHit', { barrier: b, x: b.x + (b.sides.get(f.id) ?? 1) * b.half, z: f.z, h: 50, damage: dmg, by: f });
    }
  }
}
