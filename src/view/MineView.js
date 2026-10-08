// MineView.js — HOLLOW MOUNTAIN's backdrop (campaign level 3, data/stageMine.js). ALL
// TEMPORARY ART, drawn in code; the painted replacements (data/levelArt.js 'mine') take over
// piece by piece as they're saved.
//
// Its colours: black rock lit warm by torches, timber props, rails; cold blue water and
// blue ore glinting in the walls; at the very end, grey daylight and the Black Keep across
// the gorge (the far side).
//
// Back to front: the dark of the mountain (a rock ceiling, far galleries with their own
// torches), rock pillars nearer, the wall behind the lane (rough rock, timber frames, ore
// veins, the crusher hall's furnace glow), then the floor. The far side's daylight is cut
// into all of it.

import { SETTINGS } from '../config/settings.js';
import { DEPTH } from './depths.js';
import { drawCastle } from './castle.js';
import { PaintedLevel } from './levelArt.js';

const COL = {
  dark: 0x050608, rockFar: 0x0e1014, rockMid: 0x16181d, rock: 0x1f2228, rockLit: 0x3a3430,
  timber: 0x2a1c12, timberLit: 0x4a3420, rail: 0x5a5a60,
  ore: 0x5ab0ff, torch: 0xffa850, furnace: 0xff5a20,
  floor: 0x1a1b1f, floorLine: 0x121316,
  day: 0xb8c4cc, dayLow: 0x6a7a88,
};

function rng(seed) {
  let k = seed;
  return () => { k = (k * 9301 + 49297) % 233280; return k / 233280; };
}

export class MineBackdrop {
  constructor(scene, stage) {
    this.scene = scene;
    this.stage = stage;
    this.data = stage.data;
    this.width = this.data.width;
    this.flickers = [];
    this.drips = [];
    const art = this.art = new PaintedLevel(scene, 'mine', this.width);
    const far = this.data.sections.find((s) => s.id === 'far');
    this.dayX = far ? far.x0 : this.width + 1000; // (where the mountain opens on daylight)
    if (art.has('sky')) art.layer('sky', DEPTH.sky); else this.drawDark();
    if (art.has('far')) art.layer('far', DEPTH.far - 1); else this.drawGalleries();
    if (art.has('mid')) art.layer('mid', DEPTH.far + 2); else this.drawPillars();
    if (art.has('wall')) art.wall(); else this.drawWall();
    if (art.has('ground')) art.ground(); else this.drawFloor();
    this.drawDaylight();
    this.drawSetPieces();
  }

  get pad() { return SETTINGS.width * 2; }

  // the dark of the mountain: a rock ceiling over everything
  drawDark() {
    const s = this.scene;
    const g = s.add.graphics().setDepth(DEPTH.sky).setScrollFactor(0.1, 0.4);
    g.fillStyle(COL.dark, 1).fillRect(-this.pad, -700, SETTINGS.width + this.pad * 2 + this.width * 0.1, SETTINGS.height + 900);
    const r = rng(3);
    g.fillStyle(COL.rockFar, 1);
    for (let x = -this.pad; x < SETTINGS.width + this.pad + this.width * 0.1; x += 40 + r() * 50) {
      g.fillTriangle(x, -40, x + 50 + r() * 40, -40, x + 25, 30 + r() * 70); // stalactites
    }
  }

  // far galleries: dark openings at different heights, a few with a torch far off
  drawGalleries() {
    const s = this.scene;
    const g = s.add.graphics().setDepth(DEPTH.far - 1).setScrollFactor(0.25, 0.7);
    const r = rng(9);
    const span = SETTINGS.width + this.width * 0.25 + this.pad;
    g.fillStyle(COL.rockFar, 1).fillRect(-this.pad, 60, span + this.pad, 260);
    for (let x = -this.pad / 2; x < span; x += 120 + r() * 160) {
      const y = 110 + r() * 110; const w = 30 + r() * 40; const h = 40 + r() * 30;
      g.fillStyle(COL.dark, 1).fillRect(x, y, w, h);
      g.fillStyle(COL.timber, 1).fillRect(x - 4, y - 4, w + 8, 5).fillRect(x - 4, y, 5, h).fillRect(x + w - 1, y, 5, h);
      if (r() < 0.4) {
        const t = s.add.image(x + w / 2, y + h * 0.5, 'glow').setScale(0.9).setTint(COL.torch).setAlpha(0.5)
          .setBlendMode(Phaser.BlendModes.ADD).setDepth(DEPTH.far - 0.5).setScrollFactor(0.25, 0.7);
        this.flickers.push({ img: t, base: 0.45, amp: 0.15, rate: 0.12 + r() * 0.1 });
      }
    }
  }

