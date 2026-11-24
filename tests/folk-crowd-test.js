// Freed crowds (data/folk.js, view/NpcView.js folkFor / crowdHead): each head their own
// person, nobody twice in a level; out of the convoy's wrecked wagon one by one; running,
// they string out without jumping about, their run beat following the ground they cover.
import assert from 'node:assert/strict';
globalThis.Phaser ??= { BlendModes: {}, Display: { Color: { GetColor: () => 0 } } };
const { World } = await import('../src/core/World.js');
const { Controller } = await import('../src/core/Controller.js');
const { Fighter } = await import('../src/entities/Fighter.js');
const { CHARACTERS } = await import('../src/data/characters.js');
const { Stage } = await import('../src/stage/Stage.js');
const { STAGE_WOOD } = await import('../src/data/stageWood.js');
const { NpcView } = await import('../src/view/NpcView.js');
const { SPRITES } = await import('../src/view/levelArt.js');
const { FOLK } = await import('../src/data/folk.js');
const { PROPS } = await import('../src/data/stage.js');

// pretend every folk sheet is painted
for (const F of FOLK) SPRITES[F.id] = { key: F.id, count: 10, fw: 100, fh: 200 };
const w = new World();
const p = w.addFighter(new Fighter({ stats: CHARACTERS.warrior, team: 'player', x: 5800, z: 400, controller: new Controller() }));
const st = new Stage(w, STAGE_WOOD, {});
st.start(p, { section: 4 });
const view = Object.create(NpcView.prototype);
view.stage = st; view.cur = { seed: 7 };

assert.equal(PROPS.wagon.w, 300, 'the convoy wagon is half as big again');
const groups = st.story.npcs.filter((n) => n.pose === 'group' || n.pose === 'convoy' || n.group);
const dealt = [];
for (const n of groups) for (let i = 0; i < (n.people ?? 3); i++) dealt.push(view.folkFor(n, i));
assert.equal(new Set(dealt).size, dealt.length, 'nobody twice in a level');
assert(['folk-boy', 'folk-lad', 'folk-apprentice'].includes(view.folkFor(st.story.npc('tanners'), 0)), "the tanner's boys are boys");

// wreck the wagon: the five come out one by one, then run
const n = st.story.npc('convoy'); const wagon = st.props.find((q) => q.kind === 'wagon');
n.state = 'free'; n.t = 0; n.x = wagon.x;
const seen = [];
for (let f = 0; f < 95; f++) {
  n.t = f;
  const out = [0, 1, 2, 3, 4].filter((i) => !view.crowdHead(n, i, 5, 1, f, 'stand', -1).hide).length;
  seen.push(out);
}
assert.equal(seen[0], 0, 'nobody out at the moment of the crash');
assert.equal(seen[94], 5, 'all five out before they run');
assert(seen.some((c) => c > 0 && c < 5), 'they come out one by one');
const landed = [0, 1, 2, 3, 4].map((i) => view.crowdHead(n, i, 5, 1, 94, 'stand', -1));
assert(landed.every((H) => H.dx < -wagon.w / 2 && !H.up), 'they land behind the wagon, on the ground');

n.state = 'fleeing'; n.t = 0; n.stride = 0; n.dir = -1;
let last = landed.map((H) => n.x + H.dx);
for (let f = 1; f < 160; f++) {
  n.t = f; n.x -= 2.5; n.stride += 2.5;
  const H = [0, 1, 2, 3, 4].map((i) => view.crowdHead(n, i, 5, 1, f, 'run', -1));
  H.forEach((h, i) => {
    const x = n.x + h.dx;
    assert(Math.abs(x - last[i]) < 6, `head ${i} doesn't jump (${(x - last[i]).toFixed(1)} px)`);
    assert(x <= last[i] + 0.5, `head ${i} runs away, not back`);
    last[i] = x;
  });
}
const spread = Math.max(...last) - Math.min(...last);
assert(spread > 150, `they string out on the road (${spread.toFixed(0)} px)`);

// no fading out at the flee point (Nick, 2026-11-24): they run on until off the screen
const r = st.story.npc('convoy');
r.state = 'fleeing'; r.runOff = 0; r.x = p.x - 200; r.flee = { x: p.x - 260, z: r.z };
let frames = 0;
while (r.state === 'fleeing' && frames < 2000) { st.story.updateNpcs([p]); frames++; }
assert.equal(r.state === 'safe' || r.state === 'gathered', true, 'they get away in the end');
assert(Math.abs(r.x - p.x) > 1100 || r.state === 'gathered', `gone only once off the screen (${Math.abs(r.x - p.x).toFixed(0)} px from the hero)`);
console.log(`Freed crowds: ${dealt.length} heads, all different; the convoy's five jump out one by one and string out ${spread.toFixed(0)} px running, and run off the screen (${frames} frames) instead of fading.`);
