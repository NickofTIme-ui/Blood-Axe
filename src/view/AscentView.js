// AscentView.js — THE SHATTERED ASCENT's backdrop (campaign level 4, data/stageAscent.js).
// ALL TEMPORARY ART, drawn in code; the painted replacements (data/levelArt.js 'ascent')
// take over piece by piece as they're saved.
//
// Its colours: cold grey rock and a low overcast sky, wind driving grit along the road;
// the Black Keep huge across the gorge (black stone, violet light); the warm reds only in
// the Ashen camp's fires and banners.
//
// Back to front: the sky and its torn cloud, the Keep on its crag across the gorge with far
// peaks round it, nearer crags, the cliff face behind the road (with the overhang, the
// battery's palisade, the siege camp's tents and, at the top, the pass looking down on the
// Iron Gates), then the road itself.

import { SETTINGS } from '../config/settings.js';
import { DEPTH } from './depths.js';
import { drawCastle } from './castle.js';
import { PaintedLevel } from './levelArt.js';

const COL = {
  skyTop: 0x3a4250, skyLow: 0x8a94a0, cloud: 0x5a626e, cloudLit: 0x9aa2ac,
  peak: 0x4a525c, peakFar: 0x6a727c, crag: 0x2e333a, cragLit: 0x4a525a,
  cliff: 0x3a3e44, cliffDark: 0x24282d, cliffLit: 0x5a6068, strata: 0x2e3238,
  road: 0x4a4c50, roadLine: 0x3a3c40, gravel: 0x6a6c70,
  timber: 0x3a2818, cloth: 0x6a1a14, fire: 0xff7a30, keep: 0xa88aff, gate: 0x2a2a30,
};

// Where the gorge's far side meets the sky, for the layers at vertical scroll 0.5 (the
// arena's camera zooms about the screen's middle, so far layers sit lower than they would
// on an unzoomed camera; at 255 the Keep's foot is just hidden by the cliff top)
const HORIZON = 255;
const CLIFF = 112; // how tall the cliff face behind the road is drawn (the Keep shows over it)

function rng(seed) {
  let k = seed;
  return () => { k = (k * 9301 + 49297) % 233280; return k / 233280; };
}

export class AscentBackdrop {
  constructor(scene, stage) {
    this.scene = scene;
    this.stage = stage;
    this.data = stage.data;
    this.width = this.data.width;
    this.flickers = [];
    this.clouds = [];
    this.gusts = [];
    const art = this.art = new PaintedLevel(scene, 'ascent', this.width);
    if (art.has('sky')) art.layer('sky', DEPTH.sky); else this.drawSky();
    if (art.has('far')) art.layer('far', DEPTH.far - 1); else this.drawKeep();
    if (art.has('mid')) art.layer('mid', DEPTH.far + 2); else this.drawCrags();
    if (art.has('wall')) art.wall(); else this.drawCliff();
    if (art.has('ground')) art.ground(); else this.drawRoad();
    this.drawSetPieces();
    this.drawWind();
  }

  get pad() { return SETTINGS.width * 2; }
  sec(id) { return this.data.sections.find((s) => s.id === id); }

  // a low overcast sky, torn cloud driving across it
  drawSky() {
    const s = this.scene;
    const span = SETTINGS.width + this.pad * 2 + this.width * 0.1;
    const g = s.add.graphics().setDepth(DEPTH.sky).setScrollFactor(0.1, 0.4);
    g.fillGradientStyle(COL.skyTop, COL.skyTop, COL.skyLow, COL.skyLow, 1).fillRect(-this.pad, -700, span, SETTINGS.height + 900);
    const r = rng(7);
    for (let i = 0; i < 3; i++) {
      const c = s.add.graphics().setDepth(DEPTH.sky + 1 + i * 0.1).setScrollFactor(0.06 + i * 0.03, 0.4);
      for (let x = -this.pad; x < span; x += 90 + r() * 140) {
        const y = 175 + i * 30 + r() * 40; const w = 140 + r() * 220;
        c.fillStyle(i === 2 ? COL.cloudLit : COL.cloud, 0.35 - i * 0.07).fillEllipse(x, y, w, 26 + r() * 20);
      }
      this.clouds.push({ img: c, speed: 0.12 + i * 0.1 });
    }
  }

