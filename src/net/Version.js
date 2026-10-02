// Version.js — A fingerprint of everything the simulation is made of.
//
// Online co-op only works when both browsers run exactly the same game: the two
// machines simulate the fight separately and only swap button presses (net/Session.js),
// so one stale copy (an old page still cached in a friend's browser) drifts apart at
// once. The fingerprint is worked out from the game's own rules — the hero, enemy and
// stage numbers and the source of the code that runs the fight — so it changes whenever
// any of them does, with nothing to remember to bump.
//
// It goes into the room name (net/Link.js): two different versions can't even meet, and
// the lobby shows it so two players can compare it out loud.

import { CHARACTERS } from '../data/characters.js';
import { ENEMIES, WAVES } from '../data/enemies.js';
import { STAGE, PICKUPS, PROPS } from '../data/stage.js';
import { ACTIONS } from '../core/TickInput.js';
import { World } from '../core/World.js';
import { Stage } from '../stage/Stage.js';
import { CombatSystem } from '../combat/CombatSystem.js';
import { Fighter } from '../entities/Fighter.js';
import { EnemyBrain, createEnemy } from '../entities/Enemy.js';
import { Projectile } from '../entities/Projectile.js';
import { Barriers } from '../combat/Barrier.js';
import { Mines } from '../combat/Mine.js';
import * as states from '../entities/fighterStates.js';
import * as mage from '../combat/Mage.js';
import * as rogue from '../combat/Rogue.js';
import * as finisher from '../combat/Finisher.js';
import * as session from './Session.js';

// The source text of a value: functions and classes as written, data as JSON, and the
// functions inside objects (the fighter states) too.
function text(v, depth = 0) {
  if (typeof v === 'function') return String(v);
  if (v && typeof v === 'object' && depth < 4) {
    return Object.keys(v).sort().map((k) => `${k}:${text(v[k], depth + 1)}`).join('|');
  }
  return JSON.stringify(v) ?? '';
}

let cached = null;
export function simVersion() {
  if (cached) return cached;
  const src = [CHARACTERS, ENEMIES, WAVES, STAGE, PICKUPS, PROPS, ACTIONS,
    World, Stage, CombatSystem, Fighter, EnemyBrain, createEnemy, Projectile, Barriers, Mines,
    { ...states }, { ...mage }, { ...rogue }, { ...finisher }, { ...session }].map((v) => text(v)).join('\n');
  let h = 2166136261;
  for (let i = 0; i < src.length; i++) { h ^= src.charCodeAt(i); h = Math.imul(h, 16777619); }
  cached = (h >>> 0).toString(36).toUpperCase().padStart(7, '0').slice(-5);
  return cached;
}
