// MageView.js — Draws the Mage: a layered, hand-built puppet (no sprite sheet yet — the
// painted strips are on their way, docs/mage-art-prompts.md), posed every frame from his
// state and frame data, with its own secondary motion.
//
// The design follows the reference painting: deep navy hooded robe with gold sun/moon
// embroidery, cream inner panel, leather belts with scrolls and a strapped tome, gold
// charms and little red lanterns on chains, a long white braided beard, armoured boots,
// and a twisted wooden staff wrapped in chain, crowned with a spiked iron lantern cage
// holding a red-orange ember crystal.
//
// HE DOES NOT WALK. The whole figure floats `stats.hover.height` px over his feet (the
// gameplay position stays on the floor; the shadow stays on the floor), drifting a
// little. The robe hem streams back as he glides, charms and the tome swing on their
// own springs, the beard and cloak lag behind the body. Knocked down, the levitation
// breaks and he hits the floor; he rises from it on magic, horizontal, then tilts
// upright into the hover.
//
// Poses are keyed to the move's own frame data (startup / active / recovery), so what
// you see is what hits: the staff is at full extension exactly while the hitbox is out.
// The staff is always held by the near hand (and the far hand when it's two-handed) — it
// is drawn FROM the hand the arm actually reached, so it can never come loose or jump.

import { DEPTH, depthScale } from './depths.js';
import { movePhase } from '../combat/MoveRunner.js';
import { MAGE_FINISHERS } from '../combat/Mage.js';
import { Heading } from './Heading.js';
import { softShadow } from './atmosphere.js';

const TAU = Math.PI * 2;
const lerp = (a, b, t) => a + (b - a) * t;
const clamp01 = (t) => Math.max(0, Math.min(1, t));
const smooth = (t) => { t = clamp01(t); return t * t * (3 - 2 * t); };
const easeOut = (t) => 1 - (1 - clamp01(t)) ** 3;
const easeIn = (t) => clamp01(t) ** 2;
function lerpAng(a, b, t) {
  const d = ((((b - a + Math.PI) % TAU) + TAU) % TAU) - Math.PI;
  return a + d * t;
}

// ---------------------------------------------------------------- palette

export const MAGE_PAL = {
  navyD: 0x10163a, navy: 0x1c2652, navyL: 0x2f3d78, navyH: 0x4a5ca0,
  gold: 0xc9a24a, goldL: 0xf2d888, goldD: 0x7a5a22,
  cream: 0xd8c9a2, creamD: 0xa49276,
  leather: 0x5c3519, leatherL: 0x8c5c30, leatherD: 0x2e1a0c,
  skin: 0xd2a57e, skinD: 0x9a6a4a,
  beard: 0xe8e4dc, beardD: 0xa9a49c, hair: 0xc9c4bc,
  steel: 0x8e8e98, steelD: 0x44444e, steelL: 0xcfd0d8,
  wood: 0x5c3b20, woodL: 0x8e6a3e, woodD: 0x2a190b,
  iron: 0x34303a, ember: 0xff5a1a, emberL: 0xffd27a, emberD: 0xa8200a,
  red: 0xb0201a, outline: 0x07060c,
};
// a second Mage in co-op wears oxblood instead of navy
const ALT = { navyD: 0x2a0c10, navy: 0x4a1418, navyL: 0x6e2228, navyH: 0x9a3a3a };

// ---------------------------------------------------------------- poses

// A pose. Positions are px from his feet (facing right, y up = negative), before the
// hover lift. ang = direction from the staff hand to the staff's head (radians, screen:
// 0 = straight ahead, -PI/2 = straight up). two = the far hand on the staff, px along it
// from the near hand (null = free; then ox/oy place it). open = how open the free hand is.
const BASE = {
  x: 0, y: 0, lean: 0.04, crouch: 0, hover: 0, trail: 0, lift: 0,
  gx: 15, gy: -50, ang: -1.5, two: null, ox: 6, oy: -42, open: 0.3,
  head: 0, glow: 0.45, sx: 1, sy: 1, alpha: 1, rot: 0, spin: 1, sigil: 0, ground: 0,
};
const P = (o) => ({ ...BASE, ...o });

const POSES = {
  idle: P({}),
  move: P({ lean: 0.13, gx: 16, gy: -52, ang: -1.32, ox: 0, oy: -44 }),
  // staff guard for the combo: both hands on it, across the body
  guard: P({ lean: 0.08, gx: 16, gy: -52, ang: -0.95, two: 26 }),
  // block: staff braced diagonally across the body, both hands
  block: P({ lean: -0.03, gx: 13, gy: -50, ang: -1.0, two: 30, glow: 0.7 }),
};

// light1 — fast horizontal strike
const L1 = {
  startup: [[0, POSES.guard], [1, P({ lean: -0.08, gx: -2, gy: -58, ang: -2.75, two: 22, x: -2 })]],
  active: [[0, P({ lean: 0.1, gx: 18, gy: -57, ang: -0.35, two: 24 })], [1, P({ lean: 0.16, gx: 24, gy: -56, ang: 0.08, two: 26, x: 3 })]],
  recovery: [[0, P({ lean: 0.16, gx: 22, gy: -54, ang: 0.5, two: 24, x: 3 })], [0.5, P({ lean: 0.1, gx: 18, gy: -53, ang: 0.62, two: 22, x: 2 })], [1, POSES.guard]],
};
// light2 — the reverse sweep, rising back across
const L2 = {
  startup: [[0, P({ lean: 0.12, gx: 20, gy: -52, ang: 0.62, two: 22, x: 2 })], [1, P({ lean: 0.14, gx: 16, gy: -46, ang: 1.25, two: 20, x: 2 })]],
  active: [[0, P({ lean: 0.04, gx: 18, gy: -58, ang: -0.6, two: 22, x: 3 })], [1, P({ lean: -0.06, gx: 14, gy: -64, ang: -2.15, two: 22, x: 4 })]],
  recovery: [[0, P({ lean: -0.06, gx: 12, gy: -63, ang: -2.3, two: 20, x: 4 })], [0.45, P({ lean: -0.02, gx: 12, gy: -60, ang: -2.1, two: 20, x: 3 })], [1, POSES.guard]],
};
// light3 — turn through a full spin, staff overhead, slam it down: a pressure pulse
const L3 = {
  startup: [
    [0, POSES.guard],
    [0.25, P({ lean: 0.02, gx: 4, gy: -66, ang: -1.9, two: 24, spin: 0.2 })],
    [0.5, P({ lean: -0.05, gx: 2, gy: -80, ang: -2.2, two: 22, spin: -1, lift: 0.25 })],
    [0.75, P({ lean: -0.04, gx: 6, gy: -84, ang: -2.45, two: 22, spin: 0.1, lift: 0.3 })],
    [1, P({ lean: -0.1, gx: 8, gy: -86, ang: -2.6, two: 22, spin: 1, hover: 4, lift: 0.3 })],
  ],
  active: [[0, P({ lean: 0.18, gx: 22, gy: -52, ang: 0.0, two: 24, x: 4, crouch: 3 })], [1, P({ lean: 0.28, gx: 26, gy: -40, ang: 0.4, two: 22, x: 6, crouch: 7, hover: -3 })]],
  recovery: [[0, P({ lean: 0.28, gx: 26, gy: -40, ang: 0.42, two: 22, x: 6, crouch: 7, hover: -3 })], [0.4, P({ lean: 0.2, gx: 24, gy: -42, ang: 0.38, two: 22, x: 5, crouch: 5 })], [1, POSES.guard]],
};
// the air chop out of a levitation
const AIR = {
  startup: [[0, P({ gx: 8, gy: -66, ang: -2.2, two: 20, lift: 0.5 })], [1, P({ gx: 6, gy: -70, ang: -2.5, two: 20, lift: 0.5 })]],
  active: [[0, P({ lean: 0.16, gx: 20, gy: -58, ang: -0.6, two: 22, lift: 0.45 })], [1, P({ lean: 0.24, gx: 24, gy: -50, ang: 0.85, two: 20, lift: 0.4 })]],
  recovery: [[0, P({ lean: 0.24, gx: 24, gy: -50, ang: 0.85, two: 20, lift: 0.4 })], [1, P({ lean: 0.1, gx: 18, gy: -54, ang: 0.4, two: 20, lift: 0.4 })]],
};

// Interpolate a key list at t (0..1). Keys: [[t, pose], ...].
function keyed(keys, t, ease = smooth) {
  if (t <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) {
    if (t <= keys[i][0]) {
      const [t0, a] = keys[i - 1];
      const [t1, b] = keys[i];
      return blend(a, b, ease((t - t0) / Math.max(1e-6, t1 - t0)));
    }
  }
  return keys[keys.length - 1][1];
}

function blend(a, b, t) {
  const o = {};
  for (const k in BASE) {
    if (k === 'ang') o.ang = lerpAng(a.ang, b.ang, t);
    else if (k === 'two') {
      if (a.two == null && b.two == null) o.two = null;
      else if (a.two == null) o.two = t > 0.5 ? b.two : null;
      else if (b.two == null) o.two = t < 0.5 ? a.two : null;
      else o.two = lerp(a.two, b.two, t);
    } else o[k] = lerp(a[k], b[k], t);
  }
  return o;
}

// Pose from a move's phase timing, like the sprite views: startup keys over the
// startup frames, active over the active frames, recovery over the recovery.
function movePose(set, m, fr) {
  const ph = movePhase(m, fr);
  if (ph === 'startup') return keyed(set.startup, (fr - 1) / Math.max(1, m.startup - 1), easeIn);
  if (ph === 'active') return keyed(set.active, (fr - m.startup - 1) / Math.max(1, m.active - 1), easeOut);
  return keyed(set.recovery, (fr - m.startup - m.active - 1) / Math.max(1, m.recovery));
}

