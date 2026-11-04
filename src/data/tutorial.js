// tutorial.js — THE PRACTICE YARD's lessons, one list per hero (Nick, 2026-11-04: "a
// tutorial in its own space that shows the player quickly, not too wordy, and lets them
// try all the mechanics, for each player. Hiding the higher cool stuff that's unlocked").
//
// Only the hero's BASE kit is taught: the skill tree's moves (Rurik's Whirlwind Cleave,
// Leap Smash, Kingsfire...) are left out, and in the yard the hero fights with no skill
// picks or trophies at all (ArenaScene: stageData.practice). The logic is stage/Tutorial.js,
// the card on screen view/TutorialCard.js, the yard itself data/stagePractice.js.
//
// A hero not listed here gets BASICS. When a hero's kit changes (the Mage and the Assassin
// are being reworked), change their list here and nothing else.
//
// A lesson:
//   id, name       the move, as the card shows it (keep it to two or three words)
//   keys           the buttons, in order: an action from config/controls.js ('attack',
//                  'heavy', 'kick', 'dodge', 'block', 'magic', 'jump', 'sprint', 'grab',
//                  'down'), 'stick' (move), 'hold:<action>', or '+' / '>' between them
//                  ('+' = together, '>' = then)
//   hint           at most one short line, only when the buttons don't say it all
//   done           what counts as having done it (any one of these):
//                    walk: px        moved this far in all
//                    sprinting: true running at a sprint
//                    moves: [...]    the hero went into one of these states / started one
//                                    of these moves (fighterStates.js, the attackStart events)
//                    events: [...]   a world event with the hero as its fighter (or defender)
//   times          how many times (default 1)
//   spar           a sparring partner who fights back comes in for this lesson

const MOVE = { id: 'move', name: 'MOVE', keys: ['stick'], done: { walk: 260 } };
const BLOCK = {
  id: 'block', name: 'BLOCK', keys: ['hold:block'], hint: 'Tap just before a hit to PARRY',
  done: { events: ['block', 'parry'] }, spar: true,
};
const GRAB = { id: 'grab', name: 'GRAB & THROW', keys: ['grab', '>', 'grab'], hint: 'Aim the throw with the stick', done: { events: ['grabThrow'] } };
const SPRINT = { id: 'sprint', name: 'SPRINT', keys: ['sprint', '+', 'stick'], done: { sprinting: true } };

export const BASICS = [
  MOVE,
  { id: 'combo', name: 'COMBO', keys: ['attack', 'attack', 'attack'], done: { moves: ['light3'] } },
  { id: 'heavy', name: 'HEAVY', keys: ['heavy'], done: { moves: ['heavy'] } },
  { id: 'kick', name: 'KICK', keys: ['kick'], done: { moves: ['kick'] } },
  { id: 'dodge', name: 'DODGE', keys: ['dodge'], done: { moves: ['dodge'] } },
  BLOCK,
  GRAB,
  { id: 'jumpAttack', name: 'JUMP ATTACK', keys: ['jump', '>', 'attack'], done: { moves: ['airAttack'] } },
  { id: 'magic', name: 'MAGIC', keys: ['magic'], done: { moves: ['cast'] } },
];

export const LESSONS = {
  // RURIK (characters.js warrior), with Oathkeeper and his Firebolt
  warrior: [
    MOVE,
    { id: 'combo', name: 'SWORD COMBO', keys: ['attack', 'attack', 'attack'], done: { moves: ['light3'] } },
    { id: 'heavy', name: 'CLEAVE', keys: ['heavy'], done: { moves: ['heavy'] } },
    { id: 'kick', name: 'SPARTA KICK', keys: ['kick'], hint: 'Breaks a guard', done: { moves: ['kick'] } },
    { id: 'dodge', name: 'ROLL', keys: ['dodge'], done: { moves: ['dodge'] } },
    BLOCK,
    GRAB,
    { id: 'launcher', name: 'RISING CLEAVE', keys: ['attack', 'attack', 'heavy'], hint: 'Then heavy again to SUNDER him', done: { moves: ['launcher'] } },
    { id: 'thrust', name: 'POWER THRUST', keys: ['hold:attack'], done: { moves: ['thrust'] } },
    { id: 'shoulder', name: 'SHOULDER SMASH', keys: ['sprint', '>', 'attack'], hint: 'Sprint at them first', done: { moves: ['shoulder'] } },
    { id: 'jumpAttack', name: 'AIR SLASH', keys: ['jump', '>', 'attack'], done: { moves: ['airAttack'] } },
    { id: 'magic', name: 'FIREBOLT', keys: ['magic'], done: { moves: ['cast'] } },
  ],

  // ORYN (characters.js mage)
  mage: [
    MOVE,
    { id: 'combo', name: 'STAFF COMBO', keys: ['attack', 'attack', 'attack'], done: { moves: ['light3'] } },
    { id: 'bolt', name: 'CHAIN LIGHTNING', keys: ['heavy'], hint: 'Up to three times in a row', done: { moves: ['bolt'] } },
    { id: 'force', name: 'FORCE BLAST', keys: ['kick'], hint: 'Hold it for a stronger push', done: { moves: ['force'] } },
    { id: 'blink', name: 'BLINK', keys: ['dodge'], done: { moves: ['blink'] } },
    BLOCK,
    GRAB,
    SPRINT,
    { id: 'jumpAttack', name: 'AIR STRIKE', keys: ['jump', '>', 'attack'], done: { moves: ['airAttack'] } },
    { id: 'ward', name: 'STONE WALL', keys: ['magic'], hint: 'Only enemies are stopped', done: { moves: ['ward'] } },
  ],

  // VEXA (characters.js rogue)
  rogue: [
    MOVE,
    { id: 'combo', name: 'DAGGER COMBO', keys: ['attack', 'attack', 'attack', 'attack'], done: { moves: ['light4'] } },
    { id: 'viper', name: 'VIPER STRIKE', keys: ['heavy'], done: { moves: ['viper'] } },
    { id: 'kick', name: 'CRESCENT KICK', keys: ['kick'], hint: 'Up close', done: { moves: ['kick'] } },
    { id: 'knife', name: 'SHURIKEN', keys: ['kick'], hint: 'From further away', done: { moves: ['knife'] } },
    { id: 'sweep', name: 'LEG SWEEP', keys: ['down', '+', 'kick'], done: { moves: ['sweep'] } },
    { id: 'dodge', name: 'ROLL', keys: ['dodge'], done: { moves: ['dodge'] } },
    BLOCK,
    GRAB,
    SPRINT,
    { id: 'fan', name: 'SHURIKEN FAN', keys: ['jump', '>', 'kick'], done: { moves: ['fan'] } },
    { id: 'dive', name: 'FALLING VIPER', keys: ['jump', '>', 'heavy'], done: { moves: ['dive'] } },
    { id: 'mine', name: 'WIDOW MINE', keys: ['magic'], done: { moves: ['mine'] } },
  ],
};

export function lessonsFor(heroId) {
  return LESSONS[heroId] ?? BASICS;
}
