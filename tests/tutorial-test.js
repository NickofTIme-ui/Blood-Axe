// THE PRACTICE YARD (Nick, 2026-11-04: a tutorial in its own space, quick, not wordy, every
// mechanic for each hero, the unlocked skill-tree moves hidden). data/tutorial.js,
// data/stagePractice.js, stage/Tutorial.js. Every lesson of every hero is played here with
// the buttons its card shows, so a renamed move or state can't leave a lesson nobody can pass.
import assert from 'node:assert/strict';
import { World } from '../src/core/World.js';
import { Controller } from '../src/core/Controller.js';
import { Fighter } from '../src/entities/Fighter.js';
import { CHARACTERS } from '../src/data/characters.js';
import { Stage } from '../src/stage/Stage.js';
import { STAGE_PRACTICE } from '../src/data/stagePractice.js';
import { STAGES, ARENAS } from '../src/data/stages.js';
import { levelOrder } from '../src/config/testMode.js';
import { LESSONS, BASICS, lessonsFor } from '../src/data/tutorial.js';
import { TUTORIAL } from '../src/stage/Tutorial.js';
import { CONTROLS } from '../src/config/controls.js';
import { SKILL_TREES } from '../src/data/skills.js';

class Pad extends Controller {
  constructor() { super(); this.queue = []; this.mx = 0; this.mz = 0; this.hold = {}; }
  sample(frozen) {
    if (frozen) return;
    for (const a of this.queue.splice(0)) this.registerPress(a);
    this.held = { ...this.hold };
    this.moveX = this.mx; this.moveZ = this.mz;
  }
}

function yard(hero) {
  const w = new World({ seed: 11 });
  const st = new Stage(w, STAGE_PRACTICE);
  const p = w.addFighter(new Fighter({ stats: CHARACTERS[hero], team: 'player', x: 400, z: 420, controller: new Pad() }));
  st.start([p]);
  return { w, st, p, T: st.tutorial };
}
const run = (w, st, n, until = null) => { for (let i = 0; i < n; i++) { w.tick(); st.update(); if (until?.()) return true; } return false; };

// ------------------------------------------------------------ the yard is not a level
assert.ok(!STAGES.practice, 'the yard is kept out of the levels');
assert.equal(ARENAS.practice, STAGE_PRACTICE, 'the arena can load it');
assert.ok(!levelOrder().includes('practice'), 'test mode never skips into it');
assert.ok(STAGE_PRACTICE.practice);

// ------------------------------------------------------------ the lessons
const SPECIAL = ['stick', 'down', '+', '>'];
for (const [hero, list] of Object.entries({ ...LESSONS, basics: BASICS })) {
  assert.ok(list.length >= 8 && list.length <= 16, `${hero}: short (${list.length} lessons)`);
  assert.equal(list[0].id, 'move', `${hero}: starts with moving`);
  assert.equal(new Set(list.map((l) => l.id)).size, list.length, `${hero}: lesson ids unique`);
  for (const l of list) {
    assert.ok(l.name.split(' ').length <= 3, `${hero}/${l.id}: name is a few words`);
    assert.ok(!l.hint || l.hint.length <= 34, `${hero}/${l.id}: hint is one short line`);
    for (const k of l.keys) {
      const a = k.replace(/^hold:/, '');
      assert.ok(SPECIAL.includes(a) || CONTROLS.keyboard[a], `${hero}/${l.id}: ${k} is a button`);
    }
  }
}
for (const id of Object.keys(CHARACTERS)) assert.ok(lessonsFor(id).length, `${id} has lessons`);
// nothing from a skill tree is taught (the higher, unlocked moves stay hidden)
const treeNames = Object.values(SKILL_TREES).flatMap((t) => t.branches.flatMap((b) => b.nodes.map((n) => n.name.toUpperCase())));
for (const l of Object.values(LESSONS).flat()) assert.ok(!treeNames.includes(l.name), `${l.name} is not a skill-tree move`);
for (const l of LESSONS.warrior) assert.ok(!['spin', 'plunge', 'kingcast'].some((m) => l.done.moves?.includes(m)), `Rurik's ${l.id} is base kit`);

// ------------------------------------------------------------ the men
{
  const { w, st, p, T } = yard('warrior');
  run(w, st, TUTORIAL.firstMen + TUTORIAL.respawn + 260);
  const men = w.fighters.filter((f) => f.team === 'enemy');
  assert.equal(men.length, 2, 'two men to hit');
  assert.ok(men.every((f) => f.dummy), 'both stand and take it');
  for (const f of men) assert.ok(Math.abs(f.x - f.post.x) < 30 && Math.abs(f.z - f.post.z) < 30, `he walked to his post (${Math.round(f.x)},${Math.round(f.z)})`);
  let hurt = 0;
  w.events.on('hit', (e) => { if (e.defender === p) hurt++; });
  p.x = men[0].x - 50; p.z = men[0].z;
  run(w, st, 600);
  assert.equal(hurt, 0, 'standing men never fight back');
  assert.equal(st.phase, 'fight', 'the yard never clears');
  // knocked off his post, he walks back
  men[0].x += 160;
  run(w, st, 240);
  assert.ok(Math.abs(men[0].x - men[0].post.x) < 30, 'back to his post');
  // killed: another comes in
  men[0].health = 0; men[0].fsm.change('dead');
  run(w, st, TUTORIAL.respawn + 260);
  assert.equal(w.fighters.filter((f) => f.team === 'enemy' && f.alive && f.dummy).length, 2, 'a fallen man is replaced');
  assert.equal(T.index, 0, 'nothing done by standing about');
}

