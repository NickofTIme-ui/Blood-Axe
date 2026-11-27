// Arbalest.js — how the Iron Gates' crossbowmen fight (data/gatesEnemies.js `arbalest`).
// His brain's script (entities/Enemy.js `f.script`): he keeps his distance, steps onto his
// man's line, aims (special1 standing / special2 kneeling: the long red line, drawn by
// view/GatesFoesView.js), looses one bolt that flies the lane, then cranks the windlass
// (heavy: slow, open). A man who comes within the stock's reach gets clubbed (the normal
// fight, light1), and he backs off again to shoot when he can.

import { ARBALEST, ARBALEST_BOLT } from '../data/gatesEnemies.js';

const BUSY = ['special1', 'special2', 'heavy', 'light1', 'hitstun', 'knockdown', 'stagger', 'guardBreak', 'getup', 'block'];

export function arbalestScript(brain, target) {
  const f = brain.fighter;
  const world = brain.world;
  if (f.maimed?.armF || f.maimed?.armB) return false; // (an arm gone: no crossbow, he runs)
  f.loaded ??= true;
  // the bolt leaves on the shot's first active frame
  if ((f.state === 'special1' || f.state === 'special2') && f.move?.shot) {
    if (f.fsm.frame > f.move.startup && f.shotFor !== f.fsm.enterCount) {
      f.shotFor = f.fsm.enterCount;
      f.loaded = false;
      const kneel = !!f.move.kneel;
      world.spawnProjectile(f, { ...ARBALEST_BOLT, y: kneel ? 46 : ARBALEST_BOLT.y }, {
        x: f.x + f.facing * 52, z: f.z, h: (f.floor ?? 0) + (kneel ? 46 : ARBALEST_BOLT.y), vx: f.facing * ARBALEST_BOLT.speed,
      });
      world.events.emit('arbalestLoose', { fighter: f, kneel });
    }
    return true;
  }
  if (f.state === 'heavy' && f.move?.reload) {
    if (f.fsm.frame >= f.move.startup) f.loaded = true;
    return true;
  }
  if (BUSY.includes(f.state)) return true;
  if (brain.cooldown > 0) brain.cooldown--;

  const dx = target.x - f.x;
  const dz = target.z - f.z;
  const adx = Math.abs(dx);
  const side = Math.sign(dx) || f.facing;
  brain.facingHint = side;
  // too close: the stock (the ordinary fight), unless he can still slip back
  if (adx < ARBALEST.tooClose) {
    if (f.loaded && brain.roll(51 + world.frame % 7) < 0.02) brain.moveX = -side;
    return false;
  }
  // empty: wind the windlass (wherever he stands)
  if (!f.loaded) {
    brain.registerPress('heavy');
    return true;
  }
  const [near, far] = ARBALEST.range;
  if (adx < near) brain.moveX = -side;
  else if (adx > far) brain.moveX = side;
  if (Math.abs(dz) > ARBALEST.alignZ * 0.5) brain.moveZ = Math.sign(dz);
  const onLine = Math.abs(dz) <= ARBALEST.alignZ * 2;
  if (onLine && adx >= near * 0.8 && adx <= far * 1.15 && brain.cooldown <= 0 && target.alive && !target.invincible) {
    brain.registerPress(brain.roll(52) < 0.3 ? 'special2' : 'special1');
    brain.cooldown = brain.randInt([50, 90], 53);
    brain.moveX = 0; brain.moveZ = 0;
  }
  return true;
}
