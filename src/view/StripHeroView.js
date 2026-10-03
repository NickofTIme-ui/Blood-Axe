// StripHeroView.js — Draws a hero from painted strips alone (the Mage and the Rogue:
// data/heroStrips.js). Same two methods as every other view: update() and destroy().
//
// Attacks are tied to the move's frame data (what you see is what hits); everything
// else is picked from the fighter's state and how far through it he is. The spells,
// sparks and afterimages are not drawn here (effects/MageFX.js, effects/RogueFX.js).

import { DEPTH, depthScale } from './depths.js';
import { movePhase } from '../combat/MoveRunner.js';
import { MAGE_FINISHERS } from '../combat/Mage.js';
import { ROGUE_FINISHERS } from '../combat/Rogue.js';
import { Heading, headingAnim } from './Heading.js';
import { HERO_STRIPS } from '../data/heroStrips.js';

const spread = (list, t) => list[Math.min(list.length - 1, Math.max(0, Math.floor(t * list.length)))];
const FLIP_FRAMES = 40; // ticks the double-jump flip takes (about the time she's rising and turning over)
const clamp01 =(t) => Math.max(0, Math.min(1, t));

export class StripHeroView {
  constructor(scene, fighter, sheet) {
    this.scene = scene;
    this.f = fighter;
    this.sheet = sheet;
    this.A = sheet.anims;
    this.heading = new Heading(); // which way he's seen from on the move (back / front views)
    const first = this.A.idle.frames[0].split(':');
    this.shadow = scene.add.ellipse(fighter.x, fighter.z, fighter.stats.body.w * 1.4, 13, 0x000000, 0.35).setDepth(DEPTH.shadows);
    this.sprite = scene.add.image(fighter.x, fighter.z, `${sheet.key}-${first[0]}`, `f${first[1]}`)
      .setOrigin(sheet.ax / sheet.fw, sheet.ay / sheet.fh);
    this.last = null;
  }

  // Where the staff's tip is drawn right now (screen point), for poses whose strip marks
  // it (`tips` in data/heroStrips.js); null otherwise.
  staffTip() {
    const ref = this.frameFor();
    if (!ref) return null;
    const [strip, i] = ref.split(':');
    const t = HERO_STRIPS[this.f.stats.id]?.strips[strip]?.tips?.[i];
    if (!t) return null;
    const s = this.sprite;
    const k = depthScale(this.f.z) / this.sheet.res;
    return { x: s.x + (t[0] - this.sheet.ax) * k * this.f.facing, y: s.y + (t[1] - this.sheet.ay) * k };
  }

  // The pose for this tick: a 'strip:index' reference (null = not drawn at all).
  frameFor() {
    const f = this.f;
    const A = this.A;
    const st = f.state;
    const fr = f.fsm.frame;
    const K = f.stats.kit ?? {};
    const tick = f.world?.frame ?? 0;
    const loop = (a) => a.frames[Math.floor((tick * a.fps) / 60) % a.frames.length];
    const a = A[st];

    // swings: wind-up / strike / follow-through from the move's own numbers
    if (a?.phases && f.move) {
      const m = f.move;
      const ph = movePhase(m, fr);
      if (ph === 'startup') return spread(a.phases.startup, (fr - 1) / Math.max(1, m.startup));
      if (ph === 'active') return spread(a.phases.active, (fr - m.startup - 1) / Math.max(1, m.active));
      return spread(a.phases.recovery, (fr - m.startup - m.active - 1) / Math.max(1, m.recovery));
    }

    switch (st) {
      case 'walk': {
        if (tick !== this.headTick) { this.headTick = tick; this.heading.update(f.vx, f.vz); }
        // sprinting (side on): its own strip when drawn, else the run played faster
        if (f.sprinting && this.heading.dir === 'side' && A.sprint) return loop(A.sprint);
        const w = headingAnim(A, this.heading.dir);
        return loop(f.sprinting ? { ...w, fps: w.fps * 1.5 } : w);
      }
      case 'block':
      case 'parry': return A.block.frames[0];
      case 'jump': {
        if (A.launched && f.vaultApexAt && tick < f.vaultApexAt) return A.launched.frames[0];
        // the second jump: a flip with a twist, played once through as she soars
        if (A.flip && f.flipFrom != null && tick - f.flipFrom < FLIP_FRAMES) return spread(A.flip.frames, (tick - f.flipFrom) / FLIP_FRAMES);
        // (a three-pose jump strip: rising, the top, descending)
        if (A.jumpStrip) return A.jumpStrip.frames[f.vh > 150 ? 0 : f.vh < -150 ? 2 : 1];
        return A.jump.frames[f.vh > 0 ? 0 : A.jump.frames.length - 1];
      }
      case 'dodge': {
        const d = f.stats.dodge;
        const back = A.dodgeBack && Math.sign(f.vx || f.facing) !== f.facing;
        return spread((back ? A.dodgeBack : A.dodge ?? A.idle).frames, fr / (d.duration + d.recovery));
      }
      case 'hitstun': return A.hitstun.frames[0];
      case 'stagger':
      case 'guardBreak': return A.stagger.frames[0];
      case 'knockdown': return (f.lyingSince === null ? A.flying : A.lying).frames[0];
      case 'dead':
      case 'burning': return A.lying.frames[0];
      case 'getup': return spread(A.getup.frames, fr / Math.max(1, f.stats.getupFrames));
      case 'execute': {
        // his own finisher strip when it's drawn, else the borrowed poses
        const fin = A[`fin_${f.exec?.kind}`]?.frames ?? A.finisher?.[f.exec?.kind];
        return fin ? spread(fin, fr / ({ ...MAGE_FINISHERS, ...ROGUE_FINISHERS }[f.exec.kind]?.total ?? 100)) : A.idle.frames[0];
      }

      // ---- the Mage's kit (combat/Mage.js)
      case 'bolt': {
        const F = A.bolt.frames; const m = f.move;
        if (!f.boltFired) return fr < m.startup ? spread(F.slice(0, 2), fr / m.startup) : F[2]; // raised, charging
        const since = fr - f.boltFired;
        return since < 8 ? F[3] : since < 14 ? F[4] : F[5];
      }
      case 'force': {
        const F = A.force.frames; const m = f.move;
        if (!f.forceAt) return fr < m.startup ? spread(F.slice(0, 2), fr / m.startup) : F[1]; // coiled (held = charging)
        const since = fr - f.forceAt;
        return since <= 4 ? F[2] : since <= 11 ? F[3] : F[4];
      }
      case 'ward': {
        const F = A.ward.frames; const B = K.barrier;
        if (!f.wardKind) return spread(F.slice(0, 2), fr / 10);
        const t = fr - f.wardAt;
        if (t < B.castAt - 2) return F[2];
        const after = t - B.castAt;
        return after < 1 ? F[3] : after < 8 ? F[4] : F[5];
      }
      case 'blink': {
        const F = A.blink.frames; const B = K.blink;
        if (fr < B.vanishAt) return spread(F.slice(1, 3), fr / B.vanishAt);
        if (fr < B.arriveAt) return null; // gone: only the sparks (MageFX)
        const d = f.stats.dodge;
        return spread(F.slice(3), (fr - B.arriveAt) / Math.max(1, d.duration + d.recovery - B.arriveAt));
      }

      // ---- the Rogue's kit (combat/Rogue.js)
      case 'knife': return spread(A.knife.frames, fr / (K.knife.startup + K.knife.recovery));
      case 'mine': return A.mine.frames[0];
      case 'vault': return A.vault.frames[0];
      case 'fan': return A.fan.frames[0];
      case 'dive': {
        const F = A.dive.frames;
        if (!f.diveLanded) return F[0];
        return fr - f.diveLanded < 5 ? F[1] : F[2];
      }
      default: {
        // she drops a mine without breaking stride: a beat of the set-down pose over it
        if (A.mine && f.mineDropAt != null && tick - f.mineDropAt < 8) return A.mine.frames[0];
        return A[st]?.frames ? loop({ fps: 8, ...A[st] }) : loop(A.idle);
      }
    }
  }

