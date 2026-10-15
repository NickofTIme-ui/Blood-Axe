// SkillScene.js — The skill tree, opened by kneeling at a rest shrine (stage/Stage.js
// restKneel). The fight holds still while it's up (ArenaScene.skillOpen).
//
//   ← → ↑ ↓ / D-pad   move between skills
//   J / ENTER / A     take the skill (enough points, the one before it owned)
//   R / Y             respec: every point back, free at a shrine
//   O / RB            the next page: SKILLS → TROPHIES (the boss loot you carry,
//                     data/trophies.js: wear or take off) → the hero's blade, when he has
//                     one (Rurik's OATHKEEPER, data/oathkeeper.js) → SKILLS
//   ESC / B / BACKSPACE, or the pad's B / Back / Start, or the button: back to the fight
//
// The look is drawn in code: the hero's portrait looming out of the dark behind the tree,
// each branch a hanging war banner in its colour, the skills as framed plates on it joined
// by chain, the tiers numbered I-III down the side, and the chosen skill read out on a
// panel at the foot. A painted frame and icons can still replace it
// (docs/gallows-art-needed.md).

import { SETTINGS } from '../config/settings.js';
import { InputManager } from '../core/InputManager.js';
import { SKILL_TREES } from '../data/skills.js';
import { TROPHIES, TROPHY_SLOTS, RARITY } from '../data/trophies.js';
import { OATHKEEPER } from '../data/oathkeeper.js';
import { CHARACTERS } from '../data/characters.js';
import { FONT, epicFill } from '../view/fonts.js';
import { playSfx } from '../core/Sfx.js';

const KIND_LABEL = { upgrade: 'UPGRADE', behaviour: 'NEW BEHAVIOUR', active: 'NEW ABILITY', passive: 'PASSIVE', mobility: 'MOBILITY', major: 'MAJOR' };
const TIER = ['I', 'II', 'III'];
const css = (c) => '#' + c.toString(16).padStart(6, '0');
const shade = (c, k) => Phaser.Display.Color.ValueToColor(c).darken(k).color;
const tint = (c, k) => Phaser.Display.Color.ValueToColor(c).lighten(k).color;

// the panel at the foot of the screen, and where the tree sits above it
const LAYOUT = { top: 86, rowGap: 96, cardH: 70, deskY: 434, deskH: 80 };

export class SkillScene extends Phaser.Scene {
  constructor() { super('Skills'); }

  // data: { arena, heroId, progress }
  init(data) {
    this.closing = false; // (the scene is reused: a second shrine must be able to close it again)
    this.arena = data.arena;
    this.heroId = data.heroId;
    this.progress = data.progress;
    this.tree = SKILL_TREES[this.heroId];
    this.col = 0;
    this.row = 0;
    this.mode = 'tree'; // or 'trophies', or 'blade'
    this.pick = 0;      // the trophy under the cursor
  }

  // the pages O / RB steps through
  get modes() { return this.heroId === 'warrior' ? ['tree', 'trophies', 'blade'] : ['tree', 'trophies']; }

