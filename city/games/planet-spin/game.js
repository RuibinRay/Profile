/*
 * game.js — No. 2 Planet Spin (Pixel Plaza): turn the rings of a pixel planet until every strip of land runs
 * unbroken from the core to the coast.
 *
 * Built on the Game City kit: the shell (city/kit/shell.js) runs it, and the puzzle helper (city/kit/puzzle.js)
 * gives it the level list, undo, reset, the move count, stars against par and the City Pass stamp. This file
 * only adds the planet's controls and picture. The rules are logic.js, the levels data.js, the planet art.js.
 *
 * Controls: up / down pick a ring (outward / inward), left / right turn it; or drag a ring round with the mouse
 * or a finger; or the four buttons on the right. Z undo, R reset, L levels (the puzzle helper's).
 * Kept outside the level's state (so undo never sees it): which ring is picked, a drag in progress, and the
 * rings' drawn angles, which ease toward their real turns in about 120 ms.
 *
 * No DOM at the top level: node can import it, and check() solves every level.
 */
import { puzzle } from '../../kit/puzzle.js';
import { text, wrap, box } from '../../kit/draw.js';
import { SCENES } from '../../../assets/js/pixel/scenes.js?v=20261117a';
import { LEVELS } from './data.js';
import { setup, apply, solved, solve, controls } from './logic.js';
import { drawPlanet, ringAt, angleAt, PLANET } from './art.js';

const ACCENT = '#f6c443';
const pars = LEVELS.map((lv) => solve(lv, setup(lv)).length);
const ui = { sel: 1, drag: null, shown: [], wonAt: 0, clock: 0, level: -1 };

// the four buttons on the right, for touch (and mouse): pick a ring in or out, turn it either way
const BTN = [
  { id: 'out', label: 'OUT', x: 196, y: 128, w: 30, h: 18 }, { id: 'in', label: 'IN', x: 196, y: 150, w: 30, h: 18 },
  { id: 'left', label: '<', x: 238, y: 136, w: 34, h: 26 }, { id: 'right', label: '>', x: 278, y: 136, w: 34, h: 26 }
];
const on = (p, b) => p.x >= b.x && p.x < b.x + b.w && p.y >= b.y && p.y < b.y + b.h;
const wrapTurn = (a) => a - Math.floor(a + 0.5);                  // -0.5 … 0.5

function pick(level, step) {
  const hand = controls(level), k = hand.indexOf(ui.sel);
  ui.sel = hand[Math.max(0, Math.min(hand.length - 1, (k < 0 ? hand.length - 1 : k) + step))];
}

