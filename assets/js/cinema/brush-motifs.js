/*
 * brush-motifs.js — what the painter's brush paints into the paintings, stroke by stroke.
 *
 * A motif is one passage of Van Gogh's handwriting: the turning vortex of short strokes in the sky of
 * The Starry Night, the rings of light around a star or the moon, a stream of wind, wheat flicked
 * upward, blossom dabbed on, ripples laid across water. Each is generated here as an ordered list of
 * strokes ("dashes") in the painting's own coordinates, and each stroke is given the moment of the
 * film when the brush lays it down. Everything is a pure function of the film's time: scrolling back
 * lifts the paint off again, stroke by stroke.
 *
 * Coordinates: x across the painting (0–1), y down it (0–1). Lengths and widths are in units of the
 * painting's height, so a stroke keeps its shape whatever the painting's proportions.
 *
 * A motif is only ever placed where the film's words are not, and mostly over sky that already swirls,
 * so the new paint joins the painting's own strokes rather than covering what it shows.
 */
import { PAINTINGS } from './manifest.js';
import { SHOTS } from './storyboard.js';

// The colours on the brush, from Van Gogh's palette as each painting uses it
const PAL = {
  night:  ['#1b3fa6', '#2f62d4', '#5f9fe8', '#a8d0f4', '#e9f4ff', '#f3df7a'],
  star:   ['#fff7cf', '#fae37a', '#f6c443', '#e6f0a2', '#c2e4ef', '#86b9ea'],
  moon:   ['#fff4c0', '#f8da50', '#f3c233', '#ffe98e', '#dcecab', '#aacdf0'],
  violet: ['#5b40b2', '#7f65d8', '#b4a3f0', '#e8e2ff', '#3c58ca', '#f3d46c'],
  petal:  ['#ff9ec4', '#ffc7dd', '#fff1f6', '#f47aa8', '#ffe2ed'],
  sun:    ['#fff4b2', '#ffda5c', '#f6ba3c', '#ffeaa2', '#faf4da', '#f2a33a'],
  lamp:   ['#ffd37b', '#ffb448', '#fff1c3', '#f6a02b', '#ffe8a9'],
  cloud:  ['#ffffff', '#e9f4ff', '#bad9f6', '#80b1e7', '#fdf7d9'],
  gold:   ['#f6c443', '#ffda79', '#e9a43b', '#fff1c5', '#cf7f2c'],
  wheat:  ['#ffe58f', '#f7cf4f', '#fff4c6', '#eab33d', '#fbe9a6', '#d99a2b'],
  water:  ['#1d7f9c', '#3fb0c9', '#80dce7', '#c0f4f6', '#ffffff', '#e3fbff']
};

// How deep in each painting its new paint lies (0 = the far sky, 1 = the nearest thing): the paint
// moves with that depth when the camera dollies or orbits, so it stays on the part it was painted on.
export const PAINT_DEPTH = { ocean: 0.12, house: 0.12, blossom: 0.2, lanterns: 0.35, yak: 0.06, bookshop: 0.1, field: 0.55, terraces: 0.45 };

/*
 * The brush's work, in film time (screens of scrolling). The windows sit between the chapters' words:
 * the brush also writes each chapter's title (see brush.js), so it never has two jobs at once.
 */
