/*
 * Cargo Crawler — Game City No. 24 (Moon Dock, box-pushing puzzle).
 *
 * What it does: a small crawler pushes supply crates around a storage bay. It can push one crate at a time and
 * cannot pull. Every pad must end up holding a crate. From level 7 there are airlock doors, which let the crawler
 * and crates through only while a crate stands on a switch. Twenty levels, no timer, unlimited undo; the level
 * list, undo, reset and the save are the puzzle kit's (city/kit/puzzle.js).
 * What it leaves alone: everything outside its canvas; it saves only which levels are solved, and in how many steps.
 * To turn its effects off: the only things that move by themselves are the door lamps (still with reduced motion).
 * The rules and the solver are in logic.js, the levels in data.js (made by tools/city-make-cargo.mjs).
 */
import { puzzle } from '../../kit/puzzle.js';
import { text, night, rnd } from '../../kit/draw.js';
import { LEVELS } from './data.js';
import { parse, step, open, solved, solve } from './logic.js';

const A = '#ff9d2e', INK = '#160c02';
const NAMES = ['right', 'left', 'down', 'up'];
const me = { face: 2, hold: 0, dir: -1 };

function geo(st) {
  const ts = Math.min(18, Math.floor(304 / st.w), Math.floor(150 / st.h));
  return { ts, x0: Math.round((320 - ts * st.w) / 2), y0: 16 + Math.round((152 - ts * st.h) / 2) };
}
function input(G, st) {
  const { ts, x0, y0 } = geo(st);
  let d = NAMES.findIndex((n) => G.hit[n]);
  const held = NAMES.findIndex((n) => G.held[n]);                      // a held key walks on
  if (d >= 0) { me.dir = d; me.hold = 0; }
  else if (held >= 0 && held === me.dir) { if (++me.hold > 14 && me.hold % 6 === 0) d = held; }
  else if (G.ptr.down && G.ptr.y >= 14) {                                             // a tap, or a held finger, on the side to go to
    const cx = x0 + (st.p % st.w) * ts + ts / 2, cy = y0 + Math.floor(st.p / st.w) * ts + ts / 2, dx = G.ptr.x - cx, dy = G.ptr.y - cy;
    const want = Math.abs(dx) < ts / 2 && Math.abs(dy) < ts / 2 ? -1 : Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 0 : 1) : dy > 0 ? 2 : 3;
    if (G.ptr.hit) { me.hold = 0; d = want; } else if (++me.hold > 14 && me.hold % 6 === 0) d = want;
  } else { me.hold = 0; me.dir = -1; }
  if (d < 0) return false;
  me.face = d;
  const r = step(st, d);
  G.sfx(r === 2 ? 'turn' : r ? 'move' : 'bad');
  return r > 0;
}

