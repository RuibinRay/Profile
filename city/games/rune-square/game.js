/*
 * Rune Square — Game City No. 31 (North Harbour, logic).
 *
 * What it does: a square of stones, some already carved with a rune. Carve the rest so that every rune stands
 * once in each row, each column and each box. Twelve grids, 4 × 4 then 6 × 6. Notes mode marks small dots for
 * the runes a square might hold. Clashing runes turn red, so the reason a grid is not solved can be seen.
 * The level list, undo, reset and the save are the puzzle kit's (city/kit/puzzle.js).
 * What it leaves alone: everything outside its canvas; it saves only which grids are solved, and in how many moves.
 * To turn its effects off: it has none beyond sounds, which the bar's switch mutes.
 * The rules are in logic.js, the grids and runes in data.js (made by tools/city-make-runes.mjs).
 * check() proves that each grid has exactly one solution.
 */
import { puzzle } from '../../kit/puzzle.js';
import { text, sprite, box, night } from '../../kit/draw.js';
import { LEVELS, RUNES } from './data.js';
import { parse, clashes, solved, count } from './logic.js';

const A = '#7fe8c0', INK = '#04140f';
let sel = -1, notesMode = false;

function geo(st) {
  const cs = st.n === 4 ? 32 : 24, size = cs * st.n;
  return { cs, size, x0: st.n === 4 ? 36 : 28, y0: 16 + Math.round((162 - size) / 2) };
}
/* the palette on the right: the runes, then Erase and Notes */
const PAL = { x: 204, y: 24, step: 34, w: 30 };
function palAt(st, p) {
  for (let k = 0; k < st.n; k++) {
    const x = PAL.x + (k % 3) * PAL.step, y = PAL.y + Math.floor(k / 3) * PAL.step;
    if (p.x >= x && p.x < x + PAL.w && p.y >= y && p.y < y + PAL.w) return k + 1;
  }
  const y = PAL.y + Math.ceil(st.n / 3) * PAL.step + 4;
  if (p.x >= PAL.x && p.x < PAL.x + 98 && p.y >= y && p.y < y + 15) return 'erase';
  if (p.x >= PAL.x && p.x < PAL.x + 98 && p.y >= y + 19 && p.y < y + 34) return 'notes';
  return null;
}
function place(G, st, k) {
  if (sel < 0 || st.given[sel]) { G.sfx('bad'); return false; }
  if (k === 0) { if (!st.v[sel] && !st.notes[sel]) return false; st.v[sel] = 0; st.notes[sel] = 0; G.sfx('undo'); return true; }
  if (notesMode) { if (st.v[sel]) return false; st.notes[sel] ^= 1 << k; G.sfx('move'); return true; }
  st.v[sel] = st.v[sel] === k ? 0 : k; st.notes[sel] = 0;
  G.sfx(st.v[sel] && clashes(st)[sel] ? 'bad' : 'turn');
  return true;
}
function input(G, st) {
  const { cs, x0, y0 } = geo(st), n = st.n;
  if (G.hit.note) { notesMode = !notesMode; G.sfx('blip'); }
  if (G.hit.left || G.hit.right || G.hit.up || G.hit.down) {
    if (sel < 0) sel = 0;
    else {
      const x = Math.max(0, Math.min(n - 1, (sel % n) + (G.hit.right ? 1 : 0) - (G.hit.left ? 1 : 0)));
      const y = Math.max(0, Math.min(n - 1, Math.floor(sel / n) + (G.hit.down ? 1 : 0) - (G.hit.up ? 1 : 0)));
      sel = y * n + x;
    }
    G.sfx('move');
  }
  if (G.ptr.hit) {
    const x = Math.floor((G.ptr.x - x0) / cs), y = Math.floor((G.ptr.y - y0) / cs);
    if (x >= 0 && y >= 0 && x < n && y < n) { sel = y * n + x; G.sfx('move'); return false; }
    const p = palAt(st, G.ptr);
    if (p === 'notes') { notesMode = !notesMode; G.sfx('blip'); return false; }
    if (p === 'erase') return place(G, st, 0);
    if (p) return place(G, st, p);
  }
  if (G.hit.d0) return place(G, st, 0);
  for (let k = 1; k <= n; k++) if (G.hit['d' + k]) return place(G, st, k);
  return false;
}
function rune(g, k, x, y, scale, dim) { const r = RUNES[k - 1]; sprite(g, r.art, x, y, { '#': dim ? '#6f8a96' : r.col }, { scale }); }

