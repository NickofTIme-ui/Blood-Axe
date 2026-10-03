// Stage.js — Runs THE OATH ROAD (data/stage.js): sections, waves, the locked camera
// bounds, checkpoints, breakable props and their pickups, fire grates and pendulum
// blades, the boss, and the end. Pure logic on top of the World (no drawing — the
// views and ArenaScene listen to its events), so the tests can drive it.
//
// Events (on world.events):
//   sectionStart { index, section }     sectionClear { index, section, last }
//   propKick { prop, dir, by }  (a crate or chest kicked off down the lane)
//   bladeStruck { hazard, by, dir, force }  (a pendulum blade smashed back by a hero)
//   propHit / propBreak { prop }      pickup { pickup, fighter }
//   hazardWarn / hazardFire { hazard }  hazardHit { hazard, fighter }
//   secretFound { prop, count, total }  bossSpawn { boss }  bossRage { boss }
//   stageWon { stats }

import { STAGE, PICKUPS, PROPS } from '../data/stage.js';
import { ENEMIES } from '../data/enemies.js';
import { createEnemy, offscreenX } from '../entities/Enemy.js';
import { toWorldBox, overlaps } from '../combat/Boxes.js';

const PAD = 30;           // keep everyone this far inside the section's ends
const WAVE_GAP = 50;      // frames between one wave dying and the next arriving
const REVIVE_AFTER = 360; // ticks a fallen hero lies there before he rises beside his partner (co-op)
const ADVANCE_AT = 300;  // px past the next section's start that locks you into it

// Fire grate: idle -> glowing warning -> eruption (frames)
const FIRE = { period: 210, warn: 110, burst: 160, tick: 14, damage: 9 };
// Pendulum blade
// (driven: struck by a hero — how long it whips about, how much wider and faster, its damage)
const BLADE = { period: 150, length: 320, damage: 20, driven: { frames: 150, wide: 2, haste: 1, damage: 60 } };
// A kicked crate or chest: how fast and far it skids (px/s, px), how close to an enemy's
// lane it must pass to strike him, and the burst (reach along the lane, across it, damage)
const KICKED = { kinds: ['crate', 'chest'], speed: 620, range: 560, lane: 26, radius: 95, depth: 44, damage: 34 };

export class Stage {
  constructor(world, data = STAGE) {
    this.world = world;
    this.data = data;
    this.sections = data.sections;
    this.index = -1;
    this.phase = 'idle';
    this.props = [];
    this.pickups = [];
    this.hazards = [];
    this.secretsTotal = 0;
    this.stats = { kills: 0, finishers: 0, secrets: 0, deaths: 0, frames: 0 };
    let id = 1;
    for (const [si, sec] of this.sections.entries()) {
      for (const p of sec.props ?? []) {
        const def = PROPS[p.kind];
        this.props.push({ id: id++, section: si, ...p, ...def, hp: def.hp, broken: false, hitBy: new Set() });
        if (p.secret) this.secretsTotal++;
      }
      for (const h of sec.hazards ?? []) this.hazards.push({ id: id++, section: si, ...h, t: h.phase ?? 0, cool: new Map() });
    }
    world.events.on('kill', (e) => {
      if (e.defender?.team !== 'enemy') return;
      this.stats.kills++;
      if (e.finisher) this.stats.finishers++;
    });
  }

  get section() { return this.sections[this.index]; }
  // The hero things are measured from (spawns, the way on): the first one still standing.
  get player() { return this.players?.find((p) => p.alive) ?? this.players?.[0]; }

  // players: the hero, or the heroes (co-op), in player order.
  start(players) {
    this.players = Array.isArray(players) ? players : [players];
    this.enterSection(0, true);
  }

  // ------------------------------------------------------------ sections

  enterSection(i, teleport = false) {
    const sec = this.sections[i];
    this.index = i;
    this.checkpoint = i;
    this.waveIndex = 0;
    this.waveDelay = 40;
    this.phase = 'fight';
    this.bossSpawned = false;
    this.boss = null;
    this.lockBounds(sec.x0, sec.x1);
    if (teleport) {
      (this.players ?? []).forEach((p, i) => { p.x = sec.x0 + 140 - i * 46; p.z = 440 + i * 26; });
    }
    this.world.events.emit('sectionStart', { index: i, section: sec });
  }

