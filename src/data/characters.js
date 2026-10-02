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
  // A floating war mage: staff fighting up close, lightning and force at range, a blink
  // instead of a roll, and arcane barriers that cut the battlefield in two. His kit
  // replaces buttons through `states` (fighterStates.js stateFor) and all of its tuning
  // lives in `kit` below — the logic is combat/Mage.js, the barriers combat/Barrier.js,
  // the look view/MageView.js, the magic effects/MageFX.js.
  mage: {
    id: 'mage',
    name: 'Vael the Elder',
    className: 'Mage',
    description: 'War sorcerer. Floats, blinks, chains lightning through crowds and splits the field with barriers. Frail up close.',
    archetype: 'mage', // (view, sounds and finishers pick his own versions by this)
    body: { w: 40, h: 96 },
    look: { color: 0x1c2550, accent: 0x6a4a2a, skin: 0xd8b494 },
    // the buttons his kit replaces: dodge = BLINK, heavy = CHAIN LIGHTNING,
    // kick = FORCE BLAST, magic = ARCANE BARRIER (tap fire, hold earth)
    states: { dodge: 'blink', heavy: 'bolt', kick: 'force', cast: 'ward' },

    maxHealth: 110, maxStamina: 90, maxMana: 120,
    staminaRegen: 30, staminaRegenDelay: 36, manaRegen: 7,
    walkSpeed: 172, depthSpeed: 122,
    // no jump: a levitation rise (lower launch, softer pull = slower up and down)
    jumpStrength: 470, gravity: 1250, airControl: 0.16, airJumps: 0,
    meleeMult: 0.85, magicMult: 1.0,
    blockReduction: 0.72, guardEfficiency: 1.15,
    // the blink's timing (the dodge numbers the rest of the game reads): invulnerable for
    // `iframes`, gone for duration, then `recovery`
    dodge: { iframes: 12, duration: 10, recovery: 8, speed: 0, cost: 14 },
    rollCancel: true, // a blink cuts any staff swing short
    parryWindow: 6, parryWhiffRecovery: 16,
    knockdownFrames: 40, getupFrames: 26, staggerFrames: 50,

    hover: { height: 12, drift: 2.4, driftRate: 0.05 }, // view only: he floats above his feet

    moves: {
      // the staff, as a real weapon: two-handed, long reach, blunt
      light1: { // fast horizontal strike
        cut: 'blunt', fx: 'staff',
        startup: 5, active: 3, recovery: 11,
        damage: 8, hitstun: 22, hitstop: 5, shake: 1,
        knockback: { x: 110, y: 0 }, guardDamage: 9, lunge: 60,
        hitbox: { x: 6, y: 34, w: 84, h: 44 },
        chains: [
          { button: 'attack', next: 'light2', from: 6, to: 19 },
          { button: 'heavy', next: 'heavy', from: 9, to: 19 },
        ],
        cancels: [{ from: 9, to: 19, into: ['dodge', 'block', 'kick', 'magic'] }],
      },
      light2: { // reverse sweep
        cut: 'blunt', fx: 'staff',
        startup: 5, active: 3, recovery: 12,
        damage: 9, hitstun: 22, hitstop: 6, shake: 2,
        knockback: { x: 130, y: 0 }, guardDamage: 10, lunge: 60,
        hitbox: { x: 6, y: 26, w: 86, h: 52 },
        chains: [
          { button: 'attack', next: 'light3', from: 6, to: 20 },
          { button: 'heavy', next: 'heavy', from: 9, to: 20 },
        ],
        cancels: [{ from: 9, to: 20, into: ['dodge', 'block', 'kick', 'magic'] }],
      },
      light3: { // spinning slam that lets out a small pressure pulse
        cut: 'blunt', fx: 'pulse',
        startup: 10, active: 4, recovery: 20,
        damage: 15, hitstun: 26, hitstop: 9, shake: 5,
        knockback: { x: 300, y: 300 }, knockdown: true, guardDamage: 20, lunge: 90,
        hitbox: { x: 0, y: 0, w: 100, h: 70, depth: 30 },
        cancels: [{ from: 16, to: 34, into: ['dodge', 'kick', 'magic'] }],
      },
      // CHAIN LIGHTNING (the 'bolt' state). The frame data of the cast; the bolt itself
      // is `kit.bolt`.
      heavy: {
        cut: 'fire', fx: 'lightning', noBlood: true,
        startup: 13, active: 1, recovery: 22,
        damage: 0, hitstun: 30, hitstop: 8, shake: 4,
        knockback: { x: 160, y: 0 }, guardDamage: 26, staminaCost: 0, manaCost: 12, lunge: 0,
        hitbox: { x: 0, y: 0, w: 0, h: 0 },
        cancels: [{ from: 1, to: 8, into: ['dodge', 'block'] }, { from: 26, to: 36, into: ['dodge'] }],
      },
      // FORCE BLAST (the 'force' state); the blast itself is `kit.force`
      kick: {
        cut: 'crush', fx: 'force', noBlood: true,
        startup: 10, active: 1, recovery: 20,
        damage: 0, hitstun: 30, hitstop: 7, shake: 6,
        knockback: { x: 0, y: 0 }, guardDamage: 60, lunge: 0,
        hitbox: { x: 0, y: 0, w: 0, h: 0 },
        cancels: [{ from: 18, to: 31, into: ['dodge', 'attack', 'block'] }],
      },
      air: { // a downward staff chop out of the levitation
        cut: 'blunt', fx: 'staff',
        startup: 4, active: 12, recovery: 0,
        damage: 9, hitstun: 20, hitstop: 5, shake: 1,
        knockback: { x: 130, y: 0 }, guardDamage: 9,
        hitbox: { x: 0, y: -10, w: 70, h: 60 },
      },
    },

    // magic = the barrier (`kit.barrier`); this only gates the button
    spell: { name: 'Arcane Barrier', cost: 40, startup: 0, recovery: 0 },

    kit: {
      // CHAIN LIGHTNING — hold heavy for the overcharge
      bolt: {
        range: 380, depth: 40,       // how far ahead the first strike reaches
        damage: 20, chainDamage: 14, // first target / each jump
        falloff: 0.85,               // each generation of jumps x this
        radius: 150,                 // how far a jump can reach from the last body
        touch: 14,                   // gap that counts as "touching" (jumps there first)
        close: 60,                   // "extremely close"
        maxJumps: 4, branches: 2,    // total jumps; a body can fork into this many
        jumpFrames: 3,               // frames between one generation of jumps and the next
                                     // (mana: moves.heavy.manaCost)
        hitstun: 30, knockback: 150,
        charge: {                    // overcharge: heavy still held when the cast is ready
          maxFrames: 36,             // longest it can be held
          fullFrames: 28,            // held this long = fully charged
          damage: 1.6, jumps: 3, branches: 3, knockdown: true,
        },
      },
      // FORCE BLAST — the cone of invisible force
      force: {
        damage: 10, radius: 190, angle: 70,  // degrees, full cone width
        knockback: 640, lift: 260,           // launch speed of a normal man
        heavyHealth: 160,                    // max health from which a man only staggers
        staggerFrames: 34, heavyKnockback: 260,
        cooldown: 75,                        // frames before it can be used again
      },
      // BLINK — teleport in place of the roll
      blink: {
        distance: 210,   // px in the input direction (the roll covered ~230)
        vanishAt: 3,     // frame the body is gone (the sparks have taken it)
        arriveAt: 5,     // frame he re-forms at the far end
        actFrom: 9,      // frame attacks may cut in
        cooldown: 0,     // optional extra lockout (frames) after a blink
      },
      // ARCANE BARRIERS — tap magic = INFERNAL WALL, hold = EARTHEN BULWARK
      barrier: {
        holdFrames: 14,  // magic held this long = earth
        castAt: 12,      // frames after choosing until it erupts
        recovery: 16,
        cooldown: 420,   // frames (7 s) before another barrier
        distance: 150,   // px ahead of him
        edgeMargin: 70,  // never closer than this to the stage's ends
        clearance: 26,   // a man on the line is pushed this far to the nearer side
        collapse: 30,    // frames the wall takes to come down (no collision while it does)
        fire: { duration: 300, thickness: 34, damage: 7, tickRate: 18, knockback: 220, heat: 0.3 },
        earth: { duration: 600, thickness: 46, hp: 180 }, // hp: strong enemies can batter it down (0 = timed only)
      },
      // FINISHERS on runners (combat/Mage.js MAGE_FINISHERS)
      finisher: { reach: 230, depth: 40 },
    },
  },

  // =========================================================== ROGUE
  // The fastest hero: four-hit dagger combo, Viper Strike lunge, the best dodge (with a
  // perfect-dodge SHADOW WINDOW), EXPOSED (her precision hits open an enemy up to the
  // whole team), WIDOW MINES, ALLY VAULT off a teammate, and from the air the SHURIKEN
  // FAN / DEATH FROM ABOVE and the FALLING VIPER dive. Logic: combat/Rogue.js and
  // combat/Mine.js; tuning: `kit` below.
  rogue: {
    id: 'rogue',
    name: 'Rogue',
    className: 'Rogue',
    description: 'The fastest killer alive. Slips every blow, mines the field, vaults off allies and rains steel from above. Light armour.',
    archetype: 'rogue',
    body: { w: 36, h: 92 },
    look: { color: 0x4a2a5e, accent: 0xb0b8c0, skin: 0xd2a07a },
    // the buttons her kit replaces (fighterStates.js stateFor):
    //   heavy = VIPER STRIKE, kick = crescent kick / knife throw at range / sweep (down),
    //   magic = WIDOW MINE (dropped on the move), in the air: magic = SHURIKEN FAN,
    //   heavy = FALLING VIPER; jump at a teammate = ALLY VAULT
    states: { heavy: 'viper', kick: 'rkick', cast: 'mine', airMagic: 'fan', airHeavy: 'dive' },

    maxHealth: 105, maxStamina: 110, maxMana: 60,
    staminaRegen: 42, staminaRegenDelay: 26, manaRegen: 3,
    walkSpeed: 235, depthSpeed: 165,
    jumpStrength: 620, gravity: 1700, airControl: 0.16, airJumps: 1,
    meleeMult: 0.9, magicMult: 1.0,
    blockReduction: 0.62, guardEfficiency: 1.4, // a light guard: heavy blows break it fast
    // the best dodge in the game: long, quick, invulnerable for most of it
    dodge: { iframes: 17, duration: 20, recovery: 4, speed: 980, cost: 10 },
    rollCancel: true,
    parryWindow: 7, parryWhiffRecovery: 12,
    knockdownFrames: 26, getupFrames: 12, staggerFrames: 42, // springs straight back up

    moves: {
      light1: { // fast diagonal slash, lead dagger
        cut: 'slash', fx: 'dagger',
        startup: 3, active: 2, recovery: 9,
        damage: 6, hitstun: 18, hitstop: 3, shake: 0,
        knockback: { x: 50, y: 0 }, guardDamage: 6, lunge: 80,
        hitbox: { x: 8, y: 36, w: 56, h: 40 },
        chains: [{ button: 'attack', next: 'light2', from: 4, to: 14 }, { button: 'heavy', next: 'heavy', from: 5, to: 14 }],
        cancels: [{ from: 5, to: 14, into: ['dodge', 'block', 'kick', 'jump', 'magic'] }],
      },
      light2: { // reverse slash, rear dagger
        cut: 'slash', fx: 'dagger',
        startup: 3, active: 2, recovery: 9,
        damage: 6, hitstun: 18, hitstop: 3, shake: 0,
        knockback: { x: 60, y: 0 }, guardDamage: 6, lunge: 80,
        hitbox: { x: 8, y: 30, w: 58, h: 44 },
        chains: [{ button: 'attack', next: 'light3', from: 4, to: 14 }, { button: 'heavy', next: 'heavy', from: 5, to: 14 }],
        cancels: [{ from: 5, to: 14, into: ['dodge', 'block', 'kick', 'jump', 'magic'] }],
      },
      light3: { // spinning double-blade cross, stepping through
        cut: 'slash', fx: 'dagger',
        startup: 4, active: 3, recovery: 10,
        damage: 8, hitstun: 20, hitstop: 4, shake: 1,
        knockback: { x: 80, y: 0 }, guardDamage: 8, lunge: 150,
        hitbox: { x: 0, y: 28, w: 66, h: 50 },
        chains: [{ button: 'attack', next: 'light4', from: 5, to: 17 }, { button: 'heavy', next: 'heavy', from: 6, to: 17 }],
        cancels: [{ from: 6, to: 17, into: ['dodge', 'block', 'kick', 'jump', 'magic'] }],
      },
      light4: { // drop low, rotate, explode upward: rising double-dagger strike
        cut: 'slash', fx: 'dagger', expose: true,
        startup: 7, active: 3, recovery: 16,
        damage: 14, hitstun: 26, hitstop: 8, shake: 4,
        knockback: { x: 180, y: 360 }, knockdown: true, guardDamage: 18, lunge: 120,
        hitbox: { x: 4, y: 20, w: 64, h: 74 },
        cancels: [{ from: 11, to: 26, into: ['dodge', 'jump', 'magic'] }],
      },
      // VIPER STRIKE (the 'viper' state): crouch, burst through, strike in passing
      heavy: {
        cut: 'slash', fx: 'viper', expose: true, pierce: true,
        startup: 5, active: 9, recovery: 12,
        damage: 18, hitstun: 30, hitstop: 6, shake: 3,
        knockback: { x: 120, y: 0 }, guardDamage: 26, breaksGuard: true, staminaCost: 10,
        lunge: 1150,                     // px/s through the active frames (~170 px)
        hitbox: { x: -10, y: 26, w: 70, h: 52 },
        cancels: [{ from: 1, to: 4, into: ['dodge'] }, { from: 18, to: 26, into: ['dodge', 'jump', 'attack'] }],
      },
      // crescent heel kick: fast, interrupts, moderate push (the 'rkick' state picks it)
      kick: {
        cut: 'blunt', fx: 'rkick',
        startup: 5, active: 4, recovery: 12,
        damage: 6, hitstun: 26, hitstop: 5, shake: 2,
        knockback: { x: 260, y: 0 }, guardDamage: 30, lunge: 90,
        hitbox: { x: 6, y: 50, w: 64, h: 40 },
        cancels: [{ from: 9, to: 21, into: ['dodge', 'attack', 'jump', 'magic'] }],
      },
      sweep: { // down + kick: a low spinning sweep that takes the legs
        cut: 'blunt', fx: 'rkick',
        startup: 6, active: 4, recovery: 14,
        damage: 5, hitstun: 24, hitstop: 5, shake: 2,
        knockback: { x: 90, y: 200 }, knockdown: true, guardDamage: 20, lunge: 60,
        hitbox: { x: 0, y: 0, w: 70, h: 26 },
        cancels: [{ from: 10, to: 24, into: ['dodge', 'attack', 'jump'] }],
      },
      air: {
        cut: 'slash', fx: 'dagger',
        startup: 3, active: 12, recovery: 0,
        damage: 7, hitstun: 18, hitstop: 3, shake: 0,
        knockback: { x: 110, y: 0 }, guardDamage: 6,
        hitbox: { x: 0, y: 0, w: 56, h: 48 },
      },
      // FALLING VIPER (the 'dive' state): the hitbox rides the dive
      dive: {
        cut: 'pierce', fx: 'dive', expose: true,
        startup: 0, active: 60, recovery: 0,
        damage: 22, hitstun: 34, hitstop: 8, shake: 5,
        knockback: { x: 60, y: 0 }, guardDamage: 30, breaksGuard: true,
        hitbox: { x: -6, y: -30, w: 60, h: 90, depth: 28 },
      },
    },

    // magic gates the Widow Mine (the mine's own limits are kit.mine)
    spell: { name: 'Widow Mine', cost: 0, startup: 0, recovery: 0 },

    kit: {
      // EXPOSED: her precision hits open a weakness the whole team can exploit
      expose: {
        duration: 300,      // frames (5 s)
        bonus: 0.25,        // +25% damage from ALL players while exposed
        refresh: true,      // a new trigger restarts the timer (it never stacks)
        cooldown: 0,        // frames before the same enemy can be exposed again after it ends
        minHealth: 0,       // only enemies with at least this much max health (0 = any)
        bosses: true,       // bosses can be exposed
      },
      // SHADOW WINDOW: a dodge that slips a blow in its first frames
      shadow: { window: 9, counter: 45 }, // perfect-dodge frames; frames after the dodge to answer it (Exposed on the hit)
      // VIPER STRIKE through a crowd
      viper: { maxTargets: 3 },
      // KNIFE (kick with nobody in reach)
      knife: {
        kickReach: 90,      // an enemy this close ahead gets kicked instead
        range: 420, cooldown: 40,
        startup: 6, recovery: 10,
        projectile: {
          cut: 'pierce', look: 'knife', fx: 'knife',
          count: 1, speed: 900, lifetime: 34, y: 58, w: 18, h: 8,
          damage: 7, hitstun: 22, hitstop: 3, shake: 0,
          knockback: { x: 60, y: 0 }, guardDamage: 6, pierce: false, color: 0xd8dde4,
        },
      },
      // WIDOW MINE
      mine: {
        maxActive: 2,       // a third one replaces the oldest
        cooldown: 75,       // frames between drops
        arm: 26,            // frames until it's live
        life: 900,          // frames it waits (15 s) before it fizzles
        trigger: 44,        // enemy this close (px) sets it off...
        cue: 8,             // ...after this many frames of warning
        inner: 45, outer: 135, // full damage inside `inner`, falling to `falloff` at `outer`
        damage: 46, falloff: 0.3,
        launch: 640, lift: 380,
        heavyHealth: 160, heavyLaunch: 0.4, // brutes are thrown this much as far
        boss: 0.5,          // bosses take this share of damage and barely move
        hitCooldown: 30,    // frames before another blast can hurt the same man (no stacking)
      },
      // ALLY VAULT
      vault: {
        range: 80, depth: 30,  // how close the teammate must be
        approach: 0.4,         // she must be moving toward them at least this fast (share of run speed)
        plant: 6,              // frames on the shoulder
        launch: 960,           // upward speed (a normal jump is jumpStrength)
        forward: 260,          // carried on over the ally
        cooldown: 50,          // frames before the same teammate can be vaulted again
        apex: 14,              // frames either side of the top of a vault that count as "the apex"
      },
      // SHURIKEN FAN / DEATH FROM ABOVE
      fan: {
        count: 5, dfaCount: 10, spread: 70, dfaSpread: 150,
        range: 300, startup: 4, recovery: 10, hang: 0.35, cooldown: 30,
        projectile: {
          cut: 'pierce', look: 'shuriken', fx: 'shuriken',
          count: 1, speed: 760, lifetime: 50, y: 0, w: 14, h: 14,
          damage: 6, hitstun: 20, hitstop: 2, shake: 0,
          knockback: { x: 50, y: 0 }, guardDamage: 6, pierce: false, color: 0xcfd8e0,
        },
      },
      // FALLING VIPER
      dive: { minHeight: 60, range: 260, depth: 70, speed: 820, land: 14, stagger: 60, staggerFrames: 18 },
      finisher: { reach: 160, depth: 34 },
    },
  },
};
