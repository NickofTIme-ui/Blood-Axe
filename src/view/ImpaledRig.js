// ImpaledRig.js — A man skewered on Ulric's sword (the impale finisher).
//
// His one drawn "struck" pose is cut into three pieces — head, torso, legs — hinged at the
// neck and the hips, and the whole thing hangs from the point where the blade goes through
// him. The torso follows the sword; the head and the legs follow the torso late, on loose
// springs, so he reads as dead weight on the steel and not a man standing in mid-air:
//   stab   chest snaps forward, head whips back, feet stay where they were (knees give)
//   lift   the torso rises with the blade; the legs trail: heels, then toes, leave the floor
//   aloft  spine folded over the blade, head lolling, legs swinging like a pendulum
//
// Once his boots leave the floor he is a RAGDOLL: thighs hang from the hips and shins from
// the knees, each a real pendulum under gravity, shoved about by how the blade moves (the
// heave up and back, the hold, the boot), the knees giving only the way knees bend, the
// legs falling together as they go dead.
//
// Where the fighter is (x, h) is decided by the game (fighterStates 'execute'): this only
// draws him.

import { IMPALE, impalePierce } from '../combat/Finisher.js';
import { depthScale } from './depths.js';

const RAD = Math.PI / 180;
const OVERLAP = 5; // frame px the pieces overlap at each joint (hides the seams)

// The drawn figure inside one frame: its top row and where its middle is at any height.
const measured = new Map();
function measure(scene, key, name) {
  const id = `${key}|${name}`;
  if (measured.has(id)) return measured.get(id);
  const fr = scene.textures.getFrame(key, name);
  const w = fr.cutWidth;
  const h = fr.cutHeight;
  let rows = null;
  let cols = null; // (solid pixels down each column)
  try {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const ctx = c.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(fr.source.image, fr.cutX, fr.cutY, w, h, 0, 0, w, h);
    const d = ctx.getImageData(0, 0, w, h).data;
    rows = [];
    cols = new Array(w).fill(0);
    for (let y = 0; y < h; y++) {
      let x0 = -1;
      let x1 = -1;
      for (let x = 0; x < w; x++) {
        if (d[(y * w + x) * 4 + 3] > 40) { if (x0 < 0) x0 = x; x1 = x; cols[x]++; }
      }
      rows.push(x0 < 0 ? null : [x0, x1]);
    }
  } catch { rows = null; }
  const m = { rows, cols: rows ? cols : null, top: rows ? Math.max(0, rows.findIndex((r) => r)) : 0 };
  if (rows) { // the figure's box (for the lying pose)
    m.y0 = m.top;
    m.y1 = rows.length - 1 - [...rows].reverse().findIndex((r) => r);
    m.x0 = Math.min(...rows.filter((r) => r).map((r) => r[0]));
    m.x1 = Math.max(...rows.filter((r) => r).map((r) => r[1]));
  }
  measured.set(id, m);
  return m;
}
// centre of the body across a few rows around y (frame px), or `fallback`
function midAt(m, y, fallback) {
  if (!m.rows) return fallback;
  let a = 0;
  let n = 0;
  for (let k = -4; k <= 4; k++) {
    const r = m.rows[Math.round(y) + k];
    if (r) { a += (r[0] + r[1]) / 2; n++; }
  }
  return n ? a / n : fallback;
}

class Spring {
  constructor() { this.a = 0; this.v = 0; }
  step(target, k, damp) {
    this.v = (this.v + (target - this.a) * k) * damp;
    this.a += this.v;
    return this.a;
  }
}

export class ImpaledRig {
  constructor(scene, sheet) {
    this.scene = scene;
    this.sheet = sheet;
    this.legs = scene.add.image(0, 0, '__DEFAULT').setVisible(false);
    this.thigh = scene.add.image(0, 0, '__DEFAULT').setVisible(false);
    this.shin = scene.add.image(0, 0, '__DEFAULT').setVisible(false);
    this.torso = scene.add.image(0, 0, '__DEFAULT').setVisible(false);
    this.head = scene.add.image(0, 0, '__DEFAULT').setVisible(false);
    this.sT = new Spring();
    this.sH = new Spring();
    this.sL = new Spring();
    this.ref = null;
    this.on = false;
  }

