#!/usr/bin/env python3
"""
prepare_paintings.py — turn the 4K masters into everything the site needs.

The chain is:  tools/source/paintings/  (as supplied, 1376–2000 px wide)
            →  tools/masters/           (3840 px masters, made by tools/upscale_paintings.py)
            →  assets/paintings/        (the optimised web versions, written by this script)

For every painting in PAINTINGS this writes, into assets/paintings/:

  <id>-3840.avif                    the painting for large, capable screens
  <id>-2560.avif / .webp            the painting for most desktop screens
  <id>-1280.avif / .webp            phones and the lighter stage
  <id>-640.avif / .webp             thumbnails (menus, the plain portfolio)
  <id>-detail-<name>.avif / .webp   a 2048 px close-up of a region the camera enters

  the three depth layers (near things, the middle distance, the far distance):
  <id>-fill1-1920 / -960 .avif/.webp   what is behind the near layer, painted in by an inpainting model
  <id>-fill2-1920 / -960 .avif/.webp   what is behind the near and middle layers
                                       (both are transparent wherever the painting itself already shows it)

  the maps the shader reads (lossless PNG, 1280 px wide; 640 for the masks):
  <id>-auxa.png    R, G = the direction the paint flows (0.5 = still)   B = depth (0 far … 1 near)
  <id>-auxb.png    R = the near layer's matte   G = the middle layer's matte   B = depth with the near layer removed
  <id>-auxc.png    R = where wind moves things (wheat, leaves, lanterns)   G = water   B = sky

  for the lighter, no-WebGL stage:
  <id>-bg-1280.avif / .webp         the painting with the near layer painted out
  <id>-fg-1280.webp                 the near layer alone, on a transparent ground

  manifest.json    sizes, formats, layers, detail regions, colours, a tiny blurred preview, anchors

and assets/js/cinema/manifest.js, the same manifest as a module the site imports.

Depth is Depth Anything V2 (small) run at two scales and merged: the coarse pass gives the lie of the
land, the fine pass gives clean edges. Hidden areas are painted in with LaMa (big-lama). Neither model
is part of the repository:

    python3 -m venv .venv && .venv/bin/pip install torch onnxruntime numpy pillow scipy
    curl -L -o depth_anything_v2_small.onnx \
      https://huggingface.co/onnx-community/depth-anything-v2-small/resolve/main/onnx/model.onnx
    curl -L -o big-lama.pt https://github.com/Sanster/models/releases/download/add_big_lama/big-lama.pt
    .venv/bin/python tools/prepare_paintings.py --depth depth_anything_v2_small.onnx --lama big-lama.pt

To add a painting: put the file in tools/source/paintings/, add an entry to PAINTINGS, run
tools/upscale_paintings.py and then this script, and give it a shot in assets/js/cinema/storyboard.js.
"""
import argparse, base64, io, json, os, sys, heapq, time
import numpy as np
from PIL import Image, ImageDraw, ImageFilter
from scipy import ndimage as ndi

Image.MAX_IMAGE_PIXELS = None

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, 'tools', 'source', 'paintings')
OUT = os.path.join(ROOT, 'assets', 'paintings')
MASTERS = os.path.join(ROOT, 'tools', 'masters')
MASTER_W = 3840          # the masters made by tools/upscale_paintings.py
DETAIL_W = 2048          # a detail master of one region the camera enters
AUX_W = 1280             # the shader's maps
MASK_W = 640             # the soft motion masks
WORK_W = 1920            # mattes are cut at this size
LAMA_W = 1536            # the inpainting model works at this size
FLOW_W = 512             # the brushstroke field is read at this size

# width -> (formats, avif quality, webp quality)
TIERS = [(3840, ('avif',), 70, 0), (2560, ('avif', 'webp'), 70, 84), (1280, ('avif', 'webp'), 70, 82), (640, ('avif', 'webp'), 68, 78)]
FILL_TIERS = [(1920, 62, 80), (960, 62, 78)]


def detail_rect(spec, aspect=None):
    """A detail region as (x0, y0, f): its top-left corner and its size, all as fractions of the
    painting (the region has the painting's own shape, so f is both its width and its height share)."""
    f = spec['f']; cx, cy = spec['c']
    return min(max(cx - f / 2, 0.0), 1.0 - f), min(max(cy - f / 2, 0.0), 1.0 - f), f


