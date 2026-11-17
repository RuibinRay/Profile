/*
 * Metro Builder — the rules and the solver. No drawing here, so tests and the level maker can run it.
 *
 * A level is a string 'WxH:budget:cells', the cells row by row: '.' open ground, '#' a tower (no track there),
 * 'S' a station. Track is laid on open ground, one piece to a square, and joins the squares beside it (not the
 * diagonals). A level is solved when every station is linked to every other through track (stations standing side
 * by side are linked already) and no more than `budget` pieces are down.
 *
 *   parse(str)     → { w, h, budget, c: [cells], t: [0 | 1 for each square: track laid] }
 *   used(st)       → pieces of track down          linked(st) → for each square, true if joined to the first station
 *   solved(st)     → true when the level is done
 *   solve(st)      → { cost, cells }: the fewest pieces that link every station, and one way of laying them
 *                    (an exact search over every group of stations — the Steiner tree of the map)
 */
export function parse(str) {
  const [size, budget, cells] = str.split(':'), [w, h] = size.split('x').map(Number);
  return { w, h, budget: +budget, c: cells.split(''), t: new Array(w * h).fill(0) };
}
export const used = (st) => st.t.reduce((n, v) => n + v, 0);

export function beside(st, i) {
  const x = i % st.w, out = [];
  if (x > 0) out.push(i - 1);
  if (x < st.w - 1) out.push(i + 1);
  if (i >= st.w) out.push(i - st.w);
  if (i < st.w * (st.h - 1)) out.push(i + st.w);
  return out;
}
export function linked(st) {
  const on = new Array(st.c.length).fill(false), first = st.c.indexOf('S'), todo = [first];
  if (first < 0) return on;
  on[first] = true;
  while (todo.length) beside(st, todo.pop()).forEach((j) => { if (!on[j] && (st.c[j] === 'S' || st.t[j])) { on[j] = true; todo.push(j); } });
  return on;
}
export function solved(st) {
  if (used(st) > st.budget) return false;
  const on = linked(st);
  return st.c.every((ch, i) => ch !== 'S' || on[i]);
}

export function solve(st) {
  const n = st.c.length, terms = [], INF = 1e9;
  st.c.forEach((ch, i) => { if (ch === 'S') terms.push(i); });
  const full = (1 << terms.length) - 1, cost = (i) => (st.c[i] === 'S' ? 0 : 1);
  const dp = [], from = [];
  for (let m = 0; m <= full; m++) { dp.push(new Array(n).fill(INF)); from.push(new Array(n).fill(null)); }
  terms.forEach((v, k) => { dp[1 << k][v] = 0; });
  for (let m = 1; m <= full; m++) {
    const d = dp[m], f = from[m];
    for (let sub = (m - 1) & m; sub > 0; sub = (sub - 1) & m) {       // two smaller trees that meet at v
      if (sub < (m ^ sub)) continue;
      const a = dp[sub], b = dp[m ^ sub];
      for (let v = 0; v < n; v++) { const s = a[v] + b[v] - cost(v); if (s < d[v]) { d[v] = s; f[v] = [sub, -1]; } }
    }
    const done = new Array(n).fill(false);                             // then grow the tree a square at a time
    for (;;) {
      let v = -1;
      for (let i = 0; i < n; i++) if (!done[i] && d[i] < INF && (v < 0 || d[i] < d[v])) v = i;
      if (v < 0) break;
      done[v] = true;
      beside(st, v).forEach((u) => { if (st.c[u] !== '#' && d[v] + cost(u) < d[u]) { d[u] = d[v] + cost(u); f[u] = [0, v]; } });
    }
  }
  const cells = new Set();
  const trace = (m, v) => {
    if (st.c[v] !== 'S') cells.add(v);
    const f = from[m][v];
    if (!f) return;
    if (f[1] >= 0) trace(m, f[1]); else { trace(f[0], v); trace(m ^ f[0], v); }
  };
  if (dp[full][terms[0]] < INF) trace(full, terms[0]);
  return { cost: dp[full][terms[0]], cells: [...cells] };
}
