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
//   beamCrash { hazard }  (a burning beam comes down)
//   stageWon { stats }
//
// Campaign levels (data/stageVillage.js) add, all optional:
//   story / npcs        dialogue and villagers to save (stage/Story.js)
//   section.fightAt     its waves hold until a hero gets this far (walk in, look, then fight)
//   exit: { x, after }  the level ends when a hero walks out here, once the last section
//                       is won and the beat `after` has played (not the moment it's won)
//   boss.entrance.freeze: false   he walks in without freezing the heroes (a sub-boss)
//   boss.escort: [types]          brought on with him (the Houndmaster's two hounds)
//   boss.twin: { type, name, health, damage }   a second boss beside him (the Iron Gates'
//                       twins): both must die; when one falls the other takes his place on
//                       the HUD and fights harder (`boss.grief`: { damage, speed } x).
//                       Emits twinFall { fallen, left }; story beats 'twin:<section>'
//   prop.opens + prop.tag         with a tag, the way opens only once every prop with that
//                       tag is broken (the Iron Gates' two winch chains)
//   hazard.if / hazard.unless     a hazard only runs if the story's condition holds
//                       ('saved:<npcId>': the rescued come back to help)
//   bombard.friendly: true        stones thrown by your own people (the rescued, from the
//                       walls): aimed at the Ashen, never at a boss; they hurt only the Ashen
//   section.needs: '<tag>'        its fight isn't won until every prop with that tag is
//                       broken (the Shattered Ascent's catapults); propsDown { tag } is
//                       emitted when the last one goes (story beats 'broken:<tag>')
//   boss.phases: [{ id, at, adds?, ai?, damage?, speed?, rage? }]   BOSS PHASES: under `at`
//                       of his health he moves on to the next phase (in order, each once):
//                       new men (`adds`), his brain's numbers changed (`ai`: e.g. a shorter
//                       attackCooldown), harder (`damage` x) or faster (`speed` x). Emits
//                       bossPhase { boss, phase, index }; story beats 'phase:<section>:<id>';
//                       hazards `when: 'phase:<id>'` only run from that phase on. `rage: true`
//                       also counts as his rage (bossRage, `when: 'rage'`). Without phases a
//                       boss has one: at half health he rages and calls his `adds`.
//   sequence            a scripted ending (stage/Sequence.js: the judgment)
//
// new Stage(world, data, opts): opts.rescued / opts.lost (villagers already saved / lost in
// this level: a saved checkpoint), opts.saved (every level's saved, from the campaign save),
// opts.flags (the campaign's one-time flags: a sequence's progress). start(players,
// { section }) starts at a later section's checkpoint.

import { STAGE, PICKUPS, PROPS } from '../data/stage.js';
import { ENEMIES, HORDE_SIZE } from '../data/enemies.js';
import { createEnemy, offscreenX } from '../entities/Enemy.js';
import { toWorldBox, overlaps } from '../combat/Boxes.js';
import { Terrain, PIT_LOST } from './Terrain.js';
import { Story } from './Story.js';
import { Sequence } from './Sequence.js';
import { LOOT } from '../data/trophies.js';

const PAD = 30;           // keep everyone this far inside the section's ends
const WAVE_GAP = 50;      // frames between one wave dying and the next arriving
const REVIVE_AFTER = 360; // ticks a fallen hero lies there before he rises beside his partner (co-op)
const ADVANCE_AT = 300;  // px past the next section's start that locks you into it
const SEALED = 200;      // px: a wall across the lane this tall can't be climbed (nobody comes on from behind it)
const STUCK_AFTER = 180;  // frames a man walking on can stand stuck (a stream, a ledge) before he's brought round

// Fire grate: idle -> glowing warning -> eruption (frames)
const FIRE = { period: 210, warn: 110, burst: 160, tick: 14, damage: 9 };
// A rest shrine: stand at it (no fight on) and you're healed; stand still this long and
// you kneel to rest (the skill tree opens: ArenaScene)
const REST = { reach: 46, depth: 34, kneel: 50 };
// A fall into a pit: a hero loses this share of his health (a fifth; never the last of it) and is
// back on the last safe ground he stood on, untouchable for a moment
const PIT = { damage: 0.2, guard: 60 };
const PIT_DROP = -20; // sunk this far below the floor over a pit: he's going over (pitDrop)
// Pendulum blade
// (driven: struck by a hero — how long it whips about, how much wider and faster, its damage)
// (bleed: how much of the extra swing a struck blade keeps each frame once it's no longer driven)
const BLADE = { period: 150, length: 320, damage: 20, bleed: 0.985, driven: { frames: 150, wide: 2, haste: 1, damage: 60 } };
// A kicked crate or chest: how fast and far it skids (px/s, px), how close to an enemy's
// lane it must pass to strike him, and the burst (reach along the lane, across it, damage)
const KICKED = { kinds: ['crate', 'chest'], speed: 620, range: 560, lane: 26, radius: 95, depth: 44, damage: 34 };
// A burning beam falling (hazard 'beam'): it creaks and sheds embers for `warn` frames,
// its shadow growing on the ground, then comes down on whoever is under it, either side
// (enemies too). `when: 'rage'` beams only fall while the section's boss is raging.
// The stables' stampede: px a frame, the space between horses, how close a horse must be
// to run you down (each side of him), the damage
const STAMPEDE = { period: 330, warn: 80, speed: 13, gap: 120, reach: 46, damage: 26 };
// The mine's collapse: how far ahead of the falling rock it still hits you, the damage
const COLLAPSE = { reach: 30, damage: 24 };
const BEAM = { period: 230, warn: 80, damage: 22, lethalH: 60 };
// The Shattered Ascent's catapults (hazard 'bombard'): a volley every `period` frames, each
// stone aimed at a hero (a little off where he stands), its landing spot shown for `warn`
// frames; what it hits (either side) within `radius` along the lane and `depth` across it.
// No stone is aimed within `pitClear` px of a drop (nobody is shelled off a bridge or a ledge).
const BOMBARD = { period: 200, warn: 75, shots: 2, radius: 64, depth: 46, damage: 20, spread: 110, pitClear: 170 };
// A twin whose brother falls: harder and faster (boss.grief overrides)
const GRIEF = { damage: 1.3, speed: 1.2 };

