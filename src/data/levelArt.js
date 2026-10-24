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
//   strips   frame strips cut into `frames` equal cells: `horse-gallop-0..5` (`key` as
//            for layers, or 'figure': black cut by flood fill from the edges; `grade`:
//            view/levelArt.js gradeSheet; `trim`: the empty rows above and below cut away)
//   tiles    stretches of back wall of their own, by section (the Black Keep: a hall, the cells,
//            the forge...): `tile_<name>.png` repeating sideways, `height` drawn, `key`
//            'magenta' for one with sky over it (else opaque)
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
    pieces: ['well', 'mill', 'barn', 'stables', 'stables_open', 'longhall', 'gate', 'pikes',
      // street clutter (data/stageVillage.js `decor`: view/VillageView.js drawDecor)
      'decor_signpost', 'decor_lantern', 'decor_debris', 'decor_debris2'],
    props: { wreckage: { file: 'prop_wreckage.png', pair: true }, cartwreck: { file: 'prop_cart.png', pair: true, texture: 'cartwreck' },
      archers: { file: 'prop_archers.png', pair: true }, barricade: { file: 'prop_barricade.png', pair: true } },
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
    surfaces: { plank: { fit: true } }, // (the half-gone bridge's planks, cut from the plank bridge in assets/incoming/bridges_raw.png)
  },
  gates: {
    dir: 'assets/env/gates/',
    layers: [
      { name: 'sky', key: 'opaque', scroll: 0.04, bottom: -40, height: 420 },
      { name: 'far', key: 'magenta', scroll: 0.12, bottom: -10, height: 300 },
      { name: 'mid', key: 'magenta', scroll: 0.45, bottom: -20, height: 240 },
    ],
    wall: { height: 200 },
    ground: true,
    pieces: ['gatehouse', 'winch_room', 'town', 'inner_wall', 'keep_road'],
    // (ram: the burned-out ram on the road, a block's `look`, view/TerrainView.js drawPaintedBlock)
    props: { winch: { file: 'prop_winch.png', pair: true }, ram: { file: 'prop_ram.png' } },
    // the gatehouse stair and landing (dressed stone) and the guardroom's rotten floor
    // (prompts: docs/gates-art-prompts.md)
    surfaces: { rock_top: { fit: true }, rock_front: { px: 160 }, plank: { fit: true } },
  },
  // THE BLACK KEEP (view/KeepView.js): each part of the Keep has its own wall (`tiles`);
  // what isn't painted stays drawn in code. Prompts: docs/keep-art-prompts.md
  keep: {
    dir: 'assets/env/keep/',
    layers: [
      { name: 'sky', key: 'opaque', scroll: 0.04, bottom: -40, height: 420 },
      { name: 'far', key: 'magenta', scroll: 0.12, bottom: -10, height: 320 },
    ],
    ground: true,
    tiles: {
      causeway: { height: 330, key: 'magenta' }, battlements: { height: 280, key: 'magenta' },
      hall: { height: 760 }, cells: { height: 760 }, forge: { height: 760 }, root: { height: 760 }, spire: { height: 760 },
    },
    props: { pin: { file: 'prop_pin.png', pair: true }, conduit: { file: 'prop_conduit.png', pair: true }, spire: { file: 'prop_spire.png', pair: true } },
    surfaces: { rock_top: { fit: true }, rock_front: { px: 160 } },
  },
  // THE GALLOWS ASCENT (the night climb, view/TerrainView.js): its painted backdrop, cliff
  // wall, floor and ledge faces. Prompts: docs/gallows-art-prompts.md. (The code-drawn sky
  // stays behind everything: the camera climbs higher than a painted sky reaches.)
  gallows: {
    dir: 'assets/env/gallows/',
    layers: [
      { name: 'sky', key: 'opaque', scroll: 0.04, bottom: -40, height: 420 },
      { name: 'far', key: 'magenta', scroll: 0.12, bottom: -10, height: 240 },
      { name: 'mid', key: 'magenta', scroll: 0.45, bottom: -20, height: 220 },
    ],
    wall: { height: 150 },
    ground: true,
    surfaces: { rock_top: { fit: true }, rock_front: { px: 160 }, plank: { fit: true } },
  },
  fx: {
    dir: 'assets/fx/',
    // (key 'figure': cut from its black by flood fill, so the dark coats stay solid; trimmed
    // to the rows the horses use, so they aren't squashed into their display size; graded
    // with an ink line and firelit edges so they read on the dark yard)
    strips: { 'horse-gallop': { file: 'horse_gallop.png', frames: 6, key: 'figure', trim: true, grade: { contrast: 1.12, saturation: 1.1, outline: 3, rim: 0.6 } } },
  },
};

