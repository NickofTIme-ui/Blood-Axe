// enemyParts.js — Hand-made / AI-made art for enemy body parts.
//
// Each enemy can have ONE "parts sheet": a PNG with every body part drawn separately
// (side view, facing right) on a flat background colour. At boot the game keys out
// the background, cuts each part out, resizes it to fit the rig, and uses it instead of
// the code-painted part. Any part you leave out keeps its code-painted version.
//
// HOW PARTS MUST BE DRAWN (same as the code-painted ones)
//   head      facing right; `pivot` = bottom of the neck
//   torso     chest to hips, no arms/legs/head; `pivot` = middle of the hips, `end` = base of the neck
//   skirt     loincloth / cloth hanging from the belt; `pivot` = top middle
//   arm       hanging straight DOWN, shoulder at top, fist at bottom; `pivot` = shoulder, `end` = fist centre
//   thigh     vertical; `pivot` = hip joint, `end` = knee
//   shin      vertical, boot toe pointing right; `pivot` = knee, `end` = ankle
//   weapon    pointing UP, handle at the bottom; `pivot` = where the fist grips it
//   off       off-hand item (shield, hook, knife); `pivot` = grip
//   hookItem  thrown on a chain (hook, sickle); `pivot` = where the chain attaches
//   chainEnd  flail ball; `pivot` = centre
//
// `rect` is [x, y, w, h] in sheet pixels; `pivot`/`end` are sheet pixels too.
// tools/parts.html finds the rects for you: open http://localhost:8123/tools/parts.html
//
// Parts are scaled so that pivot->end matches the rig's length for that part
// (or, without `end`, so the part is as tall as the code-painted one).

