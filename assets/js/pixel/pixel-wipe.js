/*
 * pixel-wipe.js — the way into the pixel world, and out of it.
 *
 * The screen is covered by a grid of big square pixels that close in like an iris on the point that
 * was clicked (the planet): each square flashes one of the four worlds' colours as it lands and then
 * settles to night blue. The next page starts covered and the squares open again from the centre.
 *
 *   pixelCover({ x, y })   cover the screen, closing on (x, y); resolves when it is covered
 *   pixelReveal()          start covered and open; resolves when the page is clear
 *   leaveTo(url, point)    cover, remember that the next page should open, then go there
 *
 * A page restored by the browser's Back button is shown uncovered (see the pageshow listener).
 */
const NIGHT = [11, 12, 46], SPARK = [[200, 107, 255], [255, 157, 46], [127, 232, 192], [88, 230, 255], [246, 196, 67], [255, 248, 230]];
const FLAG = 'px-wipe';
let layer = null;

function make() {
  if (layer) layer.cv.remove();
  const W = window.innerWidth, H = window.innerHeight, cell = Math.max(14, Math.round(Math.min(W, H) / 26));
  const cols = Math.ceil(W / cell), rows = Math.ceil(H / cell);
  const cv = document.createElement('canvas');
  cv.width = cols; cv.height = rows; cv.className = 'px-wipe'; cv.setAttribute('aria-hidden', 'true');
  cv.style.cssText = 'position:fixed;left:0;top:0;width:' + cols * cell + 'px;height:' + rows * cell + 'px;z-index:9999;image-rendering:pixelated;image-rendering:crisp-edges;pointer-events:auto';
  document.body.appendChild(cv);
  const g = cv.getContext('2d');
  layer = { cv, g, cols, rows, cell, img: g.createImageData(cols, rows) };
  return layer;
}
function rnd(i) { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); }

// the edge of the wipe is four rings, one for each world, then deep blue, then night
const RINGS = [[255, 248, 230], [88, 230, 255], [127, 232, 192], [255, 157, 46], [200, 107, 255], [60, 50, 150], [30, 30, 96]];
/** Draw the grid when the share p of the wipe is done. `closing`: squares arrive (true) or leave (false). */
function paint(L, order, p, closing) {
  const d = L.img.data;
  for (let i = 0; i < L.cols * L.rows; i++) {
    const a = p * 1.36 - order[i];                 // how long ago this square's moment came (negative: not yet)
    const o = i * 4, on = closing ? a > 0 : a <= 0;
    if (!on) { d[o + 3] = 0; continue; }
    const edge = closing ? a : -a, band = Math.floor(edge / 0.034);
    const c = band < RINGS.length ? (rnd(i) < 0.12 ? SPARK[5] : RINGS[band]) : NIGHT;
    d[o] = c[0]; d[o + 1] = c[1]; d[o + 2] = c[2]; d[o + 3] = 255;
  }
  L.g.putImageData(L.img, 0, 0);
}
function run(L, order, closing, ms) {
  return new Promise((done) => {
    const t0 = performance.now();
    const step = (now) => {
      const p = Math.min(1, (now - t0) / ms);
      paint(L, order, p, closing);
      if (p < 1) requestAnimationFrame(step); else done();
    };
    requestAnimationFrame(step);
    // a tab in the background does not run frames: finish anyway
    setTimeout(() => { paint(L, order, 1, closing); done(); }, ms + 400);
  });
}
/** The moment (0–1) each square changes: by its distance from (x, y), wound into a spiral, with a little chance. */
function orderFrom(L, x, y, inward) {
  const cx = x / L.cell, cy = y / L.cell, far = Math.hypot(Math.max(cx, L.cols - cx), Math.max(cy, L.rows - cy));
  const order = new Float32Array(L.cols * L.rows);
  for (let j = 0; j < L.rows; j++) for (let i = 0; i < L.cols; i++) {
    const dx = i + 0.5 - cx, dy = j + 0.5 - cy, dist = Math.hypot(dx, dy) / far;
    const turn = ((Math.atan2(dy, dx) / (Math.PI * 2) + 1 + dist * 1.5) % 1);       // three arms sweeping round
    order[j * L.cols + i] = (inward ? 1 - dist : dist) * 0.72 + ((turn * 3) % 1) * 0.2 + rnd(j * L.cols + i + 7) * 0.08;
  }
  return order;
}
/** The card in the middle of the covered screen: a name and a bar of blocks that fills. */
function card(text, filled) {
  const el = document.createElement('div');
  el.className = 'px-card'; el.setAttribute('aria-hidden', 'true');
  el.style.cssText = 'position:fixed;left:0;top:0;right:0;bottom:0;z-index:10000;display:grid;place-content:center;justify-items:center;gap:22px;pointer-events:none;color:#fff8e6;font:600 clamp(14px,2.2vw,22px)/1 ui-monospace,Menlo,Consolas,monospace;letter-spacing:.28em;text-transform:uppercase';
  const t = document.createElement('div'); t.textContent = text;
  const bar = document.createElement('div'); bar.style.cssText = 'display:flex;gap:6px';
  const cols = ['#c86bff', '#c86bff', '#ff9d2e', '#ff9d2e', '#7fe8c0', '#7fe8c0', '#58e6ff', '#58e6ff'];
  const blocks = cols.map((c, i) => { const b = document.createElement('i'); b.style.cssText = 'width:18px;height:18px;border:2px solid #fff8e6;background:' + (i < filled ? c : 'transparent'); bar.appendChild(b); return b; });
  el.append(t, bar); document.body.appendChild(el);
  return { el, fill(ms) { return new Promise((done) => { blocks.forEach((b, i) => setTimeout(() => { b.style.background = cols[i]; }, (i + 1) * ms / 9)); setTimeout(done, ms); }); } };
}

