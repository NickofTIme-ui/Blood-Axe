// Storm.js — What Oryn's STORMCALLER branch leaves behind (data/skills.js): STATIC
// CHARGE's fields on the ground and THUNDERHEAD's strike from the sky. Game logic only
// (effects/MageFX.js draws them), stepped once a tick by the World, no dice: both online
// machines see the same shocks.
//
//   static field   left where the 3rd strike of his lightning combo hit its first man:
//                  for `life` frames, any of his enemies inside it is shocked (`damage`,
//                  a short seize) — once every `every` frames each
//   thunder        a fully overcharged bolt also calls this down on its first man,
//                  `delay` frames later: everyone of his enemies close by is hit hard and
//                  knocked down
// Events: stormField { field }, stormShock { field, target }, thunderStrike { strike, hits }

export const STORM = {
  field: { life: 150, radius: 70, depth: 34, damage: 6, every: 30, hitstun: 18 },
  thunder: { delay: 20, radius: 90, depth: 40, damage: 30 },
};

export class Storms {
  constructor(world) {
    this.world = world;
    this.list = [];
  }

  foes(by) {
    return this.world.fighters.filter((e) => e.team !== by.team && e.alive && !e.removeMe && !['executed', 'dead'].includes(e.state));
  }

  field(by, x, z, opts = {}) {
    const f = { kind: 'static', by, x, z, t: 0, cool: new Map(), ...STORM.field, ...opts };
    this.list.push(f);
    this.world.events.emit('stormField', { field: f });
    return f;
  }

  thunder(by, target, opts = {}) {
    const s = { kind: 'thunder', by, target, x: target.x, z: target.z, t: 0, ...STORM.thunder, ...opts };
    this.list.push(s);
    return s;
  }

  update() {
    if (!this.list.length) return;
    for (const s of this.list) {
      s.t++;
      if (s.kind === 'static') this.shock(s);
      else if (s.t === s.delay) this.strike(s);
    }
    this.list = this.list.filter((s) => (s.kind === 'static' ? s.t < s.life : s.t < s.delay));
  }

  shock(s) {
    for (const [id, c] of s.cool) { if (c <= 1) s.cool.delete(id); else s.cool.set(id, c - 1); }
    for (const e of this.foes(s.by)) {
      if (s.cool.has(e.id) || Math.abs(e.x - s.x) > s.radius || Math.abs(e.z - s.z) > s.depth || e.h - e.floor > 40) continue;
      s.cool.set(e.id, s.every);
      const move = { cut: 'shock', fx: 'lightning', noBlood: true, damage: s.damage, hitstun: s.hitstun, hitstop: 3, shake: 1, knockback: { x: 40, y: 0 }, guardDamage: 6 };
      this.world.combat.resolve(s.by, e, move, { kind: 'magic', fromX: s.x, dir: Math.sign(e.x - s.x) || 1, contact: { x: e.x, h: e.h + 30 } });
      e.shock = Math.max(e.shock ?? 0, 16);
      this.world.events.emit('stormShock', { field: s, target: e });
    }
  }

  strike(s) {
    // (it falls where he is now, if he still stands; else where he was)
    if (s.target?.alive) { s.x = s.target.x; s.z = s.target.z; }
    const hits = [];
    for (const e of this.foes(s.by)) {
      if (Math.abs(e.x - s.x) > s.radius || Math.abs(e.z - s.z) > s.depth) continue;
      const dir = Math.sign(e.x - s.x) || 1;
      const move = { cut: 'shock', fx: 'lightning', noBlood: true, damage: s.damage, hitstun: 40, hitstop: 10, shake: 10, knockback: { x: 240, y: 320 }, knockdown: true, breaksGuard: true, guardDamage: 60 };
      this.world.combat.resolve(s.by, e, move, { kind: 'magic', fromX: s.x, dir, contact: { x: e.x, h: e.h + 60 } });
      e.shock = Math.max(e.shock ?? 0, 40);
      hits.push(e);
    }
    this.world.events.emit('thunderStrike', { strike: s, hits });
  }
}
