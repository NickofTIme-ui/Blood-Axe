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

    // an enemy drawn with painted strips comes apart as that painting (effects/SpriteCut.js),
    // never as the old paper doll underneath it
    if (e.fatality && e.fatality !== 'none' && this.cutSprite(e.fatality, view, e)) return true;

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

  // A killing blow on a painted enemy (view/SpriteEnemyView.js): the frame on screen is
  // divided along the cut and the pieces thrown. Returns false if this view can't be cut
  // that way (no painted sprite showing), so the caller falls back to the doll.
  //   decap / headPop  the head comes off at the neck (flung, or popped straight up)
  //   halfH            cut through at the waist, the top half thrown clear
  //   halfV            a steep diagonal from shoulder to hip, the halves sliding apart
  //   limbs            the legs taken at the knee, the body dropping where it stood
  //   explode          blown in two, both halves hurled, in a storm of meat
  cutSprite(type, view, e) {
    const cuts = this.scene.cuts;
    if (!cuts || !view?.sheet || !view.sprite?.visible || view.cutAway) return false;
    const dir = e.dir || view.f.facing;
    const cut = { decap: 'neck', headPop: 'neck', halfH: 'waist', halfV: 'diagDown', limbs: 'legs', explode: 'waist' }[type];
    if (!cut) return false;
    const f = view.f;
    const mid = f.h + f.stats.body.h * 0.5;
    // a mine doesn't cut a man in two: there are no halves, only what's left of him
    if (type === 'explode' && e.move?.fx === 'mine') {
      view.cutAway = true;
      view.hideAll();
      this.mist(e.x, e.z, mid, 22);
      this.scorch(f.x, f.z);
      for (let i = 0; i < Math.round(48 * this.amount); i++) {
        this.spawn({
          x: f.x + rand(-12, 12), z: f.z + rand(-6, 6), h: mid + rand(-30, 30), texture: 'px',
          vx: rand(-520, 520), vz: rand(-120, 120), vh: rand(260, 760),
          tint: pick([...BLOOD, ...BLOOD, f.stats.look.color, f.stats.look.skin ?? 0x8a0303]), scale: rand(1.8, 4.6), spin: rand(-16, 16),
        });
      }
      this.burst(f.x, f.z, mid, dir, Math.round(90 * this.amount), 1.9);
      return true;
    }
    const { upper, lower } = cuts.split(view, cut, dir);
    view.cutAway = true;
    view.hideAll();
    if (type === 'decap') cuts.launch(upper, dir * rand(180, 420), rand(380, 520), dir * rand(9, 16));
    else if (type === 'headPop') cuts.launch(upper, dir * rand(-40, 60), rand(620, 760), dir * rand(4, 9));
    else if (type === 'halfH') cuts.launch(upper, dir * rand(160, 320), rand(260, 380), dir * rand(5, 9));
    else if (type === 'halfV') cuts.launch(upper, dir * rand(60, 130), rand(150, 220), dir * rand(1.5, 3));
    else if (type === 'limbs') cuts.launch(upper, dir * rand(20, 70), rand(120, 180), dir * rand(1, 2.5));
    else {
      cuts.launch(upper, dir * rand(260, 520), rand(520, 700), dir * rand(10, 18));
      cuts.launch(lower, -dir * rand(160, 360), rand(360, 520), -dir * rand(8, 14));
      this.mist(e.x, e.z, mid, 14);
      this.scorch(f.x, f.z);
      for (let i = 0; i < Math.round(22 * this.amount); i++) {
        this.spawn({
          x: f.x + rand(-10, 10), z: f.z + rand(-6, 6), h: mid + rand(-20, 20), texture: 'px',
          vx: rand(-420, 420), vz: rand(-90, 90), vh: rand(220, 640),
          tint: pick([...BLOOD, f.stats.look.color, f.stats.look.skin ?? 0x8a0303]), scale: rand(1.6, 3.4), spin: rand(-14, 14),
        });
      }
    }
    this.burst(f.x, f.z, mid, dir, Math.round(60 * this.amount), 1.6);
    return true;
  }

  // Take a rigged body apart (see effects/Dismember.js).
  dismember(type, snap, e) {
    return this.dismemberer.run(type, snap, e);
  }

  // An arm cut off a living enemy.
  onMaim(e, view) {
    if (this.level === 0 || !view?.sever) return;
    // a painted enemy: his scared one-armed art takes over; what flies off is meat and
    // blood, not the doll's arm
    if (view.sheet && view.sprite) {
      const f = view.f;
      const h = f.h + f.stats.body.h * 0.68;
      const dir = e.dir || f.facing;
      this.burst(f.x, f.z, h, dir, Math.round(46 * this.amount), 1.5);
      for (let i = 0; i < Math.round(7 * this.amount); i++) {
        this.spawn({
          x: f.x, z: f.z + rand(-3, 3), h, texture: 'px',
          vx: dir * rand(90, 360), vz: rand(-50, 50), vh: rand(180, 420),
          tint: pick([...BLOOD, f.stats.look.skin ?? 0x8a0303, f.stats.look.color]), scale: rand(1.6, 3), spin: rand(-12, 12),
        });
      }
      return;
    }
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
