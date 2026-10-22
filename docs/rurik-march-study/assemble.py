"""Assemble the authored equal-cell poses into review loops; no pose deformation."""
from pathlib import Path
from PIL import Image
import sys

root = Path(__file__).parent
source = sys.argv[1] if len(sys.argv) > 1 else 'rough-poses-v2.png'
suffix = sys.argv[2] if len(sys.argv) > 2 else 'rough'
sheet = Image.open(root / source).convert('RGB')
assert sheet.size == (1536, 1024)
frames = []
# Align the authored pelvis positions and the two rows' shared ground baselines.
hips = [225, 225, 225, 225, 225, 225, 225, 225]
for i in range(8):
    x, y = (i % 4) * 384, (i // 4) * 512
    pose = sheet.crop((x, y, x + 384, y + 512))
    frame = Image.new('RGB', (440, 550), (189, 191, 190))
    frame.paste(pose, (250 - hips[i], 26 if i < 4 else 52))
    frames.append(frame)
frames[0].save(root / f'Rurik-march-{suffix}.gif', save_all=True,
    append_images=frames[1:], duration=100, loop=0, disposal=2)
frames[0].save(root / f'Rurik-march-{suffix}-slow.gif', save_all=True,
    append_images=frames[1:], duration=200, loop=0, disposal=2)
with Image.open(root / f'Rurik-march-{suffix}.gif') as gif:
    assert gif.n_frames == 8
print('Saved 8-frame regular and slow review loops.')
