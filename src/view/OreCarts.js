// OreCarts.js — Hollow Mountain's runaway ore carts (Stage 'stampede' with `look: 'cart'`):
// the overseers knock the chocks out and a loaded cart comes down the rails at you.
// The warning: the rails start to sing, sparks running along them from the end it comes
// from, grit shaking down. Then it comes: a heavy cart heaped with ore, wheels throwing
// sparks off the rails, its own lantern-light swinging. The painted cart (ore_cart.png,
// its left half: 'mine-ore-cart') when it exists; drawn here until then.

const rand = (a, b) => a + Math.random() * (b - a);

const RAIL_Z = [404, 432]; // (view/MineView.js drawFloor: the two rails)

export function drawOreCarts(view, hz, cam, S, g, hg) {
  const scene = view.scene;
  const t = scene.time.now / 16.7;
  const dir = S.dir;
  const P = S.path;
  const from = P.pts[0];
  const to = P.pts[P.pts.length - 1];
  if (S.phase === 'warn') {
    // the rails singing: a run of sparks along each rail, coming from where the cart starts
    const w = S.warnT;
    const len = Math.abs(to.x - from.x);
    for (let i = 0; i < 9; i++) {
      const u = ((t * 0.018 + i / 9) % 1) * Math.min(1, 0.25 + w);
      const x = from.x + dir * u * len;
      if (x < cam.x - 40 || x > cam.right + 40) continue;
      for (const rz of RAIL_Z) {
        g.fillStyle(0xffd27a, (0.35 + 0.5 * w) * (1 - u * 0.6)).fillRect(x - 10, rz - 1.5, 20, 3);
      }
    }
    // grit shaking down off the roof over the rails
    if (Math.floor(t) % 4 === 0) {
      scene.gore.spawn({ x: cam.x + rand(0, cam.width), z: rand(RAIL_Z[0], RAIL_Z[1]), h: rand(260, 420), vx: 0, vz: 0, vh: -rand(40, 120), tint: 0x6a5e50, texture: 'px', scale: rand(0.6, 1.2), decal: false, life: 50 });
    }
    return;
  }
  const painted = scene.textures.exists('mine-ore-cart');
  hz.cartImgs ??= [];
  for (const sp of hz.cartImgs) sp.setVisible(false);
  S.heads.forEach((hd, i) => {
    const k = 1 + (hd.z - 400) / 900;
    if (hd.x < cam.x - 200 || hd.x > cam.right + 200) return;
    if (painted) {
      const sp = hz.cartImgs[i] ??= scene.add.image(0, 0, 'mine-ore-cart').setOrigin(0.5, 0.94);
      sp.setPosition(hd.x, hd.z + 6).setFlipX(dir < 0).setScale((150 * k) / sp.frame.width)
        .setAngle(Math.sin(t * 0.9 + i) * 1.2).setDepth(hd.z + 1).setVisible(true);
    } else cart(hg, hd.x, hd.z, k, dir, t * 0.6 + i);
    g.fillStyle(0x000000, 0.45).fillEllipse(hd.x, hd.z + 4, 150 * k, 20 * k);
    // sparks off the rails under its wheels, thrown back behind it
    for (let j = 0; j < 2; j++) {
      scene.gore.spawn({ x: hd.x - dir * rand(30, 60) * k, z: RAIL_Z[j] + rand(-2, 2), h: rand(0, 6), vx: -dir * rand(60, 220), vz: rand(-10, 10), vh: rand(40, 140), tint: j ? 0xffc060 : 0xff8a30, texture: 'px', scale: rand(0.6, 1.2), decal: false, life: rand(14, 26) });
    }
  });
  hg.setDepth(S.heads.length ? Math.max(...S.heads.map((h) => h.z)) + 1 : hz.z);
}

