"""
build_sheet.py - Packs the cleaned frames into one sprite sheet + JSON in the format
the game's SpriteFighterView already reads (same keys as the old ulric.json).
"""
import json
import math
import os

from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
FR = os.path.join(HERE, 'frames')
OUT = os.path.join(HERE, 'out')
FW, FH, AX, AY = 208, 240, 104, 230
COLS = 8

order = []          # list of frame image paths in sheet order
index = {}          # 'idle_0' -> sheet index


def use(name):
    if name not in index:
        index[name] = len(order)
        order.append(os.path.join(FR, name + '.png'))
    return index[name]


def seq(prefix, ids):
    return [use(f'{prefix}_{i}') for i in ids]


anims = {
    'idle': {'frames': seq('idle', [0, 1, 2, 3, 4, 5, 4, 3, 2, 1]), 'fps': 9, 'loop': True},
    'walk': {'frames': seq('walk', range(8)), 'fps': 12, 'loop': True},
    'light1': {'phases': {'startup': seq('light1', [0, 1]), 'active': seq('light1', [2]),
                          'recovery': seq('light1', [4, 5])}},
    'light2': {'phases': {'startup': seq('light2', [0, 1]), 'active': seq('light2', [2]),
                          'recovery': seq('light2', [3, 4, 5])}},
    'light3': {'phases': {'startup': seq('light3', [0, 1, 2, 3]), 'active': seq('light3', [4]),
                          'recovery': seq('light3', [5])}},
    'heavy': {'phases': {'startup': seq('heavy', [0, 1, 2, 3]), 'active': seq('heavy', [4]),
                         'recovery': seq('heavy', [5, 6])}},
    'airAttack': {'phases': {'startup': seq('air', [0, 1]), 'active': seq('air', [2]),
                             'recovery': seq('air', [3])}},
    'jump': {'rise': seq('jump', [1]), 'fall': seq('jump', [3]),
             'crouch': seq('jump', [0]), 'peak': seq('jump', [2])},
    'block': {'frames': seq('block', [1]), 'fps': 1, 'loop': True, 'raise': seq('block', [0]),
              'impact': seq('block', [2])},
    'dodge': {'frames': seq('dodge', range(6)), 'fps': 13, 'loop': False},
    # current game view: first 2 = wind-up, rest = impact
    'cast': {'frames': seq('cast', [1, 2, 4, 5]), 'fps': 1, 'spread': True, 'full': seq('cast', range(6))},
    'hitstun': {'frames': seq('hurt', [0, 1]), 'fps': 8, 'loop': False},
    'knockdown': {'air': seq('hurt', [2]), 'lying': seq('hurt', [3])},
    'getup': {'frames': seq('hurt', [4]) + seq('dodge', [4]), 'fps': 1, 'spread': True},
}

rows = math.ceil(len(order) / COLS)
sheet = Image.new('RGBA', (FW * COLS, FH * rows), (0, 0, 0, 0))
for i, p in enumerate(order):
    sheet.paste(Image.open(p), ((i % COLS) * FW, (i // COLS) * FH))
os.makedirs(OUT, exist_ok=True)
sheet.save(os.path.join(OUT, 'ulric.png'), optimize=True)
meta = {
    'name': 'Ulric Varr', 'image': 'assets/sprites/ulric.png',
    'frameWidth': FW, 'frameHeight': FH, 'anchorX': AX, 'anchorY': AY,
    'scale': 1, 'portraitScale': 1, 'frameCount': len(order), 'anims': anims,
    'source': 'AI-generated strips (ChatGPT) cleaned by tools/sprite-pipeline',
}
json.dump(meta, open(os.path.join(OUT, 'ulric.json'), 'w'), indent=1)
print(len(order), 'frames', sheet.size, os.path.getsize(os.path.join(OUT, 'ulric.png')), 'bytes')
