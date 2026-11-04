// TutorialCard.js — THE PRACTICE YARD's card, top centre of the HUD: the move to try, its
// buttons as key caps (the keyboard's, or the pad's once a pad is in use), at most one
// short line under them, and a row of pips for the lessons. Done: a gold tick, then the
// next one slides in. (The lessons: data/tutorial.js; the logic: stage/Tutorial.js.)
// Drawn like the NEW ABILITY plaque (view/AbilityNotice.js) so the two read as one family.

import { SETTINGS } from '../config/settings.js';
import { CONTROLS, actionButtons } from '../config/controls.js';
import { FONT, epicFill } from './fonts.js';

const GOLD = 0xb08a4a;
const NAME_FILL = ['#fff2c8', '#e0b060', '#7a4a10'];
const DONE_FILL = ['#fff6c0', '#ffd24a', '#8a5a08'];

// what a cap says, where controls.js has no binding or a long one
const KEY_SAYS = { stick: 'WASD', down: 'S' };
const PAD_SAYS = { stick: 'L-STICK', down: 'STICK ↓', sprint: 'PRESS L-STICK', grab: 'D-PAD →', padLeft: 'D-PAD ←' };

export function capLabel(action, pad, bindings = CONTROLS) {
  const own = (pad ? PAD_SAYS : KEY_SAYS)[action];
  if (own) return own;
  const b = actionButtons(action, bindings);
  return (pad ? b.pad : b.key) ?? action.toUpperCase();
}

export class TutorialCard {
  constructor(scene, arena, y = 64) {
    this.scene = scene;
    this.arena = arena;
    this.y = y;
    this.box = null;
    this.key = null;
  }

  // Is the hero played with a pad? (his input: a pad slot and no keyboard, or a pad pressed)
  padInUse() {
    const inp = this.arena.session?.samplers?.[0];
    if (!inp) return false;
    if (!inp.useKeyboard) return true;
    return !!inp.lastPad || (typeof navigator !== 'undefined' && (navigator.getGamepads?.() ?? []).some((p) => p?.connected));
  }

  update() {
    const T = this.arena.stage?.tutorial;
    if (!T?.lessons) return;
    const pad = this.padInUse();
    const key = `${T.finished ? 'end' : T.index}:${pad}`;
    if (key !== this.key) { this.key = key; this.build(T, pad); }
    if (T.done && !this.ticked) this.tick(T);
  }

  build(T, pad) {
    const s = this.scene;
    const old = this.box;
    if (old) s.tweens.add({ targets: old, alpha: 0, y: old.y - 14, duration: 220, onComplete: () => old.destroy() });
    this.ticked = false;
    const cx = SETTINGS.width / 2;
    const box = this.box = s.add.container(cx, this.y + 12).setDepth(30).setAlpha(0);
    const parts = [];
    const L = T.lesson;
    const head = s.add.text(0, 0, T.finished ? 'PRACTICE' : `PRACTICE  ·  ${T.index + 1} / ${T.total}`, { fontFamily: FONT.ui, fontSize: '12px', color: '#d8b878' })
      .setOrigin(0.5).setStroke('#140a02', 3);
    head.setLetterSpacing?.(3);
    const name = s.add.text(0, 0, T.finished ? 'WELL DONE' : L.name, { fontFamily: FONT.display, fontSize: '28px' })
      .setOrigin(0.5).setStroke('#1a0600', 5);
    name.setLetterSpacing?.(2);
    epicFill(name, NAME_FILL);
    this.name = name;

    // the buttons: [J] [J] [J] / HOLD [J] / [SPACE] › [J]
    const row = [];
    const word = (t, size = 15, color = '#e8dcc4') => s.add.text(0, 0, t, { fontFamily: FONT.ui, fontSize: `${size}px`, color }).setOrigin(0, 0.5).setStroke('#000000', 3);
    if (T.finished) {
      row.push(word('Keep practising  ·  Esc leaves the yard', 15, '#e0d2b4'));
    } else {
      for (const k of L.keys) {
        if (k === '+') row.push(word('+', 18));
        else if (k === '>') row.push(word('›', 22, '#e0a530'));
        else if (k.startsWith('hold:')) { row.push(word('HOLD', 14, '#e0a530')); row.push(this.cap(capLabel(k.slice(5), pad), pad)); }
        else row.push(this.cap(capLabel(k, pad), pad));
      }
    }
    const gap = 7;
    const rowW = row.reduce((w, o) => w + (o.capW ?? o.width), 0) + gap * (row.length - 1);
    const hint = !T.finished && L.hint ? s.add.text(0, 0, L.hint, { fontFamily: FONT.body, fontSize: '16px', color: '#d8c8a6', fontStyle: '600' })
      .setOrigin(0.5).setStroke('#000000', 3) : null;
    const skip = !T.finished ? s.add.text(0, 0, `skip  ${capLabel('padLeft', pad)}`, { fontFamily: FONT.ui, fontSize: '10px', color: '#8a7a5e' })
      .setOrigin(1, 0.5).setStroke('#000000', 2) : null;

    // layout, top to bottom
    const w = Math.max(250, name.width + 60, rowW + 44, (hint?.width ?? 0) + 40);
    let y = 0;
    head.setY(y); y += 26;
    name.setY(y); y += 30;
    let x = -rowW / 2;
    for (const o of row) { o.setPosition(o.capW ? x + o.capW / 2 : x, y); x += (o.capW ?? o.width) + gap; }
    y += 24;
    if (hint) { hint.setY(y); y += 20; }
    const pipY = y + 4; y += 12;
    const top = -14, h = y - top + 6;
    skip?.setPosition(w / 2 - 8, head.y);

    const g = s.add.graphics();
    g.fillStyle(0x0b0705, 0.86).fillRect(-w / 2, top, w, h);
    g.fillStyle(0x3a1004, 0.3).fillRect(-w / 2, top, w, 24);
    g.lineStyle(2, GOLD, 1).strokeRect(-w / 2, top, w, h);
    g.lineStyle(1, 0x5a3a18, 1).strokeRect(-w / 2 + 4, top + 4, w - 8, h - 8);
    for (const [px, py] of [[-w / 2, top], [w / 2, top], [-w / 2, top + h], [w / 2, top + h]]) {
      g.fillStyle(GOLD, 1).fillPoints([{ x: px, y: py - 5 }, { x: px + 5, y: py }, { x: px, y: py + 5 }, { x: px - 5, y: py }], true);
    }
    // the pips: one a lesson (done gold, skipped dim, this one bright)
    const n = T.total, step = Math.min(16, (w - 40) / n);
    for (let i = 0; i < n; i++) {
      const px = (i - (n - 1) / 2) * step;
      const lesson = T.lessons[i];
      const past = T.finished || i < T.index;
      const color = past ? (T.skipped.has(lesson.id) ? 0x5a4a34 : 0xe0a530) : i === T.index ? 0xfff2c8 : 0x3a2a1a;
      g.fillStyle(color, 1).fillCircle(px, pipY, i === T.index && !T.finished ? 3.5 : 2.6);
    }
    this.plate = { w, top, h };
    parts.push(g, head, name, ...row.flatMap((o) => o.parts ?? [o]));
    if (hint) parts.push(hint);
    if (skip) parts.push(skip);
    box.add(parts);
    s.tweens.add({ targets: box, alpha: 1, y: this.y, duration: 260, delay: old ? 120 : 0, ease: 'Sine.easeOut' });
  }

