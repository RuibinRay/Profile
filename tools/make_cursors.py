#!/usr/bin/env python3
"""
make_cursors.py — the pixel world's mouse pointers (assets/img/cursors/).

Three 16 × 16 pixel drawings, written out at 32 px (ordinary screens) and 64 px (sharp screens) without
smoothing: an arrow, a pointing hand for links and buttons, and an open hand for the planet you can spin.
'#' is the outline, 'o' the fill, 'g' a gold shade, ' ' nothing. Used by assets/css/games.css and, over
the pixel planet, assets/css/cinema.css.

    python3 tools/make_cursors.py        (needs Pillow)
"""
import os
from PIL import Image

OUT = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'assets', 'img', 'cursors')
COL = {'#': (11, 12, 46, 255), 'o': (255, 248, 230, 255), 'g': (246, 196, 67, 255), ' ': (0, 0, 0, 0)}

ART = {
    # hotspot (0, 0): the tip
    'arrow': [
        '#',
        '##',
        '#o#',
        '#oo#',
        '#ooo#',
        '#oooo#',
        '#ooooo#',
        '#oooooo#',
        '#ooooooo#',
        '#oooooooo#',
        '#ooooogg###',
        '#oo#og#',
        '#o# #og#',
        '##  #og#',
        '#    #og#',
        '      ##',
    ],
    # hotspot (5, 0): the fingertip
    'hand': [
        '     ##',
        '    #oo#',
        '    #oo#',
        '    #oo#',
        '    #oo###',
        '    #oo#oo###',
        ' ## #oo#oo#oo##',
        '#oo##oo#oo#oo#o#',
        '#ooo#oooooooooo#',
        ' #ooooooooooooo#',
        '  #oooooooooooo#',
        '  #ooooooooooog#',
        '   #oooooooooog#',
        '    #oooooooog#',
        '    #ggggggggg#',
        '    ##########',
    ],
    # hotspot (8, 8): the palm
    'grab': [
        '    ## ## ##',
        '   #oo#oo#oo#',
        '   #oo#oo#oo###',
        '   #oo#oo#oo#oo#',
        '   #oo#oo#oo#oo#',
        ' ###oo#oo#oo#oo#',
        '#oo#oooooooooo#',
        '#ooooooooooooo#',
        '#ooooooooooooo#',
        ' #oooooooooooo#',
        '  #ooooooooooo#',
        '  #oooooooooog#',
        '   #ooooooooog#',
        '    #oooooooog#',
        '    #gggggggg#',
        '    #########',
    ],
}


def main():
    os.makedirs(OUT, exist_ok=True)
    for name, rows in ART.items():
        assert len(rows) == 16 and all(len(r) <= 16 for r in rows), name
        im = Image.new('RGBA', (16, 16), (0, 0, 0, 0))
        for y, row in enumerate(rows):
            for x, c in enumerate(row):
                im.putpixel((x, y), COL[c])
        im.resize((32, 32), Image.NEAREST).save(os.path.join(OUT, name + '.png'), optimize=True)
        im.resize((64, 64), Image.NEAREST).save(os.path.join(OUT, name + '@2x.png'), optimize=True)
        print(name, 'written')


if __name__ == '__main__':
    main()
