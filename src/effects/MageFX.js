// MageFX.js — The Mage's magic on screen and in the ears: lightning arcs, the force
// blast, blink sparks, the barriers themselves, and his finishers. It only listens to
// world events (combat/Mage.js, combat/Barrier.js) — nothing here changes the fight, so
// it may use Math.random freely.
//
// Built from code-drawn shapes and the shared particle/flame systems (effects/Gore.js,
// effects/Burn.js). Sounds reuse the game's samples, pitched and layered, until the
// Mage gets his own recordings (MAGE_SOUNDS below is the one place to swap them).

import { DEPTH } from '../view/depths.js';
import { playSfx } from '../core/Sfx.js';
import { FX } from '../view/stripImporter.js';

const rand = (a, b) => a + Math.random() * (b - a);
const ADD = () => Phaser.BlendModes.ADD;

// Each sound event of his kit -> [sample, options] layers (core/Sfx.js keys).
export const MAGE_SOUNDS = {
  staffSwing: [['swingAlt', { volume: 0.45, pitch: -350 }]],
  staffImpact: [['kick', { volume: 0.55, pitch: 250 }]],
  staffBlock: [['block', { volume: 0.7, pitch: -450 }]],
  magicBlock: [['block', { volume: 0.5, pitch: 900 }]],
  boltCharge: [['fireWhoosh', { volume: 0.25, pitch: 900 }]],
  boltCast: [['block', { volume: 0.7, pitch: 1400 }], ['kick', { volume: 0.5, pitch: -300 }]],
  boltImpact: [['block', { volume: 0.55, pitch: 1700, minGapMs: 30 }]],
  boltJump: [['block', { volume: 0.35, pitch: 2000, minGapMs: 25 }]],
  force: [['kick', { volume: 1, pitch: -800 }], ['fireWhoosh', { volume: 0.6, pitch: -600 }]],
  blinkOut: [['swingAlt', { volume: 0.4, pitch: 1000 }]],
  blinkIn: [['block', { volume: 0.3, pitch: 1500 }]],
  barrierCast: [['heavySwing', { volume: 0.5, pitch: -400 }]],
  fireWall: [['fireWhoosh', { volume: 0.9, pitch: -300 }], ['kick', { volume: 0.6, pitch: -900 }]],
  earthUp: [['kick', { volume: 1, pitch: -1300 }], ['block', { volume: 0.5, pitch: -1100 }]],
  earthDown: [['kick', { volume: 0.7, pitch: -1500 }]],
  earthHit: [['block', { volume: 0.45, pitch: -900, minGapMs: 60 }], ['kick', { volume: 0.7, pitch: -1100, minGapMs: 60 }]],
  earthBreak: [['kick', { volume: 1, pitch: -1600 }], ['heavySwing', { volume: 0.5, pitch: -900 }], ['block', { volume: 0.4, pitch: -1300 }]],
  storm: [['kick', { volume: 1, pitch: -1400 }], ['block', { volume: 0.8, pitch: 1200 }]],
  rupture: [['kick', { volume: 1, pitch: -600 }], ['finisher', { volume: 0.6, pitch: -800 }]],
  embers: [['fireWhoosh', { volume: 1, pitch: -500 }], ['kick', { volume: 0.7, pitch: -1100 }]],
};

export class MageFX {
  constructor(scene) {
    this.scene = scene;
    this.walls = new Map(); // barrier -> its view
    const ev = scene.world.events;
    const isMage = (f) => f?.stats?.archetype === 'mage';

    ev.on('attackStart', ({ fighter, state }) => {
      if (isMage(fighter) && ['light1', 'light2', 'light3', 'airAttack'].includes(state)) this.sound('staffSwing', fighter);
    });
    ev.on('jump', ({ fighter }) => { if (isMage(fighter)) this.pulse(fighter.x, fighter.z, 4, 0xffa040, 26); });
    ev.on('hit', (e) => {
      if (!isMage(e.attacker)) return;
      const fx = e.move.fx;
      if (fx === 'staff' || fx === 'pulse') {
        this.sound('staffImpact', e.attacker);
        this.scene.gore.spark(e.x, e.z, e.h, 0xffb050, 6);
        if (fx === 'pulse') this.pulse(e.attacker.x + e.attacker.facing * 60, e.attacker.z, 2, 0xffd890, 70);
      }
    });
    ev.on('block', (e) => { if (isMage(e.defender)) this.ward(e.defender, false); });
    ev.on('parry', (e) => { if (isMage(e.defender)) this.ward(e.defender, true); });

    ev.on('boltCharge', ({ fighter }) => this.sound('boltCharge', fighter));
    ev.on('boltChargeFull', ({ fighter }) => { this.sound('magicBlock', fighter); this.flashAt(this.staffTip(fighter), 0xffd890, 18); });
    ev.on('boltCast', ({ fighter, plan, charged }) => {
      this.sound('boltCast', fighter);
      if (!plan.hits.length) this.bolt(this.staffTip(fighter), { x: plan.end.x, y: plan.end.z - plan.end.h }, fighter.z, charged, 0.6);
    });
    ev.on('lightningArc', (a) => this.arc(a));
    ev.on('forceBlast', (b) => this.force(b));
    ev.on('forceCharge', ({ fighter }) => this.sound('boltCharge', fighter));
    ev.on('forceChargeFull', ({ fighter }) => { this.sound('magicBlock', fighter); this.flashAt({ x: fighter.x + fighter.facing * 20, y: fighter.z - 70 }, 0xeef0ff, 16); });
    ev.on('blinkOut', ({ fighter, x, z }) => { this.sound('blinkOut', fighter); this.blinkPuff(x, z, fighter, true); });
    ev.on('blinkIn', ({ fighter, x, z }) => { this.sound('blinkIn', fighter); this.blinkPuff(x, z, fighter, false); });
    ev.on('wardSlam', ({ fighter }) => this.sound('barrierCast', fighter));

    ev.on('barrierUp', ({ barrier }) => this.wallUp(barrier));
    ev.on('barrierDown', ({ barrier, broken }) => this.wallDown(barrier, broken));
    ev.on('barrierGone', ({ barrier }) => { this.walls.get(barrier)?.destroy(); this.walls.delete(barrier); });
    ev.on('barrierHit', (e) => {
      this.sound('earthHit', e.by);
      this.walls.get(e.barrier)?.cracked(e);
    });

    ev.on('finisherBeat', (b) => this.finisher(b));
  }

