/*
 * city-draw.js — Game City in true pixels: one building for each of the fifty games, and the night sky over them.
 *
 * Used by the clickable city on the games page (games.html → games.js) and by the Game City page
 * (city/index.html → city/city.js). Everything is drawn in code onto a small canvas that CSS scales up
 * without smoothing. A building's shape comes from its game: the kind of game picks the kind of building
 * (puzzle → tower, story → house, arcade → arcade, rhythm → bell tower, strategy → hall), the number
 * seeds its size, and the district gives its colours. A game that is not built yet stands in scaffolding.
 *
 *   shapeOf(game)                                  the building's kind and size (cached)
 *   drawBuilding(g, x, base, game, district, o)    one building, its door on (x + w/2, base); returns its box
 *   drawCity(g, W, H, games, districts, time, o)   the whole skyline in five districts; returns the boxes
 *   citySky(g, W, H, time)                         the night over the city: bands, stars, searchlights, a blimp
 *   hitTest(boxes, x, y)                           the game under a point (front buildings first)
 *
 * Draw-only: nothing here changes a game or a page; it only paints.
 */
function rng(seed) { let a = seed >>> 0; return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const hash = (a, b, c) => { const x = Math.sin(a * 127.1 + b * 311.7 + c * 74.7) * 43758.5453; return x - Math.floor(x); };
const NIGHT = [11, 12, 46];
const mixCache = new Map();
/** A colour moved t of the way toward night (for the back row and for shadows). */
function shade(hex, t) {
  if (!t) return hex;
  const k = hex + t;
  if (!mixCache.has(k)) {
    const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)).map((v, i) => Math.round(v + (NIGHT[i] - v) * t));
    mixCache.set(k, '#' + c.map((v) => v.toString(16).padStart(2, '0')).join(''));
  }
  return mixCache.get(k);
}

const KIND = { puzzle: 'tower', story: 'house', arcade: 'arcade', rhythm: 'bell', strategy: 'hall' };
const shapes = new Map();
export function shapeOf(game) {
  if (shapes.has(game.n)) return shapes.get(game.n);
  const r = rng(game.n * 7919 + 13), kind = KIND[game.type] || 'tower', pick = (a, b) => a + Math.floor(r() * (b - a + 1));
  let w, h, cap;
  if (kind === 'tower') { w = 10 + 2 * pick(0, 2); h = pick(26, 42); cap = 5; }
  else if (kind === 'house') { w = 12 + 2 * pick(0, 2); h = pick(13, 19); cap = w / 2 + 2; }
  else if (kind === 'arcade') { w = 14 + 2 * pick(0, 2); h = pick(15, 21); cap = 4; }
  else if (kind === 'bell') { w = 8 + 2 * pick(0, 1); h = pick(28, 38); cap = 9; }
  else { w = 18 + 2 * pick(0, 2); h = pick(12, 16); cap = 9; }
  const s = { kind, w, h, total: Math.round(h + cap), v: [r(), r(), r(), r()] };
  shapes.set(game.n, s);
  return s;
}

/**
 * One building. o.time: seconds (windows flicker, lights blink); o.hot: hovered (every window lit, an accent outline);
 * o.shade: 0–1 toward night (the back row); o.built: false draws scaffolding.
 */
