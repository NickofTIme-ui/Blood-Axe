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

// A severed piece's outline as a few points around its pivot (local px, unrotated,
// scaled as drawn): left and right edges of `n` rows of its opaque pixels (m from
// view/frameMeasure.js measureCanvas). Whatever of it is lowest is what meets the floor.
export function pieceHull(m, ox, oy, sx, sy, n = 7) {
  const hull = [];
  if (m?.y0 == null) return hull;
  for (let i = 0; i < n; i++) {
    const y = Math.round(m.y0 + (m.y1 - m.y0) * i / (n - 1));
    let row = null;
    for (let d = 0; !row && d < 4; d++) row = m.rows[y + (i < n / 2 ? d : -d)];
    if (!row) continue;
    for (const x of row) hull.push({ x: (x + 0.5 - ox) * sx, y: (y + 0.5 - oy) * sy });
  }
  return hull;
}

// The same from a box (x0..x1, y0..y1 around the pivot), its corners rounded off:
// painted meat and doll parts are blobs, not bricks.
export function boxHull(x0, y0, x1, y1) {
  const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, a = (x1 - x0) / 2, b = (y1 - y0) / 2;
  return [[1, 0.55], [0.55, 1], [-0.55, 1], [-1, 0.55], [-1, -0.55], [-0.55, -1], [0.55, -1], [1, -0.55]]
    .map(([u, v]) => ({ x: cx + u * a, y: cy + v * b }));
}

// The way a piece is longest (points around its pivot): { ang } the angle of its long
// axis, unrotated, and { ratio } how much longer it is that way than across.
export function longAxis(points) {
  const n = points.length || 1;
  let mx = 0, my = 0;
  for (const p of points) { mx += p.x / n; my += p.y / n; }
  let xx = 0, yy = 0, xy = 0;
  for (const p of points) { const dx = p.x - mx, dy = p.y - my; xx += dx * dx; yy += dy * dy; xy += dx * dy; }
  const mid = (xx + yy) / 2, r = Math.hypot((xx - yy) / 2, xy);
  return { ang: 0.5 * Math.atan2(2 * xy, xx - yy), ratio: Math.sqrt((mid + r) / Math.max(1e-6, mid - r)) };
}

// How far a long axis at angle `a` (screen radians) is from lying flat: -PI/2..PI/2,
// signed the way it leans.
export const tiltOf = (a) => a - Math.round(a / Math.PI) * Math.PI;

// A long piece lying further off the flat than this is still standing: it goes over.
export const FLAT_TILT = 0.35;

// One 60 Hz tick of a thrown rigid piece: gravity and air, then if any of its outline is
// in the floor, an impulse at the lowest point (two nearly level points count as a flat
// face between them). That is what makes it bounce lower each time, skid, and turn the
// way a real lump turns: off a corner it tips over onto its flattest side and rocks
// still at whatever angle it lands, never snapped to a tidy 0 or 90 degrees. Something
// long never stays stood on its end or a corner: its weight takes it over until it
// lies along its length.
//   b      { x, h, vx, vh, rot, spin } — h height above the floor line, vh up (px/s)
//   floor  the floor's height under the piece
//   o      { bounce, friction, gravity, roll }: roll < 1 keeps a round thing rolling
// Returns the speed it struck at (px/s, 0 if it didn't). Sets b.asleep once it's still.
export function stepRigid(b, hull, floor, o = {}) {
  if (b.asleep) return 0;
  const DT = 1 / 60;
  b.vh -= (o.gravity ?? 1700) * DT;
  b.x += b.vx * DT; b.h += b.vh * DT; b.rot += b.spin * DT;
  if (!hull.length) hull = [{ x: 0, y: 0 }];
  const c = Math.cos(b.rot), s = Math.sin(b.rot);
  let low = Infinity, i2 = 0;
  b.inertia ??= Math.max(4, hull.reduce((t, p) => t + p.x * p.x + p.y * p.y, 0) / hull.length * 0.5);
  for (const p of hull) { const ry = p.x * s + p.y * c; low = Math.min(low, b.h - ry); }
  const pen = floor - low;
  if (pen <= 0) { b.touching = 0; if (b.down) b.down++; return 0; }
  // the contact: the lowest point, or the middle of a face lying flat
  let rx = 0, ry = 0, n = 0;
  for (const p of hull) {
    const y = p.x * s + p.y * c;
    if (b.h - y - low < 1.2) { rx += p.x * c - p.y * s; ry += y; n++; }
  }
  rx /= n; ry /= n; i2 = b.inertia;
  b.h += pen;
  b.touching = (b.touching ?? 0) + 1;
  const vn = b.vh - b.spin * rx; // (how fast that point is going into the floor)
  let impact = 0, j = 0;
  if (vn < 0) {
    impact = -vn;
    const e = impact > 140 ? (o.bounce ?? 0.3) : 0;
    j = -(1 + e) * vn / (1 + rx * rx / i2);
    b.vh += j; b.spin -= rx * j / i2;
  }
  // the floor grips it: friction at the contact skids it slower and rolls it over
  const vt = b.vx - b.spin * ry;
  const lim = (o.friction ?? 0.5) * Math.max(j, 1700 * DT);
  const jt = Math.max(-lim, Math.min(lim, -vt / (1 + ry * ry / i2)));
  b.vx += jt; b.spin -= ry * jt / i2;
  if (o.roll) { b.vx *= o.roll; b.spin *= o.roll; }
  else if (impact < 140) b.spin *= 0.94; // (resting on its side: it rocks, then it's still)
  // stood up on end or propped on a corner: it tips on over, the way it leans
  b.long ??= longAxis(hull);
  const tilt = b.long.ratio > 1.3 ? tiltOf(b.long.ang + b.rot) : 0;
  const standing = Math.abs(tilt) > FLAT_TILT;
  if (standing && impact < 140) b.spin -= (Math.sign(tilt) || 1) * 0.45;
  b.spin = Math.max(-30, Math.min(30, b.spin));
  // a second after it first came down, whatever's left of a slow wobble is soaked up,
  // and nothing is still moving three seconds on
  b.down = (b.down ?? 0) + 1;
  if (b.down > 60 && impact < 140 && Math.abs(b.vx) < 40) { b.vx *= 0.85; if (!standing) b.spin *= 0.8; }
  if (!standing && Math.abs(b.vx) < 6 && Math.abs(b.spin) < 0.4 && Math.abs(b.vh) < 30) b.still = (b.still ?? 0) + 1;
  else b.still = 0;
  if (b.still > 10 || b.down > 300 || (b.down > 180 && !standing)) {
    if (standing) layFlat(b, hull, floor, tilt); // (wedged up somehow: laid down, never left standing)
    b.vx = b.vh = b.spin = 0; b.asleep = true;
  }
  return impact;
}

// Turn a piece flat along its length and rest it on the floor (a last resort).
function layFlat(b, hull, floor, tilt) {
  b.rot -= tilt;
  const c = Math.cos(b.rot), s = Math.sin(b.rot);
  let low = Infinity;
  for (const p of hull) low = Math.min(low, b.h - (p.x * s + p.y * c));
  b.h += floor - low;
}