  // ------------------------------------------------------------ helpers

  sound(name, near) {
    const loud = !near || near.team === 'player' ? 1 : 0.5;
    for (const [key, o] of MAGE_SOUNDS[name] ?? []) playSfx(this.scene, key, { spread: 120, minGapMs: 40, ...o, volume: (o.volume ?? 1) * loud });
  }

  // the lantern on his staff: where his painted pose has it marked, else about where it
  // sits when he thrusts the staff out to cast
  staffTip(f) {
    const p = this.scene.views?.get(f.id)?.staffTip?.();
    if (p) return p;
    return { x: f.x + f.facing * 30, y: f.z - f.h - (f.stats.hover?.height ?? 0) - 86 };
  }

  flashAt(p, color, r) {
    const c = this.scene.add.circle(p.x, p.y, r, color, 0.7).setDepth(DEPTH.popups - 4).setBlendMode(ADD());
    this.scene.tweens.add({ targets: c, scale: 1.8, alpha: 0, duration: 160, onComplete: () => c.destroy() });
  }

  // a flat ring spreading over the floor
  pulse(x, z, h, color, r) {
    const ring = this.scene.add.ellipse(x, z - h, 10, 4).setStrokeStyle(2, color, 0.9).setDepth(z + 0.5).setBlendMode(ADD());
    this.scene.tweens.add({ targets: ring, scaleX: r / 5, scaleY: r / 7, alpha: 0, duration: 260, ease: 'Cubic.easeOut', onComplete: () => ring.destroy() });
  }

  // a rune ripple round the staff on a block; brighter, with a pulse, on a parry
  ward(f, parry) {
    this.sound(parry ? 'magicBlock' : 'staffBlock', f);
    const x = f.x + f.facing * 16;
    const y = f.z - f.h - 70;
    const ring = this.scene.add.ellipse(x, y, 20, 46).setStrokeStyle(parry ? 3 : 2, 0xffb050, 0.9).setDepth(f.z + 1).setBlendMode(ADD());
    this.scene.tweens.add({ targets: ring, scaleX: parry ? 2.4 : 1.6, scaleY: parry ? 1.6 : 1.2, alpha: 0, duration: parry ? 320 : 200, onComplete: () => ring.destroy() });
    this.scene.gore.spark(x, f.z, f.h + 70, parry ? 0xffe0a0 : 0xffa040, parry ? 16 : 7);
  }

  // A jagged lightning line a -> b (screen points), redrawn jagged every other frame
  // while it fades; forks off the main line.
  bolt(a, b, z, charged, life = 1) {
    const g = this.scene.add.graphics().setDepth(Math.max(z, 0) + 2).setBlendMode(ADD());
    const n = 12;
    const frames = Math.round((charged ? 14 : 10) * life);
    const draw = (k) => {
      g.clear();
      const pts = [a];
      const dx = b.x - a.x; const dy = b.y - a.y;
      const len = Math.hypot(dx, dy) || 1;
      const nx = -dy / len; const ny = dx / len;
      for (let i = 1; i < n; i++) {
        const t = i / n;
        const off = rand(-1, 1) * Math.min(18, len * 0.08) * Math.sin(t * Math.PI);
        pts.push({ x: a.x + dx * t + nx * off, y: a.y + dy * t + ny * off });
      }
      pts.push(b);
      const w = (charged ? 1.5 : 1) * k;
      for (const [width, color, alpha] of [[7 * w, 0xff7020, 0.25], [3.5 * w, 0xffc070, 0.75], [1.4 * w, 0xffffff, 1]]) {
        g.lineStyle(width, color, alpha * k);
        g.beginPath(); g.moveTo(pts[0].x, pts[0].y);
        for (const q of pts) g.lineTo(q.x, q.y);
        g.strokePath();
      }
      // forks
      for (let f = 0; f < (charged ? 3 : 2); f++) {
        const s = pts[1 + Math.floor(Math.random() * (n - 2))];
        const ang = Math.atan2(dy, dx) + rand(-1.2, 1.2);
        const l = rand(10, 26);
        const m = { x: s.x + Math.cos(ang) * l * 0.5 + rand(-4, 4), y: s.y + Math.sin(ang) * l * 0.5 + rand(-4, 4) };
        const e = { x: s.x + Math.cos(ang) * l, y: s.y + Math.sin(ang) * l };
        g.lineStyle(1.3 * w, 0xffd090, 0.8 * k);
        g.beginPath(); g.moveTo(s.x, s.y); g.lineTo(m.x, m.y); g.lineTo(e.x, e.y); g.strokePath();
      }
    };
    this.scene.everyTick(frames, (t) => {
      if (!g.active) return false;
      if (t % 2 === 1) draw(1 - t / frames);
      if (t >= frames - 1) g.destroy();
      return true;
    });
    draw(1);
  }

