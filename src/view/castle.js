// castle.js — The Black Keep on the horizon (TEMPORARY ART, drawn in code). Every campaign
// level shows it from where the heroes stand: a small dark shape over the hills at the
// village, bigger and more detailed the closer they get (data: a stage's `castle`).
// Its colours are its own: black stone and cold violet light, never red and gold.
//
// drawCastle(g, x, baseY, scale, detail)
//   g       a Graphics to draw into
//   x       the middle of the castle, baseY the foot of its crag
//   scale   1 = about 300 px wide
//   detail  0..1: more towers, windows and banners as it grows

export const CASTLE_COL = { stone: 0x0b0a12, edge: 0x2a2440, light: 0xa88aff, crag: 0x0f0d16 };

export function drawCastle(g, x, baseY, scale = 1, detail = 0.3) {
  const C = CASTLE_COL;
  const s = scale;
  // the crag it stands on
  g.fillStyle(C.crag, 1);
  g.beginPath();
  g.moveTo(x - 210 * s, baseY);
  g.lineTo(x - 150 * s, baseY - 50 * s);
  g.lineTo(x - 110 * s, baseY - 62 * s);
  g.lineTo(x + 95 * s, baseY - 66 * s);
  g.lineTo(x + 140 * s, baseY - 46 * s);
  g.lineTo(x + 220 * s, baseY);
  g.closePath();
  g.fillPath();
  const foot = baseY - 60 * s;
  g.fillStyle(C.stone, 1);
  // curtain wall
  g.fillRect(x - 130 * s, foot - 46 * s, 260 * s, 46 * s);
  for (let k = -130; k < 130; k += 14) g.fillRect(x + k * s, foot - 54 * s, 8 * s, 8 * s); // crenels
  // towers along the wall
  const tower = (tx, w, h, spire) => {
    g.fillRect(x + (tx - w / 2) * s, foot - h * s, w * s, h * s);
    for (let k = -w / 2; k < w / 2; k += 6) g.fillRect(x + (tx + k) * s, foot - (h + 5) * s, 3.5 * s, 5 * s);
    if (spire) g.fillTriangle(x + (tx - w / 2 - 2) * s, foot - h * s, x + (tx + w / 2 + 2) * s, foot - h * s, x + tx * s, foot - (h + spire) * s);
  };
  tower(-120, 26, 92, 30);
  tower(118, 26, 96, 34);
  tower(-60, 22, 70, 0);
  tower(58, 22, 74, 0);
  // the keep: tall, its great hall roof, and the king's spire
  g.fillRect(x - 40 * s, foot - 150 * s, 80 * s, 150 * s);
  g.fillTriangle(x - 46 * s, foot - 150 * s, x + 46 * s, foot - 150 * s, x, foot - 196 * s);
  g.fillRect(x - 6 * s, foot - 250 * s, 12 * s, 70 * s);
  g.fillTriangle(x - 9 * s, foot - 246 * s, x + 9 * s, foot - 246 * s, x, foot - 286 * s);
  if (detail > 0.4) { tower(-92, 16, 120, 40); tower(90, 16, 128, 44); }
  // a cold rim of light down one side of each mass (the moon behind the smoke)
  g.fillStyle(C.edge, 1);
  g.fillRect(x + 37 * s, foot - 150 * s, 3 * s, 150 * s);
  g.fillRect(x + 128 * s, foot - 96 * s, 3 * s, 96 * s);
  // windows: a few cold violet lights (more as it grows nearer)
  g.fillStyle(C.light, 1);
  const lit = [[-8, 120], [10, 96], [-20, 70], [24, 48], [-118, 70], [116, 78], [-60, 52], [60, 40], [0, 220]];
  const n = Math.round(4 + detail * (lit.length - 4));
  for (const [wx, wy] of lit.slice(0, n)) g.fillRect(x + wx * s, foot - wy * s, Math.max(1.5, 4 * s), Math.max(2, 7 * s));
  // banners on the keep when near enough to see them
  if (detail > 0.6) {
    g.fillStyle(0x1a1028, 1);
    g.fillRect(x - 30 * s, foot - 130 * s, 12 * s, 40 * s);
    g.fillRect(x + 18 * s, foot - 130 * s, 12 * s, 40 * s);
  }
}
