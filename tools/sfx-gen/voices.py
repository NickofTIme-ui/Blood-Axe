#!/usr/bin/env python3
# voices.py: the recorded voices and effects added 2026-11-24 (enemy pain, death and battle
# cries; Vexa's voice; Rurik's and the Mage's grunts; hounds; horses; the Mage's spells; the
# skill menu). Every source is CC0, public domain or CC-BY; the list, with links and the credit
# each CC-BY one needs, is assets/audio/sfx/CREDITS-recorded.txt.
#
# The source packs are not kept in the repo. Download them (links in the credits file) and
# unpack each into its own folder under SRC, named as in the paths below, then:
#   python3 tools/sfx-gen/voices.py /path/to/SRC
# Needs ffmpeg (with libmp3lame) and numpy. Each clip is cut, made mono, cleaned at the low end,
# faded, brought to one loudness and saved as a 96 kbps mp3 in assets/audio/sfx/.
import os, subprocess, sys
import numpy as np

SRC = sys.argv[1]
OUT = os.path.join(os.path.dirname(__file__), '..', '..', 'assets', 'audio', 'sfx')
SR = 44100

def load(path, start=0.0, end=None):
    cmd = ['ffmpeg', '-v', 'error', '-ss', str(max(0, start))]
    if end is not None: cmd += ['-t', str(end - max(0, start))]
    cmd += ['-i', os.path.join(SRC, path), '-ac', '1', '-ar', str(SR), '-f', 'f32le', '-']
    return np.frombuffer(subprocess.run(cmd, capture_output=True, check=True).stdout, dtype=np.float32).copy()

def trim(a, thr_db=-42):
    # drop the silence either side (keeping 15 ms ahead of the first sound)
    hop = int(SR * 0.005)
    env = np.array([np.sqrt(np.mean(a[i:i + hop] ** 2)) for i in range(0, len(a), hop)]) + 1e-9
    on = np.where(20 * np.log10(env) > thr_db)[0]
    if not len(on): return a
    s = max(0, on[0] * hop - int(SR * 0.015)); e = min(len(a), (on[-1] + 1) * hop + int(SR * 0.04))
    return a[s:e]