  // One jump of the chain: from the staff (or the last body) into this one.
  arc({ caster, from, to, gen, charged, stage = 1 }) {
    const chest = (f) => ({ x: f.x, y: f.z - f.h - f.stats.body.h * 0.62 });
    const a = from ? chest(from) : this.staffTip(caster);
    const b = chest(to);
    const big = stage === 3;
    this.bolt(a, b, to.z, charged || big, 1 + (stage - 1) * 0.35);
    if (big && gen === 0) this.bolt(a, b, to.z, true, 1.4); // the finale: a double bolt
    this.sound(gen === 0 ? 'boltImpact' : 'boltJump', caster);
    if (gen === 0) this.sound(big ? 'storm' : 'staffImpact', caster); // a heavy crack under the zap: it BITES
    this.flashAt(b, 0xffe0b0, (gen === 0 ? 16 : 11) + stage * 4);
    this.scene.gore.spark(to.x, to.z, to.h + to.stats.body.h * 0.6, 0xffd890, (gen === 0 ? 14 : 8) + stage * 6);
    if (gen === 0 && stage > 1) this.pulse(to.x, to.z, 2, 0xffd890, 40 + stage * 20);
    if (big && gen === 0) { this.scene.cameras.main.flash(70, 255, 220, 170); this.scene.rumble(1, 0.9, 180); }
    // the light of it on the floor under him, and a curl of smoke
    this.pulse(to.x, to.z, 1, 0xff9040, 30);
    this.scene.burning?.puff?.(to.x, to.z, to.h + to.stats.body.h * 0.7, 0.4);
    if (gen === 0) this.scene.fx.shake((charged ? 5 : 3) + stage * 3, 8 + stage * 2);
  }

  // The force blast: no glowing ball — pressure. Arcs of distorted air rolling out of the
  // palm through the cone, a sheet of dust blasted off the floor, a few runes at the hand.
  force({ fighter: f, x, z, dir, radius, angle, level = 0 }) {
    this.sound('force', f);
    if (level >= 1) this.sound('earthUp', f);
    this.scene.fx.shake(5 + level * 6, 10 + level * 6);
    if (level >= 1) this.scene.rumble(0.9, 0.6, 160);
    const half = (angle / 2) * Math.PI / 180;
    const hy = z - f.h - (f.stats.hover?.height ?? 0) - 62;
    for (let i = 0; i < 3; i++) {
      const g = this.scene.add.graphics().setDepth(z + 1).setBlendMode(ADD());
      let r = 18;
      this.scene.everyTick(16, (t) => {
        if (!g.active) return false;
        r += (radius - r) * 0.22;
        const k = 1 - t / 16;
        g.clear();
        g.lineStyle(5 - i, 0xeef0ff, 0.28 * k);
        g.beginPath();
        g.arc(x + dir * 30, hy + 4, r * (1 - i * 0.18), dir > 0 ? -half : Math.PI - half, dir > 0 ? half : Math.PI + half);
        g.strokePath();
        g.lineStyle(1.5, 0xffc080, 0.35 * k);
        g.beginPath();
        g.arc(x + dir * 30, hy + 4, r * (1 - i * 0.18) - 4, dir > 0 ? -half * 0.8 : Math.PI - half * 0.8, dir > 0 ? half * 0.8 : Math.PI + half * 0.8);
        g.strokePath();
        if (t >= 15) g.destroy();
        return true;
      });
    }
    // dust blasted outward along the floor through the cone
    for (let i = 0; i < 26; i++) {
      const a = rand(-half, half);
      const s = rand(260, 620);
      this.scene.gore.spawn({
        x: x + dir * rand(20, 50), z: z + Math.sin(a) * rand(4, 30), h: rand(2, 40),
        vx: dir * Math.cos(a) * s, vz: Math.sin(a) * s * 0.4, vh: rand(20, 140),
        tint: Math.random() < 0.7 ? 0x8a7a60 : 0xd8d0c0, scale: rand(0.4, 0.9), decal: false, life: Math.floor(rand(14, 26)),
      });
    }
    this.scene.gore.spark(x + dir * 34, z, f.h + 70, 0xffd0a0, 8);
  }

  // Sparks and a puff of smoke where he broke apart / re-formed; a fading afterimage.
  blinkPuff(x, z, f, out) {
    const h = (f.stats.hover?.height ?? 0) + 50;
    this.scene.gore.spark(x, z, h, 0xffa040, out ? 18 : 12);
    this.scene.gore.spark(x, z, h, 0x8a9cff, out ? 10 : 6);
    for (let i = 0; i < 4; i++) this.scene.burning?.puff?.(x + rand(-14, 14), z, h + rand(-30, 30), 0.35);
    if (out) {
      // the collapsing outline of where he stood
      const ghost = this.scene.add.ellipse(x, z - h, 36, 104, 0x7a8cff, 0.22).setDepth(z + 0.5).setBlendMode(ADD());
      this.scene.tweens.add({ targets: ghost, scaleX: 0.1, scaleY: 1.15, alpha: 0, duration: 220, ease: 'Cubic.easeIn', onComplete: () => ghost.destroy() });
    } else this.pulse(x, z, 2, 0xffc070, 34);
  }

  // ------------------------------------------------------------ barriers

  wallUp(b) {
    this.sound(b.kind === 'fire' ? 'fireWall' : 'earthUp', b.owner);
    this.scene.fx.shake(b.kind === 'fire' ? 4 : 7, 14);
    const v = b.kind === 'fire' ? new FireWallView(this.scene, b) : new EarthWallView(this.scene, b);
    this.walls.set(b, v);
  }

  wallDown(b, broken) {
    if (b.kind === 'earth') this.sound(broken ? 'earthBreak' : 'earthDown', b.owner);
    this.walls.get(b)?.collapse(broken);
  }

  update() {
    for (const v of this.walls.values()) v.update();
  }

  // ------------------------------------------------------------ finishers