export function drawBuilding(g, x, base, game, d, o = {}) {
  const s = shapeOf(game), t = o.time || 0, sh = o.shade || 0, hot = !!o.hot;
  const R = (px, py, pw, ph, c) => { g.fillStyle = shade(c, sh); g.fillRect(Math.round(px), Math.round(py), pw, ph); };
  const wall = d.walls[game.n % 2], dark = shade(wall, 0.45), top = base - s.h, n = game.n;
  const win = (wx, wy, k) => {
    const on = hot || hash(n, k, Math.floor(t * 0.25 + hash(n, k, 9) * 5)) > 0.42;
    R(wx, wy, 1, 1, on ? (hot ? '#fff8e6' : d.window) : dark);
  };
  if (hot) { g.fillStyle = d.accent; g.fillRect(x - 1, base - s.total - 1, s.w + 2, s.total + 1); }

  if (s.kind === 'tower') {
    R(x, top, s.w, s.h, wall); R(x - 1, top, s.w + 2, 1, d.roof); R(x + s.w - 2, top + 1, 2, s.h - 1, dark);
    for (let yy = top + 3, k = 0; yy < base - 4; yy += 3) for (let xx = x + 2; xx < x + s.w - 2; xx += 2) win(xx, yy, k++);
    if (s.v[0] > 0.5) { R(x + (s.w >> 1), top - 5, 1, 5, '#8a8fb0'); R(x + (s.w >> 1) - 1, top - 6, 3, 1, Math.sin(t * 3 + n) > 0 ? '#ff4d4d' : '#5a1d2a'); }
    else { R(x + 2, top - 3, 4, 3, d.roof); R(x + 3, top - 4, 2, 1, d.roof); }
  } else if (s.kind === 'house') {
    R(x, top, s.w, s.h, wall); R(x + s.w - 2, top, 2, s.h, dark);
    const rh = Math.ceil(s.w / 2) + 1;
    for (let k = 0; k < rh; k++) { const half = k + 1; R(x + s.w / 2 - half, top - rh + k, half * 2, 1, d.roof); }
    R(x + s.w - 4, top - rh + 1, 2, 3, d.roof);                                           // chimney
    R(x + 2, top + 3, 3, 3, hot ? '#fff8e6' : d.window); R(x + s.w - 5, top + 3, 3, 3, hot ? '#fff8e6' : (hash(n, 1, Math.floor(t * 0.2)) > 0.4 ? d.window : dark));
    R(x + (s.w >> 1) - 1, top - rh + 3, 2, 2, d.window);                                 // the round window under the roof
  } else if (s.kind === 'arcade') {
    R(x, top, s.w, s.h, wall); R(x + s.w - 2, top, 2, s.h, dark);
    R(x - 1, top - 4, s.w + 2, 4, d.accent);
    for (let xx = x; xx < x + s.w; xx += 2) R(xx, top - 3, 1, 1, (Math.floor(t * 6) + xx) % 4 < 2 ? '#fff8e6' : d.roof);
    R(x + 2, top + 3, s.w - 4, Math.max(3, s.h - 10), hot ? '#fff8e6' : d.window);
    for (let xx = x + 3; xx < x + s.w - 3; xx += 3) R(xx, top + 4, 1, Math.max(1, s.h - 12), dark);
  } else if (s.kind === 'bell') {
    R(x, top, s.w, s.h, wall); R(x + s.w - 2, top, 2, s.h, dark);
    const cx = x + s.w / 2;
    for (let k = 0; k < 5; k++) { const half = Math.round(Math.sqrt(25 - (5 - k) * (5 - k)) * (s.w / 10)); R(cx - half, top - 5 + k, half * 2, 1, d.roof); }
    R(cx - 0.5, top - 9, 1, 4, d.accent);
    R(x + 2, top + 2, s.w - 4, 5, dark); R(cx - 1, top + 3, 2, 3, Math.sin(t * 2 + n) > 0.6 ? '#fff8e6' : d.accent);   // the bell in its arch
    R(cx - 1.5, top + 10, 3, 3, d.window); R(cx - 0.5, top + 11, 1, 1, dark);              // the clock
    for (let yy = top + 16, k = 0; yy < base - 4; yy += 4) win(cx - 0.5, yy, k++);
  } else {
    R(x, top, s.w, s.h, wall); R(x - 1, top - 2, s.w + 2, 2, d.roof); R(x + 2, top - 4, s.w - 4, 2, d.roof);
    for (let xx = x + 2; xx < x + s.w - 2; xx += 3) R(xx, top + 2, 1, s.h - 3, shade(d.walls[(n + 1) % 2], 0.1));
    for (let yy = top + 3, k = 0; yy < base - 4; yy += 3) for (let xx = x + 3; xx < x + s.w - 3; xx += 3) win(xx, yy, k++);
    const fx = x + s.w - 4, wave = Math.floor(t * 4 + n) % 2;
    R(fx, top - 9, 1, 5, '#c9ccd6'); R(fx + 1, top - 9 + wave, 3, 2, d.accent);
  }
  R(x + (s.w >> 1) - 1, base - 3, 2, 3, '#120a24');                                      // the door
  if (hot) R(x + (s.w >> 1) - 1, base - 3, 2, 3, d.accent);

  if (!o.built) {                                                                          // scaffolding
    const sh2 = Math.round(s.h * (0.45 + s.v[1] * 0.35));
    R(x - 1, base - sh2, 1, sh2, '#c99a4a'); R(x + s.w, base - sh2, 1, sh2, '#c99a4a');
    for (let yy = base - sh2; yy < base - 1; yy += 5) R(x - 1, yy, s.w + 2, 1, '#8a6430');
    for (let xx = x - 1; xx < x + s.w + 1; xx++) R(xx, base - 1, 1, 1, xx % 2 ? '#ff5a3c' : '#fff8e6');
    if (n % 4 === 1) {                                                                     // a crane over some of them
      const mx = x + s.w - 2, my = base - s.total - 8, jib = 12;
      R(mx, my, 1, s.total + 8 - sh2 + 1, '#f2b134'); R(mx - jib, my, jib + 4, 1, '#f2b134'); R(mx + 2, my + 1, 2, 2, '#8a6430');
      const hook = mx - 4 - Math.round((Math.sin(t * 0.7 + n) + 1) * 3);
      R(hook, my + 1, 1, 5, '#c9ccd6'); R(hook - 1, my + 6, 3, 1, '#c9ccd6');
    }
  }
  return { game, x: x - 1, y: base - s.total - (o.built ? 0 : 8), w: s.w + 2, h: s.total + (o.built ? 0 : 8) };
}

