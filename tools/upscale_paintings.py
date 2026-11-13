#!/usr/bin/env python3
"""
upscale_paintings.py — make the 4K masters from the supplied paintings with AI super-resolution.

The supplied paintings are 1376–2000 px wide. This script enlarges each one four times with
Real-ESRGAN (x4plus, an RRDB network; BSD-3-Clause), reduces the result to a 3840 px wide master and
locks its colour and lighting to the original, so the model can only add fine paint texture: it
cannot move, recolour or re-light anything. Where the film's camera goes in very close (a star, the
end of the tunnel) it also cuts a detail master of that region at a higher density.

    tools/source/paintings/<file>              the painting as supplied (never changed)
    tools/masters/<id>.webp                    the 4K master (3840 px wide, near-lossless)
    tools/masters/<id>-detail-<name>.webp      a 2048 px detail master of one region
    tools/masters/<id>-back.webp, <id>-near.png   for a painting put together from a background and an
                                               element (the ocean): the empty background, and the element's matte

Nothing here is used by the website directly. tools/prepare_paintings.py reads the masters and writes
the optimised web versions into assets/paintings/.

Set-up (Apple silicon; the model file is not part of the repository):

    python3 -m venv .venv && .venv/bin/pip install torch numpy pillow scipy
    curl -L -o RealESRGAN_x4plus.pth \
      https://github.com/xinntao/Real-ESRGAN/releases/download/v0.1.0/RealESRGAN_x4plus.pth
    .venv/bin/python tools/upscale_paintings.py --weights RealESRGAN_x4plus.pth

--cache keeps the raw four-times enlargements (large PNG files) so a re-run only redoes what changed.
"""
import argparse, os, sys, time
import numpy as np
from PIL import Image
from scipy import ndimage as ndi

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from prepare_paintings import PAINTINGS, SRC, MASTERS, MASTER_W, DETAIL_W, detail_rect  # noqa: E402

import torch                      # noqa: E402
import torch.nn as nn             # noqa: E402
import torch.nn.functional as F   # noqa: E402

Image.MAX_IMAGE_PIXELS = None


# ------------------------------------------------------------------ the network (RRDBNet, as published)
class RDB(nn.Module):
    def __init__(self, nf=64, gc=32):
        super().__init__()
        self.conv1 = nn.Conv2d(nf, gc, 3, 1, 1)
        self.conv2 = nn.Conv2d(nf + gc, gc, 3, 1, 1)
        self.conv3 = nn.Conv2d(nf + 2 * gc, gc, 3, 1, 1)
        self.conv4 = nn.Conv2d(nf + 3 * gc, gc, 3, 1, 1)
        self.conv5 = nn.Conv2d(nf + 4 * gc, nf, 3, 1, 1)
        self.lrelu = nn.LeakyReLU(0.2, inplace=True)

    def forward(self, x):
        x1 = self.lrelu(self.conv1(x))
        x2 = self.lrelu(self.conv2(torch.cat((x, x1), 1)))
        x3 = self.lrelu(self.conv3(torch.cat((x, x1, x2), 1)))
        x4 = self.lrelu(self.conv4(torch.cat((x, x1, x2, x3), 1)))
        x5 = self.conv5(torch.cat((x, x1, x2, x3, x4), 1))
        return x5 * 0.2 + x


class RRDB(nn.Module):
    def __init__(self, nf=64, gc=32):
        super().__init__()
        self.rdb1, self.rdb2, self.rdb3 = RDB(nf, gc), RDB(nf, gc), RDB(nf, gc)

    def forward(self, x):
        return self.rdb3(self.rdb2(self.rdb1(x))) * 0.2 + x


class RRDBNet(nn.Module):
    def __init__(self, nf=64, nb=23, gc=32):
        super().__init__()
        self.conv_first = nn.Conv2d(3, nf, 3, 1, 1)
        self.body = nn.Sequential(*[RRDB(nf, gc) for _ in range(nb)])
        self.conv_body = nn.Conv2d(nf, nf, 3, 1, 1)
        self.conv_up1 = nn.Conv2d(nf, nf, 3, 1, 1)
        self.conv_up2 = nn.Conv2d(nf, nf, 3, 1, 1)
        self.conv_hr = nn.Conv2d(nf, nf, 3, 1, 1)
        self.conv_last = nn.Conv2d(nf, 3, 3, 1, 1)
        self.lrelu = nn.LeakyReLU(0.2, inplace=True)

    def forward(self, x):
        feat = self.conv_first(x)
        feat = feat + self.conv_body(self.body(feat))
        feat = self.lrelu(self.conv_up1(F.interpolate(feat, scale_factor=2, mode='nearest')))
        feat = self.lrelu(self.conv_up2(F.interpolate(feat, scale_factor=2, mode='nearest')))
        return self.conv_last(self.lrelu(self.conv_hr(feat)))


