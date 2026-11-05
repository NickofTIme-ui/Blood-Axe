"""bake-vexa-strip.py: Cut one of ChatGPT's Vexa strips (one row of N poses on black) into
the HD sheet format the Rogue's other sheets use (view/heroHd.js): 416 x 480 cells, one
row, her feet on y 459, sized so pose `ref` is `tall` px high (the HD sheets are 2x the
game: her guard stance, 90 px in game, is 180 here).

  python tools/bake-vexa-strip.py <strip.png> <out.png> <frames> [ref] [tall] [--drawn]

--drop=0.008 also drops loose bits under 0.8% of her size (a thrown star, a mine).
--flip=5,6 mirrors those poses (one ChatGPT drew facing left).
--drawn keeps each pose's height off the floor as ChatGPT drew it (jumps, airborne cuts):
the lowest boot in the strip is the floor. Without it every pose stands on the floor.
Background is flood-filled from the edges, as tools/bake-grab-strip.py does; touching
figures are split by growing each body out through the ink (the same method).

The sheets this makes are listed in src/data/vexaArt.js (heroHdAssets.js is regenerated
on the PC by tools/compile-hero-hd.mjs, so they are kept out of it, like data/grabArt.js).
"""
import sys
from collections import deque
from PIL import Image

FW, FH, FEET = 416, 480, 459


def background(im):
    W, H = im.size
    px = im.load()
    bg = bytearray(W * H)
    dark = lambda x, y: max(px[x, y][:3]) < 18 or px[x, y][3] < 20
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
    for y in range(H):
        for x in range(W):
            if bg[y * W + x]: px[x, y] = (0, 0, 0, 0)
    return bg


DROP = 0.0  # --drop=0.008: also drop loose bits under that share of the biggest (thrown stars, a mine)


def cut(path, n):
    """The n figures, left to right, each as (image, left, top) in the source."""
    im = Image.open(path).convert('RGBA')
    W, H = im.size
    bg = background(im)
    # drop specks: ink components under 40 px
    lab = [0] * (W * H)
    comps = []
    for p in range(W * H):
        if bg[p] or lab[p]: continue
        q = [p]; lab[p] = len(comps) + 1; pts = []
        while q:
            k = q.pop(); pts.append(k); x = k % W
            for v in (k - 1, k + 1, k - W, k + W):
                if 0 <= v < W * H and not bg[v] and not lab[v] and abs(v % W - x) <= 1:
                    lab[v] = lab[p]; q.append(v)
        comps.append(pts)
    px = im.load()
    big = max(len(p) for p in comps)
    for pts in comps:
        if len(pts) < max(40, big * DROP):
            for k in pts: bg[k] = 1; px[k % W, k // W] = (0, 0, 0, 0)
    cols = [any(not bg[y * W + x] for y in range(H)) for x in range(W)]
    runs, start = [], None
    for x, c in enumerate(cols + [False]):
        if c and start is None: start = x
        if not c and start is not None: runs.append([start, x - 1]); start = None
    runs = [r for r in runs if r[1] - r[0] > 3]
    while len(runs) > n:  # merge the narrowest into its nearest neighbour
        i = min(range(len(runs)), key=lambda k: runs[k][1] - runs[k][0])
        r = runs.pop(i)
        j = min(range(len(runs)), key=lambda k: min(abs(runs[k][0] - r[1]), abs(r[0] - runs[k][1])))
        runs[j] = [min(runs[j][0], r[0]), max(runs[j][1], r[1])]
    runs.sort()
    if len(runs) < n:
        return split_touching(im, bg, W, H, n)
    figs = []
    for x0, x1 in runs:
        fig = im.crop((x0, 0, x1 + 1, H))
        l, t, r, b = fig.getbbox()
        figs.append((fig.crop((l, t, r, b)), x0 + l, t))
    return figs


def split_touching(im, bg, W, H, n):
    ink = [sum(1 for y in range(H) if not bg[y * W + x]) for x in range(W)]
    R = 30
    smooth = [sum(ink[max(0, x - R):x + R]) for x in range(W)]
    centres = []
    for x in sorted(range(W), key=lambda x: -smooth[x]):
        if all(abs(x - c) > W // (n * 2 + 2) for c in centres): centres.append(x)
        if len(centres) == n: break
    centres.sort()
    lab = [-1] * (W * H)
    q = deque()
    for k, c in enumerate(centres):
        for y in range(H):
            if not bg[y * W + c]: lab[y * W + c] = k; q.append((c, y))
    while q:
        x, y = q.popleft()
        for nx, ny in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1), (x + 1, y + 1), (x - 1, y - 1), (x + 1, y - 1), (x - 1, y + 1)):
            if 0 <= nx < W and 0 <= ny < H and not bg[ny * W + nx] and lab[ny * W + nx] < 0:
                lab[ny * W + nx] = lab[y * W + x]; q.append((nx, ny))
    src = im.load()
    figs = []
    for k in range(n):
        fig = Image.new('RGBA', (W, H), (0, 0, 0, 0))
        d = fig.load()
        for y in range(H):
            for x in range(W):
                if lab[y * W + x] == k: d[x, y] = src[x, y]
        l, t, r, b = fig.getbbox()
        figs.append((fig.crop((l, t, r, b)), l, t))
    return figs


