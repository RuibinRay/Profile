/*
 * Pixel Painter — Game City No. 3 (Pixel Plaza, logic).
 *
 * What it does: picture logic. The numbers beside each row and above each column give the lengths of its runs of
 * painted squares, in order. Paint the squares that must be painted (and cross out the ones that cannot be, as a
 * note to yourself) until every line matches: the grid then turns into a small picture. Twelve pictures, from
 * 5 × 5 to 15 × 15. Mistakes are allowed and nothing is timed; the level list, undo, reset and the save are the
 * puzzle kit's (city/kit/puzzle.js).
 * What it leaves alone: everything outside its canvas; it saves only which pictures are finished, and in how many moves.
 * To turn its effects off: nothing moves by itself.
 * The rules and the solver are in logic.js, the pictures in data.js. check() solves every picture by logic alone.
 */
import { puzzle } from '../../kit/puzzle.js';
import { text, textW, box, night } from '../../kit/draw.js';
import { PICTURES } from './data.js';
import { clues, solved, lineDone, solve } from './logic.js';

const A = '#f6c443', INK = '#0b0c2e';
const CLUES = PICTURES.map((p) => clues(p.rows));
const SMALL = ['###/#.#/#.#/#.#/###', '.#./##./.#./.#./###', '###/..#/###/#../###', '###/..#/###/..#/###', '#.#/#.#/###/..#/..#', '###/#../###/..#/###', '###/#../###/#.#/###', '###/..#/..#/.#./.#.', '###/#.#/###/#.#/###', '###/#.#/###/..#/###'];
const cur = { x: 0, y: 0, keys: false };
const drag = { val: -1, last: -1 };
let mode = 1;                                                          // 1 paints, 2 crosses out

function geo(i) {
  const c = CLUES[i];
  const tiny = c.w > 12 || c.h > 12, deep = Math.max(1, ...c.cols.map((r) => r.length));     // big grids: the small figures
  const leftW = Math.max(...c.rows.map((r) => (tiny ? smallW(r.length ? r : [0]) : textW(r.join(' ') || '0')))) + 5, topH = deep * (tiny ? 6 : 8) + 3;
  const ts = Math.min(14, Math.floor((160 - topH) / c.h), Math.floor((250 - leftW) / c.w));
  return { c, ts, tiny, leftW, topH, x0: Math.floor((256 - leftW - ts * c.w) / 2) + leftW, y0: 16 + topH + Math.floor((162 - topH - ts * c.h) / 2) };
}
const smallW = (list) => list.reduce((w, n) => w + String(n).length * 4 + 2, -3);
function small(g, list, x, y, col) {                                  // numbers in 3 × 5 figures, from x rightwards
  g.fillStyle = col;
  list.forEach((n) => {
    for (const ch of String(n)) { SMALL[+ch].split('/').forEach((row, ry) => { for (let rx = 0; rx < 3; rx++) if (row[rx] === '#') g.fillRect(x + rx, y + ry, 1, 1); }); x += 4; }
    x += 2;
  });
}
const BTN = [['PAINT', 30], ['CROSS', 48]];