  finisher(b) {
    const { type, victim: v, attacker: f } = b;
    const s = this.scene;
    const chest = (q) => ({ x: q.x, y: q.z - q.h - q.stats.body.h * 0.6 });
    switch (type) {
      case 'stormLock':
        for (const t of b.targets) this.bolt(this.staffTip(f), chest(t), t.z, false, 0.7);
        this.sound('boltCast', f);
        s.slowmo(0.6, 300);
        break;
      case 'stormGather': {
        // the storm building in the lantern: arcs crackling out of the staff's tip
        // (re-measured each time: the staff rises while it builds)
        s.everyTick(30, (t) => {
          if (t % 3 !== 0) return true;
          const tip = this.staffTip(f);
          const a = rand(-Math.PI, 0);
          const l = rand(30, 60);
          this.bolt(tip, { x: tip.x + Math.cos(a) * l, y: tip.y + Math.sin(a) * l * 0.8 }, f.z, false, 0.35);
          if (t % 9 === 0) this.flashAt(tip, 0xffd890, 10);
          return true;
        });
        this.sound('boltCharge', f);
        break;
      }
      case 'stormStrike': {
        const c = chest(v);
        if (b.main) {
          // the colossal bolt, loosed from the staff's tip: the lantern is the source
          const tip = this.staffTip(f);
          this.bolt(tip, c, v.z, true, 1.6);
          this.bolt(tip, { x: v.x, y: v.z - v.h - 4 }, v.z, true, 1.2);
          this.flashAt(tip, 0xffe0b0, 22);
          s.cameras.main.flash(90, 255, 230, 190);
          s.fx.shake(10, 18);
          s.rumble(1, 1, 220);
          s.slowmo(0.35, 380);
          this.sound('storm', f);
          s.callout('STORM JUDGMENT', '#ffd890', 26);
        } else {
          this.bolt(chest(b.from), c, v.z, true, 1); // forking on through the others
          this.sound('boltJump', f);
        }
        this.pulse(v.x, v.z, 1, 0xffc070, 60);
        s.gore.spark(c.x, v.z, v.h + v.stats.body.h * 0.6, 0xffffff, 20);
        s.gore.scorch?.(v.x, v.z, true);
        s.burning.ignite(v, 'fighter', 0.85);
        break;
      }
      case 'rupturePull':
        this.sound('blinkOut', f);
        s.slowmo(0.7, 260);
        break;
      case 'ruptureCage':
        for (const t of b.targets) this.cage(t, f);
        this.sound('magicBlock', f);
        break;
      case 'ruptureCrush':
        this.sound('boltCharge', f);
        break;
      case 'ruptureBurst': {
        // stored pressure let go: he comes apart (effects/Dismember.js 'explode')
        const view = s.views.get(v.id);
        s.gore.onKill({ attacker: f, defender: v, dir: f.facing, move: { cut: 'crush', damage: 999 }, x: v.x, z: v.z, h: v.h + v.stats.body.h * 0.5, damage: 999, fatality: 'explode' }, view);
        s.gore.mist?.(v.x, v.z, v.h + 50, 10);
        this.flashAt(chest(v), 0xffd0a0, 26);
        this.pulse(v.x, v.z, v.h + 40, 0xffc070, 80);
        s.fx.shake(b.last ? 10 : 6, 14);
        s.rumble(0.9, 0.7, 160);
        this.sound('rupture', f);
        if (b.last) { s.slowmo(0.35, 300); s.callout('ARCANE RUPTURE', '#ffd890', 26); }
        break;
      }
      case 'embersVanish':
        this.sound('blinkOut', f);
        this.blinkPuff(b.x, b.z, f, true);
        break;
      case 'embersArrive':
        this.sound('blinkIn', f);
        this.blinkPuff(b.x, b.z, f, false);
        break;
      case 'embersSlam':
        this.sound('barrierCast', f);
        s.fx.shake(4, 8);
        for (const t of b.targets) this.sigilCircle(t);
        break;
      case 'embersErupt': {
        this.flameColumn(v);
        s.burning.ignite(v, 'fighter', 0.9);
        if (b.main) { this.sound('embers', f); s.fx.shake(7, 16); s.rumble(0.8, 0.6, 200); s.callout('GATE OF EMBERS', '#ff9a40', 26); }
        break;
      }
      default:
    }
  }

  // a ring of runes holding a body in the air (rupture), closing as it's crushed
  cage(v, f) {
    const g = this.scene.add.graphics().setBlendMode(ADD());
    this.scene.everyTick(80, (t) => {
      if (!g.active) return false;
      if (v.state !== 'executed' || v.health <= 0) { g.destroy(); return false; }
      const c = v.ruptureCrush ?? 0;
      const x = v.x; const y = v.z - v.h - v.stats.body.h * 0.5;
      const r = (34 - c * 18);
      g.clear().setDepth(v.z + 1);
      g.lineStyle(2, 0xffb050, 0.75).strokeEllipse(x, y, r * 1.5, r * 2.3);
      g.lineStyle(1, 0xffe0a0, 0.6).strokeEllipse(x, y, r * 1.1, r * 1.8);
      for (let i = 0; i < 8; i++) {
        const a = i * Math.PI / 4 + t * 0.05;
        const px = x + Math.cos(a) * r * 0.75; const py = y + Math.sin(a) * r * 1.15;
        g.fillStyle(0xffd890, 0.9).fillRect(px - 1.5, py - 3, 3, 6);
      }
      return true;
    });
  }

