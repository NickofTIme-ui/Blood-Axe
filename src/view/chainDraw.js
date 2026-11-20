// One continuous iron chain drawn along a path (Nick, 2026-11-20: the thrown chain "breaks in
// pieces visually"; it used to be a dotted row of grey squares with gaps between them).
//
// The path is walked by arc length and a link is laid every `link` px, each one a little longer
// than the step so it overlaps its neighbours; links alternate flat (an open oval: dark rim, iron
// body, dark hole) and edge-on (a thin bright bar), the way a real chain twists link to link. A
// dark spine runs under the whole length first, so no gap can ever open, at any stretch or sag.

const DARK = 0x16151a;
const IRON = 0x84848e;
const LIGHT = 0xd2d2da;

// Sample a quadratic-ish curve from a to b, bowed `sag` px downwards at its middle (sag may be
// negative to bow up). Returns a dense polyline.
export function chainPath(a, b, sag = 0, step = 3) {
  const len = Math.hypot(b.x - a.x, b.y - a.y);
  const n = Math.max(2, Math.ceil(len / step));
  const pts = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    pts.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t + Math.sin(t * Math.PI) * sag });
  }
  return pts;
}

// Walk a polyline by arc length: the point and unit tangent at distance s.
function walker(pts) {
  const cum = [0];
  for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y));
  const total = cum[cum.length - 1];
  const at = (s) => {
    s = Math.max(0, Math.min(total, s));
    let lo = 1; let hi = pts.length - 1;
    while (lo < hi) { const m = (lo + hi) >> 1; if (cum[m] < s) lo = m + 1; else hi = m; }
    const a = pts[lo - 1]; const b = pts[lo];
    const seg = cum[lo] - cum[lo - 1] || 1;
    const t = (s - cum[lo - 1]) / seg;
    return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, tx: (b.x - a.x) / seg, ty: (b.y - a.y) / seg };
  };
  return { at, total };
}

// Draw the chain along `pts` into Phaser Graphics `g` (not cleared here).
// opts.link: link pitch in px (default 10); opts.thick: link width in px (default 7);
// opts.phase: slides the links along (for a chain being reeled or wound).
export function drawChain(g, pts, opts = {}) {
  if (!pts || pts.length < 2) return;
  const L = opts.link ?? 10;
  const W = opts.thick ?? 7;
  const { at, total } = walker(pts);
  if (total < 1) return;

  // the spine: one unbroken dark line under every link
  g.lineStyle(Math.max(2, W * 0.55), DARK, 1);
  g.beginPath(); g.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) g.lineTo(pts[i].x, pts[i].y);
  g.strokePath();

  const phase = ((opts.phase ?? 0) % (2 * L) + 2 * L) % (2 * L);
  const first = Math.floor(-phase / L) - 1;
  for (let k = first; ; k++) {
    const s0 = phase + k * L;
    if (s0 > total) break;
    if (s0 + L * 1.22 < 0) continue;
    const a = at(s0 - L * 0.22); const b = at(s0 + L * 1.22); // (each link overlaps the next)
    const flat = ((k % 2) + 2) % 2 === 0;
    const nx = -a.ty; const ny = a.tx; // (normal: the highlight sits on the upper rim)
    if (flat) {
      g.lineStyle(W, DARK, 1).lineBetween(a.x, a.y, b.x, b.y);
      g.lineStyle(W - 2, IRON, 1).lineBetween(a.x, a.y, b.x, b.y);
      const hx = (b.x - a.x) * 0.3; const hy = (b.y - a.y) * 0.3;
      g.lineStyle(Math.max(1, W * 0.28), DARK, 1).lineBetween(a.x + hx, a.y + hy, b.x - hx, b.y - hy);
      const up = ny < 0 ? 1 : -1; const o = (W - 2) * 0.32 * up;
      g.lineStyle(1, LIGHT, 0.9).lineBetween(a.x + hx * 0.6 + nx * o, a.y + hy * 0.6 + ny * o, b.x - hx * 0.6 + nx * o, b.y - hy * 0.6 + ny * o);
    } else {
      g.lineStyle(Math.max(2, W * 0.6), DARK, 1).lineBetween(a.x, a.y, b.x, b.y);
      g.lineStyle(Math.max(1, W * 0.28), LIGHT, 1).lineBetween(a.x, a.y, b.x, b.y);
    }
  }
}
