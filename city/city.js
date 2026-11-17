/*
 * city.js — the Game City page (city/index.html): fifty buildings, one for each game, in five districts.
 *
 * The page reads the registry (city/data/games.js) and builds everything from it: the skyline map at the top
 * (click a building to find its card), a section per district with a card per game (each card has its own
 * building, drawn by assets/js/pixel/city-draw.js), and the filters. A game that is open is a link into
 * city/games/<id>/; one still being built opens a small window saying when it is planned to open.
 * Behind the page is the "game-city" scene of scenes.js, drawn in true pixels, with the traveller on the street.
 * The ways in and out close in towers (city-wipe.js). Without JavaScript the page says that it needs it.
 */
import { pixelText } from '../assets/js/pixel/pixel-kit.js?v=20261116a';
import { SCENES, traveller } from '../assets/js/pixel/scenes.js?v=20261117a';
import { drawCity, drawBuilding, shapeOf, hitTest, citySky } from '../assets/js/pixel/city-draw.js?v=20261117a';
import { enterCity, cityArriving, cityReveal } from '../assets/js/pixel/city-wipe.js?v=20261117a';
import { createTrail } from '../assets/js/pixel/pixel-trail.js?v=20261116a';
import { GAMES, DISTRICTS, TYPES, districtOf } from './data/games.js?v=20261117d';

/* the City Pass: the games finished in this browser, stamped by each game (city/kit/shell.js keeps it under city:pass) */
let pass = {};
try { const p = JSON.parse(localStorage.getItem('city:pass') || 'null'); if (p && p.v === 1 && p.got) pass = p.got; } catch (e) {}

const root = document.documentElement;
root.classList.remove('no-js'); root.classList.add('js');
const calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const CITY = { accent: '#ff6fae', ink: '#1c0616', name: 'Game City' };

function h(tag, attrs = {}, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  kids.flat().forEach((k) => el.append(k && k.nodeType ? k : document.createTextNode(k)));
  return el;
}
const isOpen = (gm) => gm.status === 'open';
const plainClick = (e) => !(e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button);

/* ---------- arriving through the towers ---------- */
const label = cityArriving();
if (label || root.classList.contains('is-arriving')) { cityReveal({ card: label || CITY.name }); root.classList.remove('is-arriving'); }

/* ---------- one card's building ---------- */
function paintArt(cv, gm, hot) {
  const g = cv.getContext('2d'), d = districtOf(gm), W = cv.width, H = cv.height, base = H - 6;
  ['#0d0c2c', '#16123c', '#221848', '#2e1a5c'].forEach((c, i) => { g.fillStyle = c; g.fillRect(0, Math.round(i * base / 4), W, Math.ceil(base / 4)); });
  for (let i = 0; i < 9; i++) { g.fillStyle = '#ffffff'; g.fillRect((gm.n * 13 + i * 17) % W, (gm.n * 7 + i * 11) % Math.round(H * 0.35), 1, 1); }
  g.fillStyle = '#141232'; g.fillRect(0, base, W, H - base);
  g.fillStyle = d.accent; g.fillRect(0, base, W, 1);
  const s = shapeOf(gm);
  drawBuilding(g, Math.round((W - s.w) / 2), base, gm, d, { time: performance.now() / 1000, hot, built: isOpen(gm) });
}

/* ---------- the window for a building still in scaffolding ---------- */
const dialog = document.getElementById('lot');
function showLot(gm) {
  const d = districtOf(gm);
  dialog.style.setProperty('--d', d.accent);
  dialog.querySelector('.lot__where').textContent = 'No. ' + gm.n + ' · ' + d.name;
  dialog.querySelector('.lot__name').textContent = gm.name;
  dialog.querySelector('.lot__kind').textContent = gm.genre;
  dialog.querySelector('.lot__say').textContent = gm.blurb;
  dialog.querySelector('.lot__state').textContent = 'Still in scaffolding. This game is planned to open in phase ' + gm.phase + ' of 10.';
  paintArt(dialog.querySelector('.lot__art'), gm, false);
  if (dialog.showModal) dialog.showModal(); else dialog.setAttribute('open', '');
}
dialog.addEventListener('click', (e) => { if (e.target === dialog) dialog.close(); });     // a click outside closes it

