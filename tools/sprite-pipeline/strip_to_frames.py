"""
strip_to_frames.py - Turns an AI-generated sprite strip (N poses in a row on black)
into clean, game-ready pixel frames.

  1. split the strip into N equal cells
  2. remove the black background (flood fill from the edges only, so dark armour stays)
  3. measure his size from head-top to feet and scale every animation to the same height
  4. line up the feet on one baseline and the torso on one centre line
  5. area-downscale, hard alpha edge, then lock to ONE shared palette
     (the palette is created from the first strip processed and reused for all others)

usage: python strip_to_frames.py <strip.png> <frames> <name> [--target 112]
"""
import json
import os
import sys
from collections import deque

import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, 'frames')
PALETTE_FILE = os.path.join(HERE, 'palette.png')
SCALE_FILE = os.path.join(HERE, 'scale.json')

FW, FH = 208, 240        # output frame size (room for sword swings)
AX, AY = 104, 230        # anchor = feet position inside the frame
TARGET = 112             # standing height, head-top to feet, in game pixels


def remove_background(rgb, thresh=6):
    h, w, _ = rgb.shape
    dark = rgb.max(axis=2) < thresh
    bg = np.zeros((h, w), bool)
    q = deque()
    for x in range(w):
        for y in (0, h - 1):
            if dark[y, x] and not bg[y, x]:
                bg[y, x] = True
                q.append((y, x))
    for y in range(h):
        for x in (0, w - 1):
            if dark[y, x] and not bg[y, x]:
                bg[y, x] = True
                q.append((y, x))
    while q:
        y, x = q.popleft()
        for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            ny, nx = y + dy, x + dx
            if 0 <= ny < h and 0 <= nx < w and dark[ny, nx] and not bg[ny, nx]:
                bg[ny, nx] = True
                q.append((ny, nx))
    fg = ~bg
    # drop specks: rows/cols noise
    return fg


def largest_blob(fg):
    """Keep the main figure plus any sizeable pieces (sword tip, hair strands);
    drop tiny specks and slivers of neighbouring frames touching the cell edge."""
    from scipy import ndimage
    lab, n = ndimage.label(fg, structure=np.ones((3, 3)))
    if n == 0:
        return fg
    sizes = ndimage.sum(fg, lab, range(1, n + 1))
    big = sizes.max()
    keep = np.zeros(n + 1, bool)
    h, w = fg.shape
    for i, sz in enumerate(sizes, start=1):
        if sz < big * 0.004:
            continue
        ys, xs = np.nonzero(lab == i)
        touches_side = xs.min() <= 6 or xs.max() >= w - 7
        if touches_side and sz < big * 0.2:
            continue
        keep[i] = True
    return keep[lab]


def _unused_largest_blob(fg):
    h, w = fg.shape
    seen = np.zeros_like(fg)
    best = None
    best_n = 0
    for y0, x0 in zip(*np.nonzero(fg)):
        if seen[y0, x0]:
            continue
        comp = []
        q = deque([(y0, x0)])
        seen[y0, x0] = True
        while q:
            y, x = q.popleft()
            comp.append((y, x))
            for dy in (-1, 0, 1):
                for dx in (-1, 0, 1):
                    ny, nx = y + dy, x + dx
                    if 0 <= ny < h and 0 <= nx < w and fg[ny, nx] and not seen[ny, nx]:
                        seen[ny, nx] = True
                        q.append((ny, nx))
        if len(comp) > best_n:
            best_n, best = len(comp), comp
    out = np.zeros_like(fg)
    if best:
        ys, xs = zip(*best)
        out[list(ys), list(xs)] = True
    return out


def hair_top(rgb, mask):
    """Top of the head: first row with a few hair/skin-coloured pixels."""
    r, g, b = [rgb[..., i].astype(float) for i in range(3)]
    mx = np.maximum(np.maximum(r, g), b)
    mn = np.minimum(np.minimum(r, g), b)
    sat = (mx - mn) / np.maximum(mx, 1)
    brownish = (r > g) & (g >= b * 0.8) & (sat > 0.3) & (mx > 45) & (mx < 230) & mask
    rows = np.where(brownish.sum(axis=1) >= 3)[0]
    return rows[0] if len(rows) else np.where(mask.any(axis=1))[0][0]


