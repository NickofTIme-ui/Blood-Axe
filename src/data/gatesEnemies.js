// gatesEnemies.js — THE IRON GATES' own garrison (campaign level 5, data/stageGates.js).
// Level 5 is near the end: these three are built so that no hero gets through them on one
// button. Each one is shut to the easy answer and open to a skill (combat/GatesArmor.js):
//
//   THE GATE WARDEN (`warden5`)  a man-tall iron-bound pavise. Blows into its face ring off
//       it (no damage, no stagger). Knock it aside with a guard-breaker (Rurik's kick,
//       shoulder, heavy, thrust; Oryn's shoulder, skyfall, comet, thunder; Vexa's rush,
//       heavy, dive), lift him off his feet (launcher, updraft), come down on him from the
//       air over the rim, sweep his legs (Vexa), or get behind him (a roll, Vexa's backstab).
//       Knocked aside, the shield is down for a breath (`open`): then it's a man.
//   THE IRON GUARD (`ironclad`)  Malgor's knights in full plate (`plates`). A light blow
//       glances off: a quarter of the damage and he doesn't flinch. A heavy one (any
//       guard-breaker, a launch, a crit, a big spell, fire) cracks a plate off him. Three
//       plates gone, he's flesh like anyone. Launch him and juggle: every lift is a plate.
//   THE ARBALESTER (`arbalest`)  a crossbowman who keeps his distance, kneels, and draws a
//       red line down the lane (the aim: a long tell), then looses a bolt that goes through
//       everything in it. Parry it (it breaks), dodge through it, stand behind a Mage's
//       wall, or step off the line. Then he cranks the windlass (`reload`), slow and open:
//       that's the time to close (a sprint, a Wind Step, a Long Step), or answer from range
//       (Firebolt, knives, shuriken, bolts). Up close he clubs with the stock.
//
// Their moves are written after enemies.js's WINDUP_EXTRA pass (installed at its foot), so
// the wind-ups here are the full ones and meet TELEGRAPH themselves.

// the bolt (an enemy projectile: World.spawnProjectile, the same hit rules as a hero's)
export const ARBALEST_BOLT = {
  cut: 'pierce', look: 'bolt5', speed: 900, lifetime: 80, y: 62, w: 44, h: 14, depth: 16,
  damage: 15, hitstun: 26, hitstop: 7, shake: 4,
  knockback: { x: 300, y: 200 }, knockdown: true, guardDamage: 30,
};

// how the arbalester shoots (stage/GatesFoes.js arbalestScript)
export const ARBALEST = {
  range: [300, 560],   // where he likes to stand from his man
  tooClose: 150,       // nearer than this he clubs with the stock (or backs off)
  aimFrames: 60,       // the red line before the loose (the tell): special1's startup
  reloadFrames: 96,    // the windlass (heavy): slow and open
  alignZ: 14,          // he looses only with his man on his line (or near enough)
};

const NO_HIT = { x: -9999, y: -9999, w: 1, h: 1 }; // (a move that strikes nothing itself)

