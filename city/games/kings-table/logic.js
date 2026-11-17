/*
 * King's Table — the rules of the board game and the computer player. No drawing here, so tests can run it.
 *
 * The game is tafl, the old Norse board game, on a 9 × 9 board. A board is an array of 81 squares (index = y * 9 + x)
 * holding EMPTY, ATT (an attacker), DEF (a defender) or KING. Sides are 1 (attackers, who move first) and 2 (the
 * king's men). The rules used here:
 *   - every piece moves like a rook: any number of empty squares in a straight line;
 *   - only the king may stand on the throne (the centre) or a corner, and nothing else may pass over the throne;
 *   - a piece is taken when the piece that just moved traps it between itself and another of its side, or a
 *     corner, or the empty throne; moving in between two enemies is safe; the king may help to take;
 *   - the king is taken only when every square beside him is an attacker (or the empty throne): four of them, or
 *     three at the edge of the board;
 *   - the king's men win when the king reaches a corner; the attackers win when he is taken; a side with no move
 *     loses; after LIMIT moves with no winner the game is a draw.
 *
 *   start()                 → a new board          moves(b, side) → [from * 81 + to, ...]
 *   play(b, m)              makes the move on b; → { caps: [index, piece, ...], win: 0 | 1 | 2 }
 *   undo(b, m, done)        takes it back          think(b, side, depth, rnd) → the computer's move (or -1)
 */
export const N = 9, EMPTY = 0, ATT = 1, DEF = 2, KING = 3, THRONE = 40, LIMIT = 160;
const CORNER = [0, 8, 72, 80], DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];
const LAYOUT = ['...AAA...', '....A....', '....D....', 'A...D...A', 'AADDKDDAA', 'A...D...A', '....D....', '....A....', '...AAA...'];
export const isCorner = (i) => i === 0 || i === 8 || i === 72 || i === 80;
export const sideOf = (p) => (p === ATT ? 1 : p ? 2 : 0);

export function start() {
  const b = new Array(81).fill(EMPTY);
  LAYOUT.forEach((row, y) => row.split('').forEach((c, x) => { b[y * 9 + x] = c === 'A' ? ATT : c === 'D' ? DEF : c === 'K' ? KING : EMPTY; }));
  return b;
}

export function movesFrom(b, from, out = []) {
  const p = b[from], x0 = from % 9, y0 = (from - x0) / 9;
  for (let d = 0; d < 4; d++) {
    let x = x0 + DIRS[d][0], y = y0 + DIRS[d][1];
    while (x >= 0 && x < 9 && y >= 0 && y < 9) {
      const i = y * 9 + x;
      if (b[i]) break;
      if (p !== KING && i === THRONE) break;
      if (p === KING || !isCorner(i)) out.push(from * 81 + i);
      x += DIRS[d][0]; y += DIRS[d][1];
    }
  }
  return out;
}
export function moves(b, side) {
  const out = [];
  for (let i = 0; i < 81; i++) if (b[i] && sideOf(b[i]) === side) movesFrom(b, i, out);
  return out;
}

function kingTaken(b, k) {
  const x = k % 9, y = (k - x) / 9;
  for (let d = 0; d < 4; d++) {
    const nx = x + DIRS[d][0], ny = y + DIRS[d][1];
    if (nx < 0 || nx > 8 || ny < 0 || ny > 8) continue;
    const i = ny * 9 + nx;
    if (b[i] !== ATT && !(i === THRONE && !b[i])) return false;
  }
  return true;
}

