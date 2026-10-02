// stripImporter.js — Turns an AI-generated animation strip (N poses in a row) into
// game-ready frames AT BOOT, in the browser. It's the JavaScript twin of
// tools/sprite-pipeline/strip_to_frames.py, so new strips need no Python:
//
//   1. remove the background (flood fill from the edges; dark armour inside stays)
//   2. find the N figures (separate shapes, or split touching ones at the emptiest columns)
//   3. scale every pose so he stands the same height as the main sheet
//   4. line up the feet on one baseline and the torso on one centre line
//   5. smooth downscale, hard alpha edge, then snap colours to the shared palette
//
// Result: a texture `<sheet>-<name>` with frames f0..f(N-1), same frame size and anchor
// as the main sprite sheet, so SpriteFighterView can mix them freely.

import { paintMarkerWounds } from './woundPaint.js';

const FRAME_W = 208;
const FRAME_H = 240;
const ANCHOR_X = 104;
const ANCHOR_Y = 230;

function loadPixels(img) {
  const c = document.createElement('canvas');
  c.width = img.width;
  c.height = img.height;
  const ctx = c.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(img, 0, 0);
  return { c, ctx, data: ctx.getImageData(0, 0, c.width, c.height), W: c.width, H: c.height };
}

// Background = transparent, or dark (black bg), reached from the image edges — and from
// `holes`: [[x, y], ...] source-pixel points inside pockets of background that a figure
// closes off (the gap between a cloak and an arm), which the edges can't reach.
function backgroundMask({ data, W, H }, bg = 'black', holes = []) {
  const d = data.data;
  const isBgColour = (p) => {
    const i = p * 4;
    if (d[i + 3] < 24) return true;
    if (bg === 'magenta') return Math.hypot(d[i] - 248, d[i + 1] - 8, d[i + 2] - 248) < 110;
    return Math.max(d[i], d[i + 1], d[i + 2]) < 14;
  };
  const bgm = new Uint8Array(W * H);
  const stack = [];
  const push = (p) => { if (!bgm[p] && isBgColour(p)) { bgm[p] = 1; stack.push(p); } };
  for (let x = 0; x < W; x++) { push(x); push((H - 1) * W + x); }
  for (let y = 0; y < H; y++) { push(y * W); push(y * W + W - 1); }
  for (const [x, y] of holes) if (x >= 0 && x < W && y >= 0 && y < H) push(y * W + x);
  while (stack.length) {
    const p = stack.pop();
    const x = p % W;
    if (x > 0) push(p - 1);
    if (x < W - 1) push(p + 1);
    if (p >= W) push(p - W);
    if (p < W * (H - 1)) push(p + W);
  }
  // enclosed transparent holes are background too
  for (let p = 0; p < W * H; p++) if (d[p * 4 + 3] < 24) bgm[p] = 1;
  const fg = new Uint8Array(W * H);
  for (let p = 0; p < W * H; p++) fg[p] = bgm[p] ? 0 : 1;
  return fg;
}

// Connected shapes (8-way, bridging 2px gaps so a blade split by an outline stays whole).
function components(fg, W, H) {
  const label = new Int32Array(W * H);
  const comps = [];
  for (let p = 0; p < W * H; p++) {
    if (!fg[p] || label[p]) continue;
    const id = comps.length + 1;
    const c = { id, n: 0, sx: 0, x0: W, x1: 0, y0: H, y1: 0 };
    const stack = [p];
    label[p] = id;
    while (stack.length) {
      const q = stack.pop();
      const x = q % W;
      const y = (q / W) | 0;
      c.n++; c.sx += x;
      if (x < c.x0) c.x0 = x; if (x > c.x1) c.x1 = x;
      if (y < c.y0) c.y0 = y; if (y > c.y1) c.y1 = y;
      for (let dy = -2; dy <= 2; dy++) {
        const ny = y + dy;
        if (ny < 0 || ny >= H) continue;
        for (let dx = -2; dx <= 2; dx++) {
          const nx = x + dx;
          if (nx < 0 || nx >= W) continue;
          const r = ny * W + nx;
          if (fg[r] && !label[r]) { label[r] = id; stack.push(r); }
        }
      }
    }
    c.cx = c.sx / c.n;
    comps.push(c);
  }
  return { label, comps };
}

