/*
 * Circuit Rewire — the rules, with no drawing: used by the game, by its solver and by the level maker.
 *
 * A board is w × h tiles. A tile is four bits, one for each side its wire reaches: N = 1, E = 2, S = 4, W = 8.
 * A level string is 'WxH@cx,cy:tiles:par' — the tiles as one hex digit each, row by row, as the player finds
 * them; (cx, cy) is the core; par is the number of turns the maker needed.
 */
export const N = 1, E = 2, S = 4, WEST = 8;
export const DIRS = [[N, 0, -1, S], [E, 1, 0, WEST], [S, 0, 1, N], [WEST, -1, 0, E]];
export const turn = (m) => ((m << 1) & 15) | (m >> 3);              // a quarter turn clockwise

export function parse(str) {
  const m = /^(\d+)x(\d+)@(\d+),(\d+):([0-9a-f]+):(\d+)$/.exec(str);
  if (!m) throw new Error('bad level: ' + str);
  const w = +m[1], h = +m[2];
  if (m[5].length !== w * h) throw new Error('level has the wrong number of tiles: ' + str);
  return { w, h, core: +m[4] * w + +m[3], t: m[5].split('').map((c) => parseInt(c, 16)), par: +m[6] };
}
/** Which tiles the core powers, and whether any wire end is loose. */
export function power(b) {
  const lit = new Array(b.w * b.h).fill(false), todo = [b.core];
  let loose = false;
  lit[b.core] = true;
  for (let i = 0; i < b.w * b.h; i++) {
    const x = i % b.w, y = (i - x) / b.w;
    for (const [bit, dx, dy, back] of DIRS) {
      if (!(b.t[i] & bit)) continue;
      const nx = x + dx, ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= b.w || ny >= b.h || !(b.t[ny * b.w + nx] & back)) loose = true;
    }
  }
  while (todo.length) {
    const i = todo.pop(), x = i % b.w, y = (i - x) / b.w;
    for (const [bit, dx, dy, back] of DIRS) {
      if (!(b.t[i] & bit)) continue;
      const nx = x + dx, ny = y + dy, j = ny * b.w + nx;
      if (nx < 0 || ny < 0 || nx >= b.w || ny >= b.h || !(b.t[j] & back) || lit[j]) continue;
      lit[j] = true; todo.push(j);
    }
  }
  return { lit, loose, all: lit.every(Boolean) };
}
export const solved = (b) => { const p = power(b); return p.all && !p.loose; };

/** Find turns that solve the board: returns the solved tiles, or null. Row by row, each tile must agree with the ones above and to its left. */
export function solve(b) {
  const t = b.t.slice(), n = b.w * b.h;
  function place(i) {
    if (i === n) return solved({ ...b, t });
    const x = i % b.w, y = (i - x) / b.w, tried = new Set();
    let m = b.t[i];
    for (let k = 0; k < 4; k++, m = turn(m)) {
      if (tried.has(m)) continue;
      tried.add(m);
      if ((y === 0 && m & N) || (x === 0 && m & WEST) || (y === b.h - 1 && m & S) || (x === b.w - 1 && m & E)) continue;
      if (y > 0 && !!(t[i - b.w] & S) !== !!(m & N)) continue;
      if (x > 0 && !!(t[i - 1] & E) !== !!(m & WEST)) continue;
      t[i] = m;
      if (place(i + 1)) return true;
    }
    return false;
  }
  return place(0) ? t : null;
}
