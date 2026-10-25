// SpriteCut.js — Cuts an enemy's CURRENT hand-drawn sprite frame into pieces that fall,
// topple, get kicked about and bleed (used by the finishers). Unlike the kill
// fatalities (effects/Dismember.js, which take the hidden paper doll apart), what comes
// apart here is exactly the art you were looking at.
//
//   split(view, cut, dir)   cut: 'legs' (knee), 'waist', 'neck', or 'waistPerch' (waist,
//                           but the top half stays sitting on the legs until it's kicked)
//   launch(piece, vx, vh, spin, { bowl })   send a piece flying (bowl: it knocks down
//                           any enemy it crashes into)
//
// The pieces are his own pixels divided along the cut line (flat, or a diagonal) — same
// proportions, nothing added outside his outline; the cut faces are painted into the
// rows beside the line (bake()), so armour, cloth and flesh all part on one plane. The
// pieces pump blood from the cut, trail it in flight, splat where they land, bounce off
// the arena walls, and work as anchors for gut ropes (local()/worldPoint()).
// Stepped once per game tick (update()), so slow motion slows them too.

import { landThud,playSfx } from '../core/Sfx.js';
import { dyeImage } from '../view/dye.js';
import { measure, measureCanvas } from '../view/frameMeasure.js';
import { stepRigid, pieceHull, boxHull } from './Physics.js';
import { RAGDOLL_GEAR, EXECUTION_GEAR, EXECUTION_HEAD } from '../data/ragdollGear.js';
import { cutPlane, spritePoint, cutDistance } from './CutGeometry.js';
import { FlexibleCut } from '../view/FlexibleCut.js';
import { FleshChain } from './FleshChain.js';
import { SplitSeam } from './SplitSeam.js';

const GRAVITY = 1700;

// the head, crown to the cut under the jaw, as a share of his standing height
const HEAD = 0.19;

const rand = (a, b) => a + Math.random() * (b - a);

// An outlined head (data/ragdollGear.js EXECUTION_HEAD) as a cut plane: through the
// middle of the neck, facing down into the body (ny = 1, like a level cut's), the head's
// middle its pivot, and the outline kept to sort the pixels by.
function headPlane({ head, neck: [[ax, ay], [bx, by]] }) {
  const cx = (ax + bx) / 2, cy = (ay + by) / 2;
  const mid = head.reduce((m, [x, y]) => ({ x: m.x + x / head.length, y: m.y + y / head.length }), { x: 0, y: 0 });
  let nx = -(by - ay) / ((bx - ax) || 1e-6), ny = 1;
  if ((mid.x - cx) * nx + (mid.y - cy) * ny > 0) { nx = -nx; ny = -ny; }
  return { cx, cy, nx, ny, upper: mid, mask: head, neck: { ax, ay, bx, by } };
}
function inside(poly, x, y) {
  let at = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i], [xj, yj] = poly[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) at = !at;
  }
  return at;
}
function alongNeck({ neck: { ax, ay, bx, by } }, x, y) {
  const lx = bx - ax, ly = by - ay, len = Math.hypot(lx, ly) || 1;
  const t = ((x - ax) * lx + (y - ay) * ly) / len;
  return t > -2 && t < len + 2;
}
let pieceId = 0;

export class SpriteCuts {
  constructor(scene) {
    this.scene = scene;
    this.pieces = [];
    this.seams = [];
  }
  attachSplit(a,b){
    if(!a?.flex||!b?.flex)return false;
    this.seams.push({a,b,link:new SplitSeam(a.flex.chain,b.flex.chain),g:this.scene.add.graphics().setDepth(a.z+.25)});
    return true;
  }

