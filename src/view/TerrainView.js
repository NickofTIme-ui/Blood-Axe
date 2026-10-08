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

import { SETTINGS } from '../config/settings.js';
import { DEPTH } from './depths.js';
import { playSfx, playSplash } from '../core/Sfx.js';
import { VillageBackdrop } from './VillageView.js';
import { WoodBackdrop } from './WoodView.js';
import { MineBackdrop } from './MineView.js';
import { AscentBackdrop } from './AscentView.js';
import { GatesBackdrop } from './GatesView.js';
import { artKey } from './levelArt.js';
import { LEVEL_ART } from '../data/levelArt.js';
import { keyLayer } from './envArt.js';

// the painted oath shrine is drawn this tall (about twice a man)
const SHRINE_H = 170;
// the painted lantern post: drawn this tall; its lantern at this point of the 300x400 picture
const LANTERN_H = 150;
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
function raggedRect(x, y, w, h, seed, straight) {
  const a = Math.max(0, Math.min(5, w * 0.08, h * 0.12));
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
    this.water = this.wood || this.mine;
    this.theme = data.theme;
    this.drawFloor();
    this.drawPits();
    this.blockGfx = new Map();
    for (const b of this.terrain?.blocks ?? []) this.blockGfx.set(b.id, this.makeBlock(b));
    this.drawLanterns(data.lanterns ?? []);
    this.drawRests();
    this.drawRoostCue();
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
    const far = s.add.graphics().setDepth(DEPTH.far).setScrollFactor(0.25, 0.6);
    ridge(far, 230, 150, 90, 7, COL.cliffFar, true);
    const mid = s.add.graphics().setDepth(DEPTH.far + 2).setScrollFactor(0.5, 0.8);
    ridge(mid, 270, 110, 70, 21, COL.cliffMid, false);
    // mist bands
    for (let i = 0; i < 3; i++) {
      s.add.rectangle(-pad, 170 + i * 50, W + pad * 2, 30, COL.mist, 0.05 + i * 0.02).setOrigin(0)
        .setDepth(DEPTH.far + 3).setScrollFactor(0.6 + i * 0.1, 0.85);
    }
    // the cliff face behind the lane (what the ledges are cut from)
    // (a low wall of rock: above it the sky and the far cliffs show)
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

  drawPits() {
    const s = this.scene;
    for (const p of this.terrain?.pits ?? []) {
      const g = s.add.graphics().setDepth(DEPTH.floor + 4);
      g.fillStyle(this.water ? 0x0c1820 : 0x000000, 1).fillRect(p.x0, p.z0 - (p.z0 <= SETTINGS.world.floorTop ? 50 : 0), p.x1 - p.x0, p.z1 - p.z0 + (p.z0 <= SETTINGS.world.floorTop ? 50 : 0) + 40);
      // a cold glow at the lip so the edge reads (in the village: a burning cellar, its fire far
      // down; in the wood: a stream, black water running fast)
      const paintedWater = this.water && s.textures.exists('water-src');
      if (paintedWater) {
        g.clear(); // (the painted water alone, its banks worn: no dark box or ruled edges round it)
        // the painted stream (assets/env/water.png, a seamless tile): it runs toward the camera
        const top = p.z0 - (p.z0 <= SETTINGS.world.floorTop ? 50 : 0);
        const ws = s.add.tileSprite(p.x0, top, p.x1 - p.x0, p.z1 + 40 - top, 'water-src').setOrigin(0).setTileScale(0.32).setDepth(DEPTH.floor + 4.1);
        const wm = s.make.graphics({ add: false }).fillStyle(0xffffff, 1).fillPoints(raggedRect(p.x0, top, p.x1 - p.x0, p.z1 + 40 - top, p.x0, 'none'), true);
        ws.setMask(wm.createGeometryMask()); // (its banks worn, not ruled)
        s.tweens.add({ targets: ws, tilePositionY: -1024, duration: 9000, repeat: -1 });
        s.tweens.add({ targets: ws, tilePositionX: { from: 0, to: 18 }, duration: 2600, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
      } else if (this.water) {
        // (it runs down out of the trees at the back and on toward the camera)
        g.lineStyle(1, 0x3a5a70, 0.5);
        for (let y = p.z0 - 40; y < p.z1 + 30; y += 18) g.lineBetween(p.x0 + 6, y, p.x1 - 6, y + 4);
        g.fillStyle(0x6a8aa0, 0.25).fillRect(p.x0, p.z0 - 50, p.x1 - p.x0, 6);
      }
      if (this.village) {
        s.add.image((p.x0 + p.x1) / 2, p.z1 + 30, 'glow').setDisplaySize(p.x1 - p.x0, 90).setTint(VIL.cellarLip).setAlpha(0.45)
          .setBlendMode(Phaser.BlendModes.ADD).setDepth(DEPTH.floor + 4.2);
      }
      if (!paintedWater) g.lineStyle(2, this.village ? VIL.cellarLip : 0x6a8aa8, 0.6);
      if (!paintedWater) g.lineBetween(p.x0, p.z0, p.x0, p.z1 + 40);
      if (!paintedWater) g.lineBetween(p.x1, p.z0, p.x1, p.z1 + 40);
      if (!paintedWater && p.z0 > SETTINGS.world.floorTop) g.lineBetween(p.x0, p.z0, p.x1, p.z0);
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
    if (!b.solid) {
      v.top.setVisible(false); v.front.setVisible(false);
      return;
    }
    v.top.setVisible(true); v.front.setVisible(true);
    // a log bridge over the water: its walkway is the bark tile as before, and its front the
    // painted fallen tree (assets/env/bridge_log.png), roots and broken end past the banks
    if (b.mat === 'log' && this.terrain.inPit((x0 + x1) / 2, b.z1 - 1) && paintedLog(this.scene)) {
      v.art ??= this.scene.add.image(0, 0, 'bridge-log').setOrigin(0.5, LOG_FIT.walk);
      const lw = (x1 - x0) * LOG_FIT.wide;
      v.art.setPosition((x0 + x1) / 2, yTop1 - 4).setScale(lw / v.art.frame.width).setDepth(b.z1 + 0.6).setVisible(true);
    }
    if (b.mat === 'iron' && b.kind === 'block') { this.drawPortcullis(v, x0, x1, yTop0, yTop1); return; }
    if (b.mat === 'rubble') { this.drawRubble(v, x0, x1, yTop0, yTop1); return; }
    if (this.village || (this.water && b.mat === 'log')) { this.drawVillageBlock(v, x0, x1, w, yTop0, yTop1); return; } // (the wood's fallen trees: as the village's beams)
    const mat = b.kind === 'crumble' ? 'plank' : b.kind === 'lift' ? 'iron' : 'rock';
    const C = mat === 'plank' ? [COL.plankTop, COL.plankRim, COL.plankFront]
      : mat === 'iron' ? [COL.iron, COL.ironRim, COL.ironDark] : [COL.rockTop, COL.rockRim, COL.rockFront];
    // top face (where you stand): the lightest surface around (painted, when its tile exists)
    const topArt = mat !== 'iron' && this.surface(v, 'top', mat === 'plank' ? 'plank' : 'rock_top', x0, yTop0, w, yTop1 - yTop0, b.z0 - 0.6);
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
    if (!topArt) raggedLine(top, x0, x1, yTop0, C[1], 0.75, 2, b.x0);
    // the landing rim along the front edge
    raggedLine(front, x0, x1, yTop1 - 0.5, C[1], 0.9, 3, b.x0 + 7);
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
      // hung on two ropes from above
      front.fillStyle(0x8a7a5a, 0.9).fillRect(x0 + 6, yTop1 - 400, 2, 400).fillRect(x1 - 8, yTop1 - 400, 2, 400);
    }
    top.setDepth(b.z0 - 0.5);
    front.setDepth(b.z1 + 0.5);
  }

  // A painted surface tile (data/levelArt.js `surfaces`) over one face of a block, lined up
  // with the world so neighbouring blocks continue each other. False if it isn't painted.
  surface(v, slot, name, x, y, w, h, depth) {
    const key = artKey(this.theme, `surf-${name}`);
    if (!name || w <= 0 || h <= 0 || !this.scene.textures.exists(key)) return false;
    const conf = LEVEL_ART[this.theme]?.surfaces?.[name] ?? {};
    v.tiles ??= {};
    const t = v.tiles[slot] ??= this.scene.add.tileSprite(0, 0, 1, 1, key).setOrigin(0);
    const img = this.scene.textures.get(key).getSourceImage();
    const sc = (conf.fit ? h : conf.px ?? 128) / img.height;
    t.setPosition(x, y).setSize(w, h).setDisplaySize(w, h).setTileScale(sc, sc).setDepth(depth).setVisible(true);
    t.tilePositionX = x / sc;
    // its outline worn and chipped (a mask), not a ruled rectangle
    v.masks ??= {};
    let m = v.masks[slot];
    if (!m) { m = v.masks[slot] = this.scene.make.graphics({ add: false }); t.setMask(m.createGeometryMask()); }
    m.clear().fillStyle(0xffffff, 1).fillPoints(raggedRect(x, y, w, h, Math.round(v.b.x0) + (slot === 'top' ? 0 : 11), slot === 'top' ? 'bottom' : 'top'), true);
    return true;
  }

  // A portcullis (the mine): a tall iron grille across the lane, its chain running up out
  // of sight to the counterweight; gone (raised) once that's broken (Stage.openWay).
  drawPortcullis(v, x0, x1, yTop0, yTop1) {
    const { top, front, b } = v;
    const fy = b.z1; const h = b.top;
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
    const narrow = b.z1 - b.z0 < 80;
    const mat = b.kind === 'crumble' ? 'board' : narrow || b.top <= 50 ? 'beam' : 'roof';
    const C = mat === 'board' ? [VIL.boardTop, VIL.boardRim, VIL.boardFront]
      : mat === 'beam' ? [VIL.beamTop, VIL.beamRim, VIL.beamFront] : [VIL.roofTop, VIL.roofRim, VIL.roofFront];
    const depth = yTop1 - yTop0;
    // painted tiles when they exist (the wood's fallen trees use its 'log', the village's 'beam')
    const art = { roof: ['roof_top', 'roof_front'], beam: this.village ? ['beam', 'beam'] : ['log', 'log'], board: ['board', null] }[mat];
    const topArt = this.surface(v, 'top', art[0], x0, yTop0, w, depth, b.z0 - 0.6);
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
    if (!topArt) raggedLine(top, x0, x1, yTop0, C[1], 0.75, 2, b.x0);
    raggedLine(front, x0, x1, yTop1 - 0.5, C[1], 0.9, 3, b.x0 + 7);
    const overPit = this.terrain.inPit((x0 + x1) / 2, b.z1 - 1);
    const down = mat === 'board' ? 12 : mat === 'beam' && overPit ? 18 : Math.max(0, b.top) + (overPit ? 120 : 0);
    const frontArt = art[1] && this.surface(v, 'front', art[1], x0, yTop1 + 1, w, down, b.z1 + 0.4);
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
      // hung over the dark on charred joists
      front.fillStyle(VIL.timber, 1).fillRect(x0 + 6, yTop1 + 2, 5, 90).fillRect(x1 - 11, yTop1 + 2, 5, 90);
    }
    top.setDepth(b.z0 - 0.5);
    front.setDepth(b.z1 + 0.5);
  }

  // ------------------------------------------------------------ landmarks

  drawLanterns(list) {
    const s = this.scene;
    for (const l of list) {
      const y0 = l.z - Math.max(0, this.terrain?.groundAt(l.x, l.z) ?? 0);
      const g = s.add.graphics().setDepth(l.z - 0.2);
      if (this.village) {
        // a torch on a post
        g.fillStyle(0x1a1410, 1).fillRect(l.x - 2, y0 - 70, 4, 70);
        s.add.image(l.x, y0 - 74, 'flame').setOrigin(0.5, 1).setScale(0.5, 0.7).setTint(COL.lantern).setBlendMode(Phaser.BlendModes.ADD).setDepth(l.z - 0.1);
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
      const y0 = r.z - Math.max(0, this.terrain?.groundAt(r.x, r.z) ?? 0);
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

  // the roost's crow-cage: a violet glint you can see from the ledge below
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
    ev.on('pitDrop', () => {
      if (this.water) { playSplash(this.scene); return; }
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
