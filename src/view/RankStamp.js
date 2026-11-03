// RankStamp.js — The level's grade slapped onto the victory screen (scenes/HUDScene.js
// showVictory; the grade itself is progression/LevelRank.js). Nick, 2026-11-03: "when given
// the rank it should feel really satisfying, it slaps onto the screen, and an S is treated
// like such a prestigious moment, and lesser for each lower score".
//
// Every grade drops from above the screen and SLAMS down (a squash on landing, a camera
// shake, a thud). Each step up adds to the show:
//   C  a dull iron letter and a small thud
//   B  bronze, a heavier blow, a puff of dust
//   A  blood red on steel, a white flash, a shockwave, blood thrown off it, cracks
//   S  the screen darkens and holds its breath, a gold glint, then a huge gold S crashes
//      in: full white flash, two shockwaves, a burst of blood and sparks, light rays
//      turning behind it, embers rising for as long as the screen is up, and BLOOD AXE
//      struck under it as a second blow.
// A painted stamp (textures 'rank-S' .. 'rank-C', view/rankArt.js) is used in place of the
// lettering where it's loaded.

import { FONT, epicFill } from './fonts.js';
import { playSfx } from '../core/Sfx.js';

// per grade, S first: size, fall height (scale it starts at), shake, flash, colours, sounds
export const STAMP = [
  { size: 170, from: 5.5, fall: 300, shake: [520, 0.03], flash: 0.95, rumble: [1, 1, 700],
    stops: ['#ffffff', '#fff2a0', '#f0b030', '#8a4a08', '#2a1200'], stroke: '#1a0a00', glow: 0xffd060,
    sfx: [['impaleKick', 1], ['gateClose', 0.9, -200], ['lightningStrike', 0.75], ['bloodSplatter', 0.8]],
    rings: 2, blood: 34, cracks: 9, rays: true, embers: true, hold: 1100 },
  { size: 160, from: 3.4, fall: 240, shake: [300, 0.016], flash: 0.45, rumble: [0.8, 0.6, 360],
    stops: ['#ffd0c0', '#e03028', '#8a0810', '#2a0004'], stroke: '#0a0000', glow: 0xff3020,
    sfx: [['impaleKick', 1], ['block', 0.7, -400], ['bloodSplatter', 0.55]],
    rings: 1, blood: 18, cracks: 5 },
  { size: 135, from: 2.5, fall: 230, shake: [200, 0.009], flash: 0, rumble: [0.5, 0.3, 200],
    stops: ['#f6dcb0', '#c08440', '#5a3410'], stroke: '#0a0500',
    sfx: [['kick', 1, -200], ['goreLand', 0.7]], dust: true },
  { size: 115, from: 1.8, fall: 220, shake: [130, 0.004], flash: 0, rumble: [0.3, 0.1, 120],
    stops: ['#c8c0b4', '#807468', '#3a342e'], stroke: '#000000',
    sfx: [['goreLand', 0.8, -300]] },
];

export class RankStamp {
  // rank: progression/LevelRank.js levelRank(); x, y: where the stamp lands; depth: above
  // the victory screen; delay: ms before it starts; dimmed: the tally text to fade under an S.
  constructor(scene, rank, { x, y, depth = 910, delay = 0, arena = null, under = [] } = {}) {
    this.scene = scene;
    this.rank = rank;
    this.x = x; this.y = y; this.depth = depth;
    this.arena = arena;
    this.under = under;
    this.parts = [];
    this.cfg = STAMP[rank.tier];
    const hold = this.cfg.hold ?? 450;
    if (this.cfg.hold) scene.time.delayedCall(delay, () => this.buildUp());
    scene.time.delayedCall(delay + hold, () => this.drop());
  }

  keep(o) { this.parts.push(o); return o; }

  // S only: the screen darkens, the tally sinks back, a low hum, a glint where it will land
  buildUp() {
    const s = this.scene, W = s.scale.width, H = s.scale.height;
    const dark = this.dark = this.keep(s.add.rectangle(0, 0, W, H, 0x000000).setOrigin(0).setAlpha(0).setDepth(this.depth - 2));
    s.tweens.add({ targets: dark, alpha: 0.55, duration: 900, ease: 'Sine.easeIn' });
    for (const t of this.under) s.tweens.add({ targets: t, alpha: 0.4, duration: 900 });
    playSfx(s, 'elecCharge', { volume: 0.35, pitch: -900, spread: 0, minGapMs: 0 });
    playSfx(s, 'swordUnsheath1', { volume: 0.7, pitch: -300, spread: 0, minGapMs: 0 });
    const glint = this.keep(s.add.rectangle(this.x, this.y, 4, 3, 0xfff4c0).setDepth(this.depth + 1).setBlendMode('ADD'));
    s.tweens.add({ targets: glint, width: 420, duration: 950, ease: 'Expo.easeIn' });
    s.tweens.add({ targets: glint, alpha: 0, delay: 950, duration: 120 });
  }