// Assign every foreground pixel to one of n figures. Returns owner[] (0 = none, 1..n).
// own: [[x0, y0, x1, y1, figure], ...] loose pieces centred in a box belong to that
// figure (0-based) — for thrown weapons that sit nearer the wrong pose.
function splitFigures(fg, W, H, n, own = [], noErode = false) {
  const { label, comps } = components(fg, W, H);
  const total = comps.reduce((s, c) => s + c.n, 0);
  const perFig = total / n;
  const big = comps.filter((c) => c.n > perFig * 0.3).sort((a, b) => a.cx - b.cx);
  const figOf = new Int32Array(comps.length + 1);
  if (big.length === n) {
    big.forEach((c, i) => { figOf[c.id] = i + 1; });
    for (const c of comps) {
      if (figOf[c.id] || c.n < perFig * 0.002) continue;
      const cy = (c.y0 + c.y1) / 2;
      const forced = own.find(([x0, y0, x1, y1]) => c.cx >= x0 && c.cx <= x1 && cy >= y0 && cy <= y1);
      if (forced) { figOf[c.id] = forced[4] + 1; continue; }
      // nearest body; loose steel (sword tips) tends to sit to the RIGHT of its owner
      let best = 0; let bd = Infinity;
      big.forEach((b, i) => {
        const d = Math.abs(b.cx - c.cx) + (b.cx > c.cx + 20 ? 40 : 0);
        if (d < bd) { bd = d; best = i + 1; }
      });
      figOf[c.id] = best;
    }
    const owner = new Uint8Array(W * H);
    for (let p = 0; p < W * H; p++) if (label[p]) owner[p] = figOf[label[p]];
    return owner;
  }
  // Figures that only TOUCH (a sword tip brushing the next pose's cape): shave the
  // outline back until they come apart into n bodies, then grow each body back out
  // through the original shape — so every pose keeps its whole sword.
  if (!noErode) {
    let thin = fg;
    for (let r = 1; r <= 12; r++) {
      const next = new Uint8Array(W * H);
      for (let y = 1; y < H - 1; y++) {
        for (let x = 1; x < W - 1; x++) {
          const p = y * W + x;
          next[p] = thin[p] && thin[p - 1] && thin[p + 1] && thin[p - W] && thin[p + W] ? 1 : 0;
        }
      }
      thin = next;
      const core = splitFigures(thin, W, H, n, own, true);
      if (!core) continue;
      // grow back. First every body takes back its own shaved outline (r+1 steps, all at
      // once). What's left is the thin stuff the shave removed whole — blades. A blade
      // reaches out to the RIGHT of the man holding it, so the bodies then claim what
      // they can still reach one at a time, left to right: each gets its whole sword,
      // right up to the neighbour it touches.
      const owner = core;
      const grow = (seedOf, steps) => {
        let front = [];
        for (let p = 0; p < W * H; p++) if (owner[p] && seedOf(owner[p])) front.push(p);
        for (let s = 0; front.length && s < steps; s++) {
          const nextFront = [];
          for (const p of front) {
            const x = p % W;
            for (const q of [x > 0 ? p - 1 : -1, x < W - 1 ? p + 1 : -1, p - W, p + W]) {
              if (q < 0 || q >= W * H || !fg[q] || owner[q]) continue;
              owner[q] = owner[p];
              nextFront.push(q);
            }
          }
          front = nextFront;
        }
      };
      grow(() => true, r + 2);
      for (let i = 1; i <= n; i++) grow((o) => o === i, Infinity);
      // loose bits the shave removed entirely: nearest body, as usual
      const centre = Array.from({ length: n + 1 }, () => [0, 0]);
      for (let p = 0; p < W * H; p++) if (core[p]) { centre[core[p]][0] += p % W; centre[core[p]][1]++; }
      for (const c of comps) {
        let any = 0;
        for (let p = 0; p < W * H && !any; p++) if (label[p] === c.id && owner[p]) any = 1;
        if (any || c.n < perFig * 0.002) continue;
        let best = 1; let bd = Infinity;
        for (let i = 1; i <= n; i++) { const d = Math.abs(centre[i][0] / Math.max(1, centre[i][1]) - c.cx); if (d < bd) { bd = d; best = i; } }
        for (let p = 0; p < W * H; p++) if (label[p] === c.id) owner[p] = best;
      }
      return owner;
    }
  } else {
    return null; // (asked only for a clean split)
  }
  // touching figures: split at the emptiest columns between column-mass centres
  const prof = new Float64Array(W);
  for (let p = 0; p < W * H; p++) if (fg[p]) prof[p % W]++;
  const centers = [];
  let acc = 0;
  const step = total / n;
  let k = 0;
  for (let x = 0; x < W && k < n; x++) {
    acc += prof[x];
    if (acc >= step * (k + 0.5)) { centers.push(x); k++; }
  }
  while (centers.length < n) centers.push(W - 1);
  const cuts = [0];
  for (let i = 1; i < n; i++) {
    const lo = Math.round(centers[i - 1] + (centers[i] - centers[i - 1]) * 0.25);
    const hi = Math.round(centers[i] - (centers[i] - centers[i - 1]) * 0.1);
    let bx = lo; let bv = Infinity;
    for (let x = lo; x <= hi; x++) if (prof[x] <= bv) { bv = prof[x]; bx = x; }
    cuts.push(bx);
  }
  cuts.push(W);
  const owner = new Uint8Array(W * H);
  for (let p = 0; p < W * H; p++) {
    if (!fg[p]) continue;
    const x = p % W;
    for (let i = 0; i < n; i++) if (x >= cuts[i] && x < cuts[i + 1]) { owner[p] = i + 1; break; }
  }
  // pinned pieces win over the column split too
  if (own.length) {
    const force = new Int32Array(comps.length + 1);
    for (const c of comps) {
      const cy = (c.y0 + c.y1) / 2;
      const hit = own.find(([x0, y0, x1, y1]) => c.cx >= x0 && c.cx <= x1 && cy >= y0 && cy <= y1);
      if (hit && c.n < perFig * 0.3) force[c.id] = hit[4] + 1;
    }
    for (let p = 0; p < W * H; p++) if (label[p] && force[label[p]]) owner[p] = force[label[p]];
  }
  return owner;
}