// ---------------------------------------------------------------- the view

export class MageView {
  constructor(scene, fighter) {
    this.scene = scene;
    this.f = fighter;
    this.pal = fighter.tint ? { ...MAGE_PAL, ...ALT } : MAGE_PAL;
    this.shadow = softShadow(scene, fighter.x, fighter.z, 50, 12, 0.32).setDepth(DEPTH.shadows);
    this.g = scene.add.graphics();
    this.fx = scene.add.graphics().setBlendMode(Phaser.BlendModes.ADD);
    this.heading = new Heading();
    this.pose = { ...POSES.idle };
    // secondary motion (springs, per screen frame)
    this.sec = {
      trail: 0, trailV: 0, beard: 0, beardV: 0, cloak: 0, cloakV: 0,
      charms: [0, 0, 0, 0, 0].map(() => ({ a: 0, v: 0 })),
      wave: 0, t: Math.random() * 100, lastVx: 0, headLook: 0, nextLook: 120,
    };
    this.age = 0;
  }

  // ------------------------------------------------------------ pose selection

  targetPose() {
    const f = this.f;
    const st = f.state;
    const fr = f.fsm.frame;
    const m = f.move;
    const K = f.stats.kit;
    const speed = Math.hypot(f.vx, f.vz) / Math.max(1, f.stats.walkSpeed);
    switch (st) {
      case 'walk': {
        const p = blend(POSES.idle, POSES.move, clamp01(speed));
        p.lean += Math.max(0, speed - 0.7) * 0.06;
        return p;
      }
      case 'light1': return movePose(L1, m, fr);
      case 'light2': return movePose(L2, m, fr);
      case 'light3': return movePose(L3, m, fr);
      case 'airAttack': return movePose(AIR, m, fr);
      case 'block': return POSES.block;
      case 'parry': return { ...POSES.block, glow: f.parryActive ? 1.4 : 0.8 };
      case 'bolt': return this.boltPose(f, fr, m, K);
      case 'force': return this.forcePose(f, fr, m);
      case 'ward': return this.wardPose(f, fr, K);
      case 'blink': return this.blinkPose(f, fr, K);
      case 'jump': {
        const up = f.vh > 0;
        return P({ lean: 0.06, gx: 14, gy: -54, ang: -1.45, ox: -8, oy: -52, open: 0.8, lift: up ? 0.65 : 0.35, glow: 0.7 });
      }
      case 'hitstun': {
        const t = clamp01(fr / 8);
        const snap = 1 - easeOut(t);
        // snapped back, hover dipping, then magic catches him and he steadies
        return P({ lean: -0.26 * snap - 0.04, hover: -5 * snap, x: -3 * snap, gx: 10, gy: -56, ang: -2.0 + t * 0.5, ox: -6, oy: -50, open: 0.9, lift: 0.3 * snap, head: -0.2 * snap });
      }
      case 'stagger':
      case 'guardBreak': {
        const w = Math.sin(fr * 0.35);
        return P({ lean: -0.12 + w * 0.06, hover: -3, gx: 10, gy: -50, ang: -2.1 + w * 0.2, ox: -4, oy: -48, open: 1, lift: 0.2, head: w * 0.12 });
      }
      case 'knockdown': {
        if (f.lyingSince == null) {
          // levitation broken: flung, limbs loose
          const t = clamp01(fr / 14);
          return P({ rot: -0.4 - t * 0.7, ground: 1, lean: -0.2, gx: 4, gy: -64, ang: -2.6, ox: -14, oy: -64, open: 1, lift: 0.6, head: -0.25 });
        }
        return P({ rot: -Math.PI / 2, ground: 1, lean: 0, gx: 10, gy: -40, ang: -2.9, ox: -2, oy: -36, open: 1, lift: 0.1, glow: 0.2 });
      }
      case 'getup': {
        // rising off the floor on magic: horizontal first, then tilting upright
        const t = fr / Math.max(1, f.stats.getupFrames);
        const rise = easeOut(clamp01(t / 0.55));
        const tilt = smooth(clamp01((t - 0.3) / 0.6));
        return P({ rot: -Math.PI / 2 * (1 - tilt), ground: 1 - smooth(clamp01((t - 0.2) / 0.8)), y: -rise * 18 * (1 - tilt), lean: 0.02, gx: 12, gy: -48, ang: lerp(-2.9, -1.5, tilt), ox: 2, oy: -44, open: 0.6, lift: -0.2 * (1 - tilt), glow: 0.9 });
      }
      case 'dead':
        return P({ rot: -Math.PI / 2, ground: 1, gx: 10, gy: -40, ang: -2.9, ox: -2, oy: -36, open: 1, glow: 0 });
      case 'execute': return this.finisherPose(f, fr);
      default: return POSES.idle;
    }
  }

  boltPose(f, fr, m, K) {
    const raise = P({ lean: -0.04, gx: 8, gy: -74, ang: -1.72, ox: -2, oy: -66, open: 1, glow: 1.1, lift: 0.1 });
    if (!f.boltFired) {
      if (fr < m.startup) return blend(POSES.idle, raise, easeOut(fr / m.startup));
      // overcharging: the cage blazes, the robe stirs, sleeves lift
      const c = clamp01(f.boltCharge / K.bolt.charge.fullFrames);
      return { ...raise, glow: 1.2 + c * 1.2, lift: 0.15 + c * 0.25, hover: c * 3, gy: -76 - c * 3 };
    }
    const since = fr - f.boltFired;
    const thrust = P({ lean: 0.18, x: 4, gx: 26, gy: -60, ang: -0.1, ox: 18, oy: -60, open: 1, glow: 1.6 });
    const kick = P({ lean: 0.08, x: 2, gx: 22, gy: -62, ang: -0.45, ox: 12, oy: -58, open: 0.8, glow: 0.9 });
    if (since < 3) return blend(raise, thrust, easeOut(since / 3));
    if (since < 10) return blend(thrust, kick, smooth((since - 3) / 7));
    return blend(kick, POSES.idle, smooth((since - 10) / Math.max(1, m.recovery - 10)));
  }

  forcePose(f, fr, m) {
    const coil = P({ lean: -0.12, x: -3, gx: 8, gy: -50, ang: -1.75, ox: 0, oy: -62, open: 0.1, glow: 0.6 });
    const push = P({ lean: 0.2, x: 4, gx: 10, gy: -52, ang: -1.85, ox: 40, oy: -62, open: 1, sigil: 1, trail: 16, glow: 0.8 });
    if (fr <= m.startup) return blend(POSES.idle, coil, easeOut(fr / m.startup));
    const since = fr - m.startup;
    if (since <= 2) return blend(coil, push, easeOut(since / 2));
    if (since <= 10) return { ...push, sigil: 1 - (since - 2) / 8 };
    return blend(push, POSES.idle, smooth((since - 10) / Math.max(1, m.recovery - 9)));
  }

  wardPose(f, fr, K) {
    const B = K.barrier;
    const up = P({ lean: -0.06, gx: 6, gy: -86, ang: -1.57, two: 18, glow: 1.4, lift: 0.25, hover: 4 });
    const slam = P({ lean: 0.18, x: 4, gx: 24, gy: -44, ang: -1.57, two: 18, crouch: 6, hover: -2, glow: 2, lift: 0.4, trail: -6 });
    if (!f.wardKind) return blend(POSES.idle, up, easeOut(fr / 10));
    const t = fr - f.wardAt;
    if (t < B.castAt - 3) return { ...up, glow: 1.4 + t * 0.05 };
    if (t < B.castAt) return blend(up, slam, easeIn((t - (B.castAt - 3)) / 3));
    const after = t - B.castAt;
    if (after < 6) return slam;
    return blend(slam, POSES.idle, smooth((after - 6) / Math.max(1, B.recovery - 6)));
  }

  blinkPose(f, fr, K) {
    const B = K.blink;
    const base = { ...POSES.idle };
    if (fr < B.vanishAt) {
      const t = fr / B.vanishAt; // breaking apart
      return { ...base, alpha: 1 - t, sx: 1 - t * 0.35, sy: 1 + t * 0.18, glow: 1.4 };
    }
    if (fr < B.arriveAt) return { ...base, alpha: 0 };
    const t = clamp01((fr - B.arriveAt) / 4); // re-forming
    return { ...base, alpha: t, sx: 0.7 + 0.3 * easeOut(t), sy: 1.15 - 0.15 * easeOut(t), glow: 1.4 - t * 0.6, crouch: (1 - t) * 4 };
  }

