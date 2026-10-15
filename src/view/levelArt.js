// levelArt.js — Loads and prepares the campaign levels' painted art (data/levelArt.js), and
// draws it for a level's backdrop. Whatever isn't painted yet is simply absent: the
// backdrops ask `has()` and draw their own stand-in instead.

import { SETTINGS } from '../config/settings.js';
import { DEPTH } from './depths.js';
import { LEVEL_ART, SPRITE_SHEETS } from '../data/levelArt.js';
import { keyLayer, makeSeamless } from './envArt.js';
import { importFxStrip } from './stripImporter.js';

// the painted figures that loaded (data/levelArt.js SPRITE_SHEETS): name -> { key, count, fw, fh }
export const SPRITES = {};
// all of these painted? (a creature switches over only once every sheet it needs is in)
export const haveSprites = (...names) => names.every((n) => SPRITES[n]);

const src = (theme, name) => `lvlsrc-${theme}-${name}`;
export const artKey = (theme, name) => `lvl-${theme}-${name}`;

export function preloadLevelArt(scene) {
  for (const [theme, A] of Object.entries(LEVEL_ART)) {
    const load = (name, file) => scene.load.image(src(theme, name), `${A.dir}${file}`);
    for (const L of A.layers ?? []) load(L.name, `${L.name}.png`);
    if (A.wall) load('wall', 'wall.png');
    if (A.ground) load('ground', 'ground.png');
    for (const p of A.pieces ?? []) load(p, `${p}.png`);
    for (const [k, p] of Object.entries(A.props ?? {})) load(`prop-${k}`, p.file);
    for (const [k, s] of Object.entries(A.strips ?? {})) load(`strip-${k}`, s.file);
    for (const k of Object.keys(A.surfaces ?? {})) load(`surf-${k}`, `surf_${k}.png`);
  }
  for (const [name, S] of Object.entries(SPRITE_SHEETS)) scene.load.image(`sprsrc-${name}`, S.file);
}

// (a missing file is expected: it simply hasn't been painted yet)
export const isLevelArtKey = (key) => key?.startsWith('lvlsrc-') || key?.startsWith('sprsrc-');

// Cut out, made seamless, split: every painted piece that loaded. Returns the keys made.
export function buildLevelArt(scene) {
  const made = [];
  const T = scene.textures;
  const keyed = (from, kind) => (kind === 'opaque' ? T.get(from).getSourceImage() : keyLayer(T.get(from).getSourceImage(), kind));
  const add = (key, canvas) => { if (T.exists(key)) T.remove(key); T.addCanvas(key, canvas); made.push(key); };
  // a canvas of part of an image
  const part = (img, x, w) => { const c = document.createElement('canvas'); c.width = w; c.height = img.height; c.getContext('2d').drawImage(img, x, 0, w, img.height, 0, 0, w, img.height); return c; };
  for (const [theme, A] of Object.entries(LEVEL_ART)) {
    const have = (name) => T.exists(src(theme, name));
    try {
      for (const L of A.layers ?? []) {
        if (!have(L.name)) continue;
        const tmp = `${src(theme, L.name)}-cut`;
        if (T.exists(tmp)) T.remove(tmp);
        T.addCanvas(tmp, L.key === 'opaque' ? part(T.get(src(theme, L.name)).getSourceImage(), 0, T.get(src(theme, L.name)).getSourceImage().width) : keyed(src(theme, L.name), L.key));
        if (makeSeamless(scene, tmp, artKey(theme, L.name), 0.08)) made.push(artKey(theme, L.name));
      }
      for (const [name, kind] of [['wall', 'magenta'], ['ground', 'opaque']]) {
        if (!A[name] || !have(name)) continue;
        const tmp = `${src(theme, name)}-cut`;
        if (T.exists(tmp)) T.remove(tmp);
        const img = T.get(src(theme, name)).getSourceImage();
        T.addCanvas(tmp, kind === 'opaque' ? part(img, 0, img.width) : keyLayer(img, kind));
        if (makeSeamless(scene, tmp, artKey(theme, name), 0.08)) made.push(artKey(theme, name));
      }
      for (const p of A.pieces ?? []) if (have(p)) add(artKey(theme, p), keyed(src(theme, p), 'magenta'));
      for (const [k, p] of Object.entries(A.props ?? {})) {
        if (!have(`prop-${k}`)) continue;
        const c = keyed(src(theme, `prop-${k}`), 'magenta');
        const tex = p.texture ?? `prop-${k}`;
        if (p.pair) { add(tex, part(c, 0, Math.floor(c.width / 2))); add(`${tex}-broken`, part(c, Math.floor(c.width / 2), Math.floor(c.width / 2))); } else add(tex, c);
      }
      for (const [k, s] of Object.entries(A.strips ?? {})) {
        if (!have(`strip-${k}`)) continue;
        const c = keyed(src(theme, `strip-${k}`), s.key ?? 'black');
        const w = Math.floor(c.width / s.frames);
        for (let i = 0; i < s.frames; i++) add(`${k}-${i}`, part(c, i * w, w));
      }
      for (const k of Object.keys(A.surfaces ?? {})) {
        if (!have(`surf-${k}`)) continue;
        const img = T.get(src(theme, `surf-${k}`)).getSourceImage();
        add(artKey(theme, `surf-${k}`), part(img, 0, img.width));
      }
    } catch (err) {
      console.warn(`[boot] level art for ${theme} failed`, err);
    }
  }
  for (const [name, S] of Object.entries(SPRITE_SHEETS)) {
    if (!T.exists(`sprsrc-${name}`)) continue;
    try {
      const { canvas, count, fw, fh } = importFxStrip(T.get(`sprsrc-${name}`).getSourceImage(), { frames: S.frames, height: S.height, bg: 'black', centre: S.centre });
      if (S.grade) gradeSheet(canvas, S.grade);
      const key = `spr-${name}`;
      if (T.exists(key)) T.remove(key);
      const tex = T.addCanvas(key, canvas);
      for (let i = 0; i < count; i++) tex.add(`f${i}`, 0, i * fw, 0, fw, fh);
      SPRITES[name] = { key, count, fw, fh };
      made.push(key);
    } catch (err) {
      console.warn(`[boot] sprite sheet ${name} failed`, err);
    }
  }
  return made;
}

