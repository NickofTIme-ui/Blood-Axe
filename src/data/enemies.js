// enemies.js â€” Enemy stats, moves and AI tuning. Same stat format as characters.js
// (see the guide at the top of that file), plus:
//
//   art              which pixel-art rig draws it (view/enemyArt.js)
//   title            flavour line shown under the name when it spawns
//
// EXTRA MOVE FIELDS (enemies only)
//   anim             pose set used by view/EnemyView.js: slash, backslash, chop, stab, stabB,
//                    thrust, uppercut, swingChain, slamChain, spin, hook, bash, charge
//   superArmor       true = hits don't interrupt this move during startup/active
//   needs            'armB' / 'armF' â€” move is unusable once that arm has been cut off
//   chain            true = the weapon is on a chain; the view flings it out to the hitbox
//   fx               'quake' = dust + shake when the move's active frames begin
//   special1         an extra move the AI can press (players have no button for it)
//
// AI GUIDE
//   attackRange     distance (px) at which it starts swinging
//   minRange        backs off if closer than this
//   alignZ          how closely it lines up in depth before attacking
//   waitRange       distance it hangs back at when others are already crowding you
//   maxCrowd        how many enemies may crowd the player before others wait
//   threatRange     distance at which it notices your attacks (to maybe block)
//   attackCooldown  [min, max] frames between attack decisions
//   heavyChance / comboChance / blockChance   0..1 probabilities
//   comboLength     extra chained hits when it decides to combo (1 = 2-hit, 2 = 3-hit)
//   blockHold       [min, max] frames it keeps blocking
//   specials        [{ press, min, max, chance }] rolled every `specialEvery` frames when
//                   the player is between min..max px away (e.g. hook from range, charge)

// Shared physics for all humanoid enemies.
const BASE = {
  maxMana: 0, manaRegen: 0,
  staminaRegen: 20, staminaRegenDelay: 50,
  jumpStrength: 480, gravity: 1700, airControl: 0.08, airJumps: 0,
  magicMult: 1.0,
  dodge: { iframes: 8, duration: 18, recovery: 10, speed: 480, cost: 30 },
  parryWindow: 4, parryWhiffRecovery: 16,
  spell: null,
};