/**
 * The skyline: the five districts side by side, each with its five tallest buildings in a back row and the
 * other five in front, on one street. o.hot: the number of the game under the pointer. o.ground: the street's y.
 */
export function drawCity(g, W, H, games, districts, time, o = {}) {
  const ground = o.ground || H - 10, pad = 6, gap = 8, cw = (W - pad * 2 - gap * (districts.length - 1)) / districts.length;
  const back = [], front = [];
  // the street
  g.fillStyle = '#141232'; g.fillRect(0, ground, W, H - ground);
  g.fillStyle = '#2a2756'; g.fillRect(0, ground, W, 1);
  for (let x = (Math.floor(time * 8) % 6); x < W; x += 6) { g.fillStyle = '#4a4680'; g.fillRect(x, ground + Math.round((H - ground) * 0.6), 3, 1); }
  districts.forEach((d, i) => {
    const x0 = pad + i * (cw + gap);
    const list = games.filter((gm) => gm.district === d.id).sort((a, b) => shapeOf(b).total - shapeOf(a).total);
    g.fillStyle = d.accent; g.fillRect(Math.round(x0), ground, Math.round(cw), 1);
    list.slice(0, 5).forEach((gm, k) => back.push({ gm, d, cx: x0 + cw * (0.1 + k * 0.2), base: ground - 6 }));
    list.slice(5).forEach((gm, k) => front.push({ gm, d, cx: x0 + cw * (0.14 + k * 0.18), base: ground }));
    // a street lamp between districts
    if (i < districts.length - 1) {
      const lx = Math.round(x0 + cw + gap / 2);
      g.fillStyle = '#5a5f84'; g.fillRect(lx, ground - 9, 1, 9); g.fillRect(lx - 1, ground - 10, 3, 1);
      g.fillStyle = '#ffe08a'; g.fillRect(lx - 1, ground - 9, 3, 1);
    }
  });
  const boxes = [];
  const place = (b, sh) => { const s = shapeOf(b.gm); return drawBuilding(g, Math.round(b.cx - s.w / 2), b.base, b.gm, b.d, { time, shade: sh, hot: o.hot === b.gm.n, built: b.gm.status === 'open' }); };
  back.forEach((b) => boxes.push(place(b, o.hot === b.gm.n ? 0 : 0.38)));
  front.forEach((b) => boxes.unshift(place(b, 0)));
  // the hovered building comes to the front, drawn again whole
  const hot = back.find((b) => b.gm.n === o.hot);
  if (hot) place(hot, 0);
  return boxes;
}

