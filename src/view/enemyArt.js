// enemyArt.js — Pixel-art body parts for every enemy, painted in code at boot.
//
// Each enemy is a "paper doll": head, torso, skirt (cloth hanging from the belt),
// arm, thigh, shin, weapon, off-hand item, and for chain weapons the thing on the end
// of the chain. Every part is its own texture — that's what lets the gore system cut
// heads off, split torsos and send limbs flying.
//
// WANT BETTER ART? Draw (or generate) a parts sheet and list it in data/enemyParts.js.
// Its parts are cut out at boot and replace the painted ones (see sliceSheet below).
//
// All sizes are in ART pixels; each art pixel is P screen pixels.

import { Raster, darken } from './raster.js';
import { PART_SHEETS } from '../data/enemyParts.js';

export const P = 2;

// ------------------------------------------------------------------ palettes (dark -> light)
const PAL = {
  skin:    ['#2e140c', '#5a2a1a', '#86422a', '#ab5e3c', '#c97d54', '#e0a077'],
  skinPale:['#2a1e18', '#54402f', '#7e6448', '#a08462', '#bca27c', '#d6c09a'],
  skinSick:['#1e2214', '#3c4428', '#5e6a3e', '#7e8a56', '#9aa37a', '#b8be96'],
  skinGrey:['#1e1612', '#3e2c24', '#624636', '#86604a', '#a47a5e', '#be9676'],
  leather: ['#150c08', '#2c1a10', '#46291a', '#613a24', '#7e5032', '#9a6a46'],
  leatherD:['#0e0806', '#1e120c', '#301e14', '#44291c', '#5a3826'],
  olive:   ['#10120a', '#20240f', '#343a18', '#4a5222', '#5f6a2e', '#78843e'],
  oliveL:  ['#161a0e', '#2a3016', '#424a22', '#5a6630', '#72803e', '#8c9a52'],
  iron:    ['#101014', '#26262c', '#3e3e46', '#5a5b64', '#7c7e88', '#a8acb4'],
  rust:    ['#140c0a', '#2e1a14', '#4a2c20', '#66402e', '#86583e', '#a67656'],
  steel:   ['#22242a', '#4a4e56', '#767c86', '#a2aab4', '#ccd4dc', '#f0f4f8'],
  wood:    ['#1a100a', '#34200f', '#523418', '#704a22', '#8c6030', '#a87a44'],
  bone:    ['#2e281e', '#5a5040', '#8a7e64', '#b6aa8a', '#d8ceb0', '#f2ecd8'],
  red:     ['#1a0404', '#3c0808', '#620e0e', '#8a1616', '#ac2420', '#cc3e32'],
  hair:    ['#0a0706', '#18110c', '#2a1e14', '#3c2c1e', '#503c28'],
  hairBlk: ['#060505', '#100c0a', '#1c1612', '#2a221c', '#3a3028'],
  cloth:   ['#121212', '#242222', '#3a3634', '#524c48', '#6a625c'],
};

// ------------------------------------------------------------------ shared body painters

function paintArm(o) {
  const L = o.len;
  const r = new Raster(14, L + 8, o.seed);
  const cx = 7;
  const sy = 3;
  const skin = o.skin;
  // upper arm, forearm, fist
  r.capsule(cx, sy, o.rU, cx, sy + L * 0.48, o.rU * 0.86, skin);
  r.capsule(cx, sy + L * 0.48, o.rF, cx + 0.4, sy + L - 2.2, o.rF * 0.8, skin);
  r.ellipse(cx + 0.5, sy + L, 2.7, 2.5, o.glove ?? skin);
  r.line(cx + 2, sy + L - 1, cx + 2, sy + L + 1, darken((o.glove ?? skin)[1], 1), { clip: true });
  if (o.sleeve) {
    const to = sy + L * o.sleeve.to;
    r.capsule(cx, sy, o.rU + 0.7, cx, to, o.rU + 0.4, o.sleeve.ramp);
    for (let x = cx - 4; x <= cx + 4; x++) if (r.rand() < 0.5) r.set(x, to + 1 + Math.floor(r.rand() * 2), o.sleeve.ramp[1]);
  }
  if (o.bracer) {
    const y0 = sy + L * 0.6;
    const y1 = sy + L - 2.5;
    r.capsule(cx, y0, o.rF + 0.7, cx + 0.3, y1, o.rF + 0.5, o.bracer.ramp);
    for (let y = y0; y < y1; y += 2.5) r.stud(cx + 2, y, o.bracer.stud ?? '#b8b0a0');
    if (o.bracer.spikes) { r.spike(cx + 3, y0 + 1, 1, 0, 2); r.spike(cx + 3, y1 - 1, 1, 0, 2); }
  }
  if (o.wrap) for (let y = sy + L * 0.6; y < sy + L - 2; y += 1.5) r.line(cx - 3, y, cx + 3, y + 1, o.wrap, { clip: true });
  if (o.pauldron) {
    const pr = o.pauldron;
    r.ellipse(cx, sy + 1, pr.rx ?? 5, pr.ry ?? 4.2, pr.ramp);
    for (let i = -1; i <= 1; i++) r.stud(cx + i * 2.2, sy + 1.5, '#d0c8b8');
    if (pr.spikes) { r.spike(cx, sy - 3, 0, -1, 2); r.spike(cx - 4, sy - 1, -1, -1, 2); r.spike(cx + 4, sy - 1, 1, -1, 2); }
  }
  if (o.skull) paintSkullIcon(r, cx - 1, sy - 2);
  if (o.chainWrap) for (let y = sy + L - 5; y < sy + L - 1; y += 2) r.chain(cx - 3, y, cx + 3, y + 1, { clip: true });
  r.grime(18).blood(o.blood ?? 6, [0, sy + L * 0.4, 14, sy + L + 3]);
  return { r, pivot: [cx, sy], hand: [cx + 0.5, sy + L] };
}

function paintThigh(o) {
  const L = o.len;
  const r = new Raster(12, L + 6, o.seed);
  const cx = 6;
  r.capsule(cx, 2, o.r, cx, 2 + L, o.r * 0.82, o.ramp);
  if (o.kneePad) r.ellipse(cx + 1.5, 2 + L, 3, 2.6, o.kneePad).stud(cx + 1.5, 1 + L, '#d0c8b8');
  if (o.straps) for (let y = 5; y < L; y += 4) r.line(cx - 4, y, cx + 4, y + 1, o.straps, { clip: true });
  r.grime(14).blood(o.blood ?? 3);
  return { r, pivot: [cx, 2], joint: [cx, 2 + L] };
}

