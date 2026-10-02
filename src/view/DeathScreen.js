// DeathScreen.js — "YOU DIED", shot like the end of a film.
//
//   0.0s  the world drops into slow motion; letterbox bars slide in, the picture darkens
//         and a blood-red vignette closes in; a deep boom
//   0.5s  the title fades up — carved capitals, glossy blood fill — and slowly pushes in
//   1.0s  blood starts running from the bottoms of the letters: runs that swell into
//         heavy drops, which let go and fall; an anamorphic light streak crosses it
//   2.6s  the prompt fades in; ash keeps drifting up through it all
//
// Lives in the HUD scene (so the arena camera never moves it). The title is painted on a
// canvas at full render resolution and repainted every frame as the blood runs.

import { SETTINGS } from '../config/settings.js';
import { FONT } from './fonts.js';
import { playSfx } from '../core/Sfx.js';

const TITLE = 'YOU  DIED'; // (two spaces: the letter spacing swallows one)
const rand = (a, b) => a + Math.random() * (b - a);

export class DeathScreen {
  constructor(hud, arena) {
    this.hud = hud;
    this.arena = arena;
    this.t0 = hud.time.now;
    const RS = this.RS = SETTINGS.renderScale ?? 1;
    const W = SETTINGS.width;
    const H = SETTINGS.height;
    const D = 900; // depth: above the rest of the HUD

    // the world goes slow and the camera leans in on the body
    arena.slowmo?.(0.3, 1900);
    arena.cameras.main.zoomTo(arena.baseZoom * 1.08, 2600, 'Sine.easeInOut', true);
    playSfx(arena, 'kick', { volume: 1, pitch: -1500, minGapMs: 0 });
    hud.time.delayedCall(520, () => playSfx(arena, 'finisher', { volume: 0.7, pitch: -1100, minGapMs: 0 }));

    // darken + blood vignette + letterbox
    this.dim = hud.add.rectangle(0, 0, W, H, 0x000000).setOrigin(0).setAlpha(0).setDepth(D);
    hud.tweens.add({ targets: this.dim, alpha: 0.55, duration: 1600, ease: 'Sine.easeOut' });
    this.vig = hud.add.image(W / 2, H / 2, this.vignetteTex(W, H)).setDisplaySize(W, H).setAlpha(0).setDepth(D + 1);
    hud.tweens.add({ targets: this.vig, alpha: 1, duration: 2200, ease: 'Sine.easeOut' });
    const barH = Math.round(H * 0.12);
    this.barTop = hud.add.rectangle(0, 0, W, barH, 0x000000).setOrigin(0, 1).setDepth(D + 5);
    this.barBot = hud.add.rectangle(0, H, W, barH, 0x000000).setOrigin(0, 0).setDepth(D + 5);
    hud.tweens.add({ targets: this.barTop, y: barH, duration: 900, ease: 'Cubic.easeOut' });
    hud.tweens.add({ targets: this.barBot, y: H - barH, duration: 900, ease: 'Cubic.easeOut' });

    // the title
    this.buildTitle(W);
    this.title = hud.add.image(W / 2, H * 0.43, this.titleKey).setOrigin(0.5, this.textMid / this.canvas.height)
      .setScale(0.95 / RS).setAlpha(0).setDepth(D + 3);
    hud.tweens.add({ targets: this.title, alpha: 1, delay: 450, duration: 1500, ease: 'Sine.easeIn' });
    hud.tweens.add({ targets: this.title, scale: 1.05 / RS, delay: 300, duration: 7000, ease: 'Sine.easeOut' });

    // anamorphic streak across the letters
    this.flare = hud.add.image(W / 2, H * 0.43, this.flareTex()).setDisplaySize(W * 0.2, 6).setAlpha(0)
      .setBlendMode(Phaser.BlendModes.ADD).setDepth(D + 4);
    hud.tweens.add({ targets: this.flare, alpha: { from: 0, to: 0.85 }, displayWidth: W * 1.3, delay: 1050, duration: 700, ease: 'Sine.easeOut', yoyo: true, hold: 150 });

    // prompt
    this.prompt = hud.add.text(W / 2, H * 0.74, 'R  /  START   —   RISE AGAIN\nESC   —   CHOOSE ANOTHER', {
      fontFamily: FONT.ui, fontSize: '15px', color: '#cdb391', fontStyle: 'normal', align: 'center', lineSpacing: 8,
    }).setOrigin(0.5).setAlpha(0).setDepth(D + 3);
    this.prompt.setLetterSpacing?.(3);
    this.prompt.setShadow(0, 2, '#000000', 6, true, true);
    hud.tweens.add({ targets: this.prompt, alpha: 0.9, delay: 2600, duration: 1400 });

    // ash and embers drifting up
    this.ash = [];
    this.ashG = hud.add.graphics().setDepth(D + 2);
  }

