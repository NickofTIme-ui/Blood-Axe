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
  fx: {
    dir: 'assets/fx/',
    strips: { 'horse-gallop': { file: 'horse_gallop.png', frames: 6, key: 'black' } },
  },
};