  // done: the name goes gold and a tick stamps down beside it
  tick(T) {
    this.ticked = true;
    const s = this.scene;
    if (!this.box) return;
    const skipped = T.skipped.has(T.lesson?.id);
    if (!skipped) epicFill(this.name, DONE_FILL);
    const mark = s.add.text(this.name.width / 2 + 22, this.name.y, skipped ? '–' : '✓', { fontFamily: FONT.ui, fontSize: '30px', color: skipped ? '#8a7a5e' : '#ffd24a' })
      .setOrigin(0.5).setStroke('#1a0600', 5).setScale(2).setAlpha(0);
    this.box.add(mark);
    s.tweens.add({ targets: mark, scale: 1, alpha: 1, duration: 180, ease: 'Back.easeOut' });
    if (!skipped) {
      const { w, top, h } = this.plate;
      const flash = s.add.rectangle(0, top + h / 2, w, h, 0xffd070, 0.35).setBlendMode(Phaser.BlendModes.ADD);
      this.box.addAt(flash, 1);
      s.tweens.add({ targets: flash, alpha: 0, duration: 420, onComplete: () => flash.destroy() });
      s.tweens.add({ targets: this.box, scale: { from: 1.06, to: 1 }, duration: 220, ease: 'Back.easeOut' });
    }
  }

  // a key cap / pad button (the same plate as the NEW ABILITY plaque's)
  cap(label, pad = false) {
    const s = this.scene;
    const t = s.add.text(0, 0, label, { fontFamily: FONT.ui, fontSize: '16px', color: '#fff2c8' }).setOrigin(0.5).setStroke('#000000', 2);
    const capW = Math.max(30, t.width + 16), capH = 26, r = pad ? 12 : 5;
    const plate = s.add.graphics();
    const draw = (x, y) => {
      plate.clear();
      plate.fillStyle(0x000000, 0.6).fillRoundedRect(x - capW / 2 + 2, y - capH / 2 + 3, capW, capH, r);
      plate.fillStyle(0x2a1a0e, 1).fillRoundedRect(x - capW / 2, y - capH / 2, capW, capH, r);
      plate.fillStyle(0x4a3018, 1).fillRoundedRect(x - capW / 2 + 2, y - capH / 2 + 2, capW - 4, capH / 2 - 2, r - 1);
      plate.lineStyle(2, 0xe0a530, 1).strokeRoundedRect(x - capW / 2, y - capH / 2, capW, capH, r);
    };
    return { capW, parts: [plate, t], setPosition(x, y) { draw(x, y); t.setPosition(x, y); return this; } };
  }

  destroy() { this.box?.destroy(); this.box = null; }
}