  lockBounds(x0, x1) {
    const b = this.world.bounds;
    b.minX = x0 + PAD;
    b.maxX = x1 - PAD;
  }

  // The fight in the current section is over: open the way on (or win).
  clearSection() {
    const last = this.index === this.sections.length - 1;
    this.phase = last ? 'won' : 'clear';
    this.cleared = this.index;
    this.world.events.emit('sectionClear', { index: this.index, section: this.section, last });
    if (last) {
      this.world.events.emit('stageWon', { stats: { ...this.stats, secretsTotal: this.secretsTotal } });
      return;
    }
    const next = this.sections[this.index + 1];
    this.lockBounds(this.section.x0, next.x1);
  }

  // Died: back to the last checkpoint, healed, with the section's fight reset.
  respawn() {
    this.stats.deaths++;
    for (const f of this.world.fighters) if (f.team === 'enemy') f.removeMe = true;
    this.world.barriers?.clear();
    this.world.mines?.clear();
    for (const p of this.players) this.restore(p, 1);
    const won = this.cleared === this.checkpoint; // died (a trap) after the fight here was already won
    this.enterSection(this.checkpoint, true);
    if (won) {
      // ...then it stays won: no fighting the same waves twice
      this.waveIndex = (this.section.waves ?? []).length;
      this.clearSection();
    }
  }

  // Put a hero back on his feet with this share of his health.
  restore(p, share) {
    p.health = Math.max(1, p.stats.maxHealth * share);
    p.mana = p.stats.maxMana;
    p.stamina = p.stats.maxStamina;
    p.dead = false;
    p.downFor = 0;
    p.awe = 0;
    p.vx = p.vz = p.vh = 0;
    p.h = 0;
    p.fsm.change('idle');
  }

  // Co-op: a fallen hero isn't out while his partner still stands — after a while he
  // drags himself up at his partner's side on half health. Both down = the run is lost
  // (back to the checkpoint, together).
  updateDowned() {
    if (this.players.length < 2) return;
    const up = this.players.filter((p) => p.alive);
    for (const p of this.players) {
      if (p.alive || !up.length || p.state !== 'dead') { p.downFor = 0; continue; }
      p.downFor = (p.downFor ?? 0) + 1;
      if (p.downFor < REVIVE_AFTER) continue;
      const mate = up[0];
      const b = this.world.bounds;
      this.restore(p, 0.5);
      p.x = Math.max(b.minX, Math.min(b.maxX, mate.x - mate.facing * 50));
      p.z = mate.z;
      this.world.events.emit('revive', { fighter: p, by: mate });
    }
  }

  livingFoes() {
    return this.world.fighters.filter((f) => f.team === 'enemy' && f.alive);
  }

  spawnWave(roster) {
    const b = this.world.bounds;
    const heroes = this.players.filter((p) => p.alive);
    roster.forEach((type, k) => {
      // from off-screen, alternating sides; they walk on (Enemy.js offscreenX)
      const side = k % 2 === 0 ? 1 : -1;
      const x = offscreenX(this.world, heroes, side, k >> 1);
      const z = b.minZ + 20 + ((k * 71) % Math.max(1, b.maxZ - b.minZ - 40)); // spread over the lane
      createEnemy(this.world, type, x, z, { entering: true });
    });
  }

  spawnBoss() {
    const sec = this.section;
    const def = sec.boss;
    const base = ENEMIES[def.type];
    const E = def.entrance;
    // with an entrance he starts off the right edge of the room and walks in (the
    // 'bossEntrance' state); otherwise he's simply there
    const x = E ? sec.x1 + E.from : Math.min(sec.x1 - PAD - 40, this.player.x + 420);
    const boss = createEnemy(this.world, def.type, x, 430);
    // a boss is the same fighter, harder: more health, harder hits, never flinches from light blows
    boss.stats = {
      ...base, name: def.name, boss: true,
      maxHealth: Math.round(base.maxHealth * def.health),
      meleeMult: (base.meleeMult ?? 1) * def.damage,
      knockdownFrames: Math.round((base.knockdownFrames ?? 40) * 0.6),
    };
    boss.health = boss.stats.maxHealth;
    this.boss = boss;
    this.bossSpawned = true;
    if (E) {
      const toX = Math.max(this.world.bounds.minX + 60, sec.x1 - E.to);
      boss.fsm.change('bossEntrance', { toX, speed: E.speed, stepEvery: E.stepEvery });
      // the heroes stand frozen while he comes (and a moment after)
      const frames = Math.ceil(((x - toX) / E.speed) * 60) + E.awe;
      for (const p of this.players) if (p.alive) p.awe = frames;
    }
    this.world.events.emit('bossSpawn', { boss, entrance: !!E });
  }

