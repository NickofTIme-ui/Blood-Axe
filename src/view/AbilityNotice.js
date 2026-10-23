// AbilityNotice.js — "NEW ABILITY" on the HUD: a dark plaque edged in gold, the ability's
// name in fire, and the button that does it (key cap and pad button, read from the
// player's own bindings: config/controls.js actionButtons). First used when Rurik raises
// Oathkeeper at his father's deathbed (ArenaScene.oathkeeperRaised: KING'S FIRE).
//
// It sits in the dark to the right of the painted cinematic (BirthrightScene keeps the
// picture narrow and centred above the dialogue), so it never covers the art or the box.

import { SETTINGS } from '../config/settings.js';
import { FONT, epicFill } from './fonts.js';

const GOLD = 0xb08a4a;
const EMBER = ['#fff2b0', '#ffb040', '#c03a08'];

export class AbilityNotice {
  constructor(scene, depth = 62) {
    this.scene = scene;
    this.depth = depth;
    this.box = null;
  }

  // name: 'KING\'S FIRE'; buttons: { key, pad } labels; verb / after: the words round them
  show({ name, buttons, verb = 'Press', after = '', hold = 5600 }) {
    this.clear();
    const s = this.scene;
    const cx = SETTINGS.width - 175, cy = SETTINGS.height * 0.4;
    const box = this.box = s.add.container(cx, cy).setDepth(this.depth).setAlpha(0).setScale(0.86);

    const head = s.add.text(0, 0, 'NEW ABILITY', { fontFamily: FONT.ui, fontSize: '15px', color: '#e0c080' })
      .setOrigin(0.5).setStroke('#140a02', 4);
    head.setLetterSpacing?.(5);
    const title = s.add.text(0, 0, name, { fontFamily: FONT.display, fontSize: '42px', align: 'center' })
      .setOrigin(0.5).setStroke('#1a0600', 6);
    title.setLetterSpacing?.(2);
    epicFill(title, EMBER);
    const flare = s.add.text(0, 0, name, { fontFamily: FONT.display, fontSize: '42px', color: '#ffe0a0' })
      .setOrigin(0.5).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0);
    flare.setLetterSpacing?.(2);

    // the button row: Press [U] or [LB]
    const row = [];
    const word = (t) => s.add.text(0, 0, t, { fontFamily: FONT.body, fontSize: '19px', color: '#e8dcc4', fontStyle: '600' })
      .setOrigin(0, 0.5).setStroke('#000000', 3);
    row.push(word(verb));
    if (buttons.key) row.push(this.cap(buttons.key));
    if (buttons.key && buttons.pad) row.push(word('or'));
    if (buttons.pad) row.push(this.cap(buttons.pad, true));
    const gap = 9;
    const rowW = row.reduce((w, o) => w + (o.capW ?? o.width), 0) + gap * (row.length - 1);
    const sub = after ? s.add.text(0, 0, after, { fontFamily: FONT.body, fontSize: '17px', color: '#c8b896', fontStyle: '600', align: 'center' })
      .setOrigin(0.5).setStroke('#000000', 3) : null;

    // layout, top to bottom
    const w = Math.max(268, title.width + 56, rowW + 48, (sub?.width ?? 0) + 48);
    let y = -64;
    head.setY(y); y += 40;
    title.setY(y); flare.setY(y); y += 34;
    const ruleY = y; y += 28;
    let x = -rowW / 2;
    for (const o of row) { o.setPosition(o.capW ? x + o.capW / 2 : x, y); x += (o.capW ?? o.width) + gap; }
    y += 28;
    if (sub) { sub.setY(y); y += 22; }
    const top = -86, h = y - top + 12;

