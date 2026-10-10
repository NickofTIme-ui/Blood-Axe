// CrusherView.js — THE ORE CRUSHER (data/enemies.js `crusher`), Hollow Mountain's war
// machine, drawn in code: an iron hulk on rollers, a spiked drum turning in front, a
// pile-driver arm on top, a furnace grate in its belly and a chimney trailing smoke.
// The painted strips (assets/enemies/strips/crusher_*.png, data/levelArt.js SPRITE_SHEETS,
// docs/campaign/art-levels-1-2.md) replace the drawing once all four exist.
//
// Poses from the fighter's state: rolling (walk: the rollers and drum turn with the ground
// covered), the grind (light1: the drum shoved forward, spinning fast, sparks), the slam
// (heavy: the arm hauled up, the furnace flaring as a warning, then down in front of it),
// and wrecked (dead: tilted, the furnace out, smoke pouring off it).

import { DEPTH } from './depths.js';
import { movePhase } from '../combat/MoveRunner.js';
import { SPRITES, haveSprites } from './levelArt.js';
import { phaseCell } from './animFeel.js';
import { softShadow } from './atmosphere.js';

// the painted attack strips' cells by phase (the strike cells on screen exactly while the
// hitbox is out): the drum 1 drawn back, 2-3 shoved out spinning, 4 pulled in; the hammer
// 1-3 hauled up (the top held longest), 4 the slam, 5 resting in the dent
const ATK1_CELLS = { startup: [0], active: [1, 2], recovery: [3] };
const HEAVY_CELLS = { startup: [0, 1, 2], active: [3], recovery: [4] };

const C = { iron: 0x2a2826, ironHi: 0x4a4644, ironDk: 0x161514, rivet: 0x6a6460, rust: 0x6a3a1e, fire: 0xff6a20, fireHi: 0xffd080, spike: 0x8a8480 };

