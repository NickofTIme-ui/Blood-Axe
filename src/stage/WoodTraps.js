// WoodTraps.js — Gallows Wood's own ways to fight (level 2, data/stageWood.js; Nick's review
// list, 2026-11-05: "the village burned around you; the wood hunts you"). Everything here is
// the wood's and no other level's: fire, beams and bombardment belong to the others.
//
//   THE WOOD AS A WEAPON (stage data, a section's `props` and the level's `traps`)
//   pine      prop: a notched pine on the bank. Three good blows and it goes over the way it
//             was struck, crushing whoever is under it; where it lands it becomes the log
//             bridge (terrain blocks with its `bridge` tag stand only once it is down)
//   logpile   prop: the stay rope of a stacked woodpile up the bank. Cut it and the trunks
//             thunder down across the lane in the band below (x0..x1), flattening a wave
//   snare     trap: a noose hidden in the leaves, its bent sapling; whoever steps in is caught
//             by the ankle: men struggle a while, a hero mashes any button to cut free
//   stakes    trap: a pit of stakes under a mat of leaves (readable: a darker, sunken patch).
//             It gives under whoever lands on or walks on it: a man is done; a hero loses a
//             fifth of his health and scrambles out. Open, it stays open
//   deadfall  trap: a spiked trunk slung on a long rope from a bough far above, hauled up out
//             of sight and tied off to a tripwire across the road. Whoever trips the wire
//             (hero or man) hears the rope go, and a moment later it swings in from above
//             the top of the screen and through the lane: a man is smashed apart on its
//             spikes, a hero loses near half his health and is flung. It swings itself out,
//             then the woodsmen's pulley hauls it back up and the wire is set again
//             (Nick, 2026-11-16: "should swing in from above the map with a spike on it")
//
//   THE WOOD'S MEN (a wave's roster: 'type:role', entities/Enemy.js createEnemy)
//   horn      the hornblower: runs for the back of the road and sounds his horn. Not stopped
//             (hit, or killed) before it sounds, it calls `calls` (the section's `horn`)
//   net       a woodsman with a weighted net: he keeps his distance, swings it over his head
//             (the tell) and throws; caught, a hero is pinned until he cuts free
//
//   READABLE AMBUSHES (stage/Stage.js spawnWave, a spawn's `tell`): men waiting up in the
//   branches over the road. The crows burst up and the boughs creak (view/WoodTrapsView.js),
//   and only then do they drop.
//
import { createEnemy, offscreenX, inView } from '../entities/Enemy.js';

// All of it is the sim's (online: both machines step it the same); the view listens for the
// events it emits.

export const TRAPS = {
  pine: { fall: 46, len: 250, lane: 34, heroDamage: 22 },
  logs: { delay: 26, sweep: 64, band: 26, heroDamage: 18 },
  snare: { reach: 22, hold: 150, mash: 5, enemyHold: 130 },
  stakes: { heroShare: 0.2, cool: 60 },
  horn: { blow: 240, retry: 150, post: 320 },
  net: { keep: [190, 300], every: [210, 330], windup: 44, speed: 9, range: 380, reach: 30, depth: 24 },
  // the deadfall: rope length (px), how high up it's held (radians off the hang: out of sight),
  // the pull of its swing and how fast it dies, the rope's warning, how near the wire trips it,
  // its reach along and across the lane, how low it must be to strike, what it does, and how
  // long before it's hauled back up and how long the haul takes (cool: once a man, each drop)
  deadfall: { len: 460, held: -1.45, pull: 0.0049, damp: 0.018, warn: 22, wire: 14, lane: 38,
    reach: 80, low: 120, heroShare: 0.45, bossShare: 0.22, cool: 999, rest: 200, haul: 150 },
  // the convoy's Wagonmaster on the driver's bench: his whip reaches this far, after a wind-up
  // the Houndmaster's kennels: his whistle sends every loose hound in, two pounces each
  kennel: { whistle: [360, 520], tell: 34, lunges: 2, lungeAt: 220, give: 300, net: [260, 380] },
  driver: { reach: 230, depth: 64, windup: 34, every: [80, 140], damage: 9, health: 1.7, seat: 0.32 },
  // a hound knocked down in the mouth of an open pen: the gate slams on it (out of the fight,
  // till the Houndmaster whistles that pen open again: once a pen)
  slam: { reach: 44, depth: 70 },
  // the Houndmaster's chain whip (from his pack phase): wound back (the tell), cracked out, and
  // it drags the hero in to him and his dogs; a dodge (or any button, mashed) breaks it
  chain: { every: [240, 360], windup: 38, reach: [90, 300], depth: 40, damage: 6, pull: 8, hold: 34, mash: 3 },
  // his last hound dead: the fight goes out of him (slower, open, a different last word)
  broken: { speed: 0.72, damage: 0.8, ai: { attackCooldown: [44, 84], comboChance: 0.25, blockChance: 0.05 } },
  // a loose pack (two hounds or more on one hero): they circle him at a distance and go in one
  // at a time, ears up first (the tell); a bite can lock on and drag him (mash to shake it off)
  pack: { ring: 175, spin: 0.012, turn: 150, tell: 26 },
  latch: { chance: 0.3, hold: 110, mash: 5, drag: 1.6, every: 30, damage: 2 },
  // the mist bank over the cage carts: while their signal lantern burns, men keep coming out of
  // it (one every `every`, `cap` in all); smash the lantern and no more come
  mist: { every: 300, first: 150, cap: 3, foes: 4 },
};

