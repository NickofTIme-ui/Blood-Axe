// raster.js — A tiny pixel-art painter. Enemy body parts are painted with it at boot
// (see view/enemyArt.js): shaded 3D-ish volumes (ellipses, capsules), flat polygons,
// dithering, grime, blood splatter and an automatic dark outline.
//
// Coordinates are art pixels. Each art pixel is drawn P screen pixels wide.

const BAYER = [[0, 0.5], [0.75, 0.25]];
const LIGHT = (() => {
  const v = [0.5, -0.62, 0.6];
  const l = Math.hypot(...v);
  return v.map((c) => c / l);
})();

export const BLOOD = ['#3e0303', '#5e0505', '#840808', '#a80e0e', '#c81c16'];

function mulberry32(a) {
  return function rand() {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hexToRgb(c) {
  const n = parseInt(c.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function inPoly(pts, x, y) {
  let inside = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, yi] = pts[i];
    const [xj, yj] = pts[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

export class Raster {
  constructor(w, h, seed = 7) {
    this.w = w;
    this.h = h;
    this.px = new Array(w * h).fill(null);
    this.rand = mulberry32(seed * 9973 + w * 31 + h);
  }

  r(a, b) { return a + this.rand() * (b - a); }
  pick(arr) { return arr[Math.floor(this.rand() * arr.length)]; }

  set(x, y, c) {
    x = Math.floor(x); y = Math.floor(y);
    if (!c || x < 0 || y < 0 || x >= this.w || y >= this.h) return;
    this.px[y * this.w + x] = c;
  }
  get(x, y) {
    x = Math.floor(x); y = Math.floor(y);
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return null;
    return this.px[y * this.w + x];
  }
  clear(x, y) {
    x = Math.floor(x); y = Math.floor(y);
    if (x >= 0 && y >= 0 && x < this.w && y < this.h) this.px[y * this.w + x] = null;
  }
  // Paint only where something is already painted (clothes over skin, etc.)
  over(x, y, c) { if (this.get(x, y)) this.set(x, y, c); }

  // Pick a colour from a dark->light ramp for brightness v (0..1), with ordered dither.
  tone(ramp, v, x, y, noise = 0.18) {
    const n = ramp.length;
    const f = v * (n - 1) + (BAYER[y & 1][x & 1] - 0.375) * 0.7 + (this.rand() - 0.5) * noise * 2;
    return ramp[Math.max(0, Math.min(n - 1, Math.round(f)))];
  }

  lit(nx, ny, nz) {
    return Math.max(0, Math.min(1, 0.16 + 0.92 * Math.max(0, nx * LIGHT[0] + ny * LIGHT[1] + nz * LIGHT[2])));
  }

  put(x, y, c, o) {
    if (o.clip && !this.get(x, y)) return;
    if (o.under && this.get(x, y)) return;
    this.set(x, y, c);
  }

  // Shaded ellipse (a sphere-ish lump: heads, fists, bellies, balls).
  ellipse(cx, cy, rx, ry, ramp, o = {}) {
    for (let y = Math.floor(cy - ry - 1); y <= Math.ceil(cy + ry); y++) {
      for (let x = Math.floor(cx - rx - 1); x <= Math.ceil(cx + rx); x++) {
        const dx = (x + 0.5 - cx) / rx;
        const dy = (y + 0.5 - cy) / ry;
        const d2 = dx * dx + dy * dy;
        if (d2 > 1) continue;
        const v = this.lit(dx, dy, Math.sqrt(1 - d2)) + (o.bias ?? 0);
        this.put(x, y, o.color ?? this.tone(ramp, v, x, y, o.noise), o);
      }
    }
    return this;
  }

  // Shaded capsule (a tapered cylinder: limbs, torsos, handles).
  capsule(x0, y0, r0, x1, y1, r1, ramp, o = {}) {
    const vx = x1 - x0;
    const vy = y1 - y0;
    const len2 = vx * vx + vy * vy || 1;
    const R = Math.max(r0, r1);
    for (let y = Math.floor(Math.min(y0, y1) - R - 1); y <= Math.ceil(Math.max(y0, y1) + R); y++) {
      for (let x = Math.floor(Math.min(x0, x1) - R - 1); x <= Math.ceil(Math.max(x0, x1) + R); x++) {
        const px = x + 0.5;
        const py = y + 0.5;
        const t = Math.max(0, Math.min(1, ((px - x0) * vx + (py - y0) * vy) / len2));
        const r = r0 + (r1 - r0) * t;
        const ox = px - (x0 + vx * t);
        const oy = py - (y0 + vy * t);
        const d2 = (ox * ox + oy * oy) / (r * r);
        if (d2 > 1) continue;
        const v = this.lit(ox / r, oy / r, Math.sqrt(1 - d2)) + (o.bias ?? 0);
        this.put(x, y, o.color ?? this.tone(ramp, v, x, y, o.noise), o);
      }
    }
    return this;
  }

  // Flat polygon with a gentle top-to-bottom gradient (cloth, blades, plates).
  poly(pts, ramp, o = {}) {
    const xs = pts.map((p) => p[0]);
    const ys = pts.map((p) => p[1]);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    const grad = o.grad ?? 0.25;
    for (let y = Math.floor(minY); y <= Math.ceil(maxY); y++) {
      for (let x = Math.floor(Math.min(...xs)); x <= Math.ceil(Math.max(...xs)); x++) {
        if (!inPoly(pts, x + 0.5, y + 0.5)) continue;
        const t = maxY > minY ? (y - minY) / (maxY - minY) : 0.5;
        const v = (o.v ?? 0.55) + grad * (0.5 - t);
        this.put(x, y, o.color ?? this.tone(ramp, v, x, y, o.noise), o);
      }
    }
    return this;
  }

  rect(x, y, w, h, ramp, o = {}) {
    return this.poly([[x, y], [x + w, y], [x + w, y + h], [x, y + h]], ramp, o);
  }

  line(x0, y0, x1, y1, c, o = {}) {
    const steps = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1) * 2;
    for (let i = 0; i <= steps; i++) {
      const x = x0 + ((x1 - x0) * i) / steps;
      const y = y0 + ((y1 - y0) * i) / steps;
      const col = Array.isArray(c) ? c[Math.floor(i / 2) % c.length] : c;
      this.put(x, y, col, o);
      if (o.thick) this.put(x + (Math.abs(y1 - y0) > Math.abs(x1 - x0) ? 1 : 0), y + (Math.abs(y1 - y0) > Math.abs(x1 - x0) ? 0 : 1), col, o);
    }
    return this;
  }

  dot(x, y, c, o = {}) { this.put(x, y, c, o); return this; }

  // Rivets / studs: a bright pixel with a dark one under it.
  stud(x, y, light = '#c8c0b0', dark = '#1a1410') {
    this.over(x, y + 1, dark);
    this.over(x, y, light);
    return this;
  }

  // A spike pointing from (x,y) in direction (dx,dy).
  spike(x, y, dx, dy, len, light = '#b8bcc4', dark = '#3a3a40') {
    for (let i = 0; i <= len; i++) {
      this.set(x + dx * i, y + dy * i, i === len ? light : i % 2 ? light : dark);
    }
    return this;
  }

  // Chain-mail / chain links across an area (only over painted pixels).
  chain(x0, y0, x1, y1, o = {}) {
    const n = Math.max(2, Math.round(Math.hypot(x1 - x0, y1 - y0) / 2));
    for (let i = 0; i <= n; i++) {
      const x = x0 + ((x1 - x0) * i) / n;
      const y = y0 + ((y1 - y0) * i) / n;
      const c = i % 2 ? '#8a8a90' : '#50505a';
      if (o.clip) this.over(x, y, c); else this.set(x, y, c);
      if (i % 2 === 0) (o.clip ? this.over : this.set).call(this, x + 1, y, '#2a2a30');
    }
    return this;
  }

  // Random dark grime over painted pixels.
  grime(n, colors = ['#00000033']) {
    for (let i = 0; i < n; i++) {
      const x = Math.floor(this.rand() * this.w);
      const y = Math.floor(this.rand() * this.h);
      const c = this.get(x, y);
      if (c) this.set(x, y, darken(c, 0.72 + this.rand() * 0.15));
    }
    return this;
  }

  // Blood: spatters and drips over painted pixels, optionally inside a region.
  blood(n, region = null) {
    const [rx0, ry0, rx1, ry1] = region ?? [0, 0, this.w, this.h];
    for (let i = 0; i < n; i++) {
      let x = Math.floor(this.r(rx0, rx1));
      let y = Math.floor(this.r(ry0, ry1));
      if (!this.get(x, y)) continue;
      const c = this.pick(BLOOD.slice(1));
      this.over(x, y, c);
      if (this.rand() < 0.5) this.over(x + 1, y, this.pick(BLOOD));
      if (this.rand() < 0.4) {
        const len = 1 + Math.floor(this.rand() * 4);
        for (let k = 1; k <= len && this.get(x, y + k); k++) this.over(x, y + k, k === len ? BLOOD[3] : BLOOD[1]);
      }
    }
    return this;
  }

  // Produce a canvas (1px margin all round for the outline).
  toCanvas(outline = '#0c0505') {
    const W = this.w + 2;
    const H = this.h + 2;
    const c = document.createElement('canvas');
    c.width = W;
    c.height = H;
    const ctx = c.getContext('2d');
    const img = ctx.createImageData(W, H);
    const cache = new Map();
    const rgb = (h) => {
      if (!cache.has(h)) cache.set(h, hexToRgb(h));
      return cache.get(h);
    };
    const filled = (x, y) => x >= 0 && y >= 0 && x < this.w && y < this.h && this.px[y * this.w + x];
    const ol = rgb(outline);
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const i = (y * W + x) * 4;
        const src = filled(x - 1, y - 1);
        let col = null;
        if (src) col = rgb(src);
        else if (outline && (filled(x - 2, y - 1) || filled(x, y - 1) || filled(x - 1, y - 2) || filled(x - 1, y))) col = ol;
        if (!col) continue;
        img.data[i] = col[0]; img.data[i + 1] = col[1]; img.data[i + 2] = col[2]; img.data[i + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);
    return c;
  }
}

export function darken(hex, k) {
  const [r, g, b] = hexToRgb(hex.slice(0, 7));
  const f = (v) => Math.max(0, Math.min(255, Math.round(v * k))).toString(16).padStart(2, '0');
  return `#${f(r)}${f(g)}${f(b)}`;
}
