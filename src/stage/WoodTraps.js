// WoodTraps.js — Gallows Wood's own ways to fight (level 2, data/stageWood.js; Nick's review
// list, 2026-11-05: "the village burned around you; the wood hunts you"). Everything here is
// the wood's and no other level's: fire, beams and bombardment belong to the others.
//
//   THE WOOD AS A WEAPON (stage data, a section's `props` and the level's `traps`)
//   pine      prop: a notched pine on the bank. Three good blows and it goes over the way it
//             was struck, crushing whoever is under it; where it lands it becomes the log
//             bridge (terrain blocks with its `bridge` tag stand only once it is down)
//   logpile   prop: the stay rope of a stacked woodpile up the far bank. Cut it and the pile
//             groans, then bursts: its six trunks tumble off the stack one after another,
//             bounce, and roll away down the bank to the ford, each its own weight, spinning
//             end-on, hopping over the ruts and gathering speed, fanned out across the road.
//             A man in a trunk's way is bowled over and flung (dead); a hero is never hurt.
//             They plough on through the shallows (the men wading there are sitting ducks),
//             drop into the deep channel, and the stream carries them off
//             (Nick, 2026-11-20: "make them roll better, make the whole thing feel better")
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
import { hunt, setHunt } from '../entities/HoundHunt.js';

// All of it is the sim's (online: both machines step it the same); the view listens for the
// events it emits.

