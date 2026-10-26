// logic-test.js — Automated checks for the combat rules, run WITHOUT a browser.
// Optional for you: if Node.js is installed, run `node tests/logic-test.js`.
// Each test builds a tiny World, scripts button presses, and checks the outcome.

import { readFileSync } from 'node:fs';
import { World } from '../src/core/World.js';
import { SETTINGS } from '../src/config/settings.js';
import { Controller } from '../src/core/Controller.js';
import { Fighter } from '../src/entities/Fighter.js';
import { createEnemy, ENTER, inView } from '../src/entities/Enemy.js';
import { CHARACTERS } from '../src/data/characters.js';
import { ENEMIES, WAVES } from '../src/data/enemies.js';
import { chooseFatality, chooseMaim, FATALITIES } from '../src/combat/Fatality.js';
import { Stage } from '../src/stage/Stage.js';
import { SENTENCE, Sentence, HEADS, BODIES, sentenceLines, ASK, SILENCE, NOTHING } from '../src/stage/Sentence.js';
import { STAGE, PROPS } from '../src/data/stage.js';
import { Terrain, STEP, PIT_LOST } from '../src/stage/Terrain.js';
import { STAGE_GALLOWS } from '../src/data/stageGallows.js';
import { STAGE_VILLAGE } from '../src/data/stageVillage.js';
import { STAGE_WOOD } from '../src/data/stageWood.js';
import { STAGE_MINE } from '../src/data/stageMine.js';
import { STAGE_ASCENT } from '../src/data/stageAscent.js';
import { STAGE_GATES } from '../src/data/stageGates.js';
import { STAGE_KEEP } from '../src/data/stageKeep.js';
import { STAGES } from '../src/data/stages.js';
import { LINE, NPC, GUIDE } from '../src/stage/Story.js';
import { SPEAKERS, NARRATION, PORTRAIT_IDS, speakerInfo } from '../src/data/speakers.js';
import { Progress, PROGRESS } from '../src/progression/Progress.js';
import { SKILL_TREES } from '../src/data/skills.js';
import { BladeChain, CHAIN_PHYS } from '../src/view/BladeChain.js';
import { DYES } from '../src/view/dye.js';
import { handshake } from '../src/net/Link.js';
import { impalePin } from '../src/combat/Finisher.js';
import { planChainLightning, forceTargets, MAGE_FINISHERS } from '../src/combat/Mage.js';
import { STORM } from '../src/combat/Storm.js';
import { ROGUE_FINISHERS } from '../src/combat/Rogue.js';
import { TickController, pressed, held, bitOf } from '../src/core/TickInput.js';
import { NetSession, NET, loopPair, snapshot, correct, feedPlayers, delayFor } from '../src/net/Session.js';
import { runTickJobs } from '../src/core/TickJobs.js';
import { JUGGLE } from '../src/combat/Juggle.js';
import { STYLE, styleMult } from '../src/combat/Style.js';
import { TROPHIES, TROPHY_SLOTS, pickTrophy, bossTrophy } from '../src/data/trophies.js';
import { TEST, applyTestMode, levelOrder, levelAfter } from '../src/config/testMode.js';

// A controller driven by a script: { frameNumber: ['attack'] } presses,
// plus `hold` for held buttons.
class Scripted extends Controller {
  constructor(script = {}, hold = {}) {
    super();
    this.script = script;
    this.hold = hold;
    this.t = 0;
  }
  sample(frozen) {
    if (frozen) return;
    this.t++;
    for (const a of this.script[this.t] ?? []) this.registerPress(a);
    this.held = typeof this.hold === 'function' ? this.hold(this.t) : this.hold;
    this.moveX = this.held.right ? 1 : this.held.left ? -1 : 0;
    this.moveZ = this.held.down ? 1 : this.held.up ? -1 : 0;
  }
}

function setup({ player = 'warrior', script = {}, hold = {}, dummyScript = {}, dummyHold = {}, gap = 60 } = {}) {
  const world = new World();
  const p = world.addFighter(new Fighter({ stats: CHARACTERS[player], team: 'player', x: 400, z: 420, controller: new Scripted(script, hold) }));
  const d = world.addFighter(new Fighter({ stats: ENEMIES.grunt, team: 'enemy', x: 400 + gap, z: 420, controller: new Scripted(dummyScript, dummyHold) }));
  d.facing = -1;
  const log = [];
  for (const e of ['hit', 'kill', 'block', 'parry', 'guardBreak']) world.events.on(e, (ev) => log.push(e));
  return { world, p, d, log, run: (n) => { for (let i = 0; i < n; i++) world.tick(); } };
}

let failed = 0;
function test(name, fn) {
  try { fn(); console.log(`  ok   ${name}`); }
  catch (e) { failed++; console.log(`  FAIL ${name}\n       ${e.message}`); }
}
function assert(cond, msg) { if (!cond) throw new Error(msg); }

console.log('Blood Axe — combat logic tests');

// Random critical hits would make damage comparisons flaky: off unless a test turns them on.
const CRIT_CHANCE = SETTINGS.feel.critChance;
SETTINGS.feel.critChance = 0;

// Story lines wait for a press in the game (stage/Story.js LINE.wait). The bots that walk
// whole levels don't read: here the lines time out by their length, as a player pressing
// on at reading pace would move them. The tests of the wait turn it back on.
LINE.wait = false;
const waiting = (fn) => () => { LINE.wait = true; try { fn(); } finally { LINE.wait = false; } };

// (async tests: run after the rest, results printed at the end)
const later = [];
function testAsync(name, fn) { later.push([name, fn]); }

test('light attack hits and causes hitstun', () => {
  const t = setup({ script: { 1: ['attack'] } });
  t.run(12);
  assert(t.log.includes('hit'), 'expected a hit');
  assert(t.d.health < t.d.stats.maxHealth, 'dummy should lose health');
  assert(t.d.state === 'hitstun' || t.d.hitstop > 0, `dummy state ${t.d.state}`);
});

test('critical hits: every hero can land one (more damage, flagged on the hit); enemies never do', () => {
  assert(CRIT_CHANCE > 0 && SETTINGS.feel.critMultiplier > 1, 'crits are on in the game');
  const hitOnce = (player, chance) => {
    SETTINGS.feel.critChance = chance;
    const t = setup({ player, script: { 1: ['attack'] } });
    t.d.health = 1e4; t.d.stats = { ...t.d.stats, maxHealth: 1e4 };
    const hits = [];
    t.world.events.on('hit', (h) => hits.push(h));
    t.run(40);
    SETTINGS.feel.critChance = 0;
    return { dmg: 1e4 - t.d.health, crit: hits.some((h) => h.crit) };
  };
  for (const hero of Object.keys(CHARACTERS)) {
    const plain = hitOnce(hero, 0); const crit = hitOnce(hero, 1);
    assert(plain.dmg > 0 && !plain.crit, `${hero}: plain hit lands (${plain.dmg})`);
    assert(crit.crit && Math.abs(crit.dmg - plain.dmg * SETTINGS.feel.critMultiplier) < 0.01,
      `${hero}: critical hit (${plain.dmg.toFixed(1)} -> ${crit.dmg.toFixed(1)})`);
  }
  // an enemy swinging at a hero never crits
  SETTINGS.feel.critChance = 1;
  const t = setup({ dummyScript: { 1: ['attack'] }, gap: 50 });
  const hits = [];
  t.world.events.on('hit', (h) => hits.push(h));
  t.run(60);
  SETTINGS.feel.critChance = 0;
  assert(hits.some((h) => h.defender === t.p) && !hits.some((h) => h.crit), 'enemy hits are never critical');
});

test('test mode: off by default; on, a hero is never killed and never runs dry; levels in campaign order', () => {
  assert(TEST.on === false, 'off unless asked for');
  // an enemy hammering a hero on 1 health: he lives, and is topped up every tick
  TEST.on = true;
  const t = setup({ player: 'mage', dummyScript: { 1: ['attack'], 30: ['heavy'], 70: ['attack'] }, gap: 50 });
  let lowest = Infinity;
  for (let i = 0; i < 120; i++) {
    applyTestMode([t.p]);
    t.p.health = 1; // (the worst case: any blow would be the last)
    t.p.mana = 0;
    t.world.tick();
    lowest = Math.min(lowest, t.p.health);
  }
  assert(t.log.includes('hit'), 'the enemy landed blows');
  assert(t.p.alive && lowest >= 1, `never killed (lowest ${lowest})`);
  applyTestMode([t.p]);
  assert(t.p.health === t.p.stats.maxHealth && t.p.mana === t.p.stats.maxMana, 'topped up');
  TEST.on = false;
  applyTestMode([t.p]);
  assert(!t.p.immortal, 'off again: mortal');
  const order = levelOrder();
  assert(order.slice(0, 5).join() === 'village,gallowsWood,hollowMountain,shatteredAscent,ironGates', order.join());
  assert(order.length === Object.keys(STAGES).length, 'every stage once');
  assert(levelAfter('village', 1) === 'gallowsWood' && levelAfter('village', -1) === order.at(-1), 'steps and wraps');
});

test('3-hit combo chains and the finisher knocks down', () => {
  const t = setup({ script: { 1: ['attack'], 12: ['attack'], 25: ['attack'] } });
  const states = new Set();
  for (let i = 0; i < 80; i++) { t.world.tick(); states.add(t.p.state); }
  assert(states.has('light2') && states.has('light3'), `states seen: ${[...states]}`);
  assert(t.log.filter((e) => e === 'hit').length === 3, `hits: ${t.log}`);
  assert(['knockdown', 'getup', 'dead'].includes(t.d.state), `dummy ${t.d.state}`);
});

test('tick jobs: a job started by another job runs to its end (Storm Judgment bolts clear)', () => {
  const owner = { tickJobs: [] };
  const every = (n, fn) => { const j = (t) => fn(t); j.t = 0; j.n = n; owner.tickJobs.push(j); };
  let live = 0;
  // like MageFX.bolt: on screen when made, gone once its job reaches its last tick
  const bolt = () => { live++; let on = true; every(4, (t) => { if (on && t >= 3) { on = false; live--; } return true; }); };
  every(30, (t) => { if (t % 3 === 0) bolt(); return true; }); // like the storm's gather
  for (let i = 0; i < 60; i++) runTickJobs(owner);
  assert(live === 0, `${live} bolt(s) left on screen`);
  assert(owner.tickJobs.length === 0, 'every job finished');
});

test('input buffer: attack pressed during dodge recovery comes out right after', () => {
  const t = setup({ gap: 300 });
  t.p.controller.registerPress('dodge');
  const d = t.p.stats.dodge;
  const end = d.duration + d.recovery;
  t.run(end - 4);                         // still rolling: attack can't start yet
  t.p.controller.registerPress('attack'); // pressed ~4 frames early
  t.run(6);
  assert(t.p.state === 'light1', `expected light1, got ${t.p.state}`);
});

test('sprint: a click while moving speeds every hero up, carries into a jump, and ends when he stops', () => {
  for (const who of ['warrior', 'mage', 'rogue']) {
    const walk = setup({ player: who, hold: { right: true }, gap: 3000 });
    const x0 = walk.p.x;
    walk.run(60);
    const run = setup({ player: who, hold: (n) => ({ right: n < 80 }), script: { 3: ['sprint'], 50: ['jump'] }, gap: 3000 });
    run.run(45);
    assert(run.p.sprinting && run.p.state === 'walk', `${who}: sprinting (${run.p.state})`);
    const k = CHARACTERS[who].sprint.speed;
    assert(Math.abs(run.p.vx - CHARACTERS[who].walkSpeed * k) < 1, `${who}: at sprint speed (${run.p.vx})`);
    run.run(8);
    assert(run.p.state === 'jump' && run.p.vx > CHARACTERS[who].walkSpeed * 1.2, `${who}: the jump keeps the speed (${run.p.state} ${run.p.vx})`);
    run.run(120);
    assert(!run.p.sprinting && run.p.state === 'idle', `${who}: stopped, sprint over (${run.p.state})`);
    assert(walk.p.x - x0 > 0, 'walked');
  }
});

test('roll cancels any action: swings, the kick, wind-up, mid-swing and recovery', () => {
  for (const [move, at] of [['attack', 3], ['attack', 14], ['heavy', 6], ['heavy', 30], ['kick', 5]]) {
    const t = setup({ script: { 1: [move] }, gap: 300 });
    t.run(at);
    assert(t.p.state !== 'idle' && t.p.state !== 'dodge', `${move}@${at}: should be swinging, is ${t.p.state}`);
    t.p.controller.registerPress('dodge');
    t.run(1);
    assert(t.p.state === 'dodge', `${move}@${at}: expected dodge, got ${t.p.state}`);
    assert(!t.p.activeAttack, `${move}@${at}: the cut swing leaves no live hitbox`);
  }
});

test('block press cancels any action at once (a parry first, a held guard after)', () => {
  for (const player of Object.keys(CHARACTERS)) {
    for (const [move, at] of [['attack', 3], ['attack', 12], ['heavy', 8], ['kick', 4], ['magic', 3]]) {
      const t = setup({ player, script: { 1: [move] }, gap: 300 });
      t.run(at);
      if (['idle', 'walk'].includes(t.p.state) || !t.p.grounded) continue; // (no such move for this hero)
      const from = t.p.state;
      t.p.controller.registerPress('block');
      t.p.controller.hold = { block: true };
      t.run(1);
      assert(t.p.state === 'parry', `${player} ${from}@${at}: expected parry, got ${t.p.state}`);
      t.run(15);
      assert(t.p.state === 'block', `${player} ${from}: held on into a block, got ${t.p.state}`);
    }
  }
  // only a fresh press cuts it: a guard held with no new press leaves the swing be
  const h = setup({ script: { 1: ['attack'] }, hold: (t) => (t >= 3 ? { block: true } : {}), gap: 300 });
  h.run(6);
  assert(h.p.state === 'light1', `held block alone leaves the swing be, got ${h.p.state}`);
});

test('jumps and air moves are not cancelled by a roll or block press', () => {
  const t = setup({ script: { 1: ['jump'] }, hold: { jump: true }, gap: 300 });
  t.run(6);
  assert(t.p.state === 'jump', `jumping, got ${t.p.state}`);
  t.p.controller.registerPress('block');
  t.run(1);
  assert(t.p.state === 'jump', `still in the jump, got ${t.p.state}`);
});

test('roll cancel costs stamina like any roll, and needs some', () => {
  const t = setup({ script: { 1: ['attack'] }, gap: 300 });
  t.run(4);
  t.p.stamina = 0;
  t.p.controller.registerPress('dodge');
  t.run(1);
  assert(t.p.state !== 'dodge', `no stamina, no roll (got ${t.p.state})`);
});

test('combo chain: heavy pressed during light1 chains into heavy', () => {
  const t = setup({ script: { 1: ['attack'] }, gap: 300 });
  t.run(14);
  t.p.controller.registerPress('heavy');
  t.run(2);
  assert(t.p.state === 'heavy', `expected heavy, got ${t.p.state}`);
});

test('input buffer: jump pressed just before landing jumps again', () => {
  const t = setup({ script: { 1: ['jump'] }, hold: { jump: true }, gap: 400 }); // (held: a full jump)
  let landedFrame = null;
  let pressed = false;
  for (let i = 0; i < 120; i++) {
    t.world.tick();
    if (!pressed && t.p.vh < 0 && t.p.h < 25) { t.p.controller.registerPress('jump'); pressed = true; }
    if (pressed && t.p.state === 'jump' && t.p.vh > 0 && t.p.h < 20 && i > 10) { landedFrame = i; break; }
  }
  assert(landedFrame !== null, 'expected an immediate re-jump from the buffered press');
});

test('block reduces damage and drains stamina', () => {
  const t = setup({ script: { 1: ['attack'] }, dummyHold: { block: true } });
  t.run(3);
  assert(t.d.state === 'block', `dummy should be blocking, is ${t.d.state}`);
  t.run(15);
  assert(t.log.includes('block'), `log ${t.log}`);
  assert(t.d.stamina < t.d.stats.maxStamina, 'stamina should drain');
  assert(t.d.health > t.d.stats.maxHealth - 3, 'chip damage should be small');
});

test('heavy attack breaks guard', () => {
  const t = setup({ script: { 1: ['heavy'] }, dummyHold: { block: true } });
  t.run(30);
  assert(t.log.includes('guardBreak'), `log ${t.log}`);
});

test('parry staggers the attacker', () => {
  // Grunt attacks the player; player taps block right before the hit.
  const t = setup({ dummyScript: { 1: ['attack'] } });
  t.p.facing = 1;
  // grunt light1 startup = 21 -> active at frame 22. Tap block at frame 19.
  t.p.controller.script = { 19: ['block'] };
  t.run(31);
  assert(t.log.includes('parry'), `log ${t.log}`);
  assert(t.d.state === 'stagger', `grunt should be staggered, is ${t.d.state}`);
});

test('riposte: the first hit after a parry is a sure, heavier critical; later hits are plain', () => {
  const t = setup({ dummyScript: { 1: ['attack'] } });
  t.d.stats = { ...t.d.stats, maxHealth: 1e4 }; t.d.health = 1e4;
  t.p.facing = 1;
  t.p.controller.script = { 19: ['block'], 35: ['attack'], 71: ['attack'] };
  const hits = [];
  t.world.events.on('hit', (e) => { if (e.attacker === t.p) hits.push(e); });
  t.run(111);
  assert(t.log.includes('parry'), 'parried');
  assert(hits.length >= 2, `two answers land (${hits.length})`);
  assert(hits[0].riposte && hits[0].crit, 'the first is a riposte');
  assert(!hits[1].riposte, 'only the first');
  assert(hits[0].damage > hits[1].damage * 2, `and it hurts (${hits[0].damage.toFixed(1)} vs ${hits[1].damage.toFixed(1)})`);
});

test('dodge i-frames avoid a hit', () => {
  const t = setup({ dummyScript: { 1: ['attack'] }, gap: 50 });
  t.p.controller.script = { 19: ['dodge'] };
  t.run(31);
  assert(!t.log.includes('hit'), `should dodge, log ${t.log}`);
  const control = setup({ dummyScript: { 1: ['attack'] }, gap: 50 }); // same, no dodge
  control.run(31);
  assert(control.log.includes('hit'), 'control case should be hit');
});

test('rogue can double jump', () => {
  const t = setup({ player: 'rogue', script: { 1: ['jump'], 15: ['jump'] }, gap: 400 });
  let maxH = 0;
  for (let i = 0; i < 100; i++) { t.world.tick(); maxH = Math.max(maxH, t.p.h); }
  const w = setup({ player: 'rogue', script: { 1: ['jump'] }, gap: 400 });
  let maxSingle = 0;
  for (let i = 0; i < 100; i++) { w.world.tick(); maxSingle = Math.max(maxSingle, w.p.h); }
  assert(maxH > maxSingle * 1.3, `double ${maxH.toFixed(0)} vs single ${maxSingle.toFixed(0)}`);
});

test('kill emits event and enemy is removed after dying', () => {
  const t = setup({ script: { 1: ['heavy'] } });
  t.d.health = 5;
  let removed = false;
  t.world.events.on('fighterRemoved', () => { removed = true; });
  t.run(400);
  assert(t.log.includes('kill'), `log ${t.log}`);
  assert(removed, 'corpse should be removed');
});

test('AI grunt approaches and hurts an idle player', () => {
  const world = new World();
  const p = world.addFighter(new Fighter({ stats: CHARACTERS.warrior, team: 'player', x: 300, z: 400, controller: new Scripted() }));
  createEnemy(world, 'grunt', 700, 480);
  for (let i = 0; i < 60 * 12; i++) world.tick();
  assert(p.health < p.stats.maxHealth, 'player should have taken damage');
});

test('all characters have the required data', () => {
  const need = ['maxHealth', 'maxStamina', 'maxMana', 'walkSpeed', 'jumpStrength', 'meleeMult', 'magicMult', 'dodge', 'parryWindow', 'body', 'look'];
  for (const c of [...Object.values(CHARACTERS), ...Object.values(ENEMIES)]) {
    for (const k of need) assert(c[k] !== undefined, `${c.id} missing ${k}`);
    for (const [key, m] of Object.entries(c.moves)) {
      for (const k of ['startup', 'active', 'recovery', 'damage', 'hitbox']) assert(m[k] !== undefined, `${c.id}.${key} missing ${k}`);
      for (const ch of m.chains ?? []) assert(c.moves[ch.next], `${c.id}.${key} chains to missing ${ch.next}`);
    }
  }
});

test('every enemy has art, anims, specials that exist, and is in a wave', () => {
  const anims = ['slash', 'backslash', 'chop', 'stab', 'stabB', 'thrust', 'uppercut', 'swingChain', 'slamChain', 'spin', 'hook', 'bash', 'charge'];
  // (a wave, the stage's waves, or the stage boss and his adds)
  const boss = (b) => (b ? [b.type, ...(b.adds ?? []), ...(b.escort ?? []), ...(b.phases ?? []).flatMap((ph) => ph.adds ?? [])] : []);
  const inWaves = new Set([...WAVES.flat(), ...[STAGE, STAGE_WOOD, STAGE_MINE, STAGE_ASCENT, STAGE_GATES, STAGE_KEEP].flatMap((S) => S.sections.flatMap((s) => [...(s.waves ?? []).flat(), ...boss(s.boss)]))]);
  for (const e of Object.values(ENEMIES)) {
    assert(e.art || e.view, `${e.id} has no art`);
    assert(inWaves.has(e.id)||STAGE_VILLAGE.millRescue.type===e.id, `${e.id} never appears in a wave or encounter`);
    // (one with its own view, the hound, has its own poses)
    for (const [k, m] of Object.entries(e.moves)) assert(e.view || anims.includes(m.anim), `${e.id}.${k} anim ${m.anim}`);
    for (const sp of e.ai.specials ?? []) {
      const move = sp.press === 'heavy' ? e.moves.heavy : e.moves[sp.press];
      assert(move, `${e.id} special presses ${sp.press} but has no such move`);
    }
  }
});

test("Gorrak and Sliv are tuned to Nick's numbers; the hangman who shares Gorrak's moves is not", () => {
  const world = new World();
  const g = createEnemy(world, 'butcher', 600, 420), b = ENEMIES.butcher;
  const sz = g.stats.size / 1.29; // (his rolled variety, before the tune)
  assert(sz >= 0.94 && sz <= 1.06, `Gorrak drawn ${g.stats.size.toFixed(2)}x`);
  assert(g.stats.body.h === Math.round(b.body.h * 1.29) && g.stats.body.w === Math.round(b.body.w * 1.29), 'Gorrak body grows 29%');
  assert(Math.abs(g.stats.moves.heavy.hitbox.w - b.moves.heavy.hitbox.w * 1.29) < 1e-6, 'his swings reach 29% further');
  assert(Math.abs(g.stats.meleeMult - b.meleeMult * 1.2) < 1e-6, 'Gorrak hits 20% harder');
  assert(Math.abs(g.controller.ai.attackRange - b.ai.attackRange * 1.29) < 1e-6, 'he fights from his longer reach');
  const pace = g.stats.walkSpeed / (b.walkSpeed * 0.9);
  assert(pace >= 0.88 && pace <= 1.14, 'Gorrak walks 10% slower');
  const s = createEnemy(world, 'stalker', 640, 420), k = ENEMIES.stalker;
  assert(s.stats.body.h === Math.round(k.body.h * 1.1), 'Sliv body grows 10%');
  const sp = s.stats.walkSpeed / (k.walkSpeed * 1.05);
  assert(sp >= 0.88 && sp <= 1.14 && s.stats.meleeMult === k.meleeMult, 'Sliv 5% quicker, same hits');
  const h = createEnemy(world, 'executioner', 680, 420);
  assert(h.stats.body.h === b.body.h && h.stats.meleeMult === b.meleeMult, 'the hangman keeps his own size and hits');
});

test('each bad guy fights and lands hits (specials included)', () => {
  for (const id of ['hound', 'butcher', 'stalker', 'penitent', 'berserker', 'ghoul', 'gladiator']) {
    const world = new World();
    const p = world.addFighter(new Fighter({ stats: CHARACTERS.warrior, team: 'player', x: 300, z: 420, controller: new Scripted() }));
    createEnemy(world, id, 600, 420);
    for (let i = 0; i < 60 * 15; i++) { p.health = p.stats.maxHealth; world.tick(); }
    let hurt = false;
    world.events.on('hit', (e) => { if (e.defender === p) hurt = true; });
    for (let i = 0; i < 60 * 15 && !hurt; i++) { p.health = p.stats.maxHealth; world.tick(); }
    assert(hurt, `${id} never hit the player`);
  }
});

test('meat hook pulls the player in', () => {
  const world = new World();
  const p = world.addFighter(new Fighter({ stats: CHARACTERS.warrior, team: 'player', x: 300, z: 420, controller: new Scripted() }));
  const b = world.addFighter(new Fighter({ stats: ENEMIES.butcher, team: 'enemy', x: 460, z: 420, controller: new Scripted({ 1: ['special1'] }) }));
  b.facing = -1;
  const x0 = p.x;
  for (let i = 0; i < 70; i++) world.tick(); // long, telegraphed whirl before the throw
  assert(p.x > x0 + 40, `player should be dragged toward the butcher (moved ${(p.x - x0).toFixed(0)})`);
});

test('super armor: the Penitent keeps swinging through a hit', () => {
  const world = new World();
  const p = world.addFighter(new Fighter({ stats: CHARACTERS.warrior, team: 'player', x: 400, z: 420, controller: new Scripted({ 12: ['attack'] }) }));
  const e = world.addFighter(new Fighter({ stats: ENEMIES.penitent, team: 'enemy', x: 460, z: 420, controller: new Scripted({ 1: ['heavy'] }) }));
  e.facing = -1;
  let hitPenitent = false;
  world.events.on('hit', (ev) => { if (ev.defender === e) hitPenitent = true; });
  for (let i = 0; i < 24; i++) world.tick();
  assert(hitPenitent, 'player should have hit the penitent');
  assert(e.state === 'heavy', `penitent should still be in heavy, is ${e.state}`);
});

test('a lost arm disables moves that need it', () => {
  const world = new World();
  const g = world.addFighter(new Fighter({ stats: ENEMIES.gladiator, team: 'enemy', x: 400, z: 420, controller: new Scripted({ 1: ['special1'] }) }));
  g.maimed = { armB: true };
  world.tick(); world.tick();
  assert(g.state !== 'special1', 'shield rush needs the shield arm');
});

test('fatalities: valid results, heavy blades split, blunt pops heads, fire explodes', () => {
  const count = (args) => {
    const c = {};
    for (let i = 0; i < 2000; i++) { const r = chooseFatality(args); c[r] = (c[r] ?? 0) + 1; }
    return c;
  };
  const chop = count({ cut: 'chop', damage: 39 });
  for (const k of Object.keys(chop)) assert(FATALITIES.includes(k), `unknown fatality ${k}`);
  assert((chop.halfV ?? 0) > 400, `heavy chop should often split down the middle: ${JSON.stringify(chop)}`);
  assert((count({ cut: 'cleave', damage: 30 }).halfH ?? 0) > 600, 'big cleave should often cut at the waist');
  assert((count({ cut: 'blunt', damage: 25 }).headPop ?? 0) > 600, 'big blunt hits should crush skulls');
  assert((count({ cut: 'fire', damage: 35 }).explode ?? 0) > 1000, 'fireball kills should blow people up');
  assert((count({ cut: 'slash', damage: 12, rel: 0.9 }).decap ?? 0) > 700, 'high slashes should take heads');
});

test('maim: only blades, only on big hits, never the same arm twice', () => {
  assert(chooseMaim({ cut: 'blunt', damage: 99, maxHealth: 100 }, () => 0) === null, 'blunt never cuts');
  assert(chooseMaim({ cut: 'slash', damage: 5, maxHealth: 100 }, () => 0) === null, 'small hits never cut');
  assert(chooseMaim({ cut: 'chop', damage: 30, maxHealth: 100, maimed: { armB: true } }, () => 0) === 'armF', 'other arm');
  assert(chooseMaim({ cut: 'chop', damage: 30, maxHealth: 100, maimed: { armB: true, armF: true } }, () => 0) === null, 'no arms left');
});

test('Sparta kick smashes through a shield block and bowls the enemy behind', () => {
  const world = new World();
  const p = world.addFighter(new Fighter({ stats: CHARACTERS.warrior, team: 'player', x: 400, z: 420, controller: new Scripted({ 1: ['kick'] }) }));
  const g = world.addFighter(new Fighter({ stats: ENEMIES.gladiator, team: 'enemy', x: 460, z: 420, controller: new Scripted({}, { block: true }) }));
  const back = world.addFighter(new Fighter({ stats: ENEMIES.grunt, team: 'enemy', x: 505, z: 420, controller: new Scripted() }));
  g.facing = -1; back.facing = -1;
  const log = [];
  for (const e of ['guardBreak', 'bowl', 'block']) world.events.on(e, () => log.push(e));
  for (let i = 0; i < 40; i++) world.tick();
  assert(log.includes('guardBreak') && !log.includes('block'), `log ${log}`);
  assert(g.state === 'knockdown', `gladiator should be launched, is ${g.state}`);
  assert(back.state === 'knockdown' || log.includes('bowl'), `grunt behind should go down, is ${back.state}`);
  assert(p.health === p.stats.maxHealth, 'player untouched');
});

test('rolls go 1.5x further and up/down rolls pick their own animation', () => {
  const t = setup({ gap: 400 });
  t.p.controller.moveZ = -1;
  t.p.controller.sample = function () { this.moveX = 0; this.moveZ = -1; };
  t.p.controller.registerPress('dodge');
  t.run(2);
  assert(t.p.state === 'dodge' && t.p.dodgeDir === 'up', `state ${t.p.state} dir ${t.p.dodgeDir}`);
  assert(CHARACTERS.warrior.dodge.speed === 785, 'warrior roll speed');
});

test('blocking player can swing the guard round to the other side', () => {
  const t = setup({ gap: 400, hold: { block: true } });
  t.p.controller.registerPress('block');
  t.run(12);
  assert(t.p.state === 'block', `should be blocking, is ${t.p.state}`);
  const before = t.p.facing;
  t.p.controller.hold = { block: true, left: before > 0, right: before < 0 };
  t.run(2);
  assert(t.p.facing === -before, 'guard should turn');
  assert(t.p.state === 'block', `still blocking after the turn, is ${t.p.state}`);
});

// A runner who's lost the will to fight, facing away from the player (finishers).
function runner(t, x, z = 420) {
  const r = x === undefined ? t.d : t.world.addFighter(new Fighter({ stats: ENEMIES.grunt, team: 'enemy', x, z, controller: new Scripted() }));
  r.controller.scared = true;
  r.maimed = { armB: true };
  r.facing = 1; // running away, to the right
  return r;
}
const killLog = (t) => { const k = []; t.world.events.on('kill', (e) => k.push(e)); return k; };

test('finisher: tap attack behind a runner = throat, he dies', () => {
  const t = setup({ script: { 1: ['attack'] }, gap: 70 });
  const r = runner(t);
  const kills = killLog(t);
  t.run(3);
  assert(t.p.state === 'execute' && r.state === 'executed', `states ${t.p.state} / ${r.state}`);
  t.run(120);
  assert(kills.length === 1 && kills[0].finisher === 'throat', `kills ${kills.map((k) => k.finisher)}`);
  assert(!r.alive, 'runner should be dead');
  assert(t.p.state === 'idle', `player back to idle, is ${t.p.state}`);
});

test('finisher: hold attack = impale, lifted on the blade, then booted off', () => {
  const t = setup({ script: { 1: ['attack'] }, hold: { attack: true }, gap: 70 });
  const r = runner(t);
  const kills = killLog(t);
  let maxH = 0;
  let kickedVx = 0;
  let stabAt = null;
  let offBlade = 0; // worst distance between his body and the blade's pin while held
  let prevH = 0;
  let maxStep = 0;  // biggest single-frame jump upward (no teleporting)
  r.vx = 200;       // he's running when he's caught
  const x0 = r.x;
  let ranOn = 0;
  for (let i = 0; i < 180; i++) {
    t.run(1);
    if (r.health > 0 && r.state === 'executed') ranOn = r.x - x0;
    if (r.health <= 0 && stabAt === null) stabAt = i;
    if (r.health <= 0 && r.state === 'executed' && t.p.exec && !t.p.exec.fired.has('kick')) {
      offBlade = Math.max(offBlade, Math.abs(r.x - (t.p.x + impalePin(t.p.fsm.frame).x)));
      maxStep = Math.max(maxStep, r.h - prevH);
    }
    prevH = r.h;
    maxH = Math.max(maxH, r.h);
    if (r.state === 'knockdown') kickedVx = Math.max(kickedVx, r.vx);
  }
  assert(kills[0]?.finisher === 'impale', `finisher ${kills[0]?.finisher}`);
  assert(ranOn > 10, `he keeps running into the catch (moved ${ranOn.toFixed(0)})`);
  assert(stabAt !== null && stabAt >= 18, `stab after the wind-up, at ${stabAt}`);
  assert(offBlade < 0.5, `locked to the blade (off by ${offBlade.toFixed(1)})`);
  assert(maxH > 60, `hoisted clear of the ground, ${maxH.toFixed(0)}`);
  // (the heave is quick now, with the painted pose, but still over a dozen frames)
  assert(maxStep < 10, `heaved up, not teleported: biggest step ${maxStep.toFixed(1)}`);
  assert(kickedVx > 200, `kicked off the blade, vx ${kickedVx}`);
  assert(!r.alive, 'dead');
});

test('finisher: heavy = cut in half at the waist, then the top half gets kicked', () => {
  const t = setup({ script: { 1: ['heavy'] }, gap: 70 });
  const r = runner(t);
  const kills = killLog(t);
  t.run(30);
  assert(r.execCut === 'waistPerch' && r.state === 'executed' && kills.length === 0, `cut ${r.execCut} state ${r.state} kills ${kills.length}`);
  t.run(120);
  assert(kills[0]?.finisher === 'halve', `finisher ${kills[0]?.finisher}`);
  assert(r.state === 'dead', `state ${r.state}`);
});

test('finisher: only on scared runners, and only from behind', () => {
  const a = setup({ script: { 1: ['attack'] }, gap: 70 });
  a.d.facing = 1; // facing away, but not scared: a normal slash
  a.run(3);
  assert(a.p.state === 'light1', `not scared -> slash, got ${a.p.state}`);
  const b = setup({ script: { 1: ['attack'] }, gap: 70 });
  runner(b).facing = -1; // scared but facing you
  b.run(3);
  assert(b.p.state === 'light1', `facing you -> slash, got ${b.p.state}`);
});

test('finisher: two or more runners in reach = chain, all of them die', () => {
  const t = setup({ script: { 1: ['attack'] }, gap: 70 });
  const rs = [runner(t), runner(t, 640, 440), runner(t, 760, 400)];
  const kills = killLog(t);
  t.run(3);
  assert(t.p.exec?.kind === 'chain' && t.p.exec.targets.length === 3, `kind ${t.p.exec?.kind} n ${t.p.exec?.targets.length}`);
  t.run(160);
  assert(kills.length === 3 && kills.every((k) => k.finisher === 'chain'), `kills ${kills.map((k) => k.finisher)}`);
  assert(rs.every((r) => !r.alive), 'all dead');
  assert(Math.abs(t.p.x - 760) < 80, `ended by the last one, x ${Math.round(t.p.x)}`);
});

test('finisher: kick behind a lone runner = the single passing slash', () => {
  const t = setup({ script: { 1: ['kick'] }, gap: 70 });
  const r = runner(t);
  const kills = killLog(t);
  t.run(3);
  assert(t.p.exec?.kind === 'chain' && t.p.exec.targets.length === 1, `kind ${t.p.exec?.kind} / state ${t.p.state}`);
  t.run(60);
  assert(kills[0]?.finisher === 'chain' && !r.alive && t.p.state === 'idle', `kills ${kills.length}, player ${t.p.state}`);
});

test('chain adapts to 1, 2 or 3 runners: no empty beats, blade lands before the body parts', () => {
  const ends = [];
  for (const n of [1, 2, 3]) {
    const t = setup({ gap: 70 });
    const rs = [runner(t), runner(t, 640, 440), runner(t, 760, 400)].slice(0, n);
    t.world.fighters.filter((f) => f.team === 'enemy' && !rs.includes(f)).forEach((f) => { f.removeMe = true; });
    const beats = [];
    t.world.events.on('finisherBeat', (b) => beats.push(`${b.type}:${rs.indexOf(b.victim)}:${b.style}`));
    t.p.fsm.change('execute', { kind: 'chain', targets: rs });
    const times = t.p.exec.times;
    assert(times.cuts.length === n && (n > 1) === !!times.spin, `n ${n}: cuts ${times.cuts} spin ${times.spin}`);
    let end = 0;
    let early = false;
    for (let i = 1; i < 200 && t.p.state === 'execute'; i++) {
      t.run(1);
      end = i;
      // nobody is in pieces until his own contact beat has fired
      rs.forEach((r, k) => { if (r.execCut && !beats.some((b) => b.startsWith(`chainHit:${k}:`))) early = true; });
    }
    ends.push(end);
    const want = { 1: ['finish'], 2: ['down', 'finish'], 3: ['down', 'up', 'finish'] }[n];
    const order = beats.filter((b) => b.startsWith('chainHit')).map((b) => b.split(':')[2]);
    assert(String(order) === String(want), `n ${n}: strokes ${order}`);
    assert(beats.filter((b) => b.startsWith('chainCut')).length === n, `n ${n}: ${beats}`);
    assert(!early, `n ${n}: a body split before the blade reached it`);
    assert(rs.every((r) => !r.alive), `n ${n}: all dead`);
  }
  assert(ends[0] < ends[1] && ends[1] < ends[2], `shorter with fewer men: ${ends}`);
  assert(ends[0] < 60, `one man is one quick stroke (${ends[0]} frames)`);
});

