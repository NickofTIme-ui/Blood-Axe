# Bake a ChatGPT row of N poses on black into the game's one-row strip of N equal cells:
# black background, every figure on the cell's bottom edge, centred (its bounding box), the
# strip cropped to the poses' rows. Used for the well's set piece (stage/WellRescue.js):
#   python tools/bake-pose-row.py painted.png out.png N
# Prints each pose's box in the source, and for each cell where the figure's frontmost point
# of its top 45% is (the butcher's fist), as fractions of the cell.
import sys
import numpy as np
from PIL import Image

src, out, n = sys.argv[1], sys.argv[2], int(sys.argv[3])
im = Image.open(src).convert('RGB')
a = np.asarray(im).astype(np.int32)
solid = a.max(2) > 28

def runs(v, gap, minlen):
    rs, s = [], None
    for i, c in enumerate(list(v) + [False]):
        if c and s is None: s = i
        if not c and s is not None: rs.append([s, i]); s = None
    m = []
    for r in rs:
        if m and r[0] - m[-1][1] < gap: m[-1][1] = r[1]
        else: m.append(r)
    return [r for r in m if r[1] - r[0] >= minlen]

cols = runs(solid.sum(0) > 1, 12, 20)
while len(cols) > n:
    k = min(range(len(cols) - 1), key=lambda i: cols[i + 1][0] - cols[i][1])
    cols[k] = [cols[k][0], cols[k + 1][1]]; del cols[k + 1]
# (two poses touching: the widest piece split at its thinnest column near its middle)
prof = solid.sum(0)
while len(cols) < n:
    k = max(range(len(cols)), key=lambda i: cols[i][1] - cols[i][0])
    x0, x1 = cols[k]; w = x1 - x0
    lo, hi = x0 + w // 3, x1 - w // 3
    cut = lo + int(np.argmin(prof[lo:hi]))
    cols[k:k + 1] = [[x0, cut], [cut, x1]]
assert len(cols) == n, f'expected {n} poses, found {len(cols)}: {cols}'
boxes = []
for x0, x1 in cols:
    rows = np.where(solid[:, x0:x1].sum(1) > 1)[0]
    boxes.append((x0, x1, rows[0], rows[-1] + 1))
top = min(b[2] for b in boxes); bot = max(b[3] for b in boxes)
fw = max(b[1] - b[0] for b in boxes) + 16
fh = bot - top + 8
strip = Image.new('RGB', (fw * n, fh), (0, 0, 0))
for i, (x0, x1, y0, y1) in enumerate(boxes):
    piece = im.crop((x0, y0, x1, y1))
    dx = i * fw + (fw - (x1 - x0)) // 2
    dy = fh - 4 - (y1 - y0)
    strip.paste(piece, (dx, dy))
    # the frontmost (right) point of its upper part
    up = solid[y0:y0 + int((y1 - y0) * 0.45), x0:x1]
    xs = np.where(up.sum(0) > 0)[0]
    fx = xs[-1]; fy = np.where(up[:, fx])[0].mean()
    print(f'pose {i}: box {x0},{y0}-{x1},{y1}  front point at cell ({(dx - i*fw + fx)/fw:.3f}, {(dy + fy)/fh:.3f})')
strip.save(out)
print(out, strip.size, 'cell', fw, fh)
