/*
 * Soft Landing — Game City No. 21 (Moon Dock, arcade).
 *
 * What it does: ten landing pads on the Moon, one after another, with three landers. Turn with left and right,
 * fire the engine with up (or Space); with a mouse or a finger, hold anywhere and the lander turns its nose toward
 * the point and fires. Land slowly, upright and with both feet on the pad; anything else is a crash, and the
 * screen says why. Each landing scores its base, the fuel left, how near the middle and how soft. A crash costs a
 * lander and the pad is tried again; landing all ten stamps the City Pass.
 * What it leaves alone: everything outside its canvas; it saves only its best score (city:soft-landing).
 * To turn its effects off: the shake follows the visitor's reduced-motion setting; sound has the bar's switch.
 * The rules are logic.js (deterministic), the numbers and pads data.js. check() lets the autopilot fly a whole run.
 */
import { text, wrap, box, rnd } from '../../kit/draw.js';
import { TUNE, PADS } from './data.js';
import { ground, groundAt, windAt, launch, step, points, autopilot } from './logic.js';

const ACCENT = '#ff9d2e', GOOD = '#7fe8c0', BAD = '#ff7a4a', PAPER = '#fff8e6', DIM = '#9aa0d0';
const D = Math.PI / 180;
const GROUNDS = PADS.map(ground);
let S = null;

/* ---------- the run ---------- */
function start(G) {
  S = { t: 0, i: 0, landers: TUNE.landers, score: 0, landed: 0, bits: [], log: [] };
  begin(0);
}
function begin(i) {
  S.i = i; S.L = launch(PADS[i]); S.phase = 'intro'; S.wait = TUNE.intro; S.msg = null; S.wreck = null;
}
function burst(x, y, cols, n, power) {
  for (let k = 0; k < n; k++) {
    const a = (k / n) * Math.PI * 2 + (k % 3) * 0.3, v = power * (0.4 + ((k * 7) % 5) / 6);
    S.bits.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - power * 0.6, life: 30 + (k % 4) * 8, c: cols[k % cols.length] });
  }
}
/** What the player asks for this tick: keys, or the pointer held down (turn toward it and fire). */
function controls(G) {
  const L = S.L;
  if (G.ptr.down && G.ptr.y > 0) {
    const aim = Math.atan2(G.ptr.x - L.x, -(G.ptr.y - L.y)) / D;
    return { aim: Math.max(-TUNE.tilt, Math.min(TUNE.tilt, aim)), fire: true };
  }
  return { turn: (G.held.right ? 1 : 0) - (G.held.left ? 1 : 0), fire: !!(G.held.up || G.held.ok) };
}

