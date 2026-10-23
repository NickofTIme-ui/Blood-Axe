import assert from 'node:assert/strict';
import { torchFlame } from '../src/view/TorchFlame.js';
import { FX } from '../src/view/stripImporter.js';

globalThis.Phaser = { BlendModes: { ADD: 1 } };
const made = (log) => {
  const o = { calls: log };
  for (const k of ['setOrigin', 'setDepth', 'setAlpha', 'setScale', 'setTint', 'setBlendMode']) o[k] = (...a) => { log.push([k, ...a]); return o; };
  o.play = (cfg) => { log.push(['play', cfg]); return o; };
  return o;
};
const scene = (log, anims = new Set()) => ({
  anims: { exists: (k) => anims.has(k), create: (cfg) => { anims.add(cfg.key); log.push(['anim', cfg]); } },
  add: { sprite: (x, y, key) => { log.push(['sprite', key]); return made(log); }, image: (x, y, key) => { log.push(['image', key]); return made(log); } },
  tweens: { add: () => log.push(['tween']) },
});

// the painted strip: a looping sprite on its own frame, scaled to the asked height
FX.torchflame = { key: 'fx-torchflame', count: 8, fw: 60, fh: 120, fps: 12 };
let log = [];
const anims = new Set();
torchFlame(scene(log, anims), 10, 20, { height: 30 });
torchFlame(scene(log, anims), 50, 20, { height: 30 });
assert.equal(log.filter((c) => c[0] === 'anim').length, 1, 'the loop is made once and shared');
assert.ok(log.some((c) => c[0] === 'sprite' && c[1] === 'fx-torchflame'), 'painted flame sprite');
assert.ok(log.some((c) => c[0] === 'setScale' && c[1] === 0.25), 'scaled to its height');
const plays = log.filter((c) => c[0] === 'play');
assert.equal(plays.length, 2);
assert.ok(plays.every((p) => p[1].startFrame >= 0 && p[1].startFrame < 8));
assert.ok(!log.some((c) => c[0] === 'image' && c[1] === 'flame'), 'no old drawn flame with the strip in');

// no strip yet: the old drawn flame, tweened
delete FX.torchflame;
log = [];
torchFlame(scene(log), 0, 0, { height: 64, tint: 0xb090ff });
assert.ok(log.some((c) => c[0] === 'image' && c[1] === 'flame') && log.some((c) => c[0] === 'tween'));
assert.ok(log.some((c) => c[0] === 'setTint' && c[1] === 0xb090ff));
delete globalThis.Phaser;
console.log('Torch flame checks passed: painted loop shared, own start frame, sized; drawn stand-in until the strip is in.');