# Anchors are points in the painting (0–1 across, 0–1 down) that cameras and portals aim at.
# `photo` is the photograph the painting was made from (shown from the painting's wall label).
# `near` and `mid` are the depths (0 far … 1 near, as stored in the maps) where the near layer and the
# middle layer begin; `ceil` is how near the middle layer may come (by default no nearer than `near`). `water` are polygons where the paint may drift sideways, `falls` where it runs
# downward, `sway` where wind moves things. `details` are regions the camera enters (centre, size).
PAINTINGS = [
    # The ocean is put together from two supplied pictures: the night ocean with nobody in it (`file`), and
    # the figure on his log on a transparent ground (`element`: its left edge, top edge and width as
    # fractions of the painting; here the log runs off the left edge and its feet were removed). The
    # element is the near layer, exactly, and the empty ocean is what is behind it: nothing is guessed.
    # `lift` brings the element a little nearer than the water it sits on, so it slides across the waves.
    # Other versions that were supplied are kept in tools/source/paintings/ocean-alternates/.
    dict(id='ocean', file='ocean-back.png', title='Starry Night Ocean',
         element=dict(file='ocean-element.png', x=-0.0327, y=0.323, w=0.56), lift=0.10,
         label='A Starry Night ocean scene, after Vincent van Gogh',
         alt='A figure sits on driftwood under a swirling Van Gogh-style night sky above the ocean.',
         sky_top=0.45, near=0.45, mid=0.08, ceil=1.0,
         water=[[[0.0, 0.535], [1.0, 0.505], [1.0, 1.0], [0.0, 1.0]]],
         details=dict(star=dict(c=[0.371, 0.458], f=0.22), spiral=dict(c=[0.49, 0.30], f=0.36)),
         anchors=dict(star=[0.371, 0.458], moon=[0.908, 0.150], spiral=[0.49, 0.30], figure=[0.232, 0.55],
                      horizon=[0.5, 0.529], star2=[0.256, 0.148], star3=[0.638, 0.066], star4=[0.721, 0.195],
                      star5=[0.120, 0.040], star6=[0.150, 0.420], star7=[0.346, 0.282], star8=[0.437, 0.047])),
    dict(id='house', file='house.webp', title='The Flying House',
         label='Painted from my photograph in Lijiang, Yunnan',
         alt='A small patchwork house lifted by a bunch of bright balloons floats above a forest under a swirling blue sky.',
         photo=dict(src='assets/media/travel/chn/lijiang/lijiang-01.webp', w=1280, h=1707, caption='Lijiang'),
         sky_top=0.34, near=0.62, mid=0.30,
         sway=[[[0.0, 0.66], [1.0, 0.66], [1.0, 1.0], [0.0, 1.0]], [[0.40, 0.08], [0.62, 0.08], [0.62, 0.42], [0.40, 0.42]]],
         details=dict(star=dict(c=[0.735, 0.235], f=0.36)),
         anchors=dict(house=[0.51, 0.62], balloons=[0.51, 0.27], star=[0.755, 0.215], swirl=[0.345, 0.38],
                      window=[0.455, 0.58], horizon=[0.5, 0.62])),
    dict(id='blossom', file='blossom.webp', title='Blossom at Blue Moon Valley',
         label='Painted from my photograph at Blue Moon Valley, Lijiang',
         alt='A pink blossoming tree hung with prayer flags beside a waterfall, with snow mountains under a swirling sky.',
         photo=dict(src='assets/media/travel/chn/lijiang/lijiang-24.webp', w=2048, h=1536, caption='Blue Moon Valley'),
         near=0.62, mid=0.30, falls=[[[0.585, 0.795], [0.845, 0.795], [0.86, 0.93], [0.57, 0.93]]],
         sway=[[[0.0, 0.18], [0.44, 0.18], [0.52, 0.52], [0.34, 0.72], [0.0, 0.66]], [[0.84, 0.52], [1.0, 0.50], [1.0, 0.86], [0.84, 0.86]]],
         details=dict(sun=dict(c=[0.69, 0.16], f=0.34)),
         anchors=dict(sun=[0.69, 0.15], tree=[0.22, 0.50], flags=[0.21, 0.80], falls=[0.71, 0.86], peak=[0.765, 0.375],
                      crown=[0.30, 0.36])),
    dict(id='lanterns', file='lanterns.jpg', title='Room of Lanterns',
         label='Painted from my photograph at the Van Gogh exhibition, Shanghai',
         alt='A figure sits on a mirrored floor looking up into a room of hundreds of glowing golden lanterns.',
         photo=dict(src='assets/media/travel/chn/shanghai/shanghai-02.webp', w=1536, h=2048, caption='Van Gogh exhibition, Shanghai'),
         near=0.80, mid=0.40, no_sky=True,
         sway=[[[0.0, 0.0], [1.0, 0.0], [1.0, 0.50], [0.0, 0.50]]],
         details=dict(gaze=dict(c=[0.60, 0.22], f=0.30)),
         anchors=dict(figure=[0.45, 0.70], head=[0.415, 0.47], vanish=[0.50, 0.52], lantern=[0.385, 0.14], gaze=[0.60, 0.22])),
    dict(id='yak', file='yak.webp', title='The Yak Rider',
         label='Painted from my photograph at Blue Moon Valley, Lijiang',
         alt='A faceless rider with crossed arms sits on a white yak on a wooden deck before a green lake and snow mountains.',
         photo=dict(src='assets/media/travel/chn/lijiang/lijiang-19.webp', w=2048, h=1536, caption='Blue Moon Valley'),
         near=0.50, mid=0.12,
         details=dict(sky=dict(c=[0.44, 0.10], f=0.36)),
         water=[[[0.0, 0.52], [0.36, 0.50], [0.40, 0.62], [0.36, 0.75], [0.0, 0.76]],
                [[0.60, 0.50], [1.0, 0.56], [1.0, 0.77], [0.60, 0.75], [0.56, 0.62]]],
         sway=[[[0.0, 0.20], [0.36, 0.20], [0.36, 0.50], [0.0, 0.50]], [[0.62, 0.22], [1.0, 0.18], [1.0, 0.54], [0.62, 0.50]]],
         anchors=dict(rider=[0.455, 0.30], yak=[0.49, 0.72], sky=[0.44, 0.08], lake=[0.80, 0.64], peak=[0.84, 0.10])),
    dict(id='bookshop', file='bookshop.webp', title='The Spiral Library',
         label='Painted from my photograph in Shenzhen',
         alt='A tunnel of spiralling bookshelves glowing red and gold, with tables of books leading toward its centre.',
         photo=dict(src='assets/media/travel/chn/shenzhen/shenzhen-03.webp', w=1536, h=2048, caption='Shenzhen'),
         near=0.80, mid=0.40, no_sky=True,
         details=dict(tunnel=dict(c=[0.527, 0.468], f=0.40)),
         anchors=dict(tunnel=[0.527, 0.468], table=[0.70, 0.74], lamp=[0.115, 0.115])),
    dict(id='field', file='field.webp', title='Golden Field',
         label='Painted from my photograph in Dali, Yunnan',
         alt='A wide golden wheat field under a blue sky of swirling clouds, with a village and mountains on the horizon.',
         photo=dict(src='assets/media/travel/chn/dali/dali-10.webp', w=2048, h=1536, caption='Dali'),
         near=0.70, mid=0.25,
         sway=[[[0.0, 0.47], [1.0, 0.47], [1.0, 1.0], [0.0, 1.0]]],
         anchors=dict(sun=[0.85, 0.185], horizon=[0.5, 0.43], village=[0.76, 0.395], field=[0.45, 0.72], cloud=[0.31, 0.12])),
    dict(id='terraces', file='terraces.webp', title='White Terraces',
         label='Painted from my photograph in Lijiang, Yunnan',
         alt='White stone terraces holding turquoise pools step down a hillside toward a town, under a starry swirling sky.',
         photo=dict(src='assets/media/travel/chn/lijiang/lijiang-16.webp', w=2048, h=1536, caption='Lijiang'),
         near=0.72, mid=0.20,
         details=dict(star=dict(c=[0.585, 0.07], f=0.24)),
         water=[[[0.30, 0.50], [0.56, 0.52], [0.86, 0.72], [0.86, 0.98], [0.42, 0.98], [0.36, 0.70]],
                [[0.0, 0.42], [0.07, 0.45], [0.06, 0.72], [0.0, 0.72]]],
         sway=[[[0.0, 0.0], [0.12, 0.0], [0.12, 0.40], [0.0, 0.40]], [[0.74, 0.44], [1.0, 0.40], [1.0, 0.74], [0.86, 0.70]]],
         anchors=dict(moon=[0.933, 0.10], path=[0.335, 0.235], town=[0.62, 0.46], pools=[0.50, 0.74], tree=[0.03, 0.17],
                      star=[0.585, 0.045])),
]