  // ------------------------------------------------------------ per frame

  update() {
    if (!this.player || this.phase === 'idle') return;
    this.stats.frames++;
    const p = this.player;
    this.updateHazards();
    this.updateProps();
    this.updatePickups();
    this.updateDowned();

    // boss rage: at half health he calls his dogs in
    const b = this.boss;
    if (b && b.alive && !b.raged && b.health < b.stats.maxHealth * 0.5) {
      b.raged = true;
      this.spawnWave(this.section.boss.adds);
      this.world.events.emit('bossRage', { boss: b });
    }

    if (this.phase === 'fight') {
      const sec = this.section;
      if (this.livingFoes().length) return;
      if (this.waveDelay > 0) { this.waveDelay--; return; }
      if (this.waveIndex < sec.waves.length) {
        this.spawnWave(sec.waves[this.waveIndex++]);
        this.waveDelay = WAVE_GAP;
        return;
      }
      if (sec.boss && !this.bossSpawned) { this.spawnBoss(); return; }
      this.clearSection();
    } else if (this.phase === 'clear') {
      const next = this.sections[this.index + 1];
      if (this.players.some((q) => q.alive && q.x > next.x0 + ADVANCE_AT)) this.enterSection(this.index + 1);
    }
  }

  // ------------------------------------------------------------ props & pickups

  updateProps() {
    for (const f of this.world.fighters) {
      // a swing's hitbox, or a blast of force (the Mage: f.propStrike, one tick)
      const ps = f.propStrike;
      const info = f.activeAttack ?? (ps ? (ps.key ?? (ps.key = { move: { breaksGuard: true } })) : null);
      if (f.team !== 'player' || !info) continue;
      const hb = f.activeAttack ? toWorldBox(f, info.hitbox ?? info.move.hitbox) : ps.box;
      for (const pr of this.props) {
        if (pr.broken || pr.hitBy.has(info)) continue;
        const box = { left: pr.x - pr.w / 2, right: pr.x + pr.w / 2, bottom: 0, top: pr.h, z: pr.z };
        if (!overlaps(hb, box, f.activeAttack ? (pr.kind === 'wall' ? 60 : 30) : ps.depth)) continue;
        pr.hitBy.add(info);
        // a kick doesn't break a crate or a chest: it sends it skidding off down the lane
        // (Rurik's Sparta kick, the Rogue's crescent kick, the Mage's force blast)
        const shoves = f.activeAttack ? info.move.bowl || info.move.fx === 'rkick' : true;
        if (shoves && KICKED.kinds.includes(pr.kind)) {
          if (!pr.fly) {
            pr.fly = { dir: f.facing, left: KICKED.range };
            this.world.events.emit('propKick', { prop: pr, dir: f.facing, by: f });
          }
          continue;
        }
        pr.hp -=f.activeAttack ? (info.move.breaksGuard || info.move.bowl ? 2 : 1) : ps.smash; // heavies and kicks smash
        const dir = Math.sign(pr.x - f.x) || f.facing;
        if (pr.hp > 0) { this.world.events.emit('propHit', { prop: pr, dir }); continue; }
        this.breakProp(pr, dir);
      }
    }
    this.updateKicked();
  }

