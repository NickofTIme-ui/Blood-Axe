// depths.js — Draw-order layers. Fighters, blood drops and projectiles use their
// floor depth (z, SETTINGS.world.floorTop..floorBottom) so things closer to the camera
// draw on top.

import { SETTINGS } from '../config/settings.js';

// A touch of perspective: a character at the back of the lane is drawn a little smaller
// than one at the front (±3.5% over the whole lane — felt, not noticed; the back / front
// views of the walk do the real work). Only the picture: hitboxes and reach don't change.
export function depthScale(z) {
  const W = SETTINGS.world;
  const t = Math.max(0, Math.min(1, (z - W.floorTop) / (W.floorBottom - W.floorTop))); // 0 = back wall, 1 = nearest the camera
  return 0.965 + 0.07 * t;
}

export const DEPTH = {
  sky: -100,
  far: -90,
  floor: -50,
  decals: -40,   // blood on the ground
  shadows: -30,
  // floorTop..floorBottom = fighters / projectiles / blood drops (sorted by z)
  popups: 5000,
  debug: 9000,
};
