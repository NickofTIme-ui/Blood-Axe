// enemy-telegraph-test.js — every enemy swing has a wind-up you can see coming and answer
// (data/enemies.js TELEGRAPH): no attack lands without warning. Run: node tests/enemy-telegraph-test.js

import { ENEMIES, TELEGRAPH } from '../src/data/enemies.js';
import { World } from '../src/core/World.js';
import { Controller } from '../src/core/Controller.js';
import { Fighter } from '../src/entities/Fighter.js';
import { CHARACTERS } from '../src/data/characters.js';

let failed = 0;
const check = (ok, msg) => { if (!ok) { failed++; console.log('  FAIL ' + msg); } };
const ms = (f) => Math.round((f * 1000) / 60);

// 1) the data: every move of every enemy (thrall and hangman included)
let moves = 0;
for (const [id, e] of Object.entries(ENEMIES)) {
  const all = e.moves ?? {};
  const followups = new Set(Object.values(all).flatMap((m) => (m.chains ?? []).map((c) => c.next)));
  for (const [k, m] of Object.entries(all)) {
    moves++;
    const heavy = m.breaksGuard || m.unblockable;
    const need = heavy ? TELEGRAPH.heavy : followups.has(k) && k !== 'light1' ? TELEGRAPH.follow : TELEGRAPH.open;
    check(m.startup >= need, `${id} ${k}: wind-up ${m.startup} frames (${ms(m.startup)} ms), needs ${need} (${ms(need)} ms)`);
    for (const c of m.chains ?? []) {
      check(c.from > m.startup + m.active, `${id} ${k}: chains into ${c.next} at frame ${c.from}, before it has struck (${m.startup + m.active})`);
    }
  }
}
check(moves > 40, `checked every move (${moves})`);

// 2) in play: a grunt swings at a hero who stands there; the blow lands no sooner than
// the wind-up says, combo or not
class Scripted extends Controller {
  constructor() { super(); this.script = {}; this.n = 0; }
  sample() { this.held = {}; this.moveX = 0; this.moveZ = 0; this.n++; for (const a of this.script[this.n] ?? []) this.registerPress(a); }
}
for (const presses of [{ 1: ['attack'] }, { 1: ['attack'], 20: ['attack'] }]) {
  const world = new World({ seed: 1 });
  const p = world.addFighter(new Fighter({ stats: CHARACTERS.warrior, team: 'player', x: 100, z: 400, controller: new Scripted() }));
  const gc = new Scripted(); gc.script = presses;
  const g = world.addFighter(new Fighter({ stats: ENEMIES.grunt, team: 'enemy', x: 150, z: 400, controller: gc }));
  g.facing = -1;
  let first = null;
  world.events.on('hit', (e) => { if (e.defender === p && first == null) first = gc.n; });
  for (let i = 0; i < 60 && first == null; i++) world.tick();
  check(first != null, `grunt swing ${JSON.stringify(presses)} landed`);
  check(first == null || first > TELEGRAPH.open, `grunt hit landed on frame ${first}, after a wind-up of at least ${TELEGRAPH.open}`);
}

if (failed) { console.log(`${failed} telegraph check(s) FAILED`); process.exit(1); }
console.log(`Enemy telegraphs: all ${moves} enemy moves wind up for at least ${ms(TELEGRAPH.follow)}-${ms(TELEGRAPH.heavy)} ms; combos never cut in over a wind-up; a grunt's blow lands after its wind-up passed.`);
