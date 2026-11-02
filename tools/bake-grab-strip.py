"""bake-grab-strip.py — Cut ChatGPT's grab-and-throw strip (one row of 8 poses of Rurik on
black) into the game's HD sheet format (view/heroHd.js): 696 x 480 cells, 4 across,
his feet on y 460, sized so the ready stance (pose 0) is as tall as his other ready
stance (232 px). Background is flood-filled from the edges (dark armour inside stays),
the same as view/stripImporter.js.

  python3 tools/bake-grab-strip.py <strip.png> <out.png>
"""
import sys
from collections import deque
from PIL import Image

FW, FH, COLS, FEET, STAND = 696, 480, 4, 459, 232


def cut(path):
    im = Image.open(path).convert('RGBA')
    W, H = im.size
    px = im.load()
    bg = bytearray(W * H)
    dark = lambda x, y: max(px[x, y][:3]) < 16
    q = deque()
    for x in range(W):
        for y in (0, H - 1):
            if dark(x, y) and not bg[y * W + x]: bg[y * W + x] = 1; q.append((x, y))
    for y in range(H):
        for x in (0, W - 1):
            if dark(x, y) and not bg[y * W + x]: bg[y * W + x] = 1; q.append((x, y))
    while q:
        x, y = q.popleft()
        for nx, ny in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
            if 0 <= nx < W and 0 <= ny < H and not bg[ny * W + nx] and dark(nx, ny):
                bg[ny * W + nx] = 1; q.append((nx, ny))
    # soft edge: near-black pixels next to the background fade out
    for y in range(H):
        for x in range(W):
            if bg[y * W + x]:
                px[x, y] = (0, 0, 0, 0)
    # figures: runs of columns with anything in them (gaps of empty columns split them)
    cols = [any(not bg[y * W + x] for y in range(H)) for x in range(W)]
    runs, start = [], None
    for x, c in enumerate(cols + [False]):
        if c and start is None: start = x
        if not c and start is not None:
            runs.append([start, x - 1]); start = None
    # merge specks into their nearest figure; keep the 8 widest
    runs = [r for r in runs if r[1] - r[0] > 3]
    while len(runs) > 8:
        i = min(range(len(runs)), key=lambda k: runs[k][1] - runs[k][0])
        r = runs.pop(i)
        j = min(range(len(runs)), key=lambda k: min(abs(runs[k][0] - r[1]), abs(r[0] - runs[k][1])))
        runs[j] = [min(runs[j][0], r[0]), max(runs[j][1], r[1])]
    runs.sort()
    figs = []
    for x0, x1 in runs:
        fig = im.crop((x0, 0, x1 + 1, H))
        bb = fig.getbbox()
        figs.append(fig.crop(bb))
    return figs


def legs_centre(fig):
    """x of the middle of his legs (the bottom third), so he stands on one spot."""
    w, h = fig.size
    a = fig.split()[3].load()
    xs = [x for y in range(int(h * 0.7), h) for x in range(w) if a[x, y] > 60]
    return sum(xs) / len(xs) if xs else w / 2


def bake(src, out):
    figs = cut(src)
    assert len(figs) == 8, f'{len(figs)} figures'
    scale = STAND / figs[0].size[1]
    rows = (len(figs) + COLS - 1) // COLS
    sheet = Image.new('RGBA', (FW * COLS, FH * rows), (0, 0, 0, 0))
    for i, fig in enumerate(figs):
        w, h = fig.size
        f = fig.resize((max(1, round(w * scale)), max(1, round(h * scale))), Image.LANCZOS)
        cx = legs_centre(fig) * scale
        x = round(FW / 2 - cx)
        y = FEET + 1 - f.size[1]
        x = max(2, min(FW - 2 - f.size[0], x))
        assert y >= 0, f'pose {i} too tall'
        sheet.alpha_composite(f, (i % COLS * FW + x, i // COLS * FH + y))
    sheet.save(out, optimize=True)
    print('baked', out, sheet.size, 'scale', round(scale, 3))


if __name__ == '__main__':
    bake(sys.argv[1], sys.argv[2])
