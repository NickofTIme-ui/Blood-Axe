// The snared man hangs upside down by the ankle (view/SnareHang.js), and Vexa's thrown star
// is small steel, not a fireball-sized painting (view/ProjectileView.js), with real damage.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { hangSprite, HANG } from '../src/view/SnareHang.js';
import { CHARACTERS } from '../src/data/characters.js';

const sprite = () => {
  const s = { x: 0, y: 0, scaleX: 1, scaleY: 1, angle: 0 };
  s.setPosition = (x, y) => { s.x = x; s.y = y; return s; };
  return s;
};
const man = { x: 500, z: 400, h: 0, alive: true, team: 'enemy', facing: 1, flash: 0, stats: { body: { h: 110 } }, snare: null };
const view = {};

// standing: untouched
let s = sprite();
assert.equal(hangSprite(view, s, man, 100), false);
assert.equal(s.angle, 0);

// caught: yanked up, then hanging upside down, ankle a body (and a gap) above the mud
man.snare = { kind: 'snare', t: 0 };
for (let t = 0; t <= 60; t++) { man.snare.t = t; s = sprite(); hangSprite(view, s, man, 100); }
assert.ok(Math.abs(Math.abs(s.angle) - 180) < 12, `upside down (${s.angle})`);
assert.ok(Math.abs((man.z - s.y) - (100 + HANG.clear)) < 2, `hung by the ankle (${man.z - s.y})`);
assert.equal(s.scaleX, -1, 'kept facing the same way when turned over');
assert.ok(view.hangAnkle && view.hangAnkle.y === s.y, 'the cord knows where his ankle is');

// a net is not a snare: no hanging
const netted = { ...man, snare: { kind: 'net', t: 30 } };
assert.equal(hangSprite({}, sprite(), netted, 100), false);

// cut loose: he comes down within a handful of frames, the right way up
man.snare = null;
let n = 0;
while (hangSprite(view, (s = sprite()), man, 100)) n++;
assert.ok(n > 0 && n <= 6, `drops in ${n} frames`);
assert.equal(view.hangAnkle, null);

// Vexa's star: drawn as thrown steel, and it hurts
const pv = readFileSync(new URL('../src/view/ProjectileView.js', import.meta.url), 'utf8');
assert.match(pv, /const steel = d\.look === 'knife' \|\| d\.look === 'shuriken';\n\s*this\.fx = d\.look && !steel/);
assert.ok(CHARACTERS.rogue.kit.knife.projectile.damage >= 8, 'a star does real damage');

console.log('snare hang test passed');
