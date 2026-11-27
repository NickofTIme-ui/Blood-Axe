// TerrainView.js — Draws a stage's terrain (stage/Terrain.js) and, for THE GALLOWS ASCENT,
// its whole backdrop. ALL OF IT IS TEMPORARY ART, drawn in code: night sky, cliffs and
// gallows silhouettes, the floor, pits, ledges, the gibbet cage, the rotten planks,
// lanterns and the rest shrines. (The painted replacements are listed in
// docs/gallows-art-needed.md.)
//
// Readability rules it keeps, whatever the art becomes:
//   - a ledge's TOP is the lightest thing on the ground and has a bright rim along its
//     front edge (where you land); its front face is dark
//   - pits are true black with a cold glow at the lip; nothing else on the stage is that dark
//   - anything that moves or gives way is a different material from solid rock: the cage
//     is iron, the planks are rotten wood, and a plank about to drop shakes and sheds dust
//   - lanterns (warm) mark the route; the secret's crow-cage glows violet
//
// Draw order (2.5D): a block's top face sits just behind the men standing on it (depth
// z0), its front face just in front of them (depth z1), so whoever is on it, behind it or
// in front of it is drawn the right way round.

import { groundUnder, moveGround } from './propGround.js';
import { SETTINGS } from '../config/settings.js';
import { DEPTH } from './depths.js';
import { playSfx, playSplash } from '../core/Sfx.js';
import { VillageBackdrop } from './VillageView.js';
import { WoodBackdrop } from './WoodView.js';
import { MineBackdrop } from './MineView.js';
import { AscentBackdrop } from './AscentView.js';
import { GatesBackdrop } from './GatesView.js';
import { KeepBackdrop } from './KeepView.js';
import { artKey, PaintedLevel } from './levelArt.js';
import { LEVEL_ART } from '../data/levelArt.js';
import { keyLayer } from './envArt.js';
import { torchFlame } from './TorchFlame.js';
import { roofFire, placeRoofFire } from './RoofFire.js';
import { applyAtmosphere, gradient } from './atmosphere.js';

// the painted oath shrine is drawn this tall (about twice a man)
const SHRINE_H = 170;
// the painted lantern post: drawn this tall; its lantern at this point of the 300x400 picture
const LANTERN_H = 150;
// the village's painted torch post (assets/env/village/torch.png): its height on screen (world px)
const TORCH_H = 112;
// where the flame sits, as a share of that height up from the foot: the torch post's cresset,
// the brazier's basket rim
const TORCH_CUP = 0.88;
const BRAZIER_CUP = 0.8;
const LANTERN_AT = [200, 134];
// the painted log bridge, fitted to a block: `walk` = how far down the picture its top edge
// is (set on the lane's front edge), `wide` = drawn this much wider than the block (roots
// and the broken end out past the banks)
const LOG_FIT = { walk: 0.38, wide: 1.6 };

// Worn edges, not ruled lines: a steady pseudo-random wobble (the same every frame for a
// block, so it never shimmers), used for the rims and to cut the painted faces' outlines.
const wob = (i, seed) => { const s = Math.sin(i * 12.9898 + seed * 78.233) * 43758.5453; return s - Math.floor(s); };
function raggedLine(g, x0, x1, y, color, alpha, width, seed) {
  const pts = [];
  for (let x = x0, i = 0; x < x1 + 7; x += 7, i++) pts.push({ x: Math.min(x, x1), y: y + (wob(i, seed) - 0.5) * 2.4 });
  g.lineStyle(width, color, alpha).strokePoints(pts);
}

// Soft shading as one gradient-filled rect (per-corner alpha), not a stack of strips: the
// strips overlapped by a fraction of a pixel and showed as fine ruled lines across the art.
function vFade(g, x, y, w, h, color, a0, a1) {
  if (w <= 0 || h <= 0) return;
  g.fillGradientStyle(color, color, color, color, a0, a0, a1, a1).fillRect(x, y, w, h);
}
function hFade(g, x, y, w, h, color, a0, a1) {
  if (w <= 0 || h <= 0) return;
  g.fillGradientStyle(color, color, color, color, a0, a1, a0, a1).fillRect(x, y, w, h);
}

// The painted fallen-tree bridge (assets/env/bridge_log.png, on magenta): cut out once.
function paintedLog(scene) {
  const T = scene.textures;
  if (T.exists('bridge-log')) return true;
  if (!T.exists('bridge-log-src')) return false;
  T.addCanvas('bridge-log', keyLayer(T.get('bridge-log-src').getSourceImage(), 'magenta'));
  return true;
}
// a w×h rectangle with its outline chipped and wobbling, except along `straight` (the
// edge where the top face meets the front: kept straight so the two never gap)
function raggedRect(x, y, w, h, seed, straight, amp = 5) {
  const a = Math.max(0, Math.min(amp, w * 0.08, h * 0.12));
  const j = (i, k) => (wob(i * 3 + k, seed) - 0.5) * 2 * a + (wob(i * 7 + k, seed + 3) > 0.9 ? a * 0.8 : 0); // (+ the odd chip)
  const pts = [];
  const step = 9;
  const edge = (side, from, to, fixed, horiz, inward) => {
    const n = Math.max(1, Math.round(Math.abs(to - from) / step));
    for (let i = 0; i < n; i++) {
      const p = from + (to - from) * (i / n);
      const off = side === straight ? 0 : Math.abs(j(i, side.length)) * inward;
      pts.push(horiz ? { x: p, y: fixed + off } : { x: fixed + off, y: p });
    }
  };
  edge('top', x, x + w, y, true, 1);
  edge('right', y, y + h, x + w, false, -1);
  edge('bottom', x + w, x, y + h, true, -1);
  edge('left', y + h, y, x, false, 1);
  return pts;
}

// where the painted stepping stones' flat tops are (a share of each cut-out's height from its top)
const STONE_TOP = 0.32;

// A wood stream's outline (a pit across the whole lane): narrow where it comes out of the
// trees at the back, exact to the pit through the lane, then widening toward the camera; its
// banks worn, not ruled
const streamBend = (p, y, k) => Math.sin(y * 0.021 + p.x0 * 0.7 + k) * 7 + Math.sin(y * 0.057 + k * 3) * 4;
function streamRibbon(p, top, bottom, flare) {
  const z0 = p.z0; const z1 = p.z1;
  const inset = (p.x1 - p.x0) * 0.42; // (a wedge out of the dark under the trees: no flat top)
  const side = (y) => (y < z0 ? inset * ((z0 - y) / (z0 - top)) : y > z1 ? -flare * ((y - z1) / (bottom - z1)) : 0);
  const pts = [];
  const n = Math.ceil((bottom - top) / 10);
  // (each bank wanders on its own, a slow bend and a ragged edge, so it never reads as a ruled
  // panel standing in the road: Nick, 2026-11-19 "copied and pasted into the world")
  const bend = (y, k) => streamBend(p, y, k);
  for (let i = 0; i <= n; i++) { const y = top + (bottom - top) * (i / n); pts.push({ x: p.x1 - side(y) + bend(y, 1) - wob(i, p.x0 + 1) * 3, y }); }
  for (let i = n; i >= 0; i--) { const y = top + (bottom - top) * (i / n); pts.push({ x: p.x0 + side(y) + bend(y, 4) + wob(i, p.x0 + 2) * 3, y }); }
  return pts;
}

const COL = {
  skyTop: 0x05070d, skyLow: 0x1c2733, mist: 0x8aa4b8,
  cliffFar: 0x0b1018, cliffMid: 0x121a24,
  floor: 0x232a2e, floorLine: 0x1a1f22,
  rockTop: 0x48535a, rockRim: 0xd8e4ea, rockFront: 0x252c31, rockShade: 0x171c20, rockSeam: 0x3a444a,
  plankTop: 0x8a5a32, plankRim: 0xe0a060, plankFront: 0x4a2c16, plankCrack: 0x2a160a,
  iron: 0x4a4e54, ironRim: 0xb8c2cc, ironDark: 0x1c1e22,
  rust: 0xa4502a, lantern: 0xffb050, secret: 0xb070ff, shrine: 0xff6a4a,
};
// THE BURNING VILLAGE (theme 'village'): roofs and timber instead of rock, charred boards
// instead of rotten planks, burning cellars instead of the dark; oath shrines are pale stone
// with a cold blue-white light
const VIL = {
  roofTop: 0x5a4a40, roofRim: 0xf0d0a8, roofFront: 0x2a1c16, roofSeam: 0x40342c, timber: 0x160e0a,
  beamTop: 0x6a5038, beamRim: 0xf0c890, beamFront: 0x3a2618,
  boardTop: 0x5a3420, boardRim: 0xffa860, boardFront: 0x2e180c, boardCrack: 0xff6a20,
  cellarLip: 0xff6a2a, oath: 0x9ad0ff, oathStone: 0x6a7078,
};

export class TerrainView {
  constructor(scene, stage) {
    this.scene = scene;
    this.stage = stage;
    this.terrain = stage.terrain;
    const data = stage.data;
    this.width = data.width ?? SETTINGS.world.width;
    this.village = data.theme === 'village';
    if (data.theme === 'gallows') this.drawBackdrop();
    if (this.village) this.backdrop = new VillageBackdrop(scene, stage);
    // GALLOWS WOOD (theme 'wood'): pines and mist (view/WoodView.js); streams for pits,
    // fallen logs for bridges, stone for the rest
    this.wood = data.theme === 'wood';
    if (this.wood) this.backdrop = new WoodBackdrop(scene, stage);
    // HOLLOW MOUNTAIN (theme 'mine'): rock and torches (view/MineView.js); its pits are the
    // underground river's cold black water, like the wood's streams
    this.mine = data.theme === 'mine';
    if (this.mine) this.backdrop = new MineBackdrop(scene, stage);
    // THE SHATTERED ASCENT (theme 'ascent'): grey cliffs, wind, the Keep across the gorge
    // (view/AscentView.js); its ledges are the cliff's own rock, its drops the gorge
    if (data.theme === 'ascent') this.backdrop = new AscentBackdrop(scene, stage);
    // THE IRON GATES (theme 'gates'): the iron wall and its gatehouse, the burning town, the
    // Keep filling the sky (view/GatesView.js)
    if (data.theme === 'gates') this.backdrop = new GatesBackdrop(scene, stage);
    // THE BLACK KEEP (theme 'keep'): black stone and violet torches, the forge, the colossus
    // (view/KeepView.js)
    if (data.theme === 'keep') this.backdrop = new KeepBackdrop(scene, stage);
    this.water = this.wood || this.mine;
    this.theme = data.theme;
    applyAtmosphere(scene, data.theme, this.width); // (depth: the backdrop recedes, the lane stays crisp)
    this.drawFloor();
    this.drawVeils(data.veils ?? []);
    this.drawWades();
    this.drawPits();
    this.blockGfx = new Map();
    for (const b of this.terrain?.blocks ?? []) this.blockGfx.set(b.id, this.makeBlock(b));
    this.drawLanterns(data.lanterns ?? []);
    this.drawRests();
    if (data.theme === 'gallows') this.drawRoostCue(); // (only the Gallows roost has a crow-cage)
    this.listen();
  }

  // ------------------------------------------------------------ backdrop (gallows)

  drawBackdrop() {
    const s = this.scene;
    const W = this.width;
    const H = SETTINGS.height;
    const pad = SETTINGS.width * 2;
    // night sky, tall enough for the camera's climb
    const sky = s.add.graphics().setDepth(DEPTH.sky).setScrollFactor(0.1, 0.4);
    sky.fillGradientStyle(COL.skyTop, COL.skyTop, COL.skyLow, COL.skyLow, 1);
    sky.fillRect(-pad, -700, SETTINGS.width + pad * 2 + W * 0.1, H + 900);
    // the moon behind the haze
    s.add.circle(SETTINGS.width * 0.72, 60, 46, 0xd8e4ea, 0.85).setDepth(DEPTH.sky + 1).setScrollFactor(0.05, 0.3);
    s.add.image(SETTINGS.width * 0.72, 60, 'glow').setScale(9).setTint(0x8aa4b8).setAlpha(0.35).setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(DEPTH.sky + 1).setScrollFactor(0.05, 0.3);
    // the painted layers where they exist (data/levelArt.js 'gallows'), else drawn here
    const art = this.art = new PaintedLevel(s, 'gallows', W);
    if (art.has('sky')) art.layer('sky', DEPTH.sky + 0.5);
    // far cliffs with gibbets on them, then nearer crags (parallax)
    const ridge = (g, base, amp, step, seed, color, gibbets) => {
      g.fillStyle(color, 1);
      g.beginPath();
      g.moveTo(-pad, H + 200);
      let k = seed;
      const pts = [];
      for (let x = -pad; x <= W + pad; x += step) {
        k = (k * 9301 + 49297) % 233280;
        const y = base - (k / 233280) * amp;
        g.lineTo(x, y);
        pts.push([x, y]);
      }
      g.lineTo(W + pad, H + 200);
      g.closePath();
      g.fillPath();
      if (gibbets) {
        for (let i = 3; i < pts.length; i += 7) {
          const [x, y] = pts[i];
          g.fillRect(x - 2, y - 46, 4, 46); g.fillRect(x - 2, y - 46, 26, 4); g.fillRect(x + 20, y - 42, 2, 14);
          g.fillRect(x + 16, y - 28, 10, 16); // the cage swinging from it
        }
      }
    };
    if (art.has('far')) art.layer('far', DEPTH.far);
    else ridge(s.add.graphics().setDepth(DEPTH.far).setScrollFactor(0.25, 0.6), 230, 150, 90, 7, COL.cliffFar, true);
    if (art.has('mid')) art.layer('mid', DEPTH.far + 2);
    else ridge(s.add.graphics().setDepth(DEPTH.far + 2).setScrollFactor(0.5, 0.8), 270, 110, 70, 21, COL.cliffMid, false);
    // mist bands
    for (let i = 0; i < 3; i++) {
      s.add.rectangle(-pad, 170 + i * 50, W + pad * 2, 30, COL.mist, 0.05 + i * 0.02).setOrigin(0)
        .setDepth(DEPTH.far + 3).setScrollFactor(0.6 + i * 0.1, 0.85);
    }
    // the cliff face behind the lane (what the ledges are cut from)
    // (a low wall of rock: above it the sky and the far cliffs show)
    if (art.has('wall')) { art.wall(); return; }
    const wallTop = SETTINGS.world.floorTop - 50 - 150;
    const wall = s.add.graphics().setDepth(DEPTH.floor - 1);
    wall.fillStyle(0x161c22, 1).fillRect(0, wallTop, W, 150);
    wall.fillStyle(0x0d1116, 1);
    for (let x = 0; x < W; x += 140) wall.fillRect(x + ((x / 140) % 3) * 13, wallTop, 6, 150);
    wall.fillStyle(0x2a343c, 1).fillRect(0, wallTop, W, 4);
    wall.fillStyle(0x000000, 0.35).fillRect(0, SETTINGS.world.floorTop - 90, W, 40);
  }