  // Cut the pose (a 'strip:index' frame ref) into the three pieces.
  setPose(ref, f, lying) {
    if (ref === this.ref) return;
    this.ref = ref;
    const sh = this.sheet;
    const [strip, i] = ref.split(':');
    const key = `${sh.key}-${strip}`;
    const name = `f${i}`;
    const m = measure(this.scene, key, name);
    const H = Math.max(40, sh.ay - m.top);            // drawn height, frame px
    const hip = H * 0.46;
    const neck = H * 0.79;
    const pierce = Math.min(impalePierce(f) * sh.res, H * 0.74);
    this.J = { hip, neck, pierce, H };
    const yHip = sh.ay - hip;
    const yNeck = sh.ay - neck;
    const yPierce = sh.ay - pierce;
    // each piece pivots about the body's own middle at its joint
    const xHip = midAt(m, yHip, sh.ax);
    const xNeck = midAt(m, yNeck, sh.ax);
    const xPierce = midAt(m, yPierce, sh.ax);
    this.X = { hip: xHip - xPierce, neck: xNeck - xPierce }; // joint offsets from the pin, frame px
    this.legs.setTexture(key, name).setCrop(0, yHip - OVERLAP, sh.fw, sh.fh - yHip + OVERLAP).setOrigin(xHip / sh.fw, yHip / sh.fh);
    this.torso.setTexture(key, name).setCrop(0, yNeck - OVERLAP, sh.fw, yHip - yNeck + OVERLAP * 2).setOrigin(xPierce / sh.fw, yPierce / sh.fh);
    this.head.setTexture(key, name).setCrop(0, 0, sh.fw, yNeck + OVERLAP).setOrigin(xNeck / sh.fw, yNeck / sh.fh);
    // the ragdoll's legs: the same legs cut again at the knee
    const knee = H * 0.25;
    const yKnee = sh.ay - knee;
    const xKnee = midAt(m, yKnee, sh.ax);
    this.J.knee = knee;
    this.thigh.setTexture(key, name).setCrop(0, yHip - OVERLAP, sh.fw, yKnee - yHip + OVERLAP * 2).setOrigin(xHip / sh.fw, yHip / sh.fh);
    this.shin.setTexture(key, name).setCrop(0, yKnee - OVERLAP, sh.fw, sh.fh - yKnee + OVERLAP).setOrigin(xKnee / sh.fw, yKnee / sh.fh);
    this.legX = (xKnee - xHip); // (the drawn knee's offset from the hip, frame px)
    this.flat = null;
    // better: the legs of his LYING pose (straight, together, limp), cut at the knee and
    // hung from the hips. A striding pair of legs in mid-air reads as a man jumping.
    if (lying) {
      const [ls, li] = lying.split(':');
      const lk = `${sh.key}-${ls}`;
      const ln = `f${li}`;
      const lm = measure(this.scene, lk, ln);
      if (lm.rows && lm.x1 - lm.x0 > (lm.y1 - lm.y0) * 1.6) { // really is lying flat
        // which end are the feet? the thinner one (the painted dead mostly lie head-left)
        const thick = (x) => lm.cols[Math.round(x)] ?? 0;
        const W = lm.x1 - lm.x0;
        const th = (t) => { let a = 0; for (let j = -3; j <= 3; j++) a += thick(lm.x0 + W * (t + j * 0.02)); return a; };
        const feetRight = !(th(0.12) < th(0.88) * 0.8);
        const len = W * 0.47;                       // feet to hips
        const s = feetRight ? 1 : -1;
        const xFeet = feetRight ? lm.x1 : lm.x0;
        const xH = xFeet - s * len;
        const xK = xFeet - s * len * 0.5;
        const yMid = (lm.y0 + lm.y1) / 2 + (lm.y1 - lm.y0) * 0.08;
        const lo = (a, b) => Math.min(a, b);
        const span = (a, b) => Math.abs(b - a);
        // thigh: hips to knee; shin: knee to the end of the boots
        this.thigh.setTexture(lk, ln).setCrop(lo(xH, xK) - OVERLAP, 0, span(xH, xK) + OVERLAP * 2, sh.fh).setOrigin(xH / sh.fw, yMid / sh.fh);
        this.shin.setTexture(lk, ln).setCrop(feetRight ? xK - OVERLAP : 0, 0, feetRight ? sh.fw - xK + OVERLAP : xK + OVERLAP, sh.fh).setOrigin(xK / sh.fw, yMid / sh.fh);
        this.flat = { s, scale: hip / len };        // (s: which way they point in the frame)
      }
    }
  }

