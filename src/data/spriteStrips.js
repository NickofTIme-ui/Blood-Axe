// spriteStrips.js — Extra animation strips (ChatGPT-made, one pose per figure in a row)
// that are cut into frames at boot by view/stripImporter.js, plus the animations that
// use them. A strip that fails to load is simply skipped and the old animation stays.
//
// STRIP FIELDS
//   file     PNG, figures in one row on a plain black (or magenta: bg: 'magenta') background
//   frames   how many poses are in the strip
//   ref      which pose is "standing" for sizing (index, or a height in source px)
//   air      true = keep each pose's height above the ground (jumps, leaps)
//
// ANIMATION FRAMES are 'strip:index' (or plain numbers for the main sheet).
// Attack animations use { phases: { startup: [...], active: [...], recovery: [...] } }.

export const CHARACTER_STRIPS = {
  ulric: {
    // walk2 sets the size; the others were drawn "same scale" so they borrow its scale
    // (crouched or tucked poses would otherwise be blown up to full standing height)
    walk2:   { file: 'assets/sprites/strips/ulric_walk2.png', frames: 8, align: 'median', ground: 'drawn' },
    // the same walk seen from other sides (view/Heading.js): U = from behind (walking
    // away, up the screen), D = from the front, UD / DD = three-quarter back / front
    walkU:   { file: 'assets/sprites/strips/ulric_walkU.png', frames: 8, align: 'median', ground: 'drawn' },
    walkD:   { file: 'assets/sprites/strips/ulric_walkD.png', frames: 8, align: 'median', ground: 'drawn' },
    walkUD:  { file: 'assets/sprites/strips/ulric_walkUD.png', frames: 9, align: 'median', ground: 'drawn' }, // (drawn with 9 poses)
    walkDD:  { file: 'assets/sprites/strips/ulric_walkDD.png', frames: 8, align: 'median', ground: 'drawn' },
    rollUp:  { file: 'assets/sprites/strips/ulric_roll_up2.png', frames: 6, ref: 0, target: 116 }, // seen from behind
    rollDown:{ file: 'assets/sprites/strips/ulric_roll_down2.png', frames: 6, ref: 0, target: 116 }, // headfirst dive at the camera
    kick:    { file: 'assets/sprites/strips/ulric_kick2.png', frames: 6, ref: 0, target: 116 }, // first pose = standing
    slash:   { file: 'assets/sprites/strips/ulric_slash.png', frames: 6, ref: 5, target: 116 },
    // 3-hit combo: cross left, return right, overhand (each strip's first pose = standing guard)
    combo1:  { file: 'assets/sprites/strips/ulric_combo1.png', frames: 5, ref: 0, target: 116 },
    combo2:  { file: 'assets/sprites/strips/ulric_combo2.png', frames: 5, scaleFrom: 'combo1' },
    combo3:  { file: 'assets/sprites/strips/ulric_combo3.png', frames: 5, scaleFrom: 'combo1' },
    cleave:  { file: 'assets/sprites/strips/ulric_cleave.png', frames: 6, scaleFrom: 'slash' },
    // hold-attack power thrust: two-handed charge-up (first pose = ready stance) and the
    // lunging thrust (last pose = ready stance)
    charge:  { file: 'assets/sprites/strips/ulric_charge.png', frames: 4, ref: 0, target: 116, ground: 'drawn' },
    thrust:  { file: 'assets/sprites/strips/ulric_thrust.png', frames: 6, ref: 5, target: 116, ground: 'drawn' },
    // stalking forward while fully coiled (played backwards when he backs off)
    // (every pose is the crouched, coiled stance: sized to match charge pose 4, ~89 px)
    chargeWalk: { file: 'assets/sprites/strips/ulric_chargewalk.png', frames: 8, ref: 0, target: 90, align: 'median', ground: 'drawn' },
    // the hero's charge (sprint): head down, blade back, cape streaming
    sprint:  { file: 'assets/sprites/strips/ulric_sprint.png', frames: 8, ref: 0, target: 104, align: 'median', ground: 'drawn' },
    // finishers (combat/Finisher.js), drawn on an invisible victim
    finThroat: { file: 'assets/sprites/strips/ulric_finthroat.png', frames: 8, ref: 0, target: 116, ground: 'drawn' },
    finImpale: { file: 'assets/sprites/strips/ulric_finimpale.png', frames: 8, ref: 7, target: 116, ground: 'drawn', wide: 70 },
  },
};

const seq = (strip, ids) => ids.map((i) => `${strip}:${i}`);

