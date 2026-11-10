// throatPoint.js — where the man's throat is on screen right now, for the throat cut's
// blood (scenes/ArenaScene.js finisherFX 'slit'). Nick, 6 Nov 2026: "blood comes where
// blade goes" — not a fixed height (that put it in his nose, then in his chest).
//
// In the painted hold (data/throatArt.js PAIR_THROAT) it's the spot in the picture where
// Rurik's blade crosses the front of his neck. Once he's himself again (his _throat strip:
// staggering, then on his knees) it's found in his own pose: down from the top of him a
// share of his height, and across his neck toward the way he faces. The shares were set
// against all seven men's poses (the hand at his throat is where the wound is).
import { PAIR_THROAT } from '../data/throatArt.js';

const STAND = { down: 0.17, across: 0.62 };
const KNEEL = { down: 0.30, across: 0.72 };
const figs = new Map();

// the opaque rows of one frame (read once, then kept)
function figure(frame) {
  const id = `${frame.texture.key}/${frame.name}`;
  if (figs.has(id)) return figs.get(id);
  let fig = null;
  try {
    const w = frame.cutWidth, h = frame.cutHeight;
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const ctx = c.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(frame.source.image, frame.cutX, frame.cutY, w, h, 0, 0, w, h);
    const a = ctx.getImageData(0, 0, w, h).data;
    const solid = (x, y) => a[(y * w + x) * 4 + 3] > 128;
    let ty = -1, by = -1;
    for (let y = 0; y < h; y++) {
      let n = 0;
      for (let x = 0; x < w && n < 3; x++) if (solid(x, y)) n++;
      if (n >= 3) { if (ty < 0) ty = y; by = y; }
    }
    if (ty >= 0) fig = { w, h, ty, by, solid };
  } catch (err) { fig = null; }
  figs.set(id, fig);
  return fig;
}

function neckIn(fig, kneel) {
  const k = kneel ? KNEEL : STAND;
  const ny = Math.round(fig.ty + k.down * (fig.by - fig.ty));
  const xs = [];
  for (let y = Math.max(0, ny - 6); y <= Math.min(fig.h - 1, ny + 6); y++)
    for (let x = 0; x < fig.w; x++) if (fig.solid(x, y)) xs.push(x);
  if (!xs.length) return null;
  xs.sort((p, q) => p - q);
  const l = xs[Math.floor(xs.length * 0.08)], r = xs[Math.floor(xs.length * 0.92)];
  return { x: l + k.across * (r - l), y: ny };
}

// a pixel of an image's frame, in the world
function world(img, x, y) {
  return img.getWorldTransformMatrix().transformPoint(x - img.displayOriginX, y - img.displayOriginY);
}

// { x, h } in the world (h: height above his ground line v.z), or null when it can't tell
export function throatPoint(scene, holder, man) {
  const hv = scene.views?.get(holder.id);
  const t = PAIR_THROAT[man.stats?.art];
  if (hv?.pairActive && t) {
    const p = world(hv.sprite, t[0], t[1]);
    return { x: p.x, h: man.z - p.y };
  }
  const s = scene.views?.get(man.id)?.sprite;
  if (!s?.frame || !s.visible || s.alpha === 0) return null;
  const fig = figure(s.frame);
  if (!fig) return null;
  const own = s.texture.key.endsWith('-throat');
  const kneel = own ? Number(String(s.frame.name).replace(/\D/g, '')) >= 3 : holder.exec?.fired?.has('knees');
  const n = neckIn(fig, kneel);
  if (!n) return null;
  const p = world(s, n.x, n.y);
  return { x: p.x, h: man.z - p.y };
}