  // f = the victim, by = the executioner, ref = his struck pose, face = ±1 as drawn.
  draw(f, by, ref, face, lying) {
    this.setPose(ref, f, lying);
    const k = depthScale(f.z) / this.sheet.res;
    const dir = by.facing;
    const J = this.J;
    const tick = f.world?.frame ?? 0;
    if (!this.on) {
      this.on = true;
      this.feetX = f.x - dir * 4; // where his boots were when the blade stopped him
      this.sT.a = 0; this.sT.v = 14 * 0.6;
      this.sH.a = 0; this.sH.v = -9;
      this.sL.a = 0; this.sL.v = 0;
      this.free = 0;
      this.doll = null;
      this.pinP = null;
      this.pinV = null;
      this.tick = tick;
    }
    const steps = Math.max(0, Math.min(4, tick - this.tick)); // game frames since the last draw
    this.tick = tick;
    const t = by.fsm.frame - IMPALE.stab;          // game frames since the blade went in
    const lifting = by.fsm.frame >= IMPALE.liftFrom;
    const aloft = by.fsm.frame >= IMPALE.raised;
    const sway = Math.sin(tick * 0.11);
    this.facingSign = face; // (his knees bend back from the way he's drawn facing)

    // the blade heaving him about throws his loose weight around: the torso rocks on the
    // steel and the head flops after it (both ragdoll-ish, on top of their poses)
    const pin = { x: f.x, y: f.z - f.h };
    if (this.pinP && steps) {
      const v = { x: (pin.x - this.pinP.x) / steps, y: (pin.y - this.pinP.y) / steps };
      const acc = { x: v.x - (this.pinV?.x ?? v.x), y: v.y - (this.pinV?.y ?? v.y) };
      this.pinV = v;
      this.sT.v -= acc.x * dir * 1.6;
      this.sH.v -= acc.x * dir * 3.2 - acc.y * 1.8;
    }
    this.pinP = pin;

    // torso: chest punched forward by the thrust, then folded over the blade as it takes his weight
    const tT = t < 3 ? 15 : !lifting ? 7 : aloft ? 13 + sway * 1.6 : 10;
    const aT = this.sT.step(tT, 0.22, 0.72);
    // head: whips back on the hit, then just hangs and rolls
    const tH = t < 4 ? -30 : !lifting ? -14 + Math.sin(tick * 0.5) * 3 : -22 + Math.sin(tick * 0.09 + 1) * 7;
    this.sH.v -= this.sT.v * 0.35;                  // lags behind the torso
    const aH = this.sH.step(tH, 0.07, 0.86);

    // the pin: where the sword goes through him, on screen
    const px = f.x;
    const py = f.z - f.h - J.pierce * k;
    const th = aT * RAD * dir;
    const at = (ox, up) => ({ // a point on the torso: ox frame px forward, `up` frame px above the pin
      x: px + (ox * face * Math.cos(th) + up * Math.sin(th)) * k,
      y: py + (ox * face * Math.sin(th) - up * Math.cos(th)) * k,
    });
    const hipP = at(this.X.hip, -(J.pierce - J.hip));
    const neckP = at(this.X.neck, J.neck - J.pierce);

    // legs: while his boots can still reach the floor they stay planted where they were
    // and the legs stretch from the hips to them (knees giving, heels peeling up, toes
    // last); once the hips are too high they swing free
    const L = J.hip * k;
    const hipH = f.z - hipP.y;
    const dx = this.feetX - hipP.x;
    const reach = Math.hypot(dx, hipH);
    let aL;
    let sL;
    if (reach <= L * 1.1 && !this.free) {
      this.feetX += (hipP.x - dir * 3 - this.feetX) * 0.04; // boots scrape after him
      const want = -Math.atan2(dx, Math.max(1, hipH)) / RAD * dir;
      aL = this.sL.step(want, 0.5, 0.5);
      sL = Math.max(0.82, Math.min(1.1, reach / L));
    } else {
      this.free++;
      aL = this.sL.a;
      sL = 1;
    }
    // dead legs hang together: draw the stride narrower the longer he hangs
    const narrow = this.narrow = 1 - Math.min(0.3, this.free * 0.02);

    const depth = f.z + 0.3; // in front of Ulric: his blade goes in the back and out the chest
    const shake = t < 2 ? (Math.random() - 0.5) * 3 : by.fsm.frame < IMPALE.liftFrom ? (Math.random() - 0.5) * 1.4 : 0;
    const hanging = this.free > 0;
    this.legs.setVisible(!hanging);
    this.thigh.setVisible(hanging);
    this.shin.setVisible(hanging);
    if (!hanging) {
      this.legs.setPosition(hipP.x, hipP.y).setScale(k * face * narrow, k * sL).setDepth(depth).setAngle(aL * dir);
    } else {
      const D = this.ragdoll(hipP, aL * dir, steps, k);
      if (this.flat) {
        // lying legs point along the frame's x: turn them to hang along each link
        const s = k * this.flat.scale * 1.03;
        const base = this.flat.s * face > 0 ? 0 : 180;
        const ang = (a) => Math.atan2(Math.cos(a), Math.sin(a)) / RAD - base;
        this.thigh.setPosition(hipP.x, hipP.y - 2).setScale(s * face, s).setDepth(depth).setAngle(ang(D.a1));
        this.shin.setPosition(D.knee.x, D.knee.y).setScale(s * face, s).setDepth(depth - 0.001).setAngle(ang(D.a2));
      } else {
        const sx = k * face * narrow;
        this.thigh.setPosition(hipP.x, hipP.y).setScale(sx, k * 1.04).setDepth(depth).setAngle(-D.a1 / RAD);
        this.shin.setPosition(D.knee.x, D.knee.y).setScale(sx, k * 1.04).setDepth(depth - 0.001).setAngle(-D.a2 / RAD);
      }
    }
    this.torso.setVisible(true).setPosition(px + shake, py).setScale(k * face, k).setDepth(depth + 0.01).setAngle(aT * dir);
    this.head.setVisible(true).setPosition(neckP.x + shake, neckP.y).setScale(k * face, k).setDepth(depth + 0.02).setAngle((aT + aH) * dir);
    return { px, py };
  }

