// HUDScene.js — Everything drawn on top of the arena, kept OFF the action:
//
//   top-left       the hero's knight-armour health / stamina / magic bars (view/hudArt.js)
//   top-centre     the call-out banner (WAVE 2, DECAPITATED!, STRIKE! x3, GUARD BREAK...)
//   top-right      wave, kills, gore level
//   bottom strip   name + health of every enemy currently on screen
//
// Nothing is written over the fighters themselves. ArenaScene sends call-outs with
// `arena.callout(text, colour)`.
//
// Runs as its own scene so camera shake and zoom never move the HUD.

import { SETTINGS } from '../config/settings.js';
import { HUD_ART } from '../view/hudArt.js';
import { FONT, epicFill } from '../view/fonts.js';
import { DeathScreen } from '../view/DeathScreen.js';

const SERIF = FONT.ui;

// call-out colour -> the gradient it's painted with (top to bottom)
function calloutStops(color) {
  const c = color.toLowerCase();
  if (c === '#ffffff') return ['#ffffff', '#c8ccd8', '#6a6e7a'];          // steel (PARRY)
  if (c === '#ffd24a' || c === '#e0c080') return ['#fff2b0', '#e0a530', '#6a3c08']; // gold
  if (c === '#ff9a30') return ['#ffd9a0', '#f07a18', '#6a2004'];          // ember (GUARD BREAK)
  return ['#ff7a5a', '#d0101a', '#3d0004'];                                // blood
}
const MAX_ENEMY_BARS = 4;

// who's speaking: each voice its own colour (the Oath Keepers as their kits; enemies hot; the king cold)
const SPEAKER = {
  RURIK: '#f0d0a0', ORYN: '#8ad8e8', VEXA: '#d49aff',
  VAREK: '#ff8a6a', CINDER: '#ff8a6a', MALGOR: '#b8a0ff',
};

export class HUDScene extends Phaser.Scene {
  constructor() {
    super('HUD');
  }

  init(data) {
    this.arena = data.arena;
  }

  create() {
    this.cameras.main.setOrigin(0, 0).setZoom(SETTINGS.renderScale ?? 1); // draw at full resolution
    // my hero's bars top-left; in co-op my partner's top-right
    const p = this.arena.player;
    this.barSets = [{ p, bars: this.makePlayerBars(p, 6) }];
    const mate = this.arena.players.find((q) => q !== p);
    if (mate) this.barSets.push({ p: mate, bars: this.makePlayerBars(mate, SETTINGS.width - (HUD_ART.width ?? 290) - 10) });
    this.bars = this.barSets[0].bars;
    this.downText = this.add.text(SETTINGS.width / 2, SETTINGS.height * 0.3, '', { fontFamily: FONT.display, fontSize: '26px', align: 'center' })
      .setOrigin(0.5).setStroke('#0a0000', 6).setDepth(40);
    this.waitText = this.add.text(SETTINGS.width / 2, SETTINGS.height - 40, '', { fontFamily: FONT.ui, fontSize: '14px', color: '#e0c080' })
      .setOrigin(0.5).setStroke('#000000', 4).setDepth(40);

    const style = { fontFamily: FONT.ui, fontSize: '13px', color: '#d9c7a3', fontStyle: 'normal' };
    this.info = this.add.text(SETTINGS.width - 12, mate ? 92 : 10, '', { ...style, align: 'right' }).setOrigin(1, 0)
      .setStroke('#000000', 3);
    this.debugText = this.add.text(12, 112, '', { ...style, fontFamily: 'monospace', fontStyle: '', fontSize: '11px', color: '#7fffa0' });

    // controls hint: shown for a few seconds, then gets out of the way
    const hint = this.add.text(SETTINGS.width / 2, SETTINGS.height - 8,
      'J light  K heavy  O kick  L block (+←/→ turn)  Shift roll  U firebolt  Space jump  |  P pause  G gore  M music',
      { ...style, fontSize: '11px', color: '#b0a590' }).setOrigin(0.5, 1).setStroke('#000000', 3);
    this.tweens.add({ targets: hint, alpha: 0, delay: 7000, duration: 1500 });

    // call-out banner (top centre)
    this.banner = this.add.text(SETTINGS.width / 2, 36, '', {
      fontFamily: FONT.display, fontSize: '24px', color: '#ff2a1a', fontStyle: 'normal', align: 'center',
    }).setOrigin(0.5).setStroke('#0a0000', 5).setAlpha(0);
    this.banner.setLetterSpacing?.(2);
    this.death = null; // the YOU DIED sequence (view/DeathScreen.js)
    this.pauseUi = null;

    this.enemyBars = [];
    this.focusId = null;
    this.makeStageHud();
    const ev = this.arena.world.events;
    this.onWave = (n) => this.callout(`WAVE ${n}`, '#e0c080', 30);
    this.onHit = (e) => { if (e.attacker === this.arena.player && e.defender.team === 'enemy') this.focusId = e.defender.id; };
    ev.on('wave', this.onWave);
    ev.on('hit', this.onHit);
    this.events.once('shutdown', () => { ev.off('wave', this.onWave); ev.off('hit', this.onHit); });
  }

