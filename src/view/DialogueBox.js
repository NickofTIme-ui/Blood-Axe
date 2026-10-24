// DialogueBox.js — The story's text box: a panel in a framed border, the speaker's portrait
// framed on the left, their name over the line, and a pulsing ▸ when there's more to read.
//
// WHOSE SIDE (Nick's playtest, 2026-10-24): the box is coloured by the speaker's side
// (data/speakers.js speakerSide): the king and his men speak in a bloody dark red box, the
// Oath Keepers and the people in a deep blue one; narration in plain iron. The red and blue
// frames are ChatGPT's paintings (docs/art/dialogue-box/), cut to each box size by
// tools/build-dialogue-frames.py into assets/ui/dialogue/<side>-<mode>.png (BootScene loads
// them as `dialogue-<side>-<mode>`); without one the frame is drawn here in the side's colours.
//
// WHERE IT SITS: `place(at)` anchors the box just beneath the speaker (at: his feet on the
// screen, view/SpeakerMarker.js screenAt), clamped inside the screen, with a small notch in
// its top edge pointing up at him. No anchor (a voice nobody on screen owns, a cutaway): the
// box sits centred along the bottom edge as before.
//
// Two sizes, so a fight is never covered:
//   'full'     held scenes, quiet ground, cutaways
//   'compact'  a slim box with a small portrait: lines said mid-fight
// Narration (data/speakers.js NARRATION: a horn, a cry off screen) has no portrait or
// name: the line alone, in italics.
//
// The portrait is the texture `portrait-<id>` (BootScene loads assets/ui/portraits/<id>.png);
// a speaker with none painted yet gets a stand-in drawn here once.

import { SETTINGS } from '../config/settings.js';
import { FONT, epicFill } from './fonts.js';
import { speakerInfo, speakerSide } from '../data/speakers.js';
import { speakerColor } from './SpeakerMarker.js';

const M = 8; // the gap between the box and the screen's edge
const GAP = 10; // between the speaker's feet and the box under him
// (well short of the screen's width)
export const BOX = {
  full: { w: 420, h: 96, pic: 64, name: 16, text: 14 },
  compact: { w: 340, h: 58, pic: 36, name: 12, text: 12 },
};

// each side's colours: the panel (top, foot, glow), the frame band (band, lit edge,
// shadowed edge, fine inner line), the corner bosses' stone, and the name's fill
export const SIDES = {
  foe: {
    panel: [0x3a0709, 0x120203, 0xb01a1a], band: [0x7a1014, 0xd8484a, 0x2a0204, 0xc0383a], stone: 0x2a0204,
    gem: 0xff4a3a, name: ['#ffe0d0', '#ff5a48', '#7a0a0a'], text: '#f8e6e0', stroke: '#1a0204', hint: '#d8a0a0',
  },
  ally: {
    panel: [0x0c1c56, 0x040a26, 0x2a58d0], band: [0x1c3c9a, 0x7aa8ff, 0x060e34, 0x5a88e8], stone: 0x060e34,
    gem: 0x8ac8ff, name: ['#f4f8ff', '#9ac0ff', '#2a4aa8'], text: '#eef2fc', stroke: '#03061a', hint: '#a8b4d8',
  },
  none: {
    panel: [0x1a1a20, 0x08080c, 0x606070], band: [0x3a3a44, 0x8a8a98, 0x101014, 0x6a6a78], stone: 0x101014,
    gem: 0xb0b0c0, name: ['#ffffff', '#c8c8d0', '#606070'], text: '#e8e6e0', stroke: '#050508', hint: '#a0a0a8',
  },
};