function nearestPaletteFn(palette) {
  const cache = new Map();
  return (r, g, b) => {
    const key = (r >> 2) << 12 | (g >> 2) << 6 | (b >> 2);
    let v = cache.get(key);
    if (v) return v;
    let best = palette[0]; let bd = Infinity;
    for (const c of palette) {
      const d = (c[0] - r) ** 2 * 0.3 + (c[1] - g) ** 2 * 0.59 + (c[2] - b) ** 2 * 0.11;
      if (d < bd) { bd = d; best = c; }
    }
    cache.set(key, best);
    return best;
  };
}

// Colours used by tools/sprite-pipeline/palette.png (the sheet's shared palette).
export function paletteFrom(img) {
  if (!img) return null;
  const { data } = loadPixels(img);
  const d = data.data;
  const seen = new Map();
  for (let i = 0; i < d.length; i += 4) {
    const k = (d[i] << 16) | (d[i + 1] << 8) | d[i + 2];
    if (!seen.has(k)) seen.set(k, [d[i], d[i + 1], d[i + 2]]);
  }
  return [...seen.values()];
}

function downscale(src, tw, th) {
  let cur = src;
  while (cur.width / 2 > tw && cur.height / 2 > th) {
    const n = document.createElement('canvas');
    n.width = Math.round(cur.width / 2); n.height = Math.round(cur.height / 2);
    const nctx = n.getContext('2d');
    nctx.imageSmoothingQuality = 'high';
    nctx.drawImage(cur, 0, 0, n.width, n.height);
    cur = n;
  }
  const out = document.createElement('canvas');
  out.width = Math.max(1, tw); out.height = Math.max(1, th);
  const octx = out.getContext('2d', { willReadFrequently: true });
  octx.imageSmoothingQuality = 'high';
  octx.drawImage(cur, 0, 0, out.width, out.height);
  return out;
}