  // The hanging legs, a two-link pendulum hung from the hips. Angles are from straight
  // down, positive toward screen +x; the hips' own acceleration (the blade heaving him
  // about) is what sets them swinging.
  ragdoll(hip, startDeg, steps, k) {
    const J = this.J;
    const L1 = this.flat ? J.hip * 0.5 * k * 1.03 : (J.hip - J.knee) * k * 1.04;
    const L2 = this.flat ? J.hip * 0.5 * k * 1.03 : J.knee * k * 1.04;
    const ox = this.flat ? 0 : this.legX * this.facingSign * k * this.narrow; // (the drawn knee sits a little off the hip's line)
    const kneeOf = (d) => ({
      x: hip.x + ox * Math.cos(d.a1) + L1 * Math.sin(d.a1),
      y: hip.y - ox * Math.sin(d.a1) + L1 * Math.cos(d.a1),
    });
    let d = this.doll;
    if (!d) {
      // picked up from where the planted legs were: no pop
      const a = -startDeg * RAD;
      d = this.doll = { a1: a, v1: 0, a2: a, v2: 0, hip: { ...hip }, hv: { x: 0, y: 0 }, knee: null };
      d.knee = kneeOf(d);
      d.kv = { x: 0, y: 0 };
    }
    const G = 0.55;                 // px / frame², in screen px (it hangs heavy)
    for (let i = 0; i < steps; i++) {
      // the hips' acceleration this frame (spread over the frames since the last draw)
      const vx = (hip.x - d.hip.x) / steps;
      const vy = (hip.y - d.hip.y) / steps;
      const ax = vx - d.hv.x;
      const ay = vy - d.hv.y;
      d.hv = { x: vx, y: vy };
      // thigh: pendulum on the hips
      const gx = -ax;
      const gy = G - ay;
      d.v1 += (gx * Math.cos(d.a1) - gy * Math.sin(d.a1)) / L1;
      d.v1 *= 0.965;
      d.a1 += d.v1;
      d.a1 = Math.max(-1.1, Math.min(1.1, d.a1));
      // shin: pendulum on the knee, pushed by how the knee itself is thrown about
      const kn = kneeOf(d);
      const kvx = kn.x - d.knee.x;
      const kvy = kn.y - d.knee.y;
      const kax = kvx - d.kv.x;
      const kay = kvy - d.kv.y;
      d.kv = { x: kvx, y: kvy };
      d.knee = kn;
      d.v2 += (-kax * Math.cos(d.a2) - (G - kay) * Math.sin(d.a2)) / L2;
      d.v2 *= 0.95;
      d.a2 += d.v2;
      // a knee only bends one way: the heel swings back behind him, never forward past straight
      const rel = (d.a2 - d.a1) * this.facingSign;
      if (rel > 0.06) { d.a2 = d.a1 + 0.06 * this.facingSign; d.v2 = d.v1; }
      if (rel < -1.3) { d.a2 = d.a1 - 1.3 * this.facingSign; d.v2 = d.v1; }
    }
    d.hip = { ...hip };
    d.knee = kneeOf(d);
    return d;
  }

  tint(fill) {
    for (const p of [this.legs, this.thigh, this.shin, this.torso, this.head]) { if (fill) p.setTintFill(0xffffff); else p.clearTint(); }
  }

  hide() {
    if (!this.on && !this.legs.visible) return;
    this.on = false;
    this.legs.setVisible(false);
    this.thigh.setVisible(false);
    this.shin.setVisible(false);
    this.torso.setVisible(false);
    this.head.setVisible(false);
  }

  destroy() {
    this.legs.destroy();
    this.thigh.destroy();
    this.shin.destroy();
    this.torso.destroy();
    this.head.destroy();
  }
}
