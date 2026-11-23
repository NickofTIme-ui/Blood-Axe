// The well in the market square (stage/WellRescue.js): the butcher holds Mira's boy out over
// the well, a raider holds her by the hood. Hit the butcher and he drops the boy on the stones;
// too slow and he throws him down the well, to be hauled up once the square is won. Either way
// the two of them end up together, then run.
import assert from 'node:assert/strict';
import { World } from '../src/core/World.js';
import { Controller } from '../src/core/Controller.js';
import { Fighter } from '../src/entities/Fighter.js';
import { CHARACTERS } from '../src/data/characters.js';
import { Stage } from '../src/stage/Stage.js';
import { STAGE_VILLAGE } from '../src/data/stageVillage.js';
import { WELL_RESCUE } from '../src/stage/WellRescue.js';

function setup() {
  const w = new World({ seed: 7 }), p = w.addFighter(new Fighter({ stats: CHARACTERS.warrior, team: 'player', x: 1460, z: 440, controller: new Controller() }));
  const st = new Stage(w, STAGE_VILLAGE); st.start(p, { section: 1 });
  p.invincible = true;
  const tick = () => { w.tick(); st.update(); };
  for (let i = 0; i < 400 && st.story.busy; i++) { st.story.skipScene?.(); tick(); }
  for (let i = 0; i < 5; i++) tick();
  return { w, p, st, tick, R: st.wellRescue };
}
const killAll = (st) => { for (const f of st.livingFoes()) { f.health = 0; f.removeMe = true; } };

{
  const { p, st, tick, R } = setup();
  assert.ok(R, 'The village has the well scene');
  assert.equal(R.phase, 'held');
  assert.ok(R.butcher && R.butcher.stats.id === 'butcher', 'The butcher has the boy');
  assert.ok(R.grip && R.grip !== R.butcher, 'Another man has Mira');
  assert.ok(R.npc.split && R.boy.shown, 'Mother and son are apart');
  assert.ok(Math.abs(R.boy.x - R.butcher.x) > 40 && R.boy.h > WELL_RESCUE.rim, 'The boy is held out over the rim');
  const x0 = R.butcher.x;
  for (let i = 0; i < 100; i++) tick();
  assert.equal(R.phase, 'held');
  assert.ok(Math.abs(R.butcher.x - x0) < 1, 'The butcher keeps his place while he holds the boy, even with the fight on');
  assert.ok(R.clock > 0 && R.bark, 'The clock runs and he taunts');
  // hit him: he drops the boy on the stones
  R.butcher.health -= 10;
  tick();
  assert.equal(R.phase, 'falling');
  assert.ok(R.butcher.controller !== null && !R.butcher.wellHolder, 'The butcher fights');
  for (let i = 0; i < WELL_RESCUE.fall + 2; i++) tick();
  assert.equal(R.boy.h, 0, 'He lands on the stones, not in the well');
  for (let i = 0; i < 400 && R.phase === 'back'; i++) tick();
  assert.ok(R.shoved, 'Mira turned on the man holding her');
  assert.equal(R.phase, 'hug', 'The boy ran back to his mother');
  assert.ok(!R.npc.split, 'Drawn together again');
  // the square won: after the hug they run
  for (let i = 0; i < 4000 && R.phase !== 'done'; i++) { killAll(st); tick(); }
  assert.equal(R.phase, 'done');
  for (let i = 0; i < 30; i++) tick();
  assert.ok(['fleeing', 'safe'].includes(R.npc.state), 'They run for it');
}
{
  const { st, tick, R } = setup();
  for (let i = 0; i < WELL_RESCUE.throw + 30 && R.phase === 'held'; i++) tick();
  assert.equal(R.phase, 'thrown', 'Too slow: he throws the boy down the well');
  for (let i = 0; i < 30; i++) tick();
  assert.ok(!R.boy.shown, 'Gone down the well');
  for (let i = 0; i < 6000 && R.phase === 'thrown'; i++) { killAll(st); tick(); }
  assert.equal(R.phase, 'hauling', 'The square won, he is hauled up');
  for (let i = 0; i < 1200 && R.phase !== 'done'; i++) { killAll(st); tick(); }
  assert.equal(R.phase, 'done', 'Back with his mother, then away');
  assert.ok(st.story.isRescued('mira'));
}
console.log('Well rescue: the boy held over the well, dropped when the butcher is hit, thrown in when too slow and hauled up, reunited, then away.');