  // Returns { upper, lower } pieces; hides nothing itself (the view hides its sprite).
  split(view, cut, dir, options = {}) {
    const f = view.f;
    const s = view.sprite;
    const sh = view.sheet;
    const res = sh.res;
    const k = Math.abs(s.scaleY) || 1 / res; // (the size he's drawn at, depth scaling included)
    const face = Math.sign(s.scaleX) || f.facing;
    const bodyH = f.stats.body.h;
    let yCut = Math.round(sh.ay - bodyH * 0.5 * res);
    // on his knees in painted kneeling art (view/SpriteEnemyView.js): he's drawn about two
    // thirds his height, so the standing neck line would pass over his head; the neck is
    // found from the top of his head in the picture itself
    const painted = view.kneelCut && view.kneelCut.row >= sh.fh;
    const head = painted ? this.headTop(s.frame) : null;
    if (head != null && cut === 'neck') yCut = Math.round(head + bodyH * HEAD * res);
    else if (head != null && cut === 'waist') yCut = Math.round((head + sh.ay) / 2);
    const m = measure(this.scene, s.texture.key, s.frame.name);
    const lying = !!view.cutLying;
    const plane = cutPlane({ cut, bounds: m.rows ? m : null, ax: sh.ax, ay: sh.ay, bodyHeight: bodyH * res,
      lying: lying && !!m.rows, headRight: !!RAGDOLL_GEAR[sh.key.replace(/^enemy-/, '')]?.headRight,
      dir, face, variation: options.variation ?? Math.random(), tilt: options.tilt ?? Math.random(),impact:options.impact,impactSide:options.impactSide });
    // Neck placement on a kneeling pose uses its actual crown as before.
    if (head != null && cut === 'neck') plane.cy = yCut;
    // ...unless the pose has its head outlined (data/ragdollGear.js EXECUTION_HEAD): then
    // the blade takes exactly that, parted along the neck, and the shoulders stay on.
    const headOutline = cut === 'neck' && view.kneelCut ? EXECUTION_HEAD[sh.key.replace(/^enemy-/, '')]?.[view.lastRef] : null;
    if (headOutline) Object.assign(plane, headPlane(headOutline));
    yCut = Math.round(plane.cy);
    const yc = plane.upper.y;
    const key = s.texture.key;
    const frame = s.frame.name;
    // on his knees without painted kneeling art (view/SpriteEnemyView.js): the standing
    // frame sunk into the floor, cropped at the knee — the pieces are cut the same way
    const kn = view.kneelCut;
    const sink = kn?.sink ?? 0;
    const kneeRow = kn ? kn.row : sh.fh;
    const feetY = f.z - f.h + sink;
    const perch = cut === 'waistPerch';

    // The two pieces are his own picture, divided along the cut line and nothing else:
    // same pixels, same proportions, nothing added outside his outline. The wound is
    // painted INTO the few rows either side of the line (bake()).
    const slope = -plane.nx; // (the standing plane's slope; fallback only)
    const equipment = kn ? EXECUTION_GEAR[sh.key.replace(/^enemy-/, '')]?.[view.lastRef] : null;
    const baked = this.bake(s.frame, sh, yCut, slope, cut, f.stats.body.w * res, plane, equipment);
    if (baked && equipment) this.dropExecutionGear(view, equipment, dir);
    const mk = (texKey, cropY, cropH, pivot) => {
      const img = texKey ? this.scene.add.image(f.x, feetY, texKey) : this.scene.add.image(f.x, feetY, key, frame).setCrop(0, cropY, sh.fw, cropH);
      if (texKey && kn && cropY > 0) img.setCrop(0, 0, sh.fw, kneeRow); // (the shins stay under the floor)
      dyeImage(this.scene, img, f.dye); // (his clothes keep their colour: view/dye.js)
      const at = spritePoint(s, sh, pivot);
      return img.setOrigin(pivot.x / sh.fw, pivot.y / sh.fh).setScale(s.scaleX, s.scaleY).setPosition(at.x, at.y).setRotation(s.rotation).setDepth(f.z);
    };
    const bandX = baked?.midX ?? sh.ax;
    const upperPivot = plane.upper;
    const lowerPivot = plane.lower ?? (plane.lying ? { x: (plane.cx + (plane.nx > 0 ? m.x1 : m.x0)) / 2, y: plane.cy } : { x: sh.ax, y: sh.ay });
    const upAt = spritePoint(s, sh, upperPivot), lowAt = spritePoint(s, sh, lowerPivot);
    const wound = plane.lying || plane.longitudinal ? { x: plane.cx, y: plane.cy } : { x: bandX, y: plane.cy + slope * (bandX - plane.cx) };
    const offset = pivot => ({ x: (wound.x - pivot.x) * s.scaleX, y: (wound.y - pivot.y) * s.scaleY });

    const upper = this.add({
      img: mk(baked?.upper, 0, yCut, upperPivot), tex: baked?.upper, x: upAt.x, z: f.z, h: f.z - upAt.y, mode: perch ? 'perch' : 'fly',
      vx: 0, vh: 0, rot: s.rotation, spin: 0, face, k, dir,
      edge: (yCut - yc) * k,   // cut face: this far below the piece's centre
      rest: (yCut - yc) * k,   // lands standing on its cut
      bleed: 170, bleedDir: 1, age: 0,
      bandOff: offset(upperPivot),
    });
    const lower = this.add({
      img: mk(baked?.lower, yCut, Math.max(1, kneeRow - yCut), lowerPivot), tex: baked?.lower, x: lowAt.x, z: f.z, h: f.z - lowAt.y, mode: plane.lying ? 'fly' : 'stand',
      vx: 0, vh: 0, rot: s.rotation, spin: 0, face, k, dir,
      edge: -(sh.ay - yCut) * k, // cut face: this far above the feet
      // legs: the sweep knocks them straight over (the torso drops where they stood);
      // a perched top half keeps the legs standing until it's kicked off them
      stand: perch ? Infinity : cut === 'legs' ? 2 : 14, fallDir: dir, bleed: 220, bleedDir: -1, age: 0,
      toppleSpeed: cut === 'legs' ? 0.03 : 0.006,
      bandOff: offset(lowerPivot),
    });
    upper.other = lower;
    lower.other = upper;
    // Spray out of the actual cut face, rotating with each falling half.
    const normalLength=Math.hypot(plane.nx*s.scaleX,plane.ny*s.scaleY)||1;
    for(const piece of [upper,lower]) {
      piece.bloodNormal={x:plane.nx*s.scaleX/normalLength,y:plane.ny*s.scaleY/normalLength};
      piece.pressureCut=['vertical','waist','waistPerch','diagDown','diagUp'].includes(cut);
    }
    if(plane.longitudinal) {
      for(const piece of [upper,lower])piece.edge=piece.rest=Math.max(5,bodyH*.22);
    }
    if (plane.lying) {
      upper.edge = upper.rest = Math.max(4, (m.y1 - m.y0) * k * 0.35);
      lower.edge = lower.rest = upper.rest;
      lower.vx = -dir * 55; lower.vh = 70; lower.thrown = true;
    }
    // the loose bits drop off where they hung, turning over as they go
    // (not on his knees: those pictures are cropped into the floor)
    if (!kn) {
      [upper, lower].forEach((half, i) => {
        half.loose = (baked?.loose?.[i] ?? []).map((c) => {
          const at = spritePoint(s, sh, { x: c.cx, y: c.cy });
          const x = at.x;
          const h = f.z - at.y;
          const img = this.scene.add.image(x, at.y, c.key)
            .setOrigin(c.ox / c.w, c.oy / c.h).setScale(k * face, k).setRotation(s.rotation).setDepth(f.z);
          dyeImage(this.scene, img, f.dye);
          const thick = Math.min(c.w, c.h) * k;
          const p = this.add({
            img, tex: c.key, x, z: f.z + rand(0.5, 2), h, mode: 'fly', rot: s.rotation, spin: 0, face, k, dir,
            edge: thick * 0.75, rest: thick * 0.45, bleed: 40, bleedDir: 1, pump: 0.35, age: 0,
            bandOff: { x: 0, y: 0 }, gib: true,
          });
          this.launch(p, dir * rand(10, 50), rand(0, 70), rand(-4, 4));
          p.rest = thick * 0.45;
          return p;
        });
      });
    }
    if (kn) {
      // beheaded on his knees: the body stays kneeling a long moment, the neck pumping,
      // then slumps forward onto its own front (not over: it's kneeling)
      lower.stand = 46; lower.toppleSpeed = 0.003; lower.fallDir = face; lower.toppleTo = 0.42; lower.bleed = 320;
      // ...and on painted kneeling art (the whole picture, nothing cropped into the floor)
      // it goes over limp, not stiff: when it's done kneeling it becomes a jointed body
      // (view/FlexibleCut.js) that folds at the waist and flops down under its own weight
      if (painted) lower.limp = { sheet: sh, body: m, sx: s.scaleX, sy: s.scaleY };
    }
    if(['waist','vertical','diagDown','diagUp','legs'].includes(cut)&&!kn){
      for(const piece of [upper,lower]){
        piece.flex=FlexibleCut.create(this.scene,piece,s,sh,m,plane.lying);
        if(piece.flex){piece.life=1440;piece.worldPoint=(x,y)=>piece.flex.worldPoint(x,y);}
      }
    }
    return { upper, lower };
  }

  // The first row of a frame with his body in it (a few solid pixels): the top of his
  // head. Measured once per frame. null if the picture can't be read.
  headTop(frame) {
    this.tops ??= new Map();
    const key = `${frame.texture.key}:${frame.name}`;
    if (this.tops.has(key)) return this.tops.get(key);
    let top = null;
    try {
      const W = frame.cutWidth; const H = frame.cutHeight;
      const c = document.createElement('canvas'); c.width = W; c.height = H;
      const g = c.getContext('2d', { willReadFrequently: true });
      g.drawImage(frame.source.image, frame.cutX, frame.cutY, W, H, 0, 0, W, H);
      const d = g.getImageData(0, 0, W, H).data;
      for (let y = 0; y < H && top == null; y++) {
        let n = 0;
        for (let x = 0; x < W; x++) if (d[(y * W + x) * 4 + 3] > 80 && ++n >= 3) { top = y; break; }
      }
    } catch { top = null; }
    this.tops.set(key, top);
    return top;
  }

