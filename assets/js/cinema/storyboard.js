/*
 * storyboard.js — the film, as data.
 *
 * One unit of time is one screen of scrolling (100vh). The whole journey is a single timeline:
 *
 *   CHAPTERS     the eight chapters, each with a length in screens. Their ids are the page's anchors
 *                (#about, #experience, #world, #projects, #energy, #skills, #contact).
 *   SHOTS        which painting is on stage, and where the camera is, at every moment.
 *                A camera key is { t, x, y, z, d, dim, … }:
 *                  t      when, as [chapter id, screens into that chapter]
 *                  x, y   the point of the painting at the centre of the screen (0–1 across, 0–1 down)
 *                  z      zoom (1 = the painting just covers the screen)
 *                  d      depth push: how far the foreground has moved toward the viewer (0–1.2)
 *                  dim    darkening behind text (0–0.6)
 *                  flow   speed of the paint in the sky and water (1 = normal)
 *                  glow   brightness of lights and stars (1 = as painted)
 *                  sat    saturation (1 = as painted)
 *   TRANSITIONS  how one painting becomes the next, and over which stretch of scroll.
 *                  portal  a ring of light opens from a point (a star, a lantern, the tunnel's end)
 *                  brush   a loaded brush sweeps the new painting across the old one
 *                  swirl   the old painting winds up like a Van Gogh spiral and unwinds as the new one
 *                  pour    the new painting runs down the canvas like wet paint
 *
 * Everything on screen is a function of the scroll position, so scrolling back plays the film in reverse.
 * docs/STORYBOARD.md describes the same thing in words.
 */

export const CHAPTERS = [
  { id: 'home',       nav: 'Home',       title: 'Enter the Painting',                 len: 2.4, land: 0,    painting: 'ocean',    blurb: 'A night sky over the ocean, and a name' },
  { id: 'about',      nav: 'About',      title: 'Where My Story Begins',              len: 4.6, land: 0.8,  painting: 'house',    blurb: 'Costa Rica, China, Boston and three languages' },
  { id: 'experience', nav: 'Experience', title: 'My Journey',                         len: 4.6, land: 0.65, painting: 'lanterns', blurb: 'Every job, school and milestone since 2020' },
  { id: 'world',      nav: 'World',      title: 'The World I’ve Explored',            len: 3.6, land: 0.7,  painting: 'yak',      blurb: 'A painted globe, five countries and their photographs' },
  { id: 'projects',   nav: 'Projects',   title: 'Gallery of Creations',               len: 5.6, land: 0.65, painting: 'bookshop', blurb: 'Every project, from live websites to finance models' },
  { id: 'energy',     nav: 'Energy',     title: 'Energy and International Business',  len: 4.2, land: 0.7,  painting: 'field',    blurb: 'A summer of flow batteries and overseas markets' },
  { id: 'skills',     nav: 'Skills',     title: 'My Palette of Skills',               len: 3.8, land: 0.7,  painting: 'terraces', blurb: 'Skills, tools, languages and certificates' },
  { id: 'contact',    nav: 'Contact',    title: 'Beyond the Horizon',                 len: 2.8, land: 1.95, painting: 'ocean',    blurb: 'Email, LinkedIn, GitHub and my résumé' }
];

let acc = 0;
export const START = {};
CHAPTERS.forEach((c) => { c.start = acc; START[c.id] = acc; acc += c.len; c.end = acc; });
export const TOTAL = acc;

/** Global time of a point `t` screens into chapter `id`. */
export const T = (id, t = 0) => START[id] + t;
const k = (id, t, cam) => Object.assign({ t: T(id, t) }, cam);

