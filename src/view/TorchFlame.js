// TorchFlame.js — One painted, looping torch flame (FX.torchflame: assets/fx/torch-flame-strip.png,
// data/spriteStrips.js) for every small fire in the levels: the Burning Village's torch posts,
// the Iron Gates' braziers, the stand-in buildings' roof fires, the cutaway's violet torches.
// Each one starts on its own frame and runs at its own pace so a row of them never flickers in
// step. Until the strip is in, the old drawn 'flame' (view/StageView.js) stands in, tweened.

import { FX } from './stripImporter.js';

const ANIM = 'torchflame-loop';

// Adds a flame standing on (x, y) (its base), `height` world px tall. Returns the image.
export function torchFlame(scene, x, y, { height = 40, tint = null, depth = 0, alpha = 1 } = {}) {
  const F = FX.torchflame;
  if (F) {
    if (!scene.anims.exists(ANIM)) {
      scene.anims.create({ key: ANIM, frames: Array.from({ length: F.count }, (_, i) => ({ key: F.key, frame: `f${i}` })), frameRate: F.fps, repeat: -1 });
    }
    const f = scene.add.sprite(x, y, F.key, 'f0').setOrigin(0.5, 0.96).setDepth(depth).setAlpha(alpha);
    f.setScale(height / F.fh);
    if (tint !== null) f.setTint(tint);
    // (its own start frame and speed: no two torches in step)
    f.play({ key: ANIM, startFrame: Math.floor(Math.random() * F.count), frameRate: F.fps * (0.85 + Math.random() * 0.3) });
    return f;
  }
  const f = scene.add.image(x, y, 'flame').setOrigin(0.5, 1).setDepth(depth).setAlpha(alpha)
    .setBlendMode(Phaser.BlendModes.ADD);
  const sx = height / 64 * 0.7; const sy = height / 64;
  f.setScale(sx, sy);
  if (tint !== null) f.setTint(tint);
  scene.tweens.add({ targets: f, scaleY: sy * 1.25, scaleX: sx * 0.85, duration: 220 + Math.random() * 180, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  return f;
}
