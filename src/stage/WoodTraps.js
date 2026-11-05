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
//   current   trap: the ford's shallows: everyone in them wades slow and is pushed downstream;
//             a man knocked down in them is carried off by the river
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
  current: { push: 0.85, drag: 0.45 },
  // the convoy's Wagonmaster on the driver's bench: his whip reaches this far, after a wind-up
  // the Houndmaster's kennels: his whistle sends every loose hound in, two pounces each
  kennel: { whistle: [360, 520], tell: 34, lunges: 2, lungeAt: 220, give: 300, net: [260, 380] },
  driver: { reach: 230, depth: 64, windup: 34, every: [80, 140], damage: 9, health: 1.7, seat: 0.32 },
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
    this.world.events.on('propBreak', ({ prop, dir }) => {
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
      else if (t.type === 'current') this.updateCurrent(t);
    }
    for (const f of this.world.fighters) {
      if (f.snare) this.holdSnared(f);
      if (f.hang > 0) this.holdHanging(f);
      if (f.team === 'enemy' && f.alive && f.role && !f.roleSet) this.giveRole(f);
    }
    this.updateNets();
    for (const C of this.carts) this.updateCart(C);
    this.updatePens();
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
      const roll = R.pile.roll; const front = roll.z0 + (roll.z1 - roll.z0) * k;
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

  // ------------------------------------------------------------ the ford's current

  updateCurrent(t) {
    const C = TRAPS.current; const B = this.world.bounds;
    for (const f of this.world.fighters) {
      if (!f.alive || f.entering || f.x < t.x0 || f.x > t.x1 || f.h - (f.floor ?? 0) > 8) continue;
      if (f.cinematic || f.state === 'grabbed') continue;
      f.wading = this.world.frame;
      // wading: slower going, and the water leans on you downstream (toward the camera)
      f.x -= ((f.vx ?? 0) / 60) * C.drag;
      f.z = Math.min(B.maxZ, f.z + C.push * (t.push ?? 1) * (f.state === 'knockdown' ? 2.2 : 1));
      // a man knocked down in it, at the edge of the shallows: the river has him
      if (f.team === 'enemy' && !f.stats.boss && f.state === 'knockdown' && f.z >= B.maxZ - 1 && !f.removeMe) {
        this.world.events.emit('swept', { fighter: f, trap: t });
        this.stage.pitKill(f);
      }
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
    const b = st.boss;
    if (b?.alive && st.section?.pens && !b.kennelSet) {
      b.kennelSet = true;
      b.kennel = { t: 0, next: TRAPS.kennel.whistle[0], net: null };
      b.script = (brain, target) => this.houndmasterScript(b, brain, target);
    }
  }

  openPen(pen) {
    if (!pen || pen.open) return;
    pen.open = true;
    // (a pen never filled, the level come up mid-fight: its hounds come out of it all the same)
    if (!pen.hounds.length) for (let k = 0; k < (pen.count ?? 1); k++) { const e = createEnemy(this.world, pen.type ?? 'hound', pen.x + k * 30, pen.z); this.stage.setOnGround(e); e.dropIn = true; pen.hounds.push(e); }
    for (const e of pen.hounds) { e.penned = null; e.lurking = null; e.invincible = false; e.facing = 1; }
    this.world.events.emit('penOpen', { pen });
  }

  // The Houndmaster: his own fighting, and over it, now and then, the whistle (every loose
  // hound looks up, then goes for the nearest hero, two pounces each); once his net phase
  // comes, a weighted net thrown as he backs off.
  houndmasterScript(b, brain, target) {
    const K = b.kennel; const T = TRAPS.kennel;
    if (!b.alive) return false;
    K.t++;
    if (K.t >= K.next && ['idle', 'walk'].includes(b.state)) {
      const pack = this.world.fighters.filter((f) => f.alive && f.stats.id === 'hound' && f.penned == null && !f.order);
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

  // Died: back at the checkpoint, the traps in its stretch are set again (a pine stays down)
  reset(section) {
    for (const t of this.traps) if (t.section >= section) { t.sprung = false; t.open = false; t.cool.clear(); }
    this.nets = [];
    for (const f of this.world.fighters) if (f.snare) f.snare = null;
    for (const pen of this.pens) if (pen.section >= section) { pen.placed = false; pen.open = false; pen.hounds = []; }
    this.penFresh = true;
    for (const C of this.carts) if (C.pr.section >= section && !C.pr.broken) { C.pr.halted = false; C.driver = null; C.mounted = false; C.fresh = true; }
  }
}
