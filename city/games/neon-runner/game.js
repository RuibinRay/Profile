/*
 * Neon Runner — Game City No. 13 (Neon Ward, arcade).
 *
 * What it does: a courier runs the violet streets of the Neon Ward, faster and faster. Up jumps, down slides,
 * Space flips gravity so the runner drops onto the overpass above and runs upside down (Space again flips back).
 * Crates must be jumped, lasers slid under, holes jumped or flipped over, and drones float between the street and
 * the overpass. Energy chips are worth extra. One mistake ends the run; the score is the distance plus the chips.
 * On a touch screen the screen is three buttons: left slides (hold), middle flips, right jumps.
 * What it leaves alone: everything outside its canvas; it saves only its best score (city:neon-runner).
 * To turn its effects off: the shake follows the visitor's reduced-motion setting; sound has the bar's switch.
 * The rules are logic.js (deterministic, with the autopilot), the numbers and track pieces data.js.
 */
import { text, sprite } from '../../kit/draw.js';
import { SCENES } from '../../../assets/js/pixel/scenes.js?v=20261117a';
import { TUNE } from './data.js';
import { create, step, score, box, droneY, holeAt, pilot, FLOOR, CEIL, PX, PW } from './logic.js';

const ACCENT = '#c86bff', CYAN = '#41e8d8', PINK = '#ff6fae', RED = '#ff4d6d', PAPER = '#fff8e6';
let S = null, R = null;                          // S: the run (logic.js), R: what is only drawn (bits, flashes)

function start(G) {
  S = create(Math.floor(G.rnd() * 4294967295));
  R = { bits: [], flash: 0, mile: 0, touched: false };
}
function burst(x, y, cols, n, power) {
  for (let k = 0; k < n; k++) {
    const a = (k / n) * Math.PI * 2;
    R.bits.push({ x, y, vx: Math.cos(a) * power * (0.5 + (k % 3) / 3), vy: Math.sin(a) * power * (0.5 + (k % 4) / 4), life: 22 + (k % 5) * 4, c: cols[k % cols.length] });
  }
}

/** The controls this tick: keys, or the screen as three buttons (left slides, middle flips, right jumps). */
function controls(G) {
  const ptrSlide = G.ptr.down && G.ptr.x0 < 107;
  if (G.ptr.hit) R.touched = true;
  return {
    jump: !!(G.hit.up || (G.ptr.hit && G.ptr.x >= 213)),
    flip: !!(G.hit.ok || (G.ptr.hit && G.ptr.x >= 107 && G.ptr.x < 213)),
    slide: !!(G.held.down || ptrSlide)
  };
}

function tick(G) {
  step(S, controls(G));
  const sx = PX + PW / 2, sy = S.grav > 0 ? S.y - 7 : S.y + 7;
  for (const e of S.events) {
    if (e === 'jump') G.sfx('blip');
    else if (e === 'flip') { G.sfx('turn'); burst(sx, S.grav > 0 ? CEIL : FLOOR, [ACCENT, PINK], 8, 1.2); }
    else if (e === 'land') burst(sx, S.y, ['#6a4ea0'], 4, 0.6);
    else if (e === 'chip') { G.sfx('pick'); burst(sx, sy, ['#ffd66b', PAPER], 6, 1); }
  }
  R.bits = R.bits.filter((b) => { b.x += b.vx - S.speed * 0.25; b.y += b.vy; b.vy *= 0.94; return --b.life > 0; });
  const pts = score(S);
  if (Math.floor(pts / 500) > R.mile) { R.mile = Math.floor(pts / 500); G.sfx('good'); R.flash = 30; }
  if (R.flash) R.flash--;
  G.hud = pts + ' points';
  if (S.dead) {
    burst(sx, sy, [CYAN, ACCENT, PINK, PAPER], 24, 2.2); G.shake(14); G.sfx('crash');
    const won = pts >= TUNE.stamp;
    G.finish({
      title: S.why, score: pts, won, stamp: won,
      lines: [Math.floor(S.dist / 10) + ' METRES, ' + S.chips + ' CHIP' + (S.chips === 1 ? '' : 'S'), won ? 'THE MESSAGE GOT THROUGH.' : TUNE.stamp + ' POINTS STAMPS YOUR CITY PASS.']
    });
  }
}

