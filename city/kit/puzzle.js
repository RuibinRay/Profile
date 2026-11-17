/*
 * puzzle.js — what every puzzle in Game City shares: a level select, unlimited undo, instant reset, a move
 * count, the best result for each level, and the City Pass stamp when every level is solved.
 *
 *   export default puzzle({ id, n, name, district, accent, ink, how,      as for any game (shell.js)
 *     levels,                 the list of levels, as data (strings or small objects)
 *     open(level, i)          → the level's state: a plain object that survives JSON (the undo stack copies it)
 *     input(G, st, i)         called every tick while a level is played; change st and return true when a move
 *                             was made (that is what undo steps back over). Keep anything passing — a drag half
 *                             done, an animation — outside st.
 *     solved(st, i)           → true when the level is done
 *     draw(g, G, st, i)       paint the level below the top strip (y ≥ 14)
 *     par(level, i)           optional: the move count that earns three stars
 *     label(level, i)         optional: a name for the level, shown in the strip
 *     check()                 optional: the solver run by tools/city-check.mjs })
 *
 * Controls it owns: Z or Backspace undo, R reset (itself undoable), L the level list, and the three small
 * buttons at the top right for touch. Saved under city:<id> as data.done = { levelIndex: fewest moves }.
 * It leaves the level's rules and picture entirely to the game.
 */
import { text, textW, box, night } from './draw.js';

const BTN = [['UNDO', 'undo'], ['RESET', 'reset'], ['LEVELS', 'levels']];
const inside = (p, x, y, w, h) => p.x >= x && p.x < x + w && p.y >= y && p.y < y + h;

export function stars(moves, par) { return !par ? 0 : moves <= par ? 3 : moves <= Math.ceil(par * 1.5) ? 2 : 1; }