export class WoodTraps {
  constructor(stage) {
    this.stage = stage;
    this.world = stage.world;
    const data = stage.data;
    this.traps = (data.traps ?? []).map((t, i) => ({ id: i, ...t, sprung: false, open: false, cool: new Map() }));
    this.nets = [];   // nets in flight
    this.rolls = [];  // log piles let go
    this.falls = [];  // pines coming down
    this.hz = { id: 'woodTraps', cool: new Map() }; // (for Stage.hurt's cooldowns)
    // the bridges a pine makes don't stand till it falls
    for (const pr of stage.props) {
      if (pr.kind !== 'pine' || !pr.bridge) continue;
      for (const b of stage.terrain?.blocks ?? []) if (b.tag === pr.bridge) { b.solid = false; b.waiting = true; }
    }
    // the convoy's wagon: its roof a moving floor to fight on (a 'cart' block that rides with
    // it); its driver mounts when its fight starts
    this.carts = [];
    this.downed = []; // pines lying across the road (the wagon can't pass one)
    for (const pr of stage.props) {
      if (!pr.roll || !pr.roof || !stage.terrain) continue;
      const half = pr.w * 0.45;
      const b = { id: 9000 + pr.id, kind: 'cart', x0: pr.x - half, x1: pr.x + half, z0: pr.z - pr.roof.d, z1: pr.z + pr.roof.d, top: pr.roof.top, solid: true, dx: 0, dtop: 0, hideArt: true, base: {} };
      stage.terrain.blocks.push(b);
      this.carts.push({ pr, b, driver: null, fresh: true }); // (fresh: the level is only now coming up)
    }
    // the kennels' pens: hounds behind their gates, let out as the Houndmaster's fight turns
    this.pens = [];
    stage.sections.forEach((sec, i) => (sec.pens ?? []).forEach((pen, k) => this.pens.push({ id: k, section: i, ...pen, hounds: [], placed: false, open: false })));
    this.penFresh = true;
    this.world.events.on('bossPhase', ({ phase }) => { for (const k of phase.pens ?? []) this.openPen(this.pens.find((q) => q.id === k && q.section === this.stage.index)); });
    // the mist banks and their signal lanterns (a section's `mist`)
    this.mists = [];
    stage.sections.forEach((sec, i) => { if (sec.mist) this.mists.push({ section: i, ...sec.mist, sent: 0, t: 0, out: false }); });
    this.world.events.on('hit', (e) => this.onHit(e));
    this.world.events.on('propBreak', ({ prop, dir }) => {
      if (prop.kind === 'signal') for (const M of this.mists) if (M.tag === prop.tag && !M.out) { M.out = true; this.world.events.emit('signalOut', { prop, mist: M }); }
      if (prop.kind === 'pine') this.fell(prop, dir);
      if (prop.kind === 'logpile') this.rolls.push({ pile: prop, t: 0, hz: { id: `logs${prop.id}`, cool: new Map() } });
    });
  }

  get heroes() { return this.stage.players?.filter((p) => p.alive) ?? []; }
  near(sec) { return Math.abs(this.stage.index - sec) <= 1; }

  update() {
    for (const [id, c] of this.hz.cool) { if (c <= 1) this.hz.cool.delete(id); else this.hz.cool.set(id, c - 1); }
    this.updateFalls();
    this.updateRolls();
    for (const t of this.traps) {
      if (t.section != null && !this.near(t.section)) continue;
      for (const [id, c] of t.cool) { if (c <= 1) t.cool.delete(id); else t.cool.set(id, c - 1); }
      if (t.type === 'snare') this.updateSnare(t);
      else if (t.type === 'stakes') this.updateStakes(t);
      else if (t.type === 'deadfall') this.updateDeadfall(t);
    }
    for (const f of this.world.fighters) {
      if (f.chained) this.holdChained(f);
      if (f.latch) this.holdLatched(f);
      if (f.snare) this.holdSnared(f);
      if (f.hang > 0) this.holdHanging(f);
      if (f.team === 'enemy' && f.alive && f.role && !f.roleSet) this.giveRole(f);
    }
    this.updateNets();
    for (const C of this.carts) this.updateCart(C);
    this.updatePens();
    this.updatePack();
    for (const M of this.mists) this.updateMist(M);
  }

  // ------------------------------------------------------------ the notched pine

  fell(pr, dir) {
    const d = pr.fellDir ?? (dir || 1);
    this.falls.push({ pr, dir: d, t: 0 });
    this.world.events.emit('pineFalling', { prop: pr, dir: d });
  }

  updateFalls() {
    for (const F of this.falls) {
      F.t++;
      if (F.t !== TRAPS.pine.fall) continue;
      const P = TRAPS.pine; const pr = F.pr;
      const len = pr.len ?? P.len;
      const x0 = Math.min(pr.x, pr.x + F.dir * len); const x1 = Math.max(pr.x, pr.x + F.dir * len);
      // whoever it comes down on: a man is crushed under it; a hero is battered flat
      for (const f of this.world.fighters) {
        if (!f.alive || f.x < x0 || f.x > x1 || Math.abs(f.z - pr.z) > P.lane || f.h > 120) continue;
        if (f.team === 'player') this.stage.hurt(this.hz, f, P.heroDamage, F.dir, 'beam');
        else this.stage.hurt(this.hz, f, f.stats.boss ? f.stats.maxHealth * 0.25 : f.health + 1, F.dir, f.stats.boss ? 'beam' : 'trample');
      }
      for (const b of this.stage.terrain?.blocks ?? []) if (b.tag === pr.bridge && b.waiting) { b.solid = true; b.waiting = false; }
      this.downed.push({ x0, x1, z: pr.z });
      this.world.events.emit('pineDown', { prop: pr, dir: F.dir, x0, x1 });
    }
    this.falls = this.falls.filter((F) => F.t < TRAPS.pine.fall + 2);
  }

  // ------------------------------------------------------------ the log pile

  updateRolls() {
    const L = TRAPS.logs;
    for (const R of this.rolls) {
      R.t++;
      for (const [id, c] of R.hz.cool) { if (c <= 1) R.hz.cool.delete(id); else R.hz.cool.set(id, c - 1); }
      if (R.t === L.delay) this.world.events.emit('logsLoose', { pile: R.pile });
      const k = (R.t - L.delay) / L.sweep;
      if (k < 0 || k > 1) continue;
      const roll = R.pile.lane; const front = roll.z0 + (roll.z1 - roll.z0) * k;
      R.front = front;
      for (const f of this.world.fighters) {
        if (!f.alive || f.x < roll.x0 || f.x > roll.x1 || Math.abs(f.z - front) > L.band || f.h - (f.floor ?? 0) > 60) continue;
        const dir = Math.sign(f.x - (roll.x0 + roll.x1) / 2) || 1;
        if (f.team === 'player') this.stage.hurt(R.hz, f, L.heroDamage, dir, 'beam');
        else this.stage.hurt(R.hz, f, f.stats.boss ? f.stats.maxHealth * 0.2 : f.health + 1, dir, f.stats.boss ? 'beam' : 'trample');
      }
    }
    this.rolls = this.rolls.filter((R) => R.t <= L.delay + L.sweep + 30);
  }

  // ------------------------------------------------------------ snares

