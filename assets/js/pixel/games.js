/*
 * games.js — the games page (games.html): a pixel world to scroll through, one land for each game.
 *
 * Behind the page a small canvas is drawn in true pixels and scaled up. As the page is scrolled from
 * one world to the next, the landscape and its colours change by a dither that sweeps up the screen
 * (each pixel flips from the old world to the new one at its own moment), the interface takes the new
 * world's accent colour, and a small traveller walks along the bottom. The worlds' pictures are in
 * scenes.js; the planet and the pixel font in pixel-kit.js. Without JavaScript the page is a plain
 * list of the four games.
 */
import { pixelText, createPlanet } from './pixel-kit.js?v=20261116a';
import { SCENES, traveller } from './scenes.js?v=20261116a';
import { pixelReveal, leaveTo, arriving } from './pixel-wipe.js?v=20261116a';
import { createTrail } from './pixel-trail.js?v=20261116a';

const root = document.documentElement;
root.classList.remove('no-js'); root.classList.add('js');
const calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---------- pixel titles ---------- */
document.querySelectorAll('[data-px]').forEach((el) => {
  const text = el.getAttribute('data-px') || el.textContent;
  const label = document.createElement('span'); label.className = 'visually-hidden'; label.textContent = el.textContent;
  el.textContent = '';
  el.appendChild(label);
  // a long title breaks into lines at "/" so it fits a phone
  text.split('/').forEach((line) => el.appendChild(pixelText(line.trim(), { shadow: true })));
});

/* ---------- the planet on the start screen ---------- */
const planetHost = document.querySelector('.px-planet');
let planet = null;
if (planetHost) { planet = createPlanet(planetHost, { size: 112 }); planet.setActive(true); }

/* ---------- the sky ---------- */
const cv = document.getElementById('sky'), g = cv.getContext('2d');
const bufA = document.createElement('canvas'), bufB = document.createElement('canvas');
const ga = bufA.getContext('2d', { willReadFrequently: true }), gb = bufB.getContext('2d', { willReadFrequently: true });
let bw = 320, bh = 180, mixed = null;
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
const stops = Array.from(document.querySelectorAll('[data-world]'));         // every screen of the page, in order
const dots = Array.from(document.querySelectorAll('.hud__dot'));
const hudName = document.querySelector('.hud__name');
let tops = [];

function resize() {
  const W = window.innerWidth, H = window.innerHeight, px = Math.max(2, Math.ceil(Math.max(W / 340, H / 210)));
  bw = Math.ceil(W / px); bh = Math.ceil(H / px);
  [cv, bufA, bufB].forEach((c) => { c.width = bw; c.height = bh; });
  mixed = g.createImageData(bw, bh);
  tops = stops.map((s) => s.offsetTop);
  draw();
}