function tick(G) {
  S.t++;
  S.bits = S.bits.filter((b) => { b.x += b.vx; b.y += b.vy; b.vy += TUNE.gravity * 4; return --b.life > 0; });
  const pad = PADS[S.i], gr = GROUNDS[S.i], L = S.L;
  G.hud = 'Pad ' + (S.i + 1) + ' of ' + PADS.length + ' · ' + S.score + ' points';
  if (S.phase === 'intro') {
    const asked = G.held.up || G.held.ok || G.held.left || G.held.right || G.ptr.down;
    if (--S.wait <= 0 || (asked && S.wait < TUNE.intro - 12)) S.phase = 'fly';
    else return;
  }
  if (S.phase === 'fly') {
    const r = step(L, pad, gr, controls(G));
    if (L.firing) {
      if (S.t % 2 === 0) {                                            // exhaust, from the nozzle, backward along the nose
        const bx = L.x - Math.sin(L.tilt * D) * 6, by = L.y + Math.cos(L.tilt * D) * 6;
        S.bits.push({ x: bx, y: by, vx: -Math.sin(L.tilt * D) * 0.9 + L.vx, vy: Math.cos(L.tilt * D) * 0.9 + L.vy, life: 10, c: S.t % 4 ? '#ffd66b' : ACCENT });
      }
      if (S.t % 9 === 0) G.sfx('type');
      if (gr.padY - L.y < 24 || groundAt(gr, L.x) - L.y < 24) if (S.t % 3 === 0) {
        const gy = groundAt(gr, L.x);
        S.bits.push({ x: L.x + ((S.t * 7) % 9) - 4, y: gy - 1, vx: (S.t % 2 ? 1 : -1) * 0.8, vy: -0.3, life: 16, c: '#c9ccd6' });
      }
    }
    if (!r) return;
    if (r.landed) {
      const p = points(L, gr);
      S.score += p.total; S.landed++;
      S.msg = { title: 'SOFT LANDING', col: GOOD, lines: ['+' + p.total + ' POINTS', 'FUEL ' + L.fuel + '  AIM ' + Math.round(p.aim * 100) + '%  SOFT ' + Math.round(p.soft * 100) + '%'] };
      S.phase = 'landed'; S.wait = TUNE.pause;
      L.vx = L.vy = 0;
      burst(L.x, gr.padY, ['#c9ccd6', '#8f93a3'], 10, 0.6);
      G.sfx('good');
      S.log.push({ pad: S.i, landed: true, fuel: L.fuel });
    } else {
      S.landers--;
      S.msg = { title: 'CRASHED', col: BAD, lines: [r.why, S.landers > 0 ? S.landers + ' LANDER' + (S.landers > 1 ? 'S' : '') + ' LEFT' : 'NO LANDERS LEFT'] };
      S.phase = 'crashed'; S.wait = TUNE.pause; S.wreck = { x: L.x, y: L.y };
      burst(L.x, L.y, ['#ffd66b', ACCENT, BAD, '#e8ebf2', '#8f93a3'], 26, 1.4);
      G.shake(16); G.sfx('crash');
      S.log.push({ pad: S.i, landed: false, why: r.why });
    }
    return;
  }
  // after a landing or a crash: a pause (Space skips it), then the next pad, the same pad again, or the end
  if (--S.wait > 0 && !(G.hit.ok && S.wait < TUNE.pause - 30)) return;
  if (S.phase === 'landed') {
    if (S.i === PADS.length - 1) {
      G.finish({ title: 'ALL TEN PADS', won: true, stamp: true, score: S.score, lines: ['EVERY PAD ON THE MOON, ' + (TUNE.landers - S.landers) + ' CRASH' + (TUNE.landers - S.landers === 1 ? '' : 'ES') + '.', 'THE BASE HAS ITS SUPPLIES.'] });
    } else begin(S.i + 1);
  } else if (S.landers <= 0) {
    G.finish({ title: 'OUT OF LANDERS', score: S.score, lines: ['YOU LANDED ON ' + S.landed + ' OF ' + PADS.length + ' PADS.', 'LAND ALL TEN TO STAMP YOUR CITY PASS.'] });
  } else begin(S.i);
}

