// testMode.js — TEST MODE, for playtesting: the heroes can't die and never run out of
// mana or stamina, and a few keys jump between levels and checkpoints.
//
// Turn it on with ?test=1 on the game's address, or SHIFT+F9 in a fight (again to turn
// it off). Off in normal play, and never online (one machine alone can't bend the rules
// without splitting the two games apart). A "TEST MODE" tag sits in the corner while on.
//
// In a fight, with test mode on:
//   END        next checkpoint (the level's next section; from the last, the next level)
//   PAGE UP    previous level      PAGE DOWN  next level
// (levels in campaign order, then the Oath Road and the Gallows Ascent: levelOrder())
// (these keys are bound in scenes/ArenaScene.js: setupTestKeys)

import { STAGES } from '../data/stages.js';

const fromUrl = () => {
  try { return /^(1|true|on|)$/i.test(new URLSearchParams(location.search).get('test') ?? 'x'); } catch { return false; }
};

export const TEST = { on: typeof location !== 'undefined' && fromUrl() };

export function toggleTestMode() {
  TEST.on = !TEST.on;
  showTestTag();
  return TEST.on;
}

// Every stage, in the order PAGE UP / PAGE DOWN walk them: the campaign from its first level (each
// names the next), then whatever else is built.
export function levelOrder(stages = STAGES) {
  const order = [];
  for (let id = 'village'; stages[id] && !order.includes(id); id = stages[id].next?.id) order.push(id);
  for (const id of Object.keys(stages)) if (!order.includes(id)) order.push(id);
  return order;
}

// The level `step` places along levelOrder() from `id` (wraps round).
export function levelAfter(id, step = 1, stages = STAGES) {
  const order = levelOrder(stages);
  const i = Math.max(0, order.indexOf(id));
  return order[(i + step + order.length) % order.length];
}

// Each tick, with test mode on: the heroes topped up (the damage clamps in
// CombatSystem / Stage keep them from ever reaching 0 in between: f.immortal).
export function applyTestMode(players) {
  for (const p of players) {
    p.immortal = TEST.on;
    if (!TEST.on || !p.alive) continue;
    p.health = p.stats.maxHealth;
    p.mana = p.stats.maxMana;
    p.stamina = p.stats.maxStamina;
  }
}

// The corner tag (a page element, so it sits over every scene at any zoom).
export function showTestTag() {
  if (typeof document === 'undefined') return;
  let el = document.getElementById('test-tag');
  if (!el) {
    el = document.createElement('div');
    el.id = 'test-tag';
    el.style.cssText = 'position:fixed;top:8px;right:10px;padding:4px 10px;background:rgba(20,6,6,.85);color:#ffd27a;font:12px Georgia,serif;border:1px solid #a06a20;border-radius:4px;z-index:10;pointer-events:none;white-space:pre;text-align:right';
    el.textContent = 'TEST MODE · no death, full mana\nEND next checkpoint · PG UP / PG DN level';
    document.body.appendChild(el);
  }
  el.style.display = TEST.on ? 'block' : 'none';
}
