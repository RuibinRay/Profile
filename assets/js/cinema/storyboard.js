/*
 * storyboard.js — the film, as data.
 *
 * One unit of time is one screen of scrolling (100vh). The whole journey is a single timeline:
 *
 *   CHAPTERS     the eight chapters, each with a length in screens. Their ids are the page's anchors
 *                (#about, #experience, #world, #projects, #energy, #skills, #contact).
 *   SHOTS        which painting is on stage, and where the camera is, at every moment.
 *                A camera key is { t, x, y, z, d, … }:
 *                  t      when, as [chapter id, screens into that chapter]
 *                  x, y   the point of the painting at the centre of the screen (0–1 across, 0–1 down)
 *                  z      zoom (1 = the painting just covers the screen)
 *                  d      dolly: how far the camera has pushed in; near layers spread apart from far ones (0–1.2)
 *                  ox, oy orbit: the camera steps sideways or up, so near things slide across far ones (−1…1)
 *                  f, b   focus: the depth that is sharp (0 far … 1 near) and how soft everything else gets (0–3)
 *                  dim    darkening behind text (0–0.6)
 *                  flow   speed of the paint in the sky and water (1 = normal)
 *                  glow   brightness of lights and stars (1 = as painted)
 *                  sat    saturation (1 = as painted)       ex   exposure (1 = as painted)
 *                  warm   colour temperature (−1 cool … 1 warm)
 *                A shot may name the painting's close-up (`detail`) that sharpens the region it zooms into.
 *   TRANSITIONS  how one painting becomes the next, and over which stretch of scroll. Each one grows out
 *                of something already in the picture:
 *                  portal   a ring of light opens from a point (a star, the tunnel's end)
 *                  star     the same, as a turning five-pointed star
 *                  lantern  a lantern's glow floods the frame and settles into daylight
 *                  brush    a loaded brush sweeps the new painting across the old one
 *                  petals   blossom blows across, each petal opening onto the new painting
 *                  swirl    the old painting winds up like a Van Gogh spiral and unwinds as the new one
 *                  pour     the new painting runs down the canvas like wet paint (gold turning to water)
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
  // 1. Home. The whole night; the camera drifts toward the seated figure, then racks focus to the star and flies into it.
  { id: 'night', painting: 'ocean', detail: 'star', keys: [
    k('home', 0.0, { x: 0.50, y: 0.50, z: 1.00, d: 0.0, dim: 0.10, px: 0.30, ox: -0.5, f: 0.62, b: 0 }),
    k('home', 0.8, { x: 0.47, y: 0.49, z: 1.10, d: 0.1, dim: 0.06, px: 0.30, ox: -0.15, f: 0.62, b: 0.9 }),
    k('home', 1.5, { x: 0.395, y: 0.47, z: 1.70, d: 0.3, dim: 0.0, glow: 1.2, ox: 0.25, f: 0.0, b: 2.2 }),
    k('home', 1.9, { x: 0.378, y: 0.46, z: 2.7, d: 0.45, glow: 1.5, ox: 0.1, f: 0.0, b: 2.6 }),
    k('about', 0.35, { x: 0.371, y: 0.458, z: 9.0, d: 0.7, glow: 2.0, f: 0.0, b: 2.6 })
  ] },
  // 2a. About. Out of the star into the sky beside the flying house; a slow arc round the house, then in toward it.
  { id: 'house', painting: 'house', detail: 'star', keys: [
    k('home', 1.9, { x: 0.72, y: 0.24, z: 3.2, d: 0.0, ex: 1.25 }),
    k('about', 0.35, { x: 0.56, y: 0.44, z: 1.22, d: 0.0, dim: 0.05, ox: -0.45 }),
    k('about', 0.9, { x: 0.50, y: 0.50, z: 1.04, d: 0.1, dim: 0.26, ox: -0.1, f: 0.45, b: 1.0 }),
    k('about', 1.55, { x: 0.50, y: 0.52, z: 1.22, d: 0.25, dim: 0.30, ox: 0.3, f: 0.45, b: 1.4 }),
    k('about', 2.0, { x: 0.50, y: 0.56, z: 1.6, d: 0.4, dim: 0.16, ox: 0.5, f: 0.45, b: 1.0 }),
    k('about', 2.65, { x: 0.52, y: 0.60, z: 2.0, d: 0.5, ox: 0.6 })
  ] },
  // 2b. The blossom tree: focus on the tree, then a pan to the mountains with the focus pulled out to them.
  { id: 'blossom', painting: 'blossom', detail: 'sun', keys: [
    k('about', 2.0, { x: 0.30, y: 0.62, z: 1.55, d: 0.0, ox: -0.5 }),
    k('about', 2.65, { x: 0.30, y: 0.58, z: 1.30, d: 0.1, dim: 0.26, ox: -0.3, f: 0.9, b: 1.2 }),
    k('about', 3.3, { x: 0.33, y: 0.60, z: 1.42, d: 0.25, dim: 0.30, ox: 0.0, f: 0.9, b: 1.6 }),
    k('about', 3.85, { x: 0.62, y: 0.40, z: 1.25, d: 0.2, dim: 0.34, ox: 0.4, f: 0.1, b: 1.6 }),
    k('about', 4.2, { x: 0.66, y: 0.30, z: 1.5, d: 0.3, dim: 0.2, ox: 0.5, f: 0.0, b: 1.2 }),
    k('experience', 0.3, { x: 0.69, y: 0.16, z: 3.4, d: 0.5, glow: 1.6 })
  ] },
  // 3. Experience. A slow walk past the lanterns from left to right; then up to one bright lantern and through its light.
  { id: 'lanterns', painting: 'lanterns', detail: 'gaze', keys: [
    k('about', 4.2, { x: 0.50, y: 0.45, z: 1.9, d: 0.0 }),
    k('experience', 0.3, { x: 0.42, y: 0.50, z: 1.15, d: 0.1, dim: 0.28, ox: -0.5, f: 0.9, b: 1.0 }),
    k('experience', 1.0, { x: 0.36, y: 0.42, z: 1.30, d: 0.3, dim: 0.40, ox: -0.3, f: 0.5, b: 1.5 }),
    k('experience', 2.5, { x: 0.50, y: 0.38, z: 1.36, d: 0.35, dim: 0.42, ox: 0.0, f: 0.5, b: 1.5 }),
    k('experience', 4.0, { x: 0.64, y: 0.36, z: 1.36, d: 0.3, dim: 0.40, ox: 0.35, f: 0.3, b: 1.5 }),
    k('experience', 4.2, { x: 0.62, y: 0.30, z: 1.5, d: 0.35, dim: 0.2, ox: 0.4, f: 0.5, b: 1.0 }),
    k('world', 0.35, { x: 0.60, y: 0.22, z: 4.5, d: 0.6, glow: 1.8, ex: 1.5 })
  ] },
  // 4. World. Out of the lantern's light into daylight; the camera arcs round the rider, opening the lake and the mountains,
  //    then climbs to the swirling sky.
  { id: 'yak', painting: 'yak', detail: 'sky', keys: [
    k('experience', 4.2, { x: 0.46, y: 0.40, z: 2.2, d: 0.0, ex: 1.6 }),
    k('world', 0.35, { x: 0.47, y: 0.50, z: 1.08, d: 0.1, dim: 0.12, ox: -0.9, f: 0.15, b: 0.8 }),
    k('world', 0.9, { x: 0.46, y: 0.46, z: 1.25, d: 0.3, dim: 0.24, ox: -0.2, f: 0.6, b: 1.4 }),
    k('world', 1.6, { x: 0.50, y: 0.30, z: 1.25, d: 0.2, dim: 0.50, ox: 0.5, f: 0.15, b: 1.2 }),
    k('world', 3.0, { x: 0.55, y: 0.26, z: 1.30, d: 0.2, dim: 0.52, ox: 0.9, f: 0.15, b: 1.2 }),
    k('world', 3.2, { x: 0.50, y: 0.15, z: 1.5, d: 0.2, dim: 0.3, ox: 0.6, f: 0.0, b: 0.6 }),
    k('projects', 0.3, { x: 0.44, y: 0.08, z: 3.0, d: 0.2 })
  ] },
  // 5. Projects. One long dolly down the spiral library toward the light at its end; the near shelves soften as they pass.
  { id: 'bookshop', painting: 'bookshop', detail: 'tunnel', keys: [
    k('world', 3.2, { x: 0.527, y: 0.468, z: 2.6, d: 0.0 }),
    k('projects', 0.3, { x: 0.50, y: 0.50, z: 1.05, d: 0.0, dim: 0.24, ox: -0.3 }),
    k('projects', 1.0, { x: 0.515, y: 0.48, z: 1.2, d: 0.25, dim: 0.42, f: 0.2, b: 0.8 }),
    k('projects', 5.0, { x: 0.527, y: 0.468, z: 2.4, d: 0.95, dim: 0.5, ox: 0.3, f: 0.1, b: 1.6 }),
    k('projects', 5.2, { x: 0.527, y: 0.468, z: 2.7, d: 1.0, dim: 0.3, f: 0.0, b: 1.2 }),
    k('energy', 0.35, { x: 0.527, y: 0.468, z: 7.5, d: 1.2, glow: 1.6, ex: 1.4 })
  ] },
  // 6. Energy. Out of the tunnel over the field; a low glide across the wheat in warm light.
  { id: 'field', painting: 'field', keys: [
    k('projects', 5.2, { x: 0.60, y: 0.40, z: 2.2, d: 0.0, ex: 1.5 }),
    k('energy', 0.35, { x: 0.50, y: 0.48, z: 1.05, d: 0.1, dim: 0.16, ox: -0.5, warm: 0.3 }),
    k('energy', 1.0, { x: 0.55, y: 0.50, z: 1.15, d: 0.25, dim: 0.30, ox: -0.2, f: 0.3, b: 1.0, warm: 0.3 }),
    k('energy', 2.0, { x: 0.60, y: 0.50, z: 1.22, d: 0.35, dim: 0.44, ox: 0.2, f: 0.5, b: 1.2, warm: 0.35 }),
    k('energy', 3.6, { x: 0.45, y: 0.54, z: 1.28, d: 0.4, dim: 0.44, ox: 0.5, f: 0.5, b: 1.2, warm: 0.4 }),
    k('energy', 3.75, { x: 0.45, y: 0.56, z: 1.3, d: 0.4, dim: 0.25, ox: 0.4, b: 0.6, warm: 0.45 }),
    k('skills', 0.3, { x: 0.45, y: 0.66, z: 1.6, d: 0.5, warm: 0.5 })
  ] },
  // 7. Skills. Down the terraces with the water, then a tilt up from the pools to the stars.
  { id: 'terraces', painting: 'terraces', detail: 'star', keys: [
    k('energy', 3.75, { x: 0.50, y: 0.60, z: 1.5, d: 0.0 }),
    k('skills', 0.3, { x: 0.50, y: 0.55, z: 1.08, d: 0.1, dim: 0.22, ox: -0.4 }),
    k('skills', 1.1, { x: 0.44, y: 0.58, z: 1.3, d: 0.3, dim: 0.46, ox: -0.1, f: 0.5, b: 1.2 }),
    k('skills', 2.6, { x: 0.60, y: 0.66, z: 1.35, d: 0.35, dim: 0.48, ox: 0.3, f: 0.65, b: 1.2 }),
    k('skills', 3.1, { x: 0.62, y: 0.30, z: 1.3, d: 0.2, dim: 0.34, ox: 0.2, f: 0.0, b: 1.4 }),
    k('skills', 3.3, { x: 0.60, y: 0.12, z: 1.6, d: 0.2, dim: 0.1, f: 0.0, b: 0.8 }),
    k('contact', 0.35, { x: 0.585, y: 0.045, z: 6.0, d: 0.2, glow: 1.8 })
  ] },
  // 8. Contact. Back through a star to the night ocean; the camera pulls out to the whole sky, where every
  //    star is a way to get in touch, and on to the first frame.
  { id: 'return', painting: 'ocean', detail: 'spiral', keys: [
    k('skills', 3.3, { x: 0.49, y: 0.30, z: 3.2, d: 0.0, glow: 1.5 }),
    k('contact', 0.35, { x: 0.50, y: 0.30, z: 1.20, d: 0.1, dim: 0.22, glow: 1.6, sat: 1.12 }),
    k('contact', 1.0, { x: 0.50, y: 0.40, z: 1.06, d: 0.12, dim: 0.30, glow: 1.6, sat: 1.12 }),
    k('contact', 2.0, { x: 0.50, y: 0.48, z: 1.02, d: 0.08, dim: 0.34, glow: 1.5, sat: 1.1, px: 0.30 }),
    k('contact', 2.8, { x: 0.50, y: 0.50, z: 1.00, d: 0.0, dim: 0.36, glow: 1.5, sat: 1.1, px: 0.30 })
  ] }
];

// `a` and `b` name anchors (assets/paintings/manifest.json) in the outgoing and incoming painting:
// the light opens from `a`, and the new painting is first seen around `b`. `edge` is the colour of
// the transition's leading edge at its start and at its end.
export const TRANSITIONS = [
  { from: 'night',    to: 'house',    type: 'portal',  a: 'star',   b: 'star',   span: [T('home', 1.9),       T('about', 0.35)],      edge: ['#fff1c2', '#f9c84a'] },
  { from: 'house',    to: 'blossom',  type: 'brush',   dir: [1, 0.18],           span: [T('about', 2.0),      T('about', 2.65)],      edge: ['#f9c84a', '#ffb3cd'] },
  { from: 'blossom',  to: 'lanterns', type: 'petals',  dir: [1, 0.35],           span: [T('about', 4.2),      T('experience', 0.3)],  edge: ['#ff9dc0', '#ffcf7a'] },
  { from: 'lanterns', to: 'yak',      type: 'lantern', a: 'gaze',   b: 'rider',  span: [T('experience', 4.2), T('world', 0.35)],      edge: ['#ffcf7a', '#fff6e0'] },
  { from: 'yak',      to: 'bookshop', type: 'swirl',   a: 'sky',    b: 'tunnel', span: [T('world', 3.2),      T('projects', 0.3)],    edge: ['#ffffff', '#f9c84a'] },
  { from: 'bookshop', to: 'field',    type: 'portal',  a: 'tunnel', b: 'sun',    span: [T('projects', 5.2),   T('energy', 0.35)],     edge: ['#ffe9a8', '#f9c84a'] },
  { from: 'field',    to: 'terraces', type: 'pour',    dir: [0.12, 1],           span: [T('energy', 3.75),    T('skills', 0.3)],      edge: ['#f6c443', '#7fdbe6'] },
  { from: 'terraces', to: 'return',   type: 'star',    a: 'star',   b: 'spiral', span: [T('skills', 3.3),     T('contact', 0.35)],    edge: ['#fff6d6', '#f6c443'] }
];
// the lighter stage knows three ways to change pictures; every transition belongs to one of them
const FAMILY = { portal: 'portal', star: 'portal', lantern: 'portal', swirl: 'swirl', brush: 'wipe', pour: 'wipe', petals: 'wipe' };

SHOTS.forEach((s, i) => { s.index = i; s.in = s.keys[0].t; s.out = s.keys[s.keys.length - 1].t; });
TRANSITIONS.forEach((tr) => {
  tr.A = SHOTS.find((s) => s.id === tr.from);
  tr.B = SHOTS.find((s) => s.id === tr.to);
  tr.family = FAMILY[tr.type] || 'wipe';
});

// Paintings the story still needs. Until they are supplied the chapter uses the paintings above and
// the real photographs; the draft view (?draft) marks the slots.
export const AWAITING = [
  { id: 'costa-rica', chapter: 'about', note: 'a painting of Costa Rica for “Where my story begins”' },
  { id: 'boston', chapter: 'about', note: 'a painting of Boston for “Where my story begins”' }
];

/* ---------- reading the storyboard ---------- */
const DEF = { x: 0.5, y: 0.5, z: 1, d: 0, dim: 0, flow: 1, glow: 1, sat: 1, r: 0, ox: 0, oy: 0, f: 0.5, b: 0, ex: 1, warm: 0 };
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
