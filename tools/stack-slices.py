"""Sprite stacking: turn four flat views of an object (top, side, front, back) into a row of
horizontal slices that the game draws on top of each other, 1 slice apart, so the pile reads as a
small 3D object that can turn to any angle (technique: SpriteCook, "Sprite stacking for fake 3D
pixel art cars and props", 14 Nov 2026; notes in docs/sprite-stacking.md).

  python tools/stack-slices.py sheet.png out.png --width 40

The sheet holds four drawings on a transparent (or plain light) background, in a 2x2 grid:
top view (front pointing DOWN), side view (front pointing LEFT), front view, back view.
A cell of the object exists where all the views agree: the side view says how tall it is along
its length, the front/back views how wide it is at each height. The top of each column takes the
top view's colour; the outer 2 px of each slice take the colour of the side/front/back view facing
that way, at the same height. Writes one row of slices, the ground slice on the left.
"""
import argparse

import numpy as np
from PIL import Image


def alpha_of(sheet, bg_tol):
    """the drawing's mask: its alpha, or (on an opaque sheet) whatever differs from the corner colour"""
    a = sheet[..., 3]
    if (a < 128).mean() > 0.05:
        return a >= 128
    bg = sheet[2, 2, :3].astype(int)
    return np.abs(sheet[..., :3].astype(int) - bg).sum(-1) > bg_tol


def find_views(sheet, mask):
    """the four biggest drawings, in reading order: [top, side, front, back]"""
    from collections import deque
    h, w = mask.shape
    small = mask[::2, ::2]
    seen = np.zeros(small.shape, bool)
    boxes = []
    for y0, x0 in zip(*np.nonzero(small)):
        if seen[y0, x0]:
            continue
        q = deque([(y0, x0)]); seen[y0, x0] = True
        ys = [y0]; xs = [x0]
        while q:
            y, x = q.popleft()
            for yy in range(y - 2, y + 3):
                for xx in range(x - 2, x + 3):
                    if 0 <= yy < small.shape[0] and 0 <= xx < small.shape[1] and small[yy, xx] and not seen[yy, xx]:
                        seen[yy, xx] = True; q.append((yy, xx)); ys.append(yy); xs.append(xx)
        boxes.append((len(ys), 2 * min(xs), 2 * min(ys), 2 * max(xs) + 2, 2 * max(ys) + 2))
    boxes = sorted(boxes, reverse=True)[:4]
    assert len(boxes) == 4, f'found {len(boxes)} drawings, expected 4'
    boxes.sort(key=lambda b: (round((b[2] + b[4]) / 2 / (h / 2.2)), b[1]))
    views = []
    for _, x0, y0, x1, y1 in boxes:
        v = sheet[y0:y1, x0:x1].copy()
        m = mask[y0:y1, x0:x1]
        ys, xs = np.nonzero(m)
        v = v[ys.min():ys.max() + 1, xs.min():xs.max() + 1]
        m = m[ys.min():ys.max() + 1, xs.min():xs.max() + 1]
        v[..., 3] = np.where(m, 255, 0)
        views.append(v)
    return views


def fit(v, w, h):
    """resize with a box filter for colour, the mask thresholded"""
    im = Image.fromarray(v)
    rgb = np.array(im.convert('RGB').resize((w, h), Image.BOX))
    a = np.array(im.getchannel('A').resize((w, h), Image.BOX)) >= 128
    return np.dstack([rgb, np.where(a, 255, 0).astype(np.uint8)])


def edge_colour(view, row, i):
    xs = np.nonzero(view[row, :, 3])[0]
    return None if len(xs) == 0 else view[row, min(max(i, xs[0]), xs[-1]), :3]


def carve(top, side, front, back, shade):
    """top (L, W); side (H, L), column = along the length; front/back (H, W). Row 0 = the top."""
    L, W = top.shape[:2]
    H = side.shape[0]
    occ = np.zeros((H, L, W), bool)
    for z in range(H):
        r = H - 1 - z
        along = side[r, :, 3] > 0
        across = (front[r, :, 3] > 0) | (back[r, :, 3] > 0)
        occ[z] = (top[..., 3] > 0) & along[:, None] & across[None, :]
    vol = np.zeros((H, L, W, 4), np.uint8)
    covered = np.zeros((L, W), bool)
    for z in range(H - 1, -1, -1):
        r = H - 1 - z
        above = covered.copy()
        covered |= occ[z]
        o = occ[z]
        ix = np.arange(W)[None, :].repeat(L, 0)
        iy = np.arange(L)[:, None].repeat(W, 1)
        d = np.stack([
            ix - np.maximum.accumulate(np.where(~o, ix, -1), axis=1),
            np.minimum.accumulate(np.where(~o, ix, W)[:, ::-1], axis=1)[:, ::-1] - ix,
            iy - np.maximum.accumulate(np.where(~o, iy, -1), axis=0),
            np.minimum.accumulate(np.where(~o, iy, L)[::-1], axis=0)[::-1] - iy,
        ])
        face, depth = d.argmin(0), d.min(0)
        for y, x in zip(*np.nonzero(o)):
            if not above[y, x]:
                c = top[y, x, :3]
            elif depth[y, x] > 2:
                c = vol[z + 1, y, x, :3]
            else:
                f = face[y, x]
                # the face it shows: -x/+x the long sides (side view); -y the back, +y the front
                # (the top view's front points down)
                c = edge_colour(side, r, y) if f < 2 else edge_colour(back, r, x) if f == 2 else edge_colour(front, r, x)
                if c is None:
                    c = top[y, x, :3]
                if shade:
                    c = (np.asarray(c, float) * (1 - shade * (1 - z / max(H - 1, 1)) - shade * 0.4)).clip(0, 255)
            vol[z, y, x] = (*np.asarray(c, np.uint8), 255)
    return vol


def main():
    p = argparse.ArgumentParser()
    p.add_argument('sheet'); p.add_argument('out')
    p.add_argument('--width', type=int, default=40, help='slice width in px (the top view across)')
    p.add_argument('--side-nose', choices=['left', 'right'], default='left')
    p.add_argument('--shade', type=float, default=0.25)
    p.add_argument('--bg-tol', type=int, default=60)
    a = p.parse_args()
    sheet = np.array(Image.open(a.sheet).convert('RGBA'))
    views = find_views(sheet, alpha_of(sheet, a.bg_tol))
    top = max(views, key=lambda v: v.shape[0] / v.shape[1])
    side = max((v for v in views if v is not top), key=lambda v: v.shape[1] / v.shape[0])
    front, back = [v for v in views if v is not top and v is not side]
    if a.side_nose == 'left':
        side = side[:, ::-1]  # column = along y, the front (down in the top view) at the end
    W = a.width
    L = round(top.shape[0] * W / top.shape[1])
    H = round(side.shape[0] * L / side.shape[1])
    vol = carve(fit(top, W, L), fit(side, L, H), fit(front, W, H), fit(back, W, H), a.shade)
    Image.fromarray(np.concatenate(list(vol), axis=1)).save(a.out)
    print(f'{len(vol)} slices of {W} x {L} px -> {a.out}')


if __name__ == '__main__':
    main()
