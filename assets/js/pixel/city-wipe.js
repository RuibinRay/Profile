/*
 * city-wipe.js — the way into Game City, and back out to the pixel world.
 *
 * Going in: the city that was clicked zooms toward the pointer while a skyline of big pixel towers rises
 * from the bottom of the screen, nearest the pointer first. Each tower takes a district's colours, its roof
 * glows in the district's accent, and its windows light up one by one as it climbs, until the towers fill
 * the screen. A card says where you are going while five blocks, one per district, fill. The next page
 * starts covered and the towers sink back into the street from the middle outward.
 *
 *   cityCover({ x, y, zoom })   raise the towers toward (x, y); zoom: an element to zoom in on; resolves when covered
 *   cityReveal({ card })        start covered and let the towers sink; resolves when the page is clear
 *   enterCity(url, point, o)    cover, show the card (o.label), remember that the next page should open, go
 *   cityArriving()              true once, on a page reached through enterCity
 *
 * A page restored by the browser's Back button is shown uncovered (the pageshow listener). With reduced
 * motion the towers rise and sink in fewer, larger steps and nothing zooms.
 */
const FLAG = 'px-city';
const TOWERS = [
  { wall: [58, 47, 107], roof: [246, 196, 67], win: [255, 224, 138] },     // Pixel Plaza
  { wall: [42, 20, 80], roof: [200, 107, 255], win: [65, 232, 216] },      // Neon Ward
  { wall: [93, 96, 114], roof: [255, 157, 46], win: [255, 211, 138] },     // Moon Dock
  { wall: [74, 51, 34], roof: [127, 232, 192], win: [255, 207, 107] },     // North Harbour
  { wall: [18, 50, 70], roof: [88, 230, 255], win: [255, 224, 138] }       // Skyline Center
];
const DARK = [11, 12, 46];
const calm = () => window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
let layer = null;

function rnd(i) { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); }

/** The grid of big pixels, and the towers that stand on it: runs of 2–4 columns, each with a district and a moment. */
function make(x, sinking) {
  if (layer) layer.cv.remove();
  const W = window.innerWidth, H = window.innerHeight, cell = Math.max(12, Math.round(Math.min(W, H) / 30));
  const cols = Math.ceil(W / cell), rows = Math.ceil(H / cell);
  const cv = document.createElement('canvas');
  cv.width = cols; cv.height = rows; cv.className = 'px-wipe'; cv.setAttribute('aria-hidden', 'true');
  cv.style.cssText = 'position:fixed;left:0;top:0;width:' + cols * cell + 'px;height:' + rows * cell + 'px;z-index:9999;image-rendering:pixelated;image-rendering:crisp-edges;pointer-events:auto';
  document.body.appendChild(cv);
  const g = cv.getContext('2d'), cx = x / cell;
  const colTower = new Int16Array(cols), towers = [];
  for (let c = 0, k = 0; c < cols; k++) {
    const w = 2 + Math.floor(rnd(k * 3 + 1) * 3), mid = c + w / 2;
    const near = Math.abs(mid - cx) / Math.max(cx, cols - cx, 1);
    towers.push({ c0: c, w, kind: TOWERS[Math.floor(rnd(k * 7 + 2) * 5)], at: near * (sinking ? 0.5 : 0.62) + rnd(k * 11 + 3) * 0.14 });
    for (let i = c; i < Math.min(cols, c + w); i++) colTower[i] = k;
    c += w;
  }
  layer = { cv, g, cols, rows, cell, img: g.createImageData(cols, rows), colTower, towers };
  return layer;
}

/** Paint the share p of the change. rising: towers grow (cover); else they sink (reveal). */
function paint(L, p, rising) {
  const d = L.img.data, steps = calm() ? 4 : 0;
  for (let c = 0; c < L.cols; c++) {
    const T = L.towers[L.colTower[c]];
    let f = Math.min(1, Math.max(0, (p * 1.55 - T.at) / 0.55));
    if (steps) f = Math.ceil(f * steps) / steps;
    const grown = rising ? f : 1 - f;
    // ease: fast at first, settling at the top, in whole cells
    const height = Math.round((1 - (1 - grown) * (1 - grown)) * L.rows), top = L.rows - height, inner = c - T.c0;
    for (let r = 0; r < L.rows; r++) {
      const o = (r * L.cols + c) * 4;
      if (r < top) { d[o + 3] = 0; continue; }
      let col;
      if (r === top && height < L.rows) col = T.kind.roof;                                  // the glowing roof line
      else if (inner % 2 === 1 && r % 2 === 1 && inner < T.w - 0) {
        const lightUp = rising ? grown : 1 - grown * 0.2;
        col = rnd(c * 131 + r * 17) < lightUp * 0.85 ? T.kind.win : DARK;                    // a window, lit as it climbs
      } else col = (inner === T.w - 1) ? T.kind.wall.map((v, i) => Math.round((v + DARK[i]) / 2)) : T.kind.wall;
      d[o] = col[0]; d[o + 1] = col[1]; d[o + 2] = col[2]; d[o + 3] = 255;
    }
  }
  L.g.putImageData(L.img, 0, 0);
}
function run(L, rising, ms) {
  return new Promise((done) => {
    const t0 = performance.now();
    let finished = false;
    const end = () => { if (finished) return; finished = true; paint(L, 1, rising); done(); };
    const step = (now) => { if (finished) return; const p = Math.min(1, (now - t0) / ms); paint(L, p, rising); if (p < 1) requestAnimationFrame(step); else end(); };
    requestAnimationFrame(step);
    setTimeout(end, ms + 400);                       // a tab in the background does not run frames: finish anyway
  });
}