let lastY = -1, facing = 1, current = -1, lastDraw = 0;
function draw(now) {
  // a device that asks for less motion still gets a living world (stars, lights, snow), at a third of the pace
  const time = (now || performance.now()) / 1000 * (calm ? 0.35 : 1);
  const H = window.innerHeight, y = window.scrollY, mid = y + H * 0.5;
  // which world the middle of the screen is in, and how far the change to the next one has got
  let i = 0;
  for (let k = 0; k < tops.length; k++) if (mid >= tops[k]) i = k;
  const next = tops[i + 1], f = next == null ? 0 : Math.min(1, Math.max(0, (mid - (next - H * 0.55)) / (H * 0.55)));
  const idA = stops[i].dataset.world, idB = f > 0 ? stops[i + 1].dataset.world : null;
  const travel = (el) => (y - el.offsetTop) / H;
  SCENES[idA](ga, bw, bh, time, travel(stops[i]));
  if (idB && idB !== idA) {
    SCENES[idB](gb, bw, bh, time, travel(stops[i + 1]));
    // the change: a dither that climbs the screen, so the new world's colours rise from the ground
    const a = ga.getImageData(0, 0, bw, bh).data, b = gb.getImageData(0, 0, bw, bh).data, o = mixed.data;
    for (let py = 0; py < bh; py++) {
      const lift = (1 - py / bh) * 0.7;                        // the top of the screen changes last
      for (let px = 0; px < bw; px++) {
        const k = (py * bw + px) * 4, t = (BAYER[(py & 3) * 4 + (px & 3)] + 0.5) / 16 * 0.3 + lift;
        const src = f * 1.0 > t ? b : a;
        o[k] = src[k]; o[k + 1] = src[k + 1]; o[k + 2] = src[k + 2]; o[k + 3] = 255;
      }
    }
    g.putImageData(mixed, 0, 0);
  } else g.drawImage(bufA, 0, 0);
  // the traveller walks the bottom of the screen: across it once over the whole page
  const total = Math.max(1, document.documentElement.scrollHeight - H), p = y / total;
  if (lastY >= 0 && Math.abs(y - lastY) > 0.5) facing = y > lastY ? 1 : -1;
  traveller(g, Math.round(6 + p * (bw - 20)), bh - 16, Math.floor(y / 26), facing);
  lastY = y;
  // the interface follows: accent colour, the name in the bar, the dots
  const here = f > 0.5 ? i + 1 : i;
  if (here !== current) {
    current = here;
    const s = stops[here];
    root.style.setProperty('--accent', s.dataset.accent || '#f6c443');
    root.style.setProperty('--accent-ink', s.dataset.ink || '#0b0c2e');
    if (hudName) hudName.textContent = s.dataset.name || '';
    dots.forEach((d) => d.classList.toggle('is-on', d.getAttribute('href') === '#' + s.id));
    stops.forEach((x, k) => x.classList.toggle('is-here', k === here));
  }
  lastDraw = now || 0;
}

// The worlds move by themselves (stars, lights, snow), about 12 times a second: pixel art does not need
// more, and it leaves the scroll smooth. Scrolling draws at once.
let raf = 0, ticking = false;
function loop(now) {
  raf = requestAnimationFrame(loop);
  if (document.hidden) return;
  if (now - lastDraw > 80) draw(now);
}
window.addEventListener('scroll', () => { if (ticking) return; ticking = true; requestAnimationFrame((now) => { ticking = false; draw(now); }); }, { passive: true });
window.addEventListener('resize', resize);
if (document.fonts && document.fonts.ready) document.fonts.ready.then(resize);
window.addEventListener('load', resize);
resize();
raf = requestAnimationFrame(loop);

/* ---------- arriving and leaving through big pixels (pixel-wipe.js) ---------- */
// Arrived from the planet in the gallery: the page starts covered (a class set in the page's head) and opens.
if (arriving() || root.classList.contains('is-arriving')) { pixelReveal(); root.classList.remove('is-arriving'); }
// Going back to the portfolio: the pixels close on the link that was pressed.
document.querySelectorAll('a[href^="index.html"], a[href="portfolio.html"]').forEach((a) => a.addEventListener('click', (e) => {
  if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button) return;
  e.preventDefault();
  leaveTo(a.getAttribute('href'), { x: e.clientX || window.innerWidth / 2, y: e.clientY || window.innerHeight / 2 }, false);
}));

/* ---------- the mouse sheds pixels in the colour of the world on screen (pixel-trail.js) ---------- */
createTrail({ accent: () => getComputedStyle(root).getPropertyValue('--accent').trim() || '#f6c443' });

/* ---------- trailers: one at a time ---------- */
const tapes = Array.from(document.querySelectorAll('.tape video'));
tapes.forEach((v) => v.addEventListener('play', () => tapes.forEach((o) => { if (o !== v) o.pause(); })));

/* ---------- screens arrive as they are reached ---------- */
if ('IntersectionObserver' in window) {
  const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) e.target.classList.add('is-seen'); }), { threshold: 0.12 });
  stops.forEach((s) => io.observe(s));
  if (planet) new IntersectionObserver((es) => planet.setActive(es[0].isIntersecting)).observe(planetHost);
} else stops.forEach((s) => s.classList.add('is-seen'));
