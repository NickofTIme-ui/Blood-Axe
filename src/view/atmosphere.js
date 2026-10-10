// atmosphere.js — The levels' depth and value structure (docs/art-direction.md), view only.
//
// The painted layers are all equally sharp and contrasty, so the backdrop competes with the
// fight. This lays three soft washes over each level, by theme:
//   far    a veil of the level's air over the sky and far layers (camera-fixed): lifts their
//          blacks and dims their highlights, so the distance recedes
//   wall   a lighter veil over the street's back wall and its set pieces, darkening to a
//          contact shadow where the wall meets the street (the floor plane reads as a floor)
//   floor  the street itself: an occlusion band along its back edge and a little shade at the
//          very front, leaving the middle of the lane, where the fighting is, untouched
// Fires, lit windows and glows are drawn above the veils, so lights still punch through.
//
// Also: softShadow(), the soft contact shadow under fighters (a feathered pool with a darker
// core in place of the hard-edged ellipse), so men stand ON the busy painted ground.

import { SETTINGS } from '../config/settings.js';
import { DEPTH } from './depths.js';
import { LEVEL_ART } from '../data/levelArt.js';

// per theme: the air's colour and how thick each wash is (0 = none)
export const AIR = {
  village: { haze: 0x2e2638, far: 0.34, wall: 0.26, wallFoot: 0.55, floorBack: 0.45, floorFront: 0.22 },
  wood: { haze: 0x2a3438, far: 0.3, wall: 0.24, wallFoot: 0.5, floorBack: 0.42, floorFront: 0.22 },
  mine: { haze: 0x1e1c22, far: 0.22, wall: 0.2, wallFoot: 0.5, floorBack: 0.4, floorFront: 0.2 },
  ascent: { haze: 0x5a6070, far: 0.24, wall: 0.16, wallFoot: 0.4, floorBack: 0.32, floorFront: 0.18 },
  gates: { haze: 0x2e2630, far: 0.3, wall: 0.22, wallFoot: 0.5, floorBack: 0.42, floorFront: 0.22 },
};

const hex = (c) => `${(c >> 16) & 255},${(c >> 8) & 255},${c & 255}`;

// A gradient texture, top to bottom (or left to right: `across`), stretched to size where
// it's drawn: stops [[t, colour, alpha], ...]. Smooth, unlike stacked bands.
export function gradient(scene, key, stops, across = false) {
  if (scene.textures.exists(key)) return key;
  const cv = document.createElement('canvas');
  cv.width = across ? 256 : 2; cv.height = across ? 2 : 256;
  const c = cv.getContext('2d');
  const g = across ? c.createLinearGradient(0, 0, 256, 0) : c.createLinearGradient(0, 0, 0, 256);
  for (const [t, col, a] of stops) g.addColorStop(t, `rgba(${hex(col)},${a})`);
  c.fillStyle = g; c.fillRect(0, 0, cv.width, cv.height);
  scene.textures.addCanvas(key, cv);
  return key;
}

export function applyAtmosphere(scene, theme, width) {
  const A = AIR[theme];
  if (!A) return;
  const W = SETTINGS.width; const H = SETTINGS.height;
  const top = SETTINGS.world.floorTop - 50; // the street's back edge
  const wallH = LEVEL_ART[theme]?.wall?.height ?? 250;
  // the far layers: thickest low down, where the distance is
  if (A.far) {
    const k = gradient(scene, `air-far-${theme}`, [[0, A.haze, A.far * 0.55], [0.75, A.haze, A.far], [1, A.haze, A.far]]);
    scene.add.image(-40, -60, k).setOrigin(0).setDisplaySize(W + 80, top + 60).setScrollFactor(0).setDepth(DEPTH.far + 2.5);
  }
  // the back wall: a thin veil, then a contact shadow at its foot
  if (A.wall) {
    const k = gradient(scene, `air-wall-${theme}`, [[0, A.haze, A.wall], [0.78, A.haze, A.wall], [1, 0x000000, A.wallFoot]]);
    scene.add.image(-W, top - wallH - 40, k).setOrigin(0).setDisplaySize(width + W * 2, wallH + 48).setDepth(DEPTH.floor - 0.97);
  }
  // the street: occlusion at the back edge, the middle clear, a little shade at the front
  if (A.floorBack || A.floorFront) {
    const k = gradient(scene, `air-floor-${theme}`, [[0, 0x000000, A.floorBack], [0.16, 0x000000, A.floorBack * 0.3], [0.3, 0x000000, 0],
      [0.82, 0x000000, 0], [1, 0x000000, A.floorFront]]);
    scene.add.image(-W, top, k).setOrigin(0).setDisplaySize(width + W * 2, H - top + 40).setDepth(DEPTH.floor + 0.5);
  }
}

// The soft contact shadow: a feathered pool, darkest right under the feet. Returns a
// container, so it takes the same calls the old ellipse did (setPosition / setScale /
// setAlpha / setVisible / setDepth / destroy).
export function softShadow(scene, x, y, w, h, alpha) {
  if (!scene.textures.exists('soft-shadow')) {
    const cv = document.createElement('canvas');
    cv.width = 128; cv.height = 64;
    const c = cv.getContext('2d');
    c.setTransform(1, 0, 0, 0.5, 0, 0);
    const g = c.createRadialGradient(64, 64, 0, 64, 64, 64);
    g.addColorStop(0, 'rgba(0,0,0,1)'); g.addColorStop(0.35, 'rgba(0,0,0,0.85)'); g.addColorStop(0.7, 'rgba(0,0,0,0.35)'); g.addColorStop(1, 'rgba(0,0,0,0)');
    c.fillStyle = g; c.fillRect(0, 0, 128, 128);
    scene.textures.addCanvas('soft-shadow', cv);
  }
  // (a touch wider and deeper than the old ellipse: its edge is feathered away)
  const img = scene.add.image(0, 0, 'soft-shadow').setDisplaySize(w * 1.3, h * 1.7);
  const ct = scene.add.container(x, y, [img]);
  // (its core is darker than the flat ellipse was, at the alpha the views already pass)
  const set = ct.setAlpha.bind(ct);
  ct.setAlpha = (a) => set(Math.min(1, a * 1.5));
  return ct.setAlpha(alpha);
}