function paintShin(o) {
  const L = o.len;
  const r = new Raster(16, L + 8, o.seed);
  const cx = 6;
  r.capsule(cx, 1, o.r, cx, L - 1, o.r * 0.75, o.ramp);
  // boot + foot (toe points forward = right)
  const bt = L - (o.bootH ?? 6);
  r.capsule(cx, bt, o.r * 0.95 + 0.6, cx, L, o.r * 0.9 + 0.4, o.boot);
  r.poly([[cx - 3.2, L - 1], [cx + 4, L - 0.5], [cx + 7.2, L + 1.8], [cx + 7.2, L + 3.4], [cx - 3.4, L + 3.4]], o.boot, { v: 0.45 });
  r.line(cx - 3, L + 3, cx + 7, L + 3, o.boot[0]);
  if (o.fur) for (let x = cx - 4; x <= cx + 4; x++) { r.set(x, bt - 1, r.pick(o.fur)); if (r.rand() < 0.6) r.set(x, bt - 2, r.pick(o.fur)); }
  if (o.greave) { r.capsule(cx + 1.2, 2, o.r * 0.7, cx + 1.2, bt, o.r * 0.6, o.greave, { clip: true }); r.stud(cx + 2, 4, '#d0c8b8'); r.stud(cx + 2, bt - 3, '#d0c8b8'); }
  if (o.wrap) for (let y = 3; y < bt; y += 2) r.line(cx - 3, y, cx + 3, y + 1, o.wrap, { clip: true });
  r.grime(14).blood(o.blood ?? 3);
  return { r, pivot: [cx, 1], joint: [cx, L] };
}

// Side-view torso, facing right. Hip pivot, with neck and shoulder sockets.
function paintTorsoBase(o) {
  const T = o.torso;
  const W = Math.ceil(o.chest * 2 + 12);
  const H = T + 12;
  const r = new Raster(W, H, o.seed);
  const cx = W / 2 - 1;
  const hipY = T + 4;
  const neckY = 4;
  r.capsule(cx + 1, neckY - 1, 2.7, cx, neckY + 5, 3.4, o.skin);                   // neck
  r.capsule(cx, hipY - 2, o.waist, cx + 0.6, neckY + 7, o.chest, o.body ?? o.skin); // trunk
  r.ellipse(cx + 2.2, neckY + 8, o.chest * 0.78, 4.8, o.body ?? o.skin);           // chest
  if (o.belly) r.ellipse(cx + 2.4, hipY - 6.5, o.waist + 1.8, 5.2, o.body ?? o.skin, { bias: 0.04 });
  r.ellipse(cx, hipY, o.waist * 0.95, 3.6, o.pants);                               // pelvis
  const t = { r, cx, hipY, neckY, W, H };
  o.detail?.(t);
  if (o.belt) {
    r.capsule(cx - o.waist - 1, hipY - 2, 1.6, cx + o.waist + 1.5, hipY - 2, 1.6, o.belt, { clip: true });
    r.rect(cx + o.waist - 2, hipY - 3.5, 3, 3, PAL.iron, { v: 0.7 });
  }
  r.grime(30).blood(o.blood ?? 10);
  return {
    r,
    pivot: [cx, hipY],
    neck: [cx + 1, neckY],
    shoulderF: [cx + 1.5, neckY + 3.5],
    shoulderB: [cx - 0.5, neckY + 3],
    hipF: [cx + 1.5, hipY - 0.5],
    hipB: [cx - 1.5, hipY - 0.5],
    waist: o.waist,
  };
}

// Ragged cloth hanging from the belt (drawn in front of the legs).
function paintSkirt(o) {
  const W = o.w + 4;
  const H = o.len + 4;
  const r = new Raster(W, H, o.seed);
  const cx = W / 2;
  for (const strip of o.strips) {
    const x0 = cx + strip.x - strip.w / 2;
    const len = strip.len ?? o.len;
    // Tattered: the strip is torn into narrow tongues of different lengths, each
    // tapering to a ragged point, with folds shaded darker/lighter.
    let x = x0;
    while (x < x0 + strip.w - 0.5) {
      const tw = Math.min(x0 + strip.w - x, r.r(1.8, 3.4));
      const tl = len * r.r(0.55, 1);
      const fold = r.r(-0.12, 0.12);
      r.poly([[x, 1], [x + tw, 1], [x + tw - r.r(0, 0.8), tl - r.r(1, 3)], [x + tw * r.r(0.3, 0.7), tl], [x + r.r(0, 0.8), tl - r.r(1, 3)]],
        strip.ramp, { v: (strip.v ?? 0.5) + fold, grad: 0.35 });
      r.line(x, 2, x, tl - 3, strip.ramp[Math.max(0, 1)], { clip: true });
      x += tw;
    }
    if (strip.holes) for (let k = 0; k < strip.holes; k++) r.clear(x0 + r.r(1, strip.w - 1), r.r(len * 0.4, len - 1));
  }
  o.detail?.(r, cx);
  r.grime(12).blood(o.blood ?? 5);
  return { r, pivot: [cx, 1.5] };
}

function paintSkullIcon(r, x, y) {
  r.ellipse(x + 2, y + 2, 2.6, 2.3, PAL.bone);
  r.rect(x + 1, y + 3.4, 2.4, 1.6, PAL.bone, { v: 0.6 });
  r.set(x + 1, y + 2, '#140c08');
  r.set(x + 3, y + 2, '#140c08');
  r.set(x + 2, y + 4, '#2a2018');
}

// ------------------------------------------------------------------ heads (facing right)

function headBase(r, cx, cy, skin, o = {}) {
  r.capsule(cx - 0.5, cy + 4, 2.8, cx, cy + 8, 3, skin);                    // neck stub
  r.ellipse(cx, cy, o.rx ?? 5.4, o.ry ?? 6, skin);                           // skull
  r.poly([[cx - 1, cy + 1], [cx + 5.6, cy + 1], [cx + 5, cy + 5.5], [cx + 2, cy + 7], [cx - 2, cy + 5]], skin, { v: 0.5 }); // jaw
  r.poly([[cx + 5, cy - 1], [cx + 7.2, cy + 2.2], [cx + 5, cy + 2.6]], skin, { v: 0.62 }); // nose
  r.ellipse(cx - 1.8, cy + 0.5, 1.3, 1.9, skin, { bias: -0.1 });            // ear
  r.line(cx + 2.4, cy - 2.2, cx + 5.4, cy - 1.6, skin[0]);                   // brow
}

function eye(r, x, y, o = {}) {
  r.set(x, y, o.white ?? '#e8dcc8');
  r.set(x + 1, y, o.pupil ?? '#1a0806');
  if (o.red) r.set(x, y + 1, '#a0141a');
}

function mouth(r, cx, cy, o = {}) {
  const mx = cx + 3;
  const my = cy + 3.6;
  if (o.open) {
    r.poly([[mx - 1, my], [mx + 3, my - 0.4], [mx + 2.6, my + 2.6], [mx - 0.6, my + 2]], null, { color: '#1a0606' });
    r.line(mx - 0.5, my, mx + 2.6, my - 0.2, '#e0d6c0');
    r.line(mx, my + 2, mx + 2.2, my + 2.2, '#c8bea8');
    if (o.tongue) r.poly([[mx, my + 1.2], [mx + 3.4, my + 1.4], [mx + 3.2, my + 4.6], [mx + 1.4, my + 4.8]], PAL.red, { v: 0.8 });
  } else {
    r.line(mx - 0.5, my + 0.6, mx + 2.4, my + 0.3, '#2a0e0a');
  }
}

// ------------------------------------------------------------------ weapons (drawn pointing UP from the grip)