  update() {
    const f = this.f;
    const st = f.state;
    const fr = f.fsm.frame;
    const s = this.sprite;
    const tick = f.world?.frame ?? 0;

    if (st !== 'walk' && this.heading.dir !== 'side') this.heading.reset();
    const ref = this.frameFor();
    s.setVisible(ref !== null);
    if (ref !== null && ref !== this.last) {
      const [strip, i] = ref.split(':');
      s.setTexture(`${this.sheet.key}-${strip}`, `f${i}`);
    }
    this.last = ref;

    const k = depthScale(f.z) / this.sheet.res;
    let sx = k; let sy = k; let bob = 0; let lean = 0;

    // the Mage floats: off the floor unless he's been knocked out of the air
    const hover = f.stats.hover;
    const downed = st === 'knockdown' || st === 'dead' || st === 'burning' || (st === 'getup' && fr < f.stats.getupFrames * 0.4);
    // (his strips keep their drawn baseline, a hand below his boots: the lying poses sit on it)
    if (hover) bob -= hover.height + (downed ? 0 : Math.sin(tick * hover.driftRate) * hover.drift);
    if (st === 'walk' && hover) lean += clamp01(Math.hypot(f.vx, f.vz) / f.stats.walkSpeed) * 4;
    if (st === 'walk' && f.sprinting && !this.A.sprint) lean += 5; // (no sprint art yet: lean into it)

    if (st === 'idle' && this.A.idle.breathe) {
      const b = Math.sin(tick * 0.06);
      sy *= 1 + b * 0.012; sx *= 1 - b * 0.005;
    }
    if (st === 'hitstun') lean -= 6 * Math.max(0, 1 - fr / 8);
    // charging the force push: a tremble that builds as it fills
    if (st === 'force' && !f.forceAt && f.forceCharge > 0) lean += (Math.random() - 0.5) * Math.min(1, f.forceCharge / 30) * 2.5;

    s.setPosition(f.x, f.z - f.h + bob).setDepth(f.z).setScale(sx * f.facing, sy);
    s.angle = lean * f.facing;

    s.clearTint();
    if (f.flash > 0) s.setTintFill(0xffffff);
    else if ((st === 'stagger' || st === 'guardBreak') && Math.floor(fr / 4) % 2 === 0) s.setTint(0xffe080);
    else if (f.parryActive) s.setTint(0xcfe6ff);
    else if (f.tint) s.setTint(f.tint); // co-op: the second player's copy of the same hero

    let alpha = 1;
    if (st === 'dodge' && f.invincible) alpha = 0.8;
    if (st === 'getup') alpha = fr % 4 < 2 ? 0.6 : 1;
    if (st === 'dead') alpha = Math.max(0, 1 - Math.max(0, fr - 90) / 60);
    s.setAlpha(alpha);

    const lift = f.h + (hover && !downed ? hover.height : 0);
    this.shadow.setPosition(f.x, f.z).setScale(1 - Math.min(lift / 300, 0.5)).setAlpha(0.35 * alpha);
  }

  destroy() {
    this.sprite.destroy();
    this.shadow.destroy();
  }
}