export class Stage {
  constructor(world, data = STAGE, opts = {}) {
    this.world = world;
    this.data = data;
    this.opts = opts;
    this.sections = data.sections;
    this.index = -1;
    this.phase = 'idle';
    this.props = [];
    this.pickups = [];
    this.hazards = [];
    this.secretsTotal = 0;
    // ledges, pits, lifts and rotten planks (stage/Terrain.js): stages without them have none
    this.terrain = data.terrain ? new Terrain(world, data.terrain) : null;
    world.terrain = this.terrain;
    // dialogue and villagers (stage/Story.js): campaign levels only
    this.story = data.story || data.npcs ? new Story(this, data) : null;
    // a scripted ending (the judgment): stage/Sequence.js
    this.sequence = data.sequence ? new Sequence(this, data.sequence, opts.flags ?? {}) : null;
    this.stats = { kills: 0, finishers: 0, secrets: 0, deaths: 0, frames: 0 };
    let id = 1;
    for (const [si, sec] of this.sections.entries()) {
      for (const p of sec.props ?? []) {
        const def = PROPS[p.kind];
        // (y: the ground it stands on — a ledge's top on a stage with terrain)
        const y = this.terrain ? Math.max(0, this.terrain.groundAt(p.x, p.z)) : 0;
        this.props.push({ id: id++, section: si, ...p, ...def, y, hp: def.hp, broken: false, hitBy: new Set() });
        if (p.secret) this.secretsTotal++;
      }
      for (const h of sec.hazards ?? []) this.hazards.push({ id: id++, section: si, ...h, t: h.phase ?? 0, cool: new Map() });
    }
    world.events.on('kill', (e) => {
      if (e.defender?.team !== 'enemy') return;
      this.stats.kills++;
      if (e.finisher) this.stats.finishers++;
      this.dropLoot(e.defender);
      this.twinFell(e.defender);
    });
    // a boss the story spares (beaten to his knees: stage/Sequence.js) still gives up his trophy
    world.events.on('hit', (e) => { if (e.defender?.spare && e.defender.health <= 1) this.dropLoot(e.defender); });
  }

  get section() { return this.sections[this.index]; }
  // The hero things are measured from (spawns, the way on): the first one still standing.
  get player() { return this.players?.find((p) => p.alive) ?? this.players?.[0]; }

  // players: the hero, or the heroes (co-op), in player order.
  // section: start at this section's checkpoint (what came before counts as done).
  start(players, { section = 0 } = {}) {
    this.players = Array.isArray(players) ? players : [players];
    const k = Math.max(0, Math.min(this.sections.length - 1, section | 0));
    if (k > 0) {
      this.cleared = k - 1;
      this.story?.skipTo(k);
    }
    this.enterSection(k, true);
    this.sequence?.resume();
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
    this.fightOn = sec.fightAt == null; // (a section with fightAt: its waves wait for you)
    this.lockBounds(sec.x0, sec.x1);
    if (teleport) {
      // (a section can name where its heroes stand: on a stage with ledges and pits the
      // default spot may be neither)
      const at = sec.spawn ?? { x: sec.x0 + 140, z: 440 };
      (this.players ?? []).forEach((p, i) => {
        p.x = at.x - i * 46; p.z = Math.min(this.world.bounds.maxZ, at.z + i * 26);
        this.placeOnGround(p);
        p.safe = { x: p.x, z: p.z };
      });
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
      // a campaign level ends at its exit, walked out of (update); the rest end here
      if (this.data.exit) this.phase = 'exit';
      else this.win();
      return;
    }
    const next = this.sections[this.index + 1];
    this.lockBounds(this.section.x0, next.x1);
  }

  win() {
    if (this.wonOnce) return;
    this.wonOnce = true;
    this.phase = 'won';
    this.world.events.emit('stageWon', { stats: { ...this.stats, secretsTotal: this.secretsTotal } });
  }

  // Died: back to the last checkpoint, healed, with the section's fight reset.
  respawn() {
    this.stats.deaths++;
    for (const f of this.world.fighters) if (f.team === 'enemy') f.removeMe = true;
    this.world.barriers?.clear();
    this.world.mines?.clear();
    for (const p of this.players) this.restore(p, 1);
    const won = this.cleared === this.checkpoint; // died (a trap) after the fight here was already won
    this.story?.resetSection(this.checkpoint);
    for (const hz of this.hazards) if (hz.type === 'collapse' && hz.section === this.checkpoint) hz.front = null; // (the rock starts again behind you)
    for (const hz of this.hazards) if (hz.type === 'bombard') hz.shells = []; // (nothing left in the air)
    // (a wagon still rolling here goes back to where it started, its people still in it)
    for (const pr of this.props) {
      if (pr.roll?.from == null || pr.section !== this.checkpoint || pr.broken) continue;
      pr.x = pr.roll.from; pr.escaped = false;
      this.world.events.emit('propReset', { prop: pr });
    }
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
    this.placeOnGround(p);
    p.fsm.change('idle');
  }

  // Stand him on whatever ground is under him (the floor, or a ledge).
  placeOnGround(p) {
    p.floor = this.terrain ? this.terrain.groundAt(p.x, p.z) : 0;
    p.floorBlock = this.terrain?.blockAt(p.x, p.z) ?? null;
    p.h = p.floor;
  }

