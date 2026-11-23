# Bake a freed villager's ChatGPT sheet (data/folk.js, docs/folk/folk-art-prompts.md) into
# the game's one-row strip: two rows of poses on black (4 held poses, then the 6-pose run)
# -> one row of 10 equal cells, black background, each figure standing on the cell's
# bottom edge and centred on its torso (so it doesn't hop sideways from pose to pose).
#   python tools/bake-folk-sheet.py painted.png assets/sprites/npc/folk/<name>.png
# Prints each run pose's foot spread, to check the legs really swap.
import sys
import numpy as np
from PIL import Image

src, out = sys.argv[1], sys.argv[2]
a = np.asarray(Image.open(src).convert('RGB')).astype(np.int32)
solid = a.max(2) > 28

def runs(v, gap, minlen):
    out, s = [], None
    for i, c in enumerate(list(v) + [False]):
        if c and s is None: s = i
        if not c and s is not None: out.append([s, i]); s = None
    m = []
    for r in out:
        if m and r[0] - m[-1][1] < gap: m[-1][1] = r[1]
        else: m.append(r)
    return [r for r in m if r[1] - r[0] >= minlen]

rows = runs(solid.sum(1) > 2, 14, 60)
assert len(rows) == 2, f'expected 2 rows of poses, found {len(rows)}: {rows}'
figs = []
for (y0, y1), want in zip(rows, (4, 6)):
    band = solid[y0:y1]
    cols = runs(band.sum(0) > 1, 10, 25)
    # (a pose that came out in two pieces: the nearest gaps joined until there are as many as wanted)
    while len(cols) > want:
        k = min(range(len(cols) - 1), key=lambda i: cols[i + 1][0] - cols[i][1])
        cols[k] = [cols[k][0], cols[k + 1][1]]; del cols[k + 1]
    # (two poses touching: the widest piece split at its thinnest column near its middle)
    prof = band.sum(0)
    while len(cols) < want:
        k = max(range(len(cols)), key=lambda i: cols[i][1] - cols[i][0])
        x0, x1 = cols[k]; w = x1 - x0
        cut = x0 + w // 4 + int(np.argmin(prof[x0 + w // 4:x1 - w // 4]))
        cols[k:k + 1] = [[x0, cut], [cut, x1]]
    assert len(cols) == want, f'row {y0}-{y1}: expected {want} poses, found {len(cols)}'
    for x0, x1 in cols:
        m = band[:, x0:x1]
        ys = np.where(m.any(1))[0]
        t, b = ys[0], ys[-1] + 1
        img = a[y0 + t:y0 + b, x0:x1]
        mm = m[t:b]
        # torso: the middle of the body between 30% and 60% of its height
        h = b - t
        ty, tx = np.where(mm[int(h * 0.3):int(h * 0.6)])
        cx = int(np.median(tx)) if len(tx) else (x1 - x0) // 2
        figs.append((img * mm[..., None], cx, mm))

H = max(f[0].shape[0] for f in figs)
half = max(max(cx, f.shape[1] - cx) for f, cx, _ in figs) + 6
CW = half * 2
sheet = np.zeros((H + 4, CW * len(figs), 3), np.uint8)
for i, (img, cx, mm) in enumerate(figs):
    h, w = img.shape[:2]
    ox = i * CW + half - cx; oy = H + 2 - h
    sheet[oy:oy + h, ox:ox + w] = np.maximum(sheet[oy:oy + h, ox:ox + w], img.astype(np.uint8))
    if i >= 4:
        feet = np.where(mm[-max(6, h // 12):].any(0))[0]
        print(f'run pose {i - 3}: feet from {feet.min() - cx:+d} to {feet.max() - cx:+d} px of the torso, height {h}')
Image.fromarray(sheet).save(out)
print(f'{out}: {len(figs)} poses, cells {CW}x{H + 4}')
