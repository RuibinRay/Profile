/*
 * portfolio.js — the plain portfolio (portfolio.html): everything on one ordinary page.
 *
 * No film, no WebGL: the same content components as the film's panels (assets/js/content/*.js) are
 * simply rendered into sections, with a still painting behind each one. Deep links are the same:
 * #projects/<id>, #world/<CODE>, #experience/<id>, #skills/<id>, #memories/<album>.
 */
import { buildProjectIndex } from './cinema/project-index.js';

const RJY = window.RJY, SITE = window.SITE, h = RJY.h;
const doc = document.documentElement;

// the star chart drifts unless the visitor prefers reduced motion (it reads this to decide)
RJY.motion = { paused: RJY.reducedMotion };

/* ---------- 1. the opening: who, what, and where to go ---------- */
(function hero() {
  const q = (n) => document.querySelector('[data-fill="' + n + '"]');
  const P = SITE.profile, L = SITE.links, edu = (SITE.education || [])[0];
  const glance = (label) => ((SITE.about.glance || []).find((g) => g.label === label) || {}).value;
  q('tagline').textContent = P.tagline;
  q('intro').textContent = SITE.about.intro[0];
  q('ctas').append(...[
    h('a', { class: 'pill pill--gold', href: '#projects', text: 'See the projects' }),
    h('a', { class: 'pill', href: '#experience', text: 'Experience' }),
    RJY.has(L.resume) ? h('a', { class: 'pill', href: L.resume, download: '', text: 'Download my résumé' }) : null,
    RJY.has(L.email) ? h('a', { class: 'pill', href: 'mailto:' + L.email, text: 'Email me' }) : null
  ].filter(Boolean));
  const facts = [
    ['Studying', edu ? edu.degree + ', ' + edu.school : ''],
    ['Graduating', glance('Graduation')],
    ['Based in', glance('Currently based in')],
    ['Languages', glance('Languages')],
    ['Work so far', (SITE.journey || []).filter((e) => e.type === 'work').map((e) => e.short || e.org).join(' · ')],
    ['Interests', glance('Professional interests')]
  ].filter((f) => RJY.has(f[1]));
  q('facts').append(...facts.map((f) => h('div', null, h('dt', { text: f[0] }), h('dd', { text: f[1] }))));
})();

/* ---------- 2. render the sections ---------- */
function render(name, fn) {
  const el = document.querySelector('[data-render="' + name + '"]');
  if (el && fn) { try { fn(el); } catch (e) { console.error('Could not render ' + name, e); } }
}
render('about', RJY.renderAbout);
render('education', RJY.renderEducation);
render('offclock', RJY.renderOffclock);
render('journey', RJY.renderJourney);
render('index', (el) => buildProjectIndex(el, { RJY, SITE, h }));
render('work', RJY.renderWork);
render('palette', RJY.renderPalette);
render('palette-aux', RJY.renderPaletteAux);
render('certificates', RJY.renderCertificates);
render('courses', RJY.renderCourses);
render('constellation', RJY.renderConstellation);
render('contact', RJY.renderContact);
render('footer', RJY.renderFooter);
render('atlas', RJY.renderAtlas);
render('albums', RJY.renderAlbums);
RJY.route.on('skills', (id) => { RJY.sheet.close(true); RJY.flashSkill(id); });
if (RJY.draft) {
  doc.classList.add('is-draft');
  document.body.appendChild(h('a', { class: 'draft-badge', href: location.pathname, title: 'Leave draft mode', text: 'Draft view — placeholders visible' }));
}
if (!RJY.finePointer) doc.classList.add('is-touch');

/* ---------- 3. the painting behind each section ---------- */
const backs = Array.from(document.querySelectorAll('.plain-backdrop'));
let shown = 'ocean', top = 0;
function backdrop(id) {
  if (!id || id === shown) return;
  shown = id;
  const next = backs[top ^ 1], prev = backs[top];
  const size = window.innerWidth > 900 ? 1280 : 640;
  next.onload = () => { next.classList.add('is-on'); prev.classList.remove('is-on'); top ^= 1; };
  next.src = 'assets/paintings/' + id + '-' + size + '.webp';
}

/* ---------- 4. navigation: current section, the phone menu ---------- */
const nav = document.getElementById('nav');
const sections = Array.from(document.querySelectorAll('main > section'));
let ticking = false;
function update() {
  ticking = false;
  const y = window.pageYOffset, mid = window.innerHeight * 0.4;
  nav.classList.toggle('is-scrolled', y > 40);
  let current = sections[0];
  sections.forEach((s) => { const r = s.getBoundingClientRect(); if (r.top <= mid && r.bottom > mid) current = s; });
  document.querySelectorAll('.nav__link').forEach((a) => a.setAttribute('aria-current', String(a.getAttribute('href') === '#' + current.id)));
  backdrop(current.dataset.painting);
}
window.addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
window.addEventListener('resize', update);

const toggle = document.querySelector('.nav__toggle'), menu = document.getElementById('menu');
function setMenu(open) {
  toggle.setAttribute('aria-expanded', String(open));
  toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
  menu.classList.toggle('is-open', open);
  RJY.lockScroll(open);
  if (open) { const first = menu.querySelector('a'); if (first) first.focus(); }
}
toggle.addEventListener('click', () => setMenu(toggle.getAttribute('aria-expanded') !== 'true'));
menu.addEventListener('click', (e) => { if (e.target.closest('a') && toggle.getAttribute('aria-expanded') === 'true') setMenu(false); });
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && toggle.getAttribute('aria-expanded') === 'true') { setMenu(false); toggle.focus(); } });

/* ---------- 5. blocks arrive as they are scrolled to ---------- */
let rio = null;
if ('IntersectionObserver' in window && !RJY.reducedMotion) {
  rio = new IntersectionObserver((es) => { es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('is-in'); rio.unobserve(e.target); } }); }, { threshold: 0, rootMargin: '0px 0px -10% 0px' });
}
RJY.reveal = (scope) => (scope || document).querySelectorAll('.reveal:not(.is-in)').forEach((el) => { if (rio) rio.observe(el); else el.classList.add('is-in'); });
RJY.reveal();

/* ---------- 6. go ---------- */
update();
if (RJY.route.parse(location.hash)) setTimeout(() => RJY.route.handle(), 60);
else if (location.hash && location.hash !== '#home') {
  const t = document.querySelector(location.hash);
  if (t) setTimeout(() => RJY.scrollTo(t, { instant: true, offset: 0 }), 60);
}
