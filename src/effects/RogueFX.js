// RogueFX.js — The Rogue on screen and in the ears, apart from her body: the EXPOSED
// marker, the widow mines and their blasts, shadow-window afterimages, the vault's push,
// the dive's impact, steel flashes on her cuts, and her finishers. It only listens to
// world events (combat/Rogue.js, combat/Mine.js, combat/CombatSystem.js); nothing here
// changes the fight.
//
// Her language is steel, motion, sparks, smoke and violet afterimages — never magic
// circles. Sounds reuse the game's samples, pitched and layered, until she gets her own
// recordings (ROGUE_SOUNDS is the one place to swap them).

import { DEPTH } from '../view/depths.js';
import { softTex } from './Gore.js';
import { playSfx } from '../core/Sfx.js';

const rand = (a, b) => a + Math.random() * (b - a);
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const ADD = () => Phaser.BlendModes.ADD;
const VIOLET = 0xb050ff;
const CRIMSON = 0xff3050;

export const ROGUE_SOUNDS = {
  swing1: [['whiff', { volume: 0.5, pitch: 350 }]],
  swing2: [['swingAlt', { volume: 0.5, pitch: 300 }]],
  swing3: [['second', { volume: 0.55, pitch: 250 }]],
  swing4: [['finisher', { volume: 0.65, pitch: 200 }]],
  hit: [['block', { volume: 0.3, pitch: 1100, minGapMs: 30 }]],
  block: [['block', { volume: 0.7, pitch: 500 }]],
  shadow: [['swingAlt', { volume: 0.6, pitch: 1300 }], ['block', { volume: 0.35, pitch: 1800 }]],
  viper: [['heavySwing', { volume: 0.6, pitch: 500 }]],
  kick: [['swingAlt', { volume: 0.5, pitch: -100 }]],
  knife: [['whiff', { volume: 0.5, pitch: 900 }]],
  fan: [['whiff', { volume: 0.6, pitch: 1100 }], ['swingAlt', { volume: 0.4, pitch: 1000 }]],
  starHit: [['block', { volume: 0.25, pitch: 1500, minGapMs: 25 }]],
  vaultContact: [['jump', { volume: 0.5, pitch: -200 }]],
  vaultLaunch: [['swingAlt', { volume: 0.55, pitch: -300 }]],
  dive: [['heavySwing', { volume: 0.5, pitch: 700 }]],
  diveLand: [['kick', { volume: 0.7, pitch: 300 }]],
  mineDrop: [['block', { volume: 0.4, pitch: -200 }]],
  mineArm: [['block', { volume: 0.3, pitch: 1400 }]],
  mineCue: [['block', { volume: 0.5, pitch: 2000, minGapMs: 0 }]],
  mineBlast: [['kick', { volume: 1, pitch: -1100, minGapMs: 0 }], ['fireWhoosh', { volume: 0.8, pitch: -700, minGapMs: 0 }]],
  exposed: [['block', { volume: 0.4, pitch: 2200 }]],
  phantom: [['finisher', { volume: 0.8, pitch: 400, minGapMs: 20 }]],
  lotus: [['kick', { volume: 1, pitch: -1200, minGapMs: 0 }], ['fireWhoosh', { volume: 0.9, pitch: -800, minGapMs: 0 }]],
  scarlet: [['heavySwing', { volume: 0.8, pitch: 300 }], ['kick', { volume: 0.7, pitch: 0 }]],
};