export const MOTIFS = [
  // 1. The first painting: as the visitor starts to scroll, the brush turns the great vortex of the sky
  { shot: 'night', t: [0.04, 0.9], kind: 'swirl', c: [0.47, 0.27], r0: 0.03, r1: 0.135, turns: 1.5, lanes: 5, dir: 1, pal: PAL.night, w: 0.0125, len: 0.05, seed: 11 },
  //    and, as the camera closes on the brightest star, rings its light before flying into it
  { shot: 'night', t: [1.4, 1.86], kind: 'halo', c: [0.371, 0.458], r0: 0.062, r1: 0.094, rings: 4, pal: PAL.star, w: 0.0105, len: 0.03, seed: 12 },
  // 2. The flying house: rings of light round the crescent moon, then a violet eddy in the sky left of the
  //    balloons (the right is where chapter 2's words stand)
  { shot: 'house', t: [2.8, 3.12], kind: 'halo', c: [0.895, 0.14], r0: 0.122, r1: 0.146, rings: 3, pal: PAL.moon, w: 0.0115, len: 0.042, seed: 21 },
  { shot: 'house', t: [3.55, 4.18], kind: 'swirl', c: [0.335, 0.27], r0: 0.02, r1: 0.085, turns: 1.6, lanes: 4, dir: -1, pal: PAL.violet, w: 0.011, len: 0.04, seed: 22 },
  // 3. The blossom tree: petals blown off the crown on the wind, then the sun's rings as the camera reaches the peaks
  { shot: 'blossom', t: [5.12, 5.78], kind: 'flurry', from: [0.06, 0.3], to: [0.3, 0.7], n: 46, spread: 0.07, pal: PAL.petal, w: 0.013, len: 0.02, seed: 31 },
  { shot: 'blossom', t: [6.0, 6.5], kind: 'halo', c: [0.69, 0.15], r0: 0.07, r1: 0.1, rings: 4, pal: PAL.sun, w: 0.0105, len: 0.034, seed: 32 },
  // 4. The room of lanterns: no motif. There the brush paints the golden stroke the lanterns hang on
  //    (chapters/experience.js gives it that job).
  // 5. The yak rider: a cloud wound into a spiral in the sky above the rider (between the words and the globe)
  { shot: 'yak', t: [12.62, 13.3], kind: 'swirl', c: [0.49, 0.125], r0: 0.018, r1: 0.064, turns: 1.5, lanes: 4, dir: 1, pal: PAL.cloud, w: 0.011, len: 0.04, seed: 51 },
  // 6. The spiral library: the tunnel's rings traced in gold before the first canvas comes off its shelf
  { shot: 'bookshop', t: [15.5, 15.82], kind: 'swirl', c: [0.527, 0.468], r0: 0.05, r1: 0.2, turns: 1.25, lanes: 3, dir: 1, pal: PAL.gold, w: 0.012, len: 0.06, seed: 61 },
  // 7. The golden field: wheat flicked up across the field, then a cloud wound up in the open sky (the
  //    sun is behind the first card of chapter 6 at that moment)
  { shot: 'field', t: [21.84, 22.6], kind: 'flicks', rect: [0.5, 0.56, 0.96, 0.8], n: 96, ang: -Math.PI / 2, pal: PAL.wheat, w: 0.0095, len: 0.042, seed: 71 },
  { shot: 'field', t: [22.66, 23.1], kind: 'swirl', c: [0.447, 0.255], r0: 0.02, r1: 0.072, turns: 1.4, lanes: 4, dir: -1, pal: PAL.cloud, w: 0.0115, len: 0.042, seed: 72 },
  // 8. The white terraces: once the brush has laid the palette's colours (chapters/skills.js), an eddy
  //    turned in the turquoise water of a pool
  { shot: 'terraces', t: [27.05, 27.7], kind: 'swirl', c: [0.7, 0.84], r0: 0.018, r1: 0.07, turns: 1.5, lanes: 4, dir: 1, pal: PAL.water, w: 0.012, len: 0.042, seed: 81 },
  // 9. Back under the first sky: each star that is a way to get in touch gets its ring of light, in the
  //    order the stars wake (chapters/contact.js)
  { shot: 'return', t: [29.7, 30.44], kind: 'halos', stars: [
    ['star', 0.064, 0.08], ['moon', 0.122, 0.138], ['star2', 0.045, 0.058], ['star4', 0.04, 0.053],
    ['star7', 0.034, 0.046], ['star6', 0.04, 0.053], ['star3', 0.04, 0.053], ['star8', 0.034, 0.046]
  ], pal: PAL.star, w: 0.0085, len: 0.03, seed: 91 }
];

