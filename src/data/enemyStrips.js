// enemyStrips.js — Hand-animated sprite strips for the named enemies (ChatGPT-made, in
// Ulric's pixel-art style). Cut into frames at boot by view/stripImporter.js at twice the
// detail (res 2) and drawn by view/SpriteEnemyView.js. The old paper doll (EnemyView)
// still runs hidden underneath so the gore system can take the body apart, and it takes
// over drawing once the enemy has lost an arm.
//
// Every enemy uses the same six strips (one row of poses on black, facing right):
//   walk     8 frames, a looping walk cycle
//   react    6 frames: 0 ready stance, 1 breathing in, 2 block, 3 hit, 4 knocked flying, 5 dead
//   atk1     5 frames: 0 ready, 1 wind-up, 2 strike, 3 follow-through, 4 recover
//   atk2     5 frames, same layout
//   heavy    6 frames: 0 ready, 1 wind-up, 2 full wind-up, 3 strike, 4 impact, 5 recover
//   special  6 frames, laid out per enemy (see its anims below)
//
// An enemy switches to sprites only once ALL six of its strips load (until then it keeps
// the paper doll). Preview a strip with tools/strip-preview.html?file=...&frames=N.

const DIR = 'assets/enemies/strips';
// walk: centred on the chest (median) and kept on the drawn baseline, so swinging arms
// and dangling weapons can't make the body jitter between frames. Attacks keep their
// drawn baseline too (impact debris below the feet mustn't lift the body).
// Directional walks (view/Heading.js): the same 8-frame cycle seen from the back (U),
// the front (D), three-quarter back (UD) and three-quarter front (DD), facing right
// where it applies. List the views an enemy has here once the strips are in
// assets/enemies/strips as <id>_walkU.png, _walkD.png, _walkUD.png, _walkDD.png (a view
// he doesn't have falls back to the nearest he does, then to the side walk).
// (which views are drawn so far, and how many poses each strip has — usually 8)
const DIR_WALKS = {
  grunt: { U: 8, D: 8 }, butcher: { U: 8, D: 9 }, stalker: { U: 8, D: 8 }, penitent: { U: 8, D: 8 },
  berserker: { U: 8, D: 8 }, ghoul: { U: 8, D: 8 }, gladiator: { U: 8, D: 8 },
};
const dirWalks = (id) => Object.fromEntries(Object.entries(DIR_WALKS[id] ?? {}).map(([d, frames]) =>
  [`walk${d}`, { file: `${DIR}/${id}_walk${d}.png`, frames, align: 'median', ground: 'drawn', optional: true }]));
const set = (id) => ({
  ...dirWalks(id),
  walk: { file: `${DIR}/${id}_walk.png`, frames: 8, align: 'median', ground: 'drawn' },
  react: { file: `${DIR}/${id}_react.png`, frames: 6, ref: 0 },
  atk1: { file: `${DIR}/${id}_atk1.png`, frames: 5, ref: 0, ground: 'drawn' },
  atk2: { file: `${DIR}/${id}_atk2.png`, frames: 5, ref: 0, ground: 'drawn' },
  heavy: { file: `${DIR}/${id}_heavy.png`, frames: 6, ref: 0, ground: 'drawn' },
  special: { file: `${DIR}/${id}_special.png`, frames: 6, ref: 0, ground: 'drawn' },
  // after losing an arm (B = back arm, F = front/weapon arm) he's terrified and runs:
  // flee = 8-frame panicked run looking back; cower = 6 frames (cower, flinch, beg,
  // hit, knocked flying, dead). Optional: without them the old doll takes over.
  // The stumps are drawn as flat magenta marker patches (the image filter won't draw
  // gore) and painted into raw wounds at load (wounds: true -> view/woundPaint.js).
  fleeB: { file: `${DIR}/${id}_fleeB.png`, frames: 8, align: 'median', ground: 'drawn', optional: true, wounds: true },
  cowerB: { file: `${DIR}/${id}_cowerB.png`, frames: 6, ref: 0, optional: true, wounds: true },
  fleeF: { file: `${DIR}/${id}_fleeF.png`, frames: 8, align: 'median', ground: 'drawn', optional: true, wounds: true },
  cowerF: { file: `${DIR}/${id}_cowerF.png`, frames: 6, ref: 0, optional: true, wounds: true },
  // N = both arms gone
  fleeN: { file: `${DIR}/${id}_fleeN.png`, frames: 8, align: 'median', ground: 'drawn', optional: true, wounds: true },
  cowerN: { file: `${DIR}/${id}_cowerN.png`, frames: 6, ref: 0, optional: true, wounds: true },
  // a Rogue's mine is stuck on his chest (combat/Mine.js): 4 poses, one per way of taking
  // it (f.doom.kind): 0 rigid, staring at it / 1 looking back, pleading / 2 hopping,
  // pulling at it / 3 leaning away from it. Optional: without it the hit/idle poses stand in.
  doom: { file: `${DIR}/${id}_doom.png`, frames: 4, ref: 0, ground: 'drawn', optional: true },
  // jumping up a ledge / a gap: 0 crouch, 1 push-off rising, 2 tucked at the top, 3 landing
  // crouch. Hopping DOWN off a ledge: 0 stepping off (looking down), 1 dropping (legs
  // reaching for the ground), 2 landing. Optional: without them his own frames are bent
  // into the shapes (view/SpriteEnemyView.js). Prompts: docs/enemy-jump-art-prompts.md
  jump: { file: `${DIR}/${id}_jump.png`, frames: 4, ref: 0, ground: 'drawn', optional: true },
  drop: { file: `${DIR}/${id}_drop.png`, frames: 3, ref: 0, ground: 'drawn', optional: true },
});