    const g = s.add.graphics();
    // the ember glow behind it
    const glow = s.add.ellipse(0, -18, w * 1.15, h * 0.9, 0xff5a10, 0.16).setBlendMode(Phaser.BlendModes.ADD);
    g.fillStyle(0x0b0705, 0.9).fillRect(-w / 2, top, w, h);
    g.fillStyle(0x3a1004, 0.35).fillRect(-w / 2, top, w, 30); // warmer at the head
    g.lineStyle(2, GOLD, 1).strokeRect(-w / 2, top, w, h);
    g.lineStyle(1, 0x5a3a18, 1).strokeRect(-w / 2 + 5, top + 5, w - 10, h - 10);
    for (const [px, py] of [[-w / 2, top], [w / 2, top], [-w / 2, top + h], [w / 2, top + h]]) {
      g.fillStyle(GOLD, 1).fillPoints([{ x: px, y: py - 6 }, { x: px + 6, y: py }, { x: px, y: py + 6 }, { x: px - 6, y: py }], true);
    }
    // little rules either side of NEW ABILITY, and one under the name
    const hw = head.width / 2 + 12;
    g.lineStyle(1, GOLD, 0.9).lineBetween(-w / 2 + 22, head.y, -hw, head.y).lineBetween(hw, head.y, w / 2 - 22, head.y);
    g.lineStyle(1, GOLD, 0.6).lineBetween(-w / 2 + 40, ruleY, w / 2 - 40, ruleY);
    g.fillStyle(GOLD, 1).fillPoints([{ x: 0, y: ruleY - 4 }, { x: 4, y: ruleY }, { x: 0, y: ruleY + 4 }, { x: -4, y: ruleY }], true);

    box.add([glow, g, head, title, flare, ...row.flatMap((o) => o.parts ?? [o]), ...(sub ? [sub] : [])]);

    // in: it swells up out of the dark; the name flares white-gold; embers rise off it
    s.tweens.add({ targets: box, alpha: 1, scale: 1, duration: 420, ease: 'Back.easeOut' });
    s.tweens.add({ targets: flare, alpha: { from: 0.9, to: 0 }, duration: 900, delay: 120, ease: 'Quad.easeOut' });
    s.tweens.add({ targets: glow, alpha: { from: 0.1, to: 0.24 }, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    this.embers = s.time.addEvent({ delay: 110, loop: true, callback: () => this.ember(w, top + h) });
    this.out = s.time.delayedCall(hold, () => {
      this.embers?.remove();
      s.tweens.add({ targets: box, alpha: 0, y: cy - 10, duration: 700, ease: 'Quad.easeIn', onComplete: () => this.clear() });
    });
  }

  // a key cap / pad button: a small dark plate edged in gold, the label in it
  cap(label, pad = false) {
    const s = this.scene;
    const t = s.add.text(0, 0, label, { fontFamily: FONT.ui, fontSize: '18px', color: '#fff2c8' }).setOrigin(0.5).setStroke('#000000', 2);
    const capW = Math.max(34, t.width + 18), capH = 30;
    const plate = s.add.graphics();
    const draw = (x, y) => {
      plate.clear();
      plate.fillStyle(0x000000, 0.6).fillRoundedRect(x - capW / 2 + 2, y - capH / 2 + 3, capW, capH, pad ? 13 : 5);
      plate.fillStyle(0x2a1a0e, 1).fillRoundedRect(x - capW / 2, y - capH / 2, capW, capH, pad ? 13 : 5);
      plate.fillStyle(0x4a3018, 1).fillRoundedRect(x - capW / 2 + 2, y - capH / 2 + 2, capW - 4, capH / 2 - 2, pad ? 11 : 4);
      plate.lineStyle(2, 0xe0a530, 1).strokeRoundedRect(x - capW / 2, y - capH / 2, capW, capH, pad ? 13 : 5);
    };
    return {
      capW, parts: [plate, t],
      setPosition(x, y) { draw(x, y); t.setPosition(x, y); return this; },
    };
  }

  ember(w, bottom) {
    const s = this.scene;
    if (!this.box?.active) return;
    const e = s.add.circle(Phaser.Math.Between(-w / 2 + 10, w / 2 - 10), bottom - 4, Phaser.Math.FloatBetween(1, 2.2),
      Phaser.Utils.Array.GetRandom([0xffb040, 0xff7a1a, 0xffe0a0]), 1).setBlendMode(Phaser.BlendModes.ADD);
    this.box.add(e);
    s.tweens.add({
      targets: e, y: e.y - Phaser.Math.Between(70, 150), x: e.x + Phaser.Math.Between(-16, 16), alpha: 0,
      duration: Phaser.Math.Between(900, 1500), ease: 'Sine.easeOut', onComplete: () => e.destroy(),
    });
  }

  clear() {
    this.out?.remove(); this.embers?.remove();
    this.out = this.embers = null;
    if (this.box) { this.scene.tweens.killTweensOf([this.box, ...this.box.list]); this.box.destroy(); }
    this.box = null;
  }
}
