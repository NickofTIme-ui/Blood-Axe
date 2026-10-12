// groundTry.js — NEW GROUND: try a level's candidate ground painting (LEVEL_ART `groundTry`,
// e.g. the Magnific pass on the Burning Village street) in place of its live one.
// Turn it on in the title screen's DIRECTOR'S CUT (NEW GROUND: ON / OFF; remembered on
// this computer). Levels with no candidate keep their own ground.

const KEY = 'bloodAxe.groundTry';
const stored = () => { try { return localStorage.getItem(KEY) === '1'; } catch { return false; } };

export const GROUND_TRY = { on: typeof location !== 'undefined' && stored() };

export function toggleGroundTry() {
  GROUND_TRY.on = !GROUND_TRY.on;
  try { localStorage.setItem(KEY, GROUND_TRY.on ? '1' : '0'); } catch { /* (private window: this session only) */ }
  return GROUND_TRY.on;
}