// The scared set of animations for a one-armed enemy (side = 'B' or 'F').
export function scaredAnims(side) {
  const fl = `flee${side}`;
  const cw = `cower${side}`;
  return {
    walk: { needs: [fl], frames: seq(fl, [0, 1, 2, 3, 4, 5, 6, 7]), fps: 13, loop: true },
    idle: { needs: [cw], frames: seq(cw, [0, 1]), fps: 7, loop: true, tremble: true },
    block: { needs: [cw], frames: seq(cw, [2]) },
    hit: { needs: [cw], frames: seq(cw, [3]) },
    air: { needs: [cw], frames: seq(cw, [4]) },
    lying: { needs: [cw], frames: seq(cw, [5]) },
    getup: { needs: [cw], frames: seq(cw, [5, 4, 0]) },
  };
}

// per-strip fixes on top of the standard set
const fix = (strips, extra) => {
  for (const [k, v] of Object.entries(extra)) strips[k] = { ...strips[k], ...v };
  return strips;
};

export const ENEMY_STRIPS = {
  // the fodder: no special move, so no special strip
  grunt: (({ special, ...rest }) => rest)(set('grunt')),
  butcher: fix(set('butcher'), {
    doom: { holes: [[182, 279]] }, // the gap between the hook's chain and his leg
  }),
  berserker: fix(set('berserker'), {
    heavy: { erase: [[1452, 540, 1492, 670]] }, // rubble touching the previous pose's axe head
  }),
  gladiator: fix(set('gladiator'), {
    // the swung mace head touches the next pose: cut a gap, then give it to the strike pose
    atk1: { erase: [[1146, 560, 1172, 618], [1098, 612, 1150, 640]] },
  }),
  stalker: fix(set('stalker'), {
    react: { erase: [[1690, 210, 1800, 320]] }, // dagger flung from the knocked-down pose
    special: { own: [[280, 150, 420, 330, 1]] },  // the swung sickle belongs to pose 2
  }),
  penitent: fix(set('penitent'), {
    // the little surprise ticks drawn round his helmet (no marks over heads: body language
    // only), and the gaps closed off by the flail's chain
    doom: { holes: [[721, 280], [1244, 276], [1781, 326], [210, 283], [1404, 283]], erase: [[737, 96, 757, 130], [712, 118, 736, 136], [767, 113, 788, 141], [751, 134, 759, 145], [739, 142, 751, 154], [711, 147, 738, 160], [732, 165, 748, 174],
      [1306, 107, 1345, 147], [1441, 125, 1467, 154], [1449, 159, 1484, 175],
      [1744, 121, 1764, 153], [1726, 144, 1743, 165], [1766, 148, 1783, 167], [1796, 147, 1820, 169], [1801, 172, 1818, 183], [1677, 203, 1701, 217], [1692, 225, 1708, 237]] },
  }),
  ghoul: set('ghoul'),
  // the boss: painted on magenta (his black cape would vanish into a black background),
  // and the standard six strips only (he can't be maimed, so no scared sets)
  warlord: Object.fromEntries(['walk', 'react', 'atk1', 'atk2', 'heavy', 'special'].map((n) => [n, { ...set('warlord')[n], bg: 'magenta' }])),
};

const seq = (strip, ids) => ids.map((i) => `${strip}:${i}`);
// the standard phase layouts
const quick = (s) => ({ needs: [s], phases: { startup: seq(s, [0, 1]), active: seq(s, [2]), recovery: seq(s, [3, 4]) } });
const big = (s) => ({ needs: [s], phases: { startup: seq(s, [0, 1, 2, 2]), active: seq(s, [3]), recovery: seq(s, [4, 4, 5]) } });

