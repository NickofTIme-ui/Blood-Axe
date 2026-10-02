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
import { impalePin } from '../src/combat/Finisher.js';
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

test('mage fireball hits at range', () => {
  const t = setup({ player: 'mage', script: { 1: ['magic'] }, gap: 300 });
  t.run(60);
  assert(t.log.includes('hit'), `log ${t.log}`);
  assert(t.p.mana < t.p.stats.maxMana, 'mana spent');
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
  const inWaves = new Set(WAVES.flat());
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
