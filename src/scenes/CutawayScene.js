// CutawayScene.js — The king's scenes: short cuts to the Black Keep at the campaign's
// milestones (docs/campaign/plan.md, "The king's arc"). Each one is a few lines over a
// still, staged room, played on top of the arena once a level is won. TEMPORARY ART: the
// throne room and KING VAURATH, THE ASHEN CROWN (working name; his art is being designed:
// project files final-boss-mockups/) are drawn in code. Warlord Malgor, his champion,
// stands at the throne in his own painted strips.
//
// SPACE / ENTER / J (pad A): next line.  ESC (pad B or Start): skip the scene. Skipping
// changes nothing: the scene is only shown, and its outcome is the level's (already saved).
//
// Scenes (CUTAWAYS): 'learns' (after the village: he hears they survived; confidence),
// 'convoy' (after Gallows Wood: the convoy lost; irritation — he strikes the throne),
// 'collapse' (after Hollow Mountain: the mine brought down on them and they walked out of
// it; frustration — he hurls the war map off its table).

import { SETTINGS } from '../config/settings.js';
import { FONT, epicFill } from '../view/fonts.js';
import { playSfx } from '../core/Sfx.js';

export const CUTAWAYS = {
  learns: {
    caption: 'THE BLACK KEEP',
    beats: [
      { who: 'MESSENGER', text: 'My king. The village... The Oath Keepers live. They cut down Varek and his men.' },
      { who: 'MALGOR', text: 'Let me ride out, my king. I will bring you their heads.' },
      { who: 'VAURATH', text: 'No. Varek was careless. I am not.' },
      { act: 'ember' }, // his power, shown: ember-fire gathered in one hand, then a wave of ash that puts out every torch
      { who: 'VAURATH', text: 'Three who should have died at the ford. A minor inconvenience.' },
      { who: 'VAURATH', text: 'Close the wood road. Hang whoever they try to free.' },
    ],
  },
  convoy: {
    caption: 'THE BLACK KEEP',
    beats: [
      { who: 'MESSENGER', text: 'My king... the Houndmaster is dead. The cages on the wood road are open. Empty.' },
      { who: 'VAURATH', text: 'Empty.' },
      { act: 'strike' }, // irritation: his fist on the arm of the throne; the stone cracks
      { who: 'MALGOR', text: 'Give me the mountain road, my king. They will not pass me.' },
      { who: 'VAURATH', text: 'The pass is already buried. Let them crawl into the mine after their people.' },
      { who: 'VAURATH', text: 'Work the captives harder. If the Oath Keepers want them, they can dig for them.' },
    ],
  },
  collapse: {
    caption: 'THE BLACK KEEP',
    beats: [
      { who: 'MESSENGER', text: 'My king... we brought the mountain down on them. They came out the far side. With the miners.' },
      { who: 'VAURATH', text: 'With the miners.' },
      { who: 'MALGOR', text: 'The Crusher is scrap. The Chain Warden is in the river.' },
      { act: 'hurl' }, // frustration: the war map and its markers flung off the table across the hall
      { who: 'VAURATH', text: 'Every road I close, they open. Every wall I build, they climb.' },
      { who: 'VAURATH', text: 'Send for the Siege Commander. Burn the ascent behind them. Leave them nothing to stand on.' },
    ],
  },
};

const SPEAKER = { VAURATH: '#ffb070', MALGOR: '#b8a0ff', MESSENGER: '#c8c0b0' };

export class CutawayScene extends Phaser.Scene {
  constructor() { super('Cutaway'); }

  init(data) {
    this.def = CUTAWAYS[data.kind] ?? CUTAWAYS.learns;
    this.onDone = data.onDone;
    this.step = -1;
    this.finished = false;
  }