def process(path, n, name, target=TARGET, fixed_scale=None, ref=None, keep_air=False):
    src = np.array(Image.open(path).convert('RGB'))
    H, W, _ = src.shape
    cells = []
    from scipy import ndimage
    fg_all = remove_background(src)
    # label on a slightly thickened mask so a blade split from its hilt by a dark outline stays attached
    joined = ndimage.binary_dilation(fg_all, structure=np.ones((3, 3)), iterations=2)
    lab, nl = ndimage.label(joined, structure=np.ones((3, 3)))
    lab = lab * fg_all
    sizes = ndimage.sum(fg_all, lab, range(1, nl + 1))
    per_fig = fg_all.sum() / n
    big = [i + 1 for i, sz in enumerate(sizes) if sz > per_fig * 0.3]
    if len(big) == n:
        # each figure is its own shape: assign every smaller piece to the nearest figure
        cents = {i: ndimage.center_of_mass(fg_all, lab, i)[1] for i in big}
        big.sort(key=lambda i: cents[i])
        owner = np.zeros(nl + 1, int)
        for i, sz in enumerate(sizes, start=1):
            if sz < per_fig * 0.002:
                continue
            cx = ndimage.center_of_mass(fg_all, lab, i)[1]
            cands = big
            px = src[lab == i].astype(float)
            sat = ((px.max(axis=1) - px.min(axis=1)) / np.maximum(px.max(axis=1), 1)).mean()
            if sat < 0.25:  # loose blade piece: belongs to a figure on its left (he faces right)
                cands = [b for b in big if cents[b] <= cx + 20] or big
            owner[i] = min(cands, key=lambda b: abs(cents[b] - cx))
        masks = [(owner[lab] == b) & fg_all for b in big]
        print(f'{name}: split by shape')
    else:
        print(f'{name}: {len(big)} shapes found, splitting touching figures at the emptiest columns')
        cw = W / n
        prof = fg_all.sum(axis=0)
        # find each body's centre from the "thick" parts (erosion strips thin blades and hair)
        core = ndimage.binary_erosion(fg_all, iterations=6)
        cx_all = np.nonzero(core)[1].astype(float)
        centers = np.array([(i + 0.5) * cw for i in range(n)])
        for _ in range(30):
            lab1 = np.argmin(np.abs(cx_all[:, None] - centers[None, :]), axis=1)
            centers = np.array([cx_all[lab1 == k].mean() if (lab1 == k).any() else centers[k] for k in range(n)])
        centers.sort()
        cuts = [0]
        for i in range(1, n):
            d = centers[i] - centers[i - 1]
            lo, hi = int(centers[i - 1] + 0.25 * d), int(centers[i] - 0.1 * d)
            seg = prof[lo:hi]
            # he faces right, so blades stick out to the right: take the RIGHT-most emptiest column
            cuts.append(lo + int(np.nonzero(seg == seg.min())[0][-1]))
        cuts.append(W)
        bigset = set(big)
        # bodies: the big shapes, cut into cells
        bodies = [np.zeros((H, W), bool) for _ in range(n)]
        for b in big:
            comp = lab == b
            xs = np.nonzero(comp)[1]
            share = [((xs >= cuts[i]) & (xs < cuts[i + 1])).mean() for i in range(n)]
            if max(share) > 0.85:
                bodies[int(np.argmax(share))] |= comp          # one figure: keep it whole
            else:
                # figures touching: cut, but only between the figures this shape contains
                inside = [k for k in range(n) if xs.min() <= centers[k] <= xs.max()] or [int(np.argmax(share))]
                k0, k1 = min(inside), max(inside)
                for i in range(n):
                    x0 = 0 if i == k0 else cuts[i]
                    x1 = W if i == k1 else cuts[i + 1]
                    if k0 <= i <= k1:
                        bodies[i][:, x0:x1] |= comp[:, x0:x1]
        # every smaller piece (sword tips, hair, cape scraps) goes whole to the nearest body
        dists = [ndimage.distance_transform_edt(~b) for b in bodies]
        masks = [b.copy() for b in bodies]
        for i, sz in enumerate(sizes, start=1):
            if i in bigset or sz < per_fig * 0.002:
                continue
            comp = lab == i
            d = [dt[comp].min() for dt in dists]
            # a loose piece of steel (sword blade) belongs to a figure on its LEFT: he faces right
            px = src[comp].astype(float)
            sat = ((px.max(axis=1) - px.min(axis=1)) / np.maximum(px.max(axis=1), 1)).mean()
            if sat < 0.25:
                ccx = np.nonzero(comp)[1].mean()
                body_cx = [np.nonzero(b)[1].mean() if b.any() else 1e9 for b in bodies]
                d = [dd if bc <= ccx + 20 else dd + 1e6 for dd, bc in zip(d, body_cx)]
            masks[int(np.argmin(d))] |= comp
    for fg in masks:
        rgb = src
        ys, xs = np.nonzero(fg)
        top, bottom = ys.min(), ys.max()
        head = hair_top(rgb, fg)
        hh = bottom - top
        band = fg[top + int(hh * 0.25): top + int(hh * 0.6)]
        cx = np.mean(np.nonzero(band)[1])
        cells.append(dict(rgb=rgb, fg=fg, bottom=bottom, head=head, cx=cx))

    if keep_air:  # keep each pose's height above the ground (leaps stay in the air)
        ground = max(c['bottom'] for c in cells)
        for c in cells:
            c['air'] = ground - c['bottom']
    heights = [c['bottom'] - c['head'] for c in cells]
    stand = (ref if ref > 20 else heights[ref]) if ref is not None else max(heights)
    print('  per-frame head-to-feet:', heights)
    s = fixed_scale or target / stand
    print(f'{name}: {n} frames, standing height {stand}px -> scale {s:.3f}')

    frames = []
    for c in cells:
        ys, xs = np.nonzero(c['fg'])
        y0, y1, x0, x1 = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
        rgba = np.dstack([c['rgb'][y0:y1, x0:x1], (c['fg'][y0:y1, x0:x1] * 255).astype(np.uint8)]).astype(float)
        c = dict(c, cx=c['cx'] - x0, bottom=c['bottom'] - y0)
        a = rgba[..., 3:] / 255
        pre = np.dstack([rgba[..., :3] * a, rgba[..., 3:]]).astype(np.uint8)
        img = Image.fromarray(pre, 'RGBA')
        w, h = img.size
        img = img.resize((max(1, round(w * s)), max(1, round(h * s))), Image.BOX)
        p = np.array(img).astype(float)
        al = p[..., 3:] / 255
        rgb = np.where(al > 0, p[..., :3] / np.maximum(al, 1e-3), 0).clip(0, 255)
        alpha = (al[..., 0] > 0.5) * 255
        small = Image.fromarray(np.dstack([rgb, alpha]).astype(np.uint8), 'RGBA')
        fr = Image.new('RGBA', (FW, FH), (0, 0, 0, 0))
        fr.alpha_composite(small, (round(AX - c['cx'] * s), round(AY - c['bottom'] * s - c.get('air', 0) * s)))
        frames.append(fr)

    # shared palette
    if os.path.exists(PALETTE_FILE):
        pal = Image.open(PALETTE_FILE)
    else:
        strip = Image.new('RGB', (FW * len(frames), FH))
        for i, f in enumerate(frames):
            bgimg = Image.new('RGB', (FW, FH), (0, 0, 0))
            bgimg.paste(f, (0, 0), f)
            strip.paste(bgimg, (i * FW, 0))
        pal = strip.quantize(64, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE)
        pal.save(PALETTE_FILE)
    out = []
    for f in frames:
        q = f.convert('RGB').quantize(palette=pal, dither=Image.Dither.NONE).convert('RGBA')
        q.putalpha(f.getchannel('A'))
        out.append(q)

    os.makedirs(OUT, exist_ok=True)
    for i, f in enumerate(out):
        f.save(os.path.join(OUT, f'{name}_{i}.png'))
    return out, s


def preview(frames, path, scale=2, ms=120, pingpong=False):
    bg = (36, 28, 26, 255)
    seq = []
    for f in frames:
        c = Image.new('RGBA', f.size, bg)
        c.alpha_composite(f)
        seq.append(c.convert('RGB').resize((f.size[0] * scale, f.size[1] * scale), Image.NEAREST))
    if pingpong:
        seq = seq + seq[-2:0:-1]
    seq[0].save(path, save_all=True, append_images=seq[1:], duration=ms, loop=0)


if __name__ == '__main__':
    p, n, name = sys.argv[1], int(sys.argv[2]), sys.argv[3]
    ref = int(sys.argv[4]) if len(sys.argv) > 4 and sys.argv[4] != '-' else None
    keep_air = len(sys.argv) > 5 and sys.argv[5] == 'air'
    fr, s = process(p, n, name, ref=ref, keep_air=keep_air)
    preview(fr, os.path.join(HERE, f'{name}.gif'))
