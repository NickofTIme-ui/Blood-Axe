// VillageView.js — THE BURNING VILLAGE's backdrop and street (campaign level 1,
// data/stageVillage.js). ALL TEMPORARY ART, drawn in code; the painted replacements are
// listed in docs/cloud-handoff.md (art requests).
//
// Its colours: a smoke-violet night sky, ash grey, charred timber, and the orange of the
// fires (only where something is burning). The Black Keep stands on the far horizon in
// black and cold violet (view/castle.js).
//
// Back to front: sky, the far hills and the castle on its crag, smoke columns, burning
// rooftops across the valley, the house fronts along the back of the street (the barn,
// the longhall, the north gate where the level ends), then the street itself.

import { SETTINGS } from '../config/settings.js';
import { DEPTH } from './depths.js';
import { drawCastle } from './castle.js';
import { PaintedLevel } from './levelArt.js';

const COL = {
  skyTop: 0x07070f, skyMid: 0x1a1426, skyLow: 0x4a2a2a,
  hills: 0x14111c, hillsNear: 0x1a1520,
  smoke: 0x2a2630,
  roofsFar: 0x0e0b0e,
  wall: 0x2a221e, wallDark: 0x1a1412, timber: 0x120c08, plaster: 0x3a302a,
  fire: 0xff7a2a, fireHot: 0xffc070, ember: 0xffa050,
  street: 0x2b2622, streetLine: 0x221d1a, cobble: 0x332d29,
};

// where the far hills meet the sky (screen px; the castle stands on them)
const HORIZON = 132;

// Pseudo-random from a seed (the backdrop is the same every time).
function rng(seed) {
  let k = seed;
  return () => { k = (k * 9301 + 49297) % 233280; return k / 233280; };
}

export class VillageBackdrop {
  constructor(scene, stage) {
    this.scene = scene;
    this.stage = stage;
    this.data = stage.data;
    this.width = this.data.width;
    this.flickers = [];
    this.embers = [];
    // painted art where it exists (data/levelArt.js), the code-drawn stand-ins elsewhere
    const art = this.art = new PaintedLevel(scene, 'village', this.width);
    if (art.has('sky')) art.layer('sky', DEPTH.sky); else this.drawSky();
    if (art.has('far')) art.layer('far', DEPTH.far - 1); else this.drawCastle();
    this.drawSmoke();
    if (art.has('mid')) art.layer('mid', DEPTH.far + 2); else this.drawFarRoofs();
    this.drawStreetFronts();
    this.drawStreet();
    this.makeEmbers();
  }

  get pad() { return SETTINGS.width * 2; }

  drawSky() {
    const s = this.scene;
    const H = SETTINGS.height;
    const pad = this.pad;
    const sky = s.add.graphics().setDepth(DEPTH.sky).setScrollFactor(0.1, 0.4);
    sky.fillGradientStyle(COL.skyTop, COL.skyTop, COL.skyMid, COL.skyMid, 1);
    sky.fillRect(-pad, -700, SETTINGS.width + pad * 2 + this.width * 0.1, 760);
    sky.fillGradientStyle(COL.skyMid, COL.skyMid, COL.skyLow, COL.skyLow, 1);
    sky.fillRect(-pad, 60, SETTINGS.width + pad * 2 + this.width * 0.1, H + 200);
    // the moon, low over the north, with the castle black against it (drawCastle)
    const c = this.data.castle ?? { x: SETTINGS.width * 0.7 };
    s.add.image(c.x + 18, HORIZON - 70, 'glow').setScale(7).setTint(0x8a80b0).setAlpha(0.35).setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(DEPTH.sky + 1).setScrollFactor(0.05, 0.5);
    s.add.circle(c.x + 18, HORIZON - 70, 38, 0xc8c0dc, 0.75).setDepth(DEPTH.sky + 1).setScrollFactor(0.05, 0.5);
    // the fires' light low on the smoke, all along the valley
    for (let x = -200; x < SETTINGS.width + 900; x += 260) {
      const g = s.add.image(x, 200, 'glow').setScale(9, 3).setTint(COL.fire).setAlpha(0.22).setBlendMode(Phaser.BlendModes.ADD)
        .setDepth(DEPTH.sky + 2).setScrollFactor(0.2, 0.5);
      this.flickers.push({ img: g, base: 0.22, amp: 0.06, rate: 0.03 + (x % 7) * 0.004 });
    }
  }