const def = puzzle({
  id: 'planet-spin', n: 2, name: 'PLANET SPIN', district: 'PIXEL PLAZA', accent: ACCENT, ink: '#0b0c2e',
  how: 'TURN THE RINGS UNTIL EVERY STRIP OF LAND RUNS UNBROKEN FROM THE CORE TO THE COAST. SOME RINGS DRAG OTHERS WITH THEM; SOME ARE LOCKED.',
  levels: LEVELS,
  par: (lv, i) => pars[i],

  open(level, i) {
    const turns = setup(level), hand = controls(level);
    ui.sel = hand[hand.length - 1]; ui.drag = null; ui.shown = turns.slice(); ui.wonAt = 0; ui.level = i;
    return { turns };
  },

  input(G, st, i) {
    const level = LEVELS[i], hand = controls(level), S = level.pattern.length;
    if (ui.level !== i) { ui.level = i; ui.shown = st.turns.slice(); }
    const turn = (d) => { apply(level, st.turns, ui.sel, d); G.sfx('turn'); return true; };
    // keys
    if (G.hit.up) { pick(level, 1); G.sfx('move'); }
    if (G.hit.down) { pick(level, -1); G.sfx('move'); }
    if (G.hit.left) return turn(-1);
    if (G.hit.right) return turn(1);
    // the buttons
    if (G.ptr.hit) {
      const b = BTN.find((k) => on(G.ptr, k));
      if (b) {
        if (b.id === 'out') { pick(level, 1); G.sfx('move'); return false; }
        if (b.id === 'in') { pick(level, -1); G.sfx('move'); return false; }
        return turn(b.id === 'left' ? -1 : 1);
      }
      // pressing a ring picks it, and starts a drag round the planet
      const r = ringAt(level, G.ptr.x, G.ptr.y);
      if (r >= 1 && hand.includes(r)) { ui.sel = r; ui.drag = { a: angleAt(G.ptr.x, G.ptr.y) }; G.sfx('move'); }
      else if (r >= 1) { G.toast('THAT RING IS LOCKED'); G.sfx('bad'); }
      else if (r === 0) { G.toast('THE CORE NEVER TURNS'); }
    }
    // a drag turns the ring one sector a tick toward the pointer; after the finger lifts, it finishes the way
    // to where it let go, so a quick flick counts every sector it crossed (one move each)
    if (ui.drag && !ui.drag.end && (G.ptr.up || !G.ptr.down)) ui.drag.end = angleAt(G.ptr.x, G.ptr.y);
    if (ui.drag) {
      const da = wrapTurn((ui.drag.end != null ? ui.drag.end : angleAt(G.ptr.x, G.ptr.y)) - ui.drag.a);
      if (Math.abs(da) >= 0.5 / S) { const d = da > 0 ? 1 : -1; ui.drag.a += d / S; return turn(d); }
      if (ui.drag.end != null) ui.drag = null;
    }
    return false;
  },

  solved: (st, i) => solved(LEVELS[i], st.turns),

  draw(g, G, st, i) {
    const level = LEVELS[i], won = solved(level, st.turns);
    ui.clock += 1 / 60;
    if (ui.level !== i || ui.shown.length !== st.turns.length) { ui.level = i; ui.shown = st.turns.slice(); }
    // the rings ease toward their real turns (unwrapped, so they always go the short way round)
    for (let r = 0; r < st.turns.length; r++) {
      const gap = st.turns[r] - ui.shown[r];
      ui.shown[r] = Math.abs(gap) < 0.02 ? st.turns[r] : ui.shown[r] + gap * (G.calm ? 0.5 : 0.34);
    }
    if (won && !ui.wonAt) ui.wonAt = ui.clock;
    if (!won) ui.wonAt = 0;
    SCENES.space(g, 320, 180, G.calm ? 0 : ui.clock);
    drawPlanet(g, level, { shown: ui.shown, sel: ui.sel, won, wonAt: ui.wonAt }, ui.clock);

    // the panel on the right: the planet's name, what is new on it, the picked ring, the buttons
    const x = 182;
    box(g, x, 18, 134, 158, 'rgba(8,9,34,.86)', '#3a3d70');
    text(g, level.name, x + 7, 24, ACCENT);
    wrap(level.say.toUpperCase(), 120).slice(0, 6).forEach((l, k) => text(g, l, x + 7, 38 + k * 9, '#fff8e6'));
    const hand = controls(level), locked = level.locked || [];
    text(g, 'RING ' + ui.sel + ' OF ' + level.rings + (locked.length ? '  LOCKED: ' + locked.join(' ') : ''), x + 7, 98, '#d9dcf2');
    const links = (level.links && level.links[ui.sel]) || [];
    text(g, links.length ? 'ALSO TURNS ' + links.map(([j, m]) => j + (m === -1 ? ' BACK' : m > 1 ? ' X' + m : '')).join(', ') : 'TURNS ON ITS OWN', x + 7, 108, '#9aa0d0');
    BTN.forEach((b) => {
      const can = b.id === 'out' ? hand.indexOf(ui.sel) < hand.length - 1 : b.id === 'in' ? hand.indexOf(ui.sel) > 0 : true;
      const hover = on(G.ptr, b) && can;
      box(g, b.x, b.y, b.w, b.h, hover ? ACCENT : '#1b1d4e', can ? ACCENT : '#3a3d70');
      text(g, b.label, b.x + b.w / 2, b.y + (b.h - 7) / 2, hover ? '#0b0c2e' : can ? '#fff8e6' : '#5a5e90', { align: 'center', scale: b.h > 20 ? 1 : 1 });
    });
    if (won) text(g, 'EVERY LAND IS WHOLE', PLANET.cx, 168, ACCENT, { align: 'center', shadow: '#04041a' });
  },

  /** The picture behind the title: a solved planet whose rings turn slowly, each its own way. */
  title(g, G) {
    const t = G.calm ? 0 : G.t / 60, level = LEVELS[10];
    SCENES.space(g, 320, 180, t);
    const shown = [0, 1, 2, 3, 4].map((r) => (r ? Math.sin(t * 0.4 + r) * 1.5 * (r % 2 ? 1 : -1) : 0));
    drawPlanet(g, level, { shown, sel: -1, won: false }, t);
  },

  /**
   * For tools/city-check.mjs: the solver plays every level through the real shell, with the keys a player
   * presses (up / down to pick the ring, left / right to turn it). Each level must start unsolved and end
   * solved at exactly its par, and the City Pass must be stamped once all fifteen are done.
   */
  check({ createCore }) {
    const { G, T } = createCore(def);
    T.step(10); T.press('ok'); T.step(1);
    const P = def._p, bad = [];
    LEVELS.forEach((lv, i) => {
      if (P.mode !== 'select') { P.mode = 'select'; }
      P.cur = i; T.press('ok'); T.step(1);
      if (P.mode !== 'level' || P.i !== i) { bad.push((i + 1) + ': would not open'); return; }
      if (solved(lv, P.st.turns)) bad.push((i + 1) + ': starts solved');
      const path = solve(lv, P.st.turns), hand = controls(lv);
      if (!path) { bad.push((i + 1) + ': no solution'); return; }
      for (const [r, d] of path) {
        for (let guard = 0; ui.sel !== r && guard < 8; guard++) { T.press(hand.indexOf(r) > hand.indexOf(ui.sel) ? 'up' : 'down'); T.step(1); }
        T.press(d > 0 ? 'right' : 'left'); T.step(1);
      }
      if (P.mode !== 'solved') bad.push((i + 1) + ': not solved after its ' + path.length + ' moves');
      else if (P.moves !== pars[i]) bad.push((i + 1) + ': took ' + P.moves + ', par ' + pars[i]);
      T.step(30);
    });
    if (G.lastError) bad.push(String(G.lastError.stack || G.lastError));
    if (!bad.length && !G.stamped) bad.push('all solved but not stamped');
    return { ok: !bad.length, note: bad.length ? bad.join('; ') : 'solver played all ' + LEVELS.length + ' levels at par (pars ' + pars.join(' ') + '); City Pass stamped' };
  }
});
export default def;