def load_model(path, dev):
    state = torch.load(path, map_location='cpu', weights_only=True)      # tensors only: no code is run
    state = state.get('params_ema', state.get('params', state))
    net = RRDBNet()
    net.load_state_dict(state, strict=True)
    return net.eval().to(dev)


def enlarge(net, dev, rgb, tile=224, pad=24, note=''):
    """Four times larger, tile by tile (each tile sees `pad` pixels of its neighbours, so no seams)."""
    H, W, _ = rgb.shape
    x = torch.from_numpy(np.ascontiguousarray(rgb)).permute(2, 0, 1).float().div(255.0)[None]
    x = F.pad(x, (pad, pad, pad, pad), mode='reflect')
    out = np.zeros((H * 4, W * 4, 3), np.uint8)
    n, total, t0 = 0, ((H + tile - 1) // tile) * ((W + tile - 1) // tile), time.time()
    for y0 in range(0, H, tile):
        for x0 in range(0, W, tile):
            y1, x1 = min(y0 + tile, H), min(x0 + tile, W)
            patch = x[:, :, y0:y1 + 2 * pad, x0:x1 + 2 * pad].to(dev)
            with torch.no_grad():
                o = net(patch)
            o = o[0, :, pad * 4:(pad + y1 - y0) * 4, pad * 4:(pad + x1 - x0) * 4].clamp(0, 1)
            out[y0 * 4:y1 * 4, x0 * 4:x1 * 4] = (o.permute(1, 2, 0).cpu().numpy() * 255 + 0.5).astype(np.uint8)
            n += 1
            if n % 12 == 0 or n == total:
                print(f'    {note} tile {n}/{total}  {time.time() - t0:.0f}s', flush=True)
    return out


def solid_colour(im):
    """An RGBA cut-out as (rgb, alpha) with its colours carried outward under the transparent part, so the
    upscaler never sees a white or black fringe along the edge."""
    px = np.asarray(im.convert('RGBA'))
    alpha = px[..., 3]
    idx = ndi.distance_transform_edt(alpha < 128, return_distances=False, return_indices=True)
    rgb = px[..., :3][idx[0], idx[1]]
    return np.ascontiguousarray(rgb), Image.fromarray(alpha)


def lock_colour(sr, ref, sigma):
    """Keep the model's fine detail and take everything coarser than `sigma` pixels from the original,
    so colour, light and composition are exactly the painting's."""
    sr = sr.astype(np.float32); ref = ref.astype(np.float32)
    out = sr - ndi.gaussian_filter(sr, (sigma, sigma, 0)) + ndi.gaussian_filter(ref, (sigma, sigma, 0))
    return np.clip(out + 0.5, 0, 255).astype(np.uint8)


def sixteen_nine(im):
    """Trim a painting to exactly 16:9 (the film's frame), taking the same amount from each side.
    The supplied paintings are within 1% of it, so this removes a few pixels at most."""
    W, H = im.size
    if abs(W / H - 16 / 9) < 1e-3:
        return im
    if W / H > 16 / 9:
        w = int(round(H * 16 / 9)); x = (W - w) // 2
        return im.crop((x, 0, x + w, H))
    h = int(round(W * 9 / 16)); y = (H - h) // 2
    return im.crop((0, y, W, y + h))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--weights', required=True, help='path to RealESRGAN_x4plus.pth')
    ap.add_argument('--only', help='comma-separated painting ids')
    ap.add_argument('--cache', help='folder for the raw four-times enlargements (optional)')
    ap.add_argument('--cpu', action='store_true', help='do not use the GPU')
    a = ap.parse_args()
    dev = torch.device('mps' if torch.backends.mps.is_available() and not a.cpu else 'cpu')
    net = load_model(a.weights, dev)
    os.makedirs(MASTERS, exist_ok=True)
    if a.cache:
        os.makedirs(a.cache, exist_ok=True)
    only = set(a.only.split(',')) if a.only else None
    for cfg in PAINTINGS:
        pid = cfg['id']
        if only and pid not in only:
            continue
        src = sixteen_nine(Image.open(os.path.join(SRC, cfg['file'])).convert('RGB'))
        W, H = src.size
        t0 = time.time()
        cached = os.path.join(a.cache, f'{pid}-x4.png') if a.cache else None
        if cached and os.path.exists(cached) and os.path.getmtime(cached) >= os.path.getmtime(os.path.join(SRC, cfg['file'])):
            x4 = np.asarray(Image.open(cached).convert('RGB'))
        else:
            x4 = enlarge(net, dev, np.asarray(src), note=pid)
            if cached:
                Image.fromarray(x4).save(cached, compress_level=3)
        mh = int(round(MASTER_W * H / W)); mh -= mh % 2
        elem = cfg.get('element')
        if elem:
            # a painting put together from a background and an element: keep the empty background as its own
            # master (it is what is behind the element), enlarge the element separately, then lay it in place
            back = np.asarray(Image.fromarray(x4).resize((MASTER_W, mh), Image.LANCZOS))
            back = lock_colour(back, np.asarray(src.resize((MASTER_W, mh), Image.BICUBIC)), 3.0 * MASTER_W / W)
            Image.fromarray(back).save(os.path.join(MASTERS, f'{pid}-back.webp'), 'WEBP', quality=97, method=6)
            e = Image.open(os.path.join(SRC, elem['file'])).convert('RGBA')
            rgb, alpha = solid_colour(e)
            e4 = Image.fromarray(enlarge(net, dev, rgb, note=pid + ' element'))
            cw, chh = x4.shape[1], x4.shape[0]
            ew = int(round(elem['w'] * cw)); eh = int(round(ew * e.height / e.width))
            at = (int(round(elem['x'] * cw)), int(round(elem['y'] * chh)))
            a_big = alpha.resize((ew, eh), Image.LANCZOS)
            a_big = Image.fromarray(np.clip((np.asarray(a_big, np.float32) - 40) * (255 / 175), 0, 255).astype(np.uint8))   # a firmer edge, pulled in a hair
            canvas = Image.fromarray(x4); canvas.paste(e4.resize((ew, eh), Image.LANCZOS), at, a_big)
            x4 = np.asarray(canvas)
            near = Image.new('L', (cw, chh), 0); near.paste(a_big, at)
            near.resize((MASTER_W, mh), Image.LANCZOS).save(os.path.join(MASTERS, f'{pid}-near.png'), optimize=True)
            # the same picture at the supplied size, for the colour lock
            sw = int(round(elem['w'] * W)); sh = int(round(sw * e.height / e.width))
            src = src.copy(); src.paste(e.resize((sw, sh), Image.LANCZOS), (int(round(elem['x'] * W)), int(round(elem['y'] * H))), alpha.resize((sw, sh), Image.LANCZOS))
            print(f'{"":10s} element laid in at {elem["x"]:.3f}, {elem["y"]:.3f}, {elem["w"] * 100:.0f}% of the width', flush=True)
        # the master: 3840 wide, an even number of rows, colour locked to the supplied painting
        big = Image.fromarray(x4)
        master = np.asarray(big.resize((MASTER_W, mh), Image.LANCZOS))
        ref = np.asarray(src.resize((MASTER_W, mh), Image.BICUBIC))
        master = lock_colour(master, ref, 3.0 * MASTER_W / W)
        Image.fromarray(master).save(os.path.join(MASTERS, f'{pid}.webp'), 'WEBP', quality=97, method=6)
        print(f'{pid:10s} {W}x{H} -> {MASTER_W}x{mh} master  ({time.time() - t0:.0f}s)', flush=True)
        # detail masters: regions the camera enters, at up to sixteen times the supplied density
        for name, spec in (cfg.get('details') or {}).items():
            x0, y0, f = detail_rect(spec, W / H)
            cx0, cy0 = int(round(x0 * W * 4)), int(round(y0 * H * 4))
            cw, ch = int(round(f * W * 4)), int(round(f * H * 4))
            crop = x4[cy0:cy0 + ch, cx0:cx0 + cw]
            dh = int(round(DETAIL_W * H / W)); dh -= dh % 2
            passes = 1
            if cw < DETAIL_W * 0.95:                       # not enough pixels yet: enlarge the region again
                crop2 = enlarge(net, dev, crop, note=f'{pid}/{name}')
                det = np.asarray(Image.fromarray(crop2).resize((DETAIL_W, dh), Image.LANCZOS))
                passes = 2
            else:
                det = np.asarray(Image.fromarray(crop).resize((DETAIL_W, dh), Image.LANCZOS))
            box = (x0 * W, y0 * H, (x0 + f) * W, (y0 + f) * H)
            ref = np.asarray(src.resize((DETAIL_W, dh), Image.BICUBIC, box=box))
            det = lock_colour(det, ref, 3.0 * DETAIL_W / (f * W))
            Image.fromarray(det).save(os.path.join(MASTERS, f'{pid}-detail-{name}.webp'), 'WEBP', quality=96, method=6)
            print(f'{"":10s} detail {name}: {f * 100:.0f}% of the width -> {DETAIL_W}x{dh}  '
                  f'({DETAIL_W / (f * W):.1f}x the supplied density, {passes} pass{"es" if passes > 1 else ""})', flush=True)
        if dev.type == 'mps':
            torch.mps.empty_cache()


if __name__ == '__main__':
    main()
