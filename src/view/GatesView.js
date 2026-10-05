// GatesView.js — THE IRON GATES' backdrop (campaign level 5, data/stageGates.js).
// ALL TEMPORARY ART, drawn in code; the painted replacements (data/levelArt.js 'gates')
// take over piece by piece as they're saved.
//
// Its colours: black iron and soot-grey stone under a smoke-brown sky lit red from below by
// the siege fires; the Black Keep filling the sky behind (black stone, violet light); the
// burning town orange. Inside the gatehouse it is dark stone and torchlight.
//
// Back to front: the smoky sky, the Keep on its crag with the smoke columns rising round
// it, the town's roofs and towers nearer, the wall behind the lane (section by section:
// the ditch and the outer wall's foot, the gatehouse's inside, the gate arch, the burning
// houses, the inner wall with its archers' walk, the open road to the Keep), then the
// ground. Ash and embers drift over everything.

import { SETTINGS } from '../config/settings.js';
import { DEPTH } from './depths.js';
import { drawCastle } from './castle.js';
import { PaintedLevel } from './levelArt.js';

const COL = {
  skyTop: 0x1a1214, skyLow: 0x6a3a26, smoke: 0x2a2222, smokeLit: 0x5a3426,
  roof: 0x1e1a1c, roofLit: 0x3a2a24, tower: 0x161418,
  stone: 0x34323a, stoneDark: 0x1e1d22, stoneLit: 0x4e4b54, mortar: 0x26252b,
  iron: 0x2a2a30, ironLit: 0x4a4a54, rivet: 0x6a6a72,
  ground: 0x3a3634, groundLine: 0x2c2826, mud: 0x4a3e34,
  timber: 0x3a2818, cloth: 0x6a1a14, fire: 0xff7a30, keep: 0xa88aff,
};

// where the far layers meet the ground, at vertical scroll 0.5 (see view/AscentView.js)
const HORIZON = 262;
const WALL = 150;    // the outer wall's foot / the town's houses behind the lane
const INSIDE = 300;  // inside the gatehouse the stone goes all the way up

function rng(seed) {
  let k = seed;
  return () => { k = (k * 9301 + 49297) % 233280; return k / 233280; };
}

export class GatesBackdrop {
  constructor(scene, stage) {
    this.scene = scene;
    this.stage = stage;
    this.data = stage.data;
    this.width = this.data.width;
    this.flickers = [];
    this.smokes = [];
    this.motes = [];
    const art = this.art = new PaintedLevel(scene, 'gates', this.width);
    if (art.has('sky')) art.layer('sky', DEPTH.sky); else this.drawSky();
    if (art.has('far')) art.layer('far', DEPTH.far - 1); else this.drawKeep();
    if (art.has('mid')) art.layer('mid', DEPTH.far + 2); else this.drawTown();
    if (art.has('wall')) art.wall(); else this.drawWalls();
    if (art.has('ground')) art.ground(); else this.drawGround();
    this.drawSetPieces();
    this.drawAsh();
  }

  get pad() { return SETTINGS.width * 2; }
  get top() { return SETTINGS.world.floorTop - 50; }
  sec(id) { return this.data.sections.find((s) => s.id === id); }

  // a smoke-brown sky, red-lit from below by the fires, smoke rolling across it
  drawSky() {
    const s = this.scene;
    const span = SETTINGS.width + this.pad * 2 + this.width * 0.1;
    const g = s.add.graphics().setDepth(DEPTH.sky).setScrollFactor(0.1, 0.4);
    g.fillGradientStyle(COL.skyTop, COL.skyTop, COL.skyLow, COL.skyLow, 1).fillRect(-this.pad, -700, span, SETTINGS.height + 900);
    const r = rng(5);
    for (let i = 0; i < 3; i++) {
      const c = s.add.graphics().setDepth(DEPTH.sky + 1 + i * 0.1).setScrollFactor(0.06 + i * 0.03, 0.4);
      for (let x = -this.pad; x < span; x += 80 + r() * 120) {
        const y = 150 + i * 34 + r() * 50; const w = 160 + r() * 260;
        c.fillStyle(i === 2 ? COL.smokeLit : COL.smoke, 0.45 - i * 0.08).fillEllipse(x, y, w, 30 + r() * 26);
      }
      this.smokes.push({ img: c, speed: 0.1 + i * 0.08 });
    }
  }