export class DialogueBox {
  constructor(scene, depth = 61) {
    this.scene = scene;
    this.g = scene.add.graphics();
    this.notch = scene.add.graphics();
    this.painted = null; // the side's painted nine-slice frame, when loaded
    this.picFrame = scene.add.graphics();
    this.pic = scene.add.image(0, 0, '__WHITE').setOrigin(0).setVisible(false);
    this.name = scene.add.text(0, 0, '', { fontFamily: FONT.display, fontSize: '24px' }).setStroke('#140a02', 4);
    this.text = scene.add.text(0, 0, '', { fontFamily: FONT.body, fontSize: '19px', color: '#f4ecdc', fontStyle: '600', lineSpacing: 2 })
      .setStroke('#05081a', 3);
    this.arrow = scene.add.text(0, 0, '▸', { fontFamily: FONT.ui, fontSize: '22px' }).setOrigin(1, 1).setStroke('#140a02', 3);
    this.hint = scene.add.text(0, 0, '', { fontFamily: FONT.ui, fontSize: '10px', color: '#a8a0c8' }).setOrigin(1, 1).setStroke('#000000', 3);
    this.root = scene.add.container(0, 0, [this.notch, this.g, this.picFrame, this.pic, this.name, this.text, this.arrow, this.hint])
      .setDepth(depth).setAlpha(0);
    this.mode = null;
    this.side = null;
    this.key = null;
    this.who = null;
    this.anchored = false;
    this.place(null, true);
  }

  get height() { return BOX[this.mode ?? 'compact'].h + M; }
  // does the box sit along the bottom edge (what lives there steps up over it)?
  get onBottom() { return this.root.y + BOX[this.mode ?? 'compact'].h > SETTINGS.height - M - 30; }
  get alpha() { return this.root.alpha; }
  // does the box (showing) overlap this rectangle ({ x, y, width, height }, screen pixels)?
  covers(r) {
    if (this.root.alpha < 0.3) return false;
    const B = BOX[this.mode ?? 'compact'];
    const x = this.root.x;
    const y = this.root.y;
    return r.x < x + B.w && r.x + r.width > x && r.y - 14 < y + B.h && r.y + r.height > y;
  }
  setAlpha(a) { this.root.setAlpha(a); return this; }

  // Put a line in the box: { who, text }, the size, and the hint along its foot ('' none).
  // (cheap to call every frame: it only redraws when something changed)
  show(who, text, mode = 'full', hint = '') {
    const key = `${who}\u0000${text}\u0000${mode}\u0000${hint}`;
    if (key === this.key) return this;
    this.key = key;
    if (who !== this.who) { this.who = who; this.snap = true; } // (a new speaker: the box jumps to him, it doesn't slide)
    const side = speakerSide(who);
    if (mode !== this.mode || side !== this.side) { this.mode = mode; this.side = side; this.frame(); }
    const B = BOX[mode];
    const C = SIDES[side];
    const sp = speakerInfo(who);
    const pad = mode === 'full' ? 10 : 6;
    let tx = pad + 6;
    this.picFrame.clear();
    if (sp) {
      const s = B.pic;
      const px = pad;
      const py = (B.h - s) / 2;
      this.portraitFrame(this.picFrame, px, py, s, C);
      this.pic.setTexture(this.portrait(sp.portrait, who, sp.name)).setPosition(px, py).setDisplaySize(s, s).setVisible(true);
      tx = px + s + (mode === 'full' ? 12 : 8);
    } else this.pic.setVisible(false);
    const tw = B.w - tx - (mode === 'full' ? 26 : 20);
    this.name.setVisible(!!sp).setFontSize(B.name).setStroke(C.stroke, 4).setText(sp ? sp.name.toUpperCase() : '');
    if (sp) epicFill(this.name, C.name);
    this.text.setFontSize(B.text).setColor(C.text).setStroke(C.stroke, 3).setLineSpacing(mode === 'full' ? 2 : -1)
      .setFontStyle(sp ? '600' : 'italic 600').setWordWrapWidth(tw).setText(text);
    if (mode === 'full') {
      this.name.setPosition(tx, 11);
      this.text.setPosition(tx, sp ? 32 : 15);
    } else {
      this.name.setPosition(tx, 6);
      this.text.setPosition(tx, sp ? 21 : 10);
    }
    // (a long line in the slim box shrinks to fit rather than spilling out of it)
    const room = B.h - this.text.y - 5;
    for (let f = B.text; this.text.height > room && f > 9;) this.text.setFontSize(--f);
    this.arrowX = B.w - (mode === 'full' ? 12 : 9);
    this.arrow.setPosition(this.arrowX, B.h - (mode === 'full' ? 7 : 4)).setFontSize(mode === 'full' ? 15 : 12).setStroke(C.stroke, 3);
    epicFill(this.arrow, C.name);
    // (the controls ride small just outside the box, so they cost it no room)
    this.hint.setText(hint).setColor(C.hint).setVisible(mode === 'full' && !!hint);
    this.placeHint();
    return this;
  }

