// SpriteFighterView.js — Draws a fighter with a real sprite sheet.
//
// Same job as FighterView (update() + destroy()), but picks animation frames from
// the sheet's JSON. Attack animations are synced to FRAME DATA, not a timer:
// the "active" pose is always on screen exactly while the hitbox is out, so what
// you see is what hits — even if you retune startup/active/recovery numbers.
//
// Frames are either numbers (the main sheet) or 'strip:index' strings — extra strips
// cut at boot by view/stripImporter.js (see data/spriteStrips.js).
//
// On top of the frames: sword smears (view/Smear.js), a slick guard swap when he
// turns while blocking, and a heavy, planted bob to the walk.

import { DEPTH, depthScale } from './depths.js';
import { movePhase } from '../combat/MoveRunner.js';
import { drawSmear, smearSparks } from './Smear.js';
import { IMPALE, CHAIN } from '../combat/Finisher.js';
import { Heading, headingAnim } from './Heading.js';

const ATTACKS = ['light1', 'light2', 'light3', 'heavy', 'airAttack', 'kick', 'thrust'];

// How hard each swing reads in the body (view only — gameplay timing is untouched):
//   k      overall amplitude of the anticipation / drive / settle
//   arc    smear arc length multiplier (weak swings sweep a shorter arc)
//   w      smear thickness multiplier
const SWING_FEEL = {
  light1: { k: 0.55, arc: 0.86, w: 0.85 },
  light2: { k: 0.62, arc: 0.88, w: 0.88 },
  light3: { k: 1.0, arc: 1, w: 1 },
  heavy: { k: 1.35, arc: 1, w: 1 },
  airAttack: { k: 0.6, arc: 1, w: 1 },
};
const COMBO = ['light1', 'light2', 'light3', 'heavy'];
const easeInOut = (t) => t * t * (3 - 2 * t);

// Pick an item from a list by how far we are through a stretch of frames.
function spread(list, t) {
  return list[Math.min(list.length - 1, Math.max(0, Math.floor(t * list.length)))];
}
const easeOut = (t) => 1 - (1 - t) ** 3;
// px covered by one full charge-stalk cycle (two short, planted steps)
const CHARGE_STRIDE = 70;

// Finisher poses: [frame, pose] keys along each timeline (combat/Finisher.js). These
// borrow his existing strips; a finisher's own strip (anims.fin_<kind>, when drawn)
// takes over automatically.
const FIN_KEYS = {
  throat: [[0, 'combo1:0'], [5, 'combo1:1'], [24, 'combo1:2'], [27, 'combo1:3'], [50, 'combo1:4'], [62, 'combo1:0']],
  impale: [[0, 'charge:1'], [8, 'charge:3'], [19, 'thrust:2'], [21, 'thrust:3'], [94, 'kick:1'], [104, 'kick:2'], [109, 'kick:3'], [118, 'kick:4'], [128, 'kick:5']],
  // one flat cut through the waist, a beat to admire it, then the boot
  halve: [[0, 'combo2:0'], [5, 'combo2:1'], [14, 'combo2:2'], [17, 'combo2:3'], [26, 'combo2:4'], [36, 'combo1:0'], [44, 'kick:1'], [56, 'kick:2'], [61, 'kick:3'], [72, 'kick:4'], [84, 'kick:5']],
};
const keyAt = (keys, fr) => { let r = keys[0][1]; for (const [t, ref] of keys) if (fr >= t) r = ref; return r; };
// chain strokes: [blade back, the stroke, follow-through]
const CHAIN_POSES = {
  down: ['combo1:1', 'combo1:2', 'combo1:3'],
  up: ['combo2:1', 'combo2:2', 'combo2:3'],
  finish: ['combo3:2', 'combo3:3', 'combo3:4'],
};

