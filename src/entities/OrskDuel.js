// Orsk's duel uses the normal combat states: animation, hitboxes, parries and
// hitstop share one clock. No tracking once an attack has committed.
export function installOrsk(boss) {
  const base = boss.stats.moves;
  boss.stats = { ...boss.stats, size: 1.38, body: { ...boss.stats.body, w: 62, h: 132 }, walkSpeed: 225, depthSpeed: 170,
    moves: {
      ...base,
      light1: { ...base.light1, name: 'Breach Sweep', startup: 32, active: 4, recovery: 24,
        lunge: 105, recoil: 12, superArmor: true,
        hitbox: { x: 4, y: 30, w: 94, h: 65 },
        chains: [{ button: 'attack', next: 'light2', from: 43, to: 49 }] },
      light2: { ...base.light2, name: 'Return Cut', startup: 27, active: 4, recovery: 48,
        anim: 'slash', lunge: 90, recoil: 8, superArmor: true,
        hitbox: { x: 0, y: 25, w: 100, h: 70 }, chains: [] },
      heavy: { ...base.heavy, name: 'Delayed Execution', startup: 56, active: 5, recovery: 64,
        lunge: 170, recoil: 8, superArmor: true, damage: 24,
        hitbox: { x: 2, y: 0, w: 105, h: 115 } },
      special1: { ...base.special1, name: 'Siegebreaker Rush', startup: 42, active: 23, recovery: 62,
        lunge: 590, recoil: 10, superArmor: true, damage: 16 },
    },
  };
  boss.orsk = { beat: 0, wait: 36, committed: false, combo: false, orbit: 1 };
  boss.script = orskDuel;
}

export function orskDuel(brain, target) {
  const f = brain.fighter;
  const d = f.orsk;
  const canMove = f.state === 'idle' || f.state === 'walk';
  if (!canMove) {
    // The return cut is announced by the first attack's visible recovery beat.
    // It retains the original facing: crossing behind him is a real escape.
    if (d.combo && f.state === 'light1' && f.fsm.frame >= 43 && f.fsm.frame <= 49) {
      brain.registerPress('attack'); d.combo = false;
    }
    return true;
  }
  if (d.committed) {
    d.committed = false; d.combo = false;
    d.wait = f.phase >= 2 ? 16 : 28;
    d.orbit *= -1;
  }
  const dx = target.x - f.x, dz = target.z - f.z;
  const side = Math.sign(dx) || f.facing;
  brain.facingHint = side;
  const wall = brain.world.barriers?.between(f, target.x);
  if (wall) { brain.atWall(wall, target); return true; }
  if (Math.abs((target.floor ?? 0) - (f.floor ?? 0)) > 40) {
    brain.moveX = Math.sign(dx); brain.moveZ = Math.sign(dz);
    brain.terrainSteer(target); return true;
  }
  if (d.wait > 0) d.wait--;
  const b = brain.world.bounds;
  const orbitZ = Math.max(b.minZ + 25, Math.min(b.maxZ - 25, target.z + d.orbit * 32));
  if (Math.abs(dx) > 145) brain.moveX = side * 1.05;
  else if (Math.abs(dx) < 75) brain.moveX = -side * 0.85;
  if (d.wait > 0) {
    if (Math.abs(orbitZ - f.z) > 8) brain.moveZ = Math.sign(orbitZ - f.z) * 0.9;
    brain.terrainSteer(target); return true;
  }
  if (Math.abs(dz) > 16) {
    brain.moveZ = Math.sign(dz);
    brain.terrainSteer(target); return true;
  }
  let move;
  if (Math.abs(dx) >= 185 && Math.abs(dx) <= 420) move = 'special1';
  else if (Math.abs(dx) <= 150) move = d.beat % 3 === 1 ? 'heavy' : 'light1';
  else { brain.terrainSteer(target); return true; }
  d.beat++; d.committed = true; d.combo = move === 'light1';
  brain.moveX = brain.moveZ = 0;
  f.facing = side;
  f.fsm.change(move);
  return true;
}
