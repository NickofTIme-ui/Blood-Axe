# pose_reference.py — Blender (3.6+ / 4.x) script: blocks out an attack as silhouettes on a
# simple mannequin and writes one strip PNG, to attach to a ChatGPT prompt as the pose
# guide for a painted strip (docs/art-direction.md, "Animation"). Not game art.
#
#   blender --background --python tools/blender/pose_reference.py -- <move> <out.png>
#   e.g. blender -b -P tools/blender/pose_reference.py -- leapsmash assets/incoming/ref_leapsmash.png
#
# Moves are in POSES below: each is a list of named key poses (the beats a strip needs:
# anticipation, strike, follow-through, settle). Joint angles are degrees, seen from the
# side, facing right; 0 = standing straight. Add a move by adding a list.
# Saves the .blend next to the PNG so the poses can be tweaked by hand and re-rendered.

import math
import sys

import bpy
import numpy as np

CELL = 512        # px per pose
FIGURE_H = 1.8    # metres, the mannequin's height

# joint -> (parent, offset from parent (x forward, z up), limb length, radius)
JOINTS = {
    'hips': (None, (0, 0, 0.95), 0.0, 0.0),
    'spine': ('hips', (0, 0, 0.0), 0.28, 0.13),
    'chest': ('spine', (0, 0, 0.28), 0.26, 0.15),
    'head': ('chest', (0, 0, 0.30), 0.22, 0.11),
    'arm_f': ('chest', (0.02, 0, 0.24), 0.30, 0.05),
    'fore_f': ('arm_f', (0, 0, -0.30), 0.28, 0.045),
    'arm_b': ('chest', (-0.02, 0, 0.24), 0.30, 0.05),
    'fore_b': ('arm_b', (0, 0, -0.30), 0.28, 0.045),
    'thigh_f': ('hips', (0.04, 0, 0), 0.44, 0.075),
    'shin_f': ('thigh_f', (0, 0, -0.44), 0.44, 0.06),
    'thigh_b': ('hips', (-0.04, 0, 0), 0.44, 0.075),
    'shin_b': ('thigh_b', (0, 0, -0.44), 0.44, 0.06),
    'sword': ('fore_f', (0, 0, -0.28), 1.05, 0.03),  # held in the front hand
}
DOWN = {'arm_f', 'fore_f', 'arm_b', 'fore_b', 'thigh_f', 'shin_f', 'thigh_b', 'shin_b', 'sword'}

# Poses: joint -> pitch in degrees (positive swings the limb forward/up), plus 'lift'
# (hip height change, m) and 'lean' (the whole body's tilt)
POSES = {
    'leapsmash': [  # Rurik's Leap Smash: crouch, rise with the blade high, chop, buried, wrench
        {'lift': -0.18, 'thigh_f': 60, 'shin_f': -80, 'thigh_b': -10, 'shin_b': -70, 'chest': 20, 'arm_f': 20, 'fore_f': 30, 'sword': 60},
        {'lift': 0.55, 'lean': -8, 'thigh_f': 50, 'shin_f': -70, 'thigh_b': 20, 'shin_b': -90, 'chest': -15, 'arm_f': 170, 'fore_f': 20, 'arm_b': 150, 'sword': 30},
        {'lift': 0.35, 'lean': 10, 'thigh_f': 70, 'shin_f': -60, 'thigh_b': 10, 'shin_b': -80, 'chest': 25, 'arm_f': 110, 'fore_f': 10, 'arm_b': 100, 'sword': 0},
        {'lift': -0.22, 'lean': 25, 'thigh_f': 80, 'shin_f': -95, 'thigh_b': -30, 'shin_b': -40, 'chest': 35, 'arm_f': 40, 'fore_f': -10, 'arm_b': 35, 'sword': -40},
        {'lift': -0.15, 'lean': 15, 'thigh_f': 60, 'shin_f': -80, 'thigh_b': -25, 'shin_b': -40, 'chest': 20, 'arm_f': 35, 'fore_f': -5, 'arm_b': 30, 'sword': -45},
        {'lift': -0.05, 'lean': -5, 'thigh_f': 35, 'shin_f': -40, 'thigh_b': -15, 'shin_b': -20, 'chest': -10, 'arm_f': 70, 'fore_f': 40, 'arm_b': 20, 'sword': 60},
    ],
    'overhead': [  # a generic heavy overhead chop: ready, coil back, top, strike, follow, settle
        {'thigh_f': 20, 'shin_f': -20, 'thigh_b': -15, 'arm_f': 40, 'fore_f': 40, 'sword': 50},
        {'lean': -10, 'thigh_f': 25, 'shin_f': -30, 'thigh_b': -20, 'chest': -20, 'arm_f': 150, 'fore_f': 40, 'arm_b': 130, 'sword': 60},
        {'lean': -14, 'thigh_f': 25, 'shin_f': -30, 'thigh_b': -20, 'chest': -25, 'arm_f': 185, 'fore_f': 10, 'arm_b': 170, 'sword': 30},
        {'lift': -0.08, 'lean': 15, 'thigh_f': 50, 'shin_f': -60, 'thigh_b': -30, 'chest': 25, 'arm_f': 80, 'fore_f': 0, 'arm_b': 70, 'sword': 0},
        {'lift': -0.12, 'lean': 22, 'thigh_f': 55, 'shin_f': -70, 'thigh_b': -30, 'chest': 30, 'arm_f': 20, 'fore_f': -10, 'arm_b': 25, 'sword': -30},
        {'thigh_f': 25, 'shin_f': -25, 'thigh_b': -15, 'arm_f': 45, 'fore_f': 35, 'sword': 45},
    ],
}