  create() {
    const W = SETTINGS.width;
    const H = SETTINGS.height;
    this.cameras.main.setOrigin(0, 0).setZoom(SETTINGS.renderScale ?? 1);
    this.root = this.add.container(0, 0).setAlpha(0);
    this.drawRoom(W, H);
    // letterbox, caption, the line
    this.root.add(this.add.rectangle(0, 0, W, 54, 0x000000).setOrigin(0));
    this.root.add(this.add.rectangle(0, H, W, 54, 0x000000).setOrigin(0, 1));
    const cap = this.add.text(W / 2, 27, this.def.caption, { fontFamily: FONT.display, fontSize: '22px' }).setOrigin(0.5).setStroke('#000000', 5);
    cap.setLetterSpacing?.(6);
    epicFill(cap, ['#e8e0ff', '#a890e0', '#40306a']);
    this.root.add(cap);
    this.who = this.add.text(70, H - 92, '', { fontFamily: FONT.display, fontSize: '15px' }).setStroke('#000000', 4);
    this.line = this.add.text(70, H - 72, '', { fontFamily: FONT.body, fontSize: '18px', color: '#f0e6d6', wordWrap: { width: W - 140 } }).setStroke('#000000', 4);
    const hint = this.add.text(W - 14, H - 10, 'SPACE  next      ESC  skip', { fontFamily: FONT.ui, fontSize: '11px', color: '#9a8a7a' }).setOrigin(1, 1);
    this.root.add([this.who, this.line, hint]);
    this.tweens.add({ targets: this.root, alpha: 1, duration: 700, onComplete: () => this.next() });

    const k = this.input.keyboard;
    k?.on('keydown', (e) => {
      if (['Escape', 'Backspace'].includes(e.key)) this.finish();
      else if ([' ', 'Enter', 'j', 'J'].includes(e.key)) this.next();
    });
    this.input.gamepad?.on('down', (pad, button) => {
      if (button.index === 0) this.next();
      else if ([1, 8, 9].includes(button.index)) this.finish();
    });
    this.input.on('pointerdown', () => this.next());
  }

  // a dark hall of black stone in violet torchlight; the throne on its dais; the king
  // before it; the messenger on his knees
  drawRoom(W, H) {
    const g = this.add.graphics();
    g.fillGradientStyle(0x0a0812, 0x0a0812, 0x1a1428, 0x1a1428, 1).fillRect(0, 0, W, H);
    // pillars receding
    for (let i = 0; i < 6; i++) {
      const x = 40 + i * 180; const w = 46;
      g.fillStyle(0x0e0c16, 1).fillRect(x, 40, w, H - 150);
      g.fillStyle(0x221c34, 1).fillRect(x + w - 6, 40, 6, H - 150);
    }
    // floor
    g.fillStyle(0x100e18, 1).fillRect(0, H - 150, W, 150);
    g.lineStyle(1, 0x1e1a2a, 1);
    for (let y = H - 150; y < H; y += 20) g.lineBetween(0, y, W, y);
    // dais and throne
    g.fillStyle(0x18142a, 1).fillRect(W * 0.58, H - 176, W * 0.4, 30);
    g.fillStyle(0x241c38, 1).fillRect(W * 0.78, H - 330, 90, 160); // the throne: dark violet stone, so the king reads against it
    g.fillTriangle(W * 0.78, H - 330, W * 0.78 + 90, H - 330, W * 0.78 + 45, H - 380);
    g.fillStyle(0x6a50b0, 1).fillRect(W * 0.78 + 40, H - 300, 10, 10);
    this.root.add(g);
    this.torches = [];
    // violet torches
    for (const x of [130, 490, 850]) {
      const glow = this.add.image(x, 120, 'glow').setScale(3).setTint(0x9070ff).setAlpha(0.5).setBlendMode(Phaser.BlendModes.ADD);
      const fl = this.add.image(x, 128, 'flame').setOrigin(0.5, 1).setScale(0.5, 0.7).setTint(0xb090ff).setBlendMode(Phaser.BlendModes.ADD);
      this.tweens.add({ targets: [glow, fl], alpha: { from: 0.35, to: 0.65 }, duration: 300 + x % 200, yoyo: true, repeat: -1 });
      this.root.add([glow, fl]);
      (this.torches = this.torches ?? []).push(glow, fl);
    }
    // the messenger, on his knees, head bowed (a stand-in figure)
    const m = this.add.graphics();
    const mx = W * 0.3; const my = H - 112;
    m.fillStyle(0x3a3434, 1).fillRect(mx - 14, my - 36, 28, 26).fillRect(mx - 18, my - 12, 40, 12);
    m.fillStyle(0x5a5050, 1).fillCircle(mx + 12, my - 40, 8);
    this.messenger = m;
    this.root.add(m);
    // Warlord Malgor, his champion, at the foot of the dais: his own painted strips
    const sheet = this.registry.get('enemySprites')?.warlord;
    if (sheet && this.textures.exists(`${sheet.key}-react`)) {
      this.malgor = this.add.image(W * 0.6, H - 150, `${sheet.key}-react`, 'f0').setOrigin(sheet.ax / sheet.fw, sheet.ay / sheet.fh)
        .setScale(-1.1 / sheet.res, 1.1 / sheet.res);
      this.root.add(this.malgor);
    }
    // KING VAURATH on the throne: a stand-in figure (tall, crowned, a long cape, ember eyes)
    const k = this.add.graphics();
    const kx = W * 0.78 + 45; const ky = H - 176;
    k.fillStyle(0x4a0e14, 1).fillTriangle(kx - 40, ky, kx + 40, ky, kx, ky - 150); // the cape, black and deep crimson
    k.fillStyle(0x0c0a0e, 1).fillRect(kx - 22, ky - 120, 44, 92).fillRect(kx - 26, ky - 34, 20, 34).fillRect(kx + 6, ky - 34, 20, 34);
    k.fillStyle(0x0c0a0e, 1).fillRect(kx - 13, ky - 146, 26, 28); // the closed helm
    k.fillStyle(0x2a2210, 1); // the crown, black iron and old gold
    for (let i = -3; i <= 3; i++) k.fillTriangle(kx + i * 4 - 3, ky - 146, kx + i * 4 + 3, ky - 146, kx + i * 4, ky - 160 - (i % 2 ? 0 : 6));
    k.fillStyle(0xa08040, 1).fillRect(kx - 14, ky - 148, 28, 3);
    k.fillStyle(0x806030, 1).fillRect(kx - 34, ky - 70, 8, 70); // the greatsword, point down beside him
    k.fillStyle(0x5a4a70, 1).fillRect(kx + 19, ky - 120, 3, 92).fillRect(kx + 10, ky - 146, 3, 28); // a cold rim of torchlight
    this.eyes = this.add.rectangle(kx, ky - 134, 16, 3, 0xffa040);
    this.hand = this.add.image(kx - 30, ky - 84, 'glow').setScale(0).setTint(0xff8a30).setBlendMode(Phaser.BlendModes.ADD);
    this.root.add([k, this.eyes, this.hand]);
    this.tweens.add({ targets: this.eyes, alpha: { from: 0.6, to: 1 }, duration: 900, yoyo: true, repeat: -1 });
  }

