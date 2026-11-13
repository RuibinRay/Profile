#!/usr/bin/env python3
"""
make_frame.py — paints the gilt frame the gallery's canvases hang in (assets/img/frame-painted.webp).

The frame is painted the way the paintings are: thick strokes of gold, ochre and cream laid along each
side (across at the corners), a dark lip where it meets the canvas, a pale bead inside that, and the
light from the upper left catching the outer edge. It is used as a nine-slice border image
(`border-image` in assets/css/cinema.css, section 10): the corners stay as painted, the sides stretch.

    python3 tools/make_frame.py

Needs Pillow. The result is deterministic (fixed seed).
"""
import os, random, math
from PIL import Image, ImageDraw, ImageFilter

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'assets', 'img', 'frame-painted.webp')
S = 4                              # drawn four times larger, then reduced: smooth stroke edges
W, H, B = 480, 320, 44             # the image, and the width of the frame's border in it
GOLD = ['#f6c443', '#ffd978', '#e9a43b', '#cf7f2c', '#f2b93a', '#b8741f', '#9a5d17', '#e0a032', '#ffe7a3']


def hexrgb(c, a=255):
    return (int(c[1:3], 16), int(c[3:5], 16), int(c[5:7], 16), a)


def main():
    random.seed(1888)
    # painted on an opaque ground with blending (each stroke lies over the ones before it); the opening
    # for the canvas is cut out at the end
    im = Image.new('RGB', (W * S, H * S), (150, 104, 30))
    d = ImageDraw.Draw(im, 'RGBA')
    b = B * S
    # the gilded ground, shaped like a moulding: a pale outer edge, a bright round in the middle, a
    # shadowed hollow towards the canvas
    for i in range(b):
        t = i / b
        lift = math.exp(-((t - 0.38) / 0.2) ** 2) * 0.55 - t * 0.35
        c = tuple(int(max(0, min(255, v * (1 + lift)))) for v in (200, 146, 46)) + (255,)
        d.rectangle((i, i, W * S - 1 - i, H * S - 1 - i), outline=c)
    # strokes along each side: horizontal on the top and bottom, vertical on the sides, across the corners
    def stroke(x, y, ang, length, width, col):
        # a loaded stroke: round at both ends, a little curved, lighter where the paint is thickest
        a = random.randint(150, 235)
        bend = random.uniform(-0.25, 0.25)
        pts = []
        for k in range(7):
            u = k / 6 - 0.5
            an = ang + bend * u
            pts.append((x + math.cos(an) * length * u, y + math.sin(an) * length * u))
        d.line(pts, fill=hexrgb(col, a), width=int(width), joint='curve')
        for (px, py) in (pts[0], pts[-1]):
            r = width / 2
            d.ellipse((px - r, py - r, px + r, py + r), fill=hexrgb(col, a))
        d.line(pts[1:-1], fill=(255, 250, 225, int(a * 0.35)), width=max(1, int(width * 0.28)), joint='curve')
    for _ in range(3400):
        side = random.random()
        depth = random.uniform(0.06, 0.92) * b
        L = random.uniform(8, 30) * S
        w = random.uniform(2.4, 5.2) * S
        col = random.choice(GOLD)
        if side < 0.32:                                   # top / bottom
            x = random.uniform(0, W * S)
            y = depth if random.random() < 0.5 else H * S - depth
            ang = random.uniform(-0.12, 0.12)
        elif side < 0.64:                                 # left / right
            y = random.uniform(0, H * S)
            x = depth if random.random() < 0.5 else W * S - depth
            ang = math.pi / 2 + random.uniform(-0.12, 0.12)
        else:                                             # the corners: strokes turn across them
            cx, cy = random.choice([(0, 0), (W * S, 0), (0, H * S), (W * S, H * S)])
            r = random.uniform(0.1, 1.0) * b
            a = random.uniform(0, math.pi / 2)
            sx = 1 if cx == 0 else -1
            sy = 1 if cy == 0 else -1
            x, y = cx + sx * (b - r * math.cos(a)) * 0.95, cy + sy * (b - r * math.sin(a)) * 0.95
            ang = math.atan2(sy, sx) + math.pi / 2 + random.uniform(-0.3, 0.3)
        # only on the frame, not on the canvas it surrounds
        if b * 0.98 < x < W * S - b * 0.98 and b * 0.98 < y < H * S - b * 0.98:
            continue
        stroke(x, y, ang, L, w, col)
    # light from the upper left on the outer edge, shadow on the lower right
    for i in range(int(6 * S)):
        a = int(120 * (1 - i / (6 * S)))
        d.line((i, i, W * S - i, i), fill=(255, 246, 214, a), width=1)
        d.line((i, i, i, H * S - i), fill=(255, 246, 214, a), width=1)
        d.line((i, H * S - 1 - i, W * S - i, H * S - 1 - i), fill=(60, 30, 6, a), width=1)
        d.line((W * S - 1 - i, i, W * S - 1 - i, H * S - i), fill=(60, 30, 6, a), width=1)
    # the lip and the bead where the frame meets the canvas
    lip = b - 5 * S
    d.rectangle((lip, lip, W * S - 1 - lip, H * S - 1 - lip), outline=(58, 30, 8, 255), width=int(3.2 * S))
    bead = b - 1.6 * S
    d.rectangle((bead, bead, W * S - 1 - bead, H * S - 1 - bead), outline=(255, 238, 190, 235), width=int(1.6 * S))
    im = im.filter(ImageFilter.GaussianBlur(S * 0.35)).resize((W, H), Image.LANCZOS)
    # the moulding's light over the paint: a bright round a third of the way in, a shadowed hollow by the canvas
    shade = Image.new('L', (W, H), 0)
    sd = ImageDraw.Draw(shade)
    for i in range(B):
        t = i / B
        v = 128 + int(70 * math.exp(-((t - 0.32) / 0.16) ** 2) - 95 * max(0.0, t - 0.55) / 0.45 - 40 * max(0.0, 0.08 - t) / 0.08)
        sd.rectangle((i, i, W - 1 - i, H - 1 - i), outline=max(0, min(255, v)))
    from PIL import ImageChops
    dark = ImageChops.multiply(im, Image.merge('RGB', [shade.point(lambda v: min(255, v * 2))] * 3))
    light = ImageChops.screen(im, Image.merge('RGB', [shade.point(lambda v: max(0, (v - 128) * 2))] * 3))
    im = Image.composite(light, dark, shade.point(lambda v: 255 if v > 128 else 0)).convert('RGBA')
    # the canvas opening stays clear
    hole = Image.new('L', (W, H), 255)
    ImageDraw.Draw(hole).rectangle((B, B, W - 1 - B, H - 1 - B), fill=0)
    im.putalpha(hole)
    im.save(OUT, 'WEBP', quality=90, method=6)
    print(OUT, os.path.getsize(OUT), 'bytes')


if __name__ == '__main__':
    main()