  updateSnare(t) {
    if (t.sprung) return;
    for (const f of this.world.fighters) {
      if (!f.alive || f.entering || f.snare || f.hang > 0 || !f.grounded) continue;
      if (Math.abs(f.x - t.x) > TRAPS.snare.reach || Math.abs(f.z - t.z) > TRAPS.snare.reach * 0.7) continue;
      if (f.team === 'player' && f.invincible) continue; // (rolling over it)
      t.sprung = true; t.caught = f.id;
      this.snare(f, 'snare', t);
      return;
    }
  }

  // Caught: by a snare's noose, or under a thrown net. A man struggles a while; a hero mashes
  // any button to get free (a hit on him cuts him loose too: he's knocked out of it).
  snare(f, kind, t = null) {
    const S = TRAPS.snare;
    f.snare = { kind, left: f.team === 'player' ? S.mash : 0, t: 0, hold: f.team === 'player' ? S.hold : S.enemyHold, trap: t?.id ?? null, x: f.x, z: f.z };
    f.vx = 0; f.vz = 0;
    f.fsm.change('hitstun', { frames: 9999 });
    this.world.events.emit('snared', { fighter: f, kind, trap: t });
  }

  holdSnared(f) {
    const N = f.snare;
    N.t++;
    if (!f.alive || f.state !== 'hitstun') { this.release(f, false); return; } // (knocked out of it, or dead)
    f.x = N.x; f.z = N.z; f.vx = 0; f.vz = 0;
    if (f.team === 'player') {
      for (const a of ['attack', 'heavy', 'jump', 'dodge', 'block', 'grab', 'magic']) if (f.controller.consume?.(a, 1)) { N.left--; this.world.events.emit('snareTug', { fighter: f }); }
      if (N.left <= 0 || N.t >= N.hold) this.release(f, true);
    } else if (N.t >= N.hold) this.release(f, true);
  }

  release(f, free) {
    const N = f.snare;
    f.snare = null;
    if (free && f.alive && f.state === 'hitstun') f.fsm.change('idle');
    this.world.events.emit('snareFree', { fighter: f, kind: N.kind });
  }

  // ------------------------------------------------------------ stake pits

  updateStakes(t) {
    const S = TRAPS.stakes;
    for (const f of this.world.fighters) {
      if (!f.alive || f.entering || f.hang > 0 || t.cool.has(f.id)) continue;
      if (Math.abs(f.x - t.x) > t.w / 2 || Math.abs(f.z - t.z) > t.d / 2) continue;
      if (f.h - (f.floor ?? 0) > 6) continue; // (over it, in the air: it gives when he comes down)
      if (!t.open) { t.open = true; this.world.events.emit('stakesOpen', { trap: t, fighter: f }); }
      t.cool.set(f.id, S.cool);
      const dir = Math.sign(f.x - t.x) || f.facing || 1;
      if (f.team === 'player') {
        this.stage.hurt(t.hz ??= { id: `stakes${t.id}`, cool: new Map() }, f, f.stats.maxHealth * S.heroShare, dir, 'blade');
      } else if (f.stats.boss) {
        this.stage.hurt(t.hz ??= { id: `stakes${t.id}`, cool: new Map() }, f, f.stats.maxHealth * 0.12, dir, 'blade');
      } else {
        // impaled: he goes down on the stakes and stays there
        f.impaledOn = t.id;
        f.x = t.x + (f.x - t.x) * 0.4; f.z = t.z;
        this.stage.hurt(t.hz ??= { id: `stakes${t.id}`, cool: new Map() }, f, f.health + 1, dir, 'blade');
        this.world.events.emit('stakesKill', { trap: t, fighter: f });
      }
    }
    if (t.hz) for (const [id, c] of t.hz.cool) { if (c <= 1) t.hz.cool.delete(id); else t.hz.cool.set(id, c - 1); }
  }

  // ------------------------------------------------------------ the deadfall

  // Where the trunk is: its middle's x, and how high it is off the ground (its rope hangs
  // from a bough `len` + its hang height up, straight over the wire)
  deadfallAt(t) {
    const D = TRAPS.deadfall;
    const a = t.angle ?? D.held;
    return { x: t.x + Math.sin(a) * D.len, h: D.len + 50 - Math.cos(a) * D.len, a };
  }

  updateDeadfall(t) {
    const D = TRAPS.deadfall;
    t.state ??= 'set'; t.angle ??= D.held; t.spin ??= 0; t.t ??= 0;
    t.t++;
    if (t.state === 'set') {
      // the wire: anyone on his feet crossing it in the lane
      const who = this.world.fighters.find((f) => f.alive && !f.entering && (f.team === 'player' || f.team === 'enemy')
        && Math.abs(f.x - t.x) <= D.wire && Math.abs(f.z - t.z) <= D.lane && f.h - (f.floor ?? 0) < 10);
      if (who) { t.state = 'warn'; t.t = 0; this.world.events.emit('deadfallTrip', { trap: t, fighter: who }); }
      return;
    }
    if (t.state === 'warn') {
      if (t.t >= D.warn) { t.state = 'swing'; t.t = 0; t.spin = 0; this.world.events.emit('deadfallSwing', { trap: t }); }
      return;
    }
    if (t.state === 'haul') {
      // the pulley takes it back up, slowly, out of sight; then the wire is set again
      t.angle += (D.held - t.angle) * Math.min(1, 1 / Math.max(1, D.haul - t.t));
      if (t.t >= D.haul) { t.state = 'set'; t.angle = D.held; t.spin = 0; t.t = 0; t.cool.clear(); this.world.events.emit('deadfallSet', { trap: t }); }
      return;
    }
    // swinging: a heavy pendulum, its swing dying away
    t.spin += -D.pull * Math.sin(t.angle) - D.damp * t.spin;
    t.angle += t.spin;
    if (t.state === 'swing' && Math.abs(t.angle) < 0.05 && Math.abs(t.spin) < 0.003) { t.state = 'hang'; t.t = 0; }
    if (t.state === 'hang' && t.t >= D.rest) { t.state = 'haul'; t.t = 0; return; }
    const at = this.deadfallAt(t);
    if (at.h > D.low || Math.abs(t.spin) < 0.008) return; // (up high, or barely moving: it nudges, it doesn't kill)
    const dir = Math.sign(t.spin) || 1;
    for (const f of this.world.fighters) {
      if (!f.alive || t.cool.has(f.id) || Math.abs(f.x - at.x) > D.reach || Math.abs(f.z - t.z) > D.lane || f.h > at.h + 40) continue;
      t.cool.set(f.id, D.cool);
      t.hz ??= { id: `deadfall${t.id}`, cool: new Map() };
      t.hz.cool.delete(f.id);
      if (f.team === 'player') this.stage.hurt(t.hz, f, f.stats.maxHealth * D.heroShare, dir, 'bolt');
      else if (f.stats.boss) this.stage.hurt(t.hz, f, f.stats.maxHealth * D.bossShare, dir, 'bolt');
      else this.stage.hurt(t.hz, f, f.health + 1, dir, 'trample'); // (smashed apart on the spikes)
      this.world.events.emit('deadfallHit', { trap: t, fighter: f, dir });
    }
  }

