"""Build the two small supplementary fonts that keep the site looking the same on Mac and Windows.

  assets/fonts/rjy-arrows.woff2        ← → ↑ ↓ ↔ ↗ from Instrument Sans (Fraunces and the
                                        Instrument Sans text subsets have no arrows, so each
                                        system used to draw its own: Helvetica/Apple Symbols
                                        on a Mac, Segoe UI on Windows)
  assets/fonts/noto-serif-sc-sub.woff2  only the Chinese characters the site uses (中文, 沈阳,
                                        恒久安泰…), from Noto Serif SC (otherwise a Mac shows
                                        Songti and Windows shows SimSun)

Usage (sources from https://github.com/google/fonts, folders ofl/instrumentsans and ofl/notoserifsc):
  python3 tools/make_font_subsets.py "InstrumentSans[wdth,wght].ttf" "NotoSerifSC[wght].ttf"

Run it again after adding Chinese text to data/ or index.html, so the new characters are included.
Needs: pip install fonttools brotli
"""
import glob, os, re, sys
from fontTools.ttLib import TTFont
from fontTools.varLib import instancer
from fontTools import subset

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ARROWS = '←→↑↓↔↗'


def site_cjk():
    files = glob.glob(os.path.join(ROOT, 'data', '*.js')) + glob.glob(os.path.join(ROOT, 'assets', 'js', '*.js')) + [os.path.join(ROOT, 'index.html')]
    text = ''.join(open(f, encoding='utf8').read() for f in files)
    return ''.join(sorted(set(re.findall(r'[　-〿㐀-鿿豈-﫿＀-￯]', text))))


def build(src, out, chars, axes):
    font = TTFont(src)
    font = instancer.instantiateVariableFont(font, axes)
    opts = subset.Options()
    opts.flavor = 'woff2'
    opts.layout_features = ['kern']
    opts.name_IDs = ['*']
    opts.notdef_outline = False
    sub = subset.Subsetter(opts)
    sub.populate(text=chars)
    sub.subset(font)
    font.flavor = 'woff2'
    font.save(out)
    print(out, os.path.getsize(out), 'bytes,', len(chars), 'characters:', chars)


if __name__ == '__main__':
    if len(sys.argv) != 3:
        sys.exit(__doc__)
    fonts = os.path.join(ROOT, 'assets', 'fonts')
    build(sys.argv[1], os.path.join(fonts, 'rjy-arrows.woff2'), ARROWS, {'wdth': 100, 'wght': (400, 600)})
    build(sys.argv[2], os.path.join(fonts, 'noto-serif-sc-sub.woff2'), site_cjk(), {'wght': (300, 500)})
    print('If the Chinese characters changed, update the unicode-range of "Noto Serif SC Sub" in assets/css/site.css:')
    print('  unicode-range: ' + ', '.join('U+%04X' % ord(c) for c in site_cjk()) + ';')
