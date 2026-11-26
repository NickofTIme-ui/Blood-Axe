// orynArt.js — Oryn's second set of poses (ChatGPT, 16 Nov 2026; docs/mage-art-prompts.md
// section 13), baked into the HD sheet format by tools/bake-oryn-strips.py (416 x 480
// cells, one row, his boots on y 460; his lantern turned to the blue orb his other sheets
// carry). Kept out of heroHdAssets.js (regenerated on the PC by tools/compile-hero-hd.mjs)
// and added to it by view/heroHd.js, as data/vexaArt.js is. Originals in
// art-incoming/oryn-second-set/ and the strips in assets/sprites/strips/mage_<name>.png.
const sheet = (name, frames) => ({ id: `oryn-mage-${name}`, hero: 'oryn', key: 'mage', name, file: `assets/sprites/heroes-hd/oryn-mage-${name}.png`, frames, fw: 416, fh: 480, cols: frames, originX: 0.5, originY: 460 / 480, swords: [] });
export const ORYN_SHEETS = [
  sheet('updraft', 6),   // UPDRAFT: ready, the staff swept low, swept up, raised, held high, ready
  sheet('skyfall', 6),   // SKYFALL BOLT: staff to the sky, gathering, the flash, pointed down at them, planted, ready
  sheet('meteor', 4),    // METEOR DROP: staff raised at the top, diving head first, landed in a crouch, rising
  sheet('jab', 6),       // the lantern jab: ready, drawn back, the thrust, full reach, recoil, ready
  sheet('twirl', 6),     // the staff twirl: six spins of the staff
  sheet('vault', 6),     // the pole vault kick: the run in, the staff planted, up on it, the flying kick, landing, ready
  sheet('grab', 8),      // GRAB AND THROW: ready, the clamp, four march steps, the shove wound up, the shove
  sheet('block', 8),     // guard, a blow on it, recover, guard round, body hit, head hit, falling, dead
  sheet('finSpires', 8), // IMPALING SPIRES: ready, staff raised, the slam, planted, rising spires held, the fist, turning, ready
  // the 26 Nov 2026 set (docs/mage-art-prompts.md section 15; tools/bake-oryn-nov26.py,
  // originals in art-incoming/oryn-nov26/)
  sheet('thunder', 6),   // THUNDER STAFF: ready, whirled up behind, raised blazing, smashed down, planted, ready
  sheet('spikes', 6),    // STONE SPIKES: ready, staff lifted foot down, driven in, leaning on it, hand swept along the floor, pulled free
  sheet('air', 6),       // IN THE AIR: chop raised, chop down, palm gathered, palm thrust down (DOWNBURST), staff raised, staff pointed down (FALLING BULWARK)
];