  finisherPose(f, fr) {
    const ex = f.exec;
    if (!ex) return POSES.idle;
    const F = MAGE_FINISHERS[ex.kind];
    if (ex.kind === 'storm') {
      const high = P({ lean: -0.06, gx: 6, gy: -88, ang: -1.62, ox: -6, oy: -64, open: 1, glow: 1.6, lift: 0.2, hover: 3 });
      const strike = P({ lean: 0.2, x: 4, gx: 24, gy: -62, ang: -0.35, ox: 10, oy: -56, open: 1, glow: 2.2, lift: 0.35 });
      if (fr < F.lock) return POSES.idle;
      if (fr < F.gather) return blend(POSES.idle, high, easeOut((fr - F.lock) / (F.gather - F.lock)));
      if (fr < F.strike - 2) return { ...high, glow: 1.6 + (fr - F.gather) * 0.05, hover: 3 + (fr - F.gather) * 0.08 };
      if (fr < F.strike + 2) return blend(high, strike, easeIn((fr - (F.strike - 2)) / 4));
      if (fr < F.strike + 22) return strike;
      return blend(strike, POSES.idle, smooth((fr - F.strike - 22) / 24));
    }
    if (ex.kind === 'rupture') {
      const reach = P({ lean: 0.1, gx: 10, gy: -50, ang: -1.75, ox: 36, oy: -66, open: 1, sigil: 0.6, glow: 0.9 });
      if (fr < F.pull) return blend(POSES.idle, reach, easeOut(fr / F.pull));
      if (fr < F.pull + F.pullFrames) return { ...reach, ox: 36 - Math.sin(clamp01((fr - F.pull) / F.pullFrames) * Math.PI) * 8 }; // the pull: a draw of the arm
      if (fr < F.crush) return reach;
      if (fr < F.burst) {
        const c = (fr - F.crush) / (F.burst - F.crush);
        return { ...reach, open: 1 - smooth(c) * 0.85, oy: -66 + c * 2, sigil: 0.6 + c * 0.6, glow: 0.9 + c };
      }
      if (fr < F.burst + 3) return { ...reach, open: 0, ox: 32, oy: -62, sigil: 1.5 }; // the fist snaps shut
      return blend({ ...reach, open: 0, ox: 32 }, POSES.idle, smooth((fr - F.burst - 3) / 26));
    }
    // embers: gone, back in the runner's path, the staff slammed down, the gate burns
    const slam = P({ lean: 0.12, gx: 22, gy: -46, ang: -1.57, two: 20, crouch: 5, glow: 1.8, lift: 0.3 });
    const up = P({ lean: -0.04, gx: 10, gy: -78, ang: -1.57, two: 20, glow: 1.3 });
    if (fr < F.vanish) return { ...POSES.idle, alpha: 1 - fr / F.vanish, glow: 1.4 };
    if (fr < F.arrive) return { ...POSES.idle, alpha: 0 };
    if (fr < F.arrive + 4) return { ...up, alpha: (fr - F.arrive) / 4 };
    if (fr < F.slam - 2) return up;
    if (fr < F.slam + 1) return blend(up, slam, easeIn((fr - F.slam + 2) / 3));
    if (fr < F.release) return { ...slam, lift: 0.3 + Math.max(0, Math.sin((fr - F.erupt) * 0.3)) * 0.25 * (fr > F.erupt ? 1 : 0) };
    return blend(slam, { ...POSES.idle, lean: -0.05, head: -0.1 }, smooth((fr - F.release) / 26));
  }

  // ------------------------------------------------------------ per frame

  update() {
    const f = this.f;
    const S = this.sec;
    this.age++;
    S.t += 1;
    const st = f.state;
    // how quickly the body moves to the new pose: snappy in attacks, soft on the move
    const snap = ['light1', 'light2', 'light3', 'airAttack', 'bolt', 'force', 'ward', 'execute', 'blink', 'hitstun', 'knockdown', 'getup'].includes(st) ? 0.62 : 0.2;
    const frozen = f.hitstop > 0;
    const target = this.targetPose();
    if (!frozen) this.pose = blend(this.pose, target, snap);
    const p = this.pose;

    // which way he's seen from while gliding (view/Heading.js)
    if (st === 'walk' && !frozen) this.heading.update(f.vx, f.vz);
    else if (st !== 'walk') this.heading.reset();
    const view = this.heading.dir.startsWith('up') ? (this.heading.dir === 'up' ? 'back' : 'backQ') : this.heading.dir.startsWith('down') ? (this.heading.dir === 'down' ? 'front' : 'frontQ') : 'side';

    // ---- secondary motion
    if (!frozen) {
      const fwd = f.vx * f.facing;
      const accel = (fwd - S.lastVx);
      S.lastVx = fwd;
      const speed = Math.hypot(f.vx, f.vz);
      const want = Math.max(-8, Math.min(26, fwd * 0.07 + Math.abs(f.vz) * 0.03)) + p.trail;
      S.trailV += (want - S.trail) * 0.12; S.trailV *= 0.78; S.trail += S.trailV;
      S.beardV += (S.trail * 0.25 - accel * 0.04 - S.beard) * 0.1; S.beardV *= 0.82; S.beard += S.beardV;
      S.cloakV += (S.trail * 0.6 - S.cloak) * 0.07; S.cloakV *= 0.86; S.cloak += S.cloakV;
      S.wave += 0.05 + speed * 0.0009;
      for (const [i, c] of S.charms.entries()) {
        c.v += -c.a * (0.06 + i * 0.008) - accel * 0.0016 + Math.sin(S.t * 0.031 + i * 1.9) * 0.0012;
        c.v *= 0.93;
        c.a += c.v;
      }
      // the occasional glance around while idle
      if (st === 'idle' && --S.nextLook <= 0) { S.lookTo = (Math.random() - 0.4) * 0.22; S.nextLook = 150 + Math.random() * 220; }
      if (st !== 'idle') S.lookTo = 0;
      S.headLook += ((S.lookTo ?? 0) - S.headLook) * 0.05;
    }

    // ---- hover height
    const H = f.stats.hover;
    const drift = Math.sin(S.t * H.driftRate) * H.drift;
    const floatH = (H.height + drift + p.hover) * (1 - p.ground);

    // ---- place the drawing
    const k = depthScale(f.z);
    const g = this.g;
    const flash = f.flash > 0 && (f.flash > 3 || this.age % 2 === 0);
    g.clear();
    this.fx.clear();
    const gone = f.blinkGone || p.alpha <= 0.01;
    const lying = Math.abs(p.rot) > 1.2;
    g.setPosition(f.x, f.z - f.h - (lying ? 9 : 0)).setDepth(f.z);
    g.setScale(f.facing * k * p.sx * p.spin, k * p.sy);
    g.rotation = p.rot * f.facing;
    g.setAlpha(gone ? 0 : p.alpha);
    this.fx.setPosition(g.x, g.y).setDepth(f.z + 0.4).setScale(g.scaleX, g.scaleY).setAlpha(gone ? 0 : 1);
    this.fx.rotation = g.rotation;
    if (!gone) {
      const ctx = { g, fx: this.fx, p, S, floatH, pal: this.pal, flash, view, age: this.age, cool: f.cool?.ward ?? 0, f };
      if (view === 'back' || view === 'backQ') drawBack(ctx, view === 'backQ');
      else if (view === 'front' || view === 'frontQ') drawFront(ctx, view === 'frontQ');
      else drawSide(ctx);
    }

    // shadow on the floor: smaller and softer the higher he floats
    const air = f.h + floatH;
    const ss = Math.max(0.45, 1 - air / 160);
    this.shadow.setPosition(f.x, f.z).setScale(ss * k).setAlpha((gone ? 0 : 0.32 * ss) * p.alpha);

    // faint motes drifting down off him, more as he glides faster
    const gore = this.scene.gore;
    if (gore && !gone && !frozen && p.ground < 0.5 && f.air < 1) {
      const speed = Math.hypot(f.vx, f.vz);
      const every = speed > 60 ? 3 : 9;
      if (this.age % every === 0) {
        gore.spawn({
          x: f.x - f.facing * (speed > 60 ? 10 + Math.random() * 16 : (Math.random() - 0.5) * 18), z: f.z + (Math.random() - 0.5) * 6, h: floatH * (0.3 + Math.random() * 0.6),
          vx: -f.facing * speed * 0.2 + (Math.random() - 0.5) * 20, vz: 0, vh: 10 + Math.random() * 25,
          tint: Math.random() < 0.65 ? 0xffa040 : 0x7a8cff, scale: 0.16 + Math.random() * 0.14, decal: false, life: 14 + Math.floor(Math.random() * 12),
        });
      }
    }
  }

  // ---- gore hand-off (he is never dismembered: a hero)
  hideAll() { this.g.setVisible(false); this.fx.setVisible(false); this.shadow.setVisible(false); }

  destroy() {
    this.g.destroy();
    this.fx.destroy();
    this.shadow.destroy();
  }
}

// ---------------------------------------------------------------- drawing

// A colour, or white while the hit-flash is on.
const C = (ctx, key) => (ctx.flash ? 0xffffff : ctx.pal[key]);

function poly(g, pts, color, alpha = 1) {
  g.fillStyle(color, alpha);
  g.beginPath();
  g.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) g.lineTo(pts[i].x, pts[i].y);
  g.closePath();
  g.fillPath();
}
function outlinePoly(g, pts, color, w = 1, alpha = 1) {
  g.lineStyle(w, color, alpha);
  g.beginPath();
  g.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) g.lineTo(pts[i].x, pts[i].y);
  g.closePath();
  g.strokePath();
}
function line(g, a, b, color, w, alpha = 1) {
  g.lineStyle(w, color, alpha);
  g.lineBetween(a.x, a.y, b.x, b.y);
}
const pt = (x, y) => ({ x, y });
const add = (a, b) => ({ x: a.x + b.x, y: a.y + b.y });
const sc = (a, k) => ({ x: a.x * k, y: a.y * k });
const rot = (v, a) => ({ x: v.x * Math.cos(a) - v.y * Math.sin(a), y: v.x * Math.sin(a) + v.y * Math.cos(a) });

// Two-bone arm: shoulder to hand target. The elbow bends down (and out when the arm is
// raised). Returns { e, h } — the hand is where the arm really reaches.
function arm(s, target, a = 15, b = 16) {
  const dx = target.x - s.x;
  const dy = target.y - s.y;
  let d = Math.hypot(dx, dy);
  const max = (a + b) * 1.04;
  let h = target;
  if (d > max) { h = { x: s.x + dx / d * max, y: s.y + dy / d * max }; d = max; }
  const k = d / (a + b);
  const aa = a * Math.max(k, 0.98);
  const bb = b * Math.max(k, 0.98);
  const base = Math.atan2(h.y - s.y, h.x - s.x);
  const cos = Math.max(-1, Math.min(1, (aa * aa + d * d - bb * bb) / (2 * aa * Math.max(1e-3, d))));
  const off = Math.acos(cos);
  const e1 = { x: s.x + Math.cos(base + off) * aa, y: s.y + Math.sin(base + off) * aa };
  const e2 = { x: s.x + Math.cos(base - off) * aa, y: s.y + Math.sin(base - off) * aa };
  return { e: e1.y > e2.y ? e1 : e2, h };
}