def clear():
    bpy.ops.wm.read_factory_settings(use_empty=True)


def build():
    objs = {}
    mat = bpy.data.materials.new('silhouette')
    mat.diffuse_color = (0.02, 0.02, 0.02, 1)
    for name, (parent, off, length, rad) in JOINTS.items():
        e = bpy.data.objects.new(name, None)
        bpy.context.scene.collection.objects.link(e)
        if parent:
            e.parent = objs[parent]
        e.location = off
        objs[name] = e
        if length > 0:
            sign = -1 if name in DOWN else 1
            if name == 'head':
                bpy.ops.mesh.primitive_uv_sphere_add(radius=rad, location=(0, 0, length * 0.5))
            else:
                bpy.ops.mesh.primitive_cylinder_add(radius=rad, depth=length, location=(0, 0, sign * length / 2))
            m = bpy.context.active_object
            m.data.materials.append(mat)
            m.parent = e
            if name not in ('head', 'sword', 'spine'):
                # a ball at the joint, so bent limbs stay joined
                bpy.ops.mesh.primitive_uv_sphere_add(radius=rad * 1.05, location=(0, 0, 0))
                j = bpy.context.active_object
                j.data.materials.append(mat)
                j.parent = e
    return objs


def pose(objs, p):
    objs['hips'].location.z = 0.95 + p.get('lift', 0)
    objs['hips'].rotation_euler = (0, math.radians(p.get('lean', 0)), 0)
    for name in JOINTS:
        if name == 'hips':
            continue
        # (Blender's Y rotation tilts forward/back when the figure faces +X)
        objs[name].rotation_euler = (0, -math.radians(p.get(name, 0)), 0)


def setup_render():
    sc = bpy.context.scene
    sc.render.engine = 'BLENDER_WORKBENCH'
    sc.display.shading.light = 'FLAT'
    sc.display.shading.color_type = 'MATERIAL'
    sc.render.resolution_x = CELL
    sc.render.resolution_y = CELL
    sc.render.film_transparent = False
    sc.world = bpy.data.worlds.new('w')
    sc.world.color = (1, 0, 1)  # pure magenta, as the strip importer expects
    sc.display.shading.background_type = 'WORLD'
    sc.view_settings.view_transform = 'Standard'
    cam = bpy.data.objects.new('cam', bpy.data.cameras.new('cam'))
    cam.data.type = 'ORTHO'
    cam.data.ortho_scale = FIGURE_H * 2.3
    cam.location = (0, -10, FIGURE_H * 0.72)
    cam.rotation_euler = (math.radians(90), 0, 0)
    sc.collection.objects.link(cam)
    sc.camera = cam


def main():
    argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
    move = argv[0] if argv else 'overhead'
    out = argv[1] if len(argv) > 1 else f'//ref_{move}.png'
    clear()
    objs = build()
    setup_render()
    cells = []
    tmp = bpy.path.abspath('//') or '/tmp/'
    for i, p in enumerate(POSES[move]):
        pose(objs, p)
        bpy.context.view_layer.update()
        path = f'{out}.pose{i}.png'
        bpy.context.scene.render.filepath = path
        bpy.ops.render.render(write_still=True)
        img = bpy.data.images.load(path)
        px = np.array(img.pixels[:]).reshape(CELL, CELL, 4)
        cells.append(px)
    strip = np.concatenate(cells, axis=1)
    im = bpy.data.images.new('strip', CELL * len(cells), CELL)
    im.pixels = strip.ravel().tolist()
    im.filepath_raw = out
    im.file_format = 'PNG'
    im.save()
    bpy.ops.wm.save_as_mainfile(filepath=out.rsplit('.', 1)[0] + '.blend')
    print('wrote', out, len(cells), 'poses; .blend saved beside it')


main()
