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
 *   engine.write(el, t, d)      have a piece of text written by the brush from time t, over d screens
 *   engine.writes               everything the painter's brush writes (brush.js): element, moment, lines
 *   engine.jobs                 other work a chapter gives the brush: { t0, t1, at(t) → { x, y, ang, col } }
 */
import { CHAPTERS, TOTAL, chapterAt } from './storyboard.js';
import { measureText, weigh, applyMask, clearMask } from './paint-text.js';

// What is written rather than faded in: running text. Controls, lists, pictures and charts still rise.
const isText = (el) => /^(P|H1|H2|H3|H4|BLOCKQUOTE)$/.test(el.tagName) && !el.querySelector('button, .pill, img, svg, ul, ol, input, .copy');

export function createEngine({ main, calm, exact, paints }) {
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

  // Words are written, not faded in: a brush-edged mask is slid along each line of a text in turn
  // (paint-text.js), scrubbed by the scroll, and the painter's brush rides its edge (brush.js). A title
  // also gets a stroke of gold drawn under it, last. `paints` is off on the still stage, where words
  // simply appear.
  const writes = [];
  function write(el, at, d, o = {}) {
    if (!paints || !el) return null;
    let swash = null;
    if (o.swash) { swash = document.createElement('i'); swash.className = 'swash'; swash.setAttribute('aria-hidden', 'true'); el.appendChild(swash); }
    const w = {
      el, t0: at, t1: at + d, info: null, masked: false,
      /** The text's lines as laid out now (kept until the window changes). */
      measure() {
        if (w.info) return w.info;
        const m = measureText(el);
        if (m && swash) {
          // the stroke under a title: from the start of its last line, most of the way along it
          const last = m.lines[m.lines.length - 1];
          const ln = { x: last.x - last.h * 0.04, y: last.y + last.h * 0.82, w: last.w * 0.94, h: Math.max(9, last.h * 0.19), swash: true };
          swash.style.cssText = 'left:' + ln.x.toFixed(1) + 'px;top:' + ln.y.toFixed(1) + 'px;width:' + ln.w.toFixed(1) + 'px;height:' + ln.h.toFixed(1) + 'px';
          m.lines.push(ln); weigh(m);
        }
        w.info = m;
        return m;
      }
    };
    tl.fromTo(el, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.02, ease: 'none' }, at);
    tl.fromTo(el, { '--paint': 0 }, {
      '--paint': 1, duration: d, ease: 'none',
      onUpdate() {
        const pr = this.progress();
        // no mask before it starts (it is hidden) or once it is all there (shadows and descenders whole again)
        if (pr <= 0 || pr >= 1) { if (w.masked) { clearMask(el); w.masked = false; } return; }
        if (!w.masked) { const m = w.measure(); if (m) { applyMask(el, m); w.masked = true; } }
      }
    }, at);
    writes.push(w);
    return w;
  }
  /** How long a text takes to write, in screens of scroll: a title is given time, a paragraph is brisk. */
  const span = (el) => { const n = (el.textContent || '').trim().length; return el.classList.contains('headline') ? Math.min(0.3, 0.17 + n * 0.003) : Math.min(0.3, 0.07 + n * 0.0011); };

  /** Show `el` from time a to time b (screens). o.first: already there when the page opens. o.y: travel in px. */
  function beat(el, a, b, o = {}) {
    if (!el) return;
    const din = o.in || 0.3, dout = o.out || 0.26;
    const kids = o.first ? [] : Array.from(el.querySelectorAll('[data-rise]'));
    const texts = paints ? kids.filter(isText) : [];
    const selfText = paints && !o.first && !kids.length && isText(el);
    const written = selfText || texts.length > 0;
    // a beat whose words are written does not travel in: the writing is its entrance
    const y = calm || written ? 0 : (o.y == null ? 34 : o.y);
    if (o.first) gsap.set(el, { autoAlpha: 1, y: 0 });
    else if (selfText) write(el, a + 0.02, span(el), { swash: el.classList.contains('headline') });
    else tl.fromTo(el, { autoAlpha: 0, y }, { autoAlpha: 1, y: 0, duration: written ? 0.12 : din, ease: 'power2.out' }, a);
    if (b != null) tl.to(el, { autoAlpha: 0, y: calm ? 0 : -(o.y == null ? 34 : o.y) * 0.5, duration: dout, ease: 'power1.in' }, b - dout);
    if (!kids.length) return;
    if (!written) {
      // the parts of a beat arrive one after another: heading, then text, then the rest
      kids.forEach((child, i) => {
        tl.fromTo(child, { autoAlpha: 0, y: calm ? 0 : 20 }, { autoAlpha: 1, y: 0, duration: 0.24, ease: 'power2.out' }, a + 0.04 + i * 0.05);
      });
      return;
    }
    // written in order, one thing at a time (there is one brush); all of it inside half the beat's life
    const need = texts.reduce((n, c) => n + span(c), 0);
    const room = Math.min(0.62, b != null ? (b - a) * 0.5 : 0.62), k = Math.min(1, room / need);
    let at = a + 0.04;
    kids.forEach((child) => {
      if (isText(child)) { const d = span(child) * k; write(child, at, d, { swash: child.classList.contains('headline') }); at += d + 0.012; }
      else { tl.fromTo(child, { autoAlpha: 0, y: calm ? 0 : 16 }, { autoAlpha: 1, y: 0, duration: 0.2, ease: 'power2.out' }, at); at += 0.035; }
    });
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
    rz = setTimeout(() => { const t = clock.t; forget(); if (measure()) { ScrollTrigger.refresh(); scrollNow(yOf(t)); settle(); } resizeListeners.forEach((fn) => fn()); }, 140);
  });
  // the lines of every written text are measured again after the window (or the fonts) change
  const forget = () => writes.forEach((w) => { w.info = null; if (w.masked) { clearMask(w.el); w.masked = false; } });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(forget);
  window.addEventListener('orientationchange', () => setTimeout(() => { const t = clock.t; forget(); measure(true); ScrollTrigger.refresh(); scrollNow(yOf(t)); settle(); resizeListeners.forEach((fn) => fn()); }, 300));
  const resizeListeners = [];

  return {
    tl, st, calm, beat, write, writes, jobs: [],
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