def save(a, name, level=-17.0, hp=90, lp=None, fade_out=0.06, fade_in=0.004, maxlen=None):
    a = trim(a)
    if maxlen and len(a) > maxlen * SR: a = a[:int(maxlen * SR)]
    n_in, n_out = int(SR * fade_in), min(int(SR * fade_out), len(a) // 3)
    a[:n_in] *= np.linspace(0, 1, n_in)
    a[len(a) - n_out:] *= np.linspace(1, 0, n_out)
    # loudness: the loud half of the clip brought to `level` dB RMS, peaks kept under -1 dB
    hop = int(SR * 0.02)
    rms = np.array([np.sqrt(np.mean(a[i:i + hop] ** 2)) for i in range(0, len(a) - hop + 1, hop)] or [np.sqrt(np.mean(a ** 2))])
    loud = np.sqrt(np.mean(np.sort(rms)[len(rms) // 2:] ** 2)) + 1e-9
    a = a * (10 ** (level / 20) / loud)
    peak = np.max(np.abs(a))
    if peak > 0.89: a = a * (0.89 / peak)
    af = f'highpass=f={hp}' + (f',lowpass=f={lp}' if lp else '')
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'f32le', '-ar', str(SR), '-ac', '1', '-i', '-',
                    '-af', af, '-ac', '1', '-ar', str(SR), '-c:a', 'libmp3lame', '-b:a', '96k',
                    os.path.join(OUT, name + '.mp3')], input=a.astype(np.float32).tobytes(), check=True)
    print(f'{name}.mp3  {len(a) / SR:.2f}s')

Y = 'male-gruntyelling-sounds/yelling sounds/'  # (OGA "Male Grunt/Yelling sounds", CC0)
B = '11-male-human-paindeath-sounds/player/'     # (Michel Baradari, CC-BY 3.0)
M = '15-monster-gruntpaindeath-sounds/monster/'  # (Michel Baradari, CC-BY 3.0)
G = 'grunts-male-death-and-pain/death pain grunts.wav'  # (CC0: one take, many grunts)
V = 'female-rpg-voice-starter-pack/RPG Voice Starter Pack/Type 3/'  # (Cici Fyre, CC0)
F = 'female-hurt-grunts-groans/female_hurt_grunts_groans_1.ogg'      # (AuraVoice, CC0)

# --- the enemy foot soldiers: hit, killed, and a shout as they swing
for i, f in enumerate(['pain1', 'pain2', 'pain3', 'pain4', 'pain5', 'pain6', 'painh', 'paino'], 1):
    save(load(B + f + '.wav'), f'man-pain-{i}', level=-16)
for i, (s, e) in enumerate([(6.92, 7.42), (8.34, 9.16), (29.88, 30.42), (31.56, 32.62), (40.45, 41.16)], 9):
    save(load(G, s, e), f'man-pain-{i}', level=-16)
for i, f in enumerate(['hurt_01_0', 'hurt_03', 'hurt_05'], 14):
    save(load('hurt-sound-effects/' + f + '.mp3'), f'man-pain-{i}', level=-16)
for i, f in enumerate(['die1', 'die2', 'deathh'], 1):
    save(load(B + f + '.wav'), f'man-death-{i}', level=-15, fade_out=0.15)
for i, (s, e) in enumerate([(0.46, 1.9), (3.92, 6.2), (14.45, 16.2), (20.36, 21.8), (23.89, 25.8), (36.0, 37.4), (47.45, 49.05)], 4):
    save(load(G, s, e), f'man-death-{i}', level=-15, fade_out=0.15)
for i, (f, s, e) in enumerate([('3yell12', 0.05, 0.95), ('3yell15', 0.05, 1.05), ('3yell8', 0.12, 0.85), ('1yell4', 0.08, 0.75),
                               ('2yell3', 0.02, 0.95), ('2yell11', 0.28, 1.1), ('3yell7', 0.12, 0.9), ('1yell10', 0.07, 0.55)], 1):
    save(load(Y + f + '.wav', s, e), f'man-yell-{i}', level=-17, fade_out=0.1)
# the ghouls and the big ones: deeper, rougher
for i, f in enumerate(['painb', 'paine', 'painr', 'pains', 'paind'], 1):
    save(load(M + f + '.wav'), f'brute-pain-{i}', level=-16)
for i, f in enumerate(['deathb', 'deathe', 'deathr', 'deathd'], 1):
    save(load(M + f + '.wav'), f'brute-death-{i}', level=-15, fade_out=0.15)
for i, f in enumerate(['grunt1', 'grunt2'], 1):
    save(load(M + f + '.wav'), f'brute-yell-{i}', level=-17, fade_out=0.12)

# --- Rurik and the Mage: their own grunts when hit (another voice from the yelling pack)
for i, (f, s, e) in enumerate([('3grunt1', 0.45, 0.95), ('3grunt3', 0.0, 0.5), ('3grunt4', 0.2, 0.5), ('3grunt5', 0.1, 0.5), ('3grunt2', 0.5, 0.9)], 1):
    save(load(Y + f + '.wav', s, e), f'hero-pain-{i}', level=-17)
save(load(Y + '3yell2.wav', 0.2, 1.5), 'hero-death', level=-15, fade_out=0.2)

# --- Vexa: a sharp breath on her big cuts, her hurt, and her fall
for i, f in enumerate(['attack1', 'attack2', 'attack3', 'jump1', 'jump2', 'jump3'], 1):
    save(load(V + f + '.wav'), f'vexa-attack-{i}', level=-18)
for i, f in enumerate(['damaged1', 'damaged2', 'damaged3'], 1):
    save(load(V + f + '.wav'), f'vexa-pain-{i}', level=-17)
for i, (s, e) in enumerate([(0.41, 1.13), (2.06, 2.72), (3.68, 4.15), (7.32, 8.12)], 4):
    save(load(F, s, e), f'vexa-pain-{i}', level=-17)
save(load(F, 4.94, 6.2), 'vexa-death-1', level=-16, fade_out=0.2)
save(load(F, 11.68, 12.6), 'vexa-death-2', level=-16, fade_out=0.2)

# --- the hounds
save(load('dog-sounds/Dog/Dog Bark.wav'), 'hound-bark-1', level=-16, hp=150)
for i, f in enumerate(['Dog Bark 1', 'Dog Bark 2', 'Dog Bark 3'], 2):
    save(load(f'dog-sounds/Dog/{f}.wav'), f'hound-bark-{i}', level=-16, hp=150)
for i, (s, e) in enumerate([(0.0, 0.3), (0.47, 0.78), (1.07, 1.42), (1.64, 2.04)], 5):
    save(load('dog-barking-mono/dog_barking_mono.wav', s, e), f'hound-bark-{i}', level=-16, hp=150)
save(load('dog-growl/dog-growl.ogg'), 'hound-growl-1', level=-17, hp=60)
for i, f in enumerate(['barking_01', 'barking_02'], 9):
    save(load(f'80-cc0-creature-sfx/{f}.ogg'), f'hound-bark-{i}', level=-16, hp=150)
save(load('dog-sounds/Dog/Sad Dog.wav', 0.9, 1.6), 'hound-yelp-1', level=-16, hp=200)
save(load('dog-sounds/Dog/Sad Dog 1.wav', 1.75, 2.56), 'hound-yelp-2', level=-16, hp=200)
save(load('80-cc0-creature-sfx/nose.ogg'), 'hound-sniff', level=-22, hp=200)

# --- horses
C = 'commons/'
save(load(C + 'Wiehern.ogg'), 'horse-whinny-1', level=-15, fade_out=0.2)
save(load(C + 'Mares-Prefer-the-Voices-of-Highly-Fertile-Stallions-pone.0118468.s001.oga', 0, 1.5), 'horse-whinny-2', level=-15, fade_out=0.2)
save(load(C + 'Mares-Prefer-the-Voices-of-Highly-Fertile-Stallions-pone.0118468.s003.oga', 0.6, 2.55), 'horse-whinny-3', level=-15, fade_out=0.2)
save(load(C + 'Segregation-of-information-about-emotional-arousal-and-valence-in-horse-whinnies-srep09989-s3.oga', 5.26, 7.1), 'horse-whinny-4', level=-15, fade_out=0.2)
# (the herd's pass, 3-14 s: they come up out of the distance, thunder past and fade)
save(load(C + 'Six Horses Galloping By.ogg', 3.0, 14.0), 'horse-gallop', level=-14, fade_out=1.5, fade_in=0.5)

# --- the Mage's spells
save(load('teleport-spell/teleport.wav'), 'mage-blink', level=-17, fade_out=0.15)
for i, f in enumerate(['magical_1_0', 'magical_3', 'magical_5', 'magical_2'], 1):
    save(load(f'magic-spell-sfx/{f}.ogg'), f'mage-spell-{i}', level=-17, fade_out=0.15)
for i, f in enumerate(['stones_01', 'stones_02', 'stones_03', 'stones_04'], 1):
    save(load(f'80-cc0-rpg-sfx/{f}.ogg'), f'mage-stone-{i}', level=-15, hp=50)
for i, f in enumerate(['spell_fire_01', 'spell_fire_03', 'spell_fire_05'], 1):
    save(load(f'80-cc0-rpg-sfx/{f}.ogg'), f'mage-fire-{i}', level=-16)

# --- steel for Vexa (Kenney RPG Audio, CC0): knives drawn, a knife slicing
K = 'kenney-rpg-audio-for-godot/'
def kfind(name):
    for root, _, files in os.walk(os.path.join(SRC, K)):
        if name in files: return os.path.relpath(os.path.join(root, name), SRC)
    raise FileNotFoundError(name)
save(load(kfind('knife_slice.ogg')), 'vexa-slice-1', level=-17, hp=300)
save(load(kfind('knife_slice_2.ogg')), 'vexa-slice-2', level=-17, hp=300)
for i in (1, 2, 3):
    save(load(kfind(f'draw_knife_{i}.ogg')), f'vexa-steel-{i}', level=-18, hp=300)

# --- the skill menu (Kenney Interface Sounds, CC0)
I = 'kenney-interface-sounds/'
def ifind(name):
    for root, _, files in os.walk(os.path.join(SRC, I)):
        if name in files: return os.path.relpath(os.path.join(root, name), SRC)
    raise FileNotFoundError(name)
for out, f in [('ui-move', 'tick_002.wav'), ('ui-select', 'select_004.wav'), ('ui-confirm', 'confirmation_002.wav'),
               ('ui-error', 'error_004.wav'), ('ui-back', 'back_001.wav')]:
    save(load(ifind(f)), out, level=-22, hp=120, fade_out=0.03)
