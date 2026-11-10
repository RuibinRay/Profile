#!/usr/bin/env python3
"""
transition_frames.py — the first and the last frame of every transition, as 1920 × 1080 pictures.

A video generator that takes a start image and an end image (Higgsfield, for example) can turn each
pair into a short clip of one painting becoming the next. tools/prepare_transition.py then cuts such
a clip into frames the film scrubs with the scroll.

The frames are exactly what the film shows when the transition begins (the outgoing painting, at its
camera) and when it ends (the incoming painting, at its camera): the cameras are read from
assets/js/cinema/storyboard.js, so run this again after changing the storyboard.

    python3 tools/transition_frames.py            # writes tools/transitions/frames/

Needs Node (to read the storyboard) and Pillow.
"""
import json, os, subprocess
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'tools', 'transitions', 'frames')
W, H = 1920, 1080

READ = r"""
import { TRANSITIONS, cameraAt } from './assets/js/cinema/storyboard.js';
import { clampCam } from './assets/js/cinema/view.js';
import { PAINTINGS } from './assets/js/cinema/manifest.js';
const cam = (shot, t) => { const c = {}; cameraAt(shot, t, c); clampCam(c, PAINTINGS[shot.painting].aspect, 16 / 9); return { painting: shot.painting, aspect: PAINTINGS[shot.painting].aspect, x: c.x, y: c.y, z: c.z }; };
console.log(JSON.stringify(TRANSITIONS.map((tr, i) => ({ n: i + 1, from: tr.from, to: tr.to, type: tr.type, a: cam(tr.A, tr.span[0]), b: cam(tr.B, tr.span[1]) }))));
"""


def frame(c):
    im = Image.open(os.path.join(ROOT, 'tools', 'masters', c['painting'] + '.webp')).convert('RGB')
    ia, aspect = c['aspect'], W / H
    fit = ia / aspect if aspect > ia else 1.0
    hx, hy = 0.5 * aspect / ia * fit / c['z'], 0.5 * fit / c['z']
    box = ((c['x'] - hx) * im.width, (c['y'] - hy) * im.height, (c['x'] + hx) * im.width, (c['y'] + hy) * im.height)
    return im.resize((W, H), Image.LANCZOS, box=box)


def main():
    os.makedirs(OUT, exist_ok=True)
    data = json.loads(subprocess.check_output(['node', '--input-type=module', '-e', READ], cwd=ROOT))
    for t in data:
        name = f"{t['n']}-{t['from']}-to-{t['to']}"
        frame(t['a']).save(os.path.join(OUT, name + '-start.jpg'), quality=93)
        frame(t['b']).save(os.path.join(OUT, name + '-end.jpg'), quality=93)
        print(f"{name:28s} {t['type']:8s} start: {t['a']['painting']} at zoom {t['a']['z']:.2f}   end: {t['b']['painting']} at zoom {t['b']['z']:.2f}")


if __name__ == '__main__':
    main()
