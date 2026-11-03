// SmithLife.js — Hale the smith, on his feet at the start of level 1 (Nick, 2026-11-02:
// "the npc just standing there ... needs good solid animation and movement, he looks copy
// and pasted"). He has his own painted sheet (data/levelArt.js 'hale') and a life of his
// own while he waits to be talked to: he never just stands.
//
//   fight on   wary: he holds his ground near his post, watching the fight, glancing round
//              at the fires behind him, wiping the soot from his eyes, shifting his feet
//   all quiet  he paces his bit of road, stops, looks back at the burning village, wipes
//              his brow, paces back
//   a hero     he turns to them, waves them over, and comes a few steps to meet them
//   talked     he points them on down the road, now and then, facing whoever's near
//
// Stage only (fixed ticks, no dice: both online players see him the same). It sets
// n.lifePose (the pose view/NpcView.js draws), n.moving and n.stride (his walk keeps pace
// with the ground he covers), n.dir and n.x.

export const SMITH = {
  walk: 0.9,      // px a frame he walks
  roam: 80,       // how far from his post he paces (each way)
  meet: 90,       // ...and how far he comes to meet a hero
  see: 520,       // a hero this near (x), he's seen them
  wary: 760,      // foes this near (x): he's watching the fight
  stand: 62,      // how near to a hero he comes (stopped, he's in talking reach)
};

// his quiet round: [pose, frames] or [walk to offset from his post]
const ROUND = [
  ['stand', 70], ['walk', SMITH.roam], ['look', 110], ['stand', 40], ['wipe', 60],
  ['walk', -SMITH.roam * 0.5], ['stand', 60], ['look', 90], ['walk', 10], ['stand', 50],
];
// ...and while the fight's on (no walking off: a short shuffle)
const WARY = [['stand', 50], ['look', 70], ['shuffle', 14], ['stand', 40], ['wipe', 45], ['shuffle', -14], ['look', 60]];

function stepTo(n, x) {
  const d = x - n.x;
  if (Math.abs(d) <= SMITH.walk) { n.x = x; n.moving = false; return true; }
  n.x += Math.sign(d) * SMITH.walk; n.dir = Math.sign(d);
  n.stride = (n.stride ?? 0) + SMITH.walk; n.moving = true;
  return false;
}

// one step of a routine: advances n.lifeStep when its part is done
function routine(n, list, face) {
  n.lifeStep ??= 0; n.lifeT ??= 0;
  const [what, v] = list[n.lifeStep % list.length];
  let done;
  if (what === 'walk' || what === 'shuffle') {
    done = stepTo(n, n.post + v);
    n.lifePose = done ? 'stand' : 'run';
  } else {
    n.moving = false; n.lifePose = what; n.lifeT++;
    if (face) n.dir = face;
    done = n.lifeT >= v;
  }
  if (done) { n.lifeStep++; n.lifeT = 0; }
}

export function updateSmith(n, heroes, stage) {
  n.post ??= n.x;
  const near = heroes.filter((p) => p.alive !== false)
    .reduce((b, p) => (!b || Math.abs(p.x - n.x) < Math.abs(b.x - n.x) ? p : b), null);
  const foes = stage.opening?.active || stage.livingFoes().some((f) => Math.abs(f.x - n.x) < SMITH.wary);
  const seen = near && Math.abs(near.x - n.x) < SMITH.see;
  const face = near ? Math.sign(near.x - n.x) || n.dir : n.dir;
  n.mode ??= 'round';
  const mode = n.talked ? 'talked' : foes ? 'wary' : seen ? 'meet' : 'round';
  if (mode !== n.mode) { n.mode = mode; n.lifeStep = 0; n.lifeT = 0; }

  if (mode === 'wary') {
    // (watching the fight: he faces it, unless he's glancing back at the fires)
    routine(n, WARY, null);
    if (!n.moving) n.dir = n.lifePose === 'look' ? -face : face;
    return;
  }
  if (mode === 'round') { routine(n, ROUND, null); if (n.lifePose === 'look') n.dir = 1; return; }

  if (mode === 'meet') {
    // he comes a few steps to meet them, then waits in talking reach, waving them on over
    const side = Math.sign(n.x - near.x) || 1;
    const want = Math.max(n.post - SMITH.meet, Math.min(n.post + SMITH.meet, near.x + side * SMITH.stand));
    if (Math.abs(want - n.x) > 6 && !stepTo(n, want)) { n.lifePose = 'run'; return; }
    n.moving = false; n.dir = face;
    const close = Math.abs(near.x - n.x) < SMITH.stand * 1.6 && Math.abs(near.z - n.z) < 90;
    n.lifeT = (n.lifeT ?? 0) + 1;
    n.lifePose = !close && n.lifeT % 150 < 60 ? 'wave' : 'stand';
    return;
  }

  // talked: he sends them on, pointing down the road, and goes back to his post
  n.lifeT = (n.lifeT ?? 0) + 1;
  if (n.lifeT < 110) { n.moving = false; n.dir = 1; n.lifePose = 'point'; return; }
  if (Math.abs(n.x - n.post) > 1 && !stepTo(n, n.post)) { n.lifePose = 'run'; return; }
  n.moving = false;
  const ph = n.lifeT % 360;
  n.dir = ph < 80 ? 1 : face;
  n.lifePose = ph < 80 ? 'point' : ph < 200 ? 'stand' : ph < 280 ? 'look' : 'stand';
}