export class RogueFX {
  constructor(scene) {
    this.scene = scene;
    this.mines = new Map();
    this.marks = new Map(); // exposed enemy -> marker
    const ev = scene.world.events;
    const isRogue = (f) => f?.stats?.archetype === 'rogue';

    ev.on('attackStart', ({ fighter, state }) => {
      if (!isRogue(fighter)) return;
      const k = { light1: 'swing1', light2: 'swing2', light3: 'swing3', light4: 'swing4', viper: 'viper', kick: 'kick', sweep: 'kick', knife: 'knife', fan: 'fan', dive: 'dive', airAttack: 'swing1' }[state];
      if (k) this.sound(k, fighter);
      if (state === 'viper') this.afterimages(fighter, 5);
    });
    ev.on('hit', (e) => {
      if (isRogue(e.attacker) && e.kind === 'melee') {
        this.sound('hit', e.attacker);
        this.steelFlash(e.x, e.z - e.h, e.dir, e.z);
      }
      if (isRogue(e.attacker) && e.move.fx === 'shuriken') { this.sound('starHit', e.attacker); scene.gore.spark(e.x, e.z, e.h, 0xe8eef8, 5); }
    });
    ev.on('block', (e) => { if (isRogue(e.defender)) { this.sound('block', e.defender); scene.gore.spark(e.x, e.z, e.h, 0xfff2c0, 10); } });
    ev.on('shadowWindow', ({ fighter }) => {
      this.sound('shadow', fighter);
      this.afterimages(fighter, 3, VIOLET);
      scene.callout('SHADOW', '#c070ff', 20);
    });
    ev.on('exposed', ({ defender, fresh }) => { if (fresh) this.sound('exposed', defender); this.mark(defender); });
    ev.on('vaultPlant', ({ fighter, ally }) => {
      this.sound('vaultContact', fighter);
      scene.gore.spark(ally.x, ally.z, ally.stats.body.h * 0.75, 0xd8d0c0, 6);
    });
    ev.on('vaultLaunch', ({ fighter }) => {
      this.sound('vaultLaunch', fighter);
      this.afterimages(fighter, 3, VIOLET);
    });
    ev.on('diveLand', ({ fighter, x, z }) => {
      this.sound('diveLand', fighter);
      scene.fx.shake(4, 8);
      this.dust(x, z, 14);
    });
    ev.on('projectileGround', ({ projectile: p }) => {
      if (p.data.look === 'shuriken' || p.data.look === 'knife') { scene.gore.spark(p.x, p.z, 1, 0xd8dde4, 3); this.stuck(p); }
    });
    ev.on('mineDrop', ({ mine }) => { this.sound('mineDrop', mine.owner); this.mines.set(mine, new MineView(scene, mine)); });
    ev.on('mineArmed', ({ mine }) => { this.sound('mineArm', mine.owner); this.mines.get(mine)?.arm(); });
    ev.on('mineCue', ({ mine }) => this.sound('mineCue', mine.owner));
    ev.on('mineFizzle', ({ mine }) => { this.mines.get(mine)?.destroy(); this.mines.delete(mine); });
    ev.on('mineBlast', ({ mine }) => { this.mines.get(mine)?.destroy(); this.mines.delete(mine); this.blast(mine.x, mine.z, mine.cfg.outer, mine.owner); });
    ev.on('finisherBeat', (b) => this.finisher(b));
  }

  sound(name, near) {
    const loud = !near || near.team === 'player' ? 1 : 0.5;
    for (const [key, o] of ROGUE_SOUNDS[name] ?? []) playSfx(this.scene, key, { spread: 120, minGapMs: 35, ...o, volume: (o.volume ?? 1) * loud });
  }

  // a short, hot streak of steel along the cut
  steelFlash(x, y, dir, z) {
    const g = this.scene.add.graphics().setDepth(z + 1).setBlendMode(ADD()).setPosition(x, y).setRotation(rand(-0.6, 0.6));
    g.fillStyle(0xffffff, 0.95).fillRect(-14, -0.7, 28, 1.4);
    g.fillStyle(CRIMSON, 0.45).fillRect(-18, -2, 36, 4);
    g.scaleX = 0.3;
    this.scene.tweens.add({ targets: g, scaleX: 1, alpha: 0, duration: 120, onComplete: () => g.destroy() });
  }

  // violet afterimages left behind her (dodges, lunges, launches): soft silhouettes
  // that fade where she was
  afterimages(f, n, color = VIOLET) {
    for (let i = 0; i < n; i++) {
      this.scene.time.delayedCall(i * 30, () => {
        const v = this.scene.views.get(f.id);
        const h = f.stats.body.h;
        const ghost = this.scene.add.ellipse(f.x - f.facing * i * 6, f.z - f.h - h * 0.5, f.stats.body.w * 0.9, h, color, 0.28).setDepth(f.z - 0.2).setBlendMode(ADD());
        this.scene.tweens.add({ targets: ghost, alpha: 0, scaleX: 0.6, duration: 200, onComplete: () => ghost.destroy() });
        v?.ghost?.(color);
      });
    }
  }

  // EXPOSED: a small violet-red glint over him while it lasts
  mark(e) {
    if (this.marks.has(e)) return;
    const g = this.scene.add.graphics().setBlendMode(ADD());
    this.marks.set(e, g);
  }