export const SHOTS = [
  { id: 'night', painting: 'ocean', keys: [
    k('home', 0.0, { x: 0.50, y: 0.47, z: 1.00, d: 0.0, dim: 0.10, px: 0.34 }),
    k('home', 0.8, { x: 0.47, y: 0.46, z: 1.10, d: 0.1, dim: 0.06, px: 0.34 }),
    k('home', 1.5, { x: 0.40, y: 0.44, z: 1.70, d: 0.3, dim: 0.0, glow: 1.2 }),
    k('home', 1.9, { x: 0.385, y: 0.432, z: 2.7, d: 0.45, glow: 1.5 }),
    k('about', 0.35, { x: 0.376, y: 0.430, z: 9.0, d: 0.7, glow: 2.0 })
  ] },
  { id: 'house', painting: 'house', keys: [
    k('home', 1.9, { x: 0.72, y: 0.24, z: 3.2, d: 0.0 }),
    k('about', 0.35, { x: 0.56, y: 0.44, z: 1.22, d: 0.0, dim: 0.05 }),
    k('about', 0.9, { x: 0.50, y: 0.50, z: 1.04, d: 0.1, dim: 0.26 }),
    k('about', 1.55, { x: 0.50, y: 0.52, z: 1.22, d: 0.25, dim: 0.30 }),
    k('about', 2.0, { x: 0.50, y: 0.56, z: 1.6, d: 0.4, dim: 0.16 }),
    k('about', 2.65, { x: 0.52, y: 0.60, z: 2.0, d: 0.5 })
  ] },
  { id: 'blossom', painting: 'blossom', keys: [
    k('about', 2.0, { x: 0.30, y: 0.62, z: 1.55, d: 0.0 }),
    k('about', 2.65, { x: 0.30, y: 0.58, z: 1.30, d: 0.1, dim: 0.26 }),
    k('about', 3.3, { x: 0.33, y: 0.60, z: 1.42, d: 0.25, dim: 0.30 }),
    k('about', 3.85, { x: 0.62, y: 0.40, z: 1.25, d: 0.2, dim: 0.34 }),
    k('about', 4.2, { x: 0.66, y: 0.30, z: 1.5, d: 0.3, dim: 0.2 }),
    k('experience', 0.3, { x: 0.69, y: 0.16, z: 3.4, d: 0.5, glow: 1.6 })
  ] },
  { id: 'lanterns', painting: 'lanterns', keys: [
    k('about', 4.2, { x: 0.50, y: 0.45, z: 1.9, d: 0.0 }),
    k('experience', 0.3, { x: 0.42, y: 0.50, z: 1.15, d: 0.1, dim: 0.28 }),
    k('experience', 1.0, { x: 0.36, y: 0.42, z: 1.30, d: 0.3, dim: 0.40 }),
    k('experience', 2.5, { x: 0.50, y: 0.38, z: 1.36, d: 0.35, dim: 0.42 }),
    k('experience', 4.0, { x: 0.64, y: 0.36, z: 1.36, d: 0.3, dim: 0.40 }),
    k('experience', 4.2, { x: 0.62, y: 0.30, z: 1.5, d: 0.35, dim: 0.2 }),
    k('world', 0.35, { x: 0.60, y: 0.22, z: 4.5, d: 0.6, glow: 1.8 })
  ] },
  { id: 'yak', painting: 'yak', keys: [
    k('experience', 4.2, { x: 0.46, y: 0.40, z: 2.2, d: 0.0 }),
    k('world', 0.35, { x: 0.47, y: 0.50, z: 1.08, d: 0.1, dim: 0.12 }),
    k('world', 0.9, { x: 0.46, y: 0.46, z: 1.25, d: 0.3, dim: 0.24 }),
    k('world', 1.6, { x: 0.50, y: 0.30, z: 1.25, d: 0.2, dim: 0.50 }),
    k('world', 3.0, { x: 0.55, y: 0.26, z: 1.30, d: 0.2, dim: 0.52 }),
    k('world', 3.2, { x: 0.50, y: 0.15, z: 1.5, d: 0.2, dim: 0.3 }),
    k('projects', 0.3, { x: 0.44, y: 0.08, z: 3.0, d: 0.2 })
  ] },
  { id: 'bookshop', painting: 'bookshop', keys: [
    k('world', 3.2, { x: 0.527, y: 0.468, z: 2.6, d: 0.0 }),
    k('projects', 0.3, { x: 0.50, y: 0.50, z: 1.05, d: 0.0, dim: 0.24 }),
    k('projects', 1.0, { x: 0.515, y: 0.48, z: 1.2, d: 0.25, dim: 0.42 }),
    k('projects', 5.0, { x: 0.527, y: 0.468, z: 2.4, d: 0.95, dim: 0.5 }),
    k('projects', 5.2, { x: 0.527, y: 0.468, z: 2.7, d: 1.0, dim: 0.3 }),
    k('energy', 0.35, { x: 0.527, y: 0.468, z: 7.5, d: 1.2, glow: 1.6 })
  ] },
  { id: 'field', painting: 'field', keys: [
    k('projects', 5.2, { x: 0.60, y: 0.40, z: 2.2, d: 0.0 }),
    k('energy', 0.35, { x: 0.50, y: 0.48, z: 1.05, d: 0.1, dim: 0.16 }),
    k('energy', 1.0, { x: 0.55, y: 0.50, z: 1.15, d: 0.25, dim: 0.30 }),
    k('energy', 2.0, { x: 0.60, y: 0.50, z: 1.22, d: 0.35, dim: 0.44 }),
    k('energy', 3.6, { x: 0.45, y: 0.54, z: 1.28, d: 0.4, dim: 0.44 }),
    k('energy', 3.75, { x: 0.45, y: 0.56, z: 1.3, d: 0.4, dim: 0.25 }),
    k('skills', 0.3, { x: 0.45, y: 0.66, z: 1.6, d: 0.5 })
  ] },
  { id: 'terraces', painting: 'terraces', keys: [
    k('energy', 3.75, { x: 0.50, y: 0.60, z: 1.5, d: 0.0 }),
    k('skills', 0.3, { x: 0.50, y: 0.55, z: 1.08, d: 0.1, dim: 0.22 }),
    k('skills', 1.1, { x: 0.48, y: 0.62, z: 1.3, d: 0.3, dim: 0.46 }),
    k('skills', 2.6, { x: 0.56, y: 0.60, z: 1.35, d: 0.35, dim: 0.48 }),
    k('skills', 3.1, { x: 0.62, y: 0.30, z: 1.3, d: 0.2, dim: 0.34 }),
    k('skills', 3.3, { x: 0.60, y: 0.12, z: 1.6, d: 0.2, dim: 0.1 }),
    k('contact', 0.35, { x: 0.585, y: 0.045, z: 6.0, d: 0.2, glow: 1.8 })
  ] },
  { id: 'return', painting: 'ocean', keys: [
    k('skills', 3.3, { x: 0.53, y: 0.29, z: 3.2, d: 0.0, glow: 1.5 }),
    k('contact', 0.35, { x: 0.50, y: 0.28, z: 1.34, d: 0.1, dim: 0.28, glow: 1.6, sat: 1.12 }),
    k('contact', 1.3, { x: 0.50, y: 0.30, z: 1.2, d: 0.15, dim: 0.38, glow: 1.6, sat: 1.12 }),
    k('contact', 2.0, { x: 0.50, y: 0.44, z: 1.06, d: 0.1, dim: 0.40, glow: 1.4, sat: 1.1, px: 0.34 }),
    k('contact', 2.8, { x: 0.50, y: 0.47, z: 1.00, d: 0.0, dim: 0.46, glow: 1.4, sat: 1.1, px: 0.34 })
  ] }
];

