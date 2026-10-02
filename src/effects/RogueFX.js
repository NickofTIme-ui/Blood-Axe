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
import { playSfx } from '../core/Sfx.js';

const rand = (a, b) => a + Math.random() * (b - a);
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

  // The widow mine going off: a white-violet flash, a shock ring over the floor, smoke,
  // sparks, stone and dust thrown out, a scorch mark, a hard kick of the camera.
  blast(x, z, r, owner) {
    const s = this.scene;
    this.sound('mineBlast', owner);
    s.fx.shake(10, 18);
    s.rumble(1, 0.8, 220);
    const flash = s.add.circle(x, z - 26, 30, 0xffffff, 0.9).setDepth(DEPTH.popups - 4).setBlendMode(ADD());
    s.tweens.add({ targets: flash, scale: 2.4, alpha: 0, duration: 140, onComplete: () => flash.destroy() });
    const tint = s.add.circle(x, z - 26, 40, VIOLET, 0.5).setDepth(DEPTH.popups - 5).setBlendMode(ADD());
    s.tweens.add({ targets: tint, scale: 2, alpha: 0, duration: 260, onComplete: () => tint.destroy() });
    const ring = s.add.ellipse(x, z, 20, 8).setStrokeStyle(4, 0xffe0c0, 0.9).setDepth(z + 0.5).setBlendMode(ADD());
    s.tweens.add({ targets: ring, scaleX: r / 9, scaleY: r / 14, alpha: 0, duration: 320, ease: 'Cubic.easeOut', onComplete: () => ring.destroy() });
    s.gore.spark(x, z, 20, 0xffd0a0, 26);
    s.gore.spark(x, z, 20, CRIMSON, 12);
    for (let i = 0; i < 24; i++) {
      const a = rand(0, Math.PI * 2);
      s.gore.spawn({ x, z: z + Math.sin(a) * 4, h: rand(2, 20), vx: Math.cos(a) * rand(150, 420), vz: Math.sin(a) * rand(40, 120), vh: rand(150, 450), tint: Math.random() < 0.5 ? 0x5a4a3a : 0x8a7a62, scale: rand(0.5, 1.2), decal: false, life: Math.floor(rand(20, 36)), texture: 'px', spin: rand(-10, 10) });
    }
    for (let i = 0; i < 12; i++) s.burning?.puff?.(x + rand(-r * 0.4, r * 0.4), z + rand(-6, 6), rand(10, 60), 0.6);
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
    // ...and when he understands, a word over his head
    if (on?.doom && on.awe > 0 && !this.word) {
      const [txt, col] = DOOM_WORDS[on.doom.kind][Math.floor(Math.random() * 2)];
      this.word = this.scene.add.text(on.x, on.z - on.h - on.stats.body.h - 14, txt, { fontFamily: 'monospace', fontSize: '26px', fontStyle: 'bold', color: col })
        .setOrigin(0.5, 1).setStroke('#000000', 6).setDepth(DEPTH.popups).setScale(0.2);
      this.scene.tweens.add({ targets: this.word, scale: 1, duration: 160, ease: 'Back.easeOut' });
    }
    if (this.word && on) this.word.setPosition(on.x + (Math.random() - 0.5) * 1.5, on.z - on.h - on.stats.body.h - 14);
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

  destroy() { this.g.destroy(); this.word?.destroy(); }
}

// What a man with a mine on his chest has to say, by how he takes it (doom.kind).
const DOOM_WORDS = [
  [['. . .', '#bfe8ff'], ['oh.', '#e8e8f0']],
  [['HELP?!', '#9af0c0'], ['ANYONE?', '#ffe27a']],
  [['GET IT OFF!', '#ff9ad8'], ['OFF OFF OFF', '#c8a0ff']],
  [['MOTHER...', '#a0d8ff'], ['not like this', '#d0f0a0']],
];
