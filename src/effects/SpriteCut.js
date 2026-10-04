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

const GRAVITY = 1700;

const CUTS = {
  legs: 0.3,   // height of the cut, as a share of the body
  waist: 0.5,
  waistPerch: 0.5,
  neck: 0.83,
  diagDown: 0.6, // the chain's falling diagonal (chest height at his middle)
  diagUp: 0.56,  // ...and its rising answer
};
// slope of the cut line, per px TOWARD the way the blade is travelling (the attacker's
// facing): negative = the line climbs that way (a falling cut starts high on the far side)
const SLOPE = { diagDown: -0.5, diagUp: 0.5 };

const rand = (a, b) => a + Math.random() * (b - a);
let pieceId = 0;

export class SpriteCuts {
  constructor(scene) {
    this.scene = scene;
    this.pieces = [];
  }

  // Returns { upper, lower } pieces; hides nothing itself (the view hides its sprite).
  split(view, cut, dir) {
    const f = view.f;
    const s = view.sprite;
    const sh = view.sheet;
    const res = sh.res;
    const k = Math.abs(s.scaleY) || 1 / res; // (the size he's drawn at, depth scaling included)
    const face = Math.sign(s.scaleX) || f.facing;
    const bodyH = f.stats.body.h;
    const cutH = bodyH * (CUTS[cut] ?? 0.5);
    const yCut = Math.round(sh.ay - cutH * res);                // cut line in frame px
    const top = Math.max(0, Math.round(sh.ay - bodyH * 1.12 * res));
    const yc = (top + yCut) / 2;                                 // centre of the top piece
    const key = s.texture.key;
    const frame = s.frame.name;
    const feetY = f.z - f.h;
    const perch = cut === 'waistPerch';

    // The two pieces are his own picture, divided along the cut line and nothing else:
    // same pixels, same proportions, nothing added outside his outline. The wound is
    // painted INTO the few rows either side of the line (bake()).
    const slope = (SLOPE[cut] ?? 0) * dir * face; // the line in the drawn (unmirrored) frame
    const baked = this.bake(s.frame, sh, yCut, slope, cut, f.stats.body.w * res);
    const mk = (texKey, cropY, cropH, oy) => {
      const img = texKey ? this.scene.add.image(f.x, feetY, texKey) : this.scene.add.image(f.x, feetY, key, frame).setCrop(0, cropY, sh.fw, cropH);
      return img.setOrigin(sh.ax / sh.fw, oy / sh.fh).setScale(k * face, k).setDepth(f.z);
    };
    const bandX = baked?.midX ?? sh.ax;

    const upper = this.add({
      img: mk(baked?.upper, 0, yCut, yc), tex: baked?.upper, x: f.x, z: f.z, h: f.h + (sh.ay - yc) * k, mode: perch ? 'perch' : 'fly',
      vx: 0, vh: 0, rot: s.rotation, spin: 0, face, k, dir,
      edge: (yCut - yc) * k,   // cut face: this far below the piece's centre
      rest: (yCut - yc) * k,   // lands standing on its cut
      bleed: 170, bleedDir: 1, age: 0,
      bandOff: { x: (bandX - sh.ax) * k * face, y: (yCut - yc) * k },
    });
    const lower = this.add({
      img: mk(baked?.lower, yCut, sh.fh - yCut, sh.ay), tex: baked?.lower, x: f.x, z: f.z, h: f.h, mode: 'stand',
      vx: 0, vh: 0, rot: s.rotation, spin: 0, face, k, dir,
      edge: -(sh.ay - yCut) * k, // cut face: this far above the feet
      // legs: the sweep knocks them straight over (the torso drops where they stood);
      // a perched top half keeps the legs standing until it's kicked off them
      stand: perch ? Infinity : cut === 'legs' ? 2 : 14, fallDir: dir, bleed: 220, bleedDir: -1, age: 0,
      toppleSpeed: cut === 'legs' ? 0.03 : 0.006,
      bandOff: { x: (bandX - sh.ax) * k * face, y: -(sh.ay - yCut) * k },
    });
    upper.other = lower;
    lower.other = upper;
    return { upper, lower };
  }

