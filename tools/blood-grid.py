"""blood-grid.py: Lays a hero's clean HD sheet out as a grid on black for ChatGPT to repaint
bloodied, and writes the layout tools/line-up-bloodied.py reads back (the crop box l,t,w,h
shared by every 416x480 cell, gap, cols, upscale S, grid size).

  python tools/blood-grid.py <sheet.png> <name> <grid.png> <layout.json> [cols] [S]

(layout.json gains or replaces the entry <name>; Vexa's: tools/blood-source/vexa-layout.json)
"""
import json, os, sys
from PIL import Image

FW, FH = 416, 480
sheet_p, name, grid_p, layout_p = sys.argv[1:5]
cols = int(sys.argv[5]) if len(sys.argv) > 5 else 4
S = int(sys.argv[6]) if len(sys.argv) > 6 else 2
im = Image.open(sheet_p).convert('RGBA')
n = 0
boxes = []
for i in range(im.width // FW * (im.height // FH)):
    cell = im.crop((i % (im.width // FW) * FW, i // (im.width // FW) * FH, (i % (im.width // FW) + 1) * FW, (i // (im.width // FW) + 1) * FH))
    b = cell.getbbox()
    if not b: break
    boxes.append(b); n += 1
l = min(b[0] for b in boxes); t = min(b[1] for b in boxes)
r = max(b[2] for b in boxes); btm = max(b[3] for b in boxes)
w, h, gap = r - l, btm - t, 24
rows = (n + cols - 1) // cols
gw, gh = (gap + cols * (w + gap)) * S, (gap + rows * (h + gap)) * S
grid = Image.new('RGB', (gw, gh), (0, 0, 0))
acols = im.width // FW
for i in range(n):
    cell = im.crop((i % acols * FW + l, i // acols * FH + t, i % acols * FW + l + w, i // acols * FH + t + h))
    cell = cell.resize((w * S, h * S), Image.LANCZOS)
    grid.paste(cell, ((gap + (i % cols) * (w + gap)) * S, (gap + (i // cols) * (h + gap)) * S), cell)
grid.save(grid_p)
L = json.load(open(layout_p)) if os.path.exists(layout_p) else {}
L[name] = {'size': [gw, gh], 'S': S, 'gap': gap, 'cols': cols, 'w': w, 'h': h, 'l': l, 't': t, 'n': n}
json.dump(L, open(layout_p, 'w'), indent=1)
print(grid_p, grid.size, L[name])