// ------------------------------------------------------------ every lesson, every hero, played
function teach(hero) {
  const { w, st, p, T } = yard(hero);
  run(w, st, TUTORIAL.firstMen + TUTORIAL.respawn * 2 + 300); // (the men are at their posts)
  const c = p.controller;
  const near = (gap = 46) => {
    const ready = () => w.fighters.find((f) => f.team === 'enemy' && f.alive && f.dummy && ['idle', 'walk'].includes(f.state));
    run(w, st, 300, ready); // (one on his feet, not still getting up from the last lesson)
    const e = ready() ?? w.fighters.find((f) => f.team === 'enemy' && f.alive && f.dummy);
    p.x = e.x - gap; p.z = e.z; p.facing = 1; p.vx = p.vz = 0;
    return e;
  };
  const press = (a, wait = 6) => { c.queue.push(a); run(w, st, wait); };
  const passed = [];
  for (let i = 0; i < T.total; i++) {
    const L = T.lesson;
    run(w, st, 20);
    run(w, st, 240, () => ['idle', 'walk'].includes(p.state)); // (back on his feet: the sparring man may have floored him)
    c.mx = c.mz = 0; c.hold = {};
    const gap = L.id === 'knife' ? 250 : ['shoulder', 'rush'].includes(L.id) ? 260 : 46;
    if (!['move', 'sprint', 'block'].includes(L.id)) near(gap);
    const keys = L.keys.filter((k) => k !== '+' && k !== '>');
    if (L.id === 'block') {
      c.hold.block = true;
      run(w, st, 900, () => T.done);
    } else if (L.id === 'combo') {
      // mashed, the way a player does it (a heavier hit holds the next press back a little)
      for (let j = 0; j < 20 && !T.done; j++) press('attack', 5);
    } else if (L.id === 'sunder') {
      // X, X, Y throws him up; Y again once it has connected splits him in the air
      press('attack', 8); press('attack', 8); press('heavy', 8);
      for (let j = 0; j < 12 && !T.done; j++) press('heavy', 4);
    } else if (L.id === 'cuts') {
      // the 4th hit has thrown him up: heavy goes up after him
      for (let j = 0; j < 20 && p.state !== 'light4'; j++) press('attack', 5);
      run(w, st, 40, () => p.state === 'light4' && p.fsm.frame >= 10);
      press('heavy', 30);
    } else if (L.id === 'fade') {
      press('attack', 4); c.mx = -1; press('jump', 20); // (away from the man she's cutting)
    } else if (L.id === 'move') {
      c.mx = 1; run(w, st, 50); c.mx = -1; run(w, st, 90, () => T.done); // (Rurik struts on foot: walkPace)
    } else {
      for (const k of keys) {
        if (k === 'stick') { c.mx = 1; run(w, st, 12); continue; }
        if (k === 'down') { c.mz = 1; continue; }
        if (k.startsWith('hold:')) { const a = k.slice(5); c.queue.push(a); c.hold[a] = true; run(w, st, 45); c.hold[a] = false; run(w, st, 4); continue; }
        if (k === 'sprint') { c.mx = 1; press('sprint', 12); if (['shoulder', 'rush'].includes(L.id)) run(w, st, 20); continue; }
        press(k, k === 'jump' ? 12 : L.id === 'thunder' ? 16 : 8); // (a bolt's next press counts once it has fired)
      }
      run(w, st, 30, () => T.done);
    }
    c.mx = c.mz = 0; c.hold = {};
    if (!T.done) console.log(w.fighters.map((f) => `${f.team}${f.dummy ? 'D' : ''} ${Math.round(f.x)},${Math.round(f.z)},${Math.round(f.h)} ${f.state} ${f.alive}`).join(' | '));
    assert.ok(T.done, `${hero}: lesson ${L.id} (${L.name}) done with ${L.keys.join(' ')} — hero in ${p.state}`);
    passed.push(L.id);
    run(w, st, TUTORIAL.advance + 2);
  }
  assert.ok(T.finished, `${hero}: practice done`);
  assert.equal(T.skipped.size, 0, `${hero}: nothing skipped`);
  // free practice: one who fights back comes in too
  run(w, st, TUTORIAL.respawn * 2 + 300);
  assert.ok(w.fighters.some((f) => f.team === 'enemy' && f.alive && !f.dummy), `${hero}: a sparring man for free practice`);
  assert.ok(p.alive && p.health === p.stats.maxHealth, `${hero}: can't be hurt in the yard`);
  return passed;
}
for (const hero of Object.keys(LESSONS)) {
  const passed = teach(hero);
  console.log(`  ${hero}: ${passed.join(', ')}`);
}

// ------------------------------------------------------------ skipping
{
  const { w, st, p, T } = yard('rogue');
  let ended = null;
  w.events.on('practiceDone', (e) => { ended = e; });
  run(w, st, 5);
  for (let i = 0; i < T.total; i++) {
    p.controller.queue.push('padLeft');
    run(w, st, 2);
    assert.ok(T.done, `skip lesson ${i}`);
    run(w, st, TUTORIAL.advance + 1);
  }
  assert.ok(T.finished && ended?.skipped.length === T.total, 'skipping every lesson ends the practice');
}

console.log('Practice yard checks passed: kept out of the levels, short lessons with no skill-tree moves, men who stand and take it (and walk back), one who fights for BLOCK, every lesson of every hero done with its own buttons, skip.');
