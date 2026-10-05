// SkillScene.js — The skill tree, opened by kneeling at a rest shrine (stage/Stage.js
// restKneel). The fight holds still while it's up (ArenaScene.skillOpen).
//
//   ← → ↑ ↓ / D-pad   move between skills
//   J / ENTER / A     take the skill (enough points, the one before it owned)
//   R / Y             respec: every point back, free at a shrine
//   O / RT            TROPHIES: the boss loot you carry (data/trophies.js): wear or take off
//   ESC / B / BACKSPACE, or the pad's B / Back / Start, or the button: back to the fight
//
// TEMPORARY ART: plain panels and text. (The painted frame and icons are in
// docs/gallows-art-needed.md.)

import { SETTINGS } from '../config/settings.js';
import { InputManager } from '../core/InputManager.js';
import { SKILL_TREES } from '../data/skills.js';
import { TROPHIES, TROPHY_SLOTS, RARITY } from '../data/trophies.js';
import { FONT, epicFill } from '../view/fonts.js';
import { playSfx } from '../core/Sfx.js';

const KIND_LABEL = { upgrade: 'UPGRADE', behaviour: 'NEW BEHAVIOUR', active: 'NEW ABILITY', passive: 'PASSIVE', mobility: 'MOBILITY', major: 'MAJOR' };

export class SkillScene extends Phaser.Scene {
  constructor() { super('Skills'); }

  // data: { arena, heroId, progress }
  init(data) {
    this.arena = data.arena;
    this.heroId = data.heroId;
    this.progress = data.progress;
    this.tree = SKILL_TREES[this.heroId];
    this.col = 0;
    this.row = 0;
    this.mode = 'tree'; // or 'trophies'
    this.pick = 0;      // the trophy under the cursor
  }

  create() {
    const W = SETTINGS.width;
    const H = SETTINGS.height;
    this.cameras.main.setOrigin(0, 0).setZoom(SETTINGS.renderScale ?? 1); // full resolution
    this.add.rectangle(0, 0, W, H, 0x000000, 0.9).setOrigin(0);
    this.controls = new InputManager(this, undefined, { menu: true }); // (the D-pad moves the cursor here)
    this.openedAt = this.time.now;
    const name = this.arena.player.stats.name ?? this.heroId;
    const title = this.add.text(W / 2, 30, `${name.toUpperCase()}  ·  SKILLS`, { fontFamily: FONT.display, fontSize: '30px' })
      .setOrigin(0.5).setStroke('#000000', 6);
    epicFill(title, ['#ffd2a0', '#d06030', '#5a1a06']);
    this.header = this.add.text(W / 2, 62, '', { fontFamily: FONT.ui, fontSize: '14px', color: '#e8d4b0' }).setOrigin(0.5);
    this.footer = this.add.text(W / 2 - 150, H - 20, 'J / ENTER / A: take      R / Y: respec (free)', { fontFamily: FONT.ui, fontSize: '13px', color: '#a89878' }).setOrigin(0.5);
    // leaving can never be a puzzle: a big button that says so, and a click on it works too
    const back = this.add.text(W / 2 + 190, H - 20, '[ ESC / B ]  BACK TO THE FIGHT', { fontFamily: FONT.ui, fontSize: '15px', color: '#ffd24a' })
      .setOrigin(0.5).setStroke('#000000', 4).setInteractive({ useHandCursor: true });
    back.on('pointerdown', () => this.close());
    this.tweens.add({ targets: back, alpha: { from: 0.7, to: 1 }, duration: 700, yoyo: true, repeat: -1 });
    this.title = title;
    this.heroName = name;
    this.buildTrophies();
    if (!this.tree) {
      this.treeless = this.add.text(W / 2, H / 2, `${name}'s tree is not built yet (Stage 4 of the campaign).\nRurik's and Oryn's are: play one of them to try it.\n(Planned trees: docs/progression.md)`,
        { fontFamily: FONT.ui, fontSize: '18px', color: '#e8d4b0', align: 'center' }).setOrigin(0.5);
      this.treeObjs = [this.treeless];
      this.refreshHeader();
      this.showMode();
      return;
    }
    const before = new Set(this.children.list);
    this.cards = [];
    this.lines = this.add.graphics();
    const colW = 280;
    const x0 = W / 2 - colW;
    this.tree.branches.forEach((br, c) => {
      const cx = x0 + c * colW;
      const head = this.add.text(cx, 96, br.name, { fontFamily: FONT.display, fontSize: '18px', color: '#' + br.color.toString(16).padStart(6, '0') })
        .setOrigin(0.5).setStroke('#000000', 4);
      head.setLetterSpacing?.(2);
      this.add.text(cx, 116, br.blurb, { fontFamily: FONT.ui, fontSize: '12px', color: '#a89878' }).setOrigin(0.5);
      br.nodes.forEach((n, r) => {
        const cy = 168 + r * 92;
        const box = this.add.rectangle(cx, cy, 236, 66, 0x161210, 1).setStrokeStyle(2, 0x3a3028);
        const label = this.add.text(cx, cy - 12, n.name, { fontFamily: FONT.ui, fontSize: '16px', color: '#e8d4b0' }).setOrigin(0.5);
        const sub = this.add.text(cx, cy + 12, '', { fontFamily: FONT.ui, fontSize: '11px', color: '#a89878' }).setOrigin(0.5);
        this.cards.push({ c, r, n, br, box, label, sub, cx, cy });
      });
    });
    this.desc = this.add.text(W / 2, H - 70, '', { fontFamily: FONT.ui, fontSize: '15px', color: '#f0e0c0', align: 'center', wordWrap: { width: W - 120 } })
      .setOrigin(0.5);
    this.treeObjs = this.children.list.filter((o) => !before.has(o));
    this.refresh();
    this.showMode();
  }

