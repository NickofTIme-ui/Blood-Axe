// View-only stride clock. Actual travel drives the feet; blocked movement and
// hit-stop cannot keep walking in place. Retain phase across heading changes.
export class MarchCycle {
  constructor() { this.phase = 0; this.tick = null; this.last = null; }
  update(f) {
    const tick = f.world?.frame ?? 0;
    if (tick === this.tick) return this.phase;
    this.tick = tick;
    const active = f.state === 'walk' && !f.sprinting;
    if (active && this.last?.active && !f.hitstop) {
      const dx = f.x - this.last.x;
      // Depth movement is slower by design, but should keep the same cadence.
      const dz = (f.z - this.last.z) * (f.stats.walkSpeed / f.stats.depthSpeed || 1);
      const distance = Math.hypot(dx, dz);
      if (distance < 40) this.phase = (this.phase + distance / 128) % 1;
    } else if (!active) this.phase = 0;
    this.last = { x: f.x, z: f.z, active };
    return this.phase;
  }
  frame(anim) { return anim.frames[Math.floor(this.phase * anim.frames.length) % anim.frames.length]; }
}
