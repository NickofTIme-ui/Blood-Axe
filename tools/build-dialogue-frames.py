# build-dialogue-frames.py — cuts ChatGPT's two painted dialogue frames (docs/art/dialogue-box/
# frame-foe.png, frame-ally.png) into the box textures the game draws
# (assets/ui/dialogue/<side>-<mode>.png, view/DialogueBox.js), one per box size, at the
# game's render scale. The corners and the top-centre gem are kept whole; the plain band
# between them is tiled to the box's width, so the rivets never stretch.
#   python tools/build-dialogue-frames.py
from PIL import Image

RECT = {'foe': (57, 120, 2114, 569), 'ally': (55, 115, 2117, 574)}  # the band's outer edge in the art
MARGIN = 70        # the corner spikes reach this far past it (art px)
CORNER = 230       # corner piece width, from the band's edge (art px)
GEM = 170          # half the gem piece's width (art px)
SIZES = {'full': (420, 96), 'compact': (340, 58)}  # (view/DialogueBox.js BOX)
SCALE = 2          # SETTINGS.renderScale

def tile(seg, w):
    out = Image.new('RGBA', (w, seg.height))
    x = 0
    while x < w:
        out.paste(seg, (x, 0))
        x += seg.width
    return out

for side, (x0, y0, x1, y1) in RECT.items():
    art = Image.open(f'docs/art/dialogue-box/frame-{side}.png').convert('RGBA')
    src = art.crop((x0 - MARGIN, y0 - MARGIN, x1 + MARGIN, y1 + MARGIN))
    cx = src.width // 2
    left = src.crop((0, 0, MARGIN + CORNER, src.height))
    gem = src.crop((cx - GEM, 0, cx + GEM, src.height))
    right = src.crop((src.width - MARGIN - CORNER, 0, src.width, src.height))
    plainL = src.crop((MARGIN + CORNER, 0, cx - GEM, src.height))
    plainR = src.crop((cx + GEM, 0, src.width - MARGIN - CORNER, src.height))
    for mode, (w, h) in SIZES.items():
        s = h * SCALE / (y1 - y0)          # one scale for the whole frame, set by the box's height
        total = round((w * SCALE) / s + 2 * MARGIN)  # the art-px width this box needs
        room = total - left.width - right.width - gem.width
        a, b = room // 2, room - room // 2
        row = Image.new('RGBA', (total, src.height))
        row.paste(left, (0, 0))
        row.paste(tile(plainL, a), (left.width, 0))
        row.paste(gem, (left.width + a, 0))
        row.paste(tile(plainR, b), (left.width + a + gem.width, 0))
        row.paste(right, (total - right.width, 0))
        out = row.resize((round(total * s), round(src.height * s)), Image.LANCZOS)
        out.save(f'assets/ui/dialogue/{side}-{mode}.png', optimize=True)
        print(side, mode, out.size, 'overhang', round(MARGIN * s / SCALE, 2))
