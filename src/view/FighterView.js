// FighterView.js — Draws ONE fighter using placeholder shapes.
//
// This is the ONLY file that decides how a fighter looks. It reads the fighter's
// state and frame and poses some rectangles. To use real sprites later, make a
// SpriteFighterView with the same two methods — update() and destroy() — that
// plays an animation per state (e.g. sprite.play(fighter.state)), and swap it in
// ArenaScene. No combat code needs to change.

import { DEPTH } from './depths.js';
import { movePhase } from '../combat/MoveRunner.js';

const ATTACKS = ['light1', 'light2', 'light3', 'heavy', 'airAttack', 'kick'];

export class FighterView {
  constructor(scene, fighter) {
    this.scene = scene;
    this.f = fighter;
    const { w, h } = fighter.stats.body;
    const look = fighter.stats.look;
    this.w = w;
    this.h = h;
    this.look = look;

    this.shadow = scene.add.ellipse(fighter.x, fighter.z, w * 1.3, 14, 0x000000, 0.35).setDepth(DEPTH.shadows);

    // Built facing right; the container is mirrored when facing left.
    this.root = scene.add.container(fighter.x, fighter.z);
    this.torso = scene.add.rectangle(0, 0, w, h * 0.72, look.color).setOrigin(0.5, 1);
    this.head = scene.add.rectangle(0, -h * 0.72, w * 0.62, h * 0.28, look.skin).setOrigin(0.5, 1);
    this.eye = scene.add.rectangle(w * 0.2, -h * 0.86, 6, 5, 0x111111);
    this.weapon = scene.add.rectangle(w * 0.35, -h * 0.55, 30, 7, look.accent).setOrigin(0, 0.5);
    this.root.add([this.torso, this.head, this.eye, this.weapon]);

    // Enemies get a small health bar above their head.
    if (fighter.team === 'enemy') {
      this.hpBg = scene.add.rectangle(0, 0, 44, 5, 0x000000, 0.7).setOrigin(0, 0.5);
      this.hpFill = scene.add.rectangle(0, 0, 44, 5, 0xc0282d).setOrigin(0, 0.5);
    }
  }

  update() {
    const f = this.f;
    const { w, h, look } = this;
    const st = f.state;
    const fr = f.fsm.frame;

    // Reset pose
    let angle = 0;
    let scaleY = 1;
    let alpha = 1;
    let yOffset = 0;
    let torsoColor = look.color;
    let wX = w * 0.35;
    let wY = -h * 0.55;
    let wAngle = 20;
    let wLen = 30;
    let wColor = look.accent;

    if (ATTACKS.includes(st) && f.move) {
      const phase = movePhase(f.move, fr);
      const hb = f.move.hitbox;
      if (phase === 'startup') {
        wAngle = st === 'heavy' ? -120 : -60;
        // Heavy wind-up flashes so it can be read (and reacted to).
        if (st === 'heavy' && Math.floor(fr / 3) % 2 === 0) torsoColor = 0xd08a3a;
      } else if (phase === 'active' || st === 'airAttack') {
        wAngle = 0;
        wLen = Math.max(12, hb.x + hb.w - wX);
        wY = -(hb.y + hb.h / 2);
      } else {
        wAngle = 40;
      }
    } else if (st === 'walk') {
      yOffset = -Math.abs(Math.sin(fr * 0.3)) * 3;
    } else if (st === 'jump') {
      wAngle = -30;
    } else if (st === 'block' || st === 'parry') {
      wX = w * 0.55; wY = -h * 0.15; wAngle = -90; wLen = h * 0.65;
      if (f.parryActive) wColor = 0xffffff;
    } else if (st === 'dodge') {
      scaleY = 0.55;
      alpha = f.invincible ? 0.45 : 1;
    } else if (st === 'cast') {
      wAngle = -80;
      wColor = f.stats.spell?.projectile.color ?? look.accent;
      if (Math.floor(fr / 3) % 2 === 0) torsoColor = 0xffffff;
    } else if (st === 'hitstun') {
      angle = -8;
    } else if (st === 'stagger' || st === 'guardBreak') {
      angle = Math.sin(fr * 0.5) * 8;
      if (Math.floor(fr / 4) % 2 === 0) torsoColor = 0xe0c040;
    } else if (st === 'knockdown') {
      angle = f.lyingSince === null ? -50 : -90; // fall onto the back
      wAngle = 60;
    } else if (st === 'getup') {
      angle = -90 * (1 - fr / f.stats.getupFrames);
      alpha = fr % 4 < 2 ? 0.6 : 1;
    } else if (st === 'dead') {
      angle = -90;
      alpha = Math.max(0, 1 - Math.max(0, fr - 90) / 60);
    }

    if (f.flash > 0) torsoColor = 0xffffff;

    // Apply pose. angle * facing makes "fall backward" work both ways.
    this.root.setPosition(f.x, f.z - f.h + yOffset).setDepth(f.z);
    this.root.setScale(f.facing, scaleY);
    this.root.angle = angle * f.facing;
    this.root.alpha = alpha;
    this.torso.fillColor = torsoColor;
    this.weapon.setPosition(wX, wY);
    this.weapon.angle = wAngle;
    this.weapon.scaleX = wLen / 30; // weapon rect is built 30px long
    this.weapon.fillColor = wColor;

    const shadowScale = 1 - Math.min(f.h / 300, 0.5);
    this.shadow.setPosition(f.x, f.z).setScale(shadowScale).setAlpha(0.35 * alpha);

    if (this.hpFill) {
      const show = f.health < f.stats.maxHealth && f.alive;
      const x = f.x - 22;
      const y = f.z - f.h - h - 14;
      this.hpBg.setVisible(show).setPosition(x, y).setDepth(f.z + 0.1);
      this.hpFill.setVisible(show).setPosition(x, y).setDepth(f.z + 0.2);
      this.hpFill.scaleX = Math.max(0, f.health / f.stats.maxHealth);
    }
  }

  destroy() {
    this.root.destroy();
    this.shadow.destroy();
    this.hpBg?.destroy();
    this.hpFill?.destroy();
  }
}