export class SpriteFighterView {
  constructor(scene, fighter, spriteKey) {
    this.scene = scene;
    this.f = fighter;
    this.key = spriteKey;
    this.meta = scene.cache.json.get(`${spriteKey}-data`);
    const m = this.meta;
    const w = fighter.stats.body.w;

    this.shadow = scene.add.ellipse(fighter.x, fighter.z, w * 1.4, 14, 0x000000, 0.35).setDepth(DEPTH.shadows);
    this.sprite = scene.add.image(fighter.x, fighter.z, spriteKey, 'f0')
      .setOrigin(m.anchorX / m.frameWidth, m.anchorY / m.frameHeight);
    this.smear = scene.add.graphics().setBlendMode(Phaser.BlendModes.ADD);
    this.ghost = scene.add.image(fighter.x, fighter.z, spriteKey, 'f0')
      .setOrigin(m.anchorX / m.frameWidth, m.anchorY / m.frameHeight).setVisible(false);
    this.lastFrameRef = null;
    this.heading = new Heading();

    if (fighter.team === 'enemy') {
      this.hpBg = scene.add.rectangle(0, 0, 44, 5, 0x000000, 0.7).setOrigin(0, 0.5);
      this.hpFill = scene.add.rectangle(0, 0, 44, 5, 0xc0282d).setOrigin(0, 0.5);
    }
  }

  attackAnim(st) {
    const a = this.meta.anims;
    if (a[st]) return a[st];
    if (st === 'kick') return a.light1; // no kick strip yet
    return null;
  }

  frameFor() {
    const f = this.f;
    const a = this.meta.anims;
    const st = f.state;
    const fr = f.fsm.frame;
    const loop = (anim) => anim.frames[Math.floor((fr * anim.fps) / 60) % anim.frames.length];

    // Coming out of a back / front / three-quarter walk into a stance or a swing: turn
    // through the views in between over a few ticks (back → three-quarter → side) instead
    // of popping straight to the side view. Getting hit or thrown just snaps.
    if (st !== 'walk' && this.heading.dir !== 'side') {
      const tick = f.world?.frame ?? 0;
      if (this.turnFrom == null) this.turnFrom = tick;
      const dt = tick - this.turnFrom;
      const dir = this.heading.dir;
      const vert = dir === 'up' || dir === 'down';
      const soft = st === 'idle' || st === 'block' || st === 'parry' || st === 'charge' || ATTACKS.includes(st);
      if (soft && dt < (vert ? 6 : 3)) {
        const via = vert && dt < 3 ? dir : dir.startsWith('up') ? 'upDiag' : 'downDiag';
        const turn = headingAnim(a, via);
        if (turn !== a.walk) return turn.frames[3]; // (a planted, legs-passing pose)
      }
      this.heading.reset();
      this.turnFrom = null;
    } else if (st === 'walk') this.turnFrom = null;

    const atk = ATTACKS.includes(st) && f.move ? this.attackAnim(st) : null;
    if (atk) {
      const m = f.move;
      const ph = atk.phases;
      const phase = movePhase(m, fr);
      // chained out of another swing: the last follow-through IS the wind-up, so skip
      // the strip's ready stance instead of snapping back to it between hits
      const startup = this.chained() && ph.startup.length > 1 ? ph.startup.slice(1) : ph.startup;
      if (phase === 'startup') return spread(startup, (fr - 1) / m.startup);
      if (phase === 'active' || !ph.recovery) return spread(ph.active, (fr - m.startup - 1) / Math.max(1, m.active));
      return spread(ph.recovery, (fr - m.startup - m.active - 1) / Math.max(1, m.recovery));
    }

    switch (st) {
      case 'execute': return this.finisherFrame(fr);
      case 'charge': {
        // both hands onto the hilt, draw back, then fully coiled and held
        const fs = a.charge?.frames;
        if (!fs) return a.idle.frames[0];
        // coiled and stalking forward/back: steps follow the distance actually covered,
        // so backing off plays the same planted steps in reverse
        const cw = a.chargeWalk?.frames;
        if (cw && (f.chargeT ?? 0) >= 14 && this.chargeMoving) {
          const n = cw.length;
          return cw[((Math.floor(this.chargeStep * n) % n) + n) % n];
        }
        return fs[Math.min(fs.length - 1, 1 + Math.floor((f.chargeT ?? 0) / 7))];
      }
      case 'walk': {
        // seen from the side, the back, the front or three-quarters, by where he's going
        // (view/Heading.js) — the step count carries over when the view changes
        const tick = f.world?.frame ?? 0;
        if (tick !== this.headTick) { this.headTick = tick; this.heading.update(f.vx, f.vz); }
        // sprinting (side on): the charge strip when drawn, else the walk played faster
        if (f.sprinting && this.heading.dir === 'side' && a.sprint) return loop(a.sprint);
        const w = headingAnim(a, this.heading.dir);
        return loop(f.sprinting ? { ...w, fps: w.fps * 1.5 } : w);
      }
      case 'jump': return f.vh > 0 ? a.jump.rise[0] : a.jump.fall[0];
      // LEAP SMASH (combat/Skills.js): the cleave's downstroke all the way down, then kneeling in the crater
      case 'plunge': { const ph = a.heavy?.phases; return ph ? (f.landedAt ? ph.recovery?.[0] ?? ph.active[0] : ph.active[0]) : a.jump.fall[0]; }
      case 'block':
      case 'parry': return a.block.frames[0];
      case 'dodge': {
        const d = f.stats.dodge;
        const anim = (f.dodgeDir === 'up' && a.dodgeUp) || (f.dodgeDir === 'down' && a.dodgeDown) || a.dodge;
        return spread(anim.frames, fr / (d.duration + d.recovery));
      }
      case 'cast': {
        const sp = f.stats.spell;
        const fs = a.cast.frames; // 2 wind-up frames, then 2 impact frames
        if (fr < sp.startup) return spread(fs.slice(0, 2), fr / sp.startup);
        return spread(fs.slice(2), (fr - sp.startup) / Math.max(1, sp.recovery));
      }
      case 'hitstun':
      case 'stagger':
      case 'guardBreak': return a.hitstun.frames[fr < 6 ? 0 : 1];
      case 'knockdown': return f.lyingSince === null ? a.knockdown.air[0] : a.knockdown.lying[0];
      case 'getup': return spread(a.getup.frames, fr / f.stats.getupFrames);
      case 'dead': return a.knockdown.lying[0];
      default: return loop(a.idle);
    }
  }