  // ------------------------------------------------------------ ambushes from the branches

  holdHanging(f) {
    f.hang--;
    f.h = f.hangH; f.vh = 0; f.vx = 0; f.vz = 0;
    if (f.hang === 0) this.world.events.emit('ambushDrop', { fighter: f });
  }

  // ------------------------------------------------------------ the wood's men

  giveRole(f) {
    f.roleSet = true;
    if (f.role === 'horn') {
      f.stats = { ...f.stats, name: 'Hornblower', title: 'Kill him before he sounds it' };
      const sec = this.stage.sections.find((s, i) => i === this.stage.index);
      f.horn = { state: 'run', t: 0, calls: sec?.horn ?? ['grunt', 'grunt'], hp: f.health, done: false };
      f.script = (brain, target) => this.hornScript(f, brain, target);
    } else if (f.role === 'driver') {
      const D = TRAPS.driver;
      f.stats = { ...f.stats, name: 'The Wagonmaster', title: 'Knock him off the reins', maxHealth: Math.round(f.stats.maxHealth * D.health) };
      f.health = f.stats.maxHealth;
      f.drive = { cart: f.driveCart, hp: f.health, t: 0, next: D.every[0], whip: 0, on: true };
      f.script = (brain, target) => this.driverScript(f, brain, target);
    } else if (f.role === 'net') {
      f.stats = { ...f.stats, name: 'Woodsman', title: 'Throws a weighted net' };
      f.net = { state: 'keep', t: 0, next: 120 + (f.id * 37) % 90 };
      f.script = (brain, target) => this.netScript(f, brain, target);
    }
  }

  // The hornblower: off to the back of the road on the far side, then the horn to his lips.
  hornScript(f, brain, target) {
    const H = f.horn; const T = TRAPS.horn;
    if (H.done || !f.alive) return false;
    H.t++;
    if (f.health < H.hp) { // struck: the call is broken off
      H.hp = f.health;
      if (H.state === 'blow') this.world.events.emit('hornBroken', { fighter: f });
      H.state = 'fight'; H.t = 0;
      return false;
    }
    if (H.state === 'fight') { if (H.t >= T.retry) { H.state = 'run'; H.t = 0; } return false; }
    if (!['idle', 'walk'].includes(f.state)) return false;
    const B = this.world.bounds;
    if (H.state === 'run') {
      const side = Math.sign(f.x - target.x) || 1;
      H.post ??= { x: Math.max(B.minX + 30, Math.min(B.maxX - 30, target.x + side * T.post)), z: B.minZ + 14 };
      const dx = H.post.x - f.x; const dz = H.post.z - f.z;
      brain.moveX = Math.abs(dx) > 10 ? Math.sign(dx) : 0;
      brain.moveZ = Math.abs(dz) > 8 ? Math.sign(dz) : 0;
      brain.facingHint = brain.moveX || Math.sign(target.x - f.x);
      if (!brain.moveX && !brain.moveZ) { H.state = 'blow'; H.t = 0; this.world.events.emit('hornRaised', { fighter: f }); }
      if (H.t > 300) { H.state = 'blow'; H.t = 0; this.world.events.emit('hornRaised', { fighter: f }); } // (couldn't get there: blows where he stands)
      return true;
    }
    if (H.state === 'blow') {
      brain.facingHint = Math.sign(target.x - f.x) || f.facing;
      f.hornT = H.t / T.blow;
      if (H.t >= T.blow) {
        H.done = true; f.hornT = 0;
        this.world.events.emit('hornSounded', { fighter: f });
        // (they come running from both ends of the road, out of sight first)
        const heroes = this.heroes; const B = this.world.bounds;
        H.calls.forEach((type, k) => {
          const side = k % 2 ? -1 : 1;
          const e = createEnemy(this.world, type, offscreenX(this.world, heroes, side, k >> 1), B.minZ + 30 + ((k * 83) % Math.max(1, B.maxZ - B.minZ - 60)), { entering: true });
          this.stage.setOnGround(e);
        });
        return false;
      }
      return true;
    }
    return false;
  }

  // The woodsman: he keeps his distance, swings the weighted net (the tell), and throws.
  netScript(f, brain, target) {
    const N = f.net; const T = TRAPS.net;
    if (!f.alive) return false;
    N.t++;
    if (N.state === 'windup') {
      if (!['idle', 'walk'].includes(f.state)) { N.state = 'keep'; N.t = 0; f.netSpin = 0; return false; } // (hit out of it)
      brain.facingHint = N.dir;
      f.netSpin = N.t / T.windup;
      if (N.t >= T.windup) {
        f.netSpin = 0;
        this.nets.push({ x: f.x + N.dir * 30, z: f.z, h: 70, dir: N.dir, run: 0, by: f.id });
        this.world.events.emit('netThrown', { fighter: f, dir: N.dir });
        N.state = 'keep'; N.t = 0; N.next = T.every[0] + (f.id * 53 + this.world.frame) % (T.every[1] - T.every[0]);
      }
      return true;
    }
    if (target.snare) return false; // (caught: in he comes with his blade)
    const dx = target.x - f.x; const ad = Math.abs(dx);
    if (N.t >= N.next && ad < T.range && Math.abs(target.z - f.z) < 60 && ['idle', 'walk'].includes(f.state)) {
      N.state = 'windup'; N.t = 0; N.dir = Math.sign(dx) || f.facing;
      this.world.events.emit('netWindup', { fighter: f });
      return true;
    }
    if (!['idle', 'walk'].includes(f.state)) return false;
    // keep his distance, lined up with the hero's lane
    if (ad < T.keep[0]) brain.moveX = -Math.sign(dx);
    else if (ad > T.keep[1]) brain.moveX = Math.sign(dx);
    if (Math.abs(target.z - f.z) > 12) brain.moveZ = Math.sign(target.z - f.z);
    brain.facingHint = Math.sign(dx) || f.facing;
    return true;
  }

