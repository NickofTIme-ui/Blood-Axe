// VincentView.js — Vincent, the Gatewright (data/stageGates.js), and his Gate Scorpion
// (Stage hazard 'ballista'). View only: nothing here changes the game.
//
// Vincent is drawn from his painted sheet (data/levelArt.js SPRITE_SHEETS.vincent, made in
// ChatGPT from Vincent's photo: docs/vincent-art-prompts.md) as soon as it is in the folder;
// until then a code-drawn stand-in in his colours: dark hair swept back, heavy dark brows,
// clean-shaven, a charcoal wool coat over a white shirt and a dark patterned neckcloth, a
// leather tool belt.
//
// The scorpion: a great crossbow on a two-wheeled cart, its stock pointing down the yard.
// While it aims, the lane it will shoot along glows on the ground (gold, then red), the cart
// rolls round to it and Vincent winds the string back; then the bolt flies the length of
// the yard and the cart kicks back.

import { DEPTH, depthScale } from './depths.js';
import { SPRITES } from './levelArt.js';
import { playSfx } from '../core/Sfx.js';

// his sheet's poses, in order (docs/vincent-art-prompts.md); run: the walk's four beats
export const VINCENT_CELLS = { stand: 0, grip: 1, cower: 1, wave: 8, crank: 2, aim: 3, loose: 4, run: [5, 6, 7, 6] };

const COAT = 0x30333a;
const COAT_LIT = 0x464a54;
const SHIRT = 0xe8e4da;
const SCARF = 0x2a2830;
const SKIN = 0xd2a888;
const HAIR = 0x1c1612;
const BELT = 0x5a3e24;
const BRASS = 0xc89a40;
const WOOD = 0x6a4a2c;
const WOOD_DK = 0x3e2a18;
const IRON = 0x56565e;
const IRON_LIT = 0x9a9aa6;
// the stand-in and the engine are drawn this much bigger than a code-drawn villager: a man
// as tall as the heroes, and a scorpion longer than he is
const BIG = 1.7;

// Vincent at (x, y = his feet), scale k, facing dir. holder keeps his painted image
// (holder.vimg); g is the graphics the stand-in is drawn into. Returns nothing.
export function drawVincent(scene, holder, g, x, y, k, pose, t, dir, depth) {
  const S = SPRITES.vincent;
  if (S) {
    const c = VINCENT_CELLS[pose] ?? VINCENT_CELLS.stand;
    const beat = Math.floor(t / 7);
    const i = Array.isArray(c) ? c[beat % c.length] : c;
    holder.vimg ??= scene.add.image(x, y, S.key, 'f0').setOrigin(0.5, 1);
    const br = Array.isArray(c) ? 0 : Math.sin(scene.time.now * 0.0026);
    holder.vimg.setTexture(S.key, `f${Math.min(i, S.count - 1)}`).setPosition(x, y + (Array.isArray(c) ? [1.5, -1, 1.5, -1][beat % 4] * k : 0))
      .setScale(k * 0.5 * (1 - 0.008 * br), k * 0.5 * (1 + 0.018 * br)).setFlipX(dir < 0).setDepth(depth).setVisible(true);
    return;
  }
  holder.vimg?.setVisible(false);
  standIn(g, x, y, k * BIG, pose, t, dir);
}

export function hideVincent(holder) { holder.vimg?.setVisible(false); }

