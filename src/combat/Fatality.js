// Fatality.js — Decides HOW an enemy comes apart. Pure logic (no drawing), so the
// automated tests can check it. effects/Dismember.js turns the answer into gibs.
//
// Every attack has a `cut` type (in data/characters.js / data/enemies.js):
//   slash    horizontal blade   -> heads and limbs, waist cuts on big hits
//   cleave   heavy blade        -> cut in half at the waist
//   chop     overhead blade     -> split down the middle
//   pierce   stabs, knives      -> limbs, the odd head
//   blunt    staffs, maces      -> heads burst
//   fire / crush / explosive    -> blown to pieces
//
// "Hard enough" = power. Weak finishing blows lop off a limb; strong ones cut people
// in half or blow them apart. Where the blow lands matters too: a high hit (rel near 1)
// is far more likely to take the head.

export const FATALITIES = ['none', 'limbs', 'decap', 'headPop', 'halfH', 'halfV', 'explode'];

export const FATALITY_LABELS = {
  limbs: 'DISMEMBERED!',
  decap: 'DECAPITATED!',
  headPop: 'SKULL CRUSHED!',
  halfH: 'CLEAVED IN TWO!',
  halfV: 'SPLIT IN HALF!',
  explode: 'OBLITERATED!',
};

const BLADES = ['slash', 'chop', 'cleave'];

function pickWeighted(table, rng) {
  const entries = Object.entries(table).filter(([, w]) => w > 0);
  const total = entries.reduce((s, [, w]) => s + w, 0);
  let r = rng() * total;
  for (const [k, w] of entries) {
    if ((r -= w) <= 0) return k;
  }
  return entries[entries.length - 1]?.[0] ?? 'none';
}

// damage: final damage of the killing blow; overkill: damage beyond remaining health;
// rel: where it landed, 0 = feet .. 1 = top of the head.
export function chooseFatality({ cut = 'slash', damage = 10, overkill = 0, counter = false, rel = 0.5 }, rng = Math.random) {
  const power = damage + overkill * 0.5 + (counter ? 8 : 0);
  const hard = power >= 18;
  const brutal = power >= 26;
  const high = rel > 0.64;
  const t = {};
  const add = (k, w) => { t[k] = (t[k] ?? 0) + w; };

  switch (cut) {
    case 'fire':
    case 'explosive':
    case 'crush':
      add('explode', hard ? 8 : 3);
      add('limbs', 2);
      add('headPop', cut === 'crush' ? 2 : 0);
      break;
    case 'chop':
      add('halfV', brutal ? 5 : hard ? 3.5 : 1);
      add('decap', high ? 3.5 : 2);
      add('limbs', 2);
      add('halfH', hard ? 1.5 : 0);
      break;
    case 'cleave':
      add('halfH', brutal ? 8 : hard ? 4 : 1.5);
      add('decap', high ? 3 : 1);
      add('limbs', 2);
      add('halfV', brutal ? 1.5 : 0);
      break;
    case 'slash':
      add('decap', high ? 5 : 2);
      add('limbs', 3);
      add('halfH', brutal ? 4 : hard ? 2.5 : 0.5);
      break;
    case 'pierce':
      add('limbs', 3);
      add('decap', hard ? 2 : 0.6);
      add('none', 1.5);
      break;
    case 'blunt':
      add('headPop', brutal ? 7 : hard ? 5 : 2.5);
      add('limbs', 2);
      add('explode', brutal ? 2 : 0);
      add('none', 1);
      break;
    default:
      add('none', 3);
      add('limbs', 1);
  }
  return pickWeighted(t, rng);
}

// Non-lethal: a big blade hit can take an arm off a living enemy.
// Returns 'armB' (off hand), 'armF' (weapon hand) or null.
export function chooseMaim({ cut, damage, counter = false, maxHealth, maimed = {} }, rng = Math.random) {
  if (!BLADES.includes(cut)) return null;
  if (!(damage >= maxHealth * 0.18 || counter)) return null;
  if (rng() > (counter ? 0.55 : 0.35)) return null;
  const options = ['armB', 'armF'].filter((l) => !maimed[l]);
  if (!options.length) return null;
  if (options.length === 1) return options[0];
  return rng() < 0.65 ? 'armB' : 'armF';
}