  // the Black Keep: across the town, filling the sky; columns of smoke rising round it
  drawKeep() {
    const s = this.scene;
    const c = this.data.castle ?? { x: SETTINGS.width * 0.6, scale: 1, detail: 1 };
    const g = s.add.graphics().setDepth(DEPTH.far - 2).setScrollFactor(0.05, 0.5);
    drawCastle(g, c.x, HORIZON + 30, c.scale, c.detail ?? 1);
    const glow = s.add.image(c.x, HORIZON - 150 * c.scale, 'glow').setScale(6 * c.scale + 1).setTint(COL.keep).setAlpha(0.2)
      .setBlendMode(Phaser.BlendModes.ADD).setDepth(DEPTH.far - 2.5).setScrollFactor(0.05, 0.5);
    this.flickers.push({ img: glow, base: 0.18, amp: 0.05, rate: 0.02 });
    // the smoke columns of the burning town, leaning with the wind
    const r = rng(13);
    const sm = s.add.graphics().setDepth(DEPTH.far - 1.5).setScrollFactor(0.08, 0.5);
    for (let i = 0; i < 7; i++) {
      const x = c.x - 700 + i * 230 + r() * 80; let y = HORIZON + 20;
      for (let k = 0; k < 9; k++) {
        sm.fillStyle(COL.smoke, 0.5 - k * 0.04).fillCircle(x + k * 14, y, 18 + k * 7);
        y -= 26;
      }
      const fire = s.add.image(x, HORIZON + 24, 'glow').setScale(2.2, 1.2).setTint(COL.fire).setAlpha(0.4)
        .setBlendMode(Phaser.BlendModes.ADD).setDepth(DEPTH.far - 1.4).setScrollFactor(0.08, 0.5);
      this.flickers.push({ img: fire, base: 0.35, amp: 0.12, rate: 0.15 + i * 0.02 });
    }
  }

  // nearer: the roofs and towers of the town inside the walls, black against the glow
  drawTown() {
    const s = this.scene;
    const r = rng(29);
    const span = SETTINGS.width + this.width * 0.45 + this.pad;
    const g = s.add.graphics().setDepth(DEPTH.far + 2).setScrollFactor(0.45, 0.85);
    const base = 300;
    for (let x = -this.pad / 2; x < span; x += 50 + r() * 70) {
      const w = 50 + r() * 70; const h = 40 + r() * 50;
      g.fillStyle(COL.roof, 1).fillRect(x, base - h, w, h + 10);
      g.fillTriangle(x - 6, base - h, x + w + 6, base - h, x + w / 2, base - h - 26 - r() * 16); // a gable
      if (r() < 0.25) g.fillStyle(COL.tower, 1).fillRect(x + w * 0.3, base - h - 70, 22, 70); // a tower
      if (r() < 0.4) g.fillStyle(0xffa050, 0.7).fillRect(x + 8 + r() * (w - 20), base - h + 10 + r() * 20, 5, 7); // a lit window
    }
    g.fillStyle(COL.roof, 1).fillRect(-this.pad, base, span + this.pad, 200);
  }

