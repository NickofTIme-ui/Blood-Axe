// Gore.js — Stylized blood: particle bursts on hit, splatter that stays on the floor,
// bigger "finisher" effects on kills, and non-gory sparks for blocks/parries.
//
// Gore level comes from SETTINGS.gore.level (0 OFF, 1 LOW, 2 FULL; G cycles it in game).
// Floor decals are painted onto one big RenderTexture, so thousands of splats cost
// no more than one image.

import { SETTINGS } from '../config/settings.js';
import { DEPTH } from '../view/depths.js';
import { Dismember } from './Dismember.js';

const BLOOD = [0x8a0303, 0xa10a0a, 0x6e0202, 0xb3120f];
const DECAL = [0x5a0000, 0x6b0505, 0x4a0000];
const GRAVITY = 1400;

const rand = (a, b) => a + Math.random() * (b - a);
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

export class Gore {
  constructor(scene) {
    this.scene = scene;
    this.drops = []; // flying blood, gibs and sparks
    const W = SETTINGS.world;
    this.rtY = W.floorTop - 60;
    this.decals = scene.add.renderTexture(0, this.rtY, W.width, SETTINGS.height - this.rtY)
      .setOrigin(0, 0).setDepth(DEPTH.decals);
    this.stamp = scene.make.image({ key: 'dot', add: false });
    this.dismemberer = new Dismember(this);
    this.dismemberer.minZ = W.floorTop;
    this.dismemberer.maxZ = W.floorBottom;
    this.dismemberer.minX = W.edgePadding;
    this.dismemberer.maxX = W.width - W.edgePadding;
    this.puffs = [];
  }

  get level() { return SETTINGS.gore.level; }
  get amount() { return [0, 0.35, 1][this.level] ?? 1; }

  // ------------------------------------------------------------ spawning

  spawn({ x, z, h, vx, vz, vh, tint, scale, texture = 'dot', decal = true, life = 999, spin = 0 }) {
    if (this.drops.length >= SETTINGS.gore.maxDrops) {
      const old = this.drops.shift();
      old.img.destroy();
    }
    const img = this.scene.add.image(x, z - h, texture).setTint(tint).setScale(scale);
    this.drops.push({ img, x, z, h, vx, vz, vh, scale, decal, life, spin });
  }

  // A spray of blood. dir = direction the hit was travelling (-1/1).
  burst(x, z, h, dir, count, power = 1) {
    for (let i = 0; i < count; i++) {
      this.spawn({
        x, z: z + rand(-4, 4), h,
        vx: dir * rand(40, 280) * power + rand(-40, 40),
        vz: rand(-50, 50),
        vh: rand(40, 320) * power,
        tint: pick(BLOOD),
        scale: rand(0.3, 0.9) * (this.level === 1 ? 0.8 : 1),
      });
    }
  }

  // Non-gory impact sparks (shown even with gore OFF).
  spark(x, z, h, color = 0xfff2a0, count = 8) {
    for (let i = 0; i < count; i++) {
      const a = rand(0, Math.PI * 2);
      const s = rand(120, 380);
      this.spawn({
        x, z, h, vx: Math.cos(a) * s, vz: 0, vh: Math.sin(a) * s,
        tint: color, scale: rand(0.25, 0.5), decal: false, life: Math.floor(rand(8, 16)),
      });
    }
  }

  // ------------------------------------------------------------ reactions

  onHit(e) {
    if (this.level === 0) return this.spark(e.x, e.z, e.h, 0xffffff, 6);
    const count = Math.round(Math.min(40, 4 + e.damage * 1.3) * this.amount);
    this.burst(e.x, e.z, e.h, e.dir, count, e.move.hitstop >= 8 ? 1.4 : 1);
    this.splat(e.defender.x + e.dir * rand(5, 30), e.z + rand(-4, 4), rand(0.8, 1.6));
  }

