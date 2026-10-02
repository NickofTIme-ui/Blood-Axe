// heroStrips.js — Painted animation strips for the heroes who have no main sprite sheet
// (the Mage and the Rogue; Ulric's are in data/spriteStrips.js). ChatGPT-made, one row of
// poses on black, cut into frames at boot (view/stripImporter.js) and drawn by
// view/StripHeroView.js. Prompts and chats: docs/mage-art-prompts.md, docs/rogue-art-prompts.md.
//
// A hero switches to his strips once every strip in `needs` has loaded; until then he
// keeps his stand-in (the Mage's coded rig, the Rogue's placeholder shapes).
//
// Sizing: ChatGPT fits each strip to its image, so "same scale" never holds between
// strips. Each strip is sized by one of its own poses: pose `ref` (default the first)
// is drawn `target` px tall (default the hero's `target`).

const DIR = 'assets/sprites/strips';
const strip = (id, name, frames, extra = {}) => ({ file: `${DIR}/${id}_${name}.png`, frames, ...extra });

export const HERO_STRIPS = {
  mage: {
    target: 132, // lantern tip to boot toes, standing with the staff upright
    needs: ['hover', 'combo1', 'combo2', 'combo3', 'bolt', 'force', 'blink', 'ward', 'react'],
    strips: {
      hover: strip('mage', 'hover', 8, { align: 'median' }), // the glide cycle
      idle: strip('mage', 'idle', 6, { align: 'median' }),   // hovering idle (optional: else the glide)
      hoverU: strip('mage', 'hoverU', 8, { align: 'median' }), // the glide from behind (up the screen)
      hoverD: strip('mage', 'hoverD', 8, { align: 'median' }), // ...and from the front (down the screen)
      // (mage_fin*.png exist but drifted in style — duller, flatter — so his finishers
      //  stay on his casting poses until they're redrawn)
      // (their ready stance holds the staff across him, so it stands shorter than 132)
      combo1: strip('mage', 'combo1', 5, { target: 126 }),  // ready, wind-up, contact, follow-through, recover
      combo2: strip('mage', 'combo2', 5, { target: 117 }),
      combo3: strip('mage', 'combo3', 5, { target: 121, ground: 'drawn' }),  // ready, back turned, overhead, slam, rise
      bolt: strip('mage', 'bolt', 6),      // ready, raise, charge, thrust, recoil, ready
      force: strip('mage', 'force', 5),    // ready, coil, shove, hold, ready
      blink: strip('mage', 'blink', 6),    // ready, breaking up, nearly gone, re-forming, landed, ready
      ward: strip('mage', 'ward', 6, { ground: 'drawn' }),  // ready, lift, top, slam, planted, pull up
      // block, light hit, heavy hit, flying, lying, rising flat, tilting up, hover
      react: strip('mage', 'react', 8, { ref: 7, ground: 'drawn' }),
    },
  },
  rogue: {
    target: 90, // her low guard stance: petite, under every other fighter
    needs: ['run', 'combo1', 'combo2', 'combo3', 'combo4', 'viper', 'moves', 'dodge', 'air', 'react'],
    strips: {
      run: strip('rogue', 'run', 8, { align: 'median', ground: 'drawn', target: 89 }),
      runU: strip('rogue', 'runU', 8, { align: 'median', ground: 'drawn', target: 89 }), // from behind (up the screen)
      idle: strip('rogue', 'idle', 6), // coiled guard; pose 4 is a dagger flourish (optional)
      combo1: strip('rogue', 'combo1', 4), // guard, cocked, slash, follow-through
      combo2: strip('rogue', 'combo2', 4),
      combo3: strip('rogue', 'combo3', 4),
      combo4: strip('rogue', 'combo4', 4, { ground: 'drawn', ref: 1, target: 78 }), // low coil, turn, rising strike (airborne), landing
      viper: strip('rogue', 'viper', 6, { ref: 5 }),   // crouch, burst, crossing cut, slide, low finish, guard
      moves: strip('rogue', 'moves', 8, { ref: 2 }),   // kick x3, block, knife draw, knife thrown, mine set, spring away
      dodge: strip('rogue', 'dodge', 8, { ground: 'drawn', ref: 7 }), // forward roll x4, handspring x4
      air: strip('rogue', 'air', 8, { ground: 'drawn', ref: 7, target: 77 }),     // take-off, tuck, vault plant, launched, fan, dive, strike, landing
      // the double-jump flip (optional): kick off, tuck, inverted, layout, twist, coming round, soaring, gather
      flip: strip('rogue', 'flip', 8, { ground: 'drawn', ref: 0, target: 112, holes: [[1020, 370], [1050, 380]] }), // (holes: the gap under her cloak in pose 4)
      react: strip('rogue', 'react', 8, { ref: 7, ground: 'drawn' }),   // hit, stumble, flying, lying, roll up, kick-through, spring, stance
    },
  },
};

const seq = (s, ids) => ids.map((i) => `${s}:${i}`);
const swing = (startup, active, recovery) => ({ phases: { startup, active, recovery } });