  // the wall behind the lane, section by section
  drawWalls() {
    const s = this.scene;
    const top = this.top;
    const g = s.add.graphics().setDepth(DEPTH.floor - 1);
    const r = rng(43);
    const stone = (x0, x1, h, dark = false) => {
      g.fillStyle(dark ? COL.stoneDark : COL.stone, 1).fillRect(x0, top - h, x1 - x0, h + 10);
      for (let y = top - h + 6; y < top; y += 18) {
        const off = (Math.floor(y / 18) % 2) * 20;
        for (let x = x0 + off; x < x1; x += 40) g.fillStyle(COL.mortar, 0.7).fillRect(x, y, 2, 16);
        g.fillStyle(COL.mortar, 0.7).fillRect(x0, y + 16, x1 - x0, 2);
      }
      for (let x = x0; x < x1; x += 30 + r() * 60) g.fillStyle(r() < 0.5 ? COL.stoneLit : COL.stoneDark, 0.35).fillRect(x, top - h + r() * (h - 20), 20 + r() * 40, 8 + r() * 14);
    };
    const field = this.sec('field'); const gh = this.sec('gatehouse'); const winch = this.sec('winch');
    const yard = this.sec('yard'); const town = this.sec('town'); const marshal = this.sec('marshal');
    // I: the ditch's far bank and its stakes; the outer wall rising behind at the end
    g.fillStyle(COL.mud, 1).fillRect(field.x0 - this.pad, top - 40, field.x1 - field.x0 + this.pad, 50);
    for (let x = field.x0 - this.pad; x < field.x1 - 300; x += 26 + r() * 20) {
      g.fillStyle(COL.timber, 1).fillTriangle(x, top - 30, x + 8, top - 30, x + 2 + r() * 10, top - 70 - r() * 20); // stakes
    }
    stone(field.x1 - 300, field.x1, WALL + 120);
    for (let x = field.x1 - 300; x < field.x1; x += 24) g.fillStyle(COL.stone, 1).fillRect(x, top - WALL - 136, 14, 16); // battlements
    // II-III: inside the gatehouse: stone all the way up, arrow slits, a ceiling beam
    stone(gh.x0, winch.x1, INSIDE, true);
    g.fillStyle(COL.timber, 1).fillRect(gh.x0, top - INSIDE, winch.x1 - gh.x0, 18);
    for (let x = gh.x0 + 80; x < winch.x1; x += 260) {
      g.fillStyle(0x0a0808, 1).fillRect(x, top - INSIDE + 60, 10, 50); // an arrow slit
      g.fillStyle(0x8a3a20, 0.4).fillRect(x + 2, top - INSIDE + 70, 6, 30); // fire outside it
    }
    // III: chains running up from the winch into the dark
    g.fillStyle(COL.ironLit, 1);
    for (const x of [4380, 4600]) for (let y = top - INSIDE + 18; y < top - 160; y += 14) g.fillRect(x - 5, y, 10, 6);
    // IV: the wall's inner face, the gate arch in it, a walk along its top
    stone(yard.x0 - 40, yard.x1, WALL + 60);
    g.fillStyle(COL.timber, 1).fillRect(yard.x0 - 40, top - WALL - 60, yard.x1 - yard.x0 + 40, 10);
    // V: the town's houses, burning
    for (let x = town.x0; x < town.x1; x += 180) {
      const h = 120 + ((x * 13) % 50);
      g.fillStyle(0x2a2220, 1).fillRect(x + 10, top - h, 160, h + 10);
      g.fillStyle(COL.timber, 1).fillRect(x + 10, top - h, 160, 6).fillRect(x + 10, top - h, 6, h).fillRect(x + 164, top - h, 6, h);
      g.fillStyle(0x1a1412, 1).fillTriangle(x, top - h, x + 180, top - h, x + 90, top - h - 60);
      g.fillStyle(0x0a0606, 1).fillRect(x + 70, top - 60, 36, 60); // a door
      g.fillStyle(0xffa050, 0.8).fillRect(x + 30, top - h + 30, 18, 20).fillRect(x + 130, top - h + 30, 18, 20); // windows, lit from inside by the fire
      const fire = s.add.image(x + 90, top - h - 30, 'glow').setScale(2.6, 2).setTint(COL.fire).setAlpha(0.55)
        .setBlendMode(Phaser.BlendModes.ADD).setDepth(DEPTH.floor - 0.9);
      this.flickers.push({ img: fire, base: 0.5, amp: 0.2, rate: 0.22 });
    }
    // VI: the inner wall, taller, the archers' walk along its top with their shapes
    stone(marshal.x0, marshal.x1, WALL + 140);
    for (let x = marshal.x0; x < marshal.x1; x += 24) g.fillStyle(COL.stone, 1).fillRect(x, top - WALL - 156, 14, 16);
    for (let x = marshal.x0 + 100; x < marshal.x1 - 60; x += 140) {
      g.fillStyle(0x0e0c0e, 1).fillRect(x, top - WALL - 182, 12, 26).fillCircle(x + 6, top - WALL - 188, 6); // an archer
      g.lineStyle(2, 0x0e0c0e, 1).beginPath(); g.arc(x + 16, top - WALL - 172, 12, -1.2, 1.2); g.strokePath(); // his bow
    }
    g.fillStyle(COL.cloth, 1); // the Marshal's banners
    for (let x = marshal.x0 + 200; x < marshal.x1; x += 420) g.fillRect(x, top - WALL - 120, 46, 100).fillTriangle(x, top - WALL - 20, x + 46, top - WALL - 20, x + 23, top - WALL);
    g.fillStyle(0x000000, 0.35).fillRect(field.x0 - this.pad, top - 30, this.width + this.pad, 30);
  }