def smoothstep(a, b, x):
    t = np.clip((x - a) / (b - a + 1e-9), 0, 1)
    return t * t * (3 - 2 * t)


def polygon_mask(polys, w, h):
    m = Image.new('L', (w, h), 0)
    d = ImageDraw.Draw(m)
    for p in polys or []:
        d.polygon([(x * w, y * h) for x, y in p], fill=255)
    return np.asarray(m, np.float32) / 255.0


def resize_f(a, size, how=Image.BILINEAR):
    """Resize a float32 map to (width, height)."""
    return np.asarray(Image.fromarray(a.astype(np.float32), 'F').resize(size, how), np.float32)


def u8(a):
    return (np.clip(a, 0, 1) * 255 + 0.5).astype(np.uint8)


# ---------------------------------------------------------------------------------------------- depth
def run_depth(sess, im, tw):
    W, H = im.size
    th = int(round(tw * H / W / 14)) * 14
    x = np.asarray(im.resize((tw, th), Image.LANCZOS), np.float32) / 255.0
    x = ((x - np.array([0.485, 0.456, 0.406], np.float32)) / np.array([0.229, 0.224, 0.225], np.float32))
    return sess.run(None, {sess.get_inputs()[0].name: x.transpose(2, 0, 1)[None]})[0][0].astype(np.float32)


def depth_of(sess, im):
    """Depth at two scales. The coarse pass (the size the model was trained at) is trusted for the
    overall lie of the land; the fine pass is trusted for edges. Returns (merged, coarse), both 0 = far
    and 1 = near; the coarse one alone is used to find the sky."""
    lo = run_depth(sess, im, 14 * 37)
    hi = run_depth(sess, im, 14 * 74)
    lo_n = (lo - lo.min()) / (lo.max() - lo.min() + 1e-9)
    h, w = hi.shape
    lo_up = resize_f(lo_n, (w, h), Image.BICUBIC)
    A = np.stack([hi.ravel(), np.ones(hi.size, np.float32)], 1)
    (a, b), *_ = np.linalg.lstsq(A, lo_up.ravel(), rcond=None)       # bring the fine pass onto the coarse scale
    hi_al = a * hi + b
    s = 9.0
    d = ndi.gaussian_filter(lo_up, s) + (hi_al - ndi.gaussian_filter(hi_al, s))
    d = ndi.median_filter(d, 3)
    return np.clip(d, 0, 1).astype(np.float32), lo_up.astype(np.float32)


def enc(d):
    """Depth as stored: the far distance gets most of the 256 steps."""
    return np.power(np.clip(d, 0, 1), 0.55)


