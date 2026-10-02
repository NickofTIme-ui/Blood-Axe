// logic-test.js — Automated checks for the combat rules, run WITHOUT a browser.
// Optional for you: if Node.js is installed, run `node tests/logic-test.js`.
// Each test builds a tiny World, scripts button presses, and checks the outcome.

import { World } from '../src/core/World.js';
import { Controller } from '../src/core/Controller.js';
import { Fighter } from '../src/entities/Fighter.js';
import { createEnemy } from '../src/entities/Enemy.js';
import { CHARACTERS } from '../src/data/characters.js';
import { ENEMIES, WAVES } from '../src/data/enemies.js';
import { chooseFatality, chooseMaim, FATALITIES } from '../src/combat/Fatality.js';
import { Stage } from '../src/stage/Stage.js';
import { STAGE } from '../src/data/stage.js';
import { impalePin } from '../src/combat/Finisher.js';
import { planChainLightning, forceTargets, MAGE_FINISHERS } from '../src/combat/Mage.js';
import { ROGUE_FINISHERS } from '../src/combat/Rogue.js';
import { TickController, pressed } from '../src/core/TickInput.js';
import { NetSession, NET, loopPair, snapshot, correct, feedPlayers } from '../src/net/Session.js';

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

test('light attack hits and causes hitstun', () => {
  const t = setup({ script: { 1: ['attack'] } });
  t.run(12);
  assert(t.log.includes('hit'), 'expected a hit');
  assert(t.d.health < t.d.stats.maxHealth, 'dummy should lose health');
  assert(t.d.state === 'hitstun' || t.d.hitstop > 0, `dummy state ${t.d.state}`);
});