function harbour(g) {
  night(g, 320, 180, ['#061a24', '#0a2a36', '#0f3a44', '#16484e'], 31);
  g.fillStyle = '#7fe8c0'; for (let x = 0; x < 320; x += 3) g.fillRect(x, 20 + Math.round(Math.sin(x / 23) * 6 + Math.sin(x / 7) * 2), 2, 1);   // the northern lights
  g.fillStyle = '#3fb39a'; for (let x = 1; x < 320; x += 5) g.fillRect(x, 27 + Math.round(Math.sin(x / 19 + 1) * 5), 2, 1);
}
function draw(g, G, st) {
  harbour(g);
  const { cs, size, x0, y0 } = geo(st), n = st.n, bad = clashes(st), same = sel >= 0 ? st.v[sel] : 0;
  g.fillStyle = INK; g.fillRect(x0 - 3, y0 - 3, size + 6, size + 6);
  g.fillStyle = A; g.fillRect(x0 - 2, y0 - 2, size + 4, size + 4);
  for (let i = 0; i < n * n; i++) {
    const x = i % n, y = (i - x) / n, px = x0 + x * cs, py = y0 + y * cs;
    const gapR = (x + 1) % st.bw === 0 ? 2 : 1, gapB = (y + 1) % st.bh === 0 ? 2 : 1;
    g.fillStyle = bad[i] ? '#6a1c2c' : st.given[i] ? '#1a2a33' : '#2c414c';
    g.fillRect(px, py, cs - (x === n - 1 ? 0 : gapR), cs - (y === n - 1 ? 0 : gapB));
    if (st.v[i]) {
      rune(g, st.v[i], px + Math.floor((cs - 14) / 2) - 1, py + Math.floor((cs - 18) / 2) - 1, 2);
      if (st.given[i]) { g.fillStyle = '#6f8a96'; g.fillRect(px + 1, py + 1, 2, 1); g.fillRect(px + 1, py + 1, 1, 2); }
      if (same && st.v[i] === same && i !== sel) { g.fillStyle = A; g.fillRect(px + 1, py + cs - 4, cs - 4, 1); }
    } else for (let k = 1; k <= n; k++) if (st.notes[i] & (1 << k)) {
      g.fillStyle = RUNES[k - 1].col;
      g.fillRect(px + 3 + ((k - 1) % 3) * Math.floor((cs - 6) / 3), py + 3 + Math.floor((k - 1) / 3) * Math.floor((cs - 6) / 3), 3, 3);
    }
  }
  if (sel >= 0) {
    const px = x0 + (sel % n) * cs, py = y0 + Math.floor(sel / n) * cs;
    g.fillStyle = '#fff8e6';
    g.fillRect(px - 1, py - 1, cs + 1, 2); g.fillRect(px - 1, py + cs - 2, cs + 1, 2); g.fillRect(px - 1, py - 1, 2, cs + 1); g.fillRect(px + cs - 2, py - 1, 2, cs + 1);
  }
  // the palette
  const hot = palAt(st, G.ptr);
  for (let k = 1; k <= n; k++) {
    const x = PAL.x + ((k - 1) % 3) * PAL.step, y = PAL.y + Math.floor((k - 1) / 3) * PAL.step;
    const left = n - st.v.filter((v) => v === k).length;
    box(g, x, y, PAL.w, PAL.w, hot === k ? '#35505c' : '#1a2a33', left ? RUNES[k - 1].col : '#3a4a52');
    rune(g, k, x + 8, y + 3, 2, !left);
    text(g, String(k), x + 3, y + 21, '#9ab0b8');
  }
  const y = PAL.y + Math.ceil(n / 3) * PAL.step + 4;
  box(g, PAL.x, y, 98, 15, hot === 'erase' ? '#35505c' : '#1a2a33', '#9ab0b8');
  text(g, 'ERASE  0', PAL.x + 49, y + 4, '#fff8e6', { align: 'center' });
  box(g, PAL.x, y + 19, 98, 15, notesMode ? A : hot === 'notes' ? '#35505c' : '#1a2a33', A);
  text(g, notesMode ? 'NOTES ON  N' : 'NOTES OFF  N', PAL.x + 49, y + 23, notesMode ? INK : '#fff8e6', { align: 'center' });
  const empty = st.v.filter((v) => !v).length, wrong = bad.filter(Boolean).length;
  text(g, wrong ? wrong + ' RUNES CLASH' : empty ? empty + ' STONES LEFT' : 'DONE', PAL.x + 49, 168, wrong ? '#ff8a8a' : '#d9dcf2', { align: 'center' });
}

function check() {
  const bad = [];
  LEVELS.forEach((l, i) => {
    const st = parse(l), c = count(st.n, st.v, 2);
    if (c.found !== 1) bad.push((i + 1) + ' has ' + (c.found ? 'more than one solution' : 'no solution'));
    else if (!solved({ ...st, v: c.first })) bad.push((i + 1) + ': the solver and the game disagree');
    if (solved(st)) bad.push((i + 1) + ' starts solved');
  });
  return { ok: !bad.length, note: bad.length ? 'solver: ' + bad.join('; ') : 'solver: all ' + LEVELS.length + ' grids have exactly one solution' };
}

export default puzzle({
  id: 'rune-square', n: 31, name: 'Rune Square', district: 'NORTH HARBOUR', accent: A, ink: INK,
  how: 'Carve a rune in every stone. Each rune must stand once in every row, every column and every box.',
  levels: LEVELS,
  open: (l) => { sel = -1; return parse(l); },
  input, solved, draw, check,
  label: (l) => (l[0] === '4' ? '4 X 4' : '6 X 6'),
  title: (g) => harbour(g)
});
