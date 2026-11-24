"""Cut the ChatGPT mage spell sheets (art/mage-fx/*.png) into equal-cell strips.

Usage: python tools/cut-mage-fx.py <src.png> <out.png> <frames> [glow|solid|magenta] [centre|left]

glow:    painted on black. Light becomes alpha (alpha = brightest channel, colour
         un-premultiplied), so the strip lays over the scene like light and the game
         draws it with additive blending.
magenta: solid art on #FF00FF; magenta becomes transparent.

The pieces are the runs of inked columns (specks joined to a neighbour, two touching
frames split at their thinnest column), each is centred in a cell as wide as the widest piece, and every
cell keeps the sheet's full height so a shared ground line stays put.
"""
import sys
from PIL import Image
import numpy as np

src, out, n = sys.argv[1], sys.argv[2], int(sys.argv[3])
mode = sys.argv[4] if len(sys.argv) > 4 else 'glow'
align = sys.argv[5] if len(sys.argv) > 5 else 'centre'  # or 'left': a wave growing out of one side
im = np.asarray(Image.open(src).convert('RGB')).astype(np.float32)
H, W, _ = im.shape

if mode == 'magenta':
    r, g, b = im[..., 0], im[..., 1], im[..., 2]
    bg = (r > 170) & (b > 170) & (g < 110)
    a = np.where(bg, 0, 255).astype(np.float32)
    rgb = im.copy()
    # despill the magenta fringe
    spill = np.minimum(r, b) - g
    edge = (~bg) & (spill > 40)
    rgb[edge, 0] = np.minimum(r[edge], g[edge] + 40)
    rgb[edge, 2] = np.minimum(b[edge], g[edge] + 40)
    on = ~bg
elif mode == 'solid':
    # fire and smoke on black: near-black falls away, the colour stays as painted (dark
    # smoke must darken the scene, so it is drawn normally, not added)
    m = im.max(axis=2)
    a = np.clip((m - 6) * 9, 0, 255)
    rgb = im
    on = a > 60
else:
    m = im.max(axis=2)
    a = np.clip((m - 10) * (255 / 235), 0, 255)
    safe = np.maximum(m, 1)[..., None]
    rgb = np.clip(im * (255 / safe), 0, 255)
    on = a > 30

ink = on.sum(axis=0)
# pieces = runs of inked columns; then join across the narrowest gaps until there are n,
# or split the widest piece at its thinnest column if two frames touch
runs = []
x = 0
while x < W:
    if ink[x]:
        s0 = x
        while x < W and ink[x]:
            x += 1
        runs.append([s0, x])
    x += 1
while len(runs) != n:
    if len(runs) > n:
        # a speck sits nearer one neighbour: join the pair with the smallest gap,
        # but never two big pieces when a small one could go
        def cost(i):
            g = runs[i + 1][0] - runs[i][1]
            small = min(runs[i][1] - runs[i][0], runs[i + 1][1] - runs[i + 1][0])
            return g + small * 0.5
        i = min(range(len(runs) - 1), key=cost)
        runs[i] = [runs[i][0], runs[i + 1][1]]
        del runs[i + 1]
    else:
        i = max(range(len(runs)), key=lambda k: runs[k][1] - runs[k][0])
        s0, e0 = runs[i]
        q = (e0 - s0) // 4
        m = s0 + q + int(np.argmin(ink[s0 + q:e0 - q]))
        runs[i:i + 1] = [[s0, m], [m, e0]]

pad = 6
cw = max(e - s for s, e in runs) + pad * 2
rgba = np.dstack([rgb, a]).astype(np.uint8)
sheet = Image.new('RGBA', (cw * n, H), (0, 0, 0, 0))
for k, (s, e) in enumerate(runs):
    piece = Image.fromarray(rgba[:, s:e])
    sheet.paste(piece, (k * cw + (pad if align == 'left' else (cw - (e - s)) // 2), 0))
# trim the shared empty top and bottom
bb = sheet.getbbox()
sheet = sheet.crop((0, bb[1], cw * n, bb[3]))
sheet.save(out, optimize=True)
print(out, sheet.size, 'cell', cw, [e - s for s, e in runs])