/* ---------- the picture ---------- */
// the runner, 8 wide: two running steps, in the air, and sliding (7 tall). Drawn upside down on the overpass.
const RUN = [
  ['...hh...', '..hhhh..', '..hssv..', '...ss...', '..jjjj..', '.jjjjjj.', '.s.jjj.s', '...jjj..', '..pppp..', '..pp.pp.', '.pp...p.', '.p....pp', 'bb......', '........'],
  ['...hh...', '..hhhh..', '..hssv..', '...ss...', '..jjjj..', '.jjjjjj.', '..sjjjs.', '...jjj..', '..pppp..', '...ppp..', '...pp...', '...pp...', '...bbb..', '........'],
  ['...hh...', '..hhhh..', '..hssv..', '...ss...', 's.jjjj.s', '.jjjjjj.', '...jjj..', '...jjj..', '..pppp..', '.pp..pp.', '.p....p.', 'bb....bb', '........', '........']
];
const SLIDE = ['........', '........', '.hh.....', 'hhsv.jj.', '.ss.jjjj', '..pppppp', 'bb.....b'];
const PAL = { h: '#2b1a3a', s: '#f0c8a0', v: PINK, j: CYAN, p: '#3b1c72', b: '#120a24' };

function runner(g) {
  const frame = S.slide ? SLIDE : !S.grounded ? RUN[2] : RUN[Math.floor(S.dist / 9) % 2];
  const rows = S.grav > 0 ? frame : frame.slice().reverse();
  const h = rows.length, y = S.grav > 0 ? Math.round(S.y) - h : Math.round(S.y);
  // a neon after-image behind, then a dark outline, so the runner reads against the bright sky
  const ghost = {}, edge = {};
  for (const k in PAL) { ghost[k] = ACCENT; edge[k] = '#05020e'; }
  g.globalAlpha = 0.25; sprite(g, rows, PX - 8, y, ghost); g.globalAlpha = 0.5; sprite(g, rows, PX - 4, y, ghost); g.globalAlpha = 1;
  [[-1, 0], [1, 0], [0, -1], [0, 1]].forEach(([dx, dy]) => sprite(g, rows, PX + dx, y + dy, edge));
  sprite(g, rows, PX, y, PAL);
}
function strips(g, t) {
  const off = S.dist;
  // the overpass: a girder above, its neon edge, rivets moving past
  g.fillStyle = '#140a30'; g.fillRect(0, 0, 320, CEIL);
  g.fillStyle = '#2a1450'; for (let x = -((off * 1) % 24); x < 320; x += 24) g.fillRect(Math.round(x), 4, 12, CEIL - 10);
  g.fillStyle = ACCENT; g.fillRect(0, CEIL - 1, 320, 1);
  // the street: dark ground, a cyan edge, lane marks
  g.fillStyle = '#1a0a2c'; g.fillRect(0, FLOOR, 320, 180 - FLOOR);
  g.fillStyle = CYAN; g.fillRect(0, FLOOR, 320, 1);
  g.fillStyle = '#3b1c72'; for (let x = -((off) % 18); x < 320; x += 18) g.fillRect(Math.round(x), FLOOR + 12, 8, 1);
  // holes: cut out of the strips, glowing at the bottom
  for (const o of S.obs) {
    if (o.k !== 'gap') continue;
    const x0 = Math.round(o.x - off), w = Math.round(o.w);
    if (x0 > 320 || x0 + w < 0) continue;
    if (o.side === 'F') {
      g.fillStyle = '#05020e'; g.fillRect(x0, FLOOR, w, 180 - FLOOR);
      g.fillStyle = (Math.floor(t / 6) % 2) ? RED : '#8a1f3a'; g.fillRect(x0, 178, w, 2);
      g.fillStyle = RED; g.fillRect(x0, FLOOR, 1, 6); g.fillRect(x0 + w - 1, FLOOR, 1, 6);
    } else {
      g.fillStyle = '#05020e'; g.fillRect(x0, 0, w, CEIL);
      g.fillStyle = (Math.floor(t / 6) % 2) ? RED : '#8a1f3a'; g.fillRect(x0, 0, w, 2);
      g.fillStyle = RED; g.fillRect(x0, CEIL - 6, 1, 6); g.fillRect(x0 + w - 1, CEIL - 6, 1, 6);
    }
  }
}
function things(g, t) {
  const off = S.dist;
  for (const o of S.obs) {
    const b = box(o, t);
    if (!b) continue;
    const x0 = Math.round(b.x0 - off), x1 = Math.round(b.x1 - off), y0 = Math.round(b.y0), y1 = Math.round(b.y1);
    if (x0 > 330 || x1 < -10) continue;
    if (o.k === 'block') {                                           // a neon crate
      g.fillStyle = '#3b1c72'; g.fillRect(x0, y0, x1 - x0, y1 - y0);
      g.fillStyle = ACCENT; g.fillRect(x0, y0, x1 - x0, 1); g.fillRect(x0, y1 - 1, x1 - x0, 1); g.fillRect(x0, y0, 1, y1 - y0); g.fillRect(x1 - 1, y0, 1, y1 - y0);
      g.fillStyle = CYAN; for (let k = 2; k < x1 - x0 - 2; k += 4) g.fillRect(x0 + k, y0 + 3, 2, y1 - y0 - 6);
    } else if (o.k === 'beam') {                                     // a laser at head height, hung from two posts
      const post = o.side === 'F' ? [CEIL, y0] : [y1, FLOOR];
      g.fillStyle = '#5a4a96'; g.fillRect(x0, post[0], 1, post[1] - post[0]); g.fillRect(x1 - 1, post[0], 1, post[1] - post[0]);
      g.fillStyle = '#4a1430'; g.fillRect(x0, y0, x1 - x0, y1 - y0);
      for (let yy = y0; yy < y1; yy += 3) { g.fillStyle = (Math.floor(t / 3) + yy) % 2 ? RED : '#ff9aa8'; g.fillRect(x0 + 1, yy, x1 - x0 - 2, 1); }
    } else if (o.k === 'drone') {                                    // a drone with a red eye and spinning rotors
      const cx = Math.round(o.x - off), cy = Math.round(droneY(o, t));
      g.fillStyle = '#2a2350'; g.fillRect(cx - 4, cy - 2, 9, 5);
      g.fillStyle = '#8f93a3'; g.fillRect(cx - 3, cy - 3, 7, 1);
      g.fillStyle = Math.floor(t / 4) % 2 ? RED : '#ff9aa8'; g.fillRect(cx - 1, cy, 3, 2);
      g.fillStyle = '#c9ccd6'; const r = Math.floor(t / 2) % 2 ? 3 : 1; g.fillRect(cx - 3 - r, cy - 4, r * 2, 1); g.fillRect(cx + 3 - r + 1, cy - 4, r * 2, 1);
    } else if (o.k === 'chip' && !S.taken.includes(o.id)) {           // an energy chip
      const cx = Math.round(o.x - off), cy = Math.round((y0 + y1) / 2), on = Math.floor(t / 8 + o.id) % 2;
      g.fillStyle = on ? '#ffd66b' : '#fff3c4'; g.fillRect(cx - 1, cy - 2, 3, 5); g.fillRect(cx - 2, cy - 1, 5, 3);
    }
  }
}
function draw(g, G) {
  SCENES['shattered-worlds'](g, 320, 180, G.calm ? 0 : S.t / 60, S.dist / 900);
  strips(g, S.t);
  things(g, S.t);
  if (!S.dead) runner(g);
  R.bits.forEach((b) => { g.fillStyle = b.c; g.fillRect(Math.round(b.x), Math.round(b.y), 1, 1); });
  const pts = score(S);
  text(g, String(pts), 6, 10, R.flash && R.flash % 6 < 3 ? '#ffd66b' : PAPER, { shadow: '#05020e' });
  text(g, Math.floor(S.dist / 10) + ' M', 6, 19, '#d9dcf2', { shadow: '#05020e' });
  text(g, 'SPEED ' + Math.round(S.speed / TUNE.speed[1] * 100) + '%', 314, 10, '#d9dcf2', { align: 'right', shadow: '#05020e' });
  // the three touch buttons, shown faintly on the street while a pointer is used (and for the first seconds)
  if (R.touched || S.t < 240) {
    ['SLIDE', 'FLIP', 'JUMP'].forEach((l, k) => text(g, l, 53 + k * 107, FLOOR + 16, '#6a4ea0', { align: 'center' }));
  }
}

