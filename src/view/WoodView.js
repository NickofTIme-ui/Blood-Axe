// WoodView.js — GALLOWS WOOD's backdrop and road (campaign level 2, data/stageWood.js).
// ALL TEMPORARY ART, drawn in code; the painted replacements are listed in
// docs/cloud-handoff.md (art requests).
//
// Its colours: wet black pines, a cold blue-grey mist, mud, and the warm lanterns of the
// convoy's road. The Black Keep is nearer than from the village: a silhouette over the
// trees (view/castle.js).
//
// Back to front: sky and moon, the castle over the far ridge, three ranks of pines
// (further = paler in the mist), mist bands, the trunks along the back of the road (the
// hanging tree, the convoy's broken carts, the rockslide over the pass), then the road.

import { SETTINGS } from '../config/settings.js';
import { DEPTH } from './depths.js';
import { drawCastle } from './castle.js';
import { PaintedLevel } from './levelArt.js';

const COL = {
  skyTop: 0x05080c, skyLow: 0x1c2630,
  ridge: 0x0e141a,
  pineFar: 0x18222a, pineMid: 0x10181e, pineNear: 0x0a0f13,
  mist: 0x8aa0b0,
  trunk: 0x14100c, trunkLit: 0x2a2218,
  mud: 0x1e1a16, mudLine: 0x15120f, puddle: 0x2a3a48,
  rock: 0x34343a, rockDark: 0x1e1e24,
  lantern: 0xffc070,
};

const HORIZON = 150; // where the far ridge meets the sky (screen px; the castle stands on it)

function rng(seed) {
  let k = seed;
  return () => { k = (k * 9301 + 49297) % 233280; return k / 233280; };
}

export class WoodBackdrop {
  constructor(scene, stage) {
    this.scene = scene;
    this.stage = stage;
    this.data = stage.data;
    this.width = this.data.width;
    this.mists = [];
    // painted art where it exists (data/levelArt.js), the code-drawn stand-ins elsewhere
    const art = this.art = new PaintedLevel(scene, 'wood', this.width);
    if (art.has('sky')) art.layer('sky', DEPTH.sky); else this.drawSky();
    if (art.has('far')) art.layer('far', DEPTH.far - 1); else this.drawCastle();
    if (art.has('mid')) art.layer('mid', DEPTH.far + 2); else this.drawPines();
    if (art.has('wall')) art.wall(); else this.drawTrunks();
    if (art.has('ground')) art.ground(); else this.drawRoad();
    this.drawSetPieces();
  }

  get pad() { return SETTINGS.width * 2; }

  drawSky() {
    const s = this.scene;
    const H = SETTINGS.height;
    const pad = this.pad;
    const sky = s.add.graphics().setDepth(DEPTH.sky).setScrollFactor(0.1, 0.4);
    sky.fillGradientStyle(COL.skyTop, COL.skyTop, COL.skyLow, COL.skyLow, 1);
    sky.fillRect(-pad, -700, SETTINGS.width + pad * 2 + this.width * 0.1, H + 900);
    const c = this.data.castle ?? { x: SETTINGS.width * 0.7, scale: 0.5 };
    s.add.image(c.x + 30, HORIZON - 100, 'glow').setScale(8).setTint(0x8aa0c0).setAlpha(0.3).setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(DEPTH.sky + 1).setScrollFactor(0.05, 0.5);
    s.add.circle(c.x + 30, HORIZON - 100, 40, 0xd0dce6, 0.7).setDepth(DEPTH.sky + 1).setScrollFactor(0.05, 0.5);
  }

