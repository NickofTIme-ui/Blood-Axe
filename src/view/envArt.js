// envArt.js — Environment art: the high-res ground under the fight.
//
// The ground is a wide picture of the floor seen from the game's camera angle (far edge
// at the top, near edge at the bottom). It repeats left-to-right along the arena. AI art
// never tiles perfectly, so at load the right end is cross-faded into the left start,
// which makes the repeat seamless.
//
// GROUNDS lists the options (F3 in the arena cycles them while choosing).
// SETTINGS.ground.pick chooses which one the game uses.

export const GROUNDS = {
  cathedral: 'assets/env/options/ground-option1-cathedral.png',
  village: 'assets/env/options/ground-option2-village.png',
  castle: 'assets/env/options/ground-option3-castle.png',
};

// Make an image tile seamlessly left-to-right by blending its last `frac` into its start.
export function makeSeamless(scene, srcKey, outKey, frac = 0.12) {
  if (!scene.textures.exists(srcKey)) return false;
  const img = scene.textures.get(srcKey).getSourceImage();
  const w = img.width;
  const h = img.height;
  const ov = Math.round(w * frac);
  const out = document.createElement('canvas');
  out.width = w - ov;
  out.height = h;
  const ctx = out.getContext('2d');
  ctx.drawImage(img, 0, 0);
  // the overlap strip, fading from opaque (left) to transparent (right)
  const strip = document.createElement('canvas');
  strip.width = ov;
  strip.height = h;
  const sctx = strip.getContext('2d');
  sctx.drawImage(img, w - ov, 0, ov, h, 0, 0, ov, h);
  sctx.globalCompositeOperation = 'destination-in';
  const grad = sctx.createLinearGradient(0, 0, ov, 0);
  grad.addColorStop(0, 'rgba(0,0,0,1)');
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  sctx.fillStyle = grad;
  sctx.fillRect(0, 0, ov, h);
  ctx.drawImage(strip, 0, 0);
  if (scene.textures.exists(outKey)) scene.textures.remove(outKey);
  scene.textures.addCanvas(outKey, out);
  return true;
}

// The sky: a wide painted panorama behind everything, repeated with slow parallax.
export const SKY = 'assets/env/sky.png';
// The pillars: one picture holding a few pillar variants side by side on a transparent
// (or flat) background. They're cut apart at load and placed along the back wall.
export const PILLARS = 'assets/env/pillars.png';

export function preloadGrounds(scene) {
  for (const [name, file] of Object.entries(GROUNDS)) scene.load.image(`groundsrc-${name}`, file);
  scene.load.image('skysrc', SKY);
  scene.load.image('pillarsrc', PILLARS);
}

// Sky → 'sky' (seamless). Returns true when it's ready.
export function buildSky(scene) {
  return makeSeamless(scene, 'skysrc', 'sky', 0.1);
}

// Cut the pillar sheet into separate textures 'pillar-0', 'pillar-1', ...
// Returns how many were found.
export function buildPillars(scene) {
  if (!scene.textures.exists('pillarsrc')) return 0;
  const img = scene.textures.get('pillarsrc').getSourceImage();
  const w = img.width;
  const h = img.height;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(img, 0, 0);
  const data = ctx.getImageData(0, 0, w, h);
  const px = data.data;
  // No transparency? Key out the background colour (taken from the top-left corner).
  if (px[3] > 250) {
    const [br, bg, bb] = [px[0], px[1], px[2]];
    for (let i = 0; i < px.length; i += 4) {
      const d = Math.abs(px[i] - br) + Math.abs(px[i + 1] - bg) + Math.abs(px[i + 2] - bb);
      if (d < 60) px[i + 3] = 0;
      else if (d < 140) px[i + 3] = Math.round(255 * (d - 60) / 80); // soft edge
      if (!px[i + 3]) continue;
      // screen-colour spill on the edges → neutral
      if (bg > br && bg > bb) {
        // green screen: nothing in the art is greener than it is red or blue
        px[i + 1] = Math.min(px[i + 1], Math.max(px[i], px[i + 2]));
      } else if (px[i + 2] > px[i + 1] + 20 && px[i] > px[i + 1] + 20) {
        // magenta: purple-pink tint → neutral (blood/fire have little blue)
        px[i + 2] = px[i + 1];
      }
    }
    ctx.putImageData(data, 0, 0);
  }
  // Columns with (almost) nothing in them separate the pillars.
  const solid = new Array(w).fill(0);
  for (let x = 0; x < w; x++) {
    for (let y = 0; y < h; y += 2) if (px[(y * w + x) * 4 + 3] > 40) solid[x]++;
  }
  const spans = [];
  let start = -1;
  for (let x = 0; x <= w; x++) {
    const on = x < w && solid[x] > 3;
    if (on && start < 0) start = x;
    if (!on && start >= 0) {
      if (x - start > w * 0.05) spans.push([start, x]); // ignore specks
      start = -1;
    }
  }
  spans.forEach(([x0, x1], i) => {
    let y0 = h;
    let y1 = 0;
    for (let y = 0; y < h; y++) {
      for (let x = x0; x < x1; x += 2) {
        if (px[(y * w + x) * 4 + 3] > 40) { y0 = Math.min(y0, y); y1 = Math.max(y1, y); break; }
      }
    }
    const out = document.createElement('canvas');
    out.width = x1 - x0;
    out.height = y1 - y0 + 1;
    out.getContext('2d').drawImage(c, x0, y0, out.width, out.height, 0, 0, out.width, out.height);
    const key = `pillar-${i}`;
    if (scene.textures.exists(key)) scene.textures.remove(key);
    scene.textures.addCanvas(key, out);
  });
  return spans.length;
}

export function buildGrounds(scene) {
  const ready = [];
  for (const name of Object.keys(GROUNDS)) {
    if (makeSeamless(scene, `groundsrc-${name}`, `ground-${name}`)) ready.push(name);
  }
  return ready;
}