function crate(g, x, y, ts, on, sw) {
  const s = ts - 4;
  g.fillStyle = '#3a2408'; g.fillRect(x + 2, y + 2, s, s);
  g.fillStyle = on ? '#ffc46a' : '#c98a3a'; g.fillRect(x + 3, y + 3, s - 2, s - 2);
  g.fillStyle = on ? '#fff0c8' : '#e6b06a'; g.fillRect(x + 3, y + 3, s - 2, 1); g.fillRect(x + 3, y + 3, 1, s - 2);
  g.fillStyle = '#7a4a14'; g.fillRect(x + 3, y + Math.floor(ts / 2) - 1, s - 2, 1); g.fillRect(x + Math.floor(ts / 2) - 1, y + 3, 1, s - 2);
  if (on || sw) { g.fillStyle = on ? '#5cf08a' : '#58e6ff'; g.fillRect(x + ts - 7, y + 4, 2, 2); }
}
function crawler(g, x, y, ts, face) {
  const s = ts - 6, c = Math.floor(ts / 2);
  g.fillStyle = '#22232e';
  if (face < 2) { g.fillRect(x + 2, y + 2, ts - 5, 3); g.fillRect(x + 2, y + ts - 6, ts - 5, 3); } else { g.fillRect(x + 2, y + 2, 3, ts - 5); g.fillRect(x + ts - 6, y + 2, 3, ts - 5); }
  g.fillStyle = '#d9dcf2'; g.fillRect(x + 3, y + 3, s, s);
  g.fillStyle = '#7a7e92'; g.fillRect(x + 3, y + 3 + s - 1, s, 1); g.fillRect(x + 3 + s - 1, y + 3, 1, s);
  g.fillStyle = A; g.fillRect(x + c - 2, y + c - 2, 3, 3);
  g.fillStyle = '#58e6ff';                                             // the lamp shows which way it faces
  const [lx, ly] = [[ts - 6, c - 1], [3, c - 1], [c - 1, ts - 6], [c - 1, 3]][face]; g.fillRect(x + lx, y + ly, 2, 2);
}
function draw(g, G, st) {
  night(g, 320, 180, ['#0c0d16', '#10111c', '#15161f', '#1a1b26'], 24);
  const { ts, x0, y0 } = geo(st), isOpen = open(st), r = rnd(st.w * 17 + st.h);
  for (let i = 0; i < st.m.length; i++) {
    const x = i % st.w, y = (i - x) / st.w, px = x0 + x * ts, py = y0 + y * ts, ch = st.m[i], k = r();
    if (ch === '#') {
      g.fillStyle = '#5d6072'; g.fillRect(px, py, ts, ts);
      g.fillStyle = '#7a7e92'; g.fillRect(px, py, ts, 2); g.fillRect(px, py, 1, ts);
      g.fillStyle = '#3d4052'; g.fillRect(px, py + ts - 2, ts, 2); g.fillRect(px + ts - 1, py, 1, ts);
      if (k < 0.25) { g.fillStyle = '#ffd38a'; g.fillRect(px + 4, py + Math.floor(ts / 2) - 1, ts - 8, 2); }
      continue;
    }
    g.fillStyle = (x + y) % 2 ? '#2a2c3a' : '#2e3040'; g.fillRect(px, py, ts, ts);
    if (k < 0.3) { g.fillStyle = '#353848'; g.fillRect(px + 2 + Math.floor(k * 30) % (ts - 5), py + 3 + Math.floor(k * 70) % (ts - 6), 2, 1); }
    if (ch === 'o') { g.fillStyle = A; g.fillRect(px + 2, py + 2, ts - 4, 1); g.fillRect(px + 2, py + ts - 3, ts - 4, 1); g.fillRect(px + 2, py + 2, 1, ts - 4); g.fillRect(px + ts - 3, py + 2, 1, ts - 4); g.fillRect(px + Math.floor(ts / 2) - 1, py + Math.floor(ts / 2) - 1, 2, 2); }
    if (ch === 's') { g.fillStyle = '#12303a'; g.fillRect(px + 3, py + 3, ts - 6, ts - 6); g.fillStyle = isOpen ? '#5cf08a' : '#58e6ff'; g.fillRect(px + 4, py + 4, ts - 8, ts - 8); g.fillStyle = '#12303a'; g.fillRect(px + 6, py + 6, ts - 12, ts - 12); }
    if (ch === 'D') {
      g.fillStyle = '#15161f'; g.fillRect(px, py, ts, ts);
      if (isOpen) { g.fillStyle = '#5cf08a'; g.fillRect(px, py, ts, 2); g.fillRect(px, py + ts - 2, ts, 2); }
      else { for (let b = 1; b < ts; b += 4) { g.fillStyle = (Math.floor(b / 4) % 2) ? '#ffd38a' : '#ff5c7a'; g.fillRect(px + b, py + 1, 2, ts - 2); } g.fillStyle = (G.calm || Math.floor(G.t / 25) % 2) ? '#ff5c7a' : '#5a1a10'; g.fillRect(px + Math.floor(ts / 2) - 1, py + Math.floor(ts / 2) - 1, 3, 3); }
    }
  }
  st.crates.forEach((c) => crate(g, x0 + (c % st.w) * ts, y0 + Math.floor(c / st.w) * ts, ts, st.m[c] === 'o', st.m[c] === 's'));
  crawler(g, x0 + (st.p % st.w) * ts, y0 + Math.floor(st.p / st.w) * ts, ts, me.face);
  const pads = st.m.filter((ch) => ch === 'o').length, got = st.crates.filter((c) => st.m[c] === 'o').length;
  text(g, got + ' OF ' + pads + ' PADS FILLED', 4, 171, got === pads ? '#5cf08a' : '#d9dcf2');
  if (st.m.includes('D')) text(g, isOpen ? 'AIRLOCK OPEN' : 'AIRLOCK SHUT', 316, 171, isOpen ? '#5cf08a' : '#ff5c7a', { align: 'right' });
}

function check() {
  const bad = [];
  LEVELS.forEach((l, i) => {
    const st = parse(l);
    if (solved(st)) bad.push((i + 1) + ' starts solved');
    const n = solve(st);
    if (n < 0) bad.push((i + 1) + (n === -1 ? ' cannot be solved' : ': the search gave up'));
    else if (n !== st.par) bad.push((i + 1) + ': par is ' + st.par + ' but the fewest steps are ' + n);
    if (st.m.includes('D') && solve(parse(l.replace('D', '#'))) !== -1) bad.push((i + 1) + ' can be solved without its airlock');
  });
  return { ok: !bad.length, note: bad.length ? 'solver: ' + bad.join('; ') : 'solver: all ' + LEVELS.length + ' levels can be solved, each par is the fewest steps, and every airlock is needed' };
}

export default puzzle({
  id: 'cargo-crawler', n: 24, name: 'Cargo Crawler', district: 'MOON DOCK', accent: A, ink: INK,
  how: 'Push every crate onto a pad. The crawler pushes one crate at a time and cannot pull. An airlock opens only while a crate holds the switch.',
  levels: LEVELS,
  open: (l) => { me.face = 2; me.hold = 0; me.dir = -1; return parse(l); },
  input, solved, draw, check,
  par: (l) => +l.split(':')[0],
  title: (g) => night(g, 320, 180, ['#0c0d16', '#15161f', '#22232e', '#3d4052'], 24)
});