// the code-drawn Vincent (until his sheet is painted)
function standIn(g, x, y, k, pose, t, dir) {
  const run = pose === 'run';
  const stride = run ? Math.sin(t * 0.4) * 8 * k : 0;
  const crouch = pose === 'aim' ? 8 * k : 0;
  const lean = (pose === 'aim' ? 7 : pose === 'loose' ? -5 : pose === 'grip' ? 4 : run ? 4 : 0) * k * dir;
  const H = 60 * k - crouch;
  const yb = y - (run ? Math.abs(Math.sin(t * 0.4)) * 2 : 0);
  // legs (dark trousers, boots)
  g.fillStyle(0x24262c, 1);
  g.fillRect(x - 6 * k + stride, yb - 22 * k, 5 * k, 22 * k).fillRect(x + 1 * k - stride, yb - 22 * k, 5 * k, 22 * k);
  g.fillStyle(0x1a1410, 1).fillRect(x - 7 * k + stride, yb - 4 * k, 7 * k, 4 * k).fillRect(x - stride, yb - 4 * k, 7 * k, 4 * k);
  // the coat, to the knee, open over the shirt
  const top = yb - H;
  g.fillStyle(COAT, 1);
  g.fillTriangle(x - 11 * k, yb - 16 * k, x + 11 * k, yb - 16 * k, x + lean, top + 4 * k);
  g.fillRect(x - 10 * k + lean * 0.5, top + 6 * k, 20 * k, H - 24 * k);
  g.fillStyle(COAT_LIT, 1).fillRect(x - 10 * k + lean * 0.5, top + 6 * k, 3 * k, H - 26 * k);
  // shirt, the dark neckcloth with its flecks, the tool belt
  g.fillStyle(SHIRT, 1).fillTriangle(x - 4 * k + lean, top + 6 * k, x + 4 * k + lean, top + 6 * k, x + lean, top + 18 * k);
  g.fillStyle(SCARF, 1).fillRect(x - 1.5 * k + lean, top + 7 * k, 3 * k, 12 * k);
  g.fillStyle(BRASS, 0.8).fillRect(x - 0.5 * k + lean, top + 10 * k, 1 * k, 1 * k).fillRect(x - 0.5 * k + lean, top + 14 * k, 1 * k, 1 * k);
  g.fillStyle(BELT, 1).fillRect(x - 10 * k + lean * 0.6, yb - 30 * k, 20 * k, 4 * k);
  g.fillStyle(BRASS, 1).fillRect(x - 2 * k + lean * 0.6, yb - 30 * k, 4 * k, 4 * k);
  g.fillStyle(WOOD, 1).fillRect(x + 7 * k * dir + lean * 0.6, yb - 30 * k, 3 * k, 10 * k); // a mallet's handle
  // arms
  const sx = x + lean; const sy = top + 10 * k;
  g.lineStyle(4.5 * k, COAT, 1);
  if (pose === 'grip') {
    g.lineBetween(sx, sy, sx + 14 * k * dir, sy - 6 * k).lineBetween(sx, sy + 2 * k, sx + 14 * k * dir, sy + 6 * k);
  } else if (pose === 'wave') {
    const a = Math.sin(t * 0.3) * 0.4;
    g.lineBetween(sx, sy, sx + Math.sin(a) * 12 * k * dir, sy - 22 * k);
    g.lineBetween(sx, sy, sx - 5 * k * dir, sy + 18 * k);
  } else if (pose === 'crank') {
    const a = t * 0.25;
    g.lineBetween(sx, sy, sx + (10 + Math.cos(a) * 5) * k * dir, sy + 8 * k + Math.sin(a) * 5 * k);
    g.lineBetween(sx, sy, sx + 6 * k * dir, sy + 14 * k);
  } else if (pose === 'aim') {
    g.lineBetween(sx, sy, sx + 16 * k * dir, sy + 6 * k).lineBetween(sx, sy, sx + 10 * k * dir, sy + 12 * k);
  } else if (pose === 'loose') {
    g.lineBetween(sx, sy, sx + 14 * k * dir, sy + 4 * k).lineBetween(sx, sy, sx - 10 * k * dir, sy + 10 * k);
  } else {
    // stand: arms folded, at ease
    g.lineBetween(sx - 6 * k, sy + 2 * k, sx + 7 * k, sy + 10 * k).lineBetween(sx + 6 * k, sy + 2 * k, sx - 7 * k, sy + 10 * k);
  }
  // head: clean-shaven, dark hair swept up and back, heavy brows, a half smile
  const hx = sx; const hy = top - 6 * k;
  g.fillStyle(SKIN, 1).fillCircle(hx, hy, 7 * k);
  g.fillStyle(HAIR, 1).fillRoundedRect(hx - 7 * k, hy - 11 * k, 14 * k, 7 * k, 3 * k);
  g.fillRect(hx - 7 * k - (dir > 0 ? 1 : 0) * k, hy - 6 * k, 3 * k, 5 * k);
  g.fillStyle(HAIR, 1).fillRect(hx + 1 * k * dir, hy - 3 * k, 5 * k * dir, 1.6 * k);
  g.fillStyle(0x8a4a3a, 1).fillRect(hx + 2 * k * dir, hy + 3 * k, 3 * k * dir, 1 * k);
}

// ------------------------------------------------------------ the scorpion

