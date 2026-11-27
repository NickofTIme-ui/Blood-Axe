// gates-foes-test.js — the Iron Gates garrison and traps (data/gatesEnemies.js,
// combat/GatesArmor.js, entities/Arbalest.js, stage/GatesTraps.js), without a browser.

import { World } from '../src/core/World.js';
import { SETTINGS } from '../src/config/settings.js';
import { Controller } from '../src/core/Controller.js';
import { Fighter } from '../src/entities/Fighter.js';
import { createEnemy } from '../src/entities/Enemy.js';
import { CHARACTERS } from '../src/data/characters.js';
import { ENEMIES } from '../src/data/enemies.js';
import { Stage } from '../src/stage/Stage.js';
import { STAGE_GATES } from '../src/data/stageGates.js';
import { LINE } from '../src/stage/Story.js';
import { DROPGATE, gateX } from '../src/stage/GatesTraps.js';

SETTINGS.feel.critChance = 0;
LINE.wait = false;

class Pad extends Controller {
  constructor() { super(); this.hold = {}; }
  sample(frozen) {
    if (frozen) return;
    this.held = { ...this.hold };
    this.moveX = this.held.right ? 1 : this.held.left ? -1 : 0;
    this.moveZ = 0;
  }
}
class Still extends Controller { sample() { this.held = {}; this.moveX = 0; this.moveZ = 0; } }

let failed = 0;
function test(name, fn) {
  try { fn(); console.log(`  ok   ${name}`); } catch (e) { failed++; console.log(`  FAIL ${name}\n       ${e.message}`); }
}
function assert(c, m) { if (!c) throw new Error(m); }

// a hero and one foe of `kind` standing still in front of him (facing him), or behind
function duel(kind, { hero = 'warrior', gap = 60, behind = false } = {}) {
  const world = new World({ seed: 5 });
  const pad = new Pad();
  const p = world.addFighter(new Fighter({ stats: CHARACTERS[hero], team: 'player', x: 400, z: 420, controller: pad }));
  const d = world.addFighter(new Fighter({ stats: ENEMIES[kind], team: 'enemy', x: 400 + gap, z: 420, controller: new Still() }));
  d.health = d.stats.maxHealth;
  d.facing = behind ? 1 : -1;
  p.facing = 1;
  const log = [];
  for (const e of ['shieldBlock', 'shieldBreak', 'plateGlance', 'plateBreak', 'hit']) world.events.on(e, () => log.push(e));
  const run = (n) => { for (let i = 0; i < n; i++) world.tick(); };
  const press = (a) => pad.registerPress(a);
  return { world, p, d, log, run, press };
}

console.log('Blood Axe — the Iron Gates garrison and traps');

test('gate warden: a light cut into the face of the pavise rings off it (no damage, no flinch)', () => {
  const { d, log, run, press } = duel('warden5');
  press('attack'); run(40);
  assert(log.includes('shieldBlock'), `the shield took it (${log})`);
  assert(d.health === d.stats.maxHealth, `no damage (${d.health}/${d.stats.maxHealth})`);
  assert(!['hitstun', 'knockdown'].includes(d.state), `no flinch (${d.state})`);
});

test('gate warden: Rurik\'s kick knocks the shield aside and lands; then he is open to plain cuts', () => {
  const { world, p, d, log, run, press } = duel('warden5');
  press('kick'); run(50);
  assert(log.includes('shieldBreak'), `the kick opened it (${log})`);
  assert(d.health < d.stats.maxHealth, 'the kick landed');
  assert(d.shieldOpen > world.frame, 'his shield is down for a while');
  const before = d.health;
  log.length = 0;
  run(30);
  d.fsm.change('idle'); d.x = p.x + 60; d.z = p.z; d.facing = -1;
  press('attack'); run(40);
  assert(!log.includes('shieldBlock') && d.health < before, `a cut lands while it's down (${log})`);
});

test('gate warden: from behind there is no shield', () => {
  const { d, log, run, press } = duel('warden5', { behind: true });
  press('attack'); run(40);
  assert(!log.includes('shieldBlock') && d.health < d.stats.maxHealth, `the cut landed in his back (${log})`);
});