test('fire death: an enemy the flames kill burns on his feet, then drops dead (no instant corpse)', () => {
  const world = new World();
  world.addFighter(new Fighter({ stats: CHARACTERS.warrior, team: 'player', x: 200, z: 430, controller: new Scripted() }));
  const e = world.addFighter(new Fighter({ stats: ENEMIES.grunt, team: 'enemy', x: 600, z: 430, controller: new Scripted() }));
  const stage = new Stage(world);
  const kills = [];
  world.events.on('kill', (k) => kills.push(k));
  const hz = stage.hazards.find((h) => h.type === 'fire');
  stage.hurt(hz, e, 9999, 1, 'fire');
  assert(e.state === 'burning' && !e.alive, `state ${e.state}`);
  assert(kills.length === 1 && kills[0].move.cut === 'fire', 'a fire kill is announced');
  for (let i = 0; i < 30; i++) world.tick();
  assert(e.state === 'burning', `still on his feet, burning (is ${e.state})`);
  for (let i = 0; i < 120; i++) world.tick();
  assert(e.state === 'dead', `then down: ${e.state}`);
  // a burning corpse isn't cleared away while it's alight
  e.burn = { lit: true, cool: 0, heat: 0.6 };
  for (let i = 0; i < 400; i++) world.tick();
  assert(!e.removeMe, 'kept while burning');
  e.burn.lit = false; e.burn.heat = 1;
  for (let i = 0; i < 500; i++) world.tick();
  assert(e.removeMe, 'gone some time after it burns out');
  // the player isn't given the fire-death state (his death is his own)
  const p2 = world.fighters.find((f) => f.team === 'player');
  hz.cool.clear();
  stage.hurt(hz, p2, 9999, 1, 'fire');
  assert(p2.state === 'knockdown', `player: ${p2.state}`);
});

// ---------------------------------------------------------------- co-op & online (net/Session.js)

// One "machine": a world, the stage, two heroes driven by tick records.
function machine(seed, link, index, script, delay, stageData = undefined) {
  const world = new World({ seed });
  const ctrls = [new TickController(), new TickController()];
  const heroes = ['warrior', 'rogue'].map((id, i) => world.addFighter(new Fighter({ stats: CHARACTERS[id], team: 'player', x: 200 - i * 46, z: 430 + i * 26, controller: ctrls[i] })));
  const stage = new Stage(world, stageData);
  stage.start(heroes);
  // a fake device: plays this machine's own scripted buttons
  let n = 0;
  const sampler = { held: {}, lastPresses: [], moveX: 0, moveZ: 0, read() { const s = script(n++); this.held = s.held; this.lastPresses = s.presses; this.moveX = s.mx; this.moveZ = s.mz; } };
  const session = link ? new NetSession(link, index, sampler, 0, delay) : null;
  if (session) session.onCorrect = (h, m) => correct(world, h, m);
  const m = { world, stage, heroes, ctrls, session, tick: 0, link };
  // one render frame: deliver the wire, record my buttons, run a tick if I may
  m.frame = () => {
    link.flush();
    session.pump(m.tick);
    if (!session.ready(m.tick)) return false;
    const recs = session.take(m.tick);
    recs.forEach((r, i) => ctrls[i].feed(r));
    if (recs.some((r) => pressed(r, 'restart')) && heroes.every((h) => !h.alive)) stage.respawn();
    world.tick();
    stage.update();
    session.afterTick(m.tick, () => snapshot(world));
    m.tick++;
    return true;
  };
  m.sum = () => world.fighters.map((f) => `${f.id}:${f.stats.id}:${f.x.toFixed(3)},${f.z.toFixed(3)},${f.h.toFixed(2)}:${f.health.toFixed(2)}:${f.state}`).join('|') + `#${stage.index}/${stage.phase}/${stage.stats.kills}`
    + (stage.story ? `#${stage.story.npcs.map((n) => `${n.id}:${n.state}:${n.x.toFixed(2)}`).join(',')}#${[...stage.story.done].join(',')}` : '');
  return m;
}
// button mashing that is different for each player but repeatable
function masher(salt) {
  return (n) => {
    const r = (k) => { let h = Math.imul(n * 2654435761 + salt * 97 + k * 7919, 0x85ebca6b) >>> 0; h ^= h >>> 13; h = Math.imul(h, 0xc2b2ae35) >>> 0; return (h >>> 0) / 4294967296; };
    const phase = Math.floor(n / 40);
    const pr = (k) => { let h = Math.imul(phase * 2654435761 + salt * 31 + k * 104729, 0x9e3779b1) >>> 0; h ^= h >>> 15; return (h >>> 0) / 4294967296; };
    const presses = [];
    if (r(1) < 0.09) presses.push('attack');
    if (r(2) < 0.03) presses.push('heavy');
    if (r(3) < 0.02) presses.push('dodge');
    if (r(4) < 0.02) presses.push('kick');
    if (r(5) < 0.01) presses.push('jump');
    if (r(6) < 0.01) presses.push('restart');
    const mx = pr(1) < 0.6 ? 1 : pr(1) < 0.8 ? -1 : 0;
    const mz = pr(2) < 0.3 ? 1 : pr(2) < 0.6 ? -1 : 0;
    return { held: { right: mx > 0, left: mx < 0, block: pr(3) < 0.1, attack: pr(4) < 0.2 }, presses, mx, mz };
  };
}

test('online co-op: two machines over a laggy wire play the same fight, tick for tick', () => {
  const [a, b] = loopPair(2, 5); // uneven lag, like a real line
  const A = machine(12345, a, 0, masher(1));
  const B = machine(12345, b, 1, masher(2));
  let frames = 0;
  let checked = 0;
  const sums = new Map();
  while ((A.tick < 3600 || B.tick < 3600) && frames++ < 20000) {
    // the two don't run in step with each other: A skips a frame now and then
    if (frames % 7 !== 0 && A.frame()) { const s = A.sum(); const o = sums.get(`b${A.tick}`); if (o !== undefined) { assert(o === s, `machines differ at tick ${A.tick}\n A ${s.slice(0, 300)}\n B ${o.slice(0, 300)}`); checked++; } else sums.set(`a${A.tick}`, s); }
    if (B.frame()) { const s = B.sum(); const o = sums.get(`a${B.tick}`); if (o !== undefined) { assert(o === s, `machines differ at tick ${B.tick}\n A ${o.slice(0, 300)}\n B ${s.slice(0, 300)}`); checked++; } else sums.set(`b${B.tick}`, s); }
  }
  assert(A.tick >= 3600 && B.tick >= 3600, `both ran a minute of game (A ${A.tick}, B ${B.tick}, frames ${frames})`);
  assert(checked > 3000, `compared ${checked} ticks`);
  assert(B.session.desyncs === 0, `no corrections were needed (${B.session.desyncs})`);
  assert(A.stage.stats.kills > 0 || A.world.fighters.some((f) => f.team === 'enemy'), 'there was a fight');
  // both heroes are driven by the right player: they did different things
  assert(Math.abs(A.heroes[0].x - A.heroes[1].x) > 1 || A.heroes[0].state !== A.heroes[1].state, 'two separately driven heroes');
});

test('online co-op plays the campaign: two machines over a laggy wire play the Burning Village alike, tick for tick (villagers and story too)', () => {
  const [a, b] = loopPair(3, 6);
  const A = machine(777, a, 0, masher(3), 8, STAGES.village);
  const B = machine(777, b, 1, masher(4), 8, STAGES.village);
  assert(A.stage.story, 'the level has its story');
  let frames = 0;
  let checked = 0;
  const sums = new Map();
  const look = (M, me, them) => { const s = M.sum(); const o = sums.get(`${them}${M.tick}`); if (o !== undefined) { assert(o === s, `machines differ at tick ${M.tick}\n ${me} ${s.slice(0, 400)}\n ${them} ${o.slice(0, 400)}`); checked++; } else sums.set(`${me}${M.tick}`, s); };
  while ((A.tick < 7200 || B.tick < 7200) && frames++ < 40000) {
    if (frames % 5 !== 0 && A.frame()) look(A, 'a', 'b');
    if (B.frame()) look(B, 'b', 'a');
  }
  assert(A.tick >= 7200 && B.tick >= 7200, `both ran two minutes (A ${A.tick}, B ${B.tick})`);
  assert(checked > 6000, `compared ${checked} ticks`);
  assert(B.session.desyncs === 0, `no corrections were needed (${B.session.desyncs})`);
});

test('online co-op: a machine marks its records ready once its tally is up, and the other machine sees it', () => {
  const [a, b] = loopPair(1, 1);
  const A = machine(5, a, 0, masher(1));
  const B = machine(5, b, 1, masher(2));
  let readyA = false;
  A.session.extraHeld = () => (readyA ? bitOf('ready') : 0);
  for (let i = 0; i < 60; i++) { A.frame(); B.frame(); }
  readyA = true;
  let seen = null;
  for (let i = 0; i < 60 && seen == null; i++) {
    A.frame(); B.frame();
    for (const [t, r] of B.session.remote) if (held(r, 'ready')) { seen = t; break; }
  }
  assert(seen != null, 'the guest saw the host ready');
  assert(!held(A.session.local.get(3) ?? [0, 0, 0, 0], 'ready'), 'not ready before the tally');
});

test('online co-op: over a real-internet lag the measured input delay keeps the game at full speed (a fixed 3 ticks crawled)', () => {
  const run = (delay) => {
    const [a, b] = loopPair(6, 6); // 6 frames each way = 100 ms one way, 200 ms round trip
    const A = machine(5, a, 0, masher(5), delay);
    const B = machine(5, b, 1, masher(6), delay);
    for (let i = 0; i < 600; i++) { A.frame(); B.frame(); }
    assert(A.sum() === B.sum() || A.tick !== B.tick, 'still in step');
    return Math.min(A.tick, B.tick);
  };
  const fixed = run(NET.delay);
  const measured = run(delayFor(200));
  assert(fixed < 400, `the old fixed delay crawls (${fixed} ticks in 600 frames)`);
  assert(measured > 560, `the measured delay runs at full speed (${measured} ticks in 600 frames)`);
  assert(delayFor(30) === NET.delay && delayFor(2000) === 15, 'clamped');
});

testAsync('online: two games on the same version shake hands; on different versions the join fails saying who must refresh', async () => {
  const pump = (a, b) => { const iv = setInterval(() => { a.flush(); b.flush(); }, 1); return () => clearInterval(iv); };
  // a loopPair link has no close(); handshake calls it on a mismatch
  const pair = () => { const [a, b] = loopPair(1, 1); a.close = b.close = () => {}; return [a, b]; };
  let [a, b] = pair();
  let stop = pump(a, b);
  const ok = await Promise.all([handshake(a, 'V1'), handshake(b, 'V1')]);
  stop();
  assert(ok[0] === a && ok[1] === b, 'same version: connected');
  [a, b] = pair();
  stop = pump(a, b);
  globalThis.BUILD_TIME = 2000;
  const older = handshake(a, 'V1').catch((e) => e.message);
  globalThis.BUILD_TIME = 1000; // (b's hello says built at 1000, a's at 2000 — both read at send time)
  const newer = handshake(b, 'V2').catch((e) => e.message);
  const [ma, mb] = await Promise.all([older, newer]);
  stop();
  globalThis.BUILD_TIME = 0;
  assert(/different version/.test(ma) && /different version/.test(mb), `both told (${ma} | ${mb})`);
  assert(/Yours is newer/.test(ma) && /Theirs is newer: refresh this page/.test(mb), `the older one is told to refresh (${ma} | ${mb})`);
});

test('online co-op: a copy that has drifted is pulled back by the host snapshot', () => {
  const [a, b] = loopPair(1, 1);
  const A = machine(777, a, 0, masher(3));
  const B = machine(777, b, 1, masher(4));
  for (let i = 0; i < 400; i++) { A.frame(); B.frame(); }
  // knock the guest's copy out of line: a hero in the wrong place, an enemy healthier than he should be
  B.heroes[0].x += 37;
  const foe = B.world.fighters.find((f) => f.team === 'enemy' && f.alive);
  if (foe) foe.health = Math.max(1, foe.health - 9);
  for (let i = 0; i < 400; i++) { A.frame(); B.frame(); }
  assert(B.session.desyncs >= 1, 'the drift was noticed');
  const d = Math.abs(A.heroes[0].x - B.heroes[0].x);
  assert(A.tick === B.tick || Math.abs(A.tick - B.tick) < 6, `still in step (${A.tick} / ${B.tick})`);
  assert(d < 3, `hero back in line (off by ${d.toFixed(1)})`);
});

test('online co-op: if the other machine goes quiet the game waits, and carries on alone when the link closes', () => {
  const [a, b] = loopPair(1, 1);
  const A = machine(5, a, 0, masher(5));
  const B = machine(5, b, 1, masher(6));
  for (let i = 0; i < 120; i++) { A.frame(); B.frame(); }
  const t0 = A.tick;
  for (let i = 0; i < 120; i++) A.frame(); // B has stopped
  assert(A.tick - t0 <= NET.delay + 1, `A waits (ran ${A.tick - t0} more ticks)`);
  assert(A.session.waiting, 'and knows it is waiting');
  a.close(); // the link drops
  for (let i = 0; i < 60; i++) A.frame();
  assert(A.tick - t0 > 50, `A carries on alone (${A.tick - t0})`);
});

test('online co-op: the guest carries on alone after the host leaves, and his hero still answers his buttons', () => {
  const [a, b] = loopPair(1, 1);
  const walkRight = () => ({ held: { right: true }, presses: [], mx: 1, mz: 0 });
  const A = machine(9, a, 0, masher(3));
  const B = machine(9, b, 1, walkRight);
  for (let i = 0; i < 60; i++) { A.frame(); B.frame(); }
  // the host hangs up; the guest does what the arena's goAlone does: only his own hero is left
  a.close();
  assert(B.session.alone, 'the guest knows he is alone');
  const mine = B.heroes[1];
  B.heroes.forEach((h, i) => { h.seat = i; });
  for (const f of B.world.fighters) if (f.team === 'enemy') f.removeMe = true; // (an empty road, so nothing knocks him about)
  B.heroes[0].removeMe = true;
  const players = [mine];
  const x0 = mine.x;
  for (let i = 0; i < 60; i++) {
    b.flush();
    B.session.pump(B.tick);
    assert(B.session.ready(B.tick), 'never waits once alone');
    feedPlayers(players, B.session.take(B.tick));
    B.world.tick();
    B.tick++;
  }
  assert(mine.x > x0 + 40, `the guest's hero walks on (moved ${(mine.x - x0).toFixed(1)})`);
});

test('co-op: a fallen hero rises beside his partner; both down = back to the checkpoint together', () => {
  const world = new World({ seed: 1 });
  const heroes = ['warrior', 'mage'].map((id, i) => world.addFighter(new Fighter({ stats: CHARACTERS[id], team: 'player', x: 300 + i * 60, z: 430, controller: new TickController() })));
  const stage = new Stage(world);
  stage.start(heroes);
  for (const f of world.fighters) if (f.team === 'enemy') f.removeMe = true;
  stage.spawnWave = () => {}; // (no enemies for this one)
  const run = (n) => { for (let i = 0; i < n; i++) { for (const h of heroes) h.health = h.alive ? h.stats.maxHealth : 0; world.tick(); stage.update(); } };
  heroes[1].health = 0; heroes[1].fsm.change('knockdown', { vx: 0, vh: 100 });
  run(200);
  assert(heroes[1].state === 'dead' && !heroes[1].alive, `down (${heroes[1].state})`);
  run(400);
  assert(heroes[1].alive && Math.abs(heroes[1].x - heroes[0].x) < 80, `risen beside his partner (alive ${heroes[1].alive})`);
  assert(Math.abs(heroes[1].health - heroes[1].stats.maxHealth) < 1 || heroes[1].health > 0, 'with health');
  // both down: nobody rises by himself
  for (const h of heroes) { h.health = 0; h.fsm.change('dead'); }
  for (let i = 0; i < 500; i++) { world.tick(); stage.update(); }
  assert(heroes.every((h) => !h.alive), 'both stay down');
  stage.respawn();
  assert(heroes.every((h) => h.alive && h.state === 'idle'), 'checkpoint brings both back');
  assert(stage.stats.deaths === 1, 'one death counted');
});

test('props: crates, barrels and chests are solid till broken; a man thrown into one smashes it; the street clutter is solid', () => {
  const world = new World({ seed: 3 });
  class Walker extends Controller { sample() { this.held = {}; this.moveX = 1; this.moveZ = this.mz ?? 0; } }
  const walk = new Walker();
  const hero = world.addFighter(new Fighter({ stats: CHARACTERS.warrior, team: 'player', x: 300, z: 430, controller: walk }));
  const stage = new Stage(world);
  stage.start([hero]);
  for (const f of world.fighters) if (f.team === 'enemy') f.removeMe = true;
  world.tick();
  const crate = { id: 999, section: stage.index, kind: 'crate', ...PROPS.crate, x: hero.x + 80, z: hero.z, y: 0, broken: false, hitBy: new Set() };
  stage.props.push(crate);
  const x0 = hero.x;
  walk.mz = 1; // (holding down-right into it: he stays put)
  for (let i = 0; i < 90; i++) { world.tick(); hero.z = crate.z; }
  assert(hero.x > x0 + 20 && hero.x < crate.x - crate.w * 0.3, `stopped at the crate, not inside it (hero ${hero.x.toFixed(0)}, crate ${crate.x})`);
  // walking into it without up or down held, he edges round it
  hero.x = crate.x - 60; hero.z = crate.z;
  walk.mz = 0;
  for (let i = 0; i < 120; i++) world.tick();
  assert(hero.x > crate.x + crate.w * 0.4, `edged round it (hero ${hero.x.toFixed(0)}, ${hero.z.toFixed(0)})`);
  // an enemy flung into it breaks it
  const foe = createEnemy(world, 'grunt', crate.x - 60, crate.z);
  foe.fsm.change('knockdown', { vx: 500, vh: 60 });
  for (let i = 0; i < 30 && !crate.broken; i++) world.tick();
  assert(crate.broken, 'a man thrown into the crate smashes it');
  // the village's signposts and debris heaps are solid
  const v = new Stage(new World({ seed: 1 }), STAGE_VILLAGE);
  const sign = STAGE_VILLAGE.decor.find((d) => d.kind === 'signpost');
  assert(v.solidAt(sign.x, sign.z - 6, 0) && !v.solidAt(sign.x, sign.z + 60, 0), 'the signpost stands where it is drawn, and only there');
});

test('waves: every enemy starts off every screen and walks on (no popping in)', () => {
  // a hero at the start (the camera pinned to the left wall), hugging the right wall, mid-room
  for (const at of ['start', 'wall', 'middle']) {
    const world = new World({ seed: 3 });
    const hero = world.addFighter(new Fighter({ stats: CHARACTERS.warrior, team: 'player', x: 300, z: 430, controller: new TickController() }));
    const stage = new Stage(world);
    stage.start([hero]);
    for (const f of world.fighters) if (f.team === 'enemy') f.removeMe = true;
    world.tick();
    const b = world.bounds;
    if (at !== 'start') hero.x = at === 'wall' ? b.maxX : (b.minX + b.maxX) / 2;
    stage.spawnWave(['grunt', 'grunt', 'grunt', 'grunt', 'grunt']);
    const foes = stage.livingFoes();
    assert(foes.length === 5, `five came (${foes.length})`);
    // what the screen shows: 960 wide, centred on the hero but held inside the camera's
    // bounds (the section +30 each side, never narrower than a screen)
    const camL = b.minX - 30;
    const camR = Math.max(b.maxX + 30, camL + SETTINGS.width);
    const viewL = Math.max(camL, Math.min(camR - SETTINGS.width, hero.x - SETTINGS.width / 2));
    const viewR = viewL + SETTINGS.width;
    for (const f of foes) {
      assert(f.x < viewL - 100 || f.x > viewR + 100, `${at}: spawned off-screen (x ${f.x.toFixed(0)}, view ${viewL.toFixed(0)}..${viewR.toFixed(0)})`);
      assert(f.entering, 'and is walking on');
    }
    for (let i = 0; i < 60 * 15; i++) { hero.health = hero.stats.maxHealth; world.tick(); }
    for (const f of foes) {
      assert(!f.entering && f.x >= b.minX && f.x <= b.maxX, `${at}: walked into the room (x ${f.x.toFixed(0)}, ${b.minX}..${b.maxX})`);
      assert(Math.abs(f.x - hero.x) < 300, `${at}: and came for the hero (${Math.abs(f.x - hero.x).toFixed(0)} away)`);
    }
  }
});

test('variety: no two grunts alike (pace, height, dye), the same men on both machines, the kind left alone', () => {
  const spawn = (seed) => {
    const world = new World({ seed });
    return Array.from({ length: 12 }, (_, i) => createEnemy(world, 'grunt', 600 + i * 30, 420));
  };
  const a = spawn(11);
  const b = spawn(11);
  const G = ENEMIES.grunt;
  const V = G.variety;
  for (const [i, f] of a.entries()) {
    const k = f.stats.walkSpeed / G.walkSpeed;
    assert(k >= V.speed[0] - 1e-9 && k <= V.speed[1] + 1e-9, `pace in range (${k})`);
    assert(f.stats.size >= V.size[0] && f.stats.size <= V.size[1], `height in range (${f.stats.size})`);
    assert(Math.abs(f.stats.depthSpeed / G.depthSpeed - k) < 1e-9, 'depth pace goes with it');
    assert(f.health === f.stats.maxHealth, 'starts at his own full health');
    assert(V.dyes.includes(f.dye), `a dye from the list (${f.dye})`);
    assert(!f.dye || DYES[f.dye], `a dye the shader knows (${f.dye})`);
    const g = b[i];
    assert(g.stats.walkSpeed === f.stats.walkSpeed && g.stats.size === f.stats.size && g.dye === f.dye, 'same seed, same man');
  }
  assert(new Set(a.map((f) => f.stats.walkSpeed.toFixed(1))).size >= 10, 'all at their own pace');
  assert(new Set(a.map((f) => f.dye)).size >= 4, `several colours (${a.map((f) => f.dye)})`);
  assert(G.walkSpeed === 115 && G.size === undefined && a[0].stats !== a[1].stats, 'the kind\'s numbers untouched');
  for (const [id, E] of Object.entries(ENEMIES)) for (const d of E.variety?.dyes ?? []) assert(!d || DYES[d], `${id}: dye ${d} exists`);
});

test('waves: a man stuck walking on is never spirited away while he can be seen', () => {
  const world = new World({ seed: 3 });
  const hero = world.addFighter(new Fighter({ stats: CHARACTERS.warrior, team: 'player', x: 300, z: 430, controller: new TickController() }));
  const stage = new Stage(world);
  stage.start([hero]);
  for (const f of world.fighters) if (f.team === 'enemy') f.removeMe = true;
  world.tick();
  const b = world.bounds;
  hero.x = (b.minX + b.maxX) / 2;
  // on screen, behind the hero, further than ENTER.onScreen: still 'entering', and stuck
  const x = hero.x - 440;
  const e = createEnemy(world, 'grunt', x, 430, { entering: true });
  e.controller = new Controller();
  for (let i = 0; i < 60 * 8; i++) { hero.health = hero.stats.maxHealth; world.tick(); stage.update(); }
  assert(e.alive && !e.removeMe && !e.broughtRound && Math.abs(e.x - x) < 2, `stays where he's seen (x ${e.x.toFixed(0)}, was ${x.toFixed(0)})`);
  assert(!e.entering, 'and has simply arrived');
});

// ---------------------------------------------------------------- the Mage

// A Mage on an empty floor with grunts where we put them (all standing still unless told).
function mageSetup({ script = {}, hold = {}, foes = [], stats = CHARACTERS.mage } = {}) {
  const world = new World({ seed: 7 });
  const p = world.addFighter(new Fighter({ stats, team: 'player', x: 600, z: 420, controller: new Scripted(script, hold) }));
  const es = foes.map(([x, z, type = 'grunt']) => {
    const e = world.addFighter(new Fighter({ stats: ENEMIES[type], team: 'enemy', x, z: z ?? 420, controller: new Scripted() }));
    e.facing = -1;
    return e;
  });
  const ev = [];
  for (const n of ['hit', 'kill', 'block', 'blinkOut', 'blinkIn', 'boltCast', 'lightningArc', 'forceBlast', 'barrierUp', 'barrierDown', 'barrierGone', 'finisherBeat']) world.events.on(n, (e) => ev.push({ n, e }));
  return { world, p, es, ev, run: (n) => { for (let i = 0; i < n; i++) world.tick(); }, seen: (n) => ev.filter((x) => x.n === n) };
}

test('mage: the kit replaces the buttons (blink, lightning, force, barrier) — Ulric keeps his', () => {
  const m = CHARACTERS.mage.states;
  assert(m.dodge === 'blink' && m.heavy === 'bolt' && m.kick === 'force' && m.cast === 'ward', JSON.stringify(m));
  assert(!CHARACTERS.warrior.states, 'Ulric untouched');
  assert(CHARACTERS.rogue.states.heavy === 'viper', 'the Rogue has her own kit');
  const t = setup({ script: { 1: ['dodge'] }, gap: 400 });
  t.run(2);
  assert(t.p.state === 'dodge', `Ulric still rolls (${t.p.state})`);
});

test('mage: three-hit staff combo chains, connects, and the third knocks down', () => {
  const t = mageSetup({ script: { 1: ['attack'], 12: ['attack'], 24: ['attack'] }, foes: [[660]] });
  const states = new Set();
  for (let i = 0; i < 80; i++) { t.world.tick(); states.add(t.p.state); }
  assert(states.has('light2') && states.has('light3'), `states ${[...states]}`);
  assert(t.seen('hit').length === 3, `hits ${t.seen('hit').length}`);
  assert(['knockdown', 'getup', 'dead'].includes(t.es[0].state), `foe ${t.es[0].state}`);
});

test('mage: blink teleports the dodge distance in the input direction, invulnerable, then can attack at once', () => {
  for (const [held, dx, dz] of [[{ right: true }, 1, 0], [{ left: true }, -1, 0], [{ up: true }, 0, -1], [{ down: true }, 0, 1], [{}, 1, 0]]) {
    const t = mageSetup({ script: { 1: ['dodge'] }, hold: held });
    t.p.z = 425;
    t.run(2);
    assert(t.p.state === 'blink' && t.p.invincible, `blinking (${t.p.state})`);
    t.run(6);
    const B = CHARACTERS.mage.kit.blink;
    const movedX = (t.p.x - 600) * (dx || 1);
    const movedZ = (t.p.z - 425) * (dz || 1);
    if (dx) assert(Math.abs(movedX - B.distance) < 2, `x moved ${t.p.x - 600}`);
    if (dz) assert(movedZ > 50, `z moved ${t.p.z - 425}`);
    assert(t.seen('blinkOut').length === 1 && t.seen('blinkIn').length === 1, 'out and in');
  }
  // attack right out of the blink
  const a = mageSetup({ script: { 1: ['dodge'], 9: ['attack'] }, hold: {} });
  a.run(12);
  assert(a.p.state === 'light1', `blink -> staff strike (${a.p.state})`);
  // blink out of a staff swing's recovery
  const b = mageSetup({ script: { 1: ['attack'], 12: ['dodge'] } });
  b.run(14);
  assert(b.p.state === 'blink', `staff -> blink (${b.p.state})`);
});

test('mage: chain lightning strikes the first man and every jump starts from the body before it', () => {
  const t = mageSetup({ script: { 1: ['heavy'] }, foes: [[760], [790, 425], [840, 400], [1300]] });
  t.run(45);
  const arcs = t.seen('lightningArc').map((x) => x.e);
  assert(arcs.length === 3, `3 arcs (the far man is out of reach): ${arcs.length}`);
  assert(arcs[0].from === null && arcs[0].to === t.es[0], 'the bolt leaves the staff for the nearest man');
  for (const a of arcs.slice(1)) assert(arcs.some((b) => b.to === a.from), 'each jump leaves a body already struck');
  assert(t.es.slice(0, 3).every((e) => e.health < e.stats.maxHealth), 'all three hurt');
  assert(t.es[3].health === t.es[3].stats.maxHealth, 'the far one untouched');
  assert(t.p.mana < t.p.stats.maxMana, 'mana spent');
});

test('mage: chain targeting prefers a body touching the last one over a nearer-looking one further off', () => {
  const t = mageSetup({ foes: [[700], [735, 420], [700, 470]] });
  const K = { ...CHARACTERS.mage.kit.bolt, branches: 1, maxJumps: 1 };
  const plan = planChainLightning(t.p, K);
  assert(plan.hits[0].t === t.es[0], 'first: nearest ahead');
  assert(plan.hits[1].t === t.es[1] && plan.hits[1].from === t.es[0], `jump to the touching man (got ${plan.hits[1]?.t.x})`);
});

test('mage: with nobody ahead the bolt fizzles out harmlessly; overcharged it hits harder and further', () => {
  const t = mageSetup({ script: { 1: ['heavy'] }, foes: [[300]] });
  t.run(50);
  assert(t.seen('boltCast').length === 1 && t.seen('hit').length === 0, 'cast, no hit');
  const tap = mageSetup({ script: { 1: ['heavy'] }, hold: (n) => ({ heavy: n < 3 }), foes: [[720], [760], [800], [840], [880], [920], [960], [1000]] });
  tap.run(50);
  const full = mageSetup({ script: { 1: ['heavy'] }, hold: (n) => ({ heavy: n < 50 }), foes: [[720], [760], [800], [840], [880], [920], [960], [1000]] });
  full.run(90);
  const c = full.seen('boltCast')[0].e;
  assert(c.charged, 'held = charged');
  assert(full.seen('lightningArc').length > tap.seen('lightningArc').length, `more jumps charged (${full.seen('lightningArc').length} vs ${tap.seen('lightningArc').length})`);
  const dmg = (x) => x.es[0].stats.maxHealth - x.es[0].health;
  assert(dmg(full) > dmg(tap), 'more damage charged');
});

test('mage: force blast hurls the cone in front, staggers a brute, misses what is behind or off to the side', () => {
  const t = mageSetup({ script: { 1: ['kick'] }, foes: [[680], [720, 440], [520], [650, 335], [700, 470, 'gladiator']] });
  const front = t.es[0];
  t.run(14);
  assert(t.seen('forceBlast').length === 1, 'blast');
  t.run(4);
  assert(front.state === 'knockdown' && front.vx > 200, `front man launched (${front.state}, vx ${front.vx.toFixed(0)})`);
  assert(t.es[1].state === 'knockdown', 'the one beside him too');
  assert(t.es[2].health === t.es[2].stats.maxHealth, 'nobody behind');
  assert(t.es[3].health === t.es[3].stats.maxHealth, 'nobody far off to the side');
  const brute = t.es[4];
  assert(brute.health < brute.stats.maxHealth && brute.state !== 'knockdown', `brute staggers, not floored (${brute.state})`);
  // cooldown: a second press straight away does nothing
  const c = mageSetup({ script: { 1: ['kick'], 34: ['kick'] }, foes: [[680]] });
  c.run(40);
  assert(c.seen('forceBlast').length === 1, 'on cooldown');
});

test('mage: force blast throws men into one another', () => {
  const t = mageSetup({ script: { 1: ['kick'] }, foes: [[680], [800]] });
  let bowled = false;
  t.world.events.on('bowl', () => { bowled = true; });
  t.run(60);
  assert(bowled || t.es[1].state === 'knockdown', 'the far man was bowled over by the near one');
});

test('mage: the barrier button raises the earth wall (no fire wall); enemies cannot cross, allies can', () => {
  const tap = mageSetup({ script: { 1: ['magic'] }, hold: (n) => ({ magic: n < 2 }) });
  tap.run(20);
  const up = tap.seen('barrierUp')[0]?.e.barrier;
  assert(up && up.kind === 'earth', `earth (${up?.kind})`);
  assert(Math.abs(up.x - (600 + CHARACTERS.mage.kit.barrier.distance)) < 2, `in front of him at the set distance (${up.x})`);
  const hold = mageSetup({ script: { 1: ['magic'] }, hold: (n) => ({ magic: n < 30 }) });
  hold.run(40);
  assert(hold.seen('barrierUp')[0]?.e.barrier.kind === 'earth', 'held: still earth');
  // a man walking at the mage from behind the wall is stopped at its face
  const t = mageSetup({ script: { 1: ['magic'] }, foes: [[900]] });
  t.es[0].controller.hold = { left: true };
  t.run(140);
  const wall = t.world.barriers.list[0];
  assert(t.es[0].x >= wall.x + wall.half - 0.01, `held at the wall (${t.es[0].x.toFixed(0)} vs ${wall.x + wall.half})`);
  // allies are held off it too (no sinking into the stone)...
  t.p.z = 490;
  t.p.controller.hold = { right: true };
  t.run(90);
  const off = wall.half + CHARACTERS.mage.kit.barrier.standoff;
  assert(t.p.x <= wall.x - off + 0.01, `an ally walking into it is held off its face (${t.p.x.toFixed(0)})`);
  // ...but can always get across: a blink (or roll, vault, jump) goes through
  t.p.controller.script = { [t.p.controller.t + 1]: ['dodge'] };
  t.run(40);
  assert(t.p.x > wall.x + off, `a blink takes him across (${t.p.x.toFixed(0)})`);
  t.p.controller.hold = { left: true };
  t.run(60);
  assert(t.p.x >= wall.x + off - 0.01, 'and then he is on that side of it');
});

test('mage: a man standing on the wall line is moved clean to the nearer side, never left inside', () => {
  const t = mageSetup({ script: { 1: ['magic'] }, hold: (n) => ({ magic: n < 2 }), foes: [[745], [760], [775]] });
  t.run(20);
  const b = t.world.barriers.list[0];
  for (const e of t.es) assert(Math.abs(e.x - b.x) >= b.half, `outside (${e.x} vs wall ${b.x}±${b.half})`);
  assert(t.es[0].x < b.x && t.es[2].x > b.x, 'each to the side he was nearer');
});

test('mage: the wall lasts its time; collision ends the moment it starts to fall', () => {
  const K = CHARACTERS.mage.kit.barrier;
  const e = mageSetup({ script: { 1: ['magic'] }, foes: [[900, 470]] });
  e.es[0].controller.hold = { left: true };
  e.es[0].health = 1e6;
  e.run(K.castAt + K.earth.duration - 4);
  const wall = e.world.barriers.list[0];
  assert(wall.state === 'up' && e.es[0].x >= wall.x + wall.half - 0.01, 'held until the last moment');
  e.run(10);
  assert(e.seen('barrierDown').length === 1, 'it came down on time');
  e.run(40);
  assert(e.es[0].x < wall.x, `the moment it falls, the way is open (${e.es[0].x.toFixed(0)})`);
  e.run(K.collapse);
  assert(e.world.barriers.list.length === 0 && e.seen('barrierGone').length === 1, 'and then it is gone');
});

test('mage: lightning is a three-press combo, each strike harder; the third floors him', () => {
  const t = mageSetup({ script: { 1: ['heavy'], 24: ['heavy'], 44: ['heavy'] }, foes: [[720]] });
  const e = t.es[0];
  e.health = 1e4; e.stats = { ...e.stats, maxHealth: 1e4 };
  const dmg = [];
  t.world.events.on('hit', (h) => { if (h.defender === e) dmg.push(h.damage); });
  t.run(110);
  assert(dmg.length === 3, `three strikes (${dmg.length})`);
  assert(dmg[1] > dmg[0] && dmg[2] > dmg[1] * 1.4, `harder each time (${dmg.map((d) => d.toFixed(0))})`);
  assert(dmg[0] > 25, `the first already bites (${dmg[0].toFixed(0)} — was ~20 before)`);
  assert(['knockdown', 'getup'].includes(e.state), `floored (${e.state})`);
  assert(t.p.mana === t.p.stats.maxMana - CHARACTERS.mage.moves.heavy.manaCost + 0 || t.p.mana < t.p.stats.maxMana, 'one cost');
});

test('mage: hold force push to charge it — the full charge hits harder and throws further', () => {
  const run = (held) => {
    const t = mageSetup({ script: { 1: ['kick'] }, hold: (n) => ({ kick: n <= held }), foes: [[700]] });
    const e = t.es[0];
    e.health = 1e4; e.stats = { ...e.stats, maxHealth: 1e4 };
    t.run(held + 30);
    return { dmg: 1e4 - e.health, vx: Math.abs(e.vx), level: t.seen('forceBlast')[0]?.e.level };
  };
  const tap = run(1); const full = run(60);
  assert(tap.level === 0 && full.level === 1, `levels ${tap.level} / ${full.level}`);
  assert(full.dmg > tap.dmg * 1.8, `harder (${tap.dmg.toFixed(0)} -> ${full.dmg.toFixed(0)})`);
});

test('mage: his heavier lightning can take an arm, so his finishers are reachable without a blade', () => {
  assert(chooseMaim({ cut: 'shock', damage: 40, maxHealth: 130, maimed: {} }, () => 0) === null, 'a plain shock never maims');
  assert(chooseMaim({ cut: 'shock', damage: 40, maxHealth: 130, maimed: {}, maims: true }, () => 0) !== null, 'a maiming strike can');
  let maims = 0;
  for (let seed = 1; seed <= 40 && !maims; seed++) {
    const t = mageSetup({ script: { 1: ['heavy'], 24: ['heavy'] }, foes: [[720, 420, 'butcher']] });
    t.world.seed = seed;
    t.world.events.on('maim', () => maims++);
    t.run(60);
  }
  assert(maims > 0, 'the second strike took an arm in some fights');
});

test('mage: he can blink out of a jump, staying at that height, then drops', () => {
  const t = mageSetup({ script: { 1: ['jump'], 12: ['dodge'] }, hold: (n) => (n >= 12 && n < 14 ? { right: true } : {}) });
  t.run(13);
  assert(t.p.state === 'blink' && t.p.h > 20, `blinking in the air (${t.p.state}, h ${t.p.h.toFixed(0)})`);
  const h0 = t.p.h;
  t.run(6);
  assert(Math.abs(t.p.h - h0) < 1, 'held at height');
  assert(t.p.x > 600 + CHARACTERS.mage.kit.blink.distance - 5, `moved (${t.p.x.toFixed(0)})`);
  t.run(80);
  assert(t.p.grounded && t.p.state === 'idle', `landed (${t.p.state})`);
});

test('mage: the barrier is never placed outside the stage, and is on cooldown after', () => {
  const t = mageSetup({ script: { 1: ['magic'], 40: ['magic'] }, hold: (n) => ({ magic: n < 2 || (n >= 40 && n < 42) }) });
  t.p.x = t.world.bounds.maxX - 20;
  t.p.facing = 1;
  t.run(80);
  const b = t.seen('barrierUp')[0].e.barrier;
  assert(b.x <= t.world.bounds.maxX - CHARACTERS.mage.kit.barrier.edgeMargin, `clamped (${b.x})`);
  assert(t.seen('barrierUp').length === 1, 'second cast refused: cooling down');
});

