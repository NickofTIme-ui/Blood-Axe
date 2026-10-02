// ProjectileView.js — Draws spell projectiles.
// Spells with a `look` that has an effects strip (data/spriteStrips.js FX_STRIPS) play
// that animation — e.g. Ulric's Firebolt — with a glow and a trail of embers.
// Everything else is a glowing placeholder box.

import { DEPTH } from './depths.js';
import { FX } from './stripImporter.js';
import { playSfx, startLoop } from '../core/Sfx.js';

export class ProjectileView {
  constructor(scene, projectile) {
    this.scene = scene;
    this.p = projectile;
    const d = projectile.data;
    this.fx = d.look ? FX[d.look] : null;
    this.age = 0;
    this.shadow = scene.add.ellipse(0, 0, d.w, 8, 0x000000, 0.3).setDepth(DEPTH.shadows);
    if (this.fx) {
      this.glow = scene.add.ellipse(0, 0, this.fx.fw * 0.9, this.fx.fh * 1.1, d.color, 0.28)
        .setBlendMode(Phaser.BlendModes.ADD);
      // the flame's hot core is at its right edge: anchor there so it leads the hitbox
      this.core = scene.add.image(0, 0, this.fx.key, 'f0').setOrigin(0.82, 0.5);
      this.core.setScale(projectile.dir, 1);
      if (d.cut === 'fire') {
        // cast whoosh + the lava roar riding along with the fireball, together
        const loud = projectile.team === 'player' ? 1 : 0.5;
        playSfx(scene, 'fireWhoosh', { volume: 0.8 * loud, spread: 100, minGapMs: 30 });
        this.loop = startLoop(scene, 'fireLoop', { volume: 0.45 * loud });
      }
    } else {
      this.glow = scene.add.rectangle(0, 0, d.w + 10, d.h + 10, d.color, 0.3).setOrigin(0.5, 1);
      this.core = scene.add.rectangle(0, 0, d.w, d.h, d.color).setOrigin(0.5, 1);
    }
  }

  update() {
    const p = this.p;
    const d = p.data;
    this.age++;
    this.shadow.setPosition(p.x, p.z);
    if (this.fx) {
      const y = p.z - p.h - d.h / 2;
      const frame = Math.floor((this.age * this.fx.fps) / 60) % this.fx.count;
      this.core.setFrame(`f${frame}`).setPosition(p.x + p.dir * d.w / 2, y).setDepth(p.z + 0.2);
      this.glow.setPosition(p.x - p.dir * 10, y).setDepth(p.z + 0.1)
        .setAlpha(0.22 + Math.random() * 0.12).setScale(1 + Math.sin(this.age * 0.5) * 0.06);
      // embers shed off the tail
      const gore = this.scene.gore;
      if (gore && this.age % 2 === 0) {
        gore.spawn({
          x: p.x - p.dir * (d.w * 0.6 + Math.random() * 20), z: p.z, h: p.h + d.h / 2 + (Math.random() - 0.5) * 14,
          vx: -p.dir * (40 + Math.random() * 60), vz: 0, vh: 30 + Math.random() * 60,
          tint: Math.random() < 0.5 ? 0xffb030 : 0xff5a10, scale: 0.25 + Math.random() * 0.25,
          decal: false, life: 12 + Math.floor(Math.random() * 10),
        });
      }
      return;
    }
    const y = p.z - p.h;
    const flicker = 0.25 + Math.random() * 0.2;
    this.glow.setPosition(p.x, y + 5).setDepth(p.z).setAlpha(flicker);
    this.core.setPosition(p.x, y).setDepth(p.z + 0.1);
  }

  destroy() {
    this.loop?.stop(300); // fire roar dies out as the bolt lands
    this.glow.destroy();
    this.core.destroy();
    this.shadow.destroy();
  }
}
