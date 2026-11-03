# Re-lays ChatGPT's Hale sheet (docs/hale-art-prompts.md) one figure per equal cell:
# feet on one line, each pose centred on its torso. python3 relay.py in.png out.png
import sys
from PIL import Image
import numpy as np
im = Image.open(sys.argv[1]).convert('RGB'); a = np.asarray(im).astype(int)
fg = a.max(axis=2) > 28
cols = fg.sum(axis=0) > 2
runs = []; x = 0; W = len(cols)
while x < W:
    if cols[x]:
        s = x
        while x < W and cols[x]: x += 1
        runs.append([s, x])
    x += 1
# merge slivers (a raised hand's gap) into their neighbour
runs = [r for r in runs if r[1] - r[0] > 4]
merged = []
for r in runs:
    if merged and r[0] - merged[-1][1] < 12: merged[-1][1] = r[1]
    else: merged.append(r)
# (two poses touching: split a too-wide run at its thinnest column)
cnt = fg.sum(axis=0)
while len(merged) < 8:
    i = max(range(len(merged)), key=lambda j: merged[j][1] - merged[j][0])
    x0, x1 = merged[i]; m = x0 + (x1 - x0) // 4
    cut = m + int(np.argmin(cnt[m:x1 - (x1 - x0) // 4]))
    merged[i:i + 1] = [[x0, cut], [cut + 1, x1]]
assert len(merged) == 8, merged
figs = []
for x0, x1 in merged:
    sub = fg[:, x0:x1]; ys = np.where(sub.any(axis=1))[0]; t, b = ys[0], ys[-1]
    band = sub[int(t + (b - t) * 0.3):int(t + (b - t) * 0.6)]
    xs = np.where(band)[1]; c = xs.mean()
    figs.append((x0, x1, t, b, c))
half = int(max(max(c, (x1 - x0) - c) for x0, x1, t, b, c in figs)) + 6
top = min(f[2] for f in figs) - 4; bot = max(f[3] for f in figs) + 2
H = bot - top + 1; cw = half * 2
out = Image.new('RGB', (cw * 8, H), (0, 0, 0))
for k, (x0, x1, t, b, c) in enumerate(figs):
    piece = im.crop((x0, t, x1, b + 1))
    out.paste(piece, (k * cw + int(half - c), H - 1 - (b - t) - 2))
out.save(sys.argv[2]); print(out.size, merged)