  // ------------------------------------------------------------ title + blood

  buildTitle(W) {
    const RS = this.RS;
    const size = Math.round(104 * RS);
    const cw = Math.round(W * RS);
    const ch = Math.round(size * 2.9);
    this.size = size;
    this.textMid = Math.round(size * 0.62);

    // the letters alone (used for the drip origins and to paint the title)
    const letters = document.createElement('canvas');
    letters.width = cw; letters.height = ch;
    const lx = letters.getContext('2d', { willReadFrequently: true });
    lx.font = `${size}px ${FONT.display}`;
    if ('letterSpacing' in lx) lx.letterSpacing = `${Math.round(size * 0.07)}px`;
    lx.textAlign = 'center';
    lx.textBaseline = 'alphabetic';
    const base = Math.round(size * 0.98);
    const cx = cw / 2;

    // glossy blood fill: bright wet crimson at the top down to near-black
    const fill = lx.createLinearGradient(0, base - size * 0.8, 0, base + size * 0.08);
    fill.addColorStop(0, '#ff6a50');
    fill.addColorStop(0.18, '#e0141a');
    fill.addColorStop(0.55, '#8e0010');
    fill.addColorStop(1, '#2a0003');
    lx.lineJoin = 'round';
    lx.strokeStyle = '#0d0000';
    lx.lineWidth = size * 0.085;          // dark outer edge
    lx.strokeText(TITLE, cx, base);
    lx.strokeStyle = fill;
    lx.lineWidth = size * 0.04;           // the face is slender: thicken it in its own blood
    lx.strokeText(TITLE, cx, base);
    lx.fillStyle = fill;
    lx.fillText(TITLE, cx, base);
    // bevel: a hard wet highlight on the upper edges, painted only onto the letters
    lx.globalCompositeOperation = 'source-atop';
    const hi = lx.createLinearGradient(0, base - size * 0.8, 0, base - size * 0.45);
    hi.addColorStop(0, 'rgba(255,220,200,0.55)');
    hi.addColorStop(1, 'rgba(255,220,200,0)');
    lx.fillStyle = hi;
    lx.fillRect(0, 0, cw, base - size * 0.4);
    // grit: dark pitting in the metal-like surface
    for (let i = 0; i < 2600; i++) {
      lx.fillStyle = `rgba(20,0,0,${rand(0.08, 0.3)})`;
      lx.fillRect(rand(cx - size * 3.4, cx + size * 3.4), rand(base - size * 0.85, base + 4), rand(1, 3), rand(1, 3));
    }
    lx.globalCompositeOperation = 'source-over';
    this.letters = letters;

    // where blood runs from: bottom edges of the letters (opaque pixel over empty)
    const a = lx.getImageData(0, 0, cw, ch).data;
    const edges = [];
    for (let x = 2; x < cw - 2; x += 2) {
      for (let y = Math.round(base - size * 0.9); y < base + 8; y++) {
        if (a[(y * cw + x) * 4 + 3] > 160 && a[((y + 2) * cw + x) * 4 + 3] < 30) edges.push({ x, y });
      }
    }
    edges.sort(() => Math.random() - 0.5);
    this.drips = [];
    for (const e of edges) {
      if (this.drips.length >= 44) break;
      if (this.drips.some((d) => Math.abs(d.x - e.x) < 9 * RS)) continue;
      const heavy = e.y > base - 6 && Math.random() < 0.6; // the letters' feet run the most
      this.drips.push({
        x: e.x, y0: e.y, len: 0,
        max: heavy ? rand(size * 0.5, size * 1.75) : rand(size * 0.08, size * 0.6),
        w: rand(3, heavy ? 9 : 6) * RS * 0.6,
        speed: rand(0.6, 1.6) * RS * 0.55,
        start: rand(0, 1.8),       // seconds after the blood starts
        wob: rand(0, 6.28),
        bulb: 0,
      });
    }
    this.drops = [];

    this.canvas = document.createElement('canvas');
    this.canvas.width = cw; this.canvas.height = ch;
    this.titleKey = `youDied-${Date.now()}`;
    this.tex = this.hud.textures.addCanvas(this.titleKey, this.canvas);
    this.paint(0);
  }