  dust(x, z, n) {
    for (let i = 0; i < n; i++) {
      const a = rand(0, Math.PI * 2);
      this.scene.gore.spawn({ x, z: z + Math.sin(a) * 6, h: 2, vx: Math.cos(a) * rand(80, 220), vz: Math.sin(a) * 40, vh: rand(30, 120), tint: 0x8a7a60, scale: rand(0.4, 0.8), decal: false, life: Math.floor(rand(12, 22)) });
    }
  }

  // a star/knife that hit the floor stays stuck there a moment
  stuck(p) {
    const g = this.scene.add.graphics().setDepth(p.z - 0.1);
    g.fillStyle(0x2a2a30, 1).fillRect(p.x - 1, p.z - 7, 2, 7);
    g.fillStyle(0xd8dde4, 1).fillRect(p.x - 0.5, p.z - 6, 1, 3);
    this.scene.tweens.add({ targets: g, alpha: 0, delay: 1500, duration: 400, onComplete: () => g.destroy() });
  }

  // The widow mine going off: a white-hot core, a rolling fireball, a ground-light and
  // a shock ring over the floor, a dust skirt, embers and gravel thrown out, black smoke
  // billowing up after it, a scorch mark, a hard kick of the camera. (A hint of her
  // violet stays in the flash, so it still reads as hers.)
  blast(x, z, r, owner) {
    const s = this.scene;
    this.sound('mineBlast', owner);
    s.fx.shake(10, 18);
    s.rumble(1, 0.8, 220);
    softTex(s);
    const puff = (px, py, depth, tint, sc, alpha, add) => {
      const img = s.add.image(px, py, 'soft').setTint(tint).setScale(sc).setAlpha(alpha).setDepth(depth);
      if (add) img.setBlendMode(ADD());
      return img;
    };
    const cy = z - 22;
    // the light it throws on the floor, and the white-hot core
    const glow = puff(x, z - 2, z - 0.5, 0xff9a40, 1, 0.9, true).setScale(r / 18, r / 52);
    s.tweens.add({ targets: glow, alpha: 0, duration: 420, ease: 'Quad.easeIn', onComplete: () => glow.destroy() });
    const core = puff(x, cy, DEPTH.popups - 4, 0xfff6e0, 0.8, 1, true);
    s.tweens.add({ targets: core, scale: 2.6, alpha: 0, duration: 160, ease: 'Cubic.easeOut', onComplete: () => core.destroy() });
    const tint = puff(x, cy, DEPTH.popups - 5, VIOLET, 1.4, 0.35, true);
    s.tweens.add({ targets: tint, scale: 3, alpha: 0, duration: 240, onComplete: () => tint.destroy() });
    // the fireball: billows of flame that swell, climb and burn out yellow -> orange -> red
    for (let i = 0; i < 14; i++) {
      const a = rand(0, Math.PI * 2);
      const d = rand(0, 22);
      const f = puff(x + Math.cos(a) * d, cy + Math.sin(a) * d * 0.7, z + 3, [0xffd060, 0xffa030, 0xff7018][i % 3], rand(0.5, 0.9), 0.95, true);
      s.tweens.add({
        targets: f, scale: rand(1.4, 2.3), x: f.x + Math.cos(a) * rand(14, 34), y: f.y + Math.sin(a) * rand(6, 18) - rand(10, 34),
        alpha: 0, duration: rand(260, 480), ease: 'Cubic.easeOut', onComplete: () => f.destroy(),
      });
      s.tweens.addCounter({ from: 0, to: 1, duration: 300, onUpdate: (tw) => f.active && f.setTint(Phaser.Display.Color.GetColor(255, Math.round(200 - 150 * tw.getValue()), Math.round(80 - 70 * tw.getValue()))) });
    }
    // the shock ring, and the dust it drives out low along the floor
    const ring = s.add.ellipse(x, z, 20, 8).setStrokeStyle(3, 0xffd8a8, 0.8).setDepth(z + 0.5).setBlendMode(ADD());
    s.tweens.add({ targets: ring, scaleX: r / 9, scaleY: r / 14, alpha: 0, duration: 300, ease: 'Cubic.easeOut', onComplete: () => ring.destroy() });
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2 + rand(-0.2, 0.2);
      const dd = puff(x, z - 4, z + 1, 0x6a5a48, 0.5, 0.5, false);
      s.tweens.add({ targets: dd, x: x + Math.cos(a) * r * rand(0.6, 0.95), y: z - 6 + Math.sin(a) * r * 0.22, scale: rand(1.1, 1.7), alpha: 0, duration: rand(500, 800), ease: 'Cubic.easeOut', onComplete: () => dd.destroy() });
    }
    // black smoke rolls up out of the fire and hangs a moment
    for (let i = 0; i < 9; i++) {
      const sm = puff(x + rand(-34, 34), cy + rand(-20, 8), z + 2, pick([0x1e1a18, 0x2a2420, 0x3a322a]), rand(0.6, 1), 0, false);
      const peak = rand(0.1, 0.18);
      const life = rand(900, 1300);
      s.tweens.add({ targets: sm, alpha: peak, duration: 140, delay: rand(60, 160) });
      s.tweens.add({ targets: sm, y: sm.y - rand(40, 90), x: sm.x + rand(-34, 34), scale: rand(2, 3), duration: life, delay: 80, ease: 'Sine.easeOut' });
      s.tweens.add({ targets: sm, alpha: 0, duration: life * 0.6, delay: 80 + life * 0.45, onComplete: () => sm.destroy() });
    }
    // embers and gravel
    for (let i = 0; i < 26; i++) {
      const a = rand(-Math.PI, 0);
      const sp = rand(160, 520);
      s.gore.spawn({ x, z: z + rand(-6, 6), h: rand(10, 40), vx: Math.cos(a) * sp, vz: rand(-60, 60), vh: -Math.sin(a) * sp, tint: pick([0xffe080, 0xffa040, 0xff6a20]), scale: rand(0.18, 0.34), decal: false, life: Math.floor(rand(22, 46)) });
    }
    for (let i = 0; i < 16; i++) {
      const a = rand(0, Math.PI * 2);
      s.gore.spawn({ x, z: z + Math.sin(a) * 4, h: rand(2, 16), vx: Math.cos(a) * rand(150, 400), vz: Math.sin(a) * rand(40, 120), vh: rand(150, 420), tint: pick([0x4a3e32, 0x6a5a48, 0x7e6e58]), scale: rand(0.35, 0.7), decal: false, life: Math.floor(rand(20, 36)), texture: 'px', spin: rand(-10, 10) });
    }
    s.gore.scorch?.(x, z, true);
  }

  update() {
    for (const v of this.mines.values()) v.update();
    for (const [e, g] of this.marks) {
      if (!(e.exposed > 0) || !e.alive || e.removeMe) { g.destroy(); this.marks.delete(e); continue; }
      const x = e.x;
      const y = e.z - e.h - e.stats.body.h - 10 + Math.sin(this.scene.time.now * 0.01) * 1.5;
      const k = Math.min(1, e.exposed / 30);
      g.clear().setDepth(e.z + 1);
      g.fillStyle(CRIMSON, 0.85 * k).fillTriangle(x - 5, y, x + 5, y, x, y - 8);
      g.fillStyle(VIOLET, 0.9 * k).fillTriangle(x - 5, y, x + 5, y, x, y + 8);
      g.fillStyle(0xffffff, k).fillRect(x - 0.6, y - 4, 1.2, 8);
    }
  }

  // ------------------------------------------------------------ finishers

  finisher(b) {
    const { type, victim: v, attacker: f } = b;
    const s = this.scene;
    switch (type) {
      case 'phantomSlash':
        this.sound('phantom', f);
        this.afterimages(f, 2, VIOLET);
        this.steelFlash(v.x, v.z - v.h - v.stats.body.h * 0.55, f.facing, v.z);
        s.gore.spark(v.x, v.z, v.h + v.stats.body.h * 0.55, 0xe8eef8, 6);
        if (b.n === 0) s.slowmo(0.7, 200);
        break;
      case 'phantomLand':
        this.dust(f.x, f.z, 8);
        break;
      case 'phantomReap':
        s.fx.shake(6, 10);
        s.rumble(0.8, 0.8, 120);
        this.sound('swing4', f);
        s.callout('PHANTOM REQUIEM', '#c070ff', 26);
        break;
      case 'lotusThrow':
        this.sound('knife', f);
        break;
      case 'lotusShove':
        this.sound('kick', f);
        s.gore.spark(v.x, v.z, 50, 0xffffff, 6);
        break;
      case 'lotusBlast': {
        this.sound('lotus', f);
        s.slowmo(0.4, 300);
        s.callout('BLACK LOTUS', '#c070ff', 26);
        for (const t of b.targets) {
          s.gore.onKill({ attacker: f, defender: t, dir: Math.sign(t.x - b.spot.x) || 1, move: { cut: 'explosive', damage: 999 }, x: t.x, z: t.z, h: t.h + t.stats.body.h * 0.5, damage: 999, fatality: 'explode' }, s.views.get(t.id));
        }
        break;
      }
      case 'scarletLeap':
        this.sound('vaultLaunch', f);
        this.afterimages(f, 3, VIOLET);
        break;
      case 'scarletStorm': {
        this.sound('fan', f);
        s.slowmo(0.5, 300);
        // a storm of steel out of the sky round them (the stars are only the show here:
        // the finisher's own beats decide who falls)
        for (const t of b.targets) {
          for (let i = 0; i < 4; i++) {
            const tx = t.x + rand(-26, 26);
            const tz = t.z + rand(-8, 8);
            this.streak({ x: b.x, y: b.z - b.h - 40 }, { x: tx, y: tz - rand(0, 50) }, tz);
          }
        }
        break;
      }
      case 'scarletStar':
        this.sound('starHit', f);
        s.gore.spark(v.x, v.z, v.h + 50, 0xe8eef8, 8);
        break;
      case 'scarletImpact':
        this.sound('scarlet', f);
        this.dust(f.x, f.z, 18);
        s.fx.shake(8, 14);
        s.rumble(1, 0.9, 180);
        s.callout('SCARLET SKY', '#c070ff', 26);
        break;
      default:
    }
  }

  // a thrown star's path, drawn as a quick steel streak
  streak(a, b, z) {
    const g = this.scene.add.graphics().setDepth(z + 1).setBlendMode(ADD());
    g.lineStyle(1.4, 0xe8eef8, 0.9).lineBetween(a.x, a.y, b.x, b.y);
    this.scene.tweens.add({ targets: g, alpha: 0, duration: 180, onComplete: () => g.destroy() });
    this.scene.gore.spark(b.x, z, z - b.y, 0xe8eef8, 3);
  }

  destroy() {
    for (const v of this.mines.values()) v.destroy();
    for (const g of this.marks.values()) g.destroy();
    this.mines.clear(); this.marks.clear();
  }
}