  breakProp(pr, dir, blast = false) {
    pr.broken = true;
    pr.fly = null;
    this.world.events.emit('propBreak', { prop: pr, dir, blast });
    if (pr.drop) {
      // a wall's shrine sits in the alcove behind it; everything else rolls out in front
      const z = pr.kind === 'wall' ? pr.z + 6 : Math.min(this.world.bounds.maxZ - 5, pr.z + 14);
      this.pickups.push({ kind: pr.drop, x: pr.x, z, age: 0, taken: false, secret: !!pr.secret });
    }
  }

  // Kicked crates and chests: they skid along the lane and burst on the first enemy they
  // reach, hurting and flooring everyone close by. One that meets nobody breaks where it stops.
  updateKicked() {
    const end = this.sections[this.sections.length - 1].x1 - PAD;
    for (const pr of this.props) {
      const fl = pr.fly;
      if (!fl || pr.broken) continue;
      const step = KICKED.speed / 60;
      pr.x += fl.dir * step;
      fl.left -= step;
      const near = (f, rx, rz) => f.team === 'enemy' && f.alive && Math.abs(f.x - pr.x) <= rx && Math.abs(f.z - pr.z) <= rz;
      const struck = this.world.fighters.some((f) => near(f, pr.w / 2 + 16, KICKED.lane));
      if (!struck && fl.left > 0 && pr.x > PAD && pr.x < end) continue;
      if (struck) {
        const hz = { cool: new Map(), x: pr.x, z: pr.z };
        for (const f of this.world.fighters) {
          if (near(f, KICKED.radius, KICKED.depth)) this.hurt(hz, f, KICKED.damage, Math.sign(f.x - pr.x) || fl.dir, 'crate');
        }
      }
      this.breakProp(pr, fl.dir, struck);
    }
  }

  updatePickups() {
    for (const pk of this.pickups) {
      pk.age++;
      if (pk.taken || pk.age < 20) continue;
      const p = this.players.find((q) => q.alive && Math.abs(q.x - pk.x) <= 30 && Math.abs(q.z - pk.z) <= 24);
      if (!p) continue;
      pk.taken = true;
      const def = PICKUPS[pk.kind];
      if (def.heal) p.health = Math.min(p.stats.maxHealth, p.health + p.stats.maxHealth * def.heal);
      if (def.mana) p.mana = p.stats.maxMana;
      if (pk.secret) {
        this.stats.secrets++;
        this.world.events.emit('secretFound', { pickup: pk, count: this.stats.secrets, total: this.secretsTotal });
      }
      this.world.events.emit('pickup', { pickup: pk, def, fighter: p });
    }
    this.pickups = this.pickups.filter((pk) => !pk.taken);
  }

  // ------------------------------------------------------------ hazards

  updateHazards() {
    for (const hz of this.hazards) {
      // only the hazards near the action run (the rest wait, so their timing is fresh)
      if (Math.abs(hz.section - this.index) > 1) continue;
      hz.t++;
      for (const [id, c] of hz.cool) { if (c <= 1) hz.cool.delete(id); else hz.cool.set(id, c - 1); }
      if (hz.type === 'fire') this.updateFire(hz);
      else this.updateBlade(hz);
    }
  }

  // phase of a fire grate: 'idle' | 'warn' | 'burst'
  firePhase(hz) {
    const t = hz.t % FIRE.period;
    return t < FIRE.warn ? 'idle' : t < FIRE.burst ? 'warn' : 'burst';
  }

  // The fire grates erupting right now, near the action (for effects/Burn.js).
  activeFires() {
    return this.hazards.filter((hz) => hz.type === 'fire' && Math.abs(hz.section - this.index) <= 1 && this.firePhase(hz) === 'burst');
  }

  updateFire(hz) {
    const t = hz.t % FIRE.period;
    if (t === FIRE.warn) this.world.events.emit('hazardWarn', { hazard: hz });
    if (t === FIRE.burst) this.world.events.emit('hazardFire', { hazard: hz });
    if (this.firePhase(hz) !== 'burst') return;
    for (const f of this.world.fighters) {
      if (Math.abs(f.x - hz.x) > hz.w / 2 || Math.abs(f.z - hz.z) > hz.d / 2 || f.h > 40) continue;
      this.hurt(hz, f, FIRE.damage, Math.sign(f.x - hz.x) || 1, 'fire');
    }
  }

