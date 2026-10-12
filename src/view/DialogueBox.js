// DialogueBox.js — The story's text box: a navy panel in an ornate gold frame, the
// speaker's portrait framed on the left, their name in gold over the line, and a
// pulsing ▸ when there's more to read. (Nick's reference: the Garrick box.)
//
// Two sizes, so a fight is never covered:
//   'full'     the reference box, along the bottom: held scenes, quiet ground, cutaways
//   'compact'  a slim strip on the bottom edge with a small portrait: lines said mid-fight
// Narration (data/speakers.js NARRATION: a horn, a cry off screen) has no portrait or
// name: the line alone, in italics.
//
// The portrait is the texture `portrait-<id>` (BootScene loads assets/ui/portraits/<id>.png);
// a speaker with none painted yet gets a stand-in drawn here once.

import { SETTINGS } from '../config/settings.js';
import { FONT, epicFill } from './fonts.js';
import { speakerInfo } from '../data/speakers.js';
import { speakerColor } from './SpeakerMarker.js';

const GOLD = ['#fff2b0', '#e8b040', '#8a5410'];
const M = 8; // the gap under the box
// (a panel centred along the bottom edge, well short of the screen's width)
export const BOX = {
  full: { w: 420, h: 96, pic: 64, name: 16, text: 14 },
  compact: { w: 380, h: 58, pic: 36, name: 12, text: 12 },
};

export class DialogueBox {
  constructor(scene, depth = 61) {
    this.scene = scene;
    this.g = scene.add.graphics();
    this.picFrame = scene.add.graphics();
    this.pic = scene.add.image(0, 0, '__WHITE').setOrigin(0).setVisible(false);
    this.name = scene.add.text(0, 0, '', { fontFamily: FONT.display, fontSize: '24px' }).setStroke('#140a02', 4);
    this.text = scene.add.text(0, 0, '', { fontFamily: FONT.body, fontSize: '19px', color: '#f4ecdc', fontStyle: '600', lineSpacing: 2 })
      .setStroke('#05081a', 3);
    this.arrow = scene.add.text(0, 0, '▸', { fontFamily: FONT.ui, fontSize: '22px' }).setOrigin(1, 1).setStroke('#140a02', 3);
    epicFill(this.arrow, GOLD);
    this.hint = scene.add.text(0, 0, '', { fontFamily: FONT.ui, fontSize: '10px', color: '#a8a0c8' }).setOrigin(1, 1).setStroke('#000000', 3);
    this.root = scene.add.container(0, 0, [this.g, this.picFrame, this.pic, this.name, this.text, this.arrow, this.hint])
      .setDepth(depth).setAlpha(0);
    this.mode = null;
    this.key = null;
  }

  get height() { return BOX[this.mode ?? 'compact'].h + M; }
  get alpha() { return this.root.alpha; }
  setAlpha(a) { this.root.setAlpha(a); return this; }

  // Put a line in the box: { who, text }, the size, and the hint along its foot ('' none).
  // (cheap to call every frame: it only redraws when something changed)
  show(who, text, mode = 'full', hint = '') {
    const key = `${who}\u0000${text}\u0000${mode}\u0000${hint}`;
    if (key === this.key) return this;
    this.key = key;
    if (mode !== this.mode) { this.mode = mode; this.frame(); }
    const B = BOX[mode];
    const L = (SETTINGS.width - B.w) / 2;
    const W = L + B.w + M; // (the box's right edge, plus the gap the layout below takes off)
    const H = SETTINGS.height;
    const y0 = H - M - B.h;
    const sp = speakerInfo(who);
    const pad = mode === 'full' ? 10 : 6;
    let tx = L + pad + 6;
    this.picFrame.clear();
    if (sp) {
      const s = B.pic;
      const px = L + pad;
      const py = y0 + (B.h - s) / 2;
      this.portraitFrame(this.picFrame, px, py, s);
      this.pic.setTexture(this.portrait(sp.portrait, who, sp.name)).setPosition(px, py).setDisplaySize(s, s).setVisible(true);
      tx = px + s + (mode === 'full' ? 12 : 8);
    } else this.pic.setVisible(false);
    const tw = W - M - tx - (mode === 'full' ? 26 : 20);
    this.name.setVisible(!!sp).setFontSize(B.name).setText(sp ? sp.name.toUpperCase() : '');
    if (sp) epicFill(this.name, GOLD);
    this.text.setFontSize(B.text).setLineSpacing(mode === 'full' ? 2 : -1).setFontStyle(sp ? '600' : 'italic 600').setWordWrapWidth(tw).setText(text);
    if (mode === 'full') {
      this.name.setPosition(tx, y0 + 9);
      this.text.setPosition(tx, sp ? y0 + 30 : y0 + 14);
    } else {
      this.name.setPosition(tx, y0 + 5);
      this.text.setPosition(tx, sp ? y0 + 20 : y0 + 9);
    }
    // (a long line in the slim strip shrinks to fit rather than spilling out of it)
    const room = B.h - (this.text.y - y0) - 5;
    for (let f = B.text; this.text.height > room && f > 9;) this.text.setFontSize(--f);
    this.arrowX = W - M - (mode === 'full' ? 12 : 9);
    this.arrow.setPosition(this.arrowX, H - M - (mode === 'full' ? 7 : 4)).setFontSize(mode === 'full' ? 15 : 12);
    // (the controls ride just above the box, small, so they cost the box no room)
    this.hint.setText(hint).setPosition(W - M - 4, y0 - 4).setVisible(mode === 'full' && !!hint);
    return this;
  }

