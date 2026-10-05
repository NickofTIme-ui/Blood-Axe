// campaign-sweep.js — Dev tool: a bot plays each campaign level for real (it fights every
// man, frees the captives, breaks what opens the way) with every hero, from the start and
// from every checkpoint, and reports what went wrong: soft-locks (a fight that never
// ends, a man nobody can reach), falls, rescues missed, errors.
//   node tools/campaign-sweep.js [levelId ...] [--hero warrior] [--section 2] [--verbose]

import { World } from '../src/core/World.js';
import { Controller } from '../src/core/Controller.js';
import { Fighter } from '../src/entities/Fighter.js';
import { CHARACTERS } from '../src/data/characters.js';
import { Stage } from '../src/stage/Stage.js';
import { STAGES } from '../src/data/stages.js';
import { INTERACT } from '../src/stage/Story.js';

const LANE = 415;

// Fight whoever's nearest; then free whoever is trapped here; then break what opens the
// way; then on to the right. Jumps walls and gaps on the way like a player.
export class SweepBot extends Controller {
  constructor() { super(); this.t = 0; this.jumpFor = 0; this.goal = null; }

  sample(frozen) {
    if (frozen) return;
    this.t++;
    const p = this.me; const st = this.stage;
    this.held = {}; this.moveX = 0; this.moveZ = 0;
    if (!p.alive) { if (this.t % 90 === 0) this.registerPress('restart'); return; }
    // a held scene: press on through the lines
    if (st.story?.holding) { if (this.t % 20 === 0) this.registerPress('jump'); return; }
    if (this.jumpFor > 0) { this.jumpFor--; this.held.jump = p.h < this.jumpTo + 34; }
    const g = this.pickGoal();
    // a goal chased too long (an optional ledge it can't find the way up to): give it up
    const key = g.key ?? null;
    if (key && key === this.goal?.key) { if (++this.chase > 60 * 40) (this.skip ??= new Set()).add(key); } else this.chase = 0;
    this.goal = g;
    if (g.act === 'hit' && this.near(g, 70, 14)) {
      this.moveX = Math.sign(g.fx - p.x) * 0.01; // (face him)
      const r = this.t % 50;
      if (r === 0 || r === 12 || r === 24) this.registerPress('attack');
      else if (r === 38) this.registerPress(this.t % 150 < 50 ? 'kick' : 'heavy');
    } else if (g.act === 'hold' && this.near(g, 20, 10)) {
      this.held[INTERACT] = true;
      if (this.t % 30 === 0) this.registerPress(INTERACT);
    } else this.steer(g);
    if (this.moveX < 0) this.held.left = true; if (this.moveX > 0) this.held.right = true;
  }

  near(g, rx, rz) {
    const p = this.me;
    return Math.abs(g.x - p.x) < rx && Math.abs(g.z - p.z) < rz && (g.h == null || Math.abs(g.h - p.floor) < 40);
  }

  pickGoal() {
    const p = this.me; const st = this.stage; const T = this.world.terrain;
    const foes = this.world.fighters.filter((f) => f.team === 'enemy' && f.alive && !f.entering);
    let tgt = null; let best = Infinity;
    for (const f of foes) { const d = Math.abs(f.x - p.x) + Math.abs(f.z - p.z) * 2 + Math.abs(f.floor - p.floor) * 2; if (d < best) { best = d; tgt = f; } }
    if (tgt) {
      const side = p.x < tgt.x ? -1 : 1;
      let x = tgt.x + side * 50;
      if (T && T.groundAt(x, tgt.z) < -1) x = tgt.x - side * 50;
      return { act: 'hit', x, z: tgt.z, h: tgt.floor, fx: tgt.x, foe: tgt };
    }
    const sec = st.section; const next = st.sections[st.index + 1];
    const inReach = (x) => x >= sec.x0 - 100 && x <= (st.phase === 'fight' ? sec.x1 : (next?.x1 ?? sec.x1)) && Math.abs(x - p.x) < 1400;
    for (const n of st.story?.npcs ?? []) {
      if (n.state !== 'trapped' || !inReach(n.x) || this.skip?.has(n.id)) continue;
      if (n.rescue === 'cage') { const L = n.lock ?? n.home; return { act: 'hold', x: L.x, z: L.z, h: n.h }; }
      if (n.rescue === 'reach') return { act: 'go', x: n.x, z: n.z, h: n.h, key: n.id };
      if (n.rescue === 'escort') return { act: 'go', x: n.x, z: n.z, h: n.h };
      if (n.rescue === 'wreckage' || n.rescue === 'convoy') {
        const pr = st.props.find((q) => q.tag === n.tag && !q.broken);
        if (pr) return this.propGoal(pr);
      }
    }
    // what opens the way, and what holds the shackled
    const pr = st.props.find((q) => !q.broken && (q.opens || q.kind === 'shackle') && inReach(q.x));
    if (pr) return this.propGoal(pr);
    return { act: 'go', x: this.world.bounds.maxX + 60, z: LANE };
  }

