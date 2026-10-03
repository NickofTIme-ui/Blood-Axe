// BladeChain.js — The physics of a pendulum blade's chain and of the blade on its end (view
// only: the swing itself and its hitbox stay in Stage.js). The blade is far heavier than
// the chain, so everything here follows from that:
//
// - The chain is pulled tight by the blade's weight, so it's modelled as a taut string
//   between the pivot and the blade: a straight line that turns with the swing, plus a
//   small sideways bend w that travels along it as a wave. High tension = fast, small waves:
//   it shudders and snaps straight again rather than flopping about like a rope.
// - What bends it is inertia: each link keeps the sideways speed it had a moment ago, so
//   when the swing's angular speed changes the chain lags behind in proportion to how far
//   down it hangs. Barely at all through a normal swing; a sharp S that's gone in a moment
//   when a hero smashes the blade back.
// - The blade hangs from the last link like a short, heavy pendulum of its own. It lags a
//   touch behind as the swing turns at each end, and when the blow reverses the chain it
//   keeps going for an instant, then swings back past the chain's line and settles.
// - The ceiling mount takes the jolt of a blow (`jolt`, for the view to shake it).

export const CHAIN_PHYS = {
  nodes: 24,      // points along the chain (the pivot and the blade end included)
  substeps: 8,    // per frame (keeps the wave stable)
  wave: 0.95,     // how far a ripple travels per substep, in nodes (tension; must be <= 1)
  damping: 0.1,   // per frame: how fast the chain's shudder dies
  maxBend: 12,    // px either way (pulled this tight it can't bow further)
  tilt: 0.5,      // how much of the bend just above the blade turns the blade
  // the blade as a pendulum on the chain's end: its own swing (radians per frame squared
  // per radian; its centre of weight hangs about an eighth of the chain's length below
  // the link), how hard the chain's turning throws it (that eighth, scaled by how much of
  // the blade's weight swings about the link rather than with the chain), its damping
  bladeSpring: 0.03, bladeThrow: 8 * 0.07, bladeDamping: 0.07, bladeMax: 0.4,
};

export class BladeChain {
  constructor(n = CHAIN_PHYS.nodes) {
    this.n = n;
    this.w = new Float32Array(n);  // sideways bend, px (+ = to the left of a chain hanging straight down)
    this.v = new Float32Array(n);  // its speed, px per substep
    this.omega = null;             // last angular speed seen (radians per frame)
    this.beta = 0;                 // the blade's angle off the chain's line (radians, + = with the swing)
    this.betaV = 0;
    this.jolt = 0;                 // 0..1: the mount still shaking from a blow
  }

  // Advance `frames` frames. len: chain length (px); omega: the swing's angular speed now.
  step(frames, len, omega) {
    const P = CHAIN_PHYS;
    const n = this.n;
    const ds = len / (n - 1);
    // (first look, or back on screen after a long while: it has long since hung still)
    if (this.omega === null || frames > 30) {
      this.omega = omega; this.w.fill(0); this.v.fill(0); this.beta = 0; this.betaV = 0; this.jolt = 0;
      return;
    }
    const dOmega = omega - this.omega;
    this.omega = omega;
    if (frames <= 0) return;
    // the links keep their old sideways speed while the line turns under them: relative
    // to the line they fall behind by s * (change in angular speed), s = distance down it
    for (let i = 1; i < n - 1; i++) this.v[i] += (i * ds * dOmega) / P.substeps;
    // the blade: thrown back against the turn, pulled back into line by its own weight
    this.betaV -= dOmega * P.bladeThrow;
    for (let f = 0; f < frames; f++) {
      this.betaV = (this.betaV - this.beta * P.bladeSpring) * (1 - P.bladeDamping);
      this.beta = Math.max(-P.bladeMax, Math.min(P.bladeMax, this.beta + this.betaV));
    }
    this.jolt *= 0.88 ** frames;
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

  // A blow to the blade: the jolt runs up the chain into the mount (the turn itself comes
  // through step(), from the change in the swing's speed).
  kick(dir, power = 1) {
    for (let i = 1; i < this.n - 1; i++) this.v[i] += (dir * power * 0.5 * i) / (this.n - 1) / CHAIN_PHYS.substeps;
    this.jolt = Math.min(1, power);
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

  // How far the blade hangs off the chain's straight line (radians, + = the way a positive
  // swing goes): its own lag and swing, and the bend just above it.
  bladeTilt(len) {
    const ds = len / (this.n - 1);
    return this.beta + Math.atan2(this.w[this.n - 2], ds) * CHAIN_PHYS.tilt;
  }
}