  // ------------------------------------------------------------ trophies (boss loot)

  buildTrophies() {
    const W = SETTINGS.width;
    const before = new Set(this.children.list);
    this.trophyCards = Object.keys(TROPHIES).map((id, i) => {
      const cx = W / 2 + ((i % 5) - 2) * 180;
      const cy = 130 + Math.floor(i / 5) * 92;
      const box = this.add.rectangle(cx, cy, 168, 76, 0x161210, 1).setStrokeStyle(2, 0x3a3028);
      const label = this.add.text(cx, cy - 16, '', { fontFamily: FONT.ui, fontSize: '13px', color: '#e8d4b0', align: 'center', wordWrap: { width: 156 } }).setOrigin(0.5);
      const sub = this.add.text(cx, cy + 20, '', { fontFamily: FONT.ui, fontSize: '11px', color: '#a89878' }).setOrigin(0.5);
      return { id, box, label, sub };
    });
    this.trophyDesc = this.add.text(W / 2, SETTINGS.height - 76, '', { fontFamily: FONT.ui, fontSize: '15px', color: '#f0e0c0', align: 'center', wordWrap: { width: W - 120 } }).setOrigin(0.5);
    this.trophyObjs = this.children.list.filter((o) => !before.has(o));
  }

  refreshTrophies() {
    const P = this.progress;
    const worn = P.worn();
    this.header.setText(`TROPHIES  ${Object.keys(P.trophies.owned).length} / ${Object.keys(TROPHIES).length}    ·    WORN  ${worn.length} / ${TROPHY_SLOTS}    ·    bosses always drop one, big men sometimes`);
    this.trophyCards.forEach((k, i) => {
      const T = TROPHIES[k.id];
      const R = RARITY[T.rarity];
      const own = P.owns(k.id);
      const on = worn.includes(k.id);
      const sel = i === this.pick;
      k.box.setFillStyle(on ? Phaser.Display.Color.ValueToColor(R.color).darken(60).color : 0x161210, 1);
      k.box.setStrokeStyle(sel ? 4 : 2, sel ? 0xffe0a0 : own ? R.color : 0x3a3028);
      k.label.setText(own ? T.name : '? ? ?').setColor(own ? (on ? '#ffffff' : R.css) : '#5a5048');
      k.sub.setText(`${R.label}  ·  ${on ? 'WORN' : own ? 'carried' : T.boss ? `from ${T.boss}` : 'not found'}`);
    });
    const k = this.trophyCards[this.pick];
    const T = TROPHIES[k.id];
    this.trophyDesc.setText(P.owns(k.id)
      ? `${T.name.toUpperCase()}\n${T.text}\n${worn.includes(k.id) ? 'J / A: take it off' : worn.length < TROPHY_SLOTS ? 'J / A: wear it' : 'Every slot is full: take one off first'}`
      : `Not found yet.${T.boss ? ` ${T.boss} carries it.` : ' A big man might drop it.'}`);
  }

  showMode() {
    const tro = this.mode === 'trophies';
    for (const o of this.treeObjs ?? []) o.setVisible(!tro);
    for (const o of this.trophyObjs) o.setVisible(tro);
    this.title.setText(`${this.heroName.toUpperCase()}  ·  ${tro ? 'TROPHIES' : 'SKILLS'}`);
    epicFill(this.title, tro ? ['#fff2b0', '#e0a530', '#6a3c08'] : ['#ffd2a0', '#d06030', '#5a1a06']);
    this.footer.setText(tro ? 'J / A: wear or take off      O / RT: skills' : 'J / A: take    R / Y: respec    O / RT: trophies');
    if (tro) this.refreshTrophies();
    else if (this.tree) this.refresh();
    else this.refreshHeader();
  }

  card(c, r) { return this.cards.find((k) => k.c === c && k.r === r); }

  refreshHeader() {
    const P = this.progress;
    const pts = this.tree ? P.available(this.heroId) : P.earned;
    this.header.setText(`SKILL POINTS  ${pts}    ·    LEVEL ${P.level}    ·    ${P.toNext} blood to the next`);
  }