test('mage: enemies cut off by a wall wait at it instead of grinding into it, then come on when it falls', () => {
  const world = new World({ seed: 3 });
  const p = world.addFighter(new Fighter({ stats: CHARACTERS.mage, team: 'player', x: 600, z: 420, controller: new Scripted({ 1: ['magic'] }, (n) => ({ magic: n < 30 })) }));
  const foes = [0, 1, 2, 3].map((i) => createEnemy(world, 'grunt', 900 + i * 40, 360 + i * 40));
  for (let i = 0; i < 60; i++) world.tick();
  const wall = world.barriers.list[0];
  const xs = [];
  for (let i = 0; i < 240; i++) { world.tick(); xs.push(foes.map((f) => f.x)); }
  for (const f of foes) {
    assert(f.x >= wall.x + wall.half && f.x < wall.x + wall.half + 140, `waiting at a sensible distance (${(f.x - wall.x).toFixed(0)})`);
  }
  // not jittering against it: the last second is calm
  const last = xs.slice(-60);
  const jitter = foes.map((_, k) => last.reduce((s, r, i) => s + (i ? Math.abs(r[k] - last[i - 1][k]) : 0), 0));
  assert(jitter.every((j) => j < 60), `calm (${jitter.map((j) => j.toFixed(0))})`);
  assert(p.health === p.stats.maxHealth, 'nobody reached him');
  for (let i = 0; i < 600; i++) world.tick();
  assert(world.barriers.list.length === 0, 'the wall is gone');
  for (let i = 0; i < 300; i++) world.tick();
  assert(p.health < p.stats.maxHealth, 'then they came on');
});

test('mage: twelve stranded behind the wall, eight with him — the wall holds the twelve', () => {
  const world = new World({ seed: 5 });
  const p = world.addFighter(new Fighter({ stats: CHARACTERS.mage, team: 'player', x: 900, z: 420, controller: new Scripted({ 1: ['magic'] }, (n) => ({ magic: n < 30 })) }));
  p.health = 1e6;
  const near = Array.from({ length: 8 }, (_, i) => createEnemy(world, 'grunt', 700 - i * 20, 340 + (i % 4) * 50));
  const far = Array.from({ length: 12 }, (_, i) => createEnemy(world, 'grunt', 1150 + i * 25, 340 + (i % 5) * 40));
  for (let i = 0; i < 300; i++) world.tick();
  const wall = world.barriers.list[0];
  assert(wall, 'raised');
  assert(far.every((f) => f.x > wall.x), 'all twelve still behind it');
  assert(near.every((f) => f.x < wall.x), 'the eight on his side');
});

test('mage: an enemy that turns up behind a standing wall stays behind it', () => {
  const t = mageSetup({ script: { 1: ['magic'] }, hold: (n) => ({ magic: n < 30 }) });
  t.run(40);
  const wall = t.world.barriers.list[0];
  const late = createEnemy(t.world, 'grunt', wall.x + 200, 420);
  for (let i = 0; i < 200; i++) t.world.tick();
  assert(late.x >= wall.x + wall.half, `stays his side (${late.x.toFixed(0)})`);
});

test('mage: an enemy blow cannot reach through the wall', () => {
  const t = mageSetup({ script: { 1: ['magic'] }, hold: (n) => ({ magic: n < 30 }), foes: [[900, 420, 'penitent']] });
  t.p.x = 600;
  t.run(30);
  const wall = t.world.barriers.list[0];
  t.p.x = wall.x - wall.half - 6; // right up against his own wall
  const e = t.es[0];
  e.x = wall.x + wall.half + 2;
  e.controller.script = { [e.controller.t + 1]: ['attack'] };
  t.run(60);
  assert(t.p.health === t.p.stats.maxHealth, 'untouched');
});

test('mage: the earth wall can be battered down by a brute', () => {
  const t = mageSetup({ script: { 1: ['magic'] }, hold: (n) => ({ magic: n < 30 }) });
  t.run(30);
  const wall = t.world.barriers.list[0];
  const brute = createEnemy(t.world, 'berserker', wall.x + 90, 420);
  for (let i = 0; i < 60 * 9 && wall.state === 'up'; i++) t.world.tick();
  assert(wall.hp < wall.maxHp, `damaged (${wall.hp}/${wall.maxHp})`);
  assert(brute.x >= wall.x + wall.half - 0.01 || wall.state !== 'up', 'still held while it stood');
});

for (const [button, kind] of [['attack', 'storm'], ['heavy', 'rupture'], ['kick', 'embers']]) {
  test(`mage finisher: ${button} behind runners = ${kind}, for 1, 2 and 3 runners — all die, nothing left held`, () => {
    for (const n of [1, 2, 3]) {
      const t = mageSetup({ script: { 1: [button] } });
      const rs = [[740, 420], [820, 440], [880, 400]].slice(0, n).map(([x, z]) => {
        const r = t.world.addFighter(new Fighter({ stats: ENEMIES.grunt, team: 'enemy', x, z, controller: new Scripted() }));
        r.controller.scared = true; r.maimed = { armB: true }; r.facing = 1; r.vx = 90;
        return r;
      });
      const kills = [];
      t.world.events.on('kill', (e) => kills.push(e));
      t.run(3);
      assert(t.p.state === 'execute' && t.p.exec.kind === kind && t.p.exec.targets.length === n, `${n}: ${t.p.state} ${t.p.exec?.kind} ${t.p.exec?.targets.length}`);
      t.run(MAGE_FINISHERS[kind].total + 40); // (+ the hit-stops)
      assert(kills.length === n && kills.every((k) => k.finisher === kind), `${n}: kills ${kills.map((k) => k.finisher)}`);
      assert(rs.every((r) => !r.alive && r.state !== 'executed'), `${n}: ${rs.map((r) => r.state)}`);
      assert(t.p.state === 'idle' && !t.p.blinkGone, `${n}: mage back (${t.p.state})`);
      if (kind === 'rupture') assert(rs.every((r) => r.fatality === 'explode'), 'ruptured');
      if (kind === 'embers') assert(t.seen('finisherBeat').some((b) => b.e.type === 'embersArrive'), 'blinked into the path');
    }
  });
}

test('mage finisher: rupture holds each runner apart in the air before the burst', () => {
  const t = mageSetup({ script: { 1: ['heavy'] } });
  const rs = [[740, 420], [800, 430], [860, 410]].map(([x, z]) => {
    const r = t.world.addFighter(new Fighter({ stats: ENEMIES.grunt, team: 'enemy', x, z, controller: new Scripted() }));
    r.controller.scared = true; r.maimed = { armB: true }; r.facing = 1;
    return r;
  });
  t.run(60);
  for (const r of rs) assert(r.h > 30, `lifted (${r.h.toFixed(0)})`);
  for (let i = 0; i < 3; i++) for (let j = i + 1; j < 3; j++) {
    assert(Math.hypot(rs[i].x - rs[j].x, rs[i].z - rs[j].z) > 30, 'clearly separated');
  }
});

test('mage: everything he does is the same on two machines (lockstep)', () => {
  const play = () => {
    const t = mageSetup({ script: { 1: ['heavy'], 50: ['kick'], 90: ['magic'], 130: ['dodge'], 145: ['attack'], 160: ['attack'] }, hold: (n) => ({ heavy: n < 30, magic: n >= 90 && n < 92 }), foes: [[700], [740, 440], [780, 380], [900], [1000]] });
    t.run(400);
    return t.world.fighters.map((f) => `${f.x.toFixed(3)},${f.z.toFixed(3)},${f.health.toFixed(2)},${f.state}`).join('|');
  };
  assert(play() === play(), 'same fight both times');
});

// ---------------------------------------------------------------- the Rogue

function rogueSetup({ script = {}, hold = {}, foes = [], ally = null } = {}) {
  const world = new World({ seed: 11 });
  const p = world.addFighter(new Fighter({ stats: CHARACTERS.rogue, team: 'player', x: 600, z: 420, controller: new Scripted(script, hold) }));
  const mate = ally ? world.addFighter(new Fighter({ stats: CHARACTERS[ally[0]], team: 'player', x: ally[1], z: ally[2] ?? 420, controller: new Scripted() })) : null;
  const es = foes.map(([x, z, type = 'grunt']) => {
    const e = world.addFighter(new Fighter({ stats: ENEMIES[type], team: 'enemy', x, z: z ?? 420, controller: new Scripted() }));
    e.facing = -1;
    return e;
  });
  const ev = [];
  for (const n of ['hit', 'kill', 'exposed', 'shadowWindow', 'mineDrop', 'mineArmed', 'mineCue', 'mineBlast', 'mineFizzle', 'vaultLaunch', 'fanThrow', 'diveLand', 'knifeThrow', 'finisherBeat']) world.events.on(n, (e) => ev.push({ n, e }));
  return { world, p, mate, es, ev, run: (n) => { for (let i = 0; i < n; i++) world.tick(); }, seen: (n) => ev.filter((x) => x.n === n) };
}

test('rogue: fastest hero, best dodge, lighter guard and health than Ulric', () => {
  const r = CHARACTERS.rogue; const u = CHARACTERS.warrior; const m = CHARACTERS.mage;
  assert(r.walkSpeed > u.walkSpeed && r.walkSpeed > m.walkSpeed, 'fastest');
  assert(r.dodge.iframes >= u.dodge.iframes && r.dodge.recovery < u.dodge.recovery, 'best dodge');
  assert(r.maxHealth < u.maxHealth && r.blockReduction < u.blockReduction, 'frailer');
});

test('rogue: four-hit combo chains; the fourth knocks down and EXPOSES', () => {
  const t = rogueSetup({ script: { 1: ['attack'], 9: ['attack'], 17: ['attack'], 27: ['attack'] }, foes: [[650]] });
  t.es[0].health = 1e4; t.es[0].stats = { ...t.es[0].stats, maxHealth: 1e4 };
  const states = new Set();
  for (let i = 0; i < 70; i++) { t.world.tick(); states.add(t.p.state); }
  assert(['light2', 'light3', 'light4'].every((s) => states.has(s)), `states ${[...states]}`);
  assert(t.seen('hit').length === 4, `hits ${t.seen('hit').length}`);
  assert(t.seen('exposed').length === 1 && t.es[0].exposed > 0, 'exposed');
});

test('rogue: an exposed enemy takes more damage from EVERY player (co-op), for a while only', () => {
  const hitWith = (expose) => {
    const t = rogueSetup({ ally: ['warrior', 560], foes: [[620]] });
    const e = t.es[0];
    e.health = 1e4; e.stats = { ...e.stats, maxHealth: 1e4 };
    if (expose) t.world.combat.expose(t.p, e);
    t.mate.x = 560; t.mate.controller.script = { 1: ['attack'] }; t.mate.controller.t = 0;
    t.run(14);
    return 1e4 - e.health;
  };
  const plain = hitWith(false); const exp = hitWith(true);
  assert(exp > plain * 1.2, `Ulric hits an exposed man harder (${plain.toFixed(1)} -> ${exp.toFixed(1)})`);
  const t = rogueSetup({ foes: [[700]] });
  t.world.combat.expose(t.p, t.es[0]);
  t.run(CHARACTERS.rogue.kit.expose.duration + 2);
  assert(!(t.es[0].exposed > 0), 'it wears off');
});

test('rogue: viper strike bursts through a line, hits up to its limit, and exposes', () => {
  const t = rogueSetup({ script: { 1: ['heavy'] }, foes: [[660], [690], [720], [750]] });
  for (const e of t.es) { e.health = 1e4; e.stats = { ...e.stats, maxHealth: 1e4 }; }
  t.run(30);
  const hurt = t.es.filter((e) => e.health < 1e4).length;
  assert(hurt === CHARACTERS.rogue.kit.viper.maxTargets, `hit ${hurt}`);
  assert(t.p.x > 720, `she ends up past them (${t.p.x.toFixed(0)})`);
  assert(t.seen('exposed').length >= 1, 'exposed');
});

test('rogue: kick in reach = crescent kick; nobody near = a knife; down = sweep', () => {
  const k = rogueSetup({ script: { 1: ['kick'] }, foes: [[650]] });
  k.run(2);
  assert(k.p.state === 'kick', `kick (${k.p.state})`);
  const n = rogueSetup({ script: { 1: ['kick'] }, foes: [[900]] });
  n.run(30);
  assert(n.seen('knifeThrow').length === 1 && n.es[0].health < n.es[0].stats.maxHealth, 'knife thrown and hit');
  const s = rogueSetup({ script: { 1: ['kick'] }, hold: { down: true }, foes: [[650]] });
  s.run(2);
  assert(s.p.state === 'sweep', `sweep (${s.p.state})`);
});

test('rogue: shadow window — dodging a blow at the last instant, then hitting him, exposes him', () => {
  const t = rogueSetup({ foes: [[650]] });
  const e = t.es[0];
  e.health = 1e4; e.stats = { ...e.stats, maxHealth: 1e4 };
  e.controller.script = { 1: ['attack'] };
  // dodge just as his swing comes out
  t.p.controller.script = { 22: ['dodge'], 51: ['attack'] };
  t.p.controller.hold = (n) => (n >= 22 && n < 24 ? { right: true } : n >= 49 && n < 53 ? { left: true } : {}); // (through him, then turn on him)
  t.run(48);
  t.p.x = e.x + 50; // (back within reach, as a sidestep past him would leave her)
  t.run(23);
  assert(t.seen('shadowWindow').length === 1, `perfect dodge (${t.seen('shadowWindow').length})`);
  assert(t.p.health === t.p.stats.maxHealth, 'untouched');
  assert(t.seen('exposed').length >= 1, 'the answer exposed him');
});

test('rogue: widow mine drops on the move, ignores allies, arms, then blasts enemies outward', () => {
  const t = rogueSetup({ script: { 1: ['magic'] }, hold: { right: true }, ally: ['warrior', 600] });
  t.run(3);
  assert(t.seen('mineDrop').length === 1 && ['walk', 'idle'].includes(t.p.state), `kept moving (${t.p.state})`);
  const m = t.seen('mineDrop')[0].e.mine;
  t.mate.x = m.x; t.mate.z = m.z; // an ally standing right on it
  t.run(60);
  assert(t.seen('mineArmed').length === 1 && t.seen('mineBlast').length === 0, 'armed, allies ignored');
  const a = createEnemy(t.world, 'grunt', m.x + 30, m.z);
  const b = createEnemy(t.world, 'grunt', m.x - 30, m.z);
  const x0 = [a.x, b.x];
  t.run(14);
  assert(t.seen('mineBlast').length === 1, 'blew');
  t.run(10);
  assert(a.x > x0[0] && b.x < x0[1], 'thrown away from the centre');
  assert(t.mate.health === t.mate.stats.maxHealth && t.p.health === t.p.stats.maxHealth, 'no friendly fire');
});

test('rogue: mines are limited — a third replaces the oldest; stacked blasts hurt once', () => {
  const t = rogueSetup({ script: { 1: ['magic'], 90: ['magic'], 180: ['magic'] }, hold: { right: true } });
  t.run(200);
  assert(t.world.mines.list.length === CHARACTERS.rogue.kit.mine.maxActive, `active ${t.world.mines.list.length}`);
  assert(t.seen('mineFizzle').length === 1, 'oldest gone');
  // ten mines under one brute: one blast's worth of damage
  const s = rogueSetup({});
  const boss = createEnemy(s.world, 'gladiator', 900, 420);
  boss.health = 1e4; boss.stats = { ...boss.stats, maxHealth: 1e4 };
  const K = CHARACTERS.rogue.kit.mine;
  for (let i = 0; i < 10; i++) s.world.mines.drop(s.p, 900 + i, 420, { ...K, maxActive: 99, arm: 1 });
  s.run(20);
  const dmg = 1e4 - boss.health;
  assert(dmg > 0 && dmg <= K.damage * 1.01, `one blast (${dmg.toFixed(1)})`);
});

test('rogue: ally vault — running at a teammate and jumping launches far above a jump; the ally is untouched', () => {
  const t = rogueSetup({ ally: ['warrior', 660], hold: { right: true }, script: { 6: ['jump'] } });
  const before = { x: t.mate.x, z: t.mate.z, hp: t.mate.health, st: t.mate.state };
  let top = 0;
  for (let i = 0; i < 90; i++) { t.world.tick(); top = Math.max(top, t.p.h); }
  assert(t.seen('vaultLaunch').length === 1, 'vaulted');
  const j = rogueSetup({ script: { 1: ['jump'] } });
  let jt = 0;
  for (let i = 0; i < 90; i++) { j.world.tick(); jt = Math.max(jt, j.p.h); }
  assert(top > jt * 1.8, `much higher (${top.toFixed(0)} vs ${jt.toFixed(0)})`);
  assert(t.mate.health === before.hp && Math.abs(t.mate.x - before.x) < 0.01 && t.mate.state === before.st, 'ally not moved, hurt or interrupted');
  // standing still next to him: just a jump; and not off the same man again at once
  const s = rogueSetup({ ally: ['warrior', 640], script: { 1: ['jump'] } });
  s.run(3);
  assert(s.seen('vaultLaunch').length === 0, 'no approach, no vault');
});

test('rogue: a mine out of a roll; rolling through a man sticks it on him and it goes off on him', () => {
  const t = rogueSetup({ script: { 1: ['dodge'], 4: ['magic'] }, hold: { right: true }, foes: [[650]] });
  const hp = t.es[0].health;
  let stuck = null; let rolling = false;
  for (let i = 0; i < 95; i++) {
    t.world.tick();
    const m = t.world.mines.list.find((q) => q.stuck);
    if (m && !stuck) { stuck = m; rolling = t.p.state === 'dodge'; }
  }
  assert(stuck && stuck.stuck === t.es[0], 'stuck on the man she rolled through');
  assert(rolling, 'she kept rolling');
  assert(t.seen('mineBlast').length === 1, 'it went off');
  assert(t.seen('mineBlast').length === 1 && t.es[0].health < hp, `it went off on him (${t.es[0].health}/${hp})`);
  const boss = rogueSetup({ script: { 1: ['dodge'], 4: ['magic'] }, hold: { right: true }, foes: [[650, 420, 'warlord']] });
  boss.run(95);
  assert(boss.es[0].alive, 'a boss lives through it');
  const n = rogueSetup({ script: { 1: ['dodge'], 4: ['magic'] }, hold: { right: true }, foes: [] });
  n.run(12);
  assert(n.seen('mineDrop').length === 1 && !n.world.mines.list[0].stuck, 'nobody there: it goes on the floor');
  // a mine never cuts a man in half: bits, or the legs
  const k = rogueSetup({ script: { 1: ['magic'] }, foes: [[610]] });
  k.es[0].health = 1;
  k.run(80);
  const kill = k.seen('kill')[0];
  assert(kill && ['explode', 'limbs', 'none'].includes(kill.e.fatality), `mine kill: ${kill?.e.fatality}`);
});

test('rogue: the mine button in kicking distance plants it on him by hand; out of reach it goes on the floor', () => {
  const t = rogueSetup({ script: { 1: ['magic'] }, foes: [[670]] });
  t.run(3);
  const m = t.world.mines.list[0];
  assert(m && m.stuck === t.es[0] && t.es[0].doom, 'planted on the man in front of her');
  assert(['walk', 'idle'].includes(t.p.state), `no break in stride (${t.p.state})`);
  const hp = t.es[0].health;
  t.run(80);
  assert(t.seen('mineBlast').length === 1 && t.es[0].health < hp, 'it went off on him');
  const behind = rogueSetup({ script: { 1: ['magic'] }, foes: [[530]] });
  behind.run(3);
  assert(!behind.world.mines.list[0].stuck, 'a man behind her: on the floor');
  const far = rogueSetup({ script: { 1: ['magic'] }, foes: [[600 + CHARACTERS.rogue.kit.knife.kickReach + 20]] });
  far.run(3);
  assert(!far.world.mines.list[0].stuck, 'out of kicking distance: on the floor');
});

test('rogue: shuriken on the kick button can be spammed; a man in kicking distance gets the kick', () => {
  const t = rogueSetup({ script: { 1: ['kick'], 9: ['kick'], 17: ['kick'], 25: ['kick'] }, foes: [[1000]] });
  let thrown = 0;
  t.world.events.on('knifeThrow', () => { thrown++; });
  t.run(40);
  assert(thrown === 4, `four presses, four shuriken (${thrown})`);
  const cost = CHARACTERS.rogue.dodge.cost;
  assert(t.p.stamina <= t.p.stats.maxStamina - cost * 2, `each throw costs as much stamina as her roll (${t.p.stamina})`);
  const tired = rogueSetup({ script: { 2: ['kick'] }, foes: [[1000]] });
  let none = 0;
  tired.world.events.on('knifeThrow', () => { none++; });
  tired.p.stamina = cost - 1;
  tired.run(14);
  assert(none === 0, 'out of stamina: no throw, she kicks');
  const e = rogueSetup({ script: { 1: ['kick'] }, foes: [] });
  let alone = 0;
  e.world.events.on('knifeThrow', () => { alone++; });
  e.run(12);
  assert(alone === 1, 'with nobody about she still throws');
  const k = rogueSetup({ script: { 1: ['kick'] }, foes: [[650]] });
  k.run(3);
  assert(k.p.state === 'kick', `in reach: the kick (${k.p.state})`);
});

test('rogue: shuriken fan from a jump; DEATH FROM ABOVE (wider, more) at the top of a vault', () => {
  const t = rogueSetup({ script: { 1: ['jump'], 14: ['kick'] }, foes: [[700], [760, 460]] });
  t.run(60);
  const f = t.seen('fanThrow')[0]?.e;
  assert(f && !f.dfa && f.count === CHARACTERS.rogue.kit.fan.count, `fan ${f?.count}`);
  assert(t.es.some((e) => e.health < e.stats.maxHealth), 'a star struck home');
  const V = CHARACTERS.rogue.kit.vault;
  const apex = 6 + V.plant + Math.round(V.launch / CHARACTERS.rogue.gravity * 60);
  const d = rogueSetup({ ally: ['warrior', 660], hold: (n) => (n < 12 ? { right: true } : {}), script: { 6: ['jump'], [apex]: ['kick'] }, foes: [[800], [840, 380], [880, 470]] });
  d.run(apex + 60);
  const g = d.seen('fanThrow')[0]?.e;
  assert(g && g.dfa && g.count === CHARACTERS.rogue.kit.fan.dfaCount, `death from above (${g?.dfa}, ${g?.count})`);
});

test('rogue: falling viper dives onto the man below, hurts him, exposes him, staggers those round him', () => {
  const t = rogueSetup({ ally: ['warrior', 660], hold: (n) => (n < 12 ? { right: true } : {}), script: { 6: ['jump'], 40: ['heavy'] }, foes: [[800], [830, 440]] });
  t.es[0].health = 1e4; t.es[0].stats = { ...t.es[0].stats, maxHealth: 1e4 };
  t.run(120);
  assert(t.seen('diveLand').length === 1, 'landed');
  assert(t.es[0].health < 1e4 && t.es[0].exposed > 0, 'struck and exposed');
  assert(t.p.state === 'idle' || t.p.state === 'walk', `back on her feet (${t.p.state})`);
});

for (const [button, kind] of [['attack', 'phantom'], ['heavy', 'lotus'], ['kick', 'scarlet']]) {
  test(`rogue finisher: ${button} behind runners = ${kind}, for 1, 2 and 3 runners — all die`, () => {
    for (const n of [1, 2, 3]) {
      const t = rogueSetup({ script: { 1: [button] } });
      const rs = [[700, 420], [780, 440], [850, 400]].slice(0, n).map(([x, z]) => {
        const r = t.world.addFighter(new Fighter({ stats: ENEMIES.grunt, team: 'enemy', x, z, controller: new Scripted() }));
        r.controller.scared = true; r.maimed = { armB: true }; r.facing = 1; r.vx = 90;
        return r;
      });
      const kills = [];
      t.world.events.on('kill', (e) => kills.push(e));
      t.run(3);
      assert(t.p.state === 'execute' && t.p.exec.kind === kind && t.p.exec.targets.length === n, `${n}: ${t.p.state} ${t.p.exec?.kind}`);
      t.run(ROGUE_FINISHERS[kind].total + 40);
      assert(kills.length === n && kills.every((k) => k.finisher === kind), `${n}: kills ${kills.map((k) => k.finisher)}`);
      assert(rs.every((r) => !r.alive && r.state !== 'executed'), `${n}: ${rs.map((r) => r.state)}`);
      assert(t.p.state === 'idle' && t.p.h === 0, `${n}: back down (${t.p.state}, h ${t.p.h})`);
    }
  });
}

test('rogue: MARK OF DEATH — a teammate hitting her marked man lands a super critical (and spends the mark)', () => {
  const hitWith = (expose) => {
    const t = rogueSetup({ ally: ['warrior', 560], foes: [[620]] });
    const e = t.es[0];
    e.health = 1e4; e.stats = { ...e.stats, maxHealth: 1e4 };
    if (expose) t.world.combat.expose(t.p, e);
    let crit = false;
    t.world.events.on('hit', (h) => { if (h.superCrit) crit = true; });
    t.mate.controller.script = { 1: ['attack'] }; t.mate.controller.t = 0;
    t.run(14);
    return { dmg: 1e4 - e.health, crit, left: e.exposed };
  };
  const plain = hitWith(false); const m = hitWith(true);
  assert(m.crit && m.dmg > plain.dmg * 2.2, `super critical (${plain.dmg.toFixed(0)} -> ${m.dmg.toFixed(0)})`);
  assert(!(m.left > 0), 'the mark is spent');
  assert(CHARACTERS.rogue.kit.expose.duration === 345, 'lasts ~15% longer');
  // a lethal super crit tears him apart
  const k = rogueSetup({ ally: ['warrior', 560], foes: [[620, 420, 'butcher']] });
  k.world.combat.expose(k.p, k.es[0]);
  k.es[0].health = 5;
  const kills = [];
  k.world.events.on('kill', (e) => kills.push(e));
  k.mate.controller.script = { 1: ['attack'] }; k.mate.controller.t = 0;
  k.run(14);
  assert(kills[0]?.fatality === 'explode', `carnage (${kills[0]?.fatality})`);
});

test('rogue: she dives out of a plain jump and out of a double jump', () => {
  for (const script of [{ 1: ['jump'], 10: ['heavy'] }, { 1: ['jump'], 14: ['jump'], 18: ['heavy'] }]) {
    const t = rogueSetup({ script, foes: [[700]] });
    t.run(60);
    assert(t.seen('diveLand').length === 1, `dived (${JSON.stringify(script)})`);
  }
});

test('rogue: her jump is the highest of the three', () => {
  const top = (id) => { const w = new World(); const f = w.addFighter(new Fighter({ stats: CHARACTERS[id], team: 'player', x: 400, z: 420, controller: new Scripted({ 1: ['jump'] }) })); let m = 0; for (let i = 0; i < 90; i++) { w.tick(); m = Math.max(m, f.h); } return m; };
  assert(top('rogue') > top('warrior') * 1.3 && top('rogue') > top('mage'), `${top('rogue').toFixed(0)} vs ${top('warrior').toFixed(0)}`);
});

test('rogue: everything she does is the same on two machines (lockstep)', () => {
  const play = () => {
    const t = rogueSetup({ ally: ['warrior', 680], hold: (n) => (n < 14 ? { right: true } : {}), script: { 2: ['magic'], 8: ['jump'], 40: ['kick'], 90: ['heavy'], 120: ['kick'], 150: ['attack'], 160: ['attack'] }, foes: [[800], [840, 440], [900, 380], [1000]] });
    t.run(360);
    return t.world.fighters.map((f) => `${f.x.toFixed(3)},${f.z.toFixed(3)},${f.health.toFixed(2)},${f.state}`).join('|');
  };
  assert(play() === play(), 'same fight both times');
});

// ---------------------------------------------------------------- the stage (THE OATH ROAD)

function stageSetup() {
  const world = new World();
  const p = world.addFighter(new Fighter({ stats: CHARACTERS.warrior, team: 'player', x: 200, z: 430, controller: new Scripted() }));
  const stage = new Stage(world);
  const ev = [];
  for (const n of ['sectionStart', 'sectionClear', 'propBreak', 'pickup', 'hazardHit', 'bossSpawn', 'bossRage', 'stageWon', 'secretFound']) world.events.on(n, () => ev.push(n));
  stage.start(p);
  const killAll = () => { for (const f of world.fighters) if (f.team === 'enemy') { f.health = 0; f.fsm.change('dead'); f.removeMe = true; } };
  return { world, p, stage, ev, killAll, run: (n) => { for (let i = 0; i < n; i++) { world.tick(); stage.update(); } } };
}

test('stage: the first section locks the camera bounds and sends its waves in turn', () => {
  const t = stageSetup();
  const sec = t.stage.sections[0];
  assert(t.world.bounds.maxX === sec.x1 - 30, `locked to the section, maxX ${t.world.bounds.maxX}`);
  t.run(60);
  const n1 = t.stage.livingFoes().length;
  assert(n1 === sec.waves[0].length, `first wave ${n1}`);
  t.killAll(); t.run(70);
  assert(t.stage.livingFoes().length === sec.waves[1].length, 'second wave came in');
  t.killAll(); t.run(70);
  assert(t.ev.includes('sectionClear') && t.stage.phase === 'clear', `cleared, phase ${t.stage.phase}`);
  assert(t.world.bounds.maxX === t.stage.sections[1].x1 - 30, 'the way on is open');
  t.p.x = t.stage.sections[1].x0 + 320; t.run(2);
  assert(t.stage.index === 1 && t.world.bounds.minX === t.stage.sections[1].x0 + 30, `entered section 2, locked behind (${t.stage.index})`);
});

test('stage: breaking a crate drops food that heals when walked over', () => {
  const t = stageSetup();
  const crate = t.stage.props.find((p) => p.kind === 'crate' && p.drop === 'health');
  t.p.x = crate.x - 50; t.p.z = crate.z; t.p.facing = 1; t.p.health = 50;
  for (let i = 0; i < 2; i++) { t.p.controller.registerPress('attack'); t.run(30); }
  assert(crate.broken, `crate broken (hp ${crate.hp})`);
  t.p.x = crate.x; t.p.z = Math.min(515, crate.z + 14); t.run(25);
  assert(t.ev.includes('pickup') && t.p.health > 50, `healed to ${t.p.health}`);
});

test('stage: fire grates burn whoever stands on them when they erupt; blades cut their lane', () => {
  const t = stageSetup();
  const fire = t.stage.hazards.find((h) => h.type === 'fire');
  t.stage.enterSection(fire.section, true); // as if we'd walked there
  const g = t.world.addFighter(new Fighter({ stats: ENEMIES.grunt, team: 'enemy', x: fire.x, z: fire.z, controller: new Scripted() }));
  fire.t = 150; // just before it goes off
  t.run(20);
  assert(g.health < g.stats.maxHealth && t.ev.includes('hazardHit'), `enemy burned (${g.health})`);
  const blade = t.stage.hazards.find((h) => h.type === 'blade');
  t.stage.enterSection(blade.section, true);
  const v = t.world.addFighter(new Fighter({ stats: ENEMIES.grunt, team: 'enemy', x: blade.x, z: blade.z, controller: new Scripted() }));
  blade.t = 0; // at the bottom of its swing, moving fast
  t.run(2);
  assert(v.health < v.stats.maxHealth && v.state === 'knockdown', `cut by the blade (${v.health} ${v.state})`);
});

test('stage: a kicked crate skids down the lane and bursts on the first enemy, flooring him', () => {
  const t = stageSetup();
  const crate = t.stage.props.find((p) => p.kind === 'crate' && p.drop === 'health');
  const x0 = crate.x;
  t.p.x = crate.x - 50; t.p.z = crate.z; t.p.facing = 1;
  const g = t.world.addFighter(new Fighter({ stats: ENEMIES.grunt, team: 'enemy', x: crate.x + 260, z: crate.z, controller: new Scripted() }));
  const far = t.world.addFighter(new Fighter({ stats: ENEMIES.grunt, team: 'enemy', x: crate.x + 260, z: crate.z + 120, controller: new Scripted() }));
  t.p.controller.registerPress('kick'); t.run(30);
  assert(crate.fly && !crate.broken && crate.x > x0, `sent skidding, not broken (x ${crate.x}, hp ${crate.hp})`);
  t.run(60);
  assert(crate.broken && crate.x > x0 + 150, `burst where it met him (x ${crate.x - x0})`);
  assert(g.health < g.stats.maxHealth && g.state === 'knockdown', `the grunt took it (${g.health} ${g.state})`);
  assert(far.health === far.stats.maxHealth, 'a man in another lane is untouched');
  assert(t.stage.pickups.some((k) => Math.abs(k.x - crate.x) < 1), 'its food spills where it burst');
  // nobody in the way: it breaks where it runs out of floor
  const u = stageSetup();
  const c2 = u.stage.props.find((p) => p.kind === 'crate' && p.drop === 'health');
  u.p.x = c2.x - 50; u.p.z = c2.z; u.p.facing = 1;
  u.p.controller.registerPress('kick'); u.run(120);
  assert(c2.broken && c2.x > x0 + 300, `broke at the end of its skid (${c2.x - x0})`);
});

test('stage: a hero striking a pendulum blade hurls it back through his enemies, not him', () => {
  for (const who of ['warrior', 'mage']) {
    const t = stageSetup();
    const blade = t.stage.hazards.find((h) => h.type === 'blade');
    t.stage.enterSection(blade.section, true);
    if (who === 'mage') t.p.stats = CHARACTERS.mage;
    t.p.x = blade.x - 60; t.p.z = blade.z + 26; t.p.facing = 1;
    const v = t.world.addFighter(new Fighter({ stats: ENEMIES.grunt, team: 'enemy', x: blade.x + 130, z: blade.z, controller: new Scripted() }));
    let struck = null;
    t.world.events.on('bladeStruck', (e) => { struck = e; });
    blade.t = 60; // coming down toward the bottom of its arc
    t.p.controller.registerPress(who === 'mage' ? 'kick' : 'attack');
    const hp = t.p.health;
    t.run(60);
    assert(struck && struck.dir === 1 && struck.force === (who === 'mage'), `${who}: struck (${JSON.stringify(struck && { d: struck.dir, f: struck.force })})`);
    assert(v.health <= v.stats.maxHealth - 60 || !v.alive, `${who}: it went through the grunt (${v.health})`);
    assert(t.p.health === hp, `${who}: and spared the hero (${t.p.health})`);
    t.run(200);
    assert(!blade.driven, `${who}: then it settles back into its swing`);
  }
});

test('stage: dying sends you back to the checkpoint, healed, the fight reset', () => {
  const t = stageSetup();
  t.run(60);
  t.p.health = 0; t.p.fsm.change('dead');
  t.stage.respawn();
  assert(t.p.alive && t.p.health === t.p.stats.maxHealth && t.p.state === 'idle', 'risen');
  assert(t.stage.stats.deaths === 1 && t.stage.index === 0, 'at the first checkpoint');
  t.run(3);
  assert(t.world.fighters.filter((f) => f.team === 'enemy').length === 0, 'enemies cleared');
});

test('boss: the Warlord walks in from off-screen, stomping, heroes frozen; untouchable until he arrives; huge health', () => {
  const t = stageSetup();
  const sec = t.stage.sections.length - 1;
  t.stage.enterSection(sec, true);
  t.stage.waveIndex = 99; t.stage.waveDelay = 0;
  let stomps = 0; let arrived = false;
  t.world.events.on('bossStomp', () => stomps++);
  t.world.events.on('bossArrived', () => { arrived = true; });
  t.run(2);
  const b = t.stage.boss;
  assert(b && b.stats.id === 'warlord', `the Warlord (${b?.stats.id})`);
  assert(b.x > t.world.bounds.maxX, `starts off the edge (${Math.round(b.x)} > ${t.world.bounds.maxX})`);
  assert(b.stats.maxHealth >= 240 * 6, `hella hp (${b.stats.maxHealth})`);
  const x0 = t.p.x;
  t.p.controller.hold = { right: true };
  t.run(60);
  assert(Math.abs(t.p.x - x0) < 0.01 && t.p.awe > 0, 'the hero is frozen in place');
  assert(b.invincible, 'untouchable while he comes');
  t.run(400);
  assert(arrived && stomps >= 5, `arrived, stomping (${stomps})`);
  assert(b.x <= t.world.bounds.maxX && b.state !== 'bossEntrance', 'in the room, fighting');
  t.run(40);
  assert(Math.abs(t.p.x - x0) > 1, 'the hero can move again');
  assert(t.stage.livingFoes().length === 1, 'no helpers yet (they come at half health)');
});

test('boss: while he walks in, the whole field freezes: foes mid-swing, his escort, knives in flight, traps', () => {
  const t = stageSetup();
  const sec = t.stage.sections.length - 1;
  t.stage.enterSection(sec, true);
  t.stage.waveIndex = 99; t.stage.waveDelay = 0;
  // a grunt right beside the hero, about to swing
  const g = createEnemy(t.world, 'grunt', t.p.x + 50, t.p.z);
  g.controller = new Scripted({ 2: ['attack'], 6: ['attack'], 12: ['attack'] });
  g.facing = -1;
  t.stage.spawnBoss(); // (with a man still standing: a phase's adds, a straggler)
  assert(t.stage.boss && t.world.hold, 'the boss is walking in, the field held');
  // a knife already in the air, and a man who arrives while he walks (like his escort)
  const knife = t.world.spawnProjectile(g, { w: 10, h: 6, speed: 0, damage: 20, lifetime: 600, y: 40 }, { x: t.p.x + 200, z: t.p.z, h: 40, vx: -300 });
  t.stage.spawnWave(['grunt']);
  const late = t.world.fighters[t.world.fighters.length - 1];
  const hp = t.p.health; const gx = g.x; const kx = knife.x; const lx = late.x;
  const hazards = t.stage.hazards.map((hz) => hz.t);
  t.run(90);
  assert(t.p.health === hp, `nobody hurts the frozen hero (${hp} -> ${t.p.health})`);
  assert(g.x === gx && g.state === 'idle', `the grunt beside him stands still (${g.state})`);
  assert(knife.x === kx && knife.alive, 'the knife hangs in the air');
  assert(late.x === lx, 'the newcomer waits');
  assert(t.stage.hazards.every((hz, i) => hz.t === hazards[i]), 'the traps wait');
  assert(t.stage.boss.state === 'bossEntrance' && t.stage.boss.x < t.stage.boss.entrance.toX + 999, 'only the boss moves');
  t.run(600);
  assert(!t.world.hold && t.p.awe === 0 && g.awe === 0, 'then the fight resumes');
  assert(knife.x !== kx || !knife.alive, 'the knife flies on');
});

