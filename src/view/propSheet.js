// propSheet.js — Cuts the painted prop sheet (assets/env/props.png: a 4 x 4 grid of
// objects on black) into one texture per object, at twice the size they're drawn (the
// stage draws them at half scale, like the characters). stage objects fall back to the
// small procedural paintings in StageView when the sheet (or an object in it) is missing.
//
// Sheet order, left to right, top to bottom — texture key and height in texture px:

export const PROP_SHEET = [
  ['prop-barrel', 100], ['prop-barrel-broken', 70], ['prop-crate', 88], ['prop-crate-broken', 62],
  ['prop-urn', 78], ['prop-urn-broken', 44], ['prop-chest', 76], ['prop-chest-open', 92],
  ['grate', 60], ['grate-hot', 60], ['blade', 190], ['pk-shrine', 112],
  ['pk-meat', 36], ['pk-wine', 50], ['pk-mana', 44], ['pk-relic', 46],
];

// Everything black that is connected to the outside of a box is background.
function clearBackground(img, w, h) {
  const d = img.data;
  const dark = (p) => d[p * 4] < 30 && d[p * 4 + 1] < 30 && d[p * 4 + 2] < 30;
  const seen = new Uint8Array(w * h);
  const stack = [];
  const push = (p) => { if (!seen[p] && dark(p)) { seen[p] = 1; stack.push(p); } };
  for (let x = 0; x < w; x++) { push(x); push((h - 1) * w + x); }
  for (let y = 0; y < h; y++) { push(y * w); push(y * w + w - 1); }
  while (stack.length) {
    const p = stack.pop();
    d[p * 4 + 3] = 0;
    const x = p % w;
    if (x > 0) push(p - 1);
    if (x < w - 1) push(p + 1);
    if (p >= w) push(p - w);
    if (p < w * (h - 1)) push(p + w);
  }
}

// Where the objects are: boxes of connected non-black pixels (found on a coarse copy so
// loose bits — shards, embers, a hanging chain — stay with their object), in sheet order.
function findObjects(ctx, W, H, COLS, ROWS) {
  const S = 6; // coarse cell, px
  const gw = Math.ceil(W / S);
  const gh = Math.ceil(H / S);
  const d = ctx.getImageData(0, 0, W, H).data;
  const on = new Uint8Array(gw * gh);
  for (let y = 0; y < H; y += 2) {
    for (let x = 0; x < W; x += 2) {
      const o = (y * W + x) * 4;
      if (d[o] > 34 || d[o + 1] > 34 || d[o + 2] > 34) on[Math.floor(y / S) * gw + Math.floor(x / S)] = 1;
    }
  }
  const label = new Int32Array(gw * gh);
  const boxes = [];
  for (let p = 0; p < gw * gh; p++) {
    if (!on[p] || label[p]) continue;
    const b = { x0: gw, y0: gh, x1: 0, y1: 0, n: 0 };
    const stack = [p];
    label[p] = boxes.length + 1;
    while (stack.length) {
      const q = stack.pop();
      const x = q % gw; const y = (q / gw) | 0;
      b.n++; b.x0 = Math.min(b.x0, x); b.x1 = Math.max(b.x1, x); b.y0 = Math.min(b.y0, y); b.y1 = Math.max(b.y1, y);
      for (let dy = -2; dy <= 2; dy++) {   // (a 2-cell reach joins nearby loose pieces)
        for (let dx = -2; dx <= 2; dx++) {
          const nx = x + dx; const ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= gw || ny >= gh) continue;
          const r = ny * gw + nx;
          if (on[r] && !label[r]) { label[r] = label[p]; stack.push(r); }
        }
      }
    }
    boxes.push(b);
  }
  const big = boxes.filter((b) => b.n > 12).map((b) => ({ x: b.x0 * S, y: b.y0 * S, w: (b.x1 - b.x0 + 1) * S, h: (b.y1 - b.y0 + 1) * S }));
  // one object per grid cell: everything whose centre falls in the cell, merged
  const cells = Array.from({ length: COLS * ROWS }, () => null);
  for (const b of big) {
    const cx = Math.min(COLS - 1, Math.floor(((b.x + b.w / 2) / W) * COLS));
    const cy = Math.min(ROWS - 1, Math.floor(((b.y + b.h / 2) / H) * ROWS));
    const c = cells[cy * COLS + cx];
    if (!c) { cells[cy * COLS + cx] = { ...b }; continue; }
    const x1 = Math.max(c.x + c.w, b.x + b.w); const y1 = Math.max(c.y + c.h, b.y + b.h);
    c.x = Math.min(c.x, b.x); c.y = Math.min(c.y, b.y); c.w = x1 - c.x; c.h = y1 - c.y;
  }
  return cells;
}

