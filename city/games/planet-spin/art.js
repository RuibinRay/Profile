/*
 * art.js — Planet Spin's planet, drawn in true pixels onto the game's 320 × 180 frame. Draw-only: it reads
 * the state it is given and changes nothing (the rules are logic.js).
 *
 * The planet is seen from above, lit from the upper left and shaded in four dithered steps, like the planet
 * of the Pixel World. Its lands are the four worlds' colours (violet ruin, Moon grey, northern snow, teal
 * city) and the sea. Where two rings meet, a dark seam shows; where the same land runs across the seam, the
 * seam softens into that land's own shadow, so a strip that lines up already looks joined, and a solved
 * planet has no seams left in its lands. The ring being turned is outlined in gold; a locked ring has a
 * dotted grey edge. Details on the land (lights, craters, pines, waves) turn with their ring.
 *
 *   PLANET                         where the planet sits: { cx, cy, ro (outer radius), rc (core radius) }
 *   ringAt(level, x, y)            the ring under a point of the frame (0 = core), or -1 off the planet
 *   angleAt(x, y)                  the angle of a point round the planet, in turns clockwise from the top
 *   drawPlanet(g, level, view, t)  view: { shown: [turns per ring, may be fractional], sel, won, wonAt }
 */
export const PLANET = { cx: 88, cy: 97, ro: 78, rc: 19 };          // below the puzzle strip (y ≥ 14)
const { cx, cy, ro, rc } = PLANET;
const SIZE = ro * 2 + 10, HALF = SIZE / 2;

// four shades from shadow to highlight, and the detail colour, for each land
const LAND = {
  V: { c: ['#3d1670', '#6a2fb8', '#9a3fd0', '#c47ae8'], spark: '#41e8d8', every: 0.05 },
  M: { c: ['#55586a', '#8f93a3', '#b9bcc8', '#e2e4ec'], spark: '#5d6072', every: 0.07 },
  N: { c: ['#7f9fc0', '#c2d6ea', '#eef4ff', '#ffffff'], spark: '#2f6b4f', every: 0.06 },
  E: { c: ['#0a5257', '#0f8a8e', '#1fb8a8', '#62e2cf'], spark: '#ffd66b', every: 0.06 },
  S: { c: ['#0e1a50', '#172a78', '#21399a', '#2c4bb8'], spark: '#4a6fe0', every: 0.04 }
};
const rgb = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const RGB = {};
for (const k in LAND) RGB[k] = { c: LAND[k].c.map(rgb), spark: rgb(LAND[k].spark), every: LAND[k].every };
const SEAM = rgb('#0b0c2e'), GOLD = rgb('#f6c443'), GOLD2 = rgb('#fff2b0'), LOCK = rgb('#8f93a3'), AIR = rgb('#7fb0ff'), AIR2 = rgb('#3d5fd0');
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
const hash = (a, b, c) => { const x = Math.sin(a * 127.1 + b * 311.7 + c * 74.7) * 43758.5453; return x - Math.floor(x); };
const wrap = (a) => a - Math.floor(a);

// every pixel of the planet's square, worked out once: distance, angle, light
const R = new Float32Array(SIZE * SIZE), A = new Float32Array(SIZE * SIZE), L = new Uint8Array(SIZE * SIZE);
for (let j = 0; j < SIZE; j++) for (let i = 0; i < SIZE; i++) {
  const k = j * SIZE + i, dx = i + 0.5 - HALF, dy = j + 0.5 - HALF, r = Math.hypot(dx, dy);
  R[k] = r; A[k] = wrap(Math.atan2(dx, -dy) / (Math.PI * 2));
  if (r < ro) {
    const nx = dx / ro, ny = dy / ro, nz = Math.sqrt(Math.max(0, 1 - nx * nx - ny * ny));
    const lit = (-nx * 0.5 - ny * 0.55 + nz * 0.67) / 1.0, v = lit * 3.2 + 0.2 + (BAYER[(j & 3) * 4 + (i & 3)] / 16 - 0.5) * 0.9;
    L[k] = Math.max(0, Math.min(3, Math.round(v)));
  }
}
const buf = typeof document !== 'undefined' ? document.createElement('canvas') : null;
let bg = null, img = null;
if (buf) { buf.width = buf.height = SIZE; bg = buf.getContext('2d'); img = bg.createImageData(SIZE, SIZE); }

const width = (level) => (ro - rc) / level.rings;
export function ringAt(level, x, y) {
  const r = Math.hypot(x - cx, y - cy);
  if (r >= ro) return -1;
  return r < rc ? 0 : Math.min(level.rings, 1 + Math.floor((r - rc) / width(level)));
}
export const angleAt = (x, y) => wrap(Math.atan2(x - cx, -(y - cy)) / (Math.PI * 2));

/** The land of `level` that ring `ring`, turned by `turn` sectors, shows at angle `a` (turns). */
const landAt = (level, turn, a) => { const S = level.pattern.length; return level.pattern[Math.floor(wrap(a - turn / S) * S) % S]; };

export function drawPlanet(g, level, view, t) {
  if (!img) return;
  const d = img.data, w = width(level), S = level.pattern.length, n = level.rings, locked = level.locked || [];
  const blink = Math.floor(t * 3) % 2, glow = view.won ? Math.min(1, (t - (view.wonAt || t)) * 1.5) : 0;
  for (let k = 0; k < SIZE * SIZE; k++) {
    const r = R[k], o = k * 4;
    let c = null;
    if (r < ro) {
      const ring = r < rc ? 0 : Math.min(n, 1 + Math.floor((r - rc) / w)), a = A[k];
      const turn = view.shown[ring] || 0, land = landAt(level, turn, a), P = RGB[land];
      c = P.c[L[k]];
      // a detail on the land, fixed to its ring so it turns with it
      const ca = wrap(a - turn / S), rr = Math.round(r);
      if (L[k] > 0 && hash(ring * 7 + 1, rr, Math.floor(ca * rr * 6.28)) < P.every) c = P.spark;
      // the seam between this ring and the next one in
      if (r >= rc) {
        const edge = rc + (ring - 1) * w, near = r - edge;
        if (near < 0.9 && ring >= 1 && !view.won) {                                  // solved: no seams left at all
          const inner = ring - 1, landIn = landAt(level, view.shown[inner] || 0, a);
          const sel = view.sel === ring || view.sel === inner;
          if (sel && !view.won) c = blink ? GOLD : GOLD2;
          else if (locked.includes(ring) || locked.includes(inner)) c = Math.floor(a * 80) % 2 ? LOCK : SEAM;
          else c = landIn === land ? P.c[0] : SEAM;
        }
      }
      // the outer edge of the selected ring, when it is the coast ring
      if (view.sel === n && !view.won && r > ro - 0.9) c = blink ? GOLD : GOLD2;
    } else if (r < ro + 1.6) {
      c = (k + Math.floor(t * 2)) % 3 ? AIR2 : AIR;                               // a thin blue atmosphere
    } else if (glow && r < ro + 4.2 && (Math.floor(A[k] * 90 + t * 8) % 3 === 0 || r < ro + 2.6)) {
      c = glow > 0.5 && Math.floor(A[k] * 40 - t * 6) % 2 ? GOLD2 : GOLD;          // the solved planet's halo
    }
    if (c) { d[o] = c[0]; d[o + 1] = c[1]; d[o + 2] = c[2]; d[o + 3] = 255; } else d[o + 3] = 0;
  }
  bg.putImageData(img, 0, 0);
  g.drawImage(buf, cx - HALF, cy - HALF);
}