export function puzzle(spec) {
  const N = spec.levels.length, cols = N > 15 ? 5 : N > 8 ? 5 : 4, rows = Math.ceil(N / cols);
  const cw = Math.floor(296 / cols), ch = Math.min(26, Math.floor(130 / rows));
  const P = { mode: 'select', i: 0, st: null, undo: [], moves: 0, cur: 0, t: 0 };
  const done = (G) => (G.save.data.done = G.save.data.done || {});
  const count = (G) => Object.keys(done(G)).length;
  const parOf = (i) => (spec.par ? spec.par(spec.levels[i], i) : 0);

  function open(G, i) {
    P.i = i; P.cur = i; P.st = spec.open(spec.levels[i], i); P.undo = []; P.moves = 0; P.mode = 'level'; P.t = 0;
    G.sfx('go');
  }
  function buttons(G) {                       // the strip's buttons; returns the control a tap asked for
    let x = 318, asked = null;
    for (let k = BTN.length - 1; k >= 0; k--) {
      const w = textW(BTN[k][0]) + 6; x -= w;
      if (G.ptr.hit && inside(G.ptr, x, 0, w, 13)) asked = BTN[k][1];
      x -= 2;
    }
    if (G.ptr.hit && G.ptr.y < 13) G.ptr.hit = false;      // a tap on the strip never reaches the level
    return asked;
  }

  return {
    ...spec,
    best: (save) => { const n = Object.keys((save.data && save.data.done) || {}).length; return n ? n + ' OF ' + N + ' SOLVED' : ''; },
    start(G) { P.mode = 'select'; P.t = 0; const d = done(G); let i = 0; while (i < N - 1 && d[i] != null) i++; P.cur = i; },
    tick(G) {
      P.t++;
      if (P.mode === 'select') {
        G.hud = count(G) + ' of ' + N + ' solved';
        if (G.hit.left) P.cur = (P.cur + N - 1) % N;
        if (G.hit.right) P.cur = (P.cur + 1) % N;
        if (G.hit.up && P.cur - cols >= 0) P.cur -= cols;
        if (G.hit.down && P.cur + cols < N) P.cur += cols;
        if (G.hit.left || G.hit.right || G.hit.up || G.hit.down) G.sfx('move');
        for (let i = 0; i < N; i++) {
          const x = 12 + (i % cols) * cw, y = 34 + Math.floor(i / cols) * ch;
          if (G.ptr.hit && inside(G.ptr, x, y, cw - 3, ch - 3)) { open(G, i); return; }
        }
        if (G.hit.ok) open(G, P.cur);
        return;
      }
      const asked = buttons(G);
      if (G.hit.levels || asked === 'levels') { P.mode = 'select'; P.t = 0; G.sfx('blip'); return; }
      if (P.mode === 'solved') {
        if ((G.hit.ok || G.ptr.hit) && P.t > 25) {
          const d = done(G);
          let next = -1;
          for (let k = 1; k <= N; k++) { const j = (P.i + k) % N; if (d[j] == null) { next = j; break; } }
          if (next < 0) { P.mode = 'select'; P.t = 0; P.cur = P.i; } else open(G, next);
        }
        return;
      }
      G.hud = 'Level ' + (P.i + 1) + ' of ' + N + ' · ' + P.moves + ' moves';
      if (G.hit.undo || asked === 'undo') {
        if (P.undo.length) { const u = P.undo.pop(); P.st = JSON.parse(u.st); P.moves = u.moves; G.sfx('undo'); }
        return;
      }
      if (G.hit.reset || asked === 'reset') {
        if (P.undo.length) { P.undo.push({ st: JSON.stringify(P.st), moves: P.moves }); P.st = spec.open(spec.levels[P.i], P.i); P.moves = 0; G.sfx('undo'); }
        return;
      }
      const before = JSON.stringify(P.st);
      if (spec.input(G, P.st, P.i)) {
        P.undo.push({ st: before, moves: P.moves }); P.moves++;
        if (spec.solved(P.st, P.i)) {
          const d = done(G), was = d[P.i];
          if (was == null || P.moves < was) d[P.i] = P.moves;
          G.commit(); G.sfx('win');
          P.mode = 'solved'; P.t = 0;
          if (count(G) === N) G.stamp();
        }
      }
    },
    draw(g, G) {
      if (P.mode === 'select') {
        if (spec.title) spec.title(g, G); else night(g, W_, H_);
        g.fillStyle = 'rgba(8,9,34,.82)'; g.fillRect(0, 0, 320, 180);
        text(g, 'CHOOSE A LEVEL', 160, 10, spec.accent, { align: 'center', scale: 2 });
        const d = done(G);
        for (let i = 0; i < N; i++) {
          const x = 12 + (i % cols) * cw, y = 34 + Math.floor(i / cols) * ch, on = i === P.cur, got = d[i] != null;
          box(g, x, y, cw - 3, ch - 3, got ? '#1d2a4a' : '#12133a', on ? spec.accent : got ? '#6f86c9' : '#4a4d80');
          if (on) { g.fillStyle = spec.accent; g.fillRect(x + 1, y + ch - 6, cw - 5, 2); }
          text(g, String(i + 1), x + 5, y + 4, got ? '#fff8e6' : '#d9dcf2');
          if (got) {
            const s = stars(d[i], parOf(i));
            text(g, s ? '*'.repeat(s) : 'OK', x + cw - 7, y + 4, spec.accent, { align: 'right' });
            if (ch >= 22) text(g, d[i] + ' MOVES', x + 5, y + 13, '#9aa0d0');
          }
        }
        text(g, 'ARROWS AND SPACE, OR TAP.  ESC PAUSES.', 160, 168, '#d9dcf2', { align: 'center' });
        return;
      }
      g.fillStyle = '#0b0c2e'; g.fillRect(0, 0, 320, 180);
      spec.draw(g, G, P.st, P.i);
      g.fillStyle = '#0b0c2e'; g.fillRect(0, 0, 320, 13);
      g.fillStyle = spec.accent; g.fillRect(0, 13, 320, 1);
      const name = spec.label ? spec.label(spec.levels[P.i], P.i) : '';
      text(g, (P.i + 1) + '/' + N + (name ? ' ' + name : '') + '  MOVES ' + P.moves + (parOf(P.i) ? ' PAR ' + parOf(P.i) : ''), 3, 3, '#fff8e6');
      let x = 318;
      for (let k = BTN.length - 1; k >= 0; k--) {
        const w = textW(BTN[k][0]) + 6; x -= w;
        const dim = k < 2 && !P.undo.length;
        box(g, x, 1, w, 11, inside(G.ptr, x, 0, w, 13) && !dim ? spec.accent : '#1b1d4e', dim ? '#3a3d70' : spec.accent);
        text(g, BTN[k][0], x + 3, 3, dim ? '#5a5e90' : inside(G.ptr, x, 0, w, 13) ? (spec.ink || '#0b0c2e') : '#fff8e6');
        x -= 2;
      }
      if (P.mode === 'solved') {
        const s = stars(P.moves, parOf(P.i)), all = count(G) === N;
        box(g, 50, 70, 220, 44, '#0b0c2e', spec.accent);
        text(g, all ? 'ALL ' + N + ' SOLVED!' : 'SOLVED', 160, 76, spec.accent, { align: 'center', scale: 2 });
        text(g, 'IN ' + P.moves + ' MOVES' + (s ? '  ' + '*'.repeat(s) : ''), 160, 94, '#fff8e6', { align: 'center' });
        text(g, all ? 'SPACE OR TAP: THE LEVEL LIST' : 'SPACE OR TAP: NEXT LEVEL', 160, 104, '#d9dcf2', { align: 'center' });
      }
    },
    /** for tests: the helper's own state */
    _p: P
  };
}
const W_ = 320, H_ = 180;