const COMMON = {
  // one clean key pose; the breathing is smooth eased motion on top (SpriteEnemyView),
  // not a flip between two slightly different drawings (that read as a twitch)
  idle: { needs: ['react'], frames: seq('react', [0]), fps: 1, loop: true, breathe: true },
  // heavy, lumbering: linger on each foot's contact + weight-down frames (1-2, 5-6 in the
  // drawn order), move quicker through the passing/lift frames. Steps are driven by how
  // fast the enemy actually moves (view/SpriteEnemyView.js), so feet don't skate.
  walk: { needs: ['walk'], frames: seq('walk', [0, 1, 1, 2, 3, 4, 5, 5, 6, 7]), fps: 9, loop: true, lumber: true },
  // the same walk seen from other sides (only the ones whose strips exist are used)
  ...Object.fromEntries(['U', 'D', 'UD', 'DD'].map((d) =>
    [`walk${d}`, { needs: [`walk${d}`], frames: seq(`walk${d}`, [0, 1, 1, 2, 3, 4, 5, 5, 6, 7]), fps: 9, loop: true, lumber: true }])),
  block: { needs: ['react'], frames: seq('react', [2]) },
  hit: { needs: ['react'], frames: seq('react', [3]) },
  air: { needs: ['react'], frames: seq('react', [4]) },
  lying: { needs: ['react'], frames: seq('react', [5]) },
  getup: { needs: ['react'], frames: seq('react', [5, 4, 0]) },
  // stuck with a mine: one pose per f.doom.kind (picked in SpriteEnemyView)
  doom: { needs: ['doom'], frames: seq('doom', [0, 1, 2, 3]) },
  // ledges (stage/Terrain.js): the painted jump and drop, when they exist
  jump: { needs: ['jump'], frames: seq('jump', [0, 1, 2, 3]) },
  drop: { needs: ['drop'], frames: seq('drop', [0, 1, 2]) },
};

export const ENEMY_ANIMS = {
  grunt: {
    ...COMMON,
    light1: quick('atk1'), light2: quick('atk2'), heavy: big('heavy'),
  },
  butcher: {
    ...COMMON,
    light1: quick('atk1'), light2: quick('atk2'), heavy: big('heavy'),
    // Meat Hook: 0 ready, 1-3 whirling the hook overhead, 4 throw (arm out), 5 yank back
    special1: { needs: ['special'], phases: { startup: seq('special', [0, 1, 2, 3, 1, 2, 3]), active: seq('special', [4]), recovery: seq('special', [4, 5, 5]) } },
  },
  stalker: {
    ...COMMON,
    light1: quick('atk1'), light2: quick('atk2'),
    light3: big('heavy'), heavy: big('heavy'),
    special1: { needs: ['special'], phases: { startup: seq('special', [0, 1, 2, 3, 1, 2, 3]), active: seq('special', [4]), recovery: seq('special', [4, 5, 5]) } },
  },
  penitent: {
    ...COMMON,
    light1: quick('atk1'), light2: quick('atk2'), heavy: big('heavy'),
    // Chain Storm: 0 ready, 1 wind, 2-5 whirling round (looped while active)
    special1: { needs: ['special'], phases: { startup: seq('special', [0, 1]), active: seq('special', [2, 3, 4, 5, 2, 3, 4, 5]), recovery: seq('special', [1, 0]) } },
  },
  berserker: {
    ...COMMON,
    light1: quick('atk1'), light2: quick('atk2'),
    light3: big('heavy'), heavy: big('heavy'),
    // Berserk Rush: 0 ready, 1 crouch, 2-4 charging run, 5 shoulder impact
    special1: { needs: ['special'], phases: { startup: seq('special', [0, 1]), active: seq('special', [2, 3, 4, 2, 3, 4, 5]), recovery: seq('special', [5, 1]) } },
  },
  ghoul: {
    ...COMMON,
    light1: quick('atk1'), light2: quick('atk2'), heavy: big('heavy'),
    special1: { needs: ['special'], phases: { startup: seq('special', [0, 1]), active: seq('special', [2, 3, 4, 5, 2, 3, 4, 5]), recovery: seq('special', [1, 0]) } },
  },
  warlord: {
    ...COMMON,
    light1: quick('atk1'), light2: quick('atk2'), heavy: big('heavy'),
    // Bull Charge: 0 ready, 1 crouch and roar, 2-4 charging, 5 the impact
    special1: { needs: ['special'], phases: { startup: seq('special', [0, 1, 1]), active: seq('special', [2, 3, 4, 2, 3, 4, 5]), recovery: seq('special', [5, 5, 1]) } },
    // Earthbreaker: the Headsman's Fall poses, held long at the top of the lift (the
    // tell), then down into the floor and a long, heavy pull back out
    special2: { needs: ['heavy'], phases: { startup: seq('heavy', [0, 1, 2, 2, 2, 2, 2]), active: seq('heavy', [3]), recovery: seq('heavy', [4, 4, 4, 4, 5]) } },
  },
  gladiator: {
    ...COMMON,
    light1: quick('atk1'), light2: quick('atk2'), heavy: big('heavy'),
    // Shield Rush: 0 ready, 1 shield up crouch, 2-4 charging behind the shield, 5 bash
    special1: { needs: ['special'], phases: { startup: seq('special', [0, 1]), active: seq('special', [2, 3, 4, 2, 3, 5]), recovery: seq('special', [5, 1]) } },
  },
};