  paint(sec) {
    const c = this.canvas.getContext('2d');
    const RS = this.RS;
    c.clearRect(0, 0, this.canvas.width, this.canvas.height);
    // soft dark halo behind the letters so they sit in the picture
    c.save();
    c.shadowColor = 'rgba(0,0,0,0.95)';
    c.shadowBlur = 28 * RS;
    c.shadowOffsetY = 6 * RS;
    c.drawImage(this.letters, 0, 0);
    c.restore();

    const bleed = sec - 0.9; // blood starts after the title has come up
    for (const d of this.drips) {
      const t = bleed - d.start;
      if (t <= 0) continue;
      // fast at first, then a slow ooze as it runs out
      const left = Math.max(0, 1 - d.len / d.max);
      d.len += d.speed * (0.15 + 0.85 * left ** 1.5);
      d.bulb = Math.min(1, d.bulb + 0.02);
      // a swollen drop at the tip lets go now and then, and the run keeps feeding it
      if (d.len > d.max * 0.92 && Math.random() < 0.006) {
        this.drops.push({ x: d.x, y: d.y0 + d.len, vy: 0.5 * RS, r: d.w * 0.95 });
        d.len *= rand(0.78, 0.9);
        d.bulb = 0.3;
      }
      this.drawDrip(c, d);
    }
    for (const p of this.drops) {
      p.vy += 0.32 * RS;
      p.y += p.vy;
      c.fillStyle = '#7a0008';
      c.beginPath();
      c.ellipse(p.x, p.y, p.r * 0.8, p.r * 1.35, 0, 0, Math.PI * 2);
      c.fill();
      c.fillStyle = 'rgba(255,140,120,0.35)';
      c.fillRect(p.x - p.r * 0.35, p.y - p.r * 0.7, Math.max(1, p.r * 0.25), p.r * 0.6);
    }
    this.drops = this.drops.filter((p) => p.y < this.canvas.height + 20);
    this.tex.refresh();
  }

  drawDrip(c, d) {
    const x = d.x + Math.sin(d.wob + d.len * 0.02) * 0.6;
    const top = d.y0 - 3;
    const tip = d.y0 + d.len;
    const w = d.w;
    const g = c.createLinearGradient(x - w, 0, x + w, 0);
    g.addColorStop(0, '#3a0004');
    g.addColorStop(0.35, '#9a0612');
    g.addColorStop(0.6, '#7a0008');
    g.addColorStop(1, '#2a0003');
    c.fillStyle = g;
    // the run: wider where it leaves the letter, narrowing, then the swollen drop
    c.beginPath();
    c.moveTo(x - w * 0.9, top);
    c.quadraticCurveTo(x - w * 0.55, top + (tip - top) * 0.25, x - w * 0.42, tip - w * 0.4);
    c.lineTo(x + w * 0.42, tip - w * 0.4);
    c.quadraticCurveTo(x + w * 0.55, top + (tip - top) * 0.25, x + w * 0.9, top);
    c.closePath();
    c.fill();
    const r = w * (0.55 + 0.45 * d.bulb);
    c.beginPath();
    c.ellipse(x, tip, r, r * 1.15, 0, 0, Math.PI * 2);
    c.fill();
    // wet highlight down the run and on the drop
    c.fillStyle = 'rgba(255,150,130,0.32)';
    c.fillRect(x - w * 0.3, top + 2, Math.max(1, w * 0.18), Math.max(0, tip - top - w));
    c.beginPath();
    c.arc(x - r * 0.35, tip - r * 0.35, Math.max(1, r * 0.22), 0, Math.PI * 2);
    c.fill();
  }

