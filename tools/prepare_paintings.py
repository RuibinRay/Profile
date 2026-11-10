#!/usr/bin/env python3
"""
prepare_paintings.py — turn the source paintings into everything the site needs.

For every painting in tools/source/paintings/ (see PAINTINGS below) this writes, into assets/paintings/:

  <id>-2048.webp   the painting for desktop screens (the WebGL stage)
  <id>-1280.webp   the painting for phones and the lighter stage
  <id>-640.webp    a small copy (menus, the classic portfolio, social cards)
  <id>-aux.png     the motion map the shader reads, 512 px wide:
                     R, G = the direction the paint flows (along its own brushstrokes; 0.5 = still)
                     B    = depth (0 = far sky, 1 = closest), from a monocular depth model
  <id>-bg-1280.webp  the far layer, with the foreground painted out   } the two-layer parallax
  <id>-fg-1280.webp  the foreground alone, on a transparent ground    } used by the lighter stage
  manifest.json    sizes, colours, a tiny blurred preview and the hand-placed anchor points

and assets/js/cinema/manifest.js, the same manifest as a module the site imports.

Depth comes from Depth Anything V2 (small), run locally with onnxruntime. The model is not part of
the repository; download it once (about 99 MB):

    python3 -m venv .venv && .venv/bin/pip install onnxruntime numpy pillow scipy
    curl -L -o depth_anything_v2_small.onnx \
      https://huggingface.co/onnx-community/depth-anything-v2-small/resolve/main/onnx/model.onnx
    .venv/bin/python tools/prepare_paintings.py --model depth_anything_v2_small.onnx

To add a painting: put the file in tools/source/paintings/, add an entry to PAINTINGS (its title, where
the sky ends, any water), run the script, then give it a shot in assets/js/cinema/storyboard.js.
"""
import argparse, base64, io, json, os, sys, heapq
import numpy as np
from PIL import Image, ImageFilter
from scipy import ndimage as ndi

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, 'tools', 'source', 'paintings')
OUT = os.path.join(ROOT, 'assets', 'paintings')
AUX_W = 512

