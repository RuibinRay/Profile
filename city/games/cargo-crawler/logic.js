/*
 * Cargo Crawler — the rules and the solver. No drawing here, so tests and the level maker can run it.
 *
 * A level is 'par:rows', the rows joined by '/'. In a row: '#' wall, '.' floor, 'o' a pad, 'c' a crate, 'C' a crate
 * on a pad, '@' the crawler, 's' a switch, 'x' a crate on a switch, 'D' an airlock door. The crawler steps one
 * square at a time and pushes one crate ahead of it (never two, never into a wall). A door lets the crawler or a
 * crate in only while some crate stands on a switch. The level is solved when every pad holds a crate.
 *
 *   parse(str)        → { w, h, par, m: [the fixed things: '#', '.', 'o', 's', 'D'], crates: [squares], p: square }
 *   open(st)          → true while a crate holds a switch (the doors are open)
 *   step(st, d)       → moves the crawler: d is 0 right, 1 left, 2 down, 3 up. → 0 blocked, 1 walked, 2 pushed
 *   solved(st)        → true when every pad holds a crate
 *   solve(st, limit)  → the fewest steps that solve it, -1 if it cannot be solved, -2 if the search gave up
 */
export function parse(str) {
  const at = str.indexOf(':'), rows = str.slice(at + 1).split('/'), w = rows[0].length, h = rows.length;
  const st = { w, h, par: +str.slice(0, at), m: [], crates: [], p: 0 };
  rows.join('').split('').forEach((ch, i) => {
    st.m.push(ch === 'c' || ch === '@' ? '.' : ch === 'C' ? 'o' : ch === 'x' ? 's' : ch);
    if (ch === 'c' || ch === 'C' || ch === 'x') st.crates.push(i);
    if (ch === '@') st.p = i;
  });
  return st;
}
export const open = (st) => st.crates.some((c) => st.m[c] === 's');
export const solved = (st) => st.m.every((ch, i) => ch !== 'o' || st.crates.includes(i));
const delta = (st, d) => [1, -1, st.w, -st.w][d];

export function step(st, d) {
  const dd = delta(st, d), t = st.p + dd, isOpen = open(st);
  if (st.m[t] === '#' || (st.m[t] === 'D' && !isOpen)) return 0;
  const k = st.crates.indexOf(t);
  if (k < 0) { st.p = t; return 1; }
  const b = t + dd;
  if (st.m[b] === '#' || (st.m[b] === 'D' && !isOpen) || st.crates.includes(b)) return 0;
  st.crates[k] = b; st.p = t;
  return 2;
}

export function solve(st0, limit = 400000) {
  const pads = st0.m.filter((ch) => ch === 'o').length, spare = st0.crates.length > pads;
  const corner = st0.m.map((ch, i) => ch !== '#' && ch !== 'o' && (st0.m[i - 1] === '#' || st0.m[i + 1] === '#') && (st0.m[i - st0.w] === '#' || st0.m[i + st0.w] === '#'));
  const key = (p, cr) => p + ':' + cr.slice().sort((a, b) => a - b).join(',');
  const seen = new Set([key(st0.p, st0.crates)]);
  let layer = [{ p: st0.p, crates: st0.crates }], steps = 0;
  const st = { w: st0.w, h: st0.h, m: st0.m, crates: [], p: 0 };
  if (solved(st0)) return 0;
  while (layer.length) {
    const next = []; steps++;
    for (const s of layer) {
      for (let d = 0; d < 4; d++) {
        st.p = s.p; st.crates = s.crates.slice();
        const r = step(st, d);
        if (!r) continue;
        if (r === 2 && !spare && corner[st.p + delta(st, d)]) continue;     // a crate in a corner is stuck for good
        const k = key(st.p, st.crates);
        if (seen.has(k)) continue;
        seen.add(k);
        if (r === 2 && solved(st)) return steps;
        next.push({ p: st.p, crates: st.crates });
      }
    }
    if (seen.size > limit) return -2;
    layer = next;
  }
  return -1;
}
