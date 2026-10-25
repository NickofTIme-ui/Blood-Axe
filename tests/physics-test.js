import assert from 'node:assert/strict';
import { PHYSICS, limitTurn, stepRigid, boxHull, pieceHull } from '../src/effects/Physics.js';
import { FleshChain } from '../src/effects/FleshChain.js';
import { Ragdoll } from '../src/view/Ragdoll.js';
import { Gore } from '../src/effects/Gore.js';

// A violently rotating body must retain its thrown momentum, including when mirrored.
for (const sign of [-1, 1]) {
  const pts = [-40, -20, 0, 20, 40].map(x => ({ x, y: 0, px: x - 5, py: -2 - x * sign }));
  limitTurn(pts, 0, 4, PHYSICS.bodyTurn);
  const mean = key => pts.reduce((s, p) => s + p[key], 0) / pts.length;
  assert.ok(Math.abs(mean('x') - mean('px') - 5) < 1e-9);
  assert.ok(Math.abs(mean('y') - mean('py') - 2) < 1e-9);
  const turn = pts.reduce((s, p) => s + p.x * (p.y - p.py), 0) / pts.reduce((s, p) => s + p.x ** 2, 0);
  assert.ok(Math.abs(turn - sign * PHYSICS.bodyTurn) < 1e-9);
}

// Drive the real ragdoll solver through repeated launches, both facings and a free
// severed torso. No textures are needed to exercise its actual constraints.
for (const face of [-1, 1]) for (const free of [false, true]) {
  const r = Object.create(Ragdoll.prototype);
  r.B = { pts: [0, 17, 52, 76, 100].map(x => ({ x, y: 0 })), lift: [6, 12, 10, 7, 3], headLeft: true, gear: [] };
  r.sheet = { ax: 50, ay: 10 }; r.place = () => {}; r.hide = () => { throw Error('Ragdoll went non-finite'); };
  const f = { x: 100, z: 400, floor: 0, h: 0, vh: 520, vx: 300, health: 100, stats: { gravity: 1700 } };
  r.start(f, face, 1, 'knock', free ? { free: true, range: [0, 2], vel: { x: 4, y: -7 }, spin: 3 } : {});
  for (let t = 0; t < 600; t++) {
    if (!free && t < 120 && t % 24 === 0) f.vh = 520;
    f.vh -= f.stats.gravity / 60; f.h += f.vh / 60;
    if (f.h <= 0) { f.h = 0; f.vh = 0; f.vx *= 0.85; }
    f.x += f.vx / 60;
    r.step(f, face, 1, 1);
    for (let j = r.lo; j <= r.hi; j++) {
      const p = r.pts[j];
      assert.ok(Number.isFinite(p.x) && Number.isFinite(p.y));
      assert.ok(p.y <= 400.001, 'Joint passed through floor');
      if (!free) assert.ok(Math.abs(p.x - f.x) < 250, 'Body escaped its combat position');
    }
  }
  assert.ok(r.pts.slice(r.lo, r.hi + 1).every(p => Math.hypot(p.x - p.px, p.y - p.py) < 1), 'Body never settled');
}

// Exercise the actual particle update: solids bounce and persist, blood splats,
// material friction settles fragments, and expired fragments are removed.
for (const material of [null, PHYSICS.wood, PHYSICS.stone, PHYSICS.pottery]) {
  let destroyed = false, splats = 0, bounced = false;
  const img = { rotation: 0, setAlpha() { return this; }, setPosition() { return this; }, setDepth() { return this; }, destroy() { destroyed = true; } };
  const d = { img, x: 0, z: 400, h: 1, vx: 200, vz: 20, vh: -400, scale: 1, decal: !material, life: 300, spin: 5, material };
  const gore = { drops: [d], scene: {}, splat() { splats++; }, dismemberer: { update() {} } };
  for (let t = 0; t < 300; t++) {
    Gore.prototype.update.call(gore);
    if (d.vh > 0) bounced = true;
    if (t === 0) assert.equal(destroyed, !material);
    if (t === 250 && material) assert.equal(d.vx, 0);
  }
  assert.equal(bounced, !!material);
  assert.equal(splats, material ? 0 : 1);
  assert.ok(destroyed && gore.drops.length === 0);
}
// Severed pieces (heads, gibs, doll parts): a hard landing bounces, each bounce lower,
// the piece never sinks into the floor, and it comes to rest, tipped onto a side, within
// three seconds whatever it was doing.
for (const [w, h, vx, spin] of [[40, 14, 250, 9], [16, 16, 300, 14], [60, 24, -200, -5], [8, 30, 0, 8]]) {
  const hull = boxHull(-w / 2, -h / 2, w / 2, h / 2);
  const b = { x: 0, h: 90, vx, vh: 420, rot: 0.3, spin };
  const ups = []; let t = 0;
  for (; t < 400 && !b.asleep; t++) {
    const hit = stepRigid(b, hull, 0, { bounce: 0.3 });
    if (hit > 140) ups.push(b.vh);
    const low = Math.min(...hull.map(p => b.h - (p.x * Math.sin(b.rot) + p.y * Math.cos(b.rot))));
    assert.ok(Number.isFinite(b.x + b.h + b.rot) && low > -0.01, 'Piece sank into the floor');
  }
  assert.ok(b.asleep && t <= 240, 'Piece never came to rest');
  assert.ok(ups.length >= 1 && Math.max(...ups) > 60, 'A hard landing should bounce');
  assert.ok(ups[0] < 0.4 * 700, 'Bounce must stay modest');
}
// a piece's outline from its pixels sits around its pivot, mirrored with it
const rows = Array.from({ length: 20 }, (_, y) => (y >= 4 && y <= 15 ? [3, 12] : null));
const hullR = pieceHull({ rows, y0: 4, y1: 15 }, 8, 10, 1, 1), hullL = pieceHull({ rows, y0: 4, y1: 15 }, 8, 10, -1, 1);
assert.ok(hullR.length >= 8 && hullR.every((p, i) => p.x === -hullL[i].x));
// a severed half (jointed) still settles when it is allowed to skid and bounce
{
  const c = new FleshChain([0, 30, 60, 90].map(x => ({ x, y: 300 })));
  c.skid = true; c.bounce = 0.28; c.launch(260, -420, 2);
  let t = 0;
  for (; t < 600 && !c.asleep; t++) { c.step(() => 400, { minX: -1000, maxX: 1000 }, 6); assert.ok(c.points.every(p => p.y <= 394.001)); }
  assert.ok(c.asleep, 'Severed half never settled');
}
console.log('Physics checks passed: spin, repeated launches, severed torso, settling, debris materials, blood and cleanup, severed pieces bounce and settle.');
