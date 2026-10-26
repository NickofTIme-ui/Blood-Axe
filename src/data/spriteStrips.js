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

import { installRurikCombo } from './rurikComboArt.js';

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
    sprint:  { file: 'assets/sprites/strips/ulric_sprint.png', frames: 8, ref: 0, target: 94, align: 'median', ground: 'drawn' },
    // finishers (combat/Finisher.js), drawn on an invisible victim
    finThroat: { file: 'assets/sprites/strips/ulric_finthroat.png', frames: 8, ref: 0, target: 116, ground: 'drawn' },
    finImpale: { file: 'assets/sprites/strips/ulric_finimpale.png', frames: 8, ref: 7, target: 116, ground: 'drawn', wide: 70 },
    // KINGSFIRE / THE KING'S WRATH: ready, Oathkeeper raised, the roar, driven down, buried
    // (on one knee), wrenched free (last pose = standing tall)
    wrath:   { file: 'assets/sprites/strips/ulric_wrath.png', frames: 6, ref: 5, target: 116, ground: 'drawn' },
    // the RISING CLEAVE (J, J, K): ready, sinking low, the blade ripping up through the man,
    // high follow-through on his toes, recover (first pose = ready stance)
    launcher: { file: 'assets/sprites/strips/ulric_launcher.png', frames: 5, ref: 0, target: 116, ground: 'drawn' },
  },
};

// OATHKEEPER IN HIS HAND: Nick's repaint of the strips above with the blade of his blood.
// His look from the moment Elder Brann puts it in his hands at the end of level 1
// (data/stageVillage.js, the 'elder' scene; Progress.statsFor picks the sheet). Until then
// he carries his old sword (ulric). The wrath was painted with Oathkeeper already.
const OATH_DIR = 'assets/sprites/strips/oathkeeper/';
const REPAINTED = new Set(['walk2', 'walkU', 'walkD', 'walkUD', 'walkDD', 'rollUp', 'rollDown', 'kick', 'slash', 'combo1', 'combo2', 'combo3', 'cleave', 'charge', 'thrust', 'chargeWalk', 'sprint', 'finThroat', 'finImpale', 'launcher']);
CHARACTER_STRIPS.ulricOath = Object.fromEntries(Object.entries(CHARACTER_STRIPS.ulric).map(([name, s]) => (
  [name, REPAINTED.has(name) ? { ...s, file: OATH_DIR + s.file.split('/').pop() } : s]
)));
// Oathkeeper-only strips (ChatGPT, 16 Oct 2026): the moves that still came off his old
// main sheet (ulric.png: jump, air slash, block, Firebolt throw, hit, knockdown, getup),
// plus the Leap Smash and the Shoulder Smash, which borrowed other strips' poses. Each is
// sized on its standing pose like the others.
Object.assign(CHARACTER_STRIPS.ulricOath, {
  // ready, blade drawn back over the shoulder, coiled, the throw, follow-through, ready
  cast:      { file: OATH_DIR + 'ulric_cast.png', frames: 6, ref: 0, target: 116 },
  // ready, raising the guard, holding it, a hit on the guard
  block:     { file: OATH_DIR + 'ulric_block.png', frames: 4, ref: 0, target: 116 },
  // hit, hit again, knocked flying, lying, up on one knee, standing
  hurt:      { file: OATH_DIR + 'ulric_hurt.png', frames: 6, ref: 5, target: 116 },
  // crouch, high with the blade up, the chop, buried, wrenching it out, standing
  leapsmash: { file: OATH_DIR + 'ulric_leapsmash.png', frames: 6, ref: 5, target: 116 },
  // crouch, leap, top, falling, air wind-up x2, the air slash, follow-through (no standing
  // pose: painted at the Leap Smash's size, so it sizes from it)
  air:       { file: OATH_DIR + 'ulric_air.png', frames: 8, scaleFrom: 'leapsmash' },
  // the last stride, shoulder dropped, impact, driving through, the skid, ready
  shoulder:  { file: OATH_DIR + 'ulric_shoulder.png', frames: 6, ref: 5, target: 116 },
});

