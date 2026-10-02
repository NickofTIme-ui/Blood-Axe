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
  earthHit: [['block', { volume: 0.5, pitch: -800, minGapMs: 60 }]],
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
    ev.on('blinkOut', ({ fighter, x, z }) => { this.sound('blinkOut', fighter); this.blinkPuff(x, z, fighter, true); });
    ev.on('blinkIn', ({ fighter, x, z }) => { this.sound('blinkIn', fighter); this.blinkPuff(x, z, fighter, false); });
    ev.on('wardSlam', ({ fighter }) => this.sound('barrierCast', fighter));

    ev.on('barrierUp', ({ barrier }) => this.wallUp(barrier));
    ev.on('barrierDown', ({ barrier }) => this.wallDown(barrier));
    ev.on('barrierGone', ({ barrier }) => { this.walls.get(barrier)?.destroy(); this.walls.delete(barrier); });
    ev.on('barrierHit', (e) => {
      this.sound('earthHit', e.by);
      this.scene.gore.spark(e.x, e.z, e.h, 0x9a8a70, 8);
      this.walls.get(e.barrier)?.cracked();
    });

    ev.on('finisherBeat', (b) => this.finisher(b));
  }

  // ------------------------------------------------------------ helpers

  sound(name, near) {
    const loud = !near || near.team === 'player' ? 1 : 0.5;
    for (const [key, o] of MAGE_SOUNDS[name] ?? []) playSfx(this.scene, key, { spread: 120, minGapMs: 40, ...o, volume: (o.volume ?? 1) * loud });
  }

  staffTip(f) {
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
  arc({ caster, from, to, gen, charged }) {
    const chest = (f) => ({ x: f.x, y: f.z - f.h - f.stats.body.h * 0.62 });
    const a = from ? chest(from) : this.staffTip(caster);
    const b = chest(to);
    this.bolt(a, b, to.z, charged);
    this.sound(gen === 0 ? 'boltImpact' : 'boltJump', caster);
    this.flashAt(b, 0xffe0b0, gen === 0 ? 16 : 11);
    this.scene.gore.spark(to.x, to.z, to.h + to.stats.body.h * 0.6, 0xffd890, gen === 0 ? 14 : 8);
    // the light of it on the floor under him, and a curl of smoke
    this.pulse(to.x, to.z, 1, 0xff9040, 30);
    this.scene.burning?.puff?.(to.x, to.z, to.h + to.stats.body.h * 0.7, 0.4);
    if (gen === 0) this.scene.fx.shake(charged ? 5 : 2.5, 6);
  }

  // The force blast: no glowing ball — pressure. Arcs of distorted air rolling out of the
  // palm through the cone, a sheet of dust blasted off the floor, a few runes at the hand.
  force({ fighter: f, x, z, dir, radius, angle }) {
    this.sound('force', f);
    this.scene.fx.shake(5, 10);
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

  wallDown(b) {
    if (b.kind === 'earth') this.sound('earthDown', b.owner);
    this.walls.get(b)?.collapse();
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
        // the storm gathering on the staff: a ring of crackling light drawing inward
        const tip = this.staffTip(f);
        s.everyTick(30, (t) => {
          if (t % 3 === 0) this.bolt({ x: tip.x + rand(-60, 60), y: tip.y + rand(-70, -20) }, tip, f.z, false, 0.35);
          return true;
        });
        this.sound('boltCharge', f);
        break;
      }
      case 'stormStrike': {
        const c = chest(v);
        if (b.main) {
          // the colossal bolt out of the sky
          const top = { x: v.x + rand(-20, 20), y: s.cameras.main.worldView.y - 20 };
          this.bolt(top, { x: v.x, y: v.z - v.h - 4 }, v.z, true, 1.6);
          this.bolt({ x: top.x + 30, y: top.y }, c, v.z, true, 1.2);
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

// The Earthen Bulwark: slabs of broken rock thrust up along the whole lane, glowing seams
// of magic between them, cracking as it's battered, then crumbling down into dust.
class EarthWallView {
  constructor(scene, b) {
    this.scene = scene;
    this.b = b;
    const bd = scene.world.bounds;
    this.z0 = bd.minZ - 12;
    this.z1 = bd.maxZ + 8;
    this.slabs = [];
    for (let z = this.z0; z < this.z1; z += rand(9, 15)) {
      const h = rand(80, 125);
      const w = b.half * rand(1.6, 2.4);
      const pts = [];
      const n = 6;
      for (let i = 0; i <= n; i++) pts.push({ x: -w / 2 + (w * i) / n + rand(-2, 2), y: -h + Math.abs(Math.sin(i * 1.9 + z)) * 18 * (i % 2 ? 1 : 0.4) });
      this.slabs.push({ z, h, w, pts, off: rand(-4, 4), tone: Math.floor(rand(0, 3)), delay: Math.floor(rand(0, 7)), crack: rand(0.2, 0.8) });
    }
    this.g = scene.add.graphics();
    this.parts = this.slabs.map(() => scene.add.graphics());
    this.t = 0;
    this.fall = -1;
    this.cracks = 0;
    // the eruption: dust and stone flung up the whole length
    for (let i = 0; i < 40; i++) {
      scene.gore.spawn({ x: b.x + rand(-b.half, b.half), z: rand(this.z0, this.z1), h: rand(0, 40), vx: rand(-160, 160), vz: 0, vh: rand(150, 420), tint: Math.random() < 0.6 ? 0x6a5a48 : 0x9a8a72, scale: rand(0.5, 1.3), decal: false, life: Math.floor(rand(20, 40)), texture: Math.random() < 0.5 ? 'px' : 'dot' });
    }
  }

  cracked() { this.cracks = Math.min(4, this.cracks + 1); }

  collapse() {
    this.fall = 0;
    const b = this.b;
    for (let i = 0; i < 46; i++) {
      this.scene.gore.spawn({ x: b.x + rand(-b.half * 1.5, b.half * 1.5), z: rand(this.z0, this.z1), h: rand(10, 100), vx: rand(-120, 120), vz: 0, vh: rand(0, 200), tint: Math.random() < 0.6 ? 0x5a4a3a : 0x8a7a62, scale: rand(0.6, 1.5), decal: false, life: Math.floor(rand(20, 40)), texture: 'px', spin: rand(-8, 8) });
    }
    for (let i = 0; i < 10; i++) this.scene.burning?.puff?.(b.x + rand(-20, 20), rand(this.z0, this.z1), rand(10, 60), 0.5);
  }

  update() {
    const b = this.b;
    this.t++;
    if (this.fall >= 0) this.fall++;
    const tones = [[0x5a4c40, 0x7a6a58, 0x3a3028], [0x4e4438, 0x6e6050, 0x302820], [0x645444, 0x86745e, 0x40342a]];
    const dmg = b.maxHp > 0 ? 1 - b.hp / b.maxHp : 0;
    const stage = Math.max(this.cracks, Math.floor(dmg * 4));
    const seam = 0.5 + 0.5 * Math.sin(this.t * 0.12);
    this.slabs.forEach((s, i) => {
      const g = this.parts[i];
      const up = Math.min(1, Math.max(0, (this.t - s.delay) / 6)); // thrust up, slab by slab
      const down = this.fall >= 0 ? Math.min(1, Math.max(0, (this.fall - s.delay * 0.6) / (b.collapse * 0.7))) : 0;
      const k = up * (1 - down);
      g.clear().setDepth(s.z + 0.6);
      if (k <= 0) return;
      const [base, light, dark] = tones[s.tone];
      const x = b.x + s.off;
      const y = s.z + (1 - k) * s.h * 0.9 + down * 6;
      const P = s.pts.map((q) => ({ x: x + q.x, y: y + q.y * (0.4 + 0.6 * k) }));
      const poly = [{ x: x - s.w / 2, y }, ...P, { x: x + s.w / 2, y }];
      g.fillStyle(0x0a0806, 1);
      g.beginPath(); g.moveTo(poly[0].x, poly[0].y); for (const q of poly) g.lineTo(q.x - 1, q.y - 1); g.closePath(); g.fillPath();
      g.fillStyle(base, 1);
      g.beginPath(); g.moveTo(poly[0].x, poly[0].y); for (const q of poly) g.lineTo(q.x, q.y); g.closePath(); g.fillPath();
      g.fillStyle(light, 1).fillTriangle(P[0].x, P[0].y, P[2].x, P[2].y, x - s.w * 0.1, y - s.h * 0.3 * k);
      g.fillStyle(dark, 0.6).fillRect(x + s.w * 0.15, y - s.h * 0.6 * k, s.w * 0.35, s.h * 0.6 * k);
      // glowing seam of magic, brighter as it fails
      const glow = (0.25 + seam * 0.25 + stage * 0.12 + down) * k;
      g.lineStyle(1.4, 0xff9a40, Math.min(1, glow));
      g.lineBetween(x - s.w * 0.1, y - 2, x + s.w * 0.05, y - s.h * 0.55 * k);
      // cracks, by damage stage
      if (stage >= 1) { g.lineStyle(1, 0x140e0a, 1); g.lineBetween(x - s.w * 0.3, y - s.h * s.crack * k, x + s.w * 0.2, y - s.h * (s.crack - 0.2) * k); }
      if (stage >= 2) { g.lineStyle(1.5, 0x140e0a, 1); g.lineBetween(x + s.w * 0.25, y - s.h * 0.9 * k, x - s.w * 0.1, y - s.h * 0.2 * k); g.lineStyle(1, 0xff9a40, 0.6); g.lineBetween(x + s.w * 0.24, y - s.h * 0.88 * k, x - s.w * 0.09, y - s.h * 0.22 * k); }
      if (stage >= 3 && i % 3 === 0) { g.fillStyle(0x0a0806, 1).fillTriangle(P[3].x - 6, P[3].y, P[3].x + 6, P[3].y, P[3].x, P[3].y + 14); }
    });
  }

  destroy() { for (const g of this.parts) g.destroy(); this.g.destroy(); }
}