  next() {
    if (this.finished || this.busy) return;
    this.step++;
    const b = this.def.beats[this.step];
    if (!b) { this.finish(); return; }
    if (b.act === 'ember') { this.ember(); return; }
    if (b.act === 'strike') { this.strike(); return; }
    if (b.act === 'hurl') { this.hurl(); return; }
    this.who.setText(b.who).setColor(SPEAKER[b.who] ?? '#d8d0c0');
    this.line.setText(b.text).setAlpha(0);
    this.tweens.add({ targets: this.line, alpha: 1, duration: 250 });
    // lines move on by themselves too
    this.auto?.remove();
    this.auto = this.time.delayedCall(1800 + b.text.length * 45, () => this.next());
  }

  // his power, shown: ember-fire gathers in his open hand; he closes it, and a wave of ash
  // and embers rolls down the hall, puts out every torch and throws the messenger flat
  ember() {
    this.busy = true;
    this.auto?.remove();
    this.who.setText(''); this.line.setText('');
    const W = SETTINGS.width; const H = SETTINGS.height;
    this.tweens.add({ targets: this.hand, scale: 2.6, alpha: 1, duration: 1200, ease: 'Sine.easeIn' });
    playSfx(this, 'fireWhoosh', { volume: 0.5, pitch: -600, minGapMs: 0 });
    this.time.delayedCall(1400, () => {
      this.hand.setScale(0);
      this.cameras.main.shake(450, 0.012);
      playSfx(this, 'kick', { volume: 1, pitch: -1800, minGapMs: 0 });
      playSfx(this, 'fireWhoosh', { volume: 0.9, pitch: -300, minGapMs: 0 });
      // the wave of ash
      const wave = this.add.image(W * 0.8, H - 200, 'glow').setScale(2, 6).setTint(0xff7a2a).setAlpha(0.8).setBlendMode(Phaser.BlendModes.ADD);
      const ash = this.add.rectangle(W * 0.8, H / 2, 40, H, 0x2a2420, 0.7);
      this.root.add([ash, wave]);
      this.tweens.add({ targets: [wave, ash], x: -100, duration: 700, ease: 'Quad.easeIn', onComplete: () => { wave.destroy(); ash.destroy(); } });
      // the torches go out; the messenger is thrown down
      this.time.delayedCall(350, () => {
        for (const t of this.torches) { this.tweens.killTweensOf(t); t.setAlpha(0.05); }
        this.tweens.add({ targets: this.messenger, x: -30, angle: -12, duration: 220, ease: 'Quad.easeOut' });
      });
    });
    this.time.delayedCall(3000, () => {
      for (const t of this.torches) this.tweens.add({ targets: t, alpha: 0.5, duration: 900 });
      this.busy = false;
      this.next();
    });
  }

