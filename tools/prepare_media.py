#!/usr/bin/env python3
"""
Prepares a photo or a certificate for the site, in the three sizes the pages use.

    python3 tools/prepare_media.py <photo or PDF> <where it goes, without .webp> [--cert]

Examples:
    python3 tools/prepare_media.py ~/Downloads/IMG_2031.jpg assets/media/travel/chn/shenyang/shenyang-01
    python3 tools/prepare_media.py ~/Downloads/certificate.pdf assets/media/certificates/my-course --cert

It writes name.webp (2048 px on the long side, never enlarged), name-1080.webp and name-480.webp, turns
the photo the right way up, and leaves out the photo's metadata (camera details and GPS location).
For a PDF it uses the first page (needs pdftoppm: `brew install poppler` on a Mac). --cert keeps a
little more quality so the small print stays sharp.

It prints the line to paste into data/travel.js, data/gallery.js or data/journey.js (add a caption),
or the img/w/h fields for a certificate in data/site.js. Needs Pillow: pip install pillow.
"""
import os, subprocess, sys, tempfile
from PIL import Image, ImageFilter, ImageOps

SIZES = (480, 1080, 2048)          # long side; the last one is name.webp


def as_rgb(im):
    im = ImageOps.exif_transpose(im)
    if im.mode in ('RGBA', 'LA', 'P'):
        im = im.convert('RGBA')
        bg = Image.new('RGB', im.size, (5, 10, 46))       # the site's night blue behind any transparency
        bg.paste(im, mask=im.split()[-1])
        return bg
    return im.convert('RGB')


def from_pdf(path):
    tmp = tempfile.mkdtemp()
    base = os.path.join(tmp, 'page')
    subprocess.run(['pdftoppm', '-r', '220', '-f', '1', '-l', '1', '-png', '-singlefile', path, base], check=True)
    return Image.open(base + '.png')


def main():
    args = [a for a in sys.argv[1:] if not a.startswith('--')]
    if len(args) != 2:
        sys.exit(__doc__)
    src, out = args[0], args[1][:-5] if args[1].endswith('.webp') else args[1]
    cert = '--cert' in sys.argv
    im = as_rgb(from_pdf(src) if src.lower().endswith('.pdf') else Image.open(src))
    W, H = im.size
    os.makedirs(os.path.dirname(out) or '.', exist_ok=True)
    full = None
    for s in SIZES:
        scale = min(1.0, s / max(W, H))
        size = (max(1, round(W * scale)), max(1, round(H * scale)))
        r = im if size == im.size else im.resize(size, Image.LANCZOS)
        if scale < 0.6:                                   # a touch of sharpening after a big reduction
            r = r.filter(ImageFilter.UnsharpMask(radius=0.8, percent=45, threshold=2))
        last = s == SIZES[-1]
        path = out + ('.webp' if last else '-%d.webp' % s)
        q = (88 if last else 84) if cert else (82 if last else 80)
        r.save(path, 'WEBP', quality=q, method=6)       # no exif= argument: metadata is not copied
        print('%-60s %4d x %-4d %5d KB' % (path, r.size[0], r.size[1], os.path.getsize(path) // 1024))
        if last:
            full = (path, r.size)
    rel = os.path.relpath(full[0], os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
    w, h = full[1]
    print()
    if cert:
        print("img: '%s', w: %d, h: %d," % (rel, w, h))
    else:
        print("{ src: '%s', w: %d, h: %d, caption: '' }," % (rel, w, h))


if __name__ == '__main__':
    main()
