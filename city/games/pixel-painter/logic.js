/*
 * Pixel Painter — the rules and the solver. No drawing here, so tests can run it.
 *
 * A picture is rows of '#' (painted) and '.' (bare). Its clues are, for every row and column, the lengths of the
 * runs of painted squares in order: '.##.#' gives [2, 1]. A board is { w, h, g }, g holding for each square
 * 0 (untouched), 1 (painted) or 2 (crossed out: the player's own note that it is bare).
 *
 *   runs(cells)          → the clue of one line of 0/1 values ([] for an empty line)
 *   clues(rows)          → { w, h, rows: [clue], cols: [clue] } of a picture
 *   solved(board, c)     → true when the painted squares give exactly the clues c
 *   lineDone(board, c, row, k) → true when row (or column) k already matches its clue
 *   solve(c)             → the picture as an array of 0/1, worked out one line at a time with no guessing, or
 *                          null when the clues cannot be finished that way (such a picture is not used)
 */
export function runs(cells) {
  const out = []; let n = 0;
  for (const v of cells) { if (v === 1) n++; else if (n) { out.push(n); n = 0; } }
  if (n) out.push(n);
  return out;
}
export function clues(rows) {
  const h = rows.length, w = rows[0].length, g = rows.map((r) => r.split('').map((ch) => (ch === '#' ? 1 : 0)));
  return { w, h, rows: g.map(runs), cols: Array.from({ length: w }, (_, x) => runs(g.map((r) => r[x]))) };
}
const line = (b, row, k) => (row ? b.g.slice(k * b.w, k * b.w + b.w) : Array.from({ length: b.h }, (_, y) => b.g[y * b.w + k]));
const same = (a, b) => a.length === b.length && a.every((v, i) => v === b[i]);
export const lineDone = (b, c, row, k) => same(runs(line(b, row, k)), row ? c.rows[k] : c.cols[k]);
export function solved(b, c) {
  for (let y = 0; y < b.h; y++) if (!lineDone(b, c, true, y)) return false;
  for (let x = 0; x < b.w; x++) if (!lineDone(b, c, false, x)) return false;
  return true;
}

/* One line: known[i] is -1 (unknown), 0 or 1. Returns what every fitting arrangement agrees on, or null if none fits. */
function settle(known, clue) {
  const n = known.length, can = [new Array(n).fill(false), new Array(n).fill(false)], cur = new Array(n).fill(0);
  let any = false;
  const rest = clue.map((_, i) => clue.slice(i).reduce((s, v) => s + v + 1, -1));
  (function place(ci, at) {
    if (ci === clue.length) {
      for (let i = at; i < n; i++) if (known[i] === 1) return;
      any = true;
      for (let i = 0; i < n; i++) can[i < at ? cur[i] : 0][i] = true;
      return;
    }
    for (let s = at; s + rest[ci] <= n; s++) {
      if (s > at && known[s - 1] === 1) break;                          // a painted square would be left out
      let ok = true;
      for (let i = s; i < s + clue[ci]; i++) if (known[i] === 0) { ok = false; break; }
      const end = s + clue[ci];
      if (ok && end < n && known[end] === 1) ok = false;
      if (!ok) continue;
      for (let i = at; i < s; i++) cur[i] = 0;
      for (let i = s; i < end; i++) cur[i] = 1;
      if (end < n) cur[end] = 0;
      place(ci + 1, Math.min(n, end + 1));
    }
  })(0, 0);
  if (!any) return null;
  return known.map((v, i) => (can[0][i] && can[1][i] ? -1 : can[1][i] ? 1 : 0));
}
export function solve(c) {
  const g = new Array(c.w * c.h).fill(-1);
  for (let changed = true; changed;) {
    changed = false;
    for (let k = 0; k < c.h + c.w; k++) {
      const row = k < c.h, j = row ? k : k - c.h, idx = row ? Array.from({ length: c.w }, (_, x) => j * c.w + x) : Array.from({ length: c.h }, (_, y) => y * c.w + j);
      const out = settle(idx.map((i) => g[i]), row ? c.rows[j] : c.cols[j]);
      if (!out) return null;
      out.forEach((v, n) => { if (v !== g[idx[n]]) { g[idx[n]] = v; changed = true; } });
    }
  }
  return g.includes(-1) ? null : g;
}