  propGoal(pr) {
    const p = this.me; const T = this.world.terrain;
    const side = p.x < pr.x ? -1 : 1;
    const z = pr.kind === 'wall' ? this.world.bounds.minZ + 4 : pr.z;
    return { act: 'hit', x: pr.x + side * 44, z, h: T ? T.groundAt(pr.x + side * 44, z) : 0, fx: pr.x };
  }

  steer(g) {
    const p = this.me; const T = this.world.terrain;
    const dx = g.x - p.x;
    if (Math.abs(dx) > 6) this.moveX = Math.sign(dx);
    // (travel down the lane the route is built along; leave it near the goal)
    const gz = Math.abs(dx) > 150 && T ? LANE : g.z;
    if (Math.abs(gz - p.z) > 5) this.moveZ = Math.sign(gz - p.z);
    if (!T) return;
    const dir = Math.sign(this.moveX) || 1;
    const jump = (to) => { this.jumpTo = to; this.registerPress('jump'); this.held.jump = true; this.jumpFor = 20; };
    if (!p.grounded) {
      if (p.vh < 0 && T.groundAt(p.x, p.z) > -1 && T.groundAt(p.x + dir * 25, p.z) < -1) this.moveX = -dir * 0.5;
      return;
    }
    // a gap ahead: jump it (or wait at the edge)
    if (this.moveX && T.groundAt(p.x + dir * 14, p.z) < -1) {
      for (let d = 15; d <= this.reach; d += 5) {
        const gg = T.groundAt(p.x + dir * d, p.z);
        if (gg > -1) { if (gg - p.floor <= 95) return jump(gg + (d > 50 ? 60 : 0)); break; }
      }
      // try the lane: the gap may be narrower there
      this.moveX = 0; this.moveZ = Math.sign(LANE - p.z) || 1;
      return;
    }
    const wall = this.moveX ? T.wallAt(p.x + dir * 22, p.z, p.h) : null;
    if (wall) {
      if (wall.top - p.floor <= 95) jump(wall.top);
      else {
        // too tall: find the nearest place along it with something lower to climb
        const b = this.world.bounds; let bz = null;
        for (let d = 10; d < 260 && bz == null; d += 10) {
          for (const z of [p.z - d, p.z + d]) {
            if (z < b.minZ || z > b.maxZ) continue;
            const w = T.wallAt(p.x + dir * 22, z, p.h);
            const gz = T.groundAt(p.x, z);
            if (gz >= p.floor - 10 && (!w || w.top - p.floor <= 95)) { bz = z; break; }
          }
        }
        this.moveX = 0;
        this.moveZ = bz == null ? (p.z < 400 ? 1 : -1) : Math.sign(bz - p.z);
        const zw = T.wallAt(p.x, p.z + this.moveZ * 14, p.h);
        if (zw && zw.top - p.floor <= 95) jump(zw.top);
      }
      return;
    }
    // stepping up or down the lane into something: hop onto it
    if (this.moveZ) {
      const zw = T.wallAt(p.x, p.z + this.moveZ * 14, p.h);
      if (zw && zw.top - p.floor <= 95) return jump(zw.top);
    }
    // the goal is up on a ledge right here: hop up
    if (g.h != null && g.h - p.floor > 10 && g.h - p.floor <= 95 && Math.abs(dx) < 60 && Math.abs(g.z - p.z) < 40) jump(g.h);
  }
}

