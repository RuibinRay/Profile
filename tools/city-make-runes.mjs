/*
 * city-make-runes.mjs — makes the 12 grids of Rune Square and writes city/games/rune-square/data.js.
 *
 *   node tools/city-make-runes.mjs
 *
 * Each grid starts from a full random solution; runes are then taken away one at a time, in random order, for as
 * long as the grid still has exactly one solution and more runes than its target. The seed is fixed, so running
 * it again writes the same grids. tools/city-check.mjs checks that every grid has one solution only.
 */
import { writeFileSync } from 'node:fs';
import { rnd } from '../city/kit/draw.js';
import { count } from '../city/games/rune-square/logic.js';

const r = rnd(793);
const shuffle = (a) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
//             size, runes left at the start
const PLAN = [[4, 8], [4, 7], [4, 6], [4, 5], [4, 4], [6, 20], [6, 18], [6, 16], [6, 14], [6, 13], [6, 12], [6, 11]];
const levels = PLAN.map(([n, target]) => {
  let best = null;
  for (let attempt = 0; attempt < 60; attempt++) {
    const v = count(n, new Array(n * n).fill(0), 1, shuffle).first;
    let left = n * n;
    for (const i of shuffle(v.map((_, k) => k))) {
      if (left <= target) break;
      const keep = v[i];
      v[i] = 0;
      if (count(n, v, 2).found === 1) left--; else v[i] = keep;
    }
    if (!best || left < best.left) best = { left, v: v.slice() };
    if (left <= target) break;
  }
  return n + ':' + best.v.join('');
});
writeFileSync(new URL('../city/games/rune-square/data.js', import.meta.url), `/*
 * Rune Square — the grids, as data. Written by tools/city-make-runes.mjs; do not edit by hand.
 * 'n:squares': the size (4 or 6), then one digit a square, row by row: 1..n is a rune carved from the start,
 * 0 an empty square. Each grid has exactly one solution.
 */
export const LEVELS = [
${levels.map((l) => "  '" + l + "'").join(',\n')}
];

/* The six runes, 7 × 9 each, and the colour each is carved in. */
export const RUNES = [
  { name: 'fe', col: '#ffcf6b', art: ['.#...#.', '.#..#..', '.#.#..#', '.##..#.', '.#..#..', '.#.#...', '.##....', '.#.....', '.#.....'] },
  { name: 'ur', col: '#7fe8c0', art: ['.#.....', '.##....', '.#.#...', '.#..#..', '.#...#.', '.#...#.', '.#...#.', '.#...#.', '.#...#.'] },
  { name: 'thorn', col: '#ff8a8a', art: ['.#.....', '.#.....', '.##....', '.#.#...', '.#..#..', '.#.#...', '.##....', '.#.....', '.#.....'] },
  { name: 'tyr', col: '#8ab8ff', art: ['...#...', '..###..', '.#.#.#.', '#..#..#', '...#...', '...#...', '...#...', '...#...', '...#...'] },
  { name: 'elk', col: '#e2a0ff', art: ['#..#..#', '#..#..#', '.#.#.#.', '..###..', '...#...', '...#...', '...#...', '...#...', '...#...'] },
  { name: 'ing', col: '#fff8e6', art: ['.......', '...#...', '..#.#..', '.#...#.', '#.....#', '.#...#.', '..#.#..', '...#...', '.......'] }
];
`);
console.log(levels.join('\n'));
