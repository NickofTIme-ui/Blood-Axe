// HoundView.js — The Houndmaster's war hounds (data/enemies.js `hound`), drawn in code: a
// huge black mastiff in spiked iron plates, red-eyed, low to the ground. The painted
// strips (assets/enemies/strips/hound_*.png, data/levelArt.js SPRITE_SHEETS,
// docs/campaign/art-levels-1-2.md) replace the drawing once all four exist.
//
// Poses from the fighter's state: a loping run (walk), the snap (light1: head thrown
// forward, jaws open), the pounce (heavy: a crouch, then stretched out flying), flinching,
// rolled over (knockdown), dead on its side (fades).

import { DEPTH } from './depths.js';
import { movePhase } from '../combat/MoveRunner.js';
import { SPRITES, haveSprites } from './levelArt.js';
import { phaseCell } from './animFeel.js';
import { softShadow } from './atmosphere.js';

// the painted attack strip's cells by phase: 1 crouch (held through the wind-up),
// 2 the leaping lunge and 3 the bite while the hitbox is out, 4 landing
const ATK_CELLS = { startup: [0], active: [1, 2], recovery: [3] };

const C = { coat: 0x15110f, coatHi: 0x2c2420, plate: 0x3a3842, plateHi: 0x6a6674, eye: 0xff2a1a, maw: 0x5a0a0a, tooth: 0xe8e0d0 };

export class HoundView {
  constructor(scene, fighter) {
    this.scene = scene;
    this.f = fighter;
    this.shadow = softShadow(scene, fighter.x, fighter.z, 90, 14, 0.35).setDepth(DEPTH.shadows);
    this.g = scene.add.graphics();
    if (fighter.team === 'enemy') {
      this.hpBg = scene.add.rectangle(0, 0, 44, 5, 0x000000, 0.7).setOrigin(0, 0.5);
      this.hpFill = scene.add.rectangle(0, 0, 44, 5, 0xc0282d).setOrigin(0, 0.5);
    }
    this.run = 0;
    this.lastX = fighter.x;
    // the painted strips, once all four exist (else the code drawing)
    this.painted = haveSprites('hound-walk', 'hound-atk1', 'hound-react', 'hound-doom');
    if (this.painted) this.img = scene.add.image(fighter.x, fighter.z, SPRITES['hound-walk'].key, 'f0').setOrigin(0.5, 1).setScale(0.5);
  }

  // the painted hound: which strip and cell, from the same state the drawing reads
  paint(st, fr, alpha) {
    const f = this.f;
    let name = 'hound-walk'; let i = 0;
    if ((st === 'light1' || st === 'heavy') && f.move) { name = 'hound-atk1'; i = phaseCell(f.move, fr, ATK_CELLS); }
    else if (st === 'hitstun' || st === 'stagger') name = 'hound-react';
    else if (st === 'knockdown' || st === 'getup') { name = 'hound-react'; i = st === 'getup' ? 2 : 1; }
    else if (st === 'dead') { name = 'hound-doom'; i = Math.floor(fr / 8); }
    else if (st === 'walk' || st === 'jump') i = Math.floor(this.run * 1.6);
    const S = SPRITES[name];
    i = name === 'hound-walk' ? i % S.count : Math.min(S.count - 1, Math.max(0, i));
    this.img.setTexture(S.key, `f${i}`).setPosition(f.x, f.z - f.h).setFlipX(f.facing < 0).setDepth(f.z).setAlpha(alpha);
    if (f.flash > 0) this.img.setTintFill(0xffffff); else this.img.clearTint();
  }