# Anchors are points in the painting (0–1 across, 0–1 down) that cameras and portals aim at.
# `photo` is the photograph the painting was made from (shown from the painting's wall label).
# `water` are polygons where the paint may drift sideways; `falls` where it runs downward.
PAINTINGS = [
    dict(id='ocean', file='ocean.jpg', title='Starry Night Ocean',
         label='A Starry Night ocean scene, after Vincent van Gogh',
         alt='A figure sits on driftwood under a swirling Van Gogh-style night sky above the ocean.',
         sky_top=0.30, fg=0.22, legacy_flow=True,
         anchors=dict(star=[0.376, 0.430], moon=[0.906, 0.140], spiral=[0.53, 0.29], figure=[0.275, 0.56],
                      horizon=[0.5, 0.49], star2=[0.251, 0.140], star3=[0.635, 0.063], star4=[0.727, 0.184],
                      star5=[0.114, 0.031], star6=[0.144, 0.393], star7=[0.347, 0.264], star8=[0.431, 0.046])),
    dict(id='house', file='house.webp', title='The Flying House',
         label='Painted from my photograph in Lijiang, Yunnan',
         alt='A small patchwork house lifted by a bunch of bright balloons floats above a forest under a swirling blue sky.',
         photo=dict(src='assets/media/travel/chn/lijiang/lijiang-01.webp', w=1280, h=1707, caption='Lijiang'),
         sky_top=0.34, fg=0.20,
         anchors=dict(house=[0.51, 0.62], balloons=[0.51, 0.27], star=[0.755, 0.215], swirl=[0.345, 0.38],
                      window=[0.455, 0.58], horizon=[0.5, 0.62])),
    dict(id='blossom', file='blossom.webp', title='Blossom at Blue Moon Valley',
         label='Painted from my photograph at Blue Moon Valley, Lijiang',
         alt='A pink blossoming tree hung with prayer flags beside a waterfall, with snow mountains under a swirling sky.',
         photo=dict(src='assets/media/travel/chn/lijiang/lijiang-24.webp', w=2048, h=1536, caption='Blue Moon Valley'),
         fg=0.40, falls=[[[0.585, 0.795], [0.845, 0.795], [0.86, 0.93], [0.57, 0.93]]],
         anchors=dict(sun=[0.69, 0.15], tree=[0.22, 0.50], flags=[0.21, 0.80], falls=[0.71, 0.86], peak=[0.765, 0.375],
                      crown=[0.30, 0.36])),
    dict(id='lanterns', file='lanterns.jpg', title='Room of Lanterns',
         label='Painted from my photograph at the Van Gogh exhibition, Shanghai',
         alt='A figure sits on a mirrored floor looking up into a room of hundreds of glowing golden lanterns.',
         photo=dict(src='assets/media/travel/chn/shanghai/shanghai-02.webp', w=1536, h=2048, caption='Van Gogh exhibition, Shanghai'),
         fg=0.62, no_sky=True,
         anchors=dict(figure=[0.45, 0.70], head=[0.415, 0.47], vanish=[0.50, 0.52], lantern=[0.385, 0.14], gaze=[0.60, 0.22])),
    dict(id='yak', file='yak.webp', title='The Yak Rider',
         label='Painted from my photograph at Blue Moon Valley, Lijiang',
         alt='A faceless rider with crossed arms sits on a white yak on a wooden deck before a green lake and snow mountains.',
         photo=dict(src='assets/media/travel/chn/lijiang/lijiang-19.webp', w=2048, h=1536, caption='Blue Moon Valley'),
         fg=0.34,
         water=[[[0.0, 0.52], [0.36, 0.50], [0.40, 0.62], [0.36, 0.75], [0.0, 0.76]],
                [[0.60, 0.50], [1.0, 0.56], [1.0, 0.77], [0.60, 0.75], [0.56, 0.62]]],
         anchors=dict(rider=[0.455, 0.30], yak=[0.49, 0.72], sky=[0.44, 0.08], lake=[0.80, 0.64], peak=[0.84, 0.10])),
    dict(id='bookshop', file='bookshop.webp', title='The Spiral Library',
         label='Painted from my photograph in Shenzhen',
         alt='A tunnel of spiralling bookshelves glowing red and gold, with tables of books leading toward its centre.',
         photo=dict(src='assets/media/travel/chn/shenzhen/shenzhen-03.webp', w=1536, h=2048, caption='Shenzhen'),
         fg=0.62, no_sky=True,
         anchors=dict(tunnel=[0.527, 0.468], table=[0.70, 0.74], lamp=[0.115, 0.115])),
    dict(id='field', file='field.webp', title='Golden Field',
         label='Painted from my photograph in Dali, Yunnan',
         alt='A wide golden wheat field under a blue sky of swirling clouds, with a village and mountains on the horizon.',
         photo=dict(src='assets/media/travel/chn/dali/dali-10.webp', w=2048, h=1536, caption='Dali'),
         fg=0.50,
         anchors=dict(sun=[0.85, 0.185], horizon=[0.5, 0.43], village=[0.76, 0.395], field=[0.45, 0.72], cloud=[0.31, 0.12])),
    dict(id='terraces', file='terraces.webp', title='White Terraces',
         label='Painted from my photograph in Lijiang, Yunnan',
         alt='White stone terraces holding turquoise pools step down a hillside toward a town, under a starry swirling sky.',
         photo=dict(src='assets/media/travel/chn/lijiang/lijiang-16.webp', w=2048, h=1536, caption='Lijiang'),
         fg=0.50,
         water=[[[0.30, 0.50], [0.56, 0.52], [0.86, 0.72], [0.86, 0.98], [0.42, 0.98], [0.36, 0.70]],
                [[0.0, 0.42], [0.07, 0.45], [0.06, 0.72], [0.0, 0.72]]],
         anchors=dict(moon=[0.933, 0.10], path=[0.335, 0.235], town=[0.62, 0.46], pools=[0.50, 0.74], tree=[0.03, 0.17],
                      star=[0.585, 0.045])),
]


