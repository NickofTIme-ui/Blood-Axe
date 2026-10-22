// A single plane shared by both pieces. Fractions run from crown toward feet.
// Keep variations inside anatomical bands; never pick a random canvas row.
export function cutPlane({ cut, bounds, ax, ay, bodyHeight, lying = false, headRight = false, dir = 1, face = 1, variation = 0.5, tilt = 0.5, impact = null, impactSide = 0 }) {
  if(cut==='vertical') {
    const top=bounds?.y0??ay-bodyHeight, bottom=bounds?.y1??ay;
    const left=bounds?.x0??ax-bodyHeight*.2, right=bounds?.x1??ax+bodyHeight*.2;
    const cx=lying?(left+right)/2:ax+Math.max(-1,Math.min(1,impactSide))*bodyHeight*.08;
    const cy=lying?(top+bottom)/2:top+(bottom-top)*.5;
    // Follow the body's long axis, including enemies already lying on the street.
    const lean=(Math.max(0,Math.min(1,tilt))-.5)*.12;
    return {cx,cy,nx:lying?lean:1,ny:lying?1:lean,
      upper:lying?{x:cx,y:(top+cy)/2}:{x:(left+cx)/2,y:cy},
      lower:lying?{x:cx,y:(bottom+cy)/2}:{x:(right+cx)/2,y:cy},
      lying, longitudinal:true};
  }
  const band = cut === 'neck' ? [0.17, 0.19] : cut === 'legs' ? [0.70, 0.74]
    : cut === 'waistPerch' ? [0.53, 0.53] : cut === 'diagDown' || cut === 'diagUp' ? [0.43, 0.53] : [0.48, 0.59];
  const limits=cut==='waist'?[.32,.72]:cut==='legs'?[.64,.86]:cut==='neck'?[.15,.22]:band;
  const t = Number.isFinite(impact)&&cut!=='waistPerch'
    ?Math.max(limits[0],Math.min(limits[1],1-impact+(variation-.5)*.025))
    :band[0] + (band[1] - band[0]) * Math.max(0, Math.min(1, variation));
  const slope = cut === 'diagDown' ? -0.5 : cut === 'diagUp' ? 0.5
    : cut === 'waist' ? (tilt - 0.5) * 0.4 : 0;
  if (lying) {
    const start = headRight ? bounds.x1 : bounds.x0;
    const end = headRight ? bounds.x0 : bounds.x1;
    const cx = start + (end - start) * t;
    const cy = (bounds.y0 + bounds.y1) / 2;
    return { cx, cy, nx: headRight ? -1 : 1, ny: slope * dir * face, upper: { x: (start + cx) / 2, y: cy }, lying: true };
  }
  const top = bounds?.y0 ?? ay - bodyHeight;
  const height = Math.max(1, ay - top);
  const cy = top + height * t;
  return { cx: ax, cy, nx: -slope * dir * face, ny: 1, upper: { x: ax, y: (top + cy) / 2 }, lying: false };
}

// Complementary pieces share this same shallow irregularity. No sawtooth chunks
// or random gaps: armour/cloth tear slightly along the blade's plane.
export function cutDistance(plane,x,y){
  const d=(x-plane.cx)*plane.nx+(y-plane.cy)*plane.ny;
  const along=(x-plane.cx)*-plane.ny+(y-plane.cy)*plane.nx;
  return d-(Math.sin(along*.43)*.7+Math.sin(along*1.17)*.35);
}

export function spritePoint(sprite, sheet, point) {
  const x = (point.x - sheet.ax) * sprite.scaleX;
  const y = (point.y - sheet.ay) * sprite.scaleY;
  const c = Math.cos(sprite.rotation), s = Math.sin(sprite.rotation);
  return { x: sprite.x + x * c - y * s, y: sprite.y + x * s + y * c };
}
