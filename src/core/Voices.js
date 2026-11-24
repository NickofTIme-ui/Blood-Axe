// Voices.js — men crying out (2026-11-24: until now nobody in the fight made a sound but
// their steel). Enemies grunt when hit, cry out when they die and shout now and then as they
// swing; Rurik and the Mage grunt when hit; Vexa has her own voice; the hounds yelp.
// Recorded takes: core/Sfx.js REC (credits in assets/audio/sfx/CREDITS-recorded.txt).
// Cosmetic only: Math.random here never touches the simulation's RNG.

import { playSfx, REC } from './Sfx.js';

// Who sounds like what. Ghouls get the rough monster voice; everyone else is a man, the big
// ones pitched down so a Crusher doesn't sound like a Thrall.
const DEEP = { crusher: -380, butcher: -300, executioner: -300, warlord: -420, king: -450, berserker: -150, gladiator: -120 };
export function voiceOf(f) {
  const id = f?.stats?.id;
  if (!id) return null;
  if (id === 'hound') return { pain: REC.houndYelp, death: REC.houndYelp, yell: REC.houndGrowl, pitch: 0, spread: 160 };
  if (id === 'rogue') return { pain: REC.vexaPain, death: REC.vexaDeath, yell: REC.vexaAttack, pitch: 0, spread: 80 };
  if (id === 'warrior' || id === 'mage') return { pain: REC.heroPain, death: [['heroDeath', 1]], yell: null, pitch: id === 'mage' ? 120 : -60, spread: 70 };
  if (id === 'ghoul') return { pain: REC.brutePain, death: REC.bruteDeath, yell: REC.bruteYell, pitch: 0, spread: 120 };
  return { pain: REC.manPain, death: REC.manDeath, yell: REC.manYell, pitch: DEEP[id] ?? 0, spread: 160 };
}

// Rate limits (ms, real time): one man doesn't grunt at every blow of a combo, and a crowd
// being cut down doesn't turn into a choir.
const PAIN_EACH = 520, PAIN_ANY = 110, DEATH_ANY = 90, YELL_ANY = 900;
const lastPain = new WeakMap();
let lastPainAny = 0, lastDeathAny = 0, lastYellAny = 0;

// A man hit and still standing.
export function voicePain(scene, f, { big = false } = {}) {
  const v = voiceOf(f);
  if (!v || !f.alive || f.health <= 0) return;
  const hero = f.team === 'player';
  const now = performance.now();
  if (now - (lastPain.get(f) ?? -1e9) < (hero ? 380 : PAIN_EACH)) return;
  if (!hero && now - lastPainAny < PAIN_ANY) return;
  // heroes always; the enemy about half the time (always on a crit or a heavy blow)
  if (!hero && !big && Math.random() > 0.5) return;
  lastPain.set(f, now);
  if (!hero) lastPainAny = now;
  playSfx(scene, v.pain, { volume: hero ? 0.62 : 0.55, pitch: v.pitch, spread: v.spread, minGapMs: 60 });
}

// A man killed: his last cry. Not for a man beheaded, one already screaming as he falls, or an
// execution (the finishers time their own sounds).
export function voiceDeath(scene, e) {
  const f = e.defender;
  const v = voiceOf(f);
  if (!v || e.pit || e.finisher || e.fatality === 'decap') return;
  if (f.screamedAt != null && scene.world && scene.world.frame - f.screamedAt < 120) return;
  const now = performance.now();
  if (now - lastDeathAny < DEATH_ANY) return;
  lastDeathAny = now;
  const hero = f.team === 'player';
  playSfx(scene, v.death, { volume: hero ? 0.8 : 0.62, pitch: v.pitch, spread: v.spread, minGapMs: 40 });
}

// An enemy swinging: a war cry now and then, more often on his heavy blows.
const HEAVY = /heavy|slam|charge|leap|smash|quake|overhead|lunge|shoulder/i;
export function voiceAttack(scene, f, state) {
  if (f.team !== 'enemy') return;
  const v = voiceOf(f);
  if (!v?.yell) return;
  const now = performance.now();
  if (now - lastYellAny < YELL_ANY) return;
  const heavy = HEAVY.test(state ?? '') || f.stats.boss;
  if (Math.random() > (heavy ? 0.4 : 0.12)) return;
  lastYellAny = now;
  playSfx(scene, v.yell, { volume: f.stats.id === 'hound' ? 0.45 : 0.42, pitch: v.pitch, spread: v.spread, minGapMs: 200 });
}