// The scorpion at its cart's place: the lane it aims along, the engine, Vincent at it, and
// its bolts in flight. sv: the StageView (its scene and stage).
export function drawScorpion(sv, hz) {
  const s = sv.scene;
  const g = hz.g ??= s.add.graphics();
  const lane = hz.laneG ??= s.add.graphics().setDepth(DEPTH.shadows + 0.2);
  const bolts = hz.boltG ??= s.add.graphics();
  g.clear(); lane.clear(); bolts.clear();
  const cam = s.cameras.main.worldView;
  const on = !!hz.manned;
  g.setVisible(on);
  if (!on) hideVincent(hz);
  const T = sv.stage.terrain;
  const ground = (x, z) => (T ? Math.max(0, T.groundAt(x, z)) : 0);
  const t = s.time.now / 16.7;
  const z = hz.carZ ?? hz.z;
  const k = depthScale(z);
  const y = z - ground(hz.x, z);
  const ek = k * BIG;
  if (on) {
    // the lane glowing: gold, then red as the shot comes
    const a = hz.aim;
    if (a) {
      const f = Math.max(0, Math.min(1, (hz.t - a.from) / Math.max(1, a.fire - a.from)));
      const col = f < 0.6 ? 0xffd070 : 0xff4a2a;
      const x0 = hz.x + 60 * BIG; const x1 = Math.max(x0 + 200, cam.right + 40);
      const ly = a.z - ground(x0, a.z);
      lane.fillStyle(col, 0.08 + 0.18 * f).fillRect(x0, ly - 10, x1 - x0, 20);
      lane.lineStyle(2, col, 0.35 + 0.5 * f).lineBetween(x0, ly - 10, x1, ly - 10).lineBetween(x0, ly + 10, x1, ly + 10);
      // chevrons running down the lane
      const step = 70; const off = (t * 6) % step;
      for (let cx = x0 + off; cx < x1; cx += step) {
        lane.lineStyle(3, col, 0.3 + 0.6 * f).lineBetween(cx, ly - 7, cx + 10, ly).lineBetween(cx + 10, ly, cx, ly + 7);
      }
    }
    g.setDepth(z);
    const kick = Math.max(0, (hz.recoil ?? 0)) * 1.2;
    hz.recoil = Math.max(0, (hz.recoil ?? 0) - 1);
    const ex = hz.x - kick;
    engine(g, ex, y, ek, hz.aim ? Math.max(0, Math.min(1, (hz.t - hz.aim.from) / Math.max(1, hz.aim.fire - hz.aim.from))) : 1, !hz.recoil || hz.recoil < 4);
    // Vincent at the back of it: winding it, aiming, pulling the lever; at ease between shots
    const pose = hz.recoil > 0 ? 'loose' : hz.aim ? (hz.t - hz.aim.from < (hz.aim.fire - hz.aim.from) * 0.55 ? 'crank' : 'aim') : 'stand';
    drawVincent(s, hz, g, ex - 46 * ek, y + 2, k, pose, t, 1, z + 0.2);
  }
  // the bolts in flight
  for (const b of hz.bolts ?? []) {
    const by = b.z - ground(b.x, b.z) - b.h;
    bolts.setDepth(b.z + 1);
    bolts.fillStyle(0xffffff, 0.18).fillRect(b.x - 220, by - 2, 200, 4); // (its streak)
    bolts.fillStyle(0xffffff, 0.35).fillRect(b.x - 110, by - 1, 100, 2);
    bolts.fillStyle(WOOD, 1).fillRect(b.x - 84, by - 2.5, 84, 5);
    bolts.fillStyle(0xd8d0c0, 1).fillTriangle(b.x - 84, by - 2, b.x - 70, by - 2, b.x - 92, by - 9).fillTriangle(b.x - 84, by + 2, b.x - 70, by + 2, b.x - 92, by + 9);
    bolts.fillStyle(IRON, 1).fillTriangle(b.x, by - 6, b.x, by + 6, b.x + 20, by);
    bolts.fillStyle(IRON_LIT, 1).fillTriangle(b.x, by - 6, b.x + 20, by, b.x + 4, by - 2);
  }
}

