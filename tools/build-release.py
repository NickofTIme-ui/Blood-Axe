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
import argparse, hashlib, io, os, re, shutil, time, zipfile
from PIL import Image

ITCH_FILE_LIMIT = 1000  # itch.io refuses to unpack an HTML zip with more files

def src_hash(root):
    """Same fingerprint as tools/src-hash.mjs (line endings ignored)."""
    src = os.path.join(root, 'src')
    files = []
    for dirpath, _, names in os.walk(src):
        for n in names:
            files.append(os.path.relpath(os.path.join(dirpath, n), src).replace(os.sep, '/'))
    h = hashlib.sha256()
    for rel in sorted(files):
        h.update((rel + '\n').encode())
        with open(os.path.join(src, rel), encoding='utf-8', newline='') as f:
            h.update(f.read().replace('\r\n', '\n').encode())
        h.update(b'\n\0\n')
    return h.hexdigest()

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
html = html.replace('window.BUILD_TIME = 0;', f'window.BUILD_TIME = {stamp};')

# Ship the one-file bundle dist/game.js (tools/bundle-game.mjs) instead of the ~190 files
# of src/, which keeps the build under itch's 1000-file limit. Only if it was bundled
# from this exact src/; otherwise fall back to src/ and say so.
bundle = os.path.join(root, 'dist', 'game.js')
use_bundle = False
if os.path.exists(bundle):
    with open(bundle, encoding='utf-8') as f:
        first = f.readline().strip()
    use_bundle = first == f'// src-hash: {src_hash(root)}'
    if not use_bundle:
        print('WARNING: dist/game.js is older than src/ (re-run: npm run bundle). Shipping src/ instead.')
if use_bundle:
    if 'src="src/main.js"' not in html:
        raise SystemExit('index.html has no src="src/main.js" to point at the bundle')
    html = html.replace('src="src/main.js"', 'src="game.js"')
    shutil.copy2(bundle, os.path.join(stage, 'game.js'))
    print('code: dist/game.js (one file)')
with open(os.path.join(stage, 'index.html'), 'w', encoding='utf-8', newline='') as f:
    f.write(html)

for d in (('lib', 'assets') if use_bundle else ('src', 'lib', 'assets')):
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

before = after = n = shrunk = 0
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
        # every PNG still a PNG (cut-outs with transparency, the exceptions above) gets a
        # lossless re-save: same pixels, about 7% smaller, which keeps the build under
        # itch's 500 MB unpacked limit (Nick, 2026-11-03)
        try:
            src = open(p, 'rb').read()
            if src[:4] == b'\x89PNG' and len(src) >= 64 * 1024:
                with Image.open(io.BytesIO(src)) as im:
                    im.load()
                    out = io.BytesIO()
                    im.save(out, 'PNG', optimize=True)
                if out.tell() < len(src):
                    with open(p, 'wb') as f:
                        f.write(out.getvalue())
                    shrunk += 1
        except Exception as e:
            print(f'  kept {name} as is: {e}')
        after += os.path.getsize(p)
print(f'{shrunk} PNGs losslessly shrunk')
print(f'{n} PNGs re-encoded: {before / 2**20:.1f} MB -> {after / 2**20:.1f} MB')

count = sum(len(files) for _, _, files in os.walk(stage))
print(f'{count} files (itch limit {ITCH_FILE_LIMIT})')
if count > ITCH_FILE_LIMIT:
    raise SystemExit(f'STOP: {count} files is over itch\'s {ITCH_FILE_LIMIT}-file limit; itch would '
                     'refuse to unpack this zip. Bundle the code (npm run bundle) or cut files.')

if os.path.exists(zip_path):
    os.remove(zip_path)
with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED, compresslevel=9) as z:
    for dirpath, _, files in os.walk(stage):
        for name in sorted(files):
            p = os.path.join(dirpath, name)
            z.write(p, os.path.relpath(p, stage).replace(os.sep, '/'))
print(f'zip: {os.path.getsize(zip_path) / 2**20:.1f} MB  ({zip_path})')
print(f'BUILD_TIME {stamp}')
