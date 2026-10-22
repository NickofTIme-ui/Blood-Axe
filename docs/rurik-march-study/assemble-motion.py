from pathlib import Path
from PIL import Image
import sys
root = Path(__file__).parent
hero = '--hero' in sys.argv
frames = [Image.open(p).convert('RGB') for p in sorted((root/('hero-motion-frames' if hero else 'motion-frames')).glob('frame-*.png'))]
assert len(frames) == 32
prefix = 'Rurik-hero-stride-v2' if hero else 'Rurik-motion-study'
for name, duration in [(prefix+'.gif', 40), (prefix+'-slow.gif', 80)]:
    frames[0].save(root/name, save_all=True, append_images=frames[1:], duration=duration, loop=0, disposal=2)
    with Image.open(root/name) as result:
        assert result.n_frames == 32
print('Both motion loops verified: 32 frames each.')