  updateNets() {
    const T = TRAPS.net;
    for (const n of this.nets) {
      n.x += n.dir * T.speed; n.run += T.speed;
      n.h = 70 - 50 * (n.run / T.range);
      for (const p of this.heroes) {
        if (p.snare || p.invincible || Math.abs(p.x - n.x) > T.reach || Math.abs(p.z - n.z) > T.depth || p.h - (p.floor ?? 0) > 70) continue;
        n.hit = true;
        this.snare(p, 'net');
        break;
      }
      if (this.stage.terrain?.blocks.some((b) => b.solid && n.x > b.x0 && n.x < b.x1 && n.z >= b.z0 && n.z <= b.z1 && b.top > n.h)) n.hit = true;
    }
    this.nets = this.nets.filter((n) => !n.hit && n.run < T.range);
  }

  // ------------------------------------------------------------ the convoy

  // The wagon rolls (Stage.updateRolling); its roof goes with it, and whoever stands there.
  // Three ways to stop it: wreck it, knock the Wagonmaster off the bench, or drop a pine
  // across the road in front of it.
  updateCart(C) {
    const pr = C.pr; const R = pr.roll; const b = C.b;
    // the Wagonmaster takes the bench while nobody can see it (or as the level comes up at
    // its checkpoint), and waits there with the rest till the fight starts
    if (R.driver && !C.mounted && !pr.broken && !pr.escaped && this.stage.index >= pr.section - 1 && this.stage.index <= pr.section) {
      const seat = pr.x + pr.w * TRAPS.driver.seat;
      if (C.fresh || !inView(this.world, this.heroes, seat)) this.mountDriver(C);
    }
    C.fresh = false;
    if (C.driver && !C.driver.alive && C.driver.drive?.on) this.dismount(C.driver); // (killed outright on the bench)
    if (!pr.halted && !pr.broken && !pr.escaped) {
      for (const P of this.downed) {
        if (Math.abs(P.z - pr.z) > 50 || pr.x + pr.w / 2 < P.x0 - 4 || pr.x > P.x1) continue;
        pr.x = Math.min(pr.x, P.x0 - 4 - pr.w / 2);
        this.stopWagon(C, 'pine');
      }
    }
    const half = pr.w * 0.45;
    b.dx = (pr.x - half) - b.x0;
    b.x0 = pr.x - half; b.x1 = pr.x + half;
    b.solid = !pr.broken && !pr.escaped;
    // gone up the road: its driver with it
    if (pr.escaped && C.driver?.alive) { C.driver.health = 0; C.driver.removeMe = true; C.driver = null; }
  }

  stopWagon(C, how) {
    if (C.pr.halted) return;
    C.pr.halted = how;
    this.world.events.emit('wagonStopped', { prop: C.pr, how });
  }

  mountDriver(C) {
    const pr = C.pr;
    const e = createEnemy(this.world, pr.roll.driver, pr.x + pr.w * TRAPS.driver.seat, pr.z + 2);
    e.driveCart = C;
    this.stage.setOnGround(e);
    if (!(this.stage.index === pr.section && this.stage.fightOn)) e.lurking = pr.section;
    e.facing = -1;
    C.driver = e; C.mounted = true;
    this.world.events.emit('driverMounted', { fighter: e, prop: pr });
  }

  // On the bench: he holds the reins and lashes at anyone near the wagon. Struck, he's
  // knocked off it, and the wagon stands (no one driving the team).
  driverScript(f, brain, target) {
    const D = f.drive; const T = TRAPS.driver;
    if (!D.on) return false;
    const C = D.cart; const pr = C.pr;
    if (!f.alive || pr.broken || pr.escaped || f.health < D.hp || !['idle', 'walk', 'jump'].includes(f.state) || f.h < C.b.top - 6) { // ('jump': settling onto the bench)
      this.dismount(f);
      return false;
    }
    f.x = pr.x + pr.w * T.seat; f.z = pr.z + 2;
    brain.moveX = 0; brain.moveZ = 0;
    brain.facingHint = Math.sign(target.x - f.x) || 1;
    D.t++;
    if (D.whip > 0) {
      D.whip++;
      f.whipT = D.whip / T.windup;
      if (D.whip >= T.windup) {
        D.whip = 0; f.whipT = 0; D.t = 0;
        D.next = T.every[0] + (f.id * 41 + this.world.frame) % (T.every[1] - T.every[0]);
        const dir = brain.facingHint;
        this.world.events.emit('whipCrack', { fighter: f, dir });
        this.whipHz ??= { id: 'whip', cool: new Map() };
        for (const p of this.heroes) {
          if (Math.sign(p.x - f.x) !== dir || Math.abs(p.x - f.x) > T.reach || Math.abs(p.z - f.z) > T.depth) continue;
          // on the roof with him: thrown off it; down in the road: a stinging cut, a stagger
          const onRoof = p.floorBlock === C.b;
          this.stage.hurt(this.whipHz, p, T.damage, dir, onRoof ? 'beam' : 'arrow');
        }
        for (const [id, c] of this.whipHz.cool) { if (c <= 1) this.whipHz.cool.delete(id); else this.whipHz.cool.set(id, c - 1); }
      }
      return true;
    }
    if (D.t >= D.next && this.heroes.some((p) => Math.abs(p.x - f.x) < T.reach && Math.abs(p.z - f.z) < T.depth)) {
      D.whip = 1;
      this.world.events.emit('whipWindup', { fighter: f });
    }
    return true;
  }

  dismount(f) {
    const D = f.drive; const C = D.cart;
    D.on = false; f.whipT = 0;
    if (C.driver === f) C.driver = null;
    if (!C.pr.broken && !C.pr.escaped) this.stopWagon(C, 'driver');
    this.world.events.emit('driverDown', { fighter: f, prop: C.pr });
    // (off the bench backward into the road, if the blow didn't already throw him)
    if (f.alive && f.state !== 'knockdown' && f.h >= C.b.top - 6) f.fsm.change('knockdown', { vx: -280, vh: 240 });
  }

  // ------------------------------------------------------------ the kennels

