// WrathFX.js — Rurik's fire on screen: KINGSFIRE and THE KING'S WRATH (combat/Wrath.js),
// and the way a man his fire kills goes up. It only listens to world events and draws;
// nothing here changes the fight.
//
//   the gathering   Oathkeeper flares overhead, embers stream up off the floor toward it, a
//                   heat glow swells behind him; the wrath also darkens the world around
//                   him (not the fighters), shakes harder and harder, and shouts its name
//   the release     a white-gold flash where the point goes in, the floor cracks glowing
//   a pillar        a column of fire bursting up out of the floor: a white-hot core in an
//                   orange body in a dark red skin, tongues of flame torn off its top,
//                   stone thrown up, a patch of floor left glowing
//   the ring        (the wrath) a wall of fire racing out across the floor around him
//   a man going up  a fireball: white flash, a ball of flame that swells and rolls up into
//                   black smoke, a shock ring along the floor, burning scraps arcing out
//                   (his body comes apart under it: effects/Dismember.js 'explode')

import { DEPTH } from '../view/depths.js';
import { softTex } from './Gore.js';
import { playSfx } from '../core/Sfx.js';
import { kingsfireOf } from '../combat/Skills.js';
import { SETTINGS } from '../config/settings.js';

const rand = (a, b) => a + Math.random() * (b - a);
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const FLAME = [0xfff2c8, 0xffd060, 0xffa030, 0xff6a10, 0xd83a08];
const STONE = [0x3a2a1c, 0x5a4a3a, 0x2a1c12];

export class WrathFX {
  constructor(scene) {
    this.scene = scene;
    softTex(scene);
    this.parts = [];   // flames, embers, smoke: { img, x, z, h, vx, vz, vh, grav, life, max, s0, s1, a0, fade }
    this.rings = [];   // the wrath's ring and the blasts' shock rings, redrawn each frame
    this.glows = [];   // floor left glowing where a pillar stood
    this.gather = null;
    this.ringG = scene.add.graphics().setBlendMode(Phaser.BlendModes.ADD).setDepth(DEPTH.shadows + 2);
    // (just under the fighters: the world darkens, the men and the fire don't)
    this.dim = scene.add.rectangle(0, 0, 6000, 4000, 0x0a0204, 1).setDepth(SETTINGS.world.floorTop - 1).setAlpha(0).setVisible(false);
    this.burned = { n: 0, at: 0 };
    const ev = scene.world.events;

    ev.on('wrathStart', ({ fighter: f, wrath }) => {
      const K = kingsfireOf(f);
      this.gather = { f, wrath, t: 0, frames: K?.startup ?? 20 };
      scene.callout(wrath ? "THE KING'S WRATH" : 'KINGSFIRE', wrath ? '#ff7a1a' : '#ffb040', wrath ? 34 : 26);
      playSfx(scene, 'heavySwing', { volume: 0.9, pitch: -700, minGapMs: 0 });
      playSfx(scene, 'fireWhoosh', { volume: 0.7, pitch: wrath ? -900 : -400, minGapMs: 0 });
      if (wrath) {
        scene.fx.shake(2, K.startup);
        const cam = scene.cameras.main;
        cam.zoomTo(scene.baseZoom * 1.06, 380, 'Quad.easeOut', true);
      }
    });

    ev.on('wrathRelease', ({ fighter: f, wrath, x, z }) => {
      const tx = x + f.facing * 36;
      const y = z - (f.floor ?? 0);
      scene.fx.shake(wrath ? 18 : 11, wrath ? 30 : 18);
      scene.rumble(1, 1, wrath ? 600 : 320);
      scene.cameras.main.flash(wrath ? 160 : 90, 255, 170, 70);
      if (wrath) scene.cameras.main.zoomTo(scene.baseZoom, 600, 'Quad.easeInOut', true);
      playSfx(scene, 'kick', { volume: 1, pitch: -1700, minGapMs: 0 });
      playSfx(scene, 'block', { volume: 0.8, pitch: -1500, minGapMs: 0 });
      this.flare(tx, y, wrath ? 2.4 : 1.6);
      this.cracks(tx, z, y, wrath ? 12 : 7, wrath);
      this.endGather();
    });

    ev.on('wrathPillar', ({ x, z, floor, i, wrath }) => {
      this.pillar(x, z, floor ?? 0, wrath ? 1.25 : 1);
      if (i % 2 === 0) playSfx(scene, 'fireWhoosh', { volume: 0.55, pitch: rand(-300, 300), spread: 80, minGapMs: 40 });
      if (i % 3 === 0) playSfx(scene, 'kick', { volume: 0.5, pitch: -1500, spread: 60, minGapMs: 40 });
      scene.fx.shake(wrath ? 4 : 3, 6);
    });

    ev.on('wrathNova', ({ x, z, radius }) => {
      this.rings.push({ x, z, r0: 20, r1: radius * 1.25, t: 0, n: 18, w: 26, fire: true });
      for (let k = 0; k < 40; k++) {
        const a = rand(0, Math.PI * 2);
        const sp = rand(260, 520);
        this.flame(x, z + Math.sin(a) * 6, 6, Math.cos(a) * sp, Math.sin(a) * sp * 0.3, rand(40, 140), rand(0.9, 1.6), 22, -200);
      }
    });

    ev.on('wrathBlast', ({ x, z, h, depth }) => {
      this.fireball(x, z, h + 40, 0.85);
      if (depth >= 2) scene.callout(`CHAIN BLAST  x${depth + 1}`, '#ffb040', 24);
    });

    // a man Rurik's fire kills goes up
    ev.on('kill', (e) => {
      if (e.move?.cut !== 'fire' || e.fatality !== 'explode' || e.attacker?.team !== 'player') return;
      this.fireball(e.defender.x, e.defender.z, e.defender.h + e.defender.stats.body.h * 0.5, e.move.wrath ? 1.2 : 1);
      const now = scene.time.now;
      this.burned.n = now - this.burned.at < 1400 ? this.burned.n + 1 : 1;
      this.burned.at = now;
      if (this.burned.n >= 2) scene.callout(`${this.burned.n} BLOWN APART`, '#ff7a1a', 24 + Math.min(10, this.burned.n * 2));
    });
  }