// A wide bell sleeve from shoulder through elbow to the wrist, its mouth hanging open.
function sleeve(ctx, s, e, h, near) {
  const g = ctx.g;
  const dir = Math.atan2(h.y - e.y, h.x - e.x);
  const n1 = { x: -Math.sin(Math.atan2(e.y - s.y, e.x - s.x)), y: Math.cos(Math.atan2(e.y - s.y, e.x - s.x)) };
  const n2 = { x: -Math.sin(dir), y: Math.cos(dir) };
  const w0 = 6.5;
  const w1 = 8;
  const w2 = 12.5;
  const mouth = add(h, sc({ x: Math.cos(dir), y: Math.sin(dir) }, -3.5));
  const hang = 7 + Math.max(0, Math.cos(dir)) * 3; // the open mouth sags under its weight
  const pts = [
    add(s, sc(n1, w0)), add(e, sc(n1, w1)), add(mouth, sc(n2, w2)),
    add(mouth, { x: 0, y: hang }), add(mouth, sc(n2, -w2)), add(e, sc(n1, -w1)), add(s, sc(n1, -w0)),
  ];
  poly(g, pts, C(ctx, near ? 'navyL' : 'navyD'));
  // the inside of the mouth, in shadow
  poly(g, [add(mouth, sc(n2, w2 - 1)), add(mouth, { x: 0, y: hang - 1 }), add(mouth, sc(n2, -w2 + 1)), add(h, { x: 0, y: 1 })], C(ctx, 'outline'), 0.85);
  // light along the top of the sleeve, a fold down the middle
  line(g, add(s, sc(n1, -w0 + 1.6)), add(mouth, sc(n2, -w2 + 2.2)), C(ctx, near ? 'navyH' : 'navy'), 2.2);
  line(g, add(e, sc(n1, 1)), add(mouth, sc(n2, 3)), C(ctx, 'navyD'), 1.2);
  // the patterned cuff: a cream band edged in gold, flecked with gold
  const ud = { x: Math.cos(dir), y: Math.sin(dir) };
  const c0 = add(mouth, sc(ud, -3.2));
  poly(g, [add(c0, sc(n2, w2 - 1.2)), add(mouth, sc(n2, w2)), add(mouth, sc(n2, -w2)), add(c0, sc(n2, -w2 + 1.2))], C(ctx, 'cream'));
  line(g, add(mouth, sc(n2, w2)), add(mouth, sc(n2, -w2)), C(ctx, 'gold'), 1.4);
  line(g, add(c0, sc(n2, w2 - 1.2)), add(c0, sc(n2, -w2 + 1.2)), C(ctx, 'goldD'), 1.1);
  for (let i = -2; i <= 2; i++) { const q = add(lerpPt(c0, mouth, 0.5), sc(n2, i * w2 * 0.36)); g.fillStyle(C(ctx, 'goldD'), 1).fillCircle(q.x, q.y, 0.7); }
  outlinePoly(g, pts, C(ctx, 'outline'), near ? 1.6 : 1.2);
  // embroidered star on the upper sleeve
  const mid = add(e, sc(n1, -2));
  star(g, mid, 1.6, C(ctx, 'gold'));
}

function hand(ctx, h, open, angle, near) {
  const g = ctx.g;
  g.fillStyle(C(ctx, 'outline'), 1).fillCircle(h.x, h.y, 3.4);
  g.fillStyle(C(ctx, near ? 'skin' : 'skinD'), 1).fillCircle(h.x, h.y, 2.6);
  if (open > 0.35) {
    // fingers spread
    for (let i = -1; i <= 1; i++) {
      const a = angle + i * 0.38 * open;
      const tip = add(h, { x: Math.cos(a) * (3 + open * 3), y: Math.sin(a) * (3 + open * 3) });
      line(g, h, tip, C(ctx, 'outline'), 2.2);
      line(g, h, tip, C(ctx, near ? 'skin' : 'skinD'), 1.2);
    }
  }
}

function star(g, c, r, color) {
  g.fillStyle(color, 1);
  g.fillTriangle(c.x - r, c.y, c.x + r, c.y, c.x, c.y - r * 2.2);
  g.fillTriangle(c.x - r, c.y, c.x + r, c.y, c.x, c.y + r * 2.2);
  g.fillRect(c.x - r * 2.2, c.y - r * 0.35, r * 4.4, r * 0.7);
}
function sun(g, c, r, color, dark) {
  g.fillStyle(color, 1).fillCircle(c.x, c.y, r);
  g.fillStyle(dark, 1).fillCircle(c.x, c.y, r * 0.45);
  g.lineStyle(1, color, 1);
  for (let i = 0; i < 8; i++) {
    const a = i * TAU / 8;
    g.lineBetween(c.x + Math.cos(a) * r * 1.2, c.y + Math.sin(a) * r * 1.2, c.x + Math.cos(a) * r * 1.8, c.y + Math.sin(a) * r * 1.8);
  }
}
function moon(g, c, r, color, bg) {
  g.fillStyle(color, 1).fillCircle(c.x, c.y, r);
  g.fillStyle(bg, 1).fillCircle(c.x + r * 0.45, c.y - r * 0.2, r * 0.85);
}

// The tattered robe hem from x0 (front) to x1 (back): a wavy, jagged edge.
function hem(ctx, x0, x1, y, n, amp, phase, tatter = 3) {
  const pts = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const x = lerp(x0, x1, t);
    const jag = [0, tatter, 1, tatter * 1.3, 0.4, tatter * 0.8][i % 6];
    pts.push(pt(x, y + jag + Math.sin(phase + i * 0.9) * amp * (0.4 + t)));
  }
  return pts;
}

// The staff from the hand: twisted wood, chain wrapped round, the lantern cage on top.
function staff(ctx, G, ang, glow) {
  const g = ctx.g;
  const u = { x: Math.cos(ang), y: Math.sin(ang) };
  const n = { x: -u.y, y: u.x };
  const top = add(G, sc(u, 60));
  const bot = add(G, sc(u, -46));
  line(g, bot, top, C(ctx, 'outline'), 6.6);
  line(g, bot, top, C(ctx, 'wood'), 4.6);
  line(g, add(bot, sc(n, -1.2)), add(top, sc(n, -1.2)), C(ctx, 'woodL'), 1); // a lit edge
  // the twist: light and dark grooves spiralling up
  for (let s = -42; s < 56; s += 5) {
    const a = add(add(G, sc(u, s)), sc(n, -1.6));
    const b = add(add(G, sc(u, s + 3)), sc(n, 1.6));
    line(g, a, b, C(ctx, (s / 5) % 2 ? 'woodL' : 'woodD'), 1.1);
  }
  // chain wound round the upper shaft
  for (let s = 8; s < 52; s += 3.2) {
    const w = Math.sin(s * 0.55) * 2.3;
    const c = add(add(G, sc(u, s)), sc(n, w));
    g.fillStyle(C(ctx, 'outline'), 1).fillCircle(c.x, c.y, 1.4);
    g.fillStyle(C(ctx, Math.sin(s * 0.55) > 0 ? 'steel' : 'steelD'), 1).fillCircle(c.x, c.y, 0.85);
  }
  // iron butt cap
  g.fillStyle(C(ctx, 'steelD'), 1).fillCircle(bot.x, bot.y, 2.3);
  // ---- the lantern cage
  const base = top;
  const L = 1.35; // the lantern's size
  const cage = add(base, sc(u, 14 * L));
  const tip = add(base, sc(u, 24 * L));
  // bars
  // dark iron backing so the bars read against anything
  poly(g, [add(base, sc(n, -3.4 * L)), add(add(base, sc(u, 7 * L)), sc(n, -4.9 * L)), add(cage, sc(n, -2.6 * L)), add(cage, sc(n, 2.6 * L)), add(add(base, sc(u, 7 * L)), sc(n, 4.9 * L)), add(base, sc(n, 3.4 * L))], C(ctx, 'outline'), 0.75);
  for (const o of [-4.5, -1.6, 1.6, 4.5]) {
    const a = add(base, sc(n, o * 0.7 * L));
    const m = add(add(base, sc(u, 7 * L)), sc(n, o * 1.05 * L));
    const b = add(cage, sc(n, o * 0.55 * L));
    line(g, a, m, C(ctx, 'outline'), 2.2);
    line(g, m, b, C(ctx, 'outline'), 2.2);
    line(g, a, m, C(ctx, 'iron'), 1.2);
    line(g, m, b, C(ctx, 'iron'), 1.2);
  }
  // the crystal inside: red-orange, a bright heart (brighter while magic gathers)
  const cc = add(base, sc(u, 7 * L));
  const dia = [add(cc, sc(u, 5.5)), add(cc, sc(n, 3.8)), add(cc, sc(u, -5.5)), add(cc, sc(n, -3.8))];
  poly(g, dia, ctx.flash ? 0xffffff : 0xa8200a);
  poly(g, [add(cc, sc(u, 3.8)), add(cc, sc(n, 2.3)), add(cc, sc(u, -3.8)), add(cc, sc(n, -1.5))], C(ctx, 'ember'));
  g.fillStyle(ctx.flash ? 0xffffff : 0xffe2a0, Math.min(1, 0.6 + glow * 0.3)).fillCircle(cc.x, cc.y, 1.1 + glow * 0.4);
  // gold rings top and bottom
  line(g, add(base, sc(n, -5 * L)), add(base, sc(n, 5 * L)), C(ctx, 'outline'), 3.4);
  line(g, add(base, sc(n, -5 * L)), add(base, sc(n, 5 * L)), C(ctx, 'gold'), 2.2);
  line(g, add(cage, sc(n, -4 * L)), add(cage, sc(n, 4 * L)), C(ctx, 'outline'), 3.2);
  line(g, add(cage, sc(n, -4 * L)), add(cage, sc(n, 4 * L)), C(ctx, 'gold'), 2);
  // spikes: a long centre spike, two raked side spikes, two little ones at the base
  line(g, cage, tip, C(ctx, 'outline'), 2.6);
  line(g, cage, tip, C(ctx, 'steelL'), 1.2);
  for (const s of [-1, 1]) {
    const a = add(cage, sc(n, s * 3.5 * L));
    const b = add(add(cage, sc(u, 7 * L)), sc(n, s * 8 * L));
    line(g, a, b, C(ctx, 'outline'), 2.6);
    line(g, a, b, C(ctx, 'steel'), 1.2);
    const c0 = add(base, sc(n, s * 5 * L));
    const c1 = add(add(base, sc(u, -3)), sc(n, s * 9.5 * L));
    line(g, c0, c1, C(ctx, 'outline'), 2.2);
    line(g, c0, c1, C(ctx, 'steel'), 1.1);
  }
  // charms hanging off the cage on little chains (they hang straight down, swinging)
  const sw = ctx.S.charms[4].a;
  for (const s of [-1, 1]) {
    const from = add(base, sc(n, s * 5 * L));
    const to = add(from, { x: Math.sin(sw + s * 0.2) * 9, y: Math.cos(sw * 0.5) * 12 });
    line(g, from, to, C(ctx, 'goldD'), 0.8);
    star(g, to, 1.2, C(ctx, 'gold'));
  }
  // ---- glow (additive layer): the heart of the cage, breathing, flaring with magic
  const fx = ctx.fx;
  const flick = 0.85 + Math.sin(ctx.age * 0.37) * 0.08 + Math.sin(ctx.age * 1.13) * 0.05;
  const cool = ctx.cool > 0 ? 0.55 : 1; // dimmer while the barrier recharges
  const gI = Math.max(0, glow) * flick * cool;
  fx.fillStyle(0xff4a10, 0.16 * gI).fillCircle(cc.x, cc.y, 9 + gI * 6);
  fx.fillStyle(0xff8a30, 0.28 * gI).fillCircle(cc.x, cc.y, 5 + gI * 2.5);
  fx.fillStyle(0xffe0a0, 0.5 * Math.min(1, gI)).fillCircle(cc.x, cc.y, 2.2 + gI);
  if (glow > 1.2) {
    // flaring: little arcs crackling off the spikes
    for (let i = 0; i < 2; i++) {
      const a = ang + (Math.random() - 0.5) * 2.4;
      const r = 8 + Math.random() * 8 * (glow - 1);
      const p1 = add(cc, { x: Math.cos(a) * 4, y: Math.sin(a) * 4 });
      const p2 = add(cc, { x: Math.cos(a + 0.4) * r * 0.6 + (Math.random() - 0.5) * 3, y: Math.sin(a + 0.4) * r * 0.6 });
      const p3 = add(cc, { x: Math.cos(a) * r, y: Math.sin(a) * r });
      fx.lineStyle(1.2, 0xffd890, 0.9).lineBetween(p1.x, p1.y, p2.x, p2.y);
      fx.lineBetween(p2.x, p2.y, p3.x, p3.y);
    }
  }
  return { top, cc };
}

