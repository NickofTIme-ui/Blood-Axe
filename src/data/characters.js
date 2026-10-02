// characters.js — ALL playable character stats and move frame data live here.
// Tweak numbers freely; to add a character, copy a block and give it a new id.
//
// ---------------------------------------------------------------------------
// STAT GUIDE
//   maxHealth / maxStamina / maxMana     meter sizes
//   staminaRegen, manaRegen              points per second
//   staminaRegenDelay                    frames after spending stamina before regen resumes
//   walkSpeed / depthSpeed               px per second (left-right / up-down on the floor)
//   jumpStrength, gravity                px/s launch speed and px/s² pull
//   airControl                           0..1, how quickly you can steer in the air
//   airJumps                             extra jumps in mid-air (1 = double jump)
//   meleeMult / magicMult                damage multipliers
//   blockReduction                       0..1, share of damage blocked (0.8 = take 20%)
//   guardEfficiency                      multiplies stamina lost when blocking (lower = better)
//   dodge { iframes, duration, recovery, speed, cost }
//   parryWindow                          frames at the start of a block that count as a parry
//   parryWhiffRecovery                   frames stuck if you tap block and nothing hits you
//   knockdownFrames / getupFrames / staggerFrames
//   body { w, h }                        size of the hurtbox (and placeholder art)
//   look { color, accent, skin }         placeholder art colours only
//   sprite                               optional sprite sheet key from data/sprites.js
//
// MOVE GUIDE (all timings in frames, 60 per second)
//   cut                                  how a kill with it tears enemies apart (see combat/Fatality.js):
//                                        slash, cleave, chop, pierce, blunt, fire, crush
//   startup / active / recovery          see combat/MoveRunner.js
//   damage, hitstun                      damage dealt, frames the victim is stunned
//   hitstop                              freeze frames on impact (bigger = heavier feel)
//   shake                                screen shake strength in px (0 = none)
//   knockback { x, y }                   push speed; y > 0 launches the victim (with knockdown)
//   knockdown                            true = victim is knocked off their feet
//   breaksGuard                          true = instantly breaks a block
//   guardDamage                          stamina a blocker loses
//   staminaCost                          stamina needed to start the move
//   lunge                                forward speed during startup+active
//   hitbox { x, y, w, h, depth? }        relative to feet, facing right (see combat/Boxes.js)
//   chains  [{ button, next, from, to }] press `button` between frames from..to to go to `next`
//   cancels [{ from, to, into: [...] }]  actions allowed to interrupt the move during from..to
// ---------------------------------------------------------------------------

// The forward Sparta kick (Right Trigger / O). Breaks any guard or shield, launches the
// victim, and sends them BOWLING into anyone behind them (`bowl`).
export const SPARTA_KICK = {
  cut: 'blunt', fx: 'kick', bowl: true,
  startup: 10, active: 5, recovery: 20,
  damage: 8, hitstun: 30, hitstop: 12, shake: 8,
  knockback: { x: 660, y: 220 }, knockdown: true, breaksGuard: true,
  guardDamage: 80,
  recoil: 70,   // rocks back onto the back leg during the chamber...
  lunge: 420,   // ...then drives the whole body forward behind the heel
  hitbox: { x: 14, y: 26, w: 60, h: 56 },
  cancels: [{ from: 16, to: 32, into: ['dodge', 'block', 'attack'] }],
};