function wCleaver(seed) {
  const r = new Raster(16, 30, seed);
  r.capsule(5, 29, 1.6, 5, 20, 1.5, PAL.wood);
  r.rect(3.2, 18.5, 3.6, 1.6, PAL.iron, { v: 0.6 });
  r.poly([[2, 3], [13.5, 1.5], [15, 17.5], [2.2, 18.5]], PAL.steel, { v: 0.62, grad: 0.4 });
  r.line(14.3, 2, 15, 17, '#f4f8fc');               // edge
  r.line(2.6, 3.5, 2.6, 18, PAL.steel[1]);          // spine
  for (const [x, y] of [[4, 5], [5, 5], [4, 6], [5, 6], [6, 6], [5, 7]]) r.clear(x, y);
  r.grime(20).blood(26, [6, 1, 16, 19]);
  return { r, pivot: [5, 25] };
}

function wDagger(seed, len = 13) {
  const r = new Raster(8, len + 8, seed);
  const g = len + 4;
  r.capsule(4, g + 3, 1.3, 4, g, 1.3, PAL.leather);
  r.rect(1.4, g - 1.6, 5.2, 1.4, PAL.iron, { v: 0.6 });
  r.poly([[2.8, g - 1.6], [5.4, g - 1.6], [4.6, 2], [3.6, 0.5]], PAL.steel, { v: 0.62 });
  r.line(5, g - 2, 4.4, 2, '#eef2f6');
  r.blood(10, [0, 0, 8, g - 2]);
  return { r, pivot: [4, g + 1.5] };
}

function wAxe(seed) {
  const r = new Raster(20, 40, seed);
  r.capsule(6, 39, 1.5, 6, 3, 1.4, PAL.wood);
  for (let y = 26; y < 34; y += 2) r.line(4.5, y, 7.5, y + 1, PAL.leather[3], { clip: true });
  r.poly([[6, 3], [14, 0.5], [18.5, 5], [19, 14], [15, 19], [6.5, 14]], PAL.steel, { v: 0.58, grad: 0.45 });
  r.line(18.2, 4.5, 18.7, 14, '#f4f8fc');
  r.line(15, 18.4, 18.6, 14.2, '#dfe6ee');
  r.rect(4.4, 2, 3.4, 13, PAL.iron, { v: 0.5 });
  r.stud(6, 5, '#d0c8b8'); r.stud(6, 11, '#d0c8b8');
  r.grime(20).blood(30, [8, 0, 20, 20]);
  return { r, pivot: [6, 33] };
}

function wMace(seed) {
  const r = new Raster(16, 32, seed);
  r.capsule(8, 31, 1.6, 8, 10, 1.5, PAL.wood);
  r.rect(6.2, 24, 3.6, 2, PAL.iron, { v: 0.6 });
  r.ellipse(8, 7, 4.6, 5, PAL.rust);
  for (const [dx, dy] of [[0, -1], [1, -1], [1, 0], [1, 1], [-1, 0], [-1, -1], [-1, 1], [0, 1]]) {
    r.spike(8 + dx * 4.4, 7 + dy * 4.6, dx, dy, 2, '#c0c4cc', '#4a4a52');
  }
  r.grime(10).blood(22, [2, 0, 16, 14]);
  return { r, pivot: [8, 27] };
}

function wSword(seed) {
  const r = new Raster(8, 28, seed);
  r.capsule(4, 27, 1.3, 4, 23, 1.3, PAL.leather);
  r.rect(0.6, 21.4, 6.8, 1.6, PAL.rust, { v: 0.6 });
  r.poly([[2.6, 21.4], [5.4, 21.4], [5.2, 2.6], [4, 0.4], [2.8, 2.6]], PAL.steel, { v: 0.5 });
  r.line(4, 3, 4, 20, PAL.steel[1]);
  r.grime(18).blood(10, [0, 0, 8, 20]);
  return { r, pivot: [4, 24.5] };
}

function wFlailHandle(seed) {
  const r = new Raster(8, 16, seed);
  r.capsule(4, 15, 1.7, 4, 4, 1.6, PAL.wood);
  for (let y = 9; y < 14; y += 2) r.line(2.5, y, 5.5, y + 1, PAL.leather[3], { clip: true });
  r.ellipse(4, 3, 2.4, 2, PAL.iron);
  r.ellipse(4, 0.8, 1.2, 1, null, { color: '#6a6a72' });
  return { r, pivot: [4, 11], tip: [4, 0.5] };
}

function wSpikedBall(seed, rad = 5) {
  const S = Math.ceil(rad * 2 + 8);
  const r = new Raster(S, S, seed);
  const c = S / 2;
  r.ellipse(c, c, rad, rad, PAL.rust);
  const dirs = [[0, -1], [0.7, -0.7], [1, 0], [0.7, 0.7], [0, 1], [-0.7, 0.7], [-1, 0], [-0.7, -0.7]];
  for (const [dx, dy] of dirs) r.spike(c + dx * rad, c + dy * rad, dx, dy, 3, '#c8ccd4', '#4a4a52');
  r.stud(c - 1, c - 1, '#d0c8b8'); r.stud(c + 2, c + 1, '#d0c8b8');
  r.grime(10).blood(Math.round(rad * 5));
  return { r, pivot: [c, c] };
}

function wMeatHook(seed) {
  const r = new Raster(12, 16, seed);
  r.ellipse(5, 1.5, 1.6, 1.4, PAL.iron);
  r.capsule(5, 2, 1.1, 5, 9, 1.1, PAL.rust);
  const pts = [[5, 9], [5.5, 11.5], [7.5, 13], [9.5, 12], [10, 9.5], [9.6, 7]];
  for (let i = 0; i < pts.length - 1; i++) r.capsule(...pts[i], 1.2, ...pts[i + 1], 1, PAL.rust);
  r.set(9.6, 6, '#c8ccd4');
  r.blood(12);
  return { r, pivot: [5, 1.5] };
}

function wSickle(seed) {
  const r = new Raster(16, 16, seed);
  r.capsule(3, 15, 1.3, 3, 8, 1.3, PAL.wood);
  const pts = [[3, 8], [3.6, 4.5], [6, 2], [9.5, 1.2], [13, 2.4], [14.8, 5]];
  for (let i = 0; i < pts.length - 1; i++) r.capsule(...pts[i], 1.3 - i * 0.1, ...pts[i + 1], 1.2 - i * 0.12, PAL.steel);
  r.line(6, 1.6, 13, 2, '#f0f4f8');
  r.blood(12);
  return { r, pivot: [3, 12] };
}

function wShield(seed) {
  const r = new Raster(22, 30, seed);
  const cx = 11;
  const cy = 15;
  r.ellipse(cx, cy, 9.5, 13.5, PAL.iron);                      // rim
  r.ellipse(cx, cy, 8, 12, PAL.wood);                           // planks
  for (let x = cx - 6; x <= cx + 6; x += 3) r.line(x, cy - 11, x, cy + 11, PAL.wood[1], { clip: true });
  r.ellipse(cx, cy, 3.2, 4.2, PAL.iron);                        // boss
  r.spike(cx, cy - 2, 1, 0, 2, '#d0d4dc', '#4a4a52');
  for (let a = 0; a < Math.PI * 2; a += Math.PI / 4) r.stud(cx + Math.cos(a) * 8.7, cy + Math.sin(a) * 12.6, '#d0c8b8');
  for (const a of [-1.2, 0, 1.2, Math.PI - 1.2, Math.PI, Math.PI + 1.2]) {
    r.spike(cx + Math.cos(a) * 9.5, cy + Math.sin(a) * 13.5, Math.round(Math.cos(a)), Math.round(Math.sin(a)), 2);
  }
  r.grime(40).blood(40);
  return { r, pivot: [cx, cy] };
}

