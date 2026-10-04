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
import { playSfx } from '../core/Sfx.js';

const COL = {
  skyTop: 0x05070d, skyLow: 0x1c2733, mist: 0x8aa4b8,
  cliffFar: 0x0b1018, cliffMid: 0x121a24,
  floor: 0x232a2e, floorLine: 0x1a1f22,
  rockTop: 0x48535a, rockRim: 0xd8e4ea, rockFront: 0x252c31, rockShade: 0x171c20, rockSeam: 0x3a444a,
  plankTop: 0x8a5a32, plankRim: 0xe0a060, plankFront: 0x4a2c16, plankCrack: 0x2a160a,
  iron: 0x4a4e54, ironRim: 0xb8c2cc, ironDark: 0x1c1e22,
  rust: 0xa4502a, lantern: 0xffb050, secret: 0xb070ff, shrine: 0xff6a4a,
};

export class TerrainView {
  constructor(scene, stage) {
    this.scene = scene;
    this.stage = stage;
    this.terrain = stage.terrain;
    const data = stage.data;
    this.width = data.width ?? SETTINGS.world.width;
    if (data.theme === 'gallows') this.drawBackdrop();
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
      g.fillStyle(0x000000, 1).fillRect(p.x0, p.z0 - (p.z0 <= SETTINGS.world.floorTop ? 50 : 0), p.x1 - p.x0, p.z1 - p.z0 + (p.z0 <= SETTINGS.world.floorTop ? 50 : 0) + 40);
      // a cold glow at the lip so the edge reads
      g.lineStyle(2, 0x6a8aa8, 0.6);
      g.lineBetween(p.x0, p.z0, p.x0, p.z1 + 40);
      g.lineBetween(p.x1, p.z0, p.x1, p.z1 + 40);
      if (p.z0 > SETTINGS.world.floorTop) g.lineBetween(p.x0, p.z0, p.x1, p.z0);
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
    if (!b.solid) {
      v.top.setVisible(false); v.front.setVisible(false);
      return;
    }
    v.top.setVisible(true); v.front.setVisible(true);
    const mat = b.kind === 'crumble' ? 'plank' : b.kind === 'lift' ? 'iron' : 'rock';
    const C = mat === 'plank' ? [COL.plankTop, COL.plankRim, COL.plankFront]
      : mat === 'iron' ? [COL.iron, COL.ironRim, COL.ironDark] : [COL.rockTop, COL.rockRim, COL.rockFront];
    // top face (where you stand): the lightest surface around
    top.fillStyle(C[0], 1).fillRect(x0, yTop0, w, yTop1 - yTop0);
    if (mat === 'plank') { top.fillStyle(COL.plankCrack, 0.8); for (let x = x0 + 16; x < x1; x += 18) top.fillRect(x, yTop0, 2, yTop1 - yTop0); }
    if (mat === 'rock') {
      // flagstones receding into the lane, darker toward the back: it reads as a floor, not a wall
      const depth = yTop1 - yTop0;
      top.fillStyle(0x000000, 0.25).fillRect(x0, yTop0, w, depth * 0.35);
      top.lineStyle(1, COL.rockSeam, 1);
      for (let y = yTop0 + 18; y < yTop1 - 4; y += 26) top.lineBetween(x0, y, x1, y);
      for (let y = yTop0, row = 0; y < yTop1; y += 26, row++) {
        for (let x = x0 + (row % 2) * 30 + 20; x < x1; x += 60) top.lineBetween(x, y, x, Math.min(yTop1, y + 26));
      }
    }
    top.lineStyle(2, C[1], 0.9).lineBetween(x0, yTop0, x1, yTop0);
    // the landing rim along the front edge
    front.fillStyle(C[1], 1).fillRect(x0, yTop1 - 2, w, 3);
    // front face, down to the floor (or into the dark, over a pit)
    const floorY = b.z1;
    // rock goes down to the floor (or on down into the dark over a pit); a plank and the
    // cage are thin things hanging in the air
    const depthDown = mat === 'plank' ? 12 : mat === 'iron' ? 16
      : Math.max(0, b.top) + (this.terrain.inPit((x0 + x1) / 2, b.z1 - 1) ? 120 : 0);
    front.fillStyle(C[2], 1).fillRect(x0, yTop1 + 1, w, depthDown);
    if (mat === 'rock') {
      front.fillStyle(COL.rockShade, 1);
      for (let y = yTop1 + 14; y < floorY; y += 22) front.fillRect(x0, y, w, 2);
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

  // ------------------------------------------------------------ landmarks

  drawLanterns(list) {
    const s = this.scene;
    for (const l of list) {
      const y0 = l.z - Math.max(0, this.terrain?.groundAt(l.x, l.z) ?? 0);
      const g = s.add.graphics().setDepth(l.z - 0.2);
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
      const g = s.add.graphics().setDepth(r.z - 0.3);
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
    for (const v of this.blockGfx.values()) if (v.b.kind !== 'block') this.drawBlock(v);
  }
}
