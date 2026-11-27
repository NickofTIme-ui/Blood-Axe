// The Shattered Ascent's wind (level 4's own hazard: the level identity sheet, project files
// level-polish-plan/): gusts come down off the peaks along the cliff road. Each one is
// warned first (grit streaming across the lane, a rising howl: view/AscentView.js), then
// blows for a beat and dies away.
//
// While it blows, everyone is pushed down the road (to the left, into your face as you
// climb); a man in the air is carried three times as far, so a man knocked flying travels.
// On the causeway (`deck`) it also blows across the bridge toward the gorge: a hero standing
// on firm ground is never blown off an edge (the wind leans on him, he keeps his feet), but
// a hero in the air, and any Ashen man, can be. Knock them off the bridge in a gust.
//
// A section turns it on with `wind: { period, warn, blow, x, z, deck: [x0, x1], first }`
// (frames; px a second). Runs on the fixed tick (World.frame): the same on every machine.
import { PIT_FLOOR } from './Terrain.js';

export const WIND = { period: 520, warn: 95, blow: 85, x: -70, z: 0, air: 3, guard: 0.25, hero: 0.7 };

export class AscentWind {
  constructor(stage) {
    this.stage = stage;
    this.state = 'calm';
    this.t = 0; this.sec = -1; this.taught = false;
    this.k = 0; // (the gust's strength now, 0..1: the view reads it)
  }

  get wind() { return this.stage.section?.wind ?? null; }

  update() {
    const st = this.stage; const W = this.wind;
    if (st.index !== this.sec) { this.sec = st.index; this.t = W?.first ?? 0; }
    if (!W || st.world.hold || st.story?.holding) { this.setState('calm'); this.k = 0; return; }
    const P = W.period ?? WIND.period; const warn = W.warn ?? WIND.warn; const blow = W.blow ?? WIND.blow;
    this.t = (this.t + 1) % P;
    const into = this.t - (P - warn - blow);
    this.setState(into < 0 ? 'calm' : into < warn ? 'warn' : 'blow');
    if (this.state !== 'blow') { this.k = 0; return; }
    const u = (into - warn) / blow; // (0..1 through the blow: up quickly, a long tail)
    this.k = Math.min(1, u * 5) * Math.min(1, (1 - u) * 2.2);
    for (const f of st.world.fighters) this.push(f, W);
  }

  setState(s) {
    if (s === this.state) return;
    this.state = s;
    this.stage.world.events.emit('ascentWind', { state: s, wind: this.wind });
    if (s === 'warn' && !this.taught) { this.taught = true; this.stage.story?.trigger('wind'); }
  }

  push(f, W) {
    if (!f.alive || f.entering || f.cinematic || f.unbounded || f.stats.boss || f.ghost) return;
    if (['grabbed', 'execute', 'executed', 'kneel'].includes(f.state)) return;
    const T = this.stage.terrain;
    const air = f.h > f.floor + 2 || f.vh > 0;
    const hero = f.team === 'player';
    let m = this.k * (air ? WIND.air : 1);
    if (hero) m *= f.state === 'block' ? WIND.guard : WIND.hero; // (he braces behind his guard)
    const onDeck = W.deck && f.x >= W.deck[0] && f.x <= W.deck[1];
    const dx = (W.x ?? WIND.x) * m / 60;
    const dz = onDeck ? (W.z ?? WIND.z) * m / 60 : 0;
    // (down the road, then across it, each on its own: a hero held at the bridge's edge is
    // still pushed along it)
    const b = this.stage.world.bounds;
    const ok = (x, z) => !T?.wallAt(x, z, f.h) && !(hero && !air && T && T.groundAt(x, z, 10) <= PIT_FLOOR);
    if (dx && ok(f.x + dx, f.z)) f.x = Math.max(b.minX, Math.min(b.maxX, f.x + dx));
    if (dz && ok(f.x, f.z + dz)) f.z += dz; // (an Ashen man over the gorge's edge: the pit has him, as any fall does)
  }
}