export function sweep(levelId, hero, { section = 0, maxSecs = 900, verbose = false, seed = 7 } = {}) {
  const data = STAGES[levelId];
  const world = new World({ seed });
  const bot = new SweepBot();
  const p = world.addFighter(new Fighter({ stats: CHARACTERS[hero], team: 'player', x: 150, z: 440, controller: bot }));
  const s = CHARACTERS[hero];
  const stage = new Stage(world, data);
  Object.assign(bot, { me: p, world, stage, reach: Math.round(s.walkSpeed * 2 * s.jumpStrength / s.gravity * 0.95) });
  stage.start(p, { section });
  const out = { level: levelId, hero, from: section, issues: [], falls: 0, deaths: 0, rescued: [], lost: [], won: false };
  const note = (msg) => { if (!out.issues.includes(msg)) out.issues.push(msg); };
  world.events.on('pitFall', (e) => { if (e.fighter === p) { out.falls++; if (bot.goal?.key) (bot.skip ??= new Set()).add(bot.goal.key); note(`fell at x${Math.round(p.x)} (${stage.section.id})`); if (verbose) console.log(`   fall f${world.frame} x${Math.round(p.x)} z${Math.round(p.z)} goal ${bot.goal?.act} ${bot.goal?.key ?? ''} x${Math.round(bot.goal?.x)} h${bot.goal?.h} hit by ${p.lastHitBy ?? '?'} state ${p.state}`); } });
  world.events.on('npcRescued', (e) => out.rescued.push(e.npc.id));
  world.events.on('npcLost', (e) => out.lost.push(e.npc.id));
  world.events.on('stageWon', () => { out.won = true; });
  const born = new Map();
  let still = 0; let lastX = p.x; let lastKills = 0; let lastHp = 0;
  const F = maxSecs * 60;
  let f = 0;
  for (; f < F && !out.won; f++) {
    p.health = Math.max(p.health, p.stats.maxHealth * 0.6); // (god: he can't die, so a soft-lock shows)
    try { world.tick(); stage.update(); } catch (e) { note(`ERROR ${e.message} ${(e.stack ?? '').split('\n')[1]?.trim()}`); break; }
    if (!p.alive) { stage.respawn(); out.deaths++; }
    // a man alive too long: who and where
    for (const e of world.fighters) {
      if (e.team !== 'enemy' || !e.alive) continue;
      if (!born.has(e)) born.set(e, f);
      const age = f - born.get(e);
      if (age === 60 * (e.stats.boss ? 150 : 75)) {
        const T = world.terrain;
        const wall = T?.wallAt(e.x, e.z, e.h);
        note(`${e.stats.id}${e.stats.boss ? ' (boss)' : ''} alive long in ${stage.section.id}: at x${Math.round(e.x)} z${Math.round(e.z)} h${Math.round(e.h)} floor${Math.round(e.floor)} state ${e.state}${e.entering ? ' ENTERING' : ''}${wall ? ` INSIDE block ${wall.x0}-${wall.x1} top ${wall.top}` : ''}; hero x${Math.round(p.x)} z${Math.round(p.z)} floor${Math.round(p.floor)}`);
      }
    }
    // no progress at all for a long time
    if (f % 60 === 0) {
      const hp = world.fighters.filter((e) => e.team === 'enemy').reduce((a, e) => a + e.health, 0);
      const moving = Math.abs(p.x - lastX) > 30 || stage.stats.kills !== lastKills || hp !== lastHp;
      still = moving ? 0 : still + 1;
      lastX = p.x; lastKills = stage.stats.kills; lastHp = hp;
      if (still === 40) {
        const g = bot.goal;
        for (const e of world.fighters) if (e !== p) note(`  ${e.team} ${e.stats.id} x${Math.round(e.x)} z${Math.round(e.z)} h${Math.round(e.h)} floor${Math.round(e.floor)} hp${Math.round(e.health)} ${e.state}${e.entering ? " ENTERING" : ""}`);
        note(`STUCK ${stage.section.id} phase ${stage.phase} hero x${Math.round(p.x)} z${Math.round(p.z)} floor${Math.round(p.floor)} goal ${g?.act} x${Math.round(g?.x)} z${Math.round(g?.z)} h${g?.h} bounds ${world.bounds.minX}-${world.bounds.maxX} story ${stage.story?.busy ? 'busy' : 'free'}`);
        break;
      }
    }
  }
  out.secs = Math.round(f / 60);
  out.end = `${stage.section.id}/${stage.phase} x${Math.round(p.x)}`;
  out.deaths = stage.stats.deaths;
  if (!out.won && !out.issues.some((m) => m.startsWith('STUCK') || m.startsWith('ERROR'))) note(`not won in ${maxSecs} s (${out.end})`);
  const npcs = stage.story?.npcs ?? [];
  out.missed = npcs.filter((n) => n.rescue && !out.rescued.includes(n.id) && !out.lost.includes(n.id) && stage.story.sectionOf(n) >= section).map((n) => `${n.id}:${n.state}`);
  return out;
}

if (typeof process !== 'undefined' && import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  const opt = (k) => { const i = args.indexOf(k); return i >= 0 ? args.splice(i, 2)[1] : null; };
  const heroOnly = opt('--hero'); const secOnly = opt('--section'); const seeds = (opt('--seeds') ?? '7').split(',').map(Number);
  const verbose = args.includes('--verbose');
  const levels = args.filter((a) => !a.startsWith('--'));
  for (const id of levels.length ? levels : ['village', 'gallowsWood', 'hollowMountain']) {
    const n = STAGES[id].sections.length;
    for (const hero of heroOnly ? [heroOnly] : ['warrior', 'mage', 'rogue']) {
      for (let k = 0; k < n; k++) {
        if (secOnly != null && k !== +secOnly) continue;
        for (const seed of seeds) {
        const r = sweep(id, hero, { section: k, verbose, seed });
        const ok = r.won && !r.issues.length;
        console.log(`${ok ? 'ok  ' : 'FAIL'} ${id} ${hero} from ${k} seed ${seed}: ${r.won ? 'won' : r.end} in ${r.secs}s, deaths ${r.deaths}, falls ${r.falls}, saved [${r.rescued}] lost [${r.lost}] missed [${r.missed}]`);
        for (const m of r.issues) console.log(`       - ${m}`);
        }
      }
    }
  }
}