  // ------------------------------------------------------------ the stage

  makeStageHud() {
    const W = SETTINGS.width;
    const H = SETTINGS.height;
    // objective, under the hero's bars
    this.objective = this.add.text(14, 90, '', { fontFamily: FONT.ui, fontSize: '13px', color: '#e8d4b0' })
      .setStroke('#000000', 4).setAlpha(0.95);
    // blood, level and unspent skill points (progression/Progress.js)
    this.levelText = this.add.text(14, 128, '', { fontFamily: FONT.ui, fontSize: '12px', color: '#ff9a7a' })
      .setStroke('#000000', 4).setAlpha(0.9);
    // GO → at the right edge, pulsing, while the way on is open
    this.go = this.add.text(W - 24, H / 2 - 20, 'GO\n→', { fontFamily: FONT.display, fontSize: '40px', align: 'center' })
      .setOrigin(1, 0.5).setStroke('#000000', 6).setVisible(false);
    epicFill(this.go, ['#fff2b0', '#e0a530', '#6a3c08']);
    // section title card (big, centre, fades)
    this.card = this.add.text(W / 2, H * 0.36, '', { fontFamily: FONT.display, fontSize: '46px', align: 'center' })
      .setOrigin(0.5).setStroke('#0a0000', 7).setAlpha(0).setDepth(50);
    this.card.setLetterSpacing?.(4);
    this.cardSub = this.add.text(W / 2, H * 0.36 + 42, '', { fontFamily: FONT.ui, fontSize: '16px', color: '#d8c8a8', align: 'center' })
      .setOrigin(0.5).setStroke('#000000', 4).setAlpha(0).setDepth(50);
    this.cardSub.setLetterSpacing?.(3);
    // boss bar (top centre, under the call-out banner)
    this.bossUi = null;
    this.makeDialogue();
    // the stage may already be under way (the HUD starts a frame after the arena)
    const st = this.arena.stage;
    if (st?.section) this.sectionCard(st.index, st.section);
    if (st?.boss?.alive) this.showBoss(st.boss);
    if (this.arena.paused) this.showPause(true);
  }

  // ------------------------------------------------------------ story lines (stage/Story.js)