/* ---------- the districts and their cards ---------- */
const host = document.getElementById('districts');
host.textContent = '';
const cards = new Map();
DISTRICTS.forEach((d, i) => {
  const sec = h('section', { class: 'district', id: d.id, 'data-name': 'District ' + (i + 1) + ' · ' + d.name, 'data-accent': d.accent, 'data-ink': d.ink, style: '--d:' + d.accent + ';--d-ink:' + d.ink });
  sec.append(h('header', { class: 'district__head' },
    h('p', { class: 'world__no' }, 'District ' + (i + 1) + ' of 5 · ' + d.from),
    h('h2', { class: 'title', 'data-px': d.name }, d.name),
    h('p', { class: 'district__say' }, d.say)));
  const ul = h('ul', { class: 'lots' });
  GAMES.filter((gm) => gm.district === d.id).forEach((gm) => {
    const open = isOpen(gm), art = h('canvas', { width: 44, height: 64, 'aria-hidden': 'true' });
    const inner = [art,
      h('span', { class: 'lot-card__no' }, 'No. ' + gm.n),
      h('span', { class: 'lot-card__name' }, gm.name),
      h('span', { class: 'lot-card__kind' }, gm.genre),
      h('span', { class: 'lot-card__say' }, gm.blurb),
      h('span', { class: 'lot-card__state' + (open ? ' is-open' : '') + (pass[gm.id] ? ' is-stamped' : '') }, open ? (pass[gm.id] ? 'Stamped · play again' : 'Open · play') : 'Being built · phase ' + gm.phase)];
    const el = open
      ? h('a', { class: 'lot-card', id: 'game-' + gm.n, href: 'games/' + gm.id + '/' }, ...inner)
      : h('button', { class: 'lot-card', id: 'game-' + gm.n, type: 'button', 'aria-haspopup': 'dialog' }, ...inner);
    paintArt(art, gm, false);
    const lit = (on) => () => paintArt(art, gm, on);
    el.addEventListener('pointerenter', lit(true)); el.addEventListener('pointerleave', lit(false));
    el.addEventListener('focus', lit(true)); el.addEventListener('blur', lit(false));
    el.addEventListener('click', (e) => {
      if (!open) { showLot(gm); return; }
      if (!plainClick(e)) return;
      e.preventDefault();
      enterCity(el.getAttribute('href'), { x: e.clientX, y: e.clientY }, { label: gm.name });
    });
    const li = h('li', { 'data-type': gm.type }, el);
    ul.append(li);
    cards.set(gm.n, { el, li, sec });
  });
  sec.append(ul);
  host.append(sec);
});
document.getElementById('open-count').textContent = GAMES.filter(isOpen).length;
const stamps = GAMES.filter((gm) => isOpen(gm) && pass[gm.id]).length, passLine = document.getElementById('pass-count');
if (stamps && passLine) { passLine.textContent = ' Your City Pass has ' + stamps + (stamps === 1 ? ' stamp.' : ' stamps.'); passLine.hidden = false; }

/* ---------- pixel titles ---------- */
document.querySelectorAll('[data-px]').forEach((el) => {
  const text = el.getAttribute('data-px') || el.textContent;
  const lab = h('span', { class: 'visually-hidden' }, el.textContent);
  el.textContent = '';
  el.append(lab);
  text.split('/').forEach((line) => el.appendChild(pixelText(line.trim(), { shadow: true })));
});