// ------------------------------------------------------------------ the roster

function limbs(o) {
  return {
    arm: paintArm({ seed: o.seed + 1, ...o.arm }),
    armB: o.armB ? paintArm({ seed: o.seed + 2, ...o.arm, ...o.armB }) : null,
    thigh: paintThigh({ seed: o.seed + 3, ...o.thigh }),
    shin: paintShin({ seed: o.seed + 4, ...o.shin }),
  };
}

const SPECS = {
  // -------------------------------------------------------------- ASHEN GRUNT
  grunt: () => {
    const seed = 11;
    const skin = PAL.skinSick;
    const L = limbs({
      seed,
      arm: { len: 15, rU: 2.8, rF: 2.4, skin, sleeve: { ramp: PAL.olive, to: 0.5 }, wrap: PAL.leather[2] },
      thigh: { len: 10, r: 3.2, ramp: PAL.cloth },
      shin: { len: 10, r: 2.8, ramp: PAL.cloth, boot: PAL.leather, bootH: 5 },
    });
    const torso = paintTorsoBase({
      seed, torso: 17, chest: 7, waist: 5.5, skin, body: PAL.olive, pants: PAL.cloth, belt: PAL.leather,
      detail: ({ r, cx, neckY, hipY }) => {
        r.line(cx - 5, neckY + 5, cx + 5, hipY - 3, PAL.leather[3], { clip: true, thick: true });
        r.grime(20);
      },
    });
    const skirt = paintSkirt({ seed, w: 14, len: 9, strips: [{ x: -2, w: 7, ramp: PAL.olive }, { x: 3, w: 6, ramp: PAL.olive, v: 0.4 }] });
    const head = (() => {
      const r = new Raster(18, 20, seed + 5);
      const cx = 8; const cy = 9;
      headBase(r, cx, cy, skin);
      // kettle helm
      r.ellipse(cx, cy - 2.5, 6, 4.6, PAL.rust);
      r.rect(cx - 7.5, cy - 0.6, 15, 1.6, PAL.rust, { v: 0.4 });
      r.stud(cx, cy - 5, '#c8b8a0');
      eye(r, cx + 3.4, cy + 1, { pupil: '#3a0808' });
      mouth(r, cx, cy);
      r.blood(6);
      return { r, pivot: [cx - 0.3, cy + 8] };
    })();
    return {
      parts: { ...L, torso, skirt, head, weapon: wSword(seed) },
      rig: { thigh: 10, shin: 9.5, armLen: 15, stance: [4.5, -4.5], rest: { aF: -25, wF: 20, aB: 12 } },
      gore: { skin, flesh: PAL.skinSick },
    };
  },

  // -------------------------------------------------------------- GORRAK THE FLAYER
  butcher: () => {
    const seed = 101;
    const skin = PAL.skin;
    const L = limbs({
      seed,
      arm: { len: 16, rU: 3.7, rF: 3.2, skin, bracer: { ramp: PAL.leather, stud: '#c0b098' }, blood: 10 },
      thigh: { len: 11, r: 4, ramp: PAL.leatherD, straps: PAL.leather[3] },
      shin: { len: 11, r: 3.4, ramp: PAL.leatherD, boot: PAL.leather, bootH: 7, fur: PAL.hair },
    });
    const torso = paintTorsoBase({
      seed, torso: 19, chest: 9, waist: 8, belly: true, skin, pants: PAL.leatherD, belt: PAL.leather, blood: 22,
      detail: ({ r, cx, neckY, hipY }) => {
        // leather apron bib + strap, chest hair, chain loops
        r.poly([[cx - 2, neckY + 9], [cx + 8, neckY + 8], [cx + 10, hipY], [cx - 1, hipY]], PAL.leather, { v: 0.45, clip: true });
        r.line(cx - 6, neckY + 4, cx + 3, neckY + 9, PAL.leather[2], { clip: true, thick: true });
        for (let i = 0; i < 12; i++) r.over(cx + r.r(0, 7), neckY + r.r(5, 9), PAL.hair[1]);
        r.blood(30, [cx, neckY + 6, cx + 12, hipY]);
      },
    });
    const skirt = paintSkirt({
      seed, w: 22, len: 16, blood: 26,
      strips: [
        { x: 3, w: 11, ramp: PAL.leather, v: 0.5, holes: 3 },
        { x: -5, w: 7, ramp: ['#241a12', '#3e2e20', '#5a4432', '#7a624a', '#9a8064'], v: 0.45, len: 12 },
      ],
      detail: (r, cx) => { r.chain(cx - 6, 2, cx - 4, 9); r.ellipse(cx - 4, 10, 1.6, 1.6, PAL.iron); },
    });
    const head = (() => {
      const r = new Raster(22, 24, seed + 5);
      const cx = 10; const cy = 10;
      // wild hair behind
      r.poly([[cx - 8, cy - 6], [cx + 2, cy - 8], [cx + 3, cy - 3], [cx - 1, cy + 12], [cx - 6, cy + 13], [cx - 9, cy + 4]], PAL.hair, { v: 0.4 });
      headBase(r, cx, cy, skin);
      r.poly([[cx - 3, cy - 7], [cx + 5, cy - 6.5], [cx + 3, cy - 3], [cx - 5, cy - 2]], PAL.hair, { v: 0.5 });
      for (let i = 0; i < 6; i++) r.line(cx - 7 + i, cy - 5, cx - 8 + i * 0.6, cy + 10 + r.r(0, 3), PAL.hair[r.rand() < 0.5 ? 1 : 3]);
      // beard
      r.poly([[cx - 1, cy + 2], [cx + 5.5, cy + 2.5], [cx + 5, cy + 8.5], [cx + 1, cy + 10], [cx - 2, cy + 6]], PAL.hair, { v: 0.45 });
      eye(r, cx + 3.4, cy + 0.5, { white: '#f0e0d0', red: true });
      mouth(r, cx, cy, { open: true, tongue: true });
      r.blood(9, [cx - 3, cy - 7, cx + 8, cy + 8]);
      return { r, pivot: [cx - 0.3, cy + 9] };
    })();
    return {
      parts: { ...L, torso, skirt, head, weapon: wCleaver(seed), off: wMeatHook(seed), hookItem: wMeatHook(seed + 9) },
      rig: {
        thigh: 11, shin: 10.5, armLen: 16, stance: [5, -5],
        rest: { aF: -28, wF: 24, aB: 8, wB: 0, lean: 4 },
        offHangs: true,
      },
      gore: { skin, flesh: PAL.skin },
    };
  },

  // -------------------------------------------------------------- SLIV THE HOLLOW
  stalker: () => {
    const seed = 202;
    const skin = PAL.skinGrey;
    const L = limbs({
      seed,
      arm: { len: 16, rU: 2.9, rF: 2.5, skin, sleeve: { ramp: PAL.olive, to: 0.55 }, wrap: PAL.leather[3] },
      thigh: { len: 12, r: 3.3, ramp: PAL.cloth, straps: PAL.leather[2] },
      shin: { len: 11.5, r: 2.9, ramp: PAL.cloth, boot: PAL.leather, bootH: 8, wrap: PAL.leather[3] },
    });
    const torso = paintTorsoBase({
      seed, torso: 19, chest: 7, waist: 5.5, skin, body: PAL.olive, pants: PAL.cloth, belt: PAL.leather,
      detail: ({ r, cx, neckY, hipY }) => {
        r.line(cx - 6, neckY + 3, cx + 6, hipY - 3, PAL.leather[3], { clip: true, thick: true });
        r.line(cx + 5, neckY + 4, cx - 5, hipY - 4, PAL.leather[2], { clip: true });
        for (let y = neckY + 6; y < hipY - 4; y += 3) r.over(cx + 2, y, '#b0a898');
        paintSkullIcon(r, cx + 3, hipY - 5);
      },
    });
    const skirt = paintSkirt({
      seed, w: 22, len: 20,
      strips: [
        { x: -4, w: 9, ramp: PAL.olive, v: 0.4, holes: 3 },
        { x: 3, w: 9, ramp: PAL.olive, v: 0.55, holes: 2, len: 17 },
        { x: 0, w: 3, ramp: PAL.red, v: 0.4, len: 18 },
      ],
    });
    const head = (() => {
      const r = new Raster(22, 24, seed + 5);
      const cx = 10; const cy = 11;
      // hood
      r.poly([[cx - 8, cy + 9], [cx - 7, cy - 4], [cx - 1, cy - 9], [cx + 5, cy - 8], [cx + 8, cy - 2], [cx + 7, cy + 4], [cx + 3, cy + 9]], PAL.olive, { v: 0.5 });
      r.ellipse(cx + 2.5, cy + 1.5, 4.2, 5.5, null, { color: '#0e0a08', clip: true }); // shadowed face
      r.ellipse(cx + 3.4, cy + 2.5, 3, 4, skin, { clip: true, bias: -0.25 });
      eye(r, cx + 4, cy + 1, { white: '#d8c078', pupil: '#2a0606' });
      r.line(cx + 3, cy + 4.6, cx + 6, cy + 4.4, '#d8ccb0', { clip: true });
      r.line(cx + 3, cy + 5.4, cx + 6, cy + 5.4, '#3a0808', { clip: true });
      for (let i = 0; i < 8; i++) r.over(cx + r.r(-7, 7), cy + r.r(4, 9), PAL.olive[0]);
      r.blood(5, [cx + 1, cy - 1, cx + 7, cy + 7]);
      return { r, pivot: [cx, cy + 8] };
    })();
    return {
      parts: { ...L, torso, skirt, head, weapon: wDagger(seed, 14), off: wDagger(seed + 7, 13), hookItem: wSickle(seed) },
      rig: {
        thigh: 12, shin: 10.5, armLen: 16, stance: [6.5, -6], crouch: 2,
        rest: { aF: -40, wF: 30, aB: -25, wB: 40, lean: 12 },
      },
      gore: { skin, flesh: PAL.skinGrey },
    };
  },

  // -------------------------------------------------------------- THE IRON PENITENT
  penitent: () => {
    const seed = 303;
    const skin = PAL.skin;
    const L = limbs({
      seed,
      arm: {
        len: 18, rU: 4.4, rF: 3.8, skin,
        pauldron: { ramp: PAL.rust, rx: 6, ry: 5, spikes: true },
        bracer: { ramp: PAL.rust, spikes: true }, chainWrap: true, blood: 10,
      },
      thigh: { len: 12, r: 4.6, ramp: PAL.leather, kneePad: PAL.rust, straps: PAL.leatherD[4] },
      shin: { len: 11, r: 4, ramp: PAL.leather, boot: PAL.leatherD, bootH: 7, greave: PAL.rust },
    });
    const torso = paintTorsoBase({
      seed, torso: 21, chest: 11, waist: 9, belly: true, skin, pants: PAL.leather, belt: PAL.rust, blood: 20,
      detail: ({ r, cx, neckY, hipY }) => {
        // leather harness + heavy chains crossing the chest
        r.poly([[cx - 10, neckY + 10], [cx - 2, neckY + 6], [cx - 3, hipY - 4], [cx - 10, hipY - 3]], PAL.leather, { clip: true, v: 0.4 });
        for (let i = 0; i < 7; i++) r.stud(cx - 8 + (i % 3) * 2.5, neckY + 9 + Math.floor(i / 3) * 4);
        r.chain(cx - 9, neckY + 4, cx + 10, hipY - 5, { clip: true });
        r.chain(cx + 9, neckY + 5, cx - 8, hipY - 3, { clip: true });
        r.chain(cx - 10, neckY + 2, cx + 10, neckY + 3, { clip: true });
        paintSkullIcon(r, cx + 4, hipY - 6);
        paintSkullIcon(r, cx - 5, hipY - 6);
      },
    });
    const skirt = paintSkirt({
      seed, w: 26, len: 15, blood: 20,
      strips: [
        { x: -6, w: 7, ramp: PAL.leather, v: 0.45 },
        { x: 1, w: 7, ramp: PAL.leather, v: 0.55 },
        { x: 7, w: 6, ramp: PAL.red, v: 0.4, holes: 2 },
      ],
      detail: (r, cx) => { for (let x = cx - 8; x < cx + 6; x += 3) r.stud(x, 4); r.chain(cx - 9, 2, cx - 10, 12); },
    });
    const head = (() => {
      const r = new Raster(24, 26, seed + 5);
      const cx = 11; const cy = 12;
      headBase(r, cx, cy, skin, { rx: 6, ry: 6.5 });
      // riveted iron bucket mask
      r.poly([[cx - 6, cy - 7], [cx + 5, cy - 8], [cx + 7.5, cy - 4], [cx + 7.4, cy + 6], [cx + 4, cy + 8], [cx - 6, cy + 7]], PAL.rust, { v: 0.55, grad: 0.4 });
      r.line(cx + 7, cy - 3, cx + 7, cy + 5, PAL.rust[5]);
      for (let y = cy - 5; y <= cy + 5; y += 3.3) { r.stud(cx - 4.5, y, '#d0c0a8'); r.stud(cx + 6, y, '#d0c0a8'); }
      r.rect(cx + 2.5, cy - 1.5, 4, 1.8, null, { color: '#080404' });   // eye slit
      r.set(cx + 5, cy - 1, '#ff3a20');
      r.rect(cx + 3, cy + 3, 3.5, 1.2, null, { color: '#100606' });    // mouth grille
      r.rect(cx + 3, cy + 4.6, 3.5, 1.2, null, { color: '#100606' });
      for (const x of [-4, 0, 4]) r.spike(cx + x, cy - 8, x / 4, -1, 3, '#c0b0a0', '#4a2c20');
      r.chain(cx - 6, cy + 8, cx + 5, cy + 9);
      r.blood(9, [cx + 1, cy - 2, cx + 8, cy + 8]);
      return { r, pivot: [cx - 0.3, cy + 9] };
    })();
    return {
      parts: { ...L, torso, skirt, head, weapon: wFlailHandle(seed), chainEnd: wSpikedBall(seed, 6) },
      rig: {
        thigh: 12, shin: 10.5, armLen: 18, stance: [6, -6.5], crouch: 1.5,
        rest: { aF: -20, wF: 60, aB: 10, lean: 8 },
        chain: { len: 26, links: 8 },
      },
      gore: { skin, flesh: PAL.skin },
    };
  },

  // -------------------------------------------------------------- VORN SKULLSPLITTER
  berserker: () => {
    const seed = 404;
    const skin = PAL.skin;
    const L = limbs({
      seed,
      arm: { len: 16, rU: 3.5, rF: 3.1, skin, bracer: { ramp: PAL.leatherD, stud: '#b0a090' }, blood: 8 },
      armB: { skull: true, pauldron: { ramp: PAL.leather, rx: 4.6, ry: 3.8 } },
      thigh: { len: 11, r: 3.8, ramp: PAL.leather },
      shin: { len: 11.5, r: 3.2, ramp: PAL.leather, boot: PAL.leatherD, bootH: 8, fur: PAL.hair, wrap: PAL.leatherD[4] },
    });
    const torso = paintTorsoBase({
      seed, torso: 19, chest: 8.5, waist: 6.5, skin, pants: PAL.leather, belt: PAL.leatherD, blood: 24,
      detail: ({ r, cx, neckY, hipY }) => {
        r.line(cx - 6, neckY + 3, cx + 7, hipY - 3, PAL.leather[3], { clip: true, thick: true });
        r.line(cx + 2, neckY + 8, cx + 7, neckY + 8.6, skin[1], { clip: true });   // pec line
        for (let y = neckY + 11; y < hipY - 3; y += 2.6) r.line(cx + 3, y, cx + 6, y, skin[2], { clip: true }); // abs
        paintSkullIcon(r, cx + 3, hipY - 5);
        paintSkullIcon(r, cx - 4, hipY - 5);
      },
    });
    const skirt = paintSkirt({
      seed, w: 22, len: 14, blood: 14,
      strips: [
        { x: -4, w: 8, ramp: PAL.hair, v: 0.6, holes: 1 },
        { x: 3, w: 9, ramp: PAL.leather, v: 0.5, holes: 2 },
        { x: 0, w: 3, ramp: PAL.bone, v: 0.3, len: 10 },
      ],
    });
    const head = (() => {
      const r = new Raster(24, 24, seed + 5);
      const cx = 10; const cy = 11;
      // ponytail
      r.capsule(cx - 5, cy - 3, 1.8, cx - 8, cy + 10, 1.4, PAL.hairBlk);
      headBase(r, cx, cy, skin);
      // shaved sides (stubble) + tall mohawk
      for (let i = 0; i < 30; i++) r.over(cx + r.r(-5, 3), cy + r.r(-5, 0), PAL.hairBlk[2]);
      r.poly([[cx - 6, cy - 3], [cx - 4, cy - 9], [cx, cy - 11], [cx + 4, cy - 9], [cx + 4, cy - 5], [cx - 3, cy - 4]], PAL.hairBlk, { v: 0.55 });
      for (let x = cx - 4; x < cx + 4; x += 1.5) r.set(x, cy - 10 - r.r(0, 1.5), PAL.hairBlk[3]);
      eye(r, cx + 3.4, cy + 0.5, { white: '#f0e0d0', red: true });
      mouth(r, cx, cy, { open: true });
      r.line(cx + 1, cy - 5, cx + 4, cy + 3, BLOODLINE, {});
      r.blood(8, [cx - 2, cy - 6, cx + 7, cy + 7]);
      return { r, pivot: [cx - 0.3, cy + 8] };
    })();
    return {
      parts: { ...L, torso, skirt, head, weapon: wAxe(seed) },
      rig: {
        thigh: 11, shin: 11, armLen: 16, stance: [6, -6], crouch: 1.5,
        rest: { aF: -35, wF: 18, aB: 18, lean: 8 },
      },
      gore: { skin, flesh: PAL.skin },
    };
  },

  // -------------------------------------------------------------- GRUBB ROTCHAIN
  ghoul: () => {
    const seed = 505;
    const skin = PAL.skinGrey;
    const L = limbs({
      seed,
      arm: { len: 17, rU: 2.8, rF: 2.4, skin, bracer: { ramp: PAL.leather, spikes: true }, blood: 10 },
      thigh: { len: 11, r: 3.3, ramp: PAL.cloth, straps: PAL.leather[2] },
      shin: { len: 11, r: 2.8, ramp: PAL.cloth, boot: PAL.leather, bootH: 6, wrap: PAL.leather[3] },
    });
    const torso = paintTorsoBase({
      seed, torso: 18, chest: 7.5, waist: 6, skin, body: PAL.oliveL, pants: PAL.cloth, belt: PAL.leather,
      detail: ({ r, cx, neckY, hipY }) => {
        r.ellipse(cx + 4, neckY + 9, 3, 4, skin, { clip: true, bias: -0.1 }); // bare chest through the rags
        for (let y = neckY + 7; y < neckY + 13; y += 2) r.line(cx + 2, y, cx + 6, y, skin[1], { clip: true }); // ribs
        r.line(cx - 6, neckY + 4, cx + 6, hipY - 2, PAL.leather[3], { clip: true, thick: true });
        paintSkullIcon(r, cx - 5, hipY - 6);
      },
    });
    const skirt = paintSkirt({
      seed, w: 24, len: 20,
      strips: [
        { x: -5, w: 9, ramp: PAL.oliveL, v: 0.45, holes: 3 },
        { x: 4, w: 8, ramp: PAL.oliveL, v: 0.55, holes: 2, len: 16 },
      ],
      detail: (r, cx) => { paintSkullIcon(r, cx + 1, 3); },
    });
    const head = (() => {
      const r = new Raster(22, 24, seed + 5);
      const cx = 10; const cy = 11;
      r.poly([[cx - 8, cy + 9], [cx - 7, cy - 3], [cx - 2, cy - 9], [cx + 5, cy - 8], [cx + 8, cy - 2], [cx + 7.5, cy + 3], [cx + 4, cy + 9]], PAL.oliveL, { v: 0.5 });
      r.ellipse(cx + 2.5, cy + 1.5, 4.4, 5.6, null, { color: '#100c08', clip: true });
      r.ellipse(cx + 3.6, cy + 2.4, 3.2, 4.2, skin, { clip: true, bias: -0.15 });
      r.ellipse(cx + 4.2, cy + 0.8, 1.4, 1, null, { color: '#1a0606', clip: true });  // sunken eye
      r.set(cx + 4.6, cy + 0.8, '#e0c060');
      r.line(cx + 3, cy + 4.4, cx + 6.4, cy + 4, '#d8ccb0', { clip: true });
      r.line(cx + 3.4, cy + 5.2, cx + 6.2, cy + 5.2, '#c0b498', { clip: true });
      r.blood(7, [cx + 2, cy + 3, cx + 8, cy + 9]);
      return { r, pivot: [cx, cy + 8] };
    })();
    return {
      parts: { ...L, torso, skirt, head, weapon: wFlailHandle(seed), chainEnd: wSpikedBall(seed, 4.2), off: wDagger(seed + 3, 11) },
      rig: {
        thigh: 11, shin: 10, armLen: 17, stance: [6, -6], crouch: 2,
        rest: { aF: -15, wF: 70, aB: -30, wB: 40, lean: 16 },
        chain: { len: 20, links: 7 },
      },
      gore: { skin, flesh: PAL.skinGrey },
    };
  },

  // -------------------------------------------------------------- PITLORD KRAGG
  gladiator: () => {
    const seed = 606;
    const skin = PAL.skin;
    const L = limbs({
      seed,
      arm: {
        len: 17, rU: 3.8, rF: 3.4, skin,
        pauldron: { ramp: PAL.iron, rx: 5.6, ry: 4.6, spikes: true },
        bracer: { ramp: PAL.iron, spikes: true }, blood: 8,
      },
      thigh: { len: 12, r: 4, ramp: skin, kneePad: PAL.iron },
      shin: { len: 11.5, r: 3.4, ramp: skin, boot: PAL.leather, bootH: 9, greave: PAL.iron },
    });
    const torso = paintTorsoBase({
      seed, torso: 20, chest: 9.5, waist: 7.5, skin, pants: PAL.red, belt: PAL.leather, blood: 18,
      detail: ({ r, cx, neckY, hipY }) => {
        r.chain(cx - 8, neckY + 3, cx + 9, hipY - 6, { clip: true });
        r.line(cx + 2, neckY + 8.5, cx + 8, neckY + 9, skin[1], { clip: true });
        for (let y = neckY + 12; y < hipY - 4; y += 2.6) r.line(cx + 3, y, cx + 7, y, skin[2], { clip: true });
        // wide belt with iron plate
        r.rect(cx - 8, hipY - 5, 17, 4, PAL.leather, { clip: true, v: 0.45 });
        r.rect(cx + 2, hipY - 5.5, 5, 5, PAL.iron, { v: 0.7 });
        for (let x = cx - 7; x < cx + 2; x += 2.5) r.stud(x, hipY - 4);
      },
    });
    const skirt = paintSkirt({
      seed, w: 24, len: 15, blood: 24,
      strips: [
        { x: 2, w: 12, ramp: PAL.red, v: 0.55, holes: 2 },
        { x: -6, w: 6, ramp: PAL.leather, v: 0.45, len: 11 },
      ],
    });
    const head = (() => {
      const r = new Raster(24, 26, seed + 5);
      const cx = 11; const cy = 12;
      headBase(r, cx, cy, skin);
      // spiked iron helm with face grille
      r.ellipse(cx, cy - 1, 7, 7.4, PAL.iron);
      r.poly([[cx + 1, cy - 2], [cx + 7.4, cy - 2], [cx + 7, cy + 6], [cx + 1.5, cy + 7]], PAL.iron, { v: 0.35 });
      for (let x = cx + 2.5; x < cx + 7; x += 1.6) r.line(x, cy - 1.5, x, cy + 6, '#a8acb4');
      r.set(cx + 5, cy, '#e02010');
      r.line(cx - 6, cy - 2, cx + 7, cy - 2.5, PAL.iron[5]);
      for (const [x, y, dx, dy] of [[0, -8, 0, -1], [-4, -6.5, -1, -1], [4, -6.5, 1, -1], [-6.5, -2, -1, 0]]) r.spike(cx + x, cy + y, dx, dy, 3);
      for (let a = -2.4; a < 0.4; a += 0.6) r.stud(cx + Math.cos(a) * 5.6, cy - 1 + Math.sin(a) * 6, '#d8d0c0');
      r.blood(9, [cx - 1, cy - 6, cx + 8, cy + 7]);
      return { r, pivot: [cx - 0.3, cy + 9] };
    })();
    return {
      parts: { ...L, torso, skirt, head, weapon: wMace(seed), off: wShield(seed) },
      rig: {
        thigh: 12, shin: 11, armLen: 17, stance: [6.5, -6.5], crouch: 2,
        rest: { aF: -30, wF: 20, aB: -55, wB: -35, lean: 6 },
        offFront: true,
      },
      gore: { skin, flesh: PAL.skin },
    };
  },
};