// a loaded ore cart side on (its wheels on the rail at x, z), wheel phase p
function cart(g, x, z, k, dir, p) {
  const X = (dx) => x + dx * dir * k;
  const Y = (dy) => z - dy * k;
  const wood = 0x3a2616; const dark = 0x1e140c; const iron = 0x4a4a50; const rim = 0xff9a4a;
  // the tub: wider at the top, planked, iron-banded
  g.fillStyle(wood, 1).fillPoints([
    { x: X(-62), y: Y(70) }, { x: X(62), y: Y(70) }, { x: X(52), y: Y(18) }, { x: X(-52), y: Y(18) },
  ], true);
  g.lineStyle(2 * k, dark, 1);
  for (const dy of [35, 52]) g.lineBetween(X(-58), Y(dy), X(58), Y(dy));
  g.fillStyle(iron, 1);
  for (const dx of [-44, 0, 44]) g.fillRect(Math.min(X(dx - 4), X(dx + 4)), Y(70), 8 * k, 52 * k);
  g.fillRect(Math.min(X(-64), X(64)), Y(74), 128 * k, 6 * k);
  // the heap of ore, black with blue glints
  g.fillStyle(0x15151a, 1).fillEllipse(x, Y(74), 116 * k, 34 * k);
  g.fillStyle(0x6ab4ff, 0.9);
  for (const [dx, dy] of [[-30, 80], [8, 86], [34, 78], [-6, 76]]) g.fillRect(X(dx), Y(dy), 4 * k, 3 * k);
  // the firelight along its top edge
  g.lineStyle(2 * k, rim, 0.6).lineBetween(X(-62), Y(72), X(62), Y(72));
  // the wheels, spinning: iron, spoked
  for (const dx of [-34, 34]) {
    const cx = X(dx); const cy = Y(12);
    g.fillStyle(0x222226, 1).fillCircle(cx, cy, 13 * k);
    g.lineStyle(2 * k, 0x6a6a72, 1);
    for (let s = 0; s < 3; s++) {
      const a = p * dir + (s * Math.PI) / 3;
      g.lineBetween(cx - Math.cos(a) * 11 * k, cy - Math.sin(a) * 11 * k, cx + Math.cos(a) * 11 * k, cy + Math.sin(a) * 11 * k);
    }
  }
}

// The Chain Warden's hook (stage/WardenHook.js): the chain whirling round over his head as he
// winds up, then a heavy iron hook flying out on it down the lane, and hauled back hand over
// hand (with a hero on it, when it caught one).
export function drawWardenHook(view, hz, line) {
  const scene = view.scene;
  const g = hz.g = hz.g ?? scene.add.graphics();
  g.clear();
  g.setVisible(!!line);
  if (!line) return;
  const t = scene.time.now / 16.7;
  const hx = line.fromX; const hy = line.fromZ - line.fromH;
  let tx; let ty;
  if (line.phase === 'wind') {
    // whirling: the hook going round on a yard of chain over his head
    const a = t * 0.45;
    tx = hx + Math.cos(a) * 46; ty = hy - 34 + Math.sin(a) * 14;
  } else {
    tx = line.tipX; ty = line.tipZ - (line.caught ? 46 : 40);
  }
  // the chain: links along the line, sagging a little when it's hauled
  const n = Math.max(4, Math.round(Math.hypot(tx - hx, ty - hy) / 9));
  const sag = line.phase === 'haul' ? 14 : 4;
  for (let i = 0; i <= n; i++) {
    const u = i / n;
    const x = hx + (tx - hx) * u; const y = hy + (ty - hy) * u + Math.sin(u * Math.PI) * sag;
    g.fillStyle(i % 2 ? 0x55555c : 0x8a8a92, 1).fillEllipse(x, y, i % 2 ? 7 : 5, i % 2 ? 4 : 6);
  }
  // the hook: a heavy barbed iron crook
  const d = line.dir;
  g.lineStyle(5, 0x2a2a2e, 1).beginPath();
  g.arc(tx + d * 4, ty + 8, 10, -Math.PI / 2, Math.PI * 0.75, d < 0).strokePath();
  g.lineStyle(2, 0xc8c8d0, 0.8).beginPath();
  g.arc(tx + d * 4, ty + 8, 10, -Math.PI / 2, Math.PI * 0.2, d < 0).strokePath();
  g.fillStyle(0x2a2a2e, 1).fillTriangle(tx + d * 14, ty + 10, tx + d * 20, ty + 2, tx + d * 10, ty + 2);
  if (line.phase === 'wind' && line.t > line.warn - 14) g.fillStyle(0xffe0a0, 0.8).fillCircle(tx, ty, 3); // (the glint before it flies)
  g.setDepth(Math.max(line.fromZ, line.tipZ) + 2);
}