  // ------------------------------------------------------------ rest shrines

  // The shrine near a hero (this section's or the next one's), or null.
  restNear(p) {
    for (const sec of [this.section, this.sections[this.index + 1]]) {
      const r = sec?.rest;
      if (r && Math.abs(p.x - r.x) <= REST.reach && Math.abs(p.z - r.z) <= REST.depth && p.grounded) return r;
    }
    return null;
  }

  updateRests() {
    for (const p of this.players) {
      const r = p.alive ? this.restNear(p) : null;
      if (!r || this.livingFoes().length) { p.restAt = null; p.restStill = 0; continue; }
      if (p.restAt !== r) {
        // reached it: healed whole, every time you come to it
        p.restAt = r;
        p.restStill = 0;
        p.restOpened = false;
        p.health = p.stats.maxHealth; p.mana = p.stats.maxMana; p.stamina = p.stats.maxStamina;
        this.world.events.emit('restTouch', { fighter: p, rest: r });
      }
      const still = !p.controller.moveX && !p.controller.moveZ && ['idle'].includes(p.state);
      p.restStill = still ? p.restStill + 1 : 0;
      if (p.restStill >= REST.kneel && !p.restOpened) {
        p.restOpened = true;
        this.world.events.emit('restKneel', { fighter: p, rest: r });
      }
    }
  }

  // ------------------------------------------------------------ the bell (an optional fight)

  ringBell(pr) {
    const before = new Set(this.world.fighters);
    this.spawnWave(pr.challenge);
    const foes = this.world.fighters.filter((f) => !before.has(f));
    this.challenge = { prop: pr, foes };
    this.world.events.emit('challengeStart', { prop: pr, foes });
  }

  updateChallenge() {
    const c = this.challenge;
    if (!c || c.foes.some((f) => f.alive)) return;
    this.challenge = null;
    this.world.events.emit('challengeWon', { prop: c.prop });
  }

  // ------------------------------------------------------------ falls

  // Heroes remember the last firm ground they stood on (not a lift, not a rotten plank,
  // not the lip of a pit). Whoever drops into a pit is gone from the fight: an enemy dies,
  // a hero is put back on that ground a little hurt — never more than ten seconds lost.
  updateFalls() {
    const T = this.terrain;
    if (!T) return;
    for (const p of this.players) {
      if (!p.alive || !p.grounded) continue;
      const firm = [[0, 0], [-22, 0], [22, 0], [0, -14], [0, 14]].every(([dx, dz]) =>
        T.safeAt(p.x + dx, p.z + dz) && T.groundAt(p.x + dx, p.z + dz) === p.floor);
      if (firm) p.safe = { x: p.x, z: p.z };
    }
    for (const f of this.world.fighters) {
      // (once per fall, as he drops past the lip: the views scream)
      if (f.h >= -1) f.pitDropping = false;
      else if (f.alive && !f.pitDropping && f.floor < -1 && f.h < PIT_DROP) {
        f.pitDropping = true;
        this.world.events.emit('pitDrop', { fighter: f });
      }
      if (!f.alive || f.removeMe || !(f.h < PIT_LOST)) continue; // (only a pit lets anyone sink this low)
      if (f.team === 'player') this.pitRecover(f);
      else this.pitKill(f);
    }
  }

  pitRecover(p) {
    const at = p.safe ?? this.section.spawn ?? { x: this.section.x0 + 140, z: 440 };
    p.health = Math.max(1, p.health - p.stats.maxHealth * PIT.damage);
    p.x = at.x; p.z = at.z;
    p.vx = p.vz = p.vh = 0;
    this.placeOnGround(p);
    p.pitGuard = PIT.guard;
    p.fsm.change('idle');
    this.stats.falls = (this.stats.falls ?? 0) + 1;
    this.world.events.emit('pitFall', { fighter: p, to: at });
  }

