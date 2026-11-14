// Gallows Wood's music (Nick, 2026-11-14): rain alone in the opening quiet, the track kicks in
// with a boom as the first ambusher drops, and from then on it never drops out.
import assert from 'node:assert/strict';
import { syncWoodMusic, WOOD_MUSIC } from '../src/core/WoodMusic.js';
import { STAGE_WOOD } from '../src/data/stageWood.js';
import { HORDE_SIZE } from '../src/data/enemies.js';

const foes = [];
const st = { data: STAGE_WOOD, phase: 'fight', fightOn: false, waveIndex: 0, section: STAGE_WOOD.sections[0], livingFoes: () => foes.filter((f) => f.alive) };
let shakes = 0, rainLevel = null;
const scene = { stage: st, cache: { audio: { exists: () => false } }, sound: { locked: true }, events: { once() {} }, fx: { shake: () => shakes++ }, woodRain: { setVolume: (v) => { rainLevel = v; } } };
const plays = [];
const play = (s, key, opts) => plays.push({ key, opts });
const stops = [];
const stop = () => stops.push(1);

// the opening: no music, nothing played
assert(syncWoodMusic(scene, play, stop)); assert.equal(plays.length, 0);
// the fight is on but the men are still up in the branches (the crows): still quiet
st.fightOn = true; st.waveIndex = 1; foes.push({ alive: true, hang: 40 }, { alive: true, hang: 50 });
syncWoodMusic(scene, play, stop); assert.equal(plays.length, 0, 'quiet while they hang');
// the first drops: BOOM
foes[0].hang = 0;
syncWoodMusic(scene, play, stop);
assert.equal(plays.length, 1); assert.equal(plays[0].key, 'wilderness');
assert.equal(plays[0].opts.fadeIn, 0, 'at once, no fade'); assert(plays[0].opts.punch > 1, 'in hot');
assert.equal(shakes, 1, 'the screen jolts'); assert.equal(rainLevel, WOOD_MUSIC.rainUnder, 'the rain eases under it');
// everyone dead, the walk to the next fight: the music keeps playing (nothing stops it)
foes.length = 0; st.waveIndex = 2; st.fightOn = false;
for (let i = 0; i < 600; i++) syncWoodMusic(scene, play, stop);
assert.equal(stops.length, 0, 'never stops after the kick-in');
assert(WOOD_MUSIC.rain > 0.5 && WOOD_MUSIC.rain > WOOD_MUSIC.rainUnder, 'the rain is louder in the quiet');
// more of them jump in at the ambush (and not a "horde" callout)
const first = STAGE_WOOD.sections[0];
assert(first.spawns[0].filter((s) => s.drop).length >= 4, 'four drop out of the trees');
assert(first.waves[0].length < HORDE_SIZE);
console.log('Wood music: rain in the quiet, the boom on the first drop, music stays on; bigger ambush.');