// `a` and `b` name anchors (assets/paintings/manifest.json) in the outgoing and incoming painting:
// the light opens from `a`, and the new painting is first seen around `b`.
export const TRANSITIONS = [
  { from: 'night',    to: 'house',    type: 'portal', a: 'star',   b: 'star',   span: [T('home', 1.9),       T('about', 0.35)] },
  { from: 'house',    to: 'blossom',  type: 'brush',  dir: [1, 0.18],           span: [T('about', 2.0),      T('about', 2.65)] },
  { from: 'blossom',  to: 'lanterns', type: 'swirl',  a: 'sun',    b: 'vanish', span: [T('about', 4.2),      T('experience', 0.3)] },
  { from: 'lanterns', to: 'yak',      type: 'portal', a: 'gaze',   b: 'rider',  span: [T('experience', 4.2), T('world', 0.35)] },
  { from: 'yak',      to: 'bookshop', type: 'swirl',  a: 'sky',    b: 'tunnel', span: [T('world', 3.2),      T('projects', 0.3)] },
  { from: 'bookshop', to: 'field',    type: 'portal', a: 'tunnel', b: 'sun',    span: [T('projects', 5.2),   T('energy', 0.35)] },
  { from: 'field',    to: 'terraces', type: 'pour',   dir: [0.12, 1],           span: [T('energy', 3.75),    T('skills', 0.3)] },
  { from: 'terraces', to: 'return',   type: 'portal', a: 'star',   b: 'spiral', span: [T('skills', 3.3),     T('contact', 0.35)] }
];

