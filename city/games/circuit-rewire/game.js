/*
 * Circuit Rewire — Game City No. 11 (Neon Ward, puzzle).
 *
 * What it does: a board of wire tiles and one core. A click turns a tile a quarter turn clockwise. The level is
 * solved when the core powers every tile and no wire end is left loose. Twenty levels, no timer, unlimited
 * undo; the level list, undo, reset and the save are the puzzle kit's (city/kit/puzzle.js).
 * What it leaves alone: everything outside its canvas; it saves only which levels are solved, and in how many turns.
 * To turn its effects off: there is only the short flash of a turned tile; delete `spin` in draw to remove it.
 * The rules are in logic.js, the levels in data.js (made by tools/city-make-circuit.mjs). check() solves every level.
 */
import { puzzle } from '../../kit/puzzle.js';
import { text, night } from '../../kit/draw.js';
import { LEVELS } from './data.js';
import { parse, power, solved, solve, turn, DIRS } from './logic.js';

const A = '#c86bff', LIVE = '#41e8d8', DEAD = '#5a4a86', TILE = '#1c1040', TILE2 = '#241552';
const cur = { x: 0, y: 0, keys: false };
let spin = { i: -1, t: 0 };

function geo(st) {
  const ts = Math.min(24, Math.floor(300 / st.w), Math.floor(160 / st.h));
  return { ts, x0: Math.round((320 - ts * st.w) / 2), y0: 16 + Math.round((162 - ts * st.h) / 2) };
}
function input(G, st) {
  const { ts, x0, y0 } = geo(st);
  if (spin.t > 0) spin.t--;
  let at = -1;
  if (G.hit.left || G.hit.right || G.hit.up || G.hit.down) {
    cur.keys = true;
    cur.x = Math.max(0, Math.min(st.w - 1, cur.x + (G.hit.right ? 1 : 0) - (G.hit.left ? 1 : 0)));
    cur.y = Math.max(0, Math.min(st.h - 1, cur.y + (G.hit.down ? 1 : 0) - (G.hit.up ? 1 : 0)));
    G.sfx('move');
  }
  if (G.hit.ok && cur.keys) at = cur.y * st.w + cur.x;
  if (G.ptr.hit) {
    const x = Math.floor((G.ptr.x - x0) / ts), y = Math.floor((G.ptr.y - y0) / ts);
    if (x >= 0 && y >= 0 && x < st.w && y < st.h) { at = y * st.w + x; cur.x = x; cur.y = y; cur.keys = false; }
  }
  if (at < 0 || st.t[at] === 0 || st.t[at] === 15) return false;
  st.t[at] = turn(st.t[at]);
  spin = { i: at, t: 7 };
  G.sfx('turn');
  return true;
}
function draw(g, G, st) {
  night(g, 320, 180, ['#0e0626', '#140a34', '#1a0a2c', '#12072a'], 3);
  const { ts, x0, y0 } = geo(st), p = power(st), c = Math.floor(ts / 2), wire = ts >= 20 ? 4 : 2, o = Math.floor((ts - wire) / 2);
  g.fillStyle = '#3b1c72'; g.fillRect(x0 - 2, y0 - 2, ts * st.w + 3, ts * st.h + 3);
  for (let i = 0; i < st.t.length; i++) {
    const x = i % st.w, y = (i - x) / st.w, px = x0 + x * ts, py = y0 + y * ts, m = st.t[i], lit = p.lit[i], col = lit ? LIVE : DEAD;
    g.fillStyle = spin.i === i && spin.t > 0 ? '#4a2a8c' : (x + y) % 2 ? TILE : TILE2;
    g.fillRect(px, py, ts - 1, ts - 1);
    g.fillStyle = col;
    if (m & 1) g.fillRect(px + o, py, wire, c);
    if (m & 4) g.fillRect(px + o, py + c, wire, ts - 1 - c);
    if (m & 8) g.fillRect(px, py + o, c, wire);
    if (m & 2) g.fillRect(px + c, py + o, ts - 1 - c, wire);
    if (m) g.fillRect(px + o, py + o, wire, wire);
    const ends = (m & 1) + ((m >> 1) & 1) + ((m >> 2) & 1) + ((m >> 3) & 1);
    if (i === st.core) {                                        // the core
      g.fillStyle = '#12072a'; g.fillRect(px + o - 4, py + o - 4, wire + 8, wire + 8);
      g.fillStyle = A; g.fillRect(px + o - 3, py + o - 3, wire + 6, wire + 6);
      g.fillStyle = '#fff8e6'; g.fillRect(px + o - 1, py + o - 1, wire + 2, wire + 2);
    } else if (ends === 1) {                                    // a node at the end of a wire
      g.fillStyle = '#12072a'; g.fillRect(px + o - 3, py + o - 3, wire + 6, wire + 6);
      g.fillStyle = lit ? '#ffe08a' : '#3a2a5c'; g.fillRect(px + o - 2, py + o - 2, wire + 4, wire + 4);
      if (lit) { g.fillStyle = '#fff8e6'; g.fillRect(px + o - 1, py + o - 1, 2, 2); }
    }
    // a loose end shows a red tip, so the reason a level is not solved can be seen
    for (const [bit, dx, dy, back] of DIRS) {
      if (!(m & bit)) continue;
      const nx = x + dx, ny = y + dy, open = nx < 0 || ny < 0 || nx >= st.w || ny >= st.h || !(st.t[ny * st.w + nx] & back);
      if (!open) continue;
      g.fillStyle = '#ff5c7a';
      g.fillRect(px + (dx ? (dx > 0 ? ts - 3 : 0) : o), py + (dy ? (dy > 0 ? ts - 3 : 0) : o), dx ? 2 : wire, dy ? 2 : wire);
    }
  }
  if (cur.keys) {
    const px = x0 + cur.x * ts, py = y0 + cur.y * ts;
    g.fillStyle = '#fff8e6';
    g.fillRect(px - 1, py - 1, ts + 1, 1); g.fillRect(px - 1, py + ts - 1, ts + 1, 1); g.fillRect(px - 1, py - 1, 1, ts + 1); g.fillRect(px + ts - 1, py - 1, 1, ts + 1);
  }
  const dark = p.lit.filter((l) => !l).length;
  text(g, dark ? dark + ' TILES DARK' : p.loose ? 'A WIRE IS LOOSE' : 'ALL POWERED', 4, 171, dark || p.loose ? '#d9dcf2' : LIVE);
}

function check() {
  const bad = [];
  LEVELS.forEach((l, i) => {
    const b = parse(l);
    if (solved(b)) bad.push((i + 1) + ' starts solved');
    const s = solve(b);
    if (!s || !solved({ ...b, t: s })) bad.push((i + 1) + ' has no solution');
  });
  return { ok: !bad.length, note: bad.length ? 'solver: ' + bad.join('; ') : 'solver: all ' + LEVELS.length + ' levels can be solved' };
}

export default puzzle({
  id: 'circuit-rewire', n: 11, name: 'Circuit Rewire', district: 'NEON WARD', accent: A, ink: '#12072a',
  how: 'Click a tile to turn it. Power every tile from the core and leave no wire loose. Red tips are loose ends.',
  levels: LEVELS,
  open: (l) => { const b = parse(l); cur.x = b.core % b.w; cur.y = Math.floor(b.core / b.w); return b; },
  input, solved, draw, check,
  par: (l) => +l.split(':')[2],
  title: (g) => night(g, 320, 180, ['#0e0626', '#1a0a2c', '#2a1450', '#3b1c72'], 3)
});