  // the Black Keep, huge on its crag across the gorge, far peaks either side of it
  drawKeep() {
    const s = this.scene;
    const c = this.data.castle ?? { x: SETTINGS.width * 0.6, scale: 1, detail: 0.8 };
    const r = rng(11);
    const span = SETTINGS.width + this.pad * 2 + this.width * 0.1;
    const peaks = s.add.graphics().setDepth(DEPTH.far - 3).setScrollFactor(0.04, 0.5);
    peaks.fillStyle(COL.peakFar, 1);
    for (let x = -this.pad; x < span; x += 160 + r() * 200) {
      const h = 40 + r() * 90;
      peaks.fillTriangle(x - 120, HORIZON + 30, x + 140, HORIZON + 30, x + r() * 40, HORIZON - h);
      peaks.fillStyle(0xc8d0d8, 0.5).fillTriangle(x - 14 + r() * 4, HORIZON - h + 30, x + 30, HORIZON - h + 30, x + r() * 40, HORIZON - h); // snow
      peaks.fillStyle(COL.peakFar, 1);
    }
    const g = this.keepG = s.add.graphics().setDepth(DEPTH.far - 2).setScrollFactor(0.05, 0.5);
    drawCastle(g, c.x, HORIZON + 20, c.scale, c.detail ?? 0.8);
    const glow = s.add.image(c.x, HORIZON - 130 * c.scale, 'glow').setScale(5 * c.scale + 1).setTint(COL.keep).setAlpha(0.22)
      .setBlendMode(Phaser.BlendModes.ADD).setDepth(DEPTH.far - 2.5).setScrollFactor(0.05, 0.5);
    this.flickers.push({ img: glow, base: 0.2, amp: 0.05, rate: 0.02 });
    // the gorge's far wall under it, and the haze in the gorge
    const wall = s.add.graphics().setDepth(DEPTH.far - 1).setScrollFactor(0.1, 0.5);
    wall.fillStyle(COL.peak, 1);
    wall.beginPath(); wall.moveTo(-this.pad, 460);
    for (let x = -this.pad; x <= span; x += 60) wall.lineTo(x, HORIZON + 24 + r() * 26);
    wall.lineTo(span, 460); wall.closePath(); wall.fillPath();
    s.add.rectangle(-this.pad, HORIZON + 10, span, 90, 0xb8c0c8, 0.12).setOrigin(0).setDepth(DEPTH.far - 0.5).setScrollFactor(0.12, 0.5);
  }

  // nearer crags, broken and sharp
  drawCrags() {
    const s = this.scene;
    const r = rng(23);
    const span = SETTINGS.width + this.width * 0.45 + this.pad;
    const g = s.add.graphics().setDepth(DEPTH.far + 2).setScrollFactor(0.45, 0.85);
    for (let x = -this.pad / 2; x < span; x += 120 + r() * 200) {
      const w = 80 + r() * 120; const h = 110 + r() * 80; const base = 300; // (low: the Keep stands over them)
      g.fillStyle(COL.crag, 1).fillTriangle(x, base, x + w, base, x + w * (0.3 + r() * 0.4), base - h);
      g.fillStyle(COL.cragLit, 0.6).fillTriangle(x + w * 0.5, base, x + w, base, x + w * 0.45, base - h * 0.9);
    }
    g.fillStyle(COL.crag, 1).fillRect(-this.pad, 300, span + this.pad, 200);
  }

  // the cliff face the road is cut into: grey rock in strata, cracks, a few stunted trees
  drawCliff() {
    const s = this.scene;
    const top = SETTINGS.world.floorTop - 50;
    const g = s.add.graphics().setDepth(DEPTH.floor - 1);
    const r = rng(41);
    g.fillStyle(COL.cliff, 1).fillRect(0, top - CLIFF, this.width, CLIFF + 10);
    // its broken top edge against the sky
    for (let x = 0; x < this.width; x += 30 + r() * 40) g.fillTriangle(x, top - CLIFF + 1, x + 40 + r() * 30, top - CLIFF + 1, x + 15 + r() * 20, top - CLIFF - 12 - r() * 26);
    for (let y = top - CLIFF + 10; y < top; y += 22 + r() * 18) g.fillStyle(COL.strata, 0.7).fillRect(0, y, this.width, 3); // the strata
    for (let x = 0; x < this.width; x += 40 + r() * 80) {
      g.fillStyle(r() < 0.5 ? COL.cliffDark : COL.cliffLit, 0.5).fillRect(x, top - CLIFF + r() * (CLIFF - 30), 20 + r() * 50, 8 + r() * 26);
      if (r() < 0.3) { // a crack running down
        g.lineStyle(2, COL.cliffDark, 0.9).beginPath(); let cx = x; let cy = top - CLIFF + 10 + r() * 50; g.moveTo(cx, cy);
        for (let k = 0; k < 4; k++) { cx += (r() - 0.5) * 30; cy += 20 + r() * 16; g.lineTo(cx, cy); }
        g.strokePath();
      }
      if (r() < 0.08) { // a stunted pine leaning out of a crack, bent by the wind
        const tx = x + 10; const ty = top - 30 - r() * 60;
        g.lineStyle(4, COL.timber, 1).lineBetween(tx, ty, tx + 26, ty - 30);
        g.fillStyle(0x2a3428, 1).fillTriangle(tx + 10, ty - 20, tx + 50, ty - 34, tx + 26, ty - 50);
      }
    }
    g.fillStyle(0x000000, 0.35).fillRect(0, top - 30, this.width, 30);
  }

