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
      const { canvas, count, fw, fh } = importFxStrip(T.get(`sprsrc-${name}`).getSourceImage(), { frames: S.frames, height: S.height, bg: 'black' });
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

  // the street's back wall, along the whole level
  wall() {
    const key = artKey(this.theme, 'wall');
    const img = this.scene.textures.get(key).getSourceImage();
    const h = this.A.wall.height;
    const top = SETTINGS.world.floorTop - 50;
    const s = h / img.height;
    return this.scene.add.tileSprite(0, top - h + 8, this.width, h, key).setOrigin(0).setTileScale(s, s).setDepth(DEPTH.floor - 1);
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
  piece(name, x0, x1, { depth = DEPTH.floor - 0.98, bottom = 8 } = {}) {
    if (!this.has(name)) return false;
    const top = SETTINGS.world.floorTop - 50;
    const img = this.scene.add.image((x0 + x1) / 2, top + bottom, artKey(this.theme, name)).setOrigin(0.5, 1).setDepth(depth);
    img.setScale((x1 - x0) / img.width);
    return img;
  }
}