  // This swing was chained straight out of another (combo / light into heavy).
  chained() {
    const f = this.f;
    return COMBO.includes(f.state) && COMBO.includes(f.fsm.prevName) && f.fsm.prevName !== f.state;
  }

  // Body mechanics laid over a swing's frames: anticipation (coil back) through the
  // wind-up, a forward drive and stretch on the strike, then a damped settle through the
  // recovery instead of a dead stop. Scaled by how hard the swing is (SWING_FEEL), with a
  // little variation per swing so repeats don't look identical. Returns offsets.
  swingMotion(st, fr) {
    const feel = SWING_FEEL[st];
    const m = this.f.move;
    if (!feel || !m) return null;
    const seed = this.f.fsm.enterCount;
    const vary = 0.86 + ((seed * 37) % 11) / 11 * 0.28;
    const k = feel.k * vary;
    // momentum carries a chained swing: less wind-up (but a heavy always coils in full —
    // its big wind-up is the telegraph)
    const coil = this.chained() && st !== 'heavy' ? 0.45 : 1;
    const out = { lean: 0, push: 0, sx: 1, sy: 1, bob: 0 };
    if (fr <= m.startup) {
      const a = easeInOut(fr / m.startup) * coil;
      out.lean = -4.5 * k * a;
      out.push = -3 * k * a;
      out.sx = 1 - 0.025 * k * a;
      out.sy = 1 + 0.02 * k * a;
      out.bob = 1.2 * k * a;            // sinks into the legs
    } else if (fr <= m.startup + m.active) {
      const t = (fr - m.startup) / Math.max(1, m.active);
      out.lean = 5.5 * k * (1 - 0.25 * t);
      out.push = 5 * k;
      out.sx = 1 + 0.06 * k * (1 - t * 0.5);
      out.sy = 1 - 0.035 * k * (1 - t * 0.5);
    } else {
      const t = Math.min(1, (fr - m.startup - m.active) / Math.max(1, m.recovery));
      const damp = Math.exp(-3.6 * t);
      out.lean = 5.5 * k * 0.75 * damp * Math.cos(t * 7);    // settles with a small rebound
      out.push = 5 * k * (1 - easeOut(t));
      out.sx = 1 + 0.03 * k * damp;
      out.sy = 1 - 0.02 * k * damp;
      out.bob = -0.8 * k * Math.sin(t * Math.PI) * damp;   // weight comes back up
    }
    return out;
  }