test('stage: the throne spawns the boss, he rages at half health, killing him wins', () => {
  const t = stageSetup();
  t.stage.enterSection(t.stage.sections.length - 1, true);
  t.run(50);
  assert(t.ev.includes('bossSpawn') && t.stage.boss?.stats.boss, 'boss spawned');
  const b = t.stage.boss;
  assert(b.stats.maxHealth > ENEMIES.gladiator.maxHealth * 3, `boss health ${b.stats.maxHealth}`);
  b.health = b.stats.maxHealth * 0.4; t.run(2);
  assert(t.ev.includes('bossRage'), 'rage');
  t.killAll(); t.run(5);
  assert(t.ev.includes('stageWon') && t.stage.phase === 'won', `won (${t.stage.phase})`);
});

test('blade: a struck blade reverses where it is (no jump); its chain snaps and the heavy blade swings, then all settles', () => {
  const t = stageSetup();
  const blade = t.stage.hazards.find((h) => h.type === 'blade');
  t.stage.enterSection(blade.section, true);
  t.p.x = blade.x - 60; t.p.z = blade.z + 26; t.p.facing = 1;
  const chain = new BladeChain();
  let struckAt = -1;
  t.world.events.on('bladeStruck', (e) => { struckAt = t.world.frame; chain.kick(e.dir, 1); });
  const bend = () => Math.max(...chain.w.map(Math.abs));
  blade.t = 60;
  let last = t.stage.bladeState(blade).a;
  let jump = 0; let calm = 0; let whip = 0; let swing = 0;
  for (let i = 0; i < 700; i++) {
    if (i === 30) t.p.controller.registerPress('attack');
    t.run(1);
    const s = t.stage.bladeState(blade);
    jump = Math.max(jump, Math.abs(s.a - last));
    last = s.a;
    chain.step(1, 320, s.omega);
    if (struckAt < 0) calm = Math.max(calm, bend(), Math.abs(chain.bladeTilt(320)) * 10);
    else if (t.world.frame - struckAt < 40) { whip = Math.max(whip, bend()); swing = Math.max(swing, Math.abs(chain.bladeTilt(320))); }
  }
  assert(struckAt >= 0, 'struck');
  assert(jump < 0.08, `the blade never jumps (${jump.toFixed(3)} rad in one frame)`);
  assert(calm < 1, `a plain swing leaves the chain straight and the blade in line (${calm.toFixed(2)})`);
  assert(whip > 3 && whip <= CHAIN_PHYS.maxBend, `the blow snaps the chain (${whip.toFixed(1)} px)`);
  assert(swing > 0.08 && swing <= CHAIN_PHYS.bladeMax + 0.1, `and swings the blade on its end (${swing.toFixed(2)} rad)`);
  assert(bend() < 1 && Math.abs(chain.bladeTilt(320)) < 0.05 && Math.abs((blade.amp ?? 1) - 1) < 0.01, 'then everything settles back');
});

// The Warlord's Earthbreaker: a scripted Malgor and up to three heroes standing about.
function quakeSetup({ heroes = [[520, 420, {}]], boss = { 1: ['special2'] } } = {}) {
  const world = new World();
  const b = world.addFighter(new Fighter({ stats: ENEMIES.warlord, team: 'enemy', x: 400, z: 420, controller: new Scripted(boss) }));
  b.facing = 1;
  const ps = heroes.map(([x, z, hold, script]) => {
    const p = world.addFighter(new Fighter({ stats: CHARACTERS.warrior, team: 'player', x, z, controller: new Scripted(script ?? {}, hold) }));
    p.facing = -1;
    return p;
  });
  const ev = [];
  for (const n of ['hit', 'block', 'parry', 'guardBreak', 'quakeSlam', 'quakeWave', 'quakeHit', 'quakeEnd']) world.events.on(n, (e) => ev.push([n, e]));
  return { world, b, ps, ev, run: (n) => { for (let i = 0; i < n; i++) world.tick(); } };
}

test('Earthbreaker: the boss\'s slam goes through a guard, shakes the screen and floors you', () => {
  const t = quakeSetup({ heroes: [[520, 420, { block: true }]] });
  const m = ENEMIES.warlord.moves.special2;
  t.run(3);
  assert(t.ps[0].state === 'block', `hero blocking (${t.ps[0].state})`);
  t.run(m.startup + 4);
  const names = t.ev.map(([n]) => n);
  assert(!names.includes('block') && !names.includes('guardBreak'), `no guard against it (${names})`);
  assert(names.includes('quakeSlam'), 'the floor is struck');
  const hit = t.ev.find(([n, e]) => n === 'hit' && e.defender === t.ps[0]);
  assert(hit && hit[1].move.shake >= 12, 'a hard hit with a big screen shake');
  assert(t.ps[0].state === 'knockdown', `knocked down (${t.ps[0].state})`);
});

test('Earthbreaker: a parry can\'t stop it either', () => {
  const m = ENEMIES.warlord.moves.special2;
  const t = quakeSetup({ heroes: [[520, 420, {}, { [m.startup - 2]: ['block'] }]] });
  t.run(m.startup + 4);
  assert(!t.ev.some(([n]) => n === 'parry'), 'no parry');
  assert(t.ps[0].state === 'knockdown', `knocked down (${t.ps[0].state})`);
});

test('Earthbreaker: the shockwave rolls both ways across the whole lane; on the ground = knocked down, in the air = it rolls under', () => {
  const m = ENEMIES.warlord.moves.special2;
  const K = m.shockwave;
  // far right, standing / far left, at the other edge of the lane / far right, jumping just as it arrives
  const impact = 400 + (m.hitbox.x + m.hitbox.w) * 0.8;
  const jumpAt = m.startup + 1 + Math.round(((800 - impact) - 110) / K.speed * 60); // (a beat before it arrives)
  const t = quakeSetup({ heroes: [[750, 300, {}], [100, 510, {}], [800, 420, { jump: true }, { [jumpAt]: ["jump"] }]] });
  const [stand, behind, jumper] = t.ps;
  t.run(m.startup + 2);
  assert(t.ev.filter(([n]) => n === 'quakeWave').length === 2, 'one wave each way');
  let jumperCleared = false;
  for (let i = 0; i < 120; i++) {
    t.run(1);
    if (jumper.h > K.clear && t.world.quakes.list.some((w) => w.dir > 0 && Math.abs(w.x - jumper.x) < 40)) jumperCleared = true;
  }
  const hitBy = new Set(t.ev.filter(([n]) => n === 'quakeHit').map(([, e]) => e.fighter));
  assert(hitBy.has(stand) && hitBy.has(behind), 'both heroes on the ground went down, in front and behind, near and far in the lane');
  assert(jumperCleared, 'the jumper was in the air as it passed');
  assert(!hitBy.has(jumper), 'the jumper cleared it');
  assert(jumper.health === jumper.stats.maxHealth, 'and took no damage');
  assert(t.ev.some(([n]) => n === 'quakeEnd') && t.world.quakes.list.length === 0, 'the waves die out');
});

test('Earthbreaker: a blocking hero is still floored by the wave, and his own side is never hurt', () => {
  const t = quakeSetup({ heroes: [[800, 420, { block: true }]] });
  const grunt = createEnemy(t.world, 'grunt', 700, 420);
  t.run(150);
  const hitBy = t.ev.filter(([n]) => n === 'quakeHit').map(([, e]) => e.fighter);
  assert(hitBy.includes(t.ps[0]), 'blocking doesn\'t stop the wave');
  assert(!hitBy.includes(grunt) && grunt.health === grunt.stats.maxHealth, 'the boss\'s men are untouched');
});

test('Earthbreaker: not twice in a row (cooldown), and the boss\'s brain does use it', () => {
  const m = ENEMIES.warlord.moves.special2;
  const t = quakeSetup({ heroes: [[900, 420, {}]], boss: { 1: ['special2'], [m.startup + m.active + m.recovery + 5]: ['special2'] } });
  t.run(m.startup + m.active + m.recovery + 10);
  assert(t.ev.filter(([n]) => n === 'quakeSlam').length === 1, 'the second press is refused while cooling down');
  // the real AI, left to fight a hero who just stands there
  const world = new World({ seed: 7 });
  const p = world.addFighter(new Fighter({ stats: CHARACTERS.warrior, team: 'player', x: 300, z: 420, controller: new Scripted() }));
  createEnemy(world, 'warlord', 600, 420);
  let slams = 0;
  world.events.on('quakeSlam', () => slams++);
  for (let i = 0; i < 60 * 40 && !slams; i++) { p.health = p.stats.maxHealth; world.tick(); }
  assert(slams > 0, 'he slams the ground in a fight');
});

test('balance: the Mage and Rogue pay for their spells', () => {
  // Chain Lightning: the cast and each follow-up strike cost mana; no mana, no follow-up
  const M = CHARACTERS.mage;
  const combo = mageSetup({ script: { 1: ['heavy'], 24: ['heavy'], 44: ['heavy'] }, foes: [[720]] });
  combo.es[0].health = 1e4; combo.es[0].stats = { ...combo.es[0].stats, maxHealth: 1e4 };
  combo.run(70);
  const paid = M.moves.heavy.manaCost + M.kit.bolt.combo.manaCost[1] + M.kit.bolt.combo.manaCost[2];
  assert(combo.p.mana <= M.maxMana - paid + M.manaRegen * 2, `three strikes cost ${paid} (left ${combo.p.mana.toFixed(0)})`);
  const dry = mageSetup({ script: { 1: ['heavy'], 24: ['heavy'] }, foes: [[720]] });
  dry.es[0].health = 1e4; dry.es[0].stats = { ...dry.es[0].stats, maxHealth: 1e4 };
  let strikes = 0;
  dry.world.events.on('boltCast', () => { strikes++; });
  dry.p.mana = M.moves.heavy.manaCost; dry.p.stats = { ...dry.p.stats, manaRegen: 0 };
  dry.run(60);
  assert(strikes === 1, `no mana left: no follow-up (${strikes})`);
  // Force Blast costs mana and can't go off without it
  const force = mageSetup({ script: { 1: ['kick'] }, foes: [[700]] });
  force.p.stats = { ...force.p.stats, manaRegen: 0 };
  force.run(4);
  assert(force.p.mana === M.maxMana - M.moves.kick.manaCost, `force blast costs ${M.moves.kick.manaCost} (left ${force.p.mana})`);
  const noForce = mageSetup({ script: { 1: ['kick'] }, foes: [[700]] });
  noForce.p.mana = M.moves.kick.manaCost - 1;
  noForce.run(4);
  assert(noForce.p.state !== 'force', `no mana: no force blast (${noForce.p.state})`);
  // his melee pays him back: mana equal to the damage the blow dealt, never past max; spells don't
  const staff = mageSetup({ script: {}, foes: [[700]] });
  const foe = staff.es[0];
  foe.health = 1e4; foe.stats = { ...foe.stats, maxHealth: 1e4 };
  staff.p.mana = 10;
  const before = foe.health;
  staff.world.combat.resolve(staff.p, foe, M.moves.light1, { kind: 'melee', fromX: staff.p.x, dir: 1, contact: { x: foe.x, h: 60 } });
  const dealt = before - foe.health;
  assert(dealt > 0 && Math.abs(staff.p.mana - (10 + dealt)) < 1e-9, `a staff blow gives ${dealt.toFixed(1)} mana (now ${staff.p.mana.toFixed(1)})`);
  staff.p.mana = M.maxMana - 1;
  staff.world.combat.resolve(staff.p, foe, M.moves.light1, { kind: 'melee', fromX: staff.p.x, dir: 1, contact: { x: foe.x, h: 60 } });
  assert(staff.p.mana === M.maxMana, `melee mana caps at max (${staff.p.mana})`);
  staff.p.mana = 10;
  staff.world.combat.resolve(staff.p, foe, M.moves.light1, { kind: 'magic', fromX: staff.p.x, dir: 1, contact: { x: foe.x, h: 60 } });
  assert(staff.p.mana === 10, `spells give no mana (${staff.p.mana})`);
  // Widow Mine: mana per mine, none without it
  const R = CHARACTERS.rogue;
  const mine = rogueSetup({ script: { 1: ['magic'] }, foes: [] });
  mine.p.stats = { ...mine.p.stats, manaRegen: 0 };
  mine.run(3);
  assert(mine.world.mines.list.length === 1 && mine.p.mana === R.maxMana - R.spell.cost, `a mine costs ${R.spell.cost} mana (left ${mine.p.mana})`);
  const noMine = rogueSetup({ script: { 1: ['magic'] }, foes: [] });
  noMine.p.mana = R.spell.cost - 1;
  noMine.run(3);
  assert(noMine.world.mines.list.length === 0, 'no mana: no mine');
  // Shuriken Fan costs stamina
  const fan = rogueSetup({ script: { 1: ['jump'], 12: ['kick'] }, foes: [[900]] });
  let fans = 0;
  fan.world.events.on('attackStart', (e) => { if (e.state === 'fan') fans++; });
  fan.run(16);
  assert(fans === 1 && fan.p.stamina <= R.maxStamina - R.kit.fan.stamina + 1, `the fan costs ${R.kit.fan.stamina} stamina (left ${fan.p.stamina.toFixed(0)})`);
});

test('balance: every stage fight is twice the size it was', () => {
  const sizes = STAGE.sections.flatMap((s) => s.waves).map((w) => w.length);
  assert(sizes.every((n) => n >= 4), `every wave at least four strong (${sizes})`);
  const adds = STAGE.sections.find((s) => s.boss).boss.adds;
  assert(adds.length >= 8, `the boss calls eight men (${adds.length})`);
});

// ---------------------------------------------------------------- terrain (ledges, pits, lifts)

function terrainSetup(defs, { hero = 'warrior', x = 300, z = 420, script = {}, hold = {} } = {}) {
  const world = new World({ seed: 3 });
  world.terrain = new Terrain(world, defs);
  const p = world.addFighter(new Fighter({ stats: CHARACTERS[hero], team: 'player', x, z, controller: new Scripted(script, hold) }));
  p.floor = world.terrain.groundAt(x, z); p.h = p.floor;
  return { world, p, run: (n) => { for (let i = 0; i < n; i++) world.tick(); } };
}

test('terrain: a ledge taller than a step is a wall; jump high enough and he lands on top', () => {
  const ledge = [{ kind: 'block', x0: 360, x1: 520, z0: 380, z1: 460, top: 60 }];
  const walk = terrainSetup(ledge, { hold: { right: true } });
  walk.run(60);
  assert(walk.p.x < 360 && walk.p.h === 0, `walked into the wall and stopped (${walk.p.x.toFixed(0)})`);
  const jump = terrainSetup(ledge, { x: 330, script: { 2: ['jump'] }, hold: { right: true, jump: true } });
  jump.run(70);
  assert(jump.p.x > 360 && jump.p.h === 60 && jump.p.grounded, `on top of the ledge (x ${jump.p.x.toFixed(0)}, h ${jump.p.h})`);
  const low = terrainSetup([{ kind: 'block', x0: 360, x1: 520, z0: 380, z1: 460, top: STEP - 2 }], { hold: { right: true } });
  low.run(40);
  assert(low.p.x > 380 && low.p.h === STEP - 2, 'a low step he simply walks up');
});

test('terrain: walking off a ledge drops him, and coyote time still lets him jump', () => {
  const defs = [{ kind: 'block', x0: 0, x1: 320, z0: 282, z1: 520, top: 80 }];
  const t = terrainSetup(defs, { x: 300, hold: { right: true } });
  for (let i = 0; i < 30 && t.p.x < 335; i++) t.run(1);
  assert(t.p.state === 'jump' && t.p.h < 80, `stepped off and is falling (${t.p.state})`);
  t.run(40);
  assert(t.p.h === 0 && t.p.grounded, 'landed on the floor');
  // pressed jump a few frames after running off the edge: still a jump
  const c = terrainSetup(defs, { x: 300, hold: { right: true, jump: true } });
  for (let i = 0; i < 30 && c.p.x <= 320; i++) c.run(1);
  c.run(3);
  c.p.controller.registerPress('jump');
  c.run(2);
  assert(c.p.vh > 300, `coyote jump (vh ${c.p.vh.toFixed(0)})`);
});

test('jump: let go early for a short hop, hold for the full height', () => {
  const peak = (holdFrames) => {
    const t = terrainSetup([], { script: { 1: ['jump'] }, hold: (n) => ({ jump: n <= holdFrames }) });
    let top = 0;
    for (let i = 0; i < 80; i++) { t.run(1); top = Math.max(top, t.p.h); }
    return top;
  };
  const full = peak(99); const hop = peak(3);
  assert(hop < full * 0.6 && hop > 15, `short hop ${hop.toFixed(0)} vs full ${full.toFixed(0)}`);
});

test('terrain: a pit swallows an enemy (a kill) and spits a hero back onto safe ground, a little hurt', () => {
  const stage = { sections: [{ id: 'a', name: 'A', x0: 0, x1: 1200, waves: [], props: [], hazards: [], spawn: { x: 200, z: 420 } }],
    terrain: [{ kind: 'pit', x0: 400, x1: 520, z0: 282, z1: 520 }] };
  const world = new World({ seed: 4 });
  const p = world.addFighter(new Fighter({ stats: CHARACTERS.warrior, team: 'player', x: 200, z: 420, controller: new Scripted({}, { right: true }) }));
  const st = new Stage(world, stage);
  st.start(p);
  const e = createEnemy(world, 'grunt', 460, 420);
  e.floor = -2000; e.h = -1; // (already dropping into it: no chance to jump clear)
  let kills = 0; let falls = 0;
  world.events.on('kill', (k) => { if (k.pit) kills++; });
  let backAt = null;
  world.events.on('pitFall', ({ fighter, to }) => { if (fighter === p) { falls++; backAt = { ...to, h: p.h }; } });
  for (let i = 0; i < 200; i++) { world.tick(); st.update(); }
  assert(kills === 1 && !world.fighters.includes(e), 'the enemy over the pit fell to his death');
  // (he holds right the whole time, so he walks back in again and again: 20% a fall)
  assert(falls >= 1 && Math.abs(p.health - p.stats.maxHealth * (1 - 0.2 * falls)) < 0.5, `each fall costs 20% (${falls} falls, ${p.health.toFixed(0)} left)`);
  assert(backAt.x < 400 - 20 && backAt.h === 0, `put back on safe ground short of the edge (x ${backAt.x.toFixed(0)})`);
});

test('terrain: a lift carries whoever stands on it; a rotten plank shakes, gives way and comes back', () => {
  const lift = terrainSetup([{ kind: 'lift', x0: 260, x1: 340, z0: 380, z1: 460, top: 20, move: { axis: 'top', range: 100, period: 240 } }]);
  lift.run(120);
  assert(lift.p.grounded && lift.p.h > 100, `ridden up (h ${lift.p.h.toFixed(0)})`);
  lift.run(120);
  assert(lift.p.grounded && lift.p.h < 30, `and down again (h ${lift.p.h.toFixed(0)})`);
  const plank = terrainSetup([{ kind: 'crumble', x0: 260, x1: 340, z0: 380, z1: 460, top: 50, fall: 30, back: 100 }]);
  plank.run(20);
  assert(plank.p.h === 50, 'holds for a moment');
  plank.run(40);
  assert(plank.p.h === 0 && !plank.world.terrain.blocks[0].solid, 'gave way under him');
  plank.p.x = 600;
  plank.run(110);
  assert(plank.world.terrain.blocks[0].solid, 'back after a while');
});

test('terrain: the Mage blinks over a pit and up onto a ledge he can clear, but never into a wall', () => {
  const wall = [{ kind: 'block', x0: 420, x1: 600, z0: 282, z1: 520, top: 200 }];
  const t = terrainSetup(wall, { hero: 'mage', script: { 2: ['dodge'] }, hold: { right: true } });
  t.run(30);
  assert(t.p.x < 420, `stopped short of the wall (x ${t.p.x.toFixed(0)})`);
  const pit = [{ kind: 'pit', x0: 340, x1: 520, z0: 282, z1: 520 }];
  const g = terrainSetup(pit, { hero: 'mage', script: { 2: ['dodge'] }, hold: { right: true } });
  g.run(30);
  assert(g.p.x > 520 && g.p.h === 0, `across the pit (x ${g.p.x.toFixed(0)})`);
});

test('enemies: a crouch, then the hop up a ledge after you; a short hop down to you, not a stumble off the edge', () => {
  // up: the hero on a 70 px ledge, the grunt below
  const world = new World({ seed: 6 });
  world.terrain = new Terrain(world, [{ kind: 'block', x0: 500, x1: 800, z0: 282, z1: 520, top: 70 }]);
  const p = world.addFighter(new Fighter({ stats: CHARACTERS.warrior, team: 'player', x: 620, z: 420, controller: new Scripted() }));
  p.floor = 70; p.h = 70;
  const e = createEnemy(world, 'grunt', 380, 420);
  let crouched = 0; let jumped = -1; let top = 0;
  for (let i = 0; i < 200; i++) {
    world.tick(); p.health = 999;
    if (e.jumpPrep > 0 && e.grounded && jumped < 0) crouched++;
    if (e.state === 'jump' && jumped < 0) jumped = i;
    if (e.grounded) top = Math.max(top, e.floor);
  }
  assert(crouched >= 4 && jumped > 0, `crouched ${crouched} frames before the jump`);
  assert(top === 70, 'up on the ledge with him');
  // down: the grunt on the ledge, the hero below
  const w2 = new World({ seed: 6 });
  w2.terrain = new Terrain(w2, [{ kind: 'block', x0: 200, x1: 500, z0: 282, z1: 520, top: 90 }]);
  w2.addFighter(new Fighter({ stats: CHARACTERS.warrior, team: 'player', x: 700, z: 420, controller: new Scripted() }));
  const d = createEnemy(w2, 'grunt', 440, 420);
  d.floor = 90; d.h = 90;
  let hopDown = false; let peak = 0;
  for (let i = 0; i < 200; i++) {
    w2.tick();
    if (d.airKind === 'drop') { hopDown = true; peak = Math.max(peak, d.h - 90); }
  }
  assert(hopDown && peak > 5 && peak < 40 && d.floor === 0, `a short hop down (${peak.toFixed(0)} px up first), on the floor now`);
});

// ---------------------------------------------------------------- progression and Rurik's tree

const memStore = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v) }; };
// Rurik with these skills (every point he needs, none of the rules skipped)
function rurikWith(...ids) {
  const P = new Progress(memStore());
  P.data.bonus = 99;
  P.setFlag('oathkeeper'); // (his fire is Oathkeeper's: the end of level 1)
  for (const id of ids) assert(P.buy('warrior', id), `bought ${id} (${P.blocker('warrior', id)})`);
  return P.statsFor('warrior', CHARACTERS.warrior);
}
function skillSetup(stats, { foes = [], script = {}, hold = {}, x = 400 } = {}) {
  const world = new World({ seed: 9 });
  const p = world.addFighter(new Fighter({ stats, team: 'player', x, z: 420, controller: new Scripted(script, hold) }));
  const es = foes.map(([fx, fz = 420, type = 'grunt']) => {
    const e = world.addFighter(new Fighter({ stats: ENEMIES[type], team: 'enemy', x: fx, z: fz, controller: new Scripted() }));
    e.facing = Math.sign(p.x - fx) || -1;
    return e;
  });
  return { world, p, es, run: (n) => { for (let i = 0; i < n; i++) world.tick(); } };
}

test('progress: blood makes levels, levels and milestones make points, each hero spends the shared pool', () => {
  const P = new Progress(memStore());
  assert(P.level === 1 && P.earned === PROGRESS.startPoints, 'a point to start with');
  assert(P.addBlood(PROGRESS.levelStep) === 1 && P.level === 2, 'a level');
  assert(P.claim('gallows:yard') && !P.claim('gallows:yard'), 'a milestone pays once');
  const pts = P.earned;
  assert(P.buy('warrior', 'keenEdge') && P.available('warrior') === pts - 2, 'Rurik spends two');
  assert(P.available('rogue') === pts, 'Vexa still has them all: the pool is shared, the picks are not');
  assert(P.blocker('warrior', 'berserk') === 'locked', 'a major needs the one before it');
  P.respec('warrior');
  assert(P.available('warrior') === pts && !P.has('warrior', 'keenEdge'), 'respec gives every point back');
  const again = new Progress(P.storage);
  assert(again.earned === pts, 'saved and loaded');
});

test('progress: RESET HERO LEVEL takes him back to level 1 and keeps the campaign', () => {
  const P = new Progress(memStore());
  P.addBlood(PROGRESS.levelStep * 52);
  P.claim('village:gate');
  P.buy('warrior', 'keenEdge');
  P.reach('ironGates', 2);
  P.rescue('miller');
  P.resetLevel();
  assert(P.level === 1 && P.earned === PROGRESS.startPoints && P.available('warrior') === PROGRESS.startPoints, `level 1, the starting point (lv ${P.level}, ${P.earned} pts)`);
  assert(!P.has('warrior', 'keenEdge') && P.claim('village:gate'), 'picks gone, first clears pay again');
  assert(P.campaign.at.level === 'ironGates' && P.isRescued('miller'), 'the campaign is kept');
  assert(new Progress(P.storage).level === 1, 'saved');
});

test('progress: the two majors shut each other out; picks never touch the shared hero data', () => {
  const P = new Progress(memStore());
  P.data.bonus = 99;
  for (const id of ['keenEdge', 'executionersArc', 'berserk', 'bloodrush', 'ironWall']) P.buy('warrior', id);
  assert(P.blocker('warrior', 'oathOfFury') === 'excluded', 'Oath of Fury is shut once Berserk is taken');
  const base = JSON.stringify(CHARACTERS.warrior.moves.heavy);
  const s = P.statsFor('warrior', CHARACTERS.warrior);
  assert(s.moves.heavy.damage > CHARACTERS.warrior.moves.heavy.damage && JSON.stringify(CHARACTERS.warrior.moves.heavy) === base, 'a copy changed, not the original');
  const nodes = SKILL_TREES.warrior.branches.flatMap((b) => b.nodes);
  assert(nodes.length === 12 && nodes.reduce((n, x) => n + x.cost, 0) === 48, 'twelve skills in four branches, 48 points for all of them');
});

test("rurik: Oathkeeper Wakes makes the Firebolt a Hearthfire Bolt: cheaper, through two men, and a man it kills blows up", () => {
  const t = skillSetup(rurikWith('oathkeeperWakes'), { script: { 1: ['magic'] }, foes: [[520], [600]] });
  t.p.facing = 1;
  t.p.mana = t.p.stats.maxMana;
  t.es[0].health = 5;
  const kills = [];
  t.world.events.on('kill', (e) => kills.push(e.fatality));
  t.run(70);
  assert(t.p.stats.maxMana === 60 && t.p.mana < 60 && t.p.mana >= 40, `one bolt, 20 mana (${t.p.mana.toFixed(1)} of ${t.p.stats.maxMana})`);
  assert(kills[0] === 'explode', `the first man blew apart (${kills})`);
  assert(t.es[1].health < t.es[1].stats.maxHealth, 'and it burned on into the man behind him');
});

test("rurik: Kingsfire: a tap is still the bolt, a hold drives the sword down and a road of fire runs out ahead", () => {
  const rk = () => rurikWith('oathkeeperWakes', 'kingsfire');
  const tap = skillSetup(rk(), { script: { 1: ['magic'] }, foes: [[560]] });
  tap.p.facing = 1; tap.p.mana = 60;
  tap.run(16);
  assert(tap.world.projectiles.length === 1 && tap.p.state !== 'kingsfire', `tapped: a bolt (${tap.p.state})`);
  const t = skillSetup(rk(), { script: { 1: ['magic'] }, hold: (n) => ({ magic: n < 30 }), foes: [[470], [560], [640, 430], [300]] });
  t.p.facing = 1; t.p.mana = 60;
  let pillars = 0;
  t.world.events.on('wrathPillar', () => pillars++);
  let saw = false;
  for (let i = 0; i < 70; i++) { t.run(1); if (t.p.state === 'kingsfire') saw = true; }
  assert(saw && t.world.projectiles.length === 0, 'held: Kingsfire, no bolt');
  assert(t.p.mana <= 60 - 40 + 3.5, `40 mana, less what came back meanwhile (${t.p.mana.toFixed(1)})`);
  assert(pillars === 6, `six pillars (${pillars})`);
  assert(t.es.slice(0, 3).every((e) => e.health < e.stats.maxHealth), 'all three men ahead caught');
  assert(t.es[3].health === t.es[3].stats.maxHealth, 'the man behind him untouched (only the wrath burns both ways)');
  // a man the fire kills blows up
  const k = skillSetup(rk(), { script: { 1: ['magic'] }, hold: (n) => ({ magic: n < 30 }), foes: [[480]] });
  k.p.facing = 1; k.p.mana = 60; k.es[0].health = 10;
  let how = null;
  k.world.events.on('kill', (e) => { how = e.fatality; });
  k.run(60);
  assert(how === 'explode', `blown apart (${how})`);
  // not enough mana for it: the hold just throws the bolt
  const low = skillSetup(rk(), { script: { 1: ['magic'] }, hold: { magic: true } });
  low.p.facing = 1; low.p.mana = 25;
  low.run(20);
  assert(low.world.projectiles.length === 1, 'short of mana: the bolt');
});

test('rurik: SHOULDER SMASH: sprint + J runs through a line of men, throws them flying, and armour carries him through', () => {
  // sprinting right (C, then hold right), J once he's up to speed
  const run = (foes, attackAt = 20) => {
    const t = skillSetup(CHARACTERS.warrior, { script: { 2: ['sprint'], [attackAt]: ['attack'] }, hold: { right: true }, foes, x: 200 });
    t.p.facing = 1;
    return t;
  };
  const t = run([[420], [470], [520]]);
  let saw = false;
  let st0 = null;
  for (let i = 0; i < 80; i++) { t.run(1); if (t.p.state === 'shoulder') { if (!saw) st0 = t.p.stamina; saw = true; } }
  assert(saw, 'sprint + J: the shoulder smash');
  assert(st0 <= t.p.stats.maxStamina - 14 + 1, `it costs stamina (${st0})`);
  assert(t.es.every((e) => e.health < e.stats.maxHealth), `all three men in the line hit (${t.es.map((e) => e.health)})`);
  assert(t.es.every((e) => ['knockdown', 'getup', 'dead'].includes(e.state) || e.knockedDown), `all three thrown down (${t.es.map((e) => e.state)})`);
  assert(t.p.x > 320, `he ran on through them (${t.p.x.toFixed(0)})`);
  // walking, not sprinting: J is the plain slash
  const w = skillSetup(CHARACTERS.warrior, { script: { 10: ['attack'] }, hold: { right: true } });
  let shoulder = false;
  for (let i = 0; i < 20; i++) { w.run(1); if (w.p.state === 'shoulder') shoulder = true; }
  assert(!shoulder && w.p.state === 'light1', `walking: the slash (${w.p.state})`);
  // a guard is smashed open
  const g = run([[440]]);
  g.es[0].controller.hold = { block: true };
  let broke = false;
  g.world.events.on('guardBreak', () => { broke = true; });
  g.run(70);
  assert(broke || g.es[0].health < g.es[0].stats.maxHealth, 'the guard caved');
  // a man's swing doesn't stop him mid-run (super armour)
  const a = run([[470]], 14);
  let stopped = false;
  let swung = false;
  for (let i = 0; i < 60; i++) {
    a.run(1);
    if (a.p.state === 'shoulder' && a.p.fsm.frame === 3 && !swung) swung = a.world.combat.resolve(a.es[0], a.p, { ...ENEMIES.grunt.moves.light1 }, { kind: 'melee', fromX: a.es[0].x, dir: -1, contact: { x: a.p.x, h: 60 } }) ?? true;
    if (['hitstun', 'stagger', 'knockdown'].includes(a.p.state)) stopped = a.p.state;
  }
  assert(swung && !stopped, `armoured through the run (${stopped})`);
});

test("rurik: a sword kill feeds Kingsfire 5 mana; without the skill it doesn't", () => {
  const fed = (stats) => {
    const t = skillSetup(stats, { script: { 1: ['attack'] }, foes: [[450]] });
    t.es[0].health = 1; t.p.mana = 0;
    t.run(20);
    return t.p.mana;
  };
  const plain = fed(CHARACTERS.warrior);
  const kf = fed(rurikWith('oathkeeperWakes', 'kingsfire'));
  assert(kf - plain >= 4.9, `fed (${plain.toFixed(1)} -> ${kf.toFixed(1)})`);
});

test("rurik: the King's Wrath bursts out both ways, and every man it kills sets off the men round him", () => {
  const t = skillSetup(rurikWith('oathkeeperWakes', 'kingsfire', 'kingsWrath'), { script: { 1: ['magic'] }, hold: { magic: true }, foes: [[300], [480], [700], [745]] });
  t.p.facing = 1; t.p.mana = 70;
  // the far pair: the first goes up, his blast takes the second (who is out of the road's reach in depth)
  t.es[2].health = 5;
  t.es[3].z = 462; // (just out of the road's depth: only a blast can reach him)
  let nova = 0; let blasts = 0; let invincible = false;
  t.world.events.on('wrathNova', () => nova++);
  t.world.events.on('wrathBlast', () => blasts++);
  for (let i = 0; i < 90; i++) { t.run(1); if (t.p.state === 'kingsfire' && t.p.invincible) invincible = true; }
  assert(nova === 1 && invincible, 'one ring, and nothing touches him while he roars');
  assert(t.es[0].health < t.es[0].stats.maxHealth && t.es[1].health < t.es[1].stats.maxHealth, 'the men on both sides burned');
  assert(blasts >= 1 && t.es[3].health < t.es[3].stats.maxHealth, `the dead man's blast reached his neighbour (${blasts} blasts)`);
  assert(t.p.mana < 70 - 50 + 5, `50 mana (${t.p.mana.toFixed(1)})`);
});

test("rurik: Keen Edge sharpens every sword blow; Executioner's Arc is a 360 cleave on the D-pad", () => {
  const dmg = (stats) => {
    const t = skillSetup(stats, { script: { 1: ['heavy'] }, foes: [[450]] });
    t.es[0].health = 1e4;
    t.run(40);
    return 1e4 - t.es[0].health;
  };
  const plain = dmg(CHARACTERS.warrior); const keen = dmg(rurikWith('keenEdge'));
  assert(keen > plain * 1.2, `harder (${plain.toFixed(0)} -> ${keen.toFixed(0)})`);
  // WHIRLWIND CLEAVE on D-pad down: the man in front first, then the man behind
  const arc = skillSetup(rurikWith('keenEdge', 'executionersArc'), { script: { 1: ['padDown'] }, foes: [[460], [340]] });
  arc.p.facing = 1;
  const order = [];
  arc.world.events.on('hit', (h) => order.push(h.defender === arc.es[0] ? 'front' : 'behind'));
  arc.run(45);
  assert(arc.p.stats.moves.spin && order.join() === 'front,behind', `front, then behind (${order})`);
  const none = skillSetup(CHARACTERS.warrior, { script: { 1: ['padDown'] }, foes: [[340]] });
  none.run(30);
  assert(none.es[0].health === none.es[0].stats.maxHealth, 'without the skill, D-pad down does nothing');
});

test('rurik: Leap Smash drives him down and floors the men round him; Skyfall bounces him back up', () => {
  const t = skillSetup(rurikWith('windStep', 'leapSmash'), { script: { 1: ['jump'], 14: ['heavy'] }, hold: { jump: true }, foes: [[470], [340]] });
  let smashed = 0;
  t.world.events.on('leapSmash', () => smashed++);
  t.run(50);
  assert(smashed === 1, 'one crater');
  assert(t.es.every((e) => ['knockdown', 'getup'].includes(e.state) && e.health < e.stats.maxHealth), `both floored (${t.es.map((e) => e.state)})`);
  const plain = skillSetup(CHARACTERS.warrior, { script: { 1: ['jump'], 14: ['heavy'] }, hold: { jump: true } });
  plain.run(20);
  assert(plain.p.state !== 'plunge', 'without the skill, heavy in the air is nothing new');
  const sky = skillSetup(rurikWith('windStep', 'leapSmash', 'skyfall'), { script: { 1: ['jump'], 14: ['heavy'] }, hold: { jump: true }, foes: [[470]] });
  let up = false;
  for (let i = 0; i < 60; i++) { sky.run(1); if (sky.p.state === 'jump' && sky.p.vh > 300 && i > 16) up = true; }
  assert(up, 'bounced back up off the crater');
});

test('rurik: Leap Smash cools down, so it cannot be pogoed', () => {
  const t = skillSetup(rurikWith('windStep', 'leapSmash'), { script: { 1: ['jump'], 14: ['heavy'], 60: ['jump'], 74: ['heavy'], 170: ['jump'], 184: ['heavy'] }, hold: { jump: true } });
  let smashed = 0;
  t.world.events.on('leapSmash', () => smashed++);
  t.run(150);
  assert(smashed === 1, `the second leap is just a jump while it cools (${smashed})`);
  t.run(80);
  assert(smashed === 2, `ready again after the cooldown (${smashed})`);
  const sky = skillSetup(rurikWith('windStep', 'leapSmash', 'skyfall'), { script: { 1: ['jump'], 14: ['heavy'], 40: ['heavy'], 50: ['heavy'], 60: ['heavy'], 70: ['heavy'] }, hold: { jump: true } });
  let skySmashed = 0;
  sky.world.events.on('leapSmash', () => skySmashed++);
  sky.run(140);
  assert(skySmashed === 2, `Skyfall still gets its one smash off the bounce, and no more (${skySmashed})`);
});

test('rurik: Wind Step gives him a second jump; Bloodrush feeds him on a kill; Berserk takes his guard', () => {
  const ws = skillSetup(rurikWith('windStep', 'leapSmash'));
  assert(ws.p.stats.airJumps === 1 && CHARACTERS.warrior.airJumps === 0, 'a double jump, his alone');
  const br = skillSetup(rurikWith('bloodrush'), { script: { 1: ['heavy'] }, foes: [[450]] });
  br.p.health = 50; br.p.stamina = 10; br.es[0].health = 1;
  br.run(30);
  assert(br.p.health >= 56 && br.p.stamina >= 19, `fed by the kill (hp ${br.p.health.toFixed(0)}, st ${br.p.stamina.toFixed(0)})`);
  const bz = skillSetup(rurikWith('keenEdge', 'executionersArc', 'berserk'), { script: { 2: ['block'] }, hold: { block: true } });
  bz.run(6);
  assert(!['block', 'parry'].includes(bz.p.state), `no guard (${bz.p.state})`);
});