  // nearer rock: pillars left standing by the miners, timber-braced, glinting with ore
  drawPillars() {
    const s = this.scene;
    const g = s.add.graphics().setDepth(DEPTH.far + 2).setScrollFactor(0.5, 0.85);
    const r = rng(17);
    const span = SETTINGS.width + this.width * 0.5 + this.pad;
    for (let x = -this.pad / 2; x < span; x += 200 + r() * 220) {
      const w = 50 + r() * 60;
      g.fillStyle(COL.rockMid, 1).fillRect(x, -100, w, 420);
      g.fillStyle(COL.rock, 1).fillRect(x + w - 8, -100, 8, 420);
      g.fillStyle(COL.timber, 1).fillRect(x - 10, 150 + r() * 80, w + 20, 10);
      if (r() < 0.6) g.fillStyle(COL.ore, 0.6).fillRect(x + r() * w, 60 + r() * 200, 4, 6);
    }
  }

  // the wall behind the lane: rough rock, timber frames every so often, rails, ore veins
  drawWall() {
    const s = this.scene;
    const top = SETTINGS.world.floorTop - 50;
    const g = s.add.graphics().setDepth(DEPTH.floor - 1);
    const r = rng(41);
    const end = Math.min(this.width, this.dayX);
    g.fillStyle(COL.rock, 1).fillRect(0, top - 330, end, 340);
    // the rock's face: broken into slabs
    for (let x = 0; x < end; x += 30 + r() * 50) {
      g.fillStyle(r() < 0.5 ? COL.rockMid : COL.rockLit, 0.5).fillRect(x, top - 330 + r() * 300, 20 + r() * 40, 10 + r() * 30);
    }
    // timber frames (a beam across, two posts) and the blue ore in the seams
    for (let x = 80; x < end; x += 260 + r() * 140) {
      g.fillStyle(COL.timber, 1).fillRect(x, top - 200, 16, 200).fillRect(x + 150, top - 200, 16, 200).fillRect(x - 10, top - 210, 186, 16);
      g.fillStyle(COL.timberLit, 1).fillRect(x + 12, top - 200, 3, 200);
      for (let k = 0; k < 3; k++) {
        const ox = x + 30 + r() * 100; const oy = top - 60 - r() * 120;
        g.fillStyle(COL.ore, 0.8).fillTriangle(ox, oy, ox + 6, oy - 10, ox + 10, oy);
        const glint = s.add.image(ox + 5, oy - 4, 'glow').setScale(0.4).setTint(COL.ore).setAlpha(0.4)
          .setBlendMode(Phaser.BlendModes.ADD).setDepth(DEPTH.floor - 0.9);
        this.flickers.push({ img: glint, base: 0.35, amp: 0.15, rate: 0.03 + r() * 0.02 });
      }
    }
    // the crusher hall: a furnace's glow up the wall
    const hall = this.data.sections.find((sec) => sec.id === 'crusher');
    if (hall) {
      const gl = s.add.image((hall.x0 + hall.x1) / 2, top - 120, 'glow').setScale(12, 5).setTint(COL.furnace).setAlpha(0.3)
        .setBlendMode(Phaser.BlendModes.ADD).setDepth(DEPTH.floor - 0.9);
      this.flickers.push({ img: gl, base: 0.28, amp: 0.08, rate: 0.05 });
    }
    g.fillStyle(0x000000, 0.4).fillRect(0, top - 30, end, 30);
  }

