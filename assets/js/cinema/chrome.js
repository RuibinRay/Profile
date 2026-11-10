/*
 * chrome.js — the quiet interface around the film: the top bar and chapter menu, the golden
 * brushstroke of progress with a mark for each chapter, the wall label of the painting on stage,
 * the pause button, and travel between chapters (links, marks, previous / next, deep links).
 */
import { CHAPTERS, TOTAL } from './storyboard.js';
import { PAINTINGS } from './manifest.js';

const ICON_PAUSE = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M5 3.5v9M11 3.5v9" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>';
const ICON_PLAY = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M5.5 3.4l7 4.6-7 4.6z" fill="currentColor"/></svg>';

export function createChrome({ engine, RJY, SITE, h, getStage, panels }) {
  const root = document.documentElement;
  const $ = (id) => document.getElementById(id);

  /* ---------- menu ---------- */
  const menu = $('menu'), toggle = $('menu-toggle');
  $('menu-chapters').append(...CHAPTERS.map((c, i) => h('li', null,
    h('a', { href: '#' + c.id, 'data-travel': c.id, style: '--i:' + i },
      h('img', { src: `assets/paintings/${c.painting}-640.webp`, alt: '', loading: 'lazy', width: 640, height: 360 }),
      h('span', null, h('b', { text: c.title }), h('small', { text: c.blurb }))))));
  const quick = [
    ['portfolio.html', 'View portfolio', 'Everything on one plain page'],
    ['#view/projects', 'All projects', 'Search and filter every project'],
    ['#view/timeline', 'Full timeline', 'Work, school and milestones'],
    ['#view/atlas', 'World atlas', 'The map, countries and photographs'],
    ['#view/credentials', 'Certificates', 'With links to verify them'],
    SITE.links.resume ? [SITE.links.resume, 'Résumé', SITE.links.resumeNote || 'PDF', true] : null,
    SITE.links.email ? ['mailto:' + SITE.links.email, 'Email me', SITE.links.email] : null
  ].filter(Boolean);
  $('menu-quick').append(...quick.map((q) => h('li', null, h('a', { href: q[0], download: q[3] ? '' : null }, q[1], h('span', { text: q[2] })))));
  function setMenu(open) {
    toggle.setAttribute('aria-expanded', String(open));
    toggle.textContent = open ? 'Close' : 'Menu';
    menu.classList.toggle('is-open', open);
    menu.inert = !open;
    RJY.lockScroll(open);
    if (open) { const cur = menu.querySelector('[aria-current="true"]') || menu.querySelector('a'); if (cur) cur.focus({ preventScroll: true }); }
  }
  const menuOpen = () => toggle.getAttribute('aria-expanded') === 'true';
  toggle.addEventListener('click', () => setMenu(!menuOpen()));
  menu.addEventListener('click', (e) => { if (e.target.closest('a') && menuOpen()) setMenu(false); });

  /* ---------- progress ---------- */
  const strokeEl = $('progress-stroke'), marks = $('progress-marks'), track = strokeEl.parentNode;
  function paintStroke() {
    const w = Math.max(200, track.clientWidth), hgt = 16;
    if (!RJY.brushURL) return;
    const url = RJY.brushURL(w, hgt, { pigment: 'gold', seed: 7, dir: 'h', dry: 0.08, texture: 0.7, inset: { across: 2, start: 0, end: 0 } });
    strokeEl.style.backgroundImage = url;
    track.querySelector('.progress__ground').style.backgroundImage = url;
  }
  paintStroke();
  marks.append(...CHAPTERS.map((c) => h('li', { style: '--at:' + (c.start / TOTAL * 100).toFixed(2) + '%' },
    h('a', { href: '#' + c.id, 'data-travel': c.id, 'aria-label': c.title }, h('span', { 'aria-hidden': 'true', text: c.title })))));
  const markLinks = Array.from(marks.querySelectorAll('a'));
  const prev = $('prev-chapter'), next = $('next-chapter');
  const index = () => CHAPTERS.indexOf(engine.chapter || CHAPTERS[0]);
  prev.addEventListener('click', () => { const i = index(); engine.toChapter(CHAPTERS[Math.max(0, engine.t > CHAPTERS[i].start + CHAPTERS[i].land + 0.4 ? i : i - 1)].id, { cut: true }); });
  next.addEventListener('click', () => { const i = index(); if (i < CHAPTERS.length - 1) engine.toChapter(CHAPTERS[i + 1].id, { cut: true }); });

  /* ---------- the wall label ---------- */
  const placard = $('placard'), pTitle = $('placard-title'), pLabel = $('placard-label'), pPhoto = $('placard-photo');
  let shown = null, swap = 0;
  function label(id) {
    if (id === shown) return;
    shown = id;
    const p = PAINTINGS[id];
    placard.classList.add('is-changing');
    clearTimeout(swap);
    swap = setTimeout(() => {
      pTitle.textContent = p.title; pLabel.textContent = p.label;
      pPhoto.hidden = !p.photo;
      placard.classList.remove('is-changing');
    }, 260);
  }
  pPhoto.addEventListener('click', () => {
    const p = PAINTINGS[shown];
    if (p && p.photo) RJY.lightbox(Object.assign({ alt: 'The photograph “' + p.title + '” was painted from', caption: 'The photograph behind “' + p.title + '”', place: p.photo.caption }, p.photo, { caption: 'The photograph behind “' + p.title + '”' }));
  });

  /* ---------- pause ---------- */
  const KEY = 'rjy-motion', mBtn = $('motion-toggle');
  let paused = false;
  try { paused = localStorage.getItem(KEY) === 'paused'; } catch (e) {}
  function setPaused(p) {
    paused = p;
    root.classList.toggle('is-paused', p);
    mBtn.innerHTML = p ? ICON_PLAY : ICON_PAUSE;
    mBtn.setAttribute('aria-label', p ? 'Play the moving paintings' : 'Pause the moving paintings');
    mBtn.title = p ? 'Play the paintings' : 'Pause the paintings';
    const st = getStage(); if (st) st.setPaused(p);
    try { localStorage.setItem(KEY, p ? 'paused' : 'playing'); } catch (e) {}
  }
  mBtn.addEventListener('click', () => setPaused(!paused));
  setPaused(paused);

  /* ---------- travel ---------- */
  document.addEventListener('click', (e) => {
    const a = e.target.closest && e.target.closest('a[href^="#"]');
    if (!a || e.metaKey || e.ctrlKey || e.shiftKey || e.defaultPrevented) return;
    const href = a.getAttribute('href');
    if (RJY.route.parse(href)) return;                 // a detail view: ui.js opens it
    const id = href.slice(1);
    if (!CHAPTERS.some((c) => c.id === id)) return;
    e.preventDefault();
    if (panels && panels.isOpen()) panels.close(true);
    if (RJY.sheet.isOpen()) RJY.sheet.close(true);
    try { history.pushState(null, '', '#' + id); } catch (err) {}
    engine.toChapter(id, { cut: true });
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && menuOpen()) { setMenu(false); toggle.focus(); }
  });

  /* ---------- chapter changes ---------- */
  const nameEl = $('chapter-name');
  engine.onChapter((c) => {
    nameEl.textContent = c.title;
    const i = CHAPTERS.indexOf(c);
    menu.querySelectorAll('.menu__chapters a').forEach((a, k) => a.setAttribute('aria-current', String(k === i)));
    markLinks.forEach((a, k) => { a.setAttribute('aria-current', String(k === i)); a.classList.toggle('is-past', k < i); });
    prev.disabled = i === 0 && engine.t < 0.2; next.disabled = i === CHAPTERS.length - 1;
    root.dataset.chapter = c.id;
    // keep the address in step, unless a detail view (a project, a country…) owns it
    if (!RJY.route.parse(location.hash) && location.hash !== '#' + c.id && !(c.id === 'home' && !location.hash)) {
      try { history.replaceState(history.state, '', c.id === 'home' ? location.pathname + location.search : '#' + c.id); } catch (err) {}
    }
  });

  engine.onResize(paintStroke);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(paintStroke);

  return {
    update(t) {
      strokeEl.style.setProperty('--p', (Math.min(1, Math.max(0, t / TOTAL)) * 100).toFixed(2) + '%');
      const st = getStage();
      if (st) {
        label((st.state.mix > 0.5 && st.state.shotB ? st.state.shotB : st.state.shot).painting);
        placard.classList.toggle('is-away', (st.state.dim || 0) > (window.innerWidth < 860 ? 0.2 : 0.33));
      }
    },
    setMenu, isMenuOpen: menuOpen, isPaused: () => paused, setPaused
  };
}
