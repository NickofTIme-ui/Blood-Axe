// levelArt.js — The painted art for the campaign's levels, by file name. Every entry is
// optional: a file that isn't there yet is skipped, and the level keeps drawing that piece
// in code (view/VillageView.js, view/WoodView.js, view/StageView.js). The prompts for each
// picture are in docs/campaign/art-levels-1-2.md.
//
//   layers   the far backdrop, back to front: `scroll` (how fast it moves with the camera),
//            `bottom` (px above the street's back edge; negative = tucked behind it),
//            `height` (drawn height), `key` ('opaque', or the flat background colour cut
//            away at load: 'magenta' / 'black'). Each repeats sideways.
//   wall     the street's back wall (repeats along the level), `height` drawn
//   ground   the street under the fight (repeats), opaque
//   pieces   set pieces drawn over the back wall where the level's own spot for them is
//            (the barn, the stables...); `pair: true` = two pictures side by side (whole,
//            and broken/open)
//   props    breakables repainted: the prop kind they replace (`prop-<kind>` and, with
//            `pair`, `prop-<kind>-broken`)
//   strips   frame strips cut into `frames` equal cells: `horse-gallop-0..5`
//   surfaces the ground you stand and jump on (terrain blocks: view/TerrainView.js), as
//            opaque seamless tiles `surf_<name>.png`. `fit`: stretched to the face's depth
//            (a top face, receding into the lane); `px`: drawn this many px tall, repeating

export const LEVEL_ART = {
  village: {
    dir: 'assets/env/village/',
    layers: [
      { name: 'sky', key: 'opaque', scroll: 0.04, bottom: -40, height: 420 },
      { name: 'far', key: 'magenta', scroll: 0.12, bottom: -10, height: 190 },
      { name: 'mid', key: 'magenta', scroll: 0.45, bottom: -20, height: 230 },
    ],
    wall: { height: 250 },
    ground: true,
    pieces: ['well', 'barn', 'stables', 'longhall', 'gate', 'pikes'],
    props: { wreckage: { file: 'prop_wreckage.png', pair: true }, cartwreck: { file: 'prop_cart.png', pair: true, texture: 'cartwreck' } },
    surfaces: { roof_top: { fit: true }, roof_front: { px: 180 }, beam: { px: 40 }, board: { fit: true } },
  },
  wood: {
    dir: 'assets/env/wood/',
    layers: [
      { name: 'sky', key: 'opaque', scroll: 0.04, bottom: -40, height: 420 },
      { name: 'far', key: 'magenta', scroll: 0.12, bottom: -10, height: 200 },
      { name: 'mid', key: 'magenta', scroll: 0.45, bottom: -20, height: 260 },
    ],
    wall: { height: 330 },
    ground: true,
    pieces: ['hanging_tree', 'kennels', 'rockslide'],
    props: { wagon: { file: 'convoy_wagon.png', pair: true }, cagecart: { file: 'cage_cart.png', pair: true, texture: 'cagecart' } },
    surfaces: { rock_top: { fit: true }, rock_front: { px: 160 }, log: { px: 40 }, plank: { fit: true } },
  },
  mine: {
    dir: 'assets/env/mine/',
    layers: [
      { name: 'sky', key: 'opaque', scroll: 0.04, bottom: -40, height: 420 },
      { name: 'far', key: 'magenta', scroll: 0.12, bottom: -10, height: 260 },
      { name: 'mid', key: 'magenta', scroll: 0.45, bottom: -20, height: 300 },
    ],
    wall: { height: 340 },
    ground: true,
    pieces: ['furnace'],
    props: {
      shackle: { file: 'prop_shackle.png', pair: true }, counterweight: { file: 'prop_counterweight.png', pair: true },
      rubble: { file: 'prop_rubble.png', pair: true },
    },
    surfaces: { rock_top: { fit: true }, rock_front: { px: 160 }, plank: { fit: true } },
  },
  ascent: {
    dir: 'assets/env/ascent/',
    layers: [
      { name: 'sky', key: 'opaque', scroll: 0.04, bottom: -40, height: 420 },
      { name: 'far', key: 'magenta', scroll: 0.12, bottom: -10, height: 280 },
      { name: 'mid', key: 'magenta', scroll: 0.45, bottom: -20, height: 260 },
    ],
    wall: { height: 140 }, // (low: the Keep across the gorge shows over it)
    ground: true,
    pieces: ['overhang', 'palisade', 'camp', 'gates_view'],
    props: { catapult: { file: 'prop_catapult.png', pair: true } },
  },
  fx: {
    dir: 'assets/fx/',
    strips: { 'horse-gallop': { file: 'horse_gallop.png', frames: 6, key: 'black' } },
  },
};

// Painted figures that have no sprite pipeline of their own yet: the villagers
// (view/NpcView.js), the war hounds (view/HoundView.js) and the Ore Crusher
// (view/CrusherView.js). Each is one row of poses on plain black, cut into `frames`
// equal cells and scaled so the tallest pose is `height` px (drawn at half that). A
// figure keeps its code drawing until its sheets exist (all of them, for the creatures).
// The poses in each sheet are listed in docs/campaign/art-levels-1-2.md (items 8, 16,
// 17, 25).
export const SPRITE_SHEETS = {
  villager: { file: 'assets/sprites/npc/villager.png', frames: 8, height: 150 },
  mother: { file: 'assets/sprites/npc/mother.png', frames: 6, height: 150 },
  boy: { file: 'assets/sprites/npc/boy.png', frames: 6, height: 110 },
  elder: { file: 'assets/sprites/npc/elder.png', frames: 4, height: 150 },
  captive: { file: 'assets/sprites/npc/captive.png', frames: 6, height: 150 },
  'hound-walk': { file: 'assets/enemies/strips/hound_walk.png', frames: 6, height: 120 },
  'hound-atk1': { file: 'assets/enemies/strips/hound_atk1.png', frames: 4, height: 120 },
  'hound-react': { file: 'assets/enemies/strips/hound_react.png', frames: 3, height: 120 },
  'hound-doom': { file: 'assets/enemies/strips/hound_doom.png', frames: 4, height: 120 },
  'crusher-walk': { file: 'assets/enemies/strips/crusher_walk.png', frames: 6, height: 380 },
  'crusher-atk1': { file: 'assets/enemies/strips/crusher_atk1.png', frames: 4, height: 380 },
  'crusher-heavy': { file: 'assets/enemies/strips/crusher_heavy.png', frames: 5, height: 380 },
  'crusher-doom': { file: 'assets/enemies/strips/crusher_doom.png', frames: 5, height: 380 },
};
