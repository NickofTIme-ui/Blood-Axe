#!/usr/bin/env python3
"""build-release.py - the cloud (Linux/macOS) twin of build-release.ps1.

Packages the game for the web (itch.io): release/stage (the files) and
release/blood-axe-web.zip (forward-slash paths, index.html at the top).
Same rules as the PowerShell script: stamp window.BUILD_TIME, copy src/lib/assets
(minus any 'incoming' folder) and the sprite palette, re-encode big opaque PNGs as
JPEG under the same name, and leave alone the flee/cower strips, the magenta
parallax layers, the Warlord strips and the earth-wall strip.

Needs Pillow (pip install pillow).  Usage: python3 tools/build-release.py [--quality 93] [--no-webp]
"""
import argparse, hashlib, io, json, os, re, shutil, time, zipfile
from PIL import Image

ITCH_FILE_LIMIT = 1000  # itch.io refuses to unpack an HTML zip with more files
ITCH_SIZE_LIMIT_MB = 500  # ...or one that unpacks to more than this

# Files the game never loads (checked 2026-11-24 against every request the game makes
# up to the title screen and against every path in dist/game.js): notes, review sheets
# and superseded art. Kept in the repo, left out of the build.
DROP = [
    'assets/sprites/old',
    'assets/sprites/strips/rurik-combo-v3',
    'assets/sprites/strips/rurik-combo-v2/imported-review.png',
    'assets/sprites/strips/rurik-combo-v2/prompts.json',
    'assets/enemies/strips/_bandaged',
    'assets/env/options/ground-option4-clean.png',
    'assets/audio/sfx/bow-shot-1.wav',   # the game plays the -audible versions
    'assets/audio/sfx/bow-shot-2.wav',
    'lib/README.txt',
]

# Folders whose files are glued into one assets/packs/<name>.pack each, to stay well
# under itch's file limit. tools/asset-packs.js (inlined into index.html) cuts them back
# apart in the browser, so the game still asks for e.g. assets/audio/sfx/hero-roll.wav.
# Only for files the game loads through Phaser's loader (this.load.audio/.image).
PACKS = {
    'sfx': ['assets/audio/sfx'],
    'ui': ['assets/ui/portraits', 'assets/ui/skilltree/icons'],
}
PACK_TYPES = {'.wav': 'audio/wav', '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg',
              '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp'}

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
ap.add_argument('--no-webp', action='store_true',
                help='keep see-through PNGs as PNG (bigger build; for testing old browsers)')
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
for d in (('lib', 'assets') if use_bundle else ('src', 'lib', 'assets')):
    shutil.copytree(os.path.join(root, d), os.path.join(stage, d),
                    ignore=shutil.ignore_patterns('incoming'))
# BootScene reads this palette at runtime when it cuts the character strips.
os.makedirs(os.path.join(stage, 'tools', 'sprite-pipeline'))
shutil.copy2(os.path.join(root, 'tools', 'sprite-pipeline', 'palette.png'),
             os.path.join(stage, 'tools', 'sprite-pipeline', 'palette.png'))

# web-sized copies that replace the originals in the build only (the repo keeps the
# originals): tools/release-media/<same path>. The opening cinematic is re-encoded from
# 10.6 to 5.6 Mbit/s (ffmpeg -c:v libx264 -preset slow -crf 25 -movflags +faststart),
# which looks the same and saves 26 MB of itch's 500 MB. Re-make it if the film changes.
media = os.path.join(root, 'tools', 'release-media')
for dirpath, _, files in os.walk(media):
    for name in files:
        rel = os.path.relpath(os.path.join(dirpath, name), media)
        orig = os.path.join(root, rel)
        if not os.path.exists(orig):
            print(f'  release-media/{rel} has no original any more: skipped')
        elif os.path.getmtime(orig) > os.path.getmtime(os.path.join(dirpath, name)) + 1:
            print(f'  WARNING: {rel} changed after its web copy was made: shipping the new original')
        else:
            shutil.copy2(os.path.join(dirpath, name), os.path.join(stage, rel))
            print(f'web copy: {rel}')

# leave out what the game never loads: unused art and every note/readme (licence and
# credit .txt files stay)
dropped = 0
for rel in DROP:
    p = os.path.join(stage, rel)
    if os.path.isdir(p):
        dropped += sum(len(fs) for _, _, fs in os.walk(p))
        shutil.rmtree(p)
    elif os.path.exists(p):
        os.remove(p)
        dropped += 1
for dirpath, _, files in os.walk(os.path.join(stage, 'assets')):
    for name in files:
        if name.lower().endswith('.md'):
            os.remove(os.path.join(dirpath, name))
            dropped += 1
print(f'{dropped} unused files left out')

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

