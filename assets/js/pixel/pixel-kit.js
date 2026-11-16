/*
 * pixel-kit.js — the pixel world's shared pieces, used by the film's gallery (the planet at the end of
 * Digital Creations) and by the games page (games.html).
 *
 *   pixelText(str, opts)   a line of text set in a 5 × 7 bitmap font, as crisp SVG squares at any size
 *   createPlanet(host, o)  a pixel planet that turns by itself and can be spun by dragging: one biome
 *                          for each game, lit and dithered like a sprite
 *
 * Nothing here is downloaded: the font is the table below and the planet is generated from a seed.
 */

/* ------------------------------------------------------------------ the font: 5 wide, 7 tall */
const G = {
  A: '.###./#...#/#...#/#####/#...#/#...#/#...#', B: '####./#...#/#...#/####./#...#/#...#/####.', C: '.###./#...#/#..../#..../#..../#...#/.###.',
  D: '####./#...#/#...#/#...#/#...#/#...#/####.', E: '#####/#..../#..../####./#..../#..../#####', F: '#####/#..../#..../####./#..../#..../#....',
  G: '.###./#...#/#..../#.###/#...#/#...#/.###.', H: '#...#/#...#/#...#/#####/#...#/#...#/#...#', I: '#####/..#../..#../..#../..#../..#../#####',
  J: '..###/...#./...#./...#./...#./#..#./.##..', K: '#...#/#..#./#.#../##.../#.#../#..#./#...#', L: '#..../#..../#..../#..../#..../#..../#####',
  M: '#...#/##.##/#.#.#/#.#.#/#...#/#...#/#...#', N: '#...#/##..#/#.#.#/#..##/#...#/#...#/#...#', O: '.###./#...#/#...#/#...#/#...#/#...#/.###.',
  P: '####./#...#/#...#/####./#..../#..../#....', Q: '.###./#...#/#...#/#...#/#.#.#/#..#./.##.#', R: '####./#...#/#...#/####./#.#../#..#./#...#',
  S: '.####/#..../#..../.###./....#/....#/####.', T: '#####/..#../..#../..#../..#../..#../..#..', U: '#...#/#...#/#...#/#...#/#...#/#...#/.###.',
  V: '#...#/#...#/#...#/#...#/#...#/.#.#./..#..', W: '#...#/#...#/#...#/#.#.#/#.#.#/##.##/#...#', X: '#...#/#...#/.#.#./..#../.#.#./#...#/#...#',
  Y: '#...#/#...#/.#.#./..#../..#../..#../..#..', Z: '#####/....#/...#./..#../.#.../#..../#####',
  0: '.###./#...#/#..##/#.#.#/##..#/#...#/.###.', 1: '..#../.##../..#../..#../..#../..#../.###.', 2: '.###./#...#/....#/...#./..#../.#.../#####',
  3: '####./....#/....#/.###./....#/....#/####.', 4: '...#./..##./.#.#./#..#./#####/...#./...#.', 5: '#####/#..../####./....#/....#/#...#/.###.',
  6: '.###./#..../#..../####./#...#/#...#/.###.', 7: '#####/....#/...#./..#../..#../..#../..#..', 8: '.###./#...#/#...#/.###./#...#/#...#/.###.',
  9: '.###./#...#/#...#/.####/....#/....#/.###.',
  ' ': '...../...../...../...../...../...../.....', '-': '...../...../...../.###./...../...../.....', '.': '...../...../...../...../...../.##../.##..',
  ':': '...../.##../.##../...../.##../.##../.....', '!': '..#../..#../..#../..#../..#../...../..#..', "'": '..#../..#../...../...../...../...../.....',
  ',': '...../...../...../...../.##../..#../.#...', '?': '.###./#...#/....#/...#./..#../...../..#..', '/': '....#/....#/...#./..#../.#.../#..../#....',
  '&': '.##../#..#./#..#./.##../#.#.#/#..#./.##.#', '>': '.#.../..#../...#./....#/...#./..#../.#...', '<': '...#./..#../.#.../#..../.#.../..#../...#.',
  '+': '...../..#../..#../#####/..#../..#../.....', '*': '...../#.#.#/.###./#####/.###./#.#.#/.....'
};
const ALIAS = { '—': '-', '–': '-', '’': "'", '‘': "'", '·': '.' };
const SVGNS = 'http://www.w3.org/2000/svg';

/**
 * A line of pixel text as an SVG. Runs of lit pixels in a row become one rectangle. The SVG has no size
 * of its own: give it a height in CSS (its width follows). opts.shadow adds a one-pixel drop shadow.
 */