def smoothstep(a, b, x):
    t = np.clip((x - a) / (b - a + 1e-9), 0, 1)
    return t * t * (3 - 2 * t)


def polygon_mask(polys, w, h):
    from PIL import ImageDraw
    m = Image.new('L', (w, h), 0)
    d = ImageDraw.Draw(m)
    for p in polys or []:
        d.polygon([(x * w, y * h) for x, y in p], fill=255)
    return np.asarray(m, np.float32) / 255.0


# ---------------------------------------------------------------------------------------------- depth
def depth_of(sess, im):
    W, H = im.size
    tw = 14 * 56
    th = int(round(tw * H / W / 14)) * 14
    x = np.asarray(im.resize((tw, th), Image.LANCZOS), np.float32) / 255.0
    x = ((x - np.array([0.485, 0.456, 0.406], np.float32)) / np.array([0.229, 0.224, 0.225], np.float32))
    d = sess.run(None, {sess.get_inputs()[0].name: x.transpose(2, 0, 1)[None]})[0][0]
    return (d - d.min()) / (d.max() - d.min() + 1e-9)          # 0 = far, 1 = near


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
    sky = ndi.binary_erosion(sky, iterations=2)
    return ndi.gaussian_filter(sky.astype(np.float32), 3.0)


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
    # average an unsigned direction through its double angle
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


def flow_of(im, d, cfg):
    w, h = AUX_W, int(round(AUX_W * im.size[1] / im.size[0]))
    rgb = np.asarray(im.resize((w, h), Image.LANCZOS), np.float32) / 255.0
    dd = np.asarray(Image.fromarray(d).resize((w, h), Image.BILINEAR))
    if cfg.get('legacy_flow'):
        # the ocean keeps the hand-tuned maps made for the first version of the site
        legacy = os.path.join(SRC, 'ocean-flow')
        sky = np.asarray(Image.open(os.path.join(legacy, 'flow-sky.png')).convert('RGB').resize((w, h), Image.BILINEAR), np.float32) / 255.0
        sea = np.asarray(Image.open(os.path.join(legacy, 'flow-sea.png')).convert('RGB').resize((w, h), Image.BILINEAR), np.float32) / 255.0
        fx = (sky[..., 0] * 2 - 1) * sky[..., 2] + (sea[..., 0] * 2 - 1) * sea[..., 2] * 0.55
        fy = (sky[..., 1] * 2 - 1) * sky[..., 2] + (sea[..., 1] * 2 - 1) * sea[..., 2] * 0.55
        return fx, fy, dd
    vx, vy, coh = stroke_field(rgb)
    fx, fy = orient(vx, vy, coh)
    sky = np.asarray(Image.fromarray(sky_mask(d, cfg)).resize((w, h), Image.BILINEAR))
    speed = sky * (0.45 + 0.55 * smoothstep(0.05, 0.5, coh))
    fx, fy = fx * speed, fy * speed
    water = ndi.gaussian_filter(polygon_mask(cfg.get('water'), w, h), 4.0) * (dd < 0.55)
    if water.max() > 0:      # still water: a slow sideways drift along its ripples
        wx = np.abs(vx) * 0.9 + 0.1
        fx = fx + water * 0.38 * wx; fy = fy + water * 0.38 * vy * np.sign(vx + 1e-6) * 0.5
    falls = ndi.gaussian_filter(polygon_mask(cfg.get('falls'), w, h), 3.0)
    if falls.max() > 0:      # falling water runs straight down
        fy = fy + falls * 0.75
    return fx, fy, dd