export const ENEMIES = {
  // =========================================================== GRUNT (fodder)
  grunt: {
    ...BASE,
    id: 'grunt',
    name: 'Ashen Grunt',
    title: 'Rusted sword, empty eyes',
    art: 'grunt',
    body: { w: 44, h: 96 },
    look: { color: 0x5b6b2f, accent: 0x777777, skin: 0x9aa37a },

    maxHealth: 70, maxStamina: 60,
    walkSpeed: 115, depthSpeed: 85,
    meleeMult: 1.0,
    blockReduction: 0.8, guardEfficiency: 1.0,
    knockdownFrames: 50, getupFrames: 20, staggerFrames: 50,

    moves: {
      light1: {
        anim: 'slash', cut: 'slash',
        startup: 10, active: 3, recovery: 16,
        damage: 8, hitstun: 20, hitstop: 4, shake: 1,
        knockback: { x: 80, y: 0 }, guardDamage: 12, lunge: 40,
        hitbox: { x: 8, y: 40, w: 56, h: 34 },
        chains: [{ button: 'attack', next: 'light2', from: 8, to: 29 }],
      },
      light2: {
        anim: 'backslash', cut: 'slash',
        startup: 9, active: 3, recovery: 20,
        damage: 9, hitstun: 22, hitstop: 5, shake: 2,
        knockback: { x: 180, y: 220 }, knockdown: true, guardDamage: 14, lunge: 60,
        hitbox: { x: 8, y: 30, w: 58, h: 40 },
      },
      heavy: {
        anim: 'chop', cut: 'chop',
        startup: 24, active: 4, recovery: 26,       // long, readable wind-up
        damage: 18, hitstun: 28, hitstop: 9, shake: 5,
        knockback: { x: 280, y: 300 }, knockdown: true, breaksGuard: true,
        guardDamage: 30, staminaCost: 0, lunge: 90,
        hitbox: { x: 4, y: 20, w: 76, h: 60 },
      },
    },

    ai: {
      attackRange: 66, minRange: 34, alignZ: 10,
      waitRange: 190, maxCrowd: 2,
      threatRange: 120,
      attackCooldown: [45, 100],
      heavyChance: 0.2, comboChance: 0.45,
      blockChance: 0.3, blockHold: [24, 45],
    },
  },

  // =========================================================== 1. GORRAK THE FLAYER
  // Wild-haired butcher. Cleaver in the right hand, a chained meat hook in the left.
  // Hooks you in from range, then hacks. Kill the left arm and the hook is gone.
  butcher: {
    ...BASE,
    id: 'butcher',
    name: 'Gorrak the Flayer',
    title: 'Butcher of the Pit Road',
    art: 'butcher',
    body: { w: 54, h: 112 },
    look: { color: 0x6b4a32, accent: 0xc8c8c8, skin: 0xb06a48 },

    maxHealth: 130, maxStamina: 80,
    walkSpeed: 110, depthSpeed: 80,
    meleeMult: 1.0,
    blockReduction: 0.75, guardEfficiency: 1.0,
    knockdownFrames: 46, getupFrames: 22, staggerFrames: 50,

    moves: {
      light1: { // Hack â€” diagonal cleaver chop
        anim: 'slash', cut: 'cleave',
        startup: 12, active: 3, recovery: 16,
        damage: 10, hitstun: 22, hitstop: 5, shake: 2,
        knockback: { x: 90, y: 0 }, guardDamage: 14, lunge: 45,
        hitbox: { x: 10, y: 40, w: 64, h: 44 },
        chains: [{ button: 'attack', next: 'light2', from: 10, to: 30 }],
      },
      light2: { // Backhand Hack
        anim: 'backslash', cut: 'cleave',
        startup: 10, active: 3, recovery: 22,
        damage: 12, hitstun: 24, hitstop: 7, shake: 3,
        knockback: { x: 220, y: 240 }, knockdown: true, guardDamage: 16, lunge: 60,
        hitbox: { x: 8, y: 30, w: 66, h: 50 },
      },
      heavy: { // Butcher's Block â€” huge overhead chop
        anim: 'chop', cut: 'chop',
        startup: 36, active: 4, recovery: 28, // big overhead: long, readable wind-up
        damage: 24, hitstun: 30, hitstop: 11, shake: 7,
        knockback: { x: 300, y: 320 }, knockdown: true, breaksGuard: true,
        guardDamage: 34, lunge: 80,
        hitbox: { x: 6, y: 0, w: 82, h: 100 },
      },
      special1: { // Meat Hook â€” chain hook thrown from the left hand, yanks you in
        anim: 'hook', chain: true, needs: 'armB', cut: 'pierce',
        startup: 42, active: 6, recovery: 30, // long whirl first so you can see it coming
        damage: 6, hitstun: 38, hitstop: 8, shake: 3,
        knockback: { x: -1100, y: 0 }, guardDamage: 10,
        hitbox: { x: 40, y: 50, w: 170, h: 28 },
      },
    },

    ai: {
      attackRange: 74, minRange: 36, alignZ: 10,
      waitRange: 200, maxCrowd: 2,
      threatRange: 120,
      attackCooldown: [40, 90],
      heavyChance: 0.25, comboChance: 0.5, comboLength: 1,
      blockChance: 0.2, blockHold: [20, 40],
      specialEvery: 30,
      specials: [{ press: 'special1', min: 110, max: 205, chance: 0.45 }],
    },
  },

  // =========================================================== 2. SLIV THE HOLLOW
  // Hooded stalker with two long daggers and a chain-sickle. All pokes: fast stabs,
  // a 3-hit combo, a long lunging shank, and a sickle whipped out on its chain.
  stalker: {
    ...BASE,
    id: 'stalker',
    name: 'Sliv the Hollow',
    title: 'The knife in the dark',
    art: 'stalker',
    body: { w: 40, h: 104 },
    look: { color: 0x4a5230, accent: 0xc8c8c8, skin: 0xa8704e },

    maxHealth: 80, maxStamina: 90,
    walkSpeed: 175, depthSpeed: 120,
    meleeMult: 1.0,
    blockReduction: 0.7, guardEfficiency: 1.2,
    knockdownFrames: 40, getupFrames: 16, staggerFrames: 44,

    moves: {
      light1: { // Quick Poke â€” right dagger
        anim: 'stab', cut: 'pierce',
        startup: 6, active: 2, recovery: 12,
        damage: 6, hitstun: 18, hitstop: 3, shake: 0,
        knockback: { x: 50, y: 0 }, guardDamage: 8, lunge: 70,
        hitbox: { x: 12, y: 50, w: 58, h: 22 },
        chains: [{ button: 'attack', next: 'light2', from: 6, to: 20 }],
      },
      light2: { // Double Poke â€” left dagger
        anim: 'stabB', cut: 'pierce',
        startup: 5, active: 2, recovery: 12,
        damage: 6, hitstun: 18, hitstop: 3, shake: 0,
        knockback: { x: 60, y: 0 }, guardDamage: 8, lunge: 70,
        hitbox: { x: 12, y: 44, w: 58, h: 22 },
        chains: [{ button: 'attack', next: 'light3', from: 5, to: 19 }],
      },
      light3: { // Gut Stab â€” both blades, knocks down
        anim: 'thrust', cut: 'pierce',
        startup: 9, active: 3, recovery: 20,
        damage: 11, hitstun: 24, hitstop: 7, shake: 3,
        knockback: { x: 240, y: 200 }, knockdown: true, guardDamage: 14, lunge: 120,
        hitbox: { x: 10, y: 36, w: 66, h: 28 },
      },
      heavy: { // Lunging Shank â€” dives across the floor, blade first
        anim: 'thrust', cut: 'pierce',
        startup: 18, active: 8, recovery: 24,
        damage: 17, hitstun: 28, hitstop: 9, shake: 4,
        knockback: { x: 300, y: 260 }, knockdown: true, breaksGuard: true,
        guardDamage: 28, lunge: 330,
        hitbox: { x: 14, y: 40, w: 60, h: 28 },
      },
      special1: { // Chain Sickle â€” whipped out on its chain
        anim: 'hook', chain: true, needs: 'armB', cut: 'slash',
        startup: 36, active: 5, recovery: 24, // long whirl first so you can see it coming
        damage: 10, hitstun: 26, hitstop: 6, shake: 2,
        knockback: { x: 140, y: 0 }, guardDamage: 14,
        hitbox: { x: 40, y: 56, w: 170, h: 26 },
      },
    },

    ai: {
      attackRange: 72, minRange: 40, alignZ: 10,
      waitRange: 210, maxCrowd: 2,
      threatRange: 130,
      attackCooldown: [30, 70],
      heavyChance: 0.15, comboChance: 0.6, comboLength: 2,
      blockChance: 0.15, blockHold: [16, 30],
      specialEvery: 26,
      specials: [
        { press: 'heavy', min: 130, max: 190, chance: 0.35 },
        { press: 'special1', min: 110, max: 205, chance: 0.4 },
      ],
    },
  },

  // =========================================================== 3. THE IRON PENITENT
  // Chained giant in an iron mask, swinging a spiked ball on a long chain. Huge reach,
  // slow, and his overhead crash and chain storm can't be interrupted.
  penitent: {
    ...BASE,
    id: 'penitent',
    name: 'The Iron Penitent',
    title: 'Chained to his sins, swinging them',
    art: 'penitent',
    body: { w: 66, h: 128 },
    look: { color: 0x5a3a2a, accent: 0x6a6a70, skin: 0xa8664a },

    maxHealth: 230, maxStamina: 140,
    walkSpeed: 78, depthSpeed: 60,
    meleeMult: 1.0,
    blockReduction: 0.8, guardEfficiency: 0.8,
    knockdownFrames: 38, getupFrames: 26, staggerFrames: 40,

    moves: {
      light1: { // Flail Swing â€” ball flies out on the chain
        anim: 'swingChain', chain: true, cut: 'blunt',
        startup: 32, active: 4, recovery: 20,
        damage: 14, hitstun: 24, hitstop: 7, shake: 3,
        knockback: { x: 180, y: 0 }, guardDamage: 20, lunge: 20,
        hitbox: { x: 30, y: 30, w: 100, h: 50 },
        chains: [{ button: 'attack', next: 'light2', from: 30, to: 52 }],
      },
      light2: { // Return Swing
        anim: 'swingChain', chain: true, cut: 'blunt',
        startup: 30, active: 4, recovery: 26,
        damage: 16, hitstun: 26, hitstop: 8, shake: 4,
        knockback: { x: 300, y: 300 }, knockdown: true, guardDamage: 24, lunge: 20,
        hitbox: { x: 30, y: 20, w: 100, h: 56 },
      },
      heavy: { // Penance â€” overhead crash, ground shakes
        anim: 'slamChain', chain: true, cut: 'blunt', superArmor: true, fx: 'quake',
        startup: 42, active: 5, recovery: 32,
        damage: 30, hitstun: 32, hitstop: 12, shake: 9,
        knockback: { x: 320, y: 420 }, knockdown: true, breaksGuard: true,
        guardDamage: 45, lunge: 10,
        hitbox: { x: 20, y: 0, w: 130, h: 60, depth: 36 },
      },
      special1: { // Chain Storm â€” whirls the flail all the way round
        anim: 'spin', chain: true, cut: 'blunt', superArmor: true,
        startup: 36, active: 16, recovery: 30,
        damage: 18, hitstun: 28, hitstop: 8, shake: 5,
        knockback: { x: 340, y: 340 }, knockdown: true, guardDamage: 30, lunge: 60,
        hitbox: { x: -115, y: 20, w: 230, h: 60, depth: 30 },
      },
    },

    ai: {
      attackRange: 118, minRange: 50, alignZ: 12,
      waitRange: 240, maxCrowd: 2,
      threatRange: 110,
      attackCooldown: [55, 110],
      heavyChance: 0.3, comboChance: 0.4, comboLength: 1,
      blockChance: 0, blockHold: [20, 30],
      specialEvery: 40,
      specials: [{ press: 'special1', min: 0, max: 110, chance: 0.35 }],
    },
  },

  // =========================================================== 4. VORN SKULLSPLITTER
  // Mohawked berserker with a skull pauldron and a massive cleaver-axe. Fast, reckless
  // axe combos and an unstoppable berserk rush.
  berserker: {
    ...BASE,
    id: 'berserker',
    name: 'Vorn Skullsplitter',
    title: 'Wears his trophies',
    art: 'berserker',
    body: { w: 50, h: 112 },
    look: { color: 0x5a3a26, accent: 0xc8c8c8, skin: 0xb46e4a },

    maxHealth: 120, maxStamina: 100,
    walkSpeed: 145, depthSpeed: 100,
    meleeMult: 1.0,
    blockReduction: 0.7, guardEfficiency: 1.1,
    knockdownFrames: 40, getupFrames: 18, staggerFrames: 44,

    moves: {
      light1: { // Axe Hack
        anim: 'slash', cut: 'cleave',
        startup: 9, active: 3, recovery: 14,
        damage: 10, hitstun: 22, hitstop: 5, shake: 2,
        knockback: { x: 90, y: 0 }, guardDamage: 12, lunge: 60,
        hitbox: { x: 10, y: 40, w: 66, h: 44 },
        chains: [{ button: 'attack', next: 'light2', from: 8, to: 26 }],
      },
      light2: { // Rising Hack
        anim: 'uppercut', cut: 'cleave',
        startup: 8, active: 3, recovery: 16,
        damage: 10, hitstun: 22, hitstop: 5, shake: 2,
        knockback: { x: 100, y: 0 }, guardDamage: 12, lunge: 60,
        hitbox: { x: 8, y: 40, w: 66, h: 60 },
        chains: [{ button: 'attack', next: 'light3', from: 8, to: 27 }],
      },
      light3: { // Skull Splitter
        anim: 'chop', cut: 'chop',
        startup: 12, active: 4, recovery: 24,
        damage: 16, hitstun: 26, hitstop: 9, shake: 5,
        knockback: { x: 280, y: 300 }, knockdown: true, guardDamage: 20, lunge: 90,
        hitbox: { x: 6, y: 10, w: 76, h: 90 },
      },
      heavy: { // Headsman â€” enormous overhead
        anim: 'chop', cut: 'chop',
        startup: 32, active: 4, recovery: 28,
        damage: 26, hitstun: 30, hitstop: 12, shake: 7,
        knockback: { x: 340, y: 340 }, knockdown: true, breaksGuard: true,
        guardDamage: 40, lunge: 110,
        hitbox: { x: 6, y: 0, w: 84, h: 110 },
      },
      special1: { // Berserk Rush â€” shoulder barge, can't be stopped
        anim: 'charge', cut: 'blunt', superArmor: true,
        startup: 24, active: 18, recovery: 22,
        damage: 14, hitstun: 26, hitstop: 8, shake: 5,
        knockback: { x: 360, y: 300 }, knockdown: true, breaksGuard: true,
        guardDamage: 30, lunge: 400,
        hitbox: { x: 10, y: 20, w: 46, h: 80 },
      },
    },

    ai: {
      attackRange: 72, minRange: 34, alignZ: 10,
      waitRange: 190, maxCrowd: 2,
      threatRange: 110,
      attackCooldown: [28, 65],
      heavyChance: 0.2, comboChance: 0.6, comboLength: 2,
      blockChance: 0.1, blockHold: [16, 28],
      specialEvery: 36,
      specials: [{ press: 'special1', min: 170, max: 320, chance: 0.4 }],
    },
  },

  // =========================================================== 5. GRUBB ROTCHAIN
  // Hooded grave-ghoul: a rusty knife in the left hand, a spiked mace on a chain in
  // the right. Knife up close, chain-mace swings and whirls at mid range.
  ghoul: {
    ...BASE,
    id: 'ghoul',
    name: 'Grubb Rotchain',
    title: 'Digs up what you bury',
    art: 'ghoul',
    body: { w: 44, h: 104 },
    look: { color: 0x4a5230, accent: 0x7a7a80, skin: 0xa06a4a },

    maxHealth: 95, maxStamina: 80,
    walkSpeed: 125, depthSpeed: 90,
    meleeMult: 1.0,
    blockReduction: 0.7, guardEfficiency: 1.1,
    knockdownFrames: 44, getupFrames: 18, staggerFrames: 46,

    moves: {
      light1: { // Rusty Knife â€” quick slash with the left hand
        anim: 'stabB', cut: 'slash', needs: 'armB',
        startup: 7, active: 3, recovery: 14,
        damage: 7, hitstun: 20, hitstop: 4, shake: 1,
        knockback: { x: 70, y: 0 }, guardDamage: 10, lunge: 55,
        hitbox: { x: 10, y: 45, w: 54, h: 30 },
        chains: [{ button: 'attack', next: 'light2', from: 7, to: 24 }],
      },
      light2: { // Chain Mace â€” swung out on its chain
        anim: 'swingChain', chain: true, cut: 'blunt',
        startup: 30, active: 4, recovery: 22,
        damage: 12, hitstun: 24, hitstop: 7, shake: 3,
        knockback: { x: 240, y: 260 }, knockdown: true, guardDamage: 18, lunge: 30,
        hitbox: { x: 24, y: 30, w: 86, h: 50 },
      },
      heavy: { // Skull Crusher â€” overhead chain-mace slam
        anim: 'slamChain', chain: true, cut: 'blunt', fx: 'quake',
        startup: 38, active: 4, recovery: 28,
        damage: 20, hitstun: 30, hitstop: 10, shake: 6,
        knockback: { x: 280, y: 360 }, knockdown: true, breaksGuard: true,
        guardDamage: 34, lunge: 30,
        hitbox: { x: 24, y: 0, w: 96, h: 70 },
      },
      special1: { // Mace Whirl â€” spins the chain-mace while stalking forward
        anim: 'spin', chain: true, cut: 'blunt',
        startup: 28, active: 20, recovery: 24,
        damage: 13, hitstun: 26, hitstop: 6, shake: 3,
        knockback: { x: 280, y: 260 }, knockdown: true, guardDamage: 20, lunge: 110,
        hitbox: { x: -95, y: 30, w: 190, h: 50 },
      },
    },

    ai: {
      attackRange: 80, minRange: 36, alignZ: 10,
      waitRange: 200, maxCrowd: 2,
      threatRange: 120,
      attackCooldown: [38, 85],
      heavyChance: 0.25, comboChance: 0.55, comboLength: 1,
      blockChance: 0.15, blockHold: [18, 34],
      specialEvery: 36,
      specials: [{ press: 'special1', min: 60, max: 150, chance: 0.35 }],
    },
  },

  // =========================================================== 6. PITLORD KRAGG
  // Arena champion: spiked helm, spiked round shield, spiked mace. Blocks a lot â€”
  // break his guard with heavies, or cut his shield arm off.
  gladiator: {
    ...BASE,
    id: 'gladiator',
    name: 'Pitlord Kragg',
    title: 'Champion of the blood pits',
    art: 'gladiator',
    body: { w: 56, h: 118 },
    look: { color: 0x7a1414, accent: 0x8a8a90, skin: 0xb06a48 },

    maxHealth: 170, maxStamina: 130,
    walkSpeed: 100, depthSpeed: 75,
    meleeMult: 1.0,
    blockReduction: 0.95, guardEfficiency: 0.55,
    knockdownFrames: 42, getupFrames: 20, staggerFrames: 48,

    moves: {
      light1: { // Mace Bash
        anim: 'slash', cut: 'blunt',
        startup: 11, active: 3, recovery: 16,
        damage: 11, hitstun: 22, hitstop: 6, shake: 2,
        knockback: { x: 110, y: 0 }, guardDamage: 14, lunge: 45,
        hitbox: { x: 10, y: 45, w: 64, h: 44 },
        chains: [{ button: 'attack', next: 'light2', from: 10, to: 30 }],
      },
      light2: { // Mace Uppercut â€” launches
        anim: 'uppercut', cut: 'blunt',
        startup: 10, active: 3, recovery: 22,
        damage: 12, hitstun: 24, hitstop: 7, shake: 4,
        knockback: { x: 150, y: 520 }, knockdown: true, guardDamage: 16, lunge: 50,
        hitbox: { x: 8, y: 40, w: 62, h: 70 },
      },
      heavy: { // Crowd Breaker â€” overhead mace
        anim: 'chop', cut: 'blunt',
        startup: 34, active: 4, recovery: 28,
        damage: 26, hitstun: 30, hitstop: 11, shake: 7,
        knockback: { x: 320, y: 340 }, knockdown: true, breaksGuard: true,
        guardDamage: 40, lunge: 80,
        hitbox: { x: 6, y: 0, w: 80, h: 106 },
      },
      special1: { // Shield Rush â€” spiked shield charge
        anim: 'bash', cut: 'blunt', needs: 'armB',
        startup: 22, active: 12, recovery: 24,
        damage: 12, hitstun: 36, hitstop: 8, shake: 5,
        knockback: { x: 380, y: 200 }, knockdown: true, breaksGuard: true,
        guardDamage: 40, lunge: 360,
        hitbox: { x: 16, y: 20, w: 40, h: 90 },
      },
    },

    ai: {
      attackRange: 74, minRange: 38, alignZ: 10,
      waitRange: 200, maxCrowd: 2,
      threatRange: 140,
      attackCooldown: [45, 95],
      heavyChance: 0.25, comboChance: 0.45, comboLength: 1,
      blockChance: 0.55, blockHold: [40, 80],
      specialEvery: 36,
      specials: [{ press: 'special1', min: 150, max: 260, chance: 0.4 }],
    },
  },
};

// Wave line-ups for the test arena. After the last one, waves are random mixes.
export const WAVES = [
  ['grunt', 'grunt', 'butcher'],
  ['stalker', 'grunt', 'ghoul'],
  ['berserker', 'butcher', 'grunt', 'grunt'],
  ['gladiator', 'stalker', 'ghoul'],
  ['penitent', 'grunt', 'grunt', 'stalker'],
  ['gladiator', 'berserker', 'butcher', 'ghoul'],
  ['penitent', 'gladiator', 'berserker', 'stalker', 'ghoul', 'butcher'],
];

export const BAD_GUYS = ['butcher', 'stalker', 'penitent', 'berserker', 'ghoul', 'gladiator'];
