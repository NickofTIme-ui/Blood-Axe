// hudArt.js — Builds the knight-armour health / stamina / magic bars from the ChatGPT
// artwork (assets/ui/hud-source.png, from the "Create warrior sprite" chat).
//
// The source is one picture of three bars, each drawn two-thirds full. At boot we cut
// each row into two pieces:
//   frame  the whole ornate row (heart symbol, label plate, gold trim) with the black
//          background removed and the channel repainted as an EMPTY dark track
//   fill   the glowing fill, stretched to the channel's full length
// The HUD then shows `fill` cropped to the current value on top of `frame`.
//
// Coordinates below are in source-image pixels (1672 x 941). If you regenerate the
// artwork, re-measure these (tools/parts.html shows pixel positions).

export const HUD_SRC = 'assets/ui/hud-source.png';

const BARS = {
  health:  { row: [22, 18, 1648, 318],  ch: [372, 197, 1580, 263], fill: [392, 199, 1250, 261] },
  stamina: { row: [22, 318, 1648, 598], ch: [372, 474, 1580, 540], fill: [392, 476, 1246, 538] },
  magic:   { row: [22, 598, 1648, 908], ch: [372, 752, 1580, 818], fill: [392, 754, 1250, 816] },
};
const TRACK = 1290; // x where the empty (unfilled) track starts in every row

export const HUD_ART = {}; // filled by buildHudArt: { scale, bars: { name: {...} } }

function canvas(w, h) {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(w));
  c.height = Math.max(1, Math.round(h));
  return c;
}

// Smooth downscale in halving steps (keeps the fine detail crisp).
function shrink(src, w, h) {
  let cur = src;
  while (cur.width / 2 > w && cur.height / 2 > h) {
    const n = canvas(cur.width / 2, cur.height / 2);
    const nx = n.getContext('2d');
    nx.imageSmoothingQuality = 'high';
    nx.drawImage(cur, 0, 0, n.width, n.height);
    cur = n;
  }
  const out = canvas(w, h);
  const ox = out.getContext('2d');
  ox.imageSmoothingQuality = 'high';
  ox.drawImage(cur, 0, 0, out.width, out.height);
  return out;
}

// Black background -> transparent, flood-filled from the edges (dark metal inside stays).
function keyBlack(c) {
  const x = c.getContext('2d', { willReadFrequently: true });
  const img = x.getImageData(0, 0, c.width, c.height);
  const d = img.data;
  const W = c.width;
  const H = c.height;
  const dark = (p) => d[p * 4] + d[p * 4 + 1] + d[p * 4 + 2] < 42;
  const seen = new Uint8Array(W * H);
  const stack = [];
  const push = (p) => { if (!seen[p] && dark(p)) { seen[p] = 1; stack.push(p); } };
  for (let i = 0; i < W; i++) { push(i); push((H - 1) * W + i); }
  for (let i = 0; i < H; i++) { push(i * W); push(i * W + W - 1); }
  while (stack.length) {
    const p = stack.pop();
    const px = p % W;
    if (px > 0) push(p - 1);
    if (px < W - 1) push(p + 1);
    if (p >= W) push(p - W);
    if (p < W * (H - 1)) push(p + W);
  }
  for (let p = 0; p < W * H; p++) {
    if (seen[p]) d[p * 4 + 3] = 0;
    else {
      // soften the dark fringe left by the flood fill
      const lum = d[p * 4] + d[p * 4 + 1] + d[p * 4 + 2];
      if (lum < 90) d[p * 4 + 3] = Math.min(255, lum * 3);
    }
  }
  x.putImageData(img, 0, 0);
}

// The hub: one tight unit instead of three full-width rows. Each bar is rebuilt from the
// same artwork as
//   - its jewel emblem (heart / bolt / moon), shrunk to a badge at the left
//   - just the channel with its gold rails (the tall label plate and filigree above and
//     below are left out), cut to a shorter length: left end + a run of the middle +
//     the spiked right end, so nothing is squashed
// and the three are stacked close, emblems overlapping into one cluster. Same colours,
// same fills and trails, roughly a third of the screen area.
//
// Textures are built at renderScale x so they land 1:1 on the full-resolution canvas
// (razor sharp) and are shown at 1 / renderScale.
const HUB = {
  strip: 0.15,      // world px per source px for the channel strip
  rail: 16,         // source px of rail kept above and below the channel
  lead: 30,         // source px kept left of the channel (its rounded cap)
  left: 80, right: 110, // source px of the strip's two ends kept whole
  length: 1150,     // source px the whole strip is cut down to (was 1306)
  emblem: 30,       // emblem badge height, world px
  inset: 22,        // world px the strip starts right of the hub's left edge (under the badge)
  pitch: 17,        // world px between one bar and the next
};