export function pixelText(str, opts = {}) {
  const text = String(str).toUpperCase().split('').map((c) => ALIAS[c] || c);
  const svg = document.createElementNS(SVGNS, 'svg');
  let x = 0, d = '';
  text.forEach((c) => {
    const rows = (G[c] || G['?']).split('/');
    for (let r = 0; r < 7; r++) {
      let run = -1;
      for (let k = 0; k <= 5; k++) {
        const on = k < 5 && rows[r][k] === '#';
        if (on && run < 0) run = k;
        if (!on && run >= 0) { d += 'M' + (x + run) + ' ' + r + 'h' + (k - run) + 'v1h-' + (k - run) + 'z'; run = -1; }
      }
    }
    x += c === ' ' ? 4 : 6;
  });
  const w = Math.max(1, x - 1), sh = opts.shadow ? 1 : 0;
  svg.setAttribute('viewBox', '0 0 ' + (w + sh) + ' ' + (7 + sh));
  svg.setAttribute('class', 'pxt' + (opts.cls ? ' ' + opts.cls : ''));
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('shape-rendering', 'crispEdges');
  if (sh) { const s = document.createElementNS(SVGNS, 'path'); s.setAttribute('d', d); s.setAttribute('transform', 'translate(1 1)'); s.setAttribute('class', 'pxt__shadow'); svg.appendChild(s); }
  const p = document.createElementNS(SVGNS, 'path'); p.setAttribute('d', d); p.setAttribute('class', 'pxt__ink'); svg.appendChild(p);
  svg.style.aspectRatio = (w + sh) + ' / ' + (7 + sh);
  return svg;
}

/* ------------------------------------------------------------------ the planet */
// The four games, as four lands. Each: two ground colours, a detail colour and how often it shows.
export const BIOMES = [
  { id: 'shattered-worlds', name: 'Shattered Worlds', land: ['#6a2fb8', '#9a3fd0'], spark: '#41e8d8', every: 0.1 },      // violet ruin, neon
  { id: 'moonkeeper', name: 'MoonKeeper', land: ['#b9bcc8', '#8f93a3'], spark: '#5d6072', every: 0.12 },                 // grey regolith, craters
  { id: 'blood-of-the-north', name: 'Blood of the North', land: ['#eef4ff', '#a9c9e8'], spark: '#2f6b4f', every: 0.16 },  // snow, pines
  { id: 'neo-earth', name: 'Neo Earth 2226', land: ['#1fb8a8', '#0f8a8e'], spark: '#ffd66b', every: 0.11 }                // teal city, lights
];
const SEA = ['#182a78', '#22399a', '#2d4bb8'];
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
const hex = (c) => [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)];

