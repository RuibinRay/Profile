/*
 * city-make-cargo.mjs — makes the twenty levels of Cargo Crawler and writes city/games/cargo-crawler/data.js.
 *
 *   node tools/city-make-cargo.mjs
 *
 * Each level is drawn at random from a fixed seed (so running it again gives the same levels): the finished level
 * first, then played backwards at random so that it can certainly be solved. It is then solved by a full search, and kept only if its shortest solution is long enough for its place in the list (or, failing that
 * within half a minute, the longest one found). A level with an
 * airlock is kept only if it cannot be solved with the door shut, so the switch matters. The number written at
 * the front of a level is the fewest steps that solve it.
 */
import { writeFileSync } from 'node:fs';
import { parse, solve, step } from '../city/games/cargo-crawler/logic.js';

let seed = 2424;
const rnd = () => ((seed = (Math.imul(seed, 1103515245) + 12345) >>> 0) / 4294967296);
const pick = (n) => Math.floor(rnd() * n);
/* [inner width, inner height, pads, airlock?, share of walls, fewest steps wanted, most] */
const PLAN = [[5, 4, 1, 0, 0.08, 6, 14], [5, 4, 1, 0, 0.12, 10, 20], [6, 4, 2, 0, 0.08, 14, 26], [6, 5, 2, 0, 0.12, 18, 32], [6, 5, 2, 0, 0.15, 24, 40], [7, 5, 2, 0, 0.15, 30, 50],
  [7, 4, 1, 1, 0.05, 14, 30], [7, 5, 1, 1, 0.08, 20, 40], [8, 5, 1, 1, 0.1, 22, 50], [7, 5, 3, 0, 0.1, 28, 55], [8, 5, 2, 1, 0.06, 26, 60], [8, 5, 3, 0, 0.12, 32, 64],
  [8, 6, 2, 1, 0.08, 30, 70], [8, 6, 3, 0, 0.14, 36, 75], [9, 5, 2, 1, 0.1, 32, 80], [9, 6, 3, 0, 0.14, 40, 85], [9, 6, 2, 1, 0.12, 36, 90], [9, 6, 3, 0, 0.16, 46, 100],
  [9, 6, 3, 1, 0.06, 38, 110], [9, 6, 3, 1, 0.08, 44, 130]];

const out = [];
PLAN.forEach(([iw, ih, pads, lock, walls, lo, hi], n) => {
  const w = iw + 2, h = ih + 2, t0 = Date.now();
  let best = null;
  for (let tries = 0; tries < 60000 && Date.now() - t0 < 30000; tries++) {
    const m = new Array(w * h).fill('.');
    for (let i = 0; i < m.length; i++) { const x = i % w, y = (i - x) / w; if (!x || !y || x === w - 1 || y === h - 1 || rnd() < walls) m[i] = '#'; }
    let near = null;                                                   // with an airlock: the squares on the crawler's side
    if (lock) {
      const wx = 3 + pick(iw - 4), dy = 1 + pick(ih);
      for (let y = 1; y < h - 1; y++) m[y * w + wx] = y === dy ? 'D' : '#';
      m[dy * w + wx - 1] = '.'; m[dy * w + wx + 1] = '.';
      near = (i) => i % w < wx;
    }
    const free = () => { for (let k = 0; k < 200; k++) { const i = pick(m.length); if (m[i] === '.') return i; } return -1; };
    const put = (ch, ok) => { for (let k = 0; k < 200; k++) { const i = free(); if (i >= 0 && (!ok || ok(i))) { m[i] = ch; return i; } } return -1; };
    // the finished level first: a crate on every pad (and one on the switch), the crawler anywhere
    const crates = [];
    for (let k = 0; k < pads; k++) crates.push(put('o', lock ? (i) => !near(i) || k > 0 : null));
    if (lock) crates.push(put('s', near));
    const p0 = put('@', null);
    if (crates.includes(-1) || p0 < 0) continue;
    m[p0] = '.';
    // then play it backwards at random, pulling crates off their pads, so the level can certainly be solved
    const st = { w, h, m, crates, p: p0 }, dd = [1, -1, w, -w];
    const back = (d, pull) => {
      const from = st.p - dd[d], k = pull ? st.crates.indexOf(st.p + dd[d]) : -1;
      if (m[from] === '#' || st.crates.includes(from) || (pull && k < 0)) return false;
      const prev = { w, h, m, crates: st.crates.slice(), p: from };
      if (pull) prev.crates[k] = st.p;
      const test = { w, h, m, crates: prev.crates.slice(), p: from };
      if (step(test, d) !== (pull ? 2 : 1) || test.p !== st.p || test.crates.some((c, j) => c !== st.crates[j])) return false;
      st.crates = prev.crates; st.p = from;
      return true;
    };
    let last = 0;
    for (let k = 0; k < 400 + n * 60; k++) { const d = rnd() < 0.6 ? last : pick(4); last = d; if (!(rnd() < 0.7 && back(d, true))) back(d, false); }
    if (lock && !near(st.p)) continue;
    const cells = m.slice(); st.crates.forEach((c) => { cells[c] = cells[c] === 'o' ? 'C' : cells[c] === 's' ? 'x' : 'c'; }); cells[st.p] = '@';
    if (cells[st.p] !== '@' || m[st.p] !== '.') continue;
    const rows = []; for (let y = 0; y < h; y++) rows.push(cells.slice(y * w, y * w + w).join(''));
    const str = rows.join('/'), steps = solve(parse('0:' + str), 120000);
    if (steps < 4 || steps > hi || (best && steps <= best.steps)) continue;
    if (lock && solve(parse('0:' + str.replace('D', '#')), 150000 + n * 20000) !== -1) continue;
    best = { steps, str, rows, tries };
    if (steps >= lo) break;
  }
  if (!best) throw new Error('no level found for ' + (n + 1));
  out.push(best.steps + ':' + best.str);
  console.log('level ' + (n + 1) + ': ' + best.steps + ' steps (wanted ' + lo + '), try ' + (best.tries + 1) + ', ' + ((Date.now() - t0) / 1000).toFixed(1) + ' s\n  ' + best.rows.join('\n  '));
});

writeFileSync(new URL('../city/games/cargo-crawler/data.js', import.meta.url), `/*
 * Cargo Crawler — the twenty levels. Made by tools/city-make-cargo.mjs (seed 2424); run it again to remake them.
 * A level is 'par:rows', the rows joined by '/': '#' wall, '.' floor, 'o' pad, 'c' crate, '@' the crawler,
 * 's' switch, 'D' airlock door. par is the fewest steps that solve it (logic.js: solve).
 */
export const LEVELS = [
${out.map((l) => "  '" + l + "'").join(',\n')}
];
`);
console.log('wrote ' + out.length + ' levels');
