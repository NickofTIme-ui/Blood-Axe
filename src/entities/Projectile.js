// Projectile.js — Spell projectiles (fireballs, knives, shockwaves).
// Uses the same hit rules as melee (see combat/CombatSystem.js).

export class Projectile {
  constructor({ owner, data, x, z, dir }) {
    this.owner = owner;
    this.team = owner.team;
    this.data = data;          // the spell's `projectile` block from characters.js
    this.x = x;
    this.z = z;
    this.h = data.y ?? 40;     // height above ground
    this.dir = dir;
    this.vx = dir * data.speed;
    this.life = data.lifetime;
    this.hitList = new Set();
    this.alive = true;
  }

  get box() {
    const { w, h } = this.data;
    return { left: this.x - w / 2, right: this.x + w / 2, bottom: this.h, top: this.h + h, z: this.z };
  }

  update(bounds) {
    this.x += this.vx / 60;
    this.life--;
    if (this.life <= 0 || this.x < bounds.minX - 100 || this.x > bounds.maxX + 100) this.alive = false;
  }
}