  // the gate's circle on the floor under a runner
  sigilCircle(v) {
    const g = this.scene.add.graphics().setDepth(DEPTH.decals + 1).setBlendMode(ADD());
    this.scene.everyTick(70, (t) => {
      if (!g.active) return false;
      const k = t < 8 ? t / 8 : t > 55 ? (70 - t) / 15 : 1;
      g.clear();
      g.lineStyle(2.5, 0xff7a20, 0.8 * k).strokeEllipse(v.x, v.z, 70, 22);
      g.lineStyle(1.5, 0xffc060, 0.7 * k).strokeEllipse(v.x, v.z, 50, 15);
      for (let i = 0; i < 10; i++) {
        const a = i * Math.PI / 5 + t * 0.04;
        g.fillStyle(0xffd890, 0.8 * k).fillRect(v.x + Math.cos(a) * 30 - 1, v.z + Math.sin(a) * 9.5 - 1, 2, 2);
      }
      if (t >= 69) g.destroy();
      return true;
    });
  }

  // flames tearing up out of the gate around and through a body
  flameColumn(v) {
    const imgs = Array.from({ length: 7 }, () => this.scene.add.image(v.x, v.z, 'burn-flame').setOrigin(0.5, 1).setBlendMode(ADD()));
    this.scene.everyTick(44, (t) => {
      const grow = t < 6 ? t / 6 : t > 30 ? (44 - t) / 14 : 1;
      imgs.forEach((img, i) => {
        if (!img.active) return;
        const off = (i - 3) * 9 + Math.sin(t * 0.7 + i) * 3;
        const hgt = (90 + Math.sin(t * 0.9 + i * 1.7) * 18 - Math.abs(i - 3) * 12) * grow;
        img.setPosition(v.x + off, v.z + 2).setDisplaySize(14 + grow * 8, Math.max(4, hgt)).setDepth(v.z + 1).setAlpha(0.9 * grow);
      });
      if (t % 4 === 0) this.scene.gore.spawn({ x: v.x + rand(-20, 20), z: v.z, h: rand(10, 80), vx: rand(-30, 30), vz: 0, vh: rand(150, 300), tint: 0xffb040, scale: rand(0.2, 0.35), decal: false, life: 24 });
      if (t >= 43) imgs.forEach((img) => img.destroy());
      return true;
    });
  }

  destroy() { for (const v of this.walls.values()) v.destroy(); this.walls.clear(); }
}

// ---------------------------------------------------------------- the walls

// The Infernal Wall: a ragged line of tall flames from the back of the lane to the front,
// each tongue on its own rhythm and height (never one stretched sheet), with embers,
// smoke and an orange glow on the floor along it.
class FireWallView {
  constructor(scene, b) {
    this.scene = scene;
    this.b = b;
    const bd = scene.world.bounds;
    this.z0 = bd.minZ - 14;
    this.z1 = bd.maxZ + 10;
    this.n = Math.round((this.z1 - this.z0) / 7);
    this.flames = Array.from({ length: this.n * 2 }, () => scene.add.image(0, 0, 'burn-flame').setOrigin(0.5, 1).setBlendMode(ADD()));
    this.seeds = this.flames.map(() => Math.random() * 100);
    this.glow = scene.add.graphics().setDepth(DEPTH.decals + 2).setBlendMode(ADD());
    this.t = 0;
    this.rise = 0;
    this.fall = -1;
  }

  collapse() { this.fall = 0; }

  update() {
    const b = this.b;
    this.t++;
    this.rise = Math.min(1, this.rise + 0.12);
    if (this.fall >= 0) this.fall++;
    const k = this.fall >= 0 ? Math.max(0, 1 - this.fall / Math.max(1, b.collapse)) : this.rise;
    this.flames.forEach((img, i) => {
      const row = i % this.n;
      const z = this.z0 + (row + (i >= this.n ? 0.5 : 0)) * ((this.z1 - this.z0) / this.n);
      const s = this.seeds[i];
      const hgt = (70 + 50 * Math.abs(Math.sin(s)) + Math.sin(this.t * 0.35 + s) * 16 + Math.sin(this.t * 1.1 + s * 3) * 6) * k;
      img.setPosition(b.x + Math.sin(s * 2) * b.half * 0.6 + Math.sin(this.t * 0.2 + s) * 2, z)
        .setDisplaySize(16 + Math.sin(s * 5) * 5, Math.max(2, hgt)).setDepth(z + 0.8).setAlpha(0.95 * Math.min(1, k * 1.4));
    });
    this.glow.clear();
    this.glow.fillStyle(0xff6a1a, 0.18 * k).fillRect(b.x - b.half * 2.2, this.z0 + 8, b.half * 4.4, this.z1 - this.z0 - 8);
    this.glow.fillStyle(0xffb050, 0.16 * k).fillRect(b.x - b.half * 0.8, this.z0 + 8, b.half * 1.6, this.z1 - this.z0 - 8);
    const gore = this.scene.gore;
    if (k > 0.1 && this.t % 2 === 0) {
      gore.spawn({ x: b.x + rand(-b.half, b.half), z: rand(this.z0, this.z1), h: rand(20, 110), vx: rand(-30, 30), vz: 0, vh: rand(120, 260), tint: Math.random() < 0.5 ? 0xffb040 : 0xff5a10, scale: rand(0.18, 0.32), decal: false, life: Math.floor(rand(18, 34)) });
    }
    if (this.t % 6 === 0) this.scene.burning?.puff?.(b.x + rand(-10, 10), rand(this.z0, this.z1), rand(80, 130) * k, 0.4 * k);
  }

  destroy() { for (const f of this.flames) f.destroy(); this.glow.destroy(); }
}

// The Earthen Bulwark. A crack tears across the floor from the Mage's staff, then the
// stone punches up out of it in a wave — each slab overshooting its height and settling,
// throwing rock and a skirt of dust as it breaks the surface — and locks into a wall. The
// magic is in the painted stone itself (its glowing veins): nothing is drawn over it.
// Struck, the wall jolts away from the blow, the stone round the impact flashes, chips of
// rock and a puff of grit burst out of the struck face, and the slabs there are knocked
// shorter; the weaker it gets the darker it goes (a health bar shows how much is left).
// Broken, its slabs topple and sink in a cloud of dust and rubble; run out of time, it
// sinks back into the floor.
// Painted slabs (FX_STRIPS.earthwall: assets/fx/earthwall-strip.png) are used when they
// exist; until then each slab is drawn as a jagged rock.