  drawGround() {
    const g = this.scene.add.graphics().setDepth(DEPTH.floor);
    const top = this.top;
    const end = this.width + this.pad;
    g.fillStyle(COL.ground, 1).fillRect(-this.pad, top, end + this.pad, SETTINGS.height - top + 40);
    g.lineStyle(1, COL.groundLine, 1);
    for (let y = top + 24; y < SETTINGS.height + 40; y += 34) g.lineBetween(-this.pad, y, end, y);
    const r = rng(61);
    for (let x = -this.pad; x < end; x += 30 + r() * 30) g.lineBetween(x, top + r() * 200, x + 6, top + 30 + r() * 200); // cracked flags
    // the killing ground: mud, churned
    const field = this.sec('field');
    g.fillStyle(COL.mud, 0.7).fillRect(-this.pad, top, field.x1 - 200 + this.pad, SETTINGS.height - top + 40);
    for (let x = -this.pad; x < field.x1 - 200; x += 14 + r() * 30) g.fillStyle(0x2a221c, 0.7).fillRect(x, top + 10 + r() * (SETTINGS.height - top - 20), 8 + r() * 14, 3);
    g.fillStyle(0x000000, 0.3).fillRect(-this.pad, top, end + this.pad, 22);
  }

  // set pieces painted later; stand-ins now: the gatehouse towers over the killing ground,
  // the gate arch round the great gate, the granary, the road to the Keep
  drawSetPieces() {
    const s = this.scene;
    const top = this.top;
    const field = this.sec('field');
    if (field && !this.art.piece('gatehouse', field.x1 - 340, field.x1 + 40)) {
      // the outer gatehouse: two square towers and the shut gate between, red fire on top
      const g = s.add.graphics().setDepth(DEPTH.floor - 0.98);
      const x = field.x1 - 150;
      g.fillStyle(COL.stone, 1).fillRect(x - 170, top - WALL - 220, 90, WALL + 220).fillRect(x + 60, top - WALL - 220, 90, WALL + 220);
      for (let k = 0; k < 4; k++) g.fillRect(x - 170 + k * 26, top - WALL - 236, 16, 16).fillRect(x + 60 + k * 26, top - WALL - 236, 16, 16);
      g.fillStyle(COL.iron, 1).fillRect(x - 80, top - 150, 140, 150); // the gate, shut
      g.lineStyle(3, COL.ironLit, 1);
      for (let k = -70; k < 60; k += 18) g.lineBetween(x + k, top - 150, x + k, top);
      for (let y = top - 140; y < top; y += 30) g.lineBetween(x - 80, y, x + 60, y);
      for (const tx of [x - 125, x + 105]) {
        const fire = s.add.image(tx, top - WALL - 240, 'glow').setScale(2).setTint(COL.fire).setAlpha(0.5)
          .setBlendMode(Phaser.BlendModes.ADD).setDepth(DEPTH.floor - 0.9);
        this.flickers.push({ img: fire, base: 0.45, amp: 0.15, rate: 0.2 });
      }
    }
    const winch = this.sec('winch');
    if (winch && !this.art.piece('winch_room', winch.x1 - 520, winch.x1)) {
      // the gate's arch at the room's far end (the gate itself is the iron in the lane)
      const g = s.add.graphics().setDepth(DEPTH.floor - 0.97);
      const x = winch.x1 - 40;
      g.fillStyle(COL.stoneLit, 1).fillRect(x - 70, top - 240, 30, 240).fillRect(x + 40, top - 240, 30, 240);
      g.beginPath(); g.arc(x, top - 240, 70, Math.PI, 0); g.fillPath();
      g.fillStyle(COL.stoneDark, 1).beginPath(); g.arc(x, top - 240, 40, Math.PI, 0); g.fillPath();
    }
    const town = this.sec('town');
    if (town && !this.art.piece('town', town.x0 + 820, town.x0 + 1160)) {
      // the granary: a tall timber barn, its doors barred, smoke from its eaves
      const g = s.add.graphics().setDepth(DEPTH.floor - 0.97);
      const x = 7380;
      g.fillStyle(0x3a2a1a, 1).fillRect(x - 140, top - 200, 280, 210);
      g.fillStyle(0x2a1c10, 1).fillTriangle(x - 160, top - 200, x + 160, top - 200, x, top - 290);
      g.fillStyle(0x1a120a, 1).fillRect(x - 60, top - 120, 120, 120);
      for (let k = -130; k < 140; k += 20) g.fillStyle(0x2a1c10, 1).fillRect(x + k, top - 200, 4, 200);
      const fire = s.add.image(x, top - 230, 'glow').setScale(3.4, 2.4).setTint(COL.fire).setAlpha(0.6)
        .setBlendMode(Phaser.BlendModes.ADD).setDepth(DEPTH.floor - 0.9);
      this.flickers.push({ img: fire, base: 0.55, amp: 0.2, rate: 0.25 });
    }
    const marshal = this.sec('marshal');
    if (marshal) this.art.piece('inner_wall', marshal.x0, marshal.x1);
    // the Keep road: the wall ends, the ground opens out, the Keep's bridge far ahead
    const keep = this.sec('keep');
    if (keep && !this.art.piece('keep_road', keep.x0 + 100, keep.x1 + 300)) {
      const g = s.add.graphics().setDepth(DEPTH.floor - 0.99);
      const x0 = keep.x0 + 60; const x1 = this.width + this.pad;
      g.fillStyle(COL.stone, 1).fillTriangle(x0 - 60, top - WALL - 140, x0 + 30, top, x0 - 60, top); // the inner wall's end
      g.fillStyle(0x2a2226, 1).fillRect(x0 + 300, top - 50, x1 - x0 - 300, 50); // the bridge's approach
      g.fillStyle(COL.tower, 1).fillRect(x0 + 520, top - 120, 40, 70).fillRect(x0 + 700, top - 120, 40, 70); // the bridge towers
      g.fillStyle(0x0a080e, 1).fillRect(x0 + 560, top - 70, 140, 10);
      const gl = s.add.image(x0 + 640, top - 100, 'glow').setScale(4, 2).setTint(COL.keep).setAlpha(0.2)
        .setBlendMode(Phaser.BlendModes.ADD).setDepth(DEPTH.floor - 0.95);
      this.flickers.push({ img: gl, base: 0.18, amp: 0.06, rate: 0.05 });
    }
  }