  drawFloor() {
    if (this.stage.data.theme !== 'gallows') return;
    if (this.art?.has('ground')) { this.art.ground(); return; } // (painted)
    const s = this.scene;
    const top = SETTINGS.world.floorTop - 50;
    const g = s.add.graphics().setDepth(DEPTH.floor);
    g.fillStyle(COL.floor, 1).fillRect(0, top, this.width, SETTINGS.height - top + 40);
    g.lineStyle(1, COL.floorLine, 1);
    for (let y = top + 20; y < SETTINGS.height + 40; y += 34) g.lineBetween(0, y, this.width, y);
    for (let x = 0; x < this.width; x += 88) {
      for (let y = top + 20, row = 0; y < SETTINGS.height + 40; y += 34, row++) g.lineBetween(x + (row % 2) * 44, y, x + (row % 2) * 44, y + 34);
    }
  }

  // The painted water (ChatGPT, 2026-11-19: Nick, "the waterways in the level and in the game
  // need to look better, the art around it and all"): one painting per kind of crossing, the
  // water with its own banks, stretched over the crossing so its water lies where you fall in.
  // `frac`: how much of the painting's width is water. Null when it isn't painted (code-drawn).
  paintedWater(kind) {
    const W = { wood: { pit: ['wood', 'water_stream', 0.44], wade: ['wood', 'water_ford', 0.7] }, mine: { pit: ['mine', 'water_river', 0.7] } };
    const e = W[this.wood ? 'wood' : this.mine ? 'mine' : '']?.[kind];
    return e && this.scene.textures.exists(artKey(e[0], e[1])) ? { key: artKey(e[0], e[1]), frac: e[2] } : null;
  }

  // A drop in the mine that isn't the river (the lift shaft, the collapse's chasms): the
  // painted chasm (assets/env/mine/chasm.png, ChatGPT: shored rock lips falling away into
  // black) stretched over it, or failing that the black of the drop, fading in from its lip.
  // False for the river's channels (painted water).
  mineChasm(p) {
    const river = this.stage.sections.find((q) => q.id === 'river');
    if (river && p.x0 >= river.x0 && p.x1 <= river.x1) return false;
    const s = this.scene;
    const top = p.z0 - (p.z0 <= SETTINGS.world.floorTop ? 50 : 0);
    const bottom = p.z1 + 40;
    const key = artKey('mine', 'chasm');
    if (s.textures.exists(key)) {
      const w = (p.x1 - p.x0) / 0.8; // (its lips past the drop's edges)
      s.add.image((p.x0 + p.x1) / 2, top, key).setOrigin(0.5, 0).setDisplaySize(w, bottom - top).setDepth(DEPTH.floor + 4.1);
      return true;
    }
    const g = s.add.graphics().setDepth(DEPTH.floor + 4);
    g.fillStyle(0x020203, 1).fillRect(p.x0, top, p.x1 - p.x0, bottom - top);
    vFade(g, p.x0, top, p.x1 - p.x0, 40, 0x2a2420, 0.55, 0);
    return true;
  }

  // Lay a painting over a crossing from `top` to `bottom`, its water over x0..x1; and the
  // painted tile's current running over the water, faint, so it still moves
  layWater(P, x0, x1, top, bottom, depth, shape) {
    const s = this.scene;
    const w = (x1 - x0) / P.frac;
    s.add.image((x0 + x1) / 2, top, P.key).setOrigin(0.5, 0).setDisplaySize(w, bottom - top).setDepth(depth);
    if (!s.textures.exists('water-src')) return;
    const flow = s.add.tileSprite(x0 - (w - (x1 - x0)) * 0.1, top, (x1 - x0) + (w - (x1 - x0)) * 0.2, bottom - top, 'water-src').setOrigin(0).setTileScale(0.32)
      .setDepth(depth + 0.01).setTint(0x9ab4c0).setAlpha(0.13).setBlendMode(Phaser.BlendModes.ADD);
    flow.setMask(s.make.graphics({ add: false }).fillStyle(0xffffff, 1).fillPoints(shape, true).createGeometryMask());
    s.tweens.add({ targets: flow, tilePositionY: -1024, duration: 11000, repeat: -1 });
  }