/** The game under (x, y), in the canvas's own pixels: front buildings are tested first. */
export function hitTest(boxes, x, y) {
  for (const b of boxes) if (x >= b.x && x < b.x + b.w && y >= b.y && y < b.y + b.h) return b.game;
  return null;
}

/** The night over Game City: violet into pink, stars, two searchlights, a blimp with a sign of lights. */
export function citySky(g, W, H, time) {
  const bands = ['#090a26', '#110f36', '#1d1548', '#2e1a5c', '#47206e', '#6a2a7a', '#93357e'];
  const bh = H / bands.length;
  bands.forEach((c, i) => {
    const y0 = Math.round(i * bh), y1 = Math.round((i + 1) * bh);
    g.fillStyle = c; g.fillRect(0, y0, W, y1 - y0);
    if (i < bands.length - 1) { g.fillStyle = bands[i + 1]; for (let x = i % 2; x < W; x += 2) g.fillRect(x, y1 - 1, 1, 1); }
  });
  for (let i = 0; i < Math.round(W * H / 220); i++) {
    if (Math.sin(time * (0.7 + hash(i, 2, 3) * 2) + i) < -0.5) continue;
    g.fillStyle = hash(i, 5, 1) > 0.85 ? '#fff2b0' : '#ffffff';
    g.fillRect(Math.floor(hash(i, 1, 1) * W), Math.floor(hash(i, 2, 2) * H * 0.6), 1, 1);
  }
  // searchlights sweeping from the street: dithered beams
  [[0.22, 0.9, 0], [0.78, 1.1, 2]].forEach(([fx, sp, ph]) => {
    const ox = W * fx, oy = H, a = -Math.PI / 2 + Math.sin(time * 0.35 * sp + ph) * 0.55;
    for (let r = 6; r < H * 1.1; r += 1) for (let s = -1; s <= 1; s++) {
      const spread = r * 0.06 * s, px = Math.round(ox + Math.cos(a) * r - Math.sin(a) * spread), py = Math.round(oy + Math.sin(a) * r + Math.cos(a) * spread);
      if ((px + py) % 3) continue;
      g.fillStyle = r > H * 0.7 ? '#6f5aa8' : '#a48ad8'; g.fillRect(px, py, 1, 1);
    }
  });
  // the blimp, drifting across, with a sign that runs
  const bx = Math.round(((time * 4) % (W + 60)) - 40), by = Math.round(H * 0.16);
  for (let k = -3; k <= 3; k++) { const half = Math.round(Math.sqrt(9.5 - k * k) * 4.2); g.fillStyle = k < 0 ? '#c9ccd6' : '#9a9db6'; g.fillRect(bx + 13 - half, by + k, half * 2, 1); }
  g.fillStyle = '#5a5f84'; g.fillRect(bx + 10, by + 4, 6, 2); g.fillRect(bx - 1, by - 2, 2, 5);
  const cols = ['#f6c443', '#c86bff', '#ff9d2e', '#7fe8c0', '#58e6ff'];
  for (let k = 0; k < 14; k++) { g.fillStyle = (k + Math.floor(time * 5)) % 5 === 0 ? '#fff8e6' : cols[k % 5]; g.fillRect(bx + 6 + k, by, 1, 1); }
}
