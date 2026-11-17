/*
 * King's Table — Game City No. 37 (North Harbour, board game).
 *
 * What it does: tafl, the old Norse board game, on a 9 × 9 board against the computer. You choose a side — the
 * king's men, who must bring the king to a corner, or the attackers, who must trap him — and one of three levels.
 * Pick a piece, then a square: the squares it can reach are marked. Undo takes back your last move.
 * What it leaves alone: everything outside its canvas; it saves only the side and level you chose and the levels
 * you have won at. A win at any level stamps the City Pass.
 * To turn its effects off: there is nothing that moves by itself except the blinking cursor.
 * The rules and the computer player are in logic.js. check() plays them for tools/city-check.mjs.
 */
import { text, textW, wrap, box, rnd } from '../../kit/draw.js';
import { start, moves, movesFrom, play, undo, think, sideOf, isCorner, ATT, DEF, KING, THRONE, LIMIT } from './logic.js';

const A = '#7fe8c0', INK = '#04140f', C = 17, BX = 8, BY = 15;
const SIDES = ['ATTACKERS', "KING'S MEN"], LEVELS = ['EASY', 'FAIR', 'HARD'];
const S = { mode: 'setup', b: start(), turn: 1, me: 2, level: 1, sel: -1, cur: 40, hist: [], reach: [], last: -1, wait: 0, win: -1, ply: 0, row: 0, endT: 0 };
const inside = (p, x, y, w, h) => p.x >= x && p.x < x + w && p.y >= y && p.y < y + h;

function begin(G) {
  S.mode = 'play'; S.b = start(); S.turn = 1; S.sel = -1; S.cur = S.me === 2 ? 40 : 4; S.hist = []; S.reach = []; S.last = -1; S.wait = 0; S.win = -1; S.ply = 0;
  G.save.data.side = S.me; G.save.data.level = S.level; G.commit(); G.sfx('go');
}
function make(G, m) {
  const done = play(S.b, m);
  S.hist.push({ m, done, side: S.turn }); S.last = m; S.ply++; S.sel = -1; S.reach = [];
  G.sfx(done.caps.length ? 'pick' : 'move');
  S.turn = 3 - S.turn;
  if (done.win) S.win = done.win;
  else if (!moves(S.b, S.turn).length) S.win = 3 - S.turn;
  else if (S.ply >= LIMIT) S.win = 0;
  if (S.win >= 0) { S.endT = 0; G.sfx(S.win === S.me ? 'win' : S.win ? 'lose' : 'blip'); }
}
function back(G) {                                                    // take back the computer's reply and your own move
  if (S.win >= 0 || S.turn !== S.me || !S.hist.some((h) => h.side === S.me)) return;
  let h;
  do { h = S.hist.pop(); undo(S.b, h.m, h.done); S.ply--; } while (h.side !== S.me);
  S.last = S.hist.length ? S.hist[S.hist.length - 1].m : -1; S.sel = -1; S.reach = []; G.sfx('undo');
}
function choose(G, i) {
  if (S.sel >= 0 && S.reach.includes(i)) { make(G, S.sel * 81 + i); return; }
  if (S.b[i] && sideOf(S.b[i]) === S.me) { S.sel = i; S.reach = movesFrom(S.b, i).map((m) => m % 81); G.sfx('blip'); }
  else { S.sel = -1; S.reach = []; }
}

