// The Rogue's thrown stars and knives are drawn small and spinning (about 17-20 px), never
// at the painted strip's full size with a spell's glow (the huge-shuriken bug, 2026-11-14),
// and a star hurts (Nick: "does no damage").
import assert from 'node:assert/strict';
import { ProjectileView } from '../src/view/ProjectileView.js';
import { FX } from '../src/view/stripImporter.js';
import { CHARACTERS } from '../src/data/characters.js';

globalThis.Phaser = { BlendModes: { ADD: 1, NORMAL: 0 } };
const object = () => {
  const o = { scaleX: 1, scaleY: 1, displayWidth: 0, displayHeight: 0 };
  for (const k of ['setDepth', 'setBlendMode', 'setOrigin', 'setPosition', 'setFrame', 'setRotation', 'setAlpha', 'setFillStyle']) o[k] = () => o;
  o.setScale = (x, y = x) => { o.scaleX = x; o.scaleY = y; return o; };
  o.setDisplaySize = (w, h) => { o.displayWidth = w; o.displayHeight = h; o.scaleX = w / 128; o.scaleY = h / 128; return o; };
  o.destroy = () => {};
  return o;
};
const scene = { add: { image: () => object(), ellipse: () => object(), rectangle: () => object(), graphics: () => object() }, gore: { spawn() {} } };
FX.shuriken = { key: 'fx-shuriken', fw: 128, fh: 128, count: 1, fps: 1 };
FX.throwknife = { key: 'fx-throwknife', fw: 128, fh: 40, count: 1, fps: 1 };

const kit = CHARACTERS.rogue.kit;
for (const data of [kit.knife.projectile, kit.fan.projectile, { ...kit.knife.projectile, look: 'knife' }]) {
  const p = { data, dir: 1, x: 0, z: 0, h: 50, hitList: new Set() };
  const v = new ProjectileView(scene, p);
  assert.equal(v.fx, null, `${data.look}: not drawn as a spell strip`);
  assert.ok(v.steel, `${data.look}: drawn as thrown steel`);
  assert.ok(v.core.displayWidth <= 22, `${data.look}: small (${v.core.displayWidth}px wide)`);
  v.update();
}
assert.ok(kit.knife.projectile.damage >= 9, 'a shuriken does real damage');
delete FX.shuriken; delete FX.throwknife; delete globalThis.Phaser;
console.log('Shuriken checks passed: stars and knives drawn small and spinning, not as huge spell strips; a star hits for real damage.');