  create() {
    const W = SETTINGS.width;
    const H = SETTINGS.height;
    this.cameras.main.setOrigin(0, 0).setZoom(SETTINGS.renderScale ?? 1); // full resolution
    this.add.rectangle(0, 0, W, H, 0x050203, 0.97).setOrigin(0);
    this.backdrop();
    this.controls = new InputManager(this, undefined, { menu: true }); // (the D-pad moves the cursor here)
    this.openedAt = this.time.now;
    const C = CHARACTERS[this.heroId];
    const name = this.arena.player.stats.name ?? this.heroId;
    const title = this.add.text(W / 2, 26, name.toUpperCase(), { fontFamily: FONT.display, fontSize: '32px' })
      .setOrigin(0.5).setStroke('#000000', 6);
    title.setLetterSpacing?.(6);
    epicFill(title, ['#ffe6b8', '#e08a3a', '#6a2006']);
    this.subtitle = this.add.text(W / 2, 50, '', { fontFamily: FONT.ui, fontSize: '12px', color: '#d8b04a' }).setOrigin(0.5).setStroke('#000000', 3);
    this.subtitle.setLetterSpacing?.(4);
    this.epithet = C?.title ?? (C?.className ?? '').toUpperCase();
    this.header = this.add.text(W / 2, 68, '', { fontFamily: FONT.ui, fontSize: '13px', color: '#e8d4b0' }).setOrigin(0.5).setStroke('#000000', 3);
    this.footer = this.add.text(18, H - 14, '', { fontFamily: FONT.ui, fontSize: '12px', color: '#a89878' }).setOrigin(0, 0.5).setStroke('#000000', 3);
    // leaving can never be a puzzle: a big button that says so, and a click on it works too
    const back = this.add.text(W - 18, H - 14, '[ ESC / B ]  BACK TO THE FIGHT', { fontFamily: FONT.ui, fontSize: '14px', color: '#ffd24a' })
      .setOrigin(1, 0.5).setStroke('#000000', 4).setInteractive({ useHandCursor: true });
    back.on('pointerdown', () => this.close());
    this.tweens.add({ targets: back, alpha: { from: 0.7, to: 1 }, duration: 700, yoyo: true, repeat: -1 });
    this.title = title;
    this.heroName = name;
    this.buildTrophies();
    if (this.heroId === 'warrior') this.buildBlade();
    if (!this.tree) {
      this.treeless = this.add.text(W / 2, H / 2, `${name}'s tree is not built yet (Stage 4 of the campaign).\nRurik's and Oryn's are: play one of them to try it.\n(Planned trees: docs/progression.md)`,
        { fontFamily: FONT.ui, fontSize: '18px', color: '#e8d4b0', align: 'center' }).setOrigin(0.5);
      this.treeObjs = [this.treeless];
      this.refreshHeader();
      this.showMode();
      return;
    }
    this.buildTree();
    this.refresh();
    this.showMode();
  }

