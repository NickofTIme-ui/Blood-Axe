"""line-up-bloodied.py — Lines a ChatGPT bloodied repaint up on a hero's clean HD sheet.

The clean sheet's poses were laid out in a grid on black for ChatGPT (layout.json:
the crop box l,t,w,h taken from each 416x480 cell, gap, cols, upscale S). ChatGPT hands
back the same grid, a little resized and nudged. For each pose this finds the scale and
offset that best fits the repaint's figure onto the clean figure, then writes a sheet
frame-for-frame like the clean one, cut to the clean silhouette exactly (so only the
colours inside him change: view/BloodCoat.js fades it over him).

  python3 tools/line-up-bloodied.py clean.png bloody-grid.png layout.json name out.png
"""
import json, sys
import numpy as np
from PIL import Image

clean_path, bloody_path, layout_path, name, out_path = sys.argv[1:6]
L = json.load(open(layout_path))[name]
FW, FH = 416, 480
clean = Image.open(clean_path).convert('RGBA')
acols = clean.width // FW
grid_w, grid_h = L['size']
bloody = Image.open(bloody_path).convert('RGB').resize((grid_w, grid_h), Image.LANCZOS)
B = np.asarray(bloody).astype(np.float32)
S, gap, cols, w, h, l, t = L['S'], L['gap'], L['cols'], L['w'], L['h'], L['l'], L['t']
out = Image.new('RGBA', clean.size, (0, 0, 0, 0))
report = []
for i in range(L['n']):
    cx0, cy0 = (i % acols) * FW, (i // acols) * FH
    cell = np.asarray(clean.crop((cx0, cy0, cx0 + FW, cy0 + FH))).astype(np.float32)
    ca = cell[..., 3] > 32
    # the clean figure's box, in the cell
    piece = cell[t:t + h, l:l + w]
    pm = piece[..., 3] > 32
    # where it sits in the grid ChatGPT was given (grid px = S x cell px)
    gx, gy = (gap + (i % cols) * (w + gap)) * S, (gap + (i // cols) * (h + gap)) * S
    best = None
    lum = B.max(axis=2)
    for sc in np.linspace(0.94, 1.06, 13):
        ww, hh = int(round(w * S * sc)), int(round(h * S * sc))
        for dy in range(-60, 61, 3):
            for dx in range(-60, 61, 3):
                x0 = int(gx + (w * S - ww) / 2 + dx); y0 = int(gy + (h * S - hh) / 2 + dy)
                if x0 < 0 or y0 < 0 or x0 + ww > grid_w or y0 + hh > grid_h: continue
                m = Image.fromarray((lum[y0:y0 + hh, x0:x0 + ww] > 28).astype(np.uint8) * 255).resize((w, h), Image.BILINEAR)
                m = np.asarray(m) > 127
                iou = (m & pm).sum() / max(1, (m | pm).sum())
                if best is None or iou > best[0]: best = (iou, sc, dx, dy, x0, y0, ww, hh)
    iou, sc, dx, dy, x0, y0, ww, hh = best
    rep = np.asarray(bloody.crop((x0, y0, x0 + ww, y0 + hh)).resize((w, h), Image.LANCZOS)).astype(np.float32)
    rgb = piece[..., :3].copy()
    # inside him: the repaint's colours (but where it shows background black, keep his own)
    dark = rep.max(axis=2) < 20
    use = pm & ~dark
    rgb[use] = rep[use]
    frame = cell.copy()
    frame[t:t + h, l:l + w, :3] = rgb
    frame[..., 3] = cell[..., 3]
    out.paste(Image.fromarray(frame.clip(0, 255).astype(np.uint8), 'RGBA'), (cx0, cy0))
    report.append(f'{name}:{i} fit {iou:.3f} scale {sc:.3f} offset {dx},{dy}')
out.save(out_path, optimize=True)
print('\n'.join(report))