def sky_mask(d, cfg):
    """The sky is where the model sees nothing nearer than infinity. A band along the very top of a
    tall sky sometimes reads slightly closer; anything far and joined to the top edge counts too."""
    if cfg.get('no_sky'):
        return np.zeros_like(d)
    H, W = d.shape
    sky = d < 0.004
    top = cfg.get('sky_top')
    if top:
        far = d < 0.09
        far[int(top * H):] = False
        lab, _ = ndi.label(far)
        ids = np.unique(lab[0])
        sky |= np.isin(lab, ids[ids > 0])
    sky = ndi.binary_erosion(sky, iterations=4)
    return ndi.gaussian_filter(sky.astype(np.float32), 6.0)


# ---------------------------------------------------------------------------------------------- flow
def stroke_field(rgb, sigma_g=1.0, sigma_t=5.0):
    """Direction along the brushstrokes (unsigned) and how strongly the strokes agree, from a colour
    structure tensor."""
    f = ndi.gaussian_filter(rgb, (sigma_g, sigma_g, 0))
    Jxx = Jxy = Jyy = 0
    for c in range(3):
        gx = ndi.sobel(f[..., c], axis=1) / 8.0
        gy = ndi.sobel(f[..., c], axis=0) / 8.0
        Jxx = Jxx + gx * gx; Jxy = Jxy + gx * gy; Jyy = Jyy + gy * gy
    Jxx = ndi.gaussian_filter(Jxx, sigma_t); Jxy = ndi.gaussian_filter(Jxy, sigma_t); Jyy = ndi.gaussian_filter(Jyy, sigma_t)
    phi = 0.5 * np.arctan2(2 * Jxy, Jxx - Jyy) + np.pi / 2
    tr = Jxx + Jyy
    det = np.sqrt(((Jxx - Jyy) / 2) ** 2 + Jxy ** 2)
    coh = ((2 * det) / (tr + 1e-8)) ** 2
    return np.cos(phi), np.sin(phi), coh


def orient(vx, vy, coh, grid=8):
    """Give the unsigned stroke directions a consistent sense, so paint streams around a swirl instead
    of meeting itself head-on: on a coarse grid, start from the most coherent cell and grow outward,
    flipping each new cell to agree with the neighbour it was reached from; then let every pixel take
    the sense of the smoothed coarse field. Where a seam is unavoidable the speed falls to zero."""
    H, W = vx.shape
    gh, gw = H // grid, W // grid
    cx = vx[:gh * grid, :gw * grid].reshape(gh, grid, gw, grid)
    cy = vy[:gh * grid, :gw * grid].reshape(gh, grid, gw, grid)
    a2 = np.arctan2((2 * cx * cy).mean((1, 3)), (cx * cx - cy * cy).mean((1, 3))) / 2
    gx, gy = np.cos(a2), np.sin(a2)
    gc = coh[:gh * grid, :gw * grid].reshape(gh, grid, gw, grid).mean((1, 3))
    done = np.zeros((gh, gw), bool)
    sy, sx = np.unravel_index(np.argmax(gc), gc.shape)
    if gx[sy, sx] < 0: gx[sy, sx] *= -1; gy[sy, sx] *= -1          # the seed streams left to right
    heap = [(-gc[sy, sx], sy, sx)]; done[sy, sx] = True
    while heap:
        _, y, x = heapq.heappop(heap)
        for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            ny, nx = y + dy, x + dx
            if 0 <= ny < gh and 0 <= nx < gw and not done[ny, nx]:
                if gx[ny, nx] * gx[y, x] + gy[ny, nx] * gy[y, x] < 0:
                    gx[ny, nx] *= -1; gy[ny, nx] *= -1
                done[ny, nx] = True
                heapq.heappush(heap, (-gc[ny, nx], ny, nx))
    gx = ndi.gaussian_filter(gx, 1.2); gy = ndi.gaussian_filter(gy, 1.2)
    ux = ndi.zoom(gx, (H / gh, W / gw), order=1); uy = ndi.zoom(gy, (H / gh, W / gw), order=1)
    dot = vx * ux + vy * uy
    sign = np.where(dot < 0, -1.0, 1.0)
    agree = smoothstep(0.15, 0.6, np.abs(dot) / (np.hypot(ux, uy) + 1e-6))
    fx = ndi.gaussian_filter(vx * sign * agree, 2.0); fy = ndi.gaussian_filter(vy * sign * agree, 2.0)
    return fx, fy