  // ash falling, and embers rising from the fires
  drawAsh() {
    for (let i = 0; i < 30; i++) {
      const ember = i % 4 === 0;
      const img = this.scene.add.image(0, 0, 'dot').setTint(ember ? 0xff9a40 : 0x8a8480).setScale(ember ? 0.3 : 0.4).setAlpha(ember ? 0.8 : 0.5).setDepth(DEPTH.floor + 3.5);
      if (ember) img.setBlendMode(Phaser.BlendModes.ADD);
      this.motes.push({ img, ember, x: Math.random() * SETTINGS.width, y: Math.random() * SETTINGS.height, v: 0.4 + Math.random() * 0.8, sway: Math.random() * 6 });
    }
  }

  update() {
    const t = this.scene.time.now / 16.7;
    for (const f of this.flickers) f.img.setAlpha(f.base + Math.sin(t * f.rate + f.base * 40) * f.amp + (Math.random() - 0.5) * f.amp * 0.3);
    for (const c of this.smokes) c.img.x = Math.sin(t * 0.0005 * (1 + c.speed)) * 140;
    const wv = this.scene.cameras.main.worldView;
    for (const m of this.motes) {
      m.y += m.ember ? -m.v * 1.6 : m.v;
      m.x -= 0.3;
      if (m.y > wv.height + 20) m.y = -20;
      if (m.y < -20) m.y = wv.height + 20;
      if (m.x < -20) m.x = wv.width + 20;
      m.img.setPosition(wv.x + m.x + Math.sin(t * 0.03 + m.sway) * 10, wv.y + m.y);
    }
  }
}