const def = {
  id: 'kings-table', n: 37, name: 'King’s Table', district: 'NORTH HARBOUR', accent: A, ink: INK,
  how: 'Tafl, the old Norse board game. The king must reach a corner; the attackers must trap him. Trap a piece between two of yours to take it.',
  best: (save) => { const n = Object.keys((save.data && save.data.won) || {}).length; return n ? 'WON AT ' + n + ' OF 3 LEVELS' : ''; },
  start(G) { S.mode = 'setup'; S.row = 0; S.me = G.save.data.side || 2; S.level = G.save.data.level || 1; S.b = start(); S.last = -1; S.sel = -1; S.reach = []; S.win = -1; },
  tick(G) {
    if (S.mode === 'setup') {
      G.hud = '';
      if (G.hit.up || G.hit.down) { S.row = (S.row + (G.hit.down ? 1 : 2)) % 3; G.sfx('move'); }
      const d = G.hit.left ? -1 : G.hit.right ? 1 : 0;
      if (d && S.row === 0) { S.me = 3 - S.me; G.sfx('move'); }
      if (d && S.row === 1) { S.level = (S.level - 1 + d + 3) % 3 + 1; G.sfx('move'); }
      if (G.ptr.hit) {
        for (let k = 0; k < 2; k++) if (inside(G.ptr, 60 + k * 104, 54, 96, 15)) { S.me = k + 1; S.row = 0; G.sfx('move'); }
        for (let k = 0; k < 3; k++) if (inside(G.ptr, 60 + k * 69, 92, 62, 15)) { S.level = k + 1; S.row = 1; G.sfx('move'); }
        if (inside(G.ptr, 110, 124, 100, 18)) { begin(G); return; }
      }
      if (G.hit.ok) { if (S.row < 2) S.row = 2; else begin(G); }
      return;
    }
    G.hud = (S.me === 2 ? 'King’s men' : 'Attackers') + ' · ' + LEVELS[S.level - 1].toLowerCase() + ' · move ' + (Math.floor(S.ply / 2) + 1);
    if (S.win >= 0) {
      if (++S.endT > 80 || ((G.hit.ok || G.ptr.hit) && S.endT > 20)) {
        const won = S.win === S.me, king = S.win === 2;
        if (won) { (G.save.data.won = G.save.data.won || {})[S.level] = true; G.commit(); }
        G.finish({
          title: S.win === 0 ? 'A DRAW' : king ? 'THE KING ESCAPES' : 'THE KING IS TAKEN', won, stamp: won,
          lines: [S.win === 0 ? 'NIGHT FALLS ON THE HALL WITH NO WINNER.' : won ? 'YOU WON AS THE ' + SIDES[S.me - 1] + ', ' + LEVELS[S.level - 1] + '.' : 'THE ' + SIDES[2 - S.me] + ' WIN THIS ONE.', 'IN ' + Math.ceil(S.ply / 2) + ' MOVES.']
        });
      }
      return;
    }
    if (G.hit.reset || (G.ptr.hit && inside(G.ptr, 246, 150, 68, 13))) { def.start(G); G.sfx('blip'); return; }
    if (S.turn !== S.me) {                                              // the computer: a short pause, then its move
      if (++S.wait < 16) return;
      S.wait = 0;
      const m = think(S.b, S.turn, S.level, G.rnd);
      if (m < 0) { S.win = S.me; S.endT = 0; } else make(G, m);
      return;
    }
    if (G.hit.undo || (G.ptr.hit && inside(G.ptr, 172, 150, 68, 13))) { back(G); return; }
    const cx = S.cur % 9, cy = (S.cur - cx) / 9;
    if (G.hit.left && cx > 0) S.cur--;
    if (G.hit.right && cx < 8) S.cur++;
    if (G.hit.up && cy > 0) S.cur -= 9;
    if (G.hit.down && cy < 8) S.cur += 9;
    if (G.hit.ok) choose(G, S.cur);
    if (G.ptr.hit && inside(G.ptr, BX, BY, C * 9, C * 9)) { S.cur = Math.floor((G.ptr.y - BY) / C) * 9 + Math.floor((G.ptr.x - BX) / C); choose(G, S.cur); }
  },
  draw(g, G) {
    hall(g);
    if (S.mode === 'setup') { setup(g, G); return; }
    board(g, G);
    panel(g, G);
  },
  title: (g) => { hall(g); board(g, null); g.fillStyle = 'rgba(8,9,34,.6)'; g.fillRect(0, 0, 320, 180); },
  check,
  _k: S
};
export default def;