  makeDialogue() {
    const W = SETTINGS.width;
    const H = SETTINGS.height;
    // letterbox bars for a held scene
    this.bars2 = [
      // (under the bars and the text: they stay readable)
      this.add.rectangle(0, 0, W, 30, 0x000000).setOrigin(0).setAlpha(0).setDepth(-1),
      this.add.rectangle(0, H, W, 30, 0x000000).setOrigin(0, 1).setAlpha(0).setDepth(-1),
    ];
    // up in the sky over the street, clear of the fight on the floor
    const y = 184;
    const panel = this.add.rectangle(W / 2, y, 640, 66, 0x050304, 0.78).setStrokeStyle(1, 0x6a5a48);
    const who = this.add.text(W / 2 - 304, y - 26, '', { fontFamily: FONT.display, fontSize: '15px', color: '#e8c890' }).setStroke('#000000', 4);
    const text = this.add.text(W / 2 - 304, y - 6, '', { fontFamily: FONT.body, fontSize: '16px', color: '#f0e6d6', wordWrap: { width: 600 } })
      .setStroke('#000000', 3);
    const next = this.add.text(W / 2 + 312, y + 26, 'SPACE / J  —  next', { fontFamily: FONT.ui, fontSize: '10px', color: '#a89880' })
      .setOrigin(1, 1).setStroke('#000000', 3);
    this.dialogue = { box: this.add.container(0, 0, [panel, who, text, next]).setDepth(61).setAlpha(0), who, text, next, key: null };
  }

  updateDialogue() {
    const D = this.dialogue;
    const line = this.arena.stage?.story?.line;
    const hold = !!this.arena.stage?.story?.holding;
    for (const b of this.bars2) b.setAlpha(Phaser.Math.Linear(b.alpha, hold ? 1 : 0, 0.12));
    if (!line) { D.box.setAlpha(Math.max(0, D.box.alpha - 0.08)); D.key = null; return; }
    const key = `${line.beat}:${line.index}`;
    if (key !== D.key) {
      D.key = key;
      D.who.setText(line.who).setColor(SPEAKER[line.who] ?? '#d8d0c0');
      D.text.setText(line.text);
      D.next.setVisible(line.hold);
    }
    D.box.setAlpha(Math.min(1, D.box.alpha + 0.15));
  }

  sectionCard(index, section) {
    const roman = ['I', 'II', 'III', 'IV', 'V', 'VI'][index] ?? `${index + 1}`;
    this.card.setText(section.name);
    epicFill(this.card, ['#ff7a5a', '#d0101a', '#5a0006']);
    this.cardSub.setText(`${roman}  ·  ${section.objective}`);
    // (a section that teaches something says how, under the objective)
    this.objective.setText(`▸ ${section.objective}${section.hint ? `\n   ${section.hint}` : ''}`);
    this.showGo(false);
    this.tweens.killTweensOf([this.card, this.cardSub]);
    for (const t of [this.card, this.cardSub]) {
      t.setAlpha(0).setScale(1.08);
      this.tweens.add({ targets: t, alpha: 1, scale: 1, duration: 600, ease: 'Sine.easeOut' });
      this.tweens.add({ targets: t, alpha: 0, delay: 2400, duration: 700 });
    }
  }

  showGo(on) {
    this.go.setVisible(on);
    if (on) this.objective.setText('▸ Press on →');
  }

  showBoss(boss) {
    const W = SETTINGS.width;
    const w = 420;
    const x = W / 2 - w / 2;
    const y = 66;
    this.bossUi?.parts.forEach((p) => p.destroy());
    const parts = [
      this.add.rectangle(x - 4, y - 4, w + 8, 18, 0x000000, 0.75).setOrigin(0).setStrokeStyle(2, 0x8a6430),
      this.add.rectangle(x, y, w, 10, 0x2a0606).setOrigin(0),
    ];
    const trail = this.add.rectangle(x, y, w, 10, 0xfff0d0, 0.7).setOrigin(0);
    const fill = this.add.rectangle(x, y, w, 10, 0xc0161c).setOrigin(0);
    const name = this.add.text(W / 2, y + 22, boss.stats.name.toUpperCase(), { fontFamily: FONT.display, fontSize: '16px' })
      .setOrigin(0.5, 0).setStroke('#000000', 4);
    epicFill(name, ['#ff9a7a', '#d0101a', '#5a0006']);
    parts.push(trail, fill, name);
    this.bossUi = { boss, fill, trail, w, shown: 1, parts };
  }