  // The hounds go into their pens while nobody can see them (or as the level comes up there),
  // behind bars: not foes yet, and nothing reaches them. The boss gets his whistle and net.
  updatePens() {
    const st = this.stage;
    for (const pen of this.pens) {
      if (pen.placed || st.index < pen.section - 1 || st.index > pen.section) continue;
      if (!this.penFresh && inView(this.world, this.heroes, pen.x)) continue;
      pen.placed = true;
      for (let k = 0; k < (pen.count ?? 1); k++) {
        const e = createEnemy(this.world, pen.type ?? 'hound', pen.x + (k - ((pen.count ?? 1) - 1) / 2) * 34, pen.z + k * 6);
        st.setOnGround(e);
        e.penned = pen.id; e.lurking = -1; e.invincible = true; e.facing = k % 2 ? 1 : -1;
        pen.hounds.push(e);
      }
    }
    this.penFresh = false;
    this.updateSlams();
    const b = st.boss;
    if (b?.alive && st.section?.pens && !b.kennelSet) {
      b.kennelSet = true;
      b.kennel = { t: 0, next: TRAPS.kennel.whistle[0], net: null };
      b.script = (brain, target) => this.houndmasterScript(b, brain, target);
    }
    // his own hounds out of their kennel once he has walked in (the field is held still till then)
    if (b?.alive && b.kennelSet && !b.pensOut && b.state !== 'bossEntrance') {
      b.pensOut = true;
      for (const k of st.section.boss?.pensAtStart ?? []) this.openPen(this.pens.find((q) => q.id === k && q.section === st.index));
    }
  }

  openPen(pen) {
    if (!pen || pen.open) return;
    pen.open = true;
    // (a pen never filled, the level come up mid-fight: its hounds come out of it all the same)
    if (!pen.hounds.length) for (let k = 0; k < (pen.count ?? 1); k++) { const e = createEnemy(this.world, pen.type ?? 'hound', pen.x + k * 30, pen.z); this.stage.setOnGround(e); e.dropIn = true; pen.hounds.push(e); }
    for (const e of pen.hounds) { e.penned = null; e.lurking = null; e.invincible = false; e.facing = 1; }
    pen.hounds = pen.hounds.filter((e) => e.alive);
    this.world.events.emit('penOpen', { pen });
  }

  // The Houndmaster: his own fighting, and over it, now and then, the whistle (every loose
  // hound looks up, then goes for the nearest hero, two pounces each); once his net phase
  // comes, a weighted net thrown as he backs off.
  houndmasterScript(b, brain, target) {
    const K = b.kennel; const T = TRAPS.kennel;
    if (!b.alive) return false;
    K.t++;
    this.checkBroken(b);
    if (this.chainScript(b, brain, target)) return true;
    if (K.t >= K.next && ['idle', 'walk'].includes(b.state)) {
      const pack = this.world.fighters.filter((f) => f.alive && f.stats.id === 'hound' && f.penned == null && !f.order);
      // none loose, but some slammed in a pen: he whistles that pen open again (once a pen)
      const shut = !pack.length && !K.broken && this.pens.find((pen) => pen.section === this.stage.index && !pen.open && pen.shut === 1 && pen.hounds.some((h) => h.alive));
      if (shut) {
        K.t = 0; K.next = T.whistle[0];
        shut.shut = 2;
        this.openPen(shut);
        this.world.events.emit('whistle', { fighter: b, pack: shut.hounds });
        return false;
      }
      if (pack.length) {
        K.t = 0; K.next = T.whistle[0] + (this.world.frame * 7) % (T.whistle[1] - T.whistle[0]);
        for (const h of pack) { h.order = { t: 0, left: T.lunges, wait: T.tell, busy: false }; h.script = (hb, ht) => this.houndOrder(h, hb, ht); }
        this.world.events.emit('whistle', { fighter: b, pack });
        brain.facingHint = Math.sign(target.x - b.x) || b.facing;
        return true;
      }
    }
    if (this.stage.bossInPhase?.('net') || this.stage.bossInPhase?.('frenzy')) {
      K.netT = (K.netT ?? 0) + 1;
      if (K.windup > 0) {
        if (!['idle', 'walk'].includes(b.state)) { K.windup = 0; b.netSpin = 0; return false; }
        K.windup++;
        b.netSpin = K.windup / TRAPS.net.windup;
        brain.facingHint = K.dir;
        if (K.windup >= TRAPS.net.windup) {
          K.windup = 0; b.netSpin = 0; K.netT = 0;
          this.nets.push({ x: b.x + K.dir * 30, z: b.z, h: 70, dir: K.dir, run: 0, by: b.id });
          this.world.events.emit('netThrown', { fighter: b, dir: K.dir });
        }
        return true;
      }
      const dx = target.x - b.x;
      if (K.netT >= T.net[0] && Math.abs(dx) > 120 && Math.abs(dx) < TRAPS.net.range && Math.abs(target.z - b.z) < 50 && ['idle', 'walk'].includes(b.state) && !target.snare) {
        K.windup = 1; K.dir = Math.sign(dx) || b.facing;
        this.world.events.emit('netWindup', { fighter: b });
        return true;
      }
    }
    return false;
  }

  // A hound sent in by the whistle: ears up (the tell), then straight for the nearest hero
  // and a pounce, and another; then back to its own hunting.
  houndOrder(h, brain, target) {
    const O = h.order; const T = TRAPS.kennel;
    if (!O || !h.alive) { h.order = null; return false; }
    O.t++;
    const dx = target.x - h.x; const dz = target.z - h.z;
    if (O.t < O.wait) { brain.facingHint = Math.sign(dx) || h.facing; return true; }
    if (O.busy) { if (['idle', 'walk'].includes(h.state)) O.busy = false; else return false; }
    if (O.left <= 0 || O.t > T.give) { h.order = null; h.script = null; return false; }
    brain.facingHint = Math.sign(dx) || h.facing;
    if (Math.abs(dx) < T.lungeAt && Math.abs(dz) < 26 && ['idle', 'walk'].includes(h.state)) {
      brain.registerPress('heavy'); O.left--; O.busy = true;
      return true;
    }
    brain.moveX = Math.abs(dx) > 40 ? Math.sign(dx) : 0;
    brain.moveZ = Math.abs(dz) > 6 ? Math.sign(dz) : 0;
    return true;
  }

  // ------------------------------------------------------------ the kennels: slamming a gate