// A widow mine on the floor: a squat steel disc, claws that fold out as it arms, a light
// that pulses slowly while it waits and fast once something sets it off. Code-drawn
// until its art arrives.
class MineView {
  constructor(scene, m) {
    this.scene = scene;
    this.m = m;
    this.g = scene.add.graphics();
    this.claw = 0;
    this.t = 0;
  }

  arm() { this.armed = true; }

  update() {
    const src = this.m;
    const g = this.g;
    this.t++;
    if (this.armed) this.claw = Math.min(1, this.claw + 0.2);
    // stuck to a man: it rides on his chest, drawn over him, the light already racing
    const on = src.stuck;
    const m = on ? { x: src.x, z: src.z - on.h - on.stats.body.h * 0.5, cue: 0 } : src;
    g.clear().setDepth(on ? src.z + 1 : src.z - 0.5);
    // claws
    for (let i = 0; i < 4; i++) {
      const a = i * Math.PI / 2 + Math.PI / 4;
      const r = 6 + this.claw * 6;
      g.lineStyle(2, 0x1a1a20, 1).lineBetween(m.x, m.z, m.x + Math.cos(a) * r, m.z + Math.sin(a) * r * 0.45);
      g.lineStyle(1, 0x7a7a86, 1).lineBetween(m.x, m.z - 0.5, m.x + Math.cos(a) * r, m.z + Math.sin(a) * r * 0.45 - 0.5);
    }
    // body
    g.fillStyle(0x0c0c10, 1).fillEllipse(m.x, m.z, 16, 8);
    g.fillStyle(0x3a3a44, 1).fillEllipse(m.x, m.z - 1.5, 13, 6);
    g.fillStyle(0x6a6a76, 1).fillEllipse(m.x - 1.5, m.z - 2.5, 6, 2.4);
    // the light
    const fast = m.cue >= 0;
    const pulse = this.armed ? 0.5 + 0.5 * Math.sin(this.t * (fast ? 1.6 : 0.12)) : 0.2;
    g.fillStyle(fast ? CRIMSON : VIOLET, 0.6 + 0.4 * pulse).fillCircle(m.x, m.z - 2.5, 1.6);
    g.fillStyle(fast ? CRIMSON : VIOLET, 0.18 * pulse).fillCircle(m.x, m.z - 2.5, 6);
  }

  destroy() { this.g.destroy(); }
}
