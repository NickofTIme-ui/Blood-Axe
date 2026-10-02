// TitleScene.js — First thing on launch: the cover art (assets/ui/cover.jpg) with the
// title music, then a SELECT CHARACTER button that leads to the character select.
//
// The painting is 4:3 and the screen 16:9, so it's shown whole in the middle, over a
// blurred, darkened copy of itself that fills the sides. It fades up from black with a
// slow push-in and embers drifting up; the button fades in a moment later.
// Enter / J / Space / (A) or a click on the button continue. M toggles the music.

import { SETTINGS } from '../config/settings.js';
import { InputManager } from '../core/InputManager.js';
import { playMusic, toggleMute } from '../core/Music.js';
import { playSfx } from '../core/Sfx.js';
import { FONT, epicFill, steelFill } from '../view/fonts.js';
import { hostRoom, joinRoom, newCode } from '../net/Link.js';

export class TitleScene extends Phaser.Scene {
  constructor() {
    super('Title');
  }

  create() {
    this.cameras.main.setOrigin(0, 0).setZoom(SETTINGS.renderScale ?? 1); // full resolution
    const W = SETTINGS.width;
    const H = SETTINGS.height;
    this.controls = new InputManager(this);
    this.leaving = false;
    this.add.rectangle(0, 0, W, H, 0x000000).setOrigin(0);

    if (this.textures.exists('cover')) {
      const src = this.textures.get('cover').getSourceImage();
      // the sides: the same painting, filling the screen, blurred and pushed back
      const back = this.add.image(W / 2, H / 2, 'cover').setScale(W / src.width).setAlpha(0).setTint(0x6a4a4a);
      back.preFX?.addBlur(1, 2, 2, 1.6, 0xffffff, 4);
      this.tweens.add({ targets: back, alpha: 0.55, duration: 1600 });
      // the painting itself, whole, slowly pushing in
      const k = H / src.height;
      this.cover = this.add.image(W / 2, H / 2, 'cover').setScale(k * 1.0).setAlpha(0);
      this.tweens.add({ targets: this.cover, alpha: 1, duration: 1400, ease: 'Sine.easeIn' });
      this.tweens.add({ targets: this.cover, scale: k * 1.045, duration: 22000, ease: 'Sine.easeOut' });
      // soften the painting's left/right edges into the blurred sides
      const edgeW = 70;
      const coverW = src.width * k;
      const edges = this.add.graphics();
      for (let i = 0; i < edgeW; i += 2) {
        const a = 0.75 * (1 - i / edgeW) ** 1.6;
        edges.fillStyle(0x000000, a);
        edges.fillRect(W / 2 - coverW / 2 + i, 0, 2, H);
        edges.fillRect(W / 2 + coverW / 2 - i - 2, 0, 2, H);
      }
    } else {
      // no cover art (it failed to load): the name on black, so the game still starts
      const t = this.add.text(W / 2, H * 0.4, 'BLOOD AXE', { fontFamily: FONT.title, fontSize: '84px' })
        .setOrigin(0.5).setStroke('#0a0000', 9);
      steelFill(t, 9);
    }

    // embers drifting up through it
    this.embers = [];
    this.emberG = this.add.graphics().setBlendMode(Phaser.BlendModes.ADD);

    // a dark band behind the button so it reads over the painting
    const band = this.add.graphics().setAlpha(0);
    for (let i = 0; i < 90; i += 2) band.fillStyle(0x000000, 0.7 * (i / 90)).fillRect(0, H - 90 + i, W, 2);
    this.tweens.add({ targets: band, alpha: 1, delay: 900, duration: 900 });

    this.lobby = null;
    this.makeButtons(H - 44);
    this.events.once('shutdown', () => { if (this.lobby) { this.lobby.job?.cancel(); this.input.keyboard.off('keydown', this.lobby.onKey); this.lobby = null; } });

    // browsers keep sound off until the first key or click: say so until it's on
    this.soundHint = this.add.text(W - 10, H - 8, 'press any key or click for sound', {
      fontFamily: FONT.ui, fontSize: '11px', color: '#b8a890',
    }).setOrigin(1, 1).setAlpha(0).setStroke('#000000', 3);
    if (this.sound.locked) this.tweens.add({ targets: this.soundHint, alpha: 0.75, delay: 2200, duration: 800 });

    playMusic(this, 'title');
  }