  // A hound knocked down (kicked, thrown, hit off its feet) in the mouth of an open pen: the
  // gate slams on it. It's out of the fight till he whistles that pen open again.
  updateSlams() {
    const T = TRAPS.slam;
    for (const pen of this.pens) {
      if (!pen.open || pen.section !== this.stage.index) continue;
      const w = (52 + (pen.count ?? 1) * 34) / 2 + T.reach;
      const caught = this.world.fighters.filter((h) => h.alive && h.stats.id === 'hound' && h.penned == null && h.state === 'knockdown'
        && Math.abs(h.x - pen.x) < w && h.z - pen.z < T.depth);
      if (!caught.length) continue;
      pen.open = false; pen.shut = (pen.shut ?? 0) + 1; pen.hounds = caught;
      caught.forEach((h, k) => {
        h.penned = pen.id; h.lurking = -1; h.invincible = true; h.order = null; h.script = null; h.latchOn = null;
        h.x = pen.x + (k - (caught.length - 1) / 2) * 34; h.z = pen.z + k * 6; h.vx = 0; h.vz = 0;
        h.fsm.change('idle');
      });
      this.world.events.emit('penSlam', { pen, hounds: caught });
      this.stage.story?.trigger(`penSlam:${this.stage.section?.id}`);
    }
  }

  // ------------------------------------------------------------ the Houndmaster's chain

  // From his pack phase: the chain wound back over his head (the tell), then cracked out across
  // the yard; the hero it catches is hauled in to him. A dodge, or a few presses, breaks it.
  chainScript(b, brain, target) {
    const K = b.kennel; const T = TRAPS.chain;
    if (!this.stage.bossInPhase?.('pack')) return false;
    if (K.chain > 0) {
      if (!['idle', 'walk'].includes(b.state)) { K.chain = 0; b.chainT = 0; return false; } // (hit out of it)
      K.chain++;
      b.chainT = K.chain / T.windup;
      brain.facingHint = K.dir;
      if (K.chain >= T.windup) {
        K.chain = 0; b.chainT = 0; K.chainAt = 0;
        K.chainNext = T.every[0] + (this.world.frame * 13) % (T.every[1] - T.every[0]);
        this.world.events.emit('chainCrack', { fighter: b, dir: K.dir });
        for (const p of this.heroes) {
          const dx = (p.x - b.x) * K.dir;
          if (dx < 20 || dx > T.reach[1] + 30 || Math.abs(p.z - b.z) > T.depth || p.invincible || p.snare || p.chained || p.h - (p.floor ?? 0) > 60) continue;
          this.chainHz ??= { id: 'chain', cool: new Map() };
          this.stage.hurt(this.chainHz, p, T.damage, -K.dir, 'arrow');
          if (!p.alive) continue;
          p.chained = { by: b.id, t: 0, left: T.mash, dir: -K.dir };
          p.fsm.change('hitstun', { frames: 9999 });
          this.world.events.emit('chained', { fighter: p, by: b });
          break;
        }
        for (const [id, c] of this.chainHz?.cool ?? []) { if (c <= 1) this.chainHz.cool.delete(id); else this.chainHz.cool.set(id, c - 1); }
      }
      return true;
    }
    K.chainAt = (K.chainAt ?? 0) + 1;
    const dx = target.x - b.x; const adx = Math.abs(dx);
    if (K.chainAt >= (K.chainNext ?? T.every[0]) && adx > T.reach[0] && adx < T.reach[1] && Math.abs(target.z - b.z) < T.depth && ['idle', 'walk'].includes(b.state) && !target.snare && !target.chained) {
      K.chain = 1; K.dir = Math.sign(dx) || b.facing;
      this.world.events.emit('chainWindup', { fighter: b });
      return true;
    }
    return false;
  }

  holdChained(p) {
    const C = p.chained; const T = TRAPS.chain;
    const b = this.world.fighters.find((f) => f.id === C.by);
    C.t++;
    const free = () => { p.chained = null; if (p.alive && p.state === 'hitstun') p.fsm.change('idle'); this.world.events.emit('chainFree', { fighter: p }); };
    if (!p.alive || p.state !== 'hitstun' || !b?.alive) { p.chained = null; return; }
    for (const a of ['dodge', 'jump', 'attack', 'heavy', 'block', 'grab', 'magic']) {
      if (!p.controller.consume?.(a, 1)) continue;
      if (a === 'dodge') C.left = 0; else C.left--;
      this.world.events.emit('snareTug', { fighter: p });
    }
    if (C.left <= 0 || C.t >= T.hold) { free(); return; }
    // hauled in along the ground toward him (not through him)
    const gap = b.x - p.x;
    if (Math.abs(gap) > 70) p.x += Math.sign(gap) * T.pull;
    p.z += Math.sign(b.z - p.z) * Math.min(3, Math.abs(b.z - p.z));
    p.facing = Math.sign(gap) || p.facing;
    p.vx = 0; p.vz = 0;
  }

  // His last hound dead: the fight goes out of him. Slower, open; and his last words change.
  checkBroken(b) {
    const K = b.kennel;
    if (K.broken || !this.stage.bossInPhase?.('frenzy')) return;
    if (this.world.fighters.some((f) => f.alive && f.stats.id === 'hound')) return;
    if (this.pens.some((pen) => pen.section === this.stage.index && !pen.open && !pen.shut && !pen.placed)) return;
    K.broken = true;
    const B = TRAPS.broken;
    b.stats = { ...b.stats, walkSpeed: b.stats.walkSpeed * B.speed, depthSpeed: b.stats.depthSpeed * B.speed, meleeMult: b.stats.meleeMult * B.damage };
    b.controller.ai = { ...b.controller.ai, ...B.ai };
    b.sentence = { last: 'My dogs... all of them. Do it, then. There is nothing left to howl for me.' };
    this.world.events.emit('houndmasterBroken', { boss: b });
    this.stage.story?.trigger(`broken:${this.stage.section?.id}`);
  }

  // ------------------------------------------------------------ the pack