  drawRoad() {
    const s = this.scene;
    const top = SETTINGS.world.floorTop - 50;
    const g = s.add.graphics().setDepth(DEPTH.floor);
    const end = this.width + this.pad;
    g.fillStyle(COL.road, 1).fillRect(-this.pad, top, end + this.pad, SETTINGS.height - top + 40);
    g.lineStyle(1, COL.roadLine, 1);
    for (let y = top + 24; y < SETTINGS.height + 40; y += 40) g.lineBetween(-this.pad, y, end, y);
    // grit and stones scattered on it
    const r = rng(53);
    for (let x = -this.pad; x < end; x += 18 + r() * 40) g.fillStyle(r() < 0.5 ? COL.gravel : COL.roadLine, 0.8).fillRect(x, top + 10 + r() * (SETTINGS.height - top - 20), 3 + r() * 5, 2 + r() * 3);
    g.fillStyle(0x000000, 0.3).fillRect(-this.pad, top, end + this.pad, 22);
  }

  // set pieces painted later; stand-ins now: the overhang (the shelter), the palisade and
  // stone pile (the battery), tents and banners (the siege camp), the pass's view
  drawSetPieces() {
    const s = this.scene;
    const top = SETTINGS.world.floorTop - 50;
    const shelter = this.sec('shelter');
    if (shelter && !this.art.piece('overhang', shelter.x0 + 800, shelter.x0 + 1200)) {
      const x = shelter.x0 + 1000;
      const g = s.add.graphics().setDepth(DEPTH.floor - 0.98);
      g.fillStyle(COL.cliff, 1).fillRect(x - 280, top - CLIFF - 40, 560, 50); // the rock jutting out over it
      g.fillStyle(COL.cliffDark, 1).fillRect(x - 220, top - CLIFF + 10, 440, CLIFF - 10); // the hollow under it
      g.fillStyle(COL.cliff, 1).fillTriangle(x - 280, top - CLIFF + 10, x + 280, top - CLIFF + 10, x + 220, top - CLIFF + 34);
      g.fillStyle(COL.cliffLit, 1).fillRect(x - 280, top - CLIFF - 46, 560, 8); // the lip of the overhang
      for (let i = 0; i < 6; i++) g.fillStyle(0x4a4650, 1).fillCircle(x - 200 + i * 22, top - 10 - (i % 2) * 14, 13); // stones piled at its mouth
    }
    const battery = this.sec('battery');
    if (battery && !this.art.piece('palisade', battery.x0 + 300, battery.x1 - 60)) {
      const g = s.add.graphics().setDepth(DEPTH.floor - 0.98);
      for (let x = battery.x0 + 300; x < battery.x1 - 60; x += 22) {
        const h = 120 + ((x * 7) % 30);
        g.fillStyle(COL.timber, 1).fillRect(x, top - h, 16, h);
        g.fillTriangle(x, top - h, x + 16, top - h, x + 8, top - h - 14);
      }
      // the stone pile they throw
      const pile = s.add.graphics().setDepth(DEPTH.floor - 0.97);
      const px = (battery.x0 + battery.x1) / 2 + 200;
      for (let i = 0; i < 14; i++) pile.fillStyle(i % 2 ? 0x4a4650 : 0x5a5660, 1).fillCircle(px + (i % 5) * 18 - 40, top - 10 - Math.floor(i / 5) * 16, 12);
    }
    const camp = this.sec('camp');
    if (camp && !this.art.piece('camp', camp.x0 + 200, camp.x1 - 100)) {
      const g = s.add.graphics().setDepth(DEPTH.floor - 0.98);
      for (let x = camp.x0 + 260; x < camp.x1 - 100; x += 260) {
        g.fillStyle(0x3a2e26, 1).fillTriangle(x - 80, top, x + 80, top, x, top - 110); // a tent
        g.fillStyle(0x1a1410, 1).fillTriangle(x - 18, top, x + 18, top, x, top - 50);
        g.fillStyle(COL.timber, 1).fillRect(x + 100, top - 170, 5, 170); // a banner pole
        g.fillStyle(COL.cloth, 1).fillRect(x + 105, top - 166, 34, 50);
        const fire = s.add.image(x + 130, top - 6, 'glow').setScale(1.4).setTint(COL.fire).setAlpha(0.5)
          .setBlendMode(Phaser.BlendModes.ADD).setDepth(DEPTH.floor - 0.9);
        this.flickers.push({ img: fire, base: 0.45, amp: 0.15, rate: 0.2 });
      }
    }
    // the high pass: the cliff falls away and far below, the Iron Gates in their wall
    const pass = this.sec('pass');
    if (pass) {
      const g = s.add.graphics().setDepth(DEPTH.floor - 0.99);
      const x0 = pass.x0 + 150; const x1 = this.width + this.pad;
      g.fillGradientStyle(COL.skyLow, COL.skyLow, COL.peakFar, COL.peakFar, 1).fillRect(x0, top - CLIFF - 40, x1 - x0, CLIFF + 40);
      if (!this.art.piece('gates_view', x0 + 50, x0 + 650, { bottom: -20 })) {
        // far below: the valley floor, the wall across it and the gatehouse, small with distance
        const gx = x0 + 350; const gy = top - 40;
        g.fillStyle(0x5a626c, 1).fillRect(x0, gy - 10, x1 - x0, 50);
        g.fillStyle(COL.gate, 1).fillRect(gx - 200, gy - 26, 400, 26); // the wall
        for (let k = -200; k < 200; k += 9) g.fillRect(gx + k, gy - 30, 5, 4);
        g.fillRect(gx - 34, gy - 50, 24, 50).fillRect(gx + 10, gy - 50, 24, 50); // the gatehouse towers
        g.fillStyle(0x4a4a52, 1).fillRect(gx - 10, gy - 22, 20, 22); // the iron gates
        g.lineStyle(1, 0x1a1a1e, 1);
        for (let k = -8; k < 10; k += 4) g.lineBetween(gx + k, gy - 22, gx + k, gy);
        g.fillStyle(0xb8c0c8, 0.25).fillRect(x0, gy - 60, x1 - x0, 40); // haze over the valley
        const gl = s.add.image(gx, gy - 30, 'glow').setScale(4, 2).setTint(COL.fire).setAlpha(0.25)
          .setBlendMode(Phaser.BlendModes.ADD).setDepth(DEPTH.floor - 0.95);
        this.flickers.push({ img: gl, base: 0.22, amp: 0.08, rate: 0.08 });
      }
      // the cliff edge where the road turns down
      g.fillStyle(COL.cliff, 1).fillTriangle(x0 - 40, top - CLIFF - 40, x0 + 40, top - CLIFF - 40, x0 - 40, top);
    }
  }