  drawFloor() {
    const s = this.scene;
    const top = SETTINGS.world.floorTop - 50;
    const g = s.add.graphics().setDepth(DEPTH.floor);
    const end = this.width + this.pad; // (on past the level's end: the camera can look beyond it)
    g.fillStyle(COL.floor, 1).fillRect(-this.pad, top, end + this.pad, SETTINGS.height - top + 40);
    g.lineStyle(1, COL.floorLine, 1);
    for (let y = top + 24; y < SETTINGS.height + 40; y += 40) g.lineBetween(-this.pad, y, end, y);
    // the ore-cart rails along the lane (they stop where the mountain opens)
    const rails = Math.min(end, this.dayX + 300);
    g.lineStyle(3, COL.rail, 0.8).lineBetween(-this.pad, 404, rails, 404).lineBetween(-this.pad, 432, rails, 432);
    g.lineStyle(4, COL.timber, 0.9);
    for (let x = -this.pad; x < rails; x += 34) g.lineBetween(x, 400, x + 6, 436);
    g.fillStyle(0x000000, 0.35).fillRect(-this.pad, top, end + this.pad, 26);
    if (this.dayX < this.width) g.fillStyle(COL.dayLow, 0.3).fillRect(this.dayX, top, end - this.dayX, SETTINGS.height - top + 40); // (grey daylight on the far side)
  }

  // the far side: the rock opens on grey daylight, the Black Keep across the gorge
  drawDaylight() {
    if (this.dayX > this.width) return;
    const s = this.scene;
    const top = SETTINGS.world.floorTop - 50;
    const g = s.add.graphics().setDepth(DEPTH.floor - 1.2);
    g.fillGradientStyle(COL.day, COL.day, COL.dayLow, COL.dayLow, 1).fillRect(this.dayX, -400, this.width - this.dayX + this.pad, top + 400);
    const c = s.add.graphics().setDepth(DEPTH.floor - 1.1);
    drawCastle(c, this.dayX + 420, top - 40, 0.9, 0.7);
    // the mouth of the tunnel, ragged rock round the light
    const m = s.add.graphics().setDepth(DEPTH.floor - 1);
    m.fillStyle(COL.rock, 1);
    for (let y = -300; y < top; y += 40) m.fillTriangle(this.dayX - 20, y, this.dayX + 40 + ((y * 7) % 50), y + 20, this.dayX - 20, y + 40);
    const glow = s.add.image(this.dayX + 80, top - 120, 'glow').setScale(10, 8).setTint(0xdfe8f0).setAlpha(0.3)
      .setBlendMode(Phaser.BlendModes.ADD).setDepth(DEPTH.floor - 0.8);
    this.flickers.push({ img: glow, base: 0.28, amp: 0.02, rate: 0.01 });
  }

  // set pieces painted later (the crusher hall's furnace mouth); drips from the roof now
  drawSetPieces() {
    const hall = this.data.sections.find((sec) => sec.id === 'crusher');
    if (hall) this.art.piece('furnace', hall.x0 + 300, hall.x0 + 900);
    for (let i = 0; i < 18; i++) {
      const img = this.scene.add.image(0, 0, 'dot').setTint(0x8ab8e0).setScale(0.25, 0.6).setAlpha(0.6).setDepth(DEPTH.floor + 3.5);
      this.drips.push({ img, x: Math.random() * SETTINGS.width, y: Math.random() * 400, v: 2 + Math.random() * 3 });
    }
  }

  update() {
    const t = this.scene.time.now / 16.7;
    for (const f of this.flickers) f.img.setAlpha(f.base + Math.sin(t * f.rate + f.base * 40) * f.amp + (Math.random() - 0.5) * f.amp * 0.3);
    const wv = this.scene.cameras.main.worldView;
    for (const d of this.drips) {
      d.y += d.v;
      if (d.y > 420) { d.y = -20; d.x = Math.random() * wv.width; }
      const wx = wv.x + d.x;
      d.img.setPosition(wx, wv.y + d.y).setVisible(wx < this.dayX);
    }
  }
}
