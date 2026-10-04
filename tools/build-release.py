#!/usr/bin/env python3
"""build-release.py - the cloud (Linux/macOS) twin of build-release.ps1.

Packages the game for the web (itch.io): release/stage (the files) and
release/blood-axe-web.zip (forward-slash paths, index.html at the top).
Same rules as the PowerShell script: stamp window.BUILD_TIME, copy src/lib/assets
(minus any 'incoming' folder) and the sprite palette, re-encode big opaque PNGs as
JPEG under the same name, and leave alone the flee/cower strips, the magenta
parallax layers, the Warlord strips and the earth-wall strip.

Needs Pillow (pip install pillow).  Usage: python3 tools/build-release.py [--quality 93]
"""
import argparse, io, os, re, shutil, time, zipfile
from PIL import Image

ap = argparse.ArgumentParser()
ap.add_argument('--quality', type=int, default=93)
args = ap.parse_args()

root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
release = os.path.join(root, 'release')
stage = os.path.join(release, 'stage')
zip_path = os.path.join(release, 'blood-axe-web.zip')

if os.path.isdir(stage):
    shutil.rmtree(stage)
os.makedirs(stage)

# stamp the build time (online play compares it: net/Link.js handshake)
with open(os.path.join(root, 'index.html'), encoding='utf-8') as f:
    html = f.read()
stamp = int(time.time() * 1000)
if 'window.BUILD_TIME = 0;' not in html:
    raise SystemExit('index.html has no "window.BUILD_TIME = 0;" to stamp')
with open(os.path.join(stage, 'index.html'), 'w', encoding='utf-8', newline='') as f:
    f.write(html.replace('window.BUILD_TIME = 0;', f'window.BUILD_TIME = {stamp};'))

for d in ('src', 'lib', 'assets'):
    shutil.copytree(os.path.join(root, d), os.path.join(stage, d),
                    ignore=shutil.ignore_patterns('incoming'))
# BootScene reads this palette at runtime when it cuts the character strips.
os.makedirs(os.path.join(stage, 'tools', 'sprite-pipeline'))
shutil.copy2(os.path.join(root, 'tools', 'sprite-pipeline', 'palette.png'),
             os.path.join(stage, 'tools', 'sprite-pipeline', 'palette.png'))

def skip(name, size):
    return (size < 200 * 1024
            or re.search(r'_(flee|cower)[BFN]\.png$', name, re.I)
            or re.match(r'^plx_(far|mid|near|fg)\.png$', name, re.I)
            or re.match(r'^warlord_', name, re.I)
            or name.lower() == 'earthwall-strip.png')

def jpeg(path, quality):
    """True if the PNG was replaced by a JPEG (same path)."""
    src = open(path, 'rb').read()
    with Image.open(io.BytesIO(src)) as im:
        rgba = im.convert('RGBA')
    if rgba.getchannel('A').getextrema()[0] < 250:
        return False  # has transparency: keep the PNG
    out = io.BytesIO()
    rgba.convert('RGB').save(out, 'JPEG', quality=quality)
    if out.tell() >= len(src) * 0.8:
        return False  # not worth it
    with open(path, 'wb') as f:
        f.write(out.getvalue())
    return True

before = after = n = 0
for dirpath, _, files in os.walk(os.path.join(stage, 'assets')):
    for name in files:
        if not name.lower().endswith('.png'):
            continue
        p = os.path.join(dirpath, name)
        size = os.path.getsize(p)
        before += size
        if not skip(name, size):
            try:
                if jpeg(p, args.quality):
                    n += 1
            except Exception as e:
                print(f'  kept {name}: {e}')
        after += os.path.getsize(p)
print(f'{n} PNGs re-encoded: {before / 2**20:.1f} MB -> {after / 2**20:.1f} MB')

if os.path.exists(zip_path):
    os.remove(zip_path)
with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED, compresslevel=9) as z:
    for dirpath, _, files in os.walk(stage):
        for name in sorted(files):
            p = os.path.join(dirpath, name)
            z.write(p, os.path.relpath(p, stage).replace(os.sep, '/'))
print(f'zip: {os.path.getsize(zip_path) / 2**20:.1f} MB  ({zip_path})')
print(f'BUILD_TIME {stamp}')
