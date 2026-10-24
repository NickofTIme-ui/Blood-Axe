// perf-profile.mjs — dev tool: boots the game headless, lets the sweep bot play a level for
// N frames with the loop stepped by hand, and reports per-frame JS time (update / render)
// plus the hottest functions from a CPU profile.
//   node tools/perf-profile.mjs [stage] [section] [frames] [out.json]   (from the repo root; SHOT=x.png for a screenshot)
import fs from 'node:fs'; import http from 'node:http'; import path from 'node:path';
import { createRequire } from 'node:module'; const { chromium } = createRequire(import.meta.url)('playwright');
const [stage = 'village', section = '0', frames = '1200', out = ''] = process.argv.slice(2);
const root = process.cwd();
const types = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.ttf': 'font/ttf', '.wav': 'audio/wav', '.mp3': 'audio/mpeg', '.webp': 'image/webp', '.mp4': 'video/mp4' };
const server = http.createServer((req, res) => { const name = decodeURIComponent(new URL(req.url, 'http://localhost').pathname); const file = path.resolve(root, '.' + (name === '/' ? '/index.html' : name)); if (!file.startsWith(root + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) { res.writeHead(404); res.end(); return; } res.setHeader('Content-Type', types[path.extname(file)] ?? 'application/octet-stream'); fs.createReadStream(file).pipe(res); });
await new Promise((r) => server.listen(8143, '127.0.0.1', r)); server.unref();
const browser = await chromium.launch({ headless: true, args: ['--disable-dev-shm-usage', '--autoplay-policy=no-user-gesture-required'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const errors = []; page.on('pageerror', (e) => { errors.push(e.message); console.log('PAGE ERROR', e.message); });
page.on('console', (m) => { const t = m.text(); if (m.type() === 'error' || /missing|not found|failed|__MISSING/i.test(t)) { errors.push(t.slice(0, 200)); console.log('CONSOLE', m.type(), t.slice(0, 200)); } });
await page.addInitScript(() => {
  const C = (window.__gl = { draw: 0, tex: 0, texBytes: 0, buf: 0 });
  for (const P of [WebGLRenderingContext.prototype, WebGL2RenderingContext.prototype]) {
    for (const m of ['drawArrays', 'drawElements']) { const o = P[m]; P[m] = function (...a) { C.draw++; return o.apply(this, a); }; }
    const t = P.texImage2D; P.texImage2D = function (...a) { C.tex++; const src = a[a.length - 1]; C.texBytes += (src?.width ?? a[3] ?? 0) * (src?.height ?? a[4] ?? 0) * 4; return t.apply(this, a); };
    const b = P.bufferSubData; P.bufferSubData = function (...a) { C.buf++; return b.apply(this, a); };
  }
});
await page.addInitScript(() => { const get = document.getElementById.bind(document); document.getElementById = (id) => (id === 'studio-intro' ? null : get(id)); document.addEventListener('DOMContentLoaded', () => document.querySelector('#studio-intro')?.remove()); });
await page.goto('http://127.0.0.1:8143/?mute=1', { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => window.game?.scene?.isActive('Title'), null, { timeout: 240000 });
console.log('boot ok');
await page.evaluate(({ stage, section }) => { window.game.scene.getScene('Title').scene.start('Arena', { mode: 'solo', characterId: 'warrior', stage, section: +section }); }, { stage, section });
await page.waitForFunction(() => window.game.scene.getScene('Arena')?.stage && window.game.scene.isActive('Arena'), null, { timeout: 120000 });
await page.waitForTimeout(3000);
// the bot takes over the hero's buttons; the loop is stepped by hand from here
await page.evaluate(async () => {
  const { SweepBot } = await import('/tools/campaign-sweep.js');
  const g = window.game; const a = g.scene.getScene('Arena');
  const bot = new SweepBot();
  const s = a.player.stats;
  Object.assign(bot, { me: a.player, world: a.world, stage: a.stage, reach: Math.round(s.walkSpeed * 2 * s.jumpStrength / s.gravity * 0.95) });
  bot.lastPresses = [];
  bot.registerPress = function (x) { this.lastPresses.push(x); };
  bot.read = function () { this.lastPresses = []; this.tick(false); };
  a.session.samplers[0] = { read: () => bot.read(), get held() { return bot.held; }, get lastPresses() { return bot.lastPresses; }, get moveX() { return bot.moveX; }, get moveZ() { return bot.moveZ; } };
  a.player.invincible = true;
  g.loop.stop();
  const sm = g.scene; const ren = g.renderer;
  const upd = sm.update.bind(sm); const rnd = sm.render.bind(sm);
  window.__perf = { u: [], r: [], t: [] };
  let uT = 0; let rT = 0;
  sm.update = (t, d) => { const s0 = performance.now(); upd(t, d); uT = performance.now() - s0; };
  sm.render = (r) => { const s0 = performance.now(); rnd(r); rT = performance.now() - s0; };
  let T = performance.now();
  window.__stepN = (n) => {
    for (let i = 0; i < n; i++) {
      T += 1000 / 60;
      const s0 = performance.now();
      g.step(T, 1000 / 60);
      // flush the GPU so render cost is not hidden in the next frame
      const t = performance.now() - s0;
      window.__perf.u.push(uT); window.__perf.r.push(rT); window.__perf.t.push(t);
    }
    const a2 = g.scene.getScene('Arena');
    return { x: Math.round(a2.player.x), sec: a2.stage.section?.id, objs: a2.children.list.length, enemies: a2.world.fighters.length };
  };
});
// warm up
for (let i = 0; i < 4; i++) console.log('warm', JSON.stringify(await page.evaluate(() => window.__stepN(60))));
await page.evaluate(() => { window.__perf = { u: [], r: [], t: [] }; Object.assign(window.__gl, { draw: 0, tex: 0, texBytes: 0, buf: 0 }); });
const cdp = await page.context().newCDPSession(page);
await cdp.send('Profiler.enable'); await cdp.send('Profiler.setSamplingInterval', { interval: 200 }); await cdp.send('Profiler.start');
const N = +frames;
for (let i = 0; i < N; i += 60) console.log('run', JSON.stringify(await page.evaluate(() => window.__stepN(60))));
const { profile } = await cdp.send('Profiler.stop');
if (process.env.SHOT) await page.screenshot({ path: process.env.SHOT });
const perf = await page.evaluate(() => window.__perf);
const stat = (a) => { const s = [...a].sort((x, y) => x - y); const avg = a.reduce((p, c) => p + c, 0) / a.length; return { avg: +avg.toFixed(2), p50: +s[Math.floor(s.length * 0.5)].toFixed(2), p95: +s[Math.floor(s.length * 0.95)].toFixed(2), p99: +s[Math.floor(s.length * 0.99)].toFixed(2), max: +s[s.length - 1].toFixed(2), over16: a.filter((x) => x > 16.7).length } };
const gl = await page.evaluate(() => { const g = window.game; let mb = 0; for (const k of Object.keys(g.textures.list)) { const t = g.textures.list[k]; for (const src of t.source ?? []) mb += (src.width * src.height * 4) / 1048576; } return { ...window.__gl, texMB: Math.round(mb) }; });
const f = perf.t.length;
const per = { drawsPerFrame: +(gl.draw / f).toFixed(1), texUploadsPerFrame: +(gl.tex / f).toFixed(2), texMBPerFrame: +(gl.texBytes / f / 1048576).toFixed(2), bufUploadsPerFrame: +(gl.buf / f).toFixed(1), textureMemoryMB: gl.texMB };
const summary = { per, stage, section, frames: perf.t.length, update: stat(perf.u), render: stat(perf.r), total: stat(perf.t), errors };
// self time per function
const byId = new Map(profile.nodes.map((n) => [n.id, n]));
const self = new Map(); const dt = profile.timeDeltas; let total = 0;
for (let i = 0; i < profile.samples.length; i++) { const n = byId.get(profile.samples[i]); const cf = n.callFrame; const key = `${cf.functionName || '(anon)'} ${cf.url.replace(/^.*\/\/[^/]+\//, '')}:${cf.lineNumber + 1}`; self.set(key, (self.get(key) ?? 0) + (dt[i] ?? 0)); total += dt[i] ?? 0; }
const top = [...self.entries()].sort((a, b) => b[1] - a[1]).slice(0, 45).map(([k, v]) => `${(v / total * 100).toFixed(1).padStart(5)}%  ${k}`);
console.log(JSON.stringify(summary, null, 1)); console.log(top.join('\n'));
if (out) fs.writeFileSync(out, JSON.stringify({ summary, top, profile }));
await browser.close(); server.close();