// The fire sigil he holds out in his free hand (the reference's open palm of flame).
function sigil(ctx, h, k) {
  if (k <= 0.02) return;
  const fx = ctx.fx;
  const r = 7 + k * 3;
  const c = add(h, { x: 6, y: -1 });
  fx.lineStyle(1.3, 0xff8a30, 0.8 * k).strokeCircle(c.x, c.y, r);
  fx.lineStyle(1, 0xffc060, 0.6 * k).strokeCircle(c.x, c.y, r * 0.62);
  for (let i = 0; i < 8; i++) {
    const a = i * TAU / 8 + ctx.age * 0.05;
    fx.lineBetween(c.x + Math.cos(a) * r * 0.66, c.y + Math.sin(a) * r * 0.66, c.x + Math.cos(a) * r * 0.95, c.y + Math.sin(a) * r * 0.95);
  }
  fx.lineStyle(1.2, 0xffe0a0, 0.9 * k);
  fx.lineBetween(c.x - r * 0.5, c.y, c.x + r * 0.5, c.y);
  fx.lineBetween(c.x, c.y - r * 0.5, c.x, c.y + r * 0.5);
  fx.fillStyle(0xff6a20, 0.2 * k).fillCircle(c.x, c.y, r * 1.4);
}

// Armoured boot hanging from the robe, toe angled down (he's floating).
function boot(ctx, x, y, dangle, near) {
  const g = ctx.g;
  const toe = { x: x + Math.cos(0.5 + dangle) * 8, y: y + Math.sin(0.5 + dangle) * 8 };
  const heel = { x: x - 3, y: y - 1 };
  const pts = [pt(x - 4, y - 10), pt(x + 3, y - 10), toe, pt(toe.x - 2, toe.y + 1.5), heel];
  poly(g, pts.map((q) => add(q, { x: 0, y: 0.6 })), C(ctx, 'outline'));
  poly(g, pts, C(ctx, near ? 'steel' : 'steelD'));
  line(g, pt(x - 4, y - 6), pt(x + 3, y - 5), C(ctx, 'leatherD'), 1.4);   // strap
  line(g, pt(x - 2, y - 9), pt(x + 1.5, y - 9), C(ctx, near ? 'steelL' : 'steel'), 1); // plate edge
  line(g, toe, pt(x + 1, y - 2), C(ctx, near ? 'steelL' : 'steel'), 0.8);
}

// ---------------------------------------------------------------- side view (the main one)