  // ------------------------------------------------------------ pieces

  sprite(color, add = true) {
    const img = this.scene.add.image(0, 0, 'soft').setTint(color);
    if (add) img.setBlendMode(Phaser.BlendModes.ADD);
    return img;
  }

  // a tongue of flame or an ember with its own flight (grav < 0: it rises)
  flame(x, z, h, vx, vz, vh, size, life, grav = -120, color = null) {
    if (this.parts.length > 420) return;
    const img = this.sprite(color ?? pick(FLAME));
    this.parts.push({ img, x, z, h, vx, vz, vh, grav, life, max: life, s0: size, s1: size * 0.2, a0: 1 });
  }

  smoke(x, z, h, size) {
    if (this.parts.length > 420) return;
    const img = this.sprite(pick([0x1a1410, 0x2a221c, 0x3a3028]), false);
    this.parts.push({ img, x, z, h, vx: rand(-20, 20), vz: 0, vh: rand(40, 90), grav: -10, life: 70, max: 70, s0: size * 0.6, s1: size * 1.8, a0: 0.55, smoke: true });
  }

  // a flash of white-gold light
  flare(x, y, size) {
    const s = this.scene;
    const a = this.sprite(0xffffff).setPosition(x, y).setScale(size * 0.9).setAlpha(0.8).setDepth(DEPTH.popups - 3);
    const b = this.sprite(0xff9a30).setPosition(x, y).setScale(size * 1.6).setDepth(DEPTH.popups - 4).setAlpha(0.45);
    s.tweens.add({ targets: a, scale: size * 2, alpha: 0, duration: 220, ease: 'Cubic.easeOut', onComplete: () => a.destroy() });
    s.tweens.add({ targets: b, scale: size * 3, alpha: 0, duration: 380, ease: 'Cubic.easeOut', onComplete: () => b.destroy() });
  }

