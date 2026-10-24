import assert from 'node:assert/strict';
import { roofFire, placeRoofFire } from '../src/view/RoofFire.js';
import { FX } from '../src/view/stripImporter.js';

const made = (log) => {
  const o = { x: 0, y: 0, visible: true };
  for (const k of ['setOrigin', 'setDepth', 'setFlipX']) o[k] = (...a) => { log.push([k, ...a]); return o; };
  o.setScale = (sx, sy = sx) => { o.sx = sx; o.sy = sy; return o; };
  o.setPosition = (x, y) => { o.x = x; o.y = y; return o; };
  o.setVisible = (v) => { o.visible = v; return o; };
  o.play = (cfg) => { log.push(['play', cfg]); return o; };
  return o;
};
const scene = (log, anims = new Set()) => ({
  anims: { exists: (k) => anims.has(k), create: (cfg) => { anims.add(cfg.key); log.push(['anim', cfg]); } },
  add: { sprite: () => { const o = made(log); log.push(['sprite', o]); return o; } },
});

// no strip yet: no fire
assert.equal(roofFire(scene([]), 0, 300, 10), null);

FX.rooffire = { key: 'fx-rooffire', count: 8, fw: 480, fh: 120, fps: 12 };
const log = [];
const anims = new Set();
const run = roofFire(scene(log, anims), 1000, 1340, 50, { height: 72, depth: 5 });
assert.equal(log.filter((c) => c[0] === 'anim').length, 1, 'the loop is made once');
assert.ok(run.sprites.length >= 2, 'a 340 px roof takes more than one band');
const ends = run.sprites.map((f) => [f.x, f.x + 480 * f.sx]);
assert.equal(Math.min(...ends.map((e) => e[0])), 1000, 'starts at the roof\'s start');
assert.ok(Math.abs(Math.max(...ends.map((e) => e[1])) - 1340) < 1, 'ends at the roof\'s end, not past it');
const sorted = ends.sort((a, b) => a[0] - b[0]);
for (let i = 1; i < sorted.length; i++) assert.ok(sorted[i][0] < sorted[i - 1][1], 'no gaps in the run');
assert.ok(run.sprites.every((f) => f.y === 50 && f.visible));
const starts = log.filter((c) => c[0] === 'play').map((c) => c[1]);
assert.ok(starts.every((p) => p.startFrame >= 0 && p.startFrame < 8));

// a short roof: one band, narrowed to fit
const short = roofFire(scene([], anims), 0, 80, 0, { height: 72 });
assert.equal(short.sprites.length, 1);
assert.ok(Math.abs(480 * short.sprites[0].sx - 80) < 1e-6);

// shaken and gone
placeRoofFire(run, 1003, 52, true);
assert.ok(run.sprites.some((f) => f.x === 1003) && run.sprites.every((f) => f.y === 52));
placeRoofFire(run, 1003, 52, false);
assert.ok(run.sprites.every((f) => !f.visible));
delete FX.rooffire;
console.log('Roof fire checks passed: a gapless run the length of the roof, own frames, narrowed on a short roof, follows a shake.');