function drawSide(ctx) {
  const { g, p, S } = ctx;
  const hov = -ctx.floatH;
  const pelvis = pt(p.x, -44 + p.crouch + hov + p.y);
  const R = (dx, dy) => add(pelvis, rot(pt(dx, dy), p.lean));
  const trail = S.trail;
  const lift = p.lift;
  const hemY = hov - 7 - lift * 26;
  const amp = 0.8 + Math.min(3.5, Math.abs(trail) * 0.12) + lift * 2;

  // ---- cloak (behind everything): from the shoulders, streaming further than the robe
  const cl = S.cloak;
  const cloakBack = hem(ctx, pelvis.x + 2 - trail * 0.5, pelvis.x - 25 - cl * 1.3, hemY + 1, 7, amp * 1.3, S.wave * 1.1 + 1, 3.5);
  const cloak = [R(7, -31), R(-6, -35), R(-15, -24), R(-20 - cl * 0.25, -6), ...cloakBack.reverse()];
  poly(g, cloak, C(ctx, 'navyD'));
  outlinePoly(g, cloak, C(ctx, 'outline'), 1.4);
  // inner lining and embroidered band down its trailing edge
  line(g, R(-15, -24), cloakBack[0], C(ctx, 'navy'), 1.5);
  for (let i = 0; i < 4; i++) {
    const t = (i + 0.5) / 4;
    const q = add(R(-17 - cl * 0.15, -18 + t * 20), { x: -cl * 0.6 * t - 2, y: t * (hemY - pelvis.y) * 0.6 });
    moon(g, q, 1.8, C(ctx, 'goldD'), C(ctx, 'navyD'));
  }

  // ---- far arm (behind the body)
  const far = R(-4, -27);
  let off;
  if (p.two != null) {
    const u = { x: Math.cos(p.ang), y: Math.sin(p.ang) };
    off = arm(far, add(add(pelvis, pt(p.gx - p.x, p.gy + 44 + p.crouch * 0)), sc(u, p.two)), 15, 17);
  } else {
    off = arm(far, add(pelvis, pt(p.ox - p.x, p.oy + 44)), 15, 17);
  }
  sleeve(ctx, far, off.e, off.h, false);

  // ---- boots dangling under the hem (toes down: nothing under him)
  const dangle = Math.sin(S.t * 0.04) * 0.08 + Math.min(0.5, Math.abs(trail) * 0.02) - p.ground * 0.5;
  boot(ctx, pelvis.x - 6 - trail * 0.15, hov - 1 + p.ground * 1, dangle + 0.15, false);
  boot(ctx, pelvis.x + 4 - trail * 0.1, hov + 0.5 + p.ground * 0.5, dangle, true);

  // ---- the robe
  const front = hem(ctx, pelvis.x + 18 - trail * 0.25, pelvis.x - 17 - trail * 0.95, hemY, 9, amp, S.wave, 3);
  const robe = [R(8, -31), R(12, -20), R(13.5, -6), R(14, 4), ...front, R(-13, 2), R(-12, -10), R(-9, -24), R(-6, -32)];
  poly(g, robe, C(ctx, 'navy'));
  // shading: the back half in shadow, a band of light down the front
  poly(g, [R(-6, -32), R(-9, -24), R(-12, -10), R(-13, 2), front[front.length - 1], front[front.length - 2], front[front.length - 3], R(-4, 4), R(-4, -20)], C(ctx, 'navyD'), 0.6);
  poly(g, [R(8, -28), R(11.5, -20), R(13, -6), R(13.5, 4), front[1], front[2], R(6, 4), R(5, -14)], C(ctx, 'navyL'), 0.45);
  line(g, R(11, -20), R(13, 2), C(ctx, 'navyH'), 1.4);
  // fold lines down the skirt, swinging with the hem
  for (const [dx, k] of [[-6, 0.7], [2, 0.45], [9, 0.3]]) {
    const top = R(dx, 6);
    const bi = Math.round(lerp(0, front.length - 1, clamp01((pelvis.x + 18 - (pelvis.x + dx)) / 35)));
    line(g, top, add(front[bi], { x: 0, y: -2 }), C(ctx, 'navyD'), 1.4 * k + 0.5);
  }
  // the broad embroidered band along the hem: navy-light ground between gold rules,
  // a run of little suns and crescents along it
  for (let i = 0; i < front.length - 1; i++) {
    const a = front[i]; const b = front[i + 1];
    poly(g, [a, b, add(b, { x: 0, y: -6 }), add(a, { x: 0, y: -6 })], C(ctx, 'navyL'), 0.9);
    line(g, add(a, { x: 0, y: -6 }), add(b, { x: 0, y: -6 }), C(ctx, 'gold'), 1.1);
    line(g, add(a, { x: 0, y: -1 }), add(b, { x: 0, y: -1 }), C(ctx, 'goldD'), 1);
    const m = add(lerpPt(a, b, 0.5), { x: 0, y: -3.5 });
    if (i % 2 === 0) star(g, m, 0.8, C(ctx, 'goldL'));
    else moon(g, m, 1.3, C(ctx, 'gold'), C(ctx, 'navyL'));
  }
  outlinePoly(g, robe, C(ctx, 'outline'), 1.5);
  // gold-trimmed front edge of the robe, neck to hem
  line(g, R(8, -31), R(12, -20), C(ctx, 'gold'), 1.4);
  line(g, R(12, -20), R(13.5, -6), C(ctx, 'gold'), 1.4);
  // the cream inner panel down the front, with its sun and line of glyphs
  const pTop = R(9.5, 2);
  const pBot = front[1];
  const panel = [R(7, 0), R(13.5, 0), add(front[0], { x: -1, y: -1 }), add(pBot, { x: -1, y: -1 }), add(lerpPt(pBot, front[2], 0.5), { x: 0, y: -1 })];
  poly(g, panel, C(ctx, 'cream'));
  line(g, R(8, 0), add(pBot, { x: 0, y: -2 }), C(ctx, 'creamD'), 1);
  sun(g, lerpPt(pTop, front[1], 0.62), 1.7, C(ctx, 'goldD'), C(ctx, 'cream'));
  line(g, lerpPt(pTop, front[1], 0.15), lerpPt(pTop, front[1], 0.45), C(ctx, 'goldD'), 0.9);
  // a big crescent moon on the robe's skirt
  moon(g, lerpPt(R(-4, 8), front[6], 0.5), 2.6, C(ctx, 'gold'), C(ctx, 'navy'));

  // ---- belts, scrolls, tome, charms
  const b1 = [R(13.8, -7), R(14.2, -2.5), R(-12.5, -1), R(-12.5, -5.5)];
  poly(g, b1, C(ctx, 'leather'));
  line(g, b1[0], b1[3], C(ctx, 'leatherL'), 1);
  const b2 = [R(14.2, -1), R(14.5, 2.2), R(-12.8, -4.5), R(-12.5, -8)];
  poly(g, b2, C(ctx, 'leatherD'));
  for (const s of [-8, -2, 4, 10]) g.fillStyle(C(ctx, 'gold'), 1).fillCircle(R(s, -4.5 + s * -0.01).x, R(s, -4.5).y, 0.8);
  const buckle = R(11.5, -4.5);
  g.fillStyle(C(ctx, 'outline'), 1).fillCircle(buckle.x, buckle.y, 3.2);
  sun(g, buckle, 2.2, C(ctx, 'gold'), C(ctx, 'goldD'));
  // scrolls at the back of the hip
  for (const [dx, dy] of [[-12, -1], [-11, 3.5]]) {
    const c = R(dx, dy);
    g.fillStyle(C(ctx, 'outline'), 1).fillRoundedRect(c.x - 6.5, c.y - 2.4, 13, 4.8, 2);
    g.fillStyle(C(ctx, 'cream'), 1).fillRoundedRect(c.x - 6, c.y - 1.9, 12, 3.8, 1.8);
    g.fillStyle(C(ctx, 'creamD'), 1).fillRect(c.x - 6, c.y + 0.6, 12, 1.1);
    g.fillStyle(C(ctx, 'red'), 1).fillCircle(c.x + 4.6, c.y, 1.4);
  }
  // charms on chains from the belt: gold stars and little red lanterns, each swinging
  const charmFrom = [R(4, -1), R(-3, 0), R(9, 0)];
  charmFrom.forEach((c0, i) => {
    const a = S.charms[i].a + p.lean * 0.5;
    const len = [12, 9, 15][i];
    const tip = add(c0, { x: Math.sin(a) * len - trail * 0.12, y: Math.cos(a) * len });
    line(g, c0, tip, C(ctx, 'goldD'), 0.9);
    if (i === 1) {
      g.fillStyle(C(ctx, 'outline'), 1).fillRect(tip.x - 2, tip.y - 0.5, 4, 5.5);
      g.fillStyle(C(ctx, 'red'), 1).fillRect(tip.x - 1.3, tip.y + 0.5, 2.6, 3.5);
      g.fillStyle(C(ctx, 'gold'), 1).fillRect(tip.x - 2, tip.y - 0.5, 4, 1);
      ctx.fx.fillStyle(0xff5a20, 0.3).fillCircle(tip.x, tip.y + 2.2, 3);
    } else star(g, tip, 1.4, C(ctx, 'gold'));
  });
  // the tome, strapped to the front hip, swinging on its strap
  const ta = S.charms[3].a * 0.6;
  const tc = add(R(8, 6), { x: Math.sin(ta) * 4 - trail * 0.08, y: 6 });
  const tome = [rot(pt(-5, -6), ta), rot(pt(5, -6), ta), rot(pt(5, 6), ta), rot(pt(-5, 6), ta)].map((q) => add(q, tc));
  line(g, R(8, 3), add(tc, rot(pt(0, -6), ta)), C(ctx, 'leatherD'), 1.4);
  poly(g, tome.map((q) => add(q, { x: 0.7, y: 0.7 })), C(ctx, 'outline'));
  poly(g, tome, C(ctx, 'leather'));
  line(g, tome[0], tome[3], C(ctx, 'leatherL'), 1.4);
  sun(g, tc, 1.8, C(ctx, 'gold'), C(ctx, 'leather'));

  // ---- the capelet over his shoulders, gold at its scalloped edge
  const capEdge = [R(11, -19), R(6, -16), R(0, -18), R(-6, -16), R(-12, -19)];
  const cape = [R(7, -33), R(12, -26), ...capEdge, R(-12, -27), R(-7, -34)];
  poly(g, cape, C(ctx, 'navy'));
  poly(g, [R(-7, -34), R(-12, -27), R(-12, -19), R(-6, -16), R(-2, -22)], C(ctx, 'navyD'), 0.6);
  line(g, R(6, -33), R(11, -26), C(ctx, 'navyH'), 1.2);
  for (let i = 0; i < capEdge.length - 1; i++) line(g, capEdge[i], capEdge[i + 1], C(ctx, 'gold'), 1.3);
  outlinePoly(g, cape, C(ctx, 'outline'), 1.2);
  for (const q of [R(-6, -24), R(2, -25)]) star(g, q, 1, C(ctx, 'goldD'));

  // ---- chest: the sun amulet on its chain
  const am = R(9, -20);
  line(g, R(5, -31), am, C(ctx, 'goldD'), 0.9);
  sun(g, am, 2.3, C(ctx, 'gold'), C(ctx, 'goldD'));
  line(g, R(-4, -30), R(6, -14), C(ctx, 'leatherD'), 1.3); // shoulder strap

  // ---- head: hood, face, beard
  drawHeadSide(ctx, R(4, -41) , p.lean + p.head + S.headLook);

  // ---- near arm and the staff
  const near = R(5, -27);
  const G = add(pelvis, pt(p.gx - p.x, p.gy + 44));
  const a = arm(near, G, 15, 16);
  const sf = staff(ctx, a.h, p.ang, p.glow);
  // the far hand on the staff (drawn over it, its fingers wrapped round)
  if (p.two != null) {
    hand(ctx, off.h, 0, p.ang, false);
  } else {
    hand(ctx, off.h, p.open, Math.atan2(off.h.y - off.e.y, off.h.x - off.e.x), false);
    sigil(ctx, off.h, p.sigil);
  }
  sleeve(ctx, near, a.e, a.h, true);
  hand(ctx, a.h, 0, p.ang, true);
  // knuckles over the shaft
  line(ctx.g, add(a.h, { x: -1.5, y: -1 }), add(a.h, { x: 1.5, y: 1 }), C(ctx, 'skinD'), 1);
  return sf;
}

const lerpPt = (a, b, t) => ({ x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t) });