export function installGatesEnemies(E) {
  // ------------------------------------------------------------ THE GATE WARDEN
  const w = structuredClone(E.grunt);
  Object.assign(w, {
    id: 'warden5', name: 'Gate Warden', title: 'The wall in front of the wall',
    art: 'grunt', body: { w: 54, h: 112 }, maxHealth: 110, maxStamina: 120,
    walkSpeed: 88, depthSpeed: 70, blockReduction: 1, guardEfficiency: 0.2,
    knockdownFrames: 48, getupFrames: 22, staggerFrames: 52,
    variety: { speed: [0.94, 1.06], size: [0.98, 1.05], toughness: 0.5 },
    pavise: { open: 140 }, // frames the shield stays down once knocked aside
  });
  w.moves = {
    light1: { // the chop round the shield's edge
      anim: 'slash', cut: 'chop', startup: 32, active: 3, recovery: 20,
      damage: 11, hitstun: 22, hitstop: 5, shake: 2,
      knockback: { x: 110, y: 0 }, guardDamage: 14, lunge: 30,
      hitbox: { x: 10, y: 34, w: 60, h: 44 },
      chains: [{ button: 'attack', next: 'light2', from: 36, to: 48 }],
    },
    light2: { // the shield bash: shoves you back out of reach
      anim: 'bash', cut: 'blunt', startup: 27, active: 4, recovery: 22,
      damage: 7, hitstun: 26, hitstop: 7, shake: 3,
      knockback: { x: 420, y: 0 }, guardDamage: 26, lunge: 90,
      hitbox: { x: 14, y: 10, w: 54, h: 96 },
    },
    heavy: { // over the rim: the falchion comes down over the planted shield
      anim: 'chop', cut: 'chop', startup: 42, active: 4, recovery: 28,
      damage: 20, hitstun: 28, hitstop: 10, shake: 6,
      knockback: { x: 280, y: 300 }, knockdown: true, breaksGuard: true, guardDamage: 40, lunge: 60,
      hitbox: { x: 6, y: 20, w: 78, h: 70 },
    },
    special1: { // the shield charge
      anim: 'charge', cut: 'blunt', startup: 44, active: 16, recovery: 30,
      damage: 12, hitstun: 30, hitstop: 8, shake: 5,
      knockback: { x: 420, y: 220 }, knockdown: true, breaksGuard: true, guardDamage: 36, lunge: 330,
      hitbox: { x: 12, y: 10, w: 50, h: 96 },
    },
  };
  w.ai = {
    ...w.ai, attackRange: 70, minRange: 36, waitRange: 170, maxCrowd: 3, threatRange: 0,
    attackCooldown: [50, 90], heavyChance: 0.25, comboChance: 0.35, blockChance: 0,
    specialEvery: 40, specials: [{ press: 'special1', min: 160, max: 300, chance: 0.35 }],
  };
  E.warden5 = w;

  // ------------------------------------------------------------ THE IRON GUARD
  const k = structuredClone(E.berserker);
  Object.assign(k, {
    id: 'ironclad', name: 'Iron Guard', title: "The Marshal's own. Crack the plate",
    art: 'berserker', body: { w: 60, h: 128 }, maxHealth: 170, maxStamina: 140,
    walkSpeed: 92, depthSpeed: 70, blockReduction: 0.8, guardEfficiency: 0.6,
    knockdownFrames: 46, getupFrames: 26, staggerFrames: 40,
    variety: { speed: [0.95, 1.05], size: [1.1, 1.16], toughness: 0.5 },
    tuned: null, plates: 3,
  });
  for (const m of Object.values(k.moves)) m.cut = 'blunt';
  k.moves = {
    light1: { ...k.moves.light1, name: 'Maul Swing', startup: 32, damage: 13, knockback: { x: 160, y: 0 },
      chains: [{ button: 'attack', next: 'light2', from: 36, to: 48 }] },
    light2: { ...k.moves.light2, name: 'Maul Jab', startup: 27, damage: 11, knockback: { x: 220, y: 0 }, chains: [] },
    heavy: { ...k.moves.heavy, name: 'Iron Fall', startup: 46, recovery: 34, damage: 28, fx: 'quake' },
    special1: { ...k.moves.special1, name: 'Iron Charge', startup: 44, damage: 16, lunge: 340 },
  };
  delete k.moves.light3;
  k.ai = {
    ...k.ai, attackRange: 80, minRange: 36, waitRange: 190, maxCrowd: 2, threatRange: 0,
    attackCooldown: [55, 95], heavyChance: 0.3, comboChance: 0.4, comboLength: 1, blockChance: 0,
    specialEvery: 44, specials: [{ press: 'special1', min: 170, max: 320, chance: 0.3 }],
  };
  E.ironclad = k;

  // ------------------------------------------------------------ THE ARBALESTER
  const a = structuredClone(E.grunt);
  Object.assign(a, {
    id: 'arbalest', name: 'Arbalester', title: 'Watch the red line',
    art: 'grunt', body: { w: 44, h: 98 }, maxHealth: 62, maxStamina: 50,
    walkSpeed: 120, depthSpeed: 95, blockReduction: 0.6,
    variety: { speed: [0.94, 1.08], size: [0.97, 1.05], toughness: 0.8 },
    shooter: true,
  });
  a.moves = {
    light1: { // the stock: clubs a man who comes too close, and shoves him off
      anim: 'bash', cut: 'blunt', startup: 30, active: 3, recovery: 20,
      damage: 8, hitstun: 24, hitstop: 5, shake: 2,
      knockback: { x: 330, y: 0 }, guardDamage: 12, lunge: 30,
      hitbox: { x: 10, y: 40, w: 56, h: 40 },
    },
    special1: { // the shot, standing: the aim is the startup; the bolt leaves on its first active frame
      anim: 'thrust', cut: 'pierce', startup: ARBALEST.aimFrames, active: 2, recovery: 22,
      damage: 0, hitstun: 0, hitbox: NO_HIT, shot: true,
    },
    special2: { // the shot, kneeling (a lower bolt: hop it)
      anim: 'thrust', cut: 'pierce', startup: ARBALEST.aimFrames + 6, active: 2, recovery: 30,
      damage: 0, hitstun: 0, hitbox: NO_HIT, shot: true, kneel: true,
    },
    heavy: { // the reload: cranking the windlass, open the whole time
      anim: 'chop', cut: 'blunt', startup: ARBALEST.reloadFrames - 8, active: 2, recovery: 6,
      damage: 0, hitstun: 0, hitbox: NO_HIT, reload: true,
    },
  };
  a.ai = {
    ...a.ai, attackRange: 62, minRange: 30, waitRange: 300, maxCrowd: 9, threatRange: 110,
    attackCooldown: [40, 70], heavyChance: 0, comboChance: 0, blockChance: 0.15,
  };
  E.arbalest = a;
}