  // The smear for this swing: weak swings sweep a shorter, thinner arc, and every swing
  // is angled a touch differently so a string of taps doesn't look copy-pasted.
  swingSmear(st) {
    const m = this.f.move;
    const feel = SWING_FEEL[st];
    if (!m?.smear || !feel) return m;
    const seed = this.f.fsm.enterCount;
    if (this.smearSeed === seed && this.smearMove?.base === m) return this.smearMove;
    const [a0, a1] = m.smear.arc;
    const tilt = (((seed * 53) % 13) / 13 - 0.5) * 12;       // ±6°
    const len = (a1 - a0) * feel.arc * (0.94 + ((seed * 29) % 7) / 7 * 0.1);
    const mid = (a0 + a1) / 2 + tilt;
    this.smearSeed = seed;
    this.smearMove = { ...m, base: m, smear: { ...m.smear, arc: [mid - len / 2, mid + len / 2], w: m.smear.w * feel.w, r: m.smear.r * (0.97 + ((seed * 17) % 5) / 5 * 0.06) } };
    return this.smearMove;
  }

  finisherFrame(fr) {
    const a = this.meta.anims;
    const ex = this.f.exec;
    if (!ex) return a.idle.frames[0];
    if (ex.kind === 'chain') {
      // each cut: blade drawn back on the way in → the stroke, on screen from just before
      // contact right through the hit-stop → its follow-through, which he carries into
      // the next man. A different stroke each time (CHAIN.styles).
      const { starts, cuts, styles, total } = ex.times;
      const i = ex.chainIndex ?? 0;
      const last = i === cuts.length - 1;
      const [wind, swing, follow] = CHAIN_POSES[styles[i]];
      const c = cuts[i];
      if (fr < c - 1) {
        const leg = c - starts[i];
        if (i > 0 && fr < starts[i] + leg * 0.4) return CHAIN_POSES[styles[i - 1]][2]; // still in the last follow-through
        return wind;
      }
      if (fr < c + CHAIN.split) return swing;
      if (!last) return follow;
      return fr > total - 15 ? 'combo1:0' : follow; // settles into a low ready guard
    }
    const kind = ex.kind === 'pending' ? 'throat' : ex.kind;
    const own = a[`fin_${kind}`];
    return keyAt(own?.keys ?? FIN_KEYS[kind], fr);
  }

  setFrameRef(ref) {
    if (ref === this.lastFrameRef) return;
    this.lastFrameRef = ref;
    if (typeof ref === 'string') {
      const [strip, i] = ref.split(':');
      this.sprite.setTexture(`${this.key}-${strip}`, `f${i}`);
      this.sprite.setOrigin(this.meta.stripOrigin?.[strip] ?? this.sprite.originX, this.sprite.originY);
    } else {
      this.sprite.setTexture(this.key, `f${ref}`);
      this.sprite.setOrigin(this.meta.anchorX / this.meta.frameWidth, this.sprite.originY);
    }
  }