const BLOODLINE = ['#840808', '#a80e0e'];

// ------------------------------------------------------------------ gore textures

function goreTextures() {
  const out = {};
  const meat = (seed, w, h) => {
    const r = new Raster(w, h, seed);
    r.ellipse(w / 2, h / 2, w / 2 - 0.5, h / 2 - 0.5, PAL.red);
    r.blood(w * h / 3);
    for (let i = 0; i < 3; i++) r.over(r.r(1, w - 1), r.r(1, h - 1), '#e8a0a0');
    return { r, pivot: [w / 2, h / 2] };
  };
  out.meat1 = meat(1, 6, 5);
  out.meat2 = meat(2, 5, 4);
  out.meat3 = meat(3, 7, 6);
  const bone = new Raster(8, 4, 4);
  bone.capsule(1.5, 2, 1.4, 6.5, 2, 1.2, PAL.bone);
  bone.set(0, 1, PAL.bone[4]); bone.set(7, 3, PAL.bone[3]);
  out.bone = { r: bone, pivot: [4, 2] };
  const gut = new Raster(10, 6, 5);
  const pts = [[1, 3], [3, 1.5], [5, 3.5], [7, 2], [9, 3.5]];
  for (let i = 0; i < pts.length - 1; i++) gut.capsule(...pts[i], 1.4, ...pts[i + 1], 1.4, ['#3a0a10', '#6e1a24', '#a03a44', '#c8646a', '#e0909a']);
  out.gut = { r: gut, pivot: [5, 3] };
  const skullBit = new Raster(5, 4, 6);
  skullBit.poly([[0, 1], [3, 0], [5, 2], [2, 4]], PAL.bone, { v: 0.7 });
  skullBit.set(1, 2, BLOODLINE[0]);
  out.skullBit = { r: skullBit, pivot: [2.5, 2] };
  const eyeball = new Raster(4, 4, 7);
  eyeball.ellipse(2, 2, 1.8, 1.8, PAL.bone);
  eyeball.set(2, 1, '#2a1a0a'); eyeball.set(1, 3, BLOODLINE[1]);
  out.eyeball = { r: eyeball, pivot: [2, 2] };
  // stump: a raw red cross-section with a bone in the middle
  const stump = new Raster(9, 5, 8);
  stump.ellipse(4.5, 2.5, 4.2, 2.2, ['#3a0404', '#6e0808', '#9a1010', '#c02020', '#d84a3e']);
  stump.ellipse(4.5, 2.5, 1.3, 1, PAL.bone);
  out.stump = { r: stump, pivot: [4.5, 2.5] };
  return out;
}

