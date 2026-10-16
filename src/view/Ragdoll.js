// Ragdoll.js — A painted enemy going down as dead weight instead of one stiff picture.
//
// His LYING pose (react strip, pose 5: straight, limp, on his back) is cut across into
// four pieces — head, torso, thighs, shins — hinged at the neck, the hips and the knees,
// and those hinges are a chain of points under gravity (Verlet): thrown by the blow that
// floored him, folding at the joints only the ways a body folds, landing piece by piece,
// sliding to a stop and settling limp into exactly the lying pose that was painted (so
// the painted get-up takes over from it without a jump).
//
// What he carries goes loose too (data/ragdollGear.js): a flail's ball swings and drags
// on its chain from his hand; a blade or a club leaves his hand when he dies and
// tumbles, bounces and lands on its own.
//
// Purely a picture. The game still decides where the man is (x, z, h: fighterStates
// 'knockdown' / 'dead'), the doll is pulled along after that every frame, and nothing it
// does is sent over the network or touches the fight: two machines may draw a body a
// little differently, and that's fine.

import { measureCanvas } from './frameMeasure.js';
import { RAGDOLL_GEAR } from '../data/ragdollGear.js';

const OVER = 6;      // frame px the pieces overlap at each joint (hides the seams)
// the joints along the lying body, as a share of its length from the top of the head
const JOINTS = [0, 0.17, 0.52, 0.76, 1];
// how far each joint may bend from the painted lying pose (rad), measured so that + is
// the way his knees bend (whichever way he faces or lies). [neck, hips, knees]
const LIMITS = [[-0.75, 0.75], [-2.1, 0.5], [-0.08, 2.3]];
const ITER = 5;

const built = new Map(); // sheet key | lying ref -> the cut-up lying pose

// The lying pose, cut and measured once per enemy kind.
function build(scene, sheet, ref, gearId) {
  const id = `${sheet.key}|${ref}`;
  if (built.has(id)) return built.get(id);
  const [strip, i] = ref.split(':');
  const fr = scene.textures.getFrame(`${sheet.key}-${strip}`, `f${i}`);
  if (!fr) return null;
  const c = document.createElement('canvas');
  c.width = fr.cutWidth; c.height = fr.cutHeight;
  const ctx = c.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(fr.source.image, fr.cutX, fr.cutY, c.width, c.height, 0, 0, c.width, c.height);
  // what he carries comes off the picture first (it's drawn on its own)
  const gear = [];
  for (const g of RAGDOLL_GEAR[gearId]?.[ref] ?? []) {
    const piece = cutGear(scene, ctx, c, g, `${id}|${gear.length}`);
    if (piece) gear.push(piece);
  }
  const m = measureCanvas(c);
  if (!m.rows || m.x1 - m.x0 < (m.y1 - m.y0) * 1.4) { built.set(id, null); return null; } // not lying flat
  // the body's ends: the outermost columns with real body in them (not a blood smear)
  const solid = (x) => (m.cols[x] ?? 0) >= 6;
  let x0 = m.x0; while (x0 < m.x1 && !solid(x0)) x0++;
  let x1 = m.x1; while (x1 > x0 && !solid(x1)) x1--;
  // which end is the head? the painted dead lie head-left; else the thicker end
  const W = x1 - x0;
  const thick = (t) => { let a = 0; for (let j = -3; j <= 3; j++) a += m.cols[Math.round(x0 + W * (t + j * 0.015))] ?? 0; return a; };
  const headLeft = RAGDOLL_GEAR[gearId]?.headRight ? false : !(thick(0.1) < thick(0.9) * 0.7);
  const xs = JOINTS.map((t) => (headLeft ? x0 + W * t : x1 - W * t));
  const mid = (x) => {
    let a = 0; let n = 0;
    for (let k = -5; k <= 5; k++) { const s = m.spans[Math.round(x) + k]; if (s) { a += (s[0] + s[1]) / 2; n++; } }
    return n ? a / n : (m.y0 + m.y1) / 2;
  };
  // the ends sit a little in from the outline, the joints on the body's middle line
  const pts = xs.map((x, j) => ({ x, y: mid(x + (j === 0 ? 1 : j === 4 ? -1 : 0) * (headLeft ? 6 : -6)) }));
  // how high above the floor each joint lies, frame px (the frame's floor line: he lies
  // exactly as painted once he's still)
  const lift = pts.map((p) => Math.max(2, sheet.ay - p.y));
  const key = `rag-${id}`;
  if (scene.textures.exists(key)) scene.textures.remove(key);
  scene.textures.addCanvas(key, c).setFilter(Phaser.Textures.FilterMode.NEAREST);
  // four bands across the body: head, torso, thighs, shins
  const bands = [];
  for (let s = 0; s < 4; s++) {
    const a = pts[s];
    const b = pts[s + 1];
    let lo = Math.min(a.x, b.x) - OVER;
    let hi = Math.max(a.x, b.x) + OVER;
    if (s === 0) { if (headLeft) lo = 0; else hi = c.width; }   // (hair, a helmet's spikes)
    if (s === 3) { if (headLeft) hi = c.width; else lo = 0; }   // (boots, toes)
    bands.push({ crop: [Math.max(0, lo), 0, Math.min(c.width, hi) - Math.max(0, lo), c.height], ox: a.x, oy: a.y, rest: Math.atan2(b.y - a.y, b.x - a.x) });
  }
  const across = pts.map((p) => { const sp = m.spans[Math.round(p.x)]; return sp ? sp[1] - sp[0] : 20; }); // (how thick he is there)
  const out = { key, w: c.width, h: c.height, pts, lift, thick: across, bands, gear, headLeft };
  built.set(id, out);
  return out;
}