/** The picture behind the title: the street, the overpass, and the runner going by. */
function title(g, G) {
  if (!S || S.dead) start(G);
  const t = G.calm ? 0 : G.t;
  S.dist = t * 2; S.t = t; S.obs = []; S.grav = Math.floor(t / 240) % 2 ? -1 : 1; S.y = S.grav > 0 ? FLOOR : CEIL; S.grounded = true; S.slide = false;
  SCENES['shattered-worlds'](g, 320, 180, t / 60, t / 400);
  strips(g, t);
  runner(g);
}

/**
 * For tools/city-check.mjs. The autopilot plays through the real shell with the player's keys (up to jump,
 * Space to flip, down held to slide) on ten different tracks for up to 2 minutes each: it must reach the stamp
 * score on every one, which shows the track is fair at every speed. Then a runner left alone must die at the
 * first crate, so the end of a run works too.
 */
function check({ createCore }) {
  const runs = [];
  for (let k = 0; k < 10; k++) {
    const { G, T } = createCore(def, { seed: 1000 + k * 37 });
    T.step(10); T.press('ok'); T.step(1);
    let n = 0;
    while (G.state === 'play' && n++ < 7200) {
      const c = pilot(S);
      if (c.jump) T.press('up');
      if (c.flip) T.press('ok');
      T.hold('down', !!c.slide);
      T.step(1);
      if (G.lastError) return { ok: false, note: String(G.lastError.stack || G.lastError) };
    }
    runs.push({ pts: score(S), dead: S.dead, why: S.why });
  }
  const { G, T } = createCore(def, { seed: 5 });
  T.step(10); T.press('ok'); T.step(1);
  for (let n = 0; n < 2000 && G.state === 'play'; n++) T.step(1);
  const idle = G.state === 'over' && S.dead;
  const low = Math.min(...runs.map((r) => r.pts)), deaths = runs.filter((r) => r.dead);
  return {
    ok: low >= TUNE.stamp && idle && !G.lastError,
    note: 'autopilot, 10 tracks of up to 2 minutes: lowest ' + low + ', highest ' + Math.max(...runs.map((r) => r.pts)) + ' (stamp at ' + TUNE.stamp + ')' +
      (deaths.length ? '; died ' + deaths.length + 'x (' + deaths.map((r) => r.why).join(', ') + ')' : '; never died') + (idle ? '; a runner left alone dies at the first crate' : '; the idle run did not end')
  };
}

const def = {
  id: 'neon-runner', n: 13, name: 'Neon Runner', district: 'NEON WARD', accent: ACCENT, ink: '#12072a',
  how: 'Run the neon streets. Up jumps, down slides, space flips gravity to run on the overpass and back. On a touch screen: left slides, middle flips, right jumps.',
  start, tick, draw, title, check,
  _state: () => S                                                   // the test hook: the run as it stands
};
export default def;