export function buildHudArt(scene, _size = 0.19, renderScale = 2) {
  if (!scene.textures.exists('hud-src')) return false;
  const src = scene.textures.get('hud-src').getSourceImage();
  const s = HUB.strip;
  const k = renderScale;
  HUD_ART.scale = s;
  HUD_ART.texScale = 1 / renderScale; // what to setScale() the images by
  HUD_ART.bars = {};
  HUD_ART.height = HUB.pitch * 2 + HUB.emblem;
  Object.entries(BARS).forEach(([name, b], index) => {
    const [rx0, ry0, rx1, ry1] = b.row;
    const [cx0, cy0, cx1, cy1] = b.ch;
    const chh = cy1 - cy0;
    const sx0 = cx0 - HUB.lead;            // strip: source box
    const sy0 = cy0 - HUB.rail;
    const sh = chh + HUB.rail * 2;
    const mid = HUB.length - HUB.left - HUB.right;
    const chLen = HUB.length - HUB.lead - (rx1 - cx1); // the channel's length in the cut-down strip

    // the strip, cut to length (ends whole, a run of the middle between them)
    const strip = canvas(HUB.length, sh);
    const sx = strip.getContext('2d');
    sx.drawImage(src, sx0, sy0, HUB.left, sh, 0, 0, HUB.left, sh);
    sx.drawImage(src, sx0 + HUB.left + 60, sy0, mid, sh, HUB.left, 0, mid, sh);
    sx.drawImage(src, rx1 - HUB.right, sy0, HUB.right, sh, HUB.left + mid, 0, HUB.right, sh);
    keyBlack(strip);
    sx.clearRect(HUB.lead, HUB.rail, chLen, chh); // the channel: the fill shows through

    // the emblem badge
    const ew = cx0 - 14 - rx0;
    const eh = ry1 - ry0;
    const emblem = canvas(ew, eh);
    emblem.getContext('2d').drawImage(src, rx0, ry0, ew, eh, 0, 0, ew, eh);
    keyBlack(emblem);
    const es = HUB.emblem / eh; // world px per source px for the badge

    // frame = strip + badge, composed at texture resolution
    const stripW = HUB.length * s;
    const stripH = sh * s;
    const stripY = (HUB.emblem - stripH) / 2;
    const frame = canvas((HUB.inset + stripW) * k, HUB.emblem * k);
    const fx = frame.getContext('2d');
    fx.imageSmoothingQuality = 'high';
    fx.drawImage(shrink(strip, stripW * k, stripH * k), HUB.inset * k, stripY * k);
    fx.drawImage(shrink(emblem, ew * es * k, HUB.emblem * k), 0, 0);

    // track: the empty, dark channel, stretched from the unfilled end of the bar
    const track = canvas(chLen, chh);
    track.getContext('2d').drawImage(src, TRACK, cy0, cx1 - TRACK, chh, 0, 0, chLen, chh);
    // fill: the glowing part, stretched to the full channel length
    const [fx0, fy0, fx1, fy1] = b.fill;
    const fill = canvas(chLen, chh);
    fill.getContext('2d').drawImage(src, fx0, fy0, fx1 - fx0, fy1 - fy0, 0, 0, chLen, chh);
    const ls = shrink(fill, chLen * s * k, chh * s * k);
    const ts = shrink(track, chLen * s * k, chh * s * k);

    for (const [key, cv] of [[`hud-${name}-frame`, frame], [`hud-${name}-fill`, ls], [`hud-${name}-track`, ts]]) {
      if (scene.textures.exists(key)) scene.textures.remove(key);
      scene.textures.addCanvas(key, cv);
    }
    HUD_ART.bars[name] = {
      frame: `hud-${name}-frame`, fill: `hud-${name}-fill`, track: `hud-${name}-track`,
      // positions (world units) relative to the top-left of the hub
      x: 0, y: index * HUB.pitch,
      fillX: HUB.inset + HUB.lead * s, fillY: stripY + HUB.rail * s,
      // texture sizes (texture pixels) — used for cropping the fill
      fillW: ls.width, fillH: ls.height,
      width: frame.width, height: frame.height,
    };
  });
  HUD_ART.width = HUB.inset + HUB.length * s;
  return true;
}