// Returns the set of texture keys it made.
// The breakables, repainted at four times the size they're drawn (assets/env/props-hd.png:
// 3 x 2, intact on top, smashed below). Drawn at quarter scale, a little bigger than before.
export const PROP_HD = [
  ['prop-barrel', 232], ['prop-crate', 208], ['prop-urn', 184],
  ['prop-barrel-broken', 160], ['prop-crate-broken', 144], ['prop-urn-broken', 108],
];

export function buildPropSheet(scene, srcKey = 'props-src', sheet = PROP_SHEET, COLS = 4, ROWS = 4, smooth = false) {
  const made = new Set();
  if (!scene.textures.exists(srcKey)) return made;
  try {
    const src = scene.textures.get(srcKey).getSourceImage();
    const W = src.width; const H = src.height;
    const full = document.createElement('canvas');
    full.width = W; full.height = H;
    const fctx = full.getContext('2d', { willReadFrequently: true });
    fctx.drawImage(src, 0, 0);
    const cells = findObjects(fctx, W, H, COLS, ROWS);
    sheet.forEach(([key, height], i) => {
      const b = cells[i];
      if (!b) return;
      const pad = 3;
      const x = Math.max(0, b.x - pad); const y = Math.max(0, b.y - pad);
      const w = Math.min(W - x, b.w + pad * 2); const h = Math.min(H - y, b.h + pad * 2);
      const img = fctx.getImageData(x, y, w, h);
      clearBackground(img, w, h);
      // trim to what's left
      let x0 = w; let x1 = -1; let y0 = h; let y1 = -1;
      for (let p = 0; p < w * h; p++) {
        if (!img.data[p * 4 + 3]) continue;
        const px = p % w; const py = (p / w) | 0;
        if (px < x0) x0 = px; if (px > x1) x1 = px; if (py < y0) y0 = py; if (py > y1) y1 = py;
      }
      if (x1 < x0) return;
      const tmp = document.createElement('canvas');
      tmp.width = w; tmp.height = h;
      tmp.getContext('2d').putImageData(img, 0, 0);
      const tw = x1 - x0 + 1; const th = y1 - y0 + 1;
      const s = height / th;
      const out = document.createElement('canvas');
      out.width = Math.max(1, Math.round(tw * s)); out.height = height;
      const octx = out.getContext('2d', { willReadFrequently: true });
      octx.imageSmoothingEnabled = true; octx.imageSmoothingQuality = 'high';
      octx.drawImage(tmp, x0, y0, tw, th, 0, 0, out.width, out.height);
      // crisp edges: no half-transparent fringe
      const od = octx.getImageData(0, 0, out.width, out.height);
      for (let p = 0; p < od.data.length; p += 4) od.data[p + 3] = od.data[p + 3] > 110 ? 255 : 0;
      octx.putImageData(od, 0, 0);
      if (scene.textures.exists(key)) scene.textures.remove(key);
      scene.textures.addCanvas(key, out).setFilter(smooth ? Phaser.Textures.FilterMode.LINEAR : Phaser.Textures.FilterMode.NEAREST);
      made.add(key);
    });
  } catch (err) {
    console.warn('[props] sheet failed', err);
  }
  return made;
}
