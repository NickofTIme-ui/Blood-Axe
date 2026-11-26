// Executions.js — WHAT AN EXECUTION GIVES BACK (Nick, 2026-11-26: "executions grant 20
// percent health, stamina and mana each time"). Every man a hero executes (Rurik's
// throat / impale / halve / chain, Oryn's and Vexa's finishers, a boss's sentence) puts
// back a fifth of that hero's MAXIMUM health, stamina and mana, capped at full. A hero
// without one of those bars just skips it.
//
// One place for all three heroes: it listens to the world's 'kill' events, so any
// finisher that reports its kill with `finisher` (or a sentence with `sentence`) counts,
// whoever's code it lives in. Sim-side, so both games of an online co-op agree. The
// scene shows the cue on 'executionRestore' (scenes/ArenaScene.js).

export const EXECUTION_RESTORE = {
  share: 0.2, // of each bar's maximum, per man executed
  bars: [['health', 'maxHealth'], ['stamina', 'maxStamina'], ['mana', 'maxMana']],
};

export const isExecution = (e) => !!(e?.finisher || e?.sentence);

// Put the share back on f. Returns what each bar actually gained (0 if it was full or
// the hero has no such bar).
export function restoreFromExecution(f, share = EXECUTION_RESTORE.share) {
  const gained = {};
  for (const [bar, maxKey] of EXECUTION_RESTORE.bars) {
    const max = f.stats?.[maxKey];
    if (!(max > 0) || typeof f[bar] !== 'number') { gained[bar] = 0; continue; }
    const before = f[bar];
    f[bar] = Math.min(max, before + max * share);
    gained[bar] = f[bar] - before;
  }
  return gained;
}

export function installExecutions(world) {
  world.events.on('kill', (e) => {
    const f = e.attacker;
    if (!isExecution(e) || !f || f.team !== 'player' || !f.alive || f.removeMe) return;
    if (e.defender?.team === f.team) return;
    const gained = restoreFromExecution(f);
    world.events.emit('executionRestore', { fighter: f, gained });
  });
}