export class CrusherView {
  constructor(scene, fighter) {
    this.scene = scene;
    this.f = fighter;
    this.shadow = softShadow(scene, fighter.x, fighter.z, 200, 26, 0.45).setDepth(DEPTH.shadows);
    this.g = scene.add.graphics();
    this.glow = scene.add.image(fighter.x, fighter.z, 'glow').setTint(C.fire).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0.5);
    if (fighter.team === 'enemy') {
      this.hpBg = scene.add.rectangle(0, 0, 80, 6, 0x000000, 0.7).setOrigin(0, 0.5);
      this.hpFill = scene.add.rectangle(0, 0, 80, 6, 0xc0282d).setOrigin(0, 0.5);
    }
    this.roll = 0;
    this.lastX = fighter.x;
    this.smokeT = 0;
    // the painted strips, once all four exist (else the code drawing)
    this.painted = haveSprites('crusher-walk', 'crusher-atk1', 'crusher-heavy', 'crusher-doom');
    if (this.painted) this.img = scene.add.image(fighter.x, fighter.z, SPRITES['crusher-walk'].key, 'f0').setOrigin(0.5, 1).setScale(0.5);
  }

  // the painted machine: which strip and cell, from the same state the drawing reads
  paint(st, fr, alpha, sink) {
    const f = this.f;
    let name = 'crusher-walk'; let i = Math.floor(Math.abs(this.roll) * 1.2);
    if ((st === 'light1' || st === 'heavy') && f.move) {
      name = st === 'light1' ? 'crusher-atk1' : 'crusher-heavy';
      i = phaseCell(f.move, fr, st === 'light1' ? ATK1_CELLS : HEAVY_CELLS);
    } else if (st === 'dead') { name = 'crusher-doom'; i = Math.floor(fr / 10); }
    const S = SPRITES[name];
    i = name === 'crusher-walk' ? i % S.count : Math.min(S.count - 1, Math.max(0, i));
    this.img.setTexture(S.key, `f${i}`).setPosition(f.x, f.z - f.h + (st === 'dead' ? 0 : sink)).setFlipX(f.facing < 0).setDepth(f.z).setAlpha(alpha);
    if (f.flash > 0) this.img.setTintFill(0xffffff); else this.img.clearTint();
  }

  update() {
    const f = this.f;
    const st = f.state;
    const fr = f.fsm.frame;
    const g = this.g.clear();
    const d = f.facing;
    const X = (dx) => f.x + dx * d;
    // the rollers turn with the ground covered
    this.roll += (f.x - this.lastX) * d * 0.05;
    this.lastX = f.x;
    let drumOut = 0; let drumSpin = this.roll * 1.6; let arm = 0.15; let heat = 0.35; let tilt = 0; let alpha = 1; let sparks = false;
    if ((st === 'light1' || st === 'heavy') && f.move) {
      const ph = movePhase(f.move, fr);
      if (st === 'light1') {
        drumSpin = fr * 0.5;
        if (ph === 'startup') drumOut = 6; else if (ph === 'active') { drumOut = 34; sparks = true; } else drumOut = 14;
      } else if (ph === 'startup') {
        const u = fr / Math.max(1, f.move.startup);
        arm = 0.15 + 0.85 * Math.min(1, u * 1.3); heat = 0.4 + 0.6 * u * (0.7 + 0.3 * Math.sin(fr * 0.8)); // (the warning)
      } else if (ph === 'active') { arm = -0.35; heat = 1; } else arm = -0.35 + 0.5 * Math.min(1, (fr - f.move.startup - f.move.active) / 30);
    } else if (st === 'dead') { tilt = Math.min(1, fr / 40); heat = Math.max(0, 0.3 - fr / 120); alpha = Math.max(0, 1 - Math.max(0, fr - 150) / 60); arm = 0.4; }
    else if (st === 'hitstun' || st === 'stagger') heat = 0.6;

    const base = f.z - f.h;
    const flash = f.flash > 0;
    const iron = flash ? 0xffffff : C.iron;
    g.setDepth(f.z).setAlpha(alpha);
    const sink = tilt * 18;
    const top = base - 150 + sink;
    const dx = X(78 + drumOut); const dy = base - 48 + sink; // (the drum, where the sparks fly)
    if (this.painted) this.paint(st, fr, alpha, sink);
    else {
      // rollers: two great iron wheels under the hull, spokes turning
      for (const rx of [-48, 38]) {
        const cx = X(rx); const cy = base - 26 + sink * (rx < 0 ? 0.3 : 1);
        g.fillStyle(C.ironDk, 1).fillCircle(cx, cy, 26);
        g.lineStyle(4, C.ironHi, 1);
        for (let k = 0; k < 3; k++) {
          const a = this.roll + (k * Math.PI) / 3;
          g.lineBetween(cx - Math.cos(a) * 22, cy - Math.sin(a) * 22, cx + Math.cos(a) * 22, cy + Math.sin(a) * 22);
        }
        g.fillStyle(C.rivet, 1).fillCircle(cx, cy, 5);
      }
      // the hull: a boxy iron body, riveted, rust streaks
      const hx0 = Math.min(X(-74), X(58)); const hx1 = Math.max(X(-74), X(58));
      g.fillStyle(iron, 1).fillRect(hx0, top + 40, hx1 - hx0, 90);
      g.fillStyle(C.ironHi, 1).fillRect(hx0, top + 40, hx1 - hx0, 6);
      g.fillStyle(C.rust, 0.6).fillRect(X(-50), top + 50, 4, 60).fillRect(X(10), top + 56, 3, 50);
      g.fillStyle(C.rivet, 1);
      for (let k = -66; k <= 50; k += 14) g.fillCircle(X(k), top + 50, 2).fillCircle(X(k), top + 122, 2);
      // the furnace grate in its belly
      g.fillStyle(C.ironDk, 1).fillRect(Math.min(X(-30), X(4)), top + 76, 34, 30);
      g.fillStyle(C.fire, 0.4 + 0.6 * heat).fillRect(Math.min(X(-28), X(2)), top + 80, 30, 22);
      g.lineStyle(2, C.ironDk, 1);
      for (let k = -24; k <= 0; k += 8) g.lineBetween(X(k), top + 80, X(k), top + 102);
      // the chimney at the back
      g.fillStyle(C.ironDk, 1).fillRect(Math.min(X(-66), X(-50)), top - 4, 16, 46);
      g.fillStyle(C.ironHi, 1).fillRect(Math.min(X(-70), X(-46)), top - 8, 24, 6);
      // the cab: a slit where the driver sits
      g.fillStyle(iron, 1).fillRect(Math.min(X(-40), X(10)), top + 10, 50, 32);
      g.fillStyle(C.fire, 0.5 + 0.4 * heat).fillRect(Math.min(X(-30), X(0)), top + 22, 30, 4);
      // the pile-driver arm: pivots on the cab, a great iron hammer at its end
      const px = X(4); const py = top + 14;
      // (its angle above the horizontal: 75deg raised high, 20deg at rest, -55deg slammed down)
      const ang = ((-55 + ((arm + 0.35) / 1.35) * 130) * Math.PI) / 180;
      const len = 110;
      const ex = px + Math.cos(ang) * len * d; const ey = py - Math.sin(ang) * len;
      g.lineStyle(12, flash ? 0xffffff : C.ironDk, 1).lineBetween(px, py, ex, ey);
      g.lineStyle(3, C.ironHi, 1).lineBetween(px, py - 4, ex, ey - 4);
      g.fillStyle(iron, 1).fillRect(ex - 22, ey - 10, 44, 42);
      g.fillStyle(C.ironHi, 1).fillRect(ex - 22, ey - 10, 44, 5);
      g.fillStyle(C.ironDk, 1).fillRect(ex - 18, ey + 32, 36, 8);
      g.fillStyle(C.rivet, 1).fillCircle(px, py, 6);
      // the spiked drum in front, turning
      g.fillStyle(C.ironDk, 1).fillRect(Math.min(X(56), X(70 + drumOut)), dy - 6, Math.abs(14 + drumOut), 12); // its axle arms
      g.fillStyle(iron, 1).fillCircle(dx, dy, 36);
      g.lineStyle(3, C.ironHi, 1).strokeCircle(dx, dy, 36);
      g.fillStyle(C.spike, 1);
      for (let k = 0; k < 8; k++) {
        const a = drumSpin + (k * Math.PI) / 4;
        const c = Math.cos(a); const s = Math.sin(a);
        g.fillTriangle(dx + c * 33 - s * 6, dy + s * 33 + c * 6, dx + c * 33 + s * 6, dy + s * 33 - c * 6, dx + c * 50, dy + s * 50);
      }
      g.fillStyle(C.rivet, 1).fillCircle(dx, dy, 8);
    }
    if (sparks && fr % 2 === 0) {
      this.scene.gore?.spawn({ x: dx + d * 30, z: f.z + 2, h: 6, vx: d * (60 + Math.random() * 140), vz: 0, vh: 60 + Math.random() * 140, tint: 0xffc060, texture: 'px', scale: 0.6 + Math.random() * 0.6, decal: false, life: 20 });
    }
    // furnace light, and the chimney's smoke
    this.glow.setPosition(X(-12), top + 92).setScale(2.2 + heat * 1.6, 1.4 + heat).setAlpha((0.15 + 0.55 * heat) * alpha).setDepth(f.z + 0.05);
    this.smokeT++;
    if (this.smokeT % (st === 'dead' ? 3 : 9) === 0 && this.scene.gore) {
      this.scene.gore.spawn({ x: X(-58), z: f.z - 2, h: f.h + 150 - sink, vx: -d * 20, vz: 0, vh: 50 + Math.random() * 40, tint: 0x3a3634, scale: 1 + Math.random(), decal: false, life: 60 });
    }
    this.shadow.setPosition(f.x, f.z).setAlpha(0.45 * alpha);
    if (this.hpFill) {
      const show = f.health < f.stats.maxHealth && f.alive;
      const bx = f.x - 40; const by = top - 24;
      this.hpBg.setVisible(show).setPosition(bx, by).setDepth(f.z + 0.1);
      this.hpFill.setVisible(show).setPosition(bx, by).setDepth(f.z + 0.2);
      this.hpFill.scaleX = Math.max(0, f.health / f.stats.maxHealth);
    }
  }

  destroy() {
    this.g.destroy();
    this.glow.destroy();
    this.img?.destroy();
    this.shadow.destroy();
    this.hpBg?.destroy();
    this.hpFill?.destroy();
  }
}
