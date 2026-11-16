/*
 * scenes.js — the pixel landscapes behind the games page, one for each game and open space at either end.
 *
 * Every scene is drawn in true pixels onto a small buffer (about 320 across; games.js scales it up without
 * smoothing). A scene is a function (g, w, h, time, travel): g is the buffer's 2D context, w × h its size,
 * time the seconds since the page opened (0 when the visitor asks for less motion) and travel how far the
 * page has been scrolled through this world, in screens, for the parallax between its layers.
 * Shapes come from a seed, so a world looks the same on every visit.
 */
function rng(seed) { let a = seed >>> 0; return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const cache = {};
/** A repeatable list of n random numbers for a name. */
function rolls(name, n) {
  if (!cache[name]) { const r = rng(name.split('').reduce((a, c) => a * 31 + c.charCodeAt(0), 7)); cache[name] = Array.from({ length: n }, r); }
  return cache[name];
}
/** A skyline of heights that wraps every `period` pixels: smooth noise, for hills. */
function ridge(name, x, period, rough) {
  const r = rolls(name, 64), u = ((x % period) + period) % period / period;
  // broad shapes from 14 points round the loop, crags from 44 more: both smooth, so a hill is a hill
  const wave = (n, off) => { const p = u * n, i = Math.floor(p), f = p - i, s = f * f * (3 - 2 * f); return r[(i % n + off) % 64] * (1 - s) + r[((i + 1) % n + off) % 64] * s; };
  return rough ? wave(14, 0) * 0.74 + wave(44, 14) * 0.26 : wave(14, 0);
}

/** Bands of colour from top to bottom, with a checkered row where two meet (the pixel artist's gradient). */
function sky(g, w, h, colors, bottom) {
  const H = bottom == null ? h : bottom, n = colors.length, bh = H / n;
  for (let i = 0; i < n; i++) {
    const y0 = Math.round(i * bh), y1 = Math.round((i + 1) * bh);
    g.fillStyle = colors[i]; g.fillRect(0, y0, w, y1 - y0);
    if (i < n - 1) { g.fillStyle = colors[i + 1]; for (let x = (i % 2); x < w; x += 2) g.fillRect(x, y1 - 1, 1, 1); for (let x = ((i + 1) % 2); x < w; x += 4) g.fillRect(x, y1 - 2, 1, 1); }
  }
}
function stars(g, w, h, n, time, name, color) {
  const r = rolls(name || 'stars', n * 3);
  for (let i = 0; i < n; i++) {
    const tw = time ? Math.sin(time * (0.6 + r[i * 3 + 2] * 2) + i) : 1;
    if (tw < -0.55) continue;
    g.fillStyle = color || (r[i * 3 + 2] > 0.8 ? '#fff2b0' : '#ffffff');
    const x = Math.floor(r[i * 3] * w), y = Math.floor(r[i * 3 + 1] * h);
    g.fillRect(x, y, 1, 1);
    if (r[i * 3 + 2] > 0.93 && tw > 0.4) { g.fillRect(x - 1, y, 3, 1); g.fillRect(x, y - 1, 1, 3); }
  }
}
/** Hills: one column per pixel, from the ridge line down to `base`. */
function hills(g, w, name, top, amp, base, color, shift, period, rough, cap) {
  for (let x = 0; x < w; x++) {
    const y = Math.round(top + (1 - ridge(name, x + shift, period || 180, rough)) * amp);
    g.fillStyle = color; g.fillRect(x, y, 1, base - y);
    if (cap) { g.fillStyle = cap; g.fillRect(x, y, 1, Math.max(1, Math.round((base - y) * 0.22))); }
  }
}
/** A row of buildings with lit windows; `shift` slides it for parallax. */
function skyline(g, w, name, base, minH, maxH, color, lit, shift, time, bw) {
  const r = rolls(name, 240), step = bw || 9, first = Math.floor(shift / step) - 1;
  for (let k = first; k < first + Math.ceil(w / step) + 3; k++) {
    const i = ((k % 60) + 60) % 60, bh = Math.round(minH + r[i] * r[i + 60] * (maxH - minH)), bwid = step - 1 - Math.floor(r[i + 120] * 3);
    const x = Math.round(k * step - shift);
    g.fillStyle = color; g.fillRect(x, base - bh, bwid, bh);
    if (r[i + 180] > 0.7) g.fillRect(x + (bwid >> 1), base - bh - 3, 1, 3);            // an antenna
    if (lit) for (let yy = base - bh + 2; yy < base - 1; yy += 3) for (let xx = x + 1; xx < x + bwid - 1; xx += 2) {
      const q = r[(i * 7 + yy * 3 + xx) % 240];
      if (q > 0.62) { g.fillStyle = lit[q > 0.9 ? 1 : 0]; g.fillRect(xx, yy, 1, 1); }
    }
  }
}
const ground = (g, w, h, top, a, b) => { g.fillStyle = a; g.fillRect(0, top, w, h - top); g.fillStyle = b; for (let x = 0; x < w; x += 2) g.fillRect(x + ((top & 1) ? 1 : 0), top, 1, 1); g.fillRect(0, top + 2, w, 1); };

/* ------------------------------------------------------------------ the scenes */
/** Open space: where the planet hangs. */
function space(g, w, h, time) {
  sky(g, w, h, ['#070820', '#0b0c2e', '#11123c', '#191a4e', '#24246a']);
  stars(g, w, h, Math.round(w * h / 260), time, 'space');
}

/** Shattered Worlds: a broken Earth in three layers — Aurelia in the sky, the Surface, Deepline below. */
function shattered(g, w, h, time, travel) {
  const hz = Math.round(h * 0.6);
  sky(g, w, h, ['#140a30', '#231250', '#3b1c72', '#63308e', '#9a4a98', '#d6688a', '#f59a72'], hz);
  stars(g, w, hz * 0.5, Math.round(w * 0.25), time, 'sw');
  // Aurelia: the city that hangs in the sky
  const r = rolls('aurelia', 60), sh = travel * 14;
  for (let i = 0; i < 6; i++) {
    const cx = Math.round(((r[i] * 1.4 * w - sh * (0.5 + r[i + 6])) % (w + 60) + w + 60) % (w + 60)) - 30, cy = Math.round(h * (0.1 + r[i + 12] * 0.17)), cw = 14 + Math.round(r[i + 18] * 22);
    g.fillStyle = '#2a2350'; g.fillRect(cx, cy, cw, 3); g.fillRect(cx + 2, cy + 3, cw - 4, 2); g.fillRect(cx + 5, cy + 5, cw - 10, 2);
    for (let k = 0; k < cw - 2; k += 3) { const bh = 2 + Math.round(r[(i * 9 + k) % 60] * 9); g.fillStyle = '#3a3168'; g.fillRect(cx + 1 + k, cy - bh, 2, bh); if (r[(i * 5 + k) % 60] > 0.5) { g.fillStyle = '#8fe9ff'; g.fillRect(cx + 1 + k, cy - bh + 1, 1, 1); } }
  }
  // the Surface: mesas at dusk, and the broken skyline
  hills(g, w, 'sw-far', hz - h * 0.2, h * 0.16, hz + 2, '#7a3358', travel * 22, 200, true);
  skyline(g, w, 'sw-city', hz + 1, 3, h * 0.2, '#4a1f48', ['#ff9d5c', '#ffd38a'], travel * 40, time, 7);
  hills(g, w, 'sw-near', hz - h * 0.05, h * 0.09, hz + 4, '#2c1238', travel * 64, 130, true);
  // the wound in the world: a violet glow where the layers split
  const gy = hz + 3, pulse = time ? 0.5 + 0.5 * Math.sin(time * 1.4) : 0.6;
  g.fillStyle = '#1a0a2c'; g.fillRect(0, gy, w, h - gy);
  for (let x = 0; x < w; x++) {
    const d = Math.abs(x - w * 0.5) / (w * 0.42);
    if (d > 1) continue;
    const depth = Math.round((1 - d * d) * h * 0.08);
    g.fillStyle = '#6a1fb0'; g.fillRect(x, gy, 1, depth + 2);
    g.fillStyle = (x + Math.floor(time * 3)) % 3 ? '#b44cff' : '#e9a4ff'; g.fillRect(x, gy, 1, Math.max(1, Math.round(depth * (0.35 + 0.25 * pulse))));
  }
  // Deepline: the dark under everything, with its own lights
  const uy = Math.round(h * 0.8);
  g.fillStyle = '#0c0720'; g.fillRect(0, uy, w, h - uy);
  hills(g, w, 'sw-cave', uy - 6, 9, uy + 4, '#0c0720', travel * 30, 90, true);
  const d = rolls('deepline', 120);
  for (let i = 0; i < 40; i++) { if (time && Math.sin(time * 2 + i) < -0.6) continue; g.fillStyle = ['#41e8d8', '#c13ccf', '#ffd66b'][i % 3]; g.fillRect(Math.floor(((d[i] * w * 1.5 - travel * 50) % w + w) % w), uy + 4 + Math.floor(d[i + 40] * (h - uy - 14)), 1 + (i % 4 === 0 ? 1 : 0), 1); }
}

/** MoonKeeper: the grey Moon, the black sky, the Earth, and a base that needs its power back. */
function moon(g, w, h, time, travel) {
  const hz = Math.round(h * 0.62);
  g.fillStyle = '#02030c'; g.fillRect(0, 0, w, h);
  stars(g, w, hz, Math.round(w * 0.5), time, 'moon');
  // the Earth
  const ex = Math.round(w * 0.8 - travel * 6), ey = Math.round(h * 0.2), er = Math.max(7, Math.round(Math.min(w, h) * 0.075)), e = rolls('earth', 400);
  for (let y = -er; y <= er; y++) for (let x = -er; x <= er; x++) {
    if (x * x + y * y > er * er) continue;
    const lit = x * 0.6 - y * 0.5 > -er * 0.35, q = e[((x + er) * 13 + (y + er) * 7) % 400];
    g.fillStyle = !lit ? '#0e1b4a' : q > 0.78 ? '#f1f6ff' : q > 0.5 ? '#3fa36a' : '#2f6fd8';
    g.fillRect(ex + x, ey + y, 1, 1);
  }
  hills(g, w, 'moon-far', hz - h * 0.1, h * 0.09, hz + 2, '#4a4d5e', travel * 12, 240, false, '#6c6f82');
  ground(g, w, h, hz, '#8d90a2', '#b9bcc8');
  // craters
  const c = rolls('craters', 90);
  for (let i = 0; i < 16; i++) {
    const cx = Math.floor(((c[i] * w * 1.6 - travel * (20 + c[i + 16] * 50)) % (w + 20) + w + 20) % (w + 20)) - 10, cy = hz + 6 + Math.floor(c[i + 32] * (h - hz - 22)), cw = 4 + Math.round(c[i + 48] * 12) * (0.5 + (cy - hz) / (h - hz));
    g.fillStyle = '#6b6e80'; g.fillRect(cx, cy, Math.round(cw), 2); g.fillStyle = '#c9ccd6'; g.fillRect(cx + 1, cy + 2, Math.round(cw) - 2, 1); g.fillStyle = '#585b6c'; g.fillRect(cx + 1, cy, Math.round(cw) - 2, 1);
  }
  // the base: a dome, a mast with a beacon, solar panels
  const bx = Math.round(w * 0.3 - travel * 30), by = hz + 1;
  for (let y = 0; y <= 9; y++) { const half = Math.round(Math.sqrt(81 - y * y) * 1.25); g.fillStyle = y > 6 ? '#f2f5fb' : '#cfd4e0'; g.fillRect(bx - half, by - y, half * 2, 1); }
  g.fillStyle = '#7fd4ff'; g.fillRect(bx - 5, by - 5, 3, 2); g.fillRect(bx + 2, by - 5, 3, 2);
  g.fillStyle = '#5d6072'; g.fillRect(bx + 16, by - 15, 1, 15);
  g.fillStyle = !time || Math.sin(time * 4) > 0 ? '#ff4d4d' : '#6a1d1d'; g.fillRect(bx + 15, by - 17, 3, 2);
  for (let i = 0; i < 4; i++) { const px = bx + 26 + i * 9; g.fillStyle = '#5d6072'; g.fillRect(px + 3, by - 4, 1, 4); g.fillStyle = '#2f5fd0'; g.fillRect(px, by - 7, 7, 3); g.fillStyle = '#7fb0ff'; g.fillRect(px + 1, by - 7, 1, 3); g.fillRect(px + 4, by - 7, 1, 3); }
  // a rover, driving home
  const rx = Math.round(((time * 5 + w * 0.55 - travel * 46) % (w + 30) + w + 30) % (w + 30)) - 15, ry = hz + Math.round(h * 0.12);
  g.fillStyle = '#e8ebf2'; g.fillRect(rx, ry - 4, 9, 3); g.fillStyle = '#ffb347'; g.fillRect(rx + 6, ry - 6, 3, 2); g.fillStyle = '#2b2d3a'; g.fillRect(rx, ry - 1, 2, 2); g.fillRect(rx + 4, ry - 1, 2, 2); g.fillRect(rx + 8, ry - 1, 2, 2);
}

/** Blood of the North: a fjord at dusk, snow on the mountains, a longship and the northern lights. */
function north(g, w, h, time, travel) {
  const hz = Math.round(h * 0.6);
  sky(g, w, h, ['#081226', '#0e1e3c', '#173154', '#25496e', '#3f6a88', '#7fa3b4'], hz);
  stars(g, w, hz * 0.55, Math.round(w * 0.3), time, 'north');
  // the northern lights: curtains of green that sway
  for (let x = 0; x < w; x++) {
    const a = Math.sin(x * 0.045 + time * 0.5) + Math.sin(x * 0.11 - time * 0.3) * 0.5, top = Math.round(h * 0.13 + a * h * 0.03), len = Math.round(h * (0.11 + 0.05 * Math.sin(x * 0.2 + time)));
    for (let y = 0; y < len; y++) { if ((x + y) % 2 || (y > len * 0.5 && (x + y) % 4 !== 1)) continue; g.fillStyle = y < len * 0.3 ? '#8dffd0' : y < len * 0.65 ? '#3fe0a0' : '#2a9d8f'; g.fillRect(x, top + y, 1, 1); }
  }
  hills(g, w, 'n-far', hz - h * 0.3, h * 0.26, hz + 1, '#55718f', travel * 10, 260, true, '#eef4ff');
  hills(g, w, 'n-mid', hz - h * 0.16, h * 0.15, hz + 1, '#2f4a66', travel * 24, 170, true, '#c9dcee');
  // the fjord
  g.fillStyle = '#0f2a44'; g.fillRect(0, hz, w, h - hz);
  for (let y = hz + 1; y < h; y += 3) for (let x = (y * 7 + Math.floor(time * 4)) % 9; x < w; x += 9) { g.fillStyle = y % 2 ? '#1d4466' : '#3a6f8f'; g.fillRect(x, y, 3 + (y % 4), 1); }
  // the longship under sail
  const sx = Math.round(((time * 3 + w * 0.62 - travel * 34) % (w + 50) + w + 50) % (w + 50)) - 25, sy = hz + Math.round(h * 0.08) + (time && Math.sin(time * 1.5) > 0 ? 1 : 0);
  g.fillStyle = '#2a1a12'; g.fillRect(sx, sy, 22, 2); g.fillRect(sx + 1, sy + 2, 20, 1); g.fillRect(sx - 1, sy - 3, 1, 4); g.fillRect(sx + 22, sy - 3, 1, 4); g.fillRect(sx - 2, sy - 4, 2, 1); g.fillRect(sx + 22, sy - 4, 2, 1);
  g.fillRect(sx + 11, sy - 13, 1, 13);
  for (let i = 0; i < 5; i++) { g.fillStyle = i % 2 ? '#efe6d0' : '#b3312b'; g.fillRect(sx + 4 + i * 3, sy - 12, 3, 8); }
  for (let i = 0; i < 6; i++) { g.fillStyle = ['#d9a441', '#b3312b', '#3f6a88'][i % 3]; g.fillRect(sx + 2 + i * 3, sy - 1, 2, 2); }
  // the near shore: snow and pines
  const ny = Math.round(h * 0.84);
  hills(g, w, 'n-shore', ny - 7, 8, h, '#dfe9f5', travel * 56, 120, false, '#ffffff');
  const p = rolls('pines', 80);
  for (let i = 0; i < 22; i++) {
    const px = Math.floor(((p[i] * w * 1.5 - travel * 56) % (w + 12) + w + 12) % (w + 12)) - 6, ph = 9 + Math.round(p[i + 22] * 9), py = ny + 1 + Math.round(p[i + 44] * 3);
    g.fillStyle = '#3a2a1c'; g.fillRect(px, py - 2, 1, 3);
    for (let y = 0; y < ph; y++) { const half = Math.round((y / ph) * 3.4); g.fillStyle = y % 3 === 0 ? '#eef4ff' : '#123524'; g.fillRect(px - half, py - 2 - ph + y, half * 2 + 1, 1); }
  }
  // snow, falling
  const f = rolls('snow', 120);
  if (time) for (let i = 0; i < 40; i++) { g.fillStyle = '#ffffff'; g.fillRect(Math.floor((f[i] * w + Math.sin(time + i) * 3 + w) % w), Math.floor((f[i + 40] * h + time * (6 + f[i + 80] * 8)) % h), 1, 1); }
}

/** Neo Earth 2226: the city at sunset, the orbital lift, traffic in the air. */
function neo(g, w, h, time, travel) {
  const hz = Math.round(h * 0.7);
  sky(g, w, h, ['#132a52', '#1f4a80', '#3a78a8', '#6fa8c0', '#f0c08a', '#ff9a5c', '#ff7a4a'], hz);
  // the sun, low over the sea
  const sx = Math.round(w * 0.72 - travel * 8), sy = hz - Math.round(h * 0.05), sr = Math.max(6, Math.round(Math.min(w, h) * 0.06));
  for (let y = -sr; y <= 0; y++) { const half = Math.round(Math.sqrt(sr * sr - y * y)); g.fillStyle = y < -sr * 0.5 ? '#fff3c4' : '#ffd36b'; if ((y & 1) === 0 || y < -sr * 0.35) g.fillRect(sx - half, sy + y, half * 2, 1); }
  skyline(g, w, 'neo-far', hz, h * 0.12, h * 0.42, '#3b6f8f', null, travel * 14, time, 11);
  // the orbital lift: a line to the sky, a ring that climbs
  const lx = Math.round(w * 0.42 - travel * 22);
  g.fillStyle = '#0d2637'; g.fillRect(lx - 1, 0, 3, hz); g.fillRect(lx - 4, hz - Math.round(h * 0.3), 9, 3); g.fillRect(lx - 6, hz - Math.round(h * 0.12), 13, 4);
  g.fillStyle = '#7ff0ff'; g.fillRect(lx, 0, 1, hz);
  const ring = hz - ((time * 9) % hz); g.fillStyle = '#fff3c4'; g.fillRect(lx - 2, Math.round(ring), 5, 2);
  skyline(g, w, 'neo-mid', hz, h * 0.1, h * 0.34, '#123246', ['#58e6ff', '#ffe08a'], travel * 34, time, 10);
  skyline(g, w, 'neo-near', hz, h * 0.04, h * 0.16, '#081c2a', ['#58e6ff', '#ff9ad0'], travel * 58, time, 8);
  // traffic in the air
  const c = rolls('cars', 60);
  for (let i = 0; i < 12; i++) {
    const dir = i % 2 ? 1 : -1, y = Math.round(h * (0.2 + c[i] * 0.34)), x = Math.round((((c[i + 12] * w + dir * time * (10 + c[i + 24] * 16)) % (w + 10)) + w + 10) % (w + 10)) - 5;
    g.fillStyle = '#0d2637'; g.fillRect(x, y, 4, 1); g.fillStyle = dir > 0 ? '#ffe08a' : '#ff5a6a'; g.fillRect(dir > 0 ? x + 4 : x - 1, y, 1, 1);
  }
  // the sea
  g.fillStyle = '#1c5a7a'; g.fillRect(0, hz, w, h - hz);
  for (let y = hz + 1; y < h; y += 2) for (let x = (y * 5 + Math.floor(time * 5)) % 7; x < w; x += 7) {
    const near = Math.abs(x - sx) < sr * 2.2;
    g.fillStyle = near ? (y % 4 ? '#ffb86b' : '#fff3c4') : '#2f7fa0'; g.fillRect(x, y, near ? 3 : 2, 1);
  }
  // the beach road
  const by = Math.round(h * 0.9);
  hills(g, w, 'neo-shore', by - 3, 4, h, '#0b2230', travel * 70, 150, false, '#e8c890');
}

export const SCENES = { space, 'shattered-worlds': shattered, moonkeeper: moon, 'blood-of-the-north': north, 'neo-earth': neo };

/** The traveller: a small figure who walks the bottom of the screen as the page is scrolled. */
export function traveller(g, x, y, step, facing, tint) {
  const f = step % 2, s = facing < 0 ? -1 : 1, px = (dx, dy, w, hh, c) => { g.fillStyle = c; g.fillRect(x + (s > 0 ? dx : 7 - dx - w), y + dy, w, hh); };
  px(2, 0, 4, 1, '#2b1a12'); px(1, 1, 6, 1, '#2b1a12');            // hair
  px(2, 2, 4, 3, '#f0c8a0'); px(5, 3, 1, 1, '#1a1030');            // face, eye
  px(1, 5, 6, 4, tint || '#f6c443'); px(0, 5, 2, 1, '#e4381c'); px(0, 6, 1, 2, '#e4381c');   // coat, scarf
  px(1, 9, 2, f ? 2 : 3, '#27306e'); px(4, 9, 2, f ? 3 : 2, '#27306e');                       // legs
  px(f ? 0 : 1, 11 + (f ? 0 : 1), 2, 1, '#120a24'); px(f ? 4 : 5, 11 + (f ? 1 : 0), 2, 1, '#120a24');
}