  update(time) {
    this.arrow.setAlpha(0.55 + 0.45 * Math.sin(time * 0.006)).setX((this.arrowX ?? 0) + Math.sin(time * 0.006) * 2);
  }

  // ------------------------------------------------------------ drawing

  // the box: navy panel, gold frame, corner bosses, a gem at the top centre
  frame() {
    const g = this.g.clear();
    const B = BOX[this.mode];
    const W = B.w;
    const x = (SETTINGS.width - B.w) / 2;
    const y = SETTINGS.height - M - B.h;
    const h = B.h;
    const full = this.mode === 'full';
    const t = full ? 5 : 3; // the gold band
    // the panel: deep navy, lighter in the middle
    g.fillGradientStyle(0x0c1a52, 0x0c1a52, 0x050b2a, 0x050b2a, 0.96).fillRect(x + t, y + t, W - t * 2, h - t * 2);
    g.fillStyle(0x2a4ab0, 0.10).fillEllipse(x + W * 0.55, y + h * 0.45, W * 0.8, h * 0.9);
    // faint scrollwork in the panel's right end
    g.lineStyle(1, 0x3050b0, 0.18);
    for (let i = 0; i < 3; i++) g.strokeCircle(x + W - 50 - i * 18, y + h / 2, h * 0.28 + i * 4);
    // the frame: a dark rim, the gold band (lit top, shadowed foot), a dark inner line, a fine gold line
    g.lineStyle(2, 0x1a0e04, 1).strokeRect(x - 1, y - 1, W + 2, h + 2);
    g.fillStyle(0xc89038, 1);
    g.fillRect(x, y, W, t); g.fillRect(x, y + h - t, W, t); g.fillRect(x, y, t, h); g.fillRect(x + W - t, y, t, h);
    g.fillStyle(0xffe08a, 0.9).fillRect(x, y, W, Math.max(1, t / 3));
    g.fillStyle(0x6a3e0c, 0.9).fillRect(x, y + h - Math.max(1, t / 3), W, Math.max(1, t / 3));
    if (full) {
      // the braided band: small dark ticks along it
      g.fillStyle(0x7a4a12, 0.8);
      for (let i = x + 10; i < x + W - 10; i += 7) { g.fillRect(i, y + 2, 2, 2); g.fillRect(i + 3, y + h - 4, 2, 2); }
      for (let i = y + 10; i < y + h - 10; i += 7) { g.fillRect(x + 2, i, 2, 2); g.fillRect(x + W - 4, i + 3, 2, 2); }
    }
    g.lineStyle(2, 0x140a02, 1).strokeRect(x + t, y + t, W - t * 2, h - t * 2);
    g.lineStyle(1, 0xd8a850, 0.8).strokeRect(x + t + 3, y + t + 3, W - t * 2 - 6, h - t * 2 - 6);
    // corner bosses
    const c = full ? 10 : 7;
    for (const [cx, cy] of [[x, y], [x + W, y], [x, y + h], [x + W, y + h]]) {
      g.fillStyle(0x1a0e04, 1).fillRect(cx - c / 2 - 1, cy - c / 2 - 1, c + 2, c + 2);
      g.fillStyle(0xb88430, 1).fillRect(cx - c / 2, cy - c / 2, c, c);
      g.fillStyle(0xffe08a, 1).fillRect(cx - c / 2, cy - c / 2, c, 2);
      g.fillStyle(0x8a96b0, 1).fillTriangle(cx, cy - c / 3, cx + c / 3, cy, cx, cy + c / 3).fillTriangle(cx, cy - c / 3, cx - c / 3, cy, cx, cy + c / 3);
    }
    // the gem at the top centre
    const gx = x + W / 2;
    const d = full ? 6 : 4;
    g.fillStyle(0x1a0e04, 1).fillTriangle(gx - d - 2, y + t / 2, gx, y + t / 2 - d - 2, gx + d + 2, y + t / 2).fillTriangle(gx - d - 2, y + t / 2, gx, y + t / 2 + d + 2, gx + d + 2, y + t / 2);
    g.fillStyle(0xd8a040, 1).fillTriangle(gx - d, y + t / 2, gx, y + t / 2 - d, gx + d, y + t / 2).fillTriangle(gx - d, y + t / 2, gx, y + t / 2 + d, gx + d, y + t / 2);
    g.fillStyle(0x6a8ad8, 1).fillTriangle(gx - d / 2, y + t / 2, gx, y + t / 2 - d / 2, gx + d / 2, y + t / 2).fillTriangle(gx - d / 2, y + t / 2, gx, y + t / 2 + d / 2, gx + d / 2, y + t / 2);
  }

