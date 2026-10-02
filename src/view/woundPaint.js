// woundPaint.js — Turns flat magenta marker patches in a source strip into raw,
// freshly-hacked stumps, before the strip is cut into frames (view/stripImporter.js).
//
// ChatGPT won't draw a severed arm, but it will happily paint a flat #FF00FF patch
// where the shoulder ends ("a VFX marker"). Magenta appears nowhere else in the art, so
// every marker pixel is found exactly and repainted here as a wound:
//   dark crimson rim  ->  wet red meat (mottled, with glints)  ->  white bone end + marrow
// plus a few blood runs trickling down the body below it.
// Painted at the source image's full resolution, so it downsamples like the hand art.

const RIM = [40, 3, 6];
const MEAT_DARK = [92, 8, 14];
const MEAT = [142, 20, 28];
const MEAT_HI = [206, 64, 66];
const BONE = [232, 222, 198];
const BONE_EDGE = [96, 78, 62];
const MARROW = [110, 16, 20];
const BLOOD = [120, 6, 12];
const BLOOD_HI = [196, 30, 36];

const isMarker = (r, g, b) => r > 150 && b > 140 && g < 120 && Math.abs(r - b) < 100 && r - g > 70;
// anti-aliased fringe: a pinkish/purple mix of marker and neighbour
const isFringe = (r, g, b) => r + b > 2.1 * g + 90 && b > g + 30 && r > g + 30;

function rng(seed) {
  let s = seed >>> 0 || 1;
  return () => { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; return (s >>> 0) / 4294967296; };
}

// smooth 2D value noise in 0..1 (bilinear between random lattice values)
function valueNoise(seed) {
  const h = (x, y) => {
    let n = (x * 374761393 + y * 668265263 + seed * 1442695041) | 0;
    n = Math.imul(n ^ (n >>> 13), 1274126177);
    return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
  };
  return (x, y) => {
    const xi = Math.floor(x); const yi = Math.floor(y);
    const fx = x - xi; const fy = y - yi;
    const sx = fx * fx * (3 - 2 * fx); const sy = fy * fy * (3 - 2 * fy);
    const a = h(xi, yi) + (h(xi + 1, yi) - h(xi, yi)) * sx;
    const b = h(xi, yi + 1) + (h(xi + 1, yi + 1) - h(xi, yi + 1)) * sx;
    return a + (b - a) * sy;
  };
}

function set(d, p, [r, g, b]) {
  d[p * 4] = r; d[p * 4 + 1] = g; d[p * 4 + 2] = b; d[p * 4 + 3] = 255;
}
const mix = (a, b, t) => [0, 1, 2].map((k) => Math.round(a[k] + (b[k] - a[k]) * t));

