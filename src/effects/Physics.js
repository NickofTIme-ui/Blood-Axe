// Presentation physics, in fixed 60 Hz ticks. Never changes combat or network state.
export const PHYSICS = {
  bodyTurn: 0.085, pieceTurn: 0.18,
  wood: { bounce: 0.28, friction: 0.83, spinRetention: 0.52 },
  stone: { bounce: 0.16, friction: 0.73, spinRetention: 0.32 },
  pottery: { bounce: 0.34, friction: 0.87, spinRetention: 0.58 },
};

// Remove excess rigid rotation without slowing the centre of mass or straightening
// the joints. A repeated launch can otherwise turn a whole man into a cartwheel.
export function limitTurn(points, lo, hi, maxTurn) {
  const n = hi - lo + 1;
  let x = 0, y = 0, vx = 0, vy = 0;
  for (let j = lo; j <= hi; j++) {
    const p = points[j]; x += p.x / n; y += p.y / n;
    vx += (p.x - p.px) / n; vy += (p.y - p.py) / n;
  }
  let inertia = 0, momentum = 0;
  for (let j = lo; j <= hi; j++) {
    const p = points[j], dx = p.x - x, dy = p.y - y;
    inertia += dx * dx + dy * dy;
    momentum += dx * (p.y - p.py - vy) - dy * (p.x - p.px - vx);
  }
  if (inertia < 0.001) return;
  const turn = momentum / inertia;
  const excess = turn - Math.max(-maxTurn, Math.min(maxTurn, turn));
  for (let j = lo; j <= hi; j++) {
    const p = points[j];
    p.px -= (p.y - y) * excess;
    p.py += (p.x - x) * excess;
  }
}

// Solid debris rebounds, skids, then sleeps. Blood droplets deliberately don't use
// this: they should splatter rather than bounce like rubber balls.
export function landDebris(d, floor, material) {
  d.h = floor;
  if (d.vh < -100) {
    d.vh = -d.vh * material.bounce;
    d.vx *= 0.72; d.vz *= 0.65; d.spin *= material.spinRetention;
    return;
  }
  d.vh = 0;
  d.vx *= material.friction; d.vz *= material.friction;
  d.spin *= 0.7;
  if (Math.hypot(d.vx, d.vz) < 5 && Math.abs(d.spin) < 0.12) {
    d.vx = d.vz = d.spin = 0;
  }
}