  drawCastle() {
    const c = this.data.castle;
    if (!c) return;
    const s = this.scene;
    const g = s.add.graphics().setDepth(DEPTH.far - 2).setScrollFactor(0.05, 0.5);
    drawCastle(g, c.x, HORIZON + 8, c.scale, c.detail ?? 0.4);
    s.add.image(c.x, HORIZON - 120 * c.scale, 'glow').setScale(4 * c.scale + 1).setTint(0x7a5ad0).setAlpha(0.2)
      .setBlendMode(Phaser.BlendModes.ADD).setDepth(DEPTH.far - 2.5).setScrollFactor(0.05, 0.5);
    const ridge = s.add.graphics().setDepth(DEPTH.far - 1).setScrollFactor(0.1, 0.6);
    const r = rng(5);
    ridge.fillStyle(COL.ridge, 1);
    ridge.beginPath();
    ridge.moveTo(-this.pad, 420);
    for (let x = -this.pad; x <= SETTINGS.width + this.pad + this.width * 0.1; x += 70) ridge.lineTo(x, HORIZON + 4 + r() * 30);
    ridge.lineTo(SETTINGS.width + this.pad + this.width * 0.1, 420);
    ridge.closePath();
    ridge.fillPath();
  }

  // a rank of pine silhouettes: tiers of triangles on a trunk
  pineRank(g, { base, height, gap, seed, color, span }) {
    const r = rng(seed);
    g.fillStyle(color, 1);
    for (let x = -this.pad; x < span; x += gap * (0.6 + r() * 0.8)) {
      const h = height * (0.7 + r() * 0.5);
      const w = h * 0.34;
      g.fillRect(x - 2, base - h * 0.2, 4, h * 0.2 + 200);
      for (let t = 0; t < 4; t++) {
        const y = base - h * 0.2 - t * h * 0.22;
        const ww = w * (1 - t * 0.2);
        g.fillTriangle(x - ww, y, x + ww, y, x, y - h * 0.34);
      }
    }
    g.fillRect(-this.pad, base, span + this.pad * 2, 400);
  }

  drawPines() {
    const s = this.scene;
    const ranks = [
      { sf: 0.25, base: 236, height: 120, gap: 46, seed: 3, color: COL.pineFar },
      { sf: 0.45, base: 252, height: 170, gap: 64, seed: 9, color: COL.pineMid },
      { sf: 0.65, base: 262, height: 230, gap: 90, seed: 17, color: COL.pineNear },
    ];
    ranks.forEach((k, i) => {
      const g = s.add.graphics().setDepth(DEPTH.far + i * 2).setScrollFactor(k.sf, 0.8);
      this.pineRank(g, { ...k, span: SETTINGS.width + this.width * k.sf + this.pad });
      // mist between the ranks: the further, the paler
      const m = s.add.rectangle(-this.pad, k.base - 60 - i * 10, SETTINGS.width + this.width * k.sf + this.pad * 2, 70, COL.mist, 0.07 - i * 0.015)
        .setOrigin(0).setDepth(DEPTH.far + i * 2 + 1).setScrollFactor(k.sf, 0.8);
      this.mists.push({ img: m, base: m.x, amp: 30 + i * 10, rate: 0.004 + i * 0.002 });
    });
  }

  // the trunks along the back of the road: tall, black, wet, a few lit by the lanterns
  drawTrunks() {
    const s = this.scene;
    const top = SETTINGS.world.floorTop - 50;
    const g = s.add.graphics().setDepth(DEPTH.floor - 1);
    const r = rng(41);
    for (let x = 30; x < this.width; x += 90 + r() * 110) {
      const w = 16 + r() * 18;
      g.fillStyle(COL.trunk, 1).fillRect(x, top - 360, w, 380);
      g.fillStyle(COL.trunkLit, 1).fillRect(x + w - 3, top - 360, 3, 380);
      // a low bough
      if (r() < 0.4) g.fillStyle(COL.trunk, 1).fillTriangle(x + w / 2, top - 150 - r() * 80, x + w / 2 + 70, top - 120, x + w / 2 + 10, top - 110);
    }
    // the mist on the road itself
    const m = s.add.rectangle(0, top - 30, this.width, 50, COL.mist, 0.08).setOrigin(0).setDepth(DEPTH.floor - 0.9);
    this.mists.push({ img: m, base: 0, amp: 20, rate: 0.006 });
  }

