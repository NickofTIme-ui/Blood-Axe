// Grounded stampede warning: scuffed earth and worn hoof marks instead of UI arrows.
const noise = n => { const v = Math.sin(n * 12.9898 + 41.17) * 43758.5453; return v - Math.floor(v); };

export function drawStampedeTrail(g, stage, path, state, depth, time) {
  const warn = state.phase === 'warn';
  const urgency = warn ? state.warnT : 0.35;
  const leader = warn || !state.heads.length ? -Infinity : Math.max(...state.heads.map(h => h.out));
  // Soft, broken edges mark the full danger width. No luminous solid rectangle.
  for (const seg of path.segs) {
    const ux = (seg.b.x - seg.a.x) / (seg.l || 1), uz = (seg.b.z - seg.a.z) / (seg.l || 1);
    for (let d = 0; d < seg.l; d += 22) {
      const end = Math.min(seg.l, d + 15 + noise(d + seg.s0) * 5);
      for (const side of [-1, 1]) {
        const off = side * depth * 0.47 + (noise(d + seg.s0 + side*3) - 0.5) * 10;
        const x = seg.a.x + ux * d - uz * off, y = seg.a.z + uz * d + ux * off;
        g.lineStyle(6, 0x1b100b, 0.3).lineBetween(x, y, x + ux * (end - d), y + uz * (end - d));
        g.lineStyle(1, 0x9b5634, 0.12 + urgency * 0.25).lineBetween(x, y, x + ux * (end - d) - uz * 2, y + uz * (end - d) + ux * 2);
      }
    }
  }
  for (let s = 20, i = 0; s < path.len; s += 38, i++) {
    if (s < leader - 70) continue;
    const at = stage.stampedeAt(path, s);
    const seg = path.segs.find(q => s <= q.s0 + q.l) ?? path.segs[path.segs.length - 1];
    const ux = (seg.b.x - seg.a.x) / (seg.l || 1), uz = (seg.b.z - seg.a.z) / (seg.l || 1);
    const pulse = Math.max(0, Math.sin(time * (0.15 + urgency * 0.08) - s * 0.04));
    const alpha = warn ? 0.3 + urgency * 0.25 + pulse * 0.3 : 0.24;
    const off = (i % 2 ? 1 : -1) * depth * 0.18 + (noise(i+22)-0.5)*9;
    const point = (x,y) => ({ x:at.x + ux*x - uz*(y+off), y:at.z + uz*x + ux*(y+off) });
    // Chipped horseshoe print, open at the heel. Uneven sizes avoid a stamped UI row.
    const scale = 0.85 + noise(i) * 0.3;
    const hoof = [[-6,-5],[1,-6],[7,-3],[9,0],[7,4],[1,6],[-6,5],[-6,2],[1,3],[4,1],[4,-1],[1,-3],[-6,-2]];
    g.fillStyle(0x21130d, alpha * 0.8).fillEllipse(at.x - uz*off, at.z + ux*off + 2, 30, 13);
    g.fillStyle(0xa17548, alpha).fillPoints(hoof.map(([x,y])=>point(x*scale,y*scale)),true);
    g.lineStyle(1,0x68452e,alpha).lineBetween(...[point(-9,-7),point(-15-noise(i+8)*8,-5)].flatMap(p=>[p.x,p.y]));
  }
}