// Painted figures that have no sprite pipeline of their own yet: the villagers
// (view/NpcView.js), the war hounds (view/HoundView.js) and the Ore Crusher
// (view/CrusherView.js). Each is one row of poses on plain black, cut into `frames`
// equal cells and scaled so the tallest pose is `height` px (drawn at half that). A
// figure keeps its code drawing until its sheets exist (all of them, for the creatures).
// The poses in each sheet are listed in docs/campaign/art-levels-1-2.md (items 8, 16,
// 17, 25).
const NPC_GRADE = { contrast: 1.12, saturation: 1.18, outline: 2, rim: 0.45 };
export const SPRITE_SHEETS = {
  // (the village's people are cut at the heroes' height, a standing man about 110 px, and
  // graded like Nicholas so they stand out from the painted street: Nick, 2026-10-16,
  // "you need to really see the npcs to interact with them")
  villager: { file: 'assets/sprites/npc/villager.png', frames: 8, height: 235, grade: NPC_GRADE },
  mother: { file: 'assets/sprites/npc/mother.png', frames: 6, height: 235, grade: NPC_GRADE },
  boy: { file: 'assets/sprites/npc/boy.png', frames: 6, height: 170, grade: NPC_GRADE },
  elder: { file: 'assets/sprites/npc/elder.png', frames: 4, height: 228, grade: NPC_GRADE },
  // the villager Varek kills in the opening (view/NpcView.js drawKneeling): begging on his
  // knees, struck, pitching forward, face down (ChatGPT, 2026-10-24). Each pose sits with
  // its boots at the same spot in its cell; height: the begging pose as tall as the
  // villager sheet's kneeling one (170 px)
  'villager-death': { file: 'assets/sprites/npc/villager_death.png', frames: 4, height: 170, grade: NPC_GRADE },
  captive: { file: 'assets/sprites/npc/captive.png', frames: 6, height: 250 }, // (big: the hanging pose's rope makes it the tallest, and a standing man must still match the heroes)
  // the mine's chained prisoners (view/NpcView.js PRISONERS): the villager and elder sheets
  // again, cut at the heroes' height (a standing man as tall as the captive above) and so
  // at more of their painted detail, instead of the village's smaller cut
  miner: { file: 'assets/sprites/npc/villager.png', frames: 8, height: 205 },
  'miner-old': { file: 'assets/sprites/npc/elder.png', frames: 4, height: 192 },
  // ...until each prisoner has his own sheet (docs/mine-prisoner-art-prompts.md): 7 poses,
  // kneel at the chain, plead, cower, run x3, stand; re-laid one figure per equal cell,
  // feet on one line. Heights put a standing man at about 90-102 px (Bram the biggest)
  'prisoner-tobin': { file: 'assets/sprites/npc/prisoner_tobin.png', frames: 7, height: 215 },
  'prisoner-hilde': { file: 'assets/sprites/npc/prisoner_hilde.png', frames: 7, height: 213 },
  'prisoner-bram': { file: 'assets/sprites/npc/prisoner_bram.png', frames: 7, height: 250 },
  'prisoner-a': { file: 'assets/sprites/npc/prisoner_a.png', frames: 7, height: 233 },
  'prisoner-b': { file: 'assets/sprites/npc/prisoner_b.png', frames: 7, height: 225 },
  'prisoner-c': { file: 'assets/sprites/npc/prisoner_c.png', frames: 7, height: 205 },
  // Nicholas, the mountain guide (Nick in the game; docs/nicholas-art-prompts.md): 9 poses,
  // the villager sheet's order (point the way where the villager waves, brace where he
  // cowers, sit wounded) and a ninth, lying dead. Until it's painted he walks on the
  // villager sheet.
  // He's graded to sit with the heroes (view/levelArt.js gradeSheet: the sheet is painted
  // softer and browner than their strips), cut round his torso so he doesn't hop sideways
  // between poses, and as tall as Rurik.
  nicholas: { file: 'assets/sprites/npc/nicholas.png', frames: 9, height: 235, centre: true, grade: { contrast: 1.16, saturation: 1.22, outline: 2, rim: 0.5 } },
  // his walk: an eight-pose cycle (docs/nicholas-art-prompts.md, "walk"); until it's in he
  // walks on the sheet's three stride poses. (height: tune it on screen next to his stand)
  'nicholas-walk': { file: 'assets/sprites/npc/nicholas_walk.png', frames: 8, height: 232, centre: true, grade: { contrast: 1.04, saturation: 1.05, outline: 0, rim: 0.25 } },
  // Irvolino, the miller (made in ChatGPT from his photo: docs/irvolino-art-prompts.md): the
  // villager sheet's 8 poses. He leads the miller's people out of the barn; until he's
  // painted he's the villager.
  irvolino: { file: 'assets/sprites/npc/irvolino.png', frames: 8, height: 235, grade: NPC_GRADE },
  // ...cut free on the gallows (the painted rescue strip, assets/npcs/mill-rescue/irvolino-rescue.png,
  // laid out in a row on one floor line): bound, the ropes fall, the noose off, down on a
  // knee, thanks, rising, standing, a stride. Cut to stand as tall as his own sheet's man.
  'irvolino-freed': { file: 'assets/npcs/mill-rescue/irvolino-freed.png', frames: 8, height: 206, centre: true, grade: NPC_GRADE },
  elsbeth: {file:'assets/npcs/mill-rescue/elsbeth-row.png',frames:8,height:235,grade:NPC_GRADE},
  // Vincent, the Gatewright (view/VincentView.js; made in ChatGPT from his photo:
  // docs/vincent-art-prompts.md): stand, grip the bars, crank, aim, loose, walk x3, wave
  vincent: { file: 'assets/sprites/npc/vincent.png', frames: 9, height: 205 },
  scorpion: { file: 'assets/sprites/npc/scorpion.png', frames: 1, height: 190 }, // his Gate Scorpion, side on
  'hound-walk': { file: 'assets/enemies/strips/hound_walk.png', frames: 6, height: 120 },
  'hound-atk1': { file: 'assets/enemies/strips/hound_atk1.png', frames: 4, height: 120 },
  'hound-react': { file: 'assets/enemies/strips/hound_react.png', frames: 3, height: 120 },
  'hound-doom': { file: 'assets/enemies/strips/hound_doom.png', frames: 4, height: 120 },
  // the Crusher's strips: each is scaled to its tallest pose (the hammer hauled up, the
  // sparks, the dust), and the machine is painted at a different size in each, so each
  // strip has its own height that keeps the hull and wheels the walk's size (matched by eye
  // on the rear wheel and hull; it shrank by a quarter in the slam at one height for all)
  'crusher-walk': { file: 'assets/enemies/strips/crusher_walk.png', frames: 6, height: 380 },
  'crusher-atk1': { file: 'assets/enemies/strips/crusher_atk1.png', frames: 4, height: 395 },
  'crusher-heavy': { file: 'assets/enemies/strips/crusher_heavy.png', frames: 5, height: 495 },
  'crusher-doom': { file: 'assets/enemies/strips/crusher_doom.png', frames: 5, height: 355 },
};