// Lift a piece of gear off the picture onto its own texture (data/ragdollGear.js).
function cutGear(scene, ctx, c, g, id) {
  const d = ctx.getImageData(0, 0, c.width, c.height).data;
  const solidAt = (x, y) => d[(Math.round(y) * c.width + Math.round(x)) * 4 + 3] > 40;
  const key = `rag-${id}`;
  // copy what's inside `shape` (a path drawn by the callback) to its own texture, and
  // take it off the body
  const lift = (shape, X0, Y0, w, h) => {
    const wc = document.createElement('canvas');
    wc.width = w; wc.height = h;
    const x = wc.getContext('2d');
    x.translate(-X0, -Y0);
    x.beginPath(); shape(x); x.clip();
    x.drawImage(c, 0, 0);
    if (scene.textures.exists(key)) scene.textures.remove(key);
    scene.textures.addCanvas(key, wc).setFilter(Phaser.Textures.FilterMode.NEAREST);
    ctx.save();
    ctx.globalCompositeOperation = 'destination-out';
    ctx.beginPath(); shape(ctx); ctx.fill();
    ctx.restore();
  };
  const polyPath = (polys) => (x) => {
    for (const poly of polys) { poly.forEach(([px, py], k) => (k ? x.lineTo(px, py) : x.moveTo(px, py))); x.closePath(); }
  };
  const box = (polys) => {
    const all = polys.flat();
    const X0 = Math.floor(Math.min(...all.map((p) => p[0]))) - 1;
    const Y0 = Math.floor(Math.min(...all.map((p) => p[1]))) - 1;
    return [X0, Y0, Math.ceil(Math.max(...all.map((p) => p[0]))) + 2 - X0, Math.ceil(Math.max(...all.map((p) => p[1]))) + 2 - Y0];
  };
  if (g.kind === 'flail') {
    const at = g.ball ? g.ball : g.end.at;
    if (!solidAt(at[0], at[1])) return null; // (the art has changed under these numbers: leave it painted)
    let X0; let Y0; let w; let h; let r;
    if (g.ball) {
      const [bx, by, br] = g.ball;
      r = br;
      const R = Math.ceil(br + 2);
      [X0, Y0, w, h] = [bx - R, by - R, R * 2, R * 2];
      lift((x) => x.arc(bx, by, br + 1.5, 0, Math.PI * 2), X0, Y0, w, h);
    } else {
      [X0, Y0, w, h] = box([g.end.poly]);
      r = Math.min(w, h) / 2;
      lift(polyPath([g.end.poly]), X0, Y0, w, h);
    }
    // the chain's painted links come off too (they're drawn swinging)
    const path = g.chain ?? [g.hand, at];
    ctx.save();
    ctx.globalCompositeOperation = 'destination-out';
    ctx.lineWidth = g.chainW ?? 9; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.beginPath();
    path.forEach(([x, y], k) => (k ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.lineTo(at[0], at[1]);
    ctx.stroke();
    ctx.restore();
    let len = Math.hypot(at[0] - path[path.length - 1][0], at[1] - path[path.length - 1][1]);
    for (let k = 1; k < path.length; k++) len += Math.hypot(path[k][0] - path[k - 1][0], path[k][1] - path[k - 1][1]);
    return { kind: 'flail', key, r, ox: (at[0] - X0) / w, oy: (at[1] - Y0) / h, hand: g.hand, ball: at, len: Math.max(len * 1.02, r), links: g.links ?? 8, drops: !!g.drops };
  }
  if (g.kind === 'blade') {
    if (!solidAt(g.grip[0], g.grip[1])) return null;
    const [X0, Y0, w, h] = box(g.polys);
    lift(polyPath(g.polys), X0, Y0, w, h);
    return { kind: 'blade', key, ox: (g.grip[0] - X0) / w, oy: (g.grip[1] - Y0) / h, grip: g.grip, tip: g.tip, rest: Math.atan2(g.tip[1] - g.grip[1], g.tip[0] - g.grip[0]) };
  }
  return null;
}

const wrap = (a) => a - Math.PI * 2 * Math.round(a / (Math.PI * 2));
// Keep a point out of the floor: pushed back up without being thrown (a floor that rises
// under it, as the body turns flat, mustn't launch it), and a small bounce if it was
// coming down.
function ground(p, fl, bounce) {
  if (p.y <= fl) return;
  const v = p.y - p.py;
  p.y = fl;
  p.py = v > 0 ? fl + v * bounce : fl - v;
}

function rotAbout(p, c, a) {
  const cs = Math.cos(a); const sn = Math.sin(a);
  // (its last position turns with it: a joint held at its limit isn't thrown by it)
  let x = p.x - c.x; let y = p.y - c.y;
  p.x = c.x + x * cs - y * sn; p.y = c.y + x * sn + y * cs;
  x = p.px - c.x; y = p.py - c.y;
  p.px = c.x + x * cs - y * sn; p.py = c.y + x * sn + y * cs;
}

export class Ragdoll {
  // gearId: which enemy's gear notes to use (his strips' id)
  constructor(scene, sheet, gearId) {
    this.scene = scene;
    this.sheet = sheet;
    this.gearId = gearId;
    this.parts = [];
    this.gearImgs = [];
    this.chainG = scene.add.graphics().setVisible(false);
    this.on = false;
    this.ref = null;
  }

  get active() { return this.on; }

  setPose(ref) {
    if (ref === this.ref && this.B) return this.B;
    this.ref = ref;
    this.B = build(this.scene, this.sheet, ref, this.gearId);
    for (const p of this.parts) p.destroy();
    for (const p of this.gearImgs) p.destroy();
    this.parts = [];
    this.gearImgs = [];
    if (!this.B) return null;
    const B = this.B;
    for (const b of B.bands) {
      this.parts.push(this.scene.add.image(0, 0, B.key).setCrop(...b.crop).setOrigin(b.ox / B.w, b.oy / B.h).setVisible(false));
    }
    for (const g of B.gear) {
      this.gearImgs.push(this.scene.add.image(0, 0, g.key).setOrigin(g.ox, g.oy).setVisible(false));
    }
    return B;
  }

  // Where each joint of the painted lying pose is on screen, drawn where the game has him.
  lyingAt(f, face, k) {
    const B = this.B;
    const sh = this.sheet;
    const fx = f.x;
    const fy = f.z - f.h;
    const W = (x, y) => ({ x: fx + (x - sh.ax) * k * face, y: fy + (y - sh.ay) * k });
    return { W, pts: B.pts.map((p) => W(p.x, p.y)) };
  }

  // Start him falling from where he stands (or from the air) the moment he goes down.
  //   kind: 'knock' (thrown by a blow) | 'drop' (dies where he stands: legs go, he crumples)
  //         | 'lying' (already down)
  // opts (a piece of him cut off, effects/SpriteCut.js):
  //   range [lo, hi]  only the joints lo..hi (0 head .. 4 feet) are here
  //   free            nobody's left in the game to follow: it just falls where it falls
  //   vel {x, y}, spin   how it's thrown (px / frame; spin turns it end over end)
  //   strays          gear his missing parts held falls loose with this piece
  start(f, face, k, kind = 'knock', opts = {}) {
    const B = this.B;
    if (!B) return false;
    this.on = true;
    [this.lo, this.hi] = opts.range ?? [0, 4];
    this.free = !!opts.free;
    this.face = face;
    this.k = k;
    this.age = 0;
    this.grounded = 0;
    this.settle = 0;
    this.prevVh = f.vh;
    this.dead = f.health <= 0;
    this.released = false;
    const G = B.pts;
    const L = [];
    for (let j = 0; j < 4; j++) L.push(Math.hypot(G[j + 1].x - G[j].x, G[j + 1].y - G[j].y) * k);
    this.L = L;
    // the rest bend of each joint in the lying pose (as drawn, then mirrored by facing)
    const ang = (j) => Math.atan2((G[j + 1].y - G[j].y), (G[j + 1].x - G[j].x) * face);
    this.rest = [1, 2, 3].map((j) => wrap(ang(j) - ang(j - 1)));
    // standing: feet on the floor where he is, the body stacked straight up from them,
    // leaning a little the way he's about to go
    const floorY = f.z - f.floor;
    const footY = f.z - f.h;
    const headDir = B.headLeft ? -face : face; // where his head ends up when he's down
    const lean = (kind === 'drop' ? 0.12 : 0.22) * headDir;
    const pts = [];
    let x = f.x;
    let y = footY;
    const up = [];
    for (let j = 4; j >= 0; j--) {
      up[j] = { x, y };
      if (j > 0) { x += Math.sin(lean) * L[j - 1]; y -= Math.cos(lean) * L[j - 1]; }
    }
    for (let j = 0; j < 5; j++) pts.push({ x: up[j].x, y: up[j].y, px: up[j].x, py: up[j].y });
    // thrown: everything moves as the game throws him, the head snapped back the way he
    // falls and the feet swept out from under him (that's the backward flip)
    const vx = f.vx / 60;
    const vy = -f.vh / 60;
    const power = Math.min(1.6, (Math.abs(f.vx) + Math.max(0, f.vh)) / 400);
    for (const p of pts) { p.px = p.x - vx; p.py = p.y - vy; }
    if (kind === 'knock') {
      // (struck in the chest: the trunk goes first, the head whips, the legs trail)
      pts[0].px -= headDir * (1.6 + power * 1.6); pts[1].px -= headDir * (2.2 + power * 2.2);
      pts[2].px -= headDir * (1.2 + power * 1.6);
      pts[4].px += headDir * (1.0 + power * 1.2); pts[4].py += 1.2 + power;
      pts[3].px += headDir * (0.2 + power * 0.4);
    } else if (kind === 'drop') {
      // the knees give and fold forward, the upper body goes back over them
      pts[3].px += headDir * 1.6;
      pts[2].py -= 0.6;
      pts[0].px -= headDir * 0.9;
    }
    if (opts.vel) {
      for (const p of pts) { p.px = p.x - opts.vel.x; p.py = p.y - opts.vel.y; }
      // end over end: the two ends of the piece thrown opposite ways about its middle
      const s2 = opts.spin ?? 0;
      const mid = (this.lo + this.hi) / 2;
      for (let j = this.lo; j <= this.hi; j++) {
        const t = j - mid;
        pts[j].px += s2 * t * 1.4;
        pts[j].py -= Math.abs(s2) * t * 0.4;
      }
    }
    if (kind === 'lying') { // (already down when first seen: just lie there)
      const T = this.lyingAt(f, face, k).pts;
      pts.forEach((p, j) => { p.x = p.px = T[j].x; p.y = p.py = T[j].y; });
      this.settle = 0.22;
    }
    this.pts = pts;
    this.lift = kind === 'lying' ? B.lift.map((v) => v * k) : [0, 0, 0, 0, 0];
    this.floorY = floorY;
    // the gear starts where it's drawn on him
    this.gear = B.gear.map((g) => this.startGear(g)).filter((w) => {
      const here = w.band >= this.lo && w.band < this.hi;
      if (!here && opts.strays) { if (w.rope) w.dropped = true; else w.free = true; } // (fallen from his other half)
      return here || opts.strays;
    });
    this.place();
    return true;
  }

  // a point of the lying picture (frame px), carried by band `s` as the doll now lies
  onBand(s, x, y) {
    const B = this.B;
    const b = B.bands[s];
    const P = this.pts;
    const a = Math.atan2(P[s + 1].y - P[s].y, P[s + 1].x - P[s].x) - Math.atan2(Math.sin(b.rest), Math.cos(b.rest) * this.face);
    const lx = (x - b.ox) * this.k * this.face;
    const ly = (y - b.oy) * this.k;
    const c = Math.cos(a); const s2 = Math.sin(a);
    return { x: P[s].x + lx * c - ly * s2, y: P[s].y + lx * s2 + ly * c, a };
  }

  // which band a point of the lying picture belongs to
  bandOf(x) {
    const P = this.B.pts;
    for (let s = 0; s < 4; s++) if ((x - P[s].x) * (x - P[s + 1].x) <= 0) return s;
    return Math.abs(x - P[0].x) < Math.abs(x - P[4].x) ? 0 : 3;
  }

  startGear(g) {
    if (g.kind === 'flail') {
      const s = this.bandOf(g.hand[0]);
      const h = this.onBand(s, g.hand[0], g.hand[1]);
      const n = g.links;
      const seg = (g.len * this.k) / n;
      // hanging from the hand
      const rope = [];
      for (let i = 0; i <= n; i++) rope.push({ x: h.x, y: h.y + i * seg, px: h.x, py: h.y + i * seg });
      for (const p of rope) { p.px = p.x - (this.pts[2].x - this.pts[2].px); p.py = p.y - (this.pts[2].y - this.pts[2].py); }
      return { g, band: s, rope, seg, spin: 0 };
    }
    const s = this.bandOf(g.grip[0]);
    const a = this.onBand(s, g.grip[0], g.grip[1]);
    const b = this.onBand(s, g.tip[0], g.tip[1]);
    return { g, band: s, a: { x: a.x, y: a.y, px: a.x, py: a.y }, b: { x: b.x, y: b.y, px: b.x, py: b.y }, free: false };
  }

  // One game frame of the doll (and his gear). f: the man, face: the way he's drawn,
  // k: his draw scale; steps: game frames to run (0 while the game is frozen on a hit).
  // (free pieces: f is just { z, floor, stats: { gravity } } — where the floor is)
  step(f, face, k, steps) {
    if (!this.on) return;
    this.k = k;
    const P = this.pts;
    const L = this.L;
    const lo = this.lo;
    const hi = this.hi;
    const free = this.free;
    const G = f.stats.gravity / 3600;
    const floorY = f.z - f.floor;
    this.floorY = floorY;
    const target = free ? null : this.lyingAt(f, face, k);
    const lift = this.B.lift.map((v) => v * k);
    const sgn = face * (this.B.headLeft ? 1 : -1); // (bends measured the way his knees go)
    // a joint lies as high off the floor as the body is thick there — when that part of
    // him lies flat; standing on end (feet down), it's on the floor itself
    const flat = (j) => {
      let c = 0; let n = 0;
      if (j > lo) { c += Math.abs(Math.cos(Math.atan2(P[j].y - P[j - 1].y, P[j].x - P[j - 1].x))); n++; }
      if (j < hi) { c += Math.abs(Math.cos(Math.atan2(P[j + 1].y - P[j].y, P[j + 1].x - P[j].x))); n++; }
      return c / n;
    };
    for (let n = 0; n < steps; n++) {
      this.age++;
      // the game threw him again (a juggle, a bounce, a blow while he's down): so does the doll
      const expect = this.prevVh - f.stats.gravity / 60;
      if (!free && f.vh > 60 && f.vh > expect + 120) {
        const dv = (f.vh - Math.max(0, expect)) / 60;
        for (const p of P) p.py += dv;
        P[0].px -= (this.B.headLeft ? -face : face) * dv * 0.6;
        this.grounded = 0; this.settle = Math.min(this.settle, 0.02);
      }
      this.prevVh = f.vh;
      let down = 0;
      for (let j = lo; j <= hi; j++) {
        const p = P[j];
        // (how high the floor holds this joint changes gently as he turns: a floor jumping
        // up under him would throw the whole body into the air)
        const want = lift[j] * flat(j);
        this.lift[j] += Math.max(-1.5, Math.min(1.5, want - this.lift[j]));
        const fl = floorY - this.lift[j];
        const onFloor = p.y >= fl - 0.5;
        if (onFloor) down++;
        const fr = onFloor ? 0.78 : 0.995;
        const vx = Math.max(-24, Math.min(24, (p.x - p.px) * fr));
        const vy = Math.max(-24, Math.min(24, (p.y - p.py) * 0.995));
        p.px = p.x; p.py = p.y;
        p.x += vx; p.y += vy + G;
      }
      // he goes the way the game says he goes: drift his middle toward the game's
      // (velocity first, then a little of the position)
      if (!free) {
        const hip = P[2];
        const gvx = f.vx / 60;
        const dvx = (gvx - (hip.x - hip.px)) * (down ? 0.08 : 0.3);
        const ex = (target.pts[2].x - hip.x) * 0.06;
        for (const p of P) { p.px -= dvx; p.x += ex; p.px += ex; }
      }
      // settling: once he's been down a moment, the body lets go into the painted pose
      // (a cut-off piece just goes limp: its joints ease back toward lying straight)
      if (down >= Math.min(3, hi - lo + 1)) this.grounded++; else this.grounded = Math.max(0, this.grounded - 1);
      if (this.grounded > 10) this.settle = Math.min(0.22, this.settle + 0.006);
      for (let it = 0; it < ITER; it++) {
        for (let j = lo; j < hi; j++) {
          const a = P[j]; const b = P[j + 1];
          const dx = b.x - a.x; const dy = b.y - a.y;
          const d = Math.hypot(dx, dy) || 0.001;
          const diff = (d - L[j]) / d * 0.5;
          // (the torso and hips are heavier than the head and the shins)
          const wa = j === lo && lo === 0 ? 0.3 : j === hi - 1 && hi === 4 ? 0.7 : 0.5;
          a.x += dx * diff * (2 * (1 - wa)); a.y += dy * diff * (2 * (1 - wa));
          b.x -= dx * diff * (2 * wa); b.y -= dy * diff * (2 * wa);
        }
        for (let j = lo + 1; j <= hi - 1; j++) {
          const A = P[j - 1]; const Bp = P[j]; const C = P[j + 1];
          const rel = wrap(Math.atan2(C.y - Bp.y, C.x - Bp.x) - Math.atan2(Bp.y - A.y, Bp.x - A.x));
          const r = wrap(rel - this.rest[j - 1]) * sgn;
          const [mn, mx] = LIMITS[j - 1];
          let t = Math.max(mn, Math.min(mx, r));
          if (free && this.grounded > 12) t += (0 - t) * 0.04; // (limp)
          if (t !== r) {
            const d = (t - r) * sgn;
            rotAbout(C, Bp, d * 0.5);
            rotAbout(A, Bp, -d * 0.5);
          }
        }
        for (let j = lo; j <= hi; j++) ground(P[j], floorY - this.lift[j], 0.25);
      }
      if (this.settle > 0 && !free) {
        for (let j = 0; j < 5; j++) {
          const p = P[j]; const t = target.pts[j];
          const dx = (t.x - p.x) * this.settle; const dy = (t.y - p.y) * this.settle;
          p.x += dx; p.y += dy;
          p.px += dx * 0.7; p.py += dy * 0.7; // (and calmed)
        }
      }
      this.stepGear(f, G, floorY, target);
      if (free) this.release();
      // (never let a bad number loose: put him down as painted, or drop the piece)
      if (!P.every((p) => Number.isFinite(p.x) && Number.isFinite(p.y))) {
        this.broken = (this.broken ?? 0) + 1;
        if (free || !target) { this.hide(); return; }
        target.pts.forEach((t, j) => { P[j].x = P[j].px = t.x; P[j].y = P[j].py = t.y; });
      }
    }
    this.place();
  }

  // He dies with it in his hand: his fingers open (blades and clubs fly free).
  // (a few frames into the fall: it's carried with him first, and flies on from there)
  release(power = 1) {
    if (!this.on || this.released || this.age < 6) return;
    this.released = true;
    for (const w of this.gear ?? []) {
      if (w.g.kind === 'flail') { if (w.g.drops) w.dropped = true; continue; }
      w.free = true;
      const vx = (Math.random() - 0.3) * 1.6 * power * (this.B.headLeft ? -this.face : this.face);
      w.a.px -= vx; w.a.py += 1 + Math.random() * 1.5 * power;
      w.b.px -= vx * 1.6; w.b.py += 1.5 + Math.random() * 2.5 * power;
    }
  }

  stepGear(f, G, floorY, target) {
    for (const w of this.gear) {
      const g = w.g;
      if (g.kind === 'flail') {
        const R = w.rope;
        if (!w.dropped) { // (in his fist)
          const h = this.onBand(w.band, g.hand[0], g.hand[1]);
          R[0].x = h.x; R[0].y = h.y; R[0].px = h.x; R[0].py = h.y;
        }
        const from = w.dropped ? 0 : 1;
        const ballR = g.r * this.k * 0.85;
        for (let i = from; i < R.length; i++) {
          const p = R[i];
          const fl = floorY - (i === R.length - 1 ? ballR : 1);
          const onFloor = p.y >= fl - 0.5;
          const vx = (p.x - p.px) * (onFloor ? 0.8 : 0.99);
          const vy = (p.y - p.py) * 0.99;
          p.px = p.x; p.py = p.y;
          p.x += vx; p.y += vy + G * (i === R.length - 1 ? 1.15 : 1);
        }
        for (let it = 0; it < 8; it++) {
          for (let i = 1; i < R.length; i++) {
            const a = R[i - 1]; const b = R[i];
            const dx = b.x - a.x; const dy = b.y - a.y;
            const d = Math.hypot(dx, dy) || 0.001;
            if (d <= w.seg) continue; // (a chain goes slack; it only pulls)
            const diff = (d - w.seg) / d;
            // the hand doesn't give; along the chain the heavy ball gives least
            const last = i === R.length - 1;
            const wa = i === 1 && !w.dropped ? 0 : last ? 0.85 : 0.5;
            a.x += dx * diff * wa; a.y += dy * diff * wa;
            b.x -= dx * diff * (1 - wa); b.y -= dy * diff * (1 - wa);
          }
          for (let i = from; i < R.length; i++) {
            const p = R[i];
            const fl = floorY - (i === R.length - 1 ? ballR : 1);
            ground(p, fl, 0.3);
          }
        }
        // the ball rolls along the ground, and turns as it's swung
        const e = R[R.length - 1];
        if (this.settle > 0 && !w.dropped && target) { // (and comes to rest where it's painted)
          const t = target.W(g.ball[0], g.ball[1]);
          const q = this.settle * 0.6;
          e.x += (t.x - e.x) * q; e.y += (t.y - e.y) * q;
          e.px += (t.x - e.px) * q * 0.7; e.py += (t.y - e.py) * q * 0.7;
        }
        w.spin += (e.x - e.px) / Math.max(2, ballR);
      } else {
        if (!w.free) {
          const a = this.onBand(w.band, g.grip[0], g.grip[1]);
          const b = this.onBand(w.band, g.tip[0], g.tip[1]);
          w.a.px = w.a.x; w.a.py = w.a.y; w.b.px = w.b.x; w.b.py = w.b.y;
          w.a.x = a.x; w.a.y = a.y; w.b.x = b.x; w.b.y = b.y;
          continue;
        }
        const len = Math.hypot(g.tip[0] - g.grip[0], g.tip[1] - g.grip[1]) * this.k;
        for (const p of [w.a, w.b]) {
          const onFloor = p.y >= floorY - 2.5;
          const vx = (p.x - p.px) * (onFloor ? 0.7 : 0.995);
          const vy = (p.y - p.py) * 0.995;
          p.px = p.x; p.py = p.y;
          p.x += vx; p.y += vy + G;
        }
        for (let it = 0; it < 4; it++) {
          const dx = w.b.x - w.a.x; const dy = w.b.y - w.a.y;
          const d = Math.hypot(dx, dy) || 0.001;
          const diff = (d - len) / d * 0.5;
          w.a.x += dx * diff; w.a.y += dy * diff; w.b.x -= dx * diff; w.b.y -= dy * diff;
          for (const p of [w.a, w.b]) ground(p, floorY - 2, 0.35);
        }
      }
    }
  }

  // Put the pictures where the points are.
  place() {
    const P = this.pts;
    const B = this.B;
    const face = this.face;
    const k = this.k;
    const z = this.zDepth ?? 0;
    for (let s = 0; s < 4; s++) {
      if (s < this.lo || s >= this.hi) { this.parts[s].setVisible(false); continue; }
      const b = B.bands[s];
      const a = Math.atan2(P[s + 1].y - P[s].y, P[s + 1].x - P[s].x) - Math.atan2(Math.sin(b.rest), Math.cos(b.rest) * face);
      // torso on top, then the thighs, the head, the shins (the near limbs over the far ones)
      const order = [0.012, 0.016, 0.008, 0.004][s];
      this.parts[s].setVisible(true).setPosition(P[s].x, P[s].y).setScale(k * face, k).setRotation(a).setDepth(z + order);
    }
    const g = this.chainG.clear().setVisible(true).setDepth(z + 0.02);
    // where he was cut: the raw end of what's left (the blood is SpriteCut's)
    for (const j of [this.lo > 0 ? this.lo : -1, this.hi < 4 ? this.hi : -1]) {
      if (j < 0) continue;
      const r = Math.max(3, B.thick[j] * k * 0.3);
      g.fillStyle(0x3a0000, 1).fillCircle(P[j].x, P[j].y, r);
      g.fillStyle(0x9a0c0c, 1).fillCircle(P[j].x, P[j].y, r * 0.75);
      g.fillStyle(0xe0d0b8, 1).fillCircle(P[j].x, P[j].y, Math.max(1, r * 0.22)); // (bone)
    }
    (this.gear ?? []).forEach((w, i) => {
      const img = this.gearImgs[i];
      if (w.g.kind === 'flail') {
        const R = w.rope;
        // the chain: dark links with a light glint, every few px along the rope
        for (let j = 0; j < R.length - 1; j++) {
          const a = R[j]; const b = R[j + 1];
          const n = Math.max(1, Math.round(Math.hypot(b.x - a.x, b.y - a.y) / 2.4));
          for (let q = 0; q < n; q++) {
            const x = a.x + (b.x - a.x) * (q / n);
            const y = a.y + (b.y - a.y) * (q / n);
            g.fillStyle(0x1a1416, 1).fillRect(x - 1.6, y - 1.6, 3.2, 3.2);
            g.fillStyle((j * n + q) % 2 ? 0x9a8a84 : 0x5a4c48, 1).fillRect(x - 1, y - 1, 2, 2);
          }
        }
        const e = R[R.length - 1];
        img.setVisible(true).setPosition(e.x, e.y).setScale(k * face, k).setRotation(w.spin).setDepth(z + 0.021);
      } else {
        const a = Math.atan2(w.b.y - w.a.y, w.b.x - w.a.x) - Math.atan2(Math.sin(w.g.rest), Math.cos(w.g.rest) * face);
        img.setVisible(true).setPosition(w.a.x, w.a.y).setScale(k * face, k).setRotation(a).setDepth(z + (w.free ? 0.001 : 0.018));
      }
    });
  }

  // draw order (his floor depth), fade, tint
  look(z, alpha, tintFill, burn, applyBurn) {
    this.zDepth = z;
    for (const p of [...this.parts, ...this.gearImgs]) {
      p.setAlpha(alpha);
      if (tintFill) p.setTintFill(0xffffff); else if (burn && applyBurn) { p.clearTint(); applyBurn(p, burn); } else p.clearTint();
    }
    this.chainG.setAlpha(alpha);
  }

  hide() {
    if (!this.on) return;
    this.on = false;
    for (const p of [...this.parts, ...this.gearImgs]) p.setVisible(false);
    this.chainG.clear().setVisible(false);
  }

  destroy() {
    for (const p of [...this.parts, ...this.gearImgs]) p.destroy();
    this.chainG.destroy();
  }
}