test('rurik: Iron Wall turns a parry into a riposte; Oath of Fury holds him up when he is low', () => {
  const t = setup({ dummyScript: { 1: ['attack'] } });
  t.p.stats = rurikWith('bloodrush', 'ironWall');
  t.p.facing = 1;
  t.p.controller.script = { 19: ['block'] };
  t.run(31);
  assert(t.log.includes('parry') && t.d.health <= t.d.stats.maxHealth - 25, `parried and hit back (${t.d.health})`);
  const f = setup({ dummyScript: { 1: ['attack'] } });
  f.p.stats = rurikWith('bloodrush', 'ironWall', 'oathOfFury');
  f.p.health = f.p.stats.maxHealth * 0.2;
  f.run(36);
  assert(f.log.includes('hit') && !['hitstun', 'stagger', 'knockdown'].includes(f.p.state), `took the blow and kept his feet (${f.p.state})`);
});

// ---------------------------------------------------------------- THE GALLOWS ASCENT

test('gallows: a rest shrine heals you, and standing still at it opens the skill tree', () => {
  const world = new World({ seed: 2 });
  const p = world.addFighter(new Fighter({ stats: CHARACTERS.rogue, team: 'player', x: 0, z: 400, controller: new Scripted() }));
  const st = new Stage(world, STAGE_GALLOWS);
  st.start(p);
  st.enterSection(1, true);
  st.clearSection();
  const r = STAGE_GALLOWS.sections[1].rest;
  p.x = r.x; p.z = r.z; p.health = 10;
  const ev = [];
  for (const n of ['restTouch', 'restKneel']) world.events.on(n, () => ev.push(n));
  for (let i = 0; i < 70; i++) { world.tick(); st.update(); }
  assert(p.health === p.stats.maxHealth && ev[0] === 'restTouch' && ev.includes('restKneel'), `healed, then knelt (${ev})`);
});

test('gallows: ringing the bell calls an optional fight; winning it is reported once', () => {
  const world = new World({ seed: 2 });
  const p = world.addFighter(new Fighter({ stats: CHARACTERS.warrior, team: 'player', x: 0, z: 400, controller: new Scripted() }));
  const st = new Stage(world, STAGE_GALLOWS);
  st.start(p);
  st.enterSection(1, true);
  const bell = st.props.find((x) => x.kind === 'bell');
  let won = 0;
  world.events.on('challengeWon', () => won++);
  st.breakProp(bell, 1);
  const kragg = world.fighters.filter((f) => f.team === 'enemy');
  assert(kragg.length === 1 && kragg[0].stats.name === ENEMIES.gladiator.name, 'Kragg answers');
  kragg[0].health = 0;
  for (let i = 0; i < 3; i++) { world.tick(); st.update(); }
  assert(won === 1, 'won');
});

// A bot that only walks the route (no fighting: the enemies are cleared as they come):
// right, jump at walls and gaps, a short hop for a small step, rides the cage.
function routeRun(hero) {
  class RouteBot extends Controller {
    sample(frozen) {
      if (frozen) return;
      const p = this.me; const T = this.world.terrain;
      // (down the lane at 415; through the gallery in front of the balcony, clear of the blades' lanes)
      const lane = p.x > 4880 && p.x < 5700 ? 365 : 415;
      this.held = {}; this.moveX = 1; this.moveZ = Math.abs(p.z - lane) > 6 ? Math.sign(lane - p.z) : 0;
      // (a crate or a signpost in the way: round it, like a player)
      const solid = this.world.solidAt?.(p.x + 30, p.z, p.h);
      if (solid) this.moveZ = p.z < (solid.z0 + solid.z1) / 2 ? -1 : 1;
      if (!T) return; // (a level without ledges or pits: just walk)
      if (this.jumpFor > 0) { this.jumpFor--; this.held.jump = p.h < this.jumpTo + 34; }
      if (!p.grounded) {
        if (p.vh < 0 && T.groundAt(p.x, 415) > -1 && T.groundAt(p.x + 25, 415) < -1) this.moveX = 0;
        else if (p.vh < 0 && T.groundAt(p.x, 415) < -1 && T.groundAt(p.x - 35, 415) > -1 && T.groundAt(p.x + 40, 415) < -1) this.moveX = -1;
        return;
      }
      const jump = (to) => { this.jumpTo = to; this.registerPress('jump'); this.held.jump = true; this.jumpFor = 20; };
      if (T.groundAt(p.x + 14, 415) < -1) {
        if (p.floorBlock?.kind === 'lift') { this.moveX = T.groundAt(p.x + 30, 415) > -1 ? 1 : 0; return; }
        for (let d = 15; d <= this.reach; d += 5) {
          const g = T.groundAt(p.x + d, 415);
          if (g > -1) { if (g - p.floor <= 95) return jump(g + (d > 50 ? 60 : 0)); break; } // (a wide gap: hold the jump all the way)
        }
        const lift = T.blocks.find((b) => b.kind === 'lift' && b.solid);
        if (lift && lift.x0 <= p.x + 12 && lift.x1 > p.x + 40 && Math.abs(lift.top - p.floor) < 6 && lift.dx >= 0) return;
        this.moveX = 0;
        return;
      }
      const wall = T.wallAt(p.x + 22, p.z, p.h);
      if (wall) jump(wall.top);
    }
  }
  const world = new World({ seed: 5 });
  const bot = new RouteBot();
  const p = world.addFighter(new Fighter({ stats: CHARACTERS[hero], team: 'player', x: 140, z: 440, controller: bot }));
  const s = CHARACTERS[hero];
  Object.assign(bot, { me: p, world, reach: Math.round(s.walkSpeed * 2 * s.jumpStrength / s.gravity * 0.95) });
  const stage = new Stage(world, STAGE_GALLOWS);
  stage.start(p);
  let falls = 0;
  world.events.on('pitFall', (e) => { if (e.fighter === p) falls++; });
  let f = 0;
  for (; f < 60 * 240 && p.x < 6700; f++) {
    for (const e of world.fighters) if (e.team === 'enemy') { e.health = 0; e.removeMe = true; }
    world.tick(); stage.update();
  }
  return { done: p.x >= 6700, secs: f / 60, falls };
}

test('gallows: every hero finishes the main route on his own legs (no upgrades), without a fall', () => {
  for (const hero of ['warrior', 'mage', 'rogue']) {
    const r = routeRun(hero);
    assert(r.done && r.falls === 0, `${hero}: ${r.done ? 'through' : 'stuck'} in ${r.secs.toFixed(0)} s, ${r.falls} falls`);
  }
});

test("gallows: the roost is Vexa's and Oryn's to reach, and Rurik's only with Wind Step", () => {
  class S extends Controller { constructor(fn) { super(); this.fn = fn; this.t = 0; } sample(fr) { if (fr) return; this.t++; this.held = {}; this.moveX = 0; this.moveZ = 0; this.fn(this, this.t); } }
  const reach = (stats, doubleJump) => {
    const world = new World({ seed: 1 });
    world.terrain = new Terrain(world, STAGE_GALLOWS.terrain);
    const c = new S((c, t) => {
      c.held.jump = true;
      if (t === 2) c.registerPress('jump');
      if (doubleJump && t > 2 && c.p.vh < 30 && !c.dj) { c.dj = 1; c.registerPress('jump'); }
      c.moveX = c.p.x < 3600 ? 1 : c.p.x > 3660 ? -1 : 0; // (steers onto it like a player: in the air she keeps her speed)
    });
    const p = world.addFighter(new Fighter({ stats, team: 'player', x: 3500, z: 310, controller: c }));
    c.p = p; p.floor = world.terrain.groundAt(p.x, p.z); p.h = p.floor;
    let best = 0;
    for (let i = 0; i < 200; i++) { world.tick(); if (p.grounded) best = Math.max(best, p.floor); }
    return best;
  };
  const ROOST = 310;
  assert(reach(CHARACTERS.rogue, true) === ROOST, 'Vexa: double jump');
  assert(reach(CHARACTERS.mage, false) === ROOST, 'Oryn: his higher rise');
  assert(reach(CHARACTERS.warrior, true) < ROOST, 'Rurik: not on his own');
  assert(reach(rurikWith('windStep'), true) === ROOST, 'Rurik with Wind Step');
});

// ------------------------------------------------------------ the campaign: THE BURNING VILLAGE

// Story off: no beats fire (for tests that check something else)
const hush = (st) => { st.story.started = true; st.story.current = null; st.story.queue = []; for (const b of st.story.beats) b.fired = true; if(st.millRescue)st.millRescue.save(); };
// A controller whose presses land even while the hero is frozen (like the real one)
class Pressing extends Controller {
  constructor(script = {}, hold = {}) { super(); this.script = script; this.hold = hold; this.t = 0; }
  sample() {
    this.t++;
    for (const a of this.script[this.t] ?? []) this.registerPress(a);
    this.held = this.hold;
    this.moveX = this.held.right ? 1 : this.held.left ? -1 : 0;
    this.moveZ = 0;
  }
}

// A bot that walks the village (no fighting: enemies are cleared as they come), jumping
// walls and gaps like the gallows bot. Reports the stage's end, falls and the story.
function villageRun(hero, opts = {}) { return campaignRun(STAGE_VILLAGE, hero, opts); }
// Story-order fixtures explicitly accept invitations. Their route bot tests the
// traversal separately; interaction range is covered by npc-talk-test.js.
function acceptNpcInvitations(st) {
  if(st.story.busy)return;
  for(const n of st.story.npcs)if(!n.ask && st.story.talkBeat(n)){
    const controller=new Controller();controller.registerPress('padUp');
    st.story.updateTalk(n,[{x:n.x,z:n.z,h:n.h,controller}]);
    if(st.story.busy)break;
  }
}
function campaignRun(data, hero, { kill = true, frames = 60 * 300, onTick = null, setup = null, opts = {}, section = 0 } = {}) {
  class Bot extends Controller {
    sample(frozen) {
      if (frozen) return;
      const p = this.me; const T = this.world.terrain;
      const lane = 415;
      this.held = {}; this.moveX = 1; this.moveZ = Math.abs(p.z - lane) > 6 ? Math.sign(lane - p.z) : 0;
      // (a crate or a signpost in the way: round it, like a player)
      const solid = this.world.solidAt?.(p.x + 30, p.z, p.h);
      if (solid) this.moveZ = p.z < (solid.z0 + solid.z1) / 2 ? -1 : 1;
      if (!T) return; // (a level without ledges or pits: just walk)
      if (this.jumpFor > 0) { this.jumpFor--; this.held.jump = p.h < this.jumpTo + 34; }
      if (!p.grounded) {
        // coming down: over ground with the dark ahead, pull back onto it (like a player)
        if (p.vh < 0 && T.groundAt(p.x, lane) > -1 && T.groundAt(p.x + 25, lane) < -1) this.moveX = -1;
        else if (p.vh < 0 && T.groundAt(p.x, lane) < -1 && T.groundAt(p.x - 35, lane) > -1 && T.groundAt(p.x + 40, lane) < -1) this.moveX = -1;
        return;
      }
      const jump = (to) => { this.jumpTo = to; this.registerPress('jump'); this.held.jump = true; this.jumpFor = 20; };
      if (T.groundAt(p.x + 14, lane) < -1) {
        for (let d = 15; d <= this.reach; d += 5) {
          const g = T.groundAt(p.x + d, lane);
          if (g > -1) { if (g - p.floor <= 95) return jump(g + (d > 50 ? 60 : 0)); break; }
        }
        this.moveX = 0;
        return;
      }
      const wall = T.wallAt(p.x + 22, p.z, p.h);
      if (wall) jump(wall.top);
    }
  }
  const world = new World({ seed: 5 });
  const bot = new Bot();
  const p = world.addFighter(new Fighter({ stats: CHARACTERS[hero], team: 'player', x: 150, z: 440, controller: bot }));
  const s = CHARACTERS[hero];
  Object.assign(bot, { me: p, world, reach: Math.round(s.walkSpeed * 2 * s.jumpStrength / s.gravity * 0.95) });
  const stage = new Stage(world, data, opts);
  stage.start(p, { section });
  let falls = 0; let won = 0; const beats = []; const rescued = [];
  world.events.on('pitFall', (e) => { if (e.fighter === p) falls++; });
  world.events.on('stageWon', () => won++);
  world.events.on('storyBeat', (e) => beats.push(e.beat.id));
  world.events.on('npcRescued', (e) => rescued.push(e.npc.id));
  setup?.(world, stage, p);
  let f = 0;
  for (; f < frames && !won; f++) {
    if (kill) for (const e of world.fighters) if (e.team === 'enemy') { e.health = 0; e.removeMe = true; }
    world.tick(); stage.update();
    onTick?.(world, stage, p, f);
    // Route fixtures auto-resolve interactions; actual bond hitboxes and failure are
    // exercised independently in mill-rescue-test.js.
    if(kill&&stage.millRescue?.started&&!stage.millRescue.executioner.alive)stage.millRescue.save();
    acceptNpcInvitations(stage);
  }
  return { won, secs: f / 60, falls, beats, rescued, stage, world, p, x: p.x };
}

test('village: every hero walks the whole level on his own legs (no upgrades), without a fall, and out of the gate', () => {
  for (const hero of ['warrior', 'mage', 'rogue']) {
    const r = villageRun(hero);
    assert(r.won === 1 && r.falls === 0, `${hero}: ${r.won ? 'out' : `stuck at x ${Math.round(r.x)} (${r.stage.section.id}, ${r.stage.phase})`} in ${r.secs.toFixed(0)} s, ${r.falls} falls`);
  }
});

test('village: the story plays in order: the opening, Hale, the family, the vow; the level ends only after the vow', () => {
  let wonBeforeVow = false;
  const r = villageRun('warrior', { onTick: (w, st) => { if (st.phase === 'won' && !st.story.done.has('vow')) wonBeforeVow = true; } });
  const at = (id) => r.beats.indexOf(id);
  assert(at('opening') === 0, `opening first (${r.beats.join(',')})`);
  for (const id of ['hale', 'mira', 'captain', 'elder', 'vow']) assert(at(id) > 0, `${id} played (${r.beats.join(',')})`);
  assert(at('hale') < at('mira') && at('mira') < at('elder') && at('elder') < at('vow'), r.beats.join(','));
  assert(!wonBeforeVow, 'won before the vow was made');
  assert(r.rescued.includes('mira'), 'clearing the square frees the family');
  assert(r.rescued.includes('barn') && !r.rescued.includes('tam'), 'the route fixture cuts Irvolino free; the ridge boy remains optional');
  assert(r.stage.story.done.has('churchFarewell')&&r.stage.story.npc('mira').insideChurch, 'The family accompanies Hakon into the church before the exit opens');
});

test('village: a held scene stops the heroes; a press of jump skips to the next line', () => {
  const world = new World({ seed: 2 });
  const first = STAGE_VILLAGE.story[0].delay ?? LINE.gap;
  const c = new Pressing({ [first + 30]: ['jump'] }, { right: true });
  const p = world.addFighter(new Fighter({ stats: CHARACTERS.warrior, team: 'player', x: 150, z: 440, controller: c }));
  const st = new Stage(world, STAGE_VILLAGE);
  st.start(p);
  for (let i = 0; i < first + 25; i++) { world.tick(); st.update(); }
  assert(st.story.holding && st.story.line.index === 0, 'the opening is playing');
  assert(Math.abs(p.x - 150) < 1, `he holds still (x ${p.x})`);
  for (let i = 0; i < 10; i++) { world.tick(); st.update(); }
  assert(st.story.line.index === 1, `jump moved it on (line ${st.story.line?.index})`);
  for (let i = 0; i < 2400 && st.story.busy; i++) { world.tick(); st.update(); }
  assert(!st.story.busy && st.story.done.has('opening'), 'the opening ends by itself');
  for (let i = 0; i < 130; i++) { world.tick(); st.update(); }
  assert(p.x > 160, 'and he walks on');
  assert(p.state !== 'jump' || p.grounded, 'the skip press did not also make him jump');
});

test('story: D-pad right moves any line on; D-pad left skips the whole conversation', () => {
  const world = new World({ seed: 2 });
  const first = STAGE_VILLAGE.story[0].delay ?? LINE.gap;
  const c = new Pressing({ [first + 30]: ['padRight'], [first + 60]: ['padLeft'] }, {});
  const p = world.addFighter(new Fighter({ stats: CHARACTERS.warrior, team: 'player', x: 150, z: 440, controller: c }));
  const st = new Stage(world, STAGE_VILLAGE);
  st.start(p);
  for (let i = 0; i < first + 25; i++) { world.tick(); st.update(); }
  assert(st.story.line?.beat === 'opening' && st.story.line.index === 0, 'the opening is playing');
  for (let i = 0; i < 10; i++) { world.tick(); st.update(); }
  assert(st.story.line.index === 1, `D-pad right moved it on (line ${st.story.line?.index})`);
  for (let i = 0; i < 30; i++) { world.tick(); st.update(); }
  assert(st.story.done.has('opening') && st.story.line?.beat !== 'opening', 'D-pad left skipped the rest of it');
});

test('story: a line never moves on by itself; one press (D-pad right / N / a click) moves it on', waiting(() => {
  const world = new World({ seed: 2 });
  const first = STAGE_VILLAGE.story[0].delay ?? LINE.gap;
  const c = new Pressing({}, {});
  const p = world.addFighter(new Fighter({ stats: CHARACTERS.warrior, team: 'player', x: 150, z: 440, controller: c }));
  const st = new Stage(world, STAGE_VILLAGE);
  st.start(p);
  const run = (n) => { for (let i = 0; i < n; i++) { world.tick(); st.update(); } };
  run(first + LINE.max * 4);
  assert(st.story.line?.beat === 'opening' && st.story.line.index === 0, `still the first line, long after its time (${st.story.line?.index})`);
  c.script = { [c.t + 1]: ['padRight'] };
  run(10);
  assert(st.story.line.index === 1, `a press moved it on (line ${st.story.line?.index})`);
  run(LINE.max * 4);
  assert(st.story.line.index === 1, 'and the next line waits too');
  st.story.skipScene();
  run(2);
  assert(st.story.done.has('opening'), 'skipping the scene still ends it');
}));

test('story: a line said in passing goes by itself, in time for its length; a conversation with a hero in it waits; and the cutaways\' lines never move on by themselves', waiting(() => {
  const world = new World({ seed: 2 });
  const c = new Pressing({}, {});
  const p = world.addFighter(new Fighter({ stats: CHARACTERS.warrior, team: 'player', x: 150, z: 440, controller: c }));
  const st = new Stage(world, STAGE_VILLAGE);
  st.start(p);
  hush(st);
  const run = (n) => { for (let i = 0; i < n; i++) { world.tick(); st.update(); } };
  // (Nick: someone only telling you something in passing, the box goes by itself)
  const shout = { id: 'shout', lines: [['VAREK', 'Behind you!'], ['VAREK', 'Burn, all of you, burn with your village!']], fired: false };
  st.story.beats.push(shout);
  st.story.cue('shout');
  run(LINE.gap + 4);
  assert(st.story.current?.beat.id === 'shout' && !st.story.line, 'incidental taunts never show a bottom dialogue box');
  const short=st.story.passFrames(shout.lines[0][1]),long=st.story.passFrames(shout.lines[1][1]);
  run(short+long+20);
  assert(st.story.done.has('shout')&&!st.story.line,'incidental lines finish without clicks');
  const pass=(b)=>st.story.passing({lines:[],...b});
  assert(pass({lines:[['VINCENT','a'],['RURIK','b']]}),'incidental exchanges time out');
  assert(!pass({hold:true,lines:[['HAKON','a']]}),'important held scenes retain their pacing');
  const talk={id:'talk',lines:[['VEXA','Behind you!'],['ORYN','Again!']],fired:false};
  st.story.beats.push(talk);st.story.cue('talk');run(30);
  assert(st.story.done.has('talk')&&!st.story.current,'random companion chatter is removed entirely');
  const src = readFileSync(new URL('../src/scenes/CutawayScene.js', import.meta.url), 'utf8');
  assert(!/delayedCall\([^)]*text\.length/.test(src) && !src.includes('this.auto'), 'no line in a cutaway is on a timer');
  assert(src.includes("this.input.on('pointerdown', () => this.next())"), 'a click moves a cutaway on');
}));

test('village: the barn: smashing the burning beam off its door frees the people inside', () => {
  const world = new World({ seed: 3 });
  const p = world.addFighter(new Fighter({ stats: CHARACTERS.warrior, team: 'player', x: 5430, z: 300, controller: new Scripted() }));
  const st = new Stage(world, STAGE_VILLAGE);
  st.start(p);
  st.enterSection(3);
  p.x = 5430; p.z = 300;
  const barn = st.story.npc('mill-villagers');
  const door = st.props.find((pr) => pr.tag === 'barn');
  assert(barn.state === 'trapped' && door && !door.broken, 'trapped behind the door');
  const freed = [];
  world.events.on('npcRescued', (e) => freed.push(e.npc.id));
  st.breakProp(door, 1);
  for (let i = 0; i < 3; i++) { world.tick(); st.update(); }
  assert(barn.state === 'free' && freed.includes('mill-villagers'), `freed (${barn.state})`);
  for (let i = 0; i < 60 * 20; i++) { world.tick(); st.update(); acceptNpcInvitations(st); }
  assert(barn.state === 'safe' && Math.abs(barn.x-barn.flee.x)<2, `the other villagers reach shelter (${barn.state})`);
  assert(freed.filter((id) => id === 'mill-villagers').length === 1, 'reported once');
});

test('village: the boy on the high ridge is saved by reaching him; every hero climbs to him in three jumps', () => {
  // from the back of the second roof: a chimney (+45), a dormer (+45), the ridge (+45). Like
  // a player: aim for the middle of the next step up, jump, steer onto it, land, again
  const steps = STAGE_VILLAGE.terrain.filter((b) => b.kind === 'block' && b.z0 === STAGE_VILLAGE.laneTop && b.x0 > 3480 && b.x1 <= 3680 && b.top > 120).sort((a, b) => a.top - b.top);
  assert(steps.length === 3 && steps.every((b, i) => b.top - (i ? steps[i - 1].top : 120) <= 45), 'three steps of +45 at most');
  for (const hero of ['warrior', 'mage', 'rogue']) {
    const world = new World({ seed: 4 });
    let jumps = 0; let hold = 0; let aim = null;
    const c = new Scripted({}, () => {
      const p = c.p;
      // (the step to make is picked on the ground and kept till he lands)
      if (p.grounded && hold === 0) {
        const next = steps.find((b) => b.top > p.floor + 5);
        aim = next ? (next.x0 + next.x1) / 2 : null;
        if (next) { c.registerPress('jump'); jumps++; hold = 24; }
      }
      if (hold > 0) hold--;
      return { jump: hold > 0, right: aim != null && p.x < aim - 4, left: aim != null && p.x > aim + 4 };
    });
    const p = world.addFighter(new Fighter({ stats: CHARACTERS[hero], team: 'player', x: 3490, z: STAGE_VILLAGE.laneTop + 18, controller: c }));
    c.p = p;
    const st = new Stage(world, STAGE_VILLAGE);
    st.start(p);
    st.enterSection(2);
    hush(st);
    p.x = 3490; p.z = STAGE_VILLAGE.laneTop + 18; st.placeOnGround(p);
    for (let i = 0; i < 400 && !st.story.isRescued('tam'); i++) {
      for (const e of world.fighters) if (e.team === 'enemy') { e.health = 0; e.removeMe = true; } // (the roof's two men: another test)
      world.tick(); st.update();
    }
    assert(st.story.isRescued('tam'), `${hero}: reached him (on ${p.floor} at x ${Math.round(p.x)}, ${jumps} jumps)`);
    assert(jumps === 3, `${hero}: three jumps up (${jumps})`);
  }
});

test('village: the archers by the mill shoot from the roofs on; their arrows stagger both sides; wreck their posts and the arrows stop', () => {
  const world = new World({ seed: 6 });
  const p = world.addFighter(new Fighter({ stats: CHARACTERS.warrior, team: 'player', x: 3160, z: 410, controller: new Scripted() }));
  const st = new Stage(world, STAGE_VILLAGE);
  st.start(p);
  st.enterSection(2);
  hush(st);
  p.x = 3160; p.z = 410; st.placeOnGround(p);
  p.controller.sample = function () { this.held = {}; this.moveX = 0; this.moveZ = 0; };
  assert(!st.hazards.some((h) => h.type === 'beam' && h.look !== 'rock'), 'no falling wood anywhere in the village');
  const hz = st.hazards.find((h) => h.type === 'bombard' && h.look === 'arrows' && h.section === 2);
  assert(hz && hz.silence === 'millArchers', 'the roofs are under the mill archers\' arrows');
  const e = createEnemy(world, 'grunt', 3190, 420);
  e.entering = false; e.controller = new Controller(); st.placeOnGround(e);
  const land = []; world.events.on('shellLand', (ev) => { if (ev.hazard === hz) land.push(ev.shell); });
  let hurtHero = 0; let hurtFoe = 0; let stunned = 0; let floored = 0;
  world.events.on('hazardHit', (ev) => {
    if (ev.kind !== 'arrow') return;
    if (ev.fighter === p) { hurtHero++; if (p.state === 'hitstun') stunned++; if (p.state === 'knockdown') floored++; } else if (ev.fighter.team === 'enemy') hurtFoe++;
  });
  const tick = (n, each) => { for (let i = 0; i < n; i++) { world.tick(); st.update(); each?.(); } };
  tick(60 * 10, () => { p.health = p.stats.maxHealth; p.x = 3160; p.z = 410; if (e.alive) { e.health = e.stats.maxHealth; e.x = p.x + 30; e.z = p.z; } });
  assert(land.length >= 3 && land.every((sh) => Math.abs(sh.x - p.x) < 260), `arrows land near him (${land.map((sh) => Math.round(sh.x - p.x))})`);
  assert(hurtHero >= 1 && hurtFoe >= 1, `they hit whoever is under them (hero ${hurtHero}, Ashen ${hurtFoe})`);
  assert(stunned === hurtHero && floored === 0, `an arrow staggers him, never floors him (${stunned}/${hurtHero}, floored ${floored})`);
  // still shooting in the mill yard, from posts up on the mill floor
  const mill = STAGE_VILLAGE.sections.findIndex((q) => q.id === 'mill');
  st.enterSection(mill);
  assert(st.bombardShots(hz) === 2, 'the mill yard is under them too');
  const posts = st.props.filter((pr) => pr.tag === 'millArchers');
  assert(posts.length === 2 && posts.every((pr) => pr.kind === 'archers' && pr.section === mill), 'two archer posts in the mill yard');
  st.breakProp(posts[0], 1);
  assert(st.bombardShots(hz) === 1, 'one wrecked: half the volley');
  const beats = []; world.events.on('storyBeat', (ev) => beats.push(ev.beat.id));
  st.story.beats.find((b) => b.id === 'millSilenced').fired = false;
  st.breakProp(posts[1], 1);
  tick(30);
  assert(st.bombardShots(hz) === 0 && beats.includes('millSilenced'), `both wrecked: the arrows stop (${beats})`);
  // and past the mill yard it never shoots
  const fresh = new Stage(new World({ seed: 6 }), STAGE_VILLAGE);
  fresh.enterSection(mill + 1);
  assert(fresh.bombardShots(fresh.hazards.find((h) => h.silence === 'millArchers')) === 0, 'not past the mill');
});

const HALL = STAGE_VILLAGE.sections.findIndex((q) => q.id === 'hall');
test("village: the longhall archers fire from the boss battle's start; wreck their post and they stop", () => {
  const world = new World({ seed: 7 });
  const p = world.addFighter(new Fighter({ stats: CHARACTERS.warrior, team: 'player', x: 7400, z: 440, controller: new Scripted() }));
  const st = new Stage(world, STAGE_VILLAGE);
  st.start(p);
  st.enterSection(HALL);
  hush(st);
  p.x = 7450;
  let volleys = 0;
  let bossFrame = null, firstVolley = null, combatFrame = null;
  world.events.on('bossSpawn', () => { bossFrame = world.frame; });
  world.events.on('shellLaunch', (ev) => { if (ev.hazard.section === HALL) { volleys++; firstVolley ??= world.frame; } });
  for (let i = 0; i < 900; i++) {
    world.tick();
    if (st.boss && !world.hold) combatFrame ??= world.frame;
    st.update(); p.health = p.stats.maxHealth; p.awe = 0;
  }
  assert(st.boss && st.boss.stats.name.includes('Ash Captain'), 'he is here');
  assert(!st.boss.raged && volleys >= 2, `arrows before his rage (${volleys})`);
  assert(bossFrame != null && firstVolley >= bossFrame && firstVolley - combatFrame <= 1, 'first warned volley starts when his entrance ends, never before him');
  const opening = STAGE_VILLAGE.story.find(b => b.on === 'boss:hall');
  assert(opening.lines[0][1].startsWith('Archers!'), 'his archers command is his first line');
  assert(!STAGE_VILLAGE.story.some(b => b.on === 'rage:hall' && b.lines.some(l => l[1].startsWith('Archers!'))), 'the command does not repeat at half health');
  st.boss.health = st.boss.stats.maxHealth * 0.4;
  for (let i = 0; i < 700; i++) { world.tick(); st.update(); p.health = p.stats.maxHealth; }
  assert(st.boss.raged && volleys >= 2, `his archers loose on the hall (${volleys})`);
  const post = st.props.find((pr) => pr.tag === 'hallArchers');
  st.breakProp(post, 1);
  const n = volleys;
  for (let i = 0; i < 600; i++) { world.tick(); st.update(); p.health = p.stats.maxHealth; if (st.boss?.alive) st.boss.health = st.boss.stats.maxHealth * 0.4; }
  assert(volleys === n, `their post wrecked: no more arrows (${volleys - n})`);
});

test('gates: the lower town: a catapult up the street shells it (no falling beams); wreck it and it stops', () => {
  const town = STAGE_GATES.sections.findIndex((q) => q.id === 'town');
  const st = new Stage(new World({ seed: 9 }), STAGE_GATES);
  assert(!st.hazards.some((h) => h.type === 'beam' && h.look !== 'rock'), 'no falling wood anywhere in the Iron Gates');
  st.enterSection(town);
  const hz = st.hazards.find((h) => h.type === 'bombard' && h.section === town);
  assert(hz && st.bombardShots(hz) === 1, 'the catapult throws');
  const cat = st.props.find((pr) => pr.tag === hz.silence);
  assert(cat && cat.kind === 'catapult' && cat.section === town, 'a catapult stands in the town');
  st.breakProp(cat, 1);
  assert(st.bombardShots(hz) === 0, 'wrecked: it stops');
});

test('village: Cinder arrives as a regular enemy without boss events or a frozen field', () => {
  const world = new World({ seed: 8 });
  const p = world.addFighter(new Fighter({ stats: CHARACTERS.warrior, team: 'player', x: 4600, z: 440, controller: new Scripted() }));
  const st = new Stage(world, STAGE_VILLAGE);
  st.start(p);
  st.enterSection(3);
  hush(st); p.awe = 0;
  p.x = 4600; st.fightOn = true; st.waveIndex = st.section.waves.length; st.waveDelay = 0;
  for (let i = 0; i < 5; i++) { world.tick(); st.update(); }
  const cinder=st.livingFoes().find(f=>f.stats.name==='Brother Cinder');
  assert(cinder && !cinder.stats.boss && !st.boss && !world.hold && !(p.awe > 2), `Cinder in, hero free (awe ${p.awe})`);
  assert(!inView(world,[p],cinder.x), 'he starts off-screen and walks in');
});

test('village: rescues and the level are saved once (the campaign save)', () => {
  const P = new Progress(memStore());
  assert(P.rescue('mira') && !P.rescue('mira') && P.isRescued('mira'), 'rescued once');
  assert(P.finishLevel('village') && !P.finishLevel('village'), 'level done once');
  const store = memStore();
  const a = new Progress(store); a.rescue('tam');
  const b = new Progress(store);
  assert(b.isRescued('tam') && b.campaign.levels, 'it survives a reload');
});

test('village: story lines are timed in game frames (both online machines agree)', () => {
  const t = (s) => Math.min(LINE.max, Math.round(LINE.base + s.length * LINE.perChar));
  const w1 = new World({ seed: 9 }); const w2 = new World({ seed: 9 });
  const mk = (w) => { const p = w.addFighter(new Fighter({ stats: CHARACTERS.rogue, team: 'player', x: 150, z: 440, controller: new Scripted({}, { right: true }) })); const s = new Stage(w, STAGE_VILLAGE); s.start(p); return s; };
  const a = mk(w1); const b = mk(w2);
  for (let i = 0; i < 400; i++) { w1.tick(); a.update(); w2.tick(); b.update(); }
  assert(JSON.stringify(a.story.line) === JSON.stringify(b.story.line), 'same line, same age');
  assert(t('abc') > 0, 'timing');
});



// ------------------------------------------------------------ Oryn's tree: THE STORMCALLER

function orynWith(...ids) {
  const P = new Progress(memStore());
  P.data.bonus = 99;
  for (const id of ids) assert(P.buy('mage', id), `bought ${id}`);
  return P.statsFor('mage', CHARACTERS.mage);
}

test("oryn's tree: the Stormcaller can be taken in order; the planned branches are shown but can't be", () => {
  const P = new Progress(memStore());
  P.data.bonus = 99;
  assert(P.blocker('mage', 'staticCharge') === 'locked' && P.buy('mage', 'forkedBolt') && P.buy('mage', 'staticCharge') && P.buy('mage', 'thunderhead'), 'in order');
  assert(P.blocker('mage', 'secondWall') === 'planned' && !P.buy('mage', 'secondWall') && P.blocker('mage', 'phaseWalk') === 'planned', 'planned: not for sale');
  assert(SKILL_TREES.mage.branches.length === 3 && SKILL_TREES.mage.branches.filter((b) => b.planned).length === 2, 'three columns, two placeholders');
  const s = P.statsFor('mage', CHARACTERS.mage);
  assert(s.kit.bolt.branches === CHARACTERS.mage.kit.bolt.branches + 1 && CHARACTERS.mage.kit.bolt.maxJumps === 4, 'his copy changes, the shared data does not');
  P.setFlag('oathkeeper'); // (before it, his stats are his old sword's: a copy)
  assert(P.statsFor('warrior', CHARACTERS.warrior) === CHARACTERS.warrior, "Rurik's picks are his own");
});

test('stormcaller: Forked Bolt makes the chain reach more of a crowd', () => {
  const crowd = [[700, 420], [740, 400], [740, 440], [790, 420], [830, 400], [830, 440], [880, 420], [920, 410], [960, 430]];
  const plain = mageSetup({ script: { 1: ['heavy'] }, hold: (n) => ({ heavy: n < 3 }), foes: crowd });
  plain.run(60);
  const forked = mageSetup({ script: { 1: ['heavy'] }, hold: (n) => ({ heavy: n < 3 }), foes: crowd, stats: orynWith('forkedBolt') });
  forked.run(60);
  const n = (t) => t.seen('lightningArc').length;
  assert(n(forked) > n(plain), `more men struck (${n(forked)} vs ${n(plain)})`);
});

test('stormcaller: Static Charge: the combo\'s third strike leaves a field that shocks whoever walks in, then fades', () => {
  const t = mageSetup({ script: { 1: ['heavy'], 24: ['heavy'], 44: ['heavy'] }, foes: [[720]], stats: orynWith('forkedBolt', 'staticCharge') });
  const fields = []; const shocks = [];
  t.world.events.on('stormField', (e) => fields.push(e.field));
  t.world.events.on('stormShock', (e) => shocks.push(e.target));
  t.run(90);
  assert(fields.length === 1, `one field (${fields.length})`);
  const f = fields[0];
  const walker = t.world.addFighter(new Fighter({ stats: ENEMIES.grunt, team: 'enemy', x: f.x + 300, z: f.z, controller: new Scripted() }));
  t.run(5);
  assert(!shocks.includes(walker), 'not while outside it');
  walker.x = f.x; walker.health = walker.stats.maxHealth;
  t.run(40);
  assert(shocks.filter((e) => e === walker).length >= 1 && walker.health < walker.stats.maxHealth, 'shocked inside it');
  t.run(STORM.field.life);
  assert(t.world.storms.list.length === 0, 'it fades');
  const none = mageSetup({ script: { 1: ['heavy'], 24: ['heavy'], 44: ['heavy'] }, foes: [[720]] });
  let any = 0; none.world.events.on('stormField', () => any++); none.run(90);
  assert(any === 0, 'no field without the skill');
});

test('stormcaller: Thunderhead: a full overcharge calls a strike down on its first man and floors everyone close by', () => {
  const foes = [[720], [760, 440], [1100]];
  const t = mageSetup({ script: { 1: ['heavy'] }, hold: (n) => ({ heavy: n < 50 }), foes, stats: orynWith('forkedBolt', 'staticCharge', 'thunderhead') });
  const strikes = []; t.world.events.on('thunderStrike', (e) => strikes.push(e));
  t.run(110);
  assert(strikes.length === 1 && strikes[0].hits.length >= 2, `one strike, two men (${strikes.length}, ${strikes[0]?.hits.length})`);
  assert(!strikes[0].hits.includes(t.es[2]), 'not the man far away');
  const tap = mageSetup({ script: { 1: ['heavy'] }, hold: (n) => ({ heavy: n < 3 }), foes, stats: orynWith('forkedBolt', 'staticCharge', 'thunderhead') });
  let n = 0; tap.world.events.on('thunderStrike', () => n++); tap.run(110);
  assert(n === 0, 'not from a tapped bolt');
});

// ------------------------------------------------------------ the campaign, stage 2: GALLOWS WOOD and the shared systems

// a hero standing still where we put him, holding whatever we say (a scripted INTERACT)
function woodSetup(section, { x, z, hold = {}, hero = 'warrior' } = {}) {
  const world = new World({ seed: 11 });
  const c = new Scripted({}, hold);
  const p = world.addFighter(new Fighter({ stats: CHARACTERS[hero], team: 'player', x: x ?? 200, z: z ?? 440, controller: c }));
  const st = new Stage(world, STAGE_WOOD);
  st.start(p, { section });
  hush(st);
  if (x != null) { p.x = x; p.z = z; st.placeOnGround(p); }
  const run = (n, each) => { for (let i = 0; i < n; i++) { world.tick(); st.update(); each?.(i); } };
  return { world, p, st, c, run };
}
const killFoes = (world) => { for (const e of world.fighters) if (e.team === 'enemy') { e.health = 0; e.removeMe = true; } };

