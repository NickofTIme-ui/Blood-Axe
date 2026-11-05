"""fit-fx-strip.py: Lays one of ChatGPT's effect strips (N frames in a row on flat magenta) out
in N exactly equal cells, each frame at the same place in its cell (centred sideways, feet
on one line), on clean #FF00FF, so the game's importer (view/stripImporter.js
importFxStrip: equal cells, one union box) cuts it steadily. With N = 1 it crops a single
object to its contents with a small margin.

  python tools/fit-fx-strip.py <chatgpt.png> <out.png> <frames> [--centre]

(--centre: centre each frame vertically too, for things that float, like a sigil)
"""
import sys
import numpy as np
from PIL import Image

src, out, n = sys.argv[1], sys.argv[2], int(sys.argv[3])
centre = '--centre' in sys.argv
im = Image.open(src).convert('RGB')
a = np.asarray(im).astype(int)
r, g, b = a[..., 0], a[..., 1], a[..., 2]
magenta = (r > 150) & (b > 150) & (g < 110) & (r - g > 90) & (b - g > 90)
fg = ~magenta
# drop specks: rows/columns with only a few pixels don't start a figure
cols = fg.sum(0) > 2
runs, start = [], None
for x, c in enumerate(list(cols) + [False]):
    if c and start is None: start = x
    if not c and start is not None: runs.append([start, x - 1]); start = None
runs = [q for q in runs if q[1] - q[0] > 2]
while len(runs) > n:  # merge the narrowest into its nearest neighbour
    i = min(range(len(runs)), key=lambda k: runs[k][1] - runs[k][0])
    q = runs.pop(i)
    j = min(range(len(runs)), key=lambda k: min(abs(runs[k][0] - q[1]), abs(q[0] - runs[k][1])))
    runs[j] = [min(runs[j][0], q[0]), max(runs[j][1], q[1])]
runs.sort()
assert len(runs) == n, f'{len(runs)} frames found, wanted {n}'
boxes = []
for x0, x1 in runs:
    ys = np.where(fg[:, x0:x1 + 1].sum(1) > 1)[0]
    boxes.append((x0, ys.min(), x1 + 1, ys.max() + 1))
m = 12
cw = max(bx[2] - bx[0] for bx in boxes) + 2 * m
ch = max(bx[3] - bx[1] for bx in boxes) + 2 * m
sheet = Image.new('RGB', (cw * n, ch), (255, 0, 255))
rgba = im.convert('RGBA')
al = Image.fromarray((fg * 255).astype(np.uint8))
rgba.putalpha(al)
for i, (x0, y0, x1, y1) in enumerate(boxes):
    piece = rgba.crop((x0, y0, x1, y1))
    w, h = piece.size
    x = i * cw + (cw - w) // 2
    y = (ch - h) // 2 if centre else ch - m - h
    sheet.paste(piece, (x, y), piece)
sheet.save(out, optimize=True)
print(out, sheet.size, 'cell', cw, 'x', ch)