const DUST = 0x4e463e;      // grit and dust clouds
const CHIPS = [0xffffff, 0xe0dcd4, 0xc8ccce]; // tints over the grey 'rockchip'
const WORN = 0x5e6264;      // what the stone darkens towards as it is battered

const mix = (a, b, t) => {
  const c = (s) => Math.round(((a >> s) & 255) + (((b >> s) & 255) - ((a >> s) & 255)) * t);
  return (c(16) << 16) | (c(8) << 8) | c(0);
};
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

// a flake of grey stone (tinted per chip), drawn once
function rockChipTex(scene) {
  if (scene.textures.exists('rockchip')) return;
  const g = scene.make.graphics({ add: false });
  g.fillStyle(0x121416, 1).fillPoints([{ x: 0, y: 6 }, { x: 5, y: 0 }, { x: 13, y: 2 }, { x: 15, y: 7 }, { x: 9, y: 11 }, { x: 2, y: 10 }], true);
  g.fillStyle(0x3e4448, 1).fillPoints([{ x: 1, y: 6 }, { x: 5, y: 1 }, { x: 12, y: 3 }, { x: 14, y: 7 }, { x: 9, y: 10 }, { x: 3, y: 9 }], true);
  g.fillStyle(0x6a7276, 1).fillPoints([{ x: 2, y: 6 }, { x: 5, y: 2 }, { x: 11, y: 3 }, { x: 8, y: 6 }], true);
  g.fillStyle(0x262a2c, 1).fillPoints([{ x: 8, y: 6 }, { x: 11, y: 3 }, { x: 14, y: 7 }, { x: 9, y: 10 }], true);
  g.generateTexture('rockchip', 16, 12);
  g.destroy();
}

class EarthWallView {
  constructor(scene, b) {
    this.scene = scene;
    this.b = b;
    rockChipTex(scene);
    const bd = scene.world.bounds;
    this.z0 = bd.minZ - 12;
    this.z1 = bd.maxZ + 8;
    this.zc = Math.max(this.z0, Math.min(this.z1, b.owner?.z ?? (this.z0 + this.z1) / 2)); // where the crack starts
    this.art = FX.earthwall ?? null;
    this.slabs = [];
    let k = 0;
    for (let z = this.z0; z < this.z1; z += rand(9, 14)) {
      const h = rand(88, 132);
      const w = b.half * rand(1.7, 2.5);
      const pts = [];
      const n = 6;
      for (let i = 0; i <= n; i++) pts.push({ x: -w / 2 + (w * i) / n + rand(-2, 2), y: -h + Math.abs(Math.sin(i * 1.9 + z)) * 18 * (i % 2 ? 1 : 0.4) });
      // erupts when the crack reaches it
      const delay = 6 + Math.round((Math.abs(z - this.zc) / Math.max(1, this.z1 - this.z0)) * 14) + Math.floor(rand(0, 3));
      const slab = {
        z, h, w, pts, off: rand(-4, 4), tone: Math.floor(rand(0, 3)), delay, crack: rand(0.2, 0.8), lean: rand(-0.06, 0.06),
        burst: false, chip: 0, flash: 0, topple: 0,
      };
      if (this.art) {
        slab.img = scene.add.image(0, 0, this.art.key, `f${k++ % this.art.count}`).setOrigin(0.5, 1).setVisible(false);
        if (Math.random() < 0.5) slab.img.setFlipX(true);
      }
      this.slabs.push(slab);
    }
    this.parts = this.slabs.map(() => scene.add.graphics());
    // the crack in the floor: a jagged line each way from where the stone starts
    this.fissure = [-1, 1].map((dir) => {
      const pts = [];
      let dx = 0;
      for (let d = 0; ; d += 7) {
        const z = this.zc + dir * d;
        if (z < this.z0 - 4 || z > this.z1 + 4) break;
        dx = Math.max(-7, Math.min(7, dx + rand(-4, 4)));
        pts.push({ x: b.x + dx, z, d, w: rand(2, 4.5) });
      }
      return pts;
    });
    this.crackG = scene.add.graphics().setDepth(DEPTH.decals + 3);
    this.bar = scene.add.graphics().setDepth(DEPTH.popups - 6);
    this.t = 0;
    this.fall = -1;
    this.broken = false;
    this.jolt = { t: 99, dir: 1, power: 0, z: 0 };
    this.shown = 1;
  }

  // a cloud of dust or grit that swells, drifts and thins out
  dust(x, z, h, size, { vx = 0, rise = 16, alpha = 0.5, life = 650 } = {}) {
    const img = this.scene.add.image(x, z - h, 'soft').setTint(DUST).setAlpha(alpha)
      .setScale(size / 64).setDepth(z + 1.5);
    this.scene.tweens.add({
      targets: img, x: x + vx, y: z - h - rise, scale: (size * rand(2, 2.6)) / 64, alpha: 0,
      duration: life * rand(0.85, 1.15), ease: 'Cubic.easeOut', onComplete: () => img.destroy(),
    });
  }

  // a chip of stone flung off the wall
  chip(x, z, h, vx, vh, scale = 1, life = 40) {
    this.scene.gore.spawn({ x, z, h, vx, vz: rand(-30, 30), vh, tint: pick(CHIPS), scale: scale * rand(0.6, 1.3), decal: false, life: Math.floor(life * rand(0.8, 1.2)), texture: 'rockchip', spin: rand(-14, 14) });
  }

