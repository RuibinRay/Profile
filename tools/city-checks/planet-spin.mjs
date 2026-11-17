/*
 * planet-spin.mjs — checks every Planet Spin level before it ships (node tools/city-checks/planet-spin.mjs).
 *
 * For each level: the pattern uses only known lands, the scramble only turns rings a player can turn, the
 * planet does not start solved, the solver finds a solution, and replaying that solution with the game's own
 * rules really solves it. Prints the par (fewest moves) of each level; exits with an error if any check fails.
 */
import { LEVELS } from '../../city/games/planet-spin/data.js';
import { setup, solve, solved, apply, controls } from '../../city/games/planet-spin/logic.js';

let bad = 0;
const fail = (i, msg) => { bad++; console.log('  FAIL level ' + (i + 1) + ': ' + msg); };
LEVELS.forEach((lv, i) => {
  if (!/^[VMNES]+$/.test(lv.pattern)) fail(i, 'unknown land in pattern ' + lv.pattern);
  const hand = controls(lv);
  lv.scramble.forEach(([r]) => { if (!hand.includes(r)) fail(i, 'scramble turns ring ' + r + ', which a player cannot turn'); });
  const start = setup(lv);
  if (solved(lv, start)) fail(i, 'starts solved');
  const path = solve(lv, start);
  if (!path) { fail(i, 'no solution'); return; }
  const t = start.slice();
  path.forEach(([r, d]) => apply(lv, t, r, d));
  if (!solved(lv, t)) fail(i, 'the solution does not solve it');
  console.log(String(i + 1).padStart(2) + '  ' + lv.name.padEnd(16) + ' rings ' + lv.rings + '  sectors ' + lv.pattern.length + '  par ' + path.length);
});
console.log(bad ? bad + ' problem(s)' : 'all ' + LEVELS.length + ' levels solvable');
process.exit(bad ? 1 : 0);