  update() {
    const f = this.f;
    const st = f.state;
    const fr = f.fsm.frame;
    const scale = this.meta.scale * depthScale(f.z);
    const s = this.sprite;

    // charge stalk: distance moved along his facing (backwards is negative), in strides
    if (st === 'charge') {
      const speed = Math.hypot(f.vx, f.vz);
      const dir = Math.abs(f.vx) > 4 ? Math.sign(f.vx * f.facing) : 1; // pure depth moves step forward
      this.chargeMoving = speed > 8;
      if (this.chargeMoving) this.chargeStep = (this.chargeStep ?? 0) + (dir * speed) / 60 / CHARGE_STRIDE;
    } else {
      this.chargeStep = 0;
      this.chargeMoving = false;
    }

    const ref = this.frameFor();
    this.poseChanged = ref !== this.lastFrameRef;
    this.setFrameRef(ref);

    // Heavy, planted walk: dips on each footfall, slight shoulder roll.
    let bob = 0;
    let lean = 0;
    if (st === 'walk' && f.sprinting) lean = this.meta.anims.sprint ? 0 : 6; // (no charge art yet: lean into it)
    else if (st === 'walk' && this.meta.anims.walk?.heavyBob) {
      const n = this.meta.anims.walk.frames.length;
      const fps = this.meta.anims.walk.fps;
      const cyc = ((fr * fps) / 60) % n / n; // 0..1 through the cycle, two steps per cycle
      bob = Math.abs(Math.sin(cyc * Math.PI * 2)) * -2.5 + 1.5;
      lean = Math.sin(cyc * Math.PI * 2) * 1.2;
    }

    // Guard swap: whip round to the other side — squash through edge-on, small hop, glint.
    let sx = scale * f.facing;
    let sy = scale;
    if ((st === 'block' || st === 'parry') && f.guardSwap > 0) {
      const t = easeOut(1 - f.guardSwap / 9);
      sx = scale * f.facing * (-1 + 2 * t);
      if (Math.abs(sx) < 0.18 * scale) sx = 0.18 * scale * Math.sign(sx || f.facing);
      sy = scale * (1 + 0.06 * Math.sin(t * Math.PI));
      bob -= Math.sin(t * Math.PI) * 5;
    }

    // Chain execution: a full 360 spin out of each cut into the next man (edge-on flip,
    // like the guard swap), rising a touch through it
    const ex = st === 'execute' ? f.exec : null;
    if (ex?.kind === 'chain') {
      // ONE spin, between the first man and the second: the first stroke's rotation
      // carried all the way round (fast through the middle, planted at both ends) while
      // he covers the ground between them — he comes out of it already on the next man
      const w = ex.times.spin;
      if (w && fr >= w[0] && fr <= w[1]) {
        const t = (fr - w[0]) / (w[1] - w[0]);
        const e = t * t * (3 - 2 * t);
        const c = Math.cos(e * Math.PI * 2);
        sx = scale * f.facing * (Math.abs(c) < 0.15 ? 0.15 * Math.sign(c || 1) : c);
        bob += Math.sin(t * Math.PI) * 2.5; // sinks into the pivot: no hop
        lean += Math.sin(t * Math.PI) * 3;
      }
    }

    // Kick oomph: coil back (squash, lean away) on the chamber, then snap into a
    // stretched, forward-driving thrust on the active frames.
    let push = 0;
    if (st === 'kick' && f.move) {
      const m = f.move;
      if (fr <= m.startup) {
        const t = fr / m.startup;
        lean = -7 * Math.sin(t * Math.PI * 0.5);
        sx *= 1 - 0.05 * t; sy *= 1 + 0.03 * t;
        push = -5 * t;
      } else if (fr <= m.startup + m.active + 3) {
        const t = (fr - m.startup) / (m.active + 3);
        lean = 5 * (1 - t);
        sx *= 1 + 0.1 * (1 - t); sy *= 1 - 0.04 * (1 - t);
        push = 8 * (1 - t);
        if (fr === m.startup + 1 && fr !== this.kickDust) {
          this.kickDust = fr;
          this.scene.gore?.spark(f.x - f.facing * 26, f.z, 2, 0x9a8a70, 12); // heel drives off the floor
        }
      }
    }

    // swings: anticipation -> drive -> settle (see swingMotion)
    const sw = ATTACKS.includes(st) ? this.swingMotion(st, fr) : null;
    if (sw) { lean += sw.lean; push += sw.push; sx *= sw.sx; sy *= sw.sy; bob += sw.bob; }

    // idle breathing: slow eased rise and fall from the feet up, weight shifting a touch
    if (st === 'idle' && this.meta.anims.idle?.breathe) {
      const t = f.world?.frame ?? 0;
      const b = Math.sin(t * 0.05);
      const eased = b * Math.abs(b) ** 0.3;
      sy *= 1 + eased * 0.014;
      sx *= 1 - eased * 0.006;
      bob += -eased * 0.6;
      lean += Math.sin(t * 0.025) * 0.35;
    }

    // fully charged: a barely-held tremble of stored force
    if (st === 'charge' && f.chargeFull) { push += (Math.random() - 0.5) * 1.2; bob += (Math.random() - 0.5) * 0.6; }
    // stalking while coiled: a low dip on each planted foot, blade kept level
    if (st === 'charge' && this.chargeMoving) {
      const ph = this.chargeStep * Math.PI * 2;
      bob += Math.abs(Math.sin(ph)) * -1.8 + 1;
      lean += Math.sin(ph) * 0.6;
    }

    // impale: his whole body drives in behind the thrust; then the dead weight comes onto
    // the blade — knees bend, he leans into the load — and he strains it upward
    if (ex?.kind === 'impale') {
      if (fr >= IMPALE.stab - 2 && fr <= IMPALE.stab + 2) push += 5;
      if (fr > IMPALE.stab + 2 && fr < IMPALE.raised) {
        const s = Math.sin(Math.min(1, (fr - IMPALE.stab) / (IMPALE.raised - IMPALE.stab)) * Math.PI);
        bob += s * 3.5;
        lean += s * 2.5;
        if (fr >= IMPALE.liftFrom) push += (Math.random() - 0.5) * 0.9; // the strain
      }
    }

    // holding a man from behind (throat): he's drawn in front of Ulric
    const behind = ex && (ex.kind === 'throat' || ex.kind === 'pending') ? -0.3 : 0;
    s.setPosition(f.x + push * f.facing, f.z - f.h + bob).setDepth(f.z + behind);
    s.setScale(sx, sy);
    s.angle = lean * f.facing;

    // afterimage: when a swing changes pose through the strike, the last pose lingers a
    // few frames behind him (fills the gap between hand-drawn poses, sells the speed)
    const g = this.ghost;
    if (this.poseChanged && sw && f.move && fr >= f.move.startup - 1 && fr <= f.move.startup + f.move.active + 2 && this.prevPose) {
      const p = this.prevPose;
      g.setTexture(p.key, p.frame).setPosition(p.x, p.y).setScale(p.sx, p.sy).setAngle(p.angle)
        .setDepth(f.z - 0.05).setAlpha(0.38).setVisible(true).setTint(0xffc8a0);
    } else if (g.visible) {
      g.setAlpha(g.alpha - 0.07);
      if (g.alpha <= 0.02) g.setVisible(false);
    }
    this.prevPose = { key: s.texture.key, frame: s.frame.name, x: s.x, y: s.y, sx, sy, angle: s.angle };

    // Tints: white hit flash, heavy wind-up telegraph, stagger wobble, parry glint.
    s.clearTint();
    if (f.flash > 0) s.setTintFill(0xffffff);
    else if (st === 'heavy' && f.move && fr <= f.move.startup && Math.floor(fr / 3) % 2 === 0) s.setTint(0xffb070);
    else if ((st === 'stagger' || st === 'guardBreak') && Math.floor(fr / 4) % 2 === 0) s.setTint(0xffe080);
    else if (f.parryActive) s.setTint(0xcfe6ff);
    else if (f.guardSwap > 0) s.setTint(0xe8f0ff);
    else if (f.tint) s.setTint(f.tint); // co-op: the second player's copy of the same hero

    let alpha = 1;
    if (st === 'dodge' && f.invincible) alpha = 0.75;
    if (st === 'getup') alpha = fr % 4 < 2 ? 0.6 : 1;
    if (st === 'dead') alpha = Math.max(0, 1 - Math.max(0, fr - 90) / 60);
    s.setAlpha(alpha);

    // Sword smear
    this.smear.clear().setDepth(f.z + 0.5);
    if (ATTACKS.includes(st) && f.move) {
      const sm = this.swingSmear(st);
      drawSmear(this.smear, f, sm, fr);
      // sparks once per game frame (the view can redraw several times per frame)
      if (fr !== this.sparkFrame || st !== this.sparkState) {
        this.sparkFrame = fr;
        this.sparkState = st;
        if (f.hitstop === 0) smearSparks(this.scene.gore, f, sm, fr);
      }
    }

    const shadowScale = 1 - Math.min(f.h / 300, 0.5);
    this.shadow.setPosition(f.x, f.z).setScale(shadowScale).setAlpha(0.35 * alpha);

    if (this.hpFill) {
      const show = f.health < f.stats.maxHealth && f.alive;
      const x = f.x - 22;
      const y = f.z - f.h - f.stats.body.h - 14;
      this.hpBg.setVisible(show).setPosition(x, y).setDepth(f.z + 0.1);
      this.hpFill.setVisible(show).setPosition(x, y).setDepth(f.z + 0.2);
      this.hpFill.scaleX = Math.max(0, f.health / f.stats.maxHealth);
    }
  }

  destroy() {
    this.sprite.destroy();
    this.ghost.destroy();
    this.smear.destroy();
    this.shadow.destroy();
    this.hpBg?.destroy();
    this.hpFill?.destroy();
  }
}