def legs_centre(fig):
    w, h = fig.size
    a = fig.split()[3].load()
    xs = [x for y in range(int(h * 0.75), h) for x in range(w) if a[x, y] > 60]
    return sum(xs) / len(xs) if xs else w / 2


def steady_up(sheet, n, reach=10):
    """--steady (an idle): shift every pose so its body sits exactly on pose 0's (the best
    match of their pixels within `reach` px), or ChatGPT's few-px drift makes her shimmer."""
    import numpy as np
    cells = [sheet.crop((i * FW, 0, (i + 1) * FW, FH)) for i in range(n)]
    grey = lambda c: np.asarray(c.convert('LA')).astype(np.float32)
    g0 = grey(cells[0])
    out = Image.new('RGBA', sheet.size, (0, 0, 0, 0))
    out.alpha_composite(cells[0], (0, 0))
    for i in range(1, n):
        gi = grey(cells[i])
        best = None
        for dy in range(-reach, reach + 1):
            for dx in range(-reach, reach + 1):
                s = np.roll(np.roll(gi, dy, 0), dx, 1)
                d = np.abs(s[..., 0] * s[..., 1] - g0[..., 0] * g0[..., 1]).mean()
                if best is None or d < best[0]: best = (d, dx, dy)
        _, dx, dy = best
        out.paste(Image.fromarray(np.roll(np.roll(np.asarray(cells[i]), dy, 0), dx, 1)), (i * FW, 0))
        print(f'  pose {i} steadied by {dx},{dy}')
    return out


def bake(src, out, n, ref=0, tall=180, drawn=False, flip=(), steady=False):
    figs = cut(src, n)
    figs = [(f.transpose(Image.FLIP_LEFT_RIGHT) if i in flip else f, l, t) for i, (f, l, t) in enumerate(figs)]
    assert len(figs) == n, f'{len(figs)} figures, wanted {n}'
    scale = tall / figs[ref][0].size[1]
    floor = max(t + f.size[1] for f, _, t in figs)  # the lowest boot in the strip
    sheet = Image.new('RGBA', (FW * n, FH), (0, 0, 0, 0))
    for i, (fig, _, top) in enumerate(figs):
        w, h = fig.size
        f = fig.resize((max(1, round(w * scale)), max(1, round(h * scale))), Image.LANCZOS)
        if f.size[0] > FW - 4 or f.size[1] > FEET:  # too big for the cell: shrink this one to fit
            k = min((FW - 4) / f.size[0], FEET / f.size[1])
            f = f.resize((max(1, int(f.size[0] * k)), max(1, int(f.size[1] * k))), Image.LANCZOS)
            print(f'  pose {i} shrunk to fit ({k:.2f})')
        cx = legs_centre(fig) * f.size[0] / w
        x = max(2, min(FW - 2 - f.size[0], round(FW / 2 - cx)))
        lift = round((floor - (top + h)) * scale) if drawn else 0
        y = max(0, FEET + 1 - f.size[1] - lift)
        sheet.alpha_composite(f, (i * FW + x, y))
    if steady: sheet = steady_up(sheet, n)
    sheet.save(out, optimize=True)
    print('baked', out, sheet.size, 'scale', round(scale, 3))


if __name__ == '__main__':
    args = [a for a in sys.argv[1:] if not a.startswith('--')]
    DROP =next((float(a[7:]) for a in sys.argv if a.startswith('--drop=')), 0.0)
    flip = [int(v) for a in sys.argv if a.startswith('--flip=') for v in a[7:].split(',')]
    bake(args[0], args[1], int(args[2]), *(int(a) for a in args[3:5]), drawn='--drawn' in sys.argv, flip=flip, steady='--steady' in sys.argv)