/** Cover the screen with squares that close in on (x, y). */
export function pixelCover(o = {}) {
  const L = make(), x = o.x == null ? window.innerWidth / 2 : o.x, y = o.y == null ? window.innerHeight / 2 : o.y;
  return run(L, orderFrom(L, x, y, true), true, o.ms || 900);
}
/** Start covered; open from the centre. */
export function pixelReveal(o = {}) {
  const L = make();
  const order = orderFrom(L, window.innerWidth / 2, window.innerHeight * 0.42, false);
  paint(L, order, 0, false);
  // a beat on the loading card (already full), then the squares open
  const c = o.card === false ? null : card('Pixel World', 8);
  return new Promise((r) => setTimeout(r, c ? 320 : 0)).then(() => { if (c) c.el.remove(); return run(L, order, false, o.ms || 950); }).then(() => { L.cv.remove(); if (layer === L) layer = null; });
}
/** Cover, then go to `url`. With `opens`, the page there is told to open with pixelReveal (see arriving). */
export function leaveTo(url, point, opens) {
  try { if (opens) sessionStorage.setItem(FLAG, '1'); else sessionStorage.removeItem(FLAG); } catch (e) {}
  return pixelCover(point).then(() => (opens ? card('Entering Pixel World', 0).fill(520) : null)).then(() => { window.location.href = url; });
}
/** True once, on the page arrived at through leaveTo. */
export function arriving() {
  try { if (sessionStorage.getItem(FLAG)) { sessionStorage.removeItem(FLAG); return true; } } catch (e) {}
  return false;
}
// Back to a page that was left covered: the browser restores it as it was, cover and all. Take the cover off.
window.addEventListener('pageshow', (e) => {
  if (!e.persisted) return;
  if (layer) { layer.cv.remove(); layer = null; }
  document.querySelectorAll('.px-card').forEach((c) => c.remove());
  document.documentElement.classList.remove('is-landing');
  try { sessionStorage.removeItem(FLAG); } catch (err) {}
});