  // The hero looming out of the dark behind everything, and a vignette.
  backdrop() {
    const W = SETTINGS.width;
    const H = SETTINGS.height;
    const key = `hero-${this.heroId}`;
    if (this.textures.exists(key)) {
      const src = this.textures.get(key).getSourceImage();
      const p = this.add.image(W / 2, H + 40, key).setOrigin(0.5, 1).setScale((H * 1.25) / src.height).setAlpha(0.13).setTint(0xffb080);
      this.tweens.add({ targets: p, alpha: 0.18, duration: 2600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    }
    const g = this.add.graphics();
    for (let i = 0; i < 14; i++) {
      const k = i / 13;
      g.fillStyle(0x000000, 0.06).fillRect(0, 0, W * 0.12 * k, H).fillRect(W - W * 0.12 * k, 0, W * 0.12 * k, H);
    }
    // embers drifting up through it
    this.motes = Array.from({ length: 26 }, () => {
      const m = this.add.circle(Math.random() * W, Math.random() * H, 1 + Math.random() * 1.6, Math.random() < 0.5 ? 0xff9a3a : 0xffd080, 0.5)
        .setBlendMode(Phaser.BlendModes.ADD);
      m.v = 0.2 + Math.random() * 0.5;
      m.sway = Math.random() * 6;
      return m;
    });
  }

  buildTree() {
    const W = SETTINGS.width;
    const L = LAYOUT;
    const before = new Set(this.children.list);
    const n = this.tree.branches.length;
    const colW = Math.min(280, (W - 70) / n);
    const cardW = Math.min(236, colW - 22);
    this.cardW = cardW;
    const x0 = W / 2 - (colW * (n - 1)) / 2 + 12;
    this.lines = this.add.graphics();
    this.banners = this.add.graphics();
    // the tier numerals down the left side
    for (let r = 0; r < 3; r++) {
      const cy = L.top + 74 + r * L.rowGap;
      this.add.text(x0 - colW / 2 - 4, cy, TIER[r], { fontFamily: FONT.display, fontSize: '20px', color: '#6a5034' }).setOrigin(0.5).setStroke('#000000', 4);
    }
    this.cards = [];
    this.tree.branches.forEach((br, c) => {
      const cx = x0 + c * colW;
      // the banner: a hanging cloth in the branch's colour, swallow-tailed at the foot
      const bw = cardW + 14;
      const top = L.top - 6;
      const bot = L.top + 74 + 2 * L.rowGap + L.cardH / 2 + 10;
      const dark = shade(br.color, 80);
      const g = this.banners;
      g.fillStyle(0x000000, 0.5).fillRect(cx - bw / 2 + 4, top + 4, bw, bot - top);
      g.fillGradientStyle(shade(br.color, 62), shade(br.color, 62), dark, dark, 0.75).fillRect(cx - bw / 2, top, bw, bot - top);
      g.fillStyle(0x050203, 1).fillTriangle(cx - 16, bot + 1, cx + 16, bot + 1, cx, bot - 14);
      g.lineStyle(2, shade(br.color, 35), 0.9).strokeRect(cx - bw / 2, top, bw, bot - top);
      g.lineStyle(1, 0xd8b04a, 0.35).strokeRect(cx - bw / 2 + 4, top + 4, bw - 8, bot - top - 8);
      // the pole it hangs from
      g.fillStyle(0x3a2616, 1).fillRect(cx - bw / 2 - 8, top - 6, bw + 16, 6);
      g.fillStyle(0xd8b04a, 1).fillCircle(cx - bw / 2 - 8, top - 3, 4).fillCircle(cx + bw / 2 + 8, top - 3, 4);
      const head = this.add.text(cx, L.top + 12, br.name, { fontFamily: FONT.display, fontSize: n > 3 ? '16px' : '18px', color: css(tint(br.color, 12)) })
        .setOrigin(0.5).setStroke('#000000', 5);
      head.setLetterSpacing?.(1);
      const sealed = br.needs && !this.progress.hasFlag(br.needs); // (Rurik's fire, before Oathkeeper is his)
      this.add.text(cx, L.top + 30, sealed ? 'Sealed: the blade of his blood' : br.blurb, { fontFamily: FONT.ui, fontSize: '11px', color: '#c8b088' }).setOrigin(0.5).setStroke('#000000', 3);
      br.nodes.forEach((node, r) => {
        const cy = L.top + 74 + r * L.rowGap;
        const frame = this.add.graphics();
        const glow = this.add.rectangle(cx, cy, cardW + 10, L.cardH + 10, br.color, 0).setBlendMode(Phaser.BlendModes.ADD);
        const gem = this.add.graphics();
        const label = this.add.text(cx + 8, cy - 13, node.name, { fontFamily: FONT.ui, fontSize: n > 3 ? '15px' : '16px', color: '#e8d4b0' }).setOrigin(0.5).setStroke('#000000', 3);
        const sub = this.add.text(cx + 8, cy + 12, '', { fontFamily: FONT.ui, fontSize: '10px', color: '#a89878' }).setOrigin(0.5);
        this.cards.push({ c, r, n: node, br, frame, glow, gem, label, sub, cx, cy });
      });
    });
    // the reading desk at the foot
    const d = this.add.graphics();
    d.fillStyle(0x000000, 0.6).fillRect(34, L.deskY + 4, W - 64, L.deskH);
    d.fillGradientStyle(0x22140c, 0x22140c, 0x0e0806, 0x0e0806, 0.96).fillRect(30, L.deskY, W - 60, L.deskH);
    d.lineStyle(2, 0x8a6430, 1).strokeRect(30, L.deskY, W - 60, L.deskH);
    d.lineStyle(1, 0xd8b060, 0.5).strokeRect(35, L.deskY + 5, W - 70, L.deskH - 10);
    this.deskName = this.add.text(48, L.deskY + 10, '', { fontFamily: FONT.display, fontSize: '19px', color: '#ffffff' }).setStroke('#000000', 4);
    this.deskKind = this.add.text(W - 48, L.deskY + 14, '', { fontFamily: FONT.ui, fontSize: '12px', color: '#d8b04a' }).setOrigin(1, 0);
    this.desc = this.add.text(48, L.deskY + 36, '', { fontFamily: FONT.ui, fontSize: '13px', color: '#f0e0c0', wordWrap: { width: W - 100 }, lineSpacing: 1 });
    this.treeObjs = this.children.list.filter((o) => !before.has(o));
  }

  // A plate on the banner: dark iron, a bevel, a gem by its kind that lights when taken.
  drawCard(k, state, sel) {
    const L = LAYOUT;
    const w = this.cardW;
    const h = L.cardH;
    const x = k.cx - w / 2;
    const y = k.cy - h / 2;
    const col = k.br.color;
    const owned = state === 'owned';
    const open = state === 'ready';
    const g = k.frame.clear();
    g.fillStyle(0x000000, 0.55).fillRect(x + 3, y + 4, w, h);
    const top = owned ? shade(col, 30) : 0x1e1612;
    const bot = owned ? shade(col, 58) : 0x0c0806;
    g.fillGradientStyle(top, top, bot, bot, 1).fillRect(x, y, w, h);
    g.fillStyle(0xffffff, owned ? 0.12 : 0.04).fillRect(x + 2, y + 2, w - 4, 3); // the bevel's light edge
    const edge = sel ? 0xffe0a0 : owned ? tint(col, 10) : open ? 0xb08a4a : 0x3a3028;
    g.lineStyle(sel ? 3 : 2, edge, 1).strokeRect(x, y, w, h);
    g.lineStyle(1, 0x000000, 0.8).strokeRect(x + 3, y + 3, w - 6, h - 6);
    // rivets
    g.fillStyle(owned ? 0xd8b04a : 0x5a4a38, 1);
    for (const [px, py] of [[x + 5, y + 5], [x + w - 5, y + 5], [x + 5, y + h - 5], [x + w - 5, y + h - 5]]) g.fillCircle(px, py, 1.8);
    if (k.n.kind === 'major') { g.lineStyle(1, 0xd8b04a, owned ? 0.9 : 0.4).strokeRect(x - 4, y - 4, w + 8, h + 8); }
    // the gem: its shape says what kind of skill it is
    const gx = x + 18;
    const gy = k.cy;
    const fill = owned ? tint(col, 25) : open ? shade(col, 30) : 0x2a221c;
    const G = k.gem.clear();
    G.fillStyle(0x000000, 0.7).fillCircle(gx, gy, 11);
    G.lineStyle(2, owned ? 0xd8b04a : 0x6a5034, 1).strokeCircle(gx, gy, 11);
    G.fillStyle(fill, 1);
    const kind = k.n.kind;
    if (kind === 'major') {
      const pts = []; for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + (i * Math.PI) / 5; const r = i % 2 ? 3.6 : 8.5; pts.push({ x: gx + Math.cos(a) * r, y: gy + Math.sin(a) * r }); }
      G.fillPoints(pts, true);
    } else if (kind === 'active') G.fillTriangle(gx - 7, gy + 6, gx + 7, gy + 6, gx, gy - 8);
    else if (kind === 'passive' || kind === 'behaviour') G.fillCircle(gx, gy, 6.5);
    else G.fillPoints([{ x: gx, y: gy - 8 }, { x: gx + 7, y: gy }, { x: gx, y: gy + 8 }, { x: gx - 7, y: gy }], true);
    if (owned) G.fillStyle(0xffffff, 0.7).fillCircle(gx - 2.5, gy - 3, 2);
  }

  // ------------------------------------------------------------ trophies (boss loot)

  buildTrophies() {
    const W = SETTINGS.width;
    const before = new Set(this.children.list);
    this.trophyCards = Object.keys(TROPHIES).map((id, i) => {
      const cx = W / 2 + ((i % 5) - 2) * 180;
      const cy = 140 + Math.floor(i / 5) * 92;
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

  // ------------------------------------------------------------ the blade (Rurik's Oathkeeper)

  buildBlade() {
    const before = new Set(this.children.list);
    if (this.textures.exists('oathkeeper-art')) this.paintedBlade(210, 38, 464);
    else this.drawnBlade();
    this.bladeWords(before);
  }

  // The painted Oathkeeper (assets/ui/oathkeeper.png, Nick's pick from the ChatGPT mock-ups):
  // point down, its light breathing, the sun in its guard and the pommel stone pulsing.
  paintedBlade(cx, top, h) {
    const src = this.textures.get('oathkeeper-art').getSourceImage();
    const k = h / src.height;
    const at = (x, y) => ({ x: cx + (x - src.width / 2) * k, y: top + y * k }); // (a point on the painting)
    this.add.ellipse(cx, top + h * 0.56, 90, h * 0.85, 0xffd890, 0.03).setBlendMode(Phaser.BlendModes.ADD);
    this.add.image(cx + 6, top + 6, 'oathkeeper-art').setOrigin(0.5, 0).setScale(k).setTint(0x000000).setAlpha(0.45);
    this.add.image(cx, top, 'oathkeeper-art').setOrigin(0.5, 0).setScale(k);
    const light = this.add.image(cx, top, 'oathkeeper-art').setOrigin(0.5, 0).setScale(k).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0);
    this.tweens.add({ targets: light, alpha: 0.32, duration: 1300, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    for (const [x, y, r] of [[143, 245, 16], [143, 45, 13]]) {
      const p = at(x, y);
      const sun = this.add.circle(p.x, p.y, r, 0xfff0c0, 0.5).setBlendMode(Phaser.BlendModes.ADD);
      this.tweens.add({ targets: sun, scale: { from: 0.7, to: 1.3 }, alpha: { from: 0.25, to: 0.6 }, duration: 1100, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    }
  }

  // The code-drawn stand-in (only if the painting is missing).
  drawnBlade() {
    const B = OATHKEEPER;
    const g = this.add.graphics();
    // the sword, point down, drawn large down the left: long fullered blade with the ember
    // in it, a broad gold cross-guard, a leather grip, a pommel set with a hearth-stone
    const cx = 210;
    const guardY = 150;
    const tipY = 470;
    const bw = 30;
    const edge = tipY - 60; // where the blade starts to taper to the point
    const blade = (inset) => [{ x: cx - bw / 2 + inset, y: guardY }, { x: cx + bw / 2 - inset, y: guardY }, { x: cx + bw / 2 - inset, y: edge }, { x: cx, y: tipY - inset * 2 }, { x: cx - bw / 2 + inset, y: edge }];
    g.fillStyle(0x000000, 0.5).fillPoints(blade(0).map((p) => ({ x: p.x + 6, y: p.y + 6 })), true);
    g.fillStyle(0x2a2c32, 1).fillPoints(blade(0), true);                 // dark forged steel
    g.fillStyle(0x4a4e58, 1).fillPoints(blade(3), true);
    g.fillStyle(0x8a909c, 0.8).fillRect(cx - bw / 2 + 3, guardY, 3, edge - guardY);  // the honed edges
    g.fillStyle(0x6a707c, 0.8).fillRect(cx + bw / 2 - 6, guardY, 3, edge - guardY);
    g.lineStyle(1, 0x1a1a1e, 0.5);                                           // hammer marks
    for (let y = guardY + 14; y < edge; y += 17) g.lineBetween(cx - bw / 2 + 7, y, cx - 7, y + 3).lineBetween(cx + 7, y + 8, cx + bw / 2 - 7, y + 5);
    // the fuller, and the ember living in it: brightest at the guard, thinning to the point
    const fTop = guardY + 6;
    const fBot = edge - 10;
    g.fillStyle(0x140404, 1).fillPoints([{ x: cx - 5, y: fTop }, { x: cx + 5, y: fTop }, { x: cx + 2, y: fBot }, { x: cx - 2, y: fBot }], true);
    this.emberGlow = this.add.ellipse(cx, (fTop + fBot) / 2, 34, fBot - fTop + 30, B.colors.ember, 0.12).setBlendMode(Phaser.BlendModes.ADD);
    const ember = this.add.graphics().setBlendMode(Phaser.BlendModes.ADD);
    ember.fillStyle(B.colors.ember, 0.9).fillPoints([{ x: cx - 3, y: fTop + 2 }, { x: cx + 3, y: fTop + 2 }, { x: cx + 0.8, y: fBot - 2 }, { x: cx - 0.8, y: fBot - 2 }], true);
    ember.fillStyle(B.colors.heart, 0.9).fillPoints([{ x: cx - 1.2, y: fTop + 2 }, { x: cx + 1.2, y: fTop + 2 }, { x: cx, y: fTop + (fBot - fTop) * 0.55 }], true);
    this.ember = ember;
    this.tweens.add({ targets: [this.ember, this.emberGlow], alpha: { from: 0.55, to: 1 }, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    // cross-guard, grip, pommel
    // the guard: two open hands of aged gold, palms up, cupping the blade
    for (const s of [-1, 1]) {
      const hand = [{ x: cx, y: guardY - 4 }, { x: cx + s * 30, y: guardY - 2 }, { x: cx + s * 62, y: guardY - 10 }, { x: cx + s * 78, y: guardY - 22 }, { x: cx + s * 82, y: guardY - 14 }, { x: cx + s * 66, y: guardY + 4 }, { x: cx + s * 30, y: guardY + 10 }, { x: cx, y: guardY + 8 }];
      g.fillStyle(0x5a3a0c, 1).fillPoints(hand.map((p) => ({ x: p.x, y: p.y + 2 })), true);
      g.fillStyle(B.colors.gold, 1).fillPoints(hand, true);
      g.lineStyle(1, 0x8a6420, 1);
      for (const f of [44, 54, 64]) g.lineBetween(cx + s * f, guardY - 4 - (f - 40) * 0.25, cx + s * (f + 6), guardY + 4 - (f - 40) * 0.2); // fingers
    }
    g.fillStyle(0xfff0c0, 0.5).fillRect(cx - 40, guardY - 3, 80, 2);
    g.fillStyle(0x4a2a16, 1).fillRect(cx - 9, guardY - 82, 18, 70);
    g.lineStyle(2, 0x2a160a, 1);
    for (let y = guardY - 78; y < guardY - 14; y += 8) g.lineBetween(cx - 9, y, cx + 9, y + 5);
    g.fillStyle(B.colors.gold, 1).fillCircle(cx, guardY - 92, 15);
    g.fillStyle(0x7a1a08, 1).fillCircle(cx, guardY - 92, 8);
    this.stone = this.add.circle(cx, guardY - 92, 6, B.colors.ember, 0.9).setBlendMode(Phaser.BlendModes.ADD);
    this.tweens.add({ targets: this.stone, scale: { from: 0.8, to: 1.25 }, duration: 1100, yoyo: true, repeat: -1 });
  }

  bladeWords(before) {
    const W = SETTINGS.width;
    const B = OATHKEEPER;
    const tx = 360;
    const name = this.add.text(tx, 100, B.name, { fontFamily: FONT.display, fontSize: '40px' }).setStroke('#000000', 6);
    name.setLetterSpacing?.(8);
    epicFill(name, ['#ffffff', '#ffe08a', '#8a5a10']);
    this.add.text(tx + 4, 146, B.title.toUpperCase(), { fontFamily: FONT.ui, fontSize: '14px', color: '#d8b04a' }).setStroke('#000000', 3).setLetterSpacing?.(4);
    let y = 182;
    for (const para of B.lore) {
      const t = this.add.text(tx, y, para, { fontFamily: FONT.ui, fontSize: '15px', color: '#f0e0c0', wordWrap: { width: W - tx - 50 }, lineSpacing: 3 }).setStroke('#000000', 2);
      y += t.height + 12;
    }
    const his = this.progress.hasFlag('oathkeeper');
    this.add.text(tx, y + 4, his ? "Its fire is THE KING'S WRATH, the fourth branch of his tree." : 'Not his yet. It waits for him at the north gate, and its fire with it.', { fontFamily: FONT.ui, fontSize: '13px', color: '#ffc860' }).setStroke('#000000', 3);
    this.bladeObjs = this.children.list.filter((o) => !before.has(o));
  }

  // ------------------------------------------------------------ pages

  showMode() {
    const m = this.mode;
    for (const o of this.treeObjs ?? []) o.setVisible(m === 'tree');
    for (const o of this.trophyObjs) o.setVisible(m === 'trophies');
    for (const o of this.bladeObjs ?? []) o.setVisible(m === 'blade');
    this.title.setText(this.heroName.toUpperCase());
    epicFill(this.title, m === 'trophies' ? ['#fff2b0', '#e0a530', '#6a3c08'] : ['#ffe6b8', '#e08a3a', '#6a2006']);
    this.subtitle.setText(`${this.epithet ? `${this.epithet}   ·   ` : ''}${m === 'tree' ? 'SKILLS' : m === 'trophies' ? 'TROPHIES' : 'HIS BLADE'}`);
    const next = { tree: 'trophies', trophies: this.modes.includes('blade') ? 'his blade' : 'skills', blade: 'skills' }[m];
    this.footer.setText(m === 'trophies' ? `J / A: wear or take off      O / RB: ${next}` : m === 'blade' ? `O / RB: ${next}` : `J / A: take    R / Y: respec    O / RB: ${next}`);
    this.header.setVisible(m !== 'blade');
    if (m === 'trophies') this.refreshTrophies();
    else if (m === 'tree' && this.tree) this.refresh();
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
      this.drawCard(k, owned ? 'owned' : why === null ? 'ready' : 'shut', sel);
      k.glow.setFillStyle(k.br.color, owned ? 0.16 : 0);
      k.label.setColor(owned ? '#ffffff' : why === null ? '#f0e0c0' : '#7a6e60');
      const state = why === 'planned' ? 'PLANNED' : why === 'sealed' ? 'when Oathkeeper is his' : owned ? 'TAKEN' : why === 'excluded' ? 'SHUT' : why === 'locked' ? 'needs the one above' : why === 'points' ? 'not enough points' : 'ready';
      k.sub.setText(`${KIND_LABEL[k.n.kind] ?? ''}  ·  ${k.n.cost} pt${k.n.cost > 1 ? 's' : ''}  ·  ${state}`).setColor(owned ? '#ffe0b0' : '#a89878');
      if (k.r > 0) {
        // chain links down the banner, lit in the branch's colour once the one above is taken
        const up = this.card(k.c, k.r - 1);
        const lit = P.has(this.heroId, up.n.id);
        const y0 = up.cy + LAYOUT.cardH / 2 + 1;
        const y1 = k.cy - LAYOUT.cardH / 2 - 1;
        for (let y = y0, i = 0; y < y1 - 4; y += 7, i++) {
          g.lineStyle(2, lit ? tint(k.br.color, 15) : 0x4a3a2c, 1);
          if (i % 2) g.strokeEllipse(k.cx, y + 3, 4, 8); else g.strokeEllipse(k.cx, y + 3, 7, 7);
        }
      }
    }
    // the choice at the top: the two majors that shut each other out
    const a = this.cards.find((k) => k.n.excl?.length);
    const b = a && this.cards.find((k) => k.n.id === a.n.excl[0]);
    if (a && b) {
      g.lineStyle(2, 0x8a2a2a, 0.9);
      const l = Math.min(a.cx, b.cx) + this.cardW / 2 + 2;
      const r = Math.max(a.cx, b.cx) - this.cardW / 2 - 2;
      for (let x = l; x < r; x += 10) g.lineBetween(x, a.cy, Math.min(r, x + 5), a.cy);
    }
    const k = this.card(this.col, this.row);
    this.deskName.setText(k.n.name.toUpperCase()).setColor(css(tint(k.br.color, 20)));
    this.deskKind.setText(`${k.br.name}  ·  TIER ${TIER[k.r]}  ·  ${KIND_LABEL[k.n.kind] ?? ''}  ·  ${k.n.cost} POINTS`);
    this.desc.setText(`${k.n.text}${k.n.excl?.length ? '  (You can have this OR the other major at the top: respec to change your mind.)' : ''}`);
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
    const H = SETTINGS.height;
    for (const m of this.motes ?? []) {
      m.y -= m.v;
      m.x += Math.sin((m.y + m.sway * 40) / 40) * 0.2;
      if (m.y < -4) { m.y = H + 4; m.x = Math.random() * SETTINGS.width; }
    }
    const c = this.controls;
    c.tick(false);
    if (this.time.now - this.openedAt < 250) { c.read?.(); return; } // (the press that got you here doesn't count)
    // (Enter is pause in a fight AND confirm: here it takes a skill. Leaving: Esc / B /
    // Backspace on the keys, B / Back / Start on a pad)
    c.consume('pause');
    if (c.consume('back') || c.consume('menu') || c.consume('dodge')) return this.close();
    if (c.consume('kick')) {
      const ms = this.modes;
      this.mode = ms[(ms.indexOf(this.mode) + 1) % ms.length];
      playSfx(this, 'block', { volume: 0.3, pitch: 900, minGapMs: 0 });
      return this.showMode();
    }
    if (this.mode === 'trophies') return this.updateTrophies(c);
    if (this.mode === 'blade') { if (c.consume('confirm') || c.consume('attack')) { this.mode = 'tree'; this.showMode(); } return; }
    if (!this.tree) { if (c.consume('confirm') || c.consume('attack')) this.close(); return; }
    const cols = this.tree.branches.length;
    const dx = (c.consume('right') ? 1 : 0) - (c.consume('left') ? 1 : 0);
    const dy = (c.consume('down') ? 1 : 0) - (c.consume('up') ? 1 : 0);
    if (dx || dy) {
      this.col = (this.col + dx + cols) % cols;
      this.row = (this.row + dy + 3) % 3;
      playSfx(this, 'block', { volume: 0.2, pitch: 1200, minGapMs: 0 });
      this.refresh();
    }
    if (c.consume('confirm') || c.consume('attack')) {
      const k = this.card(this.col, this.row);
      if (this.progress.buy(this.heroId, k.n.id)) {
        playSfx(this, 'block', { volume: 0.7, pitch: 300, minGapMs: 0 });
        this.arena.applySkills();
        this.taken(k);
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

  // A skill taken: the plate flares in its branch's colour.
  taken(k) {
    const f = this.add.rectangle(k.cx, k.cy, this.cardW, LAYOUT.cardH, tint(k.br.color, 30), 0.7).setBlendMode(Phaser.BlendModes.ADD);
    this.tweens.add({ targets: f, alpha: 0, scaleX: 1.12, scaleY: 1.3, duration: 420, ease: 'Cubic.easeOut', onComplete: () => f.destroy() });
    for (let i = 0; i < 14; i++) {
      const s = this.add.circle(k.cx + (Math.random() - 0.5) * this.cardW, k.cy + (Math.random() - 0.5) * LAYOUT.cardH, 1.5 + Math.random() * 2, tint(k.br.color, 40), 1).setBlendMode(Phaser.BlendModes.ADD);
      this.tweens.add({ targets: s, y: s.y - 30 - Math.random() * 40, alpha: 0, duration: 500 + Math.random() * 400, onComplete: () => s.destroy() });
    }
  }
}