  // Struck: e = the barrierHit event (x = the struck face, z = the striker's lane).
  cracked(e) {
    const b = this.b;
    const out = Math.sign(e.x - b.x) || 1; // towards whoever struck it
    const power = Math.max(0.5, Math.min(2, (e.damage ?? 10) / 18));
    this.jolt = { t: 0, dir: -out, power, z: e.z };
    for (const s of this.slabs) {
      const near = 1 - Math.abs(s.z - e.z) / 44;
      if (near <= 0) continue;
      s.flash = Math.max(s.flash, 0.5 + 0.5 * near);
      s.chip = Math.min(0.3, s.chip + rand(0.02, 0.05) * power * near);
    }
    // a hard white crack of light where it landed
    const fl = this.scene.add.image(e.x, e.z - e.h, 'soft').setTint(0xfff0d8).setBlendMode(ADD())
      .setScale(0.5 * power).setDepth(e.z + 2);
    this.scene.tweens.add({ targets: fl, scale: 1.1 * power, alpha: 0, duration: 120, onComplete: () => fl.destroy() });
    // stone bursts back off the struck face, grit puffs out and trickles down from the top
    const n = Math.round(6 + 7 * power);
    for (let i = 0; i < n; i++) this.chip(e.x, e.z + rand(-6, 6), e.h + rand(-20, 30), out * rand(60, 320) * power, rand(40, 340), 0.8 + power * 0.3);
    if (power > 1.1) for (let i = 0; i < 2; i++) this.chip(e.x, e.z, e.h + rand(-10, 20), out * rand(80, 200), rand(120, 260), 2.2, 55);
    for (let i = 0; i < 3; i++) this.dust(e.x + out * rand(0, 10), e.z + rand(-4, 4), e.h + rand(-20, 25), rand(26, 40) * power, { vx: out * rand(14, 40), rise: rand(4, 18), alpha: 0.55 });
    for (let i = 0; i < 4; i++) this.chip(b.x + rand(-b.half, b.half), e.z + rand(-10, 10), rand(95, 125), rand(-30, 30), rand(0, 60), 0.5, 45);
    this.scene.fx.shake(1.5 * power, 6);
  }

  collapse(broken) {
    this.fall = 0;
    this.broken = !!broken;
    const b = this.b;
    if (broken) {
      // it gives way: slabs keel over and go down in a cloud of rubble
      for (const s of this.slabs) { s.topple = (Math.random() < 0.5 ? -1 : 1) * rand(0.25, 0.7); s.flash = 0.8; }
      for (let i = 0; i < 40; i++) this.chip(b.x + rand(-b.half, b.half), rand(this.z0, this.z1), rand(20, 120), rand(-260, 260), rand(60, 380), rand(0.9, 1.8), 50);
      for (let i = 0; i < 14; i++) this.dust(b.x + rand(-b.half, b.half), rand(this.z0, this.z1), rand(10, 70), rand(50, 80), { vx: rand(-40, 40), rise: rand(10, 30), alpha: 0.6, life: 1100 });
      this.scene.fx.shake(6, 16);
    } else {
      // its time is up: it settles back into the floor
      for (let i = 0; i < 16; i++) this.chip(b.x + rand(-b.half, b.half), rand(this.z0, this.z1), rand(10, 60), rand(-120, 120), rand(30, 200), rand(0.6, 1.2), 30);
      for (let i = 0; i < 10; i++) this.dust(b.x + rand(-b.half * 1.4, b.half * 1.4), rand(this.z0, this.z1), rand(0, 20), rand(36, 56), { vx: rand(-30, 30), rise: rand(4, 14), alpha: 0.45, life: 900 });
    }
  }

  // a slab breaking the surface: stone and dust thrown up round it
  erupt(s) {
    const x = this.b.x + s.off;
    for (let i = 0; i < 5; i++) this.chip(x + rand(-s.w * 0.4, s.w * 0.4), s.z, rand(0, 20), rand(-200, 200), rand(220, 460), rand(0.8, 1.4), 38);
    for (const dir of [-1, 1]) this.dust(x + dir * s.w * 0.4, s.z, 4, rand(30, 44), { vx: dir * rand(20, 46), rise: rand(6, 16), alpha: 0.5 });
  }