function hall(g) {
  g.fillStyle = '#1c1410'; g.fillRect(0, 0, 320, 180);
  for (let y = 0; y < 180; y += 12) { g.fillStyle = y % 24 ? '#241a14' : '#201712'; g.fillRect(0, y, 320, 11); }
  const r = rnd(37);
  for (let i = 0; i < 60; i++) { g.fillStyle = '#2c2018'; g.fillRect(Math.floor(r() * 320), Math.floor(r() * 180), 3 + Math.floor(r() * 6), 1); }
}
function knot(g, x, y, c) { g.fillStyle = c; g.fillRect(x + 4, y + 4, 9, 1); g.fillRect(x + 4, y + 12, 9, 1); g.fillRect(x + 4, y + 4, 1, 9); g.fillRect(x + 12, y + 4, 1, 9); g.fillRect(x + 7, y + 7, 3, 3); g.fillRect(x + 2, y + 8, 2, 1); g.fillRect(x + 13, y + 8, 2, 1); g.fillRect(x + 8, y + 2, 1, 2); g.fillRect(x + 8, y + 13, 1, 2); }
function piece(g, x, y, p) {
  const [main, lite, dark] = p === ATT ? ['#27304a', '#46557c', '#10141f'] : p === DEF ? ['#e6ecf8', '#ffffff', '#9aa6c0'] : ['#f6c443', '#fff0a8', '#a87a18'];
  g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(x + 4, y + 13, 10, 2);
  g.fillStyle = dark; g.fillRect(x + 4, y + 3, 9, 11); g.fillRect(x + 3, y + 5, 11, 7);
  g.fillStyle = main; g.fillRect(x + 4, y + 3, 9, 9); g.fillRect(x + 3, y + 5, 11, 5);
  g.fillStyle = lite; g.fillRect(x + 5, y + 4, 4, 1); g.fillRect(x + 4, y + 5, 1, 3);
  if (p === ATT) { g.fillStyle = '#ff5c7a'; g.fillRect(x + 7, y + 7, 3, 1); g.fillRect(x + 8, y + 6, 1, 3); }
  if (p === DEF) { g.fillStyle = '#3b7de0'; g.fillRect(x + 7, y + 6, 3, 3); }
  if (p === KING) { g.fillStyle = '#7a3a10'; g.fillRect(x + 5, y + 8, 7, 2); g.fillRect(x + 5, y + 6, 1, 2); g.fillRect(x + 8, y + 5, 1, 3); g.fillRect(x + 11, y + 6, 1, 2); }
}
function board(g, G) {
  box(g, BX - 4, BY - 4, C * 9 + 8, C * 9 + 8, '#3a2618', '#7a5632');
  for (let i = 0; i < 81; i++) {
    const x = BX + (i % 9) * C, y = BY + Math.floor(i / 9) * C;
    g.fillStyle = ((i % 9) + Math.floor(i / 9)) % 2 ? '#8a6238' : '#96703f'; g.fillRect(x, y, C - 1, C - 1);
    if (isCorner(i) || i === THRONE) { g.fillStyle = '#5f4129'; g.fillRect(x, y, C - 1, C - 1); knot(g, x, y, i === THRONE ? '#f6c443' : A); }
  }
  if (G && S.last >= 0) [S.last % 81, Math.floor(S.last / 81)].forEach((i) => { const x = BX + (i % 9) * C, y = BY + Math.floor(i / 9) * C; g.fillStyle = 'rgba(255,248,230,.28)'; g.fillRect(x, y, C - 1, C - 1); });
  for (let i = 0; i < 81; i++) if (S.b[i]) piece(g, BX + (i % 9) * C - 1, BY + Math.floor(i / 9) * C - 1, S.b[i]);
  if (!G) return;
  S.reach.forEach((i) => { const x = BX + (i % 9) * C, y = BY + Math.floor(i / 9) * C; g.fillStyle = A; g.fillRect(x + 6, y + 6, 4, 4); g.fillStyle = INK; g.fillRect(x + 7, y + 7, 2, 2); });
  const ring = (i, c) => { const x = BX + (i % 9) * C - 1, y = BY + Math.floor(i / 9) * C - 1; g.fillStyle = c; g.fillRect(x, y, C + 1, 1); g.fillRect(x, y + C, C + 1, 1); g.fillRect(x, y, 1, C + 1); g.fillRect(x + C, y, 1, C + 1); };
  if (S.sel >= 0) ring(S.sel, '#fff8e6');
  if (S.turn === S.me && S.win < 0 && (G.calm || Math.floor(G.t / 20) % 2)) ring(S.cur, A);
}
function panel(g, G) {
  const x = 172, mine = S.turn === S.me;
  let att = 0, dfn = 0; S.b.forEach((p) => { if (p === ATT) att++; else if (p === DEF) dfn++; });
  box(g, x, 11, 142, 132, 'rgba(12,8,6,.82)', '#7a5632');
  text(g, 'YOU: ' + SIDES[S.me - 1], x + 6, 17, A);
  text(g, S.win >= 0 ? (S.win === 0 ? 'A DRAW' : S.win === 2 ? 'THE KING ESCAPES!' : 'THE KING IS TAKEN!') : mine ? 'YOUR MOVE' : 'THE COMPUTER THINKS', x + 6, 29, S.win >= 0 || mine ? '#fff8e6' : '#b9a58a');
  piece(g, x + 4, 40, ATT); text(g, att + ' OF 16', x + 24, 46, '#d9dcf2');
  piece(g, x + 4, 57, DEF); text(g, dfn + ' OF 8', x + 24, 63, '#d9dcf2');
  piece(g, x + 76, 57, KING); text(g, 'KING', x + 96, 63, '#f6c443');
  const tip = S.me === 2 ? 'BRING THE KING TO A CORNER. TRAP AN ATTACKER BETWEEN TWO OF YOURS TO TAKE IT.' : 'SURROUND THE KING ON EVERY SIDE. TRAP A DEFENDER BETWEEN TWO OF YOURS TO TAKE IT.';
  wrap(tip, 130).forEach((l, i) => text(g, l, x + 6, 80 + i * 9, '#b9a58a'));
  text(g, 'MOVE ' + (Math.floor(S.ply / 2) + 1) + ' OF ' + LIMIT / 2, x + 6, 131, '#7a6a58');
  [['UNDO', 172, S.hist.some((h) => h.side === S.me) && mine && S.win < 0], ['NEW GAME', 246, S.win < 0]].forEach(([l, bx, on]) => {
    const hot = on && inside(G.ptr, bx, 150, 68, 13);
    box(g, bx, 150, 68, 13, hot ? A : '#2c2018', on ? A : '#5f4a36'); text(g, l, bx + 34, 153, hot ? INK : on ? '#fff8e6' : '#7a6a58', { align: 'center' });
  });
}
function setup(g, G) {
  g.fillStyle = 'rgba(12,8,6,.55)'; g.fillRect(0, 0, 320, 180);
  text(g, 'KING’S TABLE', 160, 14, A, { align: 'center', scale: 2 });
  const opt = (label, x, y, w, on, row) => { box(g, x, y, w, 15, on ? A : '#2c2018', S.row === row ? '#fff8e6' : on ? A : '#7a5632'); text(g, label, x + w / 2, y + 4, on ? INK : '#fff8e6', { align: 'center' }); };
  text(g, 'YOUR SIDE', 160, 42, '#d9dcf2', { align: 'center' });
  SIDES.forEach((l, k) => opt(l, 60 + k * 104, 54, 96, S.me === k + 1, 0));
  text(g, S.me === 2 ? 'BRING THE KING TO ANY CORNER.' : 'TRAP THE KING. YOU MOVE FIRST.', 160, 72, '#b9a58a', { align: 'center' });
  text(g, 'THE COMPUTER PLAYS', 160, 82, '#d9dcf2', { align: 'center' });
  LEVELS.forEach((l, k) => opt(l + (G.save.data.won && G.save.data.won[k + 1] ? ' *' : ''), 60 + k * 69, 92, 62, S.level === k + 1, 1));
  box(g, 110, 124, 100, 18, S.row === 2 ? A : '#2c2018', S.row === 2 ? '#fff8e6' : A); text(g, 'START', 160, 130, S.row === 2 ? INK : '#fff8e6', { align: 'center' });
  text(g, 'ARROWS AND SPACE, OR TAP.', 160, 154, '#b9a58a', { align: 'center' });
  text(g, '* A LEVEL YOU HAVE WON AT', 160, 164, '#7a6a58', { align: 'center' });
}

