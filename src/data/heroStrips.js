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
      // his finishers and his levitation jump (optional: else he borrows his casting poses)
      // (tips: where the staff's lantern is in each pose, in cut-frame pixels (the boots'
      // anchor is at 208, 460); null where it can't be seen. The finisher's lightning comes
      // out of it: view/StripHeroView.staffTip, effects/MageFX.js)
      finStorm: strip('mage', 'finStorm', 8, { ground: 'drawn', tips: [[185, 223], [186, 225], [191, 154], [193, 152], null, [142, 368], [185, 223], [185, 224]] }), // ready, plant, staff up, sparks, staff down, hold, lower, ready
      finRupture: strip('mage', 'finRupture', 8, { ground: 'drawn' }), // ready, hand out, curl, hold, closing, near fist, fist, lower
      finEmbers: strip('mage', 'finEmbers', 8, { ground: 'drawn', ref: 4, target: 138 }), // dissolving, re-forming, staff raised, slam, planted, robe blown up, still, turning away
      levitate: strip('mage', 'levitate', 4, { ground: 'drawn', target: 124 }), // gather, rising, the top, descending
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
      // sprint (optional): flying flat out along the staff
      // (drawn at about 0.68 the scale of the glide: his hood is 50 px wide here, 75 there.
      // So pose 0, 196 px tall on the sheet, is 196 x 0.68 x 132/450 ≈ 85 px, not shorter,
      // or he shrinks the moment he breaks into a run)
      dash: strip('mage', 'dash', 8, { align: 'median', ref: 0, target: 85 }),
    },
  },
  rogue: {
    target: 90, // her low guard stance: petite, under every other fighter
    needs: ['run', 'combo1', 'combo2', 'combo3', 'combo4', 'viper', 'moves', 'dodge', 'air', 'react'],
    strips: {
      run: strip('rogue', 'run', 8, { align: 'median', ground: 'drawn', target: 89 }),
      runU: strip('rogue', 'runU', 8, { align: 'median', ground: 'drawn', target: 89 }), // from behind (up the screen)
      // coiled guard; pose 3 is a dagger flourish (optional). (nudge: ChatGPT drew each pose a
      // few px off the last; these line every pose's body up on pose 0's, or she shivers)
      idle: strip('rogue', 'idle', 6, { nudge: [[0, 0], [3, 1], [2, -1], [5, -1], [4, 1], [2, -1]] }),
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
      // sprint (optional): low and flat out, arms swept back
      sprint: strip('rogue', 'sprint', 8, { align: 'median', ground: 'drawn', target: 70 }),
      runD: strip('rogue', 'runD', 8, { align: 'median', ground: 'drawn', target: 92 }), // from the front (down the screen)
      // her finishers (optional: else she borrows her attack poses)
      finPhantom: strip('rogue', 'finPhantom', 8, { ground: 'drawn', target: 84 }), // deep stance, still, four slashes, crouch with her back turned, standing
      finLotus: strip('rogue', 'finLotus', 8, { ground: 'drawn', ref: 7 }),          // throw, sprint, cut and shove, slide, dive flat, rising, look back, guard
      finScarlet: strip('rogue', 'finScarlet', 8, { ground: 'drawn', ref: 7, target: 62 }), // sprint, take-off, rising, spin, turning over, dive, strike, low crouch
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
    sprint: { needs: ['dash'], frames: seq('dash', [0, 1, 2, 3, 4, 5, 6, 7]), fps: 14, loop: true },
    jumpStrip: { needs: ['levitate'], frames: seq('levitate', [1, 2, 3]) }, // rising, the top, descending
    fin_storm: { needs: ['finStorm'], frames: seq('finStorm', [0, 1, 2, 3, 4, 5, 6, 7]) },
    fin_rupture: { needs: ['finRupture'], frames: seq('finRupture', [0, 1, 2, 3, 4, 5, 6, 7]) },
    fin_embers: { needs: ['finEmbers'], frames: seq('finEmbers', [0, 1, 2, 3, 4, 5, 6, 7]) },
    // IMPALING SPIRES: the gate's staff slam without the blink (raised, slam, planted ... turning away)
    fin_spires: { needs: ['finEmbers'], frames: seq('finEmbers', [2, 3, 4, 4, 4, 5, 6, 7]) },
    jump: { frames: seq('hover', [3, 4]) },
    // block: the staff braced up across him in both hands (combo2's follow-through pose;
    // react pose 0, used before, holds it trailing behind him like a flinch)
    block: { frames: seq('combo2', [3]) },
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
    // THE REWORK (2026-11-04): stand-in poses from his other strips until ChatGPT paints
    // his own (docs/mage-art-prompts.md: jab, twirl, vault)
    // the lantern jab: drawn back, the staff thrust out level (the bolt's thrust), recover
    jab: swing(seq('combo1', [1]), seq('bolt', [3]), seq('bolt', [4]).concat(seq('combo1', [4]))),
    // the staff twirl: the strike poses spun through fast
    twirl: { frames: seq('combo1', [2]).concat(seq('combo2', [2]), seq('combo1', [3]), seq('combo2', [3])), fps: 18, loop: true },
    twirlEnd: swing(seq('combo3', [2]), seq('combo3', [3]), seq('combo3', [3, 4])),
    // the pole-vault kick: up on the staff, flying in, down
    shoulder: { needs: ['levitate', 'dash'], ...swing(seq('levitate', [0, 1]), seq('dash', [2]), seq('levitate', [3])) },
    // Y, Y, X: the thunder staff (the spinning slam, charged)
    thunder: swing(seq('combo3', [1, 2]), seq('combo3', [3]), seq('combo3', [3, 3, 4])),
    // finishers borrow his casting poses (kind -> strip)
    finisher: { storm: seq('bolt', [0, 1, 2, 2, 3, 3, 4, 5]), rupture: seq('force', [0, 1, 2, 3, 3, 3, 3, 4]), embers: seq('ward', [0, 1, 2, 3, 4, 4, 4, 5]) },
  },
  rogue: {
    idle: { frames: seq('combo1', [0]), fps: 1, loop: true, breathe: true },
    walk: { frames: seq('run', [0, 1, 2, 3, 4, 5, 6, 7]), fps: 15, loop: true },
    walkU: { needs: ['runU'], frames: seq('runU', [0, 1, 2, 3, 4, 5, 6, 7]), fps: 15, loop: true },
    // her idle (5 Nov 2026): her own breathing strip, six copies of ONE guard pose that differ
    // only in her chest, hair and cloak tips (ChatGPT edited them from a single image, and
    // tools/bake-vexa-strip.py --steady lined each up on pose 0), so she breathes without the
    // static crawl the old six freshly-painted poses had. Played there and back, slowly.
    idleStrip: { needs: ['breath'], frames: seq('breath', [0, 1, 2, 3, 4, 5, 4, 3, 2, 1]), fps: 5, loop: true },
    // (block, her block-and-hurt sheet: 0 guard, 1 a blow on the guard, 2 recovering, 3 the
    // guard whipped round, 4 hit in the body, 5 hit in the head, 6 falling, 7 dead)
    block: { needs: ['block'], frames: seq('block', [0, 1]) }, // the guard; a blow landing on it
    death: { needs: ['block'], frames: seq('block', [6, 7]) },
    light1: swing(seq('combo1', [0, 1]), seq('combo1', [2]), seq('combo1', [3])),
    light2: swing(seq('combo2', [0, 1]), seq('combo2', [2]), seq('combo2', [3])),
    light3: swing(seq('combo3', [0, 1]), seq('combo3', [2]), seq('combo3', [3])),
    light4: swing(seq('combo4', [0, 1]), seq('combo4', [2]), seq('combo4', [2, 3])),
    viper: swing(seq('viper', [0]), seq('viper', [1, 2]), seq('viper', [3, 4, 5])),
    kick: swing(seq('moves', [0]), seq('moves', [1]), seq('moves', [2])),
    // (moves2, her second moves sheet: 0-2 the leg sweep, 3 the sidearm throw, 4 setting a
    // mine, 5 springing away, 6 the fan thrown in the air, 7 the boot planted to vault)
    sweep: { needs: ['moves2'], ...swing(seq('moves2', [0]), seq('moves2', [1]), seq('moves2', [2])) },
    airAttack: swing(seq('air', [1]), seq('air', [6]), seq('air', [6])),
    knife: { needs: ['moves2'], frames: [...seq('moves', [4]), ...seq('moves2', [3, 3])] }, // the knife drawn, the sidearm throw
    mine: { needs: ['moves2'], frames: seq('moves2', [4, 5]) },
    dodge: { frames: seq('dodge', [0, 1, 2, 3]) },
    dodgeBack: { frames: seq('dodge', [4, 5, 6, 7]) },
    // rolling up / down the lane: the shoulder roll seen from behind and from the front
    dodgeUp: { needs: ['rollUp'], frames: seq('rollUp', [0, 1, 2, 3, 4, 5]) },
    dodgeDown: { needs: ['rollDown'], frames: seq('rollDown', [0, 1, 2, 3, 4, 5]) },
    jump: { frames: seq('air', [0, 1]) },   // rising, falling
    sprint: { needs: ['sprint'], frames: seq('sprint', [0, 1, 2, 3, 4, 5, 6, 7]), fps: 18, loop: true },
    walkD: { needs: ['runD'], frames: seq('runD', [0, 1, 2, 3, 4, 5, 6, 7]), fps: 15, loop: true },
    fin_phantom: { needs: ['finPhantom'], frames: seq('finPhantom', [0, 1, 2, 3, 4, 5, 6, 7]) },
    fin_lotus: { needs: ['finLotus'], frames: seq('finLotus', [0, 1, 2, 3, 4, 5, 6, 7]) },
    fin_scarlet: { needs: ['finScarlet'], frames: seq('finScarlet', [0, 1, 2, 3, 4, 5, 6, 7]) },
    flip: { needs: ['flip'], frames: seq('flip', [0, 1, 2, 3, 4, 5, 6, 7]) }, // her second jump
    // her second set (combat/RogueMoves.js), her own strips (ChatGPT, 4 Nov 2026:
    // docs/rogue-art-prompts.md jobs 11-18; the HD sheets are listed in data/vexaArt.js)
    rush: { needs: ['rush'], ...swing(seq('rush', [0]), seq('rush', [1, 2, 3]), seq('rush', [4, 5])) },   // SHADOW RUSH: sprint, the dive forward, the two cuts; the skid and the turn back
    backstab: { needs: ['backstab'], frames: seq('backstab', [0, 1, 2, 3, 4, 5]) }, // out of the smoke: arrived, cocked, the stab, held, pull out, guard
    cuts: { needs: ['cuts'], rise: seq('cuts', [0]), slash: seq('cuts', [1, 2, 3, 4]), spike: seq('cuts', [5, 6]), drop: seq('cuts', [6]), land: seq('cuts', [7]) }, // THOUSAND CUTS
    fade: { frames: seq('dodge', [4, 5, 6, 7]) },       // FADE: the handspring away
    // GRAB AND THROW (combat/Grab.js): her own strip (8 poses as Rurik's neck grip: ready,
    // clamp, four march steps, the shove wound up, the shove)
    grab: { needs: ['grab'], poses: seq('grab', [0, 1, 2, 3, 4, 5, 6, 7]) },
    smoke: { needs: ['night'], frames: seq('night', [0, 1]) }, // SMOKE BOMB: the pellet flicked down, the arm over her face
    nightfall: { needs: ['night'], gather: seq('night', [1]), cut: seq('night', [2, 3, 4, 5, 6]), sheathe: seq('night', [7]) }, // NIGHT FALLS: five cuts, five men; the daggers sheathed
    vault: { needs: ['moves2'], frames: seq('moves2', [7]) }, // a boot planted on his shoulder, coiled
    launched: { frames: seq('air', [3]) },  // the long rise off a teammate's shoulder
    fan: { needs: ['moves2'], frames: seq('moves2', [6]) },  // both arms whipping the fan down
    dive: { frames: seq('air', [5, 6, 7]) }, // diving, the strike, the landing crouch
    hitstun: { needs: ['block'], frames: seq('block', [4]) }, // a hard hit to the body
    stagger: { needs: ['block'], frames: seq('block', [5]) }, // a hit to the head, snapped back
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
