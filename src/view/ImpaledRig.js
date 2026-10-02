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
  try {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const ctx = c.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(fr.source.image, fr.cutX, fr.cutY, w, h, 0, 0, w, h);
    const d = ctx.getImageData(0, 0, w, h).data;
    rows = [];
    for (let y = 0; y < h; y++) {
      let x0 = -1;
      let x1 = -1;
      for (let x = 0; x < w; x++) {
        if (d[(y * w + x) * 4 + 3] > 40) { if (x0 < 0) x0 = x; x1 = x; }
      }
      rows.push(x0 < 0 ? null : [x0, x1]);
    }
  } catch { rows = null; }
  const m = { rows, top: rows ? Math.max(0, rows.findIndex((r) => r)) : 0 };
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
    this.dang = scene.add.image(0, 0, '__DEFAULT').setVisible(false);
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
    // hanging legs: the legs of his LYING pose (straight, together, limp), turned to
    // hang from the hips — a striding pair of legs in mid-air reads as a man jumping
    this.hang = null;
    if (lying) {
      const [ls, li] = lying.split(':');
      const lk = `${sh.key}-${ls}`;
      const ln = `f${li}`;
      const lm = measure(this.scene, lk, ln);
      if (lm.rows && lm.x1 - lm.x0 > (lm.y1 - lm.y0) * 1.6) { // really is lying flat
        const len = (lm.x1 - lm.x0) * 0.47;                    // feet (left end) to hips
        const xCut = lm.x0 + len;
        const yMid = (lm.y0 + lm.y1) / 2 + (lm.y1 - lm.y0) * 0.08;
        this.dang.setTexture(lk, ln).setCrop(0, 0, xCut + OVERLAP, sh.fh).setOrigin(xCut / sh.fw, yMid / sh.fh);
        this.hang = { scale: hip / len };
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
      this.lastX = f.x;
      this.free = 0;
    }
    const t = by.fsm.frame - IMPALE.stab;          // game frames since the blade went in
    const lifting = by.fsm.frame >= IMPALE.liftFrom;
    const aloft = by.fsm.frame >= IMPALE.raised;
    const sway = Math.sin(tick * 0.11);
    const pinVx = (f.x - this.lastX) * dir;         // the blade's own motion drags the loose parts
    this.lastX = f.x;

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
      if (this.free === 1) { this.sL.a = Math.max(-25, Math.min(25, this.sL.a)); this.sL.v = 0; }
      this.sL.v -= pinVx * 0.45;
      aL = Math.max(-32, Math.min(32, this.sL.step(-3 + Math.sin(tick * 0.13) * 1.2, 0.03, 0.965)));
      sL = 1.04; // toes pointing at the floor
    }
    // dead legs hang together: draw the stride narrower the longer he hangs
    const narrow = 1 - Math.min(0.3, this.free * 0.02);

    const depth = f.z + 0.3; // in front of Ulric: his blade goes in the back and out the chest
    const shake = t < 2 ? (Math.random() - 0.5) * 3 : by.fsm.frame < IMPALE.liftFrom ? (Math.random() - 0.5) * 1.4 : 0;
    const dangle = this.free > 0 && this.hang;
    this.legs.setVisible(!dangle).setPosition(hipP.x, hipP.y).setScale(k * face * narrow, k * sL).setDepth(depth).setAngle(aL * dir);
    this.dang.setVisible(!!dangle);
    if (dangle) {
      // (his lying legs point away from the hips along -x: a quarter turn hangs them down)
      const s = k * this.hang.scale;
      this.dang.setPosition(hipP.x, hipP.y - 2).setScale(s * face * 1.03, s).setDepth(depth).setAngle((-90 + aL) * face);
    }
    this.torso.setVisible(true).setPosition(px + shake, py).setScale(k * face, k).setDepth(depth + 0.01).setAngle(aT * dir);
    this.head.setVisible(true).setPosition(neckP.x + shake, neckP.y).setScale(k * face, k).setDepth(depth + 0.02).setAngle((aT + aH) * dir);
    return { px, py };
  }

  tint(fill) {
    for (const p of [this.legs, this.dang, this.torso, this.head]) { if (fill) p.setTintFill(0xffffff); else p.clearTint(); }
  }

  hide() {
    if (!this.on && !this.legs.visible) return;
    this.on = false;
    this.legs.setVisible(false);
    this.dang.setVisible(false);
    this.torso.setVisible(false);
    this.head.setVisible(false);
  }

  destroy() {
    this.legs.destroy();
    this.dang.destroy();
    this.torso.destroy();
    this.head.destroy();
  }
}