  update() {
    const b = this.b;
    this.t++;
    this.jolt.t++;
    if (this.fall >= 0) this.fall++;
    const tones = [[0x485058, 0x68727a, 0x2c3236], [0x40484c, 0x5e686c, 0x262c2e], [0x4e5650, 0x707a72, 0x30362f]];
    const tints = [0xc8d0d0, 0xb0b8b8, 0xd8e0e0];
    const dmg = b.maxHp > 0 ? 1 - b.hp / b.maxHp : 0;
    const J = this.jolt;
    const shove = J.t < 24 ? J.dir * 5 * J.power * Math.exp(-J.t / 5) * Math.cos(J.t * 1.3) : 0;

    // the crack in the floor, torn open ahead of the stone, closing as the wall goes
    const cg = this.crackG.clear();
    const reach = Math.min(1, this.t / 10) * (this.z1 - this.z0);
    const open = this.fall >= 0 ? Math.max(0, 1 - this.fall / 24) : 1;
    if (open > 0) {
      for (const pts of this.fissure) {
        const shown = pts.filter((q) => q.d <= reach);
        if (shown.length < 2) continue;
        cg.lineStyle(5, 0x14100c, 0.55 * open).beginPath(); cg.moveTo(shown[0].x, shown[0].z);
        for (const q of shown) cg.lineTo(q.x, q.z);
        cg.strokePath();
        for (let i = 1; i < shown.length; i++) {
          const p = shown[i - 1]; const q = shown[i];
          cg.lineStyle(q.w, 0x030202, 0.9 * open).lineBetween(p.x, p.z, q.x, q.z);
        }
        // grit kicked up at its tip as it runs
        const tip = shown[shown.length - 1];
        if (this.t <= 10 && this.t % 2 === 0) this.dust(tip.x, tip.z, 2, rand(20, 30), { vx: rand(-14, 14), rise: rand(6, 14), alpha: 0.45, life: 500 });
      }
    }

    this.slabs.forEach((s, i) => {
      const g = this.parts[i];
      const since = this.t - s.delay;
      // up out of the ground with a punch past its height, then settling (ease out back)
      const u = Math.min(1, Math.max(0, since / 8));
      const up = u <= 0 ? 0 : 1 + 2.70158 * (u - 1) ** 3 + 1.70158 * (u - 1) ** 2;
      if (since === 1 && !s.burst) { s.burst = true; this.erupt(s); }
      if (since === 8) s.flash = Math.max(s.flash, 0.45); // the magic flares as it locks in
      const down = this.fall >= 0 ? Math.min(1, Math.max(0, (this.fall - s.delay * 0.4) / (b.collapse * 0.7))) : 0;
      const k = Math.max(0, up) * (1 - down) * (1 - s.chip);
      s.flash *= 0.82;
      g.clear().setDepth(s.z + 0.6);
      if (s.img) s.img.setVisible(false);
      if (s.fl) s.fl.setVisible(false);
      if (k <= 0) return;
      const near = Math.max(0.35, 1 - Math.abs(s.z - J.z) / 60);
      const x = b.x + s.off + shove * near + (since < 8 ? rand(-1.5, 1.5) : 0) + (this.fall >= 0 ? rand(-1, 1) * down * 3 : 0);
      const y = s.z + down * (this.broken ? 14 : 6);
      const tilt = s.lean * (1 - u) + s.topple * down + shove * near * 0.004;
      if (s.img) {
        // painted slab: rises out of the floor (the part still underground is cut off by
        // drawing it shorter from the bottom up)
        const art = this.art;
        const sc = s.h / art.fh;
        const sx = Math.max(sc * 0.6, (s.w * 1.2) / art.fw);
        s.img.setVisible(true).setPosition(x, y).setDepth(s.z + 0.6).setScale(sx, sc * k)
          .setRotation(tilt).setTint(mix(tints[s.tone], WORN, dmg * 0.75)).setAlpha(1);
        if (s.flash > 0.03) {
          s.fl ??= this.scene.add.image(0, 0, art.key, s.img.frame.name).setOrigin(0.5, 1).setBlendMode(ADD()).setFlipX(s.img.flipX);
          s.fl.setVisible(true).setPosition(x, y).setDepth(s.z + 0.62).setScale(sx, sc * k).setRotation(tilt)
            .setTint(0xffeedd).setAlpha(s.flash * 0.6);
        }
      } else {
        const [base, light, dark] = tones[s.tone].map((c) => mix(c, 0x24282a, dmg * 0.5));
        const P = s.pts.map((q) => ({ x: x + q.x, y: y + q.y * k }));
        const poly = [{ x: x - s.w / 2, y }, ...P, { x: x + s.w / 2, y }];
        g.fillStyle(0x080a0c, 1);
        g.beginPath(); g.moveTo(poly[0].x, poly[0].y); for (const q of poly) g.lineTo(q.x - 1, q.y - 1); g.closePath(); g.fillPath();
        g.fillStyle(base, 1);
        g.beginPath(); g.moveTo(poly[0].x, poly[0].y); for (const q of poly) g.lineTo(q.x, q.y); g.closePath(); g.fillPath();
        g.fillStyle(light, 1).fillTriangle(P[0].x, P[0].y, P[2].x, P[2].y, x - s.w * 0.1, y - s.h * 0.3 * k);
        g.fillStyle(dark, 0.6).fillRect(x + s.w * 0.15, y - s.h * 0.6 * k, s.w * 0.35, s.h * 0.6 * k);
        if (s.flash > 0.03) {
          g.fillStyle(0xfff0e0, s.flash * 0.45);
          g.beginPath(); g.moveTo(poly[0].x, poly[0].y); for (const q of poly) g.lineTo(q.x, q.y); g.closePath(); g.fillPath();
        }
        // cracks, as it is battered
        if (dmg >= 0.25) { g.lineStyle(1.2, 0x0e1214, 1); g.lineBetween(x - s.w * 0.3, y - s.h * s.crack * k, x + s.w * 0.2, y - s.h * (s.crack - 0.2) * k); }
        if (dmg >= 0.5) { g.lineStyle(1.6, 0x0e1214, 1); g.lineBetween(x + s.w * 0.25, y - s.h * 0.9 * k, x - s.w * 0.1, y - s.h * 0.2 * k); }
      }
    });

    // its health, over the top of the wall (only once it's been hit)
    const bar = this.bar.clear();
    this.shown += ((b.maxHp > 0 ? b.hp / b.maxHp : 1) - this.shown) * 0.15;
    if (b.maxHp > 0 && b.hp < b.maxHp && this.fall < 0) {
      const w = 64; const x = b.x - w / 2; const y = this.z0 - 128;
      bar.fillStyle(0x000000, 0.7).fillRect(x - 2, y - 2, w + 4, 8);
      bar.fillStyle(0x7a3a24, 1).fillRect(x, y, w * this.shown, 4);
      bar.fillStyle(0xc8b896, 1).fillRect(x, y, w * Math.max(0, b.hp / b.maxHp), 4);
    }
  }

  destroy() {
    for (const g of this.parts) g.destroy();
    for (const s of this.slabs) { s.img?.destroy(); s.fl?.destroy(); }
    this.crackG.destroy();
    this.bar.destroy();
  }
}