  pitKill(f) {
    f.health = 0;
    f.fsm.change('dead');
    f.removeMe = true;
    const e = {
      attacker: f.lastAttacker ?? null, defender: f, dir: Math.sign(f.vx) || 1, kind: 'hazard', hazard: 'pit', pit: true,
      move: { cut: 'blunt', damage: 0, hitstop: 0, noBlood: true }, x: f.x, z: f.z, h: f.h, damage: 0, fatality: 'none',
    };
    this.world.events.emit('pitFall', { fighter: f });
    this.world.events.emit('kill', e);
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

  // A man walking on from off-screen who can't get here (a stream or a ledge between him and
  // the heroes) would hold the fight open for good, out of sight. Stuck too long, he's
  // brought round to the other side; stuck there as well, he's let go.
  updateLatecomers() {
    for (const e of this.world.fighters) {
      if (e.team !== 'enemy' || !e.alive || !e.entering || e.state === 'bossEntrance') continue;
      const moved = Math.abs(e.x - (e.enterX ?? NaN)) > 1;
      e.enterX = moved ? e.x : e.enterX;
      e.enterStill = moved ? 0 : (e.enterStill ?? 0) + 1;
      if (e.enterStill < STUCK_AFTER) continue;
      e.enterStill = 0;
      if (e.broughtRound) { e.removeMe = true; e.health = 0; continue; }
      e.broughtRound = true;
      const heroes = this.players.filter((p) => p.alive);
      const side = Math.sign(e.x - (this.player?.x ?? e.x)) || 1;
      e.x = offscreenX(this.world, heroes, -side, 0);
      e.enterX = e.x;
      this.setOnGround(e);
    }
  }

  livingFoes() {
    return this.world.fighters.filter((f) => f.team === 'enemy' && f.alive);
  }

  spawnWave(roster) {
    const b = this.world.bounds;
    const heroes = this.players.filter((p) => p.alive);
    // a section with ledges and pits names where its men come from (`spawns`: { x, z },
    // usually just off-screen on firm ground); each is set down on whatever ground is there
    // (or one list per wave: spawns[waveIndex])
    let sp = this.section.spawns;
    if (Array.isArray(sp?.[0])) sp = sp[Math.max(0, Math.min(sp.length - 1, this.waveIndex - 1))];
    if (sp?.length) {
      roster.forEach((type, k) => {
        const at = sp[(this.spawnCursor = ((this.spawnCursor ?? -1) + 1)) % sp.length];
        const e = createEnemy(this.world, type, at.x + (k >= sp.length ? Math.sign(at.x - heroes[0]?.x || 1) * 40 : 0), at.z, { entering: !at.inPlace });
        if (this.terrain) { e.floor = this.terrain.groundAt(e.x, e.z); e.h = e.floor; }
      });
      return;
    }
    roster.forEach((type, k) => {
      // from off-screen, alternating sides; they walk on (Enemy.js offscreenX). Not from
      // behind a wall nobody can climb (a portcullis still down): he'd stand there for good
      let side = k % 2 === 0 ? 1 : -1;
      if (this.sealedSide(side, heroes)) side = -side;
      const x = offscreenX(this.world, heroes, side, k >> 1);
      const z = b.minZ + 20 + ((k * 71) % Math.max(1, b.maxZ - b.minZ - 40)); // spread over the lane
      const e = createEnemy(this.world, type, x, z, { entering: true });
      this.setOnGround(e);
    });
  }

  // Is there a wall across the whole lane, too tall to climb, between the heroes and that
  // side of the room (a portcullis down, a fall of rock)?
  sealedSide(side, heroes) {
    const T = this.terrain; const b = this.world.bounds;
    if (!T || !heroes.length) return false;
    const x = heroes[0].x;
    return T.blocks.some((w) => w.solid && w.top >= SEALED && w.z0 <= b.minZ && w.z1 >= b.maxZ
      && (side > 0 ? w.x0 > x && w.x0 < b.maxX + 400 : w.x1 < x && w.x1 > b.minX - 400));
  }

  // A man brought on from off-screen stands on whatever is there (a roof behind the yard:
  // up on it, not buried inside it, where he'd be walled in for good); over a pit, the
  // nearest ground further out.
  setOnGround(e) {
    const T = this.terrain;
    if (!T) return;
    const out = Math.sign(e.x - (this.player?.x ?? e.x)) || 1;
    for (let d = 0; d <= 600; d += 20) {
      const g = T.groundAt(e.x + out * d, e.z);
      if (g < -1) continue;
      e.x += out * d;
      e.floor = g; e.h = g;
      return;
    }
  }

  spawnBoss() {
    const sec = this.section;
    const def = sec.boss;
    const E = def.entrance;
    // with an entrance he starts off the right edge of the room and walks in (the
    // 'bossEntrance' state); otherwise he's simply there
    const x = E ? sec.x1 + E.from : Math.min(sec.x1 - PAD - 40, this.player.x + 420);
    const boss = this.makeBoss(def, x, 430);
    this.boss = boss;
    this.bossSpawned = true;
    // (the twins: his brother at his side, a little further back and down the lane)
    this.twins = null;
    if (def.twin) {
      const twin = this.makeBoss({ damage: 1, health: 1, ...def.twin }, Math.min(x + 90, sec.x1 + (E?.from ?? -PAD - 40)), 360);
      twin.phase = Infinity; // (no phases of his own)
      this.twins = [boss, twin];
    }
    if (E) {
      const toX = Math.max(this.world.bounds.minX + 60, sec.x1 - E.to);
      boss.fsm.change('bossEntrance', { toX, speed: E.speed, stepEvery: E.stepEvery });
      if (this.twins) this.twins[1].fsm.change('bossEntrance', { toX: toX + 70, speed: E.speed, stepEvery: E.stepEvery });
      // the heroes stand frozen while he comes (and a moment after)
      const frames = Math.ceil(((x - toX) / E.speed) * 60) + (E.awe ?? 0);
      // (and every other foe on the field: nobody gets free hits on a frozen hero)
      if (E.freeze !== false) {
        for (const p of this.players) if (p.alive) p.awe = frames;
        for (const f of this.world.fighters) if (f.team === 'enemy' && f.alive && f !== boss && !this.twins?.includes(f)) { f.awe = frames; f.vx = f.vz = 0; }
      }
    }
    if (def.escort?.length) this.spawnWave(def.escort); // (the men or dogs he brings with him)
    this.world.events.emit('bossSpawn', { boss, entrance: !!E });
  }

  // A boss is the same fighter, harder: more health, harder hits, never flinches from light blows.
  makeBoss(def, x, z) {
    const base = ENEMIES[def.type];
    const boss = createEnemy(this.world, def.type, x, z);
    this.setOnGround(boss);
    boss.stats = {
      ...base, name: def.name, boss: true, size: def.size ?? 1, // size: drawn this much bigger (looks only)
      maxHealth: Math.round(base.maxHealth * def.health),
      meleeMult: (base.meleeMult ?? 1) * def.damage,
      knockdownFrames: Math.round((base.knockdownFrames ?? 40) * 0.6),
    };
    boss.health = boss.stats.maxHealth;
    boss.phase = 0; // (how many of his phase thresholds he has passed)
    return boss;
  }

  // One of the twins is dead: the other takes his place (on the HUD) and fights harder.
  twinFell(f) {
    const tw = this.twins;
    if (!tw || !tw.includes(f)) return;
    const left = tw.find((q) => q !== f && q.alive);
    this.twins = null;
    if (!left) return;
    const G = { ...GRIEF, ...(this.section?.boss?.grief ?? {}) };
    left.stats.meleeMult *= G.damage;
    left.stats.walkSpeed *= G.speed; left.stats.depthSpeed *= G.speed;
    left.raged = true;
    left.phase = Infinity;
    this.boss = left;
    this.world.events.emit('twinFall', { fallen: f, left });
  }

  // ------------------------------------------------------------ per frame

  update() {
    if (!this.player || this.phase === 'idle') return;
    this.stats.frames++;
    const p = this.player;
    this.updateFalls();
    this.updateRests();
    this.updateChallenge();
    if (!this.hazardsOff) this.updateHazards();
    this.updateProps();
    this.updatePickups();
    this.updateDowned();
    this.updateLatecomers();
    this.story?.update();
    // a scripted ending running: it has the stage until it's done
    if (this.sequence?.update()) return;

    const b = this.boss;
    if (b && b.alive) this.updateBossPhases(b);

    if (this.phase === 'fight') {
      const sec = this.section;
      if (!this.fightOn) {
        if (!this.players.some((q) => q.alive && q.x >= sec.fightAt)) return;
        this.fightOn = true;
        this.waveDelay = Math.min(this.waveDelay, 10);
        this.world.events.emit('fightStart', { index: this.index, section: sec });
      }
      if (this.livingFoes().length) return;
      if (this.waveDelay > 0) { this.waveDelay--; return; }
      if (this.waveIndex < sec.waves.length) {
        const roster = sec.waves[this.waveIndex++];
        this.spawnWave(roster);
        if (roster.length >= HORDE_SIZE) this.world.events.emit('horde', { section: sec, count: roster.length });
        this.waveDelay = WAVE_GAP;
        return;
      }
      if (sec.boss && !this.bossSpawned) { this.spawnBoss(); return; }
      if (sec.needs && this.props.some((pr) => pr.tag === sec.needs && !pr.broken)) return; // (the catapults still stand)
      this.clearSection();
    } else if (this.phase === 'clear') {
      const next = this.sections[this.index + 1];
      if (this.players.some((q) => q.alive && q.x > next.x0 + ADVANCE_AT)) this.enterSection(this.index + 1);
    } else if (this.phase === 'exit') {
      // the level's last stretch is won: walk out of it (once its last words are said)
      const E = this.data.exit;
      const said = !E.after || this.story?.done.has(E.after);
      if (said && !this.story?.busy && this.players.some((q) => q.alive && q.x >= E.x)) this.win();
    }
  }

  // Boss phases (see the top): each threshold of his health passed, once, in order.
  bossPhases() {
    const def = this.section?.boss;
    return def?.phases ?? [{ id: 'rage', at: 0.5, adds: def?.adds, rage: true }];
  }

  updateBossPhases(b) {
    const phases = this.bossPhases();
    while (b.phase < phases.length && b.health < b.stats.maxHealth * phases[b.phase].at) {
      const ph = phases[b.phase++];
      b.phaseId = ph.id;
      if (ph.ai) b.controller.ai = { ...b.controller.ai, ...ph.ai };
      if (ph.damage) b.stats.meleeMult *= ph.damage;
      if (ph.speed) { b.stats.walkSpeed *= ph.speed; b.stats.depthSpeed *= ph.speed; }
      if (ph.adds?.length) this.spawnWave(ph.adds);
      this.world.events.emit('bossPhase', { boss: b, phase: ph, index: b.phase });
      if (ph.rage && !b.raged) { b.raged = true; this.world.events.emit('bossRage', { boss: b }); }
    }
  }

  // Has the boss here reached this phase (by id)?
  bossInPhase(id) {
    const b = this.boss;
    if (!b || !b.alive) return false;
    const i = this.bossPhases().findIndex((p) => p.id === id);
    return i >= 0 && b.phase > i;
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
        const box = { left: pr.x - pr.w / 2, right: pr.x + pr.w / 2, bottom: pr.y, top: pr.y + pr.h, z: pr.z };
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
    this.updateRolling();
  }

  // A terrain block with this `tag` stops being there (a portcullis raised by its
  // counterweight, a fall of rock dug out): the way on is open.
  openWay(tag) {
    for (const b of this.terrain?.blocks ?? []) {
      if (b.tag !== tag || b.gone) continue;
      b.solid = false;
      b.gone = true;
      this.world.events.emit('wayOpen', { block: b, tag });
    }
  }

  // A prop with `roll: { to, speed }` (the convoy's wagon) rolls away once its section's
  // fight is on, at speed px/s; reaching `to` it's gone up the road (escaped), and whoever
  // was in it with it (Story: rescue 'convoy').
  updateRolling() {
    for (const pr of this.props) {
      const R = pr.roll;
      if (!R || pr.broken || pr.escaped) continue;
      R.from ??= pr.x;
      if (pr.section !== this.index || !this.fightOn) continue;
      pr.x = Math.min(R.to, pr.x + R.speed / 60);
      if (pr.x >= R.to) {
        pr.escaped = true;
        this.world.events.emit('propEscaped', { prop: pr });
      }
    }
  }

  breakProp(pr, dir, blast = false) {
    pr.broken = true;
    pr.fly = null;
    this.world.events.emit('propBreak', { prop: pr, dir, blast });
    const lastOfTag = !pr.tag || !this.props.some((q) => q.tag === pr.tag && !q.broken);
    if (pr.opens && lastOfTag) this.openWay(pr.opens); // (two chains on one gate: both must go)
    if (pr.tag && lastOfTag) this.world.events.emit('propsDown', { tag: pr.tag });
    if (pr.challenge) this.ringBell(pr);
    if (pr.drop) {
      // a wall's shrine sits in the alcove behind it; everything else rolls out in front
      const z = pr.kind === 'wall' ? pr.z + 6 : Math.min(this.world.bounds.maxZ - 5, pr.z + 14);
      this.pickups.push({ kind: pr.drop, x: pr.x, z, y: pr.y ?? 0, age: 0, taken: false, secret: !!pr.secret });
    }
  }

  // BOSS LOOT: a boss always drops a trophy; an elite (a big man) sometimes does. Which
  // trophy it is gets decided when it's picked up (data/trophies.js pickTrophy), so the
  // stage — and an online game's two copies of it — only agree on where it lies.
  dropLoot(f) {
    if (f.lootDropped || f.team !== 'enemy') return;
    const boss = !!f.stats.boss;
    if (!boss && (f.stats.maxHealth < LOOT.eliteHealth || this.world.roll(f.id, 4100) >= LOOT.eliteChance)) return;
    f.lootDropped = true;
    const x = Math.max(this.world.bounds.minX + 20, Math.min(this.world.bounds.maxX - 20, f.x));
    const z = Math.max(this.world.bounds.minZ + 5, Math.min(this.world.bounds.maxZ - 5, f.z + 10));
    const y = this.terrain ? Math.max(0, this.terrain.groundAt(x, z)) : 0;
    const pk = { kind: 'trophy', from: boss ? 'boss' : 'elite', boss: f.stats.name, x, z, y, age: 0, taken: false };
    this.pickups.push(pk);
    this.world.events.emit('lootDrop', { pickup: pk, fighter: f });
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
      // (off the end of a ledge, or into its side: it breaks there)
      const offEdge = this.terrain && this.terrain.groundAt(pr.x + fl.dir * pr.w / 2, pr.z) !== (pr.y || 0) && this.terrain.groundAt(pr.x, pr.z) !== (pr.y || 0);
      fl.left -= step;
      const near = (f, rx, rz) => f.team === 'enemy' && f.alive && Math.abs(f.x - pr.x) <= rx && Math.abs(f.z - pr.z) <= rz;
      const struck = this.world.fighters.some((f) => near(f, pr.w / 2 + 16, KICKED.lane));
      if (!struck && !offEdge && fl.left > 0 && pr.x > PAD && pr.x < end) continue;
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
      const p = this.players.find((q) => q.alive && Math.abs(q.x - pk.x) <= 30 && Math.abs(q.z - pk.z) <= 24 && Math.abs(q.h - (pk.y ?? 0)) <= 40);
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
      else if (hz.type === 'beam') this.updateBeam(hz);
      else if (hz.type === 'stampede') this.updateStampede(hz);
      else if (hz.type === 'collapse') this.updateCollapse(hz);
      else if (hz.type === 'bombard') this.updateBombard(hz);
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
    if (!this.beamLive(hz)) { hz.t = hz.phase ?? 0; return; } // (a `when` not met yet: it stays cold)
    const t = hz.t % FIRE.period;
    if (t === FIRE.warn) this.world.events.emit('hazardWarn', { hazard: hz });
    if (t === FIRE.burst) this.world.events.emit('hazardFire', { hazard: hz });
    if (this.firePhase(hz) !== 'burst') return;
    for (const f of this.world.fighters) {
      if (Math.abs(f.x - hz.x) > hz.w / 2 || Math.abs(f.z - hz.z) > hz.d / 2 || f.h - (hz.y ?? 0) > 40) continue;
      this.hurt(hz, f, FIRE.damage, Math.sign(f.x - hz.x) || 1, 'fire');
    }
  }

  // Is a falling-beam (or fire-grate) hazard live right now? ('rage': only while its boss rages;
  // 'phase:<id>': only once he has reached that phase)
  beamLive(hz) {
    if ((hz.if || hz.unless) && this.story && !this.story.ok(hz)) return false; // (the rescued come back to help: only if they were saved)
    if (!hz.when) return true;
    if (hz.when.startsWith('freed:')) return !!this.story?.rescued.has(hz.when.slice(6));
    const b = this.boss;
    if (!b || !b.alive || hz.section !== this.index) return false;
    if (hz.when === 'rage') return !!b.raged;
    return hz.when.startsWith('phase:') && this.bossInPhase(hz.when.slice(6));
  }

  // phase of a beam: 'idle' | 'warn' (creaking, its shadow on the ground); it falls as the
  // warning ends. (warnT: 0..1 through the warning, for the view)
  beamPhase(hz) {
    const P = hz.period ?? BEAM.period; const W = hz.warn ?? BEAM.warn;
    const k = hz.t % P;
    return k >= P - W ? { phase: 'warn', warnT: (k - (P - W)) / W, since: Infinity } : { phase: 'idle', warnT: 0, since: k };
  }

  updateBeam(hz) {
    if (!this.beamLive(hz)) { hz.t = hz.phase ?? 0; hz.wasLive = false; return; }
    if (!hz.wasLive) { hz.wasLive = true; hz.t = hz.phase ?? 0; } // (starts its count when it goes live)
    const P = hz.period ?? BEAM.period;
    if (hz.t % P !== 0 || hz.t === 0) return;
    // it comes down
    const y = this.terrain ? Math.max(0, this.terrain.groundAt(hz.x, hz.z)) : 0;
    hz.y = y;
    this.world.events.emit('beamCrash', { hazard: hz });
    for (const f of this.world.fighters) {
      if (Math.abs(f.x - hz.x) > hz.w / 2 || Math.abs(f.z - hz.z) > hz.d / 2 || f.h - y > BEAM.lethalH) continue;
      this.hurt(hz, f, BEAM.damage, Math.sign(f.x - hz.x) || 1, 'beam');
    }
  }

  // A stampede lane (the village stables): `count` horses burst out at x0 and run the lane
  // to x1 (or back, dir -1), every `period` frames, `runs` times, then they're gone.
  // Whoever is in the lane when they pass is trampled: knocked flat and thrown along it.
  // Its state for the view: stampedeState(hz) -> { phase: 'idle'|'warn'|'run', warnT, heads }
  stampedeState(hz) {
    const P = hz.period ?? STAMPEDE.period;
    const W = hz.warn ?? STAMPEDE.warn;
    if (!hz.live || hz.lt < 0) return { phase: 'idle', warnT: 0, heads: [] };
    const k = hz.lt % P;
    if (hz.lt >= P * (hz.runs ?? Infinity)) return { phase: 'idle', warnT: 0, heads: [] };
    if (k < W) return { phase: 'warn', warnT: k / W, heads: [] };
    const dir = hz.dir ?? 1;
    const start = dir > 0 ? hz.x0 : hz.x1;
    const end = dir > 0 ? hz.x1 : hz.x0;
    const head = start + dir * (k - W) * STAMPEDE.speed;
    const heads = [];
    for (let i = 0; i < (hz.count ?? 3); i++) {
      const x = head - dir * i * STAMPEDE.gap;
      // (a little out of line, so they read as a herd, not a train)
      const z = hz.z + ((i * 37) % 3 - 1) * hz.d * 0.22;
      if ((x - start) * dir >= 0 && (end - x) * dir >= -STAMPEDE.gap) heads.push({ x, z, i });
    }
    return { phase: heads.length ? 'run' : 'idle', warnT: 0, heads, dir };
  }

  updateStampede(hz) {
    if (!hz.live) {
      if (!this.beamLive(hz)) return;
      hz.live = true;
      hz.lt = -(hz.phase ?? 0); // (the lanes go in turn)
    }
    hz.lt++;
    if (hz.lt < 0) return;
    const S = this.stampedeState(hz);
    if (S.phase === 'warn' && hz.lt % (hz.period ?? STAMPEDE.period) === 0) this.world.events.emit('stampedeWarn', { hazard: hz });
    if (S.phase !== 'run') return;
    for (const f of this.world.fighters) {
      if (f.h > 70) continue; // (jumped clear)
      const hit = S.heads.find((hd) => Math.abs(f.x - hd.x) <= STAMPEDE.reach && Math.abs(f.z - hd.z) <= hz.d / 2);
      if (!hit) continue;
      if (hz.cool.has(f.id)) continue;
      this.hurt(hz, f, STAMPEDE.damage, S.dir, 'trample');
    }
  }

  // The mine coming down behind you (Hollow Mountain): once its section starts, a front of
  // falling rock runs from x0 toward `to` at `speed` px/s. Anyone it catches is battered
  // and thrown on ahead of it; it stops at `to` (the way on is up to you from there).
  updateCollapse(hz) {
    if (hz.section !== this.index) { if (hz.section > this.index) hz.front = null; return; }
    if (hz.front == null) { hz.front = hz.x0; this.world.events.emit('collapseStart', { hazard: hz }); }
    if (this.story?.holding) return; // (not while a held scene plays)
    hz.front = Math.min(hz.to, hz.front + hz.speed / 60);
    for (const f of this.world.fighters) {
      if (!f.alive || f.x > hz.front + COLLAPSE.reach) continue;
      this.hurt(hz, f, hz.damage ?? COLLAPSE.damage, 1, 'beam');
      f.x = Math.max(f.x, hz.front + COLLAPSE.reach + 4);
    }
  }

  // How many stones a bombardment throws a volley right now: its `shots`, but never more
  // than the catapults (props tagged `silence`) still standing; none once they're all gone
  // or before its `when`.
  bombardShots(hz) {
    if (hz.section !== this.index || !this.beamLive(hz)) return 0;
    const n = hz.shots ?? BOMBARD.shots;
    if (!hz.silence) return n;
    const standing = this.props.filter((pr) => pr.tag === hz.silence && !pr.broken).length;
    return Math.min(n, standing);
  }

  // The catapults on the heights (the Shattered Ascent): every `period` frames a volley,
  // a stone aimed near each hero in turn (where it will land is known at once: the view
  // shows its shadow); after `warn` frames it lands and hurts whoever is under it, Ashen
  // men too. Not while a held scene plays. (World.roll: the same on every machine.)
  updateBombard(hz) {
    hz.shells ??= [];
    const B = BOMBARD;
    const held = this.story?.holding;
    const shots = this.bombardShots(hz);
    if (!shots) { hz.shells = hz.shells.filter((s) => s.land > hz.t); }
    const P = hz.period ?? B.period;
    if (shots && !held && hz.t % P === 0) {
      // (your own people's stones go for the Ashen, never for a boss: he's yours)
      const heroes = hz.friendly
        ? this.livingFoes().filter((e) => !e.entering && !e.stats.boss)
        : this.players.filter((p) => p.alive);
      const b = this.world.bounds;
      let fired = 0;
      for (let i = 0; i < shots && heroes.length; i++) {
        const p = heroes[i % heroes.length];
        const r = this.world.rngFor(hz.id, hz.t + i);
        const ahead = Math.sign(p.vx || p.facing || 1);
        let x = p.x + (r() * 2 - 1) * B.spread * 0.6 + ahead * (i % 2 ? B.spread : B.spread * 0.3);
        const z = Math.max(b.minZ + 10, Math.min(b.maxZ - 10, p.z + (r() * 2 - 1) * 50));
        x = Math.max(b.minX + 20, Math.min(b.maxX - 20, x));
        if (this.nearDrop(x, z)) continue;
        hz.shells.push({ x, z, from: hz.t, land: hz.t + (hz.warn ?? B.warn) });
        fired++;
      }
      if (fired) this.world.events.emit('shellLaunch', { hazard: hz, count: fired });
    }
    for (const s of hz.shells) {
      if (s.land !== hz.t) continue;
      const y = this.terrain ? Math.max(0, this.terrain.groundAt(s.x, s.z)) : 0;
      s.y = y;
      this.world.events.emit('shellLand', { hazard: hz, shell: s });
      for (const f of this.world.fighters) {
        if (hz.friendly && (f.team !== 'enemy' || f.stats.boss)) continue;
        if (Math.abs(f.x - s.x) > (hz.radius ?? B.radius) || Math.abs(f.z - s.z) > (hz.depth ?? B.depth) || Math.abs(f.h - y) > 70) continue;
        this.hurt(hz, f, hz.damage ?? B.damage, Math.sign(f.x - s.x) || 1, 'beam');
      }
    }
    hz.shells = hz.shells.filter((s) => s.land > hz.t);
  }

  // Is there a drop (a pit) within BOMBARD.pitClear of this spot along the lane?
  nearDrop(x, z) {
    const T = this.terrain;
    if (!T) return false;
    for (let d = -BOMBARD.pitClear; d <= BOMBARD.pitClear; d += 15) if (T.groundAt(x + d, z) < -1) return true;
    return false;
  }

  // The blade's angle (radians) and tip position. amp / rate: how much wider and faster
  // than its resting swing it is going (both 1 at rest; raised when a hero strikes it).
  bladeState(hz) {
    const max = Math.asin(Math.min(0.95, (hz.swing * (hz.amp ?? 1)) / BLADE.length));
    const a = max * Math.sin((hz.t / BLADE.period) * Math.PI * 2);
    const speed = Math.cos((hz.t / BLADE.period) * Math.PI * 2); // + = swinging right
    // (omega: radians per frame, for the view's chain)
    const omega = max * speed * ((Math.PI * 2) / BLADE.period) * (hz.rate ?? 1);
    return { a, tipX: hz.x + Math.sin(a) * BLADE.length, speed, omega };
  }

  updateBlade(hz) {
    const D = BLADE.driven;
    if (hz.driven && --hz.driven <= 0) hz.driven = 0;
    // It's heavy: while driven it holds the wide, fast swing a hero's blow gave it; after
    // that the extra bleeds away over a few swings (never a jump in where it is).
    const bleed = (v, rest) => rest + (v - rest) * BLADE.bleed;
    hz.amp = hz.driven ? D.wide : bleed(hz.amp ?? 1, 1);
    hz.rate = hz.driven ? 1 + D.haste : bleed(hz.rate ?? 1, 1);
    hz.t += hz.rate - 1; // (on top of the frame's own step)
    if (!hz.driven) this.strikeBlade(hz);
    const s = this.bladeState(hz);
    if (Math.abs(s.speed) < 0.55) return; // only the fast bottom of the swing cuts
    for (const f of this.world.fighters) {
      if (Math.abs(f.x - s.tipX) > (hz.driven ? 40 : 30) || Math.abs(f.z - hz.z) > (hz.driven ? 30 : 20) || Math.abs(f.h - (hz.y ?? 0)) > 70) continue;
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
      // The blow reverses it where it is, flying away from him, with the wide swing's
      // energy: the point of its new arc that is here and heading his way out.
      hz.driven = BLADE.driven.frames;
      hz.amp = BLADE.driven.wide;
      hz.rate = 1 + BLADE.driven.haste;
      const max = Math.asin(Math.min(0.95, (hz.swing * hz.amp) / BLADE.length));
      const phase = Math.asin(Math.max(-1, Math.min(1, s.a / max)));
      hz.t = ((f.facing > 0 ? phase : Math.PI - phase) / (Math.PI * 2)) * BLADE.period;
      hz.cool.clear();
      hz.cool.set(f.id, 30);
      this.world.events.emit('bladeStruck', { hazard: hz, by: f, dir: f.facing, force: !f.activeAttack });
      return;
    }
  }

  // A hazard hurting anyone (players and enemies alike).
  hurt(hz, f, dmg, dir, kind) {
    if (!f.alive || f.invincible || f.entering || f.state === 'executed' || f.state === 'execute' || hz.cool.has(f.id)) return;
    if (f.spare && f.health - dmg < 1) dmg = Math.max(0, f.health - 1); // (beaten to his knees, never killed: Sequence.js)
    if (kind === 'fire' && f.state === 'knockdown' && f.lyingSince === null) return; // already thrown clear
    hz.cool.set(f.id, kind === 'fire' ? FIRE.tick * 3 : 50);
    f.health = Math.max(f.spare ? 1 : 0, f.health - dmg);
    f.flash = 6;
    const lethal = f.health <= 0;
    // an enemy the fire kills doesn't get thrown clear: he burns where he stands, then
    // drops (the 'burning' state; effects/Burn.js chars the body)
    if (lethal && kind === 'fire' && f.team === 'enemy') f.fsm.change('burning', { dir });
    else {
      f.fsm.change('knockdown', kind === 'fire' || kind === 'beam'
        ? { vx: dir * 160, vh: 260 }
        : kind === 'trample' ? { vx: dir * 620, vh: 380 } : { vx: dir * 420, vh: 320 });
    }
    const e = {
      attacker: null, defender: f, dir, kind: 'hazard', hazard: kind,
      move: { cut: kind === 'fire' ? 'fire' : kind === 'crate' || kind === 'beam' || kind === 'trample' ? 'blunt' : 'slash', damage: dmg, hitstop: 6 },
      x: f.x, z: f.z, h: f.h + f.stats.body.h * 0.5, damage: dmg, fatality: 'none',
    };
    this.world.events.emit('hazardHit', { hazard: hz, fighter: f, kind });
    this.world.events.emit('hit', e);
    if (lethal) { f.fatality = 'none'; this.world.events.emit('kill', e); }
  }
}