function input(G, st, i) {
  const { c, ts, x0, y0 } = geo(i);
  if (G.hit.note) { mode = 3 - mode; G.sfx('blip'); }
  if (G.hit.left || G.hit.right || G.hit.up || G.hit.down) {
    cur.keys = true;
    cur.x = Math.max(0, Math.min(c.w - 1, cur.x + (G.hit.right ? 1 : 0) - (G.hit.left ? 1 : 0)));
    cur.y = Math.max(0, Math.min(c.h - 1, cur.y + (G.hit.down ? 1 : 0) - (G.hit.up ? 1 : 0)));
    G.sfx('move');
  }
  if (!G.ptr.down) drag.val = -1;
  if (G.ptr.hit) for (let k = 0; k < 2; k++) if (G.ptr.x >= 260 && G.ptr.x < 316 && G.ptr.y >= BTN[k][1] && G.ptr.y < BTN[k][1] + 15) { mode = k + 1; G.sfx('blip'); return false; }
  let at = -1, set = -1;
  if (G.hit.ok && cur.keys) at = cur.y * c.w + cur.x;
  const px = Math.floor((G.ptr.x - x0) / ts), py = Math.floor((G.ptr.y - y0) / ts), over = px >= 0 && py >= 0 && px < c.w && py < c.h ? py * c.w + px : -1;
  if (G.ptr.hit && over >= 0) { at = over; cur.x = px; cur.y = py; cur.keys = false; drag.val = st.g[over] === mode ? 0 : mode; drag.last = over; }
  else if (G.ptr.down && drag.val >= 0 && over >= 0 && over !== drag.last) { drag.last = over; if (st.g[over] !== drag.val) { at = over; set = drag.val; } }
  if (at < 0) return false;
  st.g[at] = set >= 0 ? set : st.g[at] === mode ? 0 : mode;
  G.sfx(st.g[at] === 1 ? 'turn' : st.g[at] ? 'move' : 'undo');
  return true;
}

function draw(g, G, st, i) {
  night(g, 320, 180, ['#0b0c2e', '#141244', '#1c1650', '#26205a'], 3);
  const p = PICTURES[i], { c, ts, tiny, x0, y0 } = geo(i);
  if (solved(st, c)) {                                                 // the finished picture, large
    const ps = Math.min(Math.floor(96 / c.h), Math.floor(220 / c.w)), w = ps * c.w, h = ps * c.h, x = Math.round(160 - w / 2), y = 31 + Math.round((96 - h) / 2);
    text(g, p.name, 160, 19, A, { align: 'center' });
    box(g, x - 4, y - 4, w + 8, h + 8, p.paper, A);
    g.fillStyle = p.ink;
    st.g.forEach((v, k) => { if (v === 1) g.fillRect(x + (k % c.w) * ps, y + Math.floor(k / c.w) * ps, ps, ps); });
    return;
  }
  g.fillStyle = '#3a2f6b'; g.fillRect(x0 - 1, y0 - 1, ts * c.w + 1, ts * c.h + 1);
  for (let k = 0; k < st.g.length; k++) {
    const x = k % c.w, y = (k - x) / c.w, px = x0 + x * ts, py = y0 + y * ts, v = st.g[k];
    g.fillStyle = v === 1 ? A : (Math.floor(x / 5) + Math.floor(y / 5)) % 2 ? '#1c1650' : '#221a5c'; g.fillRect(px, py, ts - 1, ts - 1);
    if (v === 1) { g.fillStyle = '#fff0a8'; g.fillRect(px, py, ts - 1, 1); }
    if (v === 2) { g.fillStyle = '#6a63a8'; const m = Math.floor((ts - 1) / 2); for (let d = -1; d <= 1; d++) { g.fillRect(px + m + d, py + m + d, 1, 1); g.fillRect(px + m + d, py + m - d, 1, 1); } }
  }
  g.fillStyle = '#7a6fd0';                                              // a heavier line every five squares
  for (let x = 5; x < c.w; x += 5) g.fillRect(x0 + x * ts - 1, y0 - 1, 1, ts * c.h + 1);
  for (let y = 5; y < c.h; y += 5) g.fillRect(x0 - 1, y0 + y * ts - 1, ts * c.w + 1, 1);
  c.rows.forEach((r, y) => {
    const col = lineDone(st, c, true, y) ? '#5a5490' : cur.keys && cur.y === y ? A : '#fff8e6', list = r.length ? r : [0];
    if (tiny) small(g, list, x0 - 4 - smallW(list), y0 + y * ts + Math.floor((ts - 6) / 2), col);
    else text(g, list.join(' '), x0 - 4, y0 + y * ts + Math.floor((ts - 8) / 2), col, { align: 'right' });
  });
  c.cols.forEach((r, x) => {
    const done = lineDone(st, c, false, x), col = done ? '#5a5490' : cur.keys && cur.x === x ? A : '#fff8e6', cx = x0 + x * ts + (ts - 1) / 2, list = r.length ? r : [0];
    list.forEach((n, k) => {
      if (tiny || (n >= 10 && ts < 13)) small(g, [n], Math.round(cx - smallW([n]) / 2), y0 - 2 - (list.length - k) * (tiny ? 6 : 8) + (tiny ? 0 : 1), col);
      else text(g, String(n), cx, y0 - 2 - (list.length - k) * 8, col, { align: 'center' });
    });
  });
  if (cur.keys) {
    const px = x0 + cur.x * ts, py = y0 + cur.y * ts;
    g.fillStyle = '#fff8e6';
    g.fillRect(px - 1, py - 1, ts + 1, 1); g.fillRect(px - 1, py + ts - 1, ts + 1, 1); g.fillRect(px - 1, py - 1, 1, ts + 1); g.fillRect(px + ts - 1, py - 1, 1, ts + 1);
  }
  BTN.forEach(([l, y], k) => { const on = mode === k + 1; box(g, 260, y, 56, 15, on ? A : '#1b1d4e', A); text(g, l, 288, y + 4, on ? INK : '#fff8e6', { align: 'center' }); });
  text(g, 'N SWAPS', 288, 68, '#9aa0d0', { align: 'center' });
  const need = c.rows.flat().reduce((s, v) => s + v, 0), have = st.g.filter((v) => v === 1).length;
  text(g, 'PAINTED', 288, 136, '#9aa0d0', { align: 'center' });
  text(g, have + ' OF ' + need, 288, 146, have > need ? '#ff7a4a' : '#fff8e6', { align: 'center' });
  text(g, c.w + ' X ' + c.h, 288, 160, '#9aa0d0', { align: 'center' });
}

