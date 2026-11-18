#!/bin/bash
# wood-recorded.sh — Gallows Wood's recorded howl, horn, whistle, whip, rain, crows and wading
# splash (2026-11-18: they were made in code by tools/sfx-gen/wood.js). Sources (public domain /
# CC0) are in tools/sfx-gen/recorded-wood/, credits in assets/audio/sfx/wood-recorded-SOURCES.txt.
# Needs ffmpeg and python3 with numpy.   bash tools/sfx-gen/wood-recorded.sh
set -e
cd "$(dirname "$0")/recorded-wood"
OUT=../../../assets/audio/sfx
K=../kenney-wood
E="-ac 1 -ar 44100 -sample_fmt s16"
N="loudnorm=I=-16:TP=-1.5:LRA=11,aresample=44100"
peak() { ffmpeg -hide_banner -i "$1" -af volumedetect -f null - 2>&1 | grep -o "max_volume: [-0-9.]*" | awk '{print $2}'; }
T=$(mktemp -d)
# then each brought to the old code-made sound's level (gain in dB, a limiter on the peaks)
lvl() { cp "$OUT/$1" "$T/in.wav"; ffmpeg -v error -y -i "$T/in.wav" -af "volume=$2dB,alimiter=limit=0.89:level=false" $E "$OUT/$1"; }
topeak() { g=$(python3 -c "print(-1-($(peak "$T/$1")))"); ffmpeg -v error -y -i "$T/$1" -af "volume=${g}dB" $E "$OUT/$2"; }

# the hounds baying far off in the wood: a pack of wolves, the chorus at 17 s, a little echo
ffmpeg -v error -y -ss 17.2 -t 6.8 -i yell-YELLWolvesDec252013.mp3 -af "highpass=f=220,lowpass=f=6000,afade=t=in:d=0.4,afade=t=out:st=5.6:d=1.2,aecho=0.8:0.5:140:0.25,$N" $E $OUT/wood-howl.wav
lvl wood-howl.wav 6
# the horn: three rising notes, the wood answering
ffmpeg -v error -y -ss 0.45 -t 5.8 -i Hunting_horn_tone.ogg -af "highpass=f=90,afade=t=in:d=0.03,afade=t=out:st=5.0:d=0.8,aecho=0.8:0.55:190|380:0.3|0.15,$N" $E $OUT/wood-horn.wav
lvl wood-horn.wav 7
# the Houndmaster's whistle
ffmpeg -v error -y -ss 0.12 -t 1.36 -i Human_whistling.ogg -af "highpass=f=900,afade=t=in:d=0.02,afade=t=out:st=1.2:d=0.16,aecho=0.8:0.4:90:0.2,$N" $E $OUT/wood-whistle.wav
lvl wood-whistle.wav 7
# one crack of the whip
ffmpeg -v error -y -ss 12.66 -t 0.55 -i Peitschen.ogg -af "highpass=f=280,afade=t=in:d=0.005,afade=t=out:st=0.3:d=0.25" -ac 1 -ar 44100 $T/whip.wav
topeak whip.wav wood-whip.wav
# a step through the ford's shallows
ffmpeg -v error -y -ss 4.32 -t 0.42 -i Sloshing_canister_of_water.ogg -af "highpass=f=120,lowpass=f=5000,asetrate=44100*0.9,aresample=44100,afade=t=in:d=0.02,afade=t=out:st=0.25:d=0.17" -ac 1 -ar 44100 $T/wade.wav
topeak wade.wav wood-wade.wav
# crows going up: wings clattering (Kenney cloth, quick and high), then the ravens' calls
ffmpeg -v error -y -ss 3.85 -t 5.2 -i yell-RavenBlackSandBasin.mp3 -i $K/rpg_cloth1.ogg -i $K/rpg_cloth4.ogg -i $K/rpg_cloth1.ogg -filter_complex "[0]highpass=f=250,volume=1.8,adelay=250|250[c];[1]asetrate=44100*1.5,aresample=44100,volume=0.5[a];[2]asetrate=44100*1.7,aresample=44100,volume=0.4,adelay=110|110[b];[3]asetrate=44100*1.9,aresample=44100,volume=0.3,adelay=220|220[d];[c][a][b][d]amix=inputs=4:normalize=0,afade=t=out:st=4.6:d=0.8,$N" $E $OUT/wood-crows.wav
# the rain: 24 s of it made a seamless 22 s loop (its last 2 s crossfaded into its start)
python3 -I - "$T" <<'EOF'
import subprocess, sys, numpy as np
sr = 44100
raw = subprocess.run(['ffmpeg', '-v', 'error', '-ss', '5', '-t', '24', '-i', 'Rain_1_.ogg', '-af', 'highpass=f=60', '-ac', '1', '-ar', str(sr), '-f', 'f32le', '-'], capture_output=True).stdout
x = np.frombuffer(raw, np.float32).copy(); L = 2 * sr
body = x[:-L].copy(); t = np.linspace(0, 1, L)
body[:L] = body[:L] * np.sqrt(t) + x[-L:] * np.sqrt(1 - t)
open(sys.argv[1] + '/rain.f32', 'wb').write(body.astype(np.float32).tobytes())
EOF
ffmpeg -v error -y -f f32le -ar 44100 -ac 1 -i $T/rain.f32 $T/rain.wav
topeak rain.wav wood-rain.wav
lvl wood-rain.wav -4
rm -rf "$T"