  // Anchor the box beneath the speaker: at = his feet in screen pixels ({ x, y }), or null for
  // the bottom edge. Call it every frame (it eases after him as he moves).
  place(at, snap = false) {
    const B = BOX[this.mode ?? 'full'];
    const W = SETTINGS.width;
    const H = SETTINGS.height;
    let x;
    let y;
    if (at) {
      x = Phaser.Math.Clamp(at.x - B.w / 2, M, W - M - B.w);
      y = Phaser.Math.Clamp(at.y + GAP, 34, H - M - B.h);
    } else {
      x = (W - B.w) / 2;
      y = H - M - B.h;
    }
    const jump = snap || this.snap || this.root.alpha < 0.05 || !!at !== this.anchored;
    this.snap = false;
    this.anchored = !!at;
    if (jump) this.root.setPosition(Math.round(x), Math.round(y));
    else this.root.setPosition(Math.round(this.root.x + (x - this.root.x) * 0.2), Math.round(this.root.y + (y - this.root.y) * 0.2));
    // the notch in the top edge, pointing up at the speaker (none on the bottom edge's own box)
    const nx = at ? Phaser.Math.Clamp(at.x - this.root.x, 22, B.w - 22) : null;
    const show = at && at.y + GAP <= this.root.y + 2; // (the box is under his feet, not squeezed up over them)
    if (nx !== this.notchX || show !== this.notchOn) { this.notchX = nx; this.notchOn = show; this.drawNotch(); }
    this.placeHint();
    return this;
  }

  // the hint goes under the box, or over it when the box is on the bottom edge
  placeHint() {
    const B = BOX[this.mode ?? 'full'];
    const under = this.root.y + B.h + 16 < SETTINGS.height;
    this.hint.setPosition(B.w - 4, under ? B.h + 14 : -4);
  }

  update(time) {
    this.arrow.setAlpha(0.55 + 0.45 * Math.sin(time * 0.006)).setX((this.arrowX ?? 0) + Math.sin(time * 0.006) * 2);
  }

  // ------------------------------------------------------------ drawing

  drawNotch() {
    const g = this.notch.clear();
    if (!this.notchOn || this.notchX == null) return;
    const C = SIDES[this.side ?? 'ally'];
    const x = this.notchX;
    const d = this.mode === 'full' ? 9 : 7;
    g.fillStyle(0x000000, 0.9).fillTriangle(x - d - 3, 1, x + d + 3, 1, x, -d - 4);
    g.fillStyle(C.band[0], 1).fillTriangle(x - d, 1, x + d, 1, x, -d);
    g.fillStyle(C.band[1], 1).fillTriangle(x - d / 2, -d / 2 + 1, x, -d, x, -d / 2 + 1);
  }

