// SnareHang.js — A man caught in one of Gallows Wood's snares (stage/WoodTraps.js) is
// whipped up off his feet by the sapling and hangs upside down by one ankle, swinging and
// struggling, until he's cut loose (or beaten loose) and drops. Nick, 2026-11-14: "when
// someone gets snared can they be like flipped upside down and held by the foot?"
//
// View only: the sim keeps him where he stood (his hurtbox covers the same height range
// he hangs over: head just off the mud, ankle a body's height up). Every fighter view
// that draws one main sprite with its origin at the feet calls hangSprite() last, after
// it has placed and turned the sprite its own way.
//
// The cord (view/WoodTrapsView.js) is drawn to view.hangAnkle.

import { depthScale } from './depths.js';

export const HANG = {
  yank: 10,   // frames from the noose biting to hanging (an ease with an overshoot)
  clear: 44,  // px from the top of his head to the mud while he hangs (clear air under him: he's strung up, not stood on his head)
  drop: 0.2,  // how fast he comes down again once loose (per frame, of the whole lift)
  sway: 7,    // degrees of swing, dying away to `still`
  still: 2.5,
};

const hanging = (f) => f.alive && f.snare?.kind === 'snare';

// How far up (0..1) he is this frame. While caught it follows the sim's snare clock (the
// same on both machines online); once loose it falls back down at HANG.drop.
export function hangAmount(view, f) {
  let k = view.hangK ?? 0;
  if (hanging(f)) {
    const t = Math.min(1, (f.snare.t ?? 0) / HANG.yank);
    k = t < 1 ? 1 - (1 - t) ** 3 + Math.sin(t * Math.PI) * 0.18 : 1; // (snatched up past it, settling back)
    view.hangT = f.snare.t ?? 0;
  } else k = Math.max(0, k - HANG.drop);
  view.hangK = k;
  return k;
}

// Turn the view's sprite `s` (origin at his feet) upside down and lift it so it hangs from
// the ankle. `bodyH` = his drawn height in screen px. Returns true while he's off the ground.
export function hangSprite(view, s, f, bodyH = null) {
  const k = hangAmount(view, f);
  if (k <= 0) { view.hangAnkle = null; return false; }
  const h = bodyH ?? f.stats.body.h * depthScale(f.z) * (f.stats.size ?? 1);
  const t = view.hangT ?? 0;
  const up = hanging(f);
  // the swing: big as the sapling snaps up, dying away; kicking and twisting on top while
  // he fights it (a hero mashing to cut free jerks harder)
  const die = Math.max(HANG.still / HANG.sway, Math.exp(-t / 70));
  let deg = Math.sin(t * 0.11) * HANG.sway * die;
  if (up) deg += Math.sin(t * 0.9) * (f.team === 'player' ? 2.2 : 1.2) + (f.flash > 0 ? Math.sin(t * 2.1) * 4 : 0);
  const lift = (h + HANG.clear) * Math.min(1.15, k);
  const ankleX = f.x;
  const ankleY = f.z - f.h - lift;
  // (falling free: he turns back over on the way down, so he lands on his feet, not his head)
  const flip = up ? 180 * Math.min(1, k * 1.25) : 180 * k;
  s.scaleX = -s.scaleX; // (turned over he'd face the other way: keep him facing where he did)
  s.angle = flip + deg;
  // hung by a FOOT, not by the point between his feet (the sprite's origin): the lowest
  // painted boot in this frame goes to the ankle, so the noose is round it (Nick, 2026-11-16:
  // "the guys caught in it dont even touch the rope")
  const foot = footOf(s);
  let ox = 0; let oy = 0;
  if (foot) {
    const lx = (foot.x - s.displayOriginX) * s.scaleX; const ly = (foot.y - s.displayOriginY) * s.scaleY;
    const r = (s.angle * Math.PI) / 180;
    ox = lx * Math.cos(r) - ly * Math.sin(r); oy = lx * Math.sin(r) + ly * Math.cos(r);
  }
  s.setPosition(ankleX + Math.sin((deg * Math.PI) / 180) * 2 - ox * k, ankleY - oy * k);
  view.hangAnkle = { x: ankleX, y: ankleY, k };
  return true;
}

// The lowest painted pixel of the frame's figure (its leading boot), in frame px (the frame
// as the sprite's origin counts it, trim included); cached per frame. Null where the pixels
// can't be read (no canvas: the tests).
const FEET = new Map();
export function footOf(s) {
  const fr = s.frame;
  if (!fr?.source?.image || typeof document === 'undefined') return null;
  const id = `${s.texture.key}|${fr.name}`;
  if (FEET.has(id)) return FEET.get(id);
  let foot = null;
  try {
    const W = Math.round(fr.cutWidth); const H = Math.round(fr.cutHeight);
    const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
    const cx = cv.getContext('2d', { willReadFrequently: true });
    cx.drawImage(fr.source.image, fr.cutX, fr.cutY, W, H, 0, 0, W, H);
    const px = cx.getImageData(0, 0, W, H).data;
    const trim = fr.trimmed ? fr.data.spriteSourceSize : { x: 0, y: 0 };
    for (let y = H - 1; y >= 0 && !foot; y--) {
      const xs = [];
      for (let x = 0; x < W; x++) if (px[(y * W + x) * 4 + 3] > 120) xs.push(x);
      if (xs.length >= 3) foot = { x: xs[Math.floor(xs.length / 2)] + trim.x, y: y - 2 + trim.y };
    }
  } catch { foot = null; }
  FEET.set(id, foot);
  return foot;
}
