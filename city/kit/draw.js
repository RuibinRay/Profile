/*
 * draw.js — Game City's pixel helpers for a 320 × 180 canvas.
 *
 *   text(g, str, x, y, colour, o)   a line in the pixel world's 5 × 7 font (capitals only). o.align 'left' | 'center' |
 *                                   'right', o.scale (whole number), o.shadow (a colour for a one-pixel drop shadow)
 *   textW(str, scale)               its width in pixels
 *   wrap(str, width)                the string broken into lines no wider than `width` pixels
 *   sprite(g, rows, x, y, pal, o)   a drawing from a string template: rows of characters, each looked up in `pal`
 *                                   ('.' and ' ' are empty). o.flip mirrors it, o.scale enlarges it
 *   box(g, x, y, w, h, fill, edge)  a filled rectangle with a one-pixel border
 *   rnd(seed)                       a small seeded random number generator: () => 0..1
 *
 * It draws only where it is told to and keeps nothing between calls except a cache of letter shapes.
 * The font is the pixel world's own (assets/js/pixel/pixel-kit.js), plus a few signs the games need.
 */
import { FONT, FONT_ALIAS } from '../../assets/js/pixel/pixel-kit.js?v=20261117k';

const EXTRA = {
  '%': '##..#/##.#./...#./..#../.#.../.#.##/#..##', '(': '...#./..#../.#.../.#.../.#.../..#../...#.', ')': '.#.../..#../...#./...#./...#./..#../.#...',
  '"': '.#.#./.#.#./...../...../...../...../.....', '=': '...../...../#####/...../#####/...../.....', ';': '...../.##../.##../...../.##../..#../.#...',
  '#': '.#.#./.#.#./#####/.#.#./#####/.#.#./.#.#.', '_': '...../...../...../...../...../...../#####', '^': '..#../.#.#./#...#/...../...../...../.....',
  '[': '.###./.#.../.#.../.#.../.#.../.#.../.###.', ']': '.###./...#./...#./...#./...#./...#./.###.', '|': '..#../..#../..#../..#../..#../..#../..#..'
};
const ALIAS = { ...FONT_ALIAS, '“': '"', '”': '"', '…': '.', 'é': 'E', 'É': 'E' };
const runs = new Map();
function glyph(c) {
  if (runs.has(c)) return runs.get(c);
  const rows = (FONT[c] || EXTRA[c] || FONT['?']).split('/'), out = [];
  for (let r = 0; r < 7; r++) {
    let run = -1;
    for (let k = 0; k <= 5; k++) {
      const on = k < 5 && rows[r][k] === '#';
      if (on && run < 0) run = k;
      if (!on && run >= 0) { out.push([run, r, k - run]); run = -1; }
    }
  }
  runs.set(c, out);
  return out;
}
const chars = (str) => String(str).toUpperCase().split('').map((c) => ALIAS[c] || c);
const adv = (c) => (c === ' ' ? 4 : c === '.' || c === ',' || c === ':' || c === '!' || c === "'" ? 5 : 6);

export function textW(str, scale = 1) {
  let w = 0;
  chars(str).forEach((c) => { w += adv(c); });
  return Math.max(0, w - 1) * scale;
}

export function text(g, str, x, y, colour = '#fff8e6', o = {}) {
  const s = o.scale || 1, cs = chars(str), w = textW(str, s);
  let px = Math.round(o.align === 'center' ? x - w / 2 : o.align === 'right' ? x - w : x);
  const py = Math.round(y);
  const pass = (dx, dy, col) => {
    g.fillStyle = col;
    let cx = px + dx;
    cs.forEach((c) => {
      if (c !== ' ') glyph(c).forEach(([rx, ry, rw]) => g.fillRect(cx + rx * s, py + dy + ry * s, rw * s, s));
      cx += adv(c) * s;
    });
  };
  if (o.shadow) pass(s, s, o.shadow);
  pass(0, 0, colour);
  return w;
}

export function wrap(str, width) {
  const lines = [];
  String(str).split('\n').forEach((para) => {
    let line = '';
    para.split(' ').forEach((word) => {
      const next = line ? line + ' ' + word : word;
      if (line && textW(next) > width) { lines.push(line); line = word; } else line = next;
    });
    lines.push(line);
  });
  return lines;
}

export function sprite(g, rows, x, y, pal, o = {}) {
  const s = o.scale || 1;
  x = Math.round(x); y = Math.round(y);
  for (let r = 0; r < rows.length; r++) {
    const row = rows[r], n = row.length;
    for (let c = 0; c < n; c++) {
      const col = pal[row[o.flip ? n - 1 - c : c]];
      if (!col) continue;
      g.fillStyle = col;
      g.fillRect(x + c * s, y + r * s, s, s);
    }
  }
}

export function box(g, x, y, w, h, fill, edge) {
  x = Math.round(x); y = Math.round(y);
  if (edge) { g.fillStyle = edge; g.fillRect(x, y, w, h); }
  if (fill) { g.fillStyle = fill; g.fillRect(x + (edge ? 1 : 0), y + (edge ? 1 : 0), w - (edge ? 2 : 0), h - (edge ? 2 : 0)); }
}

export function rnd(seed) {
  let a = (seed >>> 0) || 1;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** The night sky every game can stand on: four bands and a few fixed stars. */
export function night(g, W, H, bands = ['#0b0c2e', '#131240', '#1c1650', '#261a5e'], seed = 7) {
  const n = bands.length;
  bands.forEach((c, i) => { g.fillStyle = c; g.fillRect(0, Math.round(i * H / n), W, Math.ceil(H / n)); });
  const r = rnd(seed);
  for (let i = 0; i < 40; i++) { g.fillStyle = i % 5 ? '#8f8fd0' : '#ffffff'; g.fillRect(Math.floor(r() * W), Math.floor(r() * H * 0.7), 1, 1); }
}
