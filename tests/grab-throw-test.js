// Grab and throw (Nick, 2026-11-02): D-pad right / F grabs the man in front by the neck (the
// overhead yoke was cut 2026-11-03), the next press throws him the way the stick points in an
// arc; he slams down, bounces, skids; he plows through men, smashes props and goes off
// ledges (combat/Grab.js).
import assert from 'node:assert/strict';
import { World } from '../src/core/World.js';
import { Controller } from '../src/core/Controller.js';
import { Fighter } from '../src/entities/Fighter.js';
import { CHARACTERS } from '../src/data/characters.js';
import { ENEMIES } from '../src/data/enemies.js';
import { Stage } from '../src/stage/Stage.js';
import { STAGE_VILLAGE } from '../src/data/stageVillage.js';
import { createPlayer } from '../src/entities/Player.js';
import { GRAB } from '../src/combat/Grab.js';
import { CONTROLS } from '../src/config/controls.js';
import { ACTIONS } from '../src/core/TickInput.js';

class Pad extends Controller {
  constructor() { super(); this.queue = []; this.mx = 0; this.mz = 0; }
  sample(frozen) {
    if (frozen) return;
    for (const a of this.queue.splice(0)) this.registerPress(a);
    this.moveX = this.mx; this.moveZ = this.mz;
  }
}
const run = (w, n, st) => { for (let i = 0; i < n; i++) { w.tick(); st?.update(); } };

function setup(player = 'warrior') {
  const w = new World({ seed: 3 });
  const p = w.addFighter(new Fighter({ stats: CHARACTERS[player], team: 'player', x: 400, z: 420, controller: new Pad() }));
  const e = w.addFighter(new Fighter({ stats: ENEMIES.grunt, team: 'enemy', x: 450, z: 420, controller: new Controller() }));
  e.facing = -1;
  return { w, p, e };
}

// bindings: D-pad right and F
assert.deepEqual(CONTROLS.gamepad.grab, [15]);
assert.ok(CONTROLS.keyboard.grab.includes('F'));
assert.ok(ACTIONS.includes('grab') && ACTIONS.indexOf('grab') > ACTIONS.indexOf('ready'), 'grab appended to the online button list');

for (const hero of ['warrior', 'mage', 'rogue']) {
  // grab (standing still: still the neck grab, no overhead lift), march, then thrown the way
  // the stick points (up the lane here)
  const { w, p, e } = setup(hero);
  p.controller.queue.push('grab');
  run(w, 3);
  assert.equal(p.state, 'grab', `${hero}: grab starts`);
  run(w, GRAB.catch + 2);
  assert.equal(e.state, 'grabbed', `${hero}: the grunt is caught`);
  assert.equal(p.grab.mode, 'neck', `${hero}: by the neck, never the yoke`);
  run(w, GRAB.neck.clamp + 4);
  assert.ok(e.byNeck && e.h < 20, `${hero}: held by the neck, feet barely off the floor (h ${Math.round(e.h)})`);
  p.controller.mx = 1;
  const x0 = p.x;
  run(w, 30);
  assert.ok(p.x > x0 + 20, `${hero}: marches him forward (${Math.round(p.x - x0)} px)`);
  assert.equal(e.state, 'grabbed');
  // stick up + throw: he goes up the lane
  p.controller.mx = 0; p.controller.mz = -1;
  const z0 = e.z;
  p.controller.queue.push('attack');
  run(w, GRAB.neck.windup + 3);
  assert.equal(e.state, 'knockdown', `${hero}: thrown`);
  run(w, 20);
  assert.ok(e.z < z0 - 40, `${hero}: thrown up the lane (z ${Math.round(z0)} -> ${Math.round(e.z)})`);
  run(w, 60);
  assert.ok(e.health < e.stats.maxHealth, `${hero}: the landing hurts`);
  assert.ok(['idle', 'walk'].includes(p.state), `${hero}: back on his feet (${p.state})`);
}

{
  // nobody in reach: a whiff, nothing caught
  const { w, p, e } = setup();
  e.x = 600;
  p.controller.queue.push('grab');
  run(w, GRAB.whiff + 4);
  assert.notEqual(e.state, 'grabbed');
  assert.equal(p.state, 'idle');
}

{
  // thrown into a crowd: they all go down, and he keeps going through them
  const { w, p, e } = setup();
  const crowd = [560, 620, 680].map((x) => {
    const o = w.addFighter(new Fighter({ stats: ENEMIES.grunt, team: 'enemy', x, z: 420, controller: new Controller() }));
    o.facing = -1;
    return o;
  });
  p.controller.queue.push('grab');
  run(w, GRAB.catch + GRAB.neck.clamp + 4);
  p.controller.mx = 1;
  p.controller.queue.push('grab');
  run(w, 50);
  const down = crowd.filter((o) => ['knockdown', 'getup', 'dead'].includes(o.state) || o.health < o.stats.maxHealth).length;
  assert.ok(down >= 2, `plowed through the crowd (${down} of 3 down)`);
  assert.ok(e.x > 600, `and on through them (x ${Math.round(e.x)})`);
}

{
  // hit while carrying him: he's dropped
  const { w, p, e } = setup();
  p.controller.queue.push('grab');
  run(w, GRAB.catch + GRAB.neck.clamp + 4);
  p.fsm.change('hitstun', { frames: 10 });
  run(w, 2);
  assert.equal(e.state, 'knockdown', 'dropped when the hero is hit');
}