// A sheet painted softer and duller than the heroes, graded to sit with them: more
// contrast and colour, a dark ink line round the figure (the heroes' strips have one), and
// a pale rim of light along the edges that face the sky.
//   grade: { contrast, saturation, outline (px, at the sheet's size), rim (0..1) }
export function gradeSheet(canvas, { contrast = 1, saturation = 1, outline = 0, rim = 0 }) {
  const W = canvas.width; const H = canvas.height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  const img = ctx.getImageData(0, 0, W, H);
  const d = img.data;
  const solid = (x, y) => x >= 0 && y >= 0 && x < W && y < H && d[(y * W + x) * 4 + 3] > 110;
  const inside = new Uint8Array(W * H);
  for (let p = 0; p < W * H; p++) inside[p] = d[p * 4 + 3] > 110 ? 1 : 0;
  const clamp = (v) => (v < 0 ? 0 : v > 255 ? 255 : v);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const p = y * W + x; const i = p * 4;
    if (!d[i + 3]) continue;
    let r = d[i]; let g = d[i + 1]; let b = d[i + 2];
    const L = 0.3 * r + 0.59 * g + 0.11 * b;
    r = L + (r - L) * saturation; g = L + (g - L) * saturation; b = L + (b - L) * saturation;
    r = (r - 110) * contrast + 110; g = (g - 110) * contrast + 110; b = (b - 110) * contrast + 110;
    // the rim: open sky (no figure) just above him, or up and to the side
    if (rim && inside[p]) {
      let open = 0;
      for (let k = 1; k <= 3; k++) if (!solid(x, y - k) || !solid(x - k, y - k)) { open = 4 - k; break; }
      if (open) { const a = rim * open / 3; r += (255 - r) * a * 0.55; g += (245 - g) * a * 0.5; b += (225 - b) * a * 0.45; }
    }
    d[i] = clamp(r); d[i + 1] = clamp(g); d[i + 2] = clamp(b);
  }
  if (outline) {
    // (ink just outside the figure, from the shape as it was)
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const p = y * W + x;
      if (inside[p]) continue;
      let near = false;
      for (let dy = -outline; dy <= outline && !near; dy++) for (let dx = -outline; dx <= outline; dx++) {
        if (dx * dx + dy * dy > outline * outline + 0.5) continue;
        const qx = x + dx; const qy = y + dy;
        if (qx >= 0 && qy >= 0 && qx < W && qy < H && inside[qy * W + qx]) { near = true; break; }
      }
      if (near) { const i = p * 4; const a = d[i + 3]; d[i] = 18; d[i + 1] = 12; d[i + 2] = 10; d[i + 3] = Math.max(a, 215); }
    }
  }
  ctx.putImageData(img, 0, 0);
}

