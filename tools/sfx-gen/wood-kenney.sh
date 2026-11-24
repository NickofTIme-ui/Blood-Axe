#!/bin/sh
# wood-kenney.sh — Gallows Wood's recorded sounds (Nick, 2026-11-15: the code-made chop and
# crows sounded horrible). Mixes Kenney's CC0 "RPG Audio" and "Impact Sounds" samples
# (tools/sfx-gen/kenney-wood/, licence assets/audio/sfx/kenney-LICENSE.txt) into
# assets/audio/sfx/wood-{fall,logs,creak,snare,net}.wav and snare-yelp-{1,2}.wav. Needs ffmpeg.
#   sh tools/sfx-gen/wood-kenney.sh
# (The chop, howl, horn, whistle, whip and rain are still tools/sfx-gen/wood.js's; the chop is
# being replaced in another thread.)
set -e
cd "$(dirname "$0")/kenney-wood"
OUT=../../../assets/audio/sfx
mix() { # mix <out> <filter> <inputs...>
  out=$1; filt=$2; shift 2
  args=""; for f in "$@"; do args="$args -i $f"; done
  ffmpeg -hide_banner -loglevel error -y $args -filter_complex "$filt,loudnorm=I=-16:TP=-1.5:LRA=11,aresample=44100" -ac 1 -sample_fmt s16 "$OUT/$out"
}
d() { echo "adelay=$1|$1"; } # (delay in ms, both channels)
# the pine going over: the trunk groans and tears, then crashes down and bounces
mix wood-fall.wav "[0]asetrate=44100*0.8,aresample=44100[a];[1]asetrate=44100*0.7,aresample=44100,$(d 600)[b];[2]asetrate=44100*0.7,aresample=44100,$(d 1500)[c];[3]asetrate=44100*0.75,aresample=44100,$(d 1500)[e];[4]asetrate=44100*0.8,aresample=44100,$(d 1520)[f];[5]volume=0.5,asetrate=44100*0.8,aresample=44100,$(d 1780)[g];[6]volume=0.4,$(d 1950)[h];[a][b][c][e][f][g][h]amix=inputs=7:normalize=0,lowpass=f=6000" rpg_creak2.ogg rpg_creak1.ogg imp_Wood_heavy_002.ogg imp_Soft_heavy_000.ogg imp_Plank_medium_001.ogg imp_Wood_heavy_003.ogg imp_Soft_heavy_002.ogg
# the log pile let go: trunks thundering down the bank one after another
mix wood-logs.wav "[0]$(d 0)[a];[1]volume=0.9,$(d 170)[b];[2]volume=0.85,asetrate=44100*0.85,aresample=44100,$(d 330)[c];[3]volume=0.8,$(d 520)[e];[4]volume=0.7,asetrate=44100*0.8,aresample=44100,$(d 700)[f];[5]volume=0.6,$(d 880)[g];[6]volume=0.5,$(d 1100)[h];[7]volume=0.7,$(d 300)[i];[8]volume=0.5,$(d 900)[j];[a][b][c][e][f][g][h][i][j]amix=inputs=9:normalize=0,lowpass=f=7000" imp_Wood_heavy_001.ogg imp_Wood_medium_000.ogg imp_Plank_medium_003.ogg imp_Wood_medium_002.ogg imp_Wood_heavy_002.ogg imp_Wood_medium_003.ogg imp_Wood_medium_004.ogg imp_Soft_heavy_000.ogg imp_Soft_heavy_002.ogg
# a bough creaking under the weight of men
mix wood-creak.wav "[0]asetrate=44100*0.85,aresample=44100" rpg_creak1.ogg
# a snare springing: the sapling whooshes up, the cord cracks taut like a whip, the sapling
# groans under the man's weight (Nick, 2026-11-24: "snare trap needs a sounds"; the old cloth
# swish was all but silent)
mix wood-snare.wav "[0]volume=0.9[a];[1]volume=0.7[b];[2]asetrate=44100*1.12,aresample=44100,volume=0.95,$(d 110)[c];[3]$(d 110)[e];[4]volume=0.8,$(d 130)[f];[5]asetrate=44100*0.72,aresample=44100,volume=0.9,$(d 230)[g];[a][b][c][e][f][g]amix=inputs=6:normalize=0" ../../../assets/audio/sfx/kick-long-whoosh-19.wav rpg_cloth1.ogg ../../../assets/audio/sfx/wood-whip.wav imp_Wood_light_002.ogg rpg_beltHandle1.ogg rpg_creak2.ogg
# the man it caught: a short yelp as he's snatched off his feet (cut from the game's own
# fall screams, assets/audio/sfx/fall-scream-1/3.mp3)
mix snare-yelp-1.wav "[0]atrim=0.55:1.35,asetpts=PTS-STARTPTS,afade=t=out:st=0.5:d=0.3" ../../../assets/audio/sfx/fall-scream-1.mp3
mix snare-yelp-2.wav "[0]atrim=0.1:0.9,asetpts=PTS-STARTPTS,afade=t=out:st=0.5:d=0.3" ../../../assets/audio/sfx/fall-scream-3.mp3
# a weighted net thrown: heavy cloth through the air
mix wood-net.wav "[1]volume=0.8,$(d 120)[b];[0][b]amix=inputs=2:normalize=0" rpg_cloth1.ogg rpg_cloth4.ogg
