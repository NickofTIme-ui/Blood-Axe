// Grounded stampede warning: churned, firelit earth and worn hoof marks instead of UI arrows.
// The danger width glows a low ember red under broken scuffed edges, and a wave of lit hoof
// prints sweeps out of the door the way the herd will run, faster as they come.
const noise = n => { const v = Math.sin(n * 12.9898 + 41.17) * 43758.5453; return v - Math.floor(v); };

const segAt = (path, s) => path.segs.find(q => s <= q.s0 + q.l) ?? path.segs[path.segs.length - 1];

export function drawStampedeTrail(g, stage, path, state, depth, time) {
  const warn = state.phase === 'warn';
  const urgency = warn ? state.warnT : 0.35;
  const leader = warn || !state.heads.length ? -Infinity : Math.max(...state.heads.map(h => h.out));
  const flicker = 0.85 + 0.15 * Math.sin(time * 0.31) * Math.sin(time * 0.17 + 1.3);
  // The churned ground under the whole danger width: a soft ember glow, laid as overlapping
  // ovals so its edges stay soft (no solid rectangle), brightest down the middle.
  for (let s = 0; s < path.len; s += 26) {
    if (s < leader - 90) continue;
    const at = stage.stampedeAt(path, s);
    const fade = Math.min(1, s / 60) * Math.min(1, (path.len - s) / 80 + 0.2);
    const a = (warn ? 0.07 + urgency * 0.11 : 0.06) * flicker * fade;
    g.fillStyle(0x2a120a, a * 1.6).fillEllipse(at.x, at.z, 64, depth * 1.05);
    g.fillStyle(0x8a2c14, a).fillEllipse(at.x, at.z, 52, depth * 0.8);
    g.fillStyle(0xd86a2a, a * 0.7).fillEllipse(at.x, at.z, 40, depth * 0.34);
  }
  // Its edges: two ragged ruts of torn earth, nearly unbroken, wandering a little (a smooth
  // wobble, not a dashed rail), each with a thin firelit lip on its inner side.
  const wobble = (s, side) => Math.sin(s * 0.045 + side * 2.1) * 4 + Math.sin(s * 0.13 + side) * 2;
  for (const side of [-1, 1]) {
    let prev = null;
    for (let s = 0; s <= path.len; s += 12) {
      if (s < leader - 90) { prev = null; continue; }
      const at = stage.stampedeAt(path, s);
      const sg = segAt(path, s);
      const ux = (sg.b.x - sg.a.x) / (sg.l || 1), uz = (sg.b.z - sg.a.z) / (sg.l || 1);
      const off = side * depth * 0.5 + wobble(s, side);
      const pt = { x: at.x - uz * off, y: at.z + ux * off, ix: -uz * side * 2, iy: ux * side * 2 };
      const gap = noise(Math.floor(s / 12) + side * 50) < 0.12; // (a few breaks, so it reads as ground)
      if (prev && !gap) {
        g.lineStyle(6, 0x1b100b, 0.4).lineBetween(prev.x, prev.y, pt.x, pt.y);
        g.lineStyle(2, 0xc8683a, (0.22 + urgency * 0.4) * flicker).lineBetween(prev.x - prev.ix, prev.y - prev.iy, pt.x - pt.ix, pt.y - pt.iy);
      }
      prev = gap ? null : pt;
    }
  }
  // The hoof prints, the way the herd runs; a wave of light sweeps along them out of the
  // door (quicker and brighter the nearer the herd is), so the direction reads at a glance.
  const sweepLen = path.len + 240;
  const sweep = (time * (5 + urgency * 9)) % sweepLen - 120;
  const hoof = [[-6,-5],[1,-6],[7,-3],[9,0],[7,4],[1,6],[-6,5],[-6,2],[1,3],[4,1],[4,-1],[1,-3],[-6,-2]];
  for (let s = 20, i = 0; s < path.len; s += 34, i++) {
    if (s < leader - 70) continue;
    const at = stage.stampedeAt(path, s);
    const seg = segAt(path, s);
    const ux = (seg.b.x - seg.a.x) / (seg.l || 1), uz = (seg.b.z - seg.a.z) / (seg.l || 1);
    const lit = warn ? Math.max(0, 1 - Math.abs(s - sweep) / 110) : 0;
    const alpha = Math.min(1, warn ? 0.42 + urgency * 0.3 + lit * 0.28 : 0.28);
    const off = (i % 2 ? 1 : -1) * depth * 0.18 + (noise(i + 22) - 0.5) * 9;
    const point = (x, y) => ({ x: at.x + ux * x - uz * (y + off), y: at.z + uz * x + ux * (y + off) });
    // Chipped horseshoe print, open at the heel. Uneven sizes avoid a stamped UI row.
    const scale = (1.1 + noise(i) * 0.35) * (1 + lit * 0.15);
    const hoofPts = hoof.map(([x, y]) => point(x * scale, y * scale));
    g.fillStyle(0x21130d, alpha * 0.8).fillEllipse(at.x - uz * off, at.z + ux * off + 2, 36, 15);
    if (lit > 0.05) g.fillStyle(0xff8a3a, lit * 0.35).fillEllipse(at.x - uz * off, at.z + ux * off, 30, 12);
    g.fillStyle(lit > 0.5 ? 0xe0a060 : 0xb07a48, alpha).fillPoints(hoofPts, true);
    g.lineStyle(1.5, 0x68452e, alpha).lineBetween(...[point(-9, -7), point(-17 - noise(i + 8) * 8, -5)].flatMap(p => [p.x, p.y]));
  }
}
