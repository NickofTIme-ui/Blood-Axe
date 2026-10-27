// Bodies and severed pieces always end up lying flat: nothing settles stood on its end
// or propped up on a corner, and a man killed by fire goes down and burns lying down.
import assert from 'node:assert/strict';
import { stepRigid, boxHull, longAxis, tiltOf, FLAT_TILT } from '../src/effects/Physics.js';
import { FleshChain } from '../src/effects/FleshChain.js';
import { World } from '../src/core/World.js';
import { Fighter } from '../src/entities/Fighter.js';
import { Controller } from '../src/core/Controller.js';
import { ENEMIES } from '../src/data/enemies.js';
import { SpriteEnemyView } from '../src/view/SpriteEnemyView.js';

const flat = (tilt) => Math.abs(tilt) <= FLAT_TILT;

// Rigid pieces (heads, gibs, long halves, doll limbs): long ones dropped every which way,
// including straight down onto an end with no spin at all, come to rest lying along
// their length, and still within a few seconds.
let rigid = 0;
for (const [w, h] of [[8, 30], [10, 50], [6, 60], [14, 28], [40, 14]]) {
  for (const rot of [0, 0.02, -0.3, 0.8, Math.PI / 2, 2.9]) {
    for (const [vx, vh, spin] of [[0, 0, 0], [0, -300, 0], [120, 200, 3], [-200, 420, -6]]) {
      const hull = boxHull(-w / 2, -h / 2, w / 2, h / 2);
      const b = { x: 0, h: 40, vx, vh, rot, spin };
      let t = 0;
      for (; t < 600 && !b.asleep; t++) stepRigid(b, hull, 0, { bounce: 0.3, friction: 0.6 });
      assert.ok(b.asleep && t <= 301, `piece ${w}x${h} never came to rest`);
      const tilt = tiltOf(longAxis(hull).ang + b.rot);
      assert.ok(flat(tilt), `piece ${w}x${h} dropped at ${rot} rests ${(tilt * 180 / Math.PI).toFixed(0)}° off flat`);
      rigid++;
    }
  }
}

// A squat top half (a torso with its arms out, near as wide as it is tall) still lies down
// along its spine instead of sitting up on its cut (its body axis is given: SpriteCut,
// Dismember halfH).
for (const rot of [0, 0.15, -0.2]) {
  const hull = boxHull(-17, -15, 17, 15);
  const b = { x: 0, h: 30, vx: 60, vh: 0, rot, spin: 0, long: { ang: Math.PI / 2, ratio: 2 } };
  for (let t = 0; t < 600 && !b.asleep; t++) stepRigid(b, hull, 0, { bounce: 0.36, friction: 0.6 });
  assert.ok(b.asleep && flat(tiltOf(Math.PI / 2 + b.rot)), `a squat half sat up at ${(b.rot * 180 / Math.PI).toFixed(0)}°`);
  rigid++;
}

// Jointed halves (FlexibleCut's chain): a pair of legs left standing on its feet, a half
// dropped onto its cut end, nudged or not, goes over and lies along the floor.
let chains = 0;
for (const n of [3, 4, 5]) {
  for (const [vx, vy, spin] of [[0, 0, 0], [45, -30, 0.7], [-45, -30, -0.7], [0, -200, 0], [260, -420, 2]]) {
    const pts = Array.from({ length: n }, (_, i) => ({ x: 0, y: 394 - (n - 1 - i) * 24 }));
    const c = new FleshChain(pts);
    c.skid = true; c.bounce = 0.28; c.launch(vx, vy, spin);
    let t = 0;
    for (; t < 1200 && !c.asleep; t++) c.step(() => 400, { minX: -1000, maxX: 1000 }, 6);
    assert.ok(c.asleep, 'standing half never settled');
    const tilt = tiltOf(longAxis(c.points).ang);
    assert.ok(flat(tilt), `standing half (${n} joints) rests ${(tilt * 180 / Math.PI).toFixed(0)}° off flat`);
    chains++;
  }
}

// Killed by fire: he goes down, and while his body burns (which can take seconds) the
// picture drawn for him is his lying pose, not the standing hit pose.
{
  const world = new World();
  const f = world.addFighter(new Fighter({ stats: ENEMIES.grunt, team: 'enemy', x: 400, z: 420, controller: new Controller() }));
  f.burn = { heat: 0.6, lit: true, cool: 0 };
  f.health = 0;
  f.fsm.change('knockdown', { vx: 40, vh: 110 });
  for (let t = 0; t < 120 && f.state !== 'dead'; t++) world.tick();
  assert.equal(f.state, 'dead');
  const A = { hit: { frames: ['hit'] }, air: { frames: ['air'] }, lying: { frames: ['lying'] } };
  const view = Object.assign(Object.create(SpriteEnemyView.prototype), { f, A, ledgePose: () => null });
  for (let t = 0; t < 400; t++) {
    world.tick();
    assert.equal(view.frameFor(), 'lying', `burning corpse drawn ${view.frameFor()} at ${t}`);
  }
  // struck dead on his feet (no knockdown first) he still goes over, burning or not
  const g = world.addFighter(new Fighter({ stats: ENEMIES.grunt, team: 'enemy', x: 600, z: 420, controller: new Controller() }));
  g.burn = { heat: 0.6, lit: true, cool: 0 };
  g.health = 0; g.fsm.change('dead');
  const gv = Object.assign(Object.create(SpriteEnemyView.prototype), { f: g, A, ledgePose: () => null });
  for (let t = 0; t < 60; t++) world.tick();
  assert.equal(gv.frameFor(), 'lying', 'a man struck dead while burning never went down');
}

console.log(`Settle-flat checks passed: ${rigid} rigid pieces and ${chains} jointed halves lie flat, burning corpses lie down.`);