  refresh() {
    this.refreshHeader();
    const P = this.progress;
    const g = this.lines.clear();
    for (const k of this.cards) {
      const why = P.blocker(this.heroId, k.n.id);
      const owned = why === 'owned';
      const sel = k.c === this.col && k.r === this.row;
      const col = k.br.color;
      k.box.setFillStyle(owned ? Phaser.Display.Color.ValueToColor(col).darken(55).color : 0x161210, 1);
      k.box.setStrokeStyle(sel ? 4 : 2, sel ? 0xffe0a0 : owned ? col : why === null ? 0xb08a4a : 0x3a3028);
      k.label.setColor(owned ? '#ffffff' : why === null ? '#f0e0c0' : '#7a6e60');
      const state = why === 'planned' ? 'PLANNED' : owned ? 'TAKEN' : why === 'excluded' ? 'SHUT: you chose the other' : why === 'locked' ? 'needs the one above' : why === 'points' ? 'not enough points' : 'ready';
      k.sub.setText(`${KIND_LABEL[k.n.kind] ?? ''}  ·  ${k.n.cost} pt${k.n.cost > 1 ? 's' : ''}  ·  ${state}`);
      if (k.r > 0) {
        const up = this.card(k.c, k.r - 1);
        g.lineStyle(3, P.has(this.heroId, up.n.id) ? col : 0x3a3028, 1).lineBetween(k.cx, up.cy + 33, k.cx, k.cy - 33);
      }
    }
    // the choice at the top: the two majors that shut each other out
    const a = this.cards.find((k) => k.n.excl?.length);
    const b = a && this.cards.find((k) => k.n.id === a.n.excl[0]);
    if (a && b) {
      g.lineStyle(2, 0x8a2a2a, 0.9);
      for (let x = Math.min(a.cx, b.cx) + 120; x < Math.max(a.cx, b.cx) - 120; x += 12) g.lineBetween(x, a.cy, x + 6, a.cy);
    }
    const k = this.card(this.col, this.row);
    this.desc.setText(`${k.n.name.toUpperCase()}\n${k.n.text}${k.n.excl?.length ? '\n(You can have this OR the other major at the top — respec to change your mind.)' : ''}`);
  }

  close() {
    if (this.closing) return;
    this.closing = true;
    this.arena.closeSkills();
    this.scene.stop();
  }

  updateTrophies(c) {
    const n = this.trophyCards.length;
    const dx = (c.consume('right') ? 1 : 0) - (c.consume('left') ? 1 : 0);
    const dy = (c.consume('down') ? 1 : 0) - (c.consume('up') ? 1 : 0);
    if (dx || dy) {
      this.pick = (this.pick + dx + dy * 5 + n * 5) % n;
      playSfx(this, 'block', { volume: 0.2, pitch: 1200, minGapMs: 0 });
      this.refreshTrophies();
    }
    if (c.consume('confirm') || c.consume('attack')) {
      const id = this.trophyCards[this.pick].id;
      const P = this.progress;
      let ok = false;
      if (P.worn().includes(id)) { P.unwear(id); ok = true; } else ok = P.wear(id);
      if (ok) { playSfx(this, 'block', { volume: 0.7, pitch: 300, minGapMs: 0 }); this.arena.applySkills(); } else playSfx(this, 'kick', { volume: 0.3, pitch: -800, minGapMs: 0 });
      this.refreshTrophies();
    }
  }

  update() {
    const c = this.controls;
    c.tick(false);
    if (this.time.now - this.openedAt < 250) { c.read?.(); return; } // (the press that got you here doesn't count)
    // (Enter is pause in a fight AND confirm: here it takes a skill. Leaving: Esc / B /
    // Backspace on the keys, B / Back / Start on a pad)
    c.consume('pause');
    if (c.consume('back') || c.consume('menu') || c.consume('dodge')) return this.close();
    if (c.consume('kick')) {
      this.mode = this.mode === 'tree' ? 'trophies' : 'tree';
      playSfx(this, 'block', { volume: 0.3, pitch: 900, minGapMs: 0 });
      return this.showMode();
    }
    if (this.mode === 'trophies') return this.updateTrophies(c);
    if (!this.tree) { if (c.consume('confirm') || c.consume('attack')) this.close(); return; }
    const dx = (c.consume('right') ? 1 : 0) - (c.consume('left') ? 1 : 0);
    const dy = (c.consume('down') ? 1 : 0) - (c.consume('up') ? 1 : 0);
    if (dx || dy) {
      this.col = (this.col + dx + 3) % 3;
      this.row = (this.row + dy + 3) % 3;
      playSfx(this, 'block', { volume: 0.2, pitch: 1200, minGapMs: 0 });
      this.refresh();
    }
    if (c.consume('confirm') || c.consume('attack')) {
      const n = this.card(this.col, this.row).n;
      if (this.progress.buy(this.heroId, n.id)) {
        playSfx(this, 'block', { volume: 0.7, pitch: 300, minGapMs: 0 });
        this.arena.applySkills();
      } else playSfx(this, 'kick', { volume: 0.3, pitch: -800, minGapMs: 0 });
      this.refresh();
    }
    if (c.consume('restart') || c.consume('heavy')) {
      this.progress.respec(this.heroId);
      this.arena.applySkills();
      playSfx(this, 'swingAlt', { volume: 0.5, pitch: -400, minGapMs: 0 });
      this.refresh();
    }
  }
}
