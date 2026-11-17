/*
 * city-make-metro.mjs — makes the fifteen maps of Metro Builder and writes city/games/metro-builder/data.js.
 *
 *   node tools/city-make-metro.mjs
 *
 * Each map is drawn at random from a fixed seed (so running it again gives the same maps), solved exactly, and
 * kept only if it is worth playing: every station can be reached, no two stations touch, and from map 4 on the
 * best network is shorter than the one you get by simply joining stations pair by pair — so a shared trunk or a
 * junction in open ground is needed. The budget written into a map is the fewest pieces of track that solve it.
 */
import { writeFileSync } from 'node:fs';
import { parse, solve, beside } from '../city/games/metro-builder/logic.js';

let seed = 4226;
const rnd = () => ((seed = (seed * 1103515245 + 12345) >>> 0) / 4294967296);
/* [width, height, stations, share of towers, how much shorter than pair-by-pair the best network must be] */
const PLAN = [[7, 5, 3, 0.10, 0], [7, 5, 3, 0.16, 0], [8, 5, 3, 0.18, 1], [8, 6, 4, 0.14, 1], [8, 6, 4, 0.18, 1], [9, 6, 4, 0.2, 2], [10, 6, 5, 0.15, 2], [10, 6, 5, 0.2, 2],
  [10, 7, 5, 0.2, 2], [11, 7, 5, 0.2, 3], [11, 7, 6, 0.16, 3], [11, 7, 6, 0.2, 3], [12, 7, 6, 0.2, 3], [12, 7, 7, 0.16, 3], [12, 7, 7, 0.2, 4]];

function pairwise(st) {                                                // join the stations pair by pair, nearest first
  const terms = []; st.c.forEach((ch, i) => { if (ch === 'S') terms.push(i); });
  const dist = terms.map((s) => { const d = new Array(st.c.length).fill(-1), q = [s]; d[s] = 0; for (let k = 0; k < q.length; k++) beside(st, q[k]).forEach((j) => { if (d[j] < 0 && st.c[j] !== '#') { d[j] = d[q[k]] + 1; q.push(j); } }); return d; });
  if (terms.some((t) => dist[0][t] < 0)) return -1;
  const inTree = [0]; let total = 0;
  while (inTree.length < terms.length) {
    let best = 1e9, pick = -1;
    inTree.forEach((a) => terms.forEach((t, b) => { if (!inTree.includes(b) && dist[a][t] - 1 < best) { best = dist[a][t] - 1; pick = b; } }));
    total += best; inTree.push(pick);
  }
  return total;
}

const out = [];
PLAN.forEach(([w, h, ns, towers, gap], n) => {
  for (let tries = 0; tries < 200000; tries++) {
    const c = new Array(w * h).fill('.');
    for (let i = 0; i < c.length; i++) if (rnd() < towers) c[i] = '#';
    let placed = 0, guard = 0;
    while (placed < ns && guard++ < 500) {
      const i = Math.floor(rnd() * c.length), x = i % w, y = (i - x) / w;
      if (c[i] !== '.') continue;
      if (c.some((ch, j) => ch === 'S' && Math.abs(j % w - x) + Math.abs(Math.floor(j / w) - y) < 3)) continue;
      c[i] = 'S'; placed++;
    }
    if (placed < ns) continue;
    const st = parse(w + 'x' + h + ':0:' + c.join('')), naive = pairwise(st);
    if (naive < 0) continue;
    const best = solve(st).cost;
    if (naive - best < gap || best < ns + 2 + n / 2) continue;
    out.push(w + 'x' + h + ':' + best + ':' + c.join(''));
    console.log('map ' + (n + 1) + ': ' + w + 'x' + h + ', ' + ns + ' stations, ' + best + ' pieces (pair by pair: ' + naive + ')');
    return;
  }
  throw new Error('no map found for ' + (n + 1));
});

writeFileSync(new URL('../city/games/metro-builder/data.js', import.meta.url), `/*
 * Metro Builder — the fifteen maps. Made by tools/city-make-metro.mjs (seed 4226); run it again to remake them.
 * A map is 'WxH:budget:cells', the cells row by row: '.' open ground, '#' a tower, 'S' a station. The budget is
 * the fewest pieces of track that link every station (logic.js: solve).
 */
export const LEVELS = [
${out.map((l) => "  '" + l + "'").join(',\n')}
];
`);
console.log('wrote ' + out.length + ' maps');