function rng(seed) { let a = seed >>> 0; return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

/** The planet's map: MW × MH colours (equirectangular, wrapping in longitude). Four lands in four quarters. */
function makeMap(MW, MH, seed) {
  const rnd = rng(seed), GW = 16, GH = 8, grid = [];
  for (let i = 0; i < GW * GH; i++) grid.push(rnd());
  const noise = (u, v) => {       // smooth value noise, wrapping in u
    const x = u * GW, y = Math.min(GH - 1.001, v * (GH - 1)), x0 = Math.floor(x), y0 = Math.floor(y), fx = x - x0, fy = y - y0;
    const at = (i, j) => grid[(j * GW) + ((i % GW) + GW) % GW];
    const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
    return (at(x0, y0) * (1 - sx) + at(x0 + 1, y0) * sx) * (1 - sy) + (at(x0, y0 + 1) * (1 - sx) + at(x0 + 1, y0 + 1) * sx) * sy;
  };
  const px = new Uint8Array(MW * MH * 3);
  const sea = SEA.map(hex), lands = BIOMES.map((b) => ({ land: b.land.map(hex), spark: hex(b.spark), every: b.every }));
  const ice = hex('#f4f8ff'), shore = hex('#4f74e0');
  // eight lands, two for each game, alternately north and south of the equator, so that whichever way the
  // planet is turned several of them are in view
  const C = [];
  for (let k = 0; k < 8; k++) C.push({ u: (k + 0.5) / 8, v: k % 2 ? 0.66 : 0.34, q: k % 4, r: 0.75 + rnd() * 0.35 });
  for (let j = 0; j < MH; j++) for (let i = 0; i < MW; i++) {
    const u = i / MW, v = j / MH, n = noise(u, v) * 0.65 + noise(u * 2 + 0.3, v) * 0.35, o = (j * MW + i) * 3;
    const lat = Math.abs(v - 0.5) * 2;
    let best = 9, q = 0;
    for (const c of C) { let du = Math.abs(u - c.u); if (du > 0.5) du = 1 - du; const d = Math.hypot(du * 8.2, (v - c.v) * 4.6) / c.r; if (d < best) { best = d; q = c.q; } }
    const edge = best + (n - 0.5) * 0.9;                       // the noise makes the coast
    let c;
    if (lat > 0.93 - n * 0.06) c = ice;
    else if (edge < 0.95) {
      const b = lands[q];
      // ground in two tones in broad patches, with a detail here and there (lights, craters, pines)
      c = rnd() < b.every * 0.45 ? b.spark : b.land[noise(u * 5 + 1.7, v * 1.3) > 0.5 ? 0 : 1];
    } else c = edge < 1.08 ? shore : sea[n > 0.55 ? 1 : 0];
    px[o] = c[0]; px[o + 1] = c[1]; px[o + 2] = c[2];
  }
  return px;
}

/**
 * A pixel planet in `host`. o.size: the disc in true pixels (it is scaled up by CSS, pixelated).
 * It turns by itself while `setActive(true)`; dragging spins it. Returns { el, setActive, dispose }.
 */
export function createPlanet(host, o = {}) {
  const N = o.size || 96, MW = 192, MH = 96, D = Math.PI / 180;
  const cv = document.createElement('canvas');
  cv.width = cv.height = N; cv.className = 'px-planet__disc';
  host.appendChild(cv);
  const g = cv.getContext('2d'), img = g.createImageData(N, N), map = makeMap(MW, MH, o.seed || 2226);
  // each pixel of the disc: its place on the unit sphere and how much light falls on it (four steps, dithered)
  const X = new Float32Array(N * N), Y = new Float32Array(N * N), Z = new Float32Array(N * N), L = new Float32Array(N * N), K = new Uint8Array(N * N);
  const light = [-0.5, 0.55, 0.67], ll = Math.hypot(...light);
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
    const k = j * N + i, x = (i + 0.5) / N * 2 - 1, y = 1 - (j + 0.5) / N * 2, d = x * x + y * y;
    if (d > 1) continue;
    const z = Math.sqrt(1 - d);
    X[k] = x; Y[k] = y; Z[k] = z;
    K[k] = d > 0.9 ? 2 : 1;                                   // 2: the dark rim
    const dot = (x * light[0] + y * light[1] + z * light[2]) / ll;
    const lv = dot * 3.4 + 0.6 + (BAYER[(j & 3) * 4 + (i & 3)] / 16 - 0.5) * 0.9;     // dithered between steps
    L[k] = [0.42, 0.62, 0.82, 1, 1.16][Math.max(0, Math.min(4, Math.round(lv)))];
  }
  const view = { lon: o.lon || 20, lat: 12, vlon: 0, drag: null, moved: false };
  let active = false, raf = 0, last = 0, drawn = '';

  function paint() {
    const key = view.lon.toFixed(1) + ':' + view.lat.toFixed(1);
    if (key === drawn) return;
    drawn = key;
    const px = img.data, l0 = view.lon * D, p0 = view.lat * D, sp = Math.sin(p0), cp = Math.cos(p0);
    for (let k = 0, n = N * N; k < n; k++) {
      const o4 = k * 4;
      if (!K[k]) { px[o4 + 3] = 0; continue; }
      const x = X[k], y = Y[k], z = Z[k];
      const lat = Math.asin(Math.max(-1, Math.min(1, z * sp + y * cp)));
      let u = ((l0 + Math.atan2(x, z * cp - y * sp)) / (2 * Math.PI) + 0.5) % 1; if (u < 0) u += 1;
      const m = (Math.min(MH - 1, ((0.5 - lat / Math.PI) * MH) | 0) * MW + ((u * MW) | 0)) * 3;
      const s = K[k] === 2 ? L[k] * 0.55 : L[k];
      px[o4] = Math.min(255, map[m] * s); px[o4 + 1] = Math.min(255, map[m + 1] * s); px[o4 + 2] = Math.min(255, map[m + 2] * s); px[o4 + 3] = 255;
    }
    g.putImageData(img, 0, 0);
  }
  function tick(now) {
    raf = 0;
    const dt = last ? Math.min(0.1, (now - last) / 1000) : 0.016; last = now;
    if (!view.drag) {
      // it coasts after a spin, then settles back to its own slow turn
      view.vlon += ((o.still ? 0 : 9) - view.vlon) * Math.min(1, dt * 1.6);
      view.lon += view.vlon * dt;
    }
    paint();
    if (active) raf = requestAnimationFrame(tick); else last = 0;
  }
  const wake = () => { if (!raf) raf = requestAnimationFrame(tick); };

  // dragging: the surface follows the finger. A drag is not a click.
  const el = o.target || host;
  el.addEventListener('pointerdown', (e) => { view.drag = { x: e.clientX, y: e.clientY }; view.moved = false; view.px = e.clientX; });
  window.addEventListener('pointermove', (e) => {
    if (!view.drag) return;
    const dx = e.clientX - view.drag.x, dy = e.clientY - view.drag.y;
    if (Math.abs(e.clientX - view.px) > 6) view.moved = true;
    const k = 115 / Math.max(60, cv.clientWidth || N);
    view.lon -= dx * k; view.lat = Math.max(-55, Math.min(55, view.lat + dy * k));
    view.vlon = -dx * k * 30;
    view.drag = { x: e.clientX, y: e.clientY };
    if (!raf) paint();
  }, { passive: true });
  const up = () => { view.drag = null; };
  window.addEventListener('pointerup', up); window.addEventListener('pointercancel', up);
  el.addEventListener('click', (e) => { if (view.moved) { e.preventDefault(); e.stopPropagation(); view.moved = false; } }, true);
  el.addEventListener('dragstart', (e) => e.preventDefault());

  paint();
  return {
    el: cv,
    setActive(on) { if (on === active) return; active = on; if (on) wake(); },
    dispose() { active = false; if (raf) cancelAnimationFrame(raf); cv.remove(); }
  };
}