// spec: { frames, target?, ref?, scale?, air?, bg?, nudge?: [[dx,dy],...], res? }
// res = texture resolution multiplier (2 = frames twice as detailed; draw them at 0.5 scale).
// Returns { canvas, count, scale, fw, fh } — frames laid out left to right, fw x fh each.
export function importCharacterStrip(img, spec, palette) {
  const t0 = performance.now();
  try { return importStrip(img, spec, palette); } finally {
    const ms = performance.now() - t0;
    if (ms > 250) console.info(`[boot] slow strip ${spec.file ?? ''}: ${Math.round(ms)} ms`);
  }
}
function importStrip(img, spec, palette) {
  const R = spec.res ?? 1;
  // wide: extra room each side for poses with a long reach (a fully extended sword),
  // so they aren't cut off at the cell edge
  const wide = spec.wide ?? 0;
  const FW = (FRAME_W + wide * 2) * R;
  const FH = FRAME_H * R;
  const AX = (ANCHOR_X + wide) * R;
  const AY = ANCHOR_Y * R;
  const px = loadPixels(img);
  const { W, H, data } = px;
  const d = data.data;
  // erase: [[x0, y0, x1, y1], ...] source-pixel boxes painted out first (stray flying bits
  // that would otherwise be glued onto the wrong figure)
  for (const [x0, y0, x1, y1] of spec.erase ?? []) {
    for (let y = Math.max(0, y0); y < Math.min(H, y1); y++) {
      for (let x = Math.max(0, x0); x < Math.min(W, x1); x++) { const i = (y * W + x) * 4; d[i] = d[i + 1] = d[i + 2] = 0; }
    }
  }
  // wounds: magenta marker patches become raw stumps (view/woundPaint.js)
  if (spec.wounds) paintMarkerWounds(data);
  const fg = backgroundMask(px, spec.bg, spec.holes);
  const n = spec.frames;
  const owner = splitFigures(fg, W, H, n, spec.own);

  const figs = [];
  for (let i = 1; i <= n; i++) {
    let x0 = W; let x1 = 0; let y0 = H; let y1 = 0;
    for (let p = 0; p < W * H; p++) {
      if (owner[p] !== i) continue;
      const x = p % W; const y = (p / W) | 0;
      if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
    }
    // torso centre: mean x in the 25%..60% height band — or, with align: 'median', the
    // median x of a narrower chest band, which swinging arms and weapons can't drag about
    const hh = y1 - y0;
    let cx;
    if (spec.align === 'median') {
      const xs = [];
      for (let y = y0 + Math.round(hh * 0.3); y < y0 + Math.round(hh * 0.5); y++) {
        let a = -1; let b = -1;
        for (let x = x0; x <= x1; x++) if (owner[y * W + x] === i) { if (a < 0) a = x; b = x; }
        if (a >= 0) xs.push((a + b) / 2);
      }
      xs.sort((p, q) => p - q);
      cx = xs.length ? xs[xs.length >> 1] : (x0 + x1) / 2;
    } else {
      let sx = 0; let cnt = 0;
      for (let y = y0 + Math.round(hh * 0.25); y < y0 + Math.round(hh * 0.6); y++) {
        for (let x = x0; x <= x1; x++) if (owner[y * W + x] === i) { sx += x; cnt++; }
      }
      cx = cnt ? sx / cnt : (x0 + x1) / 2;
    }
    figs.push({ i, x0, x1, y0, y1, cx });
  }
  const heights = figs.map((f) => f.y1 - f.y0);
  let stand = Math.max(...heights);
  if (spec.ref != null) stand = spec.ref > 20 ? spec.ref : heights[spec.ref];
  const s = spec.scale ?? ((spec.target ?? 112) * R) / stand;
  // ground: 'drawn' keeps every pose at the height it was drawn on the sheet's shared
  // baseline (the median of the poses' lowest points), so a dangling mace or debris
  // below the feet can't jolt the body up and down between frames
  const lows = figs.map((f) => f.y1).sort((p, q) => p - q);
  const ground = spec.ground === 'drawn' ? lows[lows.length >> 1] : Math.max(...lows);

  const sheet = document.createElement('canvas');
  sheet.width = FW * n;
  sheet.height = FH;
  const sctx = sheet.getContext('2d', { willReadFrequently: true });
  const near = palette ? nearestPaletteFn(palette) : null;

  figs.forEach((f, k) => {
    const w = f.x1 - f.x0 + 1;
    const h = f.y1 - f.y0 + 1;
    const crop = document.createElement('canvas');
    crop.width = w; crop.height = h;
    const cctx = crop.getContext('2d', { willReadFrequently: true });
    const cd = cctx.createImageData(w, h);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const p = (f.y0 + y) * W + (f.x0 + x);
        if (owner[p] !== f.i) continue;
        const o = (y * w + x) * 4;
        cd.data[o] = d[p * 4]; cd.data[o + 1] = d[p * 4 + 1]; cd.data[o + 2] = d[p * 4 + 2]; cd.data[o + 3] = 255;
      }
    }
    cctx.putImageData(cd, 0, 0);
    const small = downscale(crop, Math.round(w * s), Math.round(h * s));
    const sctx2 = small.getContext('2d', { willReadFrequently: true });
    const sd = sctx2.getImageData(0, 0, small.width, small.height);
    for (let i = 0; i < sd.data.length; i += 4) {
      const a = sd.data[i + 3];
      if (a < 128) { sd.data[i + 3] = 0; continue; }
      let r = sd.data[i]; let g = sd.data[i + 1]; let b = sd.data[i + 2];
      if (a < 255) { r = Math.min(255, r * 255 / a); g = Math.min(255, g * 255 / a); b = Math.min(255, b * 255 / a); }
      if (near) [r, g, b] = near(r, g, b);
      sd.data[i] = r; sd.data[i + 1] = g; sd.data[i + 2] = b; sd.data[i + 3] = 255;
    }
    sctx2.putImageData(sd, 0, 0);
    const air = spec.air || spec.ground === 'drawn' ? (ground - f.y1) * s : 0;
    const [nx, ny] = spec.nudge?.[k] ?? [0, 0];
    // (clipped to its own cell: a pose too wide for it must never spill into the next frame)
    sctx.save();
    sctx.beginPath();
    sctx.rect(k * FW, 0, FW, FH);
    sctx.clip();
    sctx.drawImage(small, k * FW + Math.round(AX - (f.cx - f.x0) * s) + nx, Math.round(AY - (f.y1 - f.y0) * s - air) + ny);
    sctx.restore();
  });
  return { canvas: sheet, count: n, scale: s, fw: FW, fh: FH };
}