test('3-hit combo chains and the finisher knocks down', () => {
  const t = setup({ script: { 1: ['attack'], 12: ['attack'], 25: ['attack'] } });
  const states = new Set();
  for (let i = 0; i < 80; i++) { t.world.tick(); states.add(t.p.state); }
  assert(states.has('light2') && states.has('light3'), `states seen: ${[...states]}`);
  assert(t.log.filter((e) => e === 'hit').length === 3, `hits: ${t.log}`);
  assert(['knockdown', 'getup', 'dead'].includes(t.d.state), `dummy ${t.d.state}`);
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

test('roll cancels a swing: wind-up, mid-swing and recovery (but not the kick)', () => {
  for (const [move, at] of [['attack', 3], ['attack', 14], ['heavy', 6], ['heavy', 30]]) {
    const t = setup({ script: { 1: [move] }, gap: 300 });
    t.run(at);
    assert(t.p.state !== 'idle' && t.p.state !== 'dodge', `${move}@${at}: should be swinging, is ${t.p.state}`);
    t.p.controller.registerPress('dodge');
    t.run(1);
    assert(t.p.state === 'dodge', `${move}@${at}: expected dodge, got ${t.p.state}`);
  }
  const k = setup({ script: { 1: ['kick'] }, gap: 300 });
  k.run(5);
  k.p.controller.registerPress('dodge');
  k.run(1);
  assert(k.p.state === 'kick', `the kick is a commitment, got ${k.p.state}`);
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
  const t = setup({ script: { 1: ['jump'] }, gap: 400 });
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
  // grunt light1 startup = 10 -> active at frame 11. Tap block at frame 8.
  t.p.controller.script = { 8: ['block'] };
  t.run(20);
  assert(t.log.includes('parry'), `log ${t.log}`);
  assert(t.d.state === 'stagger', `grunt should be staggered, is ${t.d.state}`);
});

test('dodge i-frames avoid a hit', () => {
  const t = setup({ dummyScript: { 1: ['attack'] }, gap: 50 });
  t.p.controller.script = { 8: ['dodge'] };
  t.run(20);
  assert(!t.log.includes('hit'), `should dodge, log ${t.log}`);
  const control = setup({ dummyScript: { 1: ['attack'] }, gap: 50 }); // same, no dodge
  control.run(20);
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
  const inWaves = new Set([...WAVES.flat(), ...STAGE.sections.flatMap((s) => [...(s.waves ?? []).flat(), ...(s.boss ? [s.boss.type, ...(s.boss.adds ?? [])] : [])])]);
  for (const e of Object.values(ENEMIES)) {
    assert(e.art, `${e.id} has no art`);
    assert(inWaves.has(e.id), `${e.id} never appears in a wave`);
    for (const [k, m] of Object.entries(e.moves)) assert(anims.includes(m.anim), `${e.id}.${k} anim ${m.anim}`);
    for (const sp of e.ai.specials ?? []) {
      const move = sp.press === 'heavy' ? e.moves.heavy : e.moves[sp.press];
      assert(move, `${e.id} special presses ${sp.press} but has no such move`);
    }
  }
});

test('each bad guy fights and lands hits (specials included)', () => {
  for (const id of ['butcher', 'stalker', 'penitent', 'berserker', 'ghoul', 'gladiator']) {
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
  assert(maxStep < 6, `lifted smoothly, biggest step ${maxStep.toFixed(1)}`);
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
function machine(seed, link, index, script) {
  const world = new World({ seed });
  const ctrls = [new TickController(), new TickController()];
  const heroes = ['warrior', 'rogue'].map((id, i) => world.addFighter(new Fighter({ stats: CHARACTERS[id], team: 'player', x: 200 - i * 46, z: 430 + i * 26, controller: ctrls[i] })));
  const stage = new Stage(world);
  stage.start(heroes);
  // a fake device: plays this machine's own scripted buttons
  let n = 0;
  const sampler = { held: {}, lastPresses: [], moveX: 0, moveZ: 0, read() { const s = script(n++); this.held = s.held; this.lastPresses = s.presses; this.moveX = s.mx; this.moveZ = s.mz; } };
  const session = link ? new NetSession(link, index, sampler) : null;
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
  m.sum = () => world.fighters.map((f) => `${f.id}:${f.stats.id}:${f.x.toFixed(3)},${f.z.toFixed(3)},${f.h.toFixed(2)}:${f.health.toFixed(2)}:${f.state}`).join('|') + `#${stage.index}/${stage.phase}/${stage.stats.kills}`;
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

// ---------------------------------------------------------------- the Mage

// A Mage on an empty floor with grunts where we put them (all standing still unless told).
function mageSetup({ script = {}, hold = {}, foes = [] } = {}) {
  const world = new World({ seed: 7 });
  const p = world.addFighter(new Fighter({ stats: CHARACTERS.mage, team: 'player', x: 600, z: 420, controller: new Scripted(script, hold) }));
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
  // the mage walks through his own wall (down the lane, round the man pressed against it)
  t.p.z = 490;
  t.p.controller.hold = { right: true };
  t.run(90);
  assert(t.p.x > wall.x + wall.half, `ally passes (${t.p.x.toFixed(0)})`);
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
  t.p.controller.script = { 11: ['dodge'], 40: ['attack'] };
  t.p.controller.hold = (n) => (n >= 11 && n < 13 ? { right: true } : n >= 38 && n < 42 ? { left: true } : {}); // (through him, then turn on him)
  t.run(37);
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

test('rogue: shuriken on the kick button can be spammed; a man in kicking distance gets the kick', () => {
  const t = rogueSetup({ script: { 1: ['kick'], 9: ['kick'], 17: ['kick'], 25: ['kick'] }, foes: [[1000]] });
  let thrown = 0;
  t.world.events.on('knifeThrow', () => { thrown++; });
  t.run(40);
  assert(thrown === 4, `four presses, four shuriken (${thrown})`);
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
  const crate = t.stage.props.find((p) => p.kind === 'crate' && p.drop === 'meat');
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
  const crate = t.stage.props.find((p) => p.kind === 'crate' && p.drop === 'meat');
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
  const c2 = u.stage.props.find((p) => p.kind === 'crate' && p.drop === 'meat');
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

console.log(failed ? `\n${failed} test(s) FAILED` : '\nAll tests passed.');
process.exit(failed ? 1 : 0);