  // Two hounds or more loose on the road: they don't all pile in. They circle the hero at a
  // distance and go in one at a time, ears up first (the tell); then the next one's turn.
  updatePack() {
    const T = TRAPS.pack;
    const loose = this.world.fighters.filter((h) => h.alive && h.stats.id === 'hound' && h.penned == null && h.lurking == null
      && !h.order && !h.worry && !h.entering && !(h.hang > 0) && h.latchOn == null);
    for (const h of this.world.fighters) if (h.packing && !loose.includes(h)) { h.packing = false; if (h.script === h.packScript) h.script = null; h.packTell = 0; }
    if (loose.length < 2) { for (const h of loose) if (h.packing) { h.packing = false; h.script = null; h.packTell = 0; } this.packTurn = null; return; }
    const P = this.packTurn;
    if (!P || !loose.some((h) => h.id === P.id) || this.world.frame - P.at > T.turn) {
      const order = loose.map((h) => h.id).sort((a, b) => a - b);
      const next = order.find((id) => id > (P?.id ?? -1)) ?? order[0];
      this.packTurn = { id: next, at: this.world.frame, tell: T.tell };
      this.world.events.emit('packTurn', { id: next });
    }
    for (const h of loose) {
      if (h.script && !h.packing) continue; // (a job of his own)
      h.packing = true;
      h.packScript ??= (brain, target) => this.packScript(h, brain, target);
      h.script = h.packScript;
    }
  }

  packScript(h, brain, target) {
    const T = TRAPS.pack; const P = this.packTurn; const B = this.world.bounds;
    const dx = target.x - h.x; const dz = target.z - h.z;
    if (P?.id === h.id) {
      if (P.tell > 0) { P.tell--; h.packTell = P.tell; brain.facingHint = Math.sign(dx) || h.facing; return true; }
      h.packTell = 0;
      return false; // (his turn: in he goes, the hound's own fighting)
    }
    h.packTell = 0;
    if (!['idle', 'walk'].includes(h.state)) return false;
    // round him on a ring, each its own place on it
    const a = h.id * 2.399 + this.world.frame * T.spin;
    const tx = target.x + Math.cos(a) * T.ring;
    const tz = Math.max(B.minZ + 10, Math.min(B.maxZ - 10, target.z + Math.sin(a) * T.ring * 0.4));
    brain.moveX = Math.abs(tx - h.x) > 12 ? Math.sign(tx - h.x) : 0;
    brain.moveZ = Math.abs(tz - h.z) > 8 ? Math.sign(tz - h.z) : 0;
    brain.facingHint = Math.sign(dx) || h.facing;
    return true;
  }

  // A hound's bite that lands can lock on: it hangs off the hero and drags him back, worrying
  // at him, till he shakes it off (mash) or someone knocks it loose.
  onHit(e) {
    const h = e.attacker; const p = e.defender;
    if (!h || !p || h.stats?.id !== 'hound' || p.team !== 'player' || e.move?.anim !== 'bite') return;
    if (!h.alive || !p.alive || p.latch || p.snare || p.chained || p.state === 'knockdown' || h.latchOn != null) return;
    if (this.world.rngFor(h.id, 61 + (this.world.frame % 97))() >= TRAPS.latch.chance) return;
    const side = Math.sign(h.x - p.x) || -p.facing;
    p.latch = { by: h.id, t: 0, left: TRAPS.latch.mash, side };
    h.latchOn = p.id;
    p.fsm.change('hitstun', { frames: 9999 });
    this.world.events.emit('houndLatch', { fighter: p, hound: h });
  }

  holdLatched(p) {
    const L = p.latch; const T = TRAPS.latch; const B = this.world.bounds;
    const h = this.world.fighters.find((f) => f.id === L.by);
    L.t++;
    const shake = (thrown) => {
      p.latch = null;
      if (h) { h.latchOn = null; if (thrown && h.alive) h.fsm.change('knockdown', { vx: L.side * 260, vh: 200 }); }
      if (p.alive && p.state === 'hitstun') p.fsm.change('idle');
      this.world.events.emit('houndShaken', { fighter: p, hound: h });
    };
    if (!p.alive || p.state !== 'hitstun') { p.latch = null; if (h) h.latchOn = null; return; }
    if (!h?.alive || ['knockdown', 'hitstun', 'grabbed', 'dead', 'executed'].includes(h.state)) { shake(false); return; }
    for (const a of ['attack', 'heavy', 'jump', 'dodge', 'block', 'grab', 'magic']) if (p.controller.consume?.(a, 1)) { L.left--; this.world.events.emit('snareTug', { fighter: p }); }
    if (L.left <= 0 || L.t >= T.hold) { shake(true); return; }
    // dragged back the way the hound pulls, its jaws in him
    p.x = Math.max(B.minX + 20, Math.min(B.maxX - 20, p.x + L.side * T.drag));
    h.x = p.x + L.side * 44; h.z = p.z + 1; h.facing = -L.side; h.vx = 0; h.vz = 0;
    p.vx = 0; p.vz = 0;
    if (L.t % T.every === 0) {
      p.health = Math.max(1, p.health - T.damage); p.flash = 6;
      this.world.events.emit('houndWorry', { fighter: p, hound: h });
    }
  }

  // ------------------------------------------------------------ the mist and its signal

  // While the Ashen's signal lantern burns in the mist, men keep coming out of it to the
  // fight (from out of sight, on the far side). Smash it and no more come.
  updateMist(M) {
    const st = this.stage; const T = TRAPS.mist;
    if (M.out || st.index !== M.section || !st.fightOn || M.sent >= T.cap) return;
    M.t++;
    if (M.t < (M.sent ? T.every : T.first)) return;
    if (st.livingFoes().length >= T.foes) return;
    M.t = 0; M.sent++;
    const type = (M.calls ?? ['grunt', 'stalker'])[(M.sent - 1) % (M.calls?.length ?? 2)];
    const B = this.world.bounds;
    const e = createEnemy(this.world, type, offscreenX(this.world, this.heroes, 1, M.sent), B.minZ + 30 + ((M.sent * 97) % Math.max(1, B.maxZ - B.minZ - 60)), { entering: true });
    st.setOnGround(e);
    this.world.events.emit('mistCall', { mist: M, fighter: e });
  }

  // Died: back at the checkpoint, the traps in its stretch are set again (a pine stays down)
  reset(section) {
    for (const t of this.traps) if (t.section >= section) { t.sprung = false; t.open = false; t.cool.clear(); }
    this.nets = [];
    for (const f of this.world.fighters) { f.snare = null; f.chained = null; f.latch = null; f.latchOn = null; }
    for (const M of this.mists) if (M.section >= section) { M.sent = 0; M.t = 0; }
    this.packTurn = null;
    for (const pen of this.pens) if (pen.section >= section) { pen.placed = false; pen.open = false; pen.shut = 0; pen.hounds = []; }
    this.penFresh = true;
    for (const C of this.carts) if (C.pr.section >= section && !C.pr.broken) { C.pr.halted = false; C.driver = null; C.mounted = false; C.fresh = true; }
  }
}