function drawHeadSide(ctx, c, tilt) {
  const g = ctx.g;
  const S = ctx.S;
  const H = (dx, dy) => add(c, rot(pt(dx, dy), tilt * 0.6));
  // beard first (it hangs down over the chest, under the hood's edge), swinging
  const bs = S.beard;
  const beard = [H(3, 2), H(9.5, 2.5), H(11, 7), add(H(9, 15), { x: -bs * 0.4, y: 0 }), add(H(7, 22), { x: -bs * 0.8, y: 0 }), add(H(5.5, 28), { x: -bs * 1.1, y: 0 }), add(H(4.5, 22), { x: -bs * 0.8, y: 0 }), add(H(2, 14), { x: -bs * 0.3, y: 0 }), H(1, 6)];
  poly(g, beard, C(ctx, 'beard'));
  outlinePoly(g, beard, C(ctx, 'outline'), 1);
  // braid bands and strands
  for (let i = 0; i < 4; i++) {
    const t = 0.35 + i * 0.16;
    const q = lerpPt(lerpPt(beard[3], beard[7], 0.5), beard[5], t);
    line(g, add(q, { x: -2, y: -0.6 }), add(q, { x: 2, y: 0.6 }), C(ctx, 'beardD'), 1);
  }
  line(g, H(8, 4), add(H(7, 14), { x: -bs * 0.35, y: 0 }), C(ctx, 'beardD'), 0.9);
  line(g, H(4, 5), add(H(4, 13), { x: -bs * 0.3, y: 0 }), C(ctx, 'beardD'), 0.9);
  // the hood
  const hood = [H(-12, 9), H(-12, -3), H(-8, -10), H(-1, -13.5), H(5, -11), H(9.5, -6), H(10.5, 0), H(8, 6), H(4, 7.5), H(-3, 9.5)];
  poly(g, hood, C(ctx, 'navy'));
  poly(g, [H(-12, 9), H(-12, -3), H(-8, -10), H(-4, -9), H(-6, 2), H(-5, 9)], C(ctx, 'navyD'));
  outlinePoly(g, hood, C(ctx, 'outline'), 1.3);
  line(g, H(-1, -13.5), H(5, -11), C(ctx, 'navyH'), 1.2);
  // the opening: deep shadow, the face inside it
  poly(g, [H(4.5, -9.5), H(9, -5.5), H(10, 0), H(8, 5), H(3, 6), H(1, -3)], C(ctx, 'outline'));
  const face = [H(4.2, -7.5), H(7.6, -4.6), H(8.4, -2.2), H(10.6, 0.8), H(8.6, 2), H(8.6, 4), H(4, 5), H(2.6, -2)];
  poly(g, face, C(ctx, 'skin'));
  poly(g, [H(2.6, -2), H(4.2, -7.5), H(5, -2), H(4, 5)], C(ctx, 'skinD'));
  // grey hair falling under the hood
  line(g, H(1.5, -5), H(-0.5, 6), C(ctx, 'hair'), 1.6);
  line(g, H(0.5, -4), H(-1.8, 5), C(ctx, 'beardD'), 1);
  // severe brow, the eye under it with a hard ember glint, the scar
  line(g, H(5.2, -4.4), H(8.2, -3.6), C(ctx, 'beardD'), 1.6);
  g.fillStyle(C(ctx, 'outline'), 1).fillRect(H(6.4, -2.6).x - 1.1, H(6.4, -2.6).y - 0.6, 2.4, 1.2);
  ctx.fx.fillStyle(0xff8a3a, 0.9).fillRect(H(7, -2.6).x - 0.5, H(7, -2.6).y - 0.5, 1, 1);
  line(g, H(6, -6.5), H(7.5, -1.5), C(ctx, 'skinD'), 0.6);
  // moustache over the beard
  poly(g, [H(7.5, 1.8), H(10, 2.6), H(9.5, 4.2), H(6, 3.6)], C(ctx, 'beard'));
  line(g, H(7.5, 2.6), H(9.4, 3.6), C(ctx, 'beardD'), 0.7);
  // gold trim along the hood's edge
  for (let i = 0; i < 4; i++) {
    const q = lerpPt(H(5, -11), H(9, 5), i / 3);
    g.fillStyle(C(ctx, 'gold'), 1).fillCircle(q.x, q.y, 0.7);
  }
}

// ---------------------------------------------------------------- back view

// Gliding away up the screen: the cloak's back with its great gold sun, hood up, the
// lantern over his right shoulder. (quarter: the three-quarter back view)
function drawBack(ctx, quarter) {
  const { g, p, S } = ctx;
  const hov = -ctx.floatH;
  const cx = p.x + (quarter ? 3 : 0);
  const pelvisY = -44 + hov;
  const hemY = hov - 6 - p.lift * 20;
  const amp = 1 + Math.min(3, Math.abs(S.trail) * 0.1);
  const narrow = quarter ? 0.85 : 1;
  // staff in the near hand, held up beside him, behind his shoulder
  const G = pt(cx + 15 * narrow, pelvisY - 6);
  staff(ctx, G, -1.5, p.glow);
  // boots, heels toward us
  boot(ctx, cx - 5, hov, 0.9, true);
  boot(ctx, cx + 5, hov - 0.5, 0.95, true);
  // robe + cloak as one: wide at the hem, streaming toward the camera (down)
  const hemPts = hem(ctx, cx + 22 * narrow, cx - 22 * narrow, hemY + 3, 10, amp, S.wave, 3.5);
  const body = [pt(cx - 11 * narrow, pelvisY - 31), pt(cx + 11 * narrow, pelvisY - 31), pt(cx + 15 * narrow, pelvisY - 12), ...hemPts, pt(cx - 15 * narrow, pelvisY - 12)];
  poly(g, body.map((q) => add(q, { x: 0, y: 1 })), C(ctx, 'outline'));
  poly(g, body, C(ctx, 'navyD'));
  poly(g, [pt(cx, pelvisY - 31), pt(cx + 11 * narrow, pelvisY - 31), pt(cx + 15 * narrow, pelvisY - 12), ...hemPts.slice(0, 6), pt(cx, hemY)], C(ctx, 'navy'), 0.9);
  // folds
  for (const dx of [-12, -5, 4, 11]) line(g, pt(cx + dx * 0.6 * narrow, pelvisY - 6), pt(cx + dx * narrow, hemY + 1), C(ctx, 'navyD'), 1.2);
  // hem embroidery
  for (let i = 0; i < hemPts.length - 1; i++) line(g, add(hemPts[i], { x: 0, y: -3 }), add(hemPts[i + 1], { x: 0, y: -3 }), C(ctx, 'goldD'), 1.5);
  // the great sun on his back
  sun(g, pt(cx, pelvisY - 14), 5, C(ctx, 'gold'), C(ctx, 'navyD'));
  moon(g, pt(cx - 9 * narrow, pelvisY + 10), 2.3, C(ctx, 'goldD'), C(ctx, 'navyD'));
  moon(g, pt(cx + 9 * narrow, pelvisY + 10), 2.3, C(ctx, 'goldD'), C(ctx, 'navyD'));
  // belt across the back, the scrolls
  poly(g, [pt(cx - 13 * narrow, pelvisY - 4), pt(cx + 13 * narrow, pelvisY - 4), pt(cx + 13 * narrow, pelvisY), pt(cx - 13 * narrow, pelvisY)], C(ctx, 'leather'));
  for (const dy of [-1, 3.5]) {
    g.fillStyle(C(ctx, 'outline'), 1).fillRoundedRect(cx - 14 * narrow, pelvisY + dy - 2.4, 12, 4.8, 2);
    g.fillStyle(C(ctx, 'cream'), 1).fillRoundedRect(cx - 13.5 * narrow, pelvisY + dy - 1.9, 11, 3.8, 1.8);
  }
  // sleeves at his sides
  for (const s of [-1, 1]) {
    const sh = pt(cx + s * 11 * narrow, pelvisY - 28);
    const h = s > 0 ? G : pt(cx - 16 * narrow, pelvisY - 4 + Math.sin(S.t * 0.05) * 1.5);
    const a = arm(sh, h, 15, 16);
    sleeve(ctx, sh, a.e, a.h, s > 0);
  }
  // hood from behind, the braid's end and grey hair just showing
  const hc = pt(cx, pelvisY - 41);
  const hood = [pt(hc.x - 9, hc.y + 9), pt(hc.x - 10, hc.y - 2), pt(hc.x - 5, hc.y - 11), pt(hc.x + 1, hc.y - 14), pt(hc.x + 6, hc.y - 10), pt(hc.x + 10, hc.y - 2), pt(hc.x + 9, hc.y + 9)];
  poly(g, hood.map((q) => add(q, { x: 0, y: 0.8 })), C(ctx, 'outline'));
  poly(g, hood, C(ctx, 'navy'));
  line(g, pt(hc.x + 1, hc.y - 13), pt(hc.x, hc.y + 8), C(ctx, 'navyD'), 1.5);
  line(g, pt(hc.x - 5, hc.y - 10), pt(hc.x - 1, hc.y - 14), C(ctx, 'navyH'), 1.1);
  // charms swinging at the belt
  for (let i = 0; i < 2; i++) {
    const c0 = pt(cx + (i ? 9 : -2) * narrow, pelvisY);
    const tip = add(c0, { x: Math.sin(S.charms[i].a) * 9, y: Math.cos(S.charms[i].a) * 10 });
    line(g, c0, tip, C(ctx, 'goldD'), 0.9);
    star(g, tip, 1.3, C(ctx, 'gold'));
  }
}

// ---------------------------------------------------------------- front view