export function play(b, m) {
  const to = m % 81, from = (m - to) / 81, p = b[from], side = sideOf(p), caps = [];
  b[from] = EMPTY; b[to] = p;
  let win = 0;
  if (p === KING && isCorner(to)) win = 2;
  const x = to % 9, y = (to - x) / 9;
  for (let d = 0; d < 4 && !win; d++) {
    const ax = x + DIRS[d][0], ay = y + DIRS[d][1];
    if (ax < 0 || ax > 8 || ay < 0 || ay > 8) continue;
    const a = ay * 9 + ax, q = b[a];
    if (!q || sideOf(q) === side) continue;
    if (q === KING) { if (kingTaken(b, a)) { caps.push(a, KING); b[a] = EMPTY; win = 1; } continue; }
    const bx = ax + DIRS[d][0], by = ay + DIRS[d][1];
    if (bx < 0 || bx > 8 || by < 0 || by > 8) continue;
    const c = by * 9 + bx;
    if ((b[c] && sideOf(b[c]) === side) || (!b[c] && (isCorner(c) || c === THRONE))) { caps.push(a, q); b[a] = EMPTY; }
  }
  return { caps, win };
}
export function undo(b, m, done) {
  const to = m % 81, from = (m - to) / 81;
  b[from] = b[to]; b[to] = EMPTY;
  for (let i = 0; i < done.caps.length; i += 2) b[done.caps[i]] = done.caps[i + 1];
}

/* How good the board is for the king's men (the attackers want it low). */
function value(b) {
  let k = -1, att = 0, def = 0, guard = 0;
  for (let i = 0; i < 81; i++) { const p = b[i]; if (p === ATT) att++; else if (p === DEF) def++; else if (p === KING) k = i; }
  if (k < 0) return -9000;
  const x = k % 9, y = (k - x) / 9;
  let v = def * 16 - att * 10, open = 0, near = 0;
  for (let d = 0; d < 4; d++) {
    let nx = x + DIRS[d][0], ny = y + DIRS[d][1];
    if (nx >= 0 && nx < 9 && ny >= 0 && ny < 9 && b[ny * 9 + nx] === ATT) near++;
    while (nx >= 0 && nx < 9 && ny >= 0 && ny < 9 && !b[ny * 9 + nx]) { nx += DIRS[d][0]; ny += DIRS[d][1]; }
    const ex = nx - DIRS[d][0], ey = ny - DIRS[d][1];
    if (nx < 0 || nx > 8 || ny < 0 || ny > 8) { if (isCorner(ey * 9 + ex)) v += 420; else open++; }
  }
  v += open * 22 - near * 28;
  v -= (Math.min(x, 8 - x) + Math.min(y, 8 - y)) * 5;
  for (const c of [1, 9, 10, 7, 17, 16, 63, 73, 64, 71, 79, 70]) if (b[c] === ATT) guard++;
  return v - guard * 7;
}

let nodes = 0;
function search(b, side, depth, alpha, beta) {
  nodes++;
  const list = moves(b, side);
  if (!list.length) return -8000 - depth;                              // nothing to move: this side loses
  if (depth === 0) return side === 2 ? value(b) : -value(b);
  let best = -1e9;
  for (let i = 0; i < list.length; i++) {
    const m = list[i], done = play(b, m);
    const s = done.win ? 8000 + depth : -search(b, 3 - side, depth - 1, -beta, -alpha);
    undo(b, m, done);
    if (s > best) best = s;
    if (s > alpha) alpha = s;
    if (alpha >= beta) break;
  }
  return best;
}

/** The computer's move for `side`, looking `depth` moves ahead. rnd breaks ties (and nothing else). */
export function think(b, side, depth, rnd = Math.random) {
  const list = moves(b, side);
  if (!list.length) return -1;
  nodes = 0;
  let scored = list.map((m) => ({ m, s: 0 }));
  for (let d = 1; d <= depth; d++) {                                   // each pass orders the moves for the next
    let alpha = -1e9;
    for (const it of scored) {
      const done = play(b, it.m);
      it.s = done.win ? 8000 + d : -search(b, 3 - side, d - 1, -1e9, -(alpha - 1));
      undo(b, it.m, done);
      if (it.s > alpha) alpha = it.s;
    }
    scored.sort((p, q) => q.s - p.s);
    if (scored[0].s >= 8000 || nodes > 400000) break;
  }
  const top = scored.filter((it) => it.s >= scored[0].s - (depth === 1 ? 6 : 0));
  return top[Math.floor(rnd() * top.length)].m;
}
