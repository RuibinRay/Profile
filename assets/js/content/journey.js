/*
 * journey.js — "The Journey So Far": a constellation timeline.
 * Desktop: stars along a golden path (one lane per kind of entry) with a detail view below.
 * Small screens: the same entries as a vertical path that expands in place.
 */
(function () {
  'use strict';
  var RJY = window.RJY, SITE = window.SITE, h = RJY.h, s = RJY.s, has = RJY.has;

  var LANES = { work: 0, project: 1, achievement: 2, milestone: 2, education: 3, certification: 4 };
  var LANE_NAMES = ['Work', 'Projects', 'Milestones', 'Education', 'Certifications'];
  var DOT = { work: '#f2c14e', project: '#5fb3b8', achievement: '#e8892b', milestone: '#e8892b', education: '#f3e3a8', certification: '#8e9ccb' };
  var SIZE = { work: 5.6, education: 5.2, achievement: 5, milestone: 4.6, project: 4.8, certification: 3.4 };

  var state = { type: 'all', year: 'all', active: null };
  var entries, root, els = {};

  function yearOf(e) { return parseInt(String(e.at).slice(0, 4), 10); }
  function yearsCovered(e) {
    var y0 = yearOf(e), y1 = y0;
    var m = /(\d{4})\s*$/.exec(e.when || '');
    if (m) y1 = Math.max(y0, parseInt(m[1], 10));
    var out = []; for (var y = y0; y <= y1; y++) out.push(y); return out;
  }
  function matches(e) {
    var tOk = state.type === 'all' || e.type === state.type || (state.type === 'achievement' && e.type === 'milestone');
    var yOk = state.year === 'all' || yearsCovered(e).indexOf(+state.year) !== -1;
    return tOk && yOk;
  }

  RJY.renderJourney = function (container) {
    root = container;
    entries = SITE.journey.slice().sort(function (a, b) { return a.at < b.at ? -1 : a.at > b.at ? 1 : 0; });
    var types = []; entries.forEach(function (e) { var t = e.type === 'milestone' ? 'achievement' : e.type; if (types.indexOf(t) === -1) types.push(t); });
    var years = []; entries.forEach(function (e) { yearsCovered(e).forEach(function (y) { if (years.indexOf(y) === -1) years.push(y); }); });
    years.sort();

    var typeChips = h('div', { class: 'filters', role: 'group', 'aria-label': 'Filter by kind' },
      chip('All', 'all', 'type'),
      ['work', 'education', 'achievement', 'project', 'certification'].filter(function (t) { return types.indexOf(t) !== -1; }).map(function (t) {
        return chip(t === 'achievement' ? 'Milestones' : SITE.journeyTypes[t], t, 'type', DOT[t]);
      })
    );
    var yearChips = h('div', { class: 'filters filters--years', role: 'group', 'aria-label': 'Filter by year' },
      chip('All years', 'all', 'year'), years.map(function (y) { return chip(String(y), String(y), 'year'); }));
    root.appendChild(typeChips);
    root.appendChild(yearChips);

    els.sky = h('div', { class: 'journey__sky' });
    root.appendChild(els.sky);
    drawSky();
    els.detail = h('div', { class: 'journey__detail', 'aria-live': 'polite' });
    root.appendChild(els.detail);
    els.list = h('ol', { class: 'journey-list' });
    root.appendChild(els.list);
    drawList();

    var start = entries.filter(function (e) { return e.id === 'hjat'; })[0] || entries[entries.length - 1];
    select(start.id, { quiet: true });
    RJY.route.on('experience', function (id) {
      RJY.sheet.close(true);
      if (RJY.findJourney(id)) {
        state.type = 'all'; state.year = 'all'; syncChips(); applyFilter();
        select(id, { open: true });
        var sec = document.getElementById('experience');
        if (sec && !RJY.cinema) RJY.scrollTo(sec, { offset: 40 });
      }
    });
  };

  function chip(label, value, kind, dot) {
    var b = h('button', { class: 'chip', type: 'button', 'aria-pressed': String(state[kind] === value), 'data-kind': kind, 'data-value': value },
      dot ? h('span', { class: 'dot', style: { background: dot } }) : null, label);
    b.addEventListener('click', function () {
      state[kind] = value;
      syncChips(); applyFilter();
    });
    return b;
  }
  function syncChips() {
    root.querySelectorAll('.chip').forEach(function (c) { c.setAttribute('aria-pressed', String(state[c.dataset.kind] === c.dataset.value)); });
  }

  /* ---------- desktop sky ---------- */
  function drawSky() {
    var W = 1180, H = 330, left = 96, right = 30, top = 44, laneGap = 54;
    var n = entries.length, step = (W - left - right) / Math.max(1, n - 1);
    var pts = entries.map(function (e, i) {
      return { e: e, x: left + i * step, y: top + LANES[e.type] * laneGap + (i % 2 ? 6 : -6) };
    });
    var svg = s('svg', { class: 'journey__svg', viewBox: '0 0 ' + W + ' ' + H, role: 'group', 'aria-label': 'Timeline of ' + n + ' entries' });
    svg.appendChild(s('defs', null,
      s('radialGradient', { id: 'starGlow' }, s('stop', { offset: '0', 'stop-color': '#fff3c4', 'stop-opacity': '.9' }), s('stop', { offset: '.25', 'stop-color': '#f2c14e', 'stop-opacity': '.35' }), s('stop', { offset: '1', 'stop-color': '#f2c14e', 'stop-opacity': '0' }))
    ));
    // lane names
    LANE_NAMES.forEach(function (nm, i) { svg.appendChild(s('text', { class: 'journey__lane', x: 0, y: top + i * laneGap + 4, text: nm })); });
    // years
    var seen = {};
    pts.forEach(function (p) {
      var y = yearOf(p.e);
      if (seen[y]) return; seen[y] = 1;
      var g = s('g', { class: 'journey__year' });
      g.appendChild(s('line', { x1: p.x, x2: p.x, y1: H - 34, y2: H - 22 }));
      g.appendChild(s('text', { x: p.x, y: H - 4, 'text-anchor': 'middle', text: y }));
      svg.appendChild(g);
    });
    // path through all stars, in order
    var d = 'M' + pts[0].x + ' ' + pts[0].y;
    for (var i = 1; i < pts.length; i++) {
      var p0 = pts[Math.max(0, i - 2)], p1 = pts[i - 1], p2 = pts[i], p3 = pts[Math.min(pts.length - 1, i + 1)];
      var c1x = p1.x + (p2.x - p0.x) / 6, c1y = p1.y + (p2.y - p0.y) / 6, c2x = p2.x - (p3.x - p1.x) / 6, c2y = p2.y - (p3.y - p1.y) / 6;
      d += ' C' + c1x.toFixed(1) + ' ' + c1y.toFixed(1) + ' ' + c2x.toFixed(1) + ' ' + c2y.toFixed(1) + ' ' + p2.x.toFixed(1) + ' ' + p2.y.toFixed(1);
    }
    svg.appendChild(s('path', { class: 'journey__path-glow', d: d }));
    var path = s('path', { class: 'journey__path', d: d });
    svg.appendChild(path);
    // labels with simple collision avoidance
    var boxes = [];
    function free(b) { for (var k = 0; k < boxes.length; k++) { var o = boxes[k]; if (b.x < o.x + o.w && b.x + b.w > o.x && b.y < o.y + o.h && b.y + b.h > o.y) return false; } return true; }
    pts.forEach(function (p, i) {
      var e = p.e, r = SIZE[e.type];
      var g = s('g', { class: 'jstar' + (e.upcoming ? ' is-upcoming' : ''), tabindex: '0', role: 'button', 'data-id': e.id, 'aria-label': e.when + ': ' + e.title + (e.org ? ', ' + e.org : '') });
      g.appendChild(s('circle', { class: 'halo', cx: p.x, cy: p.y, r: r * 5.5 }));
      g.appendChild(s('circle', { class: 'ring', cx: p.x, cy: p.y, r: r + 6 }));
      g.appendChild(s('circle', { class: 'core', cx: p.x, cy: p.y, r: r, style: e.upcoming ? null : 'fill:' + (e.type === 'certification' ? '#cfd6f2' : '#fff6dc') }));
      g.appendChild(s('circle', { cx: p.x, cy: p.y, r: 16, fill: 'transparent' }));   // larger hit area
      var label = e.short || e.title, w = label.length * 6.3 + 6, hgt = 15;
      var cands = [{ x: p.x - w / 2, y: p.y + r + 9 }, { x: p.x - w / 2, y: p.y - r - 9 - hgt }, { x: p.x + r + 8, y: p.y - hgt / 2 }, { x: p.x - r - 8 - w, y: p.y - hgt / 2 }];
      var pos = cands.filter(function (b) { return free({ x: b.x, y: b.y, w: w, h: hgt }); })[0] || cands[0];
      boxes.push({ x: pos.x, y: pos.y, w: w, h: hgt });
      g.appendChild(s('text', { x: pos.x + w / 2, y: pos.y + 11, 'text-anchor': 'middle', text: label }));
      boxes.push({ x: p.x - r - 3, y: p.y - r - 3, w: 2 * r + 6, h: 2 * r + 6 });
      g.addEventListener('click', function () { select(e.id, { open: true }); });
      g.addEventListener('keydown', function (ev) {
        if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); select(e.id, { open: true }); }
        if (ev.key === 'ArrowRight' || ev.key === 'ArrowLeft') { ev.preventDefault(); step(ev.key === 'ArrowRight' ? 1 : -1, true); }
      });
      svg.appendChild(g);
    });
    els.sky.appendChild(svg);
    els.svg = svg;
    // draw the path in when the section comes into view
    var len = path.getTotalLength ? path.getTotalLength() : 2000;
    path.style.strokeDasharray = len; path.style.strokeDashoffset = RJY.reducedMotion ? 0 : len;
    if (!RJY.reducedMotion && 'IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (es) {
        if (es[0].isIntersecting) { path.style.transition = 'stroke-dashoffset 3.2s cubic-bezier(.22,.61,.36,1)'; path.style.strokeDashoffset = 0; io.disconnect(); }
      }, { threshold: 0.35 });
      io.observe(els.sky);
    } else path.style.strokeDashoffset = 0;
  }

  function visible() { return entries.filter(matches); }
  function step(dir, focus) {
    var v = visible(); if (!v.length) return;
    var i = v.map(function (e) { return e.id; }).indexOf(state.active);
    var next = v[Math.min(v.length - 1, Math.max(0, i + dir))];
    select(next.id, { open: true });
    if (focus) { var g = els.svg.querySelector('[data-id="' + next.id + '"]'); if (g) g.focus(); }
  }

  function applyFilter() {
    entries.forEach(function (e) {
      var ok = matches(e);
      var g = els.svg && els.svg.querySelector('[data-id="' + e.id + '"]');
      if (g) { g.classList.toggle('is-dim', !ok); g.setAttribute('tabindex', ok ? '0' : '-1'); }
      var li = els.list.querySelector('[data-id="' + e.id + '"]');
      if (li) li.classList.toggle('is-dim', !ok);
    });
    var v = visible();
    if (v.length && !matches(RJY.findJourney(state.active) || {})) select(v[v.length - 1].id, { quiet: true });
    if (!v.length) els.detail.innerHTML = '<p class="muted">Nothing here for that filter yet.</p>';
  }

  function select(id, opts) {
    var e = RJY.findJourney(id); if (!e) return;
    state.active = id;
    if (els.svg) els.svg.querySelectorAll('.jstar').forEach(function (g) { g.classList.toggle('is-active', g.dataset.id === id); g.setAttribute('aria-pressed', String(g.dataset.id === id)); });
    renderDetail(els.detail, e);
    els.list.querySelectorAll('.jl-item').forEach(function (li) {
      var on = li.dataset.id === id && !!(opts && opts.open);
      if (opts && opts.open) { li.classList.toggle('is-open', on); var b = li.querySelector('button'); if (b) b.setAttribute('aria-expanded', String(on)); }
    });
  }
  RJY.selectJourney = select;

  function renderDetail(el, e) {
    el.innerHTML = '';
    var v = visible(), ids = v.map(function (x) { return x.id; }), i = ids.indexOf(e.id);
    var place = e.country ? h('a', { class: 'link', href: '#world/' + e.country, text: e.place || RJY.countryName(e.country) }) : (e.place || '');
    var left = h('div', null,
      h('p', { class: 'jd__when', text: e.when + (e.upcoming ? ' — ahead' : '') }),
      h('h3', { class: 'jd__title', text: e.title }),
      has(e.org) ? h('p', { class: 'jd__org', text: e.org }) : null,
      place ? h('p', { class: 'jd__place' }, place) : null,
      h('div', { class: 'jd__nav' },
        h('button', { type: 'button', disabled: i <= 0 ? true : null, onclick: function () { step(-1); } }, '← Earlier'),
        h('button', { type: 'button', disabled: i >= ids.length - 1 ? true : null, onclick: function () { step(1); } }, 'Later →'))
    );
    var right = h('div', null, detailBody(e));
    el.appendChild(left); el.appendChild(right);
  }

  function detailBody(e) {
    var frag = document.createDocumentFragment();
    if (has(e.summary)) frag.appendChild(h('p', { class: 'jd__summary', text: e.summary }));
    if (has(e.details)) frag.appendChild(h('ul', { class: 'jd__list' }, e.details.map(function (d) { return h('li', { text: d }); })));
    if (has(e.story)) frag.appendChild(h('p', { class: 'muted', text: e.story }));
    else { var p = RJY.ph('a short personal story for this entry — journey.js → ' + e.id + '.story'); if (p) frag.appendChild(p); }
    var pics = (e.photos || []).filter(function (x) { return x && has(x.src); });
    if (has(e.photo && e.photo.src)) pics.unshift(e.photo);
    if (pics.length) {
      // on phones an odd set of three or more leads with its first photo at full width (see .jd__photos in site.css)
      var lead = pics.length >= 3 && pics.length % 2 === 1;
      frag.appendChild(h('div', { class: 'jd__photos' + (pics.length === 1 ? ' is-one' : '') }, pics.map(function (p, k) {
        var label = p.caption || p.alt || e.title;
        var sizes = pics.length === 1 ? '(max-width: 700px) 92vw, 520px' : (lead && k === 0 ? '(max-width: 700px) 92vw, 240px' : '(max-width: 700px) 45vw, 240px');
        return h('button', { type: 'button', class: 'jd__photo', 'aria-label': 'Open image: ' + label, onclick: function () {
          RJY.lightbox(p, pics.map(function (q) { return Object.assign({ place: e.org || '' }, q); }), pics.indexOf(p));
        } }, RJY.picture(p, { sizes: sizes, alt: '' }),   // the button's label names the image
          has(p.caption) ? h('span', { class: 'jd__photo-cap', text: p.caption }) : null);
      })));
    }
    if (e.evidence && has(e.evidence)) frag.appendChild(h('p', null, h('a', { class: 'link', href: e.evidence, target: '_blank', rel: 'noopener', text: e.type === 'certification' ? 'Verify the certificate' : 'See the evidence' })));
    else if (e.type === 'achievement') { var q = RJY.ph('a link to evidence — journey.js → ' + e.id + '.evidence'); if (q) frag.appendChild(q); }
    var c = RJY.connections(e.related); if (c) frag.appendChild(c);
    return frag;
  }

  RJY.journeyDetail = detailBody;

  /* ---------- small screens ---------- */
  function drawList() {
    entries.slice().reverse().forEach(function (e) {
      var more = h('div', { class: 'more', id: 'jl-' + e.id }, detailBody(e));
      var btn = h('button', { type: 'button', 'aria-expanded': 'false', 'aria-controls': 'jl-' + e.id },
        h('span', { class: 'when', text: e.when }), h('span', { class: 'title', text: e.title }), has(e.org) ? h('span', { class: 'org', text: e.org }) : null);
      var li = h('li', { class: 'jl-item' + (e.upcoming ? ' is-upcoming' : ''), 'data-id': e.id }, btn, more);
      btn.addEventListener('click', function () {
        var open = !li.classList.contains('is-open');
        li.classList.toggle('is-open', open); btn.setAttribute('aria-expanded', String(open));
        if (open) state.active = e.id;
      });
      els.list.appendChild(li);
    });
  }
})();
