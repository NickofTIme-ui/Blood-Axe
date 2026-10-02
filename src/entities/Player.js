// Player.js — Creates a player-controlled fighter from a character id in
// data/characters.js. The controller is usually an InputManager (keyboard/gamepad).
// Later: pass a second InputManager here for local co-op.

import { Fighter } from './Fighter.js';
import { CHARACTERS } from '../data/characters.js';

export function createPlayer(world, controller, characterId, x, z) {
  const stats = CHARACTERS[characterId];
  if (!stats) throw new Error(`Unknown character: ${characterId}`);
  const f = new Fighter({ stats, team: 'player', x, z, controller });
  return world.addFighter(f);
}
