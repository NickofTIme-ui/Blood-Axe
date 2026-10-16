// frameMeasure.js — Where the drawn figure is inside one painted frame: which rows and
// columns hold solid pixels. Read once per frame and kept. Used to cut a painted pose into
// pieces at the right places (view/ImpaledRig.js, view/Ragdoll.js).
//
//   rows[y] = [x0, x1] (the solid span of row y) or null
//   spans[x] = [y0, y1] (the solid span of column x) or null
//   cols[x] = how many solid pixels column x has
//   x0 x1 y0 y1: the figure's box; top: its first solid row

const measured = new Map();

export function measure(scene, key, name) {
  const id = `${key}|${name}`;
  if (measured.has(id)) return measured.get(id);
  const fr = scene.textures.getFrame(key, name);
  let m;
  try {
    const c = document.createElement('canvas');
    c.width = fr.cutWidth; c.height = fr.cutHeight;
    c.getContext('2d', { willReadFrequently: true }).drawImage(fr.source.image, fr.cutX, fr.cutY, c.width, c.height, 0, 0, c.width, c.height);
    m = measureCanvas(c);
  } catch { m = { w: fr.cutWidth, h: fr.cutHeight, rows: null, cols: null, spans: null, top: 0 }; }
  measured.set(id, m);
  return m;
}

// The same for a canvas of its own (not kept).
export function measureCanvas(c) {
  const w = c.width;
  const h = c.height;
  const d = c.getContext('2d', { willReadFrequently: true }).getImageData(0, 0, w, h).data;
  const rows = [];
  const cols = new Array(w).fill(0);
  const spans = new Array(w).fill(null);
  for (let y = 0; y < h; y++) {
    let x0 = -1;
    let x1 = -1;
    for (let x = 0; x < w; x++) {
      if (d[(y * w + x) * 4 + 3] > 40) {
        if (x0 < 0) x0 = x; x1 = x; cols[x]++;
        const s = spans[x];
        if (!s) spans[x] = [y, y]; else s[1] = y;
      }
    }
    rows.push(x0 < 0 ? null : [x0, x1]);
  }
  const m = { w, h, rows, cols, spans, top: Math.max(0, rows.findIndex((r) => r)) };
  if (rows.some((r) => r)) { // the figure's box
    m.y0 = m.top;
    m.y1 = rows.length - 1 - [...rows].reverse().findIndex((r) => r);
    m.x0 = Math.min(...rows.filter((r) => r).map((r) => r[0]));
    m.x1 = Math.max(...rows.filter((r) => r).map((r) => r[1]));
  }
  return m;
}

// centre of the body across a few rows around y (frame px), or `fallback`
export function midAt(m, y, fallback) {
  if (!m.rows) return fallback;
  let a = 0;
  let n = 0;
  for (let k = -4; k <= 4; k++) {
    const r = m.rows[Math.round(y) + k];
    if (r) { a += (r[0] + r[1]) / 2; n++; }
  }
  return n ? a / n : fallback;
}

// the same across a few columns around x: the middle of a lying body at x
export function midAcross(m, x, fallback) {
  if (!m.spans) return fallback;
  let a = 0;
  let n = 0;
  for (let k = -4; k <= 4; k++) {
    const s = m.spans[Math.round(x) + k];
    if (s) { a += (s[0] + s[1]) / 2; n++; }
  }
  return n ? a / n : fallback;
}
