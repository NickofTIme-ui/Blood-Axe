// Veteran.js — By the last levels everyone fights with their whole kit (Nick, 27 November
// 2026: "all characters should be using all their moves and advanced skills by now").
//
// A level's `veteran: { points }`:
//   - THE FLOOR: arriving at the level (from the one before, CONTINUE, a checkpoint, test
//     mode), the shared skill pool is topped up to at least `points` earned. A player who
//     earned more keeps what he earned; one who skipped ahead isn't left with a level-1 kit.
//     Oathkeeper's fire is his by now too (level 1's flag).
//   - THE ALLIES' BUILD: the heroes nobody plays (entities/Ally.js) get `points` spent for
//     them across their whole tree, every first tier, then every second, then a major:
//     every move they have, and the big one.
// Pure logic, no Phaser: tested in tests/logic-test.js.

import { Progress } from './Progress.js';
import { nodesOf } from '../data/skills.js';

export const BIRTHRIGHT_FLAGS = ['oathkeeper'];

// Top the pool up to `points` earned. Returns the points given (0 when he had them).
export function ensureFloor(progress, points) {
  if (!progress) return 0;
  let given = 0;
  if (progress.earned < points) {
    given = points - progress.earned;
    progress.data.bonus += given;
  }
  for (const f of BIRTHRIGHT_FLAGS) progress.setFlag(f);
  progress.save();
  return given;
}

// The picks a hero would make with `points`: cheapest tier first across every branch, then
// the next tier, then a major (the first one allowed). Deterministic.
export function veteranPicks(heroId, points, flags = BIRTHRIGHT_FLAGS) {
  const p = new Progress(null);
  p.data.bonus = points;
  for (const f of flags) p.data.campaign.flags[f] = true;
  const nodes = nodesOf(heroId).filter((n) => !n.planned).sort((a, b) => a.tier - b.tier || a.cost - b.cost);
  let bought = true;
  while (bought) {
    bought = false;
    for (const n of nodes) if (p.buy(heroId, n.id)) { bought = true; break; }
  }
  return { picks: p.picks(heroId), progress: p };
}

// The hero's stats with the veteran build (worn trophies are the player's own: not carried)
export function veteranStats(heroId, base, points) {
  return veteranPicks(heroId, points).progress.statsFor(heroId, base);
}
