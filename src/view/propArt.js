// propArt.js — The second round of painted props and debris (ChatGPT, 2026-11-02:
// assets/env/props2/). Each sheet is a grid of separate objects on flat magenta (the hit
// effects: on black, drawn additive); every object is cut out by itself and made its own
// texture, `height` px tall (drawn at a quarter: 4x detail). A sheet that isn't there yet is
// skipped: what it would replace stays as it was.
//
//   key          what the game calls it (a missing cell is skipped: null)

import { keyLayer } from './envArt.js';

export const PROPS2_DIR = 'assets/env/props2/';
export const PROP_SHEETS2 = {
  barrels: { cols: 4, rows: 2, bg: 'magenta', cells: [
    ['prop-barrel-v0', 232], ['prop-barrel-v1', 200], ['prop-barrel-v2', 232], ['prop-keg', 150],
    ['prop-barrel-v0-broken', 150], ['prop-barrel-v1-broken', 140], ['prop-barrel-v2-broken', 150], ['prop-keg-broken', 110],
  ] },
  crates: { cols: 4, rows: 2, bg: 'magenta', cells: [
    ['prop-crate-v0', 190], ['prop-crate-long', 170], ['prop-crate-v1', 200], ['prop-sack', 180],
    ['prop-crate-v0-broken', 130], ['prop-crate-long-broken', 120], ['prop-crate-v1-broken', 130], ['prop-sack-broken', 120],
  ] },
  street: { cols: 4, rows: 2, bg: 'magenta', cells: [
    ['prop-fence', 200], ['prop-fence-broken', 170], ['lamp-fallen', 150], ['lamp-stump', 120],
    ['haycart-smashed', 300], ['haycart-burnt', 320], ['prop-barrel-tipped', 150], ['crate-stack', 300],
  ] },
  // (loose bits, not in a strict grid: read row by row, left to right, `perRow` in each)
  debris: { cols: 6, rows: 4, bg: 'magenta', perRow: [6, 6, 7, 6], cells: [
    ['deb-stave-0', 120], ['deb-stave-1', 120], ['deb-stave-2', 120], ['deb-stave-3', 120], ['deb-hoop-0', 90], ['deb-hoop-1', 90],
    ['deb-plank-0', 120], ['deb-plank-1', 110], ['deb-plank-2', 100], ['deb-plank-3', 90], ['deb-plank-4', 80], ['deb-plank-5', 70],
    ['deb-splinter-0', 70], ['deb-splinter-1', 60], ['deb-splinter-2', 50], ['deb-splinter-3', 36], ['deb-shard-0', 50], ['deb-shard-1', 56], ['deb-shard-2', 44],
    ['deb-straw-0', 60], ['deb-straw-1', 50], ['deb-apple-0', 44], ['deb-apple-1', 50], ['deb-glass-0', 40], ['deb-glass-1', 40],
  ] },
  // (round 2) eight more barrels and eight more crates, none alike
  barrels2: { cols: 4, rows: 2, bg: 'magenta', cells: [
    null, ['prop-barrel-v3', 232], null, ['prop-barrel-v4', 232],
    ['prop-barrel-v5', 232], ['prop-tub', 130], ['prop-barrel-v6', 240], ['prop-keg2', 170],
  ] },
  crates2: { cols: 4, rows: 2, bg: 'magenta', cells: [
    null, null, ['prop-crate-tall', 270], ['prop-crate-v2', 180],
    ['prop-crate-v3', 190], ['prop-crate-v4', 200], ['prop-crate-v5', 200], ['prop-crate-v6', 190],
  ] },
  // a crate and a barrel or two worn down a blow at a time: whole, cracked, smashed (the same
  // size and pose, so one swaps for the next): StageView.propHit
  stages: { cols: 4, rows: 3, bg: 'magenta', cells: [
    ['prop-crate-blue', 200], ['prop-crate-fish', 150], ['prop-barrel-grey', 232], ['prop-barrel-tar', 232],
    ['prop-crate-blue-cracked', 200], ['prop-crate-fish-cracked', 150], ['prop-barrel-grey-cracked', 232], ['prop-barrel-tar-cracked', 232],
    ['prop-crate-blue-broken', 170], ['prop-crate-fish-broken', 140], ['prop-barrel-grey-broken', 200], ['prop-barrel-tar-broken', 200],
  ] },
  // things to stand crates on (and knock them off), and props caught moving
  furniture: { cols: 4, rows: 2, bg: 'magenta', cells: [
    ['prop-stall', 420], ['prop-rack', 200], ['prop-trestle', 230], ['prop-handcart', 270],
    ['crate-tipping', 220], ['crate-falling', 280], ['barrel-rolling', 190], ['barrel-tarspill', 190],
  ] },
  // the lamp going over onto the hay cart and setting it alight, eight frames, each cut as its
  // whole cell so they stay lined up (StageView: the square's lamp and cart)
  lampcart: { cols: 4, rows: 2, bg: 'magenta', frames: true, height: 340, cells: [0, 1, 2, 3, 4, 5, 6, 7].map((i) => [`lampcart-${i}`, 340]) },
  // big pieces flung off a break
  chunks: { cols: 6, rows: 4, bg: 'magenta', perRow: [6, 6, 6, 6], cells: [
    ['chk-panel-blue', 110], ['chk-panel-grey', 110], ['chk-lid-pine', 110], ['chk-lid-moss', 110], ['chk-panel-bone', 110], ['chk-panel-tar', 110],
    ['chk-staves', 120], ['chk-head-0', 90], ['chk-head-1', 90], ['chk-halfbarrel', 110], ['chk-stave-long', 120], ['chk-stave-tar', 120],
    ['chk-hoop-0', 80], ['chk-hoop-1', 70], ['chk-bracket', 60], ['chk-hinge', 60], ['chk-padlock', 70], ['chk-nails', 50],
    ['chk-wheel', 130], ['chk-hub', 100], ['chk-post', 120], ['chk-trestle-leg', 120], ['chk-awning', 110], ['chk-plank', 90],
  ] },
  // hit effects that play: six frames each (Gore.fx strips)
  fx_strips: { cols: 6, rows: 4, bg: 'black', frames: true, height: 200, cells: ['impact', 'blood', 'splinter', 'dust'].flatMap((n) => [0, 1, 2, 3, 4, 5].map((i) => [`fxa-${n}-${i}`, 200])) },
  fx_hits: { cols: 4, rows: 2, bg: 'black', cells: [
    ['fx-flash', 256], ['fx-streak', 256], ['fx-drops', 200], ['fx-splash', 220],
    ['fx-dust', 220], ['fx-splinters', 220], ['fx-fireburst', 256], ['fx-smoke', 220],
  ] },
};