  // view: the victim's view. Rigged enemies (EnemyView) can be taken apart.
  // Returns true if the body came apart (so the caller can shout about it).
  onKill(e, view) {
    if (this.level === 0) return this.spark(e.x, e.z, e.h, 0xffffff, 16), false;
    const victim = e.defender;
    this.burst(e.x, e.z, e.h, e.dir, Math.round(70 * this.amount), 1.7);

    if (view?.snapshot && e.fatality && e.fatality !== 'none') {
      const snap = view.snapshot();
      view.hideAll();
      return this.dismember(e.fatality, snap, e);
    }

    if (this.level >= 2) {
      // Chunky bits
      for (let i = 0; i < 5; i++) {
        this.spawn({
          x: e.x, z: e.z, h: e.h, texture: 'px',
          vx: e.dir * rand(80, 320), vz: rand(-60, 60), vh: rand(200, 480),
          tint: pick([...BLOOD, victim.stats.look.color]), scale: rand(1.5, 3), spin: rand(-12, 12),
        });
      }
    }
    // A pool spreads under the body once it lands.
    const pool = () => {
      if (!this.decals.active) return;
      for (let i = 0; i < 6; i++) this.splat(victim.x + rand(-30, 30), victim.z + rand(-5, 5), rand(2.5, 4.5), 0.6);
    };
    this.scene.time.delayedCall(700, pool);
    return false;
  }

  // Take a rigged body apart (see effects/Dismember.js).
  dismember(type, snap, e) {
    return this.dismemberer.run(type, snap, e);
  }

  // An arm cut off a living enemy.
  onMaim(e, view) {
    if (this.level === 0 || !view?.sever) return;
    this.dismemberer.maim(view.sever(e.limb), e);
  }

  // Red mist that hangs in the air after something bursts.
  mist(x, z, h, count) {
    if (this.level === 0) return;
    for (let i = 0; i < count; i++) {
      const img = this.scene.add.image(x + rand(-14, 14), z - h + rand(-14, 10), 'dot')
        .setTint(pick([0x6e0202, 0x8a0303, 0x4a0000])).setScale(rand(2, 4.5)).setAlpha(rand(0.35, 0.6)).setDepth(z + 2);
      this.scene.tweens.add({
        targets: img, alpha: 0, scale: img.scale * 1.8, y: img.y + rand(-10, 20), x: img.x + rand(-20, 20),
        duration: rand(500, 1100), onComplete: () => img.destroy(),
      });
    }
  }

  // Black burn mark + a wide blood ring (explosions).
  scorch(x, z, fire = false) {
    if (this.level === 0) return;
    this.stamp.setPosition(x, z - this.rtY).setScale(9, 3.2).setTint(fire ? 0x120a06 : 0x2a0000).setAlpha(0.7);
    this.decals.draw(this.stamp);
    for (let i = 0; i < 14; i++) {
      const a = rand(0, Math.PI * 2);
      const d = rand(20, 70);
      this.splat(x + Math.cos(a) * d, z + Math.sin(a) * d * 0.3, rand(1, 2.4));
    }
  }

  // ------------------------------------------------------------ decals

  splat(x, z, size, alpha = 0.85) {
    if (this.level === 0) return;
    this.stamp.setPosition(x, z - this.rtY)
      .setScale(size * rand(1, 1.8), size * rand(0.45, 0.7))
      .setTint(pick(DECAL))
      .setAlpha(this.level === 1 ? alpha * 0.6 : alpha);
    this.decals.draw(this.stamp);
  }

  clearDecals() {
    this.decals.clear();
    this.dismemberer.clear();
  }

  // ------------------------------------------------------------ per frame (60fps)

  update() {
    const dt = 1 / 60;
    for (let i = this.drops.length - 1; i >= 0; i--) {
      const d = this.drops[i];
      d.vh -= GRAVITY * dt;
      d.x += d.vx * dt;
      d.z += d.vz * dt;
      d.h += d.vh * dt;
      d.life--;
      if (d.spin) d.img.rotation += d.spin * dt;

      if (d.h <= 0 || d.life <= 0) {
        if (d.decal && d.h <= 0) this.splat(d.x, d.z, d.scale * (d.spin ? 1.2 : 0.8));
        d.img.destroy();
        this.drops.splice(i, 1);
        continue;
      }
      d.img.setPosition(d.x, d.z - d.h).setDepth(d.z + 1);
    }
    this.dismemberer.update();
  }
}
