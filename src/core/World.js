// World.js — The combat simulation: all fighters and projectiles, stepped at a fixed
// 60 frames per second. It knows nothing about graphics, so it can also run in
// automated tests (see tests/logic-test.js).

import { SETTINGS } from '../config/settings.js';
import { EventBus } from './EventBus.js';
import { CombatSystem } from '../combat/CombatSystem.js';
import { Projectile } from '../entities/Projectile.js';
import { Barriers } from '../combat/Barrier.js';
import { Mines } from '../combat/Mine.js';
import { Quakes } from '../combat/Quake.js';

export class World {
  constructor({ seed } = {}) {
    const w = SETTINGS.world;
    this.bounds = {
      minX: w.edgePadding, maxX: w.width - w.edgePadding,
      minZ: w.floorTop, maxZ: w.floorBottom,
    };
    this.fighters = [];
    this.projectiles = [];
    this.events = new EventBus();
    this.combat = new CombatSystem(this);
    this.barriers = new Barriers(this); // the Mage's walls (combat/Barrier.js)
    this.mines = new Mines(this);       // the Rogue's widow mines (combat/Mine.js)
    this.quakes = new Quakes(this);     // a boss's ground shockwaves (combat/Quake.js)
    this.frame = 0;
    // Dice. Every roll the simulation makes comes from roll(): a number fixed by the
    // seed, the tick, who's asking and what about — never Math.random — so two machines
    // given the same seed and the same button presses play out the same fight (online
    // co-op, net/Session.js), and a copy that has drifted falls back into step by itself.
    this.seed = (seed ?? Math.floor(Math.random() * 0xffffffff)) >>> 0;
    this.nextId = 1;
  }

  // 0..1 for (this tick, fighter id, salt). Same inputs = same number, on any machine.
  roll(id = 0, salt = 0) {
    let h = (this.seed ^ Math.imul(this.frame + 1, 0x9e3779b1) ^ Math.imul(id + 7, 0x85ebca6b) ^ Math.imul(salt + 13, 0xc2b2ae35)) >>> 0;
    h ^= h >>> 16; h = Math.imul(h, 0x7feb352d); h ^= h >>> 15; h = Math.imul(h, 0x846ca68b); h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
  }

  // A little generator for code that wants several rolls in a row (rng() style).
  rngFor(id, salt = 0) {
    let n = 0;
    return () => this.roll(id, salt * 131 + n++);
  }

  addFighter(f) {
    f.world = this;
    f.id = this.nextId++; // ids come from the world, in order: the same on every machine
    this.fighters.push(f);
    this.events.emit('fighterAdded', f);
    return f;
  }

  spawnSpell(owner, spell) {
    const p = spell.projectile;
    const n = p.count ?? 1;
    for (let i = 0; i < n; i++) {
      const offZ = n > 1 ? (i - (n - 1) / 2) * (p.spreadZ ?? 0) : 0;
      this.projectiles.push(new Projectile({
        owner, data: p, dir: owner.facing,
        x: owner.x + owner.facing * (owner.stats.body.w / 2 + p.w / 2),
        z: Math.max(this.bounds.minZ, Math.min(this.bounds.maxZ, owner.z + offZ)),
      }));
    }
    this.events.emit('spell', { owner, spell });
  }

  // One projectile with its own flight: from (x, z, h) at (vx, vz, vh) px/s. Used for
  // anything thrown at an angle (the Rogue's knives and shuriken).
  spawnProjectile(owner, data, { x, z, h, vx, vz = 0, vh = 0 }) {
    const p = new Projectile({ owner, data, x, z, dir: Math.sign(vx) || owner.facing });
    p.h = h;
    p.vx = vx; p.vz = vz; p.vh = vh;
    this.projectiles.push(p);
    this.events.emit('projectile', { projectile: p });
    return p;
  }

  // One fixed step (1/60 s).
  tick() {
    this.frame++;
    for (const f of this.fighters) f.update();
    for (const p of this.projectiles) p.update(this.bounds);
    this.separate();
    this.bowling();
    this.barriers.update(); // (last word on where people stand: nobody is shoved through a wall)
    this.mines.update();
    this.combat.update();
    this.quakes.update(); // (after the melee: whoever the slam itself hit, the wave passes by)

    const gone = this.fighters.filter((f) => f.removeMe);
    if (gone.length) {
      this.fighters = this.fighters.filter((f) => !f.removeMe);
      for (const f of gone) this.events.emit('fighterRemoved', f);
    }
    for (const p of this.projectiles) if (!p.alive && p.grounded) this.events.emit('projectileGround', { projectile: p });
    this.projectiles = this.projectiles.filter((p) => p.alive);
  }

  // Gently push standing fighters apart so they don't stack on top of each other.
  separate() {
    // (nobody gets shoved out of an execution: it places both of them itself)
    const fs = this.fighters.filter((f) => f.alive && f.grounded && !['dodge', 'blink', 'viper', 'vault', 'execute', 'executed'].includes(f.state));
    for (let i = 0; i < fs.length; i++) {
      for (let j = i + 1; j < fs.length; j++) {
        const a = fs[i];
        const b = fs[j];
        const dx = b.x - a.x;
        const minX = ((a.stats.body.w + b.stats.body.w) / 2) * 0.8;
        if (Math.abs(b.z - a.z) < 14 && Math.abs(dx) < minX) {
          const push = ((minX - Math.abs(dx)) / 2) * 0.5;
          const s = Math.sign(dx) || 1;
          a.x -= s * push;
          b.x += s * push;
        }
      }
    }
  }

  // A kicked body flying backwards knocks down anyone on its team it crashes into.
  bowling() {
    for (const f of this.fighters) {
      const b = f.bowl;
      if (!b) continue;
      if (--b.frames <= 0 || Math.abs(f.vx) < 120) { f.bowl = null; continue; }
      for (const o of this.fighters) {
        if (o === f || o.team !== f.team || !o.alive || o.invincible || b.hit.has(o.id)) continue;
        if (o.state === 'knockdown' || o.state === 'getup') continue;
        const reach = ((f.stats.body.w + o.stats.body.w) / 2) * 0.9;
        if (Math.abs(o.x - f.x) > reach || Math.abs(o.z - f.z) > 22) continue;
        if (Math.sign(o.x - f.x) !== b.dir) continue; // only those in the flight path
        b.hit.add(o.id);
        o.health = Math.max(1, o.health - 5);
        o.fsm.change('knockdown', { vx: b.dir * Math.abs(f.vx) * 0.7, vh: 260 });
        o.bowl = { frames: 24, dir: b.dir, hit: b.hit }; // chain reaction
        this.events.emit('bowl', { fighter: o, by: f, x: (o.x + f.x) / 2, z: o.z, h: 50 });
      }
    }
  }

  livingPlayers() { return this.fighters.filter((f) => f.team === 'player' && f.alive); }
  livingEnemies() { return this.fighters.filter((f) => f.team === 'enemy' && f.alive); }
}