  // the wind: grit and streaks driven along the road
  drawWind() {
    for (let i = 0; i < 26; i++) {
      const img = this.scene.add.image(0, 0, 'dot').setTint(0xc8ccd0).setScale(i % 3 ? 0.25 : 1.6, 0.18).setAlpha(i % 3 ? 0.5 : 0.18).setDepth(DEPTH.floor + 3.5);
      this.gusts.push({ img, x: Math.random() * SETTINGS.width, y: Math.random() * SETTINGS.height, v: 6 + Math.random() * 8, sway: Math.random() * 6 });
    }
  }

  update() {
    const t = this.scene.time.now / 16.7;
    for (const f of this.flickers) f.img.setAlpha(f.base + Math.sin(t * f.rate + f.base * 40) * f.amp + (Math.random() - 0.5) * f.amp * 0.3);
    for (const c of this.clouds) c.img.x = Math.sin(t * 0.0006 * (1 + c.speed)) * 160; // (driven back and forth by the wind)
    const wv = this.scene.cameras.main.worldView;
    for (const g of this.gusts) {
      g.x -= g.v;
      if (g.x < -40) { g.x = wv.width + 40; g.y = Math.random() * wv.height; }
      g.img.setPosition(wv.x + g.x, wv.y + g.y + Math.sin(t * 0.05 + g.sway) * 8);
    }
  }
}