  drawCastle() {
    const c = this.data.castle;
    if (!c) return;
    const s = this.scene;
    // far hills, and the castle on its crag over them (it hardly moves: it is far away)
    const g = s.add.graphics().setDepth(DEPTH.far - 2).setScrollFactor(0.05, 0.5);
    drawCastle(g, c.x, HORIZON + 8, c.scale, c.detail ?? 0.3);
    const halo = s.add.image(c.x, HORIZON - 120 * c.scale, 'glow').setScale(4 * c.scale + 1).setTint(0x7a5ad0).setAlpha(0.18)
      .setBlendMode(Phaser.BlendModes.ADD).setDepth(DEPTH.far - 2.5).setScrollFactor(0.05, 0.5);
    this.flickers.push({ img: halo, base: 0.18, amp: 0.05, rate: 0.011 });
    const hills = s.add.graphics().setDepth(DEPTH.far - 1).setScrollFactor(0.12, 0.6);
    const r = rng(11);
    hills.fillStyle(COL.hills, 1);
    hills.beginPath();
    hills.moveTo(-this.pad, 400);
    for (let x = -this.pad; x <= SETTINGS.width + this.pad + this.width * 0.12; x += 80) hills.lineTo(x, HORIZON + 6 + r() * 26);
    hills.lineTo(SETTINGS.width + this.pad + this.width * 0.12, 400);
    hills.closePath();
    hills.fillPath();
  }

