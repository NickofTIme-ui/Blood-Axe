// Smear.js — The swoosh drawn along a blade's path during a swing ("smear frames"),
// plus the sparks and embers thrown off the blade tip.
//
// A move opts in with a `smear` block (data/characters.js):
//   arc: [from, to]  degrees, 0 = straight ahead, 90 = straight down, -90 = straight up.
//                    The blade travels from `from` to `to` (clockwise if to > from).
//   r                radius of the blade tip's path (px)
//   cx, cy           pivot of the swing relative to the feet (px, facing right)
//   w                thickness of the smear at its leading edge
//   heavy            true = thicker, longer-lasting, more sparks
//
// Every smear uses the same hot palette: a dark blood-red shadow, an orange body, a
// molten edge and a white-hot rim along the blade's path.
//
// Timing is driven by the move's frame data: the smear leads in on the last startup
// frame, sweeps to full length across the active frames, then its tail chases the
// head and it fades — fast enough to stay responsive, long enough to read.

const clamp01 = (t) => Math.max(0, Math.min(1, t));
const easeOut = (t) => 1 - (1 - t) ** 3;
const D2R = Math.PI / 180;

const LAYERS = [
  { color: 0x4a0604, w: 1.3, a: 0.55 },   // dark blood-red shadow
  { color: 0xd8401a, w: 1.0, a: 0.6 },    // hot orange-red body
  { color: 0xff9a4a, w: 0.62, a: 0.7 },   // orange glow
  { color: 0xffe2b0, w: 0.34, a: 0.9 },   // molten edge
  { color: 0xffffff, w: 0.14, a: 1.0 },   // white-hot rim
];
const EMBERS = [0xffffff, 0xffe2b0, 0xffb040, 0xff7a20, 0xd8401a];
// Enemies swing cold steel through blood: black-red shadow, crimson body, steel edge.
const ENEMY_LAYERS = [
  { color: 0x1a0204, w: 1.3, a: 0.5 },
  { color: 0x7a0a10, w: 1.0, a: 0.6 },
  { color: 0xb0202a, w: 0.62, a: 0.6 },
  { color: 0xc8c8d0, w: 0.34, a: 0.75 },
  { color: 0xffffff, w: 0.12, a: 0.9 },
];
const ENEMY_EMBERS = [0xffffff, 0xc8c8d0, 0xb0202a, 0x7a0a10];

// Where the smear is this frame (null = not showing).
function smearState(f, move, frame) {
  const sm = move?.smear;
  if (!sm) return null;
  const start = move.startup - 1;
  const activeEnd = move.startup + move.active;
  const fadeFrames = sm.heavy ? 10 : 7;
  if (frame < start || frame > activeEnd + fadeFrames) return null;
  const sweep = easeOut(clamp01((frame - start) / (move.active + 1)));
  const fade = frame <= activeEnd ? 0 : (frame - activeEnd) / fadeFrames;
  const [a0, a1] = sm.arc;
  return {
    sm, fade, sweeping: frame <= activeEnd,
    head: a0 + (a1 - a0) * sweep,
    tail: a0 + (a1 - a0) * Math.min(sweep, 0.08 + fade * 0.92),
    dir: Math.sign(a1 - a0),
    px: f.x + (sm.cx ?? 0) * f.facing,
    py: f.z - f.h - (sm.cy ?? 60),
  };
}

export function drawSmear(g, f, move, frame) {
  const s = smearState(f, move, frame);
  if (!s || Math.abs(s.head - s.tail) < 2) return;
  const { sm, head, tail, px, py } = s;
  const r = sm.r;
  const pt = (deg, rad) => ({ x: px + Math.cos(deg * D2R) * rad * f.facing, y: py + Math.sin(deg * D2R) * rad });
  const alpha = 1 - s.fade;
  const thick = sm.w * (sm.heavy ? 1.15 : 1);

  const N = 20;
  for (const L of (sm.enemy ? ENEMY_LAYERS : LAYERS)) {
    for (let i = 0; i < N; i++) {
      const t0 = i / N;
      const t1 = (i + 1) / N;
      const d0 = tail + (head - tail) * t0;
      const d1 = tail + (head - tail) * t1;
      // thicker and brighter toward the leading edge (the blade)
      const w0 = thick * L.w * t0 ** 0.75;
      const w1 = thick * L.w * t1 ** 0.75;
      const aSeg = L.a * alpha * (0.12 + 0.88 * t1 ** 1.3);
      g.fillStyle(L.color, aSeg);
      g.fillPoints([pt(d0, r + 2), pt(d1, r + 2), pt(d1, r - w1), pt(d0, r - w0)], true);
    }
  }
  // speed streaks trailing off the tip
  if (s.fade < 0.5) {
    for (let k = 1; k <= 3; k++) {
      const [c1, c2] = sm.enemy ? [0xd8d8e0, 0xb0202a] : [0xffe2b0, 0xff9a4a];
      g.lineStyle(k === 1 ? 2 : 1, k === 1 ? c1 : c2, 0.55 * alpha);
      const d = head - (head - tail) * 0.1 * k;
      const p0 = pt(d, r + 5 + k * 4);
      const p1 = pt(d - (head - tail) * 0.16, r + 5 + k * 4);
      g.lineBetween(p0.x, p0.y, p1.x, p1.y);
    }
  }
}

// Sparks and embers flung off the blade tip while it sweeps (uses the Gore particle pool,
// which keeps working with gore OFF because these don't leave floor decals).
export function smearSparks(gore, f, move, frame) {
  const s = smearState(f, move, frame);
  if (!s || !gore) return;
  const { sm, head, px, py } = s;
  const n = s.sweeping ? (sm.heavy ? 5 : 3) : (Math.random() < 0.3 ? 1 : 0);
  const tipX = px + Math.cos(head * D2R) * sm.r * f.facing;
  const tipY = py + Math.sin(head * D2R) * sm.r;
  // tangent direction the blade is moving in (screen space)
  const tang = (head + 90 * s.dir) * D2R;
  const tx = Math.cos(tang) * f.facing;
  const ty = Math.sin(tang);
  for (let i = 0; i < n; i++) {
    const sp = (sm.heavy ? 260 : 200) * (0.4 + Math.random() * 0.8);
    const spread = (Math.random() - 0.5) * 0.9;
    const vx = (tx * Math.cos(spread) - ty * Math.sin(spread)) * sp;
    const vy = (tx * Math.sin(spread) + ty * Math.cos(spread)) * sp;
    gore.spawn({
      x: tipX + (Math.random() - 0.5) * 6, z: f.z + (Math.random() - 0.5) * 6, h: f.z - tipY,
      vx, vz: (Math.random() - 0.5) * 30, vh: -vy + 40,
      tint: (sm.enemy ? ENEMY_EMBERS : EMBERS)[Math.floor(Math.random() * (sm.enemy ? ENEMY_EMBERS : EMBERS).length)],
      scale: 0.18 + Math.random() * (sm.heavy ? 0.35 : 0.25),
      decal: false, life: 10 + Math.floor(Math.random() * 14),
    });
  }
}