const seq = (strip, ids) => ids.map((i) => `${strip}:${i}`);

export const ANIM_OVERRIDES = {
  ulric: {
    // heavy, lumbering, determined: slower cadence + a planted bob (SpriteFighterView)
    // idle: his ready stance (the pose every attack strip starts and ends on, so no pop
    // going in or out of a swing) with smooth eased breathing on top (SpriteFighterView)
    idle: { needs: ['combo1'], frames: seq('combo1', [0]), fps: 1, loop: true, breathe: true },
    // Continuous, distance-driven march; use every drawing without duplicate holds.
    walk: { needs: ['walk2'], frames: seq('walk2', [0, 1, 2, 3, 4, 5, 6, 7]), fps: 11, loop: true, march: true },
    walkU: { needs: ['walkU'], frames: seq('walkU', [0, 1, 2, 3, 4, 5, 6, 7]), fps: 11, loop: true, march: true },
    walkD: { needs: ['walkD'], frames: seq('walkD', [0, 1, 2, 3, 4, 5, 6, 7]), fps: 11, loop: true, march: true },
    walkUD: { needs: ['walkUD'], frames: seq('walkUD', [0, 1, 2, 3, 4, 5, 6, 7, 8]), fps: 11, loop: true, march: true },
    walkDD: { needs: ['walkDD'], frames: seq('walkDD', [0, 1, 2, 3, 4, 5, 6, 7]), fps: 11, loop: true, march: true },
    sprint: { needs: ['sprint'], frames: seq('sprint', [0, 1, 2, 3, 4, 5, 6, 7]), fps: 16, loop: true },
    dodgeUp: { needs: ['rollUp'], frames: seq('rollUp', [0, 1, 2, 3, 4, 5]) },
    dodgeDown: { needs: ['rollDown'], frames: seq('rollDown', [0, 1, 2, 3, 4, 5]) },
    // SHOULDER SMASH (sprint + J): the last strides into the plant, flat out through the men
    // (the charge's own poses, at double speed under the lean the view adds), then planted
    // back on his heels into the ready stance. (A painted strip, ulric_shoulder.png, would
    // replace this: docs/rurik-art-prompts.md.)
    shoulder: { needs: ['sprint', 'kick', 'combo1'], phases: { startup: seq('sprint', [6, 7]), active: seq('sprint', [0, 1, 2, 3, 4, 5, 6, 7]), recovery: [...seq('kick', [4, 4]), ...seq('combo1', [0])] } },
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
    // impale — coil, drive it in at 18, lift (pose 8, ChatGPT 2026-10-25), heave him up
    //          at 32 and hold him there (legs dangling), knee up with him still on the
    //          blade at 70 (9), kick him off it at 78 (10) (IMPALE in combat/Finisher.js).
    //          Poses 4 and 5 (overhead, knee-up with the sword high) hang him out of reach.
    fin_impale: { needs: ['finImpale'], keys: [[0, 'finImpale:0'], [13, 'finImpale:1'], [18, 'finImpale:2'], [24, 'finImpale:8'], [32, 'finImpale:3'], [70, 'finImpale:9'], [78, 'finImpale:10'], [96, 'finImpale:7']] },
    fin_throat: { needs: ['finThroat'], keys: [[0, 'finThroat:0'], [4, 'finThroat:1'], [10, 'finThroat:2'], [24, 'finThroat:3'], [30, 'finThroat:4'], [52, 'finThroat:5'], [60, 'finThroat:6'], [68, 'finThroat:7']] },
    launcher: { needs: ['launcher'], phases: { startup: seq('launcher', [0, 1]), active: seq('launcher', [2, 3]), recovery: seq('launcher', [4]) } },
    // Kingsfire (SpriteFighterView): the startup poses spread over the gathering, the
    // drive and the buried blade on the release, wrenched free at the end
    kingsfire: { needs: ['wrath'], phases: { startup: seq('wrath', [0, 1, 2]), active: seq('wrath', [3, 4]), recovery: seq('wrath', [5]) } },
    // launch off the rear foot, arms and blade driven fully out and HELD, then pull back
    thrust: { needs: ['thrust'], phases: { startup: seq('thrust', [0, 1]), active: seq('thrust', [2, 3, 3, 3]), recovery: seq('thrust', [3, 3, 4, 5]) } },
  },
};
// With Oathkeeper: the same moves, plus his own poses for what still came off the old sheet
// (each only once its strip is in: `needs`)
ANIM_OVERRIDES.ulricOath = {
  ...ANIM_OVERRIDES.ulric,
  // Firebolt: wind-up (draw back, coil), then the throw and the follow-through (SpriteFighterView
  // 'cast': two wind-up frames, then the rest across the recovery)
  cast: { needs: ['cast'], frames: seq('cast', [1, 2, 3, 4, 5]) },
  jump: { needs: ['air'], rise: seq('air', [1]), fall: seq('air', [3]), crouch: seq('air', [0]), peak: seq('air', [2]) },
  airAttack: { needs: ['air'], phases: { startup: seq('air', [4, 5]), active: seq('air', [6]), recovery: seq('air', [7]) } },
  block: { needs: ['block'], frames: seq('block', [2]), fps: 1, loop: true, raise: seq('block', [1]), impact: seq('block', [3]) },
  hitstun: { needs: ['hurt'], frames: seq('hurt', [0, 1]), fps: 8, loop: false },
  knockdown: { needs: ['hurt'], air: seq('hurt', [2]), lying: seq('hurt', [3]) },
  getup: { needs: ['hurt'], frames: seq('hurt', [4, 5]), fps: 1, spread: true },
  // Leap Smash (SpriteFighterView 'plunge'): hang, drop, buried, wrenched out, standing
  plunge: { needs: ['leapsmash'], up: seq('leapsmash', [0, 1]), down: seq('leapsmash', [2]), buried: seq('leapsmash', [3, 4, 5]) },
  shoulder: { needs: ['shoulder'], phases: { startup: seq('shoulder', [0, 1]), active: seq('shoulder', [2, 3]), recovery: seq('shoulder', [4, 5]) } },
};