export const TRAPS = {
  pine: { fall: 46, len: 250, lane: 34, heroDamage: 22 },
  // the log pile: the groan before it goes (frames), then each trunk's release (frames after
  // the burst, bottom row first), its radius and how far back from its cut end it lies (px);
  // the bank's pull down to the stream (px/frame²: west, and a little toward us), gravity,
  // top speed, how fast it must be going to hurt, the hero's grace while it is still
  // spilling off the stack (frames), how the shallows drag it and how fast the stream
  // carries it off
  // (heroes: never hurt by it, it's their weapon: Nick, 2026-11-24 "no way to hit anyone with it")
  // reach: how far either side of a trunk, and how far in front / back, a man is caught;
  // wade: the shallows' drag (it ploughs on through them, bowling the men wading there);
  // drag: the deep channel's (it drops in and the stream has it); steer: how hard each trunk
  // runs out to its own line across the road (so the six cover all of it)
  logs: { delay: 22, r: 24, len: 54, front: 18, reach: 24, bankX: -0.3, bankZ: 0, grav: 0.55, max: 9,
    hurtAt: 1.4, wade: 0.988, drag: 0.9, steer: 0.006, drift: 0.7, life: 900 },
  // (a man caught hangs enemyHold frames: 130 -> 330, Nick 2026-11-24 "hold the NPC for
  // longer"; and a light hit only swings him: it takes a knockdown, a launch or a kill to
  // cut him down)
  snare: { reach: 22, hold: 150, mash: 5, enemyHold: 330 },
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
  // the Houndmaster's own horn (from his net phase): he backs off to the back of the yard and
  // blows it, the bar over him filling (the tell). Strike him and it's broken off; let it
  // sound and the men in `calls` come running from both ends of the road. `max` calls a fight,
  // `every` frames between tries, and not while `foes` or more are already up
  bossHorn: { every: [420, 600], first: 90, back: 120, blow: 210, max: 2, foes: 5, calls: [['grunt', 'stalker'], ['stalker', 'grunt', 'butcher']] },
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
      const half = (pr.hitW ?? pr.w) * 0.48; // (the painted body, end to end)
      const b = { id: 9000 + pr.id, kind: 'cart', x0: pr.x - half, x1: pr.x + half, z0: pr.z - pr.roof.d, z1: pr.z + pr.roof.d, top: pr.roof.top, solid: true, dx: 0, dtop: 0, hideArt: true, base: {} };
      stage.terrain.blocks.push(b);
      this.carts.push({ pr, b, driver: null, fresh: true }); // (fresh: the level is only now coming up)
    }
    // the kennels' pens: hounds behind their gates, let out as the Houndmaster's fight turns
    this.pens = [];
    stage.sections.forEach((sec, i) => (sec.pens ?? []).forEach((pen, k) => this.pens.push({ id: k, section: i, ...pen, hounds: [], placed: false, open: false })));
    this.world.events.on('bossPhase', ({ phase }) => { for (const k of phase.pens ?? []) this.openPen(this.pens.find((q) => q.id === k && q.section === this.stage.index)); });
    // the mist banks and their signal lanterns (a section's `mist`)
    this.mists = [];
    stage.sections.forEach((sec, i) => { if (sec.mist) this.mists.push({ section: i, ...sec.mist, sent: 0, t: 0, out: false }); });
    this.world.events.on('hit', (e) => this.onHit(e));
    this.world.events.on('propBreak', ({ prop, dir }) => {
      if (prop.kind === 'signal') for (const M of this.mists) if (M.tag === prop.tag && !M.out) { M.out = true; this.world.events.emit('signalOut', { prop, mist: M }); }
      if (prop.kind === 'pine') this.fell(prop, dir);
      if (prop.kind === 'logpile') this.rolls.push({ pile: prop, t: 0, logs: [] });
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
      // the convoy's wagon or its team under it: the trunk comes down across them and
      // smashes the wagon open (the prisoners out, its driver thrown); ahead of them it lies
      // across the road and they pull up short of it (updateCart). Nick, 2026-11-24: "the
      // tree you can chop down in the convoy has no purpose"
      for (const C of this.carts) {
        const W = C.pr;
        if (W.broken || W.escaped || Math.abs(W.z - pr.z) > P.lane + 20) continue;
        const back = W.x - (W.hitW ?? W.w) / 2; const nose = W.x + W.w / 2 + (W.harness?.[1] ?? 0);
        if (nose < x0 || back > x1) continue;
        this.stage.breakProp(W, F.dir, true, 2);
        this.world.events.emit('pineCrush', { prop: W, pine: pr });
      }
      for (const b of this.stage.terrain?.blocks ?? []) if (b.tag === pr.bridge && b.waiting) { b.solid = true; b.waiting = false; }
      this.downed.push({ x0, x1, z: pr.z });
      this.world.events.emit('pineDown', { prop: pr, dir: F.dir, x0, x1 });
    }
    this.falls = this.falls.filter((F) => F.t < TRAPS.pine.fall + 2);
  }

  // ------------------------------------------------------------ the log pile

  // Where each trunk lies in the stack (the painted pile, view/WoodTrapsView.js: the cut ends
  // to us): its offset from the pile's middle, how high its middle is, when it lets go after
  // the burst, and the shove it gets coming off (px/frame: x, z, up)
  static PILE_LOGS = [
    { dx: -50, up: 47, at: 0, push: [-3.4, 1, 1.2], tz: 350 }, { dx: 0, up: 49, at: 3, push: [-2.6, 2.6, 1.8], tz: 440 }, { dx: 48, up: 47, at: 6, push: [-2, 4.2, 1.6], tz: 530 },
    { dx: -26, up: 94, at: 9, push: [-3, 1.2, 2.6], tz: 310 }, { dx: 30, up: 94, at: 12, push: [-2.4, 3.2, 2.8], tz: 485 },
    { dx: 3, up: 144, at: 17, push: [-2.6, 2, 3.4], tz: 395 },
  ];

  updateRolls() {
    const L = TRAPS.logs; const terrain = this.stage.terrain;
    for (const R of this.rolls) {
      R.t++;
      const pr = R.pile; const lane = pr.lane;
      if (R.t === L.delay) {
        // the stay rope gone, the pile bursts
        R.logs = WoodTraps.PILE_LOGS.map((s, i) => {
          const j = (k) => (this.world.roll(9100 + pr.id * 8 + i, k) - 0.5);
          return { i, x: pr.x + s.dx, z: pr.z + 8, h: Math.max(0, s.up - L.r), vx: 0, vz: 0, vh: 0, ang: j(0) * 6, spin: 0,
            wait: s.at, tz: s.tz + j(4) * 16, push: [s.push[0] * (1 + j(1) * 0.3), s.push[1] * (1 + j(2) * 0.3), s.push[2] * (1 + j(3) * 0.4)],
            state: 'stack', age: 0, wet: false, hz: { id: `logs${pr.id}-${i}`, cool: new Map() } };
        });
        this.world.events.emit('logsLoose', { pile: pr });
      }
      for (const g of R.logs) this.rollLog(R, g, L, terrain, lane);
      R.done = R.logs.length > 0 && R.logs.every((g) => g.state === 'gone');
    }
    this.rolls = this.rolls.filter((R) => !R.done);
  }

  rollLog(R, g, L, terrain, lane) {
    for (const [id, c] of g.hz.cool) { if (c <= 1) g.hz.cool.delete(id); else g.hz.cool.set(id, c - 1); }
    if (g.state === 'gone') return;
    if (g.state === 'stack') {
      if (g.wait-- > 0) return;
      g.state = 'roll'; [g.vx, g.vz, g.vh] = g.push;
      this.world.events.emit('logFree', { pile: R.pile, log: g });
    }
    g.age++;
    const pit = g.deep || (terrain ? terrain.inPit(g.x, g.z) && !terrain.blockAt(g.x, g.z) : false); // (once in the channel, the stream has it)
    const wetAt = pit || g.wet || (terrain ? terrain.wadeAt(g.x, g.z) < 1 : false);
    if (g.state === 'float' || g.state === 'rest') {
      // carried off down the stream (toward us, out of the picture), or lying still on the bank
      if (g.state === 'float') { g.vz += (L.drift - g.vz) * 0.03; g.z += g.vz; g.x += Math.sin(g.age / 40 + g.i) * 0.15; g.ang += Math.sin(g.age / 30 + g.i) * 0.01; }
      if (g.z > lane.z1 + 160 || g.age > L.life) g.state = 'gone';
      return;
    }
    // airborne: gravity; on the ground: the bank's pull and the ruts
    const ground = 0;
    if (!wetAt) { g.vx += L.bankX; g.vz += L.bankZ; } // (down the bank: it falls down it in the air too)
    if (g.h > ground || g.vh > 0) g.vh -= L.grav;
    else {
      // out to its own line across the road
      g.vz += (g.tz - g.z) * L.steer; g.vz *= 0.95;
      // a rut, a root, a stone: it hops (and comes down with a thump)
      const sp = Math.abs(g.vx);
      if (sp > 3.5 && this.world.roll(9300 + g.i, g.age) < 0.03 + sp * 0.004) g.vh = 1.4 + this.world.roll(9400 + g.i, g.age) * (1 + sp * 0.25);
    }
    g.vx = Math.max(-L.max, Math.min(L.max, g.vx));
    const was = terrain?.blockAt(g.x, g.z);
    g.x += g.vx; g.z += g.vz; g.h += g.vh;
    // a log, a stone, a post in its way (the log over the channel): it fetches up against it
    const b = terrain?.blockAt(g.x, g.z);
    if (b && b !== was && b.top > g.h + 4) {
      g.x -= g.vx; g.z -= g.vz;
      const p = Math.abs(g.vx);
      g.vx = -g.vx * 0.25; g.vz *= 0.5; g.vh = Math.max(g.vh, p * 0.3);
      if (p > 1.5) this.world.events.emit('logBounce', { pile: R.pile, log: g, power: p });
    }
    // the road's edges: it bumps off the back bank / the front verge
    if (g.z < lane.z0) { g.z = lane.z0; g.vz = Math.abs(g.vz) * 0.4; }
    if (g.z > lane.z1) { g.z = lane.z1; g.vz = -Math.abs(g.vz) * 0.35; }
    if (g.h <= ground) {
      const fall = -g.vh;
      g.h = ground;
      if (fall > 2.2) { g.vh = fall * 0.38; this.world.events.emit('logBounce', { pile: R.pile, log: g, power: fall }); }
      else g.vh = 0;
    }
    // rolling without slipping: it turns as far as it goes
    g.spin = g.vx / L.r; g.ang += g.spin;
    // into the shallows: spray, and on it ploughs through them, slowing; into the deep channel
    // and it drops in, and the stream has it
    if (wetAt) {
      if (!g.wet) { g.wet = true; this.world.events.emit('logSplash', { pile: R.pile, log: g, power: Math.hypot(g.vx, g.vz) }); }
      if (pit && !g.deep) { g.deep = true; this.world.events.emit('logSplash', { pile: R.pile, log: g, power: Math.hypot(g.vx, g.vz) + 2 }); }
      const k = pit ? L.drag : L.wade; g.vx *= k; g.vz *= k;
      if (Math.hypot(g.vx, g.vz) < (pit ? 0.5 : 0.35) && g.h <= 0.5) { g.state = 'float'; g.age = 0; }
    } else if (g.h <= 0 && Math.hypot(g.vx, g.vz) < 0.15 && g.age > 60) { g.state = 'rest'; g.age = 0; }
    // whoever is in its way
    const speed = Math.hypot(g.vx, g.vz);
    if (speed < L.hurtAt) return;
    for (const f of this.world.fighters) {
      if (!f.alive || f.entering || f.team === 'player' || Math.abs(f.x - g.x) > L.r + L.reach) continue;
      if (f.z < g.z - L.len || f.z > g.z + L.front) continue;
      if (f.h - (f.floor ?? 0) > g.h + L.r * 2 + 12) continue; // (jumped clear over it)
      if (g.hz.cool.has(f.id)) continue;
      const dir = Math.sign(g.vx) || -1;
      this.stage.hurt(g.hz, f, f.stats.boss ? f.stats.maxHealth * 0.2 : f.health + 1, dir, 'log');
      if (!g.hz.cool.has(f.id)) continue; // (couldn't be hurt just now: rolling, down, in a finisher)
      // it rides up over him and loses a little of its way
      g.vx *= 0.82; g.vh = Math.max(g.vh, 2.4);
      this.world.events.emit('logHit', { pile: R.pile, log: g, fighter: f, dir, speed });
    }
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
    } else {
      if (N.kind === 'snare' && f.stunFrames < 9999) f.stunFrames = 9999; // (a blow swings him, he stays strung up)
      if (N.t >= N.hold) this.release(f, true);
    }
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
      // (the team's noses: the horses walk ahead of the wagon and pull up at the log, not
      // through it)
      const nose = pr.w / 2 + (pr.harness?.[1] ?? 0);
      for (const P of this.downed) {
        if (Math.abs(P.z - pr.z) > 50 || pr.x + nose < P.x0 - 4 || pr.x > P.x1) continue;
        pr.x = Math.min(pr.x, P.x0 - 4 - nose);
        this.stopWagon(C, 'pine');
      }
    }
    const half = (pr.hitW ?? pr.w) * 0.48; // (the painted body, end to end)
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
    // (no hounds wait in the pens any more. Nick, 2026-11-20: "the dogs just sitting in the
    // convoy area need to go away they just sit there you cant hit them": set down behind bars
    // a section early, invincible, they sat in plain sight as you came up from the convoy. A
    // pen's hounds now come running in when his phase opens it: see openPen)
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
    // an empty pen (they don't wait in them now): its hounds come running in from off-screen,
    // from the pen's side of the screen, the moment its gate drops
    if (!pen.hounds.length) {
      const heroes = this.heroes;
      const side = pen.x >= (heroes[0]?.x ?? pen.x) ? 1 : -1;
      for (let k = 0; k < (pen.count ?? 1); k++) {
        const e = createEnemy(this.world, pen.type ?? 'hound', offscreenX(this.world, heroes, side, k), pen.z + 40 + k * 30, { entering: true });
        this.stage.setOnGround(e); pen.hounds.push(e);
      }
    }
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
    const horn = this.bossHornScript(b, brain, target);
    if (horn != null) return horn;
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

  // THE HOUNDMASTER'S HORN (from his net phase on): off to the back of the yard, away from the
  // hero, and the horn to his lips. Struck, it's broken off (he tries again later); sounded,
  // more of his men come running from both ends of the road. Returns null when he's not at it.
  bossHornScript(b, brain, target) {
    const K = b.kennel; const T = TRAPS.bossHorn;
    if (K.broken || !(this.stage.bossInPhase?.('net') || this.stage.bossInPhase?.('frenzy'))) { if (K.horn) { K.horn = null; b.hornT = 0; b.bossHorn = null; } return null; }
    K.hornCalls ??= 0;
    if (K.hornCalls >= T.max) return null;
    K.hornAt = (K.hornAt ?? T.every[0] - T.first) + 1;
    const H = K.horn;
    if (!H) {
      if (K.hornAt < T.every[0] || K.windup > 0 || K.chain > 0 || !['idle', 'walk'].includes(b.state)) return null;
      if (this.stage.livingFoes().length >= T.foes) return null;
      K.horn = { state: 'back', t: 0, hp: b.health };
      b.bossHorn = K.horn;
      return null;
    }
    H.t++;
    if (b.health < H.hp) { // struck: the call is broken off
      if (H.state === 'blow') this.world.events.emit('hornBroken', { fighter: b });
      K.horn = null; b.bossHorn = null; b.hornT = 0;
      K.hornAt = T.every[0] - (T.every[1] - T.every[0]); // (a while before he tries again)
      return null;
    }
    if (!['idle', 'walk'].includes(b.state)) return null;
    const B = this.world.bounds;
    if (H.state === 'back') {
      // to the back of the yard, on the far side of him from the hero
      const side = Math.sign(b.x - target.x) || 1;
      H.post ??= { x: Math.max(B.minX + 40, Math.min(B.maxX - 40, b.x + side * 140)), z: B.minZ + 20 };
      const dx = H.post.x - b.x; const dz = H.post.z - b.z;
      brain.moveX = Math.abs(dx) > 10 ? Math.sign(dx) : 0;
      brain.moveZ = Math.abs(dz) > 8 ? Math.sign(dz) : 0;
      brain.facingHint = brain.moveX || Math.sign(target.x - b.x) || b.facing;
      if ((!brain.moveX && !brain.moveZ) || H.t > T.back) {
        H.state = 'blow'; H.t = 0;
        this.world.events.emit('hornRaised', { fighter: b, boss: true });
        this.stage.story?.trigger(`horn:${this.stage.section?.id}`);
      }
      return true;
    }
    // blowing: the bar fills; he holds his ground
    brain.facingHint = Math.sign(target.x - b.x) || b.facing;
    b.hornT = H.t / T.blow;
    if (H.t < T.blow) return true;
    const calls = T.calls[Math.min(K.hornCalls, T.calls.length - 1)];
    K.hornCalls++; K.horn = null; b.bossHorn = null; b.hornT = 0;
    K.hornAt = -((this.world.frame * 11) % (T.every[1] - T.every[0]));
    this.world.events.emit('hornSounded', { fighter: b, boss: true });
    const heroes = this.heroes;
    calls.forEach((type, k) => {
      const side = k % 2 ? -1 : 1;
      const e = createEnemy(this.world, type, offscreenX(this.world, heroes, side, k >> 1), B.minZ + 30 + ((k * 97) % Math.max(1, B.maxZ - B.minZ - 60)), { entering: true });
      this.stage.setOnGround(e);
    });
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
    const P = this.packTurn;
    const dx = target.x - h.x;
    if (P?.id === h.id) {
      if (P.tell > 0) { P.tell--; h.packTell = P.tell; brain.facingHint = Math.sign(dx) || h.facing; brain.moveX = 0; brain.moveZ = 0; if (!P.tell) setHunt(h, 'rush', 90); return true; }
      h.packTell = 0;
      return false; // (his turn: in he goes, the hound's own hunting)
    }
    h.packTell = 0;
    if (!['idle', 'walk'].includes(h.state)) return false;
    // not its turn: it circles, barks, howls, slinks about (entities/HoundHunt.js), never in
    hunt(brain, target, { noAttack: true });
    brain.terrainSteer(target);
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
    for (const C of this.carts) if (C.pr.section >= section && !C.pr.broken) { C.pr.halted = false; C.driver = null; C.mounted = false; C.fresh = true; }
  }
}
