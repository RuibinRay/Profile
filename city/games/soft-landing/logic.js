/*
 * logic.js — Soft Landing's rules, with no drawing: the ground of each pad, one tick of flight, and whether a
 * touch-down is a landing or a crash. The game (game.js) and its autopilot check both use it, so what the check
 * proves is what the player plays. Everything here is deterministic (no clock, no unseeded randomness): the same
 * inputs always give the same flight.
 */
import { TUNE } from './data.js';

const D = Math.PI / 180;
function rng(seed) { let a = seed >>> 0; return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

/** The ground of a pad: H[x] is the surface's y at each whole x (0…320); the pad is flat at padY. */
export function ground(pad) {
  const r = rng(pad.seed), H = new Float32Array(321), big = Array.from({ length: 14 }, r), small = Array.from({ length: 42 }, r);
  const smooth = (pts, u) => { const i = Math.floor(u), f = u - i, s = f * f * (3 - 2 * f); return pts[i] * (1 - s) + pts[i + 1] * s; };
  const rough = pad.rough == null ? 10 : pad.rough;
  for (let x = 0; x <= 320; x++) {
    let y = pad.base - smooth(big, x / 320 * 12) * rough - smooth(small, x / 320 * 40) * rough * 0.3;
    for (const [cx, hw, h] of pad.hills || []) if (Math.abs(x - cx) < hw) y -= h * (Math.cos(Math.PI * (x - cx) / hw) + 1) / 2;
    H[x] = y;
  }
  const [px, pw] = pad.pad;
  let padY = 0;
  for (let x = px; x <= px + pw; x++) padY = Math.max(padY, H[x]);          // the pad sits on the lowest point under it
  padY = Math.round(padY);
  for (let x = px - 6; x <= px + pw + 6; x++) {
    if (x < 0 || x > 320) continue;
    const k = x < px ? (px - x) / 6 : x > px + pw ? (x - px - pw) / 6 : 0;    // a short slope down to the pad's edges
    H[x] = k ? H[x] * k + padY * (1 - k) : padY;
  }
  for (let x = 0; x <= 320; x++) H[x] = Math.max(28, Math.min(174, H[x]));
  return { H, padY, left: px, right: px + pw };
}
export const groundAt = (gr, x) => gr.H[Math.max(0, Math.min(320, Math.round(x)))];

/** The wind at tick t of a pad: a steady push plus a slow swing. */
export const windAt = (pad, t) => (pad.wind || 0) + (pad.gust ? pad.gust * Math.sin(t * Math.PI * 2 / (pad.period || 240) + pad.seed) : 0);

/** The lander at the start of a pad. */
export function launch(pad) {
  return { x: pad.start[0], y: pad.start[1], vx: pad.start[2], vy: 0, tilt: 0, fuel: pad.fuel, t: 0, firing: false };
}

// the points of the lander that can touch the ground, round its centre: two feet, the sides, the top
const FEET = [[-4, 5], [4, 5]], BODY = [[-3, 1], [3, 1], [0, -5]];
const at = (L, [lx, ly]) => { const c = Math.cos(L.tilt * D), s = Math.sin(L.tilt * D); return [L.x + lx * c - ly * s, L.y + lx * s + ly * c]; };
export const feet = (L) => FEET.map((p) => at(L, p));

/**
 * One tick. ctl: { turn: -1 | 0 | 1, fire: bool }, or { aim: degrees } to turn toward an angle (the pointer).
 * Returns null while flying, or { landed: bool, why } on touching the ground.
 */
export function step(L, pad, gr, ctl) {
  if (ctl.aim != null) { const d = ctl.aim - L.tilt; L.tilt += Math.max(-TUNE.turn, Math.min(TUNE.turn, d)); }
  else L.tilt += (ctl.turn || 0) * TUNE.turn;
  L.tilt = Math.max(-TUNE.tilt, Math.min(TUNE.tilt, L.tilt));
  L.firing = !!ctl.fire && L.fuel > 0;
  if (L.firing) { L.vx += Math.sin(L.tilt * D) * TUNE.thrust; L.vy -= Math.cos(L.tilt * D) * TUNE.thrust; L.fuel = Math.max(0, L.fuel - TUNE.burn); }
  L.vy += TUNE.gravity;
  L.vx += windAt(pad, L.t);
  L.x += L.vx; L.y += L.vy; L.t++;
  if (L.x < 5) { L.x = 5; L.vx = Math.max(0, L.vx); }                     // the edges of the screen hold it in
  if (L.x > 315) { L.x = 315; L.vx = Math.min(0, L.vx); }
  if (L.y < -60) { L.y = -60; L.vy = Math.max(0, L.vy); }
  const touch = [...feet(L), ...BODY.map((p) => at(L, p))].some(([px, py]) => py >= groundAt(gr, px));
  return touch ? judge(L, gr) : null;
}

/** On touching the ground: a landing, or a crash and why. */
export function judge(L, gr) {
  const S = TUNE.safe, f = feet(L);
  const onPad = f.every(([px]) => px >= gr.left && px <= gr.right);
  if (!onPad) return { landed: false, why: 'MISSED THE PAD' };
  if (Math.abs(L.tilt) > S.tilt) return { landed: false, why: 'LEANING TOO FAR' };
  if (L.vy > S.vy) return { landed: false, why: 'TOO FAST' };
  if (Math.abs(L.vx) > S.vx) return { landed: false, why: 'MOVING SIDEWAYS' };
  return { landed: true, why: '' };
}

/** Points for a landing: the base, fuel left, how near the middle, how soft. */
export function points(L, gr) {
  const P = TUNE.score, mid = (gr.left + gr.right) / 2, half = (gr.right - gr.left) / 2;
  const aim = Math.max(0, 1 - Math.abs(L.x - mid) / half), soft = Math.max(0, 1 - L.vy / TUNE.safe.vy);
  return { total: Math.round(P.land + L.fuel * P.fuel + aim * P.centre + soft * P.gentle), aim, soft };
}

/**
 * The autopilot, for the check (and for nobody else): climbs to clear the ground between it and the pad, flies
 * over, then comes down slowly, upright. Returns { turn, fire }, the same controls a player has.
 */
export function autopilot(L, pad, gr) {
  const T = TUNE, tx = (gr.left + gr.right) / 2, dx = tx - L.x, wind = windAt(pad, L.t);
  let top = 999;
  for (let x = Math.min(L.x, tx) - 10; x <= Math.max(L.x, tx) + 10; x++) top = Math.min(top, groundAt(gr, x));
  const over = Math.abs(dx) < Math.max(4, (gr.right - gr.left) / 2 - 7);
  const h = gr.padY - (L.y + 5);
  let vxT, vyT;
  if (!over) {
    const cruise = Math.min(L.y, top - 26);                                 // high enough over everything in the way
    vyT = Math.max(-0.6, Math.min(0.5, (cruise - L.y) * 0.04));
    vxT = Math.max(-1, Math.min(1, dx * 0.02));
    if (L.y > top - 18) vxT *= 0.2;                                         // climb first, then cross
  } else {
    vxT = Math.max(-0.25, Math.min(0.25, dx * 0.05));
    vyT = Math.max(0.12, Math.min(0.9, 0.12 + h * 0.011));
  }
  const fx = (vxT - L.vx) * 0.09 - wind, fy = (vyT - L.vy) * 0.09 - T.gravity;   // the push the engine should give
  let aim = fy < 0 ? Math.atan2(fx, -fy) / D : 0;
  aim = Math.max(-55, Math.min(55, aim));
  if (over && h < 16) aim = Math.max(-7, Math.min(7, aim));             // lean only a little near the pad (the safe lean is 9)
  const need = fy < 0 ? Math.hypot(fx, fy) : 0;
  const turn = aim > L.tilt + 1.2 ? 1 : aim < L.tilt - 1.2 ? -1 : 0;
  const fire = need > T.thrust * 0.45 && Math.abs(aim - L.tilt) < 30;
  return { turn, fire };
}