  // the stamp falls out of the air and lands
  drop() {
    const s = this.scene, C = this.cfg, r = this.rank;
    const key = `rank-${r.letter}`;
    let stamp;
    if (s.textures.exists(key)) {
      stamp = s.add.image(this.x, this.y, key);
      stamp.setScale((C.size * 1.25) / stamp.height);
    } else {
      stamp = s.add.text(this.x, this.y, r.letter, { fontFamily: FONT.display, fontSize: `${C.size}px`, padding: { x: 20, y: 10 } })
        .setOrigin(0.5).setStroke(C.stroke, Math.round(C.size / 14));
      epicFill(stamp, C.stops);
    }
    this.keep(stamp).setDepth(this.depth + 3);
    const base = stamp.scale;
    this.stamp = stamp; this.base = base;
    stamp.setScale(base * C.from).setAlpha(0).setAngle(r.tier === 0 ? -14 : -8).setY(this.y - C.fall);
    s.tweens.add({ targets: stamp, alpha: 1, duration: 90 });
    s.tweens.add({
      targets: stamp, scale: base, y: this.y, angle: r.tier === 3 ? -4 : -6,
      duration: r.tier === 0 ? 260 : 220, ease: 'Expo.easeIn',
      onComplete: () => this.impact(),
    });
  }

  impact() {
    const s = this.scene, C = this.cfg, r = this.rank, stamp = this.stamp, base = this.base;
    const x = this.x, y = this.y, D = this.depth;
    // the squash as it lands, then settled
    s.tweens.add({ targets: stamp, scaleX: base * 1.18, scaleY: base * 0.84, duration: 60, yoyo: true, ease: 'Quad.easeOut' });
    for (const [key, volume, pitch = 0] of C.sfx) playSfx(s, key, { volume, pitch, spread: 0, minGapMs: 0 });
    s.cameras.main.shake(C.shake[0], C.shake[1]);
    this.arena?.cameras?.main?.shake(C.shake[0], C.shake[1] * 1.4);
    this.arena?.rumble?.(...C.rumble);
    if (C.flash) {
      const W = s.scale.width, H = s.scale.height;
      const fl = this.keep(s.add.rectangle(0, 0, W, H, 0xffffff).setOrigin(0).setAlpha(C.flash).setDepth(D + 2));
      s.tweens.add({ targets: fl, alpha: 0, duration: r.tier === 0 ? 700 : 380, ease: 'Quad.easeOut' });
    }
    for (let i = 0; i < (C.rings ?? 0); i++) this.ring(i * 110, C.glow);
    if (C.cracks) this.cracks(C.cracks);
    if (C.blood) this.blood(C.blood, r.tier === 0);
    if (C.dust) this.dust();
    if (C.rays) this.rays();
    if (C.embers) this.embers();
    if (C.glow != null && r.tier <= 1) this.glow(C.glow);
    // (an S: once it's down, the tally behind it comes back up)
    if (r.tier === 0) {
      for (const t of this.under) s.tweens.add({ targets: t, alpha: 1, delay: 1400, duration: 800 });
      if (this.dark) s.tweens.add({ targets: this.dark, alpha: 0.25, delay: 1400, duration: 800 });
    }
    // the word under it: a second blow for an S, set down quietly for the rest
    const word = this.keep(s.add.text(x, y + C.size * 0.5 + 12, r.word, { fontFamily: FONT.display, fontSize: r.tier === 0 ? '34px' : '22px' })
      .setOrigin(0.5).setStroke('#000000', 5).setAlpha(0).setDepth(D + 3));
    word.setLetterSpacing?.(r.tier === 0 ? 6 : 4);
    epicFill(word, r.tier === 0 ? ['#fff6c8', '#f0c050', '#a06010'] : r.tier === 1 ? ['#ffb0a0', '#d0101a', '#5a0006'] : ['#e8dcc8', '#a89880', '#4a4038']);
    const score = this.keep(s.add.text(x, y + C.size * 0.5 + 12 + (r.tier === 0 ? 30 : 22), `RANK  ·  ${r.score} / 100`, { fontFamily: FONT.ui, fontSize: '14px', color: '#cdb391' })
      .setOrigin(0.5).setStroke('#000000', 3).setAlpha(0).setDepth(D + 3));
    if (r.tier === 0) {
      word.setScale(2.2);
      s.tweens.add({ targets: word, alpha: 1, scale: 1, delay: 520, duration: 200, ease: 'Expo.easeIn', onComplete: () => {
        playSfx(s, 'block', { volume: 0.8, pitch: -600, spread: 0, minGapMs: 0 });
        playSfx(s, 'impaleKick', { volume: 0.6, pitch: -300, spread: 0, minGapMs: 0 });
        s.cameras.main.shake(220, 0.012);
        this.arena?.rumble?.(0.6, 0.4, 200);
      } });
      s.tweens.add({ targets: score, alpha: 0.9, delay: 1000, duration: 500 });
    } else {
      s.tweens.add({ targets: word, alpha: 1, delay: 260, duration: 400 });
      s.tweens.add({ targets: score, alpha: 0.85, delay: 500, duration: 400 });
    }
  }