  drawRoad() {
    const s = this.scene;
    const top = SETTINGS.world.floorTop - 50;
    const g = s.add.graphics().setDepth(DEPTH.floor);
    g.fillStyle(COL.mud, 1).fillRect(0, top, this.width, SETTINGS.height - top + 40);
    g.lineStyle(1, COL.mudLine, 1);
    for (let y = top + 22; y < SETTINGS.height + 40; y += 38) g.lineBetween(0, y, this.width, y);
    // cart ruts and puddles
    const r = rng(77);
    g.lineStyle(3, 0x120f0c, 0.8).lineBetween(0, 400, this.width, 400).lineBetween(0, 444, this.width, 444);
    for (let i = 0; i < this.width / 260; i++) {
      g.fillStyle(COL.puddle, 0.5).fillEllipse(r() * this.width, 300 + r() * 210, 40 + r() * 50, 8 + r() * 6);
    }
    g.fillStyle(0x000000, 0.35).fillRect(0, top, this.width, 24);
  }

  // the hanging tree, the convoy's carts, the rockslide (data: gallows, carts, the pass)
  drawSetPieces() {
    const s = this.scene;
    const D = this.data;
    const top = SETTINGS.world.floorTop - 50;
    if (D.gallows && this.art.piece('hanging_tree', D.gallows.x - 260, D.gallows.x + 120, { depth: D.gallows.z - 2, bottom: D.gallows.z - top })) {
      // (painted)
    } else if (D.gallows) {
      // a great dead oak with a long bough out over the road; the rope hangs from it (NpcView)
      const { x, z } = D.gallows;
      const g = s.add.graphics().setDepth(z - 2);
      g.fillStyle(0x1a140e, 1).fillRect(x - 120, z - 300, 34, 300);
      g.fillTriangle(x - 120, z - 300, x - 86, z - 300, x - 60, z - 420);
      g.fillStyle(0x1a140e, 1).fillRect(x - 100, z - 214, 150, 12);
      g.fillStyle(0x2a2218, 1).fillRect(x - 100, z - 214, 150, 3);
      g.fillStyle(0x0e0a08, 1).fillTriangle(x - 120, z, x - 160, z, x - 120, z - 30).fillTriangle(x - 86, z, x - 50, z, x - 86, z - 24);
    }
    for (const c of D.carts ?? []) {
      // a broken cart: a tipped bed, a wheel off; the cage on it is drawn with its prisoner
      const g = s.add.graphics().setDepth(c.z - 3);
      g.fillStyle(0x2a2016, 1).fillRect(c.x - 70, c.z - 26, 140, 14);
      g.fillStyle(0x1a140e, 1).fillCircle(c.x - 48, c.z - 8, 14).fillCircle(c.x + 60, c.z + 2, 14);
      g.fillStyle(0x3a2e20, 1).fillCircle(c.x - 48, c.z - 8, 4);
    }
    const pass = D.sections.find((sec) => sec.id === 'pass');
    if (pass) {
      // the rockslide: boulders heaped across the pass, higher than anyone can climb
      const slide = D.terrain.find((t) => t.kind === 'block' && t.x0 >= pass.x0 && t.top >= 200);
      if (slide && this.art.piece('rockslide', slide.x0 - 120, slide.x1 + 160, { depth: DEPTH.floor - 0.5, bottom: 60 })) {
        // (painted)
      } else if (slide) {
        const g = s.add.graphics().setDepth(DEPTH.floor - 0.5);
        const r = rng(91);
        for (let i = 0; i < 40; i++) {
          const bx = slide.x0 - 40 + r() * (slide.x1 - slide.x0 + 120);
          const by = top - 280 + r() * 300;
          const rad = 18 + r() * 40;
          g.fillStyle(r() < 0.5 ? COL.rock : COL.rockDark, 1).fillCircle(bx, by, rad);
        }
      }
    }
  }

  update() {
    const t = this.scene.time.now / 1000;
    if (!this.kennelsDone) {
      // the kennels at the back of the clearing (painted only: the code draws none)
      this.kennelsDone = true;
      const k = this.data.sections.find((sec) => sec.id === 'kennels');
      if (k) this.art.piece('kennels', k.x0 + 380, k.x0 + 900);
    }
    for (const m of this.mists) m.img.x = m.base + Math.sin(t * m.rate * 60) * m.amp;
  }
}
