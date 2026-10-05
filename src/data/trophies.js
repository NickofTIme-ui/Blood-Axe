// trophies.js — BOSS LOOT. Trophies are rare things taken off the dead: every boss drops
// his own (LEGENDARY) the first time he falls, and big men (elites) sometimes drop a lesser
// one (COMMON or RARE). A trophy is kept for good (progression/Progress.js) and worn in
// one of TROPHY_SLOTS; worn trophies change the hero's stats like a skill does.
//
// The stage only drops "a trophy" (stage/Stage.js: who dropped it); which one it is gets
// decided when it's picked up (scenes/ArenaScene.js asks pickTrophy), from what you
// already own — so a boss beaten again drops something you don't have yet.
//
// A trophy:  name, rarity 'common' | 'rare' | 'legendary', text (what the player reads),
//   boss     (legendary) part of the name of the boss who carries it
//   apply(s) changes the hero's stats (a copy, like a skill node: data/skills.js)

export const TROPHY_SLOTS = 3;

export const RARITY = {
  common: { label: 'COMMON', color: 0xd8d0c0, css: '#d8d0c0' },
  rare: { label: 'RARE', color: 0x6ab0ff, css: '#6ab0ff' },
  legendary: { label: 'LEGENDARY', color: 0xffb030, css: '#ffb030' },
};

export const TROPHIES = {
  // ---- off the big men (elites)
  whetstone: {
    name: 'Bloodied Whetstone', rarity: 'common',
    text: 'Melee blows hit 8% harder.',
    apply(s) { s.meleeMult *= 1.08; },
  },
  oxHeart: {
    name: 'Dried Ox Heart', rarity: 'common',
    text: '+18 health.',
    apply(s) { s.maxHealth += 18; },
  },
  wolfTooth: {
    name: 'Wolf Tooth Charm', rarity: 'common',
    text: '+5% chance of a critical hit.',
    apply(s) { s.critChance = (s.critChance ?? 0.12) + 0.05; },
  },
  runedBracer: {
    name: 'Runed Bracer', rarity: 'rare',
    text: 'Parry timing is 3 frames more forgiving.',
    apply(s) { s.parryWindow = (s.parryWindow ?? 6) + 3; },
  },
  windTalisman: {
    name: 'Wind Talisman', rarity: 'rare',
    text: 'Stamina comes back 30% faster.',
    apply(s) { s.staminaRegen *= 1.3; },
  },
  stormPearl: {
    name: 'Storm Pearl', rarity: 'rare',
    text: 'Magic hits 12% harder and mana comes back 30% faster.',
    apply(s) { s.magicMult *= 1.12; s.manaRegen *= 1.3; },
  },

  // ---- off the bosses (each drops his own, first time)
  cinderBrand: {
    name: "Cinder's Brand", rarity: 'legendary', boss: 'Cinder',
    text: 'Melee blows hit 12% harder, and +5% critical chance.',
    apply(s) { s.meleeMult *= 1.12; s.critChance = (s.critChance ?? 0.12) + 0.05; },
  },
  captainsCrest: {
    name: "The Ash Captain's Crest", rarity: 'legendary', boss: 'Varek',
    text: '+30 health, and a block takes 5% less.',
    apply(s) { s.maxHealth += 30; s.blockReduction = Math.min(0.97, s.blockReduction + 0.05); },
  },
  hangmansHood: {
    name: "The Hangman's Hood", rarity: 'legendary', boss: 'Hruk',
    text: 'Hits on a man in the air (a juggle) deal 30% more.',
    apply(s) { s.juggleMult = (s.juggleMult ?? 1) * 1.3; },
  },
  houndCollar: {
    name: "The Houndmaster's Collar", rarity: 'legendary', boss: 'Houndmaster',
    text: 'Move 10% faster, and a roll or blink costs 25% less stamina.',
    apply(s) { s.walkSpeed *= 1.1; s.depthSpeed *= 1.1; s.dodge = { ...s.dodge, cost: s.dodge.cost * 0.75 }; },
  },
  wardenChain: {
    name: "The Warden's Chain", rarity: 'legendary', boss: 'Chain Warden',
    text: 'Kills give back 8 health.',
    apply(s) { s.killHeal = (s.killHeal ?? 0) + 8; },
  },
  crusherCore: {
    name: 'The Crusher Core', rarity: 'legendary', boss: 'Ore Crusher',
    text: 'Heavy blows and kicks break guards more easily, and +20 stamina.',
    apply(s) { s.maxStamina += 20; for (const m of Object.values(s.moves)) if (m && m.guardDamage) m.guardDamage *= 1.4; },
  },
  oathbreakerGauntlet: {
    name: "The Oathbreaker's Gauntlet", rarity: 'legendary', boss: 'Malgor',
    text: 'Every blow hits 15% harder (melee and magic).',
    apply(s) { s.meleeMult *= 1.15; s.magicMult *= 1.15; },
  },
};

// What a fallen enemy can drop.
export const LOOT = {
  eliteHealth: 130,  // an enemy this tough (not a boss) is an elite...
  eliteChance: 0.12, // ...and drops a trophy this often
  dupeBlood: 120,    // a trophy with nothing new left in its pool: blood instead
};

const ELITE_POOL = Object.keys(TROPHIES).filter((id) => TROPHIES[id].rarity !== 'legendary');
const LEGENDS = Object.keys(TROPHIES).filter((id) => TROPHIES[id].rarity === 'legendary');

// The boss's own trophy, by his name ('Hruk the Hangman' -> hangmansHood).
export function bossTrophy(name = '') {
  return LEGENDS.find((id) => name.includes(TROPHIES[id].boss)) ?? null;
}

// Which trophy a drop turns out to be, given what you own (owned: id -> true).
// drop: { from: 'boss' | 'elite', boss: <his name> }. roll: 0..1. null = nothing new.
export function pickTrophy(drop, owned = {}, roll = 0) {
  if (drop.from === 'boss') {
    const own = bossTrophy(drop.boss);
    if (own && !owned[own]) return own;
    const left = LEGENDS.filter((id) => !owned[id]);
    if (left.length) return left[Math.floor(roll * left.length) % left.length];
  }
  const left = ELITE_POOL.filter((id) => !owned[id]);
  // rares are half as likely as commons
  const weighted = left.flatMap((id) => (TROPHIES[id].rarity === 'rare' ? [id] : [id, id]));
  return weighted.length ? weighted[Math.floor(roll * weighted.length) % weighted.length] : null;
}