/* ---------- filters ---------- */
const filters = document.querySelector('.filters');
function filterTo(type) {
  filters.querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.type === type)));
  cards.forEach((c) => { c.li.hidden = type !== 'all' && c.li.dataset.type !== type; });
  document.querySelectorAll('.district').forEach((s) => { s.hidden = !s.querySelector('li:not([hidden])'); });
}
TYPES.forEach((t) => {
  const n = t.id === 'all' ? GAMES.length : GAMES.filter((gm) => gm.type === t.id).length;
  const b = h('button', { class: 'filter', type: 'button', 'data-type': t.id, 'aria-pressed': String(t.id === 'all') }, t.name + ' ', h('span', { class: 'filter__n' }, String(n)));
  b.addEventListener('click', () => filterTo(t.id));
  filters.append(b);
});

/* ---------- find a building's card: from the map, or from a link such as #game-12 ---------- */
function find(n) {
  const c = cards.get(n);
  if (!c) return;
  if (c.li.hidden) filterTo('all');
  c.el.scrollIntoView({ behavior: calm ? 'auto' : 'smooth', block: 'center' });
  c.el.classList.remove('is-found'); void c.el.offsetWidth; c.el.classList.add('is-found');
  c.el.focus({ preventScroll: true });
}
const fromHash = /^#game-(\d+)$/.exec(window.location.hash);
if (fromHash) setTimeout(() => find(+fromHash[1]), label ? 700 : 60);

/* ---------- the skyline map ---------- */
const map = document.querySelector('.map__canvas'), mapBox = map.parentElement, tip = mapBox.querySelector('.map__tip');
// The whole street is drawn on `off` (360 pixels wide). A wide screen shows all of it; a narrow one shows a closer
// window of 180 that pans along by itself, faster toward the edge you point at, and holds still on a building.
const mg = map.getContext('2d'), off = document.createElement('canvas'), og = off.getContext('2d');
off.width = 360; off.height = map.height;
let boxes = [], hot = null, lastMap = 0, mapSeen = true, pan = 0, dir = 1, push = 0, lastT = 0;
function fitMap() {
  const narrow = mapBox.clientWidth < 620, w = narrow ? 180 : 360;
  if (map.width !== w) { map.width = w; map.height = narrow ? 104 : 124; off.height = map.height; map.style.aspectRatio = w + ' / ' + map.height; }
}
function paintMap(now) {
  const t = (now || performance.now()) / 1000 * (calm ? 0.35 : 1), dt = lastT ? Math.min(0.1, Math.max(0, t - lastT)) : 0;
  lastT = t;
  const most = off.width - map.width;
  pan = most ? pan + (push || (hot ? 0 : dir * 7)) * dt : 0;
  if (pan >= most) { pan = most; dir = -1; } else if (pan <= 0) { pan = 0; dir = 1; }
  citySky(mg, map.width, map.height, t);
  og.clearRect(0, 0, off.width, off.height);
  boxes = drawCity(og, off.width, off.height, GAMES, DISTRICTS, t, { hot: hot && hot.n, ground: off.height - 10 });
  mg.drawImage(off, -Math.round(pan), 0);
  lastMap = now || 0;
}
const under = (e) => { const r = map.getBoundingClientRect(); return hitTest(boxes, (e.clientX - r.left) / r.width * map.width + Math.round(pan), (e.clientY - r.top) / r.height * map.height); };
window.addEventListener('resize', () => { fitMap(); paintMap(); });
fitMap();
mapBox.addEventListener('pointermove', (e) => {
  const r = map.getBoundingClientRect(), at = (e.clientX - r.left) / r.width;
  push = map.width < off.width ? (at < 0.14 ? -60 : at > 0.86 ? 60 : 0) : 0;
  const gm = under(e);
  if ((gm && gm.n) === (hot && hot.n)) return;
  hot = gm;
  tip.textContent = gm ? 'No. ' + gm.n + ' · ' + gm.name + ' · ' + districtOf(gm).name : 'Click a building';
  mapBox.classList.toggle('is-hot', !!gm);
  paintMap();
});
mapBox.addEventListener('pointerleave', () => { hot = null; push = 0; tip.textContent = 'Click a building'; mapBox.classList.remove('is-hot'); paintMap(); });
mapBox.addEventListener('click', (e) => { const gm = under(e); if (gm) find(gm.n); });
if ('IntersectionObserver' in window) new IntersectionObserver((es) => { mapSeen = es[0].isIntersecting; }).observe(map);
paintMap();