SHOTS.forEach((s, i) => { s.index = i; s.in = s.keys[0].t; s.out = s.keys[s.keys.length - 1].t; });
TRANSITIONS.forEach((tr) => {
  tr.A = SHOTS.find((s) => s.id === tr.from);
  tr.B = SHOTS.find((s) => s.id === tr.to);
});

// Paintings the story still needs. Until they are supplied the chapter uses the paintings above and
// the real photographs; the draft view (?draft) marks the slots.
export const AWAITING = [
  { id: 'costa-rica', chapter: 'about', note: 'a painting of Costa Rica for “Where my story begins”' },
  { id: 'boston', chapter: 'about', note: 'a painting of Boston for “Where my story begins”' }
];

/* ---------- reading the storyboard ---------- */
const DEF = { x: 0.5, y: 0.5, z: 1, d: 0, dim: 0, flow: 1, glow: 1, sat: 1, r: 0 };
const PROPS = Object.keys(DEF);
// On a tall (portrait) screen only a slice of each painting fits, so a key may carry its own framing
// for phones: px, py, pz replace x, y, z there.
let PORTRAIT = false;
export function setPortrait(on) { PORTRAIT = !!on; }
const val = (key, p) => {
  if (PORTRAIT && key['p' + p] != null) return key['p' + p];
  return key[p] == null ? DEF[p] : key[p];
};

/** The camera of a shot at time t: a smooth path through its keys (zoom is eased in log space). */
export function cameraAt(shot, t, out) {
  const keys = shot.keys, n = keys.length;
  out = out || {};
  let i = 0;
  while (i < n - 2 && t > keys[i + 1].t) i++;
  const a = keys[i], b = keys[i + 1];
  const p0 = keys[Math.max(0, i - 1)], p3 = keys[Math.min(n - 1, i + 2)];
  let u = (t - a.t) / Math.max(1e-6, b.t - a.t);
  u = Math.min(1, Math.max(0, u));
  const u2 = u * u, u3 = u2 * u;
  for (const p of PROPS) {
    let v0 = val(p0, p), v1 = val(a, p), v2 = val(b, p), v3 = val(p3, p);
    if (p === 'z') { v0 = Math.log(v0); v1 = Math.log(v1); v2 = Math.log(v2); v3 = Math.log(v3); }
    // Catmull–Rom with the tangents scaled to the real spacing of the keys, and clamped so the path never overshoots
    const dt = b.t - a.t;
    let m1 = (v2 - v0) / Math.max(1e-6, b.t - p0.t) * dt, m2 = (v3 - v1) / Math.max(1e-6, p3.t - a.t) * dt;
    if (i === 0) m1 = v2 - v1;
    if (i === n - 2) m2 = v2 - v1;
    const lim = 3 * Math.abs(v2 - v1);
    if ((v2 - v1) * m1 <= 0) m1 = 0; else m1 = Math.sign(m1) * Math.min(Math.abs(m1), lim);
    if ((v2 - v1) * m2 <= 0) m2 = 0; else m2 = Math.sign(m2) * Math.min(Math.abs(m2), lim);
    let v = (2 * u3 - 3 * u2 + 1) * v1 + (u3 - 2 * u2 + u) * m1 + (-2 * u3 + 3 * u2) * v2 + (u3 - u2) * m2;
    out[p] = p === 'z' ? Math.exp(v) : v;
  }
  return out;
}

/** What is on stage at time t: one shot, or two shots and how far the transition between them has run. */
export function sceneAt(t) {
  for (const tr of TRANSITIONS) {
    if (t >= tr.span[0] && t <= tr.span[1]) {
      const m = (t - tr.span[0]) / (tr.span[1] - tr.span[0]);
      return { a: tr.A, b: tr.B, tr, mix: m };
    }
  }
  let shot = SHOTS[0];
  for (const s of SHOTS) if (t >= s.in) shot = s;
  return { a: shot, b: null, tr: null, mix: 0 };
}

export function chapterAt(t) {
  let c = CHAPTERS[0];
  for (const ch of CHAPTERS) if (t >= ch.start - 1e-4) c = ch;
  return c;
}