  // a shockwave ring spreading out from where it landed
  ring(delay, color = 0xffffff) {
    const s = this.scene;
    const g = this.keep(s.add.circle(this.x, this.y, this.cfg.size * 0.4).setStrokeStyle(6, color ?? 0xffffff, 1).setDepth(this.depth + 2).setBlendMode('ADD'));
    g.setAlpha(0);
    s.tweens.add({ targets: g, alpha: { from: 0.9, to: 0 }, scale: 3.2, delay, duration: 650, ease: 'Cubic.easeOut' });
  }

  // cracks in the "stone" it was struck into, out from under the stamp
  cracks(n) {
    const s = this.scene, g = this.keep(s.add.graphics().setDepth(this.depth + 1));
    g.lineStyle(3, 0x000000, 0.85);
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + Math.random() * 0.5;
      let px = this.x, py = this.y, len = this.cfg.size * (0.55 + Math.random() * 0.5);
      g.beginPath(); g.moveTo(px, py);
      for (let k = 0; k < 4; k++) {
        const aa = a + (Math.random() - 0.5) * 0.7;
        px += Math.cos(aa) * len / 4; py += Math.sin(aa) * len / 4 * 0.7;
        g.lineTo(px, py);
      }
      g.strokePath();
    }
    g.setAlpha(0);
    s.tweens.add({ targets: g, alpha: 1, duration: 60 });
  }

  // blood thrown off it as it hits
  blood(n, gold) {
    const s = this.scene;
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, v = 80 + Math.random() * 220;
      const red = Phaser.Display.Color.GetColor(140 + Math.random() * 80, 0, 6);
      const col = gold && i % 3 === 0 ? 0xffd060 : red;
      const d = this.keep(s.add.circle(this.x, this.y, 2 + Math.random() * 6, col).setDepth(this.depth + 2));
      s.tweens.add({
        targets: d, x: this.x + Math.cos(a) * v, y: this.y + Math.sin(a) * v * 0.7 + 40, scale: 0.4, alpha: 0,
        duration: 500 + Math.random() * 500, ease: 'Cubic.easeOut',
      });
    }
  }

  dust() {
    const s = this.scene;
    for (let i = 0; i < 12; i++) {
      const side = i % 2 ? 1 : -1;
      const p = this.keep(s.add.circle(this.x + side * 20, this.y + this.cfg.size * 0.35, 8 + Math.random() * 10, 0x8a7a64, 0.5).setDepth(this.depth + 1));
      s.tweens.add({ targets: p, x: p.x + side * (40 + Math.random() * 90), y: p.y - Math.random() * 30, scale: 2, alpha: 0, duration: 700 + Math.random() * 300, ease: 'Cubic.easeOut' });
    }
  }

  // a soft pulse of light round the letter
  glow(color) {
    const s = this.scene;
    const g = this.keep(s.add.circle(this.x, this.y, this.cfg.size * 0.62, color, 0.18).setDepth(this.depth + 2).setBlendMode('ADD'));
    s.tweens.add({ targets: g, alpha: 0.08, scale: 1.15, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  }

  // gold light rays turning slowly behind an S
  rays() {
    const s = this.scene, g = this.keep(s.add.graphics({ x: this.x, y: this.y }).setDepth(this.depth + 1).setBlendMode('ADD'));
    const n = 14, R = 250;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2, w = 0.09;
      g.fillStyle(0xffd070, 0.13);
      g.fillTriangle(0, 0, Math.cos(a - w) * R, Math.sin(a - w) * R, Math.cos(a + w) * R, Math.sin(a + w) * R);
    }
    g.setScale(0.2).setAlpha(0);
    s.tweens.add({ targets: g, scale: 1, alpha: 1, duration: 500, ease: 'Cubic.easeOut' });
    s.tweens.add({ targets: g, angle: 360, duration: 26000, repeat: -1 });
  }

  // embers drifting up for as long as the screen is up
  embers() {
    const s = this.scene;
    this.emberTimer = s.time.addEvent({ delay: 70, loop: true, callback: () => {
      const e = s.add.circle(this.x + (Math.random() - 0.5) * 260, this.y + 60 + Math.random() * 40, 1.5 + Math.random() * 2.5, Math.random() < 0.7 ? 0xffc040 : 0xff5020)
        .setDepth(this.depth + 2).setBlendMode('ADD');
      s.tweens.add({ targets: e, y: e.y - 160 - Math.random() * 140, x: e.x + (Math.random() - 0.5) * 60, alpha: 0, duration: 1400 + Math.random() * 900, onComplete: () => e.destroy() });
    } });
  }

  destroy() {
    this.emberTimer?.remove();
    for (const p of this.parts) p.destroy();
    this.parts = [];
  }
}