  // the portrait's own gold frame
  portraitFrame(g, x, y, s) {
    const b = s > 50 ? 3 : 2;
    g.fillStyle(0x140a02, 1).fillRect(x - b - 2, y - b - 2, s + b * 2 + 4, s + b * 2 + 4);
    g.fillStyle(0xc89038, 1).fillRect(x - b, y - b, s + b * 2, s + b * 2);
    g.fillStyle(0xffe08a, 0.9).fillRect(x - b, y - b, s + b * 2, Math.ceil(b / 2));
    g.fillStyle(0x140a02, 1).fillRect(x - 1, y - 1, s + 2, s + 2);
    if (s > 50) {
      const c = 6;
      for (const [cx, cy] of [[x - b, y - b], [x + s + b, y - b], [x - b, y + s + b], [x + s + b, y + s + b]]) {
        g.fillStyle(0x8a96b0, 1).fillTriangle(cx, cy - c / 2, cx + c / 2, cy, cx, cy + c / 2).fillTriangle(cx, cy - c / 2, cx - c / 2, cy, cx, cy + c / 2);
      }
    }
  }

  // The speaker's portrait texture: the painted one, or a stand-in drawn once.
  portrait(id, who, name) {
    const tx = this.scene.textures;
    const key = `portrait-${id}`;
    if (tx.exists(key)) return key;
    const ph = `portrait-stand-${id}`;
    if (tx.exists(ph)) return ph;
    const S = 128;
    const cv = tx.createCanvas(ph, S, S);
    const ctx = cv.getContext();
    const col = speakerColor(who);
    const bg = ctx.createRadialGradient(S / 2, S * 0.4, 4, S / 2, S / 2, S * 0.75);
    bg.addColorStop(0, '#2a3256'); bg.addColorStop(1, '#070a18');
    ctx.fillStyle = bg; ctx.fillRect(0, 0, S, S);
    // a hooded bust in silhouette, rimmed in the speaker's colour
    ctx.beginPath();
    ctx.moveTo(S * 0.06, S); ctx.quadraticCurveTo(S * 0.12, S * 0.66, S * 0.36, S * 0.6);
    ctx.quadraticCurveTo(S * 0.24, S * 0.42, S * 0.3, S * 0.28); ctx.quadraticCurveTo(S * 0.5, S * 0.05, S * 0.7, S * 0.28);
    ctx.quadraticCurveTo(S * 0.76, S * 0.42, S * 0.64, S * 0.6); ctx.quadraticCurveTo(S * 0.88, S * 0.66, S * 0.94, S);
    ctx.closePath();
    ctx.fillStyle = '#0b0d16'; ctx.fill();
    ctx.lineWidth = 3; ctx.strokeStyle = col; ctx.globalAlpha = 0.7; ctx.stroke(); ctx.globalAlpha = 1;
    ctx.font = `40px ${FONT.display}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = col; ctx.globalAlpha = 0.85; ctx.fillText((name ?? who).replace(/^(The|King) /, '').charAt(0), S / 2, S * 0.86); ctx.globalAlpha = 1;
    cv.refresh();
    return ph;
  }
}