/* ------------------------------------------------------------------ generators */
function rng(seed) {
  let a = seed >>> 0;
  return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const hex = (c) => [parseInt(c.slice(1, 3), 16) / 255, parseInt(c.slice(3, 5), 16) / 255, parseInt(c.slice(5, 7), 16) / 255];
const pick = (pal, rnd, bias) => pal[Math.min(pal.length - 1, Math.max(0, Math.floor(bias != null ? bias + (rnd() - 0.5) * 2.2 : rnd() * pal.length)))];

// One dash: start point X, Y (height units, y down), direction a, length L, width w, curvature k
// (1 / radius; positive turns clockwise on screen), colour.
const dash = (X, Y, a, L, w, k, col) => ({ X, Y, a, L, w, k, col: hex(col) });

/** The turning vortex: a band of short strokes, several lanes wide, wound round a spiral from the
    outside in. The lanes are painted together, so the brush works across the band as it goes round. */
function swirl(m, ia, rnd) {
  const out = [], cx = m.c[0] * ia, cy = m.c[1], dir = m.dir || 1, lanes = m.lanes || 2, total = m.turns * Math.PI * 2;
  for (let l = 0; l < lanes; l++) {
    const off = (l - (lanes - 1) / 2) * m.w * 0.82;
    let swept = rnd() * 0.25;
    while (swept < total) {
      const u = swept / total, r = Math.max(0.008, m.r1 + (m.r0 - m.r1) * u + off + (rnd() - 0.5) * m.w * 0.5);
      const L = Math.min(m.len, Math.max(0.013, r * 0.6)) * (0.7 + rnd() * 0.6);
      const th = (m.th0 || 0) + dir * swept;
      const a = th + dir * Math.PI / 2 + (rnd() - 0.5) * 0.2 - dir * 0.06;
      const d = dash(cx + Math.cos(th) * r, cy + Math.sin(th) * r, a, L, m.w * (0.75 + rnd() * 0.5), dir / r * (0.8 + rnd() * 0.3),
        pick(m.pal, rnd, ((l * 1.7 + u * 1.5) % m.pal.length)));
      d.o = swept + l * 0.013;                    // painting order: round the spiral, across the band
      out.push(d);
      swept += (L * 0.74) / r;
    }
  }
  return out.sort((p, q) => p.o - q.o);
}

/** Rings of light round a star: closed circles of strokes, from the inside out. */
function halo(m, ia, rnd, cx0, cy0) {
  const out = [], cx = (cx0 != null ? cx0 : m.c[0]) * ia, cy = cy0 != null ? cy0 : m.c[1];
  const rings = m.rings || 2;
  for (let j = 0; j < rings; j++) {
    const r = m.r0 + (m.r1 - m.r0) * (rings > 1 ? j / (rings - 1) : 0);
    let th = rnd() * Math.PI * 2, swept = 0;
    // round the star once, in strokes of uneven length that overlap, each a little off the circle
    while (swept < Math.PI * 2) {
      const L = m.len * (0.6 + rnd() * 0.7), rr = r + (rnd() - 0.5) * m.w * 0.7;
      out.push(dash(cx + Math.cos(th) * rr, cy + Math.sin(th) * rr, th + Math.PI / 2 + (rnd() - 0.5) * 0.3, L, m.w * (0.75 + rnd() * 0.5),
        (1 / rr) * (0.7 + rnd() * 0.5), pick(m.pal, rnd, j * 1.3 + 0.3)));
      const step = (L * 0.78) / r;
      th += step; swept += step;
    }
  }
  return out;
}

/** Wheat flicked upward: short curved strokes across a field, swept left to right and up and down. */
function flicks(m, ia, rnd) {
  const out = [], [x0, y0, x1, y1] = m.rect;
  const cols = Math.max(4, Math.round(Math.sqrt(m.n * (x1 - x0) * ia / (y1 - y0))));
  const rows = Math.max(2, Math.round(m.n / cols));
  for (let c = 0; c < cols; c++) {
    for (let r0 = 0; r0 < rows; r0++) {
      const r = c % 2 ? rows - 1 - r0 : r0;
      const x = (x0 + (x1 - x0) * (c + 0.2 + rnd() * 0.6) / cols) * ia;
      const y = y0 + (y1 - y0) * (r + 0.25 + rnd() * 0.5) / rows;
      const a = m.ang + (rnd() - 0.5) * 0.5 + 0.12;
      out.push(dash(x, y, a, m.len * (0.8 + rnd() * 0.45) * (0.75 + 0.5 * (y - y0) / (y1 - y0)), m.w * (0.8 + rnd() * 0.35), (rnd() < 0.5 ? -1 : 1) * (6 + rnd() * 9), pick(m.pal, rnd)));
    }
  }
  return out;
}

/** Petals on the wind: short, sharply curled strokes scattered along a drifting path. */
function flurry(m, ia, rnd) {
  const out = [];
  for (let i = 0; i < m.n; i++) {
    const u = i / (m.n - 1), wob = Math.sin(u * Math.PI * 3) * m.spread * 0.5;
    const x = (m.from[0] + (m.to[0] - m.from[0]) * u) * ia + (rnd() - 0.5) * m.spread * 1.6;
    const y = m.from[1] + (m.to[1] - m.from[1]) * u + wob + (rnd() - 0.5) * m.spread;
    const a = rnd() * Math.PI * 2;
    out.push(dash(x, y, a, m.len * (0.7 + rnd() * 0.6), m.w * (0.8 + rnd() * 0.5), (rnd() < 0.5 ? -1 : 1) * (55 + rnd() * 50), pick(m.pal, rnd)));
  }
  return out;
}

/** Blossom dabbed on: little five-petalled flowers, each with a warm dot at its heart. */
function dabs(m, ia, rnd) {
  const out = [], spots = [];
  for (let i = 0; i < m.n; i++) {
    const a = rnd() * Math.PI * 2, d = Math.sqrt(rnd()) * m.r;
    spots.push([m.c[0] * ia + Math.cos(a) * d * 1.25, m.c[1] + Math.sin(a) * d * 0.8]);
  }
  spots.sort((p, q) => p[0] - q[0]);
  spots.forEach(([x, y]) => {
    const base = rnd() * Math.PI * 2, col = pick(m.pal, rnd), s = 0.8 + rnd() * 0.5;
    for (let k = 0; k < 5; k++) {
      const a = base + (k * Math.PI * 2) / 5;
      out.push(dash(x + Math.cos(a) * m.w * 0.4, y + Math.sin(a) * m.w * 0.4, a, m.len * s, m.w * s, (rnd() - 0.5) * 20, k === 0 ? col : pick(m.pal, rnd)));
    }
    out.push(dash(x - m.w * 0.25, y, 0, m.w * 0.5, m.w * 0.75 * s, 0, '#ffd75e'));
  });
  return out;
}

/** Ripples laid across water: rows of strokes along a gentle wave, the brush going back and forth. */
function ripple(m, ia, rnd) {
  const out = [], [x0, y0, x1, y1] = m.rect;
  for (let r = 0; r < m.rows; r++) {
    const yr = y0 + (y1 - y0) * (m.rows > 1 ? r / (m.rows - 1) : 0.5), ph = rnd() * 6.28, fwd = r % 2 === 0;
    const Wd = (x1 - x0) * ia, f = (m.waves * Math.PI * 2) / Wd;
    let s = 0;
    const pts = [];
    while (s < Wd) { pts.push(s); s += m.len * (0.95 + rnd() * 0.2); }
    (fwd ? pts : pts.slice().reverse()).forEach((sx) => {
      const X = x0 * ia + sx + (fwd ? 0 : m.len), Y = yr + Math.sin(sx * f + ph) * m.amp;
      const slope = Math.atan(Math.cos(sx * f + ph) * m.amp * f) * (fwd ? 1 : -1);
      const a = (fwd ? 0 : Math.PI) + slope;
      out.push(dash(X, Y, a, m.len * (0.85 + rnd() * 0.2), m.w * (0.8 + rnd() * 0.4), (fwd ? -1 : 1) * Math.sin(sx * f + ph) * m.amp * f * f * 0.6, pick(m.pal, rnd, r * 1.2)));
    });
  }
  return out;
}

/* ------------------------------------------------------------------ the whole of the brush's work */
/** There is one brush: a motif's moment gives way to the words being written and the transitions being
    ridden (`busy`: [from, to] in film time). It keeps its length where it can and moves as little as it can. */
function fit(t, busy) {
  const len = t[1] - t[0], lo = t[0] - 0.45, hi = t[1] + 0.45, pad = 0.02;
  const cuts = busy.filter((b) => b[1] > lo && b[0] < hi).map((b) => [b[0] - pad, b[1] + pad]).sort((a, b) => a[0] - b[0]);
  const free = [];
  let p = lo;
  cuts.forEach((c) => { if (c[0] > p) free.push([p, c[0]]); p = Math.max(p, c[1]); });
  if (p < hi) free.push([p, hi]);
  let best = null, score = -Infinity;
  free.forEach((f) => {
    const L = Math.min(len, f[1] - f[0]);
    if (L < 0.14) return;
    const start = Math.min(Math.max(t[0], f[0]), f[1] - L);
    const sc = L / len - Math.abs(start - t[0]) * 1.6;          // rather shorter than far from its moment
    if (sc > score) { score = sc; best = [start, start + L]; }
  });
  return best;                                                   // null: no room for it at all
}

/**
 * Builds every stroke once. Returns, per painting, the strokes in the order they are painted (for the
 * renderers) and, per motif, an "act" the brush follows: which strokes, and when. `busy` lists the
 * moments the brush is taken (writing, riding a transition): motifs are moved clear of them.
 */
export function buildBrushwork(busy = []) {
  const byPainting = {}, acts = [], taken = busy.slice();
  const shotOf = (id) => SHOTS.find((s) => s.id === id);
  MOTIFS.forEach((m) => {
    const shot = shotOf(m.shot); if (!shot) return;
    const p = PAINTINGS[shot.painting]; if (!p) return;
    const ia = p.aspect, rnd = rng(m.seed || 1);
    let list = [];
    if (m.kind === 'swirl') list = swirl(m, ia, rnd);
    else if (m.kind === 'halo') list = halo(m, ia, rnd);
    else if (m.kind === 'flicks') list = flicks(m, ia, rnd);
    else if (m.kind === 'dabs') list = dabs(m, ia, rnd);
    else if (m.kind === 'flurry') list = flurry(m, ia, rnd);
    else if (m.kind === 'ripple') list = ripple(m, ia, rnd);
    else if (m.kind === 'halos') {
      m.stars.forEach(([name, r0, r1]) => {
        const at = p.anchors[name]; if (!at) return;
        list = list.concat(halo({ r0, r1, rings: 2, len: m.len, w: m.w, pal: m.pal }, ia, rnd, at[0], at[1]));
      });
    }
    if (!list.length) return;
    // the strokes share the motif's window; each takes a little longer than its turn, so the next one
    // starts while the last is still being finished
    const win = fit(m.t, taken);
    if (!win) return;                                            // the brush is busy throughout: leave it out
    taken.push(win);
    const n = list.length, slot = (win[1] - win[0]) / (n + 0.15);
    list.forEach((d, i) => { d.b = win[0] + i * slot; d.d = slot * 1.15; });
    const bucket = byPainting[shot.painting] || (byPainting[shot.painting] = { painting: shot.painting, ia, depth: PAINT_DEPTH[shot.painting] || 0.15, dashes: [], first: Infinity });
    bucket.dashes = bucket.dashes.concat(list);
    bucket.first = Math.min(bucket.first, win[0]);
    acts.push({ kind: 'paint', shot: m.shot, painting: shot.painting, ia, t0: win[0], t1: win[1], dashes: list, slot });
  });
  Object.keys(byPainting).forEach((id) => byPainting[id].dashes.sort((a, b) => a.b - b.b));
  acts.sort((a, b) => a.t0 - b.t0);
  return { byPainting, acts };
}

/** Where along stroke d the paint has reached at length l (height units): the point and its direction. */
export function alongDash(d, l) {
  const k = d.k;
  if (Math.abs(k) < 1e-4) return { X: d.X + Math.cos(d.a) * l, Y: d.Y + Math.sin(d.a) * l, a: d.a };
  const a1 = d.a + k * l;
  return { X: d.X + (Math.sin(a1) - Math.sin(d.a)) / k, Y: d.Y + (Math.cos(d.a) - Math.cos(a1)) / k, a: a1 };
}