  // One menu button. Returns { c, glow, plate, label }.
  makeButton(x, y, text, w, onClick, delay = 1500) {
    const h = 46;
    const c = this.add.container(x, y).setAlpha(0).setSize(w, h);
    const glow = this.add.rectangle(0, 0, w + 14, h + 14, 0xc0161c, 0.35).setBlendMode(Phaser.BlendModes.ADD);
    const plate = this.add.rectangle(0, 0, w, h, 0x160606, 0.92).setStrokeStyle(2, 0xb08a4a);
    const inner = this.add.rectangle(0, 0, w - 8, h - 8).setStrokeStyle(1, 0x5a3a20);
    const label = this.add.text(0, 1, text, {
      fontFamily: FONT.display, fontSize: '22px', align: 'center',
    }).setOrigin(0.5).setStroke('#0a0000', 5);
    label.setLetterSpacing?.(2);
    epicFill(label, ['#fff2c8', '#e0b060', '#7a4a10']);
    c.add([glow, plate, inner, label]);
    const btn = { c, glow, plate, label };
    this.tweens.add({ targets: c, alpha: 1, delay, duration: 700, ease: 'Sine.easeOut' });
    this.tweens.add({ targets: glow, alpha: { from: 0.15, to: 0.55 }, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

    // (a sized container's hit area is measured from its top-left corner)
    c.setInteractive({ hitArea: new Phaser.Geom.Rectangle(0, 0, w, h), hitAreaCallback: Phaser.Geom.Rectangle.Contains, useHandCursor: true });
    c.on('pointerover', () => { plate.setStrokeStyle(2, 0xffd070); this.tweens.add({ targets: c, scale: 1.05, duration: 120 }); });
    c.on('pointerout', () => { plate.setStrokeStyle(2, 0xb08a4a); this.tweens.add({ targets: c, scale: 1, duration: 120 }); });
    c.on('pointerdown', () => { if (c.alpha > 0.5 && !this.lobby) onClick(); });
    return btn;
  }

  // The three ways to play.
  makeButtons(y) {
    const W = SETTINGS.width;
    this.button = this.makeButton(W / 2 - 250, y, '1 PLAYER', 220, () => this.go('solo'));
    this.makeButton(W / 2, y, '2 PLAYERS', 220, () => this.go('local'), 1650);
    this.makeButton(W / 2 + 250, y, 'ONLINE CO-OP', 240, () => this.openLobby(), 1800);
  }

  go(mode = 'solo', net = null) {
    // (not before the buttons are shown — except when a friend has just connected)
    if (this.leaving || (mode !== 'net' && this.button.c.alpha < 0.5)) return;
    this.leaving = true;
    playSfx(this, 'swingAlt', { volume: 0.5, pitch: -300 });
    this.cameras.main.fadeOut(450, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('Select', { mode, net }));
  }

  // ------------------------------------------------------------ online lobby
  // HOST shows a 4-letter room code to read out to your friend; JOIN is where they type
  // it. Once the two browsers are connected (net/Link.js) both go on to pick a hero.

  openLobby() {
    if (this.leaving || this.lobby) return;
    const W = SETTINGS.width;
    const H = SETTINGS.height;
    const L = this.lobby = { state: 'menu', code: '', job: null };
    L.dim = this.add.rectangle(0, 0, W, H, 0x050000, 0.82).setOrigin(0).setDepth(100).setInteractive();
    L.title = this.add.text(W / 2, H * 0.2, 'ONLINE CO-OP', { fontFamily: FONT.title, fontSize: '46px' }).setOrigin(0.5).setStroke('#0a0000', 7).setDepth(101);
    steelFill(L.title, 7);
    L.body = this.add.text(W / 2, H * 0.47, '', { fontFamily: FONT.ui, fontSize: '20px', color: '#f0e0c0', align: 'center', lineSpacing: 12 }).setOrigin(0.5).setStroke('#000000', 4).setDepth(101);
    L.big = this.add.text(W / 2, H * 0.47, '', { fontFamily: FONT.display, fontSize: '72px' }).setOrigin(0.5).setStroke('#0a0000', 8).setDepth(101);
    L.note = this.add.text(W / 2, H * 0.78, '', { fontFamily: FONT.body, fontSize: '16px', color: '#cdb391', align: 'center', lineSpacing: 6 }).setOrigin(0.5).setStroke('#000000', 3).setDepth(101);
    L.host = this.lobbyButton(W / 2 - 150, H * 0.47, 'HOST A GAME', () => this.lobbyHost());
    L.join = this.lobbyButton(W / 2 + 150, H * 0.47, 'JOIN A GAME', () => this.lobbyJoin());
    L.onKey = (e) => this.lobbyKey(e);
    this.input.keyboard.on('keydown', L.onKey);
    this.lobbyShow('menu');
  }

  lobbyButton(x, y, text, onClick) {
    const t = this.add.text(x, y, text, { fontFamily: FONT.display, fontSize: '24px', backgroundColor: '#1a0808', padding: { x: 16, y: 10 } })
      .setOrigin(0.5).setStroke('#0a0000', 4).setDepth(102).setInteractive({ useHandCursor: true });
    epicFill(t, ['#fff2c8', '#e0b060', '#7a4a10']);
    t.on('pointerdown', onClick);
    return t;
  }

  lobbyShow(state, text = '') {
    const L = this.lobby;
    L.state = state;
    const menu = state === 'menu';
    L.host.setVisible(menu); L.join.setVisible(menu);
    L.big.setText(''); L.body.setText('');
    if (menu) L.note.setText('One of you hosts and reads out the room code; the other joins with it.\nH  host      J  join      Esc  back');
    else if (state === 'opening') { L.body.setText('Opening a room…'); L.note.setText('Esc  cancel'); }
    else if (state === 'hosting') {
      L.big.setText(L.code); epicFill(L.big, ['#fff6c8', '#f0c050', '#a06010']);
      L.note.setText('ROOM CODE — tell your friend, then wait here.\nThey choose ONLINE CO-OP → JOIN A GAME and type it in.\nEsc  cancel');
    } else if (state === 'typing') {
      L.big.setText((L.code + '____').slice(0, 4).split('').join(' ')); epicFill(L.big, ['#fff6c8', '#f0c050', '#a06010']);
      L.note.setText('Type the 4-letter room code your friend gave you.\nBackspace  correct      Esc  back');
    } else if (state === 'joining') { L.body.setText(`Joining ${L.code}…`); L.note.setText('Esc  cancel'); }
    else if (state === 'error') { L.body.setText(text); L.note.setText('Enter / Esc  back'); }
  }

  lobbyHost() {
    const L = this.lobby;
    L.code = newCode();
    this.lobbyShow('opening');
    L.job = hostRoom(L.code, () => { if (this.lobby === L && L.state === 'opening') this.lobbyShow('hosting'); });
    L.job.link.then((link) => this.lobbyConnected(L, link, 0), (err) => this.lobbyFailed(L, err));
  }

  lobbyJoin() {
    this.lobby.code = '';
    this.lobbyShow('typing');
  }

  lobbyConnected(L, link, index) {
    if (this.lobby !== L) { link.close(); return; } // (cancelled meanwhile)
    L.job = null;
    playSfx(this, 'finisher', { volume: 0.6, pitch: -200 });
    this.closeLobby();
    this.go('net', { link, index });
  }

  lobbyFailed(L, err) {
    if (this.lobby !== L || err.message === 'cancelled') return;
    L.job = null;
    this.lobbyShow('error', err.message);
  }

  lobbyKey(e) {
    const L = this.lobby;
    if (!L) return;
    const k = e.key;
    if (k === 'Escape') {
      L.job?.cancel(); L.job = null;
      if (L.state === 'menu') this.closeLobby(); else this.lobbyShow('menu');
      return;
    }
    if (L.state === 'menu') {
      if (k === 'h' || k === 'H') this.lobbyHost();
      else if (k === 'j' || k === 'J') this.lobbyJoin();
    } else if (L.state === 'typing') {
      if (k === 'Backspace') L.code = L.code.slice(0, -1);
      else if (/^[a-zA-Z]$/.test(k) && L.code.length < 4) L.code += k.toUpperCase();
      this.lobbyShow('typing');
      if (L.code.length === 4) {
        this.lobbyShow('joining');
        L.job = joinRoom(L.code);
        L.job.link.then((link) => this.lobbyConnected(L, link, 1), (err) => this.lobbyFailed(L, err));
      }
    } else if (L.state === 'error' && k === 'Enter') this.lobbyShow('menu');
  }

  closeLobby() {
    const L = this.lobby;
    if (!L) return;
    this.input.keyboard.off('keydown', L.onKey);
    for (const o of [L.dim, L.title, L.body, L.big, L.note, L.host, L.join]) o.destroy();
    this.lobby = null;
    this.lobbyClosedAt = this.time.now;
  }

  update() {
    const c = this.controls;
    c.tick(false);
    if (c.consume('mute')) toggleMute();
    // (while the online menu is up the keys belong to it — J is "join" there)
    if (this.lobby || this.time.now - (this.lobbyClosedAt ?? -999) < 300) { c.consume('confirm'); c.consume('attack'); }
    else if (c.consume('confirm') || c.consume('attack')) this.go('solo');
    if (!this.sound.locked && this.soundHint.alpha > 0) this.soundHint.setAlpha(Math.max(0, this.soundHint.alpha - 0.05));

    // embers: slow, flickering, drifting
    const W = SETTINGS.width;
    const H = SETTINGS.height;
    if (this.embers.length < 45 && Math.random() < 0.35) {
      this.embers.push({ x: Math.random() * W, y: H + 4, vy: 0.3 + Math.random() * 0.7, vx: (Math.random() - 0.5) * 0.3, s: 1 + Math.random() * 1.8, ph: Math.random() * 6.28, t: 0 });
    }
    const g = this.emberG.clear();
    for (const e of this.embers) {
      e.t++;
      e.y -= e.vy;
      e.x += e.vx + Math.sin(e.ph + e.t * 0.04) * 0.3;
      const a = Math.min(1, e.t / 30) * Math.min(1, e.y / (H * 0.5)) * (0.55 + 0.45 * Math.sin(e.t * 0.25 + e.ph));
      g.fillStyle(e.s > 2.2 ? 0xffb050 : 0xff6a20, Math.max(0, a) * 0.9).fillRect(e.x, e.y, e.s, e.s);
    }
    this.embers = this.embers.filter((e) => e.y > -6);
  }
}