// ------------------------------------------------------------------ build all textures

// Registry filled by buildEnemyArt(): ENEMY_ART[artId] = { parts: { name: {key,w,h,ox,oy,...} }, rig, gore }
export const ENEMY_ART = {};
export const GORE_ART = {};

function register(scene, key, painted) {
  const canvas = painted.r.toCanvas();
  if (scene.textures.exists(key)) scene.textures.remove(key);
  scene.textures.addCanvas(key, canvas).setFilter(Phaser.Textures.FilterMode.NEAREST);
  const off = (p) => (p ? [p[0] + 1, p[1] + 1] : null);
  const [ox, oy] = off(painted.pivot);
  return { key, w: canvas.width, h: canvas.height, ox, oy, hand: off(painted.hand), joint: off(painted.joint), tip: off(painted.tip), sockets: painted };
}

// ------------------------------------------------------------------ parts sheets (data/enemyParts.js)

// The whole sheet with its background keyed out (cached per sheet).
const keyedSheets = {};
function keyedSheet(scene, id, sheet) {
  if (keyedSheets[id]) return keyedSheets[id];
  const img = scene.textures.get(`${id}-sheet`).getSourceImage();
  const c = document.createElement('canvas');
  c.width = img.width;
  c.height = img.height;
  const ctx = c.getContext('2d');
  ctx.drawImage(img, 0, 0);
  const data = ctx.getImageData(0, 0, c.width, c.height);
  const d = data.data;
  const [br, bg, bb] = sheet.bg ?? [255, 0, 255];
  const tol = sheet.tolerance ?? 110;
  for (let i = 0; i < d.length; i += 4) {
    const dist = Math.hypot(d[i] - br, d[i + 1] - bg, d[i + 2] - bb);
    if (dist < tol) d[i + 3] = 0;
    else if (dist < tol * 1.5) {
      // edge pixel tinted by the background: pull the tint out
      const k = (dist - tol) / (tol * 0.5);
      d[i + 3] = Math.round(255 * k);
      if (br > 200 && bb > 200 && bg < 80) { const m = Math.min(d[i], d[i + 2]); d[i] = Math.min(d[i], d[i + 1] + 40, m + 30); d[i + 2] = Math.min(d[i + 2], d[i + 1] + 30); }
    }
  }
  ctx.putImageData(data, 0, 0);
  keyedSheets[id] = c;
  return c;
}

