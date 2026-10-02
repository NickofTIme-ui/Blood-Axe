// parallax.js — The layered backdrop behind THE OATH ROAD (view/Parallax.js draws it).
//
// Back to front. `scroll` is how fast a layer moves with the camera (0 = fixed to the
// screen, 1 = with the floor, >1 = foreground, faster than the fighters). Each painted
// layer is a wide strip that repeats sideways (its ends are blended so it tiles).
//
//   file     PNG in assets/env/parallax/ (a layer whose file isn't there is skipped)
//   key      'opaque' = a full picture; 'black' / 'magenta' = that flat background colour
//            is cut away at load, so only the shapes remain (ChatGPT can't paint
//            transparency, so the layers are drawn on a flat colour)
//   bottom   where the layer's bottom edge sits: px above the horizon (where the floor
//            art begins, SETTINGS.world.floorTop - 50); negative = tucked behind the floor
//   top      (fg layers) where the top edge sits, px from the top of the screen
//   height   drawn height in px (width follows the picture)
//   drift    px per second it slides by itself (clouds, smoke)
//   tint     multiply colour (pushes far layers back into the haze)
//   alpha
//   fg       true = drawn OVER the fighters (keep these to the screen's top edge)
//
// Prompts for the art: docs/background-art-prompts.md.

export const PARALLAX_LAYERS = [
  { name: 'sky', file: 'plx_sky.png', key: 'opaque', scroll: 0.04, bottom: -30, height: 330 },
  { name: 'clouds', file: 'plx_clouds.png', key: 'black', scroll: 0.08, bottom: 110, height: 140, drift: -6, alpha: 0.85 },
  { name: 'far', file: 'plx_far.png', key: 'magenta', scroll: 0.14, bottom: -8, height: 170, tint: 0xb89a9a },
  { name: 'mid', file: 'plx_mid.png', key: 'magenta', scroll: 0.32, bottom: -12, height: 190, tint: 0xd8c4c0 },
  { name: 'near', file: 'plx_near.png', key: 'magenta', scroll: 0.58, bottom: -16, height: 205 },
  { name: 'fg', file: 'plx_fg.png', key: 'magenta', scroll: 1.35, top: -6, height: 120, fg: true, tint: 0x4a3a3a, alpha: 0.95 },
];

// With none of the painted layers yet: the old sky, with fog banks and ash drifting at
// different depths in front of it, so the backdrop already moves in layers.
export const PARALLAX_FALLBACK = {
  sky: { scroll: 0.15 }, // (the speed it always had)
  fog: [
    // y: the bank's middle, px above the horizon
    { scroll: 0.2, y: 34, h: 70, alpha: 0.34, tint: 0x7a4034, drift: -4 },
    { scroll: 0.45, y: 12, h: 46, alpha: 0.3, tint: 0x4a2a24, drift: -9 },
  ],
  ash: [
    // drifting ash and embers in the air over the backdrop (between the sky and the floor)
    { scroll: 0.25, count: 26, size: [0.12, 0.26], alpha: 0.45 },
    { scroll: 0.6, count: 16, size: [0.2, 0.4], alpha: 0.6 },
  ],
};
