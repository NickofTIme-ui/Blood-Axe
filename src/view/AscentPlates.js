// The Shattered Ascent's painted scenes (assets/env/ascent/scene_*.png): whole views of the
// cliff road, the refuge, the gorge crossing, the battery and the camp, each one a screen
// wide, laid end to end so the level is one continuous painting.
//
// Each spot names the painting it wants and what stands in for it until that one is painted
// (a mirrored copy of a neighbour), so no two copies of the same view ever sit side by side
// the same way round. Neighbours overlap by their feathered edges and cross-fade.
import {DEPTH} from './depths.js';
import {featheredKey} from './levelArt.js';

// [x0 (left edge, world), y (the painting's lift: its foot is at y + 530), wants, stand-ins, flip]
const SPOTS = [
  [-180, -80, 'road', [], false],
  [ 700, -80, 'road_b', ['road'], true],
  [1580, -80, 'road_c', ['road'], false],
  [2420, -80, 'road_b', ['road'], true],
  [3217, -80, 'refuge', [], false],
  [4140, -80, 'road_c', ['road'], true],
  [4757, -80, 'causeway', [], false], // (its gorge over the causeway's pit, 5000-5600)
  [5700, -80, 'road_b', ['road'], true],
  [6200, -150, 'battery', [], false],
  [7560, -80, 'camp_b', ['camp'], true],
  [8240, -80, 'camp', [], false],
];

export class AscentPlates {
  constructor(scene) {
    this.scene = scene; this.names = new Set(); this.spans = [];
    const has = (n) => scene.textures.exists('lvl-ascent-scene_' + n);
    SPOTS.forEach(([x, y, want, alts, flip], i) => {
      const name = has(want) ? want : alts.find(has);
      if (!name) return;
      const mirror = name !== want ? flip : false; // (a stand-in is turned round; its own painting is not)
      const key = 'lvl-ascent-scene_' + name;
      const soft = featheredKey(scene, key, { left: .12, right: .12, top: .09, bottom: name === 'battery' ? 0 : .14 });
      const source = scene.textures.get(key).getSourceImage();
      // one source pixel per render pixel at the game's 2x drawing: no stretch
      const scale = .5, w = source.width * scale, h = source.height * scale, bottom = y + 530;
      // later spots draw over earlier ones, so each cross-fades over the one before it
      scene.add.image(x, bottom - h, soft).setOrigin(0).setScale(scale).setFlipX(mirror).setDepth(DEPTH.floor + .05 + i * .001);
      this.names.add(want); this.spans.push([x, x + w]);
    });
    // local warm spill at the painted camp fires, kept behind the fighters
    if (this.has('camp')) for (const [x, y] of [[8400, 190], [8720, 190], [7700, 190]]) {
      const glow = scene.add.image(x, y, 'glow').setDisplaySize(190, 135).setTint(0xd4864b).setAlpha(.11).setBlendMode(Phaser.BlendModes.ADD).setDepth(DEPTH.floor + .06);
      scene.tweens.add({ targets: glow, alpha: .17, duration: 780 + x % 300, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    }
  }
  has(name) { return this.names.has(name); }
  // is this stretch of the level under a painted scene?
  covers(x) { return this.spans.some(([a, b]) => x >= a + 60 && x <= b - 60); }
}