  // ------------------------------------------------------------ textures

  vignetteTex(W, H) {
    const key = 'deathVignette';
    if (this.hud.textures.exists(key)) return key;
    const cv = document.createElement('canvas');
    cv.width = Math.round(W / 2); cv.height = Math.round(H / 2);
    const c = cv.getContext('2d');
    const g = c.createRadialGradient(cv.width / 2, cv.height * 0.45, cv.height * 0.18, cv.width / 2, cv.height / 2, cv.width * 0.62);
    g.addColorStop(0, 'rgba(40,0,0,0)');
    g.addColorStop(0.55, 'rgba(60,0,0,0.35)');
    g.addColorStop(1, 'rgba(25,0,0,0.92)');
    c.fillStyle = g;
    c.fillRect(0, 0, cv.width, cv.height);
    this.hud.textures.addCanvas(key, cv);
    return key;
  }

  flareTex() {
    const key = 'deathFlare';
    if (this.hud.textures.exists(key)) return key;
    const cv = document.createElement('canvas');
    cv.width = 512; cv.height = 16;
    const c = cv.getContext('2d');
    const g = c.createLinearGradient(0, 0, 512, 0);
    g.addColorStop(0, 'rgba(255,60,30,0)');
    g.addColorStop(0.45, 'rgba(255,170,120,0.8)');
    g.addColorStop(0.5, 'rgba(255,245,230,1)');
    g.addColorStop(0.55, 'rgba(255,170,120,0.8)');
    g.addColorStop(1, 'rgba(255,60,30,0)');
    c.fillStyle = g;
    c.fillRect(0, 6, 512, 4);
    c.fillStyle = 'rgba(255,120,80,0.25)';
    c.fillRect(0, 3, 512, 10);
    this.hud.textures.addCanvas(key, cv);
    return key;
  }

  // ------------------------------------------------------------ per frame

  update() {
    const sec = (this.hud.time.now - this.t0) / 1000;
    this.paint(sec);

    // ash (grey) and embers (glowing), rising slowly through the dark
    const W = SETTINGS.width;
    const H = SETTINGS.height;
    if (this.ash.length < 70 && Math.random() < 0.5) {
      const ember = Math.random() < 0.35;
      this.ash.push({ x: rand(0, W), y: H + 5, vy: rand(0.25, 0.8), vx: rand(-0.2, 0.2), s: rand(0.8, ember ? 2.2 : 1.8), ember, ph: rand(0, 6.28), life: 0 });
    }
    const g = this.ashG.clear();
    for (const a of this.ash) {
      a.life++;
      a.y -= a.vy;
      a.x += a.vx + Math.sin(a.ph + a.life * 0.03) * 0.25;
      const fade = Math.min(1, a.life / 40) * Math.min(1, a.y / (H * 0.3));
      if (a.ember) g.fillStyle(0xff7a30, 0.8 * fade * (0.6 + 0.4 * Math.sin(a.life * 0.2 + a.ph)));
      else g.fillStyle(0x9a8a80, 0.45 * fade);
      g.fillRect(a.x, a.y, a.s, a.s);
    }
    this.ash = this.ash.filter((a) => a.y > -10);
  }

  destroy() {
    for (const o of [this.dim, this.vig, this.barTop, this.barBot, this.title, this.flare, this.prompt, this.ashG]) o?.destroy();
    if (this.hud.textures.exists(this.titleKey)) this.hud.textures.remove(this.titleKey);
  }
}
