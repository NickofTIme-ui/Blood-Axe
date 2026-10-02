// film.js — Dev tool: step the game by hand and lay close-up frames out as a contact
// sheet over the page, to check an animation frame by frame. Load from the console:
//   const F = await import('/tools/film.js'); await F.boot('warrior');
//   await F.runner('impale'); F.seq([12, 19, 20, 30]);

const sl = (ms) => new Promise((r) => setTimeout(r, ms));
let g; let a; let T; let ctx; let auto = true;
export const view = { dx: 50, dy: -95, ww: 230, wh: 210, cols: 2, rows: 2 };

export function step(n = 1) {
  // (the stopped loop's own delta is what tweens read: keep it at one frame)
  for (let i = 0; i < n; i++) { T += 16.7; g.loop.delta = 16.7; g.loop.rawDelta = 16.7; g.step(T, 16.7); }
}

// Start the game (hidden panes don't run it by themselves), go straight to the arena,
// clear it, and freeze: from here on only step() advances time.
export async function boot(characterId = 'warrior') {
  g = window.game ?? window.__game ?? window.Phaser.GAMES[0];
  T = performance.now();
  (async () => { while (auto) { await sl(16); T = Math.max(T + 16.7, performance.now()); try { g.step(T, 16.7); } catch (e) { window.__err = `${e.message} ${(e.stack ?? '').slice(0, 400)}`; } } })();
  const wait = async (f) => { const t = Date.now(); while (!f() && Date.now() - t < 40000) await sl(50); };
  await wait(() => g.scene.getScene('Title')?.button);
  g.scene.getScene('Title').scene.start('Arena', { characterId });
  await wait(() => g.scene.isActive('Arena') && g.scene.getScene('HUD')?.card?.active);
  await sl(400);
  a = g.scene.getScene('Arena');
  g.events.off('blur'); g.events.off('hidden');
  a.setPaused(false);
  a.stage.update = () => {};
  auto = false;
  g.loop.stop();
  await sl(60);
  const ov = document.createElement('canvas');
  ov.width = 1012; ov.height = 924;
  ov.style.cssText = 'position:fixed;left:0;top:0;width:100vw;height:100vh;z-index:9999;background:#000';
  document.body.appendChild(ov);
  ctx = ov.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  window.__film = { g, a };
  return a;
}

export function tile(i, label, cx = a.player.x) {
  const V = view;
  const wv = a.cameras.main.worldView;
  const sc = g.canvas.width / wv.width;
  const tw = 1012 / V.cols; const th = 924 / V.rows;
  const sx = (cx + V.dx - V.ww / 2 - wv.x) * sc;
  const sy = (a.player.z + V.dy - V.wh / 2 - wv.y) * sc;
  const tx = (i % V.cols) * tw; const ty = Math.floor(i / V.cols) * th;
  ctx.fillStyle = '#000'; ctx.fillRect(tx, ty, tw, th);
  ctx.drawImage(g.canvas, sx, sy, V.ww * sc, V.wh * sc, tx, ty, tw, th);
  ctx.fillStyle = '#fff'; ctx.font = '26px monospace'; ctx.fillText(label, tx + 8, ty + 30);
}

// advance until the player's state frame reaches n (hit-stop included)
export function to(n) {
  let k = 0;
  while (a.player.fsm.frame < n && a.player.state === 'execute' && k++ < 400) step(1);
  return a.player.fsm.frame;
}
export function seq(frames, cx) {
  frames.forEach((n, i) => { const fr = to(n); tile(i, `f${fr}`, cx); });
  return window.__err;
}
// Same, but one step per real 1/60 s — tweens run on the wall clock, so effects that
// fade (streaks, rings) only look right filmed this way.
export async function seqRT(frames, cx) {
  for (let i = 0; i < frames.length; i++) {
    let k = 0;
    while (a.player.fsm.frame < frames[i] && a.player.state === 'execute' && k++ < 400) { await sl(16); step(1); } // (tile straight after a step: the GL buffer is only readable then)
    tile(i, `f${a.player.fsm.frame}`, cx);
  }
  return window.__err;
}
export async function wait(n) { for (let i = 0; i < n; i++) { step(1); await sl(16); } }

// Fleeing one-armed runners ahead of the player, and the finisher started on them.
// offsets: px ahead of the player for each runner; kind: 'impale' | 'throat' | 'halve' | 'chain'
export async function runner(kind = 'impale', offsets = [75], id = 'grunt', maim = { armB: true }) {
  const { createEnemy } = await import('/src/entities/Enemy.js');
  for (const f of a.world.fighters) if (f.team === 'enemy') f.removeMe = true;
  const p = a.player;
  p.fsm.change('idle'); p.x = 600; p.z = 440; p.facing = 1; p.health = p.stats.maxHealth;
  step(3);
  const es = offsets.map((o) => { const e = createEnemy(a.world, id, 600 + o, 440); e.maimed = { ...maim }; e.controller.scared = true; return e; });
  step(25);
  es.forEach((e, i) => { e.fsm.change('walk'); const o = offsets[i]; e.x = 600 + (o.x ?? o); e.z = 440 + (o.z ?? 0); e.facing = 1; e.vx = 200; });
  p.x = 600; p.z = 440; p.facing = 1;
  p.fsm.change('execute', { kind, targets: es });
  return es;
}