/**
 * The check: the computer at each level against a player who moves at random (it must always win, as either side),
 * and one whole game through the real controls, tapping the board, to see the page's wiring holds.
 */
function check({ createCore }) {
  let r = 99; const rand = () => ((r = (r * 1103515245 + 12345) >>> 0) / 4294967296);
  const problems = [], notes = [];
  for (const level of [1, 2, 3]) for (const ai of [1, 2]) {
    let wins = 0, plies = 0; const games = level === 3 ? 2 : 4;
    for (let k = 0; k < games; k++) {
      const b = start(); let side = 1, win = -1, ply = 0;
      for (; ply < LIMIT && win < 0; ply++) {
        const list = moves(b, side);
        const m = !list.length ? -1 : side === ai ? think(b, side, level, rand) : list[Math.floor(rand() * list.length)];
        if (m < 0) { win = 3 - side; break; }
        const done = play(b, m); if (done.win) win = done.win;
        side = 3 - side;
      }
      if (win === ai) wins++; plies += ply;
    }
    if (wins < games) problems.push(LEVELS[level - 1] + ' as ' + SIDES[ai - 1] + ' won only ' + wins + ' of ' + games + ' against random moves');
    else notes.push(LEVELS[level - 1][0] + (ai === 1 ? 'a' : 'k') + ' ' + Math.round(plies / games));
  }
  const { G, T } = createCore(def, { seed: 5 });
  T.step(10); T.press('ok'); T.step(2); T.press('ok'); T.step(1); T.press('ok'); T.step(2);       // title, then START
  if (S.mode !== 'play') problems.push('the setup screen did not start a game');
  let guard = 0;
  while (G.state === 'play' && guard++ < 400) {
    if (S.win >= 0) { T.step(90); continue; }
    if (S.turn !== S.me) { T.step(20); continue; }
    const list = moves(S.b, S.me), m = list[Math.floor(rand() * list.length)], from = Math.floor(m / 81), to = m % 81;
    const before = S.ply;
    T.tap(BX + (from % 9) * C + 8, BY + Math.floor(from / 9) * C + 8); T.step(2);
    T.tap(BX + (to % 9) * C + 8, BY + Math.floor(to / 9) * C + 8); T.step(2);
    if (S.ply === before) { problems.push('a tapped move was not made'); break; }
  }
  if (G.state === 'play') problems.push('a game through the controls never ended');
  if (G.lastError) problems.push(String(G.lastError));
  return { ok: !problems.length, note: problems.length ? problems.join('; ') : 'the computer beat random moves in every game (average plies: ' + notes.join(', ') + '); a game through the controls ended in ' + S.ply + ' plies' };
}