test('wood: every hero walks Gallows Wood (no upgrades), without a fall, out by the mine road', () => {
  for (const hero of ['warrior', 'mage', 'rogue']) {
    const r = campaignRun(STAGE_WOOD, hero);
    assert(r.won === 1 && r.falls === 0, `${hero}: ${r.won ? 'out' : `stuck at x ${Math.round(r.x)} (${r.stage.section.id}, ${r.stage.phase})`} in ${r.secs.toFixed(0)} s, ${r.falls} falls`);
  }
});

test('wood: the story runs in order; Joren and Ansel are saved by fighting, the cages need their locks opened', () => {
  const r = campaignRun(STAGE_WOOD, 'warrior');
  const at = (id) => r.beats.indexOf(id);
  for (const id of ['opening', 'rope', 'joren', 'ansel', 'ansel-safe', 'houndmaster', 'gathered', 'turn']) assert(at(id) >= 0, `${id} played (${r.beats.join(',')})`);
  assert(at('opening') === 0 && at('rope') < at('joren') && at('joren') < at('ansel') && at('ansel') < at('turn'), r.beats.join(','));
  assert(r.rescued.includes('joren') && r.rescued.includes('ansel'), `saved: ${r.rescued.join(',')}`);
  assert(!r.rescued.includes('tanners') && !r.rescued.includes('wenna'), 'the cages stay shut unless someone opens them');
  assert(!r.beats.includes('pilgrim'), 'the pilgrim only talks when asked');
});

test('wood: the execution: too slow and Joren is lost; rising at the checkpoint puts him back on the rope', () => {
  const { world, p, st, run } = woodSetup(1, { x: 1900, z: 440 });
  const j = st.story.npc('joren');
  const lost = []; world.events.on('npcLost', (e) => lost.push(e.npc.id));
  for (const b of st.story.beats) if (b.id === 'joren-lost') b.fired = false;
  run(30);
  assert(st.fightOn && j.state === 'threatened', `the hangmen are at work (${j.state})`);
  run(j.time + 20, () => { p.health = p.stats.maxHealth; p.invincible = true; });
  assert(j.state === 'lost' && lost.join() === 'joren' && st.story.lost.has('joren'), `lost (${j.state})`);
  for (let i = 0; i < 400 && !st.story.done.has('joren-lost'); i++) { killFoes(world); world.tick(); st.update(); }
  assert(st.story.done.has('joren-lost'), 'his loss is said (once the fight is over)');
  st.respawn();
  assert(j.state === 'threatened' && j.clock === 0 && !st.story.lost.has('joren'), `back on the rope (${j.state})`);
  run(30); killFoes(world); run(60, () => killFoes(world));
  assert(st.story.isRescued('joren'), 'and saved this time, in time');
});

test('wood: a cage opens when a hero holds INTERACT at its lock, only with no enemy standing', () => {
  const L = STAGE_WOOD.npcs.find((n) => n.id === 'wenna').lock;
  const { world, st, run } = woodSetup(2, { x: L.x, z: L.z, hold: { padUp: true } });
  const w = st.story.npc('wenna');
  st.fightOn = true; st.waveIndex = st.section.waves.length; // (the convoy's guards: just this one left)
  const foe = createEnemy(world, 'grunt', L.x + 400, L.z); foe.controller.sample = () => {};
  run(NPC.pick + 10);
  assert(w.state === 'trapped' && w.pick === 0, 'not while they are still fighting');
  assert(st.story.prompts.some((q) => q.npc === w && q.kind === 'busy'), 'the prompt says so');
  foe.health = 0; foe.removeMe = true;
  run(NPC.pick - 5);
  assert(w.state === 'trapped' && w.pick > 0, `the lock is giving (${w.pick})`);
  run(10);
  assert(st.story.isRescued('wenna'), `open (${w.state})`);
});

test('wood: an escort follows the hero, freezes and loses his nerve with enemies near him, and is safe across the ford', () => {
  {
    const { world, p, st, run } = woodSetup(3, { x: 4560 + 40, z: 440, hold: { right: true } });
    const a = st.story.npc('ansel');
    run(5);
    assert(a.state === 'escort', `he follows (${a.state})`);
    run(60 * 40, () => { killFoes(world); if (p.x > 5560) p.x = 5560; });
    assert(st.story.isRescued('ansel'), `across the ford (${a.state} at ${Math.round(a.x)}, ${Math.round(a.z)})`);
  }
  {
    const { world, st, run } = woodSetup(3, { x: 4600, z: 440 });
    const a = st.story.npc('ansel');
    run(3);
    const foe = createEnemy(world, 'grunt', a.x + 60, a.z); foe.controller.sample = () => {};
    const x0 = a.x;
    run(30);
    assert(a.cower && a.x === x0 && a.nerve < NPC.nerve, 'he freezes and his nerve goes');
    run(Math.ceil(NPC.nerve / NPC.fear));
    assert(a.state === 'lost', `lost (${a.state}, nerve ${a.nerve})`);
  }
});

const WOOD_SEC = (id) => STAGE_WOOD.sections.findIndex((q) => q.id === id);
test('wood: the pilgrim talks only when a hero near him presses INTERACT', () => {
  const pg = STAGE_WOOD.npcs.find((n) => n.id === 'pilgrim');
  const { st, c, run } = woodSetup(WOOD_SEC('pass'), { x: pg.x - 30, z: pg.z });
  for (const b of st.story.beats) if (b.id === 'pilgrim') b.fired = false;
  run(60);
  assert(!st.story.npc('pilgrim').talked && st.story.prompts.some((q) => q.kind === 'talk'), 'a prompt, no words yet');
  c.script = { [c.t + 1]: ['padUp'] };
  run(900);
  assert(st.story.done.has('pilgrim'), 'asked, he tells them');
});

test('boss phases: the Houndmaster calls his pack, then rages; each phase once, in order, even past two at a blow', () => {
  const { world, p, st, run } = woodSetup(WOOD_SEC('kennels'), { x: 7700, z: 440 });
  const phases = []; let rages = 0;
  world.events.on('bossPhase', (e) => phases.push(e.phase.id));
  world.events.on('bossRage', () => rages++);
  run(700, () => { p.health = p.stats.maxHealth; p.awe = 0; });
  const b = st.boss;
  assert(b?.stats.name === 'The Houndmaster', 'he is here');
  const cd0 = b.controller.ai.attackCooldown[0];
  const up = st.livingFoes().length;
  assert(st.livingFoes().filter((e) => e.stats.id === 'hound').length === 2, 'two hounds come in with him');
  b.health = b.stats.maxHealth * 0.6;
  run(2, () => { p.health = p.stats.maxHealth; });
  assert(phases.join() === 'pack' && st.livingFoes().length === up + 3, `his pack (${phases}, ${st.livingFoes().length} up)`);
  assert(b.controller.ai.attackCooldown[0] < cd0 && ENEMIES.stalker.ai.attackCooldown[0] === cd0, 'he quickens (his own brain, not the shared data)');
  assert(st.bossInPhase('pack') && !st.bossInPhase('frenzy'), 'in the pack phase');
  const walk = b.stats.walkSpeed;
  b.health = b.stats.maxHealth * 0.2;
  run(2, () => { p.health = p.stats.maxHealth; });
  assert(phases.join() === 'pack,frenzy' && rages === 1 && b.raged && b.stats.walkSpeed > walk, `frenzy (${phases}, rages ${rages})`);
  run(30);
  assert(phases.length === 2, 'each once');
  // two thresholds at one blow: both phases, in order
  const t2 = woodSetup(WOOD_SEC('kennels'), { x: 7700, z: 440 });
  const ph2 = []; t2.world.events.on('bossPhase', (e) => ph2.push(e.phase.id));
  t2.run(700, () => { t2.p.health = t2.p.stats.maxHealth; t2.p.awe = 0; });
  t2.st.boss.health = 5;
  t2.run(2);
  assert(ph2.join() === 'pack,frenzy', `both (${ph2})`);
  assert(t2.st.story.beats.find((x) => x.id === 'pack').fired && t2.st.story.beats.find((x) => x.id === 'frenzy').fired, 'their lines');
});

test('boss phases: a boss without phases still rages at half health and calls his dogs (the village captain)', () => {
  const world = new World({ seed: 7 });
  const p = world.addFighter(new Fighter({ stats: CHARACTERS.warrior, team: 'player', x: 7450, z: 440, controller: new Scripted() }));
  const st = new Stage(world, STAGE_VILLAGE);
  st.start(p, { section: HALL });
  hush(st);
  p.x = 7450;
  for (let i = 0; i < 900; i++) { world.tick(); st.update(); p.health = p.stats.maxHealth; p.awe = 0; }
  const n = st.livingFoes().length;
  st.boss.health = st.boss.stats.maxHealth * 0.45;
  world.tick(); st.update();
  assert(st.boss.raged && st.livingFoes().length === n + STAGE_VILLAGE.sections[HALL].boss.adds.length, 'raged, his dogs came');
});

// a tiny stage to drive the ending framework with (the judgment uses it in Stage 3)
const SEQ_STAGE = {
  id: 'seqTest', name: 'TEST', width: 1600,
  sections: [{
    id: 'throne', name: 'THRONE', x0: 0, x1: 1600, spawn: { x: 200, z: 440 }, waves: [],
    boss: { type: 'gladiator', name: 'Test King', health: 1, damage: 1, adds: ['grunt', 'grunt'] },
    hazards: [{ type: 'fire', x: 600, z: 440, w: 100, d: 60 }],
  }],
  sequence: { id: 'judgment', section: 'throne', beat: 'judgment', reward: 'campaign:complete', then: 'epilogue',
    place: { boss: { x: 900, z: 400, facing: -1 }, heroes: [{ x: 760, z: 400, facing: 1 }, { x: 700, z: 460, facing: 1 }] } },
  story: [{ id: 'judgment', hold: true, lines: [['RURIK', 'For the burning of our village.'], ['RURIK', 'I sentence you to death.']] }],
};
function seqSetup(flags = {}) {
  const world = new World({ seed: 12 });
  const c = new Pressing();
  const p = world.addFighter(new Fighter({ stats: CHARACTERS.warrior, team: 'player', x: 200, z: 440, controller: c }));
  const st = new Stage(world, SEQ_STAGE, { flags });
  const ev = { flag: [], award: [], done: [], won: 0, steps: [] };
  world.events.on('campaignFlag', (e) => ev.flag.push(e.key));
  world.events.on('sequenceAward', (e) => ev.award.push(e.reward));
  world.events.on('sequenceDone', (e) => ev.done.push(e.then));
  world.events.on('sequenceStep', (e) => ev.steps.push(e.step));
  world.events.on('stageWon', () => ev.won++);
  st.start(p);
  const run = (n) => { for (let i = 0; i < n; i++) { world.tick(); st.update(); p.health = p.stats.maxHealth; } };
  return { world, p, c, st, ev, run };
}

test('sequence: the king beaten is never killed; his defeat is caught once; the fight is cleared; the scene plays; the reward once; then won', () => {
  const { world, p, st, ev, run } = seqSetup();
  run(60);
  const b = st.boss;
  assert(b && b.spare, 'he is spared from the start');
  b.health = b.stats.maxHealth * 0.4; run(2); // (his dogs come)
  assert(st.livingFoes().length > 1, 'a fight going on');
  world.combat.resolve(p, b, { cut: 'slash', damage: 9999, hitstun: 10, hitstop: 4, knockback: { x: 100, y: 0 } }, { kind: 'melee', fromX: p.x, dir: 1, contact: { x: b.x, h: 60 } });
  assert(b.alive && b.health === 1, `on his knees, not dead (${b.health})`);
  run(3);
  assert(st.livingFoes().length === 1 && st.livingFoes()[0] === b, 'his men are gone');
  assert(st.hazardsOff && b.defeated && b.invincible, 'hazards off; he is beaten and out of reach');
  assert(Math.abs(p.x - 760) < 1 && Math.abs(b.x - 900) < 1 && p.facing === 1, `placed (${p.x}, ${b.x})`);
  assert(ev.flag.join() === 'judgment:down', `defeat saved at once (${ev.flag})`);
  run(60 * 30);
  assert(st.story.done.has('judgment'), 'the scene played');
  assert(ev.award.join() === 'campaign:complete' && ev.flag.join() === 'judgment:down,judgment:awarded', `rewarded once (${ev.award}; ${ev.flag})`);
  assert(ev.done.join() === 'epilogue' && ev.won === 1, `on to the epilogue, once (${ev.won})`);
  run(120);
  assert(ev.won === 1 && ev.award.length === 1, 'nothing twice');
  assert(ev.steps.join() === 'clear,place,play,award,done', ev.steps.join());
});

test('sequence: skipping the scene gives the same outcome; a reload after his defeat starts at the scene; after the reward, at the end', () => {
  {
    const { p, st, ev, run, c } = seqSetup();
    run(60); st.boss.health = 1; run(4);
    assert(st.sequence.step === 'play', st.sequence.step);
    for (let i = 0; i < 4; i++) { c.script = { [c.t + 1]: ['attack'] }; run(LINE.minSkip + 20); }
    assert(st.story.done.has('judgment') && ev.award.length === 1 && ev.won === 1, 'skipped line by line: same end');
    assert(p.alive, 'he is fine');
  }
  {
    const { st, ev, run } = seqSetup({ 'judgment:down': true });
    assert(st.sequence.step === 'clear' && st.boss?.spare, 'reloaded: straight to the scene, the king on his knees');
    run(3);
    assert(st.livingFoes().length === 1 && ev.flag.length === 0, 'no fight, nothing saved twice');
    st.story.skipScene(); run(LINE.max + 30);
    assert(ev.award.length === 1 && ev.won === 1, 'and the end');
  }
  {
    const { st, ev, run } = seqSetup({ 'judgment:down': true, 'judgment:awarded': true });
    run(2);
    assert(ev.won === 1 && ev.award.length === 0 && !st.story.done.has('judgment'), 'already rewarded: straight to the epilogue, no second reward');
  }
});

test('checkpoints: starting a level at a saved section skips what came before; the saved are there, the rest are gone', () => {
  // the village from the longhall, with the family saved (from the save) but not the barn
  const world = new World({ seed: 13 });
  const p = world.addFighter(new Fighter({ stats: CHARACTERS.warrior, team: 'player', x: 0, z: 440, controller: new Scripted() }));
  const st = new Stage(world, STAGE_VILLAGE, { rescued: ['mira'] });
  const beats = []; world.events.on('storyBeat', (e) => beats.push(e.beat.id));
  st.start(p, { section: 4 });
  assert(st.index === 4 && Math.abs(p.x - STAGE_VILLAGE.sections[4].spawn.x) < 1, 'at the longhall');
  for (let i = 0; i < 60; i++) { world.tick(); st.update(); }
  assert(!beats.includes('opening') && !beats.includes('hale') && !beats.includes('cry'), `nothing from before replays (${beats})`);
  assert(['safe', 'gathered'].includes(st.story.npc('mira').state), `the family is safe (${st.story.npc('mira').state})`);
  assert(st.story.npc('barn').state === 'gone', 'the barn people were never freed: gone');
  assert(!st.story.done.has('vow') && !st.story.beats.find((b) => b.id === 'gathered').fired, 'what is ahead is still to come');
  // every section of every campaign level starts on firm, safe ground
  for (const D of [STAGE_VILLAGE, STAGE_WOOD, STAGE_MINE, STAGE_ASCENT]) {
    const T = new Terrain(new World(), D.terrain);
    for (const s of D.sections) {
      const at = s.spawn ?? { x: s.x0 + 140, z: 440 };
      assert(T.safeAt(at.x, at.z) && T.groundAt(at.x, at.z) >= 0, `${D.id} ${s.id}: spawn on safe ground`);
    }
  }
});

test('campaign save: CONTINUE points at the last checkpoint; a level done points at the next; flags once', () => {
  const store = memStore();
  const P = new Progress(store);
  assert(P.campaign.at === null, 'nothing to continue');
  P.reach('village', 3);
  assert(new Progress(store).campaign.at.section === 3, 'the checkpoint survives a reload');
  P.finishLevel('village', 'gallowsWood');
  const at = new Progress(store).campaign.at;
  assert(at.level === 'gallowsWood' && at.section === 0, 'on to the next level');
  assert(P.setFlag('judgment:down') && !P.setFlag('judgment:down'), 'a flag is set once');
  assert(P.lose('joren') && P.lostIds().join() === 'joren', 'lost recorded');
  P.rescue('joren');
  assert(P.lostIds().length === 0, 'saved on a later try: no longer lost');
  // an old save (stage 1) without the new fields still loads
  const old = memStore(); old.setItem(PROGRESS.key, JSON.stringify({ v: 1, blood: 10, bonus: 1, picks: {}, claimed: {}, campaign: { levels: { village: true }, rescued: {} } }));
  const Q = new Progress(old);
  assert(Q.campaign.levels.village && Q.campaign.flags && Q.campaign.at === null, 'an old save loads');
});

test('campaign: no section\'s fight is held open by a man stuck off-screen (the mill yard: one buried in the roof behind)', () => {
  for (const data of [STAGE_VILLAGE, STAGE_WOOD, STAGE_GALLOWS, STAGE_MINE, STAGE_ASCENT]) {
    for (let k = 0; k < data.sections.length; k++) {
      const world = new World({ seed: 5 });
      const p = world.addFighter(new Fighter({ stats: CHARACTERS.warrior, team: 'player', x: 150, z: 440, controller: new Controller() }));
      const st = new Stage(world, data, {});
      st.start(p, { section: k });
      p.invincible = true;
      const sec = st.section;
      let f = 0;
      for (; f < 60 * 120 && st.phase === 'fight'; f++) {
        if (st.story) { st.story.current = null; st.story.queue = []; }
        if (f === 1 && sec.fightAt != null) { p.x = Math.max(p.x, sec.fightAt + 5); if (st.terrain) p.floor = p.h = Math.max(0, st.terrain.groundAt(p.x, p.z)); }
        if (f === 1 && sec.fightAfter) st.story?.done.add(sec.fightAfter); // (the scene it waits for, played)
        if (f === 1 && sec.needs) for (const pr of st.props) if (pr.tag === sec.needs) st.breakProp(pr, 1); // (what the hero must smash, smashed)
        // the hero fights whoever has arrived; nobody walks over to fetch a straggler
        if (f % 60 === 0) for (const e of world.fighters) if (e.team === 'enemy' && e.alive && !e.entering && e.state !== 'bossEntrance') { e.health = 0; e.removeMe = true; }
        world.tick(); st.update();
        if(st.millRescue?.started&&!st.millRescue.executioner.alive)st.millRescue.save();
      }
      const left = st.livingFoes().map((e) => `${e.stats.name}@${Math.round(e.x)},${Math.round(e.z)} h${Math.round(e.h)}/${e.floor}`);
      assert(st.phase !== 'fight', `${data.id} ${sec.id}: still fighting after ${f} frames: ${left.join(', ')}`);
    }
  }
});

test('village: the stables: smashing the gate bar frees the horses; they come out of the stable door and stampede the yard in lanes, trampling both sides, a couple of times, then they are gone', () => {
  const world = new World({ seed: 4 });
  const p = world.addFighter(new Fighter({ stats: CHARACTERS.warrior, team: 'player', x: 6300, z: 300, controller: new Scripted() }));
  const st = new Stage(world, STAGE_VILLAGE);
  const k = STAGE_VILLAGE.sections.findIndex((q) => q.id === 'stables');
  st.start(p, { section: k });
  hush(st);
  p.x = 6300; p.z = 300; p.invincible = true;
  st.fightOn = true; st.waveIndex = 99; // (no waves: this is about the horses)
  const lanes = st.hazards.filter((h) => h.type === 'stampede');
  assert(lanes.length === 3, 'three lanes');
  assert(lanes.some((h) => h.dir > 0) && lanes.some((h) => h.dir < 0), 'the herd turns both ways out of the door');
  for (let i = 0; i < 400; i++) { world.tick(); st.update(); }
  assert(lanes.every((h) => !h.live), 'nothing runs while they are shut in');
  st.breakProp(st.props.find((pr) => pr.tag === 'stables'), 1);
  for (let i = 0; i < 3; i++) { world.tick(); st.update(); }
  assert(st.story.rescued.has('horses'), 'the horses are freed');
  // whoever broke the bar has the whole warning to get clear: nothing runs for a beat, then
  // the first path lights up before a horse comes out
  assert(lanes.every((h) => st.stampedeState(h).phase === 'idle'), 'a beat for the gate to swing open');
  // an Ashen man standing in the lane that turns left, and the hero (no longer invincible)
  // in the first one, which turns right
  const e = createEnemy(world, 'grunt', 6000, 430);
  e.entering = false; e.controller = new Controller();
  p.invincible = false; p.x = 6800; p.z = 330;
  const trampled = new Set();
  world.events.on('hazardHit', (ev) => { if (ev.kind === 'trample') trampled.add(ev.fighter === p ? 'hero' : 'grunt'); });
  let warns = 0; let firstOut = null; let warnedFirst = false;
  world.events.on('stampedeWarn', () => warns++);
  for (let i = 0; i < 400; i++) {
    world.tick(); st.update(); p.health = p.stats.maxHealth;
    if (e.alive) { e.x = 6000; e.z = 430; } if (p.state === 'idle') { p.x = 6800; p.z = 330; }
    for (const h of lanes) {
      const S = st.stampedeState(h);
      if (!firstOut && S.phase === 'run') { firstOut = S.heads[0]; warnedFirst = warns > 0; }
    }
  }
  assert(firstOut && Math.abs(firstOut.x - 6370) < 20 && firstOut.z < 282, `the first horse comes out of the stable door (${firstOut && `${Math.round(firstOut.x)},${Math.round(firstOut.z)}`})`);
  assert(warnedFirst, 'its path is warned before it comes');
  assert(trampled.has('grunt') && trampled.has('hero'), `the horses run down anyone in their way (${[...trampled]})`);
  assert(warns >= 2, `each run is warned first (${warns})`);
  // every run sends Ashen men down its lane into the herd: they are smashed in numbers
  let smashed = 0;
  world.events.on('kill', (ev) => { if (ev.hazard === 'trample' && ev.defender.team === 'enemy') smashed++; });
  const end = Math.max(...lanes.map((h) => h.period * h.runs + (h.phase ?? 0)));
  for (let i = 0; i < end; i++) { world.tick(); st.update(); p.health = p.stats.maxHealth; p.x = 6300; p.z = 600; }
  assert(lanes.every((h) => st.stampedeState(h).phase === 'idle'), 'after their runs they are gone');
  assert(smashed >= 15, `the herd smashes Ashen men by the dozen (${smashed})`);
  assert(st.livingFoes().length <= 12, `never more men on than the cap (${st.livingFoes().length})`);
  for (const f of st.livingFoes()) { f.health = 0; f.fsm.change('dead'); }
  for (let i = 0; i < 5; i++) { world.tick(); st.update(); }
  assert(st.phase !== 'fight', 'the herd run and its men dead, the fight is won');
  assert(!st.stampedeSending(), 'the herd has run');
});

test('village: two of them wait up on the second roof (standing on it, not inside it)', () => {
  const world = new World({ seed: 4 });
  const p = world.addFighter(new Fighter({ stats: CHARACTERS.warrior, team: 'player', x: 3000, z: 440, controller: new Scripted() }));
  const st = new Stage(world, STAGE_VILLAGE);
  const k = STAGE_VILLAGE.sections.findIndex((q) => q.id === 'roofs');
  st.start(p, { section: k });
  hush(st);
  p.x = 3430; p.z = 410; p.floor = p.h = 120; p.invincible = true;
  for (let i = 0; i < 200 && !st.livingFoes().length; i++) { world.tick(); st.update(); }
  const foes = st.livingFoes();
  assert(foes.length === 2 && foes.every((f) => f.floor === 120 && f.h >= 119), foes.map((f) => `${f.stats.name} ${Math.round(f.x)} h${f.h}/${f.floor}`).join(', '));
});

test('wood: the convoy: the wagon rolls once the fight is on; wrecked, its prisoners run free and wait at the pass; left alone, it gets away with them', () => {
  const k = WOOD_SEC('convoy');
  // smashed in time
  {
    const { world, p, st, run } = woodSetup(k, { x: 5900, z: 440 });
    p.invincible = true;
    const wagon = st.props.find((pr) => pr.tag === 'convoy');
    const n = st.story.npc('convoy');
    const x0 = wagon.x;
    run(240, () => killFoes(world));
    assert(wagon.x > x0 + 50 && n.x === wagon.x && n.state === 'trapped', `it rolls, with them inside (${Math.round(x0)} -> ${Math.round(wagon.x)})`);
    st.breakProp(wagon, 1);
    run(3);
    assert(st.story.rescued.has('convoy'), 'freed when it is wrecked');
    const at = wagon.x;
    run(300, () => killFoes(world));
    assert(wagon.x === at, 'a wreck rolls no further');
  }
  // too slow
  {
    const { world, p, st, run } = woodSetup(k, { x: 5900, z: 440 });
    p.invincible = true;
    const lost = [];
    world.events.on('npcLost', (e) => lost.push(e.npc.id));
    const wagon = st.props.find((pr) => pr.tag === 'convoy');
    const secs = (wagon.roll.to - wagon.x) / wagon.roll.speed;
    assert(secs > 35 && secs < 60, `time enough to fight through, not to dawdle (${secs.toFixed(0)} s)`);
    run(60 * 70, () => killFoes(world));
    assert(wagon.escaped && lost.includes('convoy') && st.story.npc('convoy').state === 'lost', 'it gets away, and them with it');
    // dying here puts it back where it started, them still inside
    st.respawn();
    run(2);
    assert(!wagon.escaped && wagon.x === wagon.roll.from && st.story.npc('convoy').state === 'trapped', `the checkpoint resets it (${st.story.npc('convoy').state})`);
  }
});

test('wood: the wagon is no pushover: a few heavy blows will not wreck it', () => {
  assert(PROPS.wagon.hp >= 12, `it takes a real beating (hp ${PROPS.wagon.hp})`);
});


// ------------------------------------------------------------ Hollow Mountain (level 3)

const MINE_SEC = (id) => STAGE_MINE.sections.findIndex((q) => q.id === id);
function mineSetup(section, { x, z, hero = 'warrior' } = {}) {
  const world = new World({ seed: 13 });
  const p = world.addFighter(new Fighter({ stats: CHARACTERS[hero], team: 'player', x: x ?? 200, z: z ?? 440, controller: new Scripted() }));
  const st = new Stage(world, STAGE_MINE);
  st.start(p, { section });
  hush(st);
  if (x != null) { p.x = x; p.z = z; st.placeOnGround(p); }
  const run = (n, each) => { for (let i = 0; i < n; i++) { world.tick(); st.update(); each?.(i); } };
  return { world, p, st, run };
}
// (the walker breaks what a player would: the shackles, the counterweight, the fallen rock)
// (clear the waves until the boss walks in and is done with his entrance)
const bossUp = (st, run, p) => {
  for (let i = 0; i < 60 * 60 && !(st.boss && st.boss.state !== 'bossEntrance' && !st.boss.entering); i++) {
    run(1, () => { p.health = p.stats.maxHealth; p.awe = 0; });
    for (const e of st.livingFoes()) if (e !== st.boss) { e.health = 0; e.removeMe = true; }
  }
  run(30, () => { p.health = p.stats.maxHealth; p.awe = 0; });
};
const mineBreaker = (w, st, p) => { for (const pr of st.props) if (!pr.broken && (pr.opens || pr.kind === 'shackle') && Math.abs(pr.x - p.x) < 120) st.breakProp(pr, 1); };

test('mine: every hero walks Hollow Mountain (no upgrades), without a fall, frees the chained and digs out the passage', () => {
  for (const hero of ['warrior', 'mage', 'rogue']) {
    const r = campaignRun(STAGE_MINE, hero, { frames: 60 * 400, onTick: (w, st, p) => { mineBreaker(w, st, p); p.health = p.stats.maxHealth; } });
    assert(r.won === 1 && r.falls === 0, `${hero}: ${r.won ? 'out' : `stuck at x ${Math.round(r.x)} (${r.stage.section.id}, ${r.stage.phase})`} in ${r.secs.toFixed(0)} s, ${r.falls} falls`);
    for (const id of ['tobin', 'hilde', 'miners', 'passage']) assert(r.rescued.includes(id), `${hero}: ${id} freed (${r.rescued})`);
    for (const id of ['opening', 'warden', 'crusher', 'collapse', 'daylight']) assert(r.beats.includes(id), `${hero}: ${id} played (${r.beats})`);
  }
});

test('mine: the portcullis holds until its counterweight is broken; then the way is open', () => {
  const { world, p, st, run } = mineSetup(MINE_SEC('shaft'), { x: 4120, z: 420 });
  killFoes(world); st.fightOn = true; st.waveIndex = 99;
  const gate = st.terrain.blocks.find((b) => b.tag === 'portcullis');
  let opened = 0; world.events.on('wayOpen', (e) => { if (e.tag === 'portcullis') opened++; });
  p.controller.sample = function () { this.held = {}; this.moveX = 1; this.moveZ = 0; };
  run(120);
  assert(gate.solid && p.x < gate.x0, `the gate stops him (x ${Math.round(p.x)})`);
  st.breakProp(st.props.find((pr) => pr.opens === 'portcullis'), 1);
  run(120);
  assert(opened === 1 && !gate.solid, 'the counterweight drops; the gate goes up');
  assert(p.x > gate.x1, `he walks on through (x ${Math.round(p.x)})`);
});

test('mine: the collapse chases you: it hurts whoever it catches and throws him on ahead, onto firm ground (over the drop, never into it), and stops short of the passage', () => {
  const { world, p, st, run } = mineSetup(MINE_SEC('collapse'), { x: 7640, z: 420 });
  const hz = st.hazards.find((h) => h.type === 'collapse');
  let started = 0; world.events.on('collapseStart', () => started++);
  let hits = 0; world.events.on('hazardHit', (e) => { if (e.fighter === p && e.hazard === hz) hits++; });
  let falls = 0; world.events.on('pitFall', (e) => { if (e.fighter === p) falls++; });
  p.controller.sample = function () { this.held = {}; this.moveX = 0; this.moveZ = 0; };
  run(2);
  assert(started === 1 && hz.front != null && hz.front < 7300, `the rock starts behind him (${hz.front})`);
  for (let i = 0; i < 60 * 12 && !hits; i++) run(1, () => { p.health = p.stats.maxHealth; });
  run(90, () => { p.health = p.stats.maxHealth; });
  const chasm = st.terrain.pits.find((q) => q.x0 === 7700);
  assert(hits >= 1 && falls === 0 && p.x > chasm.x1, `caught, hurt and thrown clear over the chasm (${hits} hits, ${falls} falls, x ${Math.round(p.x)})`);
  // the last stretch's rock stops at the chasm; the passage is dug out beyond it
  const L = mineSetup(MINE_SEC('leap'), { x: 10780, z: 420 });
  const last = L.st.hazards.find((h) => h.type === 'collapse' && h.section === MINE_SEC('leap'));
  L.p.controller.sample = function () { this.held = {}; this.moveX = 0; this.moveZ = 0; };
  L.run(60 * 20, () => { L.p.health = L.p.stats.maxHealth; });
  assert(last.front === last.to, `it stops at ${last.to} (${last.front})`);
  const rubble = L.st.props.find((pr) => pr.opens === 'passage');
  assert(last.to + 30 < rubble.x - rubble.w / 2, 'the fallen rock can be dug out in front of it');
});

test('mine: the chase runs on through three stretches: each picks the rock up where it was, runs faster, and a death puts it back behind that stretch\'s start', () => {
  const ids = ['collapse', 'gallery', 'leap'];
  const walls = ids.map((id) => STAGE_MINE.sections[MINE_SEC(id)].hazards.find((h) => h.type === 'collapse'));
  assert(walls.every((w) => w) && walls[0].speed < walls[1].speed && walls[1].speed < walls[2].speed, 'one in each, each faster');
  const T = new Terrain(new World(), STAGE_MINE.terrain);
  for (const id of ids) {
    const sec = STAGE_MINE.sections[MINE_SEC(id)];
    const w = sec.hazards.find((h) => h.type === 'collapse');
    assert(w.x0 < sec.spawn.x - 60 && T.safeAt(sec.spawn.x, sec.spawn.z), `${id}: you start on firm ground ahead of the rock`);
  }
  const { world, p, st, run } = mineSetup(MINE_SEC('collapse'), { x: 7400, z: 440 });
  const [a, b] = ids.slice(0, 2).map((id) => st.hazards.find((h) => h.type === 'collapse' && h.section === MINE_SEC(id)));
  const chained = []; world.events.on('collapseStart', (e) => chained.push(e.chained));
  p.invincible = true;
  run(120);
  const was = a.front;
  // he runs on into the broken gallery
  p.x = 8950; p.z = 420; st.placeOnGround(p);
  run(2);
  assert(st.section.id === 'gallery', st.section.id);
  assert(a.front == null && b.front != null && b.front < was + 10, `the rock comes on from where it was (${Math.round(was)} -> ${Math.round(b.front)})`);
  assert(chained.join() === 'false,true', `RUN!, then FASTER! (${chained})`);
  // it doesn't drop out of sight: far behind, it catches up
  p.x = 9700; p.z = 420; st.placeOnGround(p);
  const f0 = b.front;
  run(60);
  assert(b.front - f0 > b.speed * 1.5, `it closes on him (${Math.round(b.front - f0)} px in a second)`);
  // dead here: back to this stretch's start, the rock behind it
  st.respawn();
  run(2);
  assert(b.front <= b.x0 + 10 && p.x > b.front + 60 && a.front == null, `back behind the start (${Math.round(b.front)}, hero ${Math.round(p.x)})`);
});

test('mine: the Ore Crusher is a regular enemy: a grunt\'s health, five times over the level, twice in pairs', () => {
  assert(ENEMIES.crusher.maxHealth === ENEMIES.grunt.maxHealth, `a grunt's health (${ENEMIES.crusher.maxHealth})`);
  assert(STAGE_MINE.sections.every((q) => q.boss?.type !== 'crusher'), 'no Crusher boss');
  const counts = STAGE_MINE.sections.flatMap((q) => q.waves.map((w) => w.filter((t) => t === 'crusher').length)).filter((n) => n > 0);
  assert(counts.length === 5 && counts.filter((n) => n === 2).length === 2 && counts.every((n) => n <= 2), `five times, twice in pairs (${counts})`);
});

test('mine: the Ore Crusher is iron: no blow staggers it or knocks it down', () => {
  const { world, p, st, run } = mineSetup(MINE_SEC('crusher'), { x: 6200, z: 440 });
  killFoes(world); st.fightOn = true; st.waveIndex = 99;
  const b = createEnemy(world, 'crusher', 6290, 440);
  st.placeOnGround(b);
  assert(b.stats.machine, 'the Crusher is here');
  // the warrior's heavy, point blank
  b.controller.sample = function () { this.held = {}; this.moveX = 0; this.moveZ = 0; };
  p.x = b.x - 90; p.z = b.z; p.facing = 1;
  let struck = 0; world.events.on('hit', (ev) => { if (ev.defender === b) struck++; });
  p.controller.script = { [p.controller.t + 2]: ['heavy'] };
  const seen = new Set();
  run(60, () => { p.health = p.stats.maxHealth; seen.add(b.state); });
  assert(struck >= 1, 'the blow lands');
  assert(!seen.has('knockdown') && !seen.has('hitstun') && !seen.has('stagger'), `it shrugs it off (${[...seen]})`);
});

test('mine: the Chain Warden calls up his ghouls at half health', () => {
  const { world, p, st, run } = mineSetup(MINE_SEC('river'), { x: 5400, z: 440 });
  const phases = []; world.events.on('bossPhase', (e) => phases.push(e.phase.id));
  bossUp(st, run, p);
  assert(st.boss, 'the Warden is here');
  st.boss.health = st.boss.stats.maxHealth * 0.4;
  run(2, () => { p.health = p.stats.maxHealth; });
  assert(phases.join() === 'chains' && st.boss.raged, `his chains (${phases})`);
});

// ---------------------------------------------------------- the campaign sweep's finds

test('village: regular Cinder reaches the player even with a hero standing in his road', () => {
  const world = new World({ seed: 3 });
  const p = world.addFighter(new Fighter({ stats: CHARACTERS.warrior, team: 'player', x: 200, z: 430, controller: new Pressing({}, { right: true }) }));
  const st = new Stage(world, STAGE_VILLAGE);
  const k = STAGE_VILLAGE.sections.findIndex((q) => q.id === 'mill');
  st.start(p, { section: k });
  hush(st);
  const sec = STAGE_VILLAGE.sections[k];
  p.x = sec.x1 - 260; p.z = 430; st.placeOnGround(p);
  st.fightOn = true; st.waveIndex = sec.waves.length; st.waveDelay = 0;
  for (let i = 0; i < 60 * 20; i++) { p.health = p.stats.maxHealth; world.tick(); st.update(); }
  const cinder=st.livingFoes().find(f=>f.stats.name==='Brother Cinder');
  assert(cinder && !cinder.entering && !cinder.invincible && !st.boss, 'he reached the playable space as a vulnerable regular enemy');
});

test('mine: nobody walks on from behind the portcullis while it is down (he could never be reached)', () => {
  const { world, st } = mineSetup(MINE_SEC('shaft'), { x: 3980, z: 420 });
  killFoes(world);
  st.spawnWave(['grunt', 'stalker', 'grunt', 'butcher']);
  const gate = st.terrain.blocks.find((b) => b.tag === 'portcullis');
  const foes = world.fighters.filter((f) => f.team === 'enemy');
  assert(foes.length === 4 && foes.every((f) => f.x < gate.x0), `all on this side (${foes.map((f) => Math.round(f.x))})`);
});

test('terrain: a man left inside a wall (a finisher carried him there) steps out the nearest side', () => {
  const { world, p, st, run } = mineSetup(MINE_SEC('shaft'), { x: 4100, z: 420 });
  killFoes(world); st.fightOn = true; st.waveIndex = 99;
  const gate = st.terrain.blocks.find((b) => b.tag === 'portcullis');
  p.x = gate.x0 + 4; p.h = p.floor = 0;
  run(2);
  assert(!st.terrain.wallAt(p.x, p.z, p.h) && p.x < gate.x0, `out on the near side (x ${Math.round(p.x)})`);
});

// ------------------------------------------------------------ The Shattered Ascent (level 4)

