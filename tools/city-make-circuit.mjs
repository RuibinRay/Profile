/*
 * city-make-circuit.mjs — makes the 20 levels of Circuit Rewire and writes city/games/circuit-rewire/data.js.
 *
 *   node tools/city-make-circuit.mjs
 *
 * Each board is a random tree of wires grown from the core (so one solution certainly exists), with every tile
 * then turned at random. The seed is fixed: running it again writes the same levels. Change SIZES or SEED to
 * get others, then run tools/city-check.mjs, whose solver must still solve every one.
 */
import { writeFileSync } from 'node:fs';
import { rnd } from '../city/kit/draw.js';
import { DIRS, turn, solved } from '../city/games/circuit-rewire/logic.js';

const SEED = 2226;
const SIZES = [[4, 4], [4, 4], [5, 4], [5, 5], [5, 5], [6, 5], [6, 5], [6, 6], [6, 6], [7, 6], [7, 6], [8, 6], [8, 6], [8, 7], [9, 7], [9, 7], [10, 7], [10, 7], [11, 7], [12, 7]];
const r = rnd(SEED);
const levels = SIZES.map(([w, h], li) => {
  for (;;) {
    const t = new Array(w * h).fill(0), core = Math.floor(h / 2) * w + Math.floor(w / 2 - (li % 2));
    const inTree = new Set([core]), edge = [core];
    while (inTree.size < w * h) {                                  // grow from a random tile already in the tree
      const i = edge[Math.floor(r() * edge.length)], x = i % w, y = (i - x) / w;
      const open = DIRS.filter(([, dx, dy]) => { const nx = x + dx, ny = y + dy; return nx >= 0 && ny >= 0 && nx < w && ny < h && !inTree.has(ny * w + nx); });
      if (!open.length) { edge.splice(edge.indexOf(i), 1); continue; }
      const [bit, dx, dy, back] = open[Math.floor(r() * open.length)], j = (y + dy) * w + x + dx;
      if (t[i] === 0 ? false : (t[i] | bit) === 15) continue;       // no four-way crosses: turning one does nothing
      t[i] |= bit; t[j] |= back; inTree.add(j); edge.push(j);
    }
    let par = 0;
    const mixed = t.map((m) => {
      const k = Math.floor(r() * 4);
      let v = m;
      for (let q = 0; q < k; q++) v = turn(v);
      let back = 0, u = v;
      while (u !== m) { u = turn(u); back++; }
      par += back;
      return v;
    });
    if (par < w * h * 0.8 || solved({ w, h, core, t: mixed })) continue;
    return w + 'x' + h + '@' + (core % w) + ',' + Math.floor(core / w) + ':' + mixed.map((m) => m.toString(16)).join('') + ':' + par;
  }
});
writeFileSync(new URL('../city/games/circuit-rewire/data.js', import.meta.url), `/*
 * Circuit Rewire — the levels, as data. Written by tools/city-make-circuit.mjs; do not edit by hand.
 * 'WxH@cx,cy:tiles:par': the tiles as the player finds them, one hex digit each (N = 1, E = 2, S = 4, W = 8),
 * the core at (cx, cy), and the number of turns the maker's own solution takes.
 */
export const LEVELS = [
${levels.map((l) => "  '" + l + "'").join(',\n')}
];
`);
console.log('wrote ' + levels.length + ' levels');