// The painted pieces of one level's backdrop, ready to draw.
export class PaintedLevel {
  constructor(scene, theme, width) {
    this.scene = scene;
    this.theme = theme;
    this.width = width;
    this.A = LEVEL_ART[theme] ?? {};
  }

  has(name) { return this.scene.textures.exists(artKey(this.theme, name)); }
  get pad() { return SETTINGS.width * 2; }

  // a far layer: a strip repeating sideways, moving `scroll` x the camera
  layer(name, depth) {
    const L = this.A.layers.find((q) => q.name === name);
    const key = artKey(this.theme, name);
    const img = this.scene.textures.get(key).getSourceImage();
    const top = SETTINGS.world.floorTop - 50;
    const w = SETTINGS.width + this.pad * 2 + this.width * L.scroll;
    const s = L.height / img.height;
    return this.scene.add.tileSprite(-this.pad, top - L.bottom - L.height, w, L.height, key).setOrigin(0)
      .setTileScale(s, s).setScrollFactor(L.scroll, 0.8).setDepth(depth);
  }

  // the street's back wall, along the whole level (or up to x1: where it opens out)
  wall(x1 = this.width) {
    const key = artKey(this.theme, 'wall');
    const img = this.scene.textures.get(key).getSourceImage();
    const h = this.A.wall.height;
    const top = SETTINGS.world.floorTop - 50;
    const s = h / img.height;
    return this.scene.add.tileSprite(0, top - h + 8, x1, h, key).setOrigin(0).setTileScale(s, s).setDepth(DEPTH.floor - 1);
  }

  // the street itself, from the back wall down past the bottom of the screen
  ground() {
    const key = artKey(this.theme, 'ground');
    const img = this.scene.textures.get(key).getSourceImage();
    const top = SETTINGS.world.floorTop - 50;
    const h = SETTINGS.height - top + 40;
    const s = h / img.height;
    return this.scene.add.tileSprite(0, top, this.width, h, key).setOrigin(0).setTileScale(s, s).setDepth(DEPTH.floor);
  }

  // a set piece standing on the street's back edge between x0 and x1 (its own height
  // follows its picture). Returns false if it isn't painted (draw the stand-in then).
  // `feather`: { left, right } shares of its width faded out at that edge, so a painting
  // with a hard edge melts into what's around it instead of ending on a straight line.
  piece(name, x0, x1, { depth = DEPTH.floor - 0.98, bottom = 8, feather = null } = {}) {
    if (!this.has(name)) return false;
    const top = SETTINGS.world.floorTop - 50;
    const key = feather ? featheredKey(this.scene, artKey(this.theme, name), feather) : artKey(this.theme, name);
    const img = this.scene.add.image((x0 + x1) / 2, top + bottom, key).setOrigin(0.5, 1).setDepth(depth);
    img.setScale((x1 - x0) / img.width);
    return img;
  }
}

// A copy of a texture with its left / right edges faded to nothing (made once per look).
export function featheredKey(scene, key, { left = 0, right = 0, top = 0 } = {}) {
  const out = `${key}-fade-${left}-${right}-${top}`;
  const T = scene.textures;
  if (T.exists(out)) return out;
  const img = T.get(key).getSourceImage();
  const c = document.createElement('canvas');
  c.width = img.width; c.height = img.height;
  const ctx = c.getContext('2d');
  ctx.drawImage(img, 0, 0);
  ctx.globalCompositeOperation = 'destination-out';
  const fade = (x0, y0, x1, y1, w, h, x, y) => {
    const gr = ctx.createLinearGradient(x0, y0, x1, y1);
    gr.addColorStop(0, 'rgba(0,0,0,1)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = gr; ctx.fillRect(x, y, w, h);
  };
  const W = c.width; const H = c.height;
  if (left) fade(0, 0, W * left, 0, W * left, H, 0, 0);
  if (right) fade(W, 0, W * (1 - right), 0, W * right, H, W * (1 - right), 0);
  if (top) fade(0, 0, 0, H * top, W, H * top, 0, 0);
  T.addCanvas(out, c);
  return out;
}