export const PART_SHEETS = {
  // Gorrak the Flayer — generated in ChatGPT (Bloody Axe project)
  butcher: {
    file: 'assets/enemies/butcher-parts.png',
    bg: [248, 8, 248], tolerance: 110,
    parts: {
      head:     { rect: [40, 53, 309, 332],    pivot: [240, 322], size: 0.72 },
      torso:    { rect: [412, 40, 324, 475],   pivot: [572, 392], end: [562, 72], size: 1.12 },
      skirt:    { rect: [784, 107, 403, 464],  pivot: [986, 132] },
      weapon:   { rect: [1247, 28, 145, 487],  pivot: [1292, 392] },
      arm:      { rect: [88, 494, 220, 531],   pivot: [212, 548], end: [204, 978] },
      thigh:    { rect: [438, 567, 244, 427],  pivot: [556, 598], end: [572, 962] },
      shin:     { rect: [776, 600, 277, 414],  pivot: [880, 628], end: [888, 952] },
      off:      { rect: [1201, 566, 182, 468], pivot: [1244, 580], size: 1.6 },
      hookItem: { rect: [1201, 566, 182, 468], pivot: [1244, 580], size: 1.6 },
    },
  },
  // Sliv the Hollow
  stalker: {
    file: 'assets/enemies/stalker-parts.png',
    bg: [248, 8, 248], tolerance: 110,
    parts: {
      head:     { rect: [24, 92, 352, 380],    pivot: [188, 428], size: 0.72 },
      torso:    { rect: [444, 49, 321, 559],   pivot: [615, 405], end: [640, 95], size: 1.1 },
      skirt:    { rect: [807, 177, 400, 424],  pivot: [1007, 195] },
      weapon:   { rect: [1264, 36, 118, 534],  pivot: [1322, 440] },
      off:      { rect: [1264, 36, 118, 534],  pivot: [1322, 440] },
      arm:      { rect: [84, 550, 190, 492],   pivot: [185, 592], end: [222, 1002] },
      thigh:    { rect: [404, 659, 199, 361],  pivot: [500, 682], end: [505, 958] },
      shin:     { rect: [752, 663, 278, 363],  pivot: [845, 682], end: [860, 958] },
      // drawn with the chain ring at the bottom, so it flies blade-first the other way up
      hookItem: { rect: [1122, 619, 303, 436], pivot: [1150, 1028], size: 1.7, hookRot: 90 },
    },
  },
  // The Iron Penitent
  penitent: {
    file: 'assets/enemies/penitent-parts.png',
    bg: [248, 8, 248], tolerance: 110,
    parts: {
      head:     { rect: [54, 43, 316, 357],    pivot: [215, 385], size: 0.75 },
      torso:    { rect: [415, 21, 399, 554],   pivot: [630, 420], end: [640, 60], size: 1.15 },
      skirt:    { rect: [841, 175, 384, 439],  pivot: [1033, 195] },
      // drawn with the chain ring at the bottom: flip it so the ring is on top
      weapon:   { rect: [1287, 120, 92, 409],  pivot: [1333, 230], flipY: true, size: 0.7 },
      arm:      { rect: [54, 456, 266, 595],   pivot: [190, 520], end: [212, 1000] },
      thigh:    { rect: [400, 596, 238, 427],  pivot: [515, 615], end: [535, 990] },
      shin:     { rect: [708, 616, 332, 412],  pivot: [830, 640], end: [850, 960] },
      chainEnd: { rect: [1099, 680, 316, 343], pivot: [1257, 862], size: 0.95 },
    },
  },
  // Vorn Skullsplitter
  berserker: {
    file: 'assets/enemies/berserker-parts.png',
    bg: [248, 8, 248], tolerance: 110,
    parts: {
      head:   { rect: [20, 107, 340, 377],    pivot: [215, 385], size: 0.72 },
      torso:  { rect: [411, 106, 295, 485],   pivot: [560, 405], end: [548, 128], size: 1.1 },
      skirt:  { rect: [751, 241, 330, 355],   pivot: [916, 258] },
      weapon: { rect: [1172, 24, 242, 541],   pivot: [1215, 430] },
      arm:    { rect: [118, 603, 145, 424],   pivot: [190, 642], end: [205, 990] },
      armB:   { rect: [1149, 580, 218, 455],  pivot: [1238, 652], end: [1302, 995] },
      thigh:  { rect: [428, 624, 195, 317],   pivot: [525, 642], end: [545, 925] },
      shin:   { rect: [764, 668, 253, 336],   pivot: [855, 686], end: [870, 958] },
    },
  },
  // Grubb Rotchain
  ghoul: {
    file: 'assets/enemies/ghoul-parts.png',
    bg: [248, 8, 248], tolerance: 110,
    parts: {
      head:     { rect: [24, 55, 399, 362],    pivot: [155, 392], size: 0.72 },
      torso:    { rect: [450, 47, 357, 530],   pivot: [640, 378], end: [700, 82], size: 1.1 },
      skirt:    { rect: [866, 164, 350, 404],  pivot: [1041, 182] },
      weapon:   { rect: [1288, 134, 89, 374],  pivot: [1333, 380], size: 0.7 },
      arm:      { rect: [61, 541, 228, 503],   pivot: [172, 586], end: [230, 1008] },
      thigh:    { rect: [420, 596, 216, 398],  pivot: [525, 616], end: [560, 910] },
      shin:     { rect: [725, 616, 230, 382],  pivot: [860, 632], end: [840, 950] },
      off:      { rect: [1312, 671, 90, 327],  pivot: [1357, 900] },
      chainEnd: { rect: [995, 753, 241, 223],  pivot: [1130, 862], size: 0.9 },
    },
  },
  // Pitlord Kragg
  gladiator: {
    file: 'assets/enemies/gladiator-parts.png',
    bg: [248, 8, 248], tolerance: 110,
    parts: {
      head:   { rect: [28, 73, 299, 366],     pivot: [172, 410], size: 0.75 },
      torso:  { rect: [398, 40, 453, 541],    pivot: [652, 400], end: [645, 92], size: 1.12 },
      skirt:  { rect: [838, 221, 325, 352],   pivot: [1001, 240] },
      weapon: { rect: [1188, 16, 243, 545],   pivot: [1308, 420] },
      arm:    { rect: [49, 509, 248, 526],    pivot: [165, 572], end: [240, 1003] },
      thigh:  { rect: [396, 591, 216, 414],   pivot: [505, 616], end: [520, 930] },
      shin:   { rect: [704, 635, 269, 377],   pivot: [815, 652], end: [830, 950] },
      off:    { rect: [1006, 594, 430, 433],  pivot: [1221, 810], size: 0.85 },
    },
  },
  // example:
  // butcher: {
  //   file: 'assets/enemies/butcher-parts.png',
  //   bg: [255, 0, 255], tolerance: 110,
  //   parts: {
  //     head: { rect: [40, 60, 180, 200], pivot: [120, 250] },
  //     arm:  { rect: [300, 40, 90, 330], pivot: [345, 60], end: [350, 345] },
  //   },
  // },
};