  // the floor split from the sword's point, glowing like a forge
  cracks(x, z, y, n, wrath) {
    const s = this.scene;
    const g = s.add.graphics().setDepth(DEPTH.decals + 2).setBlendMode(Phaser.BlendModes.ADD);
    const lines = [];
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + rand(-0.2, 0.2);
      let px = x; let py = y;
      const pts = [[px, py]];
      const len = rand(60, wrath ? 220 : 140);
      for (let k = 1; k <= 5; k++) {
        px = x + Math.cos(a + rand(-0.25, 0.25)) * len * (k / 5);
        py = y + Math.sin(a + rand(-0.25, 0.25)) * len * (k / 5) * 0.28;
        pts.push([px, py]);
      }
      lines.push(pts);
    }
    for (const [color, w] of [[0x8a1a04, 7], [0xff6a10, 3.5], [0xfff0b0, 1.4]]) {
      g.lineStyle(w, color, 1);
      for (const pts of lines) { g.beginPath(); g.moveTo(pts[0][0], pts[0][1]); for (const p of pts.slice(1)) g.lineTo(p[0], p[1]); g.strokePath(); }
    }
    s.tweens.add({ targets: g, alpha: 0, delay: wrath ? 900 : 500, duration: 900, onComplete: () => g.destroy() });
  }

  // a column of fire out of the floor
  pillar(x, z, floor, k = 1) {
    const s = this.scene;
    const y = z - floor;
    const H = 170 * k;
    const layers = [
      { color: 0xa01804, w: 1.15, a: 0.55, add: false },
      { color: 0xff5a10, w: 0.95, a: 0.65, add: true },
      { color: 0xffa030, w: 0.62, a: 0.7, add: true },
      { color: 0xfff0c0, w: 0.3, a: 0.85, add: true },
    ];
    for (const L of layers) {
      const img = this.sprite(L.color, L.add).setOrigin(0.5, 0.92).setPosition(x, y).setDepth(z + 0.4 + L.w * 0.01).setAlpha(L.a);
      const sx = (56 * k * L.w) / 64;
      const sy = H / 64 * 1.2;
      img.setScale(sx * 0.6, 0.15);
      s.tweens.add({ targets: img, scaleY: sy, scaleX: sx, duration: 70, ease: 'Back.easeOut' });
      s.tweens.add({ targets: img, scaleX: sx * 0.25, scaleY: sy * 1.15, alpha: 0, delay: 200 + Math.random() * 60, duration: 260, ease: 'Quad.easeIn', onComplete: () => img.destroy() });
    }
    // the base flash on the floor
    const base = this.sprite(0xff8a2a).setPosition(x, y).setScale(1.6 * k, 0.5 * k).setDepth(z + 0.3).setAlpha(0.6);
    s.tweens.add({ targets: base, alpha: 0, scaleX: 3.2 * k, duration: 420, onComplete: () => base.destroy() });
    // tongues torn off the top, embers, stone, smoke
    for (let i = 0; i < 10; i++) this.flame(x + rand(-14, 14), z, floor + rand(20, H), rand(-60, 60), 0, rand(120, 320), rand(0.5, 1.1) * k, Math.round(rand(14, 26)));
    for (let i = 0; i < 8; i++) this.flame(x + rand(-10, 10), z, floor + rand(10, H * 0.8), rand(-140, 140), rand(-30, 30), rand(160, 420), rand(0.12, 0.22), Math.round(rand(30, 55)), 300, pick([0xfff0b0, 0xffc040]));
    for (let i = 0; i < 4; i++) this.scene.quakeFX?.rock(x + rand(-16, 16), z + rand(-4, 4), rand(-160, 160), rand(260, 460), 0.55);
    this.smoke(x, z, floor + H * 0.8, 1.6 * k);
    // the floor glows where it stood
    const gl = this.sprite(0xff6a10).setPosition(x, y).setScale(1.4 * k, 0.4 * k).setDepth(DEPTH.decals + 3).setAlpha(0.45);
    s.tweens.add({ targets: gl, alpha: 0, delay: 500, duration: 1400, onComplete: () => gl.destroy() });
  }

  // a man going up like a powder keg
  fireball(x, z, h, k = 1) {
    const s = this.scene;
    const y = z - h;
    this.flare(x, y, 1.3 * k);
    const ball = [
      [0xb02a06, 2.2, 0.6], [0xff6a14, 1.7, 0.6], [0xffb040, 1.1, 0.7], [0xfff0d0, 0.6, 0.8],
    ];
    for (const [color, size, a] of ball) {
      const img = this.sprite(color).setPosition(x, y).setScale(size * 0.4 * k).setDepth(z + 0.5).setAlpha(a);
      s.tweens.add({ targets: img, scale: size * 1.15 * k, y: y - 26 * k, alpha: 0, duration: 380 + size * 80, ease: 'Cubic.easeOut', onComplete: () => img.destroy() });
    }
    this.rings.push({ x, z, r0: 10, r1: 120 * k, t: 0, n: 14, w: 10, fire: false });
    for (let i = 0; i < 14; i++) {
      const a = rand(0, Math.PI * 2);
      const sp = rand(140, 420) * k;
      this.flame(x, z, h, Math.cos(a) * sp, rand(-40, 40), Math.abs(Math.sin(a)) * sp + 140, rand(0.35, 0.7), Math.round(rand(26, 46)), 900);
    }
    for (let i = 0; i < 4; i++) s.time.delayedCall(i * 60, () => this.smoke(x + rand(-20, 20), z, h + rand(0, 30), 2.2 * k));
    playSfx(s, 'kick', { volume: 0.9, pitch: -1900, spread: 80, minGapMs: 30 });
    playSfx(s, 'fireWhoosh', { volume: 0.7, pitch: rand(-600, 0), spread: 80, minGapMs: 30 });
    s.fx.shake(8 * k, 14);
  }

  // ------------------------------------------------------------ every frame

  update() {
    const s = this.scene;
    // the gathering: the blade flares, embers stream to it, the world darkens (the wrath)
    const G = this.gather;
    if (G && (!G.f.alive || G.f.state !== 'kingsfire')) this.endGather();
    if (this.gather) {
      const f = G.f;
      G.t++;
      const t = Math.min(1, G.t / G.frames);
      if (G.t % 2 === 0) {
        const a = rand(0, Math.PI * 2);
        const r = rand(50, G.wrath ? 150 : 90);
        this.flame(f.x + Math.cos(a) * r, f.z + Math.sin(a) * 8, 2, -Math.cos(a) * 70, 0, rand(160, 300) * (0.6 + t), rand(0.25, 0.45), 26, -60);
      }
      G.glow ??= this.sprite(0xff8a2a);
      G.blade ??= this.sprite(0xfff0c0);
      G.glow.setPosition(f.x, f.z - f.h - 60).setDepth(f.z - 0.5)
        .setScale((G.wrath ? 3.4 : 2.2) * (0.4 + t), (G.wrath ? 4 : 2.6) * (0.4 + t)).setAlpha((0.25 + 0.35 * t) * (0.85 + Math.random() * 0.15));
      // (the blade is raised overhead in these poses: the flare sits on it)
      G.blade.setPosition(f.x + f.facing * 6, f.z - f.h - 150).setDepth(f.z + 0.6).setScale(0.6 + t * 1.4 + Math.random() * 0.2).setAlpha(0.6 + 0.4 * t);
      if (G.wrath) {
        const cam = s.cameras.main;
        this.dim.setVisible(true).setPosition(cam.midPoint.x, cam.midPoint.y).setAlpha(0.62 * t);
        s.fx.shake(1 + 4 * t, 3);
      }
    } else if (this.dim.visible) {
      const a = this.dim.alpha * 0.9;
      if (a > 0.01) this.dim.setAlpha(a); else this.dim.setVisible(false).setAlpha(0);
    }

    // flames, embers, smoke
    const dt = 1 / 60;
    this.parts = this.parts.filter((p) => {
      p.life--;
      if (p.life <= 0) { p.img.destroy(); return false; }
      p.vh -= p.grav * dt;
      p.x += p.vx * dt; p.z += p.vz * dt; p.h += p.vh * dt;
      if (p.h < 0) { p.h = 0; p.vh = 0; p.vx *= 0.6; }
      p.vx *= 0.97;
      const u = 1 - p.life / p.max;
      p.img.setPosition(p.x, p.z - p.h).setDepth(p.z + 0.45).setScale(p.s0 + (p.s1 - p.s0) * u).setAlpha(p.a0 * (p.smoke ? Math.sin(Math.PI * Math.min(1, u * 1.2)) : 1 - u * u));
      return true;
    });

    // rings racing out along the floor
    const g = this.ringG.clear();
    this.rings = this.rings.filter((r) => {
      r.t++;
      const u = r.t / r.n;
      if (u >= 1) return false;
      const e = 1 - (1 - u) ** 2;
      const rad = r.r0 + (r.r1 - r.r0) * e;
      const a = 1 - u;
      if (r.fire) {
        g.lineStyle(r.w * (1 - u * 0.5), 0xff5a10, 0.7 * a).strokeEllipse(r.x, r.z, rad * 2, rad * 0.62);
        g.lineStyle(r.w * 0.45, 0xffc040, 0.9 * a).strokeEllipse(r.x, r.z, rad * 2, rad * 0.62);
        g.lineStyle(3, 0xfff0c0, a).strokeEllipse(r.x, r.z, rad * 2, rad * 0.62);
        if (r.t % 2 === 0) {
          for (let k = 0; k < 6; k++) {
            const ang = rand(0, Math.PI * 2);
            this.flame(r.x + Math.cos(ang) * rad, r.z + Math.sin(ang) * rad * 0.31, 4, 0, 0, rand(80, 220), rand(0.5, 0.9), 16);
          }
        }
      } else {
        g.lineStyle(r.w * a, 0xffd8a0, 0.6 * a).strokeEllipse(r.x, r.z, rad * 2, rad * 0.5);
      }
      return true;
    });
  }

  endGather() {
    this.gather?.glow?.destroy();
    this.gather?.blade?.destroy();
    this.gather = null;
  }

  clear() {
    this.endGather();
    for (const p of this.parts) p.img.destroy();
    this.parts = [];
    this.rings = [];
    this.ringG.clear();
    this.dim.setVisible(false).setAlpha(0);
  }
}