# ---------------------------------------------------------------------------------------------- layers
def paint_out(rgb, hole):
    """Fill the hole with the colours around it (push–pull), so the far layer has something behind
    the foreground when the two slide apart."""
    keep = 1.0 - hole
    out = rgb.copy()
    filled = keep.copy()
    for s in (2, 4, 8, 16, 32, 64, 128):
        num = ndi.gaussian_filter(rgb * keep[..., None], (s, s, 0))
        den = ndi.gaussian_filter(keep, s)
        est = num / (den[..., None] + 1e-6)
        take = (filled < 0.5) & (den > 0.02)
        out[take] = est[take]
        filled[take] = 1.0
    soft = ndi.gaussian_filter(hole, 1.5)[..., None]
    blur = ndi.gaussian_filter(out, (3, 3, 0))
    return rgb * (1 - soft) + blur * soft


def layers_of(im, d, cfg):
    w, h = 1280, int(round(1280 * im.size[1] / im.size[0]))
    small = im.resize((w // 2, h // 2), Image.LANCZOS)
    rgb = np.asarray(small, np.float32) / 255.0
    dd = np.asarray(Image.fromarray(d).resize((w // 2, h // 2), Image.BILINEAR))
    t = cfg['fg']
    alpha = smoothstep(t - 0.05, t + 0.05, dd)
    hole = ndi.binary_dilation(alpha > 0.05, iterations=3).astype(np.float32)
    bg = paint_out(rgb, hole)
    bg_im = Image.fromarray((np.clip(bg, 0, 1) * 255).astype(np.uint8)).resize((w, h), Image.BICUBIC)
    # where the far layer is not hidden it is the painting itself, at full sharpness
    full = im.resize((w, h), Image.LANCZOS)
    hole_full = Image.fromarray((ndi.gaussian_filter(hole, 2.0) * 255).astype(np.uint8)).resize((w, h), Image.BILINEAR)
    bg_im = Image.composite(bg_im, full, hole_full)
    a_full = Image.fromarray((alpha * 255).astype(np.uint8)).resize((w, h), Image.BILINEAR).filter(ImageFilter.GaussianBlur(0.8))
    fg_im = full.convert('RGBA'); fg_im.putalpha(a_full)
    return bg_im, fg_im


# ---------------------------------------------------------------------------------------------- main
def sized(im, width):
    h = int(round(width * im.size[1] / im.size[0]))
    out = im.resize((width, h), Image.LANCZOS)
    if width > im.size[0]:
        out = out.filter(ImageFilter.UnsharpMask(radius=1.4, percent=55, threshold=2))
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--model', required=True, help='path to the Depth Anything V2 small ONNX file')
    ap.add_argument('--only', help='comma-separated painting ids')
    ap.add_argument('--preview', help='folder for a contact sheet of the maps (optional)')
    a = ap.parse_args()
    import onnxruntime as ort
    sess = ort.InferenceSession(a.model, providers=['CPUExecutionProvider'])
    os.makedirs(OUT, exist_ok=True)
    manifest_path = os.path.join(OUT, 'manifest.json')
    manifest = {}
    if os.path.exists(manifest_path):
        manifest = {p['id']: p for p in json.load(open(manifest_path))['paintings']}
    only = set(a.only.split(',')) if a.only else None
    for cfg in PAINTINGS:
        pid = cfg['id']
        if only and pid not in only:
            continue
        im = Image.open(os.path.join(SRC, cfg['file'])).convert('RGB')
        W, H = im.size
        d = depth_of(sess, im).astype(np.float32)
        for width, q in ((2048, 84), (1280, 82), (640, 78)):
            sized(im, width).save(os.path.join(OUT, f'{pid}-{width}.webp'), 'WEBP', quality=q, method=6)
        fx, fy, dd = flow_of(im, d, cfg)
        depth_enc = np.power(np.clip(dd, 0, 1), 0.55)
        depth_enc = ndi.gaussian_filter(depth_enc, 0.8)
        aux = np.stack([np.clip(0.5 + 0.5 * fx, 0, 1), np.clip(0.5 + 0.5 * fy, 0, 1), depth_enc], -1)
        Image.fromarray((aux * 255 + 0.5).astype(np.uint8)).save(os.path.join(OUT, f'{pid}-aux.png'), optimize=True)
        bg_im, fg_im = layers_of(im, d, cfg)
        bg_im.save(os.path.join(OUT, f'{pid}-bg-1280.webp'), 'WEBP', quality=80, method=6)
        fg_im.save(os.path.join(OUT, f'{pid}-fg-1280.webp'), 'WEBP', quality=80, method=6, alpha_quality=80)
        tiny = im.resize((40, max(1, int(round(40 * H / W)))), Image.LANCZOS).filter(ImageFilter.GaussianBlur(1.2))
        buf = io.BytesIO(); tiny.save(buf, 'JPEG', quality=55)
        pal = im.resize((96, 54), Image.LANCZOS).quantize(5, method=Image.MEDIANCUT).getpalette()[:15]
        colours = ['#%02x%02x%02x' % tuple(pal[i:i + 3]) for i in range(0, 15, 3)]
        mean = np.asarray(im.resize((32, 18)), np.float32).mean((0, 1))
        entry = dict(id=pid, title=cfg['title'], label=cfg['label'], alt=cfg['alt'],
                     w=2048, h=int(round(2048 * H / W)), aspect=round(W / H, 4),
                     base=f'assets/paintings/{pid}', sizes=[2048, 1280, 640],
                     aux=f'assets/paintings/{pid}-aux.png',
                     layers=dict(bg=f'assets/paintings/{pid}-bg-1280.webp', fg=f'assets/paintings/{pid}-fg-1280.webp'),
                     blur='data:image/jpeg;base64,' + base64.b64encode(buf.getvalue()).decode(),
                     colours=colours, mean='#%02x%02x%02x' % tuple(int(v) for v in mean),
                     anchors=cfg['anchors'])
        if cfg.get('photo'):
            entry['photo'] = cfg['photo']
        manifest[pid] = entry
        print(f'{pid:10s} {W}x{H}  sky {float((sky_mask(d, cfg) > .5).mean()):.2f}  flow {float(np.hypot(fx, fy).mean()):.3f}')
        if a.preview:
            os.makedirs(a.preview, exist_ok=True)
            pw, ph = 480, int(480 * H / W)
            sheet = Image.new('RGB', (pw * 4, ph))
            sheet.paste(im.resize((pw, ph)), (0, 0))
            sheet.paste(Image.fromarray((depth_enc * 255).astype(np.uint8)).resize((pw, ph)).convert('RGB'), (pw, 0))
            mag = np.clip(np.hypot(fx, fy), 0, 1); ang = (np.arctan2(fy, fx) + np.pi) / (2 * np.pi)
            hsv = np.stack([ang, np.ones_like(ang), mag], -1)
            sheet.paste(Image.fromarray((hsv * 255).astype(np.uint8), 'HSV').convert('RGB').resize((pw, ph)), (pw * 2, 0))
            chk = Image.new('RGB', (pw, ph), (200, 60, 160)); chk.paste(fg_im.resize((pw, ph)), (0, 0), fg_im.resize((pw, ph)))
            half = Image.new('RGB', (pw, ph)); half.paste(bg_im.resize((pw, ph)).crop((0, 0, pw // 2, ph)), (0, 0)); half.paste(chk.crop((pw // 2, 0, pw, ph)), (pw // 2, 0))
            sheet.paste(half, (pw * 3, 0))
            sheet.save(os.path.join(a.preview, f'{pid}.jpg'), quality=85)
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