// Repaints every marker blob in `imageData` (in place). Returns how many it found.
export function paintMarkerWounds(imageData, seed = 7) {
  const { width: W, height: H, data: d } = imageData;
  const mark = new Uint8Array(W * H);
  for (let p = 0; p < W * H; p++) {
    const i = p * 4;
    if (d[i + 3] > 24 && isMarker(d[i], d[i + 1], d[i + 2])) mark[p] = 1;
  }
  // take in the soft fringe around each blob (2 passes)
  for (let pass = 0; pass < 2; pass++) {
    const add = [];
    for (let p = 0; p < W * H; p++) {
      if (mark[p]) continue;
      const x = p % W;
      const near = (x > 0 && mark[p - 1]) || (x < W - 1 && mark[p + 1]) || (p >= W && mark[p - W]) || (p < W * (H - 1) && mark[p + W]);
      if (near && isFringe(d[p * 4], d[p * 4 + 1], d[p * 4 + 2])) add.push(p);
    }
    for (const p of add) mark[p] = 1;
  }

  // blobs
  const label = new Int32Array(W * H);
  const blobs = [];
  for (let p0 = 0; p0 < W * H; p0++) {
    if (!mark[p0] || label[p0]) continue;
    const id = blobs.length + 1;
    const px = [];
    const stack = [p0];
    label[p0] = id;
    while (stack.length) {
      const p = stack.pop();
      px.push(p);
      const x = p % W;
      for (const q of [x > 0 ? p - 1 : -1, x < W - 1 ? p + 1 : -1, p - W, p + W]) {
        if (q >= 0 && q < W * H && mark[q] && !label[q]) { label[q] = id; stack.push(q); }
      }
    }
    if (px.length >= 12) blobs.push({ id, px });
  }

  const isBg = (q) => q < 0 || q >= W * H || d[q * 4 + 3] < 24 || Math.max(d[q * 4], d[q * 4 + 1], d[q * 4 + 2]) < 14;
  const nb = (p) => { const x = p % W; return [x > 0 ? p - 1 : -1, x < W - 1 ? p + 1 : -1, p - W, p + W]; };
  // BFS distance inside the blob from a set of its edge pixels
  const bfs = (blob, seeds) => {
    const dist = new Map();
    let queue = seeds;
    for (const p of seeds) dist.set(p, 1);
    while (queue.length) {
      const next = [];
      for (const p of queue) {
        for (const q of nb(p)) {
          if (q >= 0 && q < W * H && label[q] === blob.id && !dist.has(q)) { dist.set(q, dist.get(p) + 1); next.push(q); }
        }
      }
      queue = next;
    }
    return dist;
  };

  const rand = rng(seed);
  for (const blob of blobs) {
    // The marker is drawn the shape of whatever was there (a bandage bundle, a round
    // cap): left as is it reads as a lump he's holding. Where it bulges out past his
    // body, cut it back to a short stub flush with the torso, so the shoulder ENDS.
    // A marker pixel "bulges" when most straight lines out of it reach open background
    // before they reach his body; pixels with body all round (over the torso) stay.
    {
      let x0 = W; let x1 = 0; let y0 = H; let y1 = 0;
      for (const p of blob.px) { const x = p % W; const y = (p / W) | 0; x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
      const L = Math.round(Math.max(x1 - x0, y1 - y0) * 0.9) + 4;
      const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1], [0.7, 0.7], [-0.7, 0.7], [0.7, -0.7], [-0.7, -0.7], [0.92, 0.38], [-0.92, 0.38], [0.92, -0.38], [-0.92, -0.38], [0.38, 0.92], [-0.38, 0.92], [0.38, -0.92], [-0.38, -0.92]];
      const open = (p) => {
        const px0 = p % W; const py0 = (p / W) | 0;
        let n = 0;
        for (const [dx, dy] of dirs) {
          let hitBody = false;
          for (let s = 1; s <= L; s++) {
            const x = Math.round(px0 + dx * s); const y = Math.round(py0 + dy * s);
            if (x < 0 || y < 0 || x >= W || y >= H) break;
            const q = y * W + x;
            if (label[q] === blob.id) continue;
            if (!isBg(q)) hitBody = true;
            break;
          }
          if (!hitBody) n++;
        }
        return n / dirs.length;
      };
      const drop = blob.px.filter((p) => open(p) > 0.45);
      if (drop.length && drop.length < blob.px.length) {
        const gone = new Set(drop);
        for (const p of drop) { label[p] = 0; d[p * 4] = d[p * 4 + 1] = d[p * 4 + 2] = 0; } // back to background
        blob.px = blob.px.filter((p) => !gone.has(p));
      }
      if (blob.px.length < 6) continue;
    }
    // Edges that meet the background are the open cut (torn, dark rim); edges that meet
    // the body are where the meat runs straight into him (no outline there, so the
    // stump reads as the END of the shoulder, not a lump stuck on it).
    const outer = []; const inner = []; const all = [];
    for (const p of blob.px) {
      const ns = nb(p).filter((q) => q < 0 || q >= W * H || label[q] !== blob.id);
      if (!ns.length) continue;
      all.push(p);
      if (ns.some(isBg)) outer.push(p); else inner.push(p);
    }
    const dist = bfs(blob, all);
    const dOut = bfs(blob, outer.length ? outer : all);
    const dIn = inner.length ? bfs(blob, inner) : null;
    let maxD = 1;
    for (const v of dist.values()) maxD = Math.max(maxD, v);
    // bone end: a snapped, lopsided stub out toward the open cut (not dead centre)
    let core = blob.px[0];
    for (const p of blob.px) if (dist.get(p) > dist.get(core)) core = p;
    let ox = 0; let oy = 0;
    for (const p of outer.length ? outer : all) { ox += p % W; oy += (p / W) | 0; }
    ox /= (outer.length || all.length); oy /= (outer.length || all.length);
    const bx = (core % W) + (ox - (core % W)) * 0.4;
    const by = ((core / W) | 0) + (oy - ((core / W) | 0)) * 0.4;
    const boneR = Math.max(2, maxD * (0.2 + rand() * 0.08));
    const boneRot = rand() * Math.PI;
    const boneSeed = rand() * 100;
    // clumps of meat: smooth noise at a few pixels' scale, not per-pixel speckle
    const cell = Math.max(3, maxD * 0.18);
    const noise = valueNoise(Math.floor(rand() * 1e9));
    const tearSeed = rand() * 100;

    let lowY = 0;
    for (const p of blob.px) {
      const x = p % W; const y = (p / W) | 0;
      if (y > lowY) lowY = y;
      const t = (dOut.get(p) ?? maxD) / maxD; // depth from the open cut
      const tin = dIn ? (dIn.get(p) ?? maxD) / maxD : 1; // closeness to where it joins him
      // torn rim along the open cut only: its depth wanders around the outline
      const ang = Math.atan2(y - by, x - bx);
      const rim = 0.12 + 0.2 * noise(Math.cos(ang) * 3 + tearSeed, Math.sin(ang) * 3);
      const n = noise(x / cell, y / cell) * 0.7 + noise(x / (cell * 0.4), y / (cell * 0.4)) * 0.3;
      let c;
      if (tin < 0.3) c = mix(BLOOD, MEAT_DARK, tin / 0.3 * (0.5 + n * 0.5)); // runs into the body
      else if (t < rim) c = mix(RIM, MEAT_DARK, (t / rim) ** 2);
      else if (n > 0.72) c = mix(MEAT, MEAT_HI, (n - 0.72) / 0.28); // wet glints on the clumps
      else if (n > 0.4) c = mix(MEAT_DARK, MEAT, (n - 0.4) / 0.32);
      else c = mix(RIM, MEAT_DARK, 0.4 + n);
      // bone: rotated oval with a jagged, snapped edge; a dark marrow hollow to one side
      const dx = x - bx; const dy = y - by;
      const u = (dx * Math.cos(boneRot) + dy * Math.sin(boneRot)) / boneR;
      const v = (-dx * Math.sin(boneRot) + dy * Math.cos(boneRot)) / (boneR * 0.68);
      const rr = Math.hypot(u, v);
      const jag = 0.82 + 0.3 * noise(Math.atan2(v, u) * 2 + boneSeed, boneSeed);
      if (rr < jag) {
        c = rr > jag - 0.22 ? BONE_EDGE : Math.hypot(u - 0.25, v + 0.1) < 0.3 ? MARROW : BONE;
      }
      set(d, p, c);
    }

    // blood soaking into the skin/armour around the cut (stronger at the join, fading
    // out, blotchy) — ties the wound into his body
    const R = Math.max(3, Math.round(maxD * 0.9));
    const seen = new Map();
    let ring = [...inner.length ? inner : all];
    for (const p of blob.px) seen.set(p, 0);
    for (let step = 1; step <= R && ring.length; step++) {
      const next = [];
      for (const p of ring) {
        for (const q of nb(p)) {
          if (q < 0 || q >= W * H || seen.has(q) || isBg(q)) continue;
          seen.set(q, step);
          next.push(q);
          const x = q % W; const y = (q / W) | 0;
          const k = (1 - step / R) ** 1.4 * (0.45 + 0.55 * noise(x / cell + 50, y / cell + 50));
          const o = [d[q * 4], d[q * 4 + 1], d[q * 4 + 2]];
          const lum = (o[0] + o[1] + o[2]) / 765; // keep his shading under the stain
          set(d, q, mix(o, [Math.round(40 + 150 * lum), Math.round(4 + 10 * lum), Math.round(6 + 12 * lum)], Math.min(0.85, k)));
        }
      }
      ring = next;
    }

    // blood runs trickling down from the stump's lower edge, over the body only
    const bottom = blob.px.filter((p) => ((p / W) | 0) >= lowY - Math.max(2, maxD * 0.3));
    const runs = 2 + Math.floor(rand() * 3);
    const w = Math.max(2, Math.round(maxD * 0.22));
    for (let k = 0; k < runs && bottom.length; k++) {
      const start = bottom[Math.floor(rand() * bottom.length)];
      let x = start % W;
      const y0 = (start / W) | 0;
      const len = Math.round(maxD * (1.2 + rand() * 2.6));
      for (let dy = 1; dy <= len; dy++) {
        const y = y0 + dy;
        if (y >= H) break;
        if (rand() < 0.12) x += rand() < 0.5 ? -1 : 1;
        const tip = dy > len - w;
        for (let dx = 0; dx < w; dx++) {
          const p = y * W + x + dx;
          if (d[p * 4 + 3] < 24 || Math.max(d[p * 4], d[p * 4 + 1], d[p * 4 + 2]) < 14) continue; // not over the background
          set(d, p, tip || dx === 0 ? BLOOD_HI : BLOOD);
        }
      }
    }
  }
  return blobs.length;
}
