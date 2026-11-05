"""bake-throat-pair.py — Cut a ChatGPT throat-finisher PAIR strip (one row of 4 poses of
Rurik holding a man, on black; data/throatArt.js PAIR_DRAWN) into the HD sheet format
(view/heroHd.js): 696 x 480 cells, 4 across, feet on y 460. Each pose is placed by
Rurik's tabard (the red banner down his front: x positions read off the strip by eye,
since the men beside him change) at the cell's centre, and the strip is sized so Rurik
stands as tall as in his other upright poses.

  python3 tools/bake-throat-pair.py <strip.png> <out.png> <tabard x0,x1,x2,x3> <man x> [rurik height]
<man x>: where the man's feet are in pose 3 (the shove), to say where his own sprite
takes over; the script prints it as world px in front of Rurik (PAIR_DRAWN release).
"""
import sys
from PIL import Image, ImageDraw, ImageChops

FW, FH, COLS, FEET, RES = 696, 480, 4, 459, 2
STAND = 242  # Rurik's upright height in the HD sheets (rurik-*-finCut pose 7)

src, out, tabs, man = sys.argv[1], sys.argv[2], [int(v) for v in sys.argv[3].split(',')], int(sys.argv[4])
im = Image.open(src).convert('RGB')
W, H = im.size
# background: the black flooded in from the edges (dark armour inside the figures stays)
lum = im.convert('L')
mask = lum.point(lambda v: 255 if v > 14 else 0)
fill = mask.copy()
for x in range(0, W, 7):
    for y in (0, H - 1):
        if fill.getpixel((x, y)) == 0: ImageDraw.floodfill(fill, (x, y), 128)
for y in range(0, H, 7):
    for x in (0, W - 1):
        if fill.getpixel((x, y)) == 0: ImageDraw.floodfill(fill, (x, y), 128)
alpha = fill.point(lambda v: 0 if v == 128 else 255)
rgba = im.copy(); rgba.putalpha(alpha)
A = alpha.load()
# frames: the 4 widest column runs
cols = [any(A[x, y] for y in range(0, H, 2)) for x in range(W)]
runs, s = [], None
for x, c in enumerate(cols + [False]):
    if c and s is None: s = x
    if not c and s is not None: runs.append((s, x)); s = None
runs = sorted(sorted(runs, key=lambda r: r[0] - r[1])[:4])
assert len(runs) == 4, runs
# Rurik's height: pose 3 (he stands upright, shoving), the ink above/below his tabard
t3 = tabs[3]
top = next(y for y in range(H) if any(A[x, y] for x in range(t3 - 110, t3 + 30)))
bot = max(y for y in range(H) if any(A[x, y] for x in range(runs[3][0], runs[3][1])))
k = (float(sys.argv[5]) if len(sys.argv) > 5 else STAND) / (bot - top)
sheet = Image.new('RGBA', (FW * COLS, FH), (0, 0, 0, 0))
for i, ((x0, x1), tx) in enumerate(zip(runs, tabs)):
    fb = max(y for y in range(H) if any(A[x, y] for x in range(x0, x1)))
    fig = rgba.crop((x0, 0, x1, fb + 1))
    fig = fig.resize((round(fig.width * k), round(fig.height * k)), Image.LANCZOS)
    cx = FW // 2 - round((tx - x0) * k)
    cy = FEET + 1 - fig.height
    cell = Image.new('RGBA', (FW, FH), (0, 0, 0, 0))
    cell.alpha_composite(fig, (cx, cy)) if cx >= 0 else cell.paste(fig.crop((-cx, 0, fig.width, fig.height)), (0, cy), fig.crop((-cx, 0, fig.width, fig.height)))
    sheet.alpha_composite(cell, (i * FW, 0))
sheet.save(out, optimize=True)
print(f'scale {k:.3f}  release {round((man - t3) * k / RES)} world px')
