// stages.js — Every stage a run can be (ArenaScene's data.stage), by id: THE OATH ROAD,
// THE GALLOWS ASCENT (the platforming slice), and the campaign's levels
// (docs/campaign/plan.md), each of which names the next with `next.id`. A level whose id
// isn't here isn't built yet.

import { STAGE } from './stage.js';
import { STAGE_GALLOWS } from './stageGallows.js';
import { STAGE_VILLAGE } from './stageVillage.js';
import { STAGE_WOOD } from './stageWood.js';
import { STAGE_MINE } from './stageMine.js';
import { STAGE_ASCENT } from './stageAscent.js';
import { STAGE_GATES } from './stageGates.js';

export const STAGES = { oath: STAGE, gallows: STAGE_GALLOWS, village: STAGE_VILLAGE, gallowsWood: STAGE_WOOD, hollowMountain: STAGE_MINE, shatteredAscent: STAGE_ASCENT, ironGates: STAGE_GATES };

// The campaign level after this one, if it's built (null: none yet, or the end).
export function nextLevel(data) {
  return data.next && STAGES[data.next.id] ? STAGES[data.next.id] : null;
}