  // Divide one frame along the line y = yCut + slope * (x - ax) into two full-frame
  // canvases (above / below), and paint the cut faces: for a few rows either side of the
  // line, the pixels that are ALREADY his body become wet red meat with a dark rim, a
  // pale fleck of spine toward his back, and a blood stain soaking a little further in.
  // Nothing is drawn where he wasn't: both pieces keep his exact outline and size.
  // Returns { upper, lower, midX } (texture keys; midX = middle of the cut, frame px).
  bake(frame, sh, yCut, slope, cut, bodyW) {
    try {
      const W = frame.cutWidth;
      const H = frame.cutHeight;
      const mkc = () => { const c = document.createElement('canvas'); c.width = W; c.height = H; return c; };
      const srcC = mkc();
      const sctx = srcC.getContext('2d', { willReadFrequently: true });
      sctx.drawImage(frame.source.image, frame.cutX, frame.cutY, W, H, 0, 0, W, H);
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
          const d = y + 0.5 - ly;
          const out = d < 0 ? up : lo;
          const a = Math.abs(d);
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
      if (x1 > x0 && cut !== 'legs') {
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
      const keys = [up, lo].map((img, i) => {
        const c = mkc();
        c.getContext('2d').putImageData(img, 0, 0);
        const key = `cutpiece-${++pieceId}-${i ? 'lo' : 'up'}`;
        this.scene.textures.addCanvas(key, c).setFilter(Phaser.Textures.FilterMode.NEAREST);
        return key;
      });
      return { upper: keys[0], lower: keys[1], midX: x1 > x0 ? (x0 + x1) / 2 : sh.ax };
    } catch { return null; }
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

  // The middle of a piece's cut face, in world (screen) coordinates.
  cutPoint(p) {
    return p.worldPoint(p.bandOff.x, p.bandOff.y);
  }

  launch(p, vx, vh, spin, { bowl = false } = {}) {
    if (!p) return;
    Object.assign(p, { mode: 'fly', vx, vh, spin, thrown: true, rest: Math.abs(p.edge) * 0.6, bleed: Math.max(p.bleed, 120), landed: false });
    p.h = Math.max(p.h, p.rest + 1);
    if (bowl) p.bowl = new Set();
    // the legs it was sitting on are left standing... then go
    if (p.other?.mode === 'stand' && p.other.stand === Infinity) p.other.stand = 34;
  }

  update() {
    const gore = this.scene.gore;
    const b = this.scene.world?.bounds;
    for (const p of this.pieces) {
      p.age++;
      if (p.mode === 'perch') {
        // sitting on its own legs, sliding very slowly along the cut, swaying
        if (p.age < 60) p.x += p.dir * 0.12;
        p.rot = Math.sin(p.age * 0.22) * 0.03 * Math.max(0, 1 - p.age / 90) - p.dir * Math.min(0.06, p.age * 0.001);
      } else if (p.mode === 'fly') {
        p.vh -= GRAVITY / 60;
        p.h += p.vh / 60;
        p.x += p.vx / 60;
        p.rot += p.spin / 60; // radians per second
        // off the arena walls
        if (b && (p.x < b.minX + 4 || p.x > b.maxX - 4)) {
          p.x = Math.max(b.minX + 4, Math.min(b.maxX - 4, p.x));
          p.vx = -p.vx * 0.35; p.spin = -p.spin * 0.5;
          gore?.burst(p.x, p.z, p.h, Math.sign(p.vx) || 1, Math.round((p.gib ? 5 : 16) * (gore.amount ?? 1)), 0.8);
          if (!p.gib) this.scene.fx?.shake(3, 6);
        }
        if (p.bowl) this.bowlInto(p);
        // a thrown piece trails blood in the air
        if (p.thrown && !p.landed && gore?.level > 0 && p.age % 2 === 0) {
          const cp = this.cutPoint(p);
          gore.spawn({ x: cp.x, z: p.z + rand(-2, 2), h: Math.max(1, p.z - cp.y), vx: -p.vx * 0.1 + rand(-20, 20), vz: 0, vh: rand(-10, 30), tint: 0x7a0303, scale: rand(0.35, 0.7) });
        }
        if (p.h <= p.rest) {
          p.h = p.rest;
          if (Math.abs(p.vh) > 160) {
            p.vh = -p.vh * 0.22; p.vx *= 0.5; p.spin *= 0.4; // thud, a small bounce
            if (gore?.level > 0) {
              gore.burst(p.x, p.z, 4, Math.sign(p.vx) || p.face, Math.round((p.gib ? 6 : 16) * (gore.amount ?? 1)), 0.6);
              for (let i = 0; i < (p.gib ? 1 : 3); i++) gore.splat(p.x + rand(-26, 26) * (p.gib ? 0.4 : 1), p.z + rand(-4, 4), rand(1.6, 3) * (p.gib ? 0.6 : 1));
            }
          } else {
            p.vh = 0; p.vx *= 0.8; p.spin *= 0.6;
            p.landed = true;
            if (p.thrown && !p.gib) {
              const side = Math.round((p.rot - Math.PI / 2) / Math.PI) * Math.PI + Math.PI / 2;
              p.rot += (side - p.rot) * 0.18;
              p.rest += (Math.abs(p.edge) * 0.45 - p.rest) * 0.2; // lies lower than it stood
            }
          }
        }
      } else if (p.mode === 'stand') {
        // the legs don't know yet: whatever they were doing carries them on a moment
        // (a runner's legs manage half of one more stride) before they go over
        if (p.vx) { p.x += p.vx / 60; p.vx *= 0.88; p.rot = p.fallDir * Math.min(0.1, p.age * 0.006); }
        if (--p.stand <= 0) { p.mode = 'topple'; p.toppleV = 0; }
      } else if (p.mode === 'topple') {
        p.toppleV += p.toppleSpeed ?? 0.006;
        const target = p.fallDir * Math.PI / 2 * 0.96;
        p.rot += Math.sign(target - p.rot) * p.toppleV;
        if (Math.abs(p.rot) >= Math.abs(target)) {
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
          const nx = -Math.sin(p.rot) * p.bleedDir;
          const ny = Math.cos(p.rot) * p.bleedDir;
          const pump = (0.55 + 0.45 * Math.max(0, Math.sin(p.age * 0.35)) * (p.bleed / 200)) * (p.pump ?? 1);
          gore.spawn({
            x: cp.x + rand(-4, 4), z: p.z + rand(-1.5, 1.5), h: Math.max(1, p.z - cp.y),
            vx: nx * 150 * pump + rand(-30, 30), vz: rand(-10, 10),
            vh: -ny * 150 * pump + 40, tint: 0x8a0303, scale: rand(0.35, 0.75),
          });
        }
      }

      const img = p.img;
      const depth = p.z + (p.mode === 'fly' ? 0.2 : 0);
      img.setPosition(p.x, p.z - p.h).setRotation(p.rot).setDepth(depth);
      if (p.age > 480) {
        p.cont.alpha = Math.max(0, 1 - (p.age - 480) / 60);
        img.setAlpha(p.cont.alpha);
      }
    }
    const gone = this.pieces.filter((p) => p.age > 540);
    for (const p of gone) {
      p.dead = true;
      p.img.destroy();
      if (p.tex && this.scene.textures.exists(p.tex)) this.scene.textures.remove(p.tex);
    }
    if (gone.length) this.pieces = this.pieces.filter((p) => p.age <= 540);
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
    for (const p of this.pieces) {
      p.img.destroy();
      if (p.tex && this.scene.textures.exists(p.tex)) this.scene.textures.remove(p.tex);
    }
    this.pieces = [];
  }
}
