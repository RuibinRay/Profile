/*
 * Rune Square — the rules, with no drawing: used by the game, by its solver and by the level maker.
 *
 * A grid is n × n (4 or 6) with boxes bw wide and bh tall (2 × 2, or 3 × 2). Runes are the numbers 1..n; 0 is
 * an empty square. A level string is 'n:squares', one digit a square, row by row: the runes carved from the start.
 */
export const shape = (n) => (n === 4 ? { bw: 2, bh: 2 } : { bw: 3, bh: 2 });
export function parse(str) {
  const [a, cells] = str.split(':'), n = +a;
  if ((n !== 4 && n !== 6) || cells.length !== n * n) throw new Error('bad level: ' + str);
  const v = cells.split('').map(Number);
  return { n, ...shape(n), v, given: v.map((x) => x > 0), notes: v.map(() => 0) };
}
/** The squares that see square i: its row, its column and its box. */
const peersOf = new Map();
export function peers(n, i) {
  const key = n * 100 + i;
  if (peersOf.has(key)) return peersOf.get(key);
  const { bw, bh } = shape(n), x = i % n, y = (i - x) / n, out = new Set();
  for (let k = 0; k < n; k++) { out.add(y * n + k); out.add(k * n + x); }
  const bx = x - (x % bw), by = y - (y % bh);
  for (let dy = 0; dy < bh; dy++) for (let dx = 0; dx < bw; dx++) out.add((by + dy) * n + bx + dx);
  out.delete(i);
  const list = [...out];
  peersOf.set(key, list);
  return list;
}
/** For each square: does its rune clash with one it can see? */
export function clashes(st) { return st.v.map((x, i) => x > 0 && peers(st.n, i).some((j) => st.v[j] === x)); }
export const solved = (st) => st.v.every((x) => x > 0) && !clashes(st).some(Boolean);

/** How many ways the grid can be finished, counting no further than `limit`. order: a function giving the runes to try. */
export function count(n, v, limit = 2, order) {
  const g = v.slice();
  let found = 0, first = null;
  (function fill() {
    let best = -1, bestOpts = null;
    for (let i = 0; i < g.length; i++) {
      if (g[i]) continue;
      const used = new Set(peers(n, i).map((j) => g[j])), opts = [];
      for (let x = 1; x <= n; x++) if (!used.has(x)) opts.push(x);
      if (!bestOpts || opts.length < bestOpts.length) { best = i; bestOpts = opts; if (!opts.length) break; }
    }
    if (best < 0) { found++; if (!first) first = g.slice(); return; }
    for (const x of (order ? order(bestOpts) : bestOpts)) { g[best] = x; fill(); if (found >= limit) break; }
    g[best] = 0;
  })();
  return { found, first };
}