/* ---------- the picture ---------- */
const STARS = (() => { const r = rnd(21); return Array.from({ length: 70 }, () => [Math.floor(r() * 320), Math.floor(r() * 120), r()]); })();
function sky(g, t) {
  g.fillStyle = '#02030c'; g.fillRect(0, 0, 320, 180);
  STARS.forEach(([x, y, k]) => { if (Math.sin(t / 40 + k * 20) > -0.6) { g.fillStyle = k > 0.85 ? '#fff2b0' : '#c9ccd6'; g.fillRect(x, y, 1, 1); } });
  // the Earth, half lit
  const ex = 292, ey = 62, er = 11;
  for (let y = -er; y <= er; y++) for (let x = -er; x <= er; x++) {
    if (x * x + y * y > er * er) continue;
    const lit = x * 0.7 - y * 0.4 > -er * 0.25, q = Math.abs(Math.sin(x * 12.9 + y * 78.2) * 437.5) % 1;
    g.fillStyle = !lit ? '#0e1b4a' : q > 0.8 ? '#f1f6ff' : q > 0.5 ? '#3fa36a' : '#2f6fd8';
    g.fillRect(ex + x, ey + y, 1, 1);
  }
}
function land(g, gr, i, t, padLit) {
  const r = rnd(PADS[i].seed * 3);
  // far hills
  g.fillStyle = '#26283a';
  for (let x = 0; x < 320; x++) { const y = 118 + Math.round(Math.sin(x * 0.03 + i) * 8 + Math.sin(x * 0.11 + i * 2) * 3); g.fillRect(x, y, 1, 180 - y); }
  // the ground: lit top, grey body, darker deep down
  for (let x = 0; x < 320; x++) {
    const y = Math.round(gr.H[x]);
    g.fillStyle = '#8d90a2'; g.fillRect(x, y, 1, 180 - y);
    g.fillStyle = '#c9ccd6'; g.fillRect(x, y, 1, 1);
    g.fillStyle = '#6c6f82'; for (let yy = y + 8 + (x % 2); yy < 180; yy += 2) g.fillRect(x, yy, 1, 1);
  }
  // craters
  for (let k = 0; k < 14; k++) {
    const cx = Math.floor(r() * 320), w = 3 + Math.floor(r() * 7), cy = Math.round(gr.H[cx]) + 4 + Math.floor(r() * 14);
    if (cx > gr.left - 8 && cx < gr.right + 8) continue;
    g.fillStyle = '#5d6072'; g.fillRect(cx, cy, w, 1); g.fillStyle = '#b9bcc8'; g.fillRect(cx + 1, cy + 1, w - 2, 1);
  }
  // the pad: a plate, a white line, beacons at both ends
  const pw = gr.right - gr.left;
  g.fillStyle = '#4a4d5e'; g.fillRect(gr.left, gr.padY, pw + 1, 3);
  g.fillStyle = '#e8ebf2'; g.fillRect(gr.left, gr.padY, pw + 1, 1);
  for (let x = gr.left + 2; x < gr.right - 1; x += 4) { g.fillStyle = ACCENT; g.fillRect(x, gr.padY + 1, 2, 1); }
  const on = padLit || Math.floor(t / 20) % 2 === 0;
  [gr.left, gr.right].forEach((x) => {
    g.fillStyle = '#8f93a3'; g.fillRect(x, gr.padY - 4, 1, 4);
    g.fillStyle = padLit ? GOOD : on ? ACCENT : '#5a3a12'; g.fillRect(x - 1, gr.padY - 6, 3, 2);
  });
}
// the lander, drawn turned: each screen pixel near it asks which pixel of the drawing it shows
const SHIP = [
  '....w....',
  '...wcw...',
  '..wcccw..',
  '..wwwww..',
  '.gyyyyyg.',
  '.gyyyyyg.',
  '..g.o.g..',
  '.g..o..g.',
  'g.......g'
];
const PAL = { w: '#e8ebf2', c: '#7fd4ff', g: '#c9ccd6', y: '#ffb347', o: '#5d6072' };
function ship(g, x, y, tilt, flame, t) {
  const c = Math.cos(tilt * D), s = Math.sin(tilt * D), X = Math.round(x), Y = Math.round(y);
  for (let dy = -9; dy <= 11; dy++) for (let dx = -9; dx <= 9; dx++) {
    const px = X + dx + 0.5 - x, py = Y + dy + 0.5 - y;
    const lx = px * c + py * s, ly = -px * s + py * c;               // back into the drawing's own frame
    const col = Math.round(lx + 4 - 0.5 + 0.5), row = Math.round(ly + 4.5 - 0.5);
    let k = SHIP[row] && SHIP[row][col];
    if ((!k || k === '.') && flame && Math.abs(lx) < 1.2 + (ly - 4) * 0.25 && ly > 4.5 && ly < 4.5 + 3 + ((t + Math.round(ly)) % 4)) k = (Math.round(ly) + t) % 3 ? 'F' : 'f';
    if (!k || k === '.') continue;
    g.fillStyle = k === 'F' ? '#ffd66b' : k === 'f' ? ACCENT : PAL[k];
    g.fillRect(X + dx, Y + dy, 1, 1);
  }
}
function draw(g, G) {
  const pad = PADS[S.i], gr = GROUNDS[S.i], L = S.L;
  sky(g, S.t);
  land(g, gr, S.i, S.t, S.phase === 'landed');
  // a shadow on the ground under the lander, closer and darker as it falls
  const gy = groundAt(gr, L.x), h = gy - L.y;
  if (h < 70 && !S.wreck) { const w = Math.max(2, Math.round(9 - h / 10)); g.fillStyle = '#4a4d5e'; g.fillRect(Math.round(L.x - w / 2), Math.round(gy), w, 1); }
  if (!S.wreck) ship(g, L.x, L.y, L.tilt, L.firing && S.phase === 'fly', S.t);
  if (!S.wreck && L.y < 4) {                                         // above the screen: a marker on the top edge, and how high
    const mx = Math.round(Math.max(8, Math.min(312, L.x)));
    g.fillStyle = ACCENT; g.fillRect(mx, 1, 1, 1); g.fillRect(mx - 1, 2, 3, 1); g.fillRect(mx - 2, 3, 5, 1);
    text(g, String(Math.round(4 - L.y)), mx, 6, ACCENT, { align: 'center', shadow: '#02030c' });
  }
  S.bits.forEach((b) => { g.fillStyle = b.c; g.fillRect(Math.round(b.x), Math.round(b.y), 1, 1); });

  // the gauges, top left: fuel, then the three things a landing must keep small (green when safe)
  const sf = TUNE.safe;
  box(g, 4, 4, 92, 44, 'rgba(2,3,12,.75)', '#3d4052');
  text(g, 'FUEL', 8, 8, DIM);
  box(g, 34, 8, 58, 7, '#0b0c2e', '#5d6072');
  const f = L.fuel / pad.fuel;
  g.fillStyle = f < 0.2 ? BAD : ACCENT; g.fillRect(35, 9, Math.round(56 * f), 5);
  const gauge = (label, v, ok, y) => { text(g, label, 8, y, DIM); text(g, v, 92, y, ok ? GOOD : BAD, { align: 'right' }); };
  gauge('DOWN', (L.vy * 10).toFixed(1), L.vy <= sf.vy, 19);
  gauge('SIDE', (Math.abs(L.vx) * 10).toFixed(1), Math.abs(L.vx) <= sf.vx, 28);
  gauge('LEAN', Math.round(Math.abs(L.tilt)) + '', Math.abs(L.tilt) <= sf.tilt, 37);
  // top right: the pad, the landers left, the wind
  text(g, 'PAD ' + (S.i + 1) + '/' + PADS.length, 316, 6, PAPER, { align: 'right', shadow: '#02030c' });
  for (let k = 0; k < TUNE.landers; k++) {
    const x = 310 - k * 10, col = k < S.landers ? '#e8ebf2' : '#3d4052';
    g.fillStyle = col; g.fillRect(x - 1, 16, 3, 3); g.fillRect(x - 2, 19, 5, 2); g.fillRect(x - 3, 21, 1, 2); g.fillRect(x + 3, 21, 1, 2);
  }
  const w = windAt(pad, L.t);
  if (pad.wind || pad.gust) {
    const n = Math.min(4, Math.max(0, Math.round(Math.abs(w) / 0.0012)));
    text(g, 'WIND ' + (n ? (w > 0 ? '>'.repeat(n) : '<'.repeat(n)) : '-'), 316, 28, n >= 3 ? BAD : '#58e6ff', { align: 'right', shadow: '#02030c' });
  }
  text(g, S.score + ' PTS', 316, (pad.wind || pad.gust) ? 38 : 28, PAPER, { align: 'right', shadow: '#02030c' });

  // the pad's name and line while the lander waits
  if (S.phase === 'intro') {
    const lines = wrap(pad.say.toUpperCase(), 230);
    box(g, 40, 62, 240, 30 + lines.length * 10, 'rgba(2,3,12,.85)', ACCENT);
    text(g, 'PAD ' + (S.i + 1) + ': ' + pad.name.toUpperCase(), 160, 68, ACCENT, { align: 'center' });
    lines.forEach((l, k) => text(g, l, 160, 82 + k * 10, PAPER, { align: 'center' }));
  }
  if (S.msg && (S.phase === 'landed' || S.phase === 'crashed')) {
    const m = S.msg;
    box(g, 70, 64, 180, 42, 'rgba(2,3,12,.88)', m.col);
    text(g, m.title, 160, 70, m.col, { align: 'center', scale: 2 });
    m.lines.forEach((l, k) => text(g, l, 160, 88 + k * 9, PAPER, { align: 'center' }));
  }
}

