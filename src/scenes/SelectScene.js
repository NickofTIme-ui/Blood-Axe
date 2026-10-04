// SelectScene.js — Character select, in a ruined cathedral. The heroes stand on stone
// pedestals as black silhouettes; the one you highlight is lit by a shaft of light from
// above, fills with colour and steps forward, and the panel below shows his portrait,
// name and stats. Built from data/characters.js, so a new character shows up here.
//
// Art (loaded in BootScene): assets/ui/select-bg.jpg (the cathedral) and
// assets/ui/hero-<id>.png (each hero, painted on black, cut out at boot). Without them it
// falls back to a plain dark hall and the in-game sprite / a placeholder figure.
//
// ←/→ (or the mouse) choose, J / Enter / (A) / click confirm, M music, Esc title.

import { SETTINGS } from '../config/settings.js';
import { CHARACTERS } from '../data/characters.js';
import { delayFor } from '../net/Session.js';
import { InputManager } from '../core/InputManager.js';
import { playMusic, toggleMute } from '../core/Music.js';
import { playSfx } from '../core/Sfx.js';
import { FONT, epicFill } from '../view/fonts.js';

// Where the pedestal tops are in the background painting (share of the screen).
const PEDESTALS = [
  { x: 0.238, y: 0.572 },
  { x: 0.507, y: 0.572 },
  { x: 0.764, y: 0.572 },
];
// The pedestal's round top as painted (an ellipse, seen from a little above), relative
// to the point the hero's feet stand on: the pool of light is drawn exactly over it.
const DISC = { dx: 2, dy: 3, w: 190, h: 22 };
// How far below the middle of the disc each hero picture's lowest point sits (px): his
// nearer foot (or a sword tip) is the lowest thing in the art, his other foot is higher.
const STAND = { warrior: 8, mage: 6, rogue: 7 };
const HERO_H = 204;        // hero height on screen (logical px)
const STATS = [              // label, how full the bar is, colour
  ['POWER', (c) => c.meleeMult / 1.4, 0xd02020],
  ['SPEED', (c) => c.walkSpeed / 230, 0xe0a020],
  ['DEFENSE', (c) => c.maxHealth / 180, 0x3a7ae0],
  ['MAGIC', (c) => c.magicMult / 1.7, 0x9a4ae0],
];

export class SelectScene extends Phaser.Scene {
  constructor() {
    super('Select');
  }

  // data.mode: 'solo' | 'local' (two players here: they pick one after the other) |
  // 'net' (online: each picks on his own screen; data.net = { link, index })
  init(data) {
    this.mode = data?.mode ?? 'solo';
    this.stageId = data?.stage; // (THE GALLOWS ASCENT, or the Oath Road when unset)
    this.net = this.mode === 'net' ? data.net : null;
  }

  create() {
    this.picks = [];       // hero ids chosen so far, in player order
    this.locked = false;   // online: I've chosen, waiting for my partner
    this.partnerText = null;
    this.cameras.main.setOrigin(0, 0).setZoom(SETTINGS.renderScale ?? 1); // full resolution
    this.cameras.main.fadeIn(400, 0, 0, 0);
    const W = SETTINGS.width;
    const H = SETTINGS.height;
    this.controls = new InputManager(this, undefined, { menu: true }); // (the D-pad moves the cursor here)
    this.ids = Object.keys(CHARACTERS);
    this.index = -1;
    this.leaving = false;

    // the hall
    if (this.textures.exists('select-bg')) {
      const src = this.textures.get('select-bg').getSourceImage();
      this.add.image(W / 2, H / 2, 'select-bg').setScale(Math.max(W / src.width, H / src.height));
      this.add.rectangle(0, 0, W, H, 0x000000, 0.25).setOrigin(0);
    } else {
      this.add.rectangle(0, 0, W, H, 0x120808).setOrigin(0);
    }

    // title
    const title = this.add.text(W / 2, 38, 'BLOOD AXE', { fontFamily: FONT.display, fontSize: '54px' })
      .setOrigin(0.5).setStroke('#0a0000', 8);
    title.setLetterSpacing?.(5);
    epicFill(title, ['#ff7a5a', '#d0101a', '#6a0008', '#200002']);
    this.sub = this.add.text(W / 2, 76, '', { fontFamily: FONT.ui, fontSize: '16px' })
      .setOrigin(0.5).setStroke('#000000', 4);
    this.sub.setLetterSpacing?.(8);
    this.setSub(this.mode === 'local' ? 'PLAYER 1  —  CHOOSE YOUR CHAMPION' : 'CHOOSE YOUR CHAMPION');
    if (this.net) this.setupNet();

    // the shaft of light (moves to whoever's chosen)
    this.beam = this.add.image(0, 0, this.beamTex()).setOrigin(0.5, 0).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0);
    this.pool = this.add.image(0, 0, this.softTex()).setTint(0xffd890).setAlpha(0).setBlendMode(Phaser.BlendModes.ADD);
    this.motes = [];
    this.moteG = this.add.graphics().setBlendMode(Phaser.BlendModes.ADD);

