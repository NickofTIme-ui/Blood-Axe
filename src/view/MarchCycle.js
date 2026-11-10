// View-only stride clock. Actual travel drives the feet; blocked movement and
// hit-stop cannot keep walking in place. Retain phase across heading changes.
//
// A march anim can say how far he travels in one full cycle (`stride`, world px) and,
// for a painted walk whose steps are not evenly spaced, where in the cycle each pose
// sits (`keys`, 0..1, one per frame, measured from how far the planted foot slides
// between poses). Each pose is shown from halfway after the previous key to halfway
// before the next, so the foot on the ground stays put while he moves over it.
const DEFAULT_STRIDE = 128;
export class MarchCycle {
  constructor() { this.phase = 0; this.tick = null; this.last = null; this.stride = DEFAULT_STRIDE; }
  update(f, anim) {
    if (anim?.stride) this.stride = anim.stride;
    const tick = f.world?.frame ?? 0;
    if (tick === this.tick) return this.phase;
    this.tick = tick;
    const active = f.state === 'walk' && !f.sprinting;
    if (active && this.last?.active && !f.hitstop) {
      const dx = f.x - this.last.x;
      // Depth movement is slower by design, but should keep the same cadence.
      const dz = (f.z - this.last.z) * (f.stats.walkSpeed / f.stats.depthSpeed || 1);
      const distance = Math.hypot(dx, dz);
      if (distance < 40) this.phase = (this.phase + distance / this.stride) % 1;
    } else if (!active) this.phase = 0;
    this.last = { x: f.x, z: f.z, active };
    return this.phase;
  }
  frame(anim) {
    const n = anim.frames.length;
    if (anim.stride) this.stride = anim.stride;
    const keys = anim.keys;
    if (!keys || keys.length !== n) return anim.frames[Math.floor(this.phase * n) % n];
    return anim.frames[marchIndex(keys, this.phase)];
  }
}

// which pose a phase falls on, each pose owning the span between its neighbours' midpoints
export function marchIndex(keys, phase) {
  const n = keys.length, p = ((phase % 1) + 1) % 1;
  let best = 0;
  for (let i = 0; i < n; i++) {
    const prev = i ? keys[i - 1] : keys[n - 1] - 1;
    const start = (prev + keys[i]) / 2;
    if (p >= start || (i === 0 && p >= (keys[n - 1] + 1) / 2)) best = i;
  }
  // the wrap: past the last pose's upper midpoint, it is pose 0 again
  if (p >= (keys[n - 1] + 1) / 2) best = 0;
  return best;
}
