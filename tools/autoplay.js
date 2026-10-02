// autoplay.js — Dev tool: a bot plays THE OATH ROAD from the gate to the boss, fast, and
// logs what happened (stage events, kills, finishers, errors). For shaking out bugs.
//   const A = await import('/tools/autoplay.js'); await A.boot('warrior'); await A.run({ god: true });

const sl = (ms) => new Promise((r) => setTimeout(r, ms));
let g; let a; let T;
export const log = [];
export const errors = [];

function step(n = 1) {
  for (let i = 0; i < n; i++) {
    T += 16.7;
    try { g.step(T, 16.7); } catch (e) { errors.push(`${e.message} @ ${(e.stack ?? '').split('\n').slice(1, 3).join(' | ')}`); }
  }
}

export async function boot(characterId = 'warrior', data = null) {
  g = window.game ?? window.Phaser.GAMES[0];
  T = performance.now();
  window.addEventListener('error', (e) => errors.push(`window: ${e.message}`));
  let auto = true;
  (async () => { while (auto) { await sl(16); T = Math.max(T + 16.7, performance.now()); try { g.step(T, 16.7); } catch (e) { errors.push(e.message); } } })();
  const wait = async (f) => { const t = Date.now(); while (!f() && Date.now() - t < 40000) await sl(50); };
  await wait(() => g.scene.getScene('Title')?.button);
  g.scene.getScene('Title').scene.start('Arena', data ?? { characterId });
  await wait(() => g.scene.isActive('Arena') && g.scene.getScene('HUD')?.card?.active);
  await sl(300);
  auto = false;
  g.loop.stop();
  await sl(40);
  a = g.scene.getScene('Arena');
  g.events.off('blur'); g.events.off('hidden');
  a.setPaused(false);
  const ev = a.world.events;
  for (const n of ['sectionStart', 'sectionClear', 'bossSpawn', 'bossRage', 'stageWon', 'secretFound', 'propBreak', 'finisherStart', 'maim']) {
    ev.on(n, (e) => log.push(`${a.world.frame} ${n} ${e?.index ?? e?.kind ?? e?.prop?.kind ?? e?.limb ?? ''}`));
  }
  ev.on('pickup', (e) => log.push(`${a.world.frame} pickup ${e.pickup.kind}`));
  ev.on('hazardHit', (e) => { if (e.fighter === a.player) log.push(`${a.world.frame} hazardHit ${e.kind}`); });
  window.__auto = { g, a, log, errors };
  return a;
}

// The bot: fight whoever's nearest, smash props on the way, otherwise press on right.
function brain(opts, p = a.player, c = a.controls) {
  let t = 0;
  c.sample = function sample() {
    t++;
    this.held = {};
    this.moveX = 0; this.moveZ = 0;
    if (!p.alive) { if (t % 90 === 0) this.registerPress('restart'); return; }
    const foes = a.world.fighters.filter((f) => f.team === 'enemy' && f.alive);
    let tgt = null; let best = Infinity;
    for (const f of foes) { const d = Math.abs(f.x - p.x) + Math.abs(f.z - p.z) * 2; if (d < best) { best = d; tgt = f; } }
    let goal = null; let hit = false;
    if (tgt) {
      const side = p.x < tgt.x ? -1 : 1;
      goal = { x: tgt.x + side * 52, z: tgt.z };
      hit = Math.abs(tgt.x - p.x) < 80 && Math.abs(tgt.z - p.z) < 16;
      if (hit) this.moveX = Math.sign(tgt.x - p.x) * 0.01; // face him
    } else {
      const prop = a.stage.props.find((q) => !q.broken && q.section === a.stage.index && Math.abs(q.x - p.x) < 700);
      const pk = a.stage.pickups.find((q) => Math.abs(q.x - p.x) < 600);
      if (prop) {
        const side = p.x < prop.x ? -1 : 1;
        goal = { x: prop.x + side * 44, z: prop.kind === 'wall' ? a.world.bounds.minZ + 4 : prop.z };
        hit = Math.abs(goal.x - p.x) < 10 && Math.abs(goal.z - p.z) < 10;
        if (hit) this.moveX = Math.sign(prop.x - p.x) * 0.01;
      } else if (pk) goal = { x: pk.x, z: pk.z };
      else goal = { x: a.world.bounds.maxX + 50, z: 430 };
    }
    if (!hit && goal) {
      if (Math.abs(goal.x - p.x) > 6) this.moveX = Math.sign(goal.x - p.x);
      if (Math.abs(goal.z - p.z) > 5) this.moveZ = Math.sign(goal.z - p.z);
    }
    if (hit) {
      const r = t % 60;
      if (opts.finish && tgt?.controller?.scared) { if (t % 20 === 0) this.registerPress(['attack', 'heavy'][(t / 20) % 2 | 0]); if ((t / 100 | 0) % 2) this.held.attack = true; }
      else if (r === 0 || r === 14 || r === 28) this.registerPress('attack');
      else if (r === 44) this.registerPress(t % 180 < 60 ? 'kick' : 'heavy');
    }
    if (this.moveX < 0) this.held.left = true; if (this.moveX > 0) this.held.right = true;
  };
}

// Play until the stage is won (or maxFrames). god: the player can't die.
export async function run({ god = true, maxFrames = 60 * 60 * 6, finish = true, until = null } = {}) {
  // every hero on this machine gets a bot (two-player: one each)
  (a.session.samplers ?? [a.controls]).forEach((smp, i) => brain({ finish }, a.session.net ? a.player : a.players[i], smp));
  const p = a.player;
  let stuck = 0; let lastX = p.x; let lastKills = 0;
  for (let f = 0; f < maxFrames; f += 30) {
    for (let i = 0; i < 30; i++) {
      if (god) for (const q of a.players) if (q.alive) q.health = Math.max(q.health, q.stats.maxHealth * 0.6);
      step(1);
    }
    if (errors.length > 20) break;
    if (a.stage.phase === 'won') { step(240); break; }
    if (until && until()) break;
    // stuck detector: no movement and no kills for a long time
    if (Math.abs(p.x - lastX) < 4 && a.stage.stats.kills === lastKills) stuck += 30; else stuck = 0;
    lastX = p.x; lastKills = a.stage.stats.kills;
    if (stuck === 900) log.push(`${a.world.frame} STUCK x${Math.round(p.x)} z${Math.round(p.z)} sec${a.stage.index} phase ${a.stage.phase} foes ${a.world.fighters.filter((q) => q.team === 'enemy').map((q) => `${q.stats.id}:${q.state}@${Math.round(q.x)}`).join(',')}`);
    if (stuck > 2400) break;
    if (f % 600 === 0) await sl(0);
  }
  return { frame: a.world.frame, phase: a.stage.phase, section: a.stage.index, stats: a.stage.stats, px: Math.round(p.x), errors: errors.slice(0, 8), log: log.slice(-60) };
}

export function shot() { step(1); }
export { step };