def flow_of(im, d, sky_lo, cfg):
    """The direction the paint streams, read at 512 px (it is a smooth field)."""
    w, h = FLOW_W, int(round(FLOW_W * im.size[1] / im.size[0]))
    rgb = np.asarray(im.resize((w, h), Image.LANCZOS), np.float32) / 255.0
    dd = resize_f(d, (w, h))
    if cfg.get('legacy_flow'):
        # the ocean keeps the hand-tuned maps made for the first version of the site
        legacy = os.path.join(SRC, 'ocean-flow')
        sky = np.asarray(Image.open(os.path.join(legacy, 'flow-sky.png')).convert('RGB').resize((w, h), Image.BILINEAR), np.float32) / 255.0
        sea = np.asarray(Image.open(os.path.join(legacy, 'flow-sea.png')).convert('RGB').resize((w, h), Image.BILINEAR), np.float32) / 255.0
        fx = (sky[..., 0] * 2 - 1) * sky[..., 2] + (sea[..., 0] * 2 - 1) * sea[..., 2] * 0.55
        fy = (sky[..., 1] * 2 - 1) * sky[..., 2] + (sea[..., 1] * 2 - 1) * sea[..., 2] * 0.55
        return fx, fy
    vx, vy, coh = stroke_field(rgb)
    fx, fy = orient(vx, vy, coh)
    sky = resize_f(sky_lo, (w, h))
    speed = sky * (0.45 + 0.55 * smoothstep(0.05, 0.5, coh))
    fx, fy = fx * speed, fy * speed
    water = ndi.gaussian_filter(polygon_mask(cfg.get('water'), w, h), 4.0) * (dd < 0.55)
    if water.max() > 0:      # still water: a slow sideways drift along its ripples
        wx = np.abs(vx) * 0.9 + 0.1
        fx = fx + water * 0.38 * wx; fy = fy + water * 0.38 * vy * np.sign(vx + 1e-6) * 0.5
    falls = ndi.gaussian_filter(polygon_mask(cfg.get('falls'), w, h), 3.0)
    if falls.max() > 0:      # falling water runs straight down
        fy = fy + falls * 0.75
    return fx, fy


# ---------------------------------------------------------------------------------------------- layers
def guided(I, p, r, eps):
    """Guided filter: p, smoothed, with its edges moved onto the edges of the guide image I."""
    box = lambda x: ndi.uniform_filter(x, 2 * r + 1, mode='reflect')
    mI, mp = box(I), box(p)
    a = (box(I * p) - mI * mp) / (box(I * I) - mI * mI + eps)
    b = mp - a * mI
    return box(a) * I + box(b)


def matte_of(e, t, guide, w=0.035, only=None):
    """A clean matte of everything nearer than depth t: thresholded, its edge pulled onto the painting's
    own edges, and with specks and pinholes removed. `only` (0–1) limits it to where that map is set:
    the paint left on a plate from which the water was removed, for example."""
    a = smoothstep(t - w, t + w, e)
    if only is not None: a = a * only
    a = guided(guide, a, 8, 2e-3)
    a = smoothstep(0.22, 0.78, a)
    area = a.size
    for inv in (False, True):
        m = (a < 0.5) if inv else (a > 0.5)
        lab, n = ndi.label(m)
        if n:
            sizes = ndi.sum(m, lab, np.arange(1, n + 1))
            small = np.isin(lab, np.nonzero(sizes < area * 4e-4)[0] + 1)
            if small.any():
                soft = ndi.gaussian_filter(small.astype(np.float32), 1.5)
                a = a * (1 - soft) + (1.0 if inv else 0.0) * soft
    return np.clip(a, 0, 1).astype(np.float32)


def edge_strength(matte, e, reach=110):
    """How much of a real step in depth runs along the matte's edge, spread `reach` pixels around it:
    1 where something stands in front of something far (a figure against the sky), 0 where the matte
    merely cuts across continuous ground (a field, a floor, the wall of a tunnel)."""
    band = ndi.binary_dilation((matte > 0.05) & (matte < 0.95), iterations=2)
    step = ndi.maximum_filter(e, 21) - ndi.minimum_filter(e, 21)
    disc = smoothstep(0.06, 0.16, step) * band
    return np.clip(ndi.gaussian_filter(ndi.maximum_filter(disc, 2 * reach + 1), 8.0) * 1.2, 0, 1)


def hidden_of(matte, e):
    """Where a back layer must show painted-in colour instead of the painting: inside the front layer
    (grown by a hair, so no fringe of it is left behind), but only near a real step in depth. Across
    continuous ground both layers move together, and the painting's own pixels stay."""
    grown = ndi.binary_dilation(matte > 0.02, iterations=3)
    return (np.clip(ndi.gaussian_filter(grown.astype(np.float32), 1.2), 0, 1) * edge_strength(matte, e)).astype(np.float32)


class Lama:
    """LaMa (big-lama, TorchScript): paints in the hole from what surrounds it. Uses the Apple GPU
    when there is one (about thirty times faster than the CPU)."""
    def __init__(self, path):
        import torch
        self.torch = torch
        self.dev = 'mps' if torch.backends.mps.is_available() else 'cpu'
        self.net = torch.jit.load(path, map_location=self.dev).eval()

    def __call__(self, rgb, hole):
        t = self.torch
        if not hole.any():
            return rgb
        H, W = hole.shape
        h8, w8 = (H + 7) // 8 * 8, (W + 7) // 8 * 8
        img = np.pad(rgb, ((0, h8 - H), (0, w8 - W), (0, 0)), mode='reflect').astype(np.float32) / 255.0
        m = np.pad(hole, ((0, h8 - H), (0, w8 - W)), mode='reflect').astype(np.float32)
        with t.no_grad():
            out = self.net(t.from_numpy(img).permute(2, 0, 1)[None].to(self.dev), t.from_numpy(m)[None, None].to(self.dev))
        out = (out[0].permute(1, 2, 0).cpu().numpy()[:H, :W] * 255).clip(0, 255).astype(np.uint8)
        return np.where(hole[..., None], out, rgb)