  // Divide one frame along the line y = yCut + slope * (x - ax) into two full-frame
  // canvases (above / below), and paint the cut faces: for a few rows either side of the
  // line, the pixels that are ALREADY his body become wet red meat with a dark rim, a
  // pale fleck of spine toward his back, and a blood stain soaking a little further in.
  // Nothing is drawn where he wasn't: both pieces keep his exact outline and size.
  // Returns { upper, lower, midX } (texture keys; midX = middle of the cut, frame px).
  bake(frame, sh, yCut, slope, cut, bodyW, plane = null, equipment = null) {
    try {
      const W = frame.cutWidth;
      const H = frame.cutHeight;
      const mkc = () => { const c = document.createElement('canvas'); c.width = W; c.height = H; return c; };
      const srcC = mkc();
      const sctx = srcC.getContext('2d', { willReadFrequently: true });
      sctx.drawImage(frame.source.image, frame.cutX, frame.cutY, W, H, 0, 0, W, H);
      if (equipment) {
        sctx.save();sctx.globalCompositeOperation = 'destination-out';
        for (const poly of equipment) { sctx.beginPath();poly.forEach(([x,y],i)=>i?sctx.lineTo(x,y):sctx.moveTo(x,y));sctx.closePath();sctx.fill(); }
        sctx.restore();
      }
      const src = sctx.getImageData(0, 0, W, H);
      const up = sctx.createImageData(W, H);
      const lo = sctx.createImageData(W, H);
      const FACE = 2.2;  // rows of open meat each side of the line (frame px, res 2)
      const SOAK = 6;    // how far the blood soaks into cloth and skin past that
      const meat = [[0x5a, 0x04, 0x0a], [0x86, 0x0e, 0x16], [0xa8, 0x1a, 0x20], [0xc4, 0x34, 0x30]];
      let x0 = W; let x1 = -1;
      for (let x = 0; x < W; x++) {
        const ly = yCut + slope * (x - sh.ax);
        for (let y = 0; y < H; y++) {
          const o = (y * W + x) * 4;
          if (src.data[o + 3] < 40) continue;
          const d = plane ? cutDistance(plane,x+.5,y+.5) : y + 0.5 - ly;
          const masked = plane?.mask ? inside(plane.mask, x + 0.5, y + 0.5) : null;
          const out = masked == null ? (d < 0 ? up : lo) : masked ? up : lo;
          // (an outlined head: the wound runs along the neck only, not out across the shoulders)
          const a = masked == null || alongNeck(plane, x + 0.5, y + 0.5) ? Math.abs(d) : Infinity;
          let r = src.data[o]; let g = src.data[o + 1]; let b = src.data[o + 2];
          if (a < FACE) {
            if (x < x0) x0 = x; if (x > x1) x1 = x;
            const n = Math.sin(x * 0.9 + y * 1.7) + Math.sin(x * 0.31 - y * 0.8) * 1.3 + (Math.random() - 0.5);
            [r, g, b] = a < 0.8 ? meat[Math.max(1, Math.min(3, Math.round(2 + n)))] : meat[Math.max(0, Math.min(2, Math.round(1 + n * 0.6)))];
          } else if (a < SOAK) {
            const t = 1 - (a - FACE) / (SOAK - FACE); // 1 at the wound, 0 where it fades
            const s = 0.55 * t * (0.7 + 0.3 * Math.sin(x * 1.3));
            r = r * (1 - s) + 0x70 * s; g = g * (1 - s) + 0x06 * s; b = b * (1 - s) + 0x08 * s;
          }
          out.data[o] = r; out.data[o + 1] = g; out.data[o + 2] = b; out.data[o + 3] = 255;
        }
      }
      // the spine: a pale fleck in the cut, toward his back (frames face right: back = left)
      if (x1 > x0 && cut !== 'legs' && !plane?.lying && !plane?.mask) {
        const bx = Math.round(x0 + (x1 - x0) * 0.36);
        for (const img of [up, lo]) {
          for (let x = bx - 2; x <= bx + 2; x++) {
            const ly = yCut + slope * (x - sh.ax);
            const y = Math.floor(img === up ? ly - 1 : ly + 0.5);
            const o = (y * W + x) * 4;
            if (y >= 0 && y < H && img.data[o + 3]) { img.data[o] = 0xea; img.data[o + 1] = 0xde; img.data[o + 2] = 0xc0; }
          }
        }
      }
      // whatever the cut left hanging on its own (a hand, a forearm, the sword in it: across
      // the waist his hands hang beside his hips) isn't held up by either half: it falls
      const loose = cut === 'neck' || cut === 'legs' ? [[], []] : [up, lo].map((img) => this.loose(img, W, H));
      const keys = [up, lo].map((img, i) => {
        const c = mkc();
        c.getContext('2d').putImageData(img, 0, 0);
        const key = `cutpiece-${++pieceId}-${i ? 'lo' : 'up'}`;
        this.scene.textures.addCanvas(key, c).setFilter(Phaser.Textures.FilterMode.NEAREST);
        return key;
      });
      return { upper: keys[0], lower: keys[1], midX: x1 > x0 ? (x0 + x1) / 2 : sh.ax, loose };
    } catch { return null; }
  }

