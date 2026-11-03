// LevelRank.js — THE LEVEL'S GRADE: S, A, B or C, stamped on the screen when a level is
// won (scenes/HUDScene.js showVictory, view/RankStamp.js). Nick, 2026-11-03: "the highest
// score is S then A B C, S being hard but achievable".
//
// The grade is read off the stage's own stats (stage/Stage.js `stats`), as points out of
// what this level could give. A part a level doesn't have (no villagers to save, no
// secrets hidden) is left out of the sum rather than counted against you.
//
//   SURVIVAL  25  no deaths. One death costs half of it; three, all of it.
//   HEALTH    25  how little you bled: health bars lost across the level (3 bars = none left)
//   STYLE     20  the best style rank the fight reached (combat/Style.js): S or better = all
//   EXECUTIONS 10 a quarter of the kills done as finishers = all of it
//   SAVED     10  villagers saved out of those who could have been (campaign levels)
//   SECRETS    5  secrets found
//   TIME       5  within par (a minute plus 10 s a foe) = all; twice par = none
//
// S needs 85 and NO deaths: a clean, stylish run that loses about one bar of health and
// saves everyone. Two bars lost or a slow, plain fight drops it to A.
//
// Pure: no Phaser, so tests/logic-test.js grades runs without a browser.

export const LEVEL_RANK = {
  grades: [
    { letter: 'S', at: 85, word: 'BLOOD  AXE' },
    { letter: 'A', at: 70, word: 'SAVAGE' },
    { letter: 'B', at: 50, word: 'BLOODED' },
    { letter: 'C', at: 0, word: 'SURVIVED' },
  ],
  sNeedsNoDeaths: true,
  weights: { survival: 25, health: 25, style: 20, executions: 10, saved: 10, secrets: 5, time: 5 },
  deathShare: [1, 0.5, 0.2, 0], // survival kept at 0, 1, 2, 3+ deaths
  barsToNothing: 3,             // health bars lost before HEALTH gives nothing
  styleFull: 4,                 // combat/Style.js rank index: 4 = S (D C B A S SS SSS)
  executionsFull: 0.25,         // share of kills done as finishers for all of EXECUTIONS
  par: { base: 60, perFoe: 10 }, // seconds
};

const clamp01 = (v) => Math.max(0, Math.min(1, v));

// The par time for a stage's data, in seconds (data.par overrides it).
export function parSeconds(data) {
  if (data?.par) return data.par;
  let foes = 0;
  for (const sec of data?.sections ?? []) {
    for (const w of sec.waves ?? []) foes += w.length;
    if (sec.boss) foes += 3; // (a boss is worth a few men's time)
  }
  return LEVEL_RANK.par.base + LEVEL_RANK.par.perFoe * foes;
}

// stats: the stage's stats at the win, plus (optional) saved / lost (counts or name
// lists) and par (seconds). Returns { letter, word, score (0..100), tier (0 = S..3 = C),
// parts: [{ id, got, of }] }.
export function levelRank(stats) {
  const W = LEVEL_RANK.weights, R = LEVEL_RANK;
  const parts = [];
  const add = (id, share) => parts.push({ id, got: W[id] * clamp01(share), of: W[id] });
  const deaths = stats.deaths ?? 0;
  add('survival', R.deathShare[Math.min(deaths, R.deathShare.length - 1)]);
  const bars = (stats.damage ?? 0) / Math.max(1, stats.maxHealth ?? 100);
  add('health', 1 - bars / R.barsToNothing);
  add('style', (stats.peakStyle ?? 0) / R.styleFull);
  const kills = stats.kills ?? 0;
  if (kills > 0) add('executions', (stats.finishers ?? 0) / kills / R.executionsFull);
  const count = (v) => (Array.isArray(v) ? v.length : v ?? 0);
  const saved = count(stats.saved), lost = count(stats.lost);
  if (saved + lost > 0) add('saved', saved / (saved + lost));
  if ((stats.secretsTotal ?? 0) > 0) add('secrets', (stats.secrets ?? 0) / stats.secretsTotal);
  if (stats.par > 0 && stats.frames != null) {
    const secs = stats.frames / 60;
    add('time', secs <= stats.par ? 1 : 2 - secs / stats.par);
  }
  const got = parts.reduce((s, p) => s + p.got, 0), of = parts.reduce((s, p) => s + p.of, 0);
  const score = Math.round((100 * got) / Math.max(1, of));
  let tier = R.grades.findIndex((g) => score >= g.at);
  if (tier === 0 && R.sNeedsNoDeaths && deaths > 0) tier = 1;
  const g = R.grades[tier];
  return { letter: g.letter, word: g.word, score, tier, parts };
}