    this.heroes = this.ids.map((id, i) => this.makeHero(CHARACTERS[id], id, i));
    this.makePanel(W / 2, H - 70);

    this.add.text(W / 2, H - 6, '←/→  choose      J / Enter / (A)  fight      Esc  back      M  music', {
      fontFamily: FONT.ui, fontSize: '12px', color: '#b8a890',
    }).setOrigin(0.5, 1).setStroke('#000000', 3).setLetterSpacing?.(1);

    this.select(this.registry.get('lastCharacterIndex') ?? 0, true);
    playMusic(this, 'title');
  }

  // ------------------------------------------------------------ heroes

  heroTexture(c, id) {
    if (this.textures.exists(`hero-${id}`)) return { key: `hero-${id}`, frame: undefined, scale: HERO_H / this.textures.get(`hero-${id}`).getSourceImage().height };
    const meta = c.sprite && this.cache.json.get(`${c.sprite}-data`);
    if (meta && this.textures.exists(c.sprite)) return { key: c.sprite, frame: 'f0', scale: (meta.portraitScale ?? 1.9) * 0.9, origin: [meta.anchorX / meta.frameWidth, meta.anchorY / meta.frameHeight] };
    // no art at all: a plain figure block in his colours
    const key = `hero-block-${id}`;
    if (!this.textures.exists(key)) {
      const g = this.make.graphics({ add: false });
      g.fillStyle(c.look.color, 1).fillRoundedRect(10, 40, 60, 110, 10);
      g.fillStyle(c.look.skin, 1).fillCircle(40, 24, 20);
      g.generateTexture(key, 80, 150);
      g.destroy();
    }
    return { key, frame: undefined, scale: HERO_H / 150 };
  }

  makeHero(c, id, i) {
    const W = SETTINGS.width;
    const H = SETTINGS.height;
    const ped = PEDESTALS[i] ?? { x: (i + 1) / (this.ids.length + 1), y: 0.62 };
    const x = ped.x * W;
    const y = ped.y * H;
    const t = this.heroTexture(c, id);
    const [ox, oy] = t.origin ?? [0.5, 1];
    // faint warm rim so the silhouette reads against the dark hall
    const rim = this.add.image(x, y, t.key, t.frame).setOrigin(ox, oy).setScale(t.scale * 1.025)
      .setTintFill(0x5a1810).setAlpha(0.55);
    const shadow = this.add.image(x, y, t.key, t.frame).setOrigin(ox, oy).setScale(t.scale).setTintFill(0x070304);
    const color = this.add.image(x, y, t.key, t.frame).setOrigin(ox, oy).setScale(t.scale).setAlpha(0);
    const parts = [rim, shadow, color];
    // what plants him on the stone: a soft, dark contact shadow under his feet (deepest
    // right at the boots), sitting on the pedestal top — without it a lit figure on a
    // lit disc reads as hovering
    // (soft-edged, lying flat on the disc, and never wider than the disc itself)
    const w = Math.min(rim.displayWidth * 0.8, DISC.w * 0.86);
    const ground = [this.add.image(x + DISC.dx, y + DISC.dy, this.softTex()).setDisplaySize(w, DISC.h * 0.95).setTint(0x000000).setAlpha(0.45).setDepth(1.4)];
    // the heroes are painted in perspective — one foot nearer us and lower than the
    // other — so the picture sits with its feet either side of the middle of the disc
    const stand = STAND[id] ?? 4;
    for (const p of parts) p.y += stand;
    // hover / click
    shadow.setInteractive({ useHandCursor: true, pixelPerfect: false });
    shadow.on('pointerover', () => this.select(i));
    shadow.on('pointerdown', () => { if (this.index === i) this.confirm(); else this.select(i); });
    return { id, c, x, y, footY: y + stand, scale: t.scale, parts, color, shadow, rim, ground, lit: 0 };
  }

  select(i, instant = false) {
    i = (i + this.ids.length) % this.ids.length;
    if (i === this.index) return;
    this.index = i;
    if (!instant) playSfx(this, 'swingAlt', { volume: 0.3, pitch: -700 });
    this.heroes.forEach((h, k) => {
      const on = k === i;
      this.tweens.killTweensOf(h.parts);
      this.tweens.killTweensOf(h.color);
      // chosen: steps up to the front of his pedestal — a touch bigger, growing from the
      // feet, which stay planted on the stone (only a few px forward, never off the top
      // of the disc) — and fills with colour
      this.tweens.add({
        targets: h.parts, y: h.footY, scale: (p) => (p === h.rim ? 1.025 : 1) * h.scale * (on ? 1.04 : 1),
        duration: instant ? 0 : on ? 320 : 260, ease: on ? 'Cubic.easeOut' : 'Sine.easeOut',
      });
      // his shadow goes with him, and is hard and dark under the spotlight
      this.tweens.killTweensOf(h.ground);
      for (const gnd of h.ground) {
        gnd.setDepth(on ? 4.5 : 1.4);
        this.tweens.add({ targets: gnd, alpha: on ? 0.7 : 0.45, duration: instant ? 0 : 300 });
      }
      this.tweens.add({ targets: h.color, alpha: on ? 1 : 0, duration: instant ? 0 : on ? 420 : 220 });
      this.tweens.add({ targets: h.rim, alpha: on ? 0 : 0.55, duration: instant ? 0 : 300 });
      for (const p of h.parts) p.setDepth(on ? 5 : 2);
    });
    // the light swings over
    const h = this.heroes[i];
    this.beam.setPosition(h.x, -20).setDepth(4);
    this.beam.setDisplaySize(200, h.y + 32); // (the cone lands on the pedestal top)
    this.tweens.killTweensOf([this.beam, this.pool]);
    this.beam.setAlpha(0);
    this.tweens.add({ targets: this.beam, alpha: 1, duration: instant ? 0 : 320, ease: 'Sine.easeOut' });
    // the pool of light lies ON the pedestal top (centred on it, no wider than the
    // disc), dim enough that his shadow still shows on the stone
    this.pool.setPosition(h.x + DISC.dx, h.y + DISC.dy).setDisplaySize(DISC.w, DISC.h).setDepth(3).setAlpha(0);
    this.tweens.add({ targets: this.pool, alpha: 0.5, duration: instant ? 0 : 400 });
    this.fillPanel(h);
  }

  setSub(text) {
    this.sub.setText(text);
    epicFill(this.sub, ['#fff2c8', '#d9b060', '#7a4a10']);
  }

  confirm() {
    if (this.leaving || this.locked) return;
    const h = this.heroes[this.index];
    playSfx(this, 'finisher', { volume: 0.7, pitch: -300 });
    this.cameras.main.flash(180, 255, 230, 200);
    this.tweens.add({ targets: h.parts, scale: (p) => (p === h.rim ? 1.025 : 1) * h.scale * 1.16, duration: 260, ease: 'Back.easeOut', yoyo: this.mode !== 'solo' });
    if (this.mode === 'local') {
      // two players here: one picks, then the other
      this.picks.push(h.id);
      if (this.picks.length < 2) { this.setSub('PLAYER 2  —  CHOOSE YOUR CHAMPION'); return; }
      return this.begin({ players: this.picks, mode: 'local' });
    }
    if (this.net) {
      // online: tell my partner; the host starts the game once both have chosen
      this.locked = true;
      this.picks[this.net.index] = h.id;
      this.net.link.send({ k: 'pick', id: h.id });
      this.setSub('WAITING FOR YOUR PARTNER…');
      this.tryStartNet();
      return;
    }
    this.registry.set('lastCharacterIndex', this.index);
    this.begin({ characterId: h.id });
  }

  begin(data) {
    if (this.leaving) return;
    this.leaving = true;
    this.time.delayedCall(320, () => this.cameras.main.fadeOut(420, 0, 0, 0));
    this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('Arena', { ...data, stage: this.stageId }));
  }

  // ---- online: the two select screens talk over the link (net/Link.js)
  setupNet() {
    const { link, index } = this.net;
    // measure the round trip while they choose (the host sets the input delay from it)
    this.rtts = [];
    this.pinger = this.time.addEvent({ delay: 300, loop: true, callback: () => link.send({ k: 'ping', t: performance.now() }) });
    this.setSub(index === 0 ? 'CONNECTED  —  CHOOSE YOUR CHAMPION' : 'JOINED  —  CHOOSE YOUR CHAMPION');
    link.onData((m) => {
      if (!this.sys.isActive()) return;
      if (m.k === 'ping') { link.send({ k: 'pong', t: m.t }); return; }
      if (m.k === 'pong') { this.rtts.push(performance.now() - m.t); if (this.rtts.length > 12) this.rtts.shift(); return; }
      if (m.k === 'pick') {
        this.picks[1 - index] = m.id;
        this.callPartner(m.id);
        this.tryStartNet();
      } else if (m.k === 'start') this.startNet(m);
    });
    link.onClose(() => {
      if (!this.sys.isActive() || this.leaving) return;
      this.leaving = true;
      this.setSub('YOUR PARTNER LEFT');
      this.time.delayedCall(1400, () => this.scene.start('Title'));
    });
  }

  callPartner(id) {
    const name = CHARACTERS[id]?.name ?? id;
    this.partnerText = this.partnerText ?? this.add.text(SETTINGS.width / 2, 98, '', { fontFamily: FONT.ui, fontSize: '13px', color: '#9fd0ff' }).setOrigin(0.5).setStroke('#000000', 3);
    this.partnerText.setText(`YOUR PARTNER FIGHTS AS ${name.toUpperCase()}`);
  }

  // Host: both have picked — choose the dice and say go.
  tryStartNet() {
    if (this.net.index !== 0 || !this.picks[0] || !this.picks[1] || this.leaving) return;
    // the slowest recent round trip sets the delay (a press must arrive before it's due)
    const rtt = this.rtts.length ? Math.max(...this.rtts.slice(-8)) : null;
    const msg = { k: 'start', seed: Math.floor(Math.random() * 0xffffffff), players: [this.picks[0], this.picks[1]], game: Math.floor(Math.random() * 1e9), delay: delayFor(rtt) };
    this.net.link.send(msg);
    this.startNet(msg);
  }

  startNet(m) {
    if (this.leaving) return;
    // (from here until the arena is up nobody is listening: the link keeps what arrives)
    this.net.link.onData(null);
    this.pinger?.remove();
    this.setSub('TO BATTLE');
    this.begin({ players: m.players, mode: 'net', seed: m.seed, net: { ...this.net, game: m.game, delay: m.delay } });
  }

  // ------------------------------------------------------------ the info panel

  makePanel(cx, cy) {
    const w = 560;
    const h = 120;
    const x0 = cx - w / 2;
    const y0 = cy - h / 2;
    const g = this.add.graphics().setDepth(8);
    g.fillStyle(0x000000, 0.55).fillRect(x0 + 4, y0 + 6, w, h);          // drop shadow
    g.fillStyle(0x120808, 0.94).fillRect(x0, y0, w, h);
    g.fillStyle(0x2a1210, 0.6).fillRect(x0 + 4, y0 + 4, w - 8, h * 0.45);
    g.lineStyle(3, 0x8a6430, 1).strokeRect(x0, y0, w, h);
    g.lineStyle(1, 0xd8b060, 0.8).strokeRect(x0 + 5, y0 + 5, w - 10, h - 10);
    for (const [px, py] of [[x0, y0], [x0 + w, y0], [x0, y0 + h], [x0 + w, y0 + h]]) {
      g.fillStyle(0x8a6430, 1).fillCircle(px, py, 7);
      g.fillStyle(0xc0161c, 1).fillCircle(px, py, 3.5);
    }
    // portrait window (left)
    const pw = 110;
    const pX = x0 + 10;
    const pY = y0 + 10;
    g.fillStyle(0x050202, 1).fillRect(pX, pY, pw, h - 20);
    g.lineStyle(2, 0x8a6430, 1).strokeRect(pX, pY, pw, h - 20);
    const maskG = this.make.graphics({ add: false }).fillRect(pX + 1, pY + 1, pw - 2, h - 22);
    this.portrait = this.add.image(pX + pw / 2, pY + h - 20, '__WHITE').setOrigin(0.5, 0.92).setDepth(9)
      .setMask(maskG.createGeometryMask());
    this.portraitGlow = this.add.ellipse(pX + pw / 2, pY + 30, 120, 90, 0xffc070, 0.18).setDepth(8.5).setBlendMode(Phaser.BlendModes.ADD);

    const tx = pX + pw + 18;
    this.pName = this.add.text(tx, y0 + 8, '', { fontFamily: FONT.display, fontSize: '28px' }).setDepth(9).setStroke('#000000', 5);
    this.pDesc = this.add.text(tx, y0 + 42, '', {
      fontFamily: FONT.body, fontSize: '14px', color: '#cdb898', fontStyle: '600', wordWrap: { width: 200 },
    }).setDepth(9);
    this.pSpell = this.add.text(tx, y0 + h - 24, '', { fontFamily: FONT.ui, fontSize: '12px', color: '#8fb0e8' }).setDepth(9).setStroke('#000000', 3);

    // stat bars (segmented, like the cover's HUD)
    const bx = x0 + w - 218;
    this.bars = STATS.map(([label, , color], k) => {
      const by = y0 + 16 + k * 25;
      this.add.text(bx, by, label, { fontFamily: FONT.ui, fontSize: '13px', color: '#e8d4b0' }).setDepth(9).setStroke('#000000', 3);
      const segs = [];
      for (let s = 0; s < 10; s++) {
        const sx = bx + 84 + s * 12;
        this.add.rectangle(sx, by + 3, 10, 11, 0x000000).setOrigin(0).setStrokeStyle(1, 0x4a3420).setDepth(9);
        segs.push(this.add.rectangle(sx + 1, by + 4, 8, 9, color).setOrigin(0).setDepth(9.5).setAlpha(0));
      }
      return { segs, color };
    });
  }

  fillPanel(h) {
    const c = h.c;
    this.pName.setText(c.name.toUpperCase());
    epicFill(this.pName, ['#fff2c8', '#e0b060', '#7a4a10']);
    this.pDesc.setText(c.description);
    this.pSpell.setText(`SPELL: ${(c.spell?.name ?? '—').toUpperCase()}`);
    const t = this.heroTexture(c, h.id);
    const src = this.textures.get(t.key).getSourceImage();
    this.portrait.setTexture(t.key, t.frame);
    // head and shoulders: scale so the figure is ~2.2x the window's height
    const ps = (100 * 2.2) / (t.frame ? this.textures.getFrame(t.key, t.frame).height : src.height);
    this.portrait.setScale(ps).setOrigin(0.5, t.frame ? 0.55 : 0.36).setAlpha(0);
    this.tweens.add({ targets: this.portrait, alpha: 1, duration: 250 });
    // bars fill segment by segment
    STATS.forEach(([, fn], k) => {
      const n = Math.max(1, Math.min(10, Math.round(fn(c) * 10)));
      this.bars[k].segs.forEach((s, i) => {
        this.tweens.killTweensOf(s);
        s.setAlpha(0);
        if (i < n) this.tweens.add({ targets: s, alpha: 1, delay: 60 + i * 28, duration: 90 });
      });
    });
  }

  // ------------------------------------------------------------ textures

  // a soft round blob (white, fading to nothing at the rim): squashed flat it's a pool
  // of light or a contact shadow lying on the pedestal top
  softTex() {
    const key = 'selectSoft';
    if (this.textures.exists(key)) return key;
    const cv = document.createElement('canvas');
    cv.width = 128; cv.height = 128;
    const c = cv.getContext('2d');
    const g = c.createRadialGradient(64, 64, 0, 64, 64, 64);
    g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.55, 'rgba(255,255,255,0.75)');
    g.addColorStop(0.85, 'rgba(255,255,255,0.25)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = g; c.fillRect(0, 0, 128, 128);
    this.textures.addCanvas(key, cv);
    return key;
  }

  beamTex() {
    const key = 'selectBeam';
    if (this.textures.exists(key)) return key;
    const cv = document.createElement('canvas');
    cv.width = 128; cv.height = 256;
    const c = cv.getContext('2d');
    // a cone: narrow at the top, wide at the floor, warm and dusty, soft edges
    for (let y = 0; y < 256; y++) {
      const t = y / 255;
      const half = 12 + t * 52;
      const g = c.createLinearGradient(64 - half, 0, 64 + half, 0);
      const a = 0.3 + 0.45 * t;
      g.addColorStop(0, 'rgba(255,220,150,0)');
      g.addColorStop(0.3, `rgba(255,226,170,${a * 0.7})`);
      g.addColorStop(0.5, `rgba(255,240,200,${a})`);
      g.addColorStop(0.7, `rgba(255,226,170,${a * 0.7})`);
      g.addColorStop(1, 'rgba(255,220,150,0)');
      c.fillStyle = g;
      c.fillRect(64 - half, y, half * 2, 1);
    }
    this.textures.addCanvas(key, cv);
    return key;
  }

  // ------------------------------------------------------------ per frame

  update() {
    const c = this.controls;
    c.tick(false);
    if (c.consume('mute')) toggleMute();
    if (this.leaving) return;
    if (c.consume('left')) this.select(this.index - 1);
    if (c.consume('right')) this.select(this.index + 1);
    if (c.consume('confirm') || c.consume('attack')) this.confirm();
    if (c.consume('menu')) {
      this.leaving = true;
      this.net?.link.close(); // (leaving an online lobby hangs up)
      this.cameras.main.fadeOut(300, 0, 0, 0);
      this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('Title'));
    }

    // dust drifting in the light
    const h = this.heroes[this.index];
    if (h && this.motes.length < 40 && Math.random() < 0.5) {
      this.motes.push({ x: h.x + (Math.random() - 0.5) * 120, y: Math.random() * h.y, vy: 0.08 + Math.random() * 0.2, ph: Math.random() * 6.28, t: 0, s: 0.6 + Math.random() * 1.2, hx: h.x });
    }
    const g = this.moteG.clear().setDepth(6);
    for (const m of this.motes) {
      m.t++;
      m.y += m.vy;
      m.x += Math.sin(m.ph + m.t * 0.03) * 0.15;
      const inBeam = h && Math.abs(m.hx - h.x) < 1;
      const a = Math.min(1, m.t / 40) * (inBeam ? 1 : Math.max(0, 1 - (m.fade = (m.fade ?? 0) + 0.05)));
      g.fillStyle(0xffe8c0, 0.7 * a).fillRect(m.x, m.y, m.s, m.s);
    }
    this.motes = this.motes.filter((m) => m.t < 400 && (m.fade ?? 0) < 1 && m.y < (h?.y ?? 400) + 10);
  }
}