  // The bits of one half that hang free of the rest of it once it's cut (not touching its
  // biggest part, pixel to pixel): lifted out of `img` into their own textures.
  // Returns [{ key, w, h, ox, oy, cx, cy }] like tear(); crumbs stay where they are.
  loose(img, W, H) {
    const d = img.data;
    const comp = new Int32Array(W * H).fill(-1);
    const sizes = [];
    const stack = [];
    for (let i = 0; i < W * H; i++) {
      if (!d[i * 4 + 3] || comp[i] >= 0) continue;
      const id = sizes.length;
      let n = 0;
      comp[i] = id; stack.push(i);
      while (stack.length) {
        const q = stack.pop(); n++;
        const x = q % W; const y = (q / W) | 0;
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            const nx = x + dx; const ny = y + dy;
            if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
            const r = ny * W + nx;
            if (d[r * 4 + 3] && comp[r] < 0) { comp[r] = id; stack.push(r); }
          }
        }
      }
      sizes.push(n);
    }
    if (sizes.length < 2) return [];
    const main = sizes.indexOf(Math.max(...sizes));
    const out = [];
    sizes.forEach((n, id) => {
      if (id === main || n < 30) return;
      let x0 = W; let y0 = H; let x1 = -1; let y1 = -1; let sx = 0; let sy = 0;
      for (let i = 0; i < W * H; i++) {
        if (comp[i] !== id) continue;
        const x = i % W; const y = (i / W) | 0;
        if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
        sx += x; sy += y;
      }
      const w = x1 - x0 + 1; const h = y1 - y0 + 1;
      const c = document.createElement('canvas'); c.width = w; c.height = h;
      const ctx = c.getContext('2d');
      const part = ctx.createImageData(w, h);
      for (let y = y0; y <= y1; y++) {
        for (let x = x0; x <= x1; x++) {
          const i = y * W + x;
          if (comp[i] !== id) continue;
          const o = ((y - y0) * w + (x - x0)) * 4;
          for (let ch = 0; ch < 4; ch++) { part.data[o + ch] = d[i * 4 + ch]; d[i * 4 + ch] = 0; }
        }
      }
      ctx.putImageData(part, 0, 0);
      const key = `cutpiece-${++pieceId}-loose`;
      this.scene.textures.addCanvas(key, c).setFilter(Phaser.Textures.FilterMode.NEAREST);
      const cx = sx / n; const cy = sy / n;
      out.push({ key, w, h, ox: cx - x0, oy: cy - y0, cx, cy });
    });
    return out;
  }

  // Blown apart (a mine, a lotus, a rupture): the frame on screen is torn into `n`
  // jagged fragments of his own pixels (armour, cloth, skin), each with raw meat along
  // the edges it was torn from its neighbours, blood soaking in behind that and soot
  // scorched across it, all thrown out from (bx, bh) — the blast's centre, world x and
  // height. Returns the pieces (already flying); hides nothing itself.
  shatter(view, n, bx, bh, power = 1) {
    const f = view.f;
    const s = view.sprite;
    const sh = view.sheet;
    const k = Math.abs(s.scaleY) || 1 / sh.res;
    const face = Math.sign(s.scaleX) || f.facing;
    const feetY = f.z - f.h;
    const cells = this.tear(s.frame, n);
    if (!cells) return [];
    const out = [];
    for (const c of cells) {
      // the fragment's centre, from frame px to the world (the frame is mirrored when he faces left)
      const x = f.x + (c.cx - sh.ax) * k * face;
      const h = f.h + (sh.ay - c.cy) * k;
      const img = this.scene.add.image(x, feetY + (c.cy - sh.ay) * k, c.key)
        .setOrigin(c.ox / c.w, c.oy / c.h).setScale(k * face, k).setRotation(s.rotation).setDepth(f.z);
      dyeImage(this.scene, img, f.dye);
      const thick = Math.min(c.w, c.h) * k;
      const p = this.add({
        img, tex: c.key, x, z: f.z + rand(-5, 5), h, mode: 'fly', rot: s.rotation, spin: 0, face, k, dir: face,
        edge: thick * 0.75, rest: thick * 0.45, bleed: Math.floor(rand(30, 90) * c.meat), bleedDir: 1, pump: 0.45, age: 0,
        bandOff: { x: 0, y: 0 }, gib: true,
      });
      // thrown out from the blast: the further from its centre, the harder; low bits skid
      const dx = x - bx; const dy = h - bh;
      const d = Math.hypot(dx, dy) || 1;
      const sp = rand(180, 420) * power * (0.7 + Math.min(0.6, d / 80));
      this.launch(p, (dx / d) * sp + rand(-90, 90), Math.max(140, (dy / d) * sp * 0.4 + rand(220, 560) * power), rand(-16, 16));
      p.rest = thick * 0.45;
      out.push(p);
    }
    return out;
  }

  // Divide a frame's opaque pixels into about `n` jagged cells (a noisy Voronoi: seeds
  // spread over his body, the borders roughened so nothing parts on a clean line) and
  // paint each one as its own texture. Returns [{ key, w, h, ox, oy, cx, cy, meat }]:
  // texture key and size, the cell's centre in the texture (ox, oy) and in the frame
  // (cx, cy), and how much of it is torn edge (0..1, for how long it bleeds).
  tear(frame, n) {
    try {
      const W = frame.cutWidth;
      const H = frame.cutHeight;
      const srcC = document.createElement('canvas'); srcC.width = W; srcC.height = H;
      const sctx = srcC.getContext('2d', { willReadFrequently: true });
      sctx.drawImage(frame.source.image, frame.cutX, frame.cutY, W, H, 0, 0, W, H);
      const src = sctx.getImageData(0, 0, W, H).data;
      const solid = [];
      for (let i = 0; i < W * H; i++) if (src[i * 4 + 3] >= 40) solid.push(i);
      if (solid.length < 60) return null;
      // seeds: random body pixels, kept apart so the pieces come out of a similar size
      const gap = Math.sqrt(solid.length / n) * 0.75;
      const seeds = [];
      for (let t = 0; t < n * 40 && seeds.length < n; t++) {
        const i = solid[Math.floor(Math.random() * solid.length)];
        const sx = i % W; const sy = (i / W) | 0;
        if (seeds.every((q) => Math.hypot(q.x - sx, q.y - sy) > gap)) seeds.push({ x: sx, y: sy, w: rand(0.85, 1.15) });
      }
      const ph = [rand(0, 6), rand(0, 6), rand(0, 6)];
      const rough = gap * 0.13;
      const owner = new Int16Array(W * H).fill(-1);
      for (const i of solid) {
        const x = i % W; const y = (i / W) | 0;
        // the noise bends the borders into torn, toothed edges
        const nx = x + (Math.sin(y * 0.11 + ph[0]) + Math.sin(y * 0.33 + x * 0.07 + ph[1]) * 0.45) * rough;
        const ny = y + (Math.sin(x * 0.12 + ph[2]) + Math.sin(x * 0.36 - y * 0.09 + ph[0]) * 0.45) * rough;
        let best = 0; let bd = Infinity;
        for (let j = 0; j < seeds.length; j++) {
          const d = Math.hypot(seeds[j].x - nx, seeds[j].y - ny) * seeds[j].w;
          if (d < bd) { bd = d; best = j; }
        }
        owner[i] = best;
      }
      const meat = [[0x4a, 0x02, 0x08], [0x7a, 0x0a, 0x12], [0xa0, 0x16, 0x1c], [0xc4, 0x3a, 0x34]];
      const TORN = 2.2; // px of open meat along a torn edge
      const SOAK = 6;   // and blood soaking in past it
      const out = [];
      seeds.forEach((_, j) => {
        let x0 = W; let y0 = H; let x1 = -1; let y1 = -1; let cnt = 0; let sx = 0; let sy = 0;
        for (const i of solid) {
          if (owner[i] !== j) continue;
          const x = i % W; const y = (i / W) | 0;
          if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
          cnt++; sx += x; sy += y;
        }
        if (cnt < 24) return; // a crumb: the blood and meat bits cover for it
        const w = x1 - x0 + 1; const h = y1 - y0 + 1;
        const c = document.createElement('canvas'); c.width = w; c.height = h;
        const ctx = c.getContext('2d');
        const img = ctx.createImageData(w, h);
        // distance (in px, up to SOAK) from each pixel to the nearest torn edge: a pixel
        // of this cell touching a pixel of another cell
        const dist = new Float32Array(w * h).fill(SOAK);
        const edge = [];
        for (let y = y0; y <= y1; y++) {
          for (let x = x0; x <= x1; x++) {
            const i = y * W + x;
            if (owner[i] !== j) continue;
            const o = (q) => q >= 0 && q < W * H && owner[q] >= 0 && owner[q] !== j;
            if ((x > 0 && o(i - 1)) || (x < W - 1 && o(i + 1)) || o(i - W) || o(i + W)) { edge.push([x - x0, y - y0]); dist[(y - y0) * w + (x - x0)] = 0; }
          }
        }
        // spread the edge distance inward (a few passes of a chamfer sweep is plenty)
        for (let pass = 0; pass < 2; pass++) {
          for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
            const q = y * w + x; let d = dist[q];
            if (x > 0) d = Math.min(d, dist[q - 1] + 1); if (y > 0) d = Math.min(d, dist[q - w] + 1);
            if (x > 0 && y > 0) d = Math.min(d, dist[q - w - 1] + 1.4); if (x < w - 1 && y > 0) d = Math.min(d, dist[q - w + 1] + 1.4);
            dist[q] = d;
          }
          for (let y = h - 1; y >= 0; y--) for (let x = w - 1; x >= 0; x--) {
            const q = y * w + x; let d = dist[q];
            if (x < w - 1) d = Math.min(d, dist[q + 1] + 1); if (y < h - 1) d = Math.min(d, dist[q + w] + 1);
            if (x < w - 1 && y < h - 1) d = Math.min(d, dist[q + w + 1] + 1.4); if (x > 0 && y < h - 1) d = Math.min(d, dist[q + w - 1] + 1.4);
            dist[q] = d;
          }
        }
        const soot = [rand(0, 6), rand(0, 6)];
        for (let y = y0; y <= y1; y++) {
          for (let x = x0; x <= x1; x++) {
            const i = y * W + x;
            if (owner[i] !== j) continue;
            const q = (y - y0) * w + (x - x0);
            const d = dist[q];
            let r = src[i * 4]; let g = src[i * 4 + 1]; let b = src[i * 4 + 2];
            const nz = Math.sin(x * 0.9 + y * 1.7) + Math.sin(x * 0.31 - y * 0.8) * 1.3 + (Math.random() - 0.5);
            if (d < TORN) {
              // open meat, darkest at the very rim, with a pale fleck of bone here and there
              const m = meat[Math.max(0, Math.min(3, Math.round((d < 0.8 ? 1 : 2) + nz * 0.7)))];
              [r, g, b] = Math.random() < 0.008 ? [0xe6, 0xd8, 0xbc] : m;
            } else if (d < SOAK) {
              const t = 1 - (d - TORN) / (SOAK - TORN);
              const k = 0.6 * t * (0.7 + 0.3 * Math.sin(x * 1.3 + y * 0.4));
              r = r * (1 - k) + 0x6a * k; g = g * (1 - k) + 0x04 * k; b = b * (1 - k) + 0x08 * k;
            }
            // scorched by the blast: soot in blotches, heaviest away from the torn edges
            const sc = Math.max(0, Math.sin(x * 0.12 + soot[0]) * Math.sin(y * 0.15 + soot[1]) + nz * 0.15) * 0.45 * Math.min(1, d / SOAK);
            r *= 1 - sc; g *= 1 - sc * 1.05; b *= 1 - sc * 1.1;
            img.data[q * 4] = r; img.data[q * 4 + 1] = Math.max(0, g); img.data[q * 4 + 2] = Math.max(0, b); img.data[q * 4 + 3] = 255;
          }
        }
        ctx.putImageData(img, 0, 0);
        const key = `gibpiece-${++pieceId}`;
        this.scene.textures.addCanvas(key, c).setFilter(Phaser.Textures.FilterMode.NEAREST);
        const cx = sx / cnt; const cy = sy / cnt;
        out.push({ key, w, h, ox: cx - x0, oy: cy - y0, cx, cy, meat: Math.min(1, edge.length / Math.sqrt(cnt) / 3) });
      });
      return out;
    } catch { return null; }
  }

  add(p) {
    p.cont = { alpha: 1 };
    // gut ropes hang off pieces like off doll chunks (effects/GutRope.js)
    p.local = (pt) => {
      const dx = pt.x - p.x; const dy = pt.y - (p.z - p.h);
      const c = Math.cos(-p.rot); const s = Math.sin(-p.rot);
      return { x: dx * c - dy * s, y: dx * s + dy * c };
    };
    p.worldPoint = (lx, ly) => {
      const c = Math.cos(p.rot); const s = Math.sin(p.rot);
      return { x: p.x + lx * c - ly * s, y: p.z - p.h + lx * s + ly * c };
    };
    this.pieces.push(p);
    return p;
  }

  // A half drawn some other way from here on (view/SpriteEnemyView.js ragdollCut: from his
  // lying pose, hands and all): its loose bits go, or they'd be a second pair.
  dropLoose(half) {
    const gone = new Set(half?.loose ?? []);
    if (!gone.size) return;
    for (const p of gone) {
      p.img.destroy();
      if (p.tex && this.scene.textures.exists(p.tex)) this.scene.textures.remove(p.tex);
    }
    this.pieces = this.pieces.filter((p) => !gone.has(p));
    half.loose = [];
  }

  // A piece's outline around its pivot, as drawn (effects/Physics.js pieceHull): from its
  // own pixels when it has its own texture, else a rough ball the size of its cut.
  hullOf(p) {
    const img = p.img;
    const src = p.tex && this.scene.textures.exists(p.tex) ? this.scene.textures.get(p.tex).getSourceImage() : null;
    if (src?.getContext) {
      try {
        const hull = pieceHull(measureCanvas(src), img.originX * src.width, img.originY * src.height, img.scaleX, img.scaleY);
        if (hull.length >= 4) return hull;
      } catch { /* (unreadable: the ball below) */ }
    }
    const r = Math.max(6, Math.abs(p.edge ?? 6));
    return boxHull(-r, -r, r, r);
  }

  // The middle of a piece's cut face, in world (screen) coordinates.
  cutPoint(p) {
    return p.worldPoint(p.bandOff.x, p.bandOff.y);
  }

  // Execution art includes equipment on the ground. Give it its own physics,
  // instead of rotating those pixels upward with the falling torso.
  dropExecutionGear(view, equipment, dir) {
    const s=view.sprite,fr=s.frame;
    for(const poly of equipment){
      const x0=Math.floor(Math.min(...poly.map(p=>p[0]))),y0=Math.floor(Math.min(...poly.map(p=>p[1])));
      const w=Math.ceil(Math.max(...poly.map(p=>p[0])))-x0,h=Math.ceil(Math.max(...poly.map(p=>p[1])))-y0;
      const canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;
      const ctx=canvas.getContext('2d');ctx.translate(-x0,-y0);ctx.beginPath();poly.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.closePath();ctx.clip();
      ctx.drawImage(fr.source.image,fr.cutX,fr.cutY,fr.cutWidth,fr.cutHeight,0,0,fr.cutWidth,fr.cutHeight);
      const key=`execution-gear-${pieceId++}`;this.scene.textures.addCanvas(key,canvas);
      const at=spritePoint(s,view.sheet,{x:x0+w/2,y:y0+h/2});
      const img=this.scene.add.image(at.x,at.y,key).setOrigin(.5).setScale(s.scaleX,s.scaleY).setRotation(s.rotation);
      this.dropWeapon(img,view.f.z,{vx:dir*35,vh:65,spin:dir*2.2,ownedTexture:key});img.destroy();
    }
  }

  // The gear owns its own lifetime after leaving a dead enemy's hand.
  dropWeapon(source,z,{vx=70,vh=150,spin=4,ownedTexture=null}={}){
    const width=source.frame.width,height=source.frame.height;
    const dx=(.5-source.originX)*width*source.scaleX,dy=(.5-source.originY)*height*source.scaleY;
    const c=Math.cos(source.rotation),s=Math.sin(source.rotation);
    const x=source.x+dx*c-dy*s,y=source.y+dx*s+dy*c;
    const img=this.scene.add.image(x,y,source.texture.key,source.frame.name).setOrigin(.5).setScale(source.scaleX,source.scaleY).setRotation(source.rotation).setDepth(z+.2);
    const thick=Math.min(Math.abs(width*source.scaleX),Math.abs(height*source.scaleY));
    const p=this.add({img,tex:ownedTexture,x,z,h:z-y,rot:source.rotation,mode:'fly',weapon:true,life:1440,
      edge:Math.max(2,thick*.5),rest:Math.max(2,thick*.4),age:0,bleed:0,bleedDir:1,bandOff:{x:0,y:0},face:Math.sign(source.scaleX)||1,dir:Math.sign(vx)||1,
      flatAngle:Math.abs(width*source.scaleX)>=Math.abs(height*source.scaleY)?0:Math.PI/2});
    this.launch(p,vx,vh,spin);return p;
  }

  dropFlail(source,z,w,k){
    const p=this.dropWeapon(source,z,{vx:45,vh:100,spin:3});
    p.flail=new FleshChain(w.rope.map(q=>({x:q.x,y:q.y})));p.flail.limitBend=false;
    p.flail.launch(45,-100,1);p.flailRadius=Math.max(3,w.g.r*k*.8);
    p.chainG=this.scene.add.graphics().setDepth(z+.15);p.mode='flail';return p;
  }

  // A headless body done kneeling (split(): piece.limp) goes over as a jointed body from
  // exactly where it is now, pushed the way it falls (piece.limpLaunch: effects/Gore.js
  // sentenceCut) and left to gravity: it folds and flops down rather than tipping stiff.
  limpen(p) {
    const { sheet, body, sx, sy } = p.limp;
    p.limp = null;
    const img = p.img, c = Math.cos(p.rot), sn = Math.sin(p.rot);
    const ox = (sheet.ax - img.originX * sheet.fw) * sx, oy = (sheet.ay - img.originY * sheet.fh) * sy;
    const at = { x: p.x + ox * c - oy * sn, y: p.z - p.h + ox * sn + oy * c, scaleX: sx, scaleY: sy, rotation: p.rot };
    p.flex = FlexibleCut.create(this.scene, p, at, sheet, body, false);
    if (!p.flex) return; // (too small to joint: it topples stiff as before)
    p.life = Math.max(p.life ?? 540, p.age + 900);
    p.worldPoint = (x, y) => p.flex.worldPoint(x, y);
    const L = p.limpLaunch ?? {};
    p.mode = 'fly';
    p.flex.launch((p.vx ?? 0) + p.fallDir * (L.push ?? 55), L.lift ?? 25, p.fallDir * (L.spin ?? 1.4));
  }

  launch(p, vx, vh, spin, { bowl = false } = {}) {
    if (!p) return;
    Object.assign(p, { mode: 'fly', vx, vh, spin, thrown: true, rest: Math.abs(p.edge) * 0.6, bleed:p.weapon?0:Math.max(p.bleed, 120), landed: false, asleep: false, still: 0 });
    p.flex?.launch(vx,vh,spin);
    p.h = Math.max(p.h, p.rest + 1);
    if (bowl) p.bowl = new Set();
    // the legs it was sitting on are left standing... then go
    if (p.other?.mode === 'stand' && p.other.stand === Infinity) p.other.stand = 34;
  }

  update() {
    this.seams=this.seams.filter(s=>{
      if(s.a.dead||s.b.dead||!s.link.step()){s.g.destroy();return false;}
      const [a,b]=s.link.ends();
      s.g.clear().lineStyle(4,0x641b20,Math.min(s.a.cont.alpha,s.b.cont.alpha)).lineBetween(a.x,a.y,b.x,b.y);
      return true;
    });
    const gore = this.scene.gore;
    const b = this.scene.world?.bounds;
    // Keep an aftermath without accumulating an unbounded number of articulated
    // corpses. Excess older remains fade first; small gibs retain their short life.
    const remains=this.pieces.filter(p=>p.flex&&p.age<(p.life??540)-60);
    for(const p of remains.slice(0,Math.max(0,remains.length-64)))p.age=(p.life??540)-60;
    for (const p of this.pieces) {
      p.age++;
      if(p.flail){
        const floor=x=>p.z-Math.max(0,this.scene.world?.terrain?.groundAt(x,p.z)??0);
        const radii=p.flail.points.map((_,i)=>i===p.flail.points.length-1?p.flailRadius:1);
        p.flail.step(floor,b,radii);const end=p.flail.points.at(-1);p.x=end.x;p.h=p.z-end.y;
        p.rot+=p.spin/60;p.spin*=.96;
        p.chainG.clear().lineStyle(1.5,0x8c8175,p.cont.alpha);
        for(let i=1;i<p.flail.points.length;i++){const a=p.flail.points[i-1],c=p.flail.points[i];p.chainG.lineBetween(a.x,a.y,c.x,c.y);}
      }else if(p.flex){
        if(p.mode==='stand'&&--p.stand>0){p.flex.draw();}
        else{
          if(p.mode==='stand'){p.mode='fly';p.flex.launch(-p.dir*45,30,-p.dir*.7);}
          p.flex.step();
          if(p.bowl)this.bowlInto(p);
        }
      } else if (p.mode === 'rag') {
        // what's left of him as a ragdoll (view/Ragdoll.js, SpriteEnemyView.ragdollCut):
        // the piece itself is only where its cut end is now, pointing out of the wound
        const R = p.rag;
        R.step(p.env, R.face, R.k, 1);
        const P = R.pts;
        const a = P[p.ragJoint]; const o = P[p.ragOther];
        const ux = a.x - o.x; const uy = a.y - o.y;
        p.x = a.x; p.h = p.z - a.y;
        p.rot = p.bleedDir < 0 ? Math.atan2(ux, -uy) : Math.atan2(-ux, uy);
      } else if (p.mode === 'perch') {
        // sitting on its own legs, sliding very slowly along the cut, swaying
        if (p.age < 60) p.x += p.dir * 0.12;
        p.rot = Math.sin(p.age * 0.22) * 0.03 * Math.max(0, 1 - p.age / 90) - p.dir * Math.min(0.06, p.age * 0.001);
      } else if (p.mode === 'fly' && !p.weapon) {
        // a head, a lump of him: a rigid body on the floor (effects/Physics.js stepRigid) —
        // it bounces lower each time, skids, tips onto whatever side it settles on
        p.hull ??= this.hullOf(p);
        if (!p.landed) { p.vx *= 0.998; p.spin *= 0.997; } // (a little air drag)
        const floor = Math.max(0, this.scene.world?.terrain?.groundAt?.(p.x, p.z) ?? 0);
        const hit = stepRigid(p, p.hull, floor, { gravity: GRAVITY, bounce: p.gib ? 0.42 : 0.36, friction: p.roll ? 0.9 : 0.6, roll: p.roll });
        if (b && (p.x < b.minX + 4 || p.x > b.maxX - 4)) {
          p.x = Math.max(b.minX + 4, Math.min(b.maxX - 4, p.x));
          p.vx = -p.vx * 0.35; p.spin = -p.spin * 0.5; p.asleep = false;
          gore?.burst(p.x, p.z, p.h, Math.sign(p.vx) || 1, Math.round((p.gib ? 5 : 16) * (gore.amount ?? 1)), 0.8);
          if (!p.gib) this.scene.fx?.shake(3, 6);
        }
        if (p.bowl) this.bowlInto(p);
        if (p.thrown && !p.landed && gore?.level > 0 && p.age % 2 === 0) {
          const cp = this.cutPoint(p);
          gore.spawn({ x: cp.x, z: p.z + rand(-2, 2), h: Math.max(1, p.z - cp.y), vx: -p.vx * 0.1 + rand(-20, 20), vz: 0, vh: rand(-10, 30), tint: 0x7a0303, scale: rand(0.35, 0.7) });
        }
        if (hit > 140 && !p.landed) {
          // the first hard landing: the wet thud, a spray, blood thrown about
          p.landed = true;
          landThud(this.scene, p.gib);
          if (gore?.level > 0) {
            gore.burst(p.x, p.z, 4, Math.sign(p.vx) || p.face, Math.round((p.gib ? 6 : 16) * (gore.amount ?? 1)), 0.6);
            for (let i = 0; i < (p.gib ? 1 : 3); i++) gore.splat(p.x + rand(-26, 26) * (p.gib ? 0.4 : 1), p.z + rand(-4, 4), rand(1.6, 3) * (p.gib ? 0.6 : 1));
          }
        } else if (hit > 260 && gore?.level > 0) gore.splat(p.x, p.z, p.gib ? 0.7 : 1.2); // (coming down again)
        else if (hit) p.landed = true;
        // smeared along where it skids or rolls
        if (p.touching && !p.asleep && Math.abs(p.vx) > 40 && p.age % 4 === 0 && gore?.level > 0) gore.splat(p.x, p.z + rand(-1, 1), rand(0.5, 0.9) * (p.gib ? 0.6 : 1), 0.55);
      } else if (p.mode === 'fly') {
        p.vh -= GRAVITY / 60;
        p.h += p.vh / 60;
        p.x += p.vx / 60;
        p.rot += p.spin / 60; // radians per second
        if (!p.landed) { p.vx *= 0.998; p.spin *= 0.997; } // (a little air drag)
        // off the arena walls
        if (b && (p.x < b.minX + 4 || p.x > b.maxX - 4)) {
          p.x = Math.max(b.minX + 4, Math.min(b.maxX - 4, p.x));
          p.vx = -p.vx * 0.35; p.spin = -p.spin * 0.5;
          if(!p.weapon)gore?.burst(p.x, p.z, p.h, Math.sign(p.vx) || 1, Math.round((p.gib ? 5 : 16) * (gore.amount ?? 1)), 0.8);
          if (!p.gib) this.scene.fx?.shake(3, 6);
        }
        if (p.bowl) this.bowlInto(p);
        // a thrown piece trails blood in the air
        if (!p.weapon && p.thrown && !p.landed && gore?.level > 0 && p.age % 2 === 0) {
          const cp = this.cutPoint(p);
          gore.spawn({ x: cp.x, z: p.z + rand(-2, 2), h: Math.max(1, p.z - cp.y), vx: -p.vx * 0.1 + rand(-20, 20), vz: 0, vh: rand(-10, 30), tint: 0x7a0303, scale: rand(0.35, 0.7) });
        }
        // (how far its middle is from the floor it's turning on: what turns spin into roll)
        const R = Math.max(6, Math.abs(p.edge));
        if (p.h <= p.rest) {
          p.h = p.rest;
          if (Math.abs(p.vh) > 90) {
            // it hits, bounces, and the floor grabs it: the skid turns it over (the spin it
            // comes away with is part how it was turning, part how fast it was sliding)
            // and a lopsided thing lands lopsided — a kick of spin either way
            p.vh = -p.vh * (p.gib ? 0.38 : 0.3);
            p.spin = p.spin * 0.45 + (p.vx / R) * 0.35 + rand(-2.5, 2.5) * Math.min(1, Math.abs(p.vh) / 200);
            p.vx *= 0.62;
            if (!p.thudded) { p.thudded = true; if(p.weapon)playSfx(this.scene,'block',{volume:.2,pitch:450,minGapMs:100});else landThud(this.scene, p.gib); }
            if (!p.weapon && gore?.level > 0) {
              gore.burst(p.x, p.z, 4, Math.sign(p.vx) || p.face, Math.round((p.gib ? 6 : 16) * (gore.amount ?? 1)), 0.6);
              for (let i = 0; i < (p.gib ? 1 : 3); i++) gore.splat(p.x + rand(-26, 26) * (p.gib ? 0.4 : 1), p.z + rand(-4, 4), rand(1.6, 3) * (p.gib ? 0.6 : 1));
            }
          } else if (p.roll && Math.abs(p.vx) > 8) {
            // a head rolls on along the floor, turning with its speed, leaving a smear
            p.vh = 0; p.vx *= p.roll;
            const r = Math.max(6, Math.abs(p.edge));
            p.rest = r * 0.9;
            p.spin = p.vx / r;
            if (gore?.level > 0 && p.age % 5 === 0) gore.splat(p.x, p.z + rand(-1, 1), rand(0.5, 0.9));
          } else {
            // on the floor: it slides to a stop, the friction rolling it over as it goes, and
            // rocks down onto its flattest side (weight, not a snap to the floor)
            p.vh = 0;
            p.landed = true;
            p.vx *= 0.9;
            p.spin += (p.vx / R - p.spin) * 0.2;
            if (p.thrown) {
              // halves lie on their flat sides; a gib on whichever face is nearest
              const step = p.gib ? Math.PI / 2 : Math.PI;
              const off = p.weapon?p.flatAngle:p.gib ? 0 : Math.PI / 2;
              const side = Math.round((p.rot - off) / step) * step + off;
              p.spin += (side - p.rot) * 16;  // tipping onto that side...
              p.spin *= 0.86;                 // ...and rocking to a stop on it
              if (!p.gib) p.rest += (Math.abs(p.edge) * 0.45 - p.rest) * 0.12; // lies lower than it stood
            } else {
              p.spin *= 0.6;
            }
          }
        }
      } else if (p.mode === 'stand') {
        // the legs don't know yet: whatever they were doing carries them on a moment
        // (a runner's legs manage half of one more stride) before they go over
        if (p.vx) { p.x += p.vx / 60; p.vx *= 0.88; p.rot = p.fallDir * Math.min(0.1, p.age * 0.006); }
        // (a headless body kept kneeling: it sways, or it shudders, before it goes)
        if (p.sway) p.rot = Math.sin(p.age * 0.07) * 0.05 * Math.min(1, p.age / 30);
        if (p.shudder) p.rot = (Math.random() - 0.5) * 0.07 * Math.min(1, p.stand / 30);
        if (--p.stand <= 0) { p.mode = 'topple'; p.toppleV = 0; if (p.limp) this.limpen(p); }
      } else if (p.mode === 'topple') {
        // going over: slow off the vertical, faster the further it leans (its weight)
        p.toppleV += (p.toppleSpeed ?? 0.006) + Math.abs(Math.sin(p.rot)) * 0.006;
        const target = p.fallDir * (p.toppleTo ?? Math.PI / 2 * 0.96);
        p.rot += Math.sign(target - p.rot) * p.toppleV;
        if (Math.abs(p.rot) >= Math.abs(target) && !p.rebound && p.toppleV > 0.05) {
          // it hits the floor and bounces back a little before it settles
          p.rot = target; p.rebound = true; p.toppleV = -p.toppleV * 0.3;
        } else if (Math.abs(p.rot) >= Math.abs(target)) {
          p.rot = target; p.mode = 'down';
          if (gore?.level > 0) {
            gore.burst(p.x + p.fallDir * 20, p.z, 3, p.fallDir, Math.round(10 * (gore.amount ?? 1)), 0.5);
            gore.splat(p.x + p.fallDir * 30, p.z, rand(2, 3.2));
          }
        }
      }

      // pumping blood from the cut face, in beats
      if (p.bleed > 0 && gore?.level > 0) {
        p.bleed--;
        if (p.age % 2 === 0) {
          const cp = this.cutPoint(p);
          const normal=p.bloodNormal??{x:0,y:1};
          const nx = (normal.x*Math.cos(p.rot)-normal.y*Math.sin(p.rot))*p.bleedDir;
          const ny = (normal.x*Math.sin(p.rot)+normal.y*Math.cos(p.rot))*p.bleedDir;
          const pump = (0.55 + 0.45 * Math.max(0, Math.sin(p.age * 0.35)) * (p.bleed / 200)) * (p.pump ?? 1);
          // Brief theatrical geyser, then pressure falls into distinct smaller pulses.
          const pressure=p.pressureCut?(p.age<18?620:p.age<60?340:150):150;
          const jets=p.pressureCut&&gore.level>1?(p.age<60?(p.age%4===0?5:4):3):1;
          for(let jet=0;jet<jets;jet++)gore.spawn({
            x: cp.x + rand(-4, 4), z: p.z + rand(-1.5, 1.5), h: Math.max(1, p.z - cp.y),
            vx: nx * pressure * pump + rand(-30, 30), vz: rand(-10, 10),
            vh: -ny * pressure * pump + 40, tint: 0x8a0303, scale: rand(0.35, p.pressureCut&&p.age<18?1.15:0.75),
          });
        }
      }

      const img = p.img;
      const depth = p.z + (p.mode === 'fly' ? 0.2 : 0);
      img.setPosition(p.x, p.z - p.h).setRotation(p.rot).setDepth(depth);
      if (p.age > (p.life??540)-60) {
        p.cont.alpha = Math.max(0, 1 - (p.age - ((p.life??540)-60)) / 60);
        img.setAlpha(p.cont.alpha);
      }
      p.rag?.look(p.z, p.cont.alpha, false, null, null);
      if(p.flex)p.flex.draw();
    }
    const gone = this.pieces.filter((p) => p.age > (p.life??540));
    for (const p of gone) {
      p.dead = true;
      p.img.destroy();
      p.rag?.destroy();
      p.flex?.destroy();
      p.chainG?.destroy();
      if (p.tex && this.scene.textures.exists(p.tex)) this.scene.textures.remove(p.tex);
    }
    if (gone.length) this.pieces = this.pieces.filter((p) => p.age <= (p.life??540));
  }

  // A kicked torso is a bowling ball: anyone standing in its path goes down.
  bowlInto(p) {
    const world = this.scene.world;
    if (!world || Math.abs(p.vx) < 120) return;
    for (const e of world.fighters) {
      if (e.team !== 'enemy' || !e.alive || p.bowl.has(e.id) || ['executed', 'knockdown', 'getup', 'dead'].includes(e.state)) continue;
      if (Math.abs(e.x - p.x) > e.stats.body.w * 0.55 + 12 || Math.abs(e.z - p.z) > 26 || p.h > e.stats.body.h + 10) continue;
      p.bowl.add(e.id);
      const dir = Math.sign(p.vx);
      e.health = Math.max(1, e.health - 12);
      e.fsm.change('knockdown', { vx: dir * Math.abs(p.vx) * 0.6, vh: 280 });
      e.bowl = { frames: 24, dir, hit: new Set([e.id]) }; // and he takes the next one down
      p.vx *= 0.6;
      p.spin *= -0.7;
      world.events.emit('bowl', { fighter: e, by: null, x: (e.x + p.x) / 2, z: e.z, h: Math.max(20, p.h) });
      this.scene.gore?.burst(p.x, p.z, p.h, dir, Math.round(20 * (this.scene.gore.amount ?? 1)), 1);
    }
  }

  clear() {
    for(const s of this.seams)s.g.destroy();this.seams=[];
    for (const p of this.pieces) {
      p.img.destroy();
      p.rag?.destroy();
      p.flex?.destroy();
      p.chainG?.destroy();
      if (p.tex && this.scene.textures.exists(p.tex)) this.scene.textures.remove(p.tex);
    }
    this.pieces = [];
  }
}
