// Mine.js — The Rogue's WIDOW MINES. Pure logic on the World (effects/RogueFX.js draws
// them from the events), so the tests can drive it.
//
// A mine is dropped at her feet, claws into the floor, arms, and waits. It knows ENEMIES
// only: she and her allies can stand on it, walk over it and fight round it. An enemy
// inside the trigger radius sets off a short, readable cue — then it goes off: full
// damage inside the inner radius, falling off to the outer edge, everyone thrown away
// from the centre (and bowled into whoever is behind them). Brutes stagger more than
// they fly; bosses take a share of it and barely move.
//
// Limits: a few active per Rogue (a new one replaces her oldest), a cooldown between
// drops, a lifespan, and no man can be hurt by two blasts within `hitCooldown` frames —
// ten mines under a boss do the damage of one.
//
// Events: mineDrop { mine }  mineArmed { mine }  mineCue { mine }
//         mineBlast { mine, hits }  mineFizzle { mine }

export class Mines {
  constructor(world) {
    this.world = world;
    this.list = [];
    this.nextId = 1;
    this.hurtAt = new Map(); // fighter id -> frame a blast last hurt him
  }

  clear() {
    for (const m of this.list) this.world.events.emit('mineFizzle', { mine: m, quiet: true });
    this.list = [];
  }

  // Drop one at (x, z) for `owner`. cfg: kit.mine. Returns the mine.
  drop(owner, x, z, cfg, { fastArm = 0, special = false } = {}) {
    const w = this.world;
    const mine = {
      id: this.nextId++, owner, team: owner.team, x, z, cfg, special,
      t: 0, armed: false, cue: -1, done: false, arm: fastArm || cfg.arm,
    };
    // past her limit: her oldest goes quietly
    const mine0 = this.list.filter((m) => m.owner === owner && !m.special);
    if (!special && mine0.length >= cfg.maxActive) this.fizzle(mine0[0]);
    this.list.push(mine);
    w.events.emit('mineDrop', { mine });
    return mine;
  }

  fizzle(m) {
    m.done = true;
    this.list = this.list.filter((q) => q !== m);
    this.world.events.emit('mineFizzle', { mine: m });
  }

  update() {
    const w = this.world;
    for (const m of [...this.list]) {
      if (m.done) continue;
      m.t++;
      if (!m.armed && m.t >= m.arm) { m.armed = true; w.events.emit('mineArmed', { mine: m }); }
      if (!m.special && m.t >= m.cfg.life) { this.fizzle(m); continue; }
      if (m.armed && m.cue < 0 && !m.special) {
        const near = w.fighters.some((f) => f.team !== m.team && f.alive && !f.removeMe && f.h < 40 &&
          f.state !== 'executed' && Math.hypot(f.x - m.x, (f.z - m.z) * 1.4) <= m.cfg.trigger);
        if (near) { m.cue = 0; w.events.emit('mineCue', { mine: m }); }
      }
      if (m.cue >= 0 && ++m.cue > m.cfg.cue) this.blast(m);
    }
  }

  // Set it off now (a finisher's mine goes off on its own beat).
  blast(m, { victims = null } = {}) {
    if (m.done) return [];
    const w = this.world;
    const K = m.cfg;
    m.done = true;
    this.list = this.list.filter((q) => q !== m);
    const hits = [];
    for (const f of w.fighters) {
      if (f.team === m.team || !f.alive || f.removeMe || f.invincible) continue;
      if (f.state === 'executed' && !(victims && victims.includes(f))) continue;
      const dx = f.x - m.x;
      const d = Math.hypot(dx, (f.z - m.z) * 1.4);
      if (d > K.outer) continue;
      if (w.frame - (this.hurtAt.get(f.id) ?? -1e9) < K.hitCooldown) continue;
      this.hurtAt.set(f.id, w.frame);
      const t = d <= K.inner ? 0 : (d - K.inner) / (K.outer - K.inner);
      const share = 1 - (1 - K.falloff) * t;
      const boss = !!f.stats.boss;
      const heavy = f.stats.maxHealth >= K.heavyHealth;
      const throwK = boss ? 0.15 : heavy ? K.heavyLaunch : 1;
      const dir = Math.sign(dx) || m.owner.facing;
      const move = {
        cut: 'explosive', fx: 'mine', noBlood: false,
        damage: K.damage * share * (boss ? K.boss : 1), hitstun: 34, hitstop: 6, shake: 0,
        knockback: { x: K.launch * share * throwK, y: boss ? 0 : K.lift * share * (heavy ? 0.5 : 1) },
        knockdown: !boss, bowl: !boss && !heavy, breaksGuard: true, guardDamage: 80,
      };
      w.combat.resolve(m.owner, f, move, { kind: 'magic', fromX: m.x, dir, contact: { x: f.x - dir * 6, h: f.h + f.stats.body.h * 0.45 } });
      hits.push(f);
    }
    // other mines caught in it are blown away with it (they don't stack a second blast)
    for (const o of [...this.list]) {
      if (Math.hypot(o.x - m.x, (o.z - m.z) * 1.4) <= K.inner) this.fizzle(o);
    }
    w.events.emit('mineBlast', { mine: m, hits });
    return hits;
  }
}