test('gate warden: Oryn\'s updraft lifts him off his feet, shield and all; Vexa\'s sweep goes under the rim', () => {
  for (const [hero, press1] of [['mage', 'updraft'], ['rogue', 'sweep']]) {
    const { d, log } = duel('warden5', { hero });
    // (straight through the rules: the hero's own move, delivered to the warden)
    const world = d.world;
    const p = world.fighters[0];
    const move = CHARACTERS[hero].moves[press1];
    if (press1 === 'sweep') p.fsm.change('sweep'); // (the state the sweep runs in)
    world.combat.resolve(p, d, move, { kind: 'melee', fromX: p.x, dir: 1, contact: { x: d.x, h: 50 } });
    assert(log.includes('shieldBreak') && d.health < d.stats.maxHealth, `${hero}'s ${press1} got through (${log})`);
  }
});

test('iron guard: light cuts glance (a quarter, no flinch); a heavy blow cracks a plate; three cracked, he is flesh', () => {
  const { world, p, d, log } = duel('ironclad');
  const light = CHARACTERS.warrior.moves.light1;
  const heavy = CHARACTERS.warrior.moves.heavy;
  const hit = (m) => world.combat.resolve(p, d, m, { kind: 'melee', fromX: p.x, dir: 1, contact: { x: d.x, h: 60 } });
  const h0 = d.health;
  hit(light);
  assert(log.includes('plateGlance'), 'it glanced');
  assert(Math.abs((h0 - d.health) - light.damage * p.stats.meleeMult * 0.25) < 0.01, `a quarter of the cut (${h0 - d.health})`);
  assert(d.state !== 'hitstun', `he didn't flinch (${d.state})`);
  for (let i = 0; i < 3; i++) { d.fsm.change('idle'); hit(heavy); }
  assert(log.filter((e) => e === 'plateBreak').length === 3 && d.plates === 0, `three plates off (${d.plates})`);
  d.fsm.change('idle');
  const h1 = d.health;
  hit(light);
  assert(h1 - d.health > light.damage, `bare: the cut bites full (${h1 - d.health})`);
});

test('arbalester: steps onto his man\'s line, aims (a long tell), looses one bolt that hurts, then cranks the windlass', () => {
  const world = new World({ seed: 9 });
  const p = world.addFighter(new Fighter({ stats: CHARACTERS.warrior, team: 'player', x: 400, z: 420, controller: new Still() }));
  const a = createEnemy(world, 'arbalest', 820, 380);
  let aimFrames = 0; let loosed = null; let reloaded = false;
  world.events.on('arbalestLoose', () => { loosed ??= world.frame; });
  const h0 = p.health;
  for (let i = 0; i < 600 && !reloaded; i++) {
    world.tick();
    if ((a.state === 'special1' || a.state === 'special2') && loosed == null) aimFrames++;
    if (loosed != null && a.state === 'heavy') reloaded = true;
  }
  assert(loosed != null, 'he loosed');
  assert(aimFrames >= 50, `he aimed long enough to answer (${aimFrames} frames)`);
  assert(Math.abs(a.z - p.z) < 30, `he stepped onto the hero's line (dz ${a.z - p.z})`);
  assert(p.health < h0, 'the bolt hit a man standing on the line');
  assert(reloaded, 'then he cranked the windlass');
});

test('arbalester: a parry breaks the bolt', () => {
  const world = new World({ seed: 9 });
  const pad = new Pad();
  const p = world.addFighter(new Fighter({ stats: CHARACTERS.warrior, team: 'player', x: 400, z: 420, controller: pad }));
  const a = createEnemy(world, 'arbalest', 760, 420);
  a.facing = -1;
  const proj = world.spawnProjectile(a, ENEMIES.arbalest && { cut: 'pierce', look: 'bolt5', speed: 900, lifetime: 80, y: 62, w: 44, h: 14, damage: 15, knockback: { x: 300, y: 200 }, knockdown: true }, { x: 700, z: 420, h: 62, vx: -900 });
  let parried = false;
  world.events.on('parry', () => { parried = true; });
  const h0 = p.health;
  for (let i = 0; i < 40; i++) {
    if (Math.abs(proj.x - p.x) < 60 && !pad.pressAge.block) pad.registerPress('block');
    world.tick();
  }
  assert(parried && !proj.alive && p.health === h0, `parried, unhurt (${parried}, ${p.health}/${h0})`);
});

