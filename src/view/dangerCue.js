// dangerCue.js — The enemies' danger language (docs/art-direction.md), view only: a big
// wind-up (a heavy, an armoured or a chained attack, already telegraphed by a body tint)
// also flashes a hard four-point glint at his shoulder as it starts. Red-white, not orange:
// orange is the fires' colour in most levels, and a cue must not be mistaken for the scenery.
// Drawn over everything, so it shows through blood, smoke and other men. Timing untouched:
// it only marks the wind-up the attack already has.
//
// Every other swing gets the small TELL (Nick, 2026-10-26: no swing without a warning): a
// smaller pale glint at the same spot as his wind-up starts, so even a plain cut in a crowd
// gives you the moment to roll or block (the wind-ups themselves: data/enemies.js TELEGRAPH).

import { DEPTH } from './depths.js';

export const DANGER = { tint: 0xff6a58, glint: 0xff3a2a };

// a big one (the red glint and tint) or a plain swing (the small tell)
export const isDanger = (st, m) => st === 'heavy' || !!(m.superArmor || m.chain || m.breaksGuard || m.unblockable);

function glintTexture(scene) {
  if (!scene.textures.exists('tell-glint')) tellTexture(scene);
  if (scene.textures.exists('danger-glint')) return;
  const cv = document.createElement('canvas');
  cv.width = 64; cv.height = 64;
  const c = cv.getContext('2d');
  const star = (r, k, col) => {
    c.fillStyle = col; c.beginPath();
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 - Math.PI / 2; const rr = i % 2 ? r * k : r;
      c.lineTo(32 + Math.cos(a) * rr, 32 + Math.sin(a) * rr);
    }
    c.closePath(); c.fill();
  };
  star(31, 0.2, 'rgba(255,58,42,0.95)');
  star(22, 0.18, 'rgba(255,240,230,1)');
  scene.textures.addCanvas('danger-glint', cv);
}

function tellTexture(scene) {
  const cv = document.createElement('canvas');
  cv.width = 32; cv.height = 32;
  const c = cv.getContext('2d');
  c.fillStyle = 'rgba(255,248,225,1)'; c.beginPath();
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 - Math.PI / 2; const rr = i % 2 ? 3 : 15;
    c.lineTo(16 + Math.cos(a) * rr, 16 + Math.sin(a) * rr);
  }
  c.closePath(); c.fill();
  scene.textures.addCanvas('tell-glint', cv);
}

export function dangerGlint(scene, f, startup, tell = false) {
  glintTexture(scene);
  const b = f.stats.body;
  const size = Math.min(1.25, Math.max(0.7, b.h / 108)) * (tell ? 0.7 : 0.55);
  const x = f.x + f.facing * b.w * 0.45; const y = f.z - f.h - b.h * 0.82;
  const img = scene.add.image(x, y, tell ? 'tell-glint' : 'danger-glint').setDepth(DEPTH.popups - 2).setScale(0.1).setAngle(0);
  const ms = Math.max(160, Math.min(360, startup * 16.7));
  scene.tweens.add({
    targets: img, scale: { from: 0.1, to: size }, angle: 45, duration: ms * 0.45, ease: 'Back.out',
    onComplete: () => scene.tweens.add({ targets: img, scale: 0.05, alpha: 0, duration: ms * 0.55, ease: 'Quad.in', onComplete: () => img.destroy() }),
  });
}
