// stageWood.js — THE CAMPAIGN, LEVEL 2: GALLOWS WOOD (docs/campaign/plan.md). The Oath
// Keepers follow the prisoner convoy up the north road through a wet black pine wood.
// GRAYBOX, built in Stage 2 to put the campaign's new systems to work: the level
// transition from the village, an execution, cages, an escort, and a boss with phases.
// Its painted art is requested in docs/campaign/art-levels-1-2.md. Everything here is drawn in code (view/WoodView.js, view/NpcView.js).
//
// Same format as data/stageVillage.js (a terrain block's `mat: 'log'` draws it as a fallen
// tree). Built for the weakest jumper (Rurik, walking, no
// upgrades): the streams are crossed on fallen logs (a 10 px step: walked onto) or on
// stepping stones (gaps of 60, ups of 30); a test walks it with every hero.
//
// THE ROUTE
//   I   THE WOOD ROAD      the others scout ahead; a stream; the convoy's rear guard
//   II  THE HANGING TREE   the hangmen's tree, its dead still on it. Joren, Mira's husband,
//                          slipped his noose and hangs from the bough, their hounds under him: pull
//                          them off him or kill them before his grip goes (treed). A shrine
//   III THE CAGE CARTS     the convoy's broken carts: stepping stones over a ravine stream;
//                          two cages to open once the guards are dead (cage)
//   IV  THE OLD FORD       Ansel the wheelwright, lame, walks out with you; an ambush on
//                          the road: keep them off him (escort)
//   V   THE CONVOY         the convoy's last wagon rolling away with prisoners in it: smash
//                          it before it gets up the road, through its guards
//   VI  THE KENNELS        a shrine; THE HOUNDMASTER and his war hounds (boss phases: his
//                          pack, then his frenzy)
//   VII THE BLOCKED ROAD   the pass buried by a rockslide; the convoy's tracks turn into the
//                          mountain. Out by the old mine road: on to Hollow Mountain

const FULL = { z0: 282, z1: 520 };
// A group of props set out together by their painted looks, as in data/stageVillage.js:
// [look, x, z, more]; `stack` in more: it stands on the one before it (x then its offset).
// Every group belongs to someone: the rear guard's camp, the hangmen's kit, the convoy's
// spilled loads, the river's wash, the kennels' feed. The middle of the road stays clear.
const KIND_OF = (look) => (/^(barrel|keg)/.test(look) ? 'barrel' : /^(crate|sack)/.test(look) ? 'crate' : look);
const group = (items) => items.map(([look, x, z, more = {}]) => (more.stack
  ? { kind: KIND_OF(look), look, dx: x, drop: null, ...more }
  : { kind: KIND_OF(look), look, x, z, drop: null, ...more }));
// The oath shrines stand at the back of the road on solid footprints, as in the village
// (nobody walks through them or stands on top: Nick, 2026-10-23); kneel in front of one.
const SHRINE_TREE = { x: 2800, z: 294, kind: 'oath', solid: true };
const SHRINE_KENNELS = { x: 7320, z: 294, kind: 'oath', solid: true };
const shrineFootprint = (r) => ({ kind: 'block', x0: r.x - 52, x1: r.x + 52, z0: 282, z1: r.z + 6, top: 400, hideArt: true });
// Joren on the hanging tree's bough, out at its tip past the dead: the hounds worry under him
const JOREN_BOUGH = { x: 2280, z: 300 };

// (each on dry ground: one stood on the cage carts' stream bank and one out in the ford's water, Nick 2026-11-19)
const WOOD_LANTERNS = [{ x: 780, z: 290 }, { x: 2050, z: 290 }, { x: 2990, z: 290 }, { x: 4800, z: 290 }, { x: 7400, z: 290 }, { x: 8600, z: 290 }];

