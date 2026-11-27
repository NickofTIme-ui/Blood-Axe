import { FOLK_PAINTED, FOLK_FRAMES } from './folk.js';
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
    wallMore: ['wall_b', 'wall_c'], // (more rows of houses, so the street doesn't repeat: Nick's level 1 review, 2026-11-03)
    ground: true,
    pieces: ['well', 'mill', 'barn', 'stables', 'stables_open', 'longhall', 'gate', 'pikes',
      // street clutter (data/stageVillage.js `decor`: view/VillageView.js drawDecor)
      'decor_signpost', 'decor_lantern', 'decor_debris', 'decor_debris2',
      // a roof's end (view/TerrainView.js drawVillageBlock): painted as the right end, mirrored for the left
      'roof_gable',
      // the burning alley seen down between two houses, under the roofs' gaps (view/TerrainView.js
      // burningCellar), and the dark foreground strip along the bottom of the screen
      // (view/VillageView.js drawForeground): Nick's second level 1 review, 2026-11-03
      'roof_gap', 'fg'],
    props: { wreckage: { file: 'prop_wreckage.png', pair: true }, cartwreck: { file: 'prop_cart.png', pair: true, texture: 'cartwreck' },
      archers: { file: 'prop_archers.png', pair: true }, barricade: { file: 'prop_barricade.png', pair: true } },
    surfaces: { roof_top: { fit: true }, roof_front: { px: 180 }, beam: { px: 40 }, board: { fit: true },
      eave: { fit: true, key: 'magenta' } }, // (a roof's slate edge hanging over its house front)
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
    pieces: ['hanging_tree', 'kennels', 'rockslide',
      // the wood's traps (view/WoodTrapsView.js) and front ferns (view/WoodWeather.js), cut from
      // ChatGPT paintings by tools/cut-wood-art.py (2026-11-14); code-drawn without them
      'trap_pine', 'trap_logpile', 'trap_logpile_loose', 'trap_log', 'trap_snare', 'trap_snare_sprung',
      'trap_stakes', 'trap_stakes_open', 'pen_gate', 'fern_1', 'fern_2', 'fern_3',
      // round 2 (2026-11-16): the ford's deadfall, the Houndmaster's net (flying, fallen)
      'trap_deadfall', 'net_fly', 'net_down',
      // a grunt caught in a snare, upside down by one ankle (data/snaredArt.js)
      'snared_grunt_1', 'snared_grunt_2', 'snared_grunt_3',
      // ...and (round 3, 2026-11-18) a stalker, a butcher and a hound by a hind leg
      'snared_stalker_1', 'snared_stalker_2', 'snared_stalker_3', 'snared_butcher_1', 'snared_butcher_2', 'snared_butcher_3',
      'snared_hound_1', 'snared_hound_2', 'snared_hound_3',
      // the streams and the old ford, each with its own banks (view/TerrainView.js paintedWater;
      // ChatGPT, 2026-11-19: tools/cut-water-art.py)
      'water_stream', 'water_ford', 'water_stone_1', 'water_stone_2', 'water_stone_3',
      // round 4 (2026-11-20, tools/cut-wood-art.py): the hanging tree's dead (view/NpcView.js
      // drawHanged), the Ashen signal lantern lit and knocked down (view/WoodTrapsView.js), the
      // cage carts' boulder and shelf (view/TerrainView.js), the war horn (view/WoodTrapsView.js)
      'hanged_1', 'hanged_2', 'hanged_3', 'signal_lantern', 'signal_lantern_down', 'boulder_shelf',
      'war_horn', 'war_horn_blow',
      // the treetops along the top of the back wall (view/WoodView.js canopy)
      'canopy'],
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
    wallMore: ['wall_b', 'wall_c'], // (the back wall: heavier framing and a ladder, then a blue ore seam: ChatGPT 2026-11-26)
    ground: true,
    pieces: ['furnace', 'water_river', // (the underground river's crossings: view/TerrainView.js paintedWater)
      'stone_0', 'stone_1', 'stone_2', 'timber_bridge', 'ore_cart', 'ore_cart_broken', 'lift', 'lift_chain', 'planks_rotten', 'portcullis', 'pillar'], // (its stepping stones and the pit-prop bridge, cut out: ChatGPT 2026-11-26)
    props: {
      shackle: { file: 'prop_shackle.png', pair: true }, counterweight: { file: 'prop_counterweight.png', pair: true },
      rubble: { file: 'prop_rubble.png', pair: true },
      steammain: { file: 'prop_steammain.png', pair: true }, // (the Crusher Hall's steam main, whole and burst: ChatGPT 2026-11-26)
      crate: { file: 'prop_crate.png', pair: true, texture: 'prop-mine-crate' },
      barrel: { file: 'prop_barrel.png', pair: true, texture: 'prop-mine-barrel' }, // (and its barrels: the miners' water casks, whole and burst in a puddle) // (the mine's crates: iron-strapped ore crates under the King's ember brand, whole and smashed: ChatGPT 2026-11-26)
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
    pieces: ['overhang', 'palisade', 'camp', 'gates_view', 'causeway', 'gorge', 'crater', 'scene_road', 'scene_refuge', 'scene_battery', 'scene_camp'],
      tiles: { refuge_floor: {height: 348}, siege_floor: {height: 348} },
    props: { catapult: { file: 'prop_catapult.png', pair: true } },
    surfaces: { rock_top: { px: 348 }, siege_top: { px: 348 }, rock_front: { px: 140 }, plank: { fit: true } }, // (the half-gone bridge's planks, cut from the plank bridge in assets/incoming/bridges_raw.png)
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
    props: { winch: { file: 'prop_winch.png', pair: true }, ram: { file: 'prop_ram.png' },
      // the garrison's and the traps' pieces (data/gatesEnemies.js, stage/GatesTraps.js; ChatGPT
      // 2026-11-27, cut from gates_pieces.png by hand): the drop gate, the bolt, four plates, caltrops
      dropgate: { file: 'prop_dropgate.png' }, bolt: { file: 'piece_bolt.png', texture: 'gates-bolt' },
      plate0: { file: 'piece_plate0.png', texture: 'gates-plate-0' }, plate1: { file: 'piece_plate1.png', texture: 'gates-plate-1' },
      plate2: { file: 'piece_plate2.png', texture: 'gates-plate-2' }, plate3: { file: 'piece_plate3.png', texture: 'gates-plate-3' },
      caltrop0: { file: 'piece_caltrop0.png', texture: 'gates-caltrop-0' }, caltrop1: { file: 'piece_caltrop1.png', texture: 'gates-caltrop-1' },
      caltrop2: { file: 'piece_caltrop2.png', texture: 'gates-caltrop-2' } },
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
    pieces: ['throne_hall', 'colossus', 'fist', 'plinth'], // (the Ashen Throne's hall, and the colossus that wakes behind it: view/KeepView.js drawThrone)
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
// (the wood's own painted folk, Joren and Ansel, come out of ChatGPT warm and saturated already:
// the ink line and a little rim, colour pulled back a touch to sit in the grey rain)
const WOOD_FOLK_GRADE = { contrast: 1.04, saturation: 0.9, outline: 2, rim: 0.35 };
// (the king: sharper and brighter still, a warmer rim: he is the brightest thing in the square)
const KING_GRADE = { contrast: 1.15, saturation: 1.12, outline: 2, rim: 0.6 };
export const SPRITE_SHEETS = {
  // the common folk a hero frees, each their own person (data/folk.js)
  ...Object.fromEntries(FOLK_PAINTED.map((id) => [id, { file: `assets/sprites/npc/folk/${id.slice(5)}.png`, frames: FOLK_FRAMES, height: 235, grade: NPC_GRADE, centre: true }])),
  // (the village's people are cut at the heroes' height, a standing man about 110 px, and
  // graded like Nicholas so they stand out from the painted street: Nick, 2026-10-16,
  // "you need to really see the npcs to interact with them")
  villager: { file: 'assets/sprites/npc/villager.png', frames: 8, height: 235, grade: NPC_GRADE },
  // more of the wood's captives, in the villager sheet's 8 poses (view/NpcView.js WOOD_LOOKS;
  // ChatGPT, 2026-11-18): a woodcutter's wife in a moss shawl, a tanner's apprentice, a
  // charcoal burner
  'villager-woman': { file: 'assets/sprites/npc/villager_woman.png', frames: 8, height: 235, grade: NPC_GRADE },
  'villager-tanner': { file: 'assets/sprites/npc/villager_tanner.png', frames: 8, height: 240, grade: NPC_GRADE },
  'villager-burner': { file: 'assets/sprites/npc/villager_burner.png', frames: 8, height: 232, grade: NPC_GRADE },
  mother: { file: 'assets/sprites/npc/mother.png', frames: 6, height: 235, grade: NPC_GRADE },
  boy: { file: 'assets/sprites/npc/boy.png', frames: 6, height: 170, grade: NPC_GRADE },
  // THE WELL (stage/WellRescue.js; ChatGPT, 2026-11-23, prompts docs/well/well-art.md): Mira on her
  // own (stand, sobbing crouch, straining for her boy, screaming with both arms out, the shove),
  // the boy hoisted by his collar (kicking, reaching down, hanging), and the butcher's arm-out
  // hold (up, shaking, lowered). Baked to equal cells by tools/bake-pose-row.py
  mira: { file: 'assets/sprites/npc/mira.png', frames: 5, height: 235, grade: NPC_GRADE },
  'boy-held': { file: 'assets/sprites/npc/boy_held.png', frames: 3, height: 150, grade: NPC_GRADE },
  'butcher-hold': { file: 'assets/sprites/npc/butcher_hold.png', frames: 3, height: 300 },
  // Tam, the boy trapped up on the burning roofs (view/NpcView.js drawStranded): cling, wave
  // x2, call, flinch, reach down, relief, climb down (ChatGPT, 2026-10-24, from the boy sheet
  // above). Height: his standing pose as tall as the boy's (about 157 px)
  'boy-roof': { file: 'assets/sprites/npc/boy_roof.png', frames: 8, height: 181, grade: NPC_GRADE, centre: true },
  // Pip, the miner's boy stranded on the ledge over the lift shaft (Hollow Mountain): the same poses
  // as Tam's two sheets, as him (ChatGPT, 2026-11-26; tools/bake-pose-row.py)
  'pip-roof': { file: 'assets/sprites/npc/pip_roof.png', frames: 8, height: 181, grade: NPC_GRADE, centre: true },
  pip: { file: 'assets/sprites/npc/pip.png', frames: 6, height: 170, grade: NPC_GRADE },
  elder: { file: 'assets/sprites/npc/elder.png', frames: 4, height: 228, grade: NPC_GRADE },
  // Hale the smith, on his feet at the start of level 1 (he stood on the villager sheet, the
  // same man Varek kills: Nick, 2026-11-02, "he looks copy and pasted"). ChatGPT, from the
  // villager sheet's style (docs/hale/hale-art-prompts.md): stand, look round, wave over,
  // walk x3, point the way, wipe his brow. A big man: standing, a head over the villager
  hale: { file: 'assets/sprites/npc/hale.png', frames: 8, height: 258, grade: NPC_GRADE, centre: true },
  // KING HAKON, the Oath King, Rurik's father (stage/KingHakon.js, view/KingView.js): his own
  // high-end sheets, not a villager's (Nick, 2026-11-04). ChatGPT, from his dying painting
  // and Rurik's sheet (docs/king-hakon/king-hakon-art-prompts.md); 4 poses each, re-laid with
  // docs/king-hakon/relay.py. Heights: crown to boots 310 in every sheet (drawn at 0.4 in view/KingView.js: about
  // 124 px, a little over his son: Nick, 2026-11-05), the sheet's tallest pose (a raised blade) above that
  'king-stand': { file: 'assets/sprites/npc/king_stand.png', frames: 4, height: 325, grade: KING_GRADE, centre: true },
  'king-run': { file: 'assets/sprites/npc/king_run.png', frames: 4, height: 296, grade: KING_GRADE, centre: true },
  'king-strike-a': { file: 'assets/sprites/npc/king_strike_a.png', frames: 4, height: 321, grade: KING_GRADE, centre: true },
  'king-strike-b': { file: 'assets/sprites/npc/king_strike_b.png', frames: 4, height: 480, grade: KING_GRADE, centre: true },
  // the villager Varek kills in the opening (view/NpcView.js drawKneeling): begging on his
  // knees, struck, pitching forward, face down (ChatGPT, 2026-10-24). Each pose sits with
  // its boots at the same spot in its cell; height: the begging pose as tall as the
  // villager sheet's kneeling one (170 px)
  'villager-death': { file: 'assets/sprites/npc/villager_death.png', frames: 4, height: 170, grade: NPC_GRADE },
  // Joren, strung up by his wrists on the hanging tree (view/NpcView.js drawTreed; Nick,
  // 2026-11-24: "heavily upgrade this guy"). ChatGPT: hanging, kicking on the rope, dropped to
  // one knee, standing (wrists still tied), a four-beat run. The hanging cells are cut at his
  // wrists (the rope is the dead's painted hemp, drawn to them) and sit at the cell's top;
  // height puts him standing at about 105 px
  joren: { file: 'assets/sprites/npc/joren.png', frames: 8, height: 231, grade: WOOD_FOLK_GRADE, centre: true, bg: 'magenta' },
  // Ansel the wheelwright, the wood's escort with the broken leg (data/stageWood.js; Nick,
  // 2026-11-24: "the guy with the broken leg needs new art bring up the quality"). ChatGPT,
  // his splinted leg and crutch painted in: stand, call for help, cower, a four-beat limp on
  // the crutch. Laid one figure per equal cell on transparent (magenta keyed); height puts him
  // standing at about 115 px
  ansel: { file: 'assets/sprites/npc/ansel.png', frames: 7, height: 246, grade: WOOD_FOLK_GRADE, centre: true, bg: 'magenta' },
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
  'rurik-farewell': { file:'assets/sprites/npc/rurik_farewell.png',frames:4,height:235,centre:false },
  'nicholas-death': { file:'assets/sprites/npc/nicholas_death.png',frames:6,height:235,centre:false,grade:{contrast:1.04,saturation:1.05,outline:0,rim:.25} },
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
  'scorpion-bolt': {file:'assets/sprites/npc/scorpion_bolt.png',frames:1,height:46},
  'earthbreaker-wave': {file:'assets/sprites/npc/earthbreaker_wave.png',frames:1,height:360},
  scorpion: { file: 'assets/sprites/npc/scorpion.png', frames: 1, height: 190 }, // his Gate Scorpion, side on
  'hound-walk': { file: 'assets/enemies/strips/hound_walk.png', frames: 6, height: 120 },
  'hound-atk1': { file: 'assets/enemies/strips/hound_atk1.png', frames: 4, height: 120 },
  'hound-react': { file: 'assets/enemies/strips/hound_react.png', frames: 3, height: 120 },
  'hound-doom': { file: 'assets/enemies/strips/hound_doom.png', frames: 4, height: 120 },
  // its jaws locked in a hero, dragging him (stage/WoodTraps.js latch): 0 the grab, 1-4
  // braced and hauling back, worrying at him (ChatGPT, 2026-11-18). Optional
  'hound-drag': { file: 'assets/enemies/strips/hound_drag.png', frames: 5, height: 120 },
  // the convoy's draught horses (view/StageView.js syncRolling): 0-5 the plodding haul,
  // 6 standing, 7 rearing (ChatGPT, 2026-11-18). Tallest pose (rearing) ~1.27x the walk
  'horse-pull': { file: 'assets/fx/horse_pull.png', frames: 8, height: 300 },
  // the Crusher's strips: each is scaled to its tallest pose (the hammer hauled up, the
  // sparks, the dust), and the machine is painted at a different size in each, so each
  // strip has its own height that keeps the hull and wheels the walk's size (matched by eye
  // on the rear wheel and hull; it shrank by a quarter in the slam at one height for all)
  'crusher-walk': { file: 'assets/enemies/strips/crusher_walk.png', frames: 6, height: 380 },
  'crusher-atk1': { file: 'assets/enemies/strips/crusher_atk1.png', frames: 4, height: 395 },
  'crusher-heavy': { file: 'assets/enemies/strips/crusher_heavy.png', frames: 5, height: 495 },
  'crusher-doom': { file: 'assets/enemies/strips/crusher_doom.png', frames: 5, height: 355 },
};