const ASC_SEC = (id) => STAGE_ASCENT.sections.findIndex((q) => q.id === id);
function ascentSetup(section, { x, z, hero = 'warrior', opts = {} } = {}) {
  const world = new World({ seed: 17 });
  const p = world.addFighter(new Fighter({ stats: CHARACTERS[hero], team: 'player', x: x ?? 200, z: z ?? 440, controller: new Scripted() }));
  const st = new Stage(world, STAGE_ASCENT, opts);
  st.start(p, { section });
  hush(st);
  if (x != null) { p.x = x; p.z = z; st.placeOnGround(p); }
  const run = (n, each) => { for (let i = 0; i < n; i++) { world.tick(); st.update(); each?.(i); } };
  return { world, p, st, run };
}
// (the walker smashes what a player would: the catapults, Bram's chain)
const ascentBreaker = (w, st, p) => { for (const pr of st.props) if (!pr.broken && (pr.kind === 'catapult' || pr.kind === 'shackle') && Math.abs(pr.x - p.x) < 140) st.breakProp(pr, 1); };

test('ascent: the level is wired in: Hollow Mountain leads to it, its cutaway exists', () => {
  assert(STAGES[STAGE_MINE.next.id] === STAGE_ASCENT, 'the mine leads on to the ascent');
  // (scenes/CutawayScene.js needs Phaser to load: read it as text)
  const src = readFileSync(new URL('../src/scenes/CutawayScene.js', import.meta.url), 'utf8');
  assert(new RegExp(`\\n  ${STAGE_ASCENT.cutaway}: \\{`).test(src), `the king's fourth scene (${STAGE_ASCENT.cutaway})`);
  assert(src.includes("{ act: 'horns' }") && src.includes("{ act: 'kill' }") && src.includes("b.act === 'kill'"), 'horns, and the captain who brings bad news');
});

test('ascent: every hero walks the Shattered Ascent (no upgrades), without a fall, defends the shelter, wrecks the battery, frees Bram', () => {
  for (const hero of ['warrior', 'mage', 'rogue']) {
    let shells = 0;
    const r = campaignRun(STAGE_ASCENT, hero, {
      frames: 60 * 420,
      onTick: (w, st, p, f) => {
        if (f === 0) w.events.on('shellLand', () => shells++);
        ascentBreaker(w, st, p); p.health = p.stats.maxHealth;
      },
    });
    assert(r.won === 1 && r.falls === 0, `${hero}: ${r.won ? 'out' : `stuck at x ${Math.round(r.x)} (${r.stage.section.id}, ${r.stage.phase})`} in ${r.secs.toFixed(0)} s, ${r.falls} falls`);
    for (const id of ['shelter', 'bram']) assert(r.rescued.includes(id), `${hero}: ${id} saved (${r.rescued})`);
    for (const id of ['opening', 'silenced', 'orsk', 'retreat', 'gates']) assert(r.beats.includes(id), `${hero}: ${id} played (${r.beats})`);
    assert(shells > 0, `${hero}: the catapults fired on the way (${shells})`);
  }
});

test('ascent: the bombardment: stones land near the hero, hurt both sides, never by a drop; each catapult smashed is one stone fewer; none left, it stops', () => {
  const { world, p, st, run } = ascentSetup(ASC_SEC('battery'), { x: 6900, z: 420 });
  st.fightOn = true; st.waveIndex = 99;
  const hz = st.hazards.find((h) => h.type === 'bombard' && h.section === ASC_SEC('battery'));
  const land = []; world.events.on('shellLand', (e) => land.push(e.shell));
  const launches = []; world.events.on('shellLaunch', (e) => launches.push(e.count));
  let hurtHero = 0; let hurtFoe = 0;
  world.events.on('hazardHit', (e) => { if (e.fighter === p) hurtHero++; else if (e.fighter.team === 'enemy') hurtFoe++; });
  p.controller.sample = function () { this.held = {}; this.moveX = 0; this.moveZ = 0; };
  // an Ashen man standing right by him
  const e = createEnemy(world, 'grunt', 6930, 420);
  e.entering = false; e.controller = new Controller(); st.placeOnGround(e);
  run(60 * 8, () => { p.health = p.stats.maxHealth; if (e.alive) { e.health = e.stats.maxHealth; e.x = p.x + 30; e.z = p.z; } });
  assert(launches.length >= 2 && launches.every((n) => n <= 2), `volleys of two (${launches})`);
  assert(land.length >= 3 && land.every((s) => Math.abs(s.x - p.x) < 260), `the stones come down near him (${land.map((s) => Math.round(s.x - p.x))})`);
  assert(hurtHero >= 1 && hurtFoe >= 1, `they hit whoever is under them (hero ${hurtHero}, Ashen ${hurtFoe})`);
  const cats = st.props.filter((pr) => pr.tag === 'battery');
  assert(cats.length === 3, 'three catapults');
  st.breakProp(cats[0], 1); st.breakProp(cats[1], 1);
  assert(st.bombardShots(hz) === 1, 'two smashed: one stone a volley');
  // the fight is won but the section holds while a catapult stands
  killFoes(world);
  run(120);
  assert(st.phase === 'fight', 'the way on stays shut while a catapult stands');
  const beats = []; world.events.on('storyBeat', (ev) => beats.push(ev.beat.id));
  st.story.beats.find((b) => b.id === 'silenced').fired = false;
  st.breakProp(cats[2], 1);
  assert(st.bombardShots(hz) === 0, 'all smashed: silence');
  const n = land.length;
  run(400, () => killFoes(world));
  assert(land.length <= n + 2, 'nothing more is thrown');
  assert(st.phase !== 'fight' && beats.includes('silenced'), `the way on opens; the beat plays (${st.phase}, ${beats})`);
  // no stone is ever aimed by the bridge's drop
  const b2 = ascentSetup(ASC_SEC('bombardment'), { x: 5060, z: 420 });
  const land2 = []; b2.world.events.on('shellLand', (ev) => land2.push(ev.shell));
  b2.p.controller.sample = function () { this.held = {}; this.moveX = 0; this.moveZ = 0; };
  b2.run(60 * 10, () => { b2.p.health = b2.p.stats.maxHealth; b2.p.x = 5060; });
  assert(land2.every((s) => s.x < 5100 - 150 || s.x > 5400 + 150), `none by the gorge (${land2.map((s) => Math.round(s.x))})`);
});

test('ascent: the shelter: the miners are safe once the men on them are dead; Hilde knows her brother is at the battery (if she was saved)', () => {
  const { world, p, st, run } = ascentSetup(ASC_SEC('shelter'), { x: 3700, z: 440, opts: { saved: ['hilde'] } });
  p.invincible = true;
  for (const b of st.story.beats) if (['shelter', 'hilde'].includes(b.id)) b.fired = false;
  const beats = []; world.events.on('storyBeat', (e) => beats.push(e.beat.id));
  assert(st.story.npc('shelter').state === 'threatened', 'pinned down');
  run(60 * 30, () => {killFoes(world);acceptNpcInvitations(st);});
  assert(st.story.rescued.has('shelter'), 'defended');
  run(60 * 20, () => acceptNpcInvitations(st));
  assert(beats.includes('shelter') && beats.includes('hilde'), `their lines (${beats})`);
});

test('ascent: Siege Commander Orsk has the Keep fire on his own camp at two thirds, and goes berserk at one third', () => {
  const { world, p, st, run } = ascentSetup(ASC_SEC('camp'), { x: 8000, z: 440 });
  const phases = []; world.events.on('bossPhase', (e) => phases.push(e.phase.id));
  bossUp(st, run, p);
  const b = st.boss;
  assert(b?.stats.name === 'Siege Commander Orsk', 'Orsk is here');
  const hz = st.hazards.find((h) => h.type === 'bombard' && h.section === ASC_SEC('camp'));
  assert(st.bombardShots(hz) === 0, 'no barrage yet');
  b.health = b.stats.maxHealth * 0.6;
  run(2, () => { p.health = p.stats.maxHealth; });
  assert(phases.join() === 'barrage' && st.bombardShots(hz) === 2, `the barrage (${phases})`);
  b.health = b.stats.maxHealth * 0.2;
  run(2, () => { p.health = p.stats.maxHealth; });
  assert(phases.join() === 'barrage,berserk' && b.raged, `berserk (${phases})`);
});


test('ascent: Nicholas (Nick) guides every hero up the mountain, ahead of the lead, back in a fight, and dies in Orsk\'s camp after his last words', () => {
  for (const hero of ['warrior', 'mage', 'rogue']) {
    let worst = 0; let ahead = 0; let samples = 0; let died = 0;
    const r = campaignRun(STAGE_ASCENT, hero, {
      frames: 60 * 420,
      onTick: (w, st, p, f) => {
        if (f === 0) w.events.on('npcDied', (e) => { if (e.npc.id === 'nicholas') died++; });
        ascentBreaker(w, st, p); p.health = p.stats.maxHealth;
        const n = st.story.npc('nicholas');
        if (n.state !== 'guide' || f < 200) return;
        assert(st.terrain.safeAt(n.x, n.z), `${hero}: he stands on firm ground (x ${Math.round(n.x)}, z ${Math.round(n.z)})`);
        worst = Math.max(worst, Math.abs(n.x - p.x)); samples++; if (n.x > p.x) ahead++;
      },
    });
    const n = r.stage.story.npc('nicholas');
    assert(r.won === 1, `${hero}: out of the level (stuck at ${Math.round(r.x)})`);
    for (const id of ['guide', 'rocks', 'stair', 'stones', 'bridge', 'lastWords', 'gates']) assert(r.beats.includes(id), `${hero}: ${id} played (${r.beats})`);
    assert(r.beats.indexOf('lastWords') < r.beats.indexOf('gates'), 'his last words before the gates');
    assert(n.state === 'dead' && died === 1, `${hero}: dead once his words are said (${n.state})`);
    assert(worst <= GUIDE.far + 300, `${hero}: never far from the hero (${Math.round(worst)} px)`);
    assert(ahead / samples > 0.4, `${hero}: he leads, mostly (${ahead}/${samples} ahead)`);
  }
});

test('ascent: the guide waits short of a fight that is not won, keeps behind the heroes in one, and the Keep\'s barrage strikes him down', () => {
  {
    // the cliff road: he stops short of where its fight starts
    const { st, p, run } = ascentSetup(0, { x: 900, z: 420 });
    const n = st.story.npc('nicholas');
    const fightAt = STAGE_ASCENT.sections[0].fightAt;
    p.controller.sample = function () { this.held = {}; this.moveX = 0; this.moveZ = 0; };
    run(60 * 8, () => { p.health = p.stats.maxHealth; });
    assert(n.state === 'guide' && n.x <= fightAt - GUIDE.wait + 1 && n.x > p.x, `he waits at the fight line (${Math.round(n.x)}, fight at ${fightAt})`);
    // a man on the road: he keeps back behind the hero
    const e = createEnemy(st.world, 'grunt', p.x + 100, p.z); e.entering = false; e.controller = new Controller(); st.placeOnGround(e);
    run(60 * 4, () => { p.health = p.stats.maxHealth; if (e.alive) e.health = e.stats.maxHealth; });
    assert(n.x < p.x - GUIDE.back * 0.6, `back behind the hero in a fight (${Math.round(n.x)} vs ${Math.round(p.x)})`);
  }
  {
    const { world, p, st, run } = ascentSetup(ASC_SEC('camp'), { x: 8000, z: 440 });
    const n = st.story.npc('nicholas');
    assert(n.state === 'guide', `rising in the camp, he is with you (${n.state})`);
    for (const b of st.story.beats) if (['struck', 'lastWords'].includes(b.id)) { b.fired = false; st.story.done.delete(b.id); }
    const beats = []; world.events.on('storyBeat', (e) => beats.push(e.beat.id));
    bossUp(st, run, p);
    st.boss.health = st.boss.stats.maxHealth * 0.6;
    run(4, () => { p.health = p.stats.maxHealth; });
    assert(n.state === 'dying', `the Keep's stones strike him down (${n.state})`);
    // the hero falls in the fight: back at the checkpoint he is on his feet again
    st.respawn();
    assert(n.state === 'guide' && !st.story.done.has('struck'), `up again for the fight again (${n.state})`);
    p.x = 8000; st.placeOnGround(p);
    bossUp(st, run, p);
    st.boss.health = st.boss.stats.maxHealth * 0.6;
    run(4, () => { p.health = p.stats.maxHealth; });
    assert(n.state === 'dying', 'struck again');
    run(60 * 60, () => { p.health = p.stats.maxHealth; killFoes(world); for (const pl of st.players) pl.controller.registerPress?.('padRight'); });
    assert(beats.includes('struck') && beats.includes('lastWords'), `his cry and his last words (${beats})`);
    assert(n.state === 'dead', `then he is gone (${n.state})`);
  }
  {
    // starting past the camp, he is already gone; starting before it, he walks on with you
    const { st } = ascentSetup(ASC_SEC('pass'));
    assert(st.story.npc('nicholas').state === 'gone' && st.story.done.has('lastWords'), 'past the camp: gone, his words spent');
    const b = ascentSetup(ASC_SEC('battery'));
    const n = b.st.story.npc('nicholas');
    assert(n.state === 'guide' && Math.abs(n.x - STAGE_ASCENT.sections[ASC_SEC('battery')].spawn.x) < 500, `at the battery: with you (${n.state} at ${Math.round(n.x)})`);
  }
});

test('wood: the pilgrim is Nicholas (Nick), who says he will meet them on the far side of the mountain', () => {
  const pg = STAGE_WOOD.npcs.find((n) => n.id === 'pilgrim');
  const beat = STAGE_WOOD.story.find((b) => b.id === 'pilgrim');
  assert(pg.name === 'Nicholas' && pg.art === 'nicholas' && beat.lines.every(([w]) => w === 'NICHOLAS'), 'his name, his art, his voice');
  assert(speakerInfo('NICHOLAS').name === 'Nicholas' && speakerInfo('NICHOLAS').portrait === 'nicholas', 'his portrait file');
  assert(STAGE_ASCENT.npcs.some((n) => n.id === 'nicholas' && n.guide), 'and he guides them on the ascent');
});

// ------------------------------------------------------------ The Iron Gates (level 5)

const GATE_SEC = (id) => STAGE_GATES.sections.findIndex((q) => q.id === id);
function gatesSetup(section, { x, z, hero = 'warrior', opts = {} } = {}) {
  const world = new World({ seed: 23 });
  const p = world.addFighter(new Fighter({ stats: CHARACTERS[hero], team: 'player', x: x ?? 200, z: z ?? 440, controller: new Scripted() }));
  const st = new Stage(world, STAGE_GATES, opts);
  st.start(p, { section });
  hush(st);
  if (x != null) { p.x = x; p.z = z; st.placeOnGround(p); }
  const run = (n, each) => { for (let i = 0; i < n; i++) { world.tick(); st.update(); each?.(i); } };
  return { world, p, st, run };
}
// (the walker smashes what a player would: the winch chains, the granary's bar)
const gatesBreaker = (w, st, p) => {
  for (const pr of st.props) if (!pr.broken && (pr.kind === 'winch' || pr.kind === 'wreckage') && Math.abs(pr.x - p.x) < 160) st.breakProp(pr, 1);
  // (and opens Vincent's cage, as a player at its lock would)
  const v = st.story.npc('vincent');
  if (v?.state === 'trapped' && Math.abs(v.x - p.x) < 200 && !st.livingFoes().length) st.story.free(v);
};
const EVERYONE = ['shelter', 'bram', 'hilde', 'joren', 'convoy'];
// a fighter killed the way a blow kills him (Stage listens for 'kill')
const slay = (world, f) => { f.health = 0; world.events.emit('kill', { defender: f, attacker: null }); };


// ------------------------------------------------------------ The Black Keep (level 6, the finale)

const KEEP_SEC = (id) => STAGE_KEEP.sections.findIndex((q) => q.id === id);
function keepSetup(section, { x, z, hero = 'warrior', opts = {} } = {}) {
  const world = new World({ seed: 31 });
  const p = world.addFighter(new Fighter({ stats: CHARACTERS[hero], team: 'player', x: x ?? 200, z: z ?? 440, controller: new Scripted() }));
  const st = new Stage(world, STAGE_KEEP, opts);
  st.start(p, { section });
  hush(st);
  if (x != null) { p.x = x; p.z = z; st.placeOnGround(p); }
  const run = (n, each) => { for (let i = 0; i < n; i++) { world.tick(); st.update(); each?.(i); } };
  return { world, p, st, run };
}
// (the walker smashes what a player would: the forge shackle, the mill pins, the spires; and opens the cells)
const keepBreaker = (w, st, p) => {
  for (const pr of st.props) if (!pr.broken && ['shackle', 'pin', 'spire'].includes(pr.kind) && Math.abs(pr.x - p.x) < 200) st.breakProp(pr, 1);
  for (const id of ['cellsLow', 'cellsMid', 'ilse']) {
    const n = st.story.npc(id);
    if (n?.state === 'trapped' && Math.abs(n.x - p.x) < 220 && !st.livingFoes().length) st.story.free(n);
  }
};
const SAVED_ALL = ['shelter', 'convoy', 'vincent', 'joren'];

test('keep: the level is wired in: the gates lead to it, it is the last, its speakers all exist', () => {
  assert(STAGES[STAGE_GATES.next.id] === STAGE_KEEP, 'the gates lead on to the Keep');
  assert(STAGE_KEEP.next == null && STAGE_KEEP.doneTitle === 'THE OATH IS KEPT', 'the finale');
  for (const b of STAGE_KEEP.story) for (const [who] of b.lines ?? []) assert(who === 'VOICE' || SPEAKERS[who] || speakerInfo(who), `${b.id}: speaker ${who}`);
  for (const s of STAGE_KEEP.sections) if (s.boss) {
    const crimes = s.boss.sentence?.crimes ?? [];
    assert(crimes.length >= 2 && crimes.every((c) => c.length <= 100) && s.boss.sentence.last, `${s.id}: a sentence for the boss`);
  }
});

test('keep: every hero walks the Black Keep (no upgrades), without a fall, frees every cell and the forge, and keeps the oath; the saved come back', () => {
  for (const hero of ['warrior', 'mage', 'rogue']) {
    const where = [];
    const r = campaignRun(STAGE_KEEP, hero, {
      frames: 60 * 480, opts: { saved: SAVED_ALL },
      onTick: (w, st, p) => { keepBreaker(w, st, p); p.health = p.stats.maxHealth; },
      setup: (w, st, p) => w.events.on('pitFall', (e) => { if (e.fighter === p) where.push(`${st.section.id} x ${Math.round(p.x)}`); }),
    });
    assert(r.won === 1 && r.falls === 0, `${hero}: ${r.won ? 'out' : `stuck at x ${Math.round(r.x)} (${r.stage.section.id}, ${r.stage.phase})`} in ${r.secs.toFixed(0)} s, ${r.falls} falls (${where})`);
    for (const id of ['cellsLow', 'cellsMid', 'ilse', 'forge']) assert(r.rescued.includes(id), `${hero}: ${id} saved (${r.rescued})`);
    for (const id of ['opening', 'cells', 'forge', 'kings', 'run', 'doorsThrone', 'king']) assert(r.beats.includes(id), `${hero}: ${id} played (${r.beats})`);
  }
});

test('keep: the finale has its own track (Nick\'s "12 Showdown"): the whole level, and the King keeps it', () => {
  const src = readFileSync(new URL('../src/core/Music.js', import.meta.url), 'utf8');
  assert(/showdown: 'assets\/audio\/showdown\.mp3'/.test(src), 'the track is listed');
  assert(readFileSync(new URL('../assets/audio/showdown.mp3', import.meta.url)).length > 1e6, 'the file is there');
  const king = STAGE_KEEP.sections.find((s) => s.id === 'throne').boss;
  assert(STAGE_KEEP.music === 'showdown' && king.music === 'showdown', 'the level and the King');
});

