// Progress.js — Blood (experience), levels, skill points and each hero's picks. Pure
// logic: the arena feeds it what happened and saves it; the skill tree screen spends it.
//
// THE RULES
//   - Blood is shared: whoever you play, the kills feed one pool. Every LEVEL_STEP of
//     blood is a level, and every level is a skill point.
//   - Skill points are shared too: each hero spends the whole pool on their own tree
//     (picking Vexa after a run with Rurik, she has as many points as he had). Switching
//     heroes never means grinding again.
//   - First clear of each fight on a stage: +1 point. Each secret: +1. Each optional
//     challenge won: +1. Skills cost 2 / 4 / 6 by tier, so one hero's whole tree costs 36:
//     you choose, and a major is a real saving-up.
//   - Respec is free at any rest shrine.
//   - Enemy health never scales with your level: a damage upgrade always shows.
//
// Saved in the browser (localStorage) when it can be; without it, it lasts the session.

import { SKILL_TREES, nodesOf } from '../data/skills.js';
import { TROPHIES, TROPHY_SLOTS } from '../data/trophies.js';

export const PROGRESS = {
  key: 'bloodaxe.progress.v1',
  levelStep: 300,     // blood a level (a grunt is worth ~12, a brute ~25, an elite ~80)
  startPoints: 2,     // enough for one first-tier skill at the first shrine
  bloodPer: 1 / 6,    // blood for a kill = the man's max health x this
};

const fresh = () => ({ v: 1, blood: 0, bonus: PROGRESS.startPoints, picks: {}, claimed: {}, campaign: freshCampaign(), trophies: freshTrophies() });
// BOSS LOOT (data/trophies.js): every trophy taken (kept for good), and the ones worn
const freshTrophies = () => ({ owned: {}, worn: [] });
// THE CAMPAIGN (docs/campaign/plan.md): levels finished, the villagers saved (by id: they
// show up later) and lost, where to CONTINUE from (`at`: the level and the section whose
// checkpoint was reached last), and the one-time flags (a sequence's steps: the judgment)
const freshCampaign = () => ({ levels: {}, rescued: {}, lost: {}, at: null, flags: {} });

// The one Progress the game shares (kept in the Phaser registry; saved in the browser).
export function sharedProgress(registry) {
  if (!registry.get('progress')) {
    let store = null;
    try { store = window.localStorage; } catch { /* blocked: this session only */ }
    registry.set('progress', new Progress(store));
  }
  return registry.get('progress');
}

export class Progress {
  constructor(storage = null) {
    this.storage = storage;
    this.data = fresh();
    try {
      const raw = storage?.getItem(PROGRESS.key);
      if (raw) this.data = { ...fresh(), ...JSON.parse(raw) };
      this.data.campaign = { ...freshCampaign(), ...this.data.campaign };
      this.data.trophies = { ...freshTrophies(), ...this.data.trophies };
    } catch { /* no saved progress: start fresh */ }
  }

  save() {
    try { this.storage?.setItem(PROGRESS.key, JSON.stringify(this.data)); } catch { /* storage blocked */ }
  }

  // ------------------------------------------------------------ earning

  get level() { return 1 + Math.floor(this.data.blood / PROGRESS.levelStep); }
  get toNext() { return PROGRESS.levelStep - (this.data.blood % PROGRESS.levelStep); }
  // points earned in all (levels past the first + milestones)
  get earned() { return this.level - 1 + this.data.bonus; }

  // Blood for a kill. Returns the levels gained (0 or more).
  addBlood(amount) {
    const before = this.level;
    this.data.blood += Math.max(0, Math.round(amount));
    this.save();
    return this.level - before;
  }

  bloodFor(enemyStats) { return Math.max(4, Math.round(enemyStats.maxHealth * PROGRESS.bloodPer)); }

  // A one-off milestone (a fight's first clear, a secret, a challenge): +1 point once.
  claim(key) {
    if (this.data.claimed[key]) return false;
    this.data.claimed[key] = true;
    this.data.bonus++;
    this.save();
    return true;
  }

  // ------------------------------------------------------------ the campaign

  get campaign() { return this.data.campaign; }

  // A villager saved (once; later levels and the epilogue read the list)
  rescue(id) {
    if (this.campaign.rescued[id]) return false;
    this.campaign.rescued[id] = true;
    this.save();
    return true;
  }

  isRescued(id) { return !!this.campaign.rescued[id]; }

  // A villager lost (an execution, an escort) — until he's saved on a later try
  lose(id) {
    if (this.campaign.rescued[id] || this.campaign.lost[id]) return false;
    this.campaign.lost[id] = true;
    this.save();
    return true;
  }

