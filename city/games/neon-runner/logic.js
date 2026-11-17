/*
 * logic.js — Neon Runner's rules, with no drawing: the track as it is laid down, one tick of running, and an
 * autopilot for the check. Deterministic: a run is fully decided by its seed and the inputs, and the whole state
 * can be copied (clone) so the autopilot can try each move ahead of time. The game (game.js) uses exactly this.
 */
import { TUNE, PIECES } from './data.js';

export const FLOOR = 152, CEIL = 28, PX = 64, PW = 8;

function rand(s) {
  s.r = (s.r + 0x6D2B79F5) | 0;
  let t = Math.imul(s.r ^ (s.r >>> 15), 1 | s.r);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

/** A new run. grav: 1 runs on the street (falls down), -1 on the overpass (falls up). y is the edge touching the surface. */
export function create(seed) {
  return {
    t: 0, dist: 0, speed: TUNE.speed[0], y: FLOOR, vy: 0, grav: 1, grounded: true, coyote: 0, buffer: 0,
    slide: false, flipping: false, dead: false, why: '', chips: 0, taken: [], obs: [], next: TUNE.first, id: 0,
    r: (seed >>> 0) || 1, events: []
  };
}
export const clone = (s) => ({ ...s, obs: s.obs.slice(), taken: s.taken.slice(), events: [] });
export const score = (s) => Math.floor(s.dist / 10) + s.chips * TUNE.chip;

/** Lay down track until it reaches a screen and a bit ahead of the runner; forget what is far behind. */
function lay(s) {
  while (s.next < s.dist + 420) {
    const open = PIECES.filter((p) => p.from <= s.dist);
    let pick = rand(s) * open.reduce((a, p) => a + p.weight, 0), piece = open[0];
    for (const p of open) { pick -= p.weight; if (pick < 0) { piece = p; break; } }
    const mirror = s.dist > 300 && rand(s) < 0.5;
    for (const o of piece.obs) s.obs.push({ ...o, x: s.next + o.x, side: o.side && (mirror ? (o.side === 'F' ? 'C' : 'F') : o.side), id: s.id++ });
    s.next += piece.len + Math.max(60, s.speed * TUNE.gapTicks);
  }
  if (s.obs.length && s.obs[0].x + (s.obs[0].w || 8) < s.dist - 40) s.obs = s.obs.filter((o) => o.x + (o.w || 8) >= s.dist - 40);
}

/** Is there a hole in this surface ('F' or 'C') under world x? */
export function holeAt(s, side, x) { return s.obs.some((o) => o.k === 'gap' && o.side === side && x >= o.x && x <= o.x + o.w); }
export const droneY = (o, t) => o.y + Math.sin(t * 0.05 + o.x * 0.1) * o.amp;

/** The runner's box in world pixels. */
export function body(s) {
  const h = s.slide ? TUNE.low : TUNE.stand, x = s.dist + PX;
  return s.grav > 0 ? { x0: x, x1: x + PW, y0: s.y - h, y1: s.y } : { x0: x, x1: x + PW, y0: s.y, y1: s.y + h };
}
/** An obstacle's box, or null for holes. */
export function box(o, t) {
  if (o.k === 'block') return o.side === 'F' ? { x0: o.x, x1: o.x + o.w, y0: FLOOR - 14, y1: FLOOR } : { x0: o.x, x1: o.x + o.w, y0: CEIL, y1: CEIL + 14 };
  if (o.k === 'beam') return o.side === 'F' ? { x0: o.x, x1: o.x + o.w, y0: FLOOR - 40, y1: FLOOR - 9 } : { x0: o.x, x1: o.x + o.w, y0: CEIL + 9, y1: CEIL + 40 };
  if (o.k === 'drone') { const y = droneY(o, t); return { x0: o.x - 4, x1: o.x + 4, y0: y - 4, y1: y + 4 }; }
  if (o.k === 'chip') { const y = o.side === 'F' ? FLOOR - o.h : CEIL + o.h; return { x0: o.x - 2, x1: o.x + 2, y0: y - 2, y1: y + 2 }; }
  return null;
}
const hit = (a, b) => a.x0 < b.x1 && a.x1 > b.x0 && a.y0 < b.y1 && a.y1 > b.y0;
const WHY = { block: 'RAN INTO A CRATE', beam: 'HIT A LASER', drone: 'HIT A DRONE' };

/**
 * One tick. ctl: { jump: pressed this tick, slide: held, flip: pressed this tick }.
 * Leaves s.events: what happened this tick, for sounds and effects ('jump', 'flip', 'land', 'chip', 'dead').
 */
export function step(s, ctl = {}) {
  if (s.dead) return s;
  s.events = [];
  s.t++;
  s.speed = Math.min(TUNE.speed[1], TUNE.speed[0] + s.t * TUNE.accel);
  s.dist += s.speed;
  lay(s);
  const side = s.grav > 0 ? 'F' : 'C', surf = s.grav > 0 ? FLOOR : CEIL, cx = s.dist + PX + PW / 2;

  // the controls
  if (ctl.jump) s.buffer = TUNE.buffer;
  s.slide = !!ctl.slide && s.grounded;
  const canAct = s.grounded || s.coyote > 0;
  if (ctl.flip && canAct && !s.flipping) {
    s.grav = -s.grav; s.grounded = false; s.flipping = true; s.vy = 0; s.coyote = 0; s.buffer = 0; s.slide = false;
    s.events.push('flip');
  } else if (s.buffer > 0 && canAct) {
    s.vy = -TUNE.jump * s.grav; s.grounded = false; s.coyote = 0; s.buffer = 0; s.slide = false;
    s.events.push('jump');
  }
  if (s.buffer > 0) s.buffer--;

  // running off an edge into a hole
  if (s.grounded && holeAt(s, side, cx)) { s.grounded = false; s.coyote = TUNE.coyote; s.vy = 0; }

  // flying or falling, toward whichever surface is "down" now
  if (!s.grounded) {
    const prev = s.y, side2 = s.grav > 0 ? 'F' : 'C', surf2 = s.grav > 0 ? FLOOR : CEIL;
    s.vy = Math.max(-TUNE.maxFall * 1.6, Math.min(TUNE.maxFall * 1.6, s.vy + TUNE.gravity * s.grav));
    if (s.flipping) s.vy = Math.max(-TUNE.maxFall, Math.min(TUNE.maxFall, s.vy));
    s.y += s.vy;
    if (s.coyote > 0) s.coyote--;
    const reached = s.grav > 0 ? prev <= surf2 && s.y >= surf2 : prev >= surf2 && s.y <= surf2;
    if (reached && !holeAt(s, side2, cx)) { s.y = surf2; s.vy = 0; s.grounded = true; s.flipping = false; s.events.push('land'); }
    // below the street or above the overpass: in a hole, falling; outside one, the hole's edge
    const beyond = s.grav > 0 ? s.y > FLOOR + 1 : s.y < CEIL - 1;
    if (beyond && !holeAt(s, side2, cx)) return die(s, 'HIT THE EDGE OF A HOLE');
    if (s.y > 200 || s.y < -20) return die(s, 'FELL THROUGH A HOLE');
  }
  void surf;

  // obstacles and chips
  const me = body(s);
  for (const o of s.obs) {
    if (o.x > me.x1 + 12) break;
    const b = box(o, s.t);
    if (!b || !hit(me, b)) continue;
    if (o.k === 'chip') { if (!s.taken.includes(o.id)) { s.taken.push(o.id); s.chips++; s.events.push('chip'); } continue; }
    return die(s, WHY[o.k]);
  }
  return s;
}
function die(s, why) { s.dead = true; s.why = why; s.events.push('dead'); return s; }

/**
 * Reflexes: what a steady player does about the next thing on their own surface — jump a crate when it is a few
 * steps away, slide under a laser, jump a short hole and flip over a long one. Used by the autopilot below.
 */
export function reflex(s) {
  if (!s.grounded) return { slide: false };
  const side = s.grav > 0 ? 'F' : 'C', x0 = s.dist + PX, x1 = x0 + PW, v = s.speed, reach = 2 * TUNE.jump / TUNE.gravity * v;
  for (const o of s.obs) {
    if (o.side !== side || o.x + (o.w || 0) < x0) continue;
    const ticks = (o.x - x1) / v;
    if (ticks > 16) break;
    if (o.k === 'block' && ticks <= 7 && ticks >= 2) return { jump: true };
    if (o.k === 'beam' && ticks <= 4) return { slide: true };
    if (o.k === 'gap' && ticks <= 2) return o.w + PW + 6 < reach * 0.9 ? { jump: true } : { flip: true };
  }
  return {};
}

/**
 * The autopilot, for the check: each tick it tries each move (its reflex first, then nothing, slide, jump, flip)
 * on a copy of the run, plays on with reflexes, and keeps the first move that survives the next two seconds — or
 * the one that lasts longest. It sees only what a player sees: the track already laid on screen.
 */
export function pilot(s, ahead = 120) {
  const own = reflex(s), tries = [own, {}, { slide: true }, { jump: true }, { flip: true }];
  let best = own, bestT = -1;
  for (const first of tries) {
    const c = clone(s);
    step(c, first);
    let n = 1;
    while (!c.dead && n < ahead) { step(c, reflex(c)); n++; }
    if (n > bestT) { bestT = n; best = first; }
    if (n >= ahead) break;
  }
  return best;
}