  // his patience, shown: a fist brought down on the arm of the throne; the stone cracks,
  // the hall shakes, the messenger flinches back
  strike() {
    this.busy = true;
    this.auto?.remove();
    this.who.setText(''); this.line.setText('');
    const W = SETTINGS.width; const H = SETTINGS.height;
    const ax = W * 0.78 + 8; const ay = H - 238;
    this.time.delayedCall(500, () => {
      this.cameras.main.shake(300, 0.01);
      playSfx(this, 'kick', { volume: 1, pitch: -2000, minGapMs: 0 });
      const crack = this.add.graphics().lineStyle(2, 0x0a0810, 1);
      crack.beginPath(); crack.moveTo(ax, ay); crack.lineTo(ax - 8, ay + 18); crack.lineTo(ax - 3, ay + 30); crack.lineTo(ax - 12, ay + 52); crack.strokePath();
      const dust = this.add.image(ax, ay, 'glow').setScale(1.2).setTint(0x8a7a6a).setAlpha(0.6);
      this.root.add([crack, dust]);
      this.tweens.add({ targets: dust, alpha: 0, scale: 2.4, duration: 600 });
      this.tweens.add({ targets: this.messenger, x: -14, duration: 160, ease: 'Quad.easeOut' });
      this.eyes.setAlpha(1).setFillStyle(0xffd080);
    });
    this.time.delayedCall(1600, () => { this.busy = false; this.next(); });
  }

  // his frustration, shown: he rises, sweeps the war map off its stand, and the markers
  // scatter down the hall past the messenger
  hurl() {
    this.busy = true;
    this.auto?.remove();
    this.who.setText(''); this.line.setText('');
    const W = SETTINGS.width; const H = SETTINGS.height;
    const tx = W * 0.62; const ty = H - 200;
    const table = this.add.graphics();
    table.fillStyle(0x2a1c12, 1).fillRect(tx - 50, ty, 100, 8).fillRect(tx - 44, ty + 8, 6, 40).fillRect(tx + 38, ty + 8, 6, 40);
    const map = this.add.rectangle(tx, ty - 3, 92, 6, 0xb8a078);
    this.root.add([table, map]);
    this.time.delayedCall(600, () => {
      this.cameras.main.shake(250, 0.008);
      playSfx(this, 'kick', { volume: 0.9, pitch: -1200, minGapMs: 0 });
      this.tweens.add({ targets: map, x: tx - 260, y: ty + 70, angle: -160, alpha: 0.6, duration: 650, ease: 'Quad.easeOut' });
      for (let i = 0; i < 9; i++) {
        const m = this.add.rectangle(tx + (i - 4) * 9, ty - 8, 6, 8, i % 3 ? 0x8a2a20 : 0x3a3a48);
        this.root.add(m);
        this.tweens.add({ targets: m, x: tx - 120 - Math.random() * 300, y: H - 70 - Math.random() * 40, angle: Math.random() * 720, duration: 500 + Math.random() * 400, ease: 'Quad.easeOut' });
      }
      this.tweens.add({ targets: this.messenger, x: -20, duration: 200, ease: 'Quad.easeOut' });
      this.eyes.setAlpha(1).setFillStyle(0xffd080);
    });
    this.time.delayedCall(2000, () => { this.busy = false; this.next(); });
  }

  finish() {
    if (this.finished) return;
    this.finished = true;
    this.auto?.remove();
    this.tweens.add({
      targets: this.root, alpha: 0, duration: 500,
      onComplete: () => { const done = this.onDone; this.scene.stop(); done?.(); },
    });
  }
}