export const CHARACTERS = {
  // =========================================================== WARRIOR
  warrior: {
    id: 'warrior',
    name: 'Ulric Varr',
    className: 'Warrior',
    description: 'The Ashen Oath. Slow, tanky, brutal heavy attacks. Weak magic.',
    sprite: 'ulric',          // pixel-art sheet (see data/sprites.js); remove to use placeholder shapes
    body: { w: 46, h: 108 },
    look: { color: 0x8a3b2e, accent: 0xc8c8c8, skin: 0xd8a57c },

    maxHealth: 170, maxStamina: 100, maxMana: 40,
    staminaRegen: 30, staminaRegenDelay: 40, manaRegen: 1.5,
    walkSpeed: 165, depthSpeed: 115,
    jumpStrength: 550, gravity: 1700, airControl: 0.08, airJumps: 0,
    meleeMult: 1.3, magicMult: 0.7,
    blockReduction: 0.85, guardEfficiency: 0.8,
    dodge: { iframes: 11, duration: 18, recovery: 9, speed: 785, cost: 16 },
    rollCancel: true, // a roll cancels any sword swing at any point (fighterStates.js)
    parryWindow: 6, parryWhiffRecovery: 16,
    knockdownFrames: 42, getupFrames: 18, staggerFrames: 48,

    moves: {
      // smear: the swoosh drawn along the blade's path (view/Smear.js).
      //   arc [from, to] in degrees (0 = straight ahead, 90 = straight down, -90 = straight up),
      //   r = radius, cx/cy = pivot relative to his feet, w = thickness
      light1: { // 1st tap: clean cross slash, high-front down and across to the back hip
        cut: 'slash',
        startup: 5, active: 3, recovery: 12,
        damage: 9, hitstun: 22, hitstop: 5, shake: 1,
        knockback: { x: 90, y: 0 }, guardDamage: 10, lunge: 70,
        hitbox: { x: 4, y: 24, w: 80, h: 64 },
        smear: { arc: [-80, 150], r: 72, cx: 6, cy: 70, w: 30 },
        chains: [
          { button: 'attack', next: 'light2', from: 6, to: 20 },
          { button: 'heavy', next: 'heavy', from: 9, to: 20 },
        ],
        cancels: [{ from: 9, to: 20, into: ['dodge', 'block', 'kick'] }],
      },
      light2: { // 2nd tap: the return — back up and across to the right
        cut: 'slash',
        startup: 5, active: 3, recovery: 13,
        damage: 10, hitstun: 22, hitstop: 6, shake: 2,
        knockback: { x: 110, y: 0 }, guardDamage: 10, lunge: 70,
        hitbox: { x: 4, y: 30, w: 84, h: 60 },
        smear: { arc: [155, -40], r: 74, cx: 6, cy: 70, w: 30 },
        chains: [
          { button: 'attack', next: 'light3', from: 6, to: 21 },
          { button: 'heavy', next: 'heavy', from: 9, to: 21 },
        ],
        cancels: [{ from: 9, to: 21, into: ['dodge', 'block', 'kick'] }],
      },
      light3: { // 3rd tap: overhand — over the top and down, knocks them flat
        cut: 'chop',
        startup: 8, active: 4, recovery: 22,
        damage: 18, hitstun: 26, hitstop: 10, shake: 6,
        knockback: { x: 300, y: 320 }, knockdown: true, guardDamage: 22, lunge: 110,
        hitbox: { x: 6, y: 10, w: 82, h: 84 },
        smear: { arc: [-155, 75], r: 80, cx: 6, cy: 70, w: 36 },
        cancels: [{ from: 15, to: 38, into: ['dodge', 'kick'] }],
      },
      heavy: { // brutal downward cleave
        cut: 'chop',
        startup: 17, active: 4, recovery: 26,
        damage: 30, hitstun: 30, hitstop: 14, shake: 10,
        knockback: { x: 360, y: 380 }, knockdown: true, breaksGuard: true,
        guardDamage: 40, staminaCost: 12, lunge: 130,
        hitbox: { x: 4, y: 0, w: 92, h: 100 },
        smear: { arc: [-120, 100], r: 88, cx: 10, cy: 70, w: 40, heavy: true },
        fx: 'quake',
        cancels: [
          { from: 1, to: 9, into: ['dodge', 'block'] },   // feint out of the wind-up
          { from: 27, to: 48, into: ['dodge'] },
        ],
      },
      kick: { ...SPARTA_KICK },
      air: {
        cut: 'chop',
        startup: 4, active: 14, recovery: 0,
        damage: 12, hitstun: 20, hitstop: 5, shake: 1,
        knockback: { x: 140, y: 0 }, guardDamage: 10,
        hitbox: { x: 0, y: 0, w: 64, h: 50 },
        smear: { arc: [-120, 110], r: 76, cx: 8, cy: 60, w: 34, heavy: true },
      },
      // HOLD attack: two-handed charge, then release into the impaling power thrust.
      // Numbers are for a FULL charge; a partial charge scales damage/reach down (see
      // fighterStates.js 'charge'/'thrust'). The hitbox grows forward over the active
      // frames like the blade driving out, and `pierce` lets it run through a whole line.
      thrust: {
        cut: 'pierce', impale: true, pierce: true,
        startup: 4, active: 8, recovery: 20,
        damage: 28, hitstun: 32, hitstop: 12, shake: 6,
        knockback: { x: 170, y: 0 }, guardDamage: 40, breaksGuard: true,
        lunge: 240,
        hitbox: { x: 12, y: 42, w: 150, h: 30, depth: 16, grow: 0.35 },
      },
    },
    // Hold-to-charge tuning (warrior only)
    charge: {
      holdFrames: 14,   // attack held this long (~0.23 s, through the tap slash) = charge
      fullFrames: 30,   // frames to full power (0.5 s)
      minLevel: 0.4,    // an early release still thrusts, at this much power
    },

    spell: {
      name: 'Firebolt', cost: 30, startup: 14, recovery: 20,
      cancels: [{ from: 20, to: 34, into: ['dodge'] }],
      projectile: {
        cut: 'fire', look: 'firebolt',
        count: 1, speed: 620, lifetime: 70, y: 52, w: 46, h: 28,
        damage: 24, hitstun: 26, hitstop: 9, shake: 5,
        knockback: { x: 300, y: 300 }, knockdown: true, guardDamage: 35,
        pierce: false, color: 0xff6a1a,
      },
    },
  },

  // =========================================================== MAGE
  mage: {
    id: 'mage',
    name: 'Mage',
    description: 'Fragile, weak melee. Devastating spells and a deep mana pool.',
    body: { w: 40, h: 92 },
    look: { color: 0x3b3f8a, accent: 0x8b5a2b, skin: 0xe0bf9c },

    maxHealth: 95, maxStamina: 80, maxMana: 120,
    staminaRegen: 26, staminaRegenDelay: 40, manaRegen: 8,
    walkSpeed: 165, depthSpeed: 115,
    jumpStrength: 540, gravity: 1700, airControl: 0.1, airJumps: 0,
    meleeMult: 0.7, magicMult: 1.6,
    blockReduction: 0.7, guardEfficiency: 1.2,
    dodge: { iframes: 12, duration: 18, recovery: 10, speed: 758, cost: 14 },
    rollCancel: true,
    parryWindow: 5, parryWhiffRecovery: 16,
    knockdownFrames: 42, getupFrames: 18, staggerFrames: 48,

    moves: {
      light1: {
        cut: 'blunt',
        startup: 6, active: 3, recovery: 12,
        damage: 7, hitstun: 22, hitstop: 4, shake: 0,
        knockback: { x: 60, y: 0 }, guardDamage: 8, lunge: 40,
        hitbox: { x: 8, y: 40, w: 56, h: 30 },
        chains: [
          { button: 'attack', next: 'light2', from: 7, to: 21 },
          { button: 'heavy', next: 'heavy', from: 10, to: 21 },
        ],
        cancels: [{ from: 10, to: 21, into: ['dodge', 'block', 'magic'] }],
      },
      light2: {
        cut: 'blunt',
        startup: 6, active: 3, recovery: 13,
        damage: 7, hitstun: 22, hitstop: 4, shake: 0,
        knockback: { x: 70, y: 0 }, guardDamage: 8, lunge: 40,
        hitbox: { x: 8, y: 30, w: 58, h: 36 },
        chains: [{ button: 'attack', next: 'light3', from: 7, to: 22 }],
        cancels: [{ from: 10, to: 22, into: ['dodge', 'block', 'magic'] }],
      },
      light3: {
        cut: 'blunt',
        startup: 9, active: 4, recovery: 22,
        damage: 11, hitstun: 24, hitstop: 6, shake: 2,
        knockback: { x: 240, y: 260 }, knockdown: true, guardDamage: 14, lunge: 80,
        hitbox: { x: 6, y: 25, w: 62, h: 50 },
        cancels: [{ from: 14, to: 35, into: ['dodge', 'magic'] }],
      },
      heavy: {
        cut: 'blunt',
        startup: 20, active: 4, recovery: 24,
        damage: 18, hitstun: 28, hitstop: 9, shake: 5,
        knockback: { x: 300, y: 300 }, knockdown: true, breaksGuard: true,
        guardDamage: 30, staminaCost: 11, lunge: 60,
        hitbox: { x: 4, y: 20, w: 76, h: 60 },
        cancels: [{ from: 1, to: 10, into: ['dodge', 'block'] }],
      },
      kick: { ...SPARTA_KICK },
      air: {
        cut: 'blunt',
        startup: 5, active: 12, recovery: 0,
        damage: 8, hitstun: 18, hitstop: 4, shake: 0,
        knockback: { x: 120, y: 0 }, guardDamage: 8,
        hitbox: { x: 0, y: 0, w: 56, h: 46 },
      },
    },

    spell: {
      name: 'Fireball', cost: 25, startup: 12, recovery: 16,
      cancels: [{ from: 17, to: 28, into: ['dodge'] }],
      projectile: {
        cut: 'fire',
        count: 1, speed: 560, lifetime: 70, y: 44, w: 26, h: 26,
        damage: 22, hitstun: 24, hitstop: 7, shake: 4,
        knockback: { x: 240, y: 280 }, knockdown: true, guardDamage: 25,
        pierce: false, color: 0xff7a1a,
      },
    },
  },

  // =========================================================== ROGUE
  rogue: {
    id: 'rogue',
    name: 'Rogue',
    description: 'Fast and slippery. Double jump, long dodge i-frames, cheap stamina.',
    body: { w: 38, h: 90 },
    look: { color: 0x3d3d3d, accent: 0xb0b8c0, skin: 0xc99a74 },

    maxHealth: 115, maxStamina: 110, maxMana: 60,
    staminaRegen: 40, staminaRegenDelay: 30, manaRegen: 3,
    walkSpeed: 215, depthSpeed: 150,
    jumpStrength: 580, gravity: 1700, airControl: 0.14, airJumps: 1,
    meleeMult: 0.85, magicMult: 1.0,
    blockReduction: 0.75, guardEfficiency: 1.0,
    dodge: { iframes: 18, duration: 18, recovery: 5, speed: 918, cost: 8 },
    rollCancel: true,
    parryWindow: 8, parryWhiffRecovery: 12,
    knockdownFrames: 38, getupFrames: 14, staggerFrames: 44,

    moves: {
      light1: {
        cut: 'slash',
        startup: 4, active: 2, recovery: 10,
        damage: 6, hitstun: 20, hitstop: 3, shake: 0,
        knockback: { x: 50, y: 0 }, guardDamage: 6, lunge: 60,
        hitbox: { x: 8, y: 40, w: 50, h: 30 },
        chains: [
          { button: 'attack', next: 'light2', from: 5, to: 16 },
          { button: 'heavy', next: 'heavy', from: 7, to: 16 },
        ],
        cancels: [{ from: 6, to: 16, into: ['dodge', 'block', 'jump'] }],
      },
      light2: {
        cut: 'slash',
        startup: 4, active: 2, recovery: 10,
        damage: 6, hitstun: 20, hitstop: 3, shake: 0,
        knockback: { x: 60, y: 0 }, guardDamage: 6, lunge: 60,
        hitbox: { x: 8, y: 30, w: 52, h: 36 },
        chains: [
          { button: 'attack', next: 'light3', from: 5, to: 16 },
          { button: 'heavy', next: 'heavy', from: 7, to: 16 },
        ],
        cancels: [{ from: 6, to: 16, into: ['dodge', 'block', 'jump'] }],
      },
      light3: {
        cut: 'slash',
        startup: 6, active: 3, recovery: 18,
        damage: 11, hitstun: 24, hitstop: 6, shake: 2,
        knockback: { x: 240, y: 300 }, knockdown: true, guardDamage: 12, lunge: 140,
        hitbox: { x: 6, y: 25, w: 60, h: 50 },
        cancels: [{ from: 9, to: 27, into: ['dodge', 'jump'] }],
      },
      heavy: {
        cut: 'slash',
        startup: 13, active: 3, recovery: 20,
        damage: 20, hitstun: 28, hitstop: 9, shake: 4,
        knockback: { x: 300, y: 300 }, knockdown: true, breaksGuard: true,
        guardDamage: 28, staminaCost: 7, lunge: 160,
        hitbox: { x: 4, y: 25, w: 70, h: 55 },
        cancels: [
          { from: 1, to: 7, into: ['dodge', 'block'] },
          { from: 17, to: 36, into: ['dodge', 'jump'] },
        ],
      },
      kick: { ...SPARTA_KICK },
      air: {
        cut: 'slash',
        startup: 3, active: 12, recovery: 0,
        damage: 8, hitstun: 18, hitstop: 4, shake: 0,
        knockback: { x: 120, y: 0 }, guardDamage: 6,
        hitbox: { x: 0, y: 0, w: 56, h: 46 },
      },
    },

    spell: {
      name: 'Fan of Knives', cost: 20, startup: 8, recovery: 12,
      cancels: [{ from: 10, to: 20, into: ['dodge', 'jump'] }],
      projectile: {
        cut: 'pierce',
        count: 3, spreadZ: 22, speed: 760, lifetime: 40, y: 50, w: 22, h: 8,
        damage: 7, hitstun: 18, hitstop: 3, shake: 0,
        knockback: { x: 80, y: 0 }, guardDamage: 8,
        pierce: false, color: 0xcfd8e0,
      },
    },
  },
};