// What each state shows. Three kinds of entry (view/StripHeroView.js):
//   { frames, fps, loop }          a loop on a clock
//   { frames }                     spread over the state's length (or picked by the view)
//   { phases }                     an attack: tied to the move's startup / active / recovery
export const HERO_ANIMS = {
  mage: {
    idle: { frames: seq('hover', [0, 1, 2, 3, 4, 5, 6, 7]), fps: 5, loop: true },
    walk: { frames: seq('hover', [0, 1, 2, 3, 4, 5, 6, 7]), fps: 10, loop: true },
    walkU: { needs: ['hoverU'], frames: seq('hoverU', [0, 1, 2, 3, 4, 5, 6, 7]), fps: 10, loop: true },
    walkD: { needs: ['hoverD'], frames: seq('hoverD', [0, 1, 2, 3, 4, 5, 6, 7]), fps: 10, loop: true },
    idleStrip: { needs: ['idle'], frames: seq('idle', [0, 1, 2, 3, 4, 5]), fps: 5, loop: true },
    jump: { frames: seq('hover', [3, 4]) },
    block: { frames: seq('react', [0]) },
    light1: swing(seq('combo1', [0, 1]), seq('combo1', [2]), seq('combo1', [3, 4])),
    light2: swing(seq('combo2', [0, 1]), seq('combo2', [2]), seq('combo2', [3, 4])),
    light3: swing(seq('combo3', [0, 1, 2]), seq('combo3', [3]), seq('combo3', [3, 3, 4])),
    airAttack: swing(seq('combo3', [2]), seq('combo3', [3]), seq('combo3', [3])),
    bolt: { frames: seq('bolt', [0, 1, 2, 3, 4, 5]) },
    force: { frames: seq('force', [0, 1, 2, 3, 4]) },
    ward: { frames: seq('ward', [0, 1, 2, 3, 4, 5]) },
    blink: { frames: seq('blink', [0, 1, 2, 3, 4, 5]) },
    hitstun: { frames: seq('react', [1]) },
    stagger: { frames: seq('react', [2]) },
    flying: { frames: seq('react', [3]) },
    lying: { frames: seq('react', [4]) },
    getup: { frames: seq('react', [5, 6, 7]) },
    // finishers borrow his casting poses (kind -> strip)
    finisher: { storm: seq('bolt', [0, 1, 2, 2, 3, 3, 4, 5]), rupture: seq('force', [0, 1, 2, 3, 3, 3, 3, 4]), embers: seq('ward', [0, 1, 2, 3, 4, 4, 4, 5]) },
  },
  rogue: {
    idle: { frames: seq('combo1', [0]), fps: 1, loop: true, breathe: true },
    walk: { frames: seq('run', [0, 1, 2, 3, 4, 5, 6, 7]), fps: 15, loop: true },
    walkU: { needs: ['runU'], frames: seq('runU', [0, 1, 2, 3, 4, 5, 6, 7]), fps: 15, loop: true },
    // her idle: the coiled guard breathing, with the flourish (pose 4) now and then
    idleStrip: { needs: ['idle'], frames: seq('idle', [0, 1, 2, 1, 0, 1, 2, 1, 0, 1, 2, 3, 4, 5]), fps: 6, loop: true },
    block: { frames: seq('moves', [3]) },
    light1: swing(seq('combo1', [0, 1]), seq('combo1', [2]), seq('combo1', [3])),
    light2: swing(seq('combo2', [0, 1]), seq('combo2', [2]), seq('combo2', [3])),
    light3: swing(seq('combo3', [0, 1]), seq('combo3', [2]), seq('combo3', [3])),
    light4: swing(seq('combo4', [0, 1]), seq('combo4', [2]), seq('combo4', [2, 3])),
    viper: swing(seq('viper', [0]), seq('viper', [1, 2]), seq('viper', [3, 4, 5])),
    kick: swing(seq('moves', [0]), seq('moves', [1]), seq('moves', [2])),
    sweep: swing(seq('combo4', [0]), seq('combo4', [1]), seq('combo4', [0])),
    airAttack: swing(seq('air', [1]), seq('air', [6]), seq('air', [6])),
    knife: { frames: seq('moves', [4, 5, 5]) },
    mine: { frames: seq('moves', [6]) },
    dodge: { frames: seq('dodge', [0, 1, 2, 3]) },
    dodgeBack: { frames: seq('dodge', [4, 5, 6, 7]) },
    jump: { frames: seq('air', [0, 1]) },   // rising, falling
    flip: { needs: ['flip'], frames: seq('flip', [0, 1, 2, 3, 4, 5, 6, 7]) }, // her second jump
    vault: { frames: seq('air', [2]) },
    launched: { frames: seq('air', [3]) },  // the long rise off a teammate's shoulder
    fan: { frames: seq('air', [4]) },
    dive: { frames: seq('air', [5, 6, 7]) }, // diving, the strike, the landing crouch
    hitstun: { frames: seq('react', [0]) },
    stagger: { frames: seq('react', [1]) },
    flying: { frames: seq('react', [2]) },
    lying: { frames: seq('react', [3]) },
    getup: { frames: seq('react', [4, 5, 6, 7]) },
    finisher: {
      phantom: [...seq('combo4', [0, 0]), ...seq('combo1', [2]), ...seq('combo2', [2]), ...seq('combo3', [2]), ...seq('combo4', [2]), ...seq('viper', [4, 5])],
      lotus: [...seq('moves', [5]), ...seq('run', [2]), ...seq('combo1', [2]), ...seq('moves', [1]), ...seq('viper', [3, 4]), ...seq('viper', [5, 5])],
      scarlet: [...seq('run', [2]), ...seq('air', [0, 3, 4, 5, 5, 6, 7])],
    },
  },
};