// How long the code-painted part is (art px), so a sheet part can be scaled to match.
function paintedLength(name, painted) {
  const [, py] = painted.pivot;
  if (painted.hand) return painted.hand[1] - py;
  if (painted.joint) return painted.joint[1] - py;
  if (name === 'torso') return py - painted.neck[1];
  if (name === 'head') return py;
  return painted.r.h;
}

// Cut one part out of the sheet, scale it (smoothly, in halving steps) to screen size.
function sliceSheet(scene, id, sheet, name, spec, painted) {
  const src = keyedSheet(scene, id, sheet);
  const [rx, ry, rw, rh] = spec.rect;
  let [px, py] = spec.pivot;
  if (spec.flipY) py = ry + rh - (py - ry); // drawn upside down on the sheet
  let sheetLen;
  if (spec.end) sheetLen = Math.hypot(spec.end[0] - px, spec.end[1] - py);
  else if (name === 'head') sheetLen = py - ry;
  else sheetLen = rh;
  const s = (paintedLength(name, painted) / sheetLen) * (spec.size ?? 1) * P; // sheet px -> screen px
  const tw = Math.max(1, Math.round(rw * s));
  const th = Math.max(1, Math.round(rh * s));

  let cur = document.createElement('canvas');
  cur.width = rw; cur.height = rh;
  const cctx = cur.getContext('2d');
  if (spec.flipY) { cctx.translate(0, rh); cctx.scale(1, -1); }
  cctx.drawImage(src, rx, ry, rw, rh, 0, 0, rw, rh);
  while (cur.width / 2 > tw && cur.height / 2 > th) {
    const n = document.createElement('canvas');
    n.width = Math.round(cur.width / 2); n.height = Math.round(cur.height / 2);
    const nctx = n.getContext('2d');
    nctx.imageSmoothingQuality = 'high';
    nctx.drawImage(cur, 0, 0, n.width, n.height);
    cur = n;
  }
  const out = document.createElement('canvas');
  out.width = tw; out.height = th;
  const octx = out.getContext('2d');
  octx.imageSmoothingQuality = 'high';
  octx.drawImage(cur, 0, 0, tw, th);
  // crisp edges: no half-transparent fringe
  const img = octx.getImageData(0, 0, tw, th);
  for (let i = 3; i < img.data.length; i += 4) img.data[i] = img.data[i] > 120 ? 255 : 0;
  octx.putImageData(img, 0, 0);

  const key = `${id}-${name}-sheet`;
  if (scene.textures.exists(key)) scene.textures.remove(key);
  scene.textures.addCanvas(key, out).setFilter(Phaser.Textures.FilterMode.LINEAR);
  const ox = (px - rx) * s;
  const oy = (py - ry) * s;
  return {
    key, w: tw, h: th, ox, oy,
    scale: 1 / P, // the view draws parts at P x; sheet parts are already screen-sized
    tip: [ox, 0],
    hookRot: spec.hookRot,
    sockets: painted,
  };
}

