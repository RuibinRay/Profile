/*
 * Chapter 4 — The World I've Explored.
 * The yak rider looks up, the valley darkens, and a painted globe rises. Countries come from
 * data/travel.js: only those marked home, visited or current are lit and listed; every country on
 * the globe can still be chosen and opens the same chapter the atlas opens (#world/<CODE>), where an
 * unlisted country reads "Undiscovered". The full map, statistics, year filter, replay and albums
 * are one click away (#view/atlas). On the lighter stage the list stands alone.
 */
import { span } from '../view.js';

const STATUS = { home: 'Home', visited: 'Visited', current: 'Where I live now', wishlist: 'On my wishlist' };
const LIT = { home: 1, visited: 1, current: 1 };

function loadScript(src) {
  return new Promise((res, rej) => { const el = document.createElement('script'); el.src = src; el.async = true; el.onload = res; el.onerror = () => rej(new Error('Could not load ' + src)); document.head.appendChild(el); });
}

export function build({ ui, SITE, RJY, h, beat, at, stage, engine }) {
  const countries = (SITE.travel.countries || []).filter((c) => LIT[c.status]);
  const photosOf = (c) => (c.photos || []).length + (c.places || []).reduce((n, p) => n + (p.photos || []).length, 0);
  const nPlaces = countries.reduce((n, c) => n + (c.places || []).length, 0);
  const nPhotos = countries.reduce((n, c) => n + photosOf(c), 0);
  const statusOf = (code) => { const c = (SITE.travel.countries || []).find((x) => x.code === code); return c ? c.status : 'none'; };

  const head = h('div', { class: 'beat world-head scrim' },
    h('p', { class: 'headline', 'aria-hidden': 'true', 'data-rise': true, text: 'The world I’ve explored' }),
    h('p', { class: 'lede', 'data-rise': true, text: countries.length + ' countries, ' + nPlaces + ' places and ' + nPhotos + ' photographs so far. The lit countries are the ones I know; choose one to open its photographs.' }));

  const list = h('ul', { class: 'beat world-list', 'aria-label': 'Countries I know' }, countries.map((c) => {
    const name = RJY.countryName(c.code), np = photosOf(c);
    const a = h('a', { class: 'medal medal--' + c.status, href: '#world/' + c.code, 'data-code': c.code },
      h('img', { src: RJY.flagSrc(c.code), alt: '', width: 40, height: 30 }),
      h('span', null, h('b', { text: name }),
        h('small', { text: [STATUS[c.status] + (RJY.has(c.years) ? ' ' + c.years.join(', ') : ''), (c.places || []).length + ((c.places || []).length === 1 ? ' place' : ' places'), np ? np + ' photos' : ''].filter(Boolean).join(' · ') })));
    return h('li', { 'data-rise': true }, a);
  }), h('li', { class: 'world-list__more', 'data-rise': true },
    h('a', { class: 'pill pill--gold', href: '#view/atlas', text: 'Open the full atlas' }),
    h('span', { class: 'note', text: 'Every country, the statistics and the photo albums' })));

  const hit = h('div', { class: 'globe-hit', 'data-live': true, role: 'img', 'aria-label': 'A painted globe. The countries I know are lit: ' + countries.map((c) => RJY.countryName(c.code)).join(', ') + '. Use the list of countries to open one.' });
  const tip = h('p', { class: 'globe-tip', 'aria-hidden': 'true' });
  const hint = h('p', { class: 'globe-hint note', text: 'Drag to turn the globe' });
  const globeBeat = h('div', { class: 'beat world-globe' }, hit, tip, hint);

  ui.append(head, globeBeat, list);

  /* ---------- the globe (WebGL stage only) ---------- */
  let loading = null, contNote = false;
  function ensureGlobe() {
    const st = stage();
    if (!st || !st.globe || st.globe.built || loading) return;
    loading = (window.RJYGeo ? Promise.resolve() : loadScript('assets/vendor/geo.bundle.min.js'))
      .then(() => (window.RJY_WORLD ? null : loadScript('data/world.js')))
      .then(() => {
        const s = stage(); if (!s || !s.globe) return;
        s.globe.build(window.RJYGeo, window.RJY_WORLD, statusOf, s.tier === 'low' ? 1024 : 2048);
        s.globe.face('CRI');
        if (!contNote) {        // the continents are only known once the borders are loaded
          contNote = true;
          const conts = countries.map((c) => s.globe.continentOf(c.code)).filter((x, i, a) => x && a.indexOf(x) === i);
          if (conts.length > 1) head.querySelector('.lede').textContent = countries.length + ' countries on ' + conts.length + ' continents, ' + nPlaces + ' places and ' + nPhotos + ' photographs so far. The lit countries are the ones I know; choose one to open its photographs.';
        }
      }).catch((e) => { console.warn(e); }).then(() => { loading = null; });
  }

  let facing = -1, down = null, moved = false, hover = null;
  const medals = Array.from(list.querySelectorAll('.medal'));
  function face(i, fromUser) {
    const st = stage(); if (!st || !st.globe || !st.globe.built) return;
    if (i === facing && !fromUser) return;
    facing = i;
    st.globe.face(countries[i].code);
    medals.forEach((m, k) => m.classList.toggle('is-facing', k === i));
  }
  medals.forEach((m, i) => { m.addEventListener('pointerenter', () => face(i, true)); m.addEventListener('focus', () => face(i, true)); });

  hit.addEventListener('pointerdown', (e) => {
    const st = stage(); if (!st || !st.globe) return;
    down = { x: e.clientX, y: e.clientY }; moved = false;
    hit.setPointerCapture(e.pointerId); st.globe.setDragging(true); hit.classList.add('is-dragging');
  });
  hit.addEventListener('pointermove', (e) => {
    const st = stage(); if (!st || !st.globe) return;
    if (down) {
      const dx = e.clientX - down.x, dy = e.clientY - down.y;
      if (Math.abs(dx) + Math.abs(dy) > 3) moved = true;
      st.globe.drag(dx, dy); down = { x: e.clientX, y: e.clientY };
      tip.classList.remove('is-on'); hint.classList.add('is-used');
      return;
    }
    const p = st.globe.pick(e.clientX, e.clientY);
    hover = p && p.code ? p : null;
    hit.style.cursor = hover ? 'pointer' : 'grab';
    if (hover) {
      const s = hover.status;
      tip.textContent = RJY.countryName(hover.code, hover.name) + ' — ' + (STATUS[s] || 'Undiscovered');
      const r = globeBeat.getBoundingClientRect();
      tip.style.transform = `translate3d(${(e.clientX - r.left + 14).toFixed(0)}px,${(e.clientY - r.top - 34).toFixed(0)}px,0)`;
    }
    tip.classList.toggle('is-on', !!hover);
  });
  const up = (e) => {
    const st = stage();
    if (st && st.globe) st.globe.setDragging(false);
    hit.classList.remove('is-dragging');
    if (down && !moved && st && st.globe) {
      const p = st.globe.pick(e.clientX, e.clientY);
      if (p && p.code) RJY.route.go('#world/' + p.code);
    }
    down = null;
  };
  hit.addEventListener('pointerup', up);
  hit.addEventListener('pointercancel', () => { down = null; hit.classList.remove('is-dragging'); const st = stage(); if (st && st.globe) st.globe.setDragging(false); });
  hit.addEventListener('pointerleave', () => tip.classList.remove('is-on'));

  function update(t, s, dt, on) {
    const st = stage();
    if (!st || !st.globe) return;
    if (on && t > at(-0.5)) ensureGlobe();
    const show = on && t > at(1.18) && t < at(3.22);
    st.globe.show(show ? 1 : 0);
    if (!on) return;
    const r = hit.getBoundingClientRect(), sz = st.size();
    st.globe.place(r.left + r.width / 2, r.top + r.height / 2, r.width / 2, sz.W, sz.H);
    // left alone, the globe turns to each country in turn as the chapter is scrolled
    if (st.globe.built && !down) {
      const i = Math.min(countries.length - 1, Math.floor(span(t, at(1.3), at(3.05)) * countries.length));
      if (i !== facing && !hit.matches(':hover') && !list.matches(':hover')) face(i);
    }
  }
  void engine;

  beat(head, 0.62, 1.5);
  beat(globeBeat, 1.3, 3.2, { y: 0 });
  beat(list, 1.42, 3.2);
  return { update };
}