/** The card on the covered screen: where you are going, and five blocks (one per district) that fill. */
function card(text, filled) {
  const el = document.createElement('div');
  el.className = 'px-card'; el.setAttribute('aria-hidden', 'true');
  el.style.cssText = 'position:fixed;inset:0;z-index:10000;display:grid;place-content:center;justify-items:center;gap:22px;pointer-events:none;color:#fff8e6;font:600 clamp(14px,2.2vw,22px)/1 ui-monospace,Menlo,Consolas,monospace;letter-spacing:.28em;text-transform:uppercase;text-shadow:3px 3px 0 #0b0c2e';
  const t = document.createElement('div'); t.textContent = text;
  t.style.cssText = 'padding:12px 16px;background:#0b0c2e;border:3px solid #fff8e6;box-shadow:6px 6px 0 rgba(4,4,20,.8)';
  const bar = document.createElement('div'); bar.style.cssText = 'display:flex;gap:6px';
  const cols = TOWERS.map((k) => 'rgb(' + k.roof.join(',') + ')');
  const blocks = cols.map((c, i) => { const b = document.createElement('i'); b.style.cssText = 'width:22px;height:22px;border:3px solid #fff8e6;background:' + (i < filled ? c : '#0b0c2e'); bar.appendChild(b); return b; });
  el.append(t, bar); document.body.appendChild(el);
  return { el, fill(ms) { return new Promise((done) => { blocks.forEach((b, i) => setTimeout(() => { b.style.background = cols[i]; }, (i + 1) * ms / 6)); setTimeout(done, ms); }); } };
}

/** Raise the towers toward (x, y); o.zoom: an element that zooms in on the point meanwhile. */
export function cityCover(o = {}) {
  const x = o.x == null ? window.innerWidth / 2 : o.x, y = o.y == null ? window.innerHeight / 2 : o.y;
  const el = o.zoom;
  if (el && !calm()) {
    const r = el.getBoundingClientRect();
    el.style.transformOrigin = ((x - r.left) / r.width * 100) + '% ' + ((y - r.top) / r.height * 100) + '%';
    el.style.transition = 'transform .9s steps(9)';
    el.style.transform = 'scale(2.6)';
    el.style.position = el.style.position || 'relative'; el.style.zIndex = '30';
  }
  return run(make(x, false), true, o.ms || 1000);
}
/** Start covered; the towers sink into the street from the middle outward. */
export function cityReveal(o = {}) {
  const L = make(window.innerWidth / 2, true);
  paint(L, 0, false);
  const c = o.card === false ? null : card(o.card || 'Game City', 5);
  return new Promise((r) => setTimeout(r, c ? 360 : 0))
    .then(() => { if (c) c.el.remove(); return run(L, false, o.ms || 1000); })
    .then(() => { L.cv.remove(); if (layer === L) layer = null; });
}
/** Cover, show where we are going, then go to `url`. The page there opens with cityReveal (see cityArriving). */
export function enterCity(url, point = {}, o = {}) {
  try { sessionStorage.setItem(FLAG, o.label || 'Game City'); } catch (e) {}
  return cityCover({ ...point, zoom: o.zoom }).then(() => card(o.label ? 'To ' + o.label : 'Entering Game City', 0).fill(560)).then(() => { window.location.href = url; });
}
/** The label to open with, once, on the page reached through enterCity; otherwise null. */
export function cityArriving() {
  try { const v = sessionStorage.getItem(FLAG); if (v) { sessionStorage.removeItem(FLAG); return v; } } catch (e) {}
  return null;
}
// Back to a page that was left covered: the browser restores it as it was, cover and zoom and all. Undo them.
window.addEventListener('pageshow', (e) => {
  if (!e.persisted) return;
  if (layer) { layer.cv.remove(); layer = null; }
  document.querySelectorAll('.px-card').forEach((c) => c.remove());
  document.querySelectorAll('[style*="scale(2.6)"]').forEach((el) => { el.style.transform = ''; el.style.transition = ''; el.style.zIndex = ''; });
  document.documentElement.classList.remove('is-arriving');
  try { sessionStorage.removeItem(FLAG); } catch (err) {}
});