{
  // a boss can't be picked up
  const { w, p, e } = setup();
  e.stats = { ...e.stats, boss: true };
  p.controller.queue.push('grab');
  run(w, GRAB.catch + 4);
  assert.notEqual(e.state, 'grabbed');
}

{
  // level 1: thrown into the market's barrels, he smashes through them
  const w = new World({ seed: 7 });
  const p = createPlayer(w, new Pad(), 'warrior', 1500, 334);
  const st = new Stage(w, STAGE_VILLAGE);
  st.start(p, { section: 1 });
  w.hold = null;
  const first = st.props.find((pr) => pr.x === 1606);
  assert.ok(first, 'the market barrels');
  p.x = 1520; p.z = 334; p.facing = 1;
  const e = w.addFighter(new Fighter({ stats: ENEMIES.grunt, team: 'enemy', x: 1560, z: 334, controller: new Controller() }));
  e.facing = -1;
  p.controller.queue.push('grab');
  run(w, GRAB.catch + GRAB.neck.clamp + 4, st);
  assert.equal(e.state, 'grabbed');
  p.controller.mx = 1;
  p.controller.queue.push('grab');
  run(w, 40, st);
  assert.ok(first.broken, 'the barrel he was thrown into is smashed');
}

{
  // the bouncer: pushing toward him as you grab takes him by the neck, turned round, feet
  // barely off the ground, and marches him (he smashes what he's marched into)
  const { w, p, e } = setup('warrior');
  const m = w.addFighter(new Fighter({ stats: ENEMIES.grunt, team: 'enemy', x: 620, z: 420, controller: new Controller() }));
  p.controller.mx = 1;
  p.controller.queue.push('grab');
  run(w, GRAB.catch + GRAB.neck.clamp + 4);
  assert.equal(e.state, 'grabbed');
  assert.equal(p.grab.mode, 'neck', 'pushing toward him: by the neck');
  assert.ok(e.byNeck && e.facing === p.facing, 'turned round, marched in front of him');
  assert.ok(e.h > 0 && e.h < 20, `feet barely off the ground (h ${Math.round(e.h)})`);
  assert.ok(e.x - p.x > 20, `held out in front (dx ${Math.round(e.x - p.x)})`);
  const x0 = p.x;
  run(w, 60);
  assert.ok(p.x > x0 + 40, `frog-marched forward (${Math.round(p.x - x0)} px)`);
  assert.ok(m.state === 'knockdown' || m.health < m.stats.maxHealth, 'the man in the way is rammed');
  p.controller.queue.push('grab');
  run(w, GRAB.neck.windup + 3);
  assert.equal(e.state, 'knockdown', 'and shoved away');
  assert.ok(!e.byNeck);
}

{
  // the throw's weight: the heave freezes him a beat, the body arcs up then drops, slams,
  // bounces on still going his way, and skids along the ground once he's down
  const { w, p, e } = setup('warrior');
  p.controller.queue.push('grab');
  run(w, GRAB.catch + GRAB.neck.clamp + 4);
  p.controller.queue.push('grab');
  let thrownAt = null; let releaseH = 0; let peak = 0; let landed = null; let bounced = false; let lyingX = null;
  for (let i = 0; i < 200; i++) {
    w.tick();
    if (thrownAt == null && e.thrown) { thrownAt = i; releaseH = e.h; assert.ok(p.hitstop > 0, 'the heave: a beat of hitstop on the thrower'); }
    if (thrownAt != null && landed == null) peak = Math.max(peak, e.h);
    if (e.thrown?.landed && landed == null) landed = i;
    if (landed != null && e.h > 5) bounced = true;
    if (e.lyingSince != null && lyingX == null) lyingX = e.x;
  }
  assert.ok(peak > releaseH + 25, `an arc: up from ${Math.round(releaseH)} to ${Math.round(peak)}`);
  assert.ok(bounced, 'he bounces off the slam');
  assert.ok(lyingX != null && e.x > lyingX + 15, `and skids once he's down (${Math.round(e.x - (lyingX ?? e.x))} px)`);
}

{
  // thrown: mostly head first like a missile, sometimes the tumble
  let missiles = 0;
  for (let seed = 1; seed <= 40; seed++) {
    const w = new World({ seed });
    const p = w.addFighter(new Fighter({ stats: CHARACTERS.warrior, team: 'player', x: 400, z: 420, controller: new Pad() }));
    const e = w.addFighter(new Fighter({ stats: ENEMIES.grunt, team: 'enemy', x: 450, z: 420, controller: new Controller() }));
    e.facing = -1; e.id += seed * 7;
    p.controller.queue.push('grab');
    run(w, GRAB.catch + GRAB.neck.clamp + 4);
    p.controller.queue.push('grab');
    run(w, GRAB.neck.windup + 3);
    assert.ok(e.thrown, 'thrown');
    if (e.thrown.missile) { missiles++; assert.equal(e.facing, p.facing, 'head first: faces the way he flies'); }
  }
  assert.ok(missiles >= 22 && missiles <= 38, `mostly missiles (${missiles} of 40)`);
}

console.log('Grab and throw checks passed: D-pad right / F, every grab by the neck (no overhead lift), thrown in an arc where the stick points, slam, bounce and skid, through a crowd, into barrels; the bouncer neck grip and march; mostly missiles; dropped when hit; no bosses.');
