// RoofFire.js — Fire running along a burning roof's ridge (FX.rooffire:
// assets/fx/rooffire-strip.png, data/spriteStrips.js): a row of painted, looping bands of
// flame laid end to end with an overlap, each on its own frame, pace, height and facing so
// the run never flickers in step or repeats. The Burning Roofs' roofs (view/TerrainView.js
// drawVillageBlock); Nick, 2026-10-24. Until the strip is in, no fire is drawn.

import { FX } from './stripImporter.js';

const ANIM = 'rooffire-loop';

// Lays a run of flame along (x0..x1), rooted on y, about `height` world px tall. Returns the
// run ({ sprites, x0, y }) for placeRoofFire, or null with no strip.
export function roofFire(scene, x0, x1, y, { height = 70, depth = 0, seed = 1 } = {}) {
  const F = FX.rooffire;
  if (!F || x1 - x0 < 20) return null;
  if (!scene.anims.exists(ANIM)) {
    scene.anims.create({ key: ANIM, frames: Array.from({ length: F.count }, (_, i) => ({ key: F.key, frame: `f${i}` })), frameRate: F.fps, repeat: -1 });
  }
  let k = (seed * 7919) % 233280;
  const r = () => { k = (k * 9301 + 49297) % 233280; return k / 233280; };
  const sprites = [];
  // (each band's ends burn low, so half-overlapped they read as one unbroken run)
  for (let x = x0; ;) {
    const h = height * (0.75 + r() * 0.45);
    const s = h / F.fh; const w = Math.min(F.fw * s, x1 - x0); // (a short roof: one band, narrowed)
    const left = Math.min(x, x1 - w);
    const f = scene.add.sprite(0, 0, F.key, 'f0').setOrigin(0, 0.97).setScale(w / F.fw, s).setDepth(depth).setFlipX(r() < 0.5);
    f.dx = Math.max(x0, left) - x0;
    f.play({ key: ANIM, startFrame: Math.floor(r() * F.count), frameRate: F.fps * (0.8 + r() * 0.4) });
    sprites.push(f);
    if (left + w >= x1 - 1) break;
    x += w * (0.45 + r() * 0.15);
  }
  const run = { sprites, x0, w: x1 - x0, y };
  // (heard as well as seen: core/FireAmbience.js turns the crackle up as you near a run)
  if (!scene.roofFires) { scene.roofFires = []; scene.events?.once('shutdown', () => { scene.roofFires = null; }); }
  scene.roofFires.push(run);
  return placeRoofFire(run, x0, y, true);
}

// Moves a run with its roof (a shake), or hides it (the roof gone).
export function placeRoofFire(run, x0, y, visible) {
  if (!run) return run;
  run.x0 = x0; run.visible = visible;
  for (const f of run.sprites) f.setPosition(x0 + f.dx, y).setVisible(visible);
  return run;
}