def webp(path):
    """True if the PNG was replaced by a lossless WebP (same path, same pixels)."""
    src = open(path, 'rb').read()
    if src[:4] != b'\x89PNG' or len(src) < 64 * 1024:
        return False
    with Image.open(io.BytesIO(src)) as im:
        im.load()
        if max(im.size) > 16383:
            return False  # past WebP's size limit
        mode = 'RGBA' if im.mode in ('RGBA', 'LA', 'P', 'PA') else 'RGB'
        img = im.convert(mode)
    out = io.BytesIO()
    img.save(out, 'WEBP', lossless=True, exact=True, quality=80, method=4)
    if out.tell() >= len(src) * 0.95:
        return False
    with open(path, 'wb') as f:
        f.write(out.getvalue())
    return True

before = after = n = shrunk = webps = 0
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
        # a see-through PNG saved as lossless WebP (same name): exactly the same pixels,
        # every one of them (exact=True keeps even fully clear ones), about a quarter
        # smaller. Browsers go by the file's contents, not its name (the JPEG pass above
        # relies on the same thing). Keeps the build under itch's 500 MB (2026-11-24).
        if not args.no_webp:
            try:
                if webp(p):
                    webps += 1
            except Exception as e:
                print(f'  kept {name} as PNG: {e}')
        after += os.path.getsize(p)
print(f'{shrunk} PNGs losslessly shrunk, {webps} saved as lossless WebP')
print(f'{n} PNGs re-encoded: {before / 2**20:.1f} MB -> {after / 2**20:.1f} MB')

def sniff(data, name):
    if data[:4] == b'\x89PNG':
        return 'image/png'
    if data[:3] == b'\xff\xd8\xff':
        return 'image/jpeg'
    if data[:4] == b'RIFF' and data[8:12] == b'WEBP':
        return 'image/webp'
    return PACK_TYPES.get(os.path.splitext(name)[1].lower(), 'application/octet-stream')

# glue the PACKS folders into one file each (see PACKS at the top)
pack_index = {}
os.makedirs(os.path.join(stage, 'assets', 'packs'), exist_ok=True)
for pack, folders in PACKS.items():
    rel_file = f'assets/packs/{pack}.pack'
    entries, offset = {}, 0
    with open(os.path.join(stage, rel_file), 'wb') as out:
        for folder in folders:
            d = os.path.join(stage, folder)
            if not os.path.isdir(d):
                continue
            for name in sorted(os.listdir(d)):
                p = os.path.join(d, name)
                ext = os.path.splitext(name)[1].lower()
                if not os.path.isfile(p) or ext not in PACK_TYPES:
                    continue  # licences, credits: stay as they are
                data = open(p, 'rb').read()
                out.write(data)
                entries[f'{folder}/{name}'] = [offset, len(data), sniff(data, name)]
                offset += len(data)
                os.remove(p)
    pack_index[pack] = {'file': rel_file, 'entries': entries}
    print(f'pack {rel_file}: {len(entries)} files, {offset / 2**20:.1f} MB')

with open(os.path.join(root, 'tools', 'asset-packs.js'), encoding='utf-8') as f:
    pack_js = f.read()
marker = '<script type="module"'
if marker not in html:
    raise SystemExit('index.html has no <script type="module"> to put the asset-pack loader before')
html = html.replace(marker, '<script>window.ASSET_PACKS = ' + json.dumps(pack_index, separators=(',', ':'))
                    + ';</script>\n  <script>\n' + pack_js + '</script>\n  ' + marker, 1)
with open(os.path.join(stage, 'index.html'), 'w', encoding='utf-8', newline='') as f:
    f.write(html)

count = sum(len(files) for _, _, files in os.walk(stage))
total_mb = sum(os.path.getsize(os.path.join(d, f)) for d, _, fs in os.walk(stage) for f in fs) / 2**20
print(f'{count} files (itch limit {ITCH_FILE_LIMIT}), {total_mb:.0f} MB unpacked (itch limit {ITCH_SIZE_LIMIT_MB} MB)')
if count > ITCH_FILE_LIMIT:
    raise SystemExit(f'STOP: {count} files is over itch\'s {ITCH_FILE_LIMIT}-file limit; itch would '
                     'refuse to unpack this zip. Bundle the code (npm run bundle) or add folders to PACKS.')
if total_mb > ITCH_SIZE_LIMIT_MB:
    raise SystemExit(f'STOP: {total_mb:.0f} MB is over itch\'s {ITCH_SIZE_LIMIT_MB} MB limit; lower --quality.')

if os.path.exists(zip_path):
    os.remove(zip_path)
with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED, compresslevel=9) as z:
    for dirpath, _, files in os.walk(stage):
        for name in sorted(files):
            p = os.path.join(dirpath, name)
            z.write(p, os.path.relpath(p, stage).replace(os.sep, '/'))
print(f'zip: {os.path.getsize(zip_path) / 2**20:.1f} MB  ({zip_path})')
print(f'BUILD_TIME {stamp}')