  updateBoss() {
    const ui = this.bossUi;
    if (!ui) return;
    const r = Math.max(0, ui.boss.health / ui.boss.stats.maxHealth);
    ui.shown = r > ui.shown ? r : ui.shown + (r - ui.shown) * 0.05;
    ui.fill.scaleX = r;
    ui.trail.scaleX = ui.shown;
    if (!ui.boss.alive && ui.shown < 0.01) { ui.parts.forEach((p) => p.destroy()); this.bossUi = null; }
  }

  // The stage is won: the same cinematic treatment as YOU DIED, in gold, with the tally.
  showVictory(stats) {
    const W = SETTINGS.width;
    const H = SETTINGS.height;
    const D = 900;
    const dim = this.add.rectangle(0, 0, W, H, 0x000000).setOrigin(0).setAlpha(0).setDepth(D);
    this.tweens.add({ targets: dim, alpha: 0.6, duration: 1200 });
    const barH = Math.round(H * 0.12);
    const top = this.add.rectangle(0, 0, W, barH, 0x000000).setOrigin(0, 1).setDepth(D + 5);
    const bot = this.add.rectangle(0, H, W, barH, 0x000000).setOrigin(0, 0).setDepth(D + 5);
    this.tweens.add({ targets: top, y: barH, duration: 900, ease: 'Cubic.easeOut' });
    this.tweens.add({ targets: bot, y: H - barH, duration: 900, ease: 'Cubic.easeOut' });
    const C = stats.campaign; // (a campaign level: its own title, who was saved, the road on)
    const title = this.add.text(W / 2, H * 0.34, C?.title ?? 'OATH  FULFILLED', { fontFamily: FONT.display, fontSize: '64px' })
      .setOrigin(0.5).setStroke('#0a0500', 8).setAlpha(0).setScale(1.1).setDepth(D + 3);
    title.setLetterSpacing?.(5);
    epicFill(title, ['#fff6c8', '#f0c050', '#a06010', '#3a1a00']);
    this.tweens.add({ targets: title, alpha: 1, scale: 1, duration: 1400, ease: 'Sine.easeOut' });
    const secs = Math.round(stats.frames / 60);
    const lines = [
      `TIME  ${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`,
      `KILLS  ${stats.kills}      EXECUTIONS  ${stats.finishers}`,
      `SECRETS  ${stats.secrets} / ${stats.secretsTotal}      DEATHS  ${stats.deaths}`,
    ];
    if (C) {
      if (C.saved?.length) lines.push(`SAVED:  ${C.saved.join(',  ')}`);
      if (C.next) lines.push('', C.next);
    }
    const tally = this.add.text(W / 2, H * 0.44, lines.join('\n'), { fontFamily: FONT.ui, fontSize: C ? '16px' : '18px', color: '#f0e0c0', align: 'center', lineSpacing: C ? 6 : 10 })
      .setOrigin(0.5, 0).setStroke('#000000', 4).setAlpha(0).setDepth(D + 3);
    this.tweens.add({ targets: tally, alpha: 1, delay: 1200, duration: 900 });
    const prompt = this.add.text(W / 2, H * (C ? 0.8 : 0.74), 'R  —  RIDE AGAIN      ESC  —  CHOOSE ANOTHER', { fontFamily: FONT.ui, fontSize: '15px', color: '#cdb391' })
      .setOrigin(0.5).setStroke('#000000', 3).setAlpha(0).setDepth(D + 3);
    this.tweens.add({ targets: prompt, alpha: 0.9, delay: 2400, duration: 900 });
    this.objective.setText('');
  }

