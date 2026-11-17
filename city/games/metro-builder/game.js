/*
 * Metro Builder — Game City No. 42 (Skyline Center, puzzle).
 *
 * What it does: a map of stations, open ground and towers. A click (or a drag) lays a piece of track on open
 * ground, or lifts it again. A map is solved when every station is linked through the track and no more pieces are
 * down than the map's budget — which is the fewest that can do it, so the lines have to share. Fifteen maps, no
 * timer, unlimited undo; the level list, undo, reset and the save are the puzzle kit's (city/kit/puzzle.js).
 * What it leaves alone: everything outside its canvas; it saves only which maps are solved, and in how many moves.
 * To turn its effects off: nothing moves by itself except the blinking lamps of the towers (still with reduced motion).
 * The rules and the solver are in logic.js, the maps in data.js (made by tools/city-make-metro.mjs).
 */
import { puzzle } from '../../kit/puzzle.js';
import { text, night, rnd } from '../../kit/draw.js';
import { LEVELS } from './data.js';
import { parse, used, linked, solved, solve, beside } from './logic.js';

const A = '#58e6ff', INK = '#021820', DIM = '#4a9ab4', OVER = '#ff7a4a';
const cur = { x: 0, y: 0, keys: false };
const drag = { val: -1, last: -1 };

function geo(st) {
  const ts = Math.min(20, Math.floor(304 / st.w), Math.floor(140 / st.h));
  return { ts, x0: Math.round((320 - ts * st.w) / 2), y0: 18 + Math.round((146 - ts * st.h) / 2) };
}
function input(G, st) {
  const { ts, x0, y0 } = geo(st);
  if (G.hit.left || G.hit.right || G.hit.up || G.hit.down) {
    cur.keys = true;
    cur.x = Math.max(0, Math.min(st.w - 1, cur.x + (G.hit.right ? 1 : 0) - (G.hit.left ? 1 : 0)));
    cur.y = Math.max(0, Math.min(st.h - 1, cur.y + (G.hit.down ? 1 : 0) - (G.hit.up ? 1 : 0)));
    G.sfx('move');
  }
  if (!G.ptr.down) drag.val = -1;
  let at = -1, set = -1;
  if (G.hit.ok && cur.keys) at = cur.y * st.w + cur.x;
  const px = Math.floor((G.ptr.x - x0) / ts), py = Math.floor((G.ptr.y - y0) / ts), over = px >= 0 && py >= 0 && px < st.w && py < st.h ? py * st.w + px : -1;
  if (G.ptr.hit && over >= 0) { at = over; cur.x = px; cur.y = py; cur.keys = false; drag.val = st.c[over] === '.' ? 1 - st.t[over] : -1; drag.last = over; }
  else if (G.ptr.down && drag.val >= 0 && over >= 0 && over !== drag.last) { drag.last = over; if (st.c[over] === '.' && st.t[over] !== drag.val) { at = over; set = drag.val; } }
  if (at < 0 || st.c[at] !== '.') return false;
  st.t[at] = set >= 0 ? set : 1 - st.t[at];
  G.sfx(st.t[at] ? 'turn' : 'undo');
  return true;
}
function draw(g, G, st) {
  night(g, 320, 180, ['#041420', '#06202c', '#0b2230', '#0b2a3a'], 42);
  const { ts, x0, y0 } = geo(st), on = linked(st), n = used(st), over = n > st.budget, c = Math.floor(ts / 2), wide = ts >= 16 ? 4 : 2, o = Math.floor((ts - wide) / 2);
  g.fillStyle = '#123246'; g.fillRect(x0 - 2, y0 - 2, ts * st.w + 3, ts * st.h + 3);
  const r = rnd(st.w * 31 + st.h);
  for (let i = 0; i < st.c.length; i++) {
    const x = i % st.w, y = (i - x) / st.w, px = x0 + x * ts, py = y0 + y * ts, ch = st.c[i], k = r();
    g.fillStyle = (x + y) % 2 ? '#0d2836' : '#0f2e3e'; g.fillRect(px, py, ts - 1, ts - 1);
    if (ch === '#') {                                                  // a tower, seen from the street
      const h = Math.floor(ts * (0.55 + k * 0.3)), w = ts - 5;
      g.fillStyle = '#1d4a62'; g.fillRect(px + 2, py + ts - 2 - h, w, h);
      g.fillStyle = '#2b6a88'; g.fillRect(px + 2, py + ts - 2 - h, w, 1); g.fillRect(px + 2, py + ts - 2 - h, 1, h);
      for (let wy = py + ts - h + 1; wy < py + ts - 4; wy += 4) for (let wx = px + 4; wx < px + w; wx += 4) { g.fillStyle = ((wx * 7 + wy * 3 + (G.calm ? 0 : Math.floor(G.t / 70))) % 5) ? '#ffe08a' : '#123246'; g.fillRect(wx, wy, 2, 2); }
      continue;
    }
    const joins = beside(st, i).filter((j) => st.c[j] === 'S' || st.t[j]);
    if (st.t[i] || ch === 'S') {
      g.fillStyle = over && st.t[i] ? OVER : on[i] ? A : DIM;
      if (st.t[i]) g.fillRect(px + o, py + o, wide, wide);
      joins.forEach((j) => {
        if (ch === 'S' && st.c[j] === 'S') { g.fillStyle = on[i] ? A : DIM; }
        const dx = (j % st.w) - x, dy = Math.floor(j / st.w) - y;
        if (dx) g.fillRect(dx > 0 ? px + c : px, py + o, dx > 0 ? ts - 1 - c : c, wide); else g.fillRect(px + o, dy > 0 ? py + c : py, wide, dy > 0 ? ts - 1 - c : c);
      });
      if (st.t[i]) { g.fillStyle = INK; for (const j of joins) { const dx = (j % st.w) - x, dy = Math.floor(j / st.w) - y; if (wide > 2) { if (dx) g.fillRect(px + c + dx * 3, py + o + 1, 1, wide - 2); else g.fillRect(px + o + 1, py + c + dy * 3, wide - 2, 1); } } }
    }
    if (ch === 'S') {                                                  // a station
      const s = Math.max(8, ts - 8), q = Math.floor((ts - 1 - s) / 2);
      g.fillStyle = INK; g.fillRect(px + q - 1, py + q - 1, s + 2, s + 2);
      g.fillStyle = on[i] ? '#fff8e6' : '#9ab4c0'; g.fillRect(px + q, py + q, s, s);
      g.fillStyle = on[i] ? A : '#1d4a62'; g.fillRect(px + q + 2, py + q + 2, s - 4, s - 4);
      g.fillStyle = on[i] ? '#fff8e6' : '#9ab4c0'; g.fillRect(px + q + 3, py + q + Math.floor(s / 2) - 1, s - 6, 2);
    }
  }
  if (cur.keys) {
    const px = x0 + cur.x * ts, py = y0 + cur.y * ts;
    g.fillStyle = '#fff8e6';
    g.fillRect(px - 1, py - 1, ts + 1, 1); g.fillRect(px - 1, py + ts - 1, ts + 1, 1); g.fillRect(px - 1, py - 1, 1, ts + 1); g.fillRect(px + ts - 1, py - 1, 1, ts + 1);
  }
  const all = st.c.filter((ch) => ch === 'S').length, got = st.c.filter((ch, i) => ch === 'S' && on[i]).length;
  text(g, 'TRACK ' + n + ' OF ' + st.budget, 4, 170, over ? OVER : '#fff8e6');
  text(g, over ? 'OVER THE BUDGET' : got < all ? got + ' OF ' + all + ' STATIONS LINKED' : 'ALL LINKED', 316, 170, over ? OVER : got < all ? '#d9dcf2' : A, { align: 'right' });
}

