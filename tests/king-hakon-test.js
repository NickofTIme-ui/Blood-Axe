// King Hakon in the market square (stage/KingHakon.js): met coming up from the road, he
// cuts down his pack (real kills, each its own way of coming apart) while the heroes are
// held, then the held parting, then he runs off and the square's fight starts.
import assert from 'node:assert/strict';
import { World } from '../src/core/World.js';
import { Controller } from '../src/core/Controller.js';
import { Fighter } from '../src/entities/Fighter.js';
import { CHARACTERS } from '../src/data/characters.js';
import { Stage } from '../src/stage/Stage.js';
import { STAGE_VILLAGE } from '../src/data/stageVillage.js';
import { PACK, STEPS } from '../src/stage/KingHakon.js';

function setup(section = 0) {
  const w = new World({ seed: 7 }), p = w.addFighter(new Fighter({ stats: CHARACTERS.warrior, team: 'player', x: 150, z: 440, controller: new Controller() }));
  const st = new Stage(w, STAGE_VILLAGE); st.start(p, { section });
  const tick = () => { w.tick(); st.update(); };
  return { w, p, st, tick };
}

{
  const { w, p, st, tick } = setup();
  const K = st.king;
  assert.ok(K && K.waiting, 'He is already holding the square while the road is fought');
  assert.equal(K.foes.length, PACK.length);
  assert.ok(K.foes.every((f) => f.lurking === 'king'), "His pack is never counted as the road's foes");
  for (let i = 0; i < 180; i++) tick();
  st.story.skipScene(); for (let i = 0; i < 120; i++) tick();
  // win the road
  p.x = 1100; p.z = 420;
  for (let i = 0; i < 4000 && st.phase !== 'clear'; i++) {
    for (const f of st.livingFoes()) { f.health = 0; f.removeMe = true; }
    tick();
  }
  assert.equal(st.phase, 'clear', 'The road can be won with his pack standing');
  assert.ok(K.foes.every((f) => f.alive), 'Nobody touched his men');
  // up the road
  p.x = 1450; p.z = 420; tick();
  assert.equal(K.phase, 'intro'); assert.ok(K.cinema && K.holding);
  const kills = [], fats = [];
  w.events.on('kill', (e) => { if (e.king) { kills.push(e.defender); fats.push(e.fatality); } });
  let card = 0; w.events.on('kingCard', () => card++);
  const startX = p.x;
  for (let i = 0; i < 1200 && K.phase !== 'words'; i++) { p.controller.registerPress('attack'); tick(); }
  assert.equal(K.phase, 'words', 'He fights it out, then roars, then speaks');
  assert.equal(kills.length, PACK.length, 'Every man of his pack dies by his blade');
  assert.deepEqual(fats, STEPS.flatMap((s) => s.fat), 'Each kill comes apart its own way');
  assert.equal(card, 1, 'His name goes up once');
  assert.ok(p.x > startX + 50 && p.x <= K.x - K.K.meet + 1, 'His son walks up to him, and stops short of him');
  tick(); tick();
  assert.equal(st.story.current?.beat.id, 'kingParting');
  assert.ok(st.story.holding);
  assert.ok(w.fighters.some((f) => f.lurking === 1 && f.alive), 'The men at the well wait at their posts');
  st.story.skipScene();
  for (let i = 0; i < 30; i++) tick();
  assert.equal(K.phase, 'leave'); assert.ok(!K.cinema && !w.hold && !p.awe && !p.unbounded, 'The heroes are let go');
  for (let i = 0; i < 100; i++) tick();
  assert.equal(K.phase, 'gone'); assert.ok(K.x > 1900, 'He ran off up the lane');
  p.x = 1750; for (let i = 0; i < 5; i++) tick();
  assert.equal(st.section.id, 'square');
  assert.ok(st.fightOn, "Once they've parted, the square's fight is on");
}
{
  // a start at the square (test navigator, checkpoint): he's been and gone, the fight is on
  const { st, tick } = setup(1);
  tick();
  assert.ok(!st.king, 'No king in the square');
  assert.ok(st.story.done.has('kingParting') && st.fightOn);
}
{
  // the church remembers the promise
  const elder = STAGE_VILLAGE.story.find((b) => b.id === 'elder');
  assert.match(elder.lines[0][1], /swore/);
}
console.log('King Hakon checks passed: holds the square out of sight, his pack never counts for the road, six kills each their own way, his name once, his son walks up, the held parting, the square waits for it, then he runs off; started past him, no wait.');