  // The pause menu. Built once, then just shown and hidden.
  showPause(on) {
    if (!this.banner?.active) return; // not up (yet, or any more)
    if (!this.pauseUi) {
      if (!on) return;
      const W = SETTINGS.width;
      const H = SETTINGS.height;
      const dim = this.add.rectangle(0, 0, W, H, 0x050000, 0.72).setOrigin(0).setInteractive(); // swallows clicks
      const title = this.add.text(W / 2, H * 0.24, 'PAUSED', { fontFamily: FONT.display, fontSize: '60px' })
        .setOrigin(0.5).setStroke('#0a0000', 8);
      title.setLetterSpacing?.(6);
      epicFill(title, ['#ff7a5a', '#d0101a', '#5a0006']);
      const menu = this.add.text(W / 2, H * 0.42,
        'P / ENTER  —  RESUME\nR  —  RESTART THE STAGE\nESC  —  CHARACTER SELECT',
        { fontFamily: FONT.ui, fontSize: '18px', color: '#f0e0c0', align: 'center', lineSpacing: 10 })
        .setOrigin(0.5).setStroke('#000000', 4);
      const keys = this.add.text(W / 2, H * 0.70,
        'J  light      K  heavy      O  kick      L  block (tap to parry)\n'
        + 'SHIFT  roll (cancels a swing)      SPACE  jump      U  spell\n'
        + 'Behind a fleeing enemy:  J  throat  ·  hold J  impale  ·  K  halve  ·  O  slash\n'
        + 'M  music      G  gore',
        { fontFamily: FONT.body, fontSize: '16px', color: '#cdb391', align: 'center', lineSpacing: 7 })
        .setOrigin(0.5).setStroke('#000000', 3);
      this.pauseUi = this.add.container(0, 0, [dim, title, menu, keys]).setDepth(2000);
    }
    this.pauseUi.setVisible(on);
  }

  clearDeath() {
    this.death?.destroy();
    this.death = null;
  }

  // ------------------------------------------------------------ hero bars

  makePlayerBars(p, x0) {
    const bars = {};
    const y0 = 20;
    this.add.text(x0 + 30, 5, p.stats.name.toUpperCase(), {
      fontFamily: SERIF, fontSize: '14px', color: '#f0e0c0', fontStyle: 'normal',
    }).setStroke('#000000', 4);

    if (HUD_ART.bars) {
      for (const name of ['health', 'stamina', 'magic']) {
        const b = HUD_ART.bars[name];
        const x = x0 + b.x;
        const y = y0 + b.y;
        // empty track, trail (recent damage), the fill, then the ornate frame on top
        const ts = HUD_ART.texScale ?? 1; // textures are hi-res; shown at 1:1 screen pixels
        this.add.image(x + b.fillX, y + b.fillY, b.track).setOrigin(0).setScale(ts);
        const trail = this.add.image(x + b.fillX, y + b.fillY, b.fill).setOrigin(0).setScale(ts).setTintFill(0xfff4e0).setAlpha(0.55);
        const fill = this.add.image(x + b.fillX, y + b.fillY, b.fill).setOrigin(0).setScale(ts);
        const frame = this.add.image(x, y, b.frame).setOrigin(0).setScale(ts);
        bars[name] = { fill, trail, frame, w: b.fillW, h: b.fillH, shown: 1, art: true };
      }
    } else {
      // fallback if the artwork is missing: plain bars
      const plain = (y, w, color) => {
        this.add.rectangle(x0 + 8, y - 2, w + 4, 14, 0x000000).setOrigin(0);
        const trail = this.add.rectangle(x0 + 10, y, w, 10, 0xffffff, 0.8).setOrigin(0);
        const fill = this.add.rectangle(x0 + 10, y, w, 10, color).setOrigin(0);
        return { fill, trail, w, shown: 1, art: false };
      };
      Object.assign(bars, { health: plain(26, 256, 0x3ac040), stamina: plain(44, 200, 0xd9b43a), magic: plain(62, 200, 0x3a6fd9) });
    }
    return bars;
  }