export const ANIM_OVERRIDES = {
  ulric: {
    // heavy, lumbering, determined: slower cadence + a planted bob (SpriteFighterView)
    // idle: his ready stance (the pose every attack strip starts and ends on, so no pop
    // going in or out of a swing) with smooth eased breathing on top (SpriteFighterView)
    idle: { needs: ['combo1'], frames: seq('combo1', [0]), fps: 1, loop: true, breathe: true },
    // lingers on each foot's weight-down frame (1, 5), so every step lands heavily
    walk: { needs: ['walk2'], frames: seq('walk2', [0, 1, 1, 2, 3, 4, 5, 5, 6, 7]), fps: 11, loop: true, heavyBob: true },
    walkU: { needs: ['walkU'], frames: seq('walkU', [0, 1, 1, 2, 3, 4, 5, 5, 6, 7]), fps: 11, loop: true, heavyBob: true },
    walkD: { needs: ['walkD'], frames: seq('walkD', [0, 1, 1, 2, 3, 4, 5, 5, 6, 7]), fps: 11, loop: true, heavyBob: true },
    walkUD: { needs: ['walkUD'], frames: seq('walkUD', [0, 1, 1, 2, 3, 4, 5, 5, 6, 7]), fps: 11, loop: true, heavyBob: true },
    walkDD: { needs: ['walkDD'], frames: seq('walkDD', [0, 1, 1, 2, 3, 4, 5, 5, 6, 7]), fps: 11, loop: true, heavyBob: true },
    sprint: { needs: ['sprint'], frames: seq('sprint', [0, 1, 2, 3, 4, 5, 6, 7]), fps: 16, loop: true },
    dodgeUp: { needs: ['rollUp'], frames: seq('rollUp', [0, 1, 2, 3, 4, 5]) },
    dodgeDown: { needs: ['rollDown'], frames: seq('rollDown', [0, 1, 2, 3, 4, 5]) },
    // Sparta kick: short ready beat, a long coiled chamber (the recoil), then the drive
    kick: { needs: ['kick'], phases: { startup: seq('kick', [0, 1, 1, 1]), active: seq('kick', [2, 3]), recovery: seq('kick', [3, 4, 5]) } },
    // 1st tap: cross slash (high front -> low behind the back hip)
    light1: { needs: ['combo1'], phases: { startup: seq('combo1', [0, 1]), active: seq('combo1', [2, 3]), recovery: seq('combo1', [4]) } },
    // 2nd tap: the return (low behind -> up and across to the right)
    light2: { needs: ['combo2'], phases: { startup: seq('combo2', [0, 1]), active: seq('combo2', [2, 3]), recovery: seq('combo2', [4]) } },
    // 3rd tap: overhand
    light3: { needs: ['combo3'], phases: { startup: seq('combo3', [0, 1, 2]), active: seq('combo3', [3]), recovery: seq('combo3', [3, 4]) } },
    heavy: { needs: ['cleave'], phases: { startup: seq('cleave', [0, 1, 2, 2, 2, 3]), active: seq('cleave', [4]), recovery: seq('cleave', [4, 4, 5]) } },
    // charge: poses 1-3 by how long he's been loading (SpriteFighterView)
    charge: { needs: ['charge'], frames: seq('charge', [0, 1, 2, 3]) },
    // moving while charged: lingers on each foot's weight-down frame, like his walk
    chargeWalk: { needs: ['chargeWalk'], frames: seq('chargeWalk', [0, 1, 1, 2, 3, 4, 5, 5, 6, 7]) },
    // finisher poses keyed to the timeline frames (FINISHERS in combat/Finisher.js):
    // throat — reach in, grab, blade across at 24 (the slit), let him drop at 52
    // impale — coil, drive it in at 20, brace, heave him up the blade (slow), hold him
    //          aloft, knee up, stamp-kick him off at 104 (IMPALE in combat/Finisher.js)
    fin_impale: { needs: ['finImpale'], keys: [[0, 'finImpale:0'], [18, 'finImpale:1'], [20, 'finImpale:2'], [41, 'finImpale:3'], [53, 'finImpale:4'], [92, 'finImpale:5'], [103, 'finImpale:6'], [122, 'finImpale:7']] },
    fin_throat: { needs: ['finThroat'], keys: [[0, 'finThroat:0'], [4, 'finThroat:1'], [10, 'finThroat:2'], [24, 'finThroat:3'], [30, 'finThroat:4'], [52, 'finThroat:5'], [60, 'finThroat:6'], [68, 'finThroat:7']] },
    // launch off the rear foot, arms and blade driven fully out and HELD, then pull back
    thrust: { needs: ['thrust'], phases: { startup: seq('thrust', [0, 1]), active: seq('thrust', [2, 3, 3, 3]), recovery: seq('thrust', [3, 3, 4, 5]) } },
  },
};

// Effects strips: equal cells, trimmed and scaled to `height` px.
export const FX_STRIPS = {
  firebolt: { file: 'assets/fx/firebolt-strip.png', frames: 8, height: 44, fps: 14 },
  // the column of fire a floor grate throws up (view/StageView.js); drawn at half scale
  firepit: { file: 'assets/fx/firepit-strip.png', frames: 8, height: 300, fps: 16 },
};
