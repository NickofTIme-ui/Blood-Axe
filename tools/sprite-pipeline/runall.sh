#!/bin/sh
# Rebuild Ulric's sprite sheet from the AI strips in art-source/ (needs Python 3 + Pillow + numpy + scipy).
set -e
cd "$(dirname "$0")"
while read name n ref mode; do
  [ -f "art-source/ulric_strip_$name.png" ] || continue
  python3 strip_to_frames.py "art-source/ulric_strip_$name.png" "$n" "$name" ${ref:--} $mode
done < anims.txt
python3 build_sheet.py
cp out/ulric.png out/ulric.json ../../assets/sprites/
