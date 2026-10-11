// Wrath.js — Rurik's fire, the skill tree's THE KING'S WRATH branch (data/skills.js).
// Pure logic on the World (effects/WrathFX.js draws it from the events), so the tests
// can drive it and online stays in step.
//
//   KINGSFIRE        HOLD the spell button: he drives Oathbrand into the floor and a road
//                    of fire erupts ahead of him, pillar after pillar marching out. Every
//                    man a pillar catches is thrown up burning; a man it kills BLOWS UP.
//                    (A tap still throws the Firebolt: the 'kingcast' state decides.)
//   THE KING'S WRATH (the major) the hold becomes his wrath: he roars, fire bursts out of
//                    him in a ring, then the road runs BOTH ways and twice as far. Every
//                    man the fire kills goes up like a powder keg, and his blast sets off
//                    the men around him (a chain, `blast.chain` deep).
//
// Events: wrathStart { fighter, wrath }   wrathRelease { fighter, wrath, x, z }
//         wrathPillar { owner, x, z, i, last, wrath }   wrathNova { owner, x, z, radius }
//         wrathBlast { owner, x, z, h, depth }

export const WRATH = {
  hold: 12,          // frames the spell button is held before a tap turns into Kingsfire
  swordMana: 5,      // mana a sword kill gives back (Kingsfire and up: the fire feeds on it)
  kingsfire: {
    cost: 40, startup: 20, recovery: 26,
    pillars: 6, first: 54, gap: 44, every: 3, // where and how fast the road runs out
    width: 50, depth: 34, reach: 150,         // one pillar's bite (reach: how high it hits)
    damage: 44, lift: 520, push: 140,
  },
  wrath: {
    cost: 50, startup: 34, recovery: 30,
    pillars: 9, first: 70, gap: 46, every: 2,
    width: 56, depth: 40, reach: 170,
    damage: 50, lift: 600, push: 180,
    nova: { radius: 170, depth: 64, damage: 46, lift: 560, push: 380 },
  },
  blast: { radius: 100, depth: 44, damage: 32, lift: 460, push: 320, chain: 3, delay: 7 },
};

// The blow a fire pillar (or the ring, or a blast) lands. Built per man so a boss is never
// blown apart by it (his death is his own scene).
function fireMove(def, { damage, lift, push }, extra = {}) {
  return {
    cut: 'fire', wrath: true, unblockable: true,
    damage, hitstun: 34, hitstop: 8, shake: 6,
    knockback: { x: push, y: lift }, knockdown: true, guardDamage: 60,
    fatality: def.stats.boss ? undefined : 'explode',
    ...extra,
  };
}

export class Wraths {
  constructor(world) {
    this.world = world;
    this.roads = [];
    this.blasts = [];
    // a man the King's Wrath kills goes up and takes his neighbours with him
    world.events.on('kill', (e) => {
      const m = e.move;
      const a = e.attacker;
      if (!m?.wrath || !a?.stats?.skills?.wrathChain || e.defender?.team === a.team) return;
      const depth = (m.chainDepth ?? 0) + 1;
      if (depth > WRATH.blast.chain) return;
      const d = e.defender;
      this.blasts.push({ owner: a, x: d.x, z: d.z, h: d.h, depth, at: world.frame + WRATH.blast.delay, from: d.id });
    });
  }

  clear() { this.roads = []; this.blasts = []; }

  // The road of fire: out from his feet in `dir`.
  road(owner, cfg, dir, wrath) {
    this.roads.push({ owner, team: owner.team, cfg, dir, wrath, x0: owner.x, z: owner.z, floor: owner.floor ?? 0, t: 0, next: 0, hitList: new Set() });
  }

  // The ring that bursts out of him (the King's Wrath).
  nova(owner, cfg) {
    const w = this.world;
    const N = cfg.nova;
    w.events.emit('wrathNova', { owner, x: owner.x, z: owner.z, radius: N.radius });
    for (const f of w.fighters) {
      if (f.team === owner.team || !f.alive || f.removeMe || f.invincible) continue;
      const dx = f.x - owner.x;
      if (Math.abs(dx) > N.radius || Math.abs(f.z - owner.z) > N.depth || f.h - (owner.floor ?? 0) > 160) continue;
      const dir = Math.sign(dx) || owner.facing;
      w.combat.resolve(owner, f, fireMove(f, N), { kind: 'magic', fromX: owner.x, dir, contact: { x: f.x, h: f.h + 50 } });
    }
  }

  update() {
    const w = this.world;
    const b = w.bounds;
    for (const r of this.roads) {
      const K = r.cfg;
      if (r.t++ % K.every !== 0) continue;
      const i = r.next++;
      const x = r.x0 + r.dir * (K.first + i * K.gap);
      if (i >= K.pillars || x < b.minX - 10 || x > b.maxX + 10) { r.done = true; continue; }
      w.events.emit('wrathPillar', { owner: r.owner, x, z: r.z, floor: r.floor, i, last: i === K.pillars - 1, wrath: r.wrath, dir: r.dir });
      for (const f of w.fighters) {
        if (f.team === r.team || !f.alive || f.removeMe || f.invincible || r.hitList.has(f.id)) continue;
        if (Math.abs(f.x - x) > K.width / 2 + f.stats.body.w / 2 || Math.abs(f.z - r.z) > K.depth) continue;
        if (f.h - r.floor > K.reach) continue; // (high over it)
        r.hitList.add(f.id);
        w.combat.resolve(r.owner, f, fireMove(f, K), { kind: 'magic', fromX: x - r.dir * 20, dir: r.dir, contact: { x: f.x, h: f.h + 30 } });
      }
    }
    this.roads = this.roads.filter((r) => !r.done);

    // the powder kegs: each dead man's blast, a beat after he went up
    const due = this.blasts.filter((q) => w.frame >= q.at);
    if (!due.length) return;
    this.blasts = this.blasts.filter((q) => w.frame < q.at);
    const B = WRATH.blast;
    for (const q of due) {
      w.events.emit('wrathBlast', { owner: q.owner, x: q.x, z: q.z, h: q.h, depth: q.depth });
      for (const f of w.fighters) {
        if (f.team === q.owner.team || !f.alive || f.removeMe || f.invincible || f.id === q.from) continue;
        const dx = f.x - q.x;
        if (Math.abs(dx) > B.radius || Math.abs(f.z - q.z) > B.depth || Math.abs(f.h - q.h) > 120) continue;
        w.combat.resolve(q.owner, f, fireMove(f, B, { chainDepth: q.depth }), { kind: 'magic', fromX: q.x, dir: Math.sign(dx) || 1, contact: { x: f.x, h: f.h + 40 } });
      }
    }
  }
}