def fill_image(painted, alpha):
    """An RGBA fill: the painted-in colour where it is needed, transparent elsewhere. Outside that
    area the colour is a blur of itself, which costs almost nothing to store and filters cleanly."""
    need = ndi.binary_dilation(alpha > 0.004, iterations=10)
    rgb = painted.astype(np.float32)
    soft = np.stack([ndi.gaussian_filter(rgb[..., c], 18) for c in range(3)], -1)
    w = ndi.gaussian_filter(need.astype(np.float32), 4.0)[..., None]
    rgb = rgb * w + soft * (1 - w)
    return Image.fromarray(np.dstack([np.clip(rgb + 0.5, 0, 255).astype(np.uint8), u8(alpha)]), 'RGBA')


# ---------------------------------------------------------------------------------------------- output
def save_tiers(im, base, tiers):
    made = {}
    for width, formats, qa, qw in tiers:
        h = int(round(width * im.size[1] / im.size[0]))
        out = im if (width, h) == im.size else im.resize((width, h), Image.LANCZOS)
        for f in formats:
            if f == 'avif':
                out.save(f'{base}-{width}.avif', 'AVIF', quality=qa, speed=4, subsampling='4:4:4' if width >= 2560 else '4:2:0')
            else:
                out.save(f'{base}-{width}.webp', 'WEBP', quality=qw, method=6, alpha_quality=92)
        made[str(width)] = list(formats)
    return made