/* ---------- the city behind the page ---------- */
const sky = document.getElementById('sky'), sg = sky.getContext('2d');
let bw = 320, bh = 180, lastY = -1, facing = 1, lastSky = 0;
function resize() {
  const W = window.innerWidth, H = window.innerHeight, px = Math.max(2, Math.ceil(Math.max(W / 340, H / 210)));
  bw = Math.max(1, Math.ceil(W / px)); bh = Math.max(1, Math.ceil(H / px));   // never 0, even in a window not yet laid out
  sky.width = bw; sky.height = bh;
  drawSky();
}
function drawSky(now) {
  const t = (now || performance.now()) / 1000 * (calm ? 0.35 : 1), y = window.scrollY, H = window.innerHeight;
  SCENES['game-city'](sg, bw, bh, t, y / H * 0.6);
  const total = Math.max(1, document.documentElement.scrollHeight - H);
  if (lastY >= 0 && Math.abs(y - lastY) > 0.5) facing = y > lastY ? 1 : -1;
  traveller(sg, Math.round(6 + (y / total) * (bw - 20)), bh - 16, Math.floor(y / 26), facing, '#ff6fae');
  lastY = y; lastSky = now || 0;
}
let ticking = false;
window.addEventListener('scroll', () => { if (ticking) return; ticking = true; requestAnimationFrame((now) => { ticking = false; drawSky(now); }); }, { passive: true });
window.addEventListener('resize', resize);
resize();
// the sky and the map live about 12 frames a second: pixel art does not need more
(function loop(now) {
  requestAnimationFrame(loop);
  if (document.hidden) return;
  if (now - lastSky > 80) drawSky(now);
  if (mapSeen && now - lastMap > 80) paintMap(now);
})(0);

/* ---------- the bar follows the district on screen ---------- */
const dots = Array.from(document.querySelectorAll('.hud__dot')), hudName = document.querySelector('.hud__name');
function here(s) {
  root.style.setProperty('--accent', s ? s.dataset.accent : CITY.accent);
  root.style.setProperty('--accent-ink', s ? s.dataset.ink : CITY.ink);
  hudName.textContent = s ? s.dataset.name : CITY.name;
  dots.forEach((d) => d.classList.toggle('is-on', !!s && d.getAttribute('href') === '#' + s.id));
}
here(null);
if ('IntersectionObserver' in window) {
  const seen = new Map();
  const io = new IntersectionObserver((es) => {
    es.forEach((e) => seen.set(e.target, e.isIntersecting ? e.intersectionRatio : 0));
    let best = null, ratio = 0;
    seen.forEach((r, s) => { if (r > ratio) { ratio = r; best = s; } });
    here(best && best.classList.contains('district') ? best : null);
  }, { threshold: [0, 0.15, 0.3, 0.5, 0.75], rootMargin: '-35% 0px -35% 0px' });
  document.querySelectorAll('.district, .city-top, .city-end').forEach((s) => io.observe(s));
}

/* ---------- back to the pixel world, through the towers ---------- */
document.querySelectorAll('a[data-back]').forEach((a) => a.addEventListener('click', (e) => {
  if (!plainClick(e)) return;
  e.preventDefault();
  enterCity(a.getAttribute('href'), { x: e.clientX || window.innerWidth / 2, y: e.clientY || window.innerHeight / 2 }, { label: 'Pixel World' });
}));

/* ---------- the mouse sheds pixels in the colour of the district on screen ---------- */
createTrail({ accent: () => getComputedStyle(root).getPropertyValue('--accent').trim() || CITY.accent });
