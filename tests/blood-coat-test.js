// Rurik's blood (view/BloodCoat.js): every sheet he's drawn from has a blood layer, baked
// frame for frame at half its size (tools/bake-blood-layers.py), so the blood stays on him
// through every swing and move and sits exactly on his own drawing.
import assert from 'node:assert/strict';
import fs from 'node:fs';
globalThis.Phaser ??= { Textures: { FilterMode: { LINEAR: 0 } } };
const { BLOODIED } = await import('../src/view/BloodCoat.js');
const { HERO_HD } = await import('../src/data/heroHdAssets.js');
const { GRAB_SHEETS } = await import('../src/data/grabArt.js');

function pngSize(file) {
  const b = fs.readFileSync(file);
  return [b.readUInt32BE(16), b.readUInt32BE(20)];
}
const sheets = [...HERO_HD.sheets, ...GRAB_SHEETS].filter((s) => s.hero === 'rurik' && s.baseFirst == null);
assert.ok(sheets.length > 40, 'Rurik has all his sheets');
for (const s of sheets) {
  const key = `${s.key}-${s.name}`;
  const layer = BLOODIED[key];
  assert.ok(layer, `${key} has a blood layer`);
  assert.ok(fs.existsSync(layer), `${layer} exists`);
  const [w, h] = pngSize(s.file), [lw, lh] = pngSize(layer);
  assert.equal(lw, w / 2, `${key}: layer is half the sheet's width`);
  assert.equal(lh, h / 2, `${key}: layer is half the sheet's height`);
}
for (const k of ['ulric', 'ulricOath']) assert.ok(fs.existsSync(BLOODIED[k]), `${k} base poses have a blood layer`);
assert.ok(!fs.readdirSync('assets/sprites/heroes-hd').some((f) => /-(blood|soaked)\.png$/.test(f)), 'the old whole-body repaints (the double Rurik) are gone from the game');
console.log(`Blood coat checks passed: ${sheets.length} sheets + base poses each have a lined-up blood layer.`);