  drawPits() {
    const s = this.scene;
    const ford = this.paintedWater('wade');
    for (const p of this.terrain?.pits ?? []) {
      // (the ford's deep channel is in the ford's own painting)
      if (ford && (this.terrain?.wades ?? []).some((w) => p.x0 >= w.x0 && p.x1 <= w.x1)) continue;
      // (the mine: only the underground river is water. The shaft and the collapse's chasms
      // drop into the dark: level 3 polish, 2026-11-27)
      if (this.mine && this.mineChasm(p)) continue;
      const P = this.paintedWater('pit');
      if (P) {
        const ribbon = this.wood && p.z0 <= SETTINGS.world.floorTop;
        const top = ribbon ? p.z0 - 56 : p.z0 - (p.z0 <= SETTINGS.world.floorTop ? 50 : 0);
        const bottom = ribbon ? SETTINGS.height + 120 : p.z1 + 40;
        const shape = ribbon ? streamRibbon(p, top, bottom, (p.x1 - p.x0) * 0.22) : raggedRect(p.x0, top, p.x1 - p.x0, bottom - top, p.x0, 'none');
        this.layWater(P, p.x0, p.x1, top, bottom, DEPTH.floor + 4.1, shape);
        continue;
      }
      const g = s.add.graphics().setDepth(DEPTH.floor + 4);
      if (this.theme === 'ascent') { this.drawAscentGorge(p, g); continue; }
      g.fillStyle(this.water ? 0x0c1820 : 0x000000, 1).fillRect(p.x0, p.z0 - (p.z0 <= SETTINGS.world.floorTop ? 50 : 0), p.x1 - p.x0, p.z1 - p.z0 + (p.z0 <= SETTINGS.world.floorTop ? 50 : 0) + 40);
      // a cold glow at the lip so the edge reads (in the village: a burning cellar, its fire far
      // down; in the wood: a stream, black water running fast)
      if (this.theme === 'ascent') {
        vFade(g, p.x0 + 3, p.z0, p.x1 - p.x0 - 6, p.z1 - p.z0 + 40, 0x667b8a, 0.1, 0.42);
        for (let k = 0; k < 7; k++) g.fillStyle(0x8da1ac, 0.04).fillEllipse((p.x0+p.x1)/2, p.z0+65+k*38, (p.x1-p.x0)*0.9, 16);
      }
      const paintedWater = this.water && s.textures.exists('water-src');
      if (paintedWater) {
        g.clear(); // (the painted water alone, its banks worn: no dark box or ruled edges round it)
        // the painted stream (assets/env/water.png, a seamless tile): it runs toward the camera
        let top = p.z0 - (p.z0 <= SETTINGS.world.floorTop ? 50 : 0);
        // (the wood's streams run the full depth of the road: out from under the trees at the
        // back, narrow in the distance, and on off the bottom of the screen, wider as they come
        // toward the camera, so they read as water lying in the road, not a standing slab.
        // Exact to the pit inside the lane, so you fall in where the water is)
        const ribbon = this.wood && p.z0 <= SETTINGS.world.floorTop;
        if (ribbon) top = p.z0 - 56; // (from where the painted mud begins at the foot of the trees: no higher, or it stands up the backdrop like a pillar)
        const bottom = ribbon ? SETTINGS.height + 120 : p.z1 + 40;
        const flare = ribbon ? (p.x1 - p.x0) * 0.22 : 0;
        const ws = s.add.tileSprite(p.x0 - flare, top, p.x1 - p.x0 + flare * 2, bottom - top, 'water-src').setOrigin(0).setTileScale(0.32).setDepth(DEPTH.floor + 4.1);
        if (ribbon) ws.setTint(0x4e626c); // (black water under the pines, not a bright rapid: a step darker, it stood out of the mud like a lit panel)
        const wm = s.make.graphics({ add: false }).fillStyle(0xffffff, 1).fillPoints(ribbon ? streamRibbon(p, top, bottom, flare) : raggedRect(p.x0, top, p.x1 - p.x0, p.z1 + 40 - top, p.x0, 'none'), true);
        if (ribbon) this.streamBanks(p, top, bottom, flare);
        ws.setMask(wm.createGeometryMask()); // (its banks worn, not ruled)
        s.tweens.add({ targets: ws, tilePositionY: -1024, duration: 9000, repeat: -1 });
        s.tweens.add({ targets: ws, tilePositionX: { from: 0, to: 18 }, duration: 2600, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
        this.waterDepth(p, top, wm.createGeometryMask(), ribbon ? bottom : null, flare);
      } else if (this.water) {
        // (it runs down out of the trees at the back and on toward the camera)
        g.lineStyle(1, 0x3a5a70, 0.5);
        for (let y = p.z0 - 40; y < p.z1 + 30; y += 18) g.lineBetween(p.x0 + 6, y, p.x1 - 6, y + 4);
        g.fillStyle(0x6a8aa0, 0.25).fillRect(p.x0, p.z0 - 50, p.x1 - p.x0, 6);
      }
      if (this.village) this.burningCellar(p, g);
      // (a ruled lip only where nothing painted marks the edge: the village's cellars read by
      // their own fire and shadowed walls)
      const ruled = !paintedWater && !this.village;
      if (ruled) g.lineStyle(2, 0x6a8aa8, 0.6);
      if (ruled) g.lineBetween(p.x0, p.z0, p.x0, p.z1 + 40);
      if (ruled) g.lineBetween(p.x1, p.z0, p.x1, p.z1 + 40);
      if (ruled && p.z0 > SETTINGS.world.floorTop) g.lineBetween(p.x0, p.z0, p.x1, p.z0);
    }
  }

  // THE FORD'S SHALLOWS (terrain 'wade'): the stream spread out wide and shallow over a bed of
  // stones, knee-deep, so it reads as water you can walk into (Nick, 2026-11-16: no more
  // invisible river). The painted water, paler and browner than the deep channel and half
  // see-through, the stones of the bed under it, ripples running with it. Under the channel.
  drawAscentGorge(p, g) {
    const s=this.scene,top=p.z0-30,h=SETTINGS.height+180-top,w=p.x1-p.x0;
    // Paint depth as an image. Gradient-filled polygons triangulate into visible wedges.
    const key=artKey('ascent','gorge');
    const mask=s.make.graphics({add:false}).fillStyle(0xffffff,1).fillPoints(raggedRect(p.x0,top,w,h,p.x0,'none',5),true);
    if(s.textures.exists(key)){
      const im=s.add.image(p.x0,top,key).setOrigin(0).setDisplaySize(w,h).setTint(0xb4c1c5).setDepth(DEPTH.floor+4.02);
      im.setMask(mask.createGeometryMask());
    }else g.fillStyle(0x31454d,1).fillRect(p.x0,top,w,h);
    s.events.once('shutdown',()=>mask.destroy());
  }

  drawWades() {
    const s = this.scene;
    const painted = this.paintedWater('wade');
    for (const p of this.terrain?.wades ?? []) {
      const top = (p.z0 <= SETTINGS.world.floorTop ? p.z0 - 56 : p.z0 - 10);
      const bottom = SETTINGS.height + 120;
      const flare = (p.x1 - p.x0) * 0.16;
      const d = DEPTH.floor + 3.6;
      const shape = streamRibbon({ ...p, x0: p.x0, x1: p.x1 }, top, bottom, flare);
      if (painted) { this.layWater(painted, p.x0, p.x1, top, bottom, d, shape); continue; }
      const mask = () => s.make.graphics({ add: false }).fillStyle(0xffffff, 1).fillPoints(shape, true).createGeometryMask();
      // (wet mud round it, then the stones of the bed showing through)
      const g = s.add.graphics().setDepth(d);
      g.fillStyle(0x05080a, 0.55).fillPoints(shape.map((q) => ({ x: q.x + Math.sign(q.x - (p.x0 + p.x1) / 2) * 14, y: q.y })), true);
      g.fillStyle(0x1c2428, 1).fillPoints(shape, true);
      let k = Math.round(p.x0) % 991 + 5;
      const r = () => { k = (k * 9301 + 49297) % 233280; return k / 233280; };
      const bed = s.add.graphics().setDepth(d + 0.01);
      for (let i = 0; i < 120; i++) {
        const y = top + 30 + r() * (bottom - top - 30); const t = (y - top) / (bottom - top); const sc = 0.5 + t * 0.9;
        const x = p.x0 - flare * t + r() * (p.x1 - p.x0 + flare * 2 * t);
        const rr = (4 + r() * 9) * sc;
        bed.fillStyle(0x2e3634, 1).fillEllipse(x, y, rr * 2.2, rr * 1.1);
        bed.fillStyle(0x4a5450, 0.8).fillEllipse(x - rr * 0.2, y - rr * 0.25, rr * 1.3, rr * 0.5);
      }
      bed.setMask(mask());
      if (s.textures.exists('water-src')) {
        const ws = s.add.tileSprite(p.x0 - flare, top, p.x1 - p.x0 + flare * 2, bottom - top, 'water-src').setOrigin(0).setTileScale(0.32)
          .setDepth(d + 0.02).setTint(0x7c8c88).setAlpha(0.5);
        ws.setMask(mask());
        s.tweens.add({ targets: ws, tilePositionY: -1024, duration: 16000, repeat: -1 });
        s.tweens.add({ targets: ws, tilePositionX: { from: 0, to: 12 }, duration: 3200, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
      } else {
        g.fillStyle(0x4a6070, 0.45).fillPoints(shape, true);
      }
      // ripples: pale rings opening and fading, all over it, running with the water
      const rip = s.add.graphics().setDepth(d + 0.03);
      rip.setMask(mask());
      const rings = Array.from({ length: 26 }, (_, i) => ({ x: p.x0 - flare + r() * (p.x1 - p.x0 + flare * 2), y: top + 40 + r() * (bottom - top - 40), t: (i * 37) % 90 }));
      const tick = () => {
        rip.clear();
        for (const q of rings) {
          q.t++; q.y += 0.25;
          if (q.t > 90) { q.t = 0; q.x = p.x0 - flare + r() * (p.x1 - p.x0 + flare * 2); q.y = top + 40 + r() * (bottom - top - 60); }
          const u = q.t / 90; const sc = 0.5 + ((q.y - top) / (bottom - top)) * 0.9;
          rip.lineStyle(1.2, 0xd0dce0, 0.35 * (1 - u)).strokeEllipse(q.x, q.y, (6 + u * 26) * sc, (2 + u * 8) * sc);
        }
      };
      s.events.on('update', tick);
      s.events.once('shutdown', () => s.events.off('update', tick));
      // where it comes out from under the trees it's dark, and its banks are wet mud and
      // stones, as the deep streams' are (no flat-topped pale panel in the road)
      const shade = gradient(s, 'water-shade', [[0, 0x020406, 1], [1, 0x020406, 0]], false);
      s.add.image(p.x0 - flare, top - 4, shade).setOrigin(0).setDisplaySize(p.x1 - p.x0 + flare * 2, 130).setDepth(d + 0.035).setMask(mask());
      this.streamBanks(p, top, bottom, flare, d - 0.2);
      // the lip where the water meets the mud: a broken pale line
      const lip = s.add.graphics().setDepth(d + 0.04);
      lip.lineStyle(1.5, 0xc8d4d8, 0.35);
      for (let i = 0; i < shape.length - 1; i += 2) if (r() < 0.7) lip.lineBetween(shape[i].x, shape[i].y, shape[i + 1].x, shape[i + 1].y);
    }
  }

  // A wood stream's banks: wet black mud just outside the water, a scatter of wet stones and
  // a few reeds along each side, and the stones' foam where the water parts round them.
  streamBanks(p, top, bottom, flare, depth = DEPTH.floor + 3.8) {
    const s = this.scene;
    const g = s.add.graphics().setDepth(depth);
    const edgeStones = s.add.graphics().setDepth(depth + 0.4); // (over the water's edge)
    const z0 = p.z0; const inset = (p.x1 - p.x0) * 0.42;
    const sideAt = (y) => (y < z0 ? inset * ((z0 - y) / (z0 - top)) : y > p.z1 ? -flare * ((y - p.z1) / (bottom - p.z1)) : 0);
    let k = Math.round(p.x0) % 997 + 11;
    const r = () => { k = (k * 9301 + 49297) % 233280; return k / 233280; };
    for (let y = top + 6; y < bottom; y += 7) {
      const t = (y - top) / (bottom - top); const sc = 0.6 + t * 0.7;
      for (const [edge, dir] of [[p.x0 + sideAt(y) + streamBend(p, y, 4), -1], [p.x1 - sideAt(y) + streamBend(p, y, 1), 1]]) {
        // (wet mud: dark right at the water, fading out into the road)
        g.fillStyle(0x05070a, 0.55).fillEllipse(edge + dir * 8 * sc, y, 26 * sc, 10 * sc);
        g.fillStyle(0x05070a, 0.25).fillEllipse(edge + dir * 24 * sc, y, 40 * sc, 12 * sc);
        if (r() < 0.4) {
          // a wet stone: some half in the water, over its edge, so the bank's line breaks up
          const over = r() < 0.5; const sx = edge + dir * (over ? -2 - r() * 6 : 2 + r() * 12) * sc; const rr = (3 + r() * 7) * sc;
          const sg = over ? edgeStones : g;
          sg.fillStyle(0x000000, 0.4).fillEllipse(sx + 2, y + rr * 0.5, rr * 2.4, rr * 1.1);
          sg.fillStyle(0x22282a, 1).fillEllipse(sx, y, rr * 2.2, rr * 1.3);
          sg.fillStyle(0x4a5654, 0.9).fillEllipse(sx - rr * 0.2, y - rr * 0.35, rr * 1.4, rr * 0.6); // (its wet top)
          if (over) sg.lineStyle(1, 0xc8d4d8, 0.35).strokeEllipse(sx, y + rr * 0.3, rr * 2.8, rr * 1.2); // (the water parting round it)
        }
        if (r() < 0.08) {
          g.lineStyle(1.5, 0x3a4a30, 0.9);
          const rx = edge + dir * (8 + r() * 10) * sc;
          for (let q = 0; q < 3; q++) g.lineBetween(rx + q * 2, y, rx + q * 2 + (r() - 0.5) * 6, y - (10 + r() * 12) * sc);
        }
      }
    }
  }

  // The stream's body over the painted tile (it runs toward the camera): deep and dark down
  // the middle, shallower toward the banks, wet dark mud just outside them, and a broken line
  // of foam along each bank running with the water. Masked to the same worn banks; no shimmer.
  waterDepth(p, top, mask, bottom = null, flare = 0) {
    const s = this.scene;
    const w = p.x1 - p.x0; const H = (bottom ?? p.z1 + 40) - top; const d = DEPTH.floor + 4.1;
    const deep = gradient(s, 'water-deep', [[0, 0x2a3a30, 0.25], [0.22, 0x0a1620, 0.1], [0.5, 0x040a12, 0.45], [0.78, 0x0a1620, 0.1], [1, 0x2a3a30, 0.25]], true);
    s.add.image(p.x0 - flare, top, deep).setOrigin(0).setDisplaySize(w + flare * 2, H).setDepth(d + 0.02).setMask(mask);
    if (bottom !== null) {
      // (where it comes out from under the trees: dark, as if out of a culvert in the roots)
      const shade = gradient(s, 'water-shade', [[0, 0x020406, 1], [1, 0x020406, 0]], false);
      s.add.image(p.x0 - flare, top - 4, shade).setOrigin(0).setDisplaySize(w + flare * 2, 130).setDepth(d + 0.05).setMask(mask);
    }
    // (wet mud: the ground darkens toward the water, outside the stream)
    const wet = gradient(s, 'water-wet', [[0, 0x000000, 0], [1, 0x05080a, 0.55]], true);
    s.add.image(p.x0 - 16, top, wet).setOrigin(0).setDisplaySize(18, H).setDepth(DEPTH.floor + 3.9);
    s.add.image(p.x1 - 2, top, wet).setOrigin(0).setDisplaySize(18, H).setFlipX(true).setDepth(DEPTH.floor + 3.9);
    if (!s.textures.exists('water-foam')) {
      const cv = document.createElement('canvas');
      cv.width = 32; cv.height = 256;
      const c = cv.getContext('2d');
      let k = 7; const r = () => { k = (k * 9301 + 49297) % 233280; return k / 233280; };
      for (let i = 0; i < 46; i++) {
        const x = r() * 22 + 2; const y = r() * 256; const l = 4 + r() * 16;
        c.fillStyle = `rgba(220,232,236,${0.25 + r() * 0.5})`;
        c.beginPath(); c.ellipse(x, y, 1 + r() * 2, l / 2, 0, 0, Math.PI * 2); c.fill();
      }
      s.textures.addCanvas('water-foam', cv);
    }
    for (const [x, flip] of [[p.x0, false], [p.x1 - 16, true]]) {
      const f = s.add.tileSprite(x, top, 16, H, 'water-foam').setOrigin(0).setFlipX(flip).setAlpha(0.55).setDepth(d + 0.04).setMask(mask);
      s.tweens.add({ targets: f, tilePositionY: -256, duration: 2250 + (x % 7) * 60, repeat: -1 });
    }
  }

  // A burning cellar, not a black hole (the village's pits): the dark falls smoothly to
  // red-hot embers at the bottom, its side walls fall into shadow (so its edges read without
  // drawn lines), the glow breathes, and a few sparks climb out of it.
  burningCellar(p, g) {
    const s = this.scene;
    const top = p.z0 - (p.z0 <= SETTINGS.world.floorTop ? 50 : 0); const bot = p.z1 + 40; const H = bot - top; const w = p.x1 - p.x0;
    const d = DEPTH.floor + 4;
    // its back and sides: the burnt-out house's own charred timber walls going down into the
    // dark (the painted house front, in shadow), not a flat black box over the drop
    const wallKey = artKey('village', 'surf-roof_front');
    if (s.textures.exists(wallKey)) {
      const img = s.textures.get(wallKey).getSourceImage(); const sc = 150 / img.height;
      const t = s.add.tileSprite(p.x0, top, w, H, wallKey).setOrigin(0).setTileScale(sc, sc).setTint(0x4a3020).setDepth(d + 0.01);
      t.tilePositionX = p.x0 / sc; t.tilePositionY = 30 / sc;
      const shade = gradient(s, 'cellar-back', [[0, 0x000000, 0.55], [0.18, 0x000000, 0.2], [0.5, 0x000000, 0.45], [1, 0x000000, 0.7]]);
      s.add.image(p.x0, top, shade).setOrigin(0).setDisplaySize(w, H).setDepth(d + 0.02);
    }
    // painted (roof_gap.png: looking down the burning alley between two houses, Nick's second
    // level 1 review): cover the drop with it, its foot on the fire, cut to the gap's shape
    const gapKey = artKey('village', 'roof_gap');
    if (s.textures.exists(gapKey)) {
      const src = s.textures.get(gapKey).getSourceImage();
      const k = Math.max(w / src.width, H / src.height);
      const cw = w / k, ch = H / k;
      s.add.image(p.x0, top, gapKey).setOrigin(0).setCrop((src.width - cw) / 2, src.height - ch, cw, ch)
        .setScale(k).setPosition(p.x0 - (src.width - cw) / 2 * k, top - (src.height - ch) * k).setTint(0xc8b0a0).setDepth(d + 0.04);
      const soft = gradient(s, 'cellar-heat-soft', [[0, 0x000000, 0.55], [0.35, 0x000000, 0.15], [1, 0x000000, 0]]);
      s.add.image(p.x0, top, soft).setOrigin(0).setDisplaySize(w, H).setDepth(d + 0.05);
    } else {
      const heat = gradient(s, 'cellar-heat', [[0, 0x000000, 0], [0.42, 0x1e0603, 0.6], [0.78, 0x6a1606, 0.85], [1, 0xa8320c, 0.95]]);
      s.add.image(p.x0, top, heat).setOrigin(0).setDisplaySize(w, H).setDepth(d + 0.05);
    }
    const wall = gradient(s, 'cellar-wall', [[0, 0x000000, 0.85], [1, 0x000000, 0]], true);
    const ww = Math.min(26, w * 0.2);
    s.add.image(p.x0, top, wall).setOrigin(0).setDisplaySize(ww, H).setDepth(d + 0.1);
    s.add.image(p.x1, top, wall).setOrigin(0).setDisplaySize(ww, H).setFlipX(true).setDepth(d + 0.1).setX(p.x1 - ww);
    const glow = s.add.image((p.x0 + p.x1) / 2, bot - 20, 'glow').setDisplaySize(w * 1.1, H * 0.9).setTint(VIL.cellarLip).setAlpha(0.5)
      .setBlendMode(Phaser.BlendModes.ADD).setDepth(d + 0.2);
    s.tweens.add({ targets: glow, alpha: 0.28, duration: 900 + (p.x0 % 5) * 120, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    // sparks: few and small, so they never hide a man on the boards above
    const n = Math.max(2, Math.min(7, Math.round(w / 45)));
    for (let i = 0; i < n; i++) {
      const sx = p.x0 + ww + ((i + 0.5) / n) * (w - ww * 2);
      const sp = s.add.image(sx, bot - 10, 'glow').setScale(0.09).setTint(0xffb060).setBlendMode(Phaser.BlendModes.ADD).setDepth(d + 0.3).setAlpha(0);
      s.tweens.add({
        targets: sp, y: top + H * 0.25, x: sx + ((i * 37) % 30) - 15, alpha: { from: 0.9, to: 0 },
        duration: 1600 + ((i * 53) % 900), delay: (i * 410) % 1700, repeat: -1, ease: 'Quad.out',
      });
    }
    g.setDepth(d);
  }

  // A veil of smoke over the backdrop behind a stretch of platforms (a level's `veils`: the
  // village's roofs, whose backdrop is the same shingles and timber as the roofs you jump
  // on): it dims everything behind the lane, so what you can stand on stands out from what
  // you can't. Soft at both ends; the blocks, pits and men are all drawn over it.
  drawVeils(list) {
    const s = this.scene;
    for (const v of list) {
      // (one smooth sheet: drawn in strips, the overlaps striped the sky with vertical lines)
      const top = -400; const bot = SETTINGS.world.floorTop; const w = v.x1 - v.x0; const soft = Math.min(0.45, 120 / w);
      const k = gradient(s, `veil-${v.x0}-${v.x1}`, [[0, 0x08040a, 0], [soft, 0x08040a, v.alpha], [1 - soft, 0x08040a, v.alpha], [1, 0x08040a, 0]], true);
      s.add.image(v.x0, top, k).setOrigin(0).setDisplaySize(w, bot - top).setDepth(DEPTH.floor - 0.5);
    }
  }

  // ------------------------------------------------------------ blocks

  makeBlock(b) {
    const s = this.scene;
    const top = s.add.graphics();
    const front = s.add.graphics();
    const v = { top, front, b, drawnAt: null };
    this.drawBlock(v);
    return v;
  }

  // (redrawn when the block moves, shakes or comes back)
  drawBlock(v) {
    const { top, front, b } = v;
    const key = `${b.x0.toFixed(1)}|${b.top.toFixed(1)}|${b.solid}|${b.shake}`;
    if (key === v.drawnAt) return;
    v.drawnAt = key;
    top.clear(); front.clear();
    const shake = b.shake ? Math.sin(b.shake * 1.7) * Math.min(3, b.shake / 6) : 0;
    const x0 = b.x0 + shake; const x1 = b.x1 + shake; const w = x1 - x0;
    const yTop0 = b.z0 - b.top; const yTop1 = b.z1 - b.top;
    for (const t of Object.values(v.tiles ?? {})) t.setVisible(false); // (shown again below by whichever face is painted)
    v.gables?.forEach((g) => g.setVisible(false)); v.flank?.setVisible(false);
    if (!b.solid) {
      v.top.setVisible(false); v.front.setVisible(false); v.art?.setVisible(false); v.arts?.forEach((a) => a.setVisible(false)); v.chains?.forEach((c) => c.setVisible(false)); v.post?.setVisible(false); v.postFade?.setVisible(false); placeRoofFire(v.fire, b.x0, 0, false); // (gone: broken through, or fallen)
      return;
    }
    // (a painted set piece stands in for it: the wood's rockslide, view/WoodView.js)
    if (b.hideArt) { v.top.setVisible(false); v.front.setVisible(false); return; }
    v.top.setVisible(true); v.front.setVisible(true);
    // a log bridge over the water: its walkway is the bark tile as before, and its front the
    // painted fallen tree (assets/env/bridge_log.png), roots and broken end past the banks
    // (the mine's river: squared pit props laid side by side across it, iron-banded, not the
    // wood's mossy log; one per 30 of depth, the back ones darker)
    if (this.mine && b.mat === 'log' && this.terrain.inPit((x0 + x1) / 2, b.z1 - 1) && this.scene.textures.exists(artKey('mine', 'timber_bridge'))) {
      const key = artKey('mine', 'timber_bridge');
      const depth = yTop1 - yTop0;
      const rows = Math.max(3, Math.round(depth / 20)); // (close-laid: at /30 the gaps between them read as floating logs, level 3 polish)
      const lw = (x1 - x0) * 1.12;
      v.arts ??= [];
      for (let i = 0; i < rows; i++) {
        const img = v.arts[i] ??= this.scene.add.image(0, 0, key).setOrigin(0.5, 0.25);
        const k = 0.62 + 0.38 * (i / Math.max(1, rows - 1));
        const g = Math.round(255 * k);
        img.setPosition((x0 + x1) / 2 + (i % 2 ? 8 : -6), yTop0 + depth * ((i + 0.5) / rows)).setScale(lw / img.frame.width)
          .setFlipX(i % 2 === 1).setTint(Phaser.Display.Color.GetColor(g, g, g))
          .setDepth(i === rows - 1 ? b.z1 + 0.6 : b.z0 - 0.5 + i * 0.01).setVisible(true);
      }
      top.setVisible(false); front.setVisible(false);
      return;
    }
    if (b.mat === 'log' && this.terrain.inPit((x0 + x1) / 2, b.z1 - 1) && paintedLog(this.scene)) {
      v.art ??= this.scene.add.image(0, 0, 'bridge-log').setOrigin(0.5, LOG_FIT.walk);
      const lw = (x1 - x0) * LOG_FIT.wide;
      v.art.setPosition((x0 + x1) / 2, yTop1 - 4).setScale(lw / v.art.frame.width).setDepth(b.z1 + 0.6).setVisible(true);
    }
    // the wood's crossings over a stream: stepping stones as wet boulders, a log bridge as
    // trunks lashed side by side (not a box of bark or a flat slab of road)
    if (this.wood && this.terrain.inPit((x0 + x1) / 2, b.z1 - 1)) {
      if (b.mat === 'log' && v.art) { this.drawLogRaft(v, x0, x1, yTop0, yTop1); return; }
      if (b.mat !== 'log') { this.drawStones(v, x0, x1, yTop0, yTop1); return; }
    }
    // (the mine's river: its own painted stepping stones, wet black rock in foam)
    if (this.mine && b.kind === 'block' && b.mat !== 'log' && b.top <= 40 && this.terrain.inPit((x0 + x1) / 2, b.z1 - 1)
      && this.scene.textures.exists(artKey('mine', 'stone_0'))) { this.drawStones(v, x0, x1, yTop0, yTop1); return; }
    // (the mine's lift up to Pip: the painted platform on its two chains, run on up into the dark)
    if (this.mine && b.kind === 'lift' && this.scene.textures.exists(artKey('mine', 'lift'))) { this.drawMineLift(v, x0, x1, yTop0, yTop1); return; }
    // (the mine's rotten planks: painted boards, split and green with rot, on their two ropes)
    if ((this.mine || this.theme === 'gates') && b.kind === 'crumble' && this.scene.textures.exists(artKey('mine', 'planks_rotten'))) { this.drawMinePlanks(v, x0, x1, yTop0, yTop1); return; }
    if (b.mat === 'siegeGate') { this.drawSiegeGate(v, x0, x1); return; }
    if (b.mat === 'iron' && b.kind === 'block') { this.drawPortcullis(v, x0, x1, yTop0, yTop1); return; }
    if (b.mat === 'rubble') { this.drawRubble(v, x0, x1, yTop0, yTop1); return; }
    if (this.village || (this.water && b.mat === 'log')) { this.drawVillageBlock(v, x0, x1, w, yTop0, yTop1); return; } // (the wood's fallen trees: as the village's beams)
    // (the gates: a burned-out ram on the road, the village's burnt cart in the town)
    const painted = { cart: 'cartwreck', ram: 'prop-ram', orecart: artKey('mine', 'ore_cart') }[b.look];
    if (painted && this.scene.textures.exists(painted)) { this.drawPaintedBlock(v, x0, x1, painted); return; }
    const mat = b.kind === 'crumble' ? 'plank' : b.kind === 'lift' ? 'iron' : 'rock';
    const C = mat === 'plank' ? [COL.plankTop, COL.plankRim, COL.plankFront]
      : mat === 'iron' ? [COL.iron, COL.ironRim, COL.ironDark] : [COL.rockTop, COL.rockRim, COL.rockFront];
    if (this.theme === 'ascent') { if (mat === 'rock') C[1] = 0x93988f; else if (mat === 'plank') { C[0]=0x5e5950; C[1]=0x939081; C[2]=0x292b28; } }
    // top face (where you stand): the lightest surface around (painted, when its tile exists)
    const sceneDeck=false; // Deck remains under the proportionally sized scene.
    const topArt = sceneDeck || mat !== 'iron' && this.surface(v, 'top', mat === 'plank' ? 'plank' : (b.mat === 'siegeGround' || (this.theme === 'ascent' && b.x0 >= 6200 && b.x1 <= 7600)) ? 'siege_top' : 'rock_top', x0, yTop0, w, yTop1 - yTop0, b.z0 - 0.6);
    if (!topArt) top.fillStyle(C[0], 1).fillRect(x0, yTop0, w, yTop1 - yTop0);
    if (mat === 'plank' && !topArt) { top.fillStyle(COL.plankCrack, 0.8); for (let x = x0 + 16; x < x1; x += 18) top.fillRect(x, yTop0, 2, yTop1 - yTop0); }
    if (mat === 'rock' && !topArt) {
      // flagstones receding into the lane, darker toward the back: it reads as a floor, not a wall
      const depth = yTop1 - yTop0;
      top.fillStyle(0x000000, 0.25).fillRect(x0, yTop0, w, depth * 0.35);
      top.lineStyle(1, COL.rockSeam, 1);
      for (let y = yTop0 + 18; y < yTop1 - 4; y += 26) top.lineBetween(x0, y, x1, y);
      for (let y = yTop0, row = 0; y < yTop1; y += 26, row++) {
        for (let x = x0 + (row % 2) * 30 + 20; x < x1; x += 60) top.lineBetween(x, y, x, Math.min(yTop1, y + 26));
      }
    }
    // (the mine: a torch-lit rim, not a white line round every ledge: Nick's level 3 review)
    const lit = this.mine || this.theme === 'gates'; // (and the gatehouse's stone: brazier-lit, not a white line)
    // (the Black Keep: a faint violet torchlit edge on its painted basalt: level 6 review)
    const rim = lit && mat !== 'iron' ? (mat === 'plank' ? 0x9a6a3a : 0x7a6a58) : this.theme === 'keep' && mat === 'rock' ? 0x6a5a88 : C[1];
    if (!topArt) raggedLine(top, x0, x1, yTop0, rim, 0.75, 2, b.x0);
    // the landing rim along the front edge
    raggedLine(front, x0, x1, yTop1 - 0.5, rim, lit ? 0.7 : this.theme === 'ascent' ? .28 : 0.9, lit ? 2 : this.theme === 'ascent' ? 1.2 : 3, b.x0 + 7);
    // front face, down to the floor (or into the dark, over a pit)
    const floorY = b.z1;
    // rock goes down to the floor (or on down into the dark over a pit); a plank and the
    // cage are thin things hanging in the air
    const depthDown = mat === 'plank' ? 12 : mat === 'iron' ? 16
      : Math.max(0, b.top) + (this.terrain.inPit((x0 + x1) / 2, b.z1 - 1) ? 120 : 0);
    const frontArt = mat === 'rock' && this.surface(v, 'front', 'rock_front', x0, yTop1 + 1, w, depthDown, b.z1 + 0.4);
    if (!frontArt) front.fillStyle(C[2], 1).fillRect(x0, yTop1 + 1, w, depthDown);
    if (mat === 'rock' && !frontArt) {
      front.fillStyle(COL.rockShade, 1);
      for (let y = yTop1 + 14; y < floorY; y += 22) front.fillRect(x0, y, w, 2);
    } else if (mat === 'rock') {
      // (painted)
    } else if (mat === 'iron') {
      // the gibbet cage: bars and a chain up out of sight
      front.fillStyle(COL.ironRim, 0.7);
      for (let x = x0 + 6; x < x1; x += 12) front.fillRect(x, yTop1 - 60, 2, 60);
      front.fillRect(x0, yTop1 - 62, w, 3);
      front.fillStyle(COL.iron, 1).fillRect((x0 + x1) / 2 - 1, yTop1 - 700, 3, 640);
    } else {
      front.fillStyle(COL.plankCrack, 1);
      for (let x = x0 + 10; x < x1; x += 22) front.fillRect(x, yTop1 + 2, 2, depthDown);
      // The ascent is a broken road bridge, not suspended stepping platforms.
      if (this.theme === 'ascent') {
        if (!topArt) {
        top.lineStyle(2, 0x3a251a, 0.9);
        for (let y = yTop0 + 13; y < yTop1; y += 16) top.lineBetween(x0, y, x1, y);
        top.lineStyle(1, 0xbea785, 0.6);
        for (let y = yTop0 + 5; y < yTop1; y += 16) top.lineBetween(x0 + 3, y, x1 - 3, y);
        }
        front.lineStyle(1, 0x797e71, .25).lineBetween(x0, yTop1 + 2, x1, yTop1 + 2);
      } else {
      // hung on two ropes from above
      front.fillStyle(0x8a7a5a, 0.9).fillRect(x0 + 6, yTop1 - 400, 2, 400).fillRect(x1 - 8, yTop1 - 400, 2, 400);
      }
    }
    if (this.theme === 'ascent') {
      vFade(front,x0,yTop1+1,w,Math.min(depthDown,18),0x070d12,.38,0);
      if (mat === 'rock' && !b.bridgePier) vFade(top,x0,yTop0,w,14,0x101820,.22,0);
    }
    // (the mine's broken gallery: a pillar left standing over the drop wears its painted face,
    // timber-braced and iron-banded, fading into the black below: ChatGPT 2026-11-26)
    const pk = artKey('mine', 'pillar');
    if (this.mine && mat === 'rock' && w <= 90 && b.top >= 100 && this.terrain.inPit((x0 + x1) / 2, b.z1 + 2) && this.scene.textures.exists(pk)) {
      v.art ??= this.scene.add.image(0, 0, pk).setOrigin(0.5, 0.1);
      const kx = (w * 1.16) / (v.art.frame.width * 0.8);
      v.art.setPosition((x0 + x1) / 2, yTop1).setScale(kx, kx * 1.35).setDepth(b.z1 + 0.5).setVisible(true);
      front.setVisible(false);
    }
    top.setDepth(b.z0 - .5);
    front.setDepth(b.z1 + .5);
  }

  // The mine's rotten planks (assets/env/mine/planks_rotten.png, ChatGPT 2026-11-26): the
  // bundle of boards turned on its side, so the boards run ACROSS the gap like a duckboard laid
  // over the drop (stood upright along the depth, on ropes from the ceiling, they read as doors
  // hanging in the dark: level 3 polish, 2026-11-27). Off the floor they stand on a squared pit
  // prop going down into the dark (timber_bridge.png stood on end), not on ropes.
  drawMinePlanks(v, x0, x1, yTop0, yTop1) {
    const { top, front, b } = v;
    const key = artKey('mine', 'planks_rotten');
    const depth = yTop1 - yTop0;
    const w = x1 - x0;
    // short lengths of the squared pit-prop timber (timber_bridge.png, cropped) laid side by side
    // across the gap, back to front like a duckboard, a shade greener and darker than the
    // river's sound timber: rotten (one length per 22 of depth, the back ones darker)
    const tk = artKey('mine', 'timber_bridge');
    const slatKey = this.scene.textures.exists(tk) ? tk : key;
    const rows = Math.max(3, Math.round(depth / 22));
    v.arts ??= [];
    for (let i = 0; i < rows; i++) {
      const img = v.arts[i] ??= this.scene.add.image(0, 0, slatKey).setOrigin(0.5, 0.35);
      const fw = img.frame.width;
      const seg = slatKey === tk ? Math.round(fw * 0.28) : fw;
      const off = slatKey === tk ? Math.round(((b.x0 * 7 + i * 331) % 1000) / 1000 * (fw - seg)) : 0;
      img.setCrop(off, 0, seg, img.frame.height);
      const sc = (w * 1.16) / seg;
      const k = 0.55 + 0.35 * (i / Math.max(1, rows - 1));
      img.setScale(sc).setPosition((x0 + x1) / 2 - (off + seg / 2 - fw / 2) * sc + ((i * 5) % 3 - 1) * 3, yTop0 + depth * ((i + 0.5) / rows))
        .setTint(Phaser.Display.Color.GetColor(Math.round(200 * k), Math.round(215 * k), Math.round(180 * k)))
        .setAngle(((b.x0 + i * 13) % 5 - 2) * 0.8)
        .setDepth(i === rows - 1 ? b.z1 + 0.6 : b.z0 - 0.5 + i * 0.01).setVisible(true);
    }
    for (let i = rows; i < v.arts.length; i++) v.arts[i].setVisible(false);
    top.setVisible(false);
    front.clear().setVisible(false);
    const pk = artKey('mine', 'timber_bridge');
    if (b.top > 0 && this.scene.textures.exists(pk)) {
      v.post ??= this.scene.add.image(0, 0, pk).setOrigin(0.5, 0.5).setAngle(90).setTint(0x8a8076);
      const pf = v.post.frame; const len = 260;
      v.post.setPosition((x0 + x1) / 2, yTop1 + 6 + len / 2).setScale(len / pf.width, Math.min(w * 0.5, 30) / pf.height)
        .setDepth(b.z1 + 0.55).setVisible(true);
      // (fading into the dark of the drop)
      v.postFade ??= this.scene.add.graphics();
      v.postFade.clear().fillGradientStyle(0x05070a, 0x05070a, 0x05070a, 0x05070a, 0, 0, 1, 1)
        .fillRect(x0 - 4, yTop1 + 60, w + 8, len - 50).setDepth(b.z1 + 0.56).setVisible(true);
    } else { v.post?.setVisible(false); v.postFade?.setVisible(false); }
  }

  // The mine's lift (assets/env/mine/lift.png, ChatGPT 2026-11-26): its timber floor is where you
  // stand, the rail behind; the chains from its corners run on up out of sight (lift_chain.png,
  // repeated), so it hangs from the dark rather than from nothing.
  drawMineLift(v, x0, x1, yTop0, yTop1) {
    const { top, front, b } = v;
    const s = this.scene;
    const key = artKey('mine', 'lift'); const ck = artKey('mine', 'lift_chain');
    const fr = s.textures.getFrame(key);
    const W = (x1 - x0) * 1.35; const k = W / fr.width;
    const cx = (x0 + x1) / 2;
    v.art ??= s.add.image(0, 0, key).setOrigin(0.5, 0.97);
    v.art.setPosition(cx, yTop1 + 6).setScale(k).setDepth(b.z0 - 0.4).setVisible(true);
    const imgTop = yTop1 + 6 - fr.height * k * 0.97;
    if (s.textures.exists(ck)) {
      const cf = s.textures.getFrame(ck);
      v.chains ??= [0, 1].map(() => s.add.tileSprite(0, 0, cf.width, 10, ck).setOrigin(0.5, 1));
      [158 / 976, 818 / 976].forEach((u, i) => {
        const h = Math.max(10, imgTop + 4 - (yTop0 - 900));
        v.chains[i].setPosition(cx + (u - 0.5) * W, imgTop + 4).setSize(cf.width, h / k).setScale(k).setTilePosition(0, -(b.top / k) % cf.height)
          .setDepth(b.z0 - 0.45).setVisible(true);
      });
    }
    top.setVisible(false); front.setVisible(false);
  }

  // Stepping stones in a wood stream: two or three wet boulders filling the block's footing,
  // mossy and lit on top where you land, dark and wet down into the water, foam round them.
  drawStones(v, x0, x1, yTop0, yTop1) {
    const { top, front, b } = v;
    const w = x1 - x0; const depth = yTop1 - yTop0;
    const rows = Math.max(2, Math.round(depth / 45));
    // painted (ChatGPT, 2026-11-19: three wet boulders, tools/cut-water-art.py): one per row,
    // their flat tops where you land, the back ones darker
    const keys = (this.mine ? [0, 1, 2].map((n) => artKey('mine', `stone_${n}`)) : [1, 2, 3].map((n) => artKey('wood', `water_stone_${n}`))).filter((k) => this.scene.textures.exists(k));
    if (keys.length) {
      v.arts ??= [];
      for (let i = 0; i < rows; i++) {
        const key = keys[(Math.round(b.x0 / 10) + i) % keys.length];
        const img = v.arts[i] ??= this.scene.add.image(0, 0, key).setOrigin(0.5, STONE_TOP);
        const cy = yTop0 + depth * ((i + 0.5) / rows);
        const cx = (x0 + x1) / 2 + (wob(i, b.x0) - 0.5) * w * 0.2;
        const k = 0.7 + 0.3 * (i / Math.max(1, rows - 1));
        img.setTexture(key).setPosition(cx, cy).setScale((w * 1.25) / img.frame.width).setFlipX((i + Math.round(b.x0)) % 2 === 1)
          .setTint(Phaser.Display.Color.GetColor(Math.round(255 * k), Math.round(255 * k), Math.round(255 * k)))
          .setDepth(i === rows - 1 ? b.z1 + 0.5 : b.z0 - 0.5 + i * 0.01).setVisible(true);
      }
      top.setVisible(false); front.setVisible(false);
      return;
    }
    const drop = Math.max(0, b.top) + 18; // (down into the water)
    // a stone's outline: a rough, flattish lump, never a clean ellipse
    const lump = (cx, cy, rx, ry, seed) => {
      const pts = [];
      for (let a = 0; a < 14; a++) {
        const t = (a / 14) * Math.PI * 2;
        const r = 0.82 + wob(a, seed) * 0.3;
        pts.push({ x: cx + Math.cos(t) * rx * r, y: cy + Math.sin(t) * ry * r * (Math.sin(t) > 0 ? 1.05 : 0.9) });
      }
      return pts;
    };
    for (let i = 0; i < rows; i++) {
      const seed = b.x0 * 0.37 + i * 5.1;
      const cy = yTop0 + depth * ((i + 0.5) / rows);
      const ry = (depth / rows) * (0.36 + wob(i + 9, b.x0) * 0.08);
      const cx = (x0 + x1) / 2 + (wob(i, b.x0) - 0.5) * w * 0.28;
      const rx = w * (0.4 + wob(i + 3, b.x0) * 0.14);
      const g = i === rows - 1 ? front : top;
      // the foam where the water parts round it, then its wet flank down into the stream
      g.fillStyle(0xd8e4e8, 0.22).fillEllipse(cx, cy + drop * 0.9, rx * 2.5, ry * 1.4);
      g.fillStyle(0x0c0f10, 1).fillPoints(lump(cx, cy + drop * 0.55, rx * 1.02, ry + drop * 0.5, seed), true);
      // its top, where you land: dark wet stone, a little moss, a cold glint on the lip
      g.fillStyle(0x2a302f, 1).fillPoints(lump(cx, cy, rx, ry, seed + 1), true);
      g.fillStyle(0x36403a, 1).fillPoints(lump(cx - rx * 0.12, cy - ry * 0.22, rx * 0.7, ry * 0.55, seed + 2), true);
      g.fillStyle(0x2f3d22, 0.7).fillPoints(lump(cx - rx * 0.3, cy - ry * 0.35, rx * 0.35, ry * 0.3, seed + 3), true);
      g.lineStyle(1.5, 0x9aa8ac, 0.35);
      g.beginPath(); g.arc(cx, cy - ry * 0.1, rx * 0.88, 0.35, 1.25); g.strokePath();
    }
    top.setDepth(b.z0 - 0.5);
    front.setDepth(b.z1 + 0.5);
  }

  // A log bridge in the wood: the painted fallen trunk laid several times from the back of
  // the walk to the front, each further one darker, so the walk is trunks lashed together
  drawLogRaft(v, x0, x1, yTop0, yTop1) {
    const { top, front, b } = v;
    const depth = yTop1 - yTop0;
    const n = Math.max(2, Math.round(depth / 24));
    const lw = (x1 - x0) * LOG_FIT.wide;
    v.arts ??= [];
    for (let i = 0; i < n - 1; i++) {
      const img = v.arts[i] ??= this.scene.add.image(0, 0, 'bridge-log').setOrigin(0.5, LOG_FIT.walk);
      const y = yTop0 + depth * ((i + 0.6) / n);
      const k = 0.55 + 0.45 * (i / (n - 1));
      img.setPosition((x0 + x1) / 2 + (i % 2 ? 6 : -6), y).setScale((lw * (0.92 + 0.08 * k)) / img.frame.width)
        .setTint(Phaser.Display.Color.GetColor(Math.round(200 * k), Math.round(200 * k), Math.round(200 * k))).setDepth(b.z0 + i * 0.01).setVisible(true);
    }
    // (the front trunk is the one drawBlock placed; the lashings across all of them)
    top.lineStyle(2, 0x6a5a3a, 0.8);
    for (const lx of [x0 + 10, x1 - 10]) top.lineBetween(lx, yTop0 + 4, lx, yTop1 - 2);
    top.setDepth(b.z0 + 0.2).setVisible(true);
    front.setVisible(false);
  }

  // A painted surface tile (data/levelArt.js `surfaces`) over one face of a block, lined up
  // with the world so neighbouring blocks continue each other. False if it isn't painted.
  // A big roof's two painted ends (data/levelArt.js 'roof_gable'): standing from the eave up
  // past the ridge, the inner side faded into the roof's own slates
  roofEnds(v, x0, x1, yTop0, yTop1, b) {
    const key = artKey('village', 'roof_gable');
    if (!this.scene.textures.exists(key)) return;
    if (!v.gables) {
      const fk = `${key}-soft`;
      if (!this.scene.textures.exists(fk)) {
        const src = this.scene.textures.get(key).getSourceImage();
        const c = document.createElement('canvas'); c.width = src.width; c.height = src.height;
        const x = c.getContext('2d'); x.drawImage(src, 0, 0);
        x.globalCompositeOperation = 'destination-in';
        const g = x.createLinearGradient(0, 0, src.width, 0); // (one fill: destination-in clears what it doesn't cover)
        g.addColorStop(0, 'rgba(0,0,0,0.15)'); g.addColorStop(0.12, 'rgba(0,0,0,1)'); g.addColorStop(1, 'rgba(0,0,0,1)');
        x.fillStyle = g; x.fillRect(0, 0, src.width, src.height);
        this.scene.textures.addCanvas(fk, c);
      }
      v.gables = [0, 1].map((i) => this.scene.add.image(0, 0, fk).setOrigin(1, 1).setFlipX(i === 0).setTint(0xb8a8a0));
    }
    // The painting's bargeboard runs from its peak (PEAK, in its own pixels) down to the
    // gutter at its outer foot (FOOT). Scaled so the peak stands just over the ridge, and
    // squeezed sideways on a short roof so the two ends never meet.
    const W = v.gables[0].width, H = v.gables[0].height;
    const PEAK = { u: 52, v: 115 }, FOOT = { u: 690, v: 1330 };
    const footY = yTop1 + 14;
    const sy = (footY - (yTop0 - 30)) / (H - PEAK.v);
    const sx = Math.min(sy, ((x1 - x0) * 0.38) / (W - PEAK.u));
    const [L, R] = v.gables;
    R.setOrigin(1, 1).setScale(sx, sy).setPosition(x1 + 10, footY).setDepth(b.z0 - 0.4).setVisible(true);
    L.setOrigin(0, 1).setScale(sx, sy).setPosition(x0 - 10, footY).setDepth(b.z0 - 0.4).setVisible(true);
    // ...and outside the bargeboard the roof's flank falls away into shadow, so the end
    // reads as a sloping gable and not more shingles past it
    v.flank ??= this.scene.add.graphics();
    const g = v.flank.clear().setDepth(b.z0 - 0.45).setVisible(true);
    for (const side of [1, -1]) {
      const ox = side > 0 ? x1 + 10 : x0 - 10;
      const at = (p) => ({ x: ox - side * (W - p.u) * sx, y: footY - (H - p.v) * sy });
      const pk = at(PEAK), ft = at(FOOT);
      const edge = side > 0 ? x1 : x0;
      const top = Math.max(yTop0, pk.y);
      const t = (top - pk.y) / ((ft.y - pk.y) || 1); // (where the board crosses the roof's back edge)
      const cx = pk.x + (ft.x - pk.x) * t;
      g.fillStyle(0x0a0604, 0.78).fillPoints([{ x: cx, y: top }, ft, { x: edge, y: ft.y }, { x: edge, y: top }], true);
    }
  }

  surface(v, slot, name, x, y, w, h, depth, amp) {
    const key = artKey(this.theme, `surf-${name}`);

    if (!name || w <= 0 || h <= 0 || !this.scene.textures.exists(key)) return false;
    const conf = LEVEL_ART[this.theme]?.surfaces?.[name] ?? {};
    v.tiles ??= {};
    const t = v.tiles[slot] ??= this.scene.add.tileSprite(0, 0, 1, 1, key).setOrigin(0);
    const img = this.scene.textures.get(key).getSourceImage();
    const sc = (conf.fit ? h : conf.px ?? 128) / img.height;
    t.setPosition(x, y).setSize(w, h).setDisplaySize(w, h).setTileScale(sc, sc).setDepth(depth).setVisible(true);
    if (this.theme === 'ascent') t.setTint(slot === 'front' ? 0xa8b0ae : 0xe5e5d8);
    t.tilePositionX = x / sc;
    // its outline worn and chipped (a mask), not a ruled rectangle
    v.masks ??= {};
    let m = v.masks[slot];
    if (!m) { m = v.masks[slot] = this.scene.make.graphics({ add: false }); t.setMask(m.createGeometryMask()); }
    m.clear().fillStyle(0xffffff, 1).fillPoints(raggedRect(x, y, w, h, Math.round(v.b.x0) + (slot === 'top' ? 0 : 11), slot === 'top' ? 'bottom' : 'top', amp), true);
    return true;
  }

  // A portcullis (the mine): a tall iron grille across the lane, its chain running up out
  // of sight to the counterweight; gone (raised) once that's broken (Stage.openWay).
  drawSiegeGate(v, x0, x1) {
    const {top, front, b} = v;
    top.setVisible(false);
    const floor=140, y=b.z0-b.top, bottom=b.z1-floor, height=bottom-y, w=x1-x0;
    // A continuous timber gate seen edge-on across the ridge, without repeated peaks.
    this.surface(v,'front','plank',x0,y,w,height,b.z1+.4,1.5);
    front.fillStyle(0x111719,.3).fillRect(x1-8,y,8,height);
    front.lineStyle(3,0x202422,.85);
    for(let z=b.z0+45;z<b.z1;z+=110)front.lineBetween(x0,z-floor,x1,z-floor);
    for(const yy of[y+height*.25,y+height*.72]){
      front.fillStyle(0x202727,.9).fillRect(x0,yy,w,7);
      front.fillStyle(0x8a8b77,.6).fillCircle(x0+7,yy+3,1.5);
    }
    front.setDepth(b.z1+0.5);
  }

  drawPortcullis(v, x0, x1, yTop0, yTop1) {
    const { top, front, b } = v;
    const fy = b.z1; const h = b.top;
    // (the mine's: painted, ChatGPT 2026-11-26, sheared so it runs straight back across the
    // lane; its near post stands at x0 on the front edge, and its chain is the lift's, on up)
    const pk = artKey('mine', 'portcullis');
    if (this.mine && this.scene.textures.exists(pk)) {
      const s = this.scene;
      const k = h / 663; // (the near post is 663 px of the picture)
      v.art ??= s.add.image(0, 0, pk).setOrigin(0.077, 0.99);
      v.art.setPosition(x0, fy).setScale(k).setDepth(b.z1 + 0.5).setVisible(true);
      const ck = artKey('mine', 'lift_chain');
      if (s.textures.exists(ck)) {
        const cf = s.textures.getFrame(ck);
        const ax = x0 + (0.541 - 0.077) * v.art.displayWidth; const ay = fy - (0.99 - 0.169) * v.art.displayHeight;
        v.chains ??= [s.add.tileSprite(0, 0, cf.width, 10, ck).setOrigin(0.5, 1)];
        v.chains[0].setPosition(ax, ay + 6).setSize(cf.width, 700 / 0.26).setScale(0.26).setDepth(b.z1 + 0.45).setVisible(true);
      }
      top.setVisible(false); front.setVisible(false);
      return;
    }
    // seen side on it's a thin wall of bars down the whole lane, back to front
    for (let z = b.z0; z <= b.z1; z += 26) {
      front.fillStyle(COL.ironDark, 1).fillRect(x0, z - h, x1 - x0, 6);
      front.fillStyle(COL.ironRim, 0.8).fillRect(x0 + 4, z - h, 4, h);
      front.fillStyle(COL.iron, 1).fillRect(x0 + 12, z - h, 6, h);
    }
    front.fillStyle(COL.iron, 1).fillRect(x0, fy - h, x1 - x0, h * 0.04);
    for (let y = fy - h + 30; y < fy; y += 46) front.fillStyle(COL.ironDark, 1).fillRect(x0 - 2, y, x1 - x0 + 4, 7);
    front.fillStyle(0x8a7a5a, 0.9).fillRect((x0 + x1) / 2, fy - h - 500, 3, 500); // the chain
    top.setDepth(b.z0 - 0.5);
    front.setDepth(b.z1 + 0.5);
  }

  // A fall of rock choking a passage (the mine): boulders heaped to the roof; dug out
  // (gone) once its rubble prop in front is broken.
  drawRubble(v, x0, x1, yTop0, yTop1) {
    const { front, b } = v;
    // painted (assets/env/mine/rubble_wall.png, on magenta: cut out once): the whole fall of
    // boulders, from the floor in front up past the top of the wall, its own width
    if (this.scene.textures.exists('rubble-wall-src')) {
      if (!this.scene.textures.exists('rubble-wall')) this.scene.textures.addCanvas('rubble-wall', keyLayer(this.scene.textures.get('rubble-wall-src').getSourceImage(), 'magenta'));
      v.art ??= this.scene.add.image(0, 0, 'rubble-wall').setOrigin(0.5, 1);
      const h = b.top + (b.z1 - b.z0) + 30;
      const wide = Math.min(v.art.frame.width * (h / v.art.frame.height), x1 - x0 + 180); // (no wider than the wall and a spill each side)
      v.art.setPosition((x0 + x1) / 2, b.z1 + 8).setDisplaySize(wide, h).setDepth(b.z1 + 0.5).setVisible(true);
      front.clear();
      return;
    }
    let k = b.id * 97;
    const r = () => { k = (k * 9301 + 49297) % 233280; return k / 233280; };
    for (let i = 0; i < 46; i++) {
      const z = b.z0 + r() * (b.z1 - b.z0);
      const y = z - r() * b.top;
      const rad = 14 + r() * 26;
      front.fillStyle(r() < 0.5 ? COL.rockFront : COL.rockTop, 1).fillCircle(x0 + r() * (x1 - x0 + 40) - 20, y, rad);
    }
    front.setDepth(b.z1 + 0.5);
  }

  // The village's ground: a roof (shingles on top, a timber house front below), a fallen
  // beam (a narrow log), a cart, or charred boards over a burning cellar (glowing cracks:
  // they give way). The landing rim along the front edge is always the brightest line.
  drawVillageBlock(v, x0, x1, w, yTop0, yTop1) {
    const { top, front, b } = v;
    const painted = { cart: 'cartwreck', wreckage: 'prop-wreckage-broken' }[b.look];
    if (painted && this.scene.textures.exists(painted)) { this.drawPaintedBlock(v, x0, x1, painted); return; }
    if (b.look === 'mill' && this.drawMillFloor(v, x0, x1)) return;
    const narrow = b.z1 - b.z0 < 80;
    const base = this.supportTop(b);
    const overPit = !base && this.terrain.inPit((x0 + x1) / 2, b.z1 - 1);
    if (b.look === 'chimney') { this.drawChimney(v, x0, x1, w, yTop0, yTop1, b.top - base); return; }
    // (a narrow block is a beam only where it spans a cellar: the steps up to the boy are roofs)
    const mat = b.kind === 'crumble' ? 'board' : (narrow && overPit) || b.top <= 50 ? 'beam' : 'roof';
    const C = mat === 'board' ? [VIL.boardTop, VIL.boardRim, VIL.boardFront]
      : mat === 'beam' ? [VIL.beamTop, VIL.beamRim, VIL.beamFront] : [VIL.roofTop, VIL.roofRim, VIL.roofFront];
    const depth = yTop1 - yTop0;
    // painted tiles when they exist (the wood's fallen trees use its 'log', the village's 'beam')
    const art = { roof: ['roof_top', 'roof_front'], beam: this.village ? ['beam', 'beam'] : ['log', 'log'], board: ['board', null] }[mat];
    // (a roof's outline broken and chipped, shingles missing at its ends, not cut square)
    const bigRoof = mat === 'roof' && !base && depth > 60;
    const topArt = this.surface(v, 'top', art[0], x0, yTop0, w, depth, b.z0 - 0.6, bigRoof ? 11 : 5);
    if (!topArt) top.fillStyle(C[0], 1).fillRect(x0, yTop0, w, depth);
    if (topArt) {
      // (painted)
    } else if (mat === 'roof') {
      // shingle rows, darker toward the back
      top.fillStyle(0x000000, 0.25).fillRect(x0, yTop0, w, depth * 0.35);
      top.lineStyle(1, VIL.roofSeam, 1);
      for (let y = yTop0 + 12; y < yTop1 - 3; y += 14) top.lineBetween(x0, y, x1, y);
      for (let y = yTop0, row = 0; y < yTop1; y += 14, row++) {
        for (let x = x0 + (row % 2) * 12 + 8; x < x1; x += 24) top.lineBetween(x, y, x, Math.min(yTop1, y + 14));
      }
    } else if (mat === 'beam') {
      top.fillStyle(0x000000, 0.2);
      for (let y = yTop0 + 6; y < yTop1; y += 9) top.fillRect(x0, y, w, 2); // the grain
    } else {
      top.fillStyle(VIL.boardCrack, 0.8);
      for (let x = x0 + 14; x < x1; x += 17) top.fillRect(x, yTop0, 2, depth); // ember-lit cracks between the boards
    }
    // the edges, so you can tell where you can stand, in light and shade rather than drawn
    // lines: a soft dark falloff behind the back edge parts it from the backdrop, the walkable
    // top is warm with firelight and brightest toward the front lip where you land
    const fade = (g, x, y, ww, hh, color, a0, a1) => vFade(g, x, y, ww, hh, color, a0, a1);
    // (not behind a step standing on a roof, or a board: up against the sky or the veiled
    // backdrop it showed as a dark box floating there)
    // A roof has a ridge along its back and an eave board along its lip, running a little past
    // its ends (painted beam): built, not a box cut square out of the shingles
    const ridged = bigRoof && topArt && this.surface(v, 'ridge', 'beam', x0 - 10, yTop0 - 9, w + 20, 14, b.z0 - 0.55, 3);
    if (ridged) v.tiles.ridge.setTint(0x8a7060);
    // and fire running along the ridge, the length of the roof (view/RoofFire.js): behind
    // whoever stands on it, in front of the ridge beam (Nick, 2026-10-24)
    if (bigRoof && this.village) {
      if (v.fire === undefined) v.fire = roofFire(this.scene, x0 + 4, x1 - 4, yTop0 + 3, { height: 72, depth: b.z0 - 0.45, seed: Math.round(b.x0) });
      placeRoofFire(v.fire, x0 + 4, yTop0 + 3, true);
    }
    if (!base && mat !== 'board' && !ridged) fade(top, x0 - 4, yTop0 - 22, w + 8, 22, 0x000000, 0, 0.7);
    top.fillStyle(0xff9a50, 0.14).fillRect(x0, yTop0, w, depth);
    fade(top, x0, yTop0, w, Math.min(60, depth * 0.45), 0x000000, 0.5, 0);
    fade(top, x0, yTop1 - Math.min(40, depth * 0.45), w, Math.min(40, depth * 0.45), 0xffc890, 0, 0.3);
    this.shadeEnds(v, x0, x1, yTop0, yTop1);
    const down = mat === 'board' ? 12 : mat === 'beam' && overPit ? 18 : Math.max(0, b.top - base) + (overPit ? 120 : 0);
    const frontArt = art[1] && this.surface(v, 'front', art[1], x0, yTop1 + 1, w, down, b.z1 + 0.4, bigRoof ? 6 : 5);
    // the roof's slate edge hanging over the house front, and its two ends (painted gable
    // ends, the right one mirrored for the left): a house's roof, not a box of shingles
    // (Nick's level 1 review, 2026-11-03). Without the paintings, the old eave board.
    const slates = ridged && frontArt && this.surface(v, 'eave', 'eave', x0 - 12, yTop1 - 14, w + 24, 46, b.z1 + 0.45, 2);
    if (slates) { v.tiles.eave.setTint(0xd8ccc4); this.roofEnds(v, x0, x1, yTop0, yTop1, b); }
    else if (ridged && frontArt && this.surface(v, 'eave', 'beam', x0 - 10, yTop1 + 1, w + 20, 11, b.z1 + 0.45, 3)) v.tiles.eave.setTint(0x6a5040);
    if (!frontArt) front.fillStyle(C[2], 1).fillRect(x0, yTop1 + 1, w, down);
    if (frontArt) {
      // (painted)
    } else if (mat === 'roof') {
      // the house below: timber posts, a beam, a window with fire in it
      front.fillStyle(VIL.timber, 1);
      for (let x = x0; x < x1; x += 70) front.fillRect(x, yTop1 + 1, 6, down);
      front.fillRect(x0, yTop1 + Math.min(down - 4, 34), w, 5);
      if (down > 70) {
        front.fillStyle(0xff7a2a, 0.8);
        for (let x = x0 + 26; x < x1 - 30; x += 140) front.fillRect(x, yTop1 + 46, 18, 16);
      }
    } else if (mat === 'board') {
      // the stubs of the charred joists it rests on, burnt through below
      for (const jx of [x0 + 6, x1 - 13]) {
        front.fillStyle(VIL.timber, 1).fillTriangle(jx, yTop1 + 2, jx + 7, yTop1 + 2, jx + 3, yTop1 + 30);
        front.fillStyle(VIL.boardCrack, 0.9).fillCircle(jx + 3, yTop1 + 26, 2);
      }
    }
    // and the face below the lip falls into shadow, so the edge stands out against it
    fade(front, x0, yTop1 + 1, w, Math.min(30, down), 0x000000, 0.6, 0);
    // (a house front is in its own shadow, the roof above it in the firelight: the top you
    // stand on is always the lighter of the two)
    if (mat === 'roof') front.fillStyle(0x000000, 0.3).fillRect(x0, yTop1 + 1, w, down);
    // (its corners turn away into shadow and its foot sits in soot: no hard-cut sides)
    if (bigRoof && down > 40) {
      const cw = Math.min(22, w * 0.12);
      hFade(front, x0, yTop1 + 1, cw, down, 0x000000, 0.55, 0);
      hFade(front, x1 - cw, yTop1 + 1, cw, down, 0x000000, 0, 0.55);
      vFade(front, x0, yTop1 + down - 26, w, 26, 0x000000, 0, 0.5);
    }
    top.setDepth(b.z0 - 0.5);
    front.setDepth(b.z1 + 0.5);
  }

  // The top of whatever a block stands on: 0 for the floor, or another block's top (the
  // steps up to the boy stand on the second roof). Its front face comes down only that far:
  // drawn on down to the floor it hung over the roof in front of it, so whoever walked to
  // the back of the roof seemed to be walking up the side of a house.
  supportTop(b) {
    const cx = (b.x0 + b.x1) / 2;
    let top = 0;
    for (const o of this.terrain.blocks) if (o !== b && o.solid && o.top < b.top && this.terrain.inside(o, cx, b.z1 - 1)) top = Math.max(top, o.top);
    return top;
  }

  // An end of a walkable top with a drop past it (a cellar, a lower roof): the last stretch
  // of the top and of its face darkens into it, so you can see where your feet run out
  // without a drawn line. A wall or a higher roof past the end: nothing.
  shadeEnds(v, x0, x1, yTop0, yTop1) {
    const { top, front, b } = v;
    const zs = [b.z0 + 2, (b.z0 + b.z1) / 2, b.z1 - 2];
    const lower = (x) => zs.some((z) => this.terrain.groundAt(x, z) < b.top - 20);
    const W = Math.min(16, (x1 - x0) * 0.2);
    for (const [ex, dir] of [[x0, 1], [x1, -1]]) {
      if (!lower(ex - dir * 6)) continue;
      const xx = dir > 0 ? ex : ex - W; const [a0, a1] = dir > 0 ? [0.55, 0] : [0, 0.55];
      hFade(top, xx, yTop0, W, yTop1 - yTop0, 0x000000, a0, a1);
      hFade(front, xx, yTop1 + 1, W, Math.max(0, b.top - this.supportTop(b)) + 4, 0x000000, a0, a1);
    }
  }

  // A chimney stack on a roof (`look: 'chimney'`, a step up to the boy): soot-black stone
  // courses, a flat capstone lit by the fire where you land, its face as tall as the step.
  drawChimney(v, x0, x1, w, yTop0, yTop1, down) {
    const { top, front, b } = v;
    // painted (assets/env/village/chimney_<art>.png, cut out): the stack, its capstone the top
    // CAP px of the picture. The cap covers the top you stand on (back edge to front lip, so
    // wherever you stand on it you're on stone), the brick runs on down to the roof; the
    // picture a little wider than the block for the cap's overhang (the brick is ~80% of it)
    // (the dark capstone stack, chimney_cap.png, stands in for all three when it's in: their
    // own caps read pale, like snow, stretched over the top; Nick's second level 1 review)
    const capped = b.art && this.scene.textures.exists('village-chimney-cap');
    const tex = capped ? 'village-chimney-cap' : b.art && `village-chimney-${b.art}`;
    if (tex && this.scene.textures.exists(tex)) {
      const t = this.scene.textures.get(tex);
      const src = t.getSourceImage();
      const CAP = capped ? Math.round(src.height * 0.58) : 32;
      if (!t.has('cap')) { t.add('cap', 0, 0, 0, src.width, CAP); t.add('body', 0, 0, CAP, src.width, src.height - CAP); }
      const wide = w / 0.8; const cx = (x0 + x1) / 2;
      const capBot = yTop1 + 3;
      v.art ??= this.scene.add.image(0, 0, tex, 'body').setOrigin(0.5, 0);
      v.art.setPosition(cx, capBot - 2).setDisplaySize(wide, yTop1 + down + 3 - capBot + 2).setDepth(b.z1 + 0.5).setVisible(true);
      v.arts ??= [this.scene.add.image(0, 0, tex, 'cap').setOrigin(0.5, 0)];
      v.arts[0].setPosition(cx, yTop0 - 2).setDisplaySize(wide, capBot - yTop0 + 2).setDepth(b.z1 + 0.55).setVisible(true);
      if (capped) { v.art.setTint(0x9a8c86); v.arts[0].setTint(0x8a7e7a); } // (sooty, in the roof's shadow)
      top.fillStyle(0x000000, 0.35).fillEllipse(cx, yTop1 + down + 2, wide + 10, 10);
      top.setDepth(b.z0 - 0.5);
      return;
    }
    const depth = yTop1 - yTop0;
    // the capstone: one slab, a crack or two, sooted toward the back, lit at the lip
    top.fillStyle(0x6a5e54, 1).fillRect(x0, yTop0, w, depth);
    top.lineStyle(1, 0x2a2420, 0.9).lineBetween(x0 + w * 0.35, yTop0, x0 + w * 0.42, yTop0 + depth * 0.6).lineBetween(x0 + w * 0.72, yTop0 + depth * 0.3, x1, yTop0 + depth * 0.45);
    vFade(top, x0, yTop0, w, depth * 0.5, 0x000000, 0.5, 0);
    vFade(top, x0, yTop1 - 12, w, 12, 0xffc890, 0, 0.32);
    // the stack's face: stone courses, sooted, darkening down to the roof
    front.fillStyle(0x2c2420, 1).fillRect(x0, yTop1 + 1, w, down);
    for (let y = yTop1 + 1, row = 0; y < yTop1 + down; y += 9, row++) {
      for (let x = x0 + (row % 2 ? -8 : 0); x < x1; x += 16) {
        const xa = Math.max(x0, x + 1); const xb = Math.min(x1, x + 15);
        front.fillStyle(row % 3 === 1 ? 0x3e3430 : 0x463a34, 1).fillRect(xa, y + 1, xb - xa, Math.min(7, yTop1 + down - y - 1));
      }
    }
    front.fillStyle(0x000000, 0.6).fillRect(x0, yTop1 + 1, w, 4);
    front.fillStyle(0x000000, 0.35).fillRect(x1 - 6, yTop1 + 1, 6, down);
    top.setDepth(b.z0 - 0.5);
    front.setDepth(b.z1 + 0.5);
  }

  // Painted wreckage to hop in the village, in place of a box: `look` 'cart', a wrecked hay
  // cart (prop_cart.png, its whole half: the fire hazards burn the same cart), a second one
  // behind it, turned the other way, on a deep block; 'wreckage', a heap of charred
  // timbers and rubble (prop_wreckage.png, its burnt-out half, the smoke cropped off): one heap
  // per 50 of depth, every other one smaller and set aside. A little wider than the block, so it reads.
  // (The gates' burned ram, `look` 'ram', stands like a cart: whole, one per block.)
  drawPaintedBlock(v, x0, x1, tex) {
    const { top, b } = v;
    const s = this.scene;
    const frame = s.textures.getFrame(tex);
    const cart = b.look === 'cart' || b.look === 'ram' || b.look === 'orecart';
    const painted = frame.width > 200; // (else the small code cart, StageView)
    const n = cart ? (b.z1 - b.z0 > 120 ? 2 : 1) : Math.max(1, Math.round((b.z1 - b.z0) / 50)); // (a heap or two, never a stamped row)
    const wide = x1 - x0 + (cart ? 70 : 60); const cx = (x0 + x1) / 2;
    v.arts ??= [];
    for (let i = 0; i < n; i++) {
      const z = cart || n === 1 ? b.z0 + ((b.z1 - b.z0) * (i + 1)) / n : b.z0 + 16 + ((b.z1 - b.z0 - 16) * i) / (n - 1);
      // (a block can place its copies by hand, `artLayout`: [{ dx, k, tilt, flip }] per copy)
      const lay = b.artLayout?.[i] ?? {};
      const flip = lay.flip ?? b.artFlip ?? (cart ? i !== n - 1 : i % 2 === 1);
      const dx = lay.dx ?? (cart ? 0 : (i % 2 ? 16 : -10));
      const k = lay.k ?? (cart ? 1 : 1 - 0.18 * (i % 2)); // (the second heap smaller, set off to the side)
      // (a soft pool of shadow and grit where it meets the street: view/propGround.js)
      v.grounds ??= [];
      v.grounds[i] ??= groundUnder(s, cx + dx + 4, z - 2, wide * 0.8 * k, z + 0.5, { seed: b.id * 7 + i, deep: cart ? 1.2 : 1 });
      moveGround(v.grounds[i], cx + dx + 4, z - 2);
      const img = v.arts[i] ??= s.add.image(0, 0, tex).setOrigin(0.5, painted ? 0.97 : 1);
      if (!cart) img.setCrop(0, frame.height * 0.42, frame.width, frame.height * 0.58);
      img.setPosition(cx + dx, z + 4).setScale((wide * k) / frame.width).setFlipX(flip).setAngle(lay.tilt ?? 0).setDepth(z + 0.5).setVisible(true);
    }
    top.setDepth(b.z0 - 0.5);
  }

  // The mill's raised floor (`look: 'mill'`), painted (assets/env/village/mill_floor.png, on
  // magenta): one picture of the platform, deck and front, as wide as the block and standing
  // on its front edge. False until it's painted (then it's drawn as a roof, like the others).
  drawMillFloor(v, x0, x1) {
    const s = this.scene;
    if (!s.textures.exists('village-mill-src')) return false;
    if (!s.textures.exists('village-mill')) s.textures.addCanvas('village-mill', keyLayer(s.textures.get('village-mill-src').getSourceImage(), 'magenta'));
    const { top, front, b } = v;
    const tex=s.textures.get('village-mill');
    if(!tex.has('deck')) {
      const src=tex.getSourceImage();
      // Trim transparent export padding in the texture frame, preserving source alpha.
      tex.add('deck',0,0,Math.round(src.height*.26),src.width,Math.round(src.height*.58));
    }
    v.art ??= s.add.image(0, 0, 'village-mill','deck').setOrigin(0.5, 1);
    v.art.setPosition((x0 + x1) / 2, b.z1).setDisplaySize(x1-x0,b.z1-b.z0+b.top).setDepth(b.z0-.1).setVisible(true);
    top.fillStyle(0x000000, 0.35).fillEllipse((x0 + x1) / 2, b.z1, x1 - x0 + 30, 18);
    top.setDepth(b.z0 - 0.5);
    front.setVisible(false);
    return true;
  }

  // ------------------------------------------------------------ landmarks

  drawLanterns(list) {
    const s = this.scene;
    for (const l of list) {
      const y0 = l.z - Math.max(0, this.terrain?.groundAt(l.x, l.z) ?? 0);
      const g = s.add.graphics().setDepth(l.z - 0.2);
      // the painted torch post (the village: an iron cresset on a timber post, unlit) or iron
      // brazier (the gates), on magenta: cut out once; the living flame (view/TorchFlame.js)
      // burns in its cup, with a glow round it
      // (the mine: the same iron brazier as the gates, not the wood's green lantern pole: level 3 review)
      // (the Black Keep: the same iron brazier, burning the King's cold violet fire: level 6 review)
      const keep = this.theme === 'keep';
      const post = this.village ? 'village-torch' : (this.theme === 'gates' || this.theme === 'ascent' || this.mine || keep) ? 'gates-brazier' : null;
      if (post && s.textures.exists(`${post}-src`)) {
        if (!s.textures.exists(post)) s.textures.addCanvas(post, keyLayer(s.textures.get(`${post}-src`).getSourceImage(), 'magenta'));
        const img = s.add.image(l.x, y0 + 3, post).setOrigin(0.5, 0.98).setDepth(l.z - 0.2);
        img.setScale(TORCH_H / img.height);
        const cup = y0 - TORCH_H * (this.village ? TORCH_CUP : BRAZIER_CUP);
        torchFlame(s, l.x, cup, { height: 30, depth: l.z - 0.15, tint: keep ? 0xa890ff : null });
        const glow = s.add.image(l.x, cup - 12, 'glow').setScale(2.2).setTint(keep ? 0xa88aff : COL.lantern).setAlpha(0.45).setBlendMode(Phaser.BlendModes.ADD).setDepth(l.z - 0.1);
        s.tweens.add({ targets: glow, alpha: { from: 0.3, to: 0.55 }, duration: 260 + (l.x % 200), yoyo: true, repeat: -1 });
        continue;
      }
      if (this.village) {
        // a torch on a post (until its painting is in)
        g.fillStyle(0x1a1410, 1).fillRect(l.x - 2, y0 - 70, 4, 70);
        torchFlame(s, l.x, y0 - 70, { height: 34, depth: l.z - 0.1 });
        s.add.image(l.x, y0 - 80, 'glow').setScale(2.2).setTint(COL.lantern).setAlpha(0.5).setBlendMode(Phaser.BlendModes.ADD).setDepth(l.z - 0.1);
        continue;
      }
      if (s.textures.exists('lantern-src')) {
        // the painted lantern post (assets/env/lantern.png, on magenta: cut out once); its
        // lantern hangs at LANTERN_AT of the picture, where the cold light is
        if (!s.textures.exists('lantern')) s.textures.addCanvas('lantern', keyLayer(s.textures.get('lantern-src').getSourceImage(), 'magenta'));
        const k = LANTERN_H / 400;
        s.add.image(l.x, y0 + 3, 'lantern').setOrigin(0.5, 0.98).setScale(k).setDepth(l.z - 0.2);
        const lx = l.x + (LANTERN_AT[0] - 150) * k; const ly = y0 + 3 - (392 - LANTERN_AT[1]) * k;
        const glow = s.add.image(lx, ly, 'glow').setScale(2).setTint(0xb8ffd8).setAlpha(0.45).setBlendMode(Phaser.BlendModes.ADD).setDepth(l.z - 0.1);
        s.tweens.add({ targets: glow, alpha: { from: 0.32, to: 0.5 }, duration: 900 + (l.x % 400), yoyo: true, repeat: -1 });
        continue;
      }
      g.fillStyle(0x1a1410, 1).fillRect(l.x - 2, y0 - 96, 4, 96);
      g.fillRect(l.x - 2, y0 - 96, 18, 3);
      g.fillStyle(COL.lantern, 1).fillRect(l.x + 10, y0 - 90, 10, 14);
      s.add.image(l.x + 15, y0 - 84, 'glow').setScale(2.4).setTint(COL.lantern).setAlpha(0.55)
        .setBlendMode(Phaser.BlendModes.ADD).setDepth(l.z - 0.1);
    }
  }

  drawRests() {
    const s = this.scene;
    this.restGlows = [];
    for (const sec of this.stage.sections) {
      const r = sec.rest;
      if (!r) continue;
      // (a solid shrine stands on its own footprint: the ground it stands on is just in front)
      const y0 = r.z - Math.max(0, this.terrain?.groundAt(r.x, r.solid ? r.z + 20 : r.z) ?? 0);
      if (r.kind === 'oath' && s.textures.exists('shrine-oath-src')) {
        // the painted OATH SHRINE (assets/env/shrine_oath.png, on magenta: cut out once)
        if (!s.textures.exists('shrine-oath')) s.textures.addCanvas('shrine-oath', keyLayer(s.textures.get('shrine-oath-src').getSourceImage(), 'magenta'));
        s.add.image(r.x, y0 + 4, 'shrine-oath').setOrigin(0.5, 0.985).setScale(SHRINE_H / 512).setDepth(r.z - 0.3);
        const glow = s.add.image(r.x + 2, y0 - SHRINE_H * 0.6, 'glow').setScale(2.6).setTint(VIL.oath).setAlpha(0.4)
          .setBlendMode(Phaser.BlendModes.ADD).setDepth(r.z - 0.2);
        this.restGlows.push(glow);
        s.tweens.add({ targets: glow, alpha: { from: 0.2, to: 0.5 }, duration: 1300, yoyo: true, repeat: -1 });
        continue;
      }
      const g = s.add.graphics().setDepth(r.z - 0.3);
      if (r.kind === 'oath') {
        // an OATH SHRINE: a standing stone with the oath's mark cut in it, candles, a cold light
        g.fillStyle(0x3a3e44, 1).fillRect(r.x - 34, y0 - 10, 68, 10);
        g.fillStyle(VIL.oathStone, 1).fillRect(r.x - 18, y0 - 78, 36, 70);
        g.fillTriangle(r.x - 18, y0 - 78, r.x + 18, y0 - 78, r.x, y0 - 92);
        g.fillStyle(0x4a5058, 1).fillRect(r.x + 10, y0 - 78, 8, 70);
        g.lineStyle(3, VIL.oath, 0.9).lineBetween(r.x, y0 - 70, r.x, y0 - 30).lineBetween(r.x - 10, y0 - 58, r.x + 10, y0 - 58).strokeCircle(r.x, y0 - 44, 7);
        g.fillStyle(0xf0e0c0, 1).fillRect(r.x - 30, y0 - 22, 4, 12).fillRect(r.x + 26, y0 - 22, 4, 12);
        const glow = s.add.image(r.x, y0 - 50, 'glow').setScale(3).setTint(VIL.oath).setAlpha(0.5)
          .setBlendMode(Phaser.BlendModes.ADD).setDepth(r.z - 0.2);
        this.restGlows.push(glow);
        s.tweens.add({ targets: glow, alpha: { from: 0.3, to: 0.65 }, duration: 1300, yoyo: true, repeat: -1 });
        continue;
      }
      // a blood altar: a slab, a basin, a candle each side (temporary art)
      g.fillStyle(0x2a1a1a, 1).fillRect(r.x - 30, y0 - 34, 60, 34);
      g.fillStyle(0x4a2a2a, 1).fillRect(r.x - 36, y0 - 40, 72, 8);
      g.fillStyle(0x8a0a0a, 1).fillRect(r.x - 18, y0 - 46, 36, 6);
      g.fillStyle(0xf0e0c0, 1).fillRect(r.x - 32, y0 - 54, 4, 14).fillRect(r.x + 28, y0 - 54, 4, 14);
      const glow = s.add.image(r.x, y0 - 40, 'glow').setScale(3).setTint(COL.shrine).setAlpha(0.5)
        .setBlendMode(Phaser.BlendModes.ADD).setDepth(r.z - 0.2);
      this.restGlows.push(glow);
      s.tweens.add({ targets: glow, alpha: { from: 0.3, to: 0.65 }, duration: 1100, yoyo: true, repeat: -1 });
    }
  }

  // the roost's crow-cage: a violet glint you can see from the ledge below (Gallows only:
  // elsewhere it hung in mid-air beside any raised secret, a stray violet line by the chimney urn)
  drawRoostCue() {
    const secret = this.stage.props.find((p) => p.secret && p.y > 100);
    if (!secret) return;
    const s = this.scene;
    const y0 = secret.z - secret.y;
    const g = s.add.graphics().setDepth(secret.z - 0.4);
    g.lineStyle(2, 0x9aa0a8, 1).strokeRect(secret.x + 30, y0 - 70, 26, 34);
    g.lineBetween(secret.x + 43, y0 - 70, secret.x + 43, y0 - 140);
    const glow = s.add.image(secret.x + 43, y0 - 52, 'glow').setScale(2).setTint(COL.secret).setAlpha(0.6)
      .setBlendMode(Phaser.BlendModes.ADD).setDepth(secret.z - 0.3);
    s.tweens.add({ targets: glow, alpha: { from: 0.35, to: 0.8 }, duration: 800, yoyo: true, repeat: -1 });
  }

  // ------------------------------------------------------------ events and per frame

  listen() {
    const ev = this.scene.world.events;
    ev.on('plankCreak', ({ block: b }) => {
      playSfx(this.scene, 'block', { volume: 0.35, pitch: -1400, minGapMs: 60 });
      this.dust(b, 6);
    });
    ev.on('plankFall', ({ block: b }) => {
      playSfx(this.scene, 'kick', { volume: 0.6, pitch: -900, minGapMs: 0 });
      this.dust(b, 18);
    });
    // going over: a scream, never the same one twice running — or, into water, a splash
    ev.on('pitDrop', ({ fighter }) => {
      if (this.water) { playSplash(this.scene); return; }
      if (this.scene.fallScream) { this.scene.fallScream(fighter); return; } // (shared with thrown men: scenes/ArenaScene.js)
      const keys = ['fallScream1', 'fallScream2', 'fallScream3'].filter((k) => k !== this.lastScream);
      this.lastScream = keys[Math.floor(Math.random() * keys.length)];
      playSfx(this.scene, this.lastScream, { volume: 0.9, spread: 60, minGapMs: 0 });
    });
    ev.on('pitFall', ({ fighter }) => {
      if (fighter.team === 'player') {
        this.scene.callout('FELL!', '#9ac0ff', 22);
        this.scene.fx?.shake(3, 10);
      }
    });
  }

  dust(b, n) {
    const gore = this.scene.gore;
    for (let i = 0; i < n; i++) {
      gore.spawn({
        x: b.x0 + Math.random() * (b.x1 - b.x0), z: b.z1, h: b.top - 2, vx: (Math.random() - 0.5) * 60, vz: 0, vh: -Math.random() * 60,
        tint: 0x8a6a4a, texture: 'px', scale: 0.8 + Math.random(), decal: false, life: 40 + Math.random() * 30,
      });
    }
  }

  update() {
    this.backdrop?.update();
    for (const v of this.blockGfx.values()) if (v.b.kind !== 'block' || v.b.tag) this.drawBlock(v);
  }
}
