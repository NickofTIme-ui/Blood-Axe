// Projectile.js — Spell projectiles (fireballs, knives, shockwaves).
// Uses the same hit rules as melee (see combat/CombatSystem.js).

export class Projectile {
  constructor({ owner, data, x, z, dir }) {
    this.owner = owner;
    this.team = owner.team;
    this.data = data;          // the spell's `projectile` block from characters.js
    this.x = x;
    this.z = z;
    this.h = (owner.floor ?? 0) + (data.y ?? 40); // (from his hand: on a ledge, from the ledge)
    this.dir = dir;
    this.vx = dir * data.speed;
    this.vz = 0;                // (thrown at an angle: World.spawnProjectile sets these)
    this.vh = 0;
    this.grounded = false;
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
    this.z += this.vz / 60;
    this.h += this.vh / 60;
    // stuck in the ground (the floor, or a ledge's top), or broken on a ledge's side
    const T = this.owner?.world?.terrain;
    const ground = T ? Math.max(0, T.groundAt(this.x, this.z)) : 0;
    if (this.vh < 0 && this.h <= ground) { this.h = ground; this.alive = false; this.grounded = true; return; }
    if (T?.wallAt(this.x, this.z, this.h)) { this.alive = false; this.grounded = true; return; }
    this.life--;
    if (this.life <= 0 || this.x < bounds.minX - 100 || this.x > bounds.maxX + 100) this.alive = false;
  }
}