  // the box: the side's panel and frame, corner bosses, a gem at the top centre
  frame() {
    const g = this.g.clear();
    const B = BOX[this.mode];
    const C = SIDES[this.side];
    const W = B.w;
    const h = B.h;
    const full = this.mode === 'full';
    const t = full ? 5 : 3; // the frame band
    const [pTop, pFoot, pGlow] = C.panel;
    const [band, lit, shade, fine] = C.band;
    g.fillGradientStyle(pTop, pTop, pFoot, pFoot, 0.95).fillRect(t, t, W - t * 2, h - t * 2);
    g.fillStyle(pGlow, 0.10).fillEllipse(W * 0.55, h * 0.45, W * 0.8, h * 0.9);
    // the painted frame, when there is one (its corner spikes reach past the box's edge)
    this.painted?.destroy();
    this.painted = null;
    const art = `dialogue-${this.side}-${this.mode}`;
    if (this.scene.textures.exists(art)) {
      const src = this.scene.textures.get(art).getSourceImage();
      const k = SETTINGS.renderScale ?? 1;
      const dw = src.width / k;
      const dh = src.height / k;
      this.painted = this.scene.add.image(-(dw - W) / 2, -(dh - h) / 2, art).setOrigin(0).setDisplaySize(dw, dh);
      g.clear(); // (the painting has its own panel)
      this.root.addAt(this.painted, 2);
      return;
    }
    // faint scrollwork in the panel's right end
    g.lineStyle(1, fine, 0.16);
    for (let i = 0; i < 3; i++) g.strokeCircle(W - 50 - i * 18, h / 2, h * 0.28 + i * 4);
    // the frame: a dark rim, the band (lit top, shadowed foot), a dark inner line, a fine line
    g.lineStyle(2, 0x000000, 1).strokeRect(-1, -1, W + 2, h + 2);
    g.fillStyle(band, 1);
    g.fillRect(0, 0, W, t); g.fillRect(0, h - t, W, t); g.fillRect(0, 0, t, h); g.fillRect(W - t, 0, t, h);
    g.fillStyle(lit, 0.9).fillRect(0, 0, W, Math.max(1, t / 3));
    g.fillStyle(shade, 0.9).fillRect(0, h - Math.max(1, t / 3), W, Math.max(1, t / 3));
    if (full) {
      g.fillStyle(shade, 0.7);
      for (let i = 10; i < W - 10; i += 7) { g.fillRect(i, 2, 2, 2); g.fillRect(i + 3, h - 4, 2, 2); }
      for (let i = 10; i < h - 10; i += 7) { g.fillRect(2, i, 2, 2); g.fillRect(W - 4, i + 3, 2, 2); }
    }
    g.lineStyle(2, 0x000000, 1).strokeRect(t, t, W - t * 2, h - t * 2);
    g.lineStyle(1, fine, 0.8).strokeRect(t + 3, t + 3, W - t * 2 - 6, h - t * 2 - 6);
    // corner bosses
    const c = full ? 10 : 7;
    for (const [cx, cy] of [[0, 0], [W, 0], [0, h], [W, h]]) {
      g.fillStyle(0x000000, 1).fillRect(cx - c / 2 - 1, cy - c / 2 - 1, c + 2, c + 2);
      g.fillStyle(band, 1).fillRect(cx - c / 2, cy - c / 2, c, c);
      g.fillStyle(lit, 1).fillRect(cx - c / 2, cy - c / 2, c, 2);
      g.fillStyle(C.gem, 0.9).fillTriangle(cx, cy - c / 3, cx + c / 3, cy, cx, cy + c / 3).fillTriangle(cx, cy - c / 3, cx - c / 3, cy, cx, cy + c / 3);
    }
    // the gem at the top centre
    const gx = W / 2;
    const gy = t / 2;
    const d = full ? 6 : 4;
    g.fillStyle(0x000000, 1).fillTriangle(gx - d - 2, gy, gx, gy - d - 2, gx + d + 2, gy).fillTriangle(gx - d - 2, gy, gx, gy + d + 2, gx + d + 2, gy);
    g.fillStyle(band, 1).fillTriangle(gx - d, gy, gx, gy - d, gx + d, gy).fillTriangle(gx - d, gy, gx, gy + d, gx + d, gy);
    g.fillStyle(C.gem, 1).fillTriangle(gx - d / 2, gy, gx, gy - d / 2, gx + d / 2, gy).fillTriangle(gx - d / 2, gy, gx, gy + d / 2, gx + d / 2, gy);
  }

  // the portrait's own frame, in the side's colours
  portraitFrame(g, x, y, s, C) {
    const b = s > 50 ? 3 : 2;
    const [band, lit] = C.band;
    g.fillStyle(0x000000, 1).fillRect(x - b - 2, y - b - 2, s + b * 2 + 4, s + b * 2 + 4);
    g.fillStyle(band, 1).fillRect(x - b, y - b, s + b * 2, s + b * 2);
    g.fillStyle(lit, 0.9).fillRect(x - b, y - b, s + b * 2, Math.ceil(b / 2));
    g.fillStyle(0x000000, 1).fillRect(x - 1, y - 1, s + 2, s + 2);
    if (s > 50) {
      const c = 6;
      for (const [cx, cy] of [[x - b, y - b], [x + s + b, y - b], [x - b, y + s + b], [x + s + b, y + s + b]]) {
        g.fillStyle(C.gem, 1).fillTriangle(cx, cy - c / 2, cx + c / 2, cy, cx, cy + c / 2).fillTriangle(cx, cy - c / 2, cx - c / 2, cy, cx, cy + c / 2);
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