export const STAGE_WOOD = {
  id: 'gallowsWood',
  name: 'GALLOWS WOOD',
  chapter: 'II',
  next: { id: 'hollowMountain', name: 'HOLLOW MOUNTAIN', chapter: 'III' },
  doneTitle: 'THE CONVOY IS BROKEN', // (the tally's title)
  width: 9200,
  theme: 'wood',
  music: 'wilderness', // (core/Music.js)
  quietMusic: true, // rain alone till the first ambush, then the track for good (core/WoodMusic.js)
  tall: true,
  castle: { x: 760, scale: 0.6, detail: 0.5 }, // nearer now: a silhouette over the wood
  // the other two Oath Keepers (view/NpcView.js): with you at the start, then scouting
  // ahead; they wait at the blocked road, and leave with you after the last words
  companions: { leaveAfter: 'opening', meet: 8500, farewell: 'turn' },
  // THE TREE LINE (stage/WoodOpening.js): the three walk in out of the dark to where the road
  // goes in under the pines; the convoy's ruts run on ahead; its lanterns far up the road
  openingScene: 'treeLine',
  ruts: { x0: 60, x1: 1500, z: 400 },

  sections: [
    {
      id: 'road', name: 'THE WOOD ROAD', x0: 0, x1: 1500,
      spawn: { x: 150, z: 440 },
      objective: 'Follow the convoy',
      hint: 'Chop the notched pine: it falls across the stream',
      fightAt: 1000,
      // the convoy's rear guard: men up in the branches over the road, and their hounds out of
      // the trees (the crows go up first: a spawn's `tell`); then the rest of them, with a
      // HORNBLOWER who runs for the back of the road: stop him, or his horn calls more (`horn`)
      howl: true,
      // (Nick, 2026-11-14: more of them come down out of the trees at once; the music kicks
      // in with a boom as the first one drops: core/WoodMusic.js)
      waves: [['grunt', 'stalker', 'grunt', 'stalker', 'hound', 'hound'], ['grunt:horn', 'butcher', 'grunt']],
      spawns: [
        [
          { x: 1180, z: 330, drop: 430, tell: 80 }, { x: 1290, z: 470, drop: 430, tell: 84 },
          { x: 1090, z: 450, drop: 430, tell: 88 }, { x: 1350, z: 380, drop: 430, tell: 92 },
          { x: 1440, z: 300 }, { x: 1460, z: 480 },
        ],
        [{ x: 1460, z: 300 }, { x: 1470, z: 460 }, { x: 700, z: 380 }],
      ],
      horn: ['grunt', 'stalker', 'grunt'],
      props: [
        // THE NOTCHED PINE on the near bank (stage/WoodTraps.js): chop it and it falls across
        // the stream, the log bridge (terrain tag 'felled'); whoever's under it is crushed
        { kind: 'pine', x: 700, z: 426, fellDir: 1, len: 300, bridge: 'felled', drop: null },
        { kind: 'crate', x: 1320, z: 470, drop: 'health' },
        { kind: 'barrel', x: 420, z: 300, drop: null },
        // a sack cart's load tipped in the ditch where a wheel went (the near edge)
        ...group([['sack', 660, 502], ['sack', 700, 506], ['crate-v2', 748, 500]]),
        // the rear guard's camp at the road's end: their table, a crate and a jug on the ground
        // by it, their water and ale beside it, against the trees (nothing stacked: Nick, 2026-11-24)
        { kind: 'trestle', x: 1080, z: 300, drop: null },
        ...group([['urn', 968, 304, { drop: 'mana' }], ['crate-v5', 1003, 302]]),
        ...group([['barrel-v3', 1160, 302], ['keg', 1206, 306]]),
        // a SECRET: a poacher's cache in the ferns at the back of the road, behind where you
        // come in (only found by turning back)
        { kind: 'urn', x: 64, z: 288, drop: 'charm', secret: true },
      ],
      hazards: [],
    },
    {
      id: 'tree', name: 'THE HANGING TREE', x0: 1500, x1: 2900,
      spawn: { x: 1560, z: 440 },
      objective: 'Get the hounds off Joren',
      hint: 'Pull the hounds off the tree or kill them: his grip is going',
      fightAt: 1760,
      // the hangmen between you and the tree; their two hounds under Joren on the bough,
      // leaping at him (`worry`), till a hero comes near or hurts one (entities/Enemy.js)
      waves: [['grunt', 'hound', 'butcher', 'hound', 'grunt'], ['butcher', 'grunt', 'grunt']],
      spawns: [
        [
          { x: 2060, z: 360, inPlace: true },
          { x: JOREN_BOUGH.x - 50, z: 330, inPlace: true, worry: JOREN_BOUGH },
          { x: 2160, z: 440, inPlace: true },
          { x: JOREN_BOUGH.x + 50, z: 350, inPlace: true, worry: JOREN_BOUGH },
          { x: 2120, z: 490, inPlace: true },
        ],
        [],
      ],
      props: [
        { kind: 'barrel', x: 2700, z: 480, drop: 'health' },
        // the hangmen's kit by the tree: a long crate of rope, a keg, and a sack
        ...group([['crate-long', 1930, 300], ['keg2', 1990, 306], ['sack', 2620, 300]]), // (clear of the lantern post at 2050)
      ],
      hazards: [],
      rest: SHRINE_TREE,
    },
    {
      id: 'carts', name: 'THE CAGE CARTS', x0: 2900, x1: 4400,
      spawn: { x: 2960, z: 440 },
      objective: 'Open the cages',
      hint: 'Smash their signal lantern or more come out of the mist. Then hold E (D-pad up) at a lock',
      fightAt: 3560,
      // (the first drops out of the branches over the carts: the crows go up first)
      spawns: [[{ x: 3660, z: 360, drop: 430, tell: 84 }, { x: 3820, z: 470, drop: 430, tell: 100 }, { x: 3560, z: 300, drop: 430, tell: 116 }], []],
      // (the second: hangmen and a hound off the carts; berserkers are the Ascent's, Orsk's men)
      waves: [['grunt', 'stalker', 'grunt'], ['butcher', 'grunt', 'hound']],
      // THE MIST over the camp: men show only close to you; while the Ashen's signal lantern
      // burns on its pole, more of them come out of it (stage/WoodTraps.js updateMist)
      mist: { x0: 3420, x1: 4400, tag: 'signal', calls: ['grunt', 'stalker', 'grunt'] },
      props: [
        { kind: 'signal', tag: 'signal', x: 3880, z: 492, drop: null },
        { kind: 'crate', x: 4300, z: 300, drop: 'mana' },
        // the broken carts' loads spilled along the near edge of the road
        ...group([['crate-v6', 3560, 500], ['crate-v0', 3612, 502], ['sack', 3660, 504]]),
        // the convoy's strongbox, dropped when the axle went
        { kind: 'chest', x: 4230, z: 498, drop: 'health' },
        // a SECRET up on the high shelf at the back (terrain: the boulder and the shelf): Vexa's
        // double jump, Oryn's rise, or Rurik with WIND STEP; nobody needs it
        { kind: 'crate', x: 4190, z: 305, drop: 'relic', secret: true },
      ],
      hazards: [],
    },
    {
      id: 'ford', name: 'THE OLD FORD', x0: 4400, x1: 5600,
      spawn: { x: 4460, z: 440 },
      objective: 'Get Ansel across the ford',
      hint: 'Keep them away from him: he freezes when they come close. The shallows slow everyone, them too',
      fightAt: 4860,
      // (the second: a WOODSMAN with a net on the far bank, and the men he pins you for. They
      // come after Ansel from behind, wading the ford: right under the log pile's trunks.
      // From the far side they'd have stood up the bank of it, out of its way, and the logs
      // went by into the water hitting nobody: Nick, 2026-11-24)
      waves: [['stalker', 'grunt'], ['stalker:net', 'grunt', 'grunt', 'stalker']],
      spawns: [[], [{ x: 5580, z: 380 }, { x: 4420, z: 330 }, { x: 4420, z: 500 }, { x: 4440, z: 420 }]],
      props: [
        // THE LOG PILE up the far bank: cut its stay rope and the trunks come down across the
        // road below (stage/WoodTraps.js), on whoever is coming for Ansel
        // (y 0: it stands inside the solid block that keeps men out of it; left to the
        // ground under it, it sat on that block's top, 90 up, out of every axe's reach, and
        // the rope could never be cut: Nick, 2026-11-16 "the pile of wood still does nothing")
        // (on the dry far bank past the shallows: it stood with its feet in the water, Nick 2026-11-19)
        // (lane: where its trunks go, rolling down the bank to the ford and into it, z0..z1
        // the road's back and front edges; the call to cut it shows while men are in it)
        { kind: 'logpile', x: 5470, z: 292, y: 0, lane: { x0: 5000, x1: 5540, z0: 300, z1: 545 }, drop: null },
        { kind: 'barrel', x: 5560, z: 492, drop: 'health' },
        // barrels off the convoy, washed up on the near bank
        ...group([['barrel-grey', 4700, 500], ['barrel-v1', 4746, 504, { drop: 'mana' }]]),
      ],
      // (the swinging log that hung here is now the DEADFALL, a trap: see `traps` below)
      hazards: [],
    },
    {
      // the convoy's last wagon, still rolling: armoured, its prisoners inside, guards round
      // it. Smash it before it gets away up the road, or they're gone (Stage.updateRolling)
      id: 'convoy', name: 'THE CONVOY', x0: 5600, x1: 7200,
      spawn: { x: 5660, z: 440 },
      objective: 'Stop the prisoner wagon',
      hint: 'Stop the wagon: smash it, knock the Wagonmaster off, or chop the notched pine: in its path it blocks the road, on top of it it smashes the wagon open',
      fightAt: 5860,
      // (the last: the kennel wagon's hounds let loose, with their handler. It was a horde of
      // thralls: the market square's, again; the wood's pack is its own)
      waves: [['grunt', 'butcher', 'grunt'], ['stalker', 'grunt', 'butcher'], ['grunt', 'butcher', 'stalker'], ['hound', 'hound', 'hound', 'hound', 'grunt']],
      props: [
        // its roof is a floor that rolls with it; the Wagonmaster drives it and whips at anyone
        // near; a notched pine up ahead can be dropped across the road to block it
        { kind: 'wagon', tag: 'convoy', x: 6080, z: 320, roll: { to: 7110, speed: 22, driver: 'butcher:driver' }, roof: { top: 138, d: 32 } },
        { kind: 'pine', x: 6980, z: 318, fellDir: -1, len: 300, bridge: 'convoyPine', drop: null },
        { kind: 'barrel', x: 5700, z: 480, drop: 'health' },
        // the convoy's supplies, dumped at the roadside to lighten the wagons
        ...group([['crate-v1', 5726, 302], ['crate-v5', 5780, 300], ['barrel-tar', 5840, 302]]),
      ],
      hazards: [],
    },
    {
      id: 'kennels', name: 'THE KENNELS', x0: 7200, x1: 8400,
      spawn: { x: 7260, z: 440 },
      objective: 'Kill the Houndmaster',
      hint: 'Knock a hound into an open pen and the gate slams on it. When he whistles, move! Dodge out of his chain. Hit him before his horn sounds',
      // the pens at the back of the clearing, under the painted kennels: hounds behind bars
      pens: [{ x: 7640, z: 270, count: 2 }, { x: 7820, z: 270, count: 2 }, { x: 8030, z: 270, count: 2 }],
      fightAt: 7560,
      waves: [],
      props: [
        { kind: 'crate', x: 8300, z: 480, drop: 'health' },
        // the kennels' feed: barrels of offal either side of the pens
        ...group([['barrel-v6', 7470, 302], ['barrel-v2', 7516, 306]]),
        ...group([['barrel-v5', 8160, 302, { drop: 'mana' }], ['keg', 8206, 306]]),
      ],
      hazards: [],
      rest: SHRINE_KENNELS,
      // THE HOUNDMASTER: the Stalker's kind, grown into the convoy's master, with his war
      // hounds (data/enemies.js `hound`). Two of them come in with him; he blows his horn
      // for the pack at two thirds, and at one third he goes into a frenzy with the last of
      // them. (His own painted strips, enemyStrips.js `houndmaster`: the Stalker's moves in his
      // own look; until they load he wears the Stalker's.)
      boss: {
        type: 'stalker', look: 'houndmaster', name: 'The Houndmaster', health: 3.6, damage: 1.1, size: 1.2, // (size: a head over his men: Nick, 2026-11-16)
        // his two hounds come bursting out of the middle kennel once he's walked in (they
        // stood parked beside him as an escort: Nick, 2026-11-16 "should come out of the kennel")
        pensAtStart: [1],
        entrance: { from: 140, to: 330, speed: 72, stepEvery: 28, awe: 30 },
        // beaten: his crimes and his sentence (stage/Sentence.js)
        sentence: {
          speaker: 'HOUNDMASTER',
          crimes: [
            'You ran the convoy that dragged our people north in cages.',
            'You hanged them from the trees, one by one, to keep the rest afraid.',
            'You fed the ones who ran to your dogs.',
          ],
          last: 'My dogs will howl for me tonight. Let them find you.',
        },
        // (his pack comes out of the kennels' pens, `pens` below: the gates drop; between, his
        // whistle sends every loose hound in, and from the net phase he throws a weighted net:
        // stage/WoodTraps.js)
        phases: [
          { id: 'pack', at: 0.66, pens: [0], ai: { attackCooldown: [24, 56] } },
          { id: 'net', at: 0.5 },
          { id: 'frenzy', at: 0.33, rage: true, pens: [2], adds: ['stalker'], damage: 1.25, speed: 1.2, ai: { attackCooldown: [16, 40], comboChance: 0.8 } },
        ],
      },
    },
    {
      id: 'pass', name: 'THE BLOCKED ROAD', x0: 8400, x1: 9200,
      spawn: { x: 8460, z: 440 },
      objective: 'The mine road',
      hint: '',
      waves: [],
      props: [],
      hazards: [],
    },
  ],

  // the pass is buried: the way on is the old mine road, once the last words are said
  exit: { x: 8940, after: 'turn' },

  terrain: [
    // ---- I THE WOOD ROAD: a stream with a log across it (the fallen pine that walled off
    // the road's start was taken out at Nick's ask, 2026-11-05)
    // (too wide to jump: the notched pine, felled across it, is the way over; Vexa's double
    // jump can still clear it)
    { kind: 'pit', x0: 790, x1: 980, ...FULL },
    { kind: 'block', x0: 774, x1: 998, z0: 400, z1: 452, top: 10, mat: 'log', tag: 'felled', hideArt: true }, // (the notched pine, once it's down)
    { kind: 'block', x0: 6690, x1: 6980, z0: 294, z1: 342, top: 10, mat: 'log', tag: 'convoyPine', hideArt: true }, // (the convoy's pine, once it's down across the road)

    // ---- III THE CAGE CARTS: a ravine stream crossed on stepping stones
    { kind: 'pit', x0: 3080, x1: 3380, ...FULL },
    { kind: 'block', x0: 3130, x1: 3200, z0: 360, z1: 480, top: 30 },
    { kind: 'block', x0: 3260, x1: 3330, z0: 360, z1: 480, top: 30 },
    // the two cage carts (painted, view/NpcView.js): solid, and a man can be stood on one.
    // Their footprints run out to the painted wheels and the dirt under them, the whole width
    // of the cart (Nick, 2026-11-16: "you can walk through its shadow"); the drawbar is free
    { kind: 'block', x0: 3636, x1: 3848, z0: 304, z1: 352, top: 50, hideArt: true },
    { kind: 'block', x0: 4040, x1: 4226, z0: 416, z1: 462, top: 50, hideArt: true },
    // THE HIGH SHELF (optional): a mossy boulder at the back of the road (+70: a held jump),
    // and over it a rock shelf 150 higher, like the Gallows Ascent's roost: Vexa's double
    // jump, Oryn's rise, Rurik with WIND STEP. One painted outcrop (boulder_shelf.png,
    // view/WoodView.js drawShelf), the blocks fitted to its tops (Nick, 2026-11-20: the rock
    // tiles' "flat straight lines" stuck out; were 3910-3990 and 3990-4130)
    { kind: 'block', x0: 3856, x1: 4074, z0: 282, z1: 336, top: 70, tag: 'boulder' },
    { kind: 'block', x0: 4074, x1: 4318, z0: 282, z1: 330, top: 220, tag: 'shelf' },

    // ---- IV THE OLD FORD: a stream with a wide log bridge (Ansel walks it)
    // THE SHALLOWS: either side of the deep channel the stream spreads out knee-deep over its
    // stones, the ford itself. Everyone wades through it at half pace, the men and the hounds
    // too (and Ansel, lame), under the deadfall and the log pile (stage/Terrain.js 'wade')
    { kind: 'wade', x0: 5000, x1: 5350, ...FULL, slow: 0.5 }, // (narrower: the log pile and the lanterns stand on dry banks either side)
    { kind: 'pit', x0: 5160, x1: 5240, ...FULL },
    { kind: 'block', x0: 5140, x1: 5260, z0: 380, z1: 470, top: 10, mat: 'log' },

    // ---- IV the log pile up the far bank (and its posts once it's let go): solid, like the
    // rest of the wood's things (Nick, 2026-11-15: "a lot of stuff you can walk right through")
    { kind: 'block', x0: 5360, x1: 5580, z0: 270, z1: 300, top: 90, hideArt: true },
    // the lantern posts along the road: a man can't walk through a post
    ...WOOD_LANTERNS.map((l) => ({ kind: 'block', x0: l.x - 10, x1: l.x + 10, z0: l.z - 8, z1: l.z + 8, top: 170, hideArt: true })),

    // ---- II and VI: the shrines' footprints
    shrineFootprint(SHRINE_TREE),
    shrineFootprint(SHRINE_KENNELS),

    // ---- VI THE BLOCKED ROAD: the rockslide across the pass (nobody climbs it)
    { kind: 'block', x0: 9040, x1: 9200, ...FULL, top: 320 },
  ],

  // the wood's traps (stage/WoodTraps.js): snares in the leaves, a stake pit under a mat of them,
  // the deadfall over the ford's road. Taught where they can't hurt much first (the hanging tree's clearing)
  traps: [
    // (the snares' saplings grow at the road's edges, by the ferns and the trees, not out of
    // the middle of the open mud: Nick 2026-11-19)
    { type: 'snare', section: 1, x: 1880, z: 496 },
    { type: 'snare', section: 1, x: 2470, z: 306 },
    { type: 'stakes', section: 2, x: 3500, z: 486, w: 76, d: 44 }, // (out of the ravine stream's picture, where it hid: 2026-11-15)
    { type: 'snare', section: 2, x: 3960, z: 492 },
    // the near bank's DEADFALL: a spiked trunk hauled up out of sight, tied to a wire across
    // the road. Trip it (or let them) and it swings in from above (stage/WoodTraps.js)
    // (on the near bank under the pines, before the water: its trunk hung over the open river from
    // nothing, Nick 2026-11-19 "the tree trap going over the river")
    { type: 'deadfall', section: 3, x: 4880, z: 360 },
    // MORE OF THEM, all through the wood (Nick, 2026-11-24: "i want more tree swinging traps
    // in the woods, i love that"): snares at the road's edges and a deadfall over the road in
    // every stretch from the start to the kennels
    { type: 'snare', section: 0, x: 380, z: 494 },
    { type: 'deadfall', section: 1, x: 2480, z: 470 },
    { type: 'snare', section: 4, x: 6300, z: 494 },
    { type: 'deadfall', section: 4, x: 6560, z: 460 },
    { type: 'snare', section: 4, x: 6860, z: 494 },
    { type: 'snare', section: 5, x: 7460, z: 494 },
    { type: 'snare', section: 5, x: 8160, z: 306 },
  ],

  lanterns: WOOD_LANTERNS,
  // the lanterns' warm light falls on the men who pass them (view/FireLight.js); drizzle, fog
  // along the front, pools of light on the mud, ferns at the edge (view/WoodWeather.js)
  firelight: WOOD_LANTERNS.map((l) => ({ x: l.x, z: l.z + 140, r: 250, k: 0.32 })),
  weather: 'drizzle',
  // moonlight through the pines, at the hanging tree and over the kennels (view/WoodWeather.js)
  moonlight: [{ x: 2250, z: 380, w: 260 }, { x: 7840, z: 380, w: 320 }],

  // the dead (view only): prisoners who fell on the road and were left there
  bodies: [{ x: 300, z: 480, pose: 1 }, { x: 1250, z: 330, pose: 0 }, { x: 3420, z: 520, pose: 2 }, { x: 7900, z: 480, pose: 1 }],

  // the convoy's broken carts (view only)
  carts: [{ x: 3750, z: 300 }, { x: 4140, z: 450 }],
  gallows: { x: 2250, z: 300 }, // the hanging tree (view only; Joren hangs from it)

  npcs: [
    {
      id: 'joren', name: 'Joren', x: JOREN_BOUGH.x, z: JOREN_BOUGH.z, pose: 'treed', rescue: 'treed', section: 'tree', wave: 1,
      freeFor: 60, hold: 48, // (time to drop down and get up; his hands this far under the rope's knot on the bough's tip)
      flee: { x: 1600, z: 300 },
    },
    // the hangmen's dead, still on the tree (view only): each tied under one of the painted
    // tree's boughs (data/hangingTree.js), its painting (view/NpcView.js drawHanged)
    { id: 'hanged-1', name: 'a hanged man', pose: 'hanged', art: 'hanged_1', bough: 'left', x: 2037, z: 300 },
    { id: 'hanged-3', name: 'an old man, hanged', pose: 'hanged', art: 'hanged_3', bough: 'leftIn', x: 2069, z: 302, flip: true },
    { id: 'hanged-2', name: 'a hanged woman', pose: 'hanged', art: 'hanged_2', bough: 'inner', x: 2247, z: 298 },
    {
      id: 'tanners', name: 'the tanner\'s boys', x: 3750, z: 340, pose: 'cage', group: true, rescue: 'cage',
      folk: ['folk-boy', 'folk-lad', 'folk-apprentice'], // (data/folk.js: boys, once they're painted)
      lock: { x: 3750, z: 372, h: 0 }, flee: { x: 3000, z: 500 },
    },
    {
      id: 'wenna', name: 'Old Wenna', x: 4140, z: 450, pose: 'cage', rescue: 'cage',
      lock: { x: 4140, z: 482, h: 0 }, flee: { x: 3000, z: 400 },
    },
    {
      id: 'ansel', name: 'Ansel the wheelwright', x: 4560, z: 440, pose: 'lame', rescue: 'escort', section: 'ford',
      to: { x: 5440 }, flee: null, gather: { x: 5500, z: 330 }, // (he hides on the far bank, as he says, not at the end)
    },
    {
      id: 'convoy', name: 'the prisoners in the wagon', x: 6080, z: 320, pose: 'convoy', rescue: 'convoy', tag: 'convoy',
      people: 5, freeFor: 95, // (five of them, scrambling out of the back of the wreck one by one: view/NpcView.js crowdHead)
      flee: { x: 5700, z: 500 },
    },
    // (Nicholas, the mountain guide: he meets them again on the Shattered Ascent)
    // At the blocked road it's only Nicholas and the Oath Keepers: the freed go home and
    // don't gather here (Nick, 2026-11-24: "just have nicholas and the oathkeepers at the end")
    // (up off the bottom edge, where the talk box hid him, and clear of the crowd that's gone)
    { id: 'pilgrim', name: 'Nicholas', art: 'nicholas', x: 8560, z: 400, pose: 'wounded', talk: 'pilgrim', ask: true },
  ],

  story: [
    {
      id: 'opening', on: 'start', hold: true, delay: 150,
      lines: [
        // (the tree line, stage/WoodOpening.js: the ruts read, the convoy's lanterns far up the
        // road between the trees, a howl far off in the wood, the crows going up ahead)
        ['VEXA', 'Cart ruts. Chain marks in the mud. They came this way.'],
        ['RURIK', 'There. Lanterns, up the road. The convoy.', { convoy: true }],
        ['ORYN', 'Listen.', { sfx: 'woodHowl', volume: 0.6, pitch: -200 }],
        ['RURIK', 'Hounds. They\'ve got our scent already.', { crows: 640 }],
        ['VEXA', 'Then we hunt them before they hunt us.'],
        ['ORYN', 'The wood crawls with them. Vexa and I take the trees.'],
        ['RURIK', 'I\'ll take the road. Find that convoy.'],
      ],
    },
    { id: 'rope', at: 1640, lines: [['JOREN', 'Up here! The dogs! I can\'t hold on!']] },
    { id: 'joren', on: 'rescued:joren', calm: true, lines: [['JOREN', 'Mira? She lives? ...Thank the gods.'], ['JOREN', 'The cages went on up the road. Hurry.']] },
    { id: 'joren-lost', on: 'lost:joren', calm: true, lines: [['RURIK', 'Too late. Forgive me, Joren.']] },
    { id: 'carts', at: 3420, lines: [['VOICE', 'Here! The cages! They left us when the wheels broke!']] },
    { id: 'locks', on: 'clear:carts', calm: true, lines: [['RURIK', 'The guards are dead. Now the locks.']] },
    { id: 'tanners', on: 'rescued:tanners', lines: [['TANNER\'S BOY', 'We can walk. We\'re going home.']] },
    { id: 'wenna', on: 'rescued:wenna', lines: [['WENNA', 'My old bones thank you, Oath Keeper.']] },
    { id: 'ansel', on: 'follow:ansel', lines: [['ANSEL', 'My leg\'s broken. Stay close. I can\'t fight them.']] },
    { id: 'ansel-safe', on: 'rescued:ansel', lines: [['ANSEL', 'The far bank. I can hide here. Go on.']] },
    { id: 'ansel-lost', on: 'lost:ansel', lines: [['ANSEL', 'No... no, leave me... Run!']] },
    { id: 'kennelWagon', on: 'wave:convoy:4', lines: [['VOICE', 'Open the kennel wagon! Let the dogs run them down!']] },
    { id: 'wagonCry', at: 5720, lines: [['PRISONER', 'Help! They\'re taking us to the Keep!']] },
    { id: 'convoyPine', on: 'wave:convoy:1', lines: [['RURIK', 'That pine up the road is notched to fall. Drop it on the wagon!']] }, // (Nick, 2026-11-24: the pine had no purpose)
    { id: 'wagon', on: 'rescued:convoy', lines: [['PRISONER', 'Wheel\'s smashed! Out, all of you! Run!']] },
    { id: 'wagon-lost', on: 'lost:convoy', calm: true, lines: [['RURIK', 'Gone. We\'ll find you at the Keep. I swear it.']] },
    { id: 'kennels', at: 7300, calm: true, lines: [['ORYN', '(from the trees) The Houndmaster runs the convoy. Kneel at the shrine. Then put him down.']] },
    { id: 'houndmaster', on: 'boss:kennels', lines: [['HOUNDMASTER', 'Oath Keepers. Good. My dogs haven\'t eaten in days.']] },
    { id: 'pack', on: 'phase:kennels:pack', lines: [['HOUNDMASTER', 'Up, my beauties! Pull them down!']] },
    { id: 'frenzy', on: 'phase:kennels:frenzy', lines: [['HOUNDMASTER', 'Then I\'ll feed you to them by hand!']] },
    { id: 'broken', on: 'broken:kennels', lines: [['HOUNDMASTER', 'No... not the last of them. Not my dogs...']] },
    { id: 'hmHorn', on: 'horn:kennels', lines: [['HOUNDMASTER', 'To me! Every blade in the wood, to me!']] },
    { id: 'penned', on: 'penSlam:kennels', lines: [['RURIK', 'Back in your cage, cur.']] },
    { id: 'mist', at: 3460, lines: [['RURIK', 'A lantern burning in the mist. While it\'s lit, they\'ll keep coming. Smash it.']] },
    // at the blocked road only Nicholas talks (Nick, 2026-11-05: the saved wait there quietly)
    {
      id: 'pilgrim', calm: true,
      lines: [
        ['NICHOLAS', 'The pass came down at dawn. Their own men did it, to bar the road behind them.'],
        ['NICHOLAS', 'The carts went into the old mine. Under the mountain.'],
        ['NICHOLAS', 'Nicholas. Thirty years I\'ve guided folk over this mountain. Go under it. I\'ll meet you on the far side.'],
      ],
    },
    {
      id: 'turn', at: 8780, calm: true, hold: true,
      lines: [
        ['VEXA', 'Buried. They\'d sooner bury the road than face us.'],
        ['ORYN', 'The tracks turn into the mountain.'],
        ['RURIK', 'Then we go under it.'],
      ],
    },
  ],

  cutaway: 'convoy',
};