/** The picture behind the title: the first pad, and a lander coming down onto it, over and over. */
function title(g, G) {
  const t = G.calm ? 0 : G.t, gr = GROUNDS[0], k = (t % 360) / 360, x = 34, foot = groundAt(gr, x) - 5;
  sky(g, t);
  land(g, gr, 0, t, false);
  const y = 40 + Math.min(1, k / 0.85) * (foot - 40);                 // off to the left, clear of the title's words
  ship(g, x, y, Math.sin(t / 30) * 4 * (1 - k), k > 0.35 && k < 0.85 && t % 6 < 4, t);
}

/**
 * For tools/city-check.mjs, two runs through the real shell. The autopilot flies a whole run with the same
 * keys a player has: it must land all ten pads and get the City Pass stamped. Then a lander left alone must
 * crash three times and end the run, so the crash path works too.
 */
function check({ createCore }) {
  const run = (pilot) => {
    const { G, T } = createCore(def, { seed: 7 });
    T.step(10); T.press('ok'); T.step(1);
    for (let n = 0; n < 60 * 60 * 8 && G.state === 'play'; n++) {
      const c = pilot && S.phase === 'fly' ? autopilot(S.L, PADS[S.i], GROUNDS[S.i]) : { turn: 0, fire: false };
      T.hold('left', c.turn < 0); T.hold('right', c.turn > 0); T.hold('up', !!c.fire);
      T.step(1);
      if (G.lastError) return { G, err: String(G.lastError.stack || G.lastError) };
    }
    return { G, log: S.log.slice(), score: S.score };
  };
  const a = run(true);
  if (a.err) return { ok: false, note: a.err };
  const crashes = a.log.filter((e) => !e.landed);
  if (a.G.state !== 'over' || !a.G.stamped || a.log.filter((e) => e.landed).length !== PADS.length) {
    return { ok: false, note: 'autopilot: ' + a.log.map((e) => (e.pad + 1) + (e.landed ? ' landed' : ' ' + e.why)).join(', ') };
  }
  const b = run(false);
  if (b.err) return { ok: false, note: b.err };
  const okB = b.G.state === 'over' && b.log.length === TUNE.landers && b.log.every((e) => !e.landed);
  const least = Math.min(...a.log.filter((e) => e.landed).map((e) => e.fuel));
  return {
    ok: okB && !crashes.length,
    note: 'autopilot landed all ' + PADS.length + ' pads (score ' + a.score + ', least fuel left on a pad ' + least + ')' + (okB ? '; a lander left alone crashes 3 times and the run ends' : '; the crash path did not end the run')
  };
}

const def = {
  id: 'soft-landing', n: 21, name: 'Soft Landing', district: 'MOON DOCK', accent: ACCENT, ink: '#160c02',
  how: 'Land on ten pads in a row. Turn with left and right, fire with up or space; or hold the mouse or a finger where the nose should point. Come down slowly and upright, both feet on the pad.',
  start, tick, draw, title, check,
  _state: () => S                                                   // the test hook: the run as it stands
};
export default def;