  // The blade's angle (radians) and tip position.
  bladeState(hz) {
    const max = Math.asin(Math.min(0.95, hz.swing * (hz.driven ? BLADE.driven.wide : 1) / BLADE.length));
    const a = max * Math.sin((hz.t / BLADE.period) * Math.PI * 2);
    const speed = Math.cos((hz.t / BLADE.period) * Math.PI * 2); // + = swinging right
    return { a, tipX: hz.x + Math.sin(a) * BLADE.length, speed };
  }

  updateBlade(hz) {
    const D = BLADE.driven;
    if (hz.driven && --hz.driven <= 0) hz.driven = 0;
    if (hz.driven) hz.t += D.haste; // (it whips through faster while it lasts)
    else this.strikeBlade(hz);
    const s = this.bladeState(hz);
    if (Math.abs(s.speed) < 0.55) return; // only the fast bottom of the swing cuts
    for (const f of this.world.fighters) {
      if (Math.abs(f.x - s.tipX) > (hz.driven ? 40 : 30) || Math.abs(f.z - hz.z) > (hz.driven ? 30 : 20) || f.h > 70) continue;
      if (hz.driven && f.team === 'player') continue; // sent on its way by a hero: it's his blade now
      this.hurt(hz, f, hz.driven ? D.damage : BLADE.damage, Math.sign(s.speed), 'blade');
    }
  }

  // A hero's swing (Ulric's sword, the Rogue's daggers) or the Mage's force blast catching
  // the blade smashes it back the other way: for a while it whips through twice as wide and
  // fast, away from him first, and cuts down only his enemies.
  strikeBlade(hz) {
    const s = this.bladeState(hz);
    for (const f of this.world.fighters) {
      if (f.team !== 'player' || !f.alive) continue;
      const ps = f.propStrike;
      if (!f.activeAttack && !ps) continue;
      const hb = f.activeAttack ? toWorldBox(f, f.activeAttack.hitbox ?? f.activeAttack.move.hitbox) : ps.box;
      const reach = f.activeAttack ? 34 : ps.depth;
      if (hb.right < s.tipX - 26 || hb.left > s.tipX + 26 || Math.abs(f.z - hz.z) > reach) continue;
      hz.driven = BLADE.driven.frames;
      hz.t = f.facing > 0 ? 0 : BLADE.period / 2; // at the bottom of its arc, flying away from him
      hz.cool.clear();
      hz.cool.set(f.id, 30);
      this.world.events.emit('bladeStruck', { hazard: hz, by: f, dir: f.facing, force: !f.activeAttack });
      return;
    }
  }

  // A hazard hurting anyone (players and enemies alike).
  hurt(hz, f, dmg, dir, kind) {
    if (!f.alive || f.invincible || f.entering || f.state === 'executed' || f.state === 'execute' || hz.cool.has(f.id)) return;
    if (kind === 'fire' && f.state === 'knockdown' && f.lyingSince === null) return; // already thrown clear
    hz.cool.set(f.id, kind === 'fire' ? FIRE.tick * 3 : 50);
    f.health = Math.max(0, f.health - dmg);
    f.flash = 6;
    const lethal = f.health <= 0;
    // an enemy the fire kills doesn't get thrown clear: he burns where he stands, then
    // drops (the 'burning' state; effects/Burn.js chars the body)
    if (lethal && kind === 'fire' && f.team === 'enemy') f.fsm.change('burning', { dir });
    else {
      f.fsm.change('knockdown', kind === 'fire'
        ? { vx: dir * 160, vh: 260 }
        : { vx: dir * 420, vh: 320 });
    }
    const e = {
      attacker: null, defender: f, dir, kind: 'hazard', hazard: kind,
      move: { cut: kind === 'fire' ? 'fire' : kind === 'crate' ? 'blunt' : 'slash', damage: dmg, hitstop: 6 },
      x: f.x, z: f.z, h: f.h + f.stats.body.h * 0.5, damage: dmg, fatality: 'none',
    };
    this.world.events.emit('hazardHit', { hazard: hz, fighter: f, kind });
    this.world.events.emit('hit', e);
    if (lethal) { f.fatality = 'none'; this.world.events.emit('kill', e); }
  }
}