export function preloadPropArt(scene) {
  for (const name of Object.keys(PROP_SHEETS2)) scene.load.image(`props2src-${name}`, `${PROPS2_DIR}${name}.png`);
}
export const isPropArtKey = (key) => key?.startsWith('props2src-');

// Cuts every sheet that loaded. Returns the set of texture keys made.
export function buildPropArt(scene) {
  const made = new Set();
  const T = scene.textures;
  for (const [name, S] of Object.entries(PROP_SHEETS2)) {
    const src = `props2src-${name}`;
    if (!T.exists(src)) continue;
    try {
      const img = T.get(src).getSourceImage();
      // (black sheets are drawn additive: black is already nothing; keep it, alpha from brightness)
      const c = S.bg === 'magenta' ? despill(keyLayer(img, 'magenta')) : glowAlpha(img);
      const W = c.width; const H = c.height;
      const ctx = c.getContext('2d', { willReadFrequently: true });
      const d = ctx.getImageData(0, 0, W, H).data;
      const boxes = findBoxes(d, W, H);
      // (frames: every cell cut whole, the same box, so a strip's frames stay lined up)
      const cw = Math.floor(W / S.cols); const ch = Math.floor(H / S.rows);
      const cells = S.frames ? Array.from({ length: S.cols * S.rows }, (_, i) => ({ x0: (i % S.cols) * cw, y0: Math.floor(i / S.cols) * ch, x1: (i % S.cols) * cw + cw - 1, y1: Math.floor(i / S.cols) * ch + ch - 1 }))
        : S.perRow ? byRows(boxes, H, S.perRow) : Array.from({ length: S.cols * S.rows }, () => null);
      if (!S.perRow && !S.frames) for (const b of boxes) {
        const cx = Math.min(S.cols - 1, Math.floor(((b.x0 + b.x1) / 2 / W) * S.cols));
        const cy = Math.min(S.rows - 1, Math.floor(((b.y0 + b.y1) / 2 / H) * S.rows));
        const i = cy * S.cols + cx;
        const o = cells[i];
        cells[i] = o ? { x0: Math.min(o.x0, b.x0), y0: Math.min(o.y0, b.y0), x1: Math.max(o.x1, b.x1), y1: Math.max(o.y1, b.y1) } : b;
      }
      S.cells.forEach((cell, i) => {
        const b = cells[i];
        if (!cell || !b) return;
        const [key, height] = cell;
        const w = b.x1 - b.x0 + 1; const h = b.y1 - b.y0 + 1;
        const s = S.frames ? height / h : Math.min(1, height / h);
        const out = document.createElement('canvas');
        out.width = Math.max(1, Math.round(w * s)); out.height = Math.max(1, Math.round(h * s));
        const octx = out.getContext('2d');
        octx.imageSmoothingEnabled = true; octx.imageSmoothingQuality = 'high';
        octx.drawImage(c, b.x0, b.y0, w, h, 0, 0, out.width, out.height);
        if (T.exists(key)) T.remove(key);
        T.addCanvas(key, out).setFilter(Phaser.Textures.FilterMode.LINEAR);
        made.add(key);
      });
    } catch (err) {
      console.warn(`[props2] ${name} failed`, err);
    }
  }
  return made;
}