  update() {
    const f = this.f;
    const st = f.state;
    const fr = f.fsm.frame;
    const g = this.g.clear();
    const d = f.facing;
    let lean = 0; let stretch = 0; let crouch = 0; let jaw = 0.15; let roll = 0; let alpha = 1;
    // the run cycle follows the ground covered, so it never skates
    this.run += Math.abs(f.x - this.lastX) * 0.06 + Math.abs(f.vz ?? 0) * 0.0008;
    this.lastX = f.x;
    let gait = st === 'walk' ? this.run : 0;
    if ((st === 'light1' || st === 'heavy') && f.move) {
      const ph = movePhase(f.move, fr);
      if (st === 'light1') {
        if (ph === 'startup') { crouch = 4; jaw = 0.4; } else if (ph === 'active') { stretch = 14; jaw = 1; lean = -4; } else jaw = 0.3;
      } else if (ph === 'startup') { crouch = 10; jaw = 0.5; lean = 6; if (Math.floor(fr / 3) % 2 === 0) g.fillStyle(0xd08a3a, 0.25).fillEllipse(f.x, f.z - f.h - 26, 110, 50); } // (a readable wind-up)
      else if (ph === 'active') { stretch = 26; jaw = 1; lean = -10; gait = 1.2; } else { crouch = 4; jaw = 0.4; }
    } else if (st === 'hitstun' || st === 'stagger') { lean = 10; jaw = 0.8; }
    else if (st === 'knockdown' || st === 'getup') { roll = st === 'getup' ? 1 - fr / Math.max(1, f.stats.getupFrames) : 1; }
    else if (st === 'dead') { roll = 1; alpha = Math.max(0, 1 - Math.max(0, fr - 90) / 60); jaw = 0.6; }
    else if (st === 'jump') { stretch = 12; gait = 1.2; }
    else if (st === 'idle' || st === 'bossEntrance') { gait = Math.sin(fr * 0.08) * 0.15; jaw = 0.2 + 0.1 * Math.sin(fr * 0.1); }

    if (this.painted) this.paint(st, fr, alpha);
    else {
      const k = 1;
      const x = f.x; const base = f.z - f.h;
      const body = f.flash > 0 ? 0xffffff : C.coat;
      g.setDepth(f.z).setAlpha(alpha);
      if (roll > 0.5) {
        // on its side, legs out
        const by = base - 18;
        g.fillStyle(body, 1).fillEllipse(x, by, 96, 30);
        g.fillEllipse(x + d * 52, by + 2, 34, 22);
        g.lineStyle(7, body, 1);
        for (const lx of [-30, -16, 16, 30]) g.lineBetween(x + lx * d, by - 6, x + (lx + 10) * d, by - 30);
        g.fillStyle(C.plate, 1).fillRect(x - 30, by - 14, 50, 8);
        g.fillStyle(C.eye, st === 'dead' ? 0.2 : 0.8).fillRect(x + d * 62, by - 2, 3, 3);
      } else {
        const by = base - 30 + crouch; // the back line
        const X = (dx) => x + dx * d * k;
        const leg = (hx, ph, col) => {
          const sw = Math.sin(gait * 2.4 + ph);
          const kx = X(hx + sw * 9); const ky = by + 14;
          const fx = X(hx + sw * 16 + (stretch ? (hx > 0 ? 14 : -14) : 0)); const fy = base - Math.max(0, Math.cos(gait * 2.4 + ph)) * 8;
          g.lineStyle(8, col, 1).lineBetween(X(hx), by + 2, kx, ky).lineBetween(kx, ky, fx, fy);
        };
        leg(22, Math.PI, 0x0c0908); leg(-26, Math.PI * 1.4, 0x0c0908);
        // the body: deep chest, tucked waist, heavy haunch
        g.fillStyle(body, 1).fillEllipse(X(4 + stretch * 0.3), by - 2, 84 + stretch, 34);
        g.fillCircle(X(24 + stretch * 0.4), by - 4, 20).fillCircle(X(-26), by - 4, 16);
        // the spiked plates along the back
        g.fillStyle(C.plate, 1).fillRect(X(-28) - (d < 0 ? 52 : 0), by - 18, 52, 9);
        g.fillStyle(C.plateHi, 1);
        for (let s = -24; s <= 18; s += 14) g.fillTriangle(X(s), by - 18, X(s + 8), by - 18, X(s + 4), by - 28);
        // the head: thrown forward on the bite, the jaw dropping
        const hx = X(48 + stretch); const hy = by - 12 + lean * 0.6 - crouch * 0.3;
        g.fillStyle(body, 1).fillEllipse(hx, hy, 34, 26);
        g.fillTriangle(hx + d * 6, hy - 6, hx + d * 30, hy - 2, hx + d * 8, hy + 6); // muzzle
        g.fillStyle(C.maw, 1).fillTriangle(hx + d * 6, hy + 2, hx + d * 28, hy + 1 + jaw * 4, hx + d * 6, hy + 4 + jaw * 12);
        g.fillStyle(body, 1).fillTriangle(hx + d * 4, hy + 4 + jaw * 12, hx + d * 24, hy + 4 + jaw * 10, hx + d * 4, hy + 10 + jaw * 12); // lower jaw
        g.fillStyle(C.tooth, 1);
        if (jaw > 0.3) for (let t = 10; t < 26; t += 6) g.fillTriangle(hx + d * t, hy + 2, hx + d * (t + 3), hy + 2, hx + d * (t + 1.5), hy + 6);
        g.fillStyle(body, 1).fillTriangle(hx - d * 6, hy - 10, hx - d * 2, hy - 22, hx + d * 2, hy - 10); // an ear back
        g.fillStyle(C.eye, 1).fillRect(hx + d * 8 - 2, hy - 7, 4, 3);
        g.fillStyle(C.plate, 1).fillRect(hx - (d > 0 ? 18 : -10) - 4, hy - 2, 8, 16); // the collar
        leg(18, 0, body); leg(-30, Math.PI * 0.4, body);
        // the tail
        g.lineStyle(5, body, 1).lineBetween(X(-38), by - 6, X(-54), by - 14 - Math.sin(gait * 2.4) * 4);
        g.lineStyle(2, C.coatHi, 1).lineBetween(X(-20), by - 16, X(30), by - 18);
      }
    }
    const sh = 1 - Math.min(f.h / 300, 0.5);
    this.shadow.setPosition(f.x, f.z).setScale(sh).setAlpha(0.35 * alpha);
    if (this.hpFill) {
      const show = f.health < f.stats.maxHealth && f.alive;
      const hx = f.x - 22; const hy = f.z - f.h - 74;
      this.hpBg.setVisible(show).setPosition(hx, hy).setDepth(f.z + 0.1);
      this.hpFill.setVisible(show).setPosition(hx, hy).setDepth(f.z + 0.2);
      this.hpFill.scaleX = Math.max(0, f.health / f.stats.maxHealth);
    }
  }

  destroy() {
    this.g.destroy();
    this.img?.destroy();
    this.shadow.destroy();
    this.hpBg?.destroy();
    this.hpFill?.destroy();
  }
}