def tint_map(rgb, near, mid):
    out = rgb.astype(np.float32) * 0.45
    out[..., 0] += 140 * near
    out[..., 1] += 140 * mid * (1 - near)
    out[..., 2] += 120 * (1 - np.maximum(near, mid))
    return np.clip(out, 0, 255).astype(np.uint8)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--depth', required=True, help='path to the Depth Anything V2 small ONNX file')
    ap.add_argument('--lama', required=True, help='path to big-lama.pt')
    ap.add_argument('--only', help='comma-separated painting ids')
    ap.add_argument('--preview', help='folder for a contact sheet of the maps and layers (optional)')
    ap.add_argument('--cache', help='folder that keeps depth and inpainting results between runs (optional)')
    ap.add_argument('--maps-only', action='store_true', help='stop after the depth and layer preview (no files for the site)')
    a = ap.parse_args()
    import onnxruntime as ort
    sess = ort.InferenceSession(a.depth, providers=['CPUExecutionProvider'])
    lama = [None]
    os.makedirs(OUT, exist_ok=True)
    for d in (a.preview, a.cache):
        if d: os.makedirs(d, exist_ok=True)
    manifest_path = os.path.join(OUT, 'manifest.json')
    manifest = {}
    if os.path.exists(manifest_path):
        manifest = {p['id']: p for p in json.load(open(manifest_path))['paintings']}
    only = set(a.only.split(',')) if a.only else None

    def cached(name, make):
        if not a.cache:
            return make()
        path = os.path.join(a.cache, name)
        if os.path.exists(path):
            return np.load(path) if name.endswith('.npy') else np.asarray(Image.open(path).convert('RGB'))
        v = make()
        if name.endswith('.npy'): np.save(path, v)
        else: Image.fromarray(v).save(path, compress_level=3)
        return v

    for cfg in PAINTINGS:
        pid = cfg['id']
        if only and pid not in only:
            continue
        t0 = time.time()
        mpath = os.path.join(MASTERS, f'{pid}.webp')
        if not os.path.exists(mpath):
            print(f'{pid}: no master yet — run tools/upscale_paintings.py first'); continue
        master = Image.open(mpath).convert('RGB')
        W, H = master.size
        stamp = f'{pid}-{int(os.path.getmtime(mpath))}'
        base = os.path.join(OUT, pid)

        # --- depth of the painting as it is
        d, d_lo = cached(f'{stamp}-depth.npy', lambda: np.stack(depth_of(sess, master)))
        sky_lo = sky_mask(d_lo, cfg)
        clear = 1 - np.clip(sky_lo, 0, 1)
        d = (d * clear).astype(np.float32)          # the sky is at infinity, whatever a band along the top edge reads

        # --- the near layer: its matte, then the painting with it painted out
        ww, wh = WORK_W, int(round(WORK_W * H / W))
        work = master.resize((ww, wh), Image.LANCZOS)
        guide = np.asarray(work.convert('L'), np.float32) / 255.0
        e0 = enc(resize_f(d, (ww, wh), Image.BICUBIC))
        solid = None
        if cfg.get('plate'):
            # the plate shows only what is not water: paint where something stands, white where the sea was
            plate = np.asarray(Image.open(os.path.join(SRC, cfg['plate'])).convert('RGB').resize((ww, wh), Image.LANCZOS), np.float32)
            solid = 1 - smoothstep(226, 250, plate.min(axis=2))
        # a painting put together from a background and an element has its near layer and what is behind it exactly
        npath, bpath = os.path.join(MASTERS, f'{pid}-near.png'), os.path.join(MASTERS, f'{pid}-back.webp')
        true_layers = os.path.exists(npath) and os.path.exists(bpath)
        if true_layers:
            near = np.asarray(Image.open(npath).convert('L').resize((ww, wh), Image.LANCZOS), np.float32) / 255.0
            lift = float(cfg.get('lift', 0))
            if lift:
                d = np.clip(d + lift * resize_f(near, (d.shape[1], d.shape[0])), 0, 1).astype(np.float32)
                e0 = enc(resize_f(d, (ww, wh), Image.BICUBIC))
        else:
            near = matte_of(e0, cfg['near'], guide, only=solid)
        lw, lh = LAMA_W, int(round(LAMA_W * H / W))
        small = np.asarray(master.resize((lw, lh), Image.LANCZOS))

        def hole_of(hidden):
            grown = ndi.binary_dilation(hidden > 0.01, iterations=14)
            return np.asarray(Image.fromarray(grown.astype(np.uint8) * 255).resize((lw, lh), Image.BILINEAR)) > 96

        def paint_out(rgb, hidden, tag):
            def make():
                if lama[0] is None: lama[0] = Lama(a.lama)
                return lama[0](rgb, hole_of(hidden))
            return cached(f'{stamp}-{tag}.png', make)

        if true_layers:
            grown = ndi.binary_dilation(near > 0.02, iterations=3)
            hid1 = np.clip(ndi.gaussian_filter(grown.astype(np.float32), 1.2), 0, 1)       # everywhere under the element
            back1 = np.asarray(Image.open(bpath).convert('RGB').resize((lw, lh), Image.LANCZOS))
        else:
            hid1 = hidden_of(near, e0)
            back1 = paint_out(small, hid1, f'v2-back1-{cfg["near"]}')

        # --- the middle layer, cut from the scene with the near layer gone
        def depth_back():
            db, _ = depth_of(sess, Image.fromarray(back1))
            db = resize_f(db, (d.shape[1], d.shape[0]))
            keep = ~(resize_f(hole_of(hid1).astype(np.float32), (d.shape[1], d.shape[0])) > 0.02)
            A = np.stack([db[keep], np.ones(int(keep.sum()), np.float32)], 1)
            (s, o), *_ = np.linalg.lstsq(A, d[keep], rcond=None)                # same scale as the first depth
            db = np.clip(s * db + o, 0, 1)
            return np.where(keep, d, np.minimum(db, d)).astype(np.float32)      # behind the near layer, never nearer than it
        d1 = cached(f'{stamp}-v2-depth1-{cfg["near"]}.npy', depth_back)
        d1 = (d1 * clear).astype(np.float32)
        e1 = enc(resize_f(d1, (ww, wh), Image.BICUBIC))
        guide1 = np.asarray(Image.fromarray(back1).resize((ww, wh), Image.BICUBIC).convert('L'), np.float32) / 255.0
        mid = matte_of(e1, cfg['mid'], guide1)
        hid2 = hidden_of(mid, e1)
        back2 = paint_out(back1, hid2, f'v2-back2-{cfg["near"]}-{cfg["mid"]}')
        hid2 = np.maximum(hid2, hid1)

        if a.preview:
            pw, ph = 480, int(480 * H / W)
            rs = lambda x: Image.fromarray(x).resize((pw, ph), Image.LANCZOS)
            sheet = Image.new('RGB', (pw * 5, ph))
            sheet.paste(rs(tint_map(np.asarray(work), near, mid)), (0, 0))
            sheet.paste(rs(u8(e0)).convert('RGB'), (pw, 0))
            sheet.paste(rs(back1), (pw * 2, 0))
            sheet.paste(rs(back2), (pw * 3, 0))
            sheet.paste(rs(np.dstack([u8(hid1), u8(hid2), u8(e1)])), (pw * 4, 0))
            sheet.save(os.path.join(a.preview, f'layers-{pid}.jpg'), quality=85)
        print(f'{pid:10s} depth and layers: near {float((near > .5).mean()) * 100:4.1f}%  mid {float(((mid > .5) & (near < .5)).mean()) * 100:4.1f}%  '
              f'sky {float((sky_lo > .5).mean()) * 100:4.1f}%  ({time.time() - t0:.0f}s)', flush=True)
        if a.maps_only:
            continue

        # --- the painting itself, in every size
        formats = save_tiers(master, base, TIERS)

        # --- the fills behind the layers
        for k, (painted, alpha) in enumerate(((back1, hid1), (back2, hid2)), 1):
            big = np.asarray(Image.fromarray(painted).resize((ww, wh), Image.BICUBIC))
            fill = fill_image(big, alpha)
            for width, qa, qw in FILL_TIERS:
                out = fill if width == ww else fill.resize((width, int(round(width * H / W))), Image.LANCZOS)
                out.save(f'{base}-fill{k}-{width}.avif', 'AVIF', quality=qa, speed=4)
                out.save(f'{base}-fill{k}-{width}.webp', 'WEBP', quality=qw, method=6, alpha_quality=90)

        # --- the maps
        aw, ah = AUX_W, int(round(AUX_W * H / W))
        fx, fy = flow_of(master, d, sky_lo, cfg)
        fx, fy = (ndi.gaussian_filter(resize_f(f, (aw, ah), Image.BICUBIC), 1.0) for f in (fx, fy))
        da = ndi.gaussian_filter(enc(resize_f(d, (aw, ah), Image.BICUBIC)), 0.7)
        Image.fromarray(np.dstack([u8(0.5 + 0.5 * fx), u8(0.5 + 0.5 * fy), u8(da)])).save(f'{base}-auxa.png', optimize=True)
        d1a = ndi.gaussian_filter(enc(resize_f(d1, (aw, ah), Image.BICUBIC)), 0.7)
        Image.fromarray(np.dstack([u8(resize_f(near, (aw, ah))), u8(resize_f(mid, (aw, ah))), u8(d1a)])).save(f'{base}-auxb.png', optimize=True)
        kw, kh = MASK_W, int(round(MASK_W * H / W))
        dk = resize_f(d, (kw, kh))
        sky_k = resize_f(sky_lo, (kw, kh))
        sway = ndi.gaussian_filter(polygon_mask(cfg.get('sway'), kw, kh), 5.0) * (1 - sky_k)
        water = ndi.gaussian_filter(np.maximum(polygon_mask(cfg.get('water'), kw, kh), polygon_mask(cfg.get('falls'), kw, kh)), 4.0)
        # with a plate the water is known exactly: everything in its area that is not an object; otherwise, what is not close
        water = water * ((1 - resize_f(near, (kw, kh))) if (solid is not None or true_layers) else (dk < 0.55))
        Image.fromarray(np.dstack([u8(sway), u8(water), u8(sky_k)])).save(f'{base}-auxc.png', optimize=True)

        # --- the close-ups
        details = {}
        for name, spec in (cfg.get('details') or {}).items():
            dpath = os.path.join(MASTERS, f'{pid}-detail-{name}.webp')
            if not os.path.exists(dpath):
                continue
            det = Image.open(dpath).convert('RGB')
            det.save(f'{base}-detail-{name}.avif', 'AVIF', quality=68, speed=4, subsampling='4:4:4')
            det.save(f'{base}-detail-{name}.webp', 'WEBP', quality=84, method=6)
            x0, y0, f = detail_rect(spec)
            details[name] = dict(x=round(x0, 5), y=round(y0, 5), f=f, src=f'assets/paintings/{pid}-detail-{name}', w=det.size[0], h=det.size[1])

        # --- the two flat layers of the lighter stage
        bg = Image.fromarray(back1).resize((1280, int(round(1280 * H / W))), Image.LANCZOS)
        bg.save(f'{base}-bg-1280.avif', 'AVIF', quality=64, speed=4); bg.save(f'{base}-bg-1280.webp', 'WEBP', quality=80, method=6)
        fg = master.resize(bg.size, Image.LANCZOS).convert('RGBA'); fg.putalpha(Image.fromarray(u8(near)).resize(bg.size, Image.LANCZOS))
        fg.save(f'{base}-fg-1280.webp', 'WEBP', quality=82, method=6, alpha_quality=90)

        tiny = master.resize((40, max(1, int(round(40 * H / W)))), Image.LANCZOS).filter(ImageFilter.GaussianBlur(1.2))
        buf = io.BytesIO(); tiny.save(buf, 'JPEG', quality=55)
        pal = master.resize((96, 54), Image.LANCZOS).quantize(5, method=Image.MEDIANCUT).getpalette()[:15]
        colours = ['#%02x%02x%02x' % tuple(pal[i:i + 3]) for i in range(0, 15, 3)]
        mean = np.asarray(master.resize((32, 18)), np.float32).mean((0, 1))
        src = Image.open(os.path.join(SRC, cfg['file']))
        entry = dict(id=pid, title=cfg['title'], label=cfg['label'], alt=cfg['alt'],
                     w=W, h=H, aspect=round(W / H, 4), supplied=list(src.size),
                     base=f'assets/paintings/{pid}', sizes=[t[0] for t in TIERS], formats=formats,
                     aux=dict(a=f'assets/paintings/{pid}-auxa.png', b=f'assets/paintings/{pid}-auxb.png', c=f'assets/paintings/{pid}-auxc.png'),
                     layers=dict(near=cfg['near'], mid=cfg['mid'], ceil=cfg.get('ceil', cfg['near']),
                                 fill1=f'assets/paintings/{pid}-fill1', fill2=f'assets/paintings/{pid}-fill2', fills=[t[0] for t in FILL_TIERS],
                                 bg=f'assets/paintings/{pid}-bg-1280', fg=f'assets/paintings/{pid}-fg-1280.webp'),
                     details=details,
                     blur='data:image/jpeg;base64,' + base64.b64encode(buf.getvalue()).decode(),
                     colours=colours, mean='#%02x%02x%02x' % tuple(int(v) for v in mean),
                     anchors=cfg['anchors'])
        if cfg.get('photo'):
            entry['photo'] = cfg['photo']
        manifest[pid] = entry
        print(f'{"":10s} written ({time.time() - t0:.0f}s)', flush=True)

    if a.maps_only:
        return
    order = [c['id'] for c in PAINTINGS]
    data = dict(paintings=[manifest[i] for i in order if i in manifest])
    json.dump(data, open(manifest_path, 'w'), indent=1)
    js = ('// Generated by tools/prepare_paintings.py — do not edit by hand. Edit PAINTINGS in that script and run it again.\n'
          'export const PAINTINGS = ' + json.dumps({p['id']: p for p in data['paintings']}, indent=1) + ';\n'
          'export const PAINTING_ORDER = ' + json.dumps(order) + ';\n')
    with open(os.path.join(ROOT, 'assets', 'js', 'cinema', 'manifest.js'), 'w') as f:
        f.write(js)
    print('manifest:', len(data['paintings']), 'paintings')


if __name__ == '__main__':
    main()
