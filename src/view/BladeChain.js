// BladeChain.js — The physics of a pendulum blade's chain (view only: the blade's own
// swing and hitbox stay in Stage.js). Under the weight of the blade the chain hangs taut,
// so it is modelled as a tight string between the pivot and the blade: a straight line
// that turns with the swing, plus a sideways bend w along it that travels as a wave.
//
// What bends it is inertia. Every link keeps the sideways speed it had a moment ago, so
// whenever the swing's angular speed changes, the chain lags behind it in proportion to
// how far down it hangs: a little at the ends of each swing (it trails, then catches up),
// and a lot when a hero smashes the blade back and the swing reverses in one frame (the
// chain whips into an S that runs up and down it and rings out). The blade end is held by
// the blade; it's the bend just above it that kicks the blade off its line for a moment.

export const CHAIN_PHYS = {
  nodes: 24,      // points along the chain (the pivot and the blade end included)
  substeps: 4,    // per frame (keeps the wave stable)
  wave: 0.95,     // how far a ripple travels per substep, in nodes (tension; must be <= 1)
  damping: 0.05,  // per frame: how fast it rings out
  trail: 5,       // the gentle trailing bow through a normal swing, x real
  maxBend: 26,    // px either way (a chain this heavy can't bow further)
  tilt: 0.7,      // how much of the bend just above the blade turns the blade
};

export class BladeChain {
  constructor(n = CHAIN_PHYS.nodes) {
    this.n = n;
    this.w = new Float32Array(n);  // sideways bend, px (+ = to the left of a chain hanging straight down)
    this.v = new Float32Array(n);  // its speed, px per substep
    this.omega = null;             // last angular speed seen (radians per frame)
  }

  // Advance `frames` frames. len: chain length (px); omega: the swing's angular speed now;
  // trail: whether the gentle bow of a normal swing applies (off for a jump).
  step(frames, len, omega, trail = true) {
    const P = CHAIN_PHYS;
    const n = this.n;
    const ds = len / (n - 1);
    // (first look, or back on screen after a long while: it has long since hung still)
    if (this.omega === null || frames > 30) { this.omega = omega; this.w.fill(0); this.v.fill(0); return; }
    const dOmega = omega - this.omega;
    this.omega = omega;
    if (frames <= 0) return;
    // the links keep their old sideways speed while the line turns under them: relative
    // to the line they fall behind by s * (change in angular speed), s = distance down it
    const gain = Math.abs(dOmega) > 0.004 ? 1 : (trail ? P.trail : 0);
    for (let i = 1; i < n - 1; i++) this.v[i] += (i * ds * dOmega * gain) / P.substeps;
    const k = P.wave * P.wave;
    const damp = 1 - P.damping / P.substeps;
    for (let f = 0; f < frames * P.substeps; f++) {
      for (let i = 1; i < n - 1; i++) {
        const lap = this.w[i - 1] - 2 * this.w[i] + this.w[i + 1];
        this.v[i] = (this.v[i] + lap * k) * damp;
      }
      for (let i = 1; i < n - 1; i++) {
        this.w[i] += this.v[i];
        if (Math.abs(this.w[i]) > P.maxBend) { this.w[i] = Math.sign(this.w[i]) * P.maxBend; this.v[i] *= -0.3; }
      }
    }
  }

  // A blow straight to the chain (the blade struck): a sideways shove, strongest low down.
  kick(dir, power = 1) {
    for (let i = 1; i < this.n - 1; i++) this.v[i] += (dir * power * 1.6 * i) / (this.n - 1) / CHAIN_PHYS.substeps;
  }

  // The chain's points, from (x0, y0) at the pivot to (x1, y1) at the blade.
  points(x0, y0, x1, y1) {
    const n = this.n;
    const len = Math.hypot(x1 - x0, y1 - y0) || 1;
    const vx = -(y1 - y0) / len;
    const vy = (x1 - x0) / len;
    const pts = [];
    for (let i = 0; i < n; i++) {
      const u = i / (n - 1);
      pts.push({ x: x0 + (x1 - x0) * u + vx * this.w[i], y: y0 + (y1 - y0) * u + vy * this.w[i] });
    }
    return pts;
  }

  // How far the bend just above the blade turns it (radians).
  bladeTilt(len) {
    const ds = len / (this.n - 1);
    return Math.atan2(this.w[this.n - 2], ds) * CHAIN_PHYS.tilt;
  }
}