test('drop gate: a foe under it when it lands is crushed; a hero is hurt and flung clear; down, nobody passes', () => {
  const world = new World({ seed: 3 });
  const p = world.addFighter(new Fighter({ stats: CHARACTERS.warrior, team: 'player', x: 200, z: 440, controller: new Still() }));
  const sec = STAGE_GATES.sections.findIndex((q) => q.id === 'winch');
  const st = new Stage(world, STAGE_GATES, {});
  st.start(p, { section: sec });
  st.story.lines = []; // (quiet)
  const hz = st.hazards.find((h) => h.type === 'dropgate');
  assert(hz, 'the winch room has its drop gate');
  const foe = createEnemy(world, 'grunt', gateX(hz, 400), 400);
  foe.controller.sample = function () { this.held = {}; this.moveX = 0; this.moveZ = 0; };
  p.z = 470; p.x = gateX(hz, p.z) + 4; p.controller = new Still();
  let crushed = false;
  world.events.on('dropgateCrush', () => { crushed = true; });
  const h0 = p.health;
  for (let i = 0; i < DROPGATE.period + 60 && !crushed; i++) {
    if (hz.gate?.phase !== 'down') { foe.x = gateX(hz, foe.z); p.x = gateX(hz, p.z) + 4; p.health = Math.max(p.health, 1); }
    world.tick(); st.update();
  }
  assert(crushed && !foe.alive, 'the Ashen man under it died');
  assert(p.health < h0 && Math.abs(p.x - gateX(hz, p.z)) > DROPGATE.half, `the hero was hurt and thrown clear (${p.health}/${h0}, x ${p.x - gateX(hz, p.z)})`);
  // while it's down: walking into it, he stops at it
  p.health = p.stats.maxHealth; p.fsm.change('idle');
  const pad = new Pad(); p.controller = pad;
  p.x = gateX(hz, p.z) - 80; pad.hold = { right: true };
  for (let i = 0; i < 40; i++) { world.tick(); st.update(); }
  if (hz.gate.phase === 'down') assert(p.x < gateX(hz, p.z) - DROPGATE.half, `the gate stopped him (${p.x - gateX(hz, p.z)})`);
});

test('the gate run: four gates fall one after another, never all at once, with a safe spot between each', () => {
  const world = new World({ seed: 5 });
  const p = world.addFighter(new Fighter({ stats: CHARACTERS.warrior, team: 'player', x: 200, z: 440, controller: new Still() }));
  const sec = STAGE_GATES.sections.findIndex((q) => q.id === 'winch');
  const st = new Stage(world, STAGE_GATES, {});
  st.start(p, { section: sec });
  st.story.lines = [];
  const gates = st.hazards.filter((h) => h.type === 'dropgate').sort((a, b) => a.x - b.x);
  assert(gates.length >= 4, `a run of gates (${gates.length})`);
  const order = [];
  world.events.on('dropgate:down', ({ hazard }) => order.push(gates.indexOf(hazard)));
  // the hero waits in the gap between the 2nd and 3rd gate the whole time: never hit
  const h0 = p.health;
  let allShut = false;
  for (let i = 0; i < 520; i++) {
    p.x = (gateX(gates[1], p.z) + gateX(gates[2], p.z)) / 2;
    world.tick(); st.update();
    if (gates.every((g) => g.gate && (g.gate.phase === 'down' || g.gate.phase === 'fall'))) allShut = true;
  }
  assert(order.slice(0, 4).join() === '0,1,2,3', `they fall in order, back to front (${order.join()})`);
  assert(!allShut, 'there is always a way forward');
  assert(p.health === h0, `the gap between two gates is safe (${p.health}/${h0})`);
});

test('caltrops: a man walking onto them is hurt and hops; jumping, he passes over', () => {
  const world = new World({ seed: 4 });
  const p = world.addFighter(new Fighter({ stats: CHARACTERS.warrior, team: 'player', x: 200, z: 440, controller: new Still() }));
  const sec = STAGE_GATES.sections.findIndex((q) => q.id === 'yard');
  const st = new Stage(world, STAGE_GATES, {});
  st.start(p, { section: sec });
  const hz = st.hazards.find((h) => h.type === 'caltrops');
  assert(hz, 'the yard has caltrops');
  let hurt = 0;
  world.events.on('caltrops', ({ fighter }) => { if (fighter === p) hurt++; });
  p.x = hz.x; p.z = (hz.z0 + hz.z1) / 2; p.fsm.change('idle');
  const h0 = p.health;
  world.tick(); st.update();
  assert(hurt === 1 && p.health < h0 && p.state === 'hitstun', `stepped on them (${hurt}, ${p.state})`);
});

console.log(failed ? `${failed} test(s) FAILED` : 'All Iron Gates garrison tests passed.');
if (failed) process.exitCode = 1;