  setBar(bar, ratio) {
    ratio = Math.max(0, Math.min(1, ratio));
    bar.shown = ratio > bar.shown ? ratio : bar.shown + (ratio - bar.shown) * 0.06;
    if (bar.art) {
      bar.fill.setCrop(0, 0, bar.w * ratio, bar.h);
      bar.trail.setCrop(0, 0, bar.w * bar.shown, bar.h);
    } else {
      bar.fill.scaleX = ratio;
      bar.trail.scaleX = bar.shown;
    }
  }

  // ------------------------------------------------------------ call-outs

  callout(text, color = '#ff2a1a', size = 24) {
    const b = this.banner;
    if (!b?.active) return; // (the HUD is between runs: a restart is in progress)
    this.tweens.killTweensOf(b);
    b.setText(text).setFontSize(size + 4).setAlpha(1).setScale(1.35);
    epicFill(b, calloutStops(color));
    this.tweens.add({ targets: b, scale: 1, duration: 140, ease: 'Back.easeOut' });
    this.tweens.add({ targets: b, alpha: 0, delay: 750, duration: 450 });
  }

  // ------------------------------------------------------------ enemy strip (bottom)

  enemyBar(i) {
    if (this.enemyBars[i]) return this.enemyBars[i];
    const w = 190;
    const x = 14 + i * (w + 36);
    const y = SETTINGS.height - 22;
    const art = HUD_ART.bars?.stamina; // the bright yellow fill tints to a clean blood red
    const bar = {
      name: this.add.text(x, y - 16, '', { fontFamily: SERIF, fontSize: '12px', color: '#e8d0b0', fontStyle: 'normal' })
        .setStroke('#000000', 3),
      rim: this.add.rectangle(x - 2, y - 2, w + 4, 11, 0x1a1210).setOrigin(0).setStrokeStyle(1, 0xb08a4a),
      trail: this.add.rectangle(x, y, w, 7, 0xffe8d0, 0.6).setOrigin(0),
      fill: art
        ? this.add.image(x, y, art.fill).setOrigin(0).setDisplaySize(w, 7).setTint(0xff4a3a)
        : this.add.rectangle(x, y, w, 7, 0xc0282d).setOrigin(0),
      w, shown: 1, id: null,
    };
    this.enemyBars[i] = bar;
    return bar;
  }

  updateEnemyStrip() {
    const arena = this.arena;
    const view = arena.cameras.main.worldView;
    const p = arena.player;
    const onScreen = arena.world.fighters
      .filter((f) => f.team === 'enemy' && f.alive && f.x > view.x - 20 && f.x < view.right + 20)
      .sort((a, b) => (a.id === this.focusId ? -1 : b.id === this.focusId ? 1 : Math.abs(a.x - p.x) - Math.abs(b.x - p.x)))
      .slice(0, MAX_ENEMY_BARS);
    for (let i = 0; i < Math.max(onScreen.length, this.enemyBars.length); i++) {
      const f = onScreen[i];
      const bar = f || i < this.enemyBars.length ? this.enemyBar(i) : null;
      if (!bar) continue;
      const vis = !!f;
      for (const k of ['name', 'rim', 'trail', 'fill']) bar[k].setVisible(vis);
      if (!f) continue;
      if (bar.id !== f.id) { bar.id = f.id; bar.shown = f.health / f.stats.maxHealth; }
      const ratio = Math.max(0, f.health / f.stats.maxHealth);
      bar.shown = ratio > bar.shown ? ratio : bar.shown + (ratio - bar.shown) * 0.08;
      bar.name.setText(f.stats.name.toUpperCase());
      bar.rim.setStrokeStyle(1, f.id === this.focusId ? 0xffd070 : 0x8a6a3a);
      if (bar.fill.setCrop && bar.fill.type === 'Image') {
        const tw = bar.fill.frame.width;
        bar.fill.setCrop(0, 0, tw * ratio, bar.fill.frame.height);
      } else {
        bar.fill.scaleX = ratio;
      }
      bar.trail.scaleX = bar.shown;
    }
  }

