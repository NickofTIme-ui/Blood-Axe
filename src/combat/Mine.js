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

  // Stick one ON a man (she rolled through him): it rides him wherever he goes and goes
  // off on a short fuse. An ordinary soldier is blown to bits most times; the very strong
  // and bosses take a heavier blast than a floor mine's and live through it.
  stick(owner, victim, cfg) {
    const mine = this.drop(owner, victim.x, victim.z, cfg, { fastArm: cfg.stickFuse });
    mine.stuck = victim;
    // how he'll take it when he realises (view/SpriteEnemyView.js, effects/RogueFX.js)
    victim.doom = { kind: Math.floor(this.world.rngFor(victim.id, 24)() * 4) };
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
      if (m.stuck) {
        const v = m.stuck;
        if (!v.alive || v.removeMe) { m.stuck = null; v.doom = null; } // he died first: it drops where he fell
        else {
          m.x = v.x; m.z = v.z;
          // the last moments: he stops dead, looking at it (frozen like a hero in awe)
          if (m.arm - m.t <= m.cfg.dread && !v.stats.boss) v.awe = Math.max(v.awe || 0, 2);
          if (m.t >= m.arm) { this.blast(m); v.doom = null; v.awe = 0; }
          continue;
        }
      }
      if (!m.armed && m.t >= m.arm) { m.armed = true; w.events.emit('mineArmed', { mine: m }); }
      if (!m.special && m.t >= m.cfg.life) { this.fizzle(m); continue; }
      if (m.armed && m.cue < 0 && !m.special) {
        const near = w.fighters.some((f) => f.team !== m.team && f.alive && !f.removeMe && f.air < 40 &&
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
      const stuck = f === m.stuck;
      if (f.team === m.team || !f.alive || f.removeMe || (f.invincible && !stuck)) continue;
      if (f.state === 'executed' && !(victims && victims.includes(f))) continue;
      const dx = f.x - m.x;
      const d = Math.hypot(dx, (f.z - m.z) * 1.4);
      if (d > K.outer) continue;
      if (!stuck && w.frame - (this.hurtAt.get(f.id) ?? -1e9) < K.hitCooldown) continue;
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
      // How a mine kills: never a clean cut. Close in it blows a man to bits about half
      // the time, otherwise it takes his legs off; a man who lives is thrown down.
      const rng = w.rngFor(f.id, 23);
      move.fatality = rng() < (share >= 0.8 ? K.bits : K.bits * 0.3) ? 'explode' : 'limbs';
      if (stuck) {
        if (!boss && !heavy && rng() < K.stuckKill) { move.damage = f.health + 60; move.fatality = 'explode'; }
        else move.damage = K.damage * K.stuckMult * (boss ? K.boss : 1);
      }
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