// Loose pieces read row by row: each row's boxes left to right, the nearest ones merged till
// there are as many as that row should hold (a cluster of glass bits is one piece).
function byRows(boxes, H, perRow) {
  const out = [];
  perRow.forEach((n, r) => {
    let row = boxes.filter((b) => Math.min(perRow.length - 1, Math.floor(((b.y0 + b.y1) / 2 / H) * perRow.length)) === r).sort((a, b) => a.x0 - b.x0);
    while (row.length > n) {
      let k = 0; let best = Infinity;
      for (let i = 0; i < row.length - 1; i++) { const gap = row[i + 1].x0 - row[i].x1; if (gap < best) { best = gap; k = i; } }
      const a = row[k]; const b = row[k + 1];
      row.splice(k, 2, { x0: Math.min(a.x0, b.x0), y0: Math.min(a.y0, b.y0), x1: Math.max(a.x1, b.x1), y1: Math.max(a.y1, b.y1) });
    }
    for (let i = 0; i < n; i++) out.push(row[i] ?? null);
  });
  return out;
}

// What the magenta key leaves: smoke and soft edges painted half see-through over the magenta
// come out purple. Where a pixel leans magenta (red and blue both well over green) it is made
// that much more see-through and turned grey.
function despill(c) {
  const ctx = c.getContext('2d', { willReadFrequently: true });
  const data = ctx.getImageData(0, 0, c.width, c.height);
  const p = data.data;
  for (let i = 0; i < p.length; i += 4) {
    if (!p[i + 3]) continue;
    const r = p[i]; const g = p[i + 1]; const b = p[i + 2];
    const m = Math.min(r, b) - g;
    if (m <= 20) continue;
    const k = Math.min(1, (m - 20) / 90);
    p[i + 3] = Math.round(p[i + 3] * (1 - k * 0.85));
    const grey = Math.round((g + Math.min(r, b) * 0.4) / 1.4);
    p[i] = Math.round(r + (Math.max(grey, g) - r) * k); p[i + 2] = Math.round(b + (grey - b) * k); p[i + 1] = Math.max(g, Math.round(grey * 0.9));
  }
  ctx.putImageData(data, 0, 0);
  return c;
}

// alpha from brightness (an effect painted on black, drawn additive or normal)
function glowAlpha(img) {
  const c = document.createElement('canvas');
  c.width = img.width; c.height = img.height;
  const ctx = c.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(img, 0, 0);
  const data = ctx.getImageData(0, 0, c.width, c.height);
  const p = data.data;
  for (let i = 0; i < p.length; i += 4) {
    const m = Math.max(p[i], p[i + 1], p[i + 2]);
    p[i + 3] = m < 14 ? 0 : Math.min(255, (m - 14) * 2);
  }
  ctx.putImageData(data, 0, 0);
  return c;
}

// Boxes round each group of solid pixels (coarse cells, so loose bits stay with their object).
function findBoxes(d, W, H) {
  const S = 6;
  const gw = Math.ceil(W / S); const gh = Math.ceil(H / S);
  const on = new Uint8Array(gw * gh);
  for (let y = 0; y < H; y += 2) for (let x = 0; x < W; x += 2) if (d[(y * W + x) * 4 + 3] > 60) on[Math.floor(y / S) * gw + Math.floor(x / S)] = 1;
  const label = new Int32Array(gw * gh);
  const boxes = [];
  for (let p = 0; p < gw * gh; p++) {
    if (!on[p] || label[p]) continue;
    const b = { x0: gw, y0: gh, x1: 0, y1: 0, n: 0 };
    const st = [p]; label[p] = 1;
    while (st.length) {
      const q = st.pop(); const x = q % gw; const y = (q / gw) | 0;
      b.n++; if (x < b.x0) b.x0 = x; if (x > b.x1) b.x1 = x; if (y < b.y0) b.y0 = y; if (y > b.y1) b.y1 = y;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const nx = x + dx; const ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= gw || ny >= gh) continue;
        const r = ny * gw + nx;
        if (on[r] && !label[r]) { label[r] = 1; st.push(r); }
      }
    }
    if (b.n > 6) boxes.push({ x0: b.x0 * S, y0: b.y0 * S, x1: Math.min(W - 1, (b.x1 + 1) * S - 1), y1: Math.min(H - 1, (b.y1 + 1) * S - 1) });
  }
  return boxes;
}
