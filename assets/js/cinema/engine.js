/*
 * engine.js — one scroll, one timeline.
 *
 * The page is as tall as the film is long (CHAPTERS in storyboard.js: one screen of scrolling per unit
 * of time). GSAP's ScrollTrigger scrubs a single master timeline with the scroll position; that
 * timeline moves `clock.t` (the film's time, which the stage reads every frame) and fades each piece
 * of text in and out at its moment (`beat`). Nothing plays by itself, so scrolling back reverses it.
 *
 *   engine.t                    the film's time right now (screens)
 *   engine.beat(el, a, b)       show an element between times a and b
 *   engine.travel(t)            cut to another moment behind a short curtain (menu, deep links)
 *   engine.onFrame(fn)          called every animation frame with (t, seconds, dt)
 *   engine.writes               the titles the painter's brush writes (brush.js): element and moment
 */
import { CHAPTERS, TOTAL, chapterAt } from './storyboard.js';

export function createEngine({ main, calm, exact }) {
  const gsap = window.gsap, ScrollTrigger = window.ScrollTrigger;
  gsap.registerPlugin(ScrollTrigger);
  ScrollTrigger.config({ ignoreMobileResize: true });
  const root = document.documentElement;
  const clock = { t: 0 };
  let vh = window.innerHeight, vw = window.innerWidth;

  // a stable "screen" for the page's length: the phone's address bar sliding away must not stretch the film
  function measure(force) {
    const w = window.innerWidth, h = window.innerHeight;
    if (!force && w === vw && Math.abs(h - vh) < 140) return false;
    vw = w; vh = h;
    root.style.setProperty('--screen', vh + 'px');
    return true;
  }
  root.style.setProperty('--screen', vh + 'px');
  CHAPTERS.forEach((c, i) => {
    const el = document.getElementById(c.id);
    if (el) el.style.height = `calc(var(--screen) * ${c.len + (i === CHAPTERS.length - 1 ? 1 : 0)})`;
  });

  const tl = gsap.timeline({ paused: true, defaults: { ease: 'none' } });
  tl.to(clock, { t: TOTAL, duration: TOTAL }, 0);

  // A chapter's title is painted on: a brush-edged mask (.is-painted in cinema.css) is scrubbed open
  // across it by the scroll, and the painter's brush rides the edge. On the calm stages it simply appears.
  const writes = [];
  function write(el, at) {
    if (calm) return;
    const d = 0.32;
    tl.fromTo(el, { '--paint': 0 }, {
      '--paint': 1, duration: d, ease: 'none',
      onUpdate() { el.classList.toggle('is-painted', this.progress() < 1); }     // no mask once it is all there
    }, at);
    writes.push({ el, t0: at, t1: at + d });
  }

  /** Show `el` from time a to time b (screens). o.first: already there when the page opens. o.y: travel in px. */
  function beat(el, a, b, o = {}) {
    if (!el) return;
    const y = calm ? 0 : (o.y == null ? 34 : o.y), din = o.in || 0.3, dout = o.out || 0.26;
    if (o.first) gsap.set(el, { autoAlpha: 1, y: 0 });
    else tl.fromTo(el, { autoAlpha: 0, y }, { autoAlpha: 1, y: 0, duration: din, ease: 'power2.out' }, a);
    if (b != null) tl.to(el, { autoAlpha: 0, y: -y * 0.5, duration: dout, ease: 'power1.in' }, b - dout);
    // the parts of a beat arrive one after another: heading, then text, then the rest
    if (!o.first) el.querySelectorAll('[data-rise]').forEach((child, i) => {
      tl.fromTo(child, { autoAlpha: 0, y: calm ? 0 : 20 }, { autoAlpha: 1, y: 0, duration: 0.24, ease: 'power2.out' }, a + 0.04 + i * 0.05);
      if (child.classList.contains('headline')) write(child, a + 0.04 + i * 0.05);
    });
    if (!o.first && el.classList.contains('home-line')) write(el, a + 0.02);
  }

  const st = ScrollTrigger.create({ trigger: main, start: 'top top', end: 'bottom bottom', scrub: calm || exact ? true : 0.7, animation: tl });

  /* ---------- frame loop ---------- */
  const frames = [];
  let last = 0, raf = 0;
  function frame(now) {
    raf = requestAnimationFrame(frame);
    const s = now / 1000, dt = last ? Math.min(0.1, s - last) : 0.016; last = s;
    for (let i = 0; i < frames.length; i++) frames[i](clock.t, s, dt);
  }

  /* ---------- chapters ---------- */
  let current = null;
  const chapterListeners = [];
  frames.push((t) => {
    const c = chapterAt(t + 0.1);
    if (c !== current) { current = c; chapterListeners.forEach((fn) => fn(c)); }
  });

  /* ---------- travel ---------- */
  const curtain = document.querySelector('.curtain');
  let travelling = false, prepare = () => Promise.resolve();
  function scrollNow(y) {
    root.style.scrollBehavior = 'auto';
    try { window.scrollTo({ top: y, left: 0, behavior: 'instant' }); } catch (e) { window.scrollTo(0, y); }
  }
  // put the film exactly where the scrollbar is, without waiting for the smoothing to catch up
  function settle() {
    st.update();
    const tw = st.getTween && st.getTween();
    if (tw) tw.progress(1);
    tl.progress(Math.min(1, Math.max(0, window.pageYOffset / (TOTAL * vh))));
  }
  function yOf(t) { return Math.round(Math.max(0, Math.min(TOTAL, t)) * vh); }
  /** Go to time t. Near moves glide; far ones cut behind the curtain so the film is not fast-forwarded. */
  function travel(t, o = {}) {
    if (travelling) return Promise.resolve();
    const far = Math.abs(t - clock.t) > 1.6;
    if (!far && !o.cut) { window.scrollTo({ top: yOf(t), behavior: calm ? 'auto' : 'smooth' }); return Promise.resolve(); }
    travelling = true;
    const wait = (ms) => new Promise((r) => setTimeout(r, ms));
    if (curtain && !o.silent) curtain.classList.add('is-on');
    return wait(o.silent ? 0 : 260).then(() => prepare(t)).then(() => {
      scrollNow(yOf(t)); settle();
      return wait(60);
    }).then(() => {
      if (curtain) curtain.classList.remove('is-on');
      travelling = false;
    });
  }
  function toChapter(id, o) {
    const c = CHAPTERS.find((x) => x.id === id); if (!c) return Promise.resolve();
    return travel(c.start + c.land, o);
  }

  let rz;
  window.addEventListener('resize', () => {
    clearTimeout(rz);
    rz = setTimeout(() => { const t = clock.t; if (measure()) { ScrollTrigger.refresh(); scrollNow(yOf(t)); settle(); } resizeListeners.forEach((fn) => fn()); }, 140);
  });
  window.addEventListener('orientationchange', () => setTimeout(() => { const t = clock.t; measure(true); ScrollTrigger.refresh(); scrollNow(yOf(t)); settle(); resizeListeners.forEach((fn) => fn()); }, 300));
  const resizeListeners = [];

  return {
    tl, st, calm, beat, writes,
    /** Run one frame by hand (tests, and tools that step the film without a display). */
    step(now) { const s = (now || performance.now()) / 1000; for (let i = 0; i < frames.length; i++) frames[i](clock.t, s, 0.016); },
    get t() { return clock.t; },
    get chapter() { return current || chapterAt(clock.t + 0.1); },
    screen() { return { w: vw, h: vh }; },
    onFrame(fn) { frames.push(fn); },
    onChapter(fn) { chapterListeners.push(fn); },
    onResize(fn) { resizeListeners.push(fn); },
    setPrepare(fn) { prepare = fn; },
    travel, toChapter, settle,
    start() { ScrollTrigger.refresh(); settle(); if (!raf) raf = requestAnimationFrame(frame); },
    timeOfScroll() { return window.pageYOffset / vh; }
  };
}