function check() {
  const bad = [];
  PICTURES.forEach((p, i) => {
    const c = CLUES[i];
    if (p.rows.some((r) => r.length !== c.w)) bad.push((i + 1) + ' has rows of different lengths');
    const s = solve(c);
    if (!s) { bad.push((i + 1) + ' cannot be finished without guessing'); return; }
    if (!solved({ w: c.w, h: c.h, g: s }, c)) bad.push((i + 1) + ': the solver\'s picture does not match the clues');
    if (s.some((v, k) => v !== (p.rows[Math.floor(k / c.w)][k % c.w] === '#' ? 1 : 0))) bad.push((i + 1) + ': the clues give a different picture');
    if (solved({ w: c.w, h: c.h, g: s.map(() => 0) }, c)) bad.push((i + 1) + ' starts solved');
  });
  return { ok: !bad.length, note: bad.length ? 'solver: ' + bad.join('; ') : 'solver: all ' + PICTURES.length + ' pictures can be finished line by line, with no guessing' };
}

export default puzzle({
  id: 'pixel-painter', n: 3, name: 'Pixel Painter', district: 'PIXEL PLAZA', accent: A, ink: INK,
  how: 'The numbers give the runs of painted squares in each row and column. Paint the grid until every line matches, and a picture appears.',
  levels: PICTURES, solvedY: 132,
  open: (p, i) => { cur.x = 0; cur.y = 0; cur.keys = false; drag.val = -1; mode = 1; return { w: CLUES[i].w, h: CLUES[i].h, g: new Array(CLUES[i].w * CLUES[i].h).fill(0) }; },
  input, draw, check,
  solved: (st, i) => solved(st, CLUES[i]),
  label: (p, i) => CLUES[i].w + 'X' + CLUES[i].h,
  title: (g) => night(g, 320, 180, ['#0b0c2e', '#141244', '#22195a', '#3a2f6b'], 3)
});
