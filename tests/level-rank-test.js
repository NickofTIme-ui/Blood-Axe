// level-rank-test.js — The level's grade (progression/LevelRank.js): S is hard but
// reachable, and each step down is what a worse run earns.
import { levelRank, parSeconds } from '../src/progression/LevelRank.js';
import { STAGE_VILLAGE } from '../src/data/stageVillage.js';

let fails = 0;
const check = (name, ok) => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}`); if (!ok) fails++; };
const base = { kills: 40, finishers: 10, secrets: 2, secretsTotal: 3, deaths: 0, frames: 60 * 300, damage: 90, maxHealth: 100, peakStyle: 4, par: 400, saved: ['a', 'b'], lost: [] };

check('a clean stylish run (no deaths, under a bar lost, S style, all saved) is an S', levelRank(base).letter === 'S');
check('the same run with one death is never an S', levelRank({ ...base, deaths: 1 }).letter !== 'S');
check('two bars lost drops an otherwise great run to A', levelRank({ ...base, damage: 200 }).letter === 'A');
check('a plain fight (B style, few executions) is not an S', levelRank({ ...base, peakStyle: 2, finishers: 2 }).letter !== 'S');
check('a scrappy run (2 deaths, 3 bars, C style) is a C', levelRank({ ...base, deaths: 2, damage: 300, peakStyle: 1, finishers: 1, frames: 60 * 800 }).letter === 'C');
check('middling run is a B', levelRank({ ...base, deaths: 1, damage: 180, peakStyle: 3, finishers: 4 }).letter === 'B');
check('a level with no villagers or secrets is not marked down for them', levelRank({ ...base, saved: [], lost: [], secretsTotal: 0, secrets: 0 }).letter === 'S');
check('scores stay within 0..100', [base, { deaths: 9, damage: 9999, frames: 1e7, par: 100 }].every((s) => { const r = levelRank(s); return r.score >= 0 && r.score <= 100; }));
check('a level has a sensible par time', parSeconds(STAGE_VILLAGE) > 120 && parSeconds(STAGE_VILLAGE) < 1200);
if (fails) { console.log(`${fails} failed`); process.exit(1); }
console.log('level rank: all passed');
