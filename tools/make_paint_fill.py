#!/usr/bin/env python3
"""
make_paint_fill.py — the paint the film's big words are filled with (assets/img/paint-cream.webp).

A tile of cream oil paint as a loaded brush leaves it: long streaks along the stroke, lighter where the
paint is thick, a little ochre and a little cool grey dragged through it. It is used with
`background-clip: text` (assets/css/cinema.css, section 4), so headlines look painted rather than printed.
The tile repeats sideways without a seam.

    python3 tools/make_paint_fill.py        (needs Pillow and numpy; the result is deterministic)
"""
import os
import numpy as np
from PIL import Image, ImageFilter

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'assets', 'img', 'paint-cream.webp')
W, H = 640, 200


def streaks(rng, along, across):
    """Noise drawn out along x. The coarse grid is repeated three times before it is enlarged and the
    middle third kept, so the tile repeats sideways without a seam."""
    n = rng.random((H // across + 2, max(2, W // along)))
    im = Image.fromarray((np.tile(n, (1, 3)) * 255).astype(np.uint8)).resize((W * 3, H), Image.BICUBIC)
    return np.asarray(im, np.float32)[:, W:2 * W] / 255


def main():
    rng = np.random.default_rng(1889)
    base = np.array([247, 238, 214], np.float32)             # the site's cream
    thick = np.array([255, 252, 240], np.float32)            # where the paint stands up
    ochre = np.array([232, 190, 104], np.float32)
    cool = np.array([196, 204, 222], np.float32)
    s1, s2, s3 = streaks(rng, 160, 3), streaks(rng, 90, 2), streaks(rng, 220, 6)
    img = np.repeat(base[None, None, :], H, 0).repeat(W, 1)
    light = np.clip((s1 * 0.6 + s2 * 0.4 - 0.5) * 2.4, -1, 1)[..., None]
    img = img + (thick - img) * np.clip(light, 0, 1) * 0.9 + (img * 0.86 - img) * np.clip(-light, 0, 1)
    img = img + (ochre - img) * (np.clip(s3 - 0.62, 0, 1) * 1.5)[..., None]
    img = img + (cool - img) * (np.clip(0.3 - s3, 0, 1) * 0.9)[..., None]
    out = Image.fromarray(np.clip(img, 0, 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(0.6))
    out.save(OUT, 'WEBP', quality=88, method=6)
    print(OUT, os.path.getsize(OUT), 'bytes')


if __name__ == '__main__':
    main()