// Gliding toward the camera: the severe face under the hood, the beard down his chest,
// belts, tome and scrolls, the cream panel. (quarter: the three-quarter front view)
function drawFront(ctx, quarter) {
  const { g, p, S } = ctx;
  const hov = -ctx.floatH;
  const cx = p.x + (quarter ? 2 : 0);
  const pelvisY = -44 + hov;
  const hemY = hov - 6 - p.lift * 20;
  const amp = 1 + Math.min(3, Math.abs(S.trail) * 0.1);
  const narrow = quarter ? 0.86 : 1;
  // cloak behind, its edges flaring out at the sides
  const cl = Math.min(8, Math.abs(S.cloak) * 0.3);
  poly(g, [pt(cx - 12 * narrow, pelvisY - 32), pt(cx + 12 * narrow, pelvisY - 32), pt(cx + (22 + cl) * narrow, hemY), pt(cx - (22 + cl) * narrow, hemY)], C(ctx, 'navyD'));
  // boots
  boot(ctx, cx - 4, hov, 0.2, true);
  boot(ctx, cx + 5, hov - 0.5, 0.25, true);
  // the robe
  const hemPts = hem(ctx, cx + 19 * narrow, cx - 19 * narrow, hemY, 10, amp * 0.6, S.wave, 3);
  const body = [pt(cx - 11 * narrow, pelvisY - 31), pt(cx + 11 * narrow, pelvisY - 31), pt(cx + 14 * narrow, pelvisY - 10), ...hemPts, pt(cx - 14 * narrow, pelvisY - 10)];
  poly(g, body.map((q) => add(q, { x: 0, y: 1 })), C(ctx, 'outline'));
  poly(g, body, C(ctx, 'navy'));
  poly(g, [pt(cx - 11 * narrow, pelvisY - 31), pt(cx - 3, pelvisY - 31), pt(cx - 4, hemY), ...hemPts.slice(6)], C(ctx, 'navyD'), 0.5);
  // the cream panel down the middle with its sun
  poly(g, [pt(cx - 4, pelvisY), pt(cx + 4, pelvisY), pt(cx + 5, hemY + 1), pt(cx - 5, hemY + 1)], C(ctx, 'cream'));
  sun(g, pt(cx, (pelvisY + hemY) / 2 + 3), 2, C(ctx, 'goldD'), C(ctx, 'cream'));
  for (let i = 0; i < hemPts.length - 1; i++) line(g, add(hemPts[i], { x: 0, y: -3 }), add(hemPts[i + 1], { x: 0, y: -3 }), C(ctx, 'goldD'), 1.4);
  moon(g, pt(cx - 10 * narrow, pelvisY + 14), 2.3, C(ctx, 'gold'), C(ctx, 'navy'));
  moon(g, pt(cx + 10 * narrow, pelvisY + 14), 2.3, C(ctx, 'gold'), C(ctx, 'navy'));
  // belts, buckle, scrolls on one hip, the tome on the other
  poly(g, [pt(cx - 14 * narrow, pelvisY - 5), pt(cx + 14 * narrow, pelvisY - 5), pt(cx + 14 * narrow, pelvisY - 1), pt(cx - 14 * narrow, pelvisY - 1)], C(ctx, 'leather'));
  poly(g, [pt(cx - 14 * narrow, pelvisY - 1), pt(cx + 14 * narrow, pelvisY - 6), pt(cx + 14 * narrow, pelvisY - 3), pt(cx - 14 * narrow, pelvisY + 2)], C(ctx, 'leatherD'));
  g.fillStyle(C(ctx, 'outline'), 1).fillCircle(cx, pelvisY - 3, 3.2);
  sun(g, pt(cx, pelvisY - 3), 2.2, C(ctx, 'gold'), C(ctx, 'goldD'));
  for (const dy of [-1, 3.5]) {
    g.fillStyle(C(ctx, 'outline'), 1).fillRoundedRect(cx - 17 * narrow, pelvisY + dy - 2.4, 10, 4.8, 2);
    g.fillStyle(C(ctx, 'cream'), 1).fillRoundedRect(cx - 16.5 * narrow, pelvisY + dy - 1.9, 9, 3.8, 1.8);
    g.fillStyle(C(ctx, 'red'), 1).fillCircle(cx - 9 * narrow, pelvisY + dy, 1.2);
  }
  const ta = S.charms[3].a * 0.5;
  const tc = pt(cx + 11 * narrow + Math.sin(ta) * 2, pelvisY + 9);
  g.fillStyle(C(ctx, 'outline'), 1).fillRect(tc.x - 5.5, tc.y - 6.5, 11, 13);
  g.fillStyle(C(ctx, 'leather'), 1).fillRect(tc.x - 4.8, tc.y - 5.8, 9.6, 11.6);
  sun(g, tc, 1.9, C(ctx, 'gold'), C(ctx, 'leather'));
  // charms
  for (let i = 0; i < 3; i++) {
    const c0 = pt(cx + [-6, 4, 8][i] * narrow, pelvisY);
    const tip = add(c0, { x: Math.sin(S.charms[i].a) * 5, y: [11, 8, 14][i] });
    line(g, c0, tip, C(ctx, 'goldD'), 0.9);
    if (i === 1) { g.fillStyle(C(ctx, 'red'), 1).fillRect(tip.x - 1.3, tip.y, 2.6, 3.4); ctx.fx.fillStyle(0xff5a20, 0.3).fillCircle(tip.x, tip.y + 1.7, 3); } else star(g, tip, 1.3, C(ctx, 'gold'));
  }
  // arms: the staff in his right hand (our left), the other hand loose at his side
  const G = pt(cx - 17 * narrow, pelvisY - 8);
  staff(ctx, G, -1.62, p.glow);
  for (const s of [-1, 1]) {
    const sh = pt(cx + s * 11 * narrow, pelvisY - 28);
    const h = s < 0 ? G : pt(cx + 16 * narrow, pelvisY - 2 + Math.sin(S.t * 0.05) * 1.5);
    const a = arm(sh, h, 15, 16);
    sleeve(ctx, sh, a.e, a.h, true);
    hand(ctx, a.h, s < 0 ? 0 : 0.3, Math.PI / 2, true);
  }
  // amulet
  line(g, pt(cx - 5, pelvisY - 31), pt(cx, pelvisY - 20), C(ctx, 'goldD'), 0.9);
  line(g, pt(cx + 5, pelvisY - 31), pt(cx, pelvisY - 20), C(ctx, 'goldD'), 0.9);
  sun(g, pt(cx, pelvisY - 20), 2.4, C(ctx, 'gold'), C(ctx, 'goldD'));
  // head: hood framing the face, the beard falling down his chest
  const hc = pt(cx, pelvisY - 41);
  const bs = S.beard * 0.3;
  const beard = [pt(hc.x - 5, hc.y + 2), pt(hc.x + 5, hc.y + 2), pt(hc.x + 5.5, hc.y + 9), pt(hc.x + 2 + bs, hc.y + 18), pt(hc.x + 1 + bs, hc.y + 27), pt(hc.x - 1 + bs, hc.y + 27), pt(hc.x - 2 + bs, hc.y + 18), pt(hc.x - 5.5, hc.y + 9)];
  poly(g, beard.map((q) => add(q, { x: 0, y: 0.7 })), C(ctx, 'outline'));
  poly(g, beard, C(ctx, 'beard'));
  for (let i = 0; i < 4; i++) line(g, pt(hc.x - 2 + bs, hc.y + 13 + i * 3.5), pt(hc.x + 2 + bs, hc.y + 14 + i * 3.5), C(ctx, 'beardD'), 1);
  const hood = [pt(hc.x - 10, hc.y + 9), pt(hc.x - 10.5, hc.y - 2), pt(hc.x - 6, hc.y - 11), pt(hc.x, hc.y - 14), pt(hc.x + 6, hc.y - 11), pt(hc.x + 10.5, hc.y - 2), pt(hc.x + 10, hc.y + 9), pt(hc.x + 6, hc.y + 3), pt(hc.x + 6, hc.y - 6), pt(hc.x, hc.y - 9), pt(hc.x - 6, hc.y - 6), pt(hc.x - 6, hc.y + 3)];
  poly(g, hood.map((q) => add(q, { x: 0, y: 0.8 })), C(ctx, 'outline'));
  poly(g, hood, C(ctx, 'navy'));
  // face in the opening
  poly(g, [pt(hc.x - 6, hc.y - 6), pt(hc.x, hc.y - 9), pt(hc.x + 6, hc.y - 6), pt(hc.x + 6, hc.y + 3), pt(hc.x - 6, hc.y + 3)], C(ctx, 'outline'));
  poly(g, [pt(hc.x - 4.6, hc.y - 5.5), pt(hc.x, hc.y - 7.5), pt(hc.x + 4.6, hc.y - 5.5), pt(hc.x + 4.6, hc.y + 3), pt(hc.x - 4.6, hc.y + 3)], C(ctx, 'skin'));
  line(g, pt(hc.x - 4, hc.y - 3.4), pt(hc.x - 1, hc.y - 2.4), C(ctx, 'beardD'), 1.4);
  line(g, pt(hc.x + 4, hc.y - 3.4), pt(hc.x + 1, hc.y - 2.4), C(ctx, 'beardD'), 1.4);
  g.fillStyle(C(ctx, 'outline'), 1).fillRect(hc.x - 3.4, hc.y - 1.6, 2, 1.1).fillRect(hc.x + 1.4, hc.y - 1.6, 2, 1.1);
  ctx.fx.fillStyle(0xff8a3a, 0.9).fillRect(hc.x - 2.6, hc.y - 1.5, 0.9, 0.9).fillRect(hc.x + 2, hc.y - 1.5, 0.9, 0.9);
  line(g, pt(hc.x, hc.y - 1.5), pt(hc.x + 0.6, hc.y + 1.6), C(ctx, 'skinD'), 1);
  poly(g, [pt(hc.x - 4, hc.y + 2.2), pt(hc.x + 4, hc.y + 2.2), pt(hc.x + 3, hc.y + 4), pt(hc.x - 3, hc.y + 4)], C(ctx, 'beard'));
  for (let i = 0; i < 5; i++) {
    const q = lerpPt(pt(hc.x - 6, hc.y + 3), pt(hc.x + 6, hc.y + 3), i / 4);
    g.fillStyle(C(ctx, 'gold'), 1).fillCircle(q.x, q.y - 1 - Math.abs(i - 2) * 2.4, 0.7);
  }
}

// A silhouette of the Mage in one colour (blink afterimages, effects/MageFX.js): the side
// view drawn into `g` with every colour replaced.
export function drawMageSilhouette(g, fx, pose, color, sec, floatH = 8) {
  const pal = new Proxy({}, { get: () => color });
  const S = sec ?? { trail: 0, beard: 0, cloak: 0, wave: 0, t: 0, headLook: 0, charms: [0, 0, 0, 0, 0].map(() => ({ a: 0, v: 0 })) };
  drawSide({ g, fx, p: { ...BASE, ...pose }, S, floatH, pal, flash: false, view: 'side', age: 0, cool: 0 });
}
export { BASE as MAGE_BASE_POSE };