test('beating a level plays the stage-clear tune (Nick\'s "06 Stage Clear"), except the Burning Village', () => {
  const music = readFileSync(new URL('../src/core/Music.js', import.meta.url), 'utf8');
  assert(/clear: 'assets\/audio\/stage-clear\.mp3'/.test(music), 'the tune is listed');
  assert(readFileSync(new URL('../assets/audio/stage-clear.mp3', import.meta.url)).length > 10000, 'the file is there');
  const arena = readFileSync(new URL('../src/scenes/ArenaScene.js', import.meta.url), 'utf8');
  assert(/ev\.on\('stageWon', \(\{ stats \}\) => \{\s*(\/\/[^\n]*\s*)?if \(this\.stageData\.clearTune !== false\) playCue\(this, 'clear'\)/.test(arena), 'played first thing when a level is won, campaign or not');
  // (Nick, 2026-10-23: no fanfare at the end of level 1; every other level keeps it)
  assert(STAGE_VILLAGE.clearTune === false, 'the Burning Village ends without it');
  for (const s of Object.values(STAGES)) if (s.id !== 'village') assert(s.clearTune !== false, `${s.id} keeps it`);
});

test('keep: the King duels: three parries or blocks break his composure and open him; until then his guard turns most of a blow; a blow into his guard is answered', () => {
  const { world, p, st, run } = keepSetup(KEEP_SEC('throne'), { x: 16400, z: 420 });
  st.fightOn = true; st.waveIndex = 99;
  run(90, () => { p.health = p.stats.maxHealth; });
  const k = st.boss;
  assert(k?.stats.name && st.duelist() === k, 'the King is the duelist');
  run(1, () => {});
  assert(k.ward < 1, `his guard wards him (${k.ward})`);
  const opened = []; world.events.on('kingOpen', (e) => opened.push(e));
  for (let i = 0; i < 3; i++) world.events.emit('parry', { attacker: k, defender: p });
  assert(opened.length === 1 && k.openFor > 0, 'three parries open him');
  run(1, () => { p.health = p.stats.maxHealth; });
  assert((k.ward ?? 1) === 1, `open, he takes the full blow (${k.ward})`);
  const counters = []; world.events.on('emberCounter', (e) => counters.push(e));
  p.x = k.x - k.facing * 60; p.z = k.z; p.invincible = false;
  const hp = p.health;
  world.events.emit('block', { attacker: p, defender: k });
  assert(counters.length === 1 && p.health < hp, 'a blow into his guard burns back');
});

test('keep: the colossus: at half health the King is held in the statue, untouchable, until every spire breaks; then the heart opens; at a quarter he comes down and the ground shrinks', () => {
  const { world, p, st, run } = keepSetup(KEEP_SEC('throne'), { x: 16400, z: 420 });
  st.fightOn = true; st.waveIndex = 99;
  run(90, () => { p.health = p.stats.maxHealth; });
  const k = st.boss;
  const ph = (id) => STAGE_KEEP.sections[KEEP_SEC('throne')].boss.phases.find((q) => q.id === id);
  k.health = k.stats.maxHealth * ph('colossus').at - 1;
  run(30, () => { p.health = p.stats.maxHealth; });
  assert(st.bossInPhase('colossus') && k.invincible, 'held in the colossus, untouchable');
  const hearts = []; world.events.on('heartOpen', (e) => hearts.push(e));
  const spires = st.props.filter((q) => q.tag === 'spire');
  for (const s of spires.slice(0, -1)) st.breakProp(s, 1);
  run(10, () => { p.health = p.stats.maxHealth; });
  assert(k.invincible && !hearts.length, 'still held with one spire up');
  st.breakProp(spires.at(-1), 1);
  run(10, () => { p.health = p.stats.maxHealth; });
  assert(hearts.length === 1 && !k.invincible, 'the heart opens');
  const B = world.bounds; const [x0, x1] = [B.minX, B.maxX];
  k.health = k.stats.maxHealth * ph('last').at - 1;
  run(60 * 12, () => { p.health = p.stats.maxHealth; k.health = Math.max(k.health, 1); });
  assert(st.bossInPhase('last') && !k.held && !k.brain, 'out of the statue, thinking again');
  assert(B.minX > x0 + 100 && B.maxX < x1 - 100 && B.minX >= ph('last').squeeze.x0 - 1 && B.maxX <= ph('last').squeeze.x1 + 1, `the last ground closes in (${x0}..${x1} to ${B.minX}..${B.maxX})`);
});

test('keep: the gale gives warning, then pushes; behind the stones it does not', () => {
  const { world, p, st, run } = keepSetup(KEEP_SEC('causeway'), { x: 600, z: 440 });
  const hz = st.hazards.find((h) => h.type === 'drift');
  assert(hz, 'a gale on the causeway');
  const warns = []; const gusts = [];
  world.events.on('gustWarn', (e) => warns.push(world.frame)); world.events.on('gustStart', (e) => gusts.push(world.frame));
  const pushed = (z) => {
    p.x = 600; p.z = z; st.placeOnGround(p);
    let moved = 0; let x0 = p.x; let z0 = p.z;
    run(hz.period ?? 600, () => { if (hz.state === 'blow') moved += Math.abs(p.z - z0) + Math.abs(p.x - x0); x0 = p.x; z0 = p.z; });
    return moved;
  };
  const open = pushed(380);
  assert(warns.length && gusts.length && warns[0] < gusts[0], `warned first (${warns[0]}, ${gusts[0]})`);
  assert(open > 20, `the gust pushes (${open})`);
  assert(pushed(hz.shelter.z - 10) === 0, 'behind the stones, nothing');
});

test('every level: no enemy and no boss ever pops into view (each comes on from off-screen, or stood there before anyone could see the spot)', () => {
  const heal = (w, st, p) => { p.health = p.stats.maxHealth; };
  const levels = [
    ['oath', STAGE, heal], ['gallows', STAGE_GALLOWS, heal], ['village', STAGE_VILLAGE, heal], ['wood', STAGE_WOOD, heal],
    ['mine', STAGE_MINE, mineBreaker, {}, 400], ['ascent', STAGE_ASCENT, ascentBreaker, {}, 420], ['gates', STAGE_GATES, gatesBreaker, { saved: EVERYONE }, 420],
    ['keep', STAGE_KEEP, keepBreaker, { saved: SAVED_ALL }, 480],
  ];
  const seen = []; const unfinished = [];
  for (const [name, data, each, opts = {}, secs = 300] of levels) {
    const r = campaignRun(data, 'warrior', {
      frames: 60 * secs, opts,
      onTick: (w, st, p) => { each(w, st, p); p.health = p.stats.maxHealth; },
      setup: (world, st) => {
        const add = world.addFighter.bind(world);
        world.addFighter = (f) => {
          const heroes = world.fighters.filter((q) => q.team === 'player' && q.alive);
          if (f.team === 'enemy' && inView(world, heroes, f.x)) seen.push([f, `${name}/${st.section.id}: ${f.stats.name} at x ${Math.round(f.x)} (hero at ${Math.round(heroes[0]?.x)})`]);
          return add(f);
        };
      },
    });
    if (!r.won) unfinished.push(`${name} (${r.stage.section.id})`);
  }
  assert(!unfinished.length, `the walk got through every level (stuck: ${unfinished.join(', ')})`);
  // (one dropped from the floor above falls in from over the top of the screen: the Spire)
  const popped = seen.filter(([f]) => !f.dropIn).map(([, s]) => s);
  assert(!popped.length, `popped in: ${popped.join('; ')}`);
});

test('gates: the level is wired in: the ascent leads to it, its cutaway exists', () => {
  assert(STAGES[STAGE_ASCENT.next.id] === STAGE_GATES, 'the ascent leads on to the gates');
  const src = readFileSync(new URL('../src/scenes/CutawayScene.js', import.meta.url), 'utf8');
  assert(new RegExp(`\\n  ${STAGE_GATES.cutaway}: \\{`).test(src), `the king's fifth scene (${STAGE_GATES.cutaway})`);
  assert(src.includes("{ act: 'helm' }") && src.includes("{ act: 'gutter' }") && src.includes("b.act === 'gutter'"), 'the helm, and the fire that goes out');
});

test('gates: every hero walks the Iron Gates (no upgrades), without a fall, raises the gate, saves the town; the saved come back', () => {
  for (const hero of ['warrior', 'mage', 'rogue']) {
    const r = campaignRun(STAGE_GATES, hero, {
      frames: 60 * 420, opts: { saved: EVERYONE },
      onTick: (w, st, p) => { gatesBreaker(w, st, p); p.health = p.stats.maxHealth; },
    });
    assert(r.won === 1 && r.falls === 0, `${hero}: ${r.won ? 'out' : `stuck at x ${Math.round(r.x)} (${r.stage.section.id}, ${r.stage.phase})`} in ${r.secs.toFixed(0)} s, ${r.falls} falls`);
    for (const id of ['townsfolk', 'granary', 'vincent']) assert(r.rescued.includes(id), `${hero}: ${id} saved (${r.rescued})`);
    for (const id of ['caged', 'tower', 'scorpion', 'postern', 'opening', 'gateUp', 'miners', 'convoy', 'joren', 'malgor', 'fallen', 'returned', 'bramHilde', 'keep']) assert(r.beats.includes(id)||r.stage.story.beats.find(b=>b.id===id)?.npcTalkFor, `${hero}: ${id} played or offers an optional NPC conversation (${r.beats})`);
    assert(r.stage.story.beats.find(b=>b.id==='vincent').npcTalkFor==='vincent','Vincent waits for an optional conversation; it cannot block the route');
    assert(!r.beats.includes('alone'), `${hero}: not alone with the miners back (${r.beats})`);
  }
  // nobody saved on the way: nobody comes back
  const r = campaignRun(STAGE_GATES, 'warrior', { frames: 60 * 420, onTick: (w, st, p) => { gatesBreaker(w, st, p); p.health = p.stats.maxHealth; } });
  assert(r.won === 1 && r.beats.includes('alone') && !r.beats.includes('miners') && !r.beats.includes('returned'), `alone (${r.beats})`);
});

test('gates: the twins: both must die; when one falls the other takes his place and fights harder; the gate rises only when both chains break', () => {
  const { world, p, st, run } = gatesSetup(GATE_SEC('winch'), { x: 3800, z: 440 });
  st.fightOn = true; st.waveIndex = 99;
  const events = []; world.events.on('twinFall', (e) => events.push(e));
  const beats = []; world.events.on('storyBeat', (e) => beats.push(e.beat.id));
  for (const b of st.story.beats) if (['grief', 'gateUp'].includes(b.id)) b.fired = false;
  run(60, () => { p.health = p.stats.maxHealth; p.awe = 0; });
  assert(st.boss?.stats.name === 'Hask of the Gate' && st.twins?.length === 2, 'Hask and his brother');
  const [hask, hrolf] = st.twins;
  assert(hrolf.stats.boss && hrolf.stats.name === 'Hrolf of the Gate' && hrolf.health === hask.health, 'Hrolf as tough as his brother');
  const mult = hrolf.stats.meleeMult; const speed = hrolf.stats.walkSpeed;
  slay(world, hask);
  run(2, () => { p.health = p.stats.maxHealth; });
  assert(events.length === 1 && events[0].left === hrolf && st.boss === hrolf, 'his brother takes his place');
  assert(Math.abs(hrolf.stats.meleeMult - mult * 1.3) < 1e-6 && Math.abs(hrolf.stats.walkSpeed - speed * 1.2) < 1e-6 && hrolf.raged, 'and fights harder');
  run(60 * 8, () => { p.health = p.stats.maxHealth; p.invincible = true; });
  assert(beats.includes('grief'), `his roar (${beats})`);
  assert(st.phase === 'fight', 'the fight goes on while a twin stands');
  slay(world, hrolf); hrolf.removeMe = true;
  run(120, () => { p.health = p.stats.maxHealth; });
  assert(st.phase === 'fight', 'both dead, but the way on waits on the winch');
  const gate = st.terrain.blocks.find((b) => b.tag === 'gate');
  const [c1, c2] = st.props.filter((pr) => pr.tag === 'winch');
  st.breakProp(c1, 1);
  assert(gate.solid && !gate.gone, 'one chain broken: the gate holds');
  st.breakProp(c2, 1);
  assert(!gate.solid && gate.gone, 'both broken: the gate is up');
  run(60 * 6, () => { p.health = p.stats.maxHealth; });
  assert(st.phase !== 'fight' && beats.includes('gateUp'), `the way on opens (${st.phase}, ${beats})`);
});

test('gates: the rescued come back: the miners\' slings hit only the Ashen, never a boss; nobody saved, nobody throws', () => {
  const yard = GATE_SEC('yard');
  const { world, p, st, run } = gatesSetup(yard, { x: 5400, z: 440, opts: { saved: ['shelter'] } });
  st.fightOn = true; st.waveIndex = 99;
  const hzs = st.hazards.filter((h) => h.type === 'bombard' && h.section === yard);
  assert(hzs.length === 2 && st.bombardShots(hzs[0]) === 2 && st.bombardShots(hzs[1]) === 0, 'the miners throw; the convoy\'s people weren\'t saved');
  const land = []; world.events.on('shellLand', (e) => land.push(e.shell));
  const hurt = []; world.events.on('hazardHit', (e) => hurt.push(e.fighter));
  p.controller.sample = function () { this.held = {}; this.moveX = 0; this.moveZ = 0; };
  const e = createEnemy(world, 'grunt', 5700, 430); e.entering = false; e.controller = new Controller();
  const big = createEnemy(world, 'gladiator', 5900, 430); big.entering = false; big.controller = new Controller(); big.stats = { ...big.stats, boss: true };
  run(60 * 10, () => {
    p.health = p.stats.maxHealth; p.x = 5400; p.z = 440;
    for (const f of [e, big]) { f.health = f.stats.maxHealth; f.x = f === e ? 5700 : 5900; f.z = 430; }
  });
  assert(land.length >= 4 && land.every((s) => Math.abs(s.x - 5700) < 280), `the stones go for the Ashen man (${land.map((s) => Math.round(s.x))})`);
  assert(hurt.includes(e) && !hurt.includes(p) && !hurt.includes(big), 'they hit him, never the hero, never a boss');
  // nobody saved: nobody on the wall, nobody back at the Keep road
  const b2 = gatesSetup(yard, { x: 5400, z: 440 });
  assert(b2.st.hazards.filter((h) => h.type === 'bombard' && h.section === yard).every((h) => b2.st.bombardShots(h) === 0), 'no slings');
  assert(!b2.st.story.npc('minersBack') && !b2.st.story.npc('bramBack'), 'nobody at the Keep road');
  assert(st.story.npc('minersBack') && !st.story.npc('bramBack'), 'the miners are there; Bram wasn\'t saved');
});

test('gates: Malgor, the Iron Marshal: the archers loose at two thirds (the miners answer if saved); at one third he will not fall', () => {
  const { world, p, st, run } = gatesSetup(GATE_SEC('marshal'), { x: 8300, z: 440, opts: { saved: ['shelter'] } });
  const phases = []; world.events.on('bossPhase', (e) => phases.push(e.phase.id));
  bossUp(st, run, p);
  const b = st.boss;
  assert(b?.stats.name === 'Malgor, the Iron Marshal' && b.stats.boss, 'the Marshal is here');
  const hzs = st.hazards.filter((h) => h.type === 'bombard' && h.section === GATE_SEC('marshal'));
  const archers = hzs.find((h) => !h.friendly); const slings = hzs.find((h) => h.friendly);
  assert(st.bombardShots(archers) === 0 && st.bombardShots(slings) === 0, 'nothing from the walls yet');
  b.health = b.stats.maxHealth * 0.6;
  run(2, () => { p.health = p.stats.maxHealth; });
  assert(phases.join() === 'walls' && st.bombardShots(archers) === 2 && st.bombardShots(slings) === 1, `the archers, and the slings (${phases})`);
  b.health = b.stats.maxHealth * 0.2;
  run(2, () => { p.health = p.stats.maxHealth; });
  assert(phases.join() === 'walls,iron' && b.raged, `he will not fall (${phases})`);
});

test('gates: Vincent, the Gatewright: caged on the landing, the gatehouse waits for him, his lock opens; the reeve is Aldric now', () => {
  assert(SPEAKERS.VINCENT?.name === 'Vincent' && SPEAKERS.REEVE.name !== 'Vincent' && speakerInfo('REEVE').portrait === 'aldric', 'one Vincent, and the reeve renamed');
  const sec = GATE_SEC('gatehouse');
  const { world, p, st, run } = gatesSetup(sec, { x: 2470, z: 330 });
  const v = st.story.npc('vincent');
  st.fightOn = true; st.waveIndex = 99; killFoes(world); // (the guardroom's men already at their posts: gone)
  run(120, () => { p.health = p.stats.maxHealth; });
  assert(v && v.state === 'trapped' && v.h === 140, `in his cage on the landing (${v?.state}, ${v?.h})`);
  assert(st.phase === 'fight', 'the guardroom is empty, but the gatehouse is not won while he is caged');
  p.controller.sample = function () { this.held = { padUp: true }; this.moveX = 0; this.moveZ = 0; };
  run(60 * 3, () => { p.health = p.stats.maxHealth; p.x = 2470; p.z = 330; });
  assert(st.story.isRescued('vincent'), 'holding at his lock frees him');
  run(60 * 3, () => { p.health = p.stats.maxHealth; });
  assert(st.phase !== 'fight', `then the way on opens (${st.phase})`);
  assert(v.state === 'gathered' && v.x === 4900, `he goes ahead to the gate (${v.state}, ${v.x})`);
});

// the yard with Vincent saved (or not), the fight on, the hero at the back of it
function scorpionSetup(saved) {
  const t = gatesSetup(GATE_SEC('yard'), { x: 5000, z: 300, opts: { saved } });
  t.st.fightOn = true; t.st.waveIndex = 99;
  t.p.controller.sample = function () { this.held = {}; this.moveX = 0; this.moveZ = 0; };
  const add = (type, x, z, boss) => {
    const e = createEnemy(t.world, type, x, z); e.entering = false; e.controller = new Controller();
    if (boss) e.stats = { ...e.stats, boss: true };
    e.stats = { ...e.stats, maxHealth: 1000 }; e.health = 1000; // (they stand there and take it)
    return e;
  };
  return { ...t, add, hz: t.st.hazards.find((h) => h.type === 'ballista' && h.section === GATE_SEC('yard')) };
}

test('gates: Vincent\'s Gate Scorpion picks the lane with the most Ashen, warns, and skewers every man in it: never a hero, never a boss', () => {
  const { world, st, p, run, add, hz } = scorpionSetup(['vincent']);
  const lane = [add('grunt', 5500, 460), add('grunt', 5800, 465), add('thrall', 6100, 455)];
  const lone = add('grunt', 5600, 320);
  const big = add('gladiator', 5900, 462, true);
  p.x = 5300; p.z = 460; // (a hero in the lane too)
  const aims = []; world.events.on('boltAim', (e) => aims.push({ z: hz.aim.z, t: hz.t }));
  const looses = []; world.events.on('boltLoose', (e) => looses.push(hz.t));
  const hits = []; world.events.on('boltHit', (e) => hits.push(e.fighter));
  const beats = []; world.events.on('storyBeat', (e) => beats.push(e.beat.id));
  st.story.beats.find((b) => b.id === 'skewer').fired = false;
  run(60 * 4, () => {
    p.health = p.stats.maxHealth; p.x = 5300; p.z = 460;
    for (const e of [...lane, lone, big]) { if (e.state === 'knockdown') continue; e.vx = e.vz = 0; }
  });
  assert(aims.length >= 1 && Math.abs(aims[0].z - 460) <= 30, `it aims down the crowded lane (${aims.map((a) => a.z)})`);
  assert(looses.length >= 1 && looses[0] - aims[0].t >= 60, 'after a warning');
  for (const e of lane) assert(hits.includes(e) && e.health < 1000, 'every man in the lane is skewered');
  assert(!hits.includes(lone) && !hits.includes(big) && !hits.includes(p), 'not the man in the other lane, not the boss, not the hero');
  assert(p.health === p.stats.maxHealth, 'the hero is untouched');
  assert(beats.includes('skewer'), `Vincent enjoys it (${beats})`);
  // not saved: nobody at the scorpion
  const b = scorpionSetup([]);
  b.add('grunt', 5500, 460); b.add('grunt', 5800, 460);
  let shots = 0; b.world.events.on('boltLoose', () => shots++);
  b.run(60 * 6, () => { b.p.health = b.p.stats.maxHealth; });
  assert(shots === 0 && !b.hz.manned, 'no Vincent, no scorpion');
});

test('gates: when Malgor will not fall, Vincent\'s one bolt knocks him flat and takes a share of his health, never the last of it', () => {
  const { world, p, st, run } = gatesSetup(GATE_SEC('marshal'), { x: 8300, z: 440, opts: { saved: ['vincent'] } });
  bossUp(st, run, p);
  const b = st.boss;
  const hz = st.hazards.find((h) => h.type === 'ballista' && h.section === GATE_SEC('marshal'));
  const hits = []; world.events.on('boltHit', (e) => hits.push(e.fighter));
  const beats = []; world.events.on('storyBeat', (e) => beats.push(e.beat.id));
  st.story.beats.find((q) => q.id === 'felled').fired = false;
  run(60 * 3, () => { p.health = p.stats.maxHealth; p.x = 8300; });
  assert(!hits.length, 'nothing at him before he will not fall');
  b.health = b.stats.maxHealth * 0.3;
  let lowest = b.health; let floored = false;
  run(60 * 5, () => {
    p.health = p.stats.maxHealth; p.x = 8300; p.invincible = true;
    for (const e of st.livingFoes()) if (e !== b) { e.health = 0; e.removeMe = true; }
    if (b.state === 'knockdown') floored = true;
    lowest = Math.min(lowest, b.health);
  });
  assert(hits.filter((f) => f === b).length === 1, `one bolt for him (${hits.length})`);
  assert(floored && b.alive, 'he goes down, and gets up');
  assert(Math.abs(b.stats.maxHealth * 0.3 - lowest - b.stats.maxHealth * 0.15) < 1, `a share of his health (${lowest.toFixed(1)} of ${b.stats.maxHealth})`);
  assert(beats.includes('felled'), `"He is down! Finish him!" (${beats})`);
  // at death's door the bolt still leaves him to you
  const t2 = gatesSetup(GATE_SEC('marshal'), { x: 8300, z: 440, opts: { saved: ['vincent'] } });
  bossUp(t2.st, t2.run, t2.p);
  const b2 = t2.st.boss; b2.health = 3;
  t2.run(60 * 5, () => { t2.p.health = t2.p.stats.maxHealth; t2.p.invincible = true; b2.health = Math.min(b2.health, 3); });
  assert(b2.alive && b2.health >= 1, 'never the last of it: the kill is yours');
});

// ---------------------------------------------------------------- hack-and-slash pillars

// Rurik's J, J, K, then a jump and three air swings into a tough dummy that can't die.
function juggleRun(extra = {}) {
  const t = setup({
    script: { 1: ['attack'], 12: ['attack'], 24: ['heavy'], 50: ['jump'], 62: ['attack'], 80: ['attack'], 95: ['attack'], ...extra },
    hold: (n) => ({ jump: n >= 50 && n < 70 }),
  });
  t.d.stats = { ...t.d.stats, maxHealth: 1e4 }; t.d.health = 1e4;
  const hits = [];
  t.world.events.on('hit', (e) => { if (e.attacker === t.p) hits.push({ state: t.p.state, juggle: e.juggle ?? 0, spike: !!e.move.spike, air: !t.d.grounded }); });
  return { ...t, hits };
}

test('juggle: J, J, K is the Rising Cleave and throws him straight up', () => {
  const t = juggleRun({ 50: [], 62: [], 80: [], 95: [] });
  t.p.controller.hold = {};
  let peak = 0, states = new Set();
  for (let i = 0; i < 90; i++) { t.world.tick(); peak = Math.max(peak, t.d.h); states.add(t.p.state); }
  assert(states.has('launcher'), `the launcher comes out (${[...states]})`);
  assert(peak > 90, `he flies high (${peak.toFixed(0)} px)`);
});

test('juggle: air swings keep him up, chain three a jump, and the third spikes him down', () => {
  const t = juggleRun();
  t.run(160);
  const air = t.hits.filter((h) => h.juggle > 0);
  assert(air.length === JUGGLE.airHits, `${air.length} juggle hits (${JSON.stringify(t.hits)})`);
  assert(air.map((h) => h.juggle).join() === '1,2,3', `juggle count climbs (${air.map((h) => h.juggle)})`);
  assert(air[air.length - 1].spike && !air[0].spike, 'the last air swing is the spike');
});

test('juggle: bosses are never juggled; a juggle runs out', () => {
  const t = setup();
  t.d.stats = { ...t.d.stats, boss: true };
  t.d.h = 80; t.d.vh = 0; t.d.fsm.change('knockdown', { vx: 0, vh: 0 });
  t.world.combat.resolve(t.p, t.d, CHARACTERS.warrior.moves.air, { kind: 'melee', fromX: t.p.x, dir: 1, contact: { x: t.d.x, h: 100 } });
  assert(!t.d.juggles, 'no juggle on a boss');
  const u = setup();
  u.d.stats = { ...u.d.stats, maxHealth: 1e4 }; u.d.health = 1e4;
  u.d.h = 80; u.d.fsm.change('knockdown', { vx: 0, vh: 0 });
  u.d.juggles = JUGGLE.maxHits;
  u.world.combat.resolve(u.p, u.d, CHARACTERS.warrior.moves.air, { kind: 'melee', fromX: u.p.x, dir: 1, contact: { x: u.d.x, h: 100 } });
  assert(u.d.juggles === JUGGLE.maxHits, 'past the limit he just falls');
});

// X, X, Y, Y: the launcher, then the SUNDER (combat/Juggle.js)
function sunderRun({ gap = 60, boss = false } = {}) {
  const t = setup({ script: { 1: ['attack'], 12: ['attack'], 24: ['heavy'], 36: ['heavy'] }, gap });
  t.d.stats = { ...t.d.stats, maxHealth: 1e4, boss }; t.d.health = 1e4;
  const kills = [], states = new Set();
  t.world.events.on('kill', (e) => kills.push(e));
  let peak = 0;
  for (let i = 0; i < 180; i++) { t.world.tick(); states.add(t.p.state); if (t.p.state === 'sunder') peak = Math.max(peak, t.p.h); }
  return { ...t, kills, states, peak };
}

test('sunder: X, X, Y, Y keeps him planted and splits the launched man in half, however tough', () => {
  const t = sunderRun();
  assert(t.states.has('launcher') && t.states.has('sunder'), `launcher then sunder (${[...t.states]})`);
  assert(t.peak < 1, `his feet never leave the floor (${t.peak.toFixed(1)} px)`);
  assert(t.kills.length === 1 && !t.d.alive, 'the man in the air dies to it');
  const k = t.kills[0];
  assert(k.sunder && k.fatality === 'halfV' && !k.attachedSplit, `cut clean in half (${k.fatality}, attached ${k.attachedSplit})`);
  assert(t.p.grounded && t.p.state === 'idle', `he wrenches the blade free and can move again (${t.p.state})`);
});

test('sunder: only out of a launcher that connected; a boss just takes the chop', () => {
  const miss = sunderRun({ gap: 400 });
  assert(miss.states.has('launcher') && !miss.states.has('sunder'), `a whiffed launcher has no follow-up (${[...miss.states]})`);
  const b = sunderRun({ boss: true });
  assert(b.d.alive && b.d.health < 1e4 && !b.kills.length, `the boss is hurt, not halved (${b.d.health.toFixed(0)})`);
});

test('style: hits build a combo and a rank; a blow taken costs most of it; rank pays more blood', () => {
  const t = juggleRun();
  t.run(135);
  const s = t.p.style;
  assert(s.best >= 5, `combo counted (${s.best})`);
  assert(s.rank >= 2, `rank climbs to B or better (${STYLE.ranks[s.rank].letter}, ${s.score.toFixed(0)})`);
  assert(styleMult(t.p) > 1, 'a good rank pays more blood');
  const before = s.score;
  t.world.combat.resolve(t.d, t.p, ENEMIES.grunt.moves.light1, { kind: 'melee', fromX: t.d.x, dir: -1, contact: { x: t.p.x, h: 60 } });
  assert(s.hits === 0 && s.score < before * 0.5, `hit taken: combo over, style cut (${before.toFixed(0)} -> ${s.score.toFixed(0)})`);
  t.p.health = t.p.stats.maxHealth;
  for (let i = 0; i < 1200; i++) t.world.tick();
  assert(t.p.style.score === 0 && t.p.style.rank === 0, 'idle, it drains away');
});

test('style: the same move over and over scores less than mixing it up', () => {
  const score = (moves) => {
    const t = setup();
    for (const m of moves) t.world.events.emit('hit', { attacker: t.p, defender: t.d, move: m, damage: 5, nth: 1 });
    return t.p.style.score;
  };
  const M = CHARACTERS.warrior.moves;
  const same = score([M.light1, M.light1, M.light1, M.light1]);
  const mixed = score([M.light1, M.kick, M.heavy, M.light2]);
  assert(mixed > same, `mixed ${mixed.toFixed(0)} > same ${same.toFixed(0)}`);
});

test('horde: each campaign level has a HORDE wave of thralls, and it is announced', () => {
  for (const data of [STAGE_VILLAGE, STAGE_WOOD, STAGE_MINE]) {
    const big = data.sections.flatMap((sec) => sec.waves ?? []).filter((w) => w.length >= 7);
    assert(big.length >= 1 && big.every((w) => w.filter((x) => x === 'thrall').length >= 8), `${data.name}: a horde of thralls`);
  }
  assert(ENEMIES.thrall.moves.light1 && ENEMIES.thrall.maxHealth < ENEMIES.grunt.maxHealth / 2, 'a thrall swings a grunt\'s sword and dies easier');
  const world = new World({ seed: 3 });
  const stage = new Stage(world, STAGE_VILLAGE);
  const p = world.addFighter(new Fighter({ stats: CHARACTERS.warrior, team: 'player', x: 1500, z: 440, controller: new Scripted() }));
  const sq = STAGE_VILLAGE.sections.findIndex((x) => x.id === 'square');
  stage.start([p], { section: sq });
  const hordes = [];
  world.events.on('horde', (e) => hordes.push(e.count));
  p.x = 2300;
  for (let i = 0; i < 4000 && !hordes.length; i++) {
    world.tick(); stage.update();
    p.health = p.stats.maxHealth;
    for (const f of world.fighters) if (f.team === 'enemy' && f.alive && !f.entering) { f.health = 0; f.removeMe = true; }
  }
  assert(hordes.length === 1 && hordes[0] >= 8, `the horde comes, announced (${hordes})`);
  assert(world.fighters.filter((f) => f.stats.id === 'thrall').length >= 8, 'and they are thralls');
});

test('loot: each boss drops his own trophy first, then something new, then blood', () => {
  assert(bossTrophy('Hruk the Hangman') === 'hangmansHood', 'Hruk has the Hood');
  assert(bossTrophy('Warlord Malgor, the Oathbreaker') === 'oathbreakerGauntlet', 'Malgor has the Gauntlet');
  assert(bossTrophy('Varek, the Ash Captain') === 'captainsCrest', 'Varek has the Crest');
  assert(pickTrophy({ from: 'boss', boss: 'Hruk the Hangman' }, {}, 0.5) === 'hangmansHood', 'first kill: his own');
  const again = pickTrophy({ from: 'boss', boss: 'Hruk the Hangman' }, { hangmansHood: true }, 0.5);
  assert(again && again !== 'hangmansHood' && TROPHIES[again].rarity === 'legendary', `again: another legendary (${again})`);
  const elite = pickTrophy({ from: 'elite' }, {}, 0.3);
  assert(elite && TROPHIES[elite].rarity !== 'legendary', `an elite drops a lesser one (${elite})`);
  const all = Object.fromEntries(Object.keys(TROPHIES).map((id) => [id, true]));
  assert(pickTrophy({ from: 'boss', boss: 'Hruk' }, all, 0.5) === null, 'everything owned: nothing new');
});

test('loot: a boss falls and a trophy lies where he died; elites drop one only sometimes', () => {
  const world = new World({ seed: 7 });
  const stage = new Stage(world, STAGE_VILLAGE);
  const boss = createEnemy(world, 'gladiator', 900, 430);
  boss.stats = { ...boss.stats, boss: true, name: 'Varek, the Ash Captain' };
  world.events.emit('kill', { attacker: null, defender: boss, move: {} });
  const pk = stage.pickups.find((p) => p.kind === 'trophy');
  assert(pk && pk.from === 'boss' && pk.boss.includes('Varek') && Math.abs(pk.x - 900) < 30, 'his trophy drops');
  let drops = 0;
  for (let i = 0; i < 200; i++) {
    world.frame = i;
    const e = createEnemy(world, 'butcher', 900, 430);
    const n = stage.pickups.length;
    stage.dropLoot(e);
    if (stage.pickups.length > n) drops++;
  }
  assert(drops > 5 && drops < 60, `elites drop now and then (${drops}/200)`);
  const g = createEnemy(world, 'grunt', 900, 430);
  const n = stage.pickups.length;
  for (let i = 0; i < 50; i++) { world.frame = i; g.lootDropped = false; stage.dropLoot(g); }
  assert(stage.pickups.length === n, 'a grunt never drops one');
});

test('loot: trophies are kept, worn in a few slots, and change the hero', () => {
  const P = new Progress(null);
  assert(P.addTrophy('oathbreakerGauntlet').worn, 'worn at once');
  const s = P.statsFor('warrior', CHARACTERS.warrior);
  assert(Math.abs(s.meleeMult - CHARACTERS.warrior.meleeMult * 1.15) < 1e-9, 'the Gauntlet hits harder');
  assert(CHARACTERS.warrior.meleeMult === 1.3, 'the shared data is untouched');
  const ids = Object.keys(TROPHIES).filter((id) => id !== 'oathbreakerGauntlet');
  for (const id of ids.slice(0, TROPHY_SLOTS + 1)) P.addTrophy(id);
  assert(P.worn().length === TROPHY_SLOTS, `only ${TROPHY_SLOTS} worn (${P.worn()})`);
  assert(Object.keys(P.trophies.owned).length === TROPHY_SLOTS + 2, 'all of them kept');
  P.unwear('oathbreakerGauntlet');
  assert(P.wear(ids[TROPHY_SLOTS]), 'a slot freed takes another');
  for (const id of Object.keys(TROPHIES)) {
    for (const hero of Object.keys(CHARACTERS)) {
      const c = JSON.parse(JSON.stringify({ moves: {}, dodge: {}, ...CHARACTERS[hero] }));
      TROPHIES[id].apply(c); // every trophy works on every hero
    }
  }
});


// ---- THE SENTENCE (stage/Sentence.js): every captain beaten kneels, hears his crimes, and loses his head
const blowOf = (world, p, b, damage = 9999) => world.combat.resolve(p, b, { cut: 'slash', damage, hitstun: 10, hitstop: 4, knockback: { x: 100, y: 0 } }, { kind: 'melee', fromX: p.x, dir: Math.sign(b.x - p.x) || 1, contact: { x: b.x, h: 60 } });
function sentenceSetup(hero = 'warrior', data = STAGE_VILLAGE, sectionId = 'hall', x = 7450) {
  const world = new World({ seed: 7 });
  const c = new Pressing();
  const p = world.addFighter(new Fighter({ stats: CHARACTERS[hero], team: 'player', x, z: 440, controller: c }));
  const st = new Stage(world, data);
  st.start(p, { section: data.sections.findIndex((q) => q.id === sectionId) });
  hush(st);
  p.x = x;
  st.fightOn = true; st.waveIndex = 99; // (straight to the boss)
  const ev = { kill: [], strike: [], done: [], lines: [] };
  world.events.on('kill', (e) => ev.kill.push(e));
  world.events.on('sentenceStrike', (e) => ev.strike.push(e));
  world.events.on('sentenceDone', (e) => ev.done.push(e));
  const run = (n, each) => {
    for (let i = 0; i < n; i++) {
      world.tick(); st.update(); p.health = p.stats.maxHealth;
      const l = st.story.line;
      if (l && l.age === 1) ev.lines.push(`${l.who}: ${l.text}`);
      each?.(i);
    }
  };
  // the waves out of the way, the boss walked in
  for (let i = 0; i < 3000 && !(st.boss && st.boss.state !== 'bossEntrance'); i++) {
    world.tick(); st.update(); p.health = p.stats.maxHealth;
    for (const e of st.livingFoes()) if (!st.boss && !e.stats.boss) { e.health = 0; e.removeMe = true; }
  }
  run(30);
  return { world, p, c, st, ev, run };
}

test('sentence: a beaten captain is not killed; he kneels, the field stands still, the hero walks to him and proclaims his crimes; the blow takes his head; his men run; then the way on', () => {
  const { world, p, st, ev, run } = sentenceSetup('warrior');
  const b = st.boss;
  assert(b?.stats.name === 'Varek, the Ash Captain' && b.spare, 'the Ash Captain, spared until his sentence');
  b.health = b.stats.maxHealth * 0.4; run(2); // (he rages: his men come)
  const men = st.livingFoes().filter((e) => e !== b);
  assert(men.length > 0, 'his men are here');
  blowOf(world, p, b);
  assert(b.alive && b.health === 1, `the blow that beats him doesn't kill him (${b.health})`);
  run(3);
  assert(world.hold && st.sentence.running, 'the field holds still');
  const at = men.map((e) => e.x);
  run(60);
  assert(b.state === 'kneel', `on his knees (${b.state})`);
  assert(men.every((e, i) => Math.abs(e.x - at[i]) < 1 && e.awe > 0), 'his men stand frozen, watching');
  run(60 * 4);
  assert(Math.abs(p.z - b.z) < 5 && Math.abs(p.x - b.x) < 140 && p.facing === Math.sign(b.x - p.x) && b.facing === -p.facing, `the hero at his side, face to face (${Math.round(p.x)} / ${Math.round(b.x)})`);
  run(60 * 30);
  const said = ev.lines.join(' | ');
  for (const t of ['RURIK: Varek, the Ash Captain. On your knees, hear your crimes.', 'RURIK: You led the Ashen to our gates at dusk.', 'VAREK: Swing, then.', 'sentence you to die.'])
    assert(said.includes(t), `"${t}" said (${said})`);
  assert(ev.strike.length === 1 && ev.kill.length === 1, `one blow, one death (${ev.kill.length})`);
  const k = ev.kill[0];
  assert(k.defender === b && k.attacker === p && k.fatality === 'decap' && k.sentence && !b.alive, 'his head comes off, by the hero\'s hand');
  assert(ev.done.length === 1 && ev.done[0].routed.length === men.length, 'his men break and run');
  assert(!world.hold && !p.scripted && !st.sentence.running, 'the field lets go; the hero is his own again');
  run(60 * 8);
  assert(men.every((e) => e.removeMe || !world.fighters.includes(e)), 'they ran off the edge of the room');
  assert(st.phase !== 'fight', `the way on opens (${st.phase})`);
  assert(ev.kill.length === 1 && ev.strike.length === 1, 'nothing twice');
});

test('sentence: every hero passes it with his own killing blow (Rurik: Oathkeeper\'s cleave; Oryn: the staff on the skull; Vexa: both blades)', () => {
  const want = { warrior: ['heavy', 'decap', 'Rurik, the people\'s king'], mage: ['light3', 'headPop', 'Oryn of the Oath Keepers'], rogue: ['light3', 'decap', 'Vexa of the Oath Keepers'] };
  for (const [hero, [state, fatality, as]] of Object.entries(want)) {
    const { world, p, st, ev, run } = sentenceSetup(hero);
    const b = st.boss;
    let during = null;
    world.events.on('sentenceStrike', () => { during = p.state; });
    blowOf(world, p, b);
    run(60 * 40);
    assert(ev.kill.length === 1 && ev.kill[0].fatality === fatality && during === state, `${hero}: ${state} -> ${fatality} (${during}, ${ev.kill[0]?.fatality})`);
    assert(ev.lines.some((l) => l.includes(`I, ${as}, sentence you to die`)), `${hero}: in his own name (${ev.lines.at(-1)})`);
  }
});

test('sentence: the words skip line by line like any held scene (same end); presses while he walks up never swing early', () => {
  const { world, p, c, st, ev, run } = sentenceSetup('warrior');
  const b = st.boss;
  blowOf(world, p, b);
  let early = false;
  run(90, () => { c.script = { [c.t + 1]: ['attack', 'heavy'] }; if (!['idle', 'walk'].includes(p.state)) early = true; });
  assert(!early && b.alive, `no blow before the sentence (${p.state})`);
  let f = 0;
  for (; f < 60 * 12 && !ev.kill.length; f += 20) run(20, (i) => { if (i === 0) c.script = { [c.t + 1]: ['attack'] }; });
  assert(ev.kill.length === 1 && ev.kill[0].sentence, 'sentenced all the same');
  assert(f < 60 * 9, `quicker than sitting through it (${(f / 60).toFixed(1)} s)`);
});

test('sentence: timed to its music: every hero\'s blade lands on the swell\'s crest; each line gets its share; a skipped line takes the music on with it', () => {
  for (const hero of ['warrior', 'mage', 'rogue']) {
    const { world, p, st, ev, run } = sentenceSetup(hero);
    const b = st.boss;
    blowOf(world, p, b);
    const S = st.sentence;
    let at = null, prev = null, steady = true;
    world.events.on('sentenceStrike', () => { at = S.clock; });
    run(60 * 30, () => { if (at == null && prev != null && S.clock !== prev + 1) steady = false; prev = S.clock; });
    assert(ev.strike.length === 1, `${hero}: executed`);
    assert(Math.abs(at - SENTENCE.slice) <= 2, `${hero}: the blade lands on the crest (${at} vs ${SENTENCE.slice})`);
    assert(steady, `${hero}: watched through, the music runs on unbroken (no jumps)`);
    const beat = st.story.beats.find((x) => x.id === S.beatId) ?? st.story.beats.at(-1);
    assert(beat.times?.every((t) => t >= SENTENCE.minLine), `${hero}: every line has time to be read (${beat.times})`);
  }
  // skipped: the clock jumps on, and the blade still lands on the crest
  const { world, p, c, st, ev, run } = sentenceSetup('warrior');
  blowOf(world, p, st.boss);
  const S = st.sentence;
  let at = null, jumped = false, prev = null;
  world.events.on('sentenceStrike', () => { at = S.clock; });
  run(60 * 30, (i) => {
    if (S.step === 'speak' && i % 30 === 0) c.script = { [c.t + 1]: ['attack'] };
    if (prev != null && S.clock > prev + 5) jumped = true;
    prev = S.clock;
  });
  assert(jumped && Math.abs(at - SENTENCE.slice) <= 2, `skipped: the music jumps on, the blade still on the crest (${at})`);
});

test('sentence: its lines wait for a press; the music plays on through the words\' share and holds there; the blade still lands on the crest', waiting(() => {
  const { world, p, c, st, ev, run } = sentenceSetup('warrior');
  blowOf(world, p, st.boss);
  const S = st.sentence;
  let at = null, back = false, prev = null;
  world.events.on('sentenceStrike', () => { at = S.clock; });
  const watch = () => { if (prev != null && S.clock < prev) back = true; prev = S.clock; };
  run(60 * 40, watch);
  assert(S.step === 'speak' && S.waiting && !ev.strike.length, `unread, the words wait and the music holds (${S.step}, ${S.clock})`);
  const held = S.clock;
  run(120, watch);
  assert(S.clock === held, 'held still');
  run(60 * 20, (i) => { watch(); if (S.step === 'speak' && i % 30 === 0) c.script = { [c.t + 1]: ['attack'] }; });
  assert(ev.strike.length === 1 && Math.abs(at - SENTENCE.slice) <= 2, `read on: the blade lands on the crest (${at})`);
  assert(!back, 'the music never steps back');
}));

test('sentence: beaten while his own taunt is still up (it waits for a press), the taunt is cut short and the sentence plays out (no softlock)', waiting(() => {
  const { world, p, c, st, ev, run } = sentenceSetup('warrior');
  const up = () => st.story.current?.beat.id;
  // (his taunt goes by itself now, said in passing: made to wait here, as a conversation would)
  st.story.beats.find((x) => x.id === 'captain').passing = false;
  if (up() !== 'captain') { st.story.done.delete('captain'); const b = st.story.beats.find((x) => x.id === 'captain'); b.fired = false; b.fire = true; run(30); }
  assert(up() === 'captain', `his taunt is up (${up()})`);
  blowOf(world, p, st.boss);
  run(60 * 60, (i) => { if (i % 30 === 0) c.script = { [c.t + 1]: ['padRight'] }; });
  assert(ev.strike.length === 1, `the sentence plays out (${st.sentence.step}, line up: ${up()})`);
}));

test('sentence: the twins: the first to fall dies fighting; the one left standing kneels for both of them', () => {
  const { world, p, st, ev, run } = sentenceSetup('warrior', STAGE_GATES, 'winch', 3800);
  st.fightOn = true; st.waveIndex = 99;
  run(60, () => { p.awe = 0; });
  const [hask, hrolf] = st.twins ?? [];
  assert(hask && hrolf && !hask.spare && !hrolf.spare, 'both up: neither spared');
  blowOf(world, p, hask);
  run(2);
  assert(!hask.alive && !st.sentence.running, 'Hask dies where he stands');
  run(30);
  assert(st.boss === hrolf && hrolf.spare, 'Hrolf is spared for his sentence');
  blowOf(world, p, hrolf);
  run(60 * 40, () => { p.health = p.stats.maxHealth; });
  assert(ev.strike.length === 1 && ev.strike[0].boss === hrolf, 'Hrolf kneels and is executed');
  assert(ev.lines.some((l) => l.startsWith('HROLF: ')), `his own last words (${ev.lines})`);
});

test('sentence: the hero asks for his last words; some answer, some say nothing', () => {
  const ask = (def) => sentenceLines({ stats: { name: 'Hruk the Hangman' } }, { stats: { name: 'Rurik' } }, { crimes: ['A.', 'B.'], ...def }, 'HRUK').map(([w, t]) => `${w}: ${t}`);
  const said = ask({ last: 'The rope will have you yet.' });
  assert(said[3] === `RURIK: ${ASK}` && said[4] === 'HRUK: The rope will have you yet.' && said[5].includes('sentence you to die'), `he answers (${said})`);
  const still = ask({ last: 'The rope will have you yet.', silent: true });
  assert(still[3] === `RURIK: ${ASK}` && still[4] === `HRUK: ${SILENCE}` && still[5] === `RURIK: ${NOTHING}` && still[6].includes('sentence you to die'), `he says nothing (${still})`);
  const bosses = Object.values(STAGES).flatMap((d) => d.sections.map((q) => q.boss?.sentence)).filter(Boolean);
  assert(bosses.some((x) => x.silent) && bosses.some((x) => x.last && !x.silent), 'some answer, some don\'t');
});

test('sentence: no two go alike: the head and the fall are rolled from the lists, never the same as the last man\'s, and the same on both online machines', () => {
  const { st, ev, run, world, p } = sentenceSetup('warrior');
  const b = st.boss;
  blowOf(world, p, b);
  run(60 * 40);
  const k = ev.kill[0];
  assert(HEADS.includes(k.head) && BODIES.includes(k.body), `the kill carries how he goes (${k.head} / ${k.body})`);
  assert(ev.strike[0].head === k.head && ev.strike[0].body === k.body, 'the strike says the same');
  const roll = (seed) => {
    const w = new World({ seed });
    const S = new Sentence({ world: w });
    const out = [];
    for (let i = 0; i < 40; i++) { w.tick(); out.push(S.howHeGoes({ id: 5 + (i % 3) })); }
    return out;
  };
  const a = roll(11);
  assert(JSON.stringify(a) === JSON.stringify(roll(11)), 'same seed, same deaths');
  for (let i = 1; i < a.length; i++) assert(a[i].head !== a[i - 1].head && a[i].body !== a[i - 1].body, `never twice running (${i})`);
  for (const x of HEADS) assert(a.some((o) => o.head === x), `every head comes up (${x})`);
  for (const x of BODIES) assert(a.some((o) => o.body === x), `every fall comes up (${x})`);
});

test('sentence: every boss in the game has his crimes (the machine none)', () => {
  for (const [id, data] of Object.entries(STAGES)) {
    for (const sec of data.sections) {
      const B = sec.boss;
      if (!B) continue;
      if (ENEMIES[B.type]?.machine) { assert(B.sentence === false, `${id}: ${B.name} is a machine: no sentence`); continue; }
      assert(B.sentence?.crimes?.length >= 2 && B.sentence.crimes.every((t) => t.length <= 100), `${id}: ${B.name} has his crimes`);
      assert(B.sentence.last || B.sentence.silent, `${id}: ${B.name} has his last words, or keeps silent`);
    }
  }
  // Rurik's opening pledge over the dead villager is cut (Nick, 2026-10-24)
  assert(!STAGE_VILLAGE.story.some((b) => b.id === 'pledge'), 'no opening pledge');
});

test('dialogue: every voice in every level has a name and a portrait (or is narration); Nick\'s names on the nameless', () => {
  for (const [id, data] of Object.entries(STAGES)) {
    const whos = (data.story ?? []).flatMap((b) => b.lines.map((l) => l[0]));
    for (const sec of data.sections) if (sec.boss?.sentence?.speaker) whos.push(sec.boss.sentence.speaker);
    for (const w of whos) assert(NARRATION.has(w) || SPEAKERS[w], `${id}: ${w} has an entry in data/speakers.js`);
  }
  for (const k of ['MINER', 'PRISONER', 'REEVE', 'TOWNSMAN', 'MILLER', 'PILGRIM']) assert(!/^[A-Z]+$/.test(SPEAKERS[k].name), `${k} has a name`);
  assert(speakerInfo('VOICE') === null && speakerInfo('MILLER').name === 'Irvolino' && speakerInfo('RURIK').portrait === 'rurik', 'lookups');
  assert(PORTRAIT_IDS.includes('daniel') && !PORTRAIT_IDS.includes('miner'), 'portrait files by name');
});

// ------------------------------------------------------------ Rurik's birthright: Oathkeeper

test("birthright: Rurik starts with his old sword and no fire; the King's Wrath is sealed; Oathkeeper changes both", () => {
  const P = new Progress(memStore());
  P.data.bonus = 99;
  const before = P.statsFor('warrior', CHARACTERS.warrior);
  assert(before.sprite === 'ulric' && before.spell === null && !before.blade, 'the old sword, no Firebolt');
  assert(CHARACTERS.warrior.spell && CHARACTERS.warrior.sprite === 'ulricOath', 'the shared data untouched');
  assert(P.blocker('warrior', 'oathkeeperWakes') === 'sealed' && !P.buy('warrior', 'oathkeeperWakes'), 'his fire: not for sale yet');
  assert(P.blocker('warrior', 'windStep') !== 'sealed', 'his other branches are open');
  assert(P.setFlag('oathkeeper') && P.hasFlag('oathkeeper'), 'given');
  const after = P.statsFor('warrior', CHARACTERS.warrior);
  assert(after.sprite === 'ulricOath' && after.spell?.name === 'Firebolt' && after.blade === 'Oathkeeper', 'Oathkeeper, and its fire');
  assert(P.buy('warrior', 'oathkeeperWakes') && P.statsFor('warrior', CHARACTERS.warrior).spell.name === 'Hearthfire Bolt', 'the branch opens');
  // a save from before the flag existed, already past level 1: he has it
  const old = new Progress(memStore());
  old.finishLevel('village', 'gallowsWood');
  assert(old.hasFlag('oathkeeper') && old.statsFor('warrior', CHARACTERS.warrior).spell, 'past level 1 = his');
  old.play('gallowsWood');
  assert(old.hasFlag('oathkeeper'), 'his in level 2');
  // level 1 played again (a new campaign, or a save that has had it): the old sword until the scene
  for (const Q of [old, P]) {
    Q.play('village');
    assert(!Q.hasFlag('oathkeeper') && Q.statsFor('warrior', CHARACTERS.warrior).sprite === 'ulric', 'level 1 starts with the old sword (Nick: "rurik starts with the damn sword")');
    Q.setFlag('oathkeeper');
    assert(Q.statsFor('warrior', CHARACTERS.warrior).sprite === 'ulricOath', 'until Brann gives it');
  }
  // the other heroes are untouched
  assert(P.statsFor('rogue', CHARACTERS.rogue).spell === CHARACTERS.rogue.spell, 'Vexa as ever');
});

test('birthright: his dying father gives the sword once, watched or skipped; the farewell has no ambush', () => {
  for (const skip of [false, true]) {
    const flags = [];
    let foesBefore = 0; let foesAfter = 0;
    const r = villageRun('warrior', {
      kill: false,
      onTick: (w, st) => {
        if (!st.story.done.has('elder') && st.section.id === 'gate') foesBefore += st.livingFoes().length;
        else if (st.section.id === 'gate') foesAfter += st.livingFoes().length;
        if (skip && st.story.current?.beat.id === 'elder') st.story.skipScene();
        for (const e of w.fighters) if (e.team === 'enemy') { e.health = 0; e.removeMe = true; }
        if(st.millRescue?.started&&!st.millRescue.executioner.alive)st.millRescue.save();
      },
      setup: (w) => w.events.on('campaignFlag', ({ key }) => flags.push(key)),
    });
    assert(r.won === 1, `${skip ? 'skipped' : 'watched'}: out of the gate`);
    assert(flags.filter((k) => k === 'oathkeeper').length === 1, `${skip ? 'skipped' : 'watched'}: given once (${flags})`);
    assert(foesBefore === 0 && foesAfter === 0, `no attackers during or after the farewell (${foesBefore}, ${foesAfter})`);
  }
  const elder = STAGE_VILLAGE.story.find((b) => b.id === 'elder');
  assert(elder.hold && elder.lines.some((l) => l[2]?.flag === 'oathkeeper'), 'a held scene, with the cue');
});

test('village: the opening road keeps its cart and heaps to the edges, the middle open for every hero both ways', () => {
  // (Nick, 2026-10-23: the obstacles in the middle of the first street were annoying)
  for (const hero of Object.values(CHARACTERS)) for (const dir of [-1, 1]) for (const z of [338, 400, 450]) {
    const w = new World();
    w.terrain = new Terrain(w, STAGE_VILLAGE.terrain);
    const p = w.addFighter(new Fighter({ stats: hero, team: 'player', x: dir > 0 ? 300 : 1000, z, controller: new Scripted() }));
    for (let tick = 0; tick < 420; tick++) { p.vx = dir * 120; p.vz = 0; p.integrate(); }
    assert(dir > 0 ? p.x > 1000 : p.x < 300, `${hero.id}: blocked on the road at z ${z} (x ${Math.round(p.x)})`);
    assert(p.h === 0 && p.floor === 0, 'the middle of the road must stay street-level');
  }
  const t = new Terrain(new World(), STAGE_VILLAGE.terrain);
  assert(t.wallAt(435, 290, 0), 'the cart at the back of the road still blocks walking');
  assert(t.wallAt(805, 284, 0), 'rear rubble still blocks walking');
  assert(t.wallAt(830, 486, 0), 'front rubble still blocks walking');
});

test('village: nobody walks through the market well or anything painted with it, nor jumps onto it', () => {
  const { x, z } = STAGE_VILLAGE.well;
  for (const hero of Object.values(CHARACTERS)) for (const dir of [-1, 1]) for (const lane of [STAGE_VILLAGE.laneTop + 8, z - 20, z]) {
    const w = new World();
    w.terrain = new Terrain(w, STAGE_VILLAGE.terrain);
    const p = w.addFighter(new Fighter({ stats: hero, team: 'player', x: x - dir * 260, z: lane, controller: new Scripted() }));
    for (let tick = 0; tick < 240; tick++) { p.vx = dir * 120; p.vz = 0; p.integrate(); }
    assert(dir > 0 ? p.x < x - 150 : p.x > x + 150, `${hero.id} walked into the well (z ${lane}, from the ${dir > 0 ? 'left' : 'right'}: x ${Math.round(p.x)})`);
  }
  for (const wx of [x - 140, x, x + 140]) assert(STAGE_VILLAGE.terrain.some((b) => b.kind === 'block' && b.x0 <= wx && b.x1 >= wx && b.z0 <= z - 30 && b.z1 >= z - 4 && b.top >= 300), `no tall footprint at x ${wx}`);
  // the street in front of it stays open, and the family stands clear of it
  assert(!new Terrain(new World(), STAGE_VILLAGE.terrain).wallAt(x, z + 8, 0), 'the street in front of the well must stay open');
  const fam = STAGE_VILLAGE.npcs?.find((n) => n.id === 'mira');
  if (fam) assert(!new Terrain(new World(), STAGE_VILLAGE.terrain).wallAt(fam.x, fam.z, 0), 'the family at the well must stand clear of its footprint');
});

for (const [name, fn] of later) {
  try { await fn(); console.log(`  ok   ${name}`); } catch (e) { failed++; console.log(`  FAIL ${name}\n       ${e.message}`); }
}
console.log(failed ? `\n${failed} test(s) FAILED` : '\nAll tests passed.');
process.exit(failed ? 1 : 0);