installRurikCombo(CHARACTER_STRIPS,ANIM_OVERRIDES);

// Effects strips: equal cells, trimmed and scaled to `height` px.
export const FX_STRIPS = {
  firebolt: { file: 'assets/fx/firebolt-strip.png', frames: 8, height: 44, fps: 14 },
  // Rurik's Hearthfire Bolt (Oathkeeper Wakes, view/ProjectileView.js): white-gold, half again
  // the Firebolt's size, on magenta
  hearthfire: { file: 'assets/fx/hearthfire-strip.png', frames: 8, height: 64, fps: 14, bg: 'magenta' },
  // a Kingsfire / King's Wrath pillar (effects/WrathFX.js): crack, burst, the column, smoke,
  // embers, on magenta
  kingsfire: { file: 'assets/fx/kingsfire-pillar-strip.png', frames: 8, height: 340, fps: 15, bg: 'magenta' },
  // the column of fire a floor grate throws up (view/StageView.js); drawn at half scale
  firepit: { file: 'assets/fx/firepit-strip.png', frames: 8, height: 300, fps: 16 },
  // a torch's flame, looping, on magenta (view/TorchFlame.js): every torch post, brazier and
  // small roof fire in the levels; until the file exists the old drawn flame stands in
  torchflame: { file: 'assets/fx/torch-flame-strip.png', frames: 8, height: 128, fps: 12, bg: 'magenta' },
  // fire running along a roof's ridge (view/RoofFire.js, the Burning Roofs): 8 wide, low bands
  // of flame on magenta, 2 across and 4 down, each one's foot on the same line (ChatGPT)
  rooffire: { file: 'assets/fx/rooffire-strip.png', frames: 8, columns: 2, rows: 4, height: 120, fps: 12, bg: 'magenta' },
  // the Mage's stone wall: 6 jagged slab variants on magenta (effects/MageFX.js); until
  // the file exists the slabs are drawn as rock shapes
  earthwall: { file: 'assets/fx/earthwall-strip.png', frames: 6, height: 260, bg: 'magenta' },
};