// Effects strips (fireballs etc.): n equal cells, each trimmed and scaled to `height` px,
// centred on the leading edge. Returns { canvas, count, fw, fh }.
export function importFxStrip(img, spec) {
  const px = loadPixels(img);
  const { W, H } = px;
  const fg = backgroundMask(px, spec.bg);
  const n = spec.frames;
  const cw = W / (spec.columns ?? n);
  const rows = spec.rows ?? 1;
  const ch = H / rows;
  // union bounding box across all cells (in cell space) keeps the animation steady
  let x0 = cw; let x1 = 0; let y0 = ch; let y1 = 0;
  for (let p = 0; p < W * H; p++) {
    if (!fg[p]) continue;
    const x = (p % W) % cw; const y = ((p / W) | 0) % ch;
    if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
  }
  const bw = Math.ceil(x1 - x0 + 1);
  const bh = Math.ceil(y1 - y0 + 1);
  const s = spec.height / bh;
  const fw = Math.round(bw * s);
  const fh = Math.round(bh * s);
  const sheet = document.createElement('canvas');
  sheet.width = fw * n; sheet.height = fh;
  const sctx = sheet.getContext('2d');
  const d = px.data.data;
  for (let p = 0; p < W * H; p++) if (!fg[p]) d[p * 4 + 3] = 0;
  px.ctx.putImageData(px.data, 0, 0);
  const cols = spec.columns ?? n;
  for (let k = 0; k < n; k++) {
    const cx = (k % cols) * cw + x0;
    const cy = Math.floor(k / cols) * ch + y0;
    const crop = document.createElement('canvas');
    crop.width = bw; crop.height = bh;
    crop.getContext('2d').drawImage(px.c, cx, cy, bw, bh, 0, 0, bw, bh);
    sctx.drawImage(downscale(crop, fw, fh), k * fw, 0);
  }
  return { canvas: sheet, count: n, fw, fh };
}

export const FRAME = { FW: FRAME_W, FH: FRAME_H, AX: ANCHOR_X, AY: ANCHOR_Y };

// A fingerprint of this importer's own code (view/stripCache.js keeps cut sheets between
// visits and must throw them away when the way they're cut changes).
export const IMPORT_SIG = (() => {
  const src = [loadPixels, backgroundMask, components, splitFigures, nearestPaletteFn, downscale, importStrip, paintMarkerWounds]
    .map((f) => f.toString()).join('') + [FRAME_W, FRAME_H, ANCHOR_X, ANCHOR_Y].join();
  let h = 2166136261;
  for (let i = 0; i < src.length; i++) { h ^= src.charCodeAt(i); h = Math.imul(h, 16777619); }
  return (h >>> 0).toString(36);
})();

// Filled at boot: FX[name] ={ key, count, fw, fh, fps } for each effects strip.
export const FX = {};