  // columns of smoke leaning with the wind, lit orange from under
  drawSmoke() {
    const s = this.scene;
    const r = rng(23);
    for (let i = 0; i < 9; i++) {
      const x = 80 + i * 340 + r() * 120;
      const c = s.add.container(x, 230).setDepth(DEPTH.far + 1).setScrollFactor(0.3, 0.7);
      for (let k = 0; k < 9; k++) {
        const y = -k * 34;
        const blob = s.add.circle(k * k * 1.6 + (r() - 0.5) * 10, y, 22 + k * 7, COL.smoke, 0.32 - k * 0.025);
        c.add(blob);
      }
      c.add(s.add.image(0, 6, 'glow').setScale(2.6, 1.4).setTint(COL.fire).setAlpha(0.35).setBlendMode(Phaser.BlendModes.ADD));
      s.tweens.add({ targets: c, angle: { from: -2, to: 2 }, duration: 3000 + i * 400, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    }
  }

  // the rest of the village across the valley: gabled roofs, some ablaze
  drawFarRoofs() {
    const s = this.scene;
    const g = s.add.graphics().setDepth(DEPTH.far + 2).setScrollFactor(0.45, 0.8);
    const r = rng(37);
    const span = SETTINGS.width + this.width * 0.45 + this.pad;
    for (let x = -this.pad / 2; x < span; x += 60 + r() * 50) {
      const w = 50 + r() * 40; const h = 24 + r() * 20; const base = HORIZON + 66;
      g.fillStyle(COL.roofsFar, 1);
      g.fillRect(x, base - h, w, h + 30);
      g.fillTriangle(x - 6, base - h, x + w + 6, base - h, x + w / 2, base - h - 26 - r() * 10);
      if (r() < 0.45) {
        // burning: lit windows, and flames on the roof
        g.fillStyle(COL.fire, 0.85).fillRect(x + w * 0.3, base - h + 8, 6, 7);
        const fl = s.add.image(x + w / 2, base - h - 14, 'glow').setScale(1.6, 2.2).setTint(COL.fire).setAlpha(0.6)
          .setBlendMode(Phaser.BlendModes.ADD).setDepth(DEPTH.far + 3).setScrollFactor(0.45, 0.8);
        this.flickers.push({ img: fl, base: 0.55, amp: 0.2, rate: 0.09 + r() * 0.08 });
      }
    }
  }

  // ------------------------------------------------------------ the street

  // The house fronts along the back of the street (the lane's back wall): timber and
  // plaster, doors, windows with fire inside, the barn, the longhall and the north gate.
  drawStreetFronts() {
    const s = this.scene;
    const top = SETTINGS.world.floorTop - 50; // where the street's floor art begins
    const g = s.add.graphics().setDepth(DEPTH.floor - 1);
    const r = rng(51);
    const special = (x) => this.data.sections.find((sec) => x >= sec.x0 && x < sec.x1)?.id;
    const painted = this.art.has('wall');
    if (painted) this.art.wall();
    for (let x = 0; x < this.width;) {
      const id = special(x);
      const sec = this.data.sections.find((q) => q.id === id);
      const prop = (tag) => sec?.props?.find((pr) => pr.tag === tag);
      // (a set piece: its painting if there is one, else drawn here)
      const piece = (name, x0, x1, draw) => { if (!this.art.piece(name, x0, x1)) draw(); return x1; };
      if (id === 'gate') {
        const gx = this.data.exit?.x ?? this.width - 120;
        if (!this.art.has('gate')) this.drawGate(g, sec.x0, this.width, top); else this.art.piece('gate', gx - 260, gx + 260);
        x = this.width; continue;
      }
      if (id === 'hall' && x >= sec.x0 + 200 && x < sec.x0 + 1200) { x = piece('longhall', sec.x0 + 200, sec.x0 + 1200, () => this.drawLonghall(g, sec.x0 + 200, sec.x0 + 1200, top)); continue; }
      const barn = id === 'mill' && prop('barn');
      if (barn && x >= barn.x - 130 && x < barn.x + 150) { x = piece('barn', barn.x - 130, barn.x + 150, () => this.drawBarn(g, barn.x - 130, barn.x + 150, top)); continue; }
      const stab = id === 'stables' && prop('stables');
      if (stab && x >= stab.x - 260 && x < stab.x + 260) {
        x = piece('stables', stab.x - 260, stab.x + 260, () => this.drawStables(g, stab.x - 260, stab.x + 260, top, stab.x));
        // (painted: only what changes is drawn over it, the open gate once the horses are out)
        if (this.art.has('stables')) this.stables = { gx: stab.x, top, painted: true, g: this.scene.add.graphics().setDepth(DEPTH.floor - 0.95) };
        continue;
      }
      const w = 150 + Math.floor(r() * 90);
      const h = 86 + r() * 30;
      const burnt = r() < 0.3;
      if (!painted) this.house(g, x, Math.min(w, this.width - x), h, top, burnt, r);
      // (now and then a burnt-out lot between houses: the valley and the castle show through)
      x += w + 4 + (r() < 0.35 ? 90 + Math.floor(r() * 80) : 0);
    }
  }

  house(g, x, w, h, top, burnt, r) {
    const y = top - h;
    g.fillStyle(burnt ? COL.wallDark : COL.wall, 1).fillRect(x, y, w, h);
    // timber frame
    g.fillStyle(COL.timber, 1);
    g.fillRect(x, y, w, 6).fillRect(x, y, 7, h).fillRect(x + w - 7, y, 7, h).fillRect(x, y + h * 0.45, w, 5);
    g.lineStyle(5, COL.timber, 1).lineBetween(x + 7, y + h * 0.45, x + w * 0.4, y + 6).lineBetween(x + w - 7, y + h * 0.45, x + w * 0.6, y + 6);
    // gable roof (or what's left of it)
    if (!burnt) {
      g.fillStyle(0x1a1412, 1).fillTriangle(x - 10, y + 2, x + w + 10, y + 2, x + w / 2, y - 40);
    } else {
      g.fillStyle(COL.timber, 1);
      for (let k = 0; k < 4; k++) g.fillRect(x + 10 + k * (w / 4), y - 30 + k * 6, 6, 34 - k * 6); // charred rafters
    }
    // door and windows: fire inside, or dark
    g.fillStyle(0x0a0706, 1).fillRect(x + w * 0.12, top - 64, 30, 64);
    const lit = burnt || r() < 0.55;
    g.fillStyle(lit ? COL.fire : 0x0a0706, lit ? 0.9 : 1);
    g.fillRect(x + w * 0.55, y + h * 0.5, 20, 16).fillRect(x + w * 0.3, y + 12, 16, 14);
    if (lit) {
      const glow = this.scene.add.image(x + w * 0.55 + 10, y + h * 0.5 + 8, 'glow').setScale(1.8).setTint(COL.fire).setAlpha(0.45)
        .setBlendMode(Phaser.BlendModes.ADD).setDepth(DEPTH.floor - 0.9);
      this.flickers.push({ img: glow, base: 0.4, amp: 0.15, rate: 0.12 + r() * 0.1 });
    }
    if (burnt) this.flame(x + w / 2, y - 6, 1.1 + r() * 0.6);
  }

  flame(x, y, size) {
    const s = this.scene;
    const f = s.add.image(x, y, 'flame').setOrigin(0.5, 1).setScale(size * 0.9, size * 0.6).setTint(COL.fire)
      .setBlendMode(Phaser.BlendModes.ADD).setDepth(DEPTH.floor - 0.8).setAlpha(0.85);
    s.tweens.add({ targets: f, scaleY: size * 0.85, scaleX: size * 0.75, duration: 220 + Math.random() * 180, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    const glow = s.add.image(x, y - 20, 'glow').setScale(size * 3).setTint(COL.fire).setAlpha(0.35).setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(DEPTH.floor - 0.85);
    this.flickers.push({ img: glow, base: 0.32, amp: 0.12, rate: 0.15 });
  }

  // the barn: big doors at the back of the mill yard (the wreckage prop pins them shut)
  drawBarn(g, x0, x1, top) {
    const w = x1 - x0;
    g.fillStyle(0x2e2018, 1).fillRect(x0, top - 150, w, 150);
    g.fillStyle(0x1a1210, 1).fillTriangle(x0 - 12, top - 148, x1 + 12, top - 148, (x0 + x1) / 2, top - 220);
    g.fillStyle(COL.timber, 1);
    for (let x = x0 + 10; x < x1; x += 22) g.fillRect(x, top - 150, 3, 150);
    // the doors
    g.fillStyle(0x140c08, 1).fillRect(x0 + w / 2 - 60, top - 110, 120, 110);
    g.lineStyle(4, 0x3a2414, 1).lineBetween(x0 + w / 2 - 60, top - 110, x0 + w / 2 + 60, top).lineBetween(x0 + w / 2 + 60, top - 110, x0 + w / 2 - 60, top);
    this.flame(x0 + 40, top - 150, 1.4);
  }

  // the stables: a long burning stable block, a barred gate in the middle (the wreckage prop
  // is the bar); the horses rear inside until it's smashed, then the doorway is empty
  drawStables(g, x0, x1, top, gx) {
    g.fillStyle(0x2a1c14, 1).fillRect(x0, top - 120, x1 - x0, 120);
    g.fillStyle(0x16100c, 1).fillRect(x0 - 14, top - 136, x1 - x0 + 28, 18); // the eaves
    g.fillStyle(COL.timber, 1);
    for (let x = x0 + 8; x < x1; x += 52) g.fillRect(x, top - 120, 6, 120);
    // the stalls' half-doors either side, lit from within
    for (let x = x0 + 30; x < x1 - 40; x += 104) {
      if (Math.abs(x + 22 - gx) < 90) continue;
      g.fillStyle(0x0c0806, 1).fillRect(x, top - 96, 44, 56);
      g.fillStyle(COL.fire, 0.55).fillRect(x + 4, top - 92, 36, 22);
    }
    for (let x = x0 + 40; x < x1; x += 120) this.flame(x, top - 136, 1.2);
    // the gate: dark, with the horses inside it (drawn each frame: updateStables)
    g.fillStyle(0x0a0605, 1).fillRect(gx - 80, top - 110, 160, 110);
    this.stables = { gx, top, g: this.scene.add.graphics().setDepth(DEPTH.floor - 0.95) };
  }

  updateStables(t) {
    const S = this.stables;
    if (!S) return;
    const n = this.stage.story?.npcs.find((q) => q.id === 'horses');
    const inside = !n || n.state === 'trapped';
    const g = S.g.clear();
    if (S.painted && inside) return; // (the painting has them in it)
    if (!inside) {
      // the gate hangs open on an empty, burning stall
      g.fillStyle(COL.fire, 0.35 + 0.1 * Math.sin(t * 0.2)).fillRect(S.gx - 70, S.top - 100, 140, 100);
      g.fillStyle(0x2a1e16, 1).fillRect(S.gx - 96, S.top - 110, 18, 110).fillRect(S.gx + 78, S.top - 110, 18, 110);
      return;
    }
    // three heads rearing and tossing in the dark, the firelight behind them
    g.fillStyle(COL.fire, 0.25 + 0.15 * Math.sin(t * 0.3)).fillRect(S.gx - 76, S.top - 106, 152, 60);
    for (let i = 0; i < 3; i++) {
      const hx = S.gx - 46 + i * 46; const rear = Math.sin(t * 0.18 + i * 2.1) * 10;
      g.fillStyle(0x1e140e, 1).fillTriangle(hx - 12, S.top - 30, hx + 12, S.top - 30, hx + 4, S.top - 86 - rear);
      g.fillEllipse(hx + 10, S.top - 88 - rear, 30, 15);
      g.fillStyle(0xffd0a0, 0.9).fillRect(hx + 12, S.top - 92 - rear, 3, 3); // a white eye
    }
    // the gate's bars
    g.fillStyle(0x3a2616, 1);
    for (let x = S.gx - 76; x <= S.gx + 70; x += 24) g.fillRect(x, S.top - 110, 7, 110);
  }

  // the longhall: the village's great hall, its roof on fire end to end
  drawLonghall(g, x0, x1, top) {
    const h = 190;
    g.fillStyle(0x2a1e18, 1).fillRect(x0, top - h, x1 - x0, h);
    g.fillStyle(0x16100c, 1).fillTriangle(x0 - 20, top - h, x1 + 20, top - h, (x0 + x1) / 2, top - h - 120);
    g.fillStyle(COL.timber, 1);
    for (let x = x0 + 40; x < x1; x += 90) g.fillRect(x, top - h, 12, h); // the great posts
    g.fillRect(x0, top - h, x1 - x0, 10).fillRect(x0, top - 80, x1 - x0, 8);
    // carved dragon heads at the gable ends
    g.fillTriangle(x0 - 20, top - h, x0 - 50, top - h - 40, x0, top - h - 10);
    g.fillTriangle(x1 + 20, top - h, x1 + 50, top - h - 40, x1, top - h - 10);
    // the hall's doors stand open on the fire inside
    g.fillStyle(COL.fire, 0.9).fillRect((x0 + x1) / 2 - 50, top - 120, 100, 120);
    g.fillStyle(COL.fireHot, 0.7).fillRect((x0 + x1) / 2 - 30, top - 90, 60, 90);
    for (let x = x0 + 60; x < x1; x += 140) this.flame(x, top - h - 20 - Math.abs(x - (x0 + x1) / 2) * -0.1, 1.6);
  }

  // the north gate: a palisade with the gate open on the road north (and the castle
  // beyond it, on the horizon behind)
  drawGate(g, x0, x1, top) {
    const gx = this.data.exit?.x ?? x1 - 120;
    for (let x = x0; x < x1; x += 18) {
      if (x > gx - 80 && x < gx + 80) continue; // the opening
      g.fillStyle(0x221a14, 1).fillRect(x, top - 130 - ((x * 7) % 13), 15, 130 + ((x * 7) % 13));
      g.fillStyle(0x120c08, 1).fillTriangle(x, top - 130 - ((x * 7) % 13), x + 15, top - 130 - ((x * 7) % 13), x + 7.5, top - 146 - ((x * 7) % 13));
    }
    // the gate towers and the open leaves
    g.fillStyle(0x1a1410, 1).fillRect(gx - 110, top - 190, 34, 190).fillRect(gx + 76, top - 190, 34, 190);
    g.fillRect(gx - 116, top - 200, 46, 14).fillRect(gx + 70, top - 200, 46, 14);
    g.fillStyle(0x2a1e16, 1).fillRect(gx - 76, top - 120, 14, 120).fillRect(gx + 62, top - 120, 14, 120);
    // torches either side
    this.flame(gx - 93, top - 196, 0.8);
    this.flame(gx + 93, top - 196, 0.8);
  }

  drawStreet() {
    const s = this.scene;
    const top = SETTINGS.world.floorTop - 50;
    if (this.art.has('ground')) {
      this.art.ground();
      if (this.data.well) this.drawWell(this.data.well);
      return;
    }
    const g = s.add.graphics().setDepth(DEPTH.floor);
    g.fillStyle(COL.street, 1).fillRect(0, top, this.width, SETTINGS.height - top + 40);
    // packed earth with ruts; cobbles in the market square
    const sq = this.data.sections.find((sec) => sec.id === 'square');
    g.lineStyle(1, COL.streetLine, 1);
    for (let y = top + 26; y < SETTINGS.height + 40; y += 42) g.lineBetween(0, y, this.width, y);
    if (sq) {
      g.fillStyle(COL.cobble, 1);
      for (let y = top + 10, row = 0; y < SETTINGS.height + 30; y += 22, row++) {
        for (let x = sq.x0 + (row % 2) * 18; x < sq.x1; x += 36) g.fillRect(x, y, 30, 16);
      }
    }
    // ash and soot drifts along the foot of the houses
    g.fillStyle(0x000000, 0.3).fillRect(0, top, this.width, 26);
    if (this.data.well) this.drawWell(this.data.well);
  }

  // the square's well (where the family is held): stone ring, a roof on two posts
  drawWell({ x, z }) {
    if (this.art.piece('well', x - 70, x + 70, { depth: z - 1, bottom: z - (SETTINGS.world.floorTop - 50) })) return;
    const g = this.scene.add.graphics().setDepth(z - 1);
    g.fillStyle(0x3a3a3e, 1).fillRect(x - 30, z - 34, 60, 34);
    g.fillStyle(0x4a4a50, 1).fillEllipse(x, z - 34, 64, 16);
    g.fillStyle(0x0a0a0c, 1).fillEllipse(x, z - 34, 48, 10);
    g.fillStyle(0x2a1c14, 1).fillRect(x - 28, z - 96, 5, 62).fillRect(x + 23, z - 96, 5, 62);
    g.fillTriangle(x - 38, z - 94, x + 38, z - 94, x, z - 118);
    g.lineStyle(1, 0x8a7a5a, 1).lineBetween(x, z - 94, x, z - 50);
  }

  // drifting embers in the air over the street
  makeEmbers() {
    const s = this.scene;
    for (let i = 0; i < 40; i++) {
      const img = s.add.image(0, 0, 'glow').setScale(0.12 + Math.random() * 0.12).setTint(COL.ember)
        .setBlendMode(Phaser.BlendModes.ADD).setDepth(DEPTH.floor + 3.5);
      this.embers.push({ img, x: Math.random() * SETTINGS.width, y: Math.random() * 300, vx: -10 - Math.random() * 20, vy: -12 - Math.random() * 20, ph: Math.random() * 6 });
    }
  }

  update() {
    const t = this.scene.time.now / 16.7;
    this.updateStables(t);
    for (const f of this.flickers) f.img.setAlpha(f.base + Math.sin(t * f.rate + f.base * 40) * f.amp + (Math.random() - 0.5) * f.amp * 0.4);
    const wv = this.scene.cameras.main.worldView;
    for (const e of this.embers) {
      e.x += e.vx / 60; e.y += e.vy / 60; e.ph += 0.05;
      if (e.y < -40) { e.y = wv.height * 0.6 + Math.random() * 30; e.x = Math.random() * wv.width; }
      if (e.x < -20) e.x = wv.width + 20;
      e.img.setPosition(wv.x + e.x + Math.sin(e.ph) * 6, wv.y + e.y).setAlpha(0.5 + Math.sin(e.ph * 3) * 0.3);
    }
  }
}