function check() {
  const bad = [];
  LEVELS.forEach((l, i) => {
    const st = parse(l);
    if (solved(st)) bad.push((i + 1) + ' starts solved');
    const s = solve(st);
    if (s.cost !== st.budget) bad.push((i + 1) + ': the budget is ' + st.budget + ' but the fewest pieces are ' + s.cost);
    s.cells.forEach((j) => { st.t[j] = 1; });
    if (!solved(st)) bad.push((i + 1) + ': the solver\'s network does not solve it');
    st.t[s.cells[0]] = 0;
    if (solved(st)) bad.push((i + 1) + ': still solved with a piece lifted');
  });
  return { ok: !bad.length, note: bad.length ? 'solver: ' + bad.join('; ') : 'solver: all ' + LEVELS.length + ' maps can be solved, and each budget is the fewest pieces' };
}

export default puzzle({
  id: 'metro-builder', n: 42, name: 'Metro Builder', district: 'SKYLINE CENTER', accent: A, ink: INK,
  how: 'Click or drag on open ground to lay track, and again to lift it. Link every station without going over the budget.',
  levels: LEVELS,
  open: (l) => { const st = parse(l), s = st.c.indexOf('S'); cur.x = s % st.w; cur.y = Math.floor(s / st.w); cur.keys = false; drag.val = -1; return st; },
  input, solved, draw, check,
  par: (l) => +l.split(':')[1],
  title: (g) => night(g, 320, 180, ['#041420', '#06202c', '#0b2230', '#123246'], 42)
});
