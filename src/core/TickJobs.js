// TickJobs.js — Effects that run once per game tick (ArenaScene.everyTick).
// A job is fn(t) with .t (ticks run) and .n (how many to run); it ends early by returning false.

// Run each of owner.tickJobs once and keep the ones still going. A job may start new
// jobs while it runs (the Storm Judgment's gather throws a fresh bolt every few ticks):
// those are kept too, not lost. A lost bolt never got to clear itself and stayed drawn.
export function runTickJobs(owner) {
  const jobs = owner.tickJobs;
  owner.tickJobs = [];
  const kept = jobs.filter((j) => j(++j.t) !== false && j.t < (j.n ?? 999));
  owner.tickJobs = kept.concat(owner.tickJobs);
}