export function buildEnemyArt(scene) {
  for (const [id, make] of Object.entries(SPECS)) {
    const spec = make();
    const parts = {};
    const sheet = PART_SHEETS[id];
    const haveSheet = sheet && scene.textures.exists(`${id}-sheet`);
    for (const [name, painted] of Object.entries(spec.parts)) {
      if (!painted) continue;
      const fromSheet = haveSheet && sheet.parts[name === 'armB' ? 'armB' : name];
      if (fromSheet) {
        try {
          parts[name] = sliceSheet(scene, id, sheet, name, fromSheet, painted);
          continue;
        } catch (err) {
          console.warn(`[enemyArt] ${id}.${name} from sheet failed, using painted part`, err);
        }
      }
      parts[name] = register(scene, `${id}-${name}`, painted);
    }
    // a sheet arm is used for both arms unless the sheet has its own armB
    if (haveSheet && sheet.parts.arm && !sheet.parts.armB && spec.parts.armB) parts.armB = parts.arm;
    // Torso sockets are measured from the hip pivot, in art pixels.
    const t = spec.parts.torso;
    const rel = (p) => ({ x: p[0] - t.pivot[0], y: p[1] - t.pivot[1] });
    const rig = {
      ...spec.rig,
      neck: rel(t.neck),
      shoulderF: rel(t.shoulderF),
      shoulderB: rel(t.shoulderB),
      hipF: rel(t.hipF),
      hipB: rel(t.hipB),
      waist: t.waist,
    };
    ENEMY_ART[id] = { id, parts, rig, gore: spec.gore };
  }
  for (const [name, painted] of Object.entries(goreTextures())) {
    GORE_ART[name] = register(scene, `gore-${name}`, painted);
  }
}

// Parts sheets need loading before buildEnemyArt(); call from BootScene.preload().
export function preloadEnemyOverrides(scene) {
  for (const [id, sheet] of Object.entries(PART_SHEETS)) scene.load.image(`${id}-sheet`, sheet.file);
}