// The engine: a two-wheeled cart, the stock along it, iron bow arms at the front and the
// string wound back by `draw` (0..1); a bolt in the groove while loaded.
function engine(g, x, y, k, draw, loaded) {
  const w = 110 * k;
  const axleY = y - 14 * k;
  // the cart bed and the post the stock turns on
  g.fillStyle(WOOD_DK, 1).fillRect(x - w / 2, axleY - 8 * k, w * 0.8, 8 * k);
  g.fillStyle(WOOD, 1).fillRect(x - 6 * k, axleY - 26 * k, 12 * k, 20 * k);
  // the wheels (spoked)
  for (const wx of [x - w * 0.32, x + w * 0.18]) {
    g.fillStyle(WOOD_DK, 1).fillCircle(wx, axleY, 14 * k);
    g.lineStyle(3 * k, IRON, 1).strokeCircle(wx, axleY, 14 * k);
    g.lineStyle(2 * k, WOOD, 1);
    for (let i = 0; i < 4; i++) { const a = i * Math.PI / 4; g.lineBetween(wx - Math.cos(a) * 12 * k, axleY - Math.sin(a) * 12 * k, wx + Math.cos(a) * 12 * k, axleY + Math.sin(a) * 12 * k); }
    g.fillStyle(IRON_LIT, 1).fillCircle(wx, axleY, 3 * k);
  }
  // the stock, angled a touch up, with its winch at the back
  const sy = axleY - 30 * k;
  g.fillStyle(WOOD, 1).fillRect(x - w * 0.45, sy - 5 * k, w * 0.95, 10 * k);
  g.fillStyle(0x7e5a36, 1).fillRect(x - w * 0.45, sy - 5 * k, w * 0.95, 3 * k);
  g.fillStyle(IRON, 1).fillCircle(x - w * 0.42, sy + 2 * k, 7 * k);
  g.lineStyle(2 * k, IRON_LIT, 1).lineBetween(x - w * 0.42 - 8 * k, sy - 6 * k, x - w * 0.42 + 8 * k, sy + 10 * k);
  // the bow arms (iron, curved back) and the string
  const fx = x + w * 0.45;
  const pull = (0.1 + 0.9 * draw) * 46 * k;
  g.lineStyle(5 * k, IRON, 1);
  g.beginPath(); g.moveTo(fx, sy); g.lineTo(fx - 12 * k, sy - 30 * k); g.lineTo(fx - 22 * k, sy - 40 * k); g.strokePath();
  g.beginPath(); g.moveTo(fx, sy); g.lineTo(fx - 12 * k, sy + 26 * k); g.lineTo(fx - 22 * k, sy + 34 * k); g.strokePath();
  g.lineStyle(1.5 * k, 0xd8d0b8, 1).lineBetween(fx - 22 * k, sy - 40 * k, fx - 22 * k - pull, sy).lineBetween(fx - 22 * k, sy + 34 * k, fx - 22 * k - pull, sy);
  if (loaded && draw > 0.05) {
    g.fillStyle(WOOD_DK, 1).fillRect(fx - 22 * k - pull, sy - 2 * k, 70 * k, 4 * k);
    g.fillStyle(IRON, 1).fillTriangle(fx - 22 * k - pull + 70 * k, sy - 5 * k, fx - 22 * k - pull + 70 * k, sy + 5 * k, fx - 22 * k - pull + 84 * k, sy);
  }
}

// Sounds and dust for the scorpion (StageView.listen calls this once).
export function listenScorpion(sv) {
  const s = sv.scene;
  const ev = sv.stage.world.events;
  ev.on('boltAim', ({ hazard: hz, boss }) => {
    playSfx(s, 'block', { volume: 0.35, pitch: -1400, minGapMs: 0 }); // (the ratchet)
    if (boss) s.callout?.('VINCENT!', '#ffd070', 34);
  });
  ev.on('boltLoose', ({ hazard: hz }) => {
    hz.recoil = 10;
    playSfx(s, 'heavySwing', { volume: 0.9, pitch: -1100, minGapMs: 0 });
    playSfx(s, 'block', { volume: 0.7, pitch: -1800, minGapMs: 0 });
    s.fx?.shake(3, 10);
  });
  ev.on('boltHit', ({ fighter: f, bolt }) => {
    s.gore?.spark(f.x, f.z, f.h + 50, 0xffe0a0, f.stats.boss ? 30 : 12);
    if (f.stats.boss) { s.fx?.shake(10, 24); playSfx(s, 'kick', { volume: 1, pitch: -1200, minGapMs: 0 }); s.callout?.('SKEWERED!', '#ff7050', 30); }
    else if (bolt.hit.size === 3) s.callout?.('THREE ON ONE BOLT!', '#ffd070', 26);
  });
}
