// DebugDraw.js — The debug overlay (toggle with F2 or the ` key).
//   green box  = hurtbox (can be hit)
//   red box    = active hitbox (can hit)
//   orange box = projectile hitbox
//   blue bar   = depth range an attack can reach at the fighter's feet
//   text       = state name, frames in state, HS = hitstop frames, INV = invincible

import { SETTINGS } from '../config/settings.js';
import { toWorldBox } from '../combat/Boxes.js';
import { DEPTH } from './depths.js';

export class DebugDraw {
  constructor(scene) {
    this.scene = scene;
    this.g = scene.add.graphics().setDepth(DEPTH.debug);
    this.labels = new Map();
  }

  rect(box, color, fillAlpha) {
    const y = box.z - box.top;
    const hgt = box.top - box.bottom;
    if (fillAlpha) {
      this.g.fillStyle(color, fillAlpha);
      this.g.fillRect(box.left, y, box.right - box.left, hgt);
    }
    this.g.lineStyle(1, color, 1);
    this.g.strokeRect(box.left, y, box.right - box.left, hgt);
  }

  draw(world) {
    this.g.clear();
    const on = SETTINGS.debug;
    const seen = new Set();

    for (const f of world.fighters) {
      seen.add(f.id);
      let label = this.labels.get(f.id);
      if (!label) {
        label = this.scene.add.text(0, 0, '', {
          fontFamily: 'monospace', fontSize: '11px', color: '#ffffff',
          backgroundColor: '#000000aa', padding: { x: 2, y: 1 },
        }).setOrigin(0.5, 1).setDepth(DEPTH.debug + 1);
        this.labels.set(f.id, label);
      }
      label.setVisible(on);
      if (!on) continue;

      this.rect(toWorldBox(f, f.hurtbox), 0x33ff66, 0.12);
      if (f.activeAttack) this.rect(toWorldBox(f, f.activeAttack.move.hitbox), 0xff3333, 0.35);

      const tol = SETTINGS.feel.depthTolerance;
      this.g.lineStyle(2, 0x44aaff, 0.8);
      this.g.lineBetween(f.x, f.z - tol, f.x, f.z + tol);

      let text = `${f.state} ${f.fsm.frame}`;
      if (f.hitstop) text += ` HS${f.hitstop}`;
      if (f.invincible) text += ' INV';
      if (f.parryActive) text += ' PARRY';
      label.setText(text).setPosition(f.x, f.z - f.h - f.stats.body.h - 20);
    }

    for (const [id, label] of this.labels) {
      if (!seen.has(id)) { label.destroy(); this.labels.delete(id); }
    }

    if (on) for (const p of world.projectiles) this.rect(p.box, 0xffaa22, 0.3);
  }
}