  // The villagers saved / lost so far, by id
  rescuedIds() { return Object.keys(this.campaign.rescued); }
  lostIds() { return Object.keys(this.campaign.lost).filter((id) => !this.campaign.rescued[id]); }

  // A checkpoint reached: CONTINUE starts here.
  reach(level, section) {
    const at = this.campaign.at;
    if (at && at.level === level && at.section === section) return;
    this.campaign.at = { level, section };
    this.save();
  }

  // A one-time flag (a sequence's step). Returns true the first time.
  setFlag(key) {
    if (this.campaign.flags[key]) return false;
    this.campaign.flags[key] = true;
    this.save();
    return true;
  }

  // A level walked out of: CONTINUE now starts the next one. Returns true the first time.
  finishLevel(id, next = null) {
    if (next) this.campaign.at = { level: next, section: 0 };
    if (this.campaign.levels[id]) { this.save(); return false; }
    this.campaign.levels[id] = true;
    this.save();
    return true;
  }

  // ------------------------------------------------------------ trophies (boss loot)

  get trophies() { return this.data.trophies; }
  owns(id) { return !!this.trophies.owned[id]; }
  worn() { return this.trophies.worn.filter((id) => TROPHIES[id]); }

  // A trophy taken. Worn at once if a slot is free. Returns { fresh, worn }.
  addTrophy(id) {
    if (!TROPHIES[id]) return { fresh: false, worn: false };
    const fresh = !this.owns(id);
    this.trophies.owned[id] = true;
    const worn = fresh && this.wear(id);
    this.save();
    return { fresh, worn };
  }

  // Wear one (false when every slot is taken: take one off first)
  wear(id) {
    const T = this.trophies;
    if (!this.owns(id) || T.worn.includes(id) || T.worn.length >= TROPHY_SLOTS) return false;
    T.worn.push(id);
    this.save();
    return true;
  }

  unwear(id) {
    this.trophies.worn = this.trophies.worn.filter((x) => x !== id);
    this.save();
  }

  // ------------------------------------------------------------ spending

  picks(heroId) { return this.data.picks[heroId] ?? []; }
  spent(heroId) { return this.picks(heroId).reduce((n, id) => n + (nodesOf(heroId).find((x) => x.id === id)?.cost ?? 0), 0); }
  available(heroId) { return this.earned - this.spent(heroId); }
  has(heroId, id) { return this.picks(heroId).includes(id); }

  // Why a node can't be bought right now (null = it can).
  blocker(heroId, id) {
    const n = nodesOf(heroId).find((x) => x.id === id);
    if (!n) return 'unknown';
    if (n.planned) return 'planned'; // (a placeholder branch: shown, not built yet)
    if (this.has(heroId, id)) return 'owned';
    const missing = (n.req ?? []).filter((r) => !this.has(heroId, r));
    if (missing.length) return 'locked';
    if ((n.excl ?? []).some((x) => this.has(heroId, x))) return 'excluded';
    if (this.available(heroId) < n.cost) return 'points';
    return null;
  }

  buy(heroId, id) {
    if (this.blocker(heroId, id)) return false;
    this.data.picks[heroId] = [...this.picks(heroId), id];
    this.save();
    return true;
  }

  // Back to level 1 with the starting point: blood, every hero's picks and the one-off
  // point milestones (so first clears pay out again). The campaign's place, the villagers
  // and the trophies are kept. (The title's DIRECTOR'S CUT menu: RESET HERO LEVEL.)
  resetLevel() {
    Object.assign(this.data, { blood: 0, bonus: PROGRESS.startPoints, picks: {}, claimed: {} });
    this.save();
  }

  respec(heroId) {
    this.data.picks[heroId] = [];
    this.save();
  }

  reset() { this.data = fresh(); this.save(); }

  // ------------------------------------------------------------ the hero's stats

  // The hero's stats with his picks and worn trophies applied (a deep copy: the shared data is never touched).
  statsFor(heroId, base) {
    const picks = SKILL_TREES[heroId] ? this.picks(heroId) : [];
    const worn = this.worn();
    if (!picks.length && !worn.length) return base;
    const s = deepCopy(base);
    s.skills = {};
    for (const n of nodesOf(heroId)) if (picks.includes(n.id) && n.apply) n.apply(s);
    for (const id of worn) TROPHIES[id].apply(s); // (worn trophies: data/trophies.js)
    return s;
  }
}

function deepCopy(v) {
  if (Array.isArray(v)) return v.map(deepCopy);
  if (v && typeof v === 'object') {
    const o = {};
    for (const k of Object.keys(v)) o[k] = deepCopy(v[k]);
    return o;
  }
  return v;
}