  // ------------------------------------------------------------ per frame

  update() {
    const p = this.arena.player;
    const P = this.arena.progress;
    if (P && this.levelText) {
      const id = this.arena.heroIds?.[p.seat] ?? this.arena.characterId;
      const pts = P.available(id);
      this.levelText.setText(`LV ${P.level}  ·  ${P.toNext} blood to next${pts > 0 ? `  ·  ${pts} SKILL POINT${pts > 1 ? 'S' : ''} — kneel at a shrine` : ''}`);
    }
    for (const set of this.barSets) {
      const q = set.p;
      const s = q.stats;
      this.setBar(set.bars.health, q.health / s.maxHealth);
      this.setBar(set.bars.stamina, q.stamina / s.maxStamina);
      this.setBar(set.bars.magic, s.maxMana ? q.mana / s.maxMana : 0);
      // low health: the health bar throbs
      const hb = set.bars.health;
      const low = q.alive && q.health / s.maxHealth < 0.3;
      const pulse = low ? 0.75 + 0.25 * Math.sin(this.time.now / 110) : 1;
      hb.fill.setAlpha(pulse);
      if (hb.frame) hb.frame.setTint(low ? Phaser.Display.Color.GetColor(255, Math.round(200 * pulse), Math.round(200 * pulse)) : 0xffffff);
    }
    // co-op: down but not out (my partner still stands), and waiting on the wire
    const arena = this.arena;
    const down = arena.players.length > 1 && !arena.allDead ? arena.players.find((q) => !q.alive && q.state === 'dead') : null;
    if (down) {
      const secs = Math.max(0, Math.ceil((360 - (down.downFor ?? 0)) / 60));
      this.downText.setText(down === p ? `DOWN  —  RISING IN ${secs}` : `PARTNER DOWN  —  ${secs}`);
      epicFill(this.downText, ['#ff7a5a', '#d0101a', '#5a0006']);
    } else if (this.downText.text) this.downText.setText('');
    const sess = arena.session;
    this.waitText.setText(!sess?.waiting ? '' : sess.stall > 240 ? 'Your partner is not responding  —  press R to carry on alone' : 'waiting for your partner…');

    this.updateEnemyStrip();
    this.updateBoss();
    this.updateDialogue();
    if (this.go.visible) this.go.setAlpha(0.55 + 0.45 * Math.sin(this.time.now * 0.008)).setX(SETTINGS.width - 24 + Math.sin(this.time.now * 0.008) * 6);

    const st = this.arena.stage;
    this.info.setText([
      st ? `${st.section?.name ?? ''}   KILLS ${st.stats.kills}` : `WAVE ${this.arena.wave}   KILLS ${this.arena.kills}`,
      st ? `SECRETS ${st.stats.secrets}/${st.secretsTotal}` : '',
      `GORE: ${SETTINGS.gore.names[SETTINGS.gore.level]}`,
      SETTINGS.debug ? 'DEBUG ON' : '',
    ].join('\n'));

    if (SETTINGS.debug) {
      this.debugText.setText([
        `state ${p.state} f${p.fsm.frame}  hitstop ${p.hitstop}`,
        `buffer: ${p.controller.bufferedList().join(' ') || '-'}`,
        `pos x${p.x.toFixed(0)} z${p.z.toFixed(0)} h${p.h.toFixed(0)}  fps ${this.game.loop.actualFps.toFixed(0)}`,
      ].join('\n'));
    } else {
      this.debugText.setText('');
    }

    if (this.arena.allDead && p.dead && !this.death) {
      this.death = new DeathScreen(this, this.arena);
      this.events.once('shutdown', () => { this.death?.destroy(); this.death = null; });
    }
    this.death?.update();
  }
}
