/*
 * atlas.js — "A world still waiting to be discovered": an interactive world map.
 *
 * Real country boundaries (Natural Earth 1:50m) drawn with d3-geo. Countries in data/travel.js
 * light up by status; every country can be selected. Statistics, the year filter, the replay and
 * the milestones are all computed from data/travel.js — nothing here is invented.
 *
 * Draft mode (?draft): status buttons in the country panel save to this browser's localStorage,
 * and "Download travel.js" exports the updated data file to commit to the repository.
 *
 * Memories live here too: under the map, an album for each country with photos opens the same
 * chapter as the map, and photos without a country (data/gallery.js) form albums of their own.
 */
(function () {
  'use strict';
  var RJY = window.RJY, SITE = window.SITE, h = RJY.h, has = RJY.has;
  var STORE = 'rjy-travel-edits-v1';
  var WORLD_COUNT = 195;  // UN members + observer states
  var STATUS_TEXT = { home: 'Home', visited: 'Visited', current: 'Currently exploring', wishlist: 'On my wishlist', none: 'Undiscovered' };
  var STATUS_DOT = { home: '#f2c14e', visited: '#f2c14e', current: '#5fb3b8', wishlist: '#8e9ccb', none: '#3a4680' };
  var LIT = { home: 1, visited: 1, current: 1 };

  var G, world, features = [], byCode = {}, paths = {}, svgEl, gZoom, zoom, projection, pathGen, root, mapEl, tip, selected = null;
  var started = false, ready = false, pendingOpen = null, mapScroll = null;

  /* ---------- data (with local edits in draft mode) ---------- */
  function edits() { if (!RJY.draft) return {}; try { return JSON.parse(localStorage.getItem(STORE) || '{}'); } catch (e) { return {}; } }
  function saveEdits(e) { try { localStorage.setItem(STORE, JSON.stringify(e)); return true; } catch (err) { return false; } }
  function countries() {
    var list = (SITE.travel.countries || []).map(function (c) { return Object.assign({}, c); });
    // a country with uploaded photos (assets/photos/<CODE>/) counts as visited even before it's listed
    if (RJY.photos && RJY.photos.ready()) RJY.photos.countriesWithPhotos().forEach(function (code) {
      if (!list.some(function (x) { return x.code === code; })) list.push({ code: code, status: 'visited', places: [], years: [], photos: [], related: [], fromPhotos: true });
    });
    var e = edits();
    Object.keys(e).forEach(function (code) {
      var c = list.filter(function (x) { return x.code === code; })[0];
      if (e[code] === 'none') { list = list.filter(function (x) { return x.code !== code; }); return; }
      if (c) c.status = e[code]; else list.push({ code: code, status: e[code], places: [], years: [], photos: [], related: [] });
    });
    return list;
  }
  function statusOf(code) { var c = countries().filter(function (x) { return x.code === code; })[0]; return c ? c.status : 'none'; }
  function dataFor(code) { return countries().filter(function (x) { return x.code === code; })[0] || null; }

  /* ---------- lazy loading ---------- */
  function loadScript(src) {
    return new Promise(function (res, rej) {
      var el = document.createElement('script'); el.src = src; el.async = true;
      el.onload = res; el.onerror = function () { rej(new Error('Could not load ' + src)); };
      document.head.appendChild(el);
    });
  }

  RJY.renderAtlas = function (container) {
    root = container;
    mapEl = root.querySelector('.map');
    RJY.route.on('world', function (code) {
      // from elsewhere on the page, travel to the map first; from the map or the albums, stay put
      var fr = (root.querySelector('.map-frame') || root).getBoundingClientRect();
      if (!RJY.cinema && (fr.bottom < 80 || fr.top > window.innerHeight - 80)) RJY.scrollTo(document.getElementById('world'), { offset: 40 });
      if (ready) openCountry(code.toUpperCase(), true); else { pendingOpen = code.toUpperCase(); start(); }
    });
    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (es) { if (es[0].isIntersecting) { io.disconnect(); start(); } }, { rootMargin: '120% 0px' });
      io.observe(root);
    } else start();
  };

  function start() {
    if (started) return; started = true;
    var p = window.RJYGeo ? Promise.resolve() : loadScript('assets/vendor/geo.bundle.min.js');
    p.then(function () { return window.RJY_WORLD ? null : loadScript('data/world.js'); })
      .then(build)
      .catch(function (err) {
        console.error(err);
        mapEl.innerHTML = '';
        mapEl.appendChild(h('div', { class: 'map__loading', text: 'The map could not load. Refresh the page to try again.' }));
      });
  }

  /* ---------- build ---------- */
  function build() {
    G = window.RJYGeo; world = window.RJY_WORLD;
    var fc = G.feature(world, world.objects.countries);
    features = fc.features.filter(function (f) { return f.id !== 'ATA'; });
    features.forEach(function (f) { byCode[f.id] = f; });

    // bar: legend + search
    var bar = h('div', { class: 'atlas__bar' },
      h('ul', { class: 'legend', 'aria-label': 'Legend' },
        h('li', null, h('i', { class: 'l-visited' }), 'Visited'),
        h('li', null, h('i', { class: 'l-current' }), 'Currently exploring'),
        h('li', null, h('i', { class: 'l-wish' }), 'Want to visit'),
        h('li', null, h('i', { class: 'l-none' }), 'Undiscovered')),
      searchBox());
    root.insertBefore(bar, mapEl);

    // on phones the map keeps a full width and is swiped sideways inside this frame
    var frame = h('div', { class: 'map-frame' }), scroller = h('div', { class: 'map-scroll' });
    root.insertBefore(frame, mapEl);
    frame.appendChild(scroller);
    scroller.appendChild(mapEl);
    mapScroll = scroller;

    mapEl.innerHTML = '';
    var NS = 'http://www.w3.org/2000/svg';
    svgEl = RJY.s('svg', { role: 'img', 'aria-label': 'World map. Use the country search or the list below the map to open a country.' });
    svgEl.innerHTML = '<defs>' +
      '<filter id="glowGold" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="2.4" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>' +
      '<filter id="glowTeal" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="2.8" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>' +
      '<filter id="glowSoft" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="1.6" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>' +
      '</defs>';
    gZoom = document.createElementNS(NS, 'g');
    svgEl.appendChild(gZoom);
    mapEl.appendChild(svgEl);
    var dust = h('canvas', { class: 'map__dust', 'aria-hidden': 'true' });
    mapEl.appendChild(dust);
    tip = h('div', { class: 'map__tip', role: 'presentation' });
    mapEl.appendChild(tip);
    frame.appendChild(h('p', { class: 'map__swipe', 'aria-hidden': 'true', text: 'Swipe to explore the map' }));
    frame.appendChild(h('div', { class: 'map__controls' },
      h('button', { type: 'button', 'aria-label': 'Zoom in', onclick: function () { zoomBy(1.6); }, text: '+' }),
      h('button', { type: 'button', 'aria-label': 'Zoom out', onclick: function () { zoomBy(1 / 1.6); }, text: '−' }),
      h('button', { type: 'button', 'aria-label': 'Reset map', onclick: resetZoom, html: '<svg viewBox="0 0 14 14" aria-hidden="true"><circle cx="7" cy="7" r="5.2" fill="none" stroke="currentColor" stroke-width="1.3"/><circle cx="7" cy="7" r="1.4" fill="currentColor"/></svg>' })));

    draw();
    setupZoom();
    centerScroll(false);
    // the "swipe" hint goes once the visitor touches the map (the centring above scrolls it too)
    ['touchstart', 'pointerdown', 'wheel'].forEach(function (ev) {
      scroller.addEventListener(ev, function () { frame.classList.add('is-swiped'); }, { passive: true, once: true });
    });
    below();
    startDust(dust);
    var rt; window.addEventListener('resize', function () { clearTimeout(rt); rt = setTimeout(function () { draw(true); }, 220); });
    ready = true;
    if (pendingOpen) { var c = pendingOpen; pendingOpen = null; openCountry(c, true); }
  }

  function draw(isResize) {
    var w = mapEl.clientWidth || 1000, hgt = mapEl.clientHeight || 520;
    var VW = 1000, VH = Math.round(1000 * hgt / w);
    svgEl.setAttribute('viewBox', '0 0 ' + VW + ' ' + VH);
    // wide frames show the whole globe; narrow (phone) frames zoom to the land so it stays tappable
    var wholeGlobe = VW / VH >= 1.7;
    projection = G.geoNaturalEarth1().fitExtent([[12, 12], [VW - 12, VH - 12]], wholeGlobe ? { type: 'Sphere' } : { type: 'FeatureCollection', features: features });
    pathGen = G.geoPath(projection);
    gZoom.innerHTML = '';
    var NS = 'http://www.w3.org/2000/svg';
    var sphere = document.createElementNS(NS, 'path'); sphere.setAttribute('class', 'sphere'); sphere.setAttribute('d', pathGen({ type: 'Sphere' }));
    var grat = document.createElementNS(NS, 'path'); grat.setAttribute('class', 'graticule'); grat.setAttribute('d', pathGen(G.geoGraticule10()));
    gZoom.appendChild(grat); if (wholeGlobe) gZoom.appendChild(sphere);
    var frag = document.createDocumentFragment();
    features.forEach(function (f) {
      var p = document.createElementNS(NS, 'path');
      p.setAttribute('d', pathGen(f) || '');
      p.setAttribute('data-code', f.id);
      p.setAttribute('class', 'country');
      if (!isResize && !RJY.reducedMotion) {
        var c = projection(G.geoCentroid(f)) || [0, 0];
        p.style.opacity = '0';
        p.style.transitionDelay = (150 + (c[0] / VW) * 900 + Math.random() * 200).toFixed(0) + 'ms';
      }
      paths[f.id] = p;
      frag.appendChild(p);
    });
    gZoom.appendChild(frag);
    paint();
    if (!isResize && !RJY.reducedMotion) {
      // the world emerges from the night, west to east
      var io = new IntersectionObserver(function (es) {
        if (!es[0].isIntersecting) return; io.disconnect();
        requestAnimationFrame(function () { Object.keys(paths).forEach(function (k) { paths[k].style.opacity = ''; }); });
        setTimeout(function () { Object.keys(paths).forEach(function (k) { paths[k].style.transitionDelay = ''; }); }, 2000);
      }, { threshold: 0.25 });
      io.observe(mapEl);
    }
    // interactions (delegated)
    if (!svgEl._wired) {
      svgEl._wired = true;
      svgEl.addEventListener('pointermove', function (e) {
        var code = e.target.getAttribute && e.target.getAttribute('data-code');
        if (!code) { tip.style.opacity = 0; return; }
        var r = mapEl.getBoundingClientRect(), st = statusOf(code), n = LIT[st] ? photoCount(code) : 0;
        tip.innerHTML = '<b>' + RJY.esc(nameOf(code)) + '</b><span>' + STATUS_TEXT[st] + (n ? ' · ' + photosText(n) : '') + '</span>';
        tip.style.left = (e.clientX - r.left) + 'px'; tip.style.top = (e.clientY - r.top) + 'px'; tip.style.opacity = 1;
      });
      svgEl.addEventListener('pointerleave', function () { tip.style.opacity = 0; });
      svgEl.addEventListener('click', function (e) {
        var code = e.target.getAttribute && e.target.getAttribute('data-code');
        if (code) { tip.style.opacity = 0; RJY.route.go('#world/' + code); }
      });
    }
    if (selected && paths[selected]) paths[selected].classList.add('is-selected');
  }

  function nameOf(code) { var f = byCode[code]; return RJY.countryName(code, f && f.properties && f.properties.name); }

  function paint(only) {
    var list = countries(), map = {};
    list.forEach(function (c) { map[c.code] = c.status; });
    Object.keys(paths).forEach(function (code) {
      var st = map[code] || 'none', p = paths[code];
      p.setAttribute('class', 'country s-' + (st === 'none' ? 'none' : st) + (code === selected ? ' is-selected' : '') + (only && !only[code] ? ' is-faded' : ''));
      // lit countries are drawn last so their glow sits on top
      if (LIT[st] || st === 'wishlist') p.parentNode.appendChild(p);
    });
  }

  /* ---------- zoom ---------- */
  function setupZoom() {
    zoom = G.zoom().scaleExtent([1, 9])
      .filter(function (ev) {
        if (ev.type === 'wheel') return ev.ctrlKey || ev.metaKey;
        if (ev.type.indexOf('touch') === 0) return ev.touches && ev.touches.length >= 2;
        return !ev.button;
      })
      .on('zoom', function (ev) { gZoom.setAttribute('transform', ev.transform.toString()); });
    G.select(svgEl).call(zoom).on('dblclick.zoom', null);
    var vb = svgEl.viewBox.baseVal;
    zoom.translateExtent([[0, 0], [vb.width, vb.height]]).extent([[0, 0], [vb.width, vb.height]]);
    var hintT;
    mapEl.addEventListener('wheel', function (e) {
      if (e.ctrlKey || e.metaKey) return;
      tip.innerHTML = '<b>' + (navigator.platform.indexOf('Mac') !== -1 ? '⌘' : 'Ctrl') + ' + scroll</b><span>to zoom the map</span>';
      tip.style.left = '50%'; tip.style.top = '54px'; tip.style.opacity = 1;
      clearTimeout(hintT); hintT = setTimeout(function () { tip.style.opacity = 0; }, 1400);
    }, { passive: true });
  }
  // phones: bring the middle of the map (where zoomTo puts a country) into view
  function centerScroll(smooth) {
    if (!mapScroll || mapScroll.scrollWidth <= mapScroll.clientWidth + 2) return;
    var left = (mapScroll.scrollWidth - mapScroll.clientWidth) / 2;
    if (smooth && !RJY.reducedMotion) mapScroll.scrollTo({ left: left, behavior: 'smooth' }); else mapScroll.scrollLeft = left;
  }
  function zoomBy(k) { G.select(svgEl).transition().duration(500).call(zoom.scaleBy, k); }
  function resetZoom() { G.select(svgEl).transition().duration(700).call(zoom.transform, G.zoomIdentity); }
  function zoomTo(code) {
    var f = byCode[code]; if (!f) return;
    var b = pathGen.bounds(f), vb = svgEl.viewBox.baseVal;
    // big countries with far-flung territories: focus on the main landmass
    if (code === 'USA') b = [projection([-125, 49.5]), projection([-66, 24.5])];
    if (code === 'FRA') b = [projection([-5, 51.2]), projection([8.3, 42.3])];
    if (code === 'RUS') b = [projection([28, 70]), projection([150, 45])];
    var dx = b[1][0] - b[0][0], dy = b[1][1] - b[0][1], cx = (b[0][0] + b[1][0]) / 2, cy = (b[0][1] + b[1][1]) / 2;
    var k = Math.max(1, Math.min(6, 0.42 / Math.max(dx / vb.width, dy / vb.height)));
    var offset = window.innerWidth > 900 ? vb.width * 0.16 / k : 0;   // keep it clear of the side panel
    var t = G.zoomIdentity.translate(vb.width / 2 - offset * k, vb.height / 2).scale(k).translate(-cx, -cy);
    G.select(svgEl).transition().duration(RJY.reducedMotion ? 0 : 900).call(zoom.transform, t);
    centerScroll(true);
  }

  /* ---------- search ---------- */
  function searchBox() {
    var names = features.map(function (f) { return { code: f.id, name: nameOf(f.id) }; }).sort(function (a, b) { return a.name.localeCompare(b.name); });
    var dl = h('datalist', { id: 'country-names' }, names.map(function (n) { return h('option', { value: n.name }); }));
    var input = h('input', { type: 'search', list: 'country-names', placeholder: 'Find a country', 'aria-label': 'Find a country on the map', autocomplete: 'off' });
    function go() {
      var v = input.value.trim().toLowerCase(); if (!v) return;
      var m = names.filter(function (n) { return n.name.toLowerCase() === v; })[0] || names.filter(function (n) { return n.name.toLowerCase().indexOf(v) === 0; })[0];
      if (m) { RJY.route.go('#world/' + m.code); input.blur(); }
    }
    input.addEventListener('change', go);
    input.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); go(); } });
    return h('div', { class: 'atlas__search' }, h('span', { html: '<svg viewBox="0 0 16 16" aria-hidden="true"><circle cx="7" cy="7" r="5" fill="none" stroke="currentColor" stroke-width="1.4"/><path d="M11 11l3.5 3.5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>' }), input, dl);
  }

  /* ---------- stats, years, milestones ---------- */
  var belowEl;
  function stats() {
    var list = countries(), lit = list.filter(function (c) { return LIT[c.status]; });
    var conts = {}, places = {}, photos = 0;
    lit.forEach(function (c) {
      var f = byCode[c.code]; if (f && f.properties.cont) conts[f.properties.cont] = 1;
      var P = RJY.places.forCountry(c);
      P.places.forEach(function (x) { places[c.code + ':' + RJY.places.slug(x.name)] = 1; photos += x.photos.length; });
      photos += P.photos.length;
    });
    (SITE.travel.trips || []).forEach(function (t) { photos += (t.photos || []).length; });
    var independent = lit.filter(function (c) { var f = byCode[c.code]; return !f || f.properties.ind; }).length;
    return {
      countries: lit.length, independent: independent, pct: independent / WORLD_COUNT * 100,
      continents: Object.keys(conts).length, cities: Object.keys(places).length,
      trips: (SITE.travel.trips || []).length, photos: photos,
      wishlist: list.filter(function (c) { return c.status === 'wishlist'; }).length
    };
  }

  function below() {
    belowEl = h('div', { class: 'atlas__below' });
    if (albumsEl && albumsEl.parentNode) albumsEl.parentNode.insertBefore(belowEl, albumsEl.nextSibling);
    else root.appendChild(belowEl);
    renderBelow();
  }
  function renderBelow() {
    var st = stats();
    belowEl.innerHTML = '';
    var pct = st.pct < 10 ? st.pct.toFixed(1) : Math.round(st.pct);
    var left = h('div', null,
      h('dl', { class: 'stats' },
        stat(st.countries, st.countries === 1 ? 'country' : 'countries'),
        stat(pct + '%', 'of the world’s ' + WORLD_COUNT + ' countries'),
        stat(st.continents, st.continents === 1 ? 'continent' : 'continents'),
        stat(st.cities, st.cities === 1 ? 'place recorded' : 'places recorded'),
        stat(st.trips, st.trips === 1 ? 'documented trip' : 'documented trips'),
        stat(st.photos, st.photos === 1 ? 'travel photo' : 'travel photos'),
        stat(st.wishlist, 'on the wishlist')),
      h('p', { class: 'atlas__note', text: 'Still being filled in: the places, stories and photos from each country are on their way.' }),
      h('div', { class: 'atlas__visited' },
        h('p', { class: 'links-head', text: 'Lit so far' }),
        h('div', { class: 'connect' }, countries().filter(function (c) { return c.status !== 'none'; }).map(function (c) {
          return h('a', { href: '#world/' + c.code }, h('i', { style: { background: STATUS_DOT[c.status], boxShadow: '0 0 6px ' + STATUS_DOT[c.status] } }), nameOf(c.code) + ' — ' + STATUS_TEXT[c.status].toLowerCase());
        }))),
      RJY.draft ? draftTools() : null
    );
    var years = yearsWithTravel();
    var yearRow = h('div', { class: 'atlas__years', role: 'group', 'aria-label': 'Travels by year' },
      yearChip('All years', 'all'), years.map(function (y) { return yearChip(String(y), String(y)); }),
      h('button', { class: 'chip replay', type: 'button', onclick: replay, 'aria-label': 'Replay my documented travels in order', html: '<svg viewBox="0 0 10 10" aria-hidden="true"><path d="M2 1l7 4-7 4z" fill="currentColor"/></svg>Replay' }));
    var right = h('div', null,
      h('p', { class: 'links-head', text: 'Travels by year' }),
      yearRow,
      h('p', { class: 'atlas__note', id: 'year-caption', 'aria-live': 'polite', text: years.length ? 'Only years I’ve recorded appear here.' : 'No dated trips recorded yet.' }),
      h('p', { class: 'links-head', style: { marginTop: '26px' }, text: 'Milestones' }),
      achievements(st));
    belowEl.appendChild(left); belowEl.appendChild(right);
  }
  function stat(v, label) { return h('div', null, h('dd', { text: String(v) }), h('dt', { text: label })); }

  function yearsWithTravel() {
    var ys = {};
    (SITE.travel.trips || []).forEach(function (t) {
      var a = parseInt(String(t.start).slice(0, 4), 10), b = parseInt(String(t.end || t.start).slice(0, 4), 10);
      for (var y = a; y <= b; y++) if (y) ys[y] = 1;
    });
    countries().forEach(function (c) { (c.years || []).forEach(function (y) { ys[y] = 1; }); });
    return Object.keys(ys).map(Number).sort();
  }
  function countriesIn(year) {
    var set = {};
    (SITE.travel.trips || []).forEach(function (t) {
      var a = parseInt(String(t.start).slice(0, 4), 10), b = parseInt(String(t.end || t.start).slice(0, 4), 10);
      if (year >= a && year <= b) set[t.country] = 1;
    });
    countries().forEach(function (c) { if ((c.years || []).indexOf(year) !== -1) set[c.code] = 1; });
    return set;
  }
  function yearChip(label, value) {
    var b = h('button', { class: 'chip', type: 'button', 'aria-pressed': String(value === 'all'), 'data-year': value, text: label });
    b.addEventListener('click', function () {
      belowEl.querySelectorAll('[data-year]').forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); });
      var cap = document.getElementById('year-caption');
      if (value === 'all') { paint(); cap.textContent = 'Only years I’ve recorded appear here.'; return; }
      var set = countriesIn(+value);
      paint(set);
      var trips = (SITE.travel.trips || []).filter(function (t) { return +String(t.start).slice(0, 4) <= +value && +String(t.end || t.start).slice(0, 4) >= +value; });
      cap.textContent = value + ': ' + (trips.length ? trips.map(function (t) { return t.title + ' (' + nameOf(t.country) + ')'; }).join('; ') : Object.keys(set).map(nameOf).join(', ') || 'nothing recorded');
    });
    return b;
  }

  // Light the documented countries one by one: home first, then by first recorded year.
  var replaying = false;
  function replay() {
    if (replaying) return; replaying = true;
    var list = countries().filter(function (c) { return LIT[c.status]; });
    var firstYear = function (c) {
      var ys = (c.years || []).slice();
      (SITE.travel.trips || []).forEach(function (t) { if (t.country === c.code) ys.push(parseInt(String(t.start).slice(0, 4), 10)); });
      return ys.length ? Math.min.apply(null, ys) : null;
    };
    list.sort(function (a, b) {
      if (a.status === 'home') return -1; if (b.status === 'home') return 1;
      var ya = firstYear(a), yb = firstYear(b);
      if (ya == null && yb == null) return 0; if (ya == null) return -1; if (yb == null) return 1; return ya - yb;
    });
    var cap = document.getElementById('year-caption');
    Object.keys(paths).forEach(function (k) { if (LIT[statusOf(k)]) paths[k].classList.add('is-replay-off'); });
    var i = 0;
    (function nextStep() {
      if (i >= list.length) { replaying = false; cap.textContent = 'Replay finished — ' + list.length + ' countries so far.'; return; }
      var c = list[i++], y = firstYear(c), p = paths[c.code];
      if (p) p.classList.remove('is-replay-off');
      cap.textContent = nameOf(c.code) + (c.status === 'home' ? ' — home' : y ? ' — first recorded ' + y : ' — date not recorded');
      setTimeout(nextStep, RJY.reducedMotion ? 400 : 1300);
    })();
  }

  function achievements(st) {
    var defs = [
      { n: 1, label: 'First country', ok: st.countries >= 1, pts: 1 },
      { n: 2, label: 'Two continents', ok: st.continents >= 2, pts: 2 },
      { n: 3, label: 'Three continents', ok: st.continents >= 3, pts: 3 },
      { n: 5, label: 'Five countries', ok: st.countries >= 5, pts: 5 },
      { n: 10, label: 'Ten countries', ok: st.countries >= 10, pts: 6 },
      { n: 6, label: 'Every inhabited continent', ok: st.continents >= 6, pts: 7 }
    ];
    return h('ul', { class: 'achievements' }, defs.map(function (d) {
      var pts = glyph(d.pts);
      var svg = '<svg viewBox="0 0 34 34" aria-hidden="true">';
      for (var i = 1; i < pts.length; i++) svg += '<line x1="' + pts[i - 1][0] + '" y1="' + pts[i - 1][1] + '" x2="' + pts[i][0] + '" y2="' + pts[i][1] + '"/>';
      pts.forEach(function (p, i) { svg += '<circle cx="' + p[0] + '" cy="' + p[1] + '" r="' + (i === 0 ? 2.2 : 1.6) + '"/>'; });
      svg += '</svg>';
      return h('li', { class: 'ach' + (d.ok ? ' is-earned' : '') }, h('span', { html: svg }),
        h('span', null, d.label, h('small', { text: d.ok ? 'Reached' : 'Still ahead' })));
    }));
  }
  function glyph(n) {
    var shapes = { 1: [[17, 17]], 2: [[9, 22], [25, 12]], 3: [[6, 24], [17, 10], [28, 22]], 5: [[5, 20], [12, 9], [20, 15], [27, 6], [29, 25]], 6: [[4, 14], [11, 24], [17, 12], [23, 22], [29, 9], [30, 28]], 7: [[4, 26], [8, 12], [15, 18], [18, 5], [24, 14], [30, 8], [28, 28]] };
    return shapes[n] || shapes[1];
  }

  /* ---------- country panel ---------- */
  function relatedFor(code, c) {
    var refs = (c && c.related) ? c.related.slice() : [];
    (SITE.journey || []).forEach(function (j) { if (j.country === code && refs.indexOf('j:' + j.id) === -1) refs.push('j:' + j.id); });
    (SITE.work || []).forEach(function (w) { if ((w.related || []).indexOf('c:' + code) !== -1 && refs.indexOf('w:' + w.id) === -1) refs.push('w:' + w.id); });
    return refs;
  }

  function openCountry(code, zoomIn) {
    if (!byCode[code]) return;
    if (selected && paths[selected]) paths[selected].classList.remove('is-selected');
    selected = code;
    if (paths[code]) paths[code].classList.add('is-selected');
    var c = dataFor(code), st = c ? c.status : 'none';
    var mapShown = !RJY.cinema || RJY.cinema.view === 'atlas';
    if (mapShown && zoomIn && (LIT[st] || st === 'wishlist' || zoomIn === 'force')) zoomTo(code);
    RJY.sheet.open({
      kind: 'drawer',
      label: nameOf(code),
      onClose: function (why) {
        if (selected && paths[selected]) paths[selected].classList.remove('is-selected');
        selected = null;
        if (why === 'closed' && mapShown) resetZoom();   // back to the whole world
      },
      render: function (body) { body.appendChild(countryView(code, c, st)); }
    });
  }

  // The photo across the top of a country: its `cover`, or else the first photo found for it.
  function coverFor(c) {
    if (!c) return null;
    if (has(c.cover)) {
      var all = [].concat(c.photos || []);
      (c.places || []).forEach(function (pl) { all = all.concat(pl.photos || []); });
      return all.filter(function (x) { return x && x.src === c.cover; })[0] || { src: c.cover };
    }
    var first = null;
    (c.places || []).some(function (pl) { return (first = (pl.photos || [])[0] || null); });
    return first || (c.photos || [])[0] || null;
  }

  function countryView(code, c, st) {
    var flag = RJY.flagSrc(code), cover = LIT[st] ? coverFor(c) : null;
    var el = h('div', { class: 'cp' + (cover ? ' has-cover' : '') },
      cover ? h('figure', { class: 'cp__cover' }, RJY.picture(cover, { full: true, eager: true, sizes: '(max-width: 640px) 100vw, 640px', alt: '' })) : null,
      flag ? h('img', { class: 'cp__flag', src: flag, alt: 'Flag of ' + nameOf(code), width: 56, height: 42 }) : null,
      h('p', { class: 'cp__status' }, h('i', { style: { background: STATUS_DOT[st], boxShadow: '0 0 8px ' + STATUS_DOT[st] } }), STATUS_TEXT[st]),
      h('h2', { class: 'cp__name', text: nameOf(code) }));
    if (LIT[st]) {
      if (has(c.headline)) el.appendChild(h('p', { class: 'cp__head', text: c.headline }));
      var nPhotos = photoCount(code);
      if (nPhotos) el.appendChild(h('button', { type: 'button', class: 'cp__jump', onclick: function () {
        var to = el.querySelector('.cp__places > h3') || el.querySelector('.cp__places-wrap');
        if (to) to.scrollIntoView({ behavior: RJY.reducedMotion ? 'auto' : 'smooth', block: 'start' });
      } }, photosText(nPhotos), h('span', { 'aria-hidden': 'true', text: '↓' })));
      if (has(c.years)) { el.appendChild(h('h3', { text: 'When' })); el.appendChild(h('p', { text: c.years.join(', ') })); }
      el.appendChild(placesBlock(code, c));
      var trips = (SITE.travel.trips || []).filter(function (t) { return t.country === code; });
      if (trips.length) {
        el.appendChild(h('h3', { text: trips.length === 1 ? 'Trip' : 'Trips' }));
        trips.sort(function (a, b) { return a.start < b.start ? -1 : 1; }).forEach(function (t) {
          el.appendChild(h('div', { class: 'cp__trip' }, h('b', { text: t.title }), h('span', { text: RJY.monthYear(t.start) + (t.end && t.end !== t.start ? ' – ' + RJY.monthYear(t.end) : '') }),
            has(t.story) ? h('p', { text: t.story }) : null, has(t.photos) ? gallery(t.photos) : null));
        });
      }
      section(el, 'My story', c.story, function (v) { return h('p', { text: v }); }, 'your story from ' + nameOf(code) + ' — travel.js → story');
      section(el, 'Highlights', c.highlights, function (v) { return h('ul', { class: 'jd__list' }, v.map(function (x) { return h('li', null, has(x.kind) ? h('b', { text: x.kind + ': ' }) : null, x.text); })); }, 'food, culture, architecture, nature… — highlights');
      section(el, 'What I learned', c.learned, function (v) { return h('p', { text: v }); }, 'what you took away — learned');
      section(el, 'Travelled with', c.companions, function (v) { return h('p', { text: v }); }, null);
      if (has(c.videos)) { el.appendChild(h('h3', { text: 'Clips' })); c.videos.forEach(function (v) { el.appendChild(h('video', { src: v.src, poster: v.poster || null, controls: true, preload: 'none', playsinline: true, style: { width: '100%', borderRadius: '2px', marginBottom: '8px' } })); }); }
      var conn = RJY.connections(relatedFor(code, c), 'What happened here'); if (conn) el.appendChild(conn);
    } else if (st === 'wishlist') {
      el.appendChild(h('p', { class: 'cp__head', text: 'A destination still ahead.' }));
      section(el, 'Why I want to go', c.reasons, function (v) { return h('p', { text: v }); }, 'your reasons — reasons');
      var hope = c.hopeToSee || (c.places || []).filter(function (x) { return typeof x === 'string'; });
      section(el, 'Places I hope to see', hope, function (v) { return h('ul', { class: 'jd__list' }, v.map(function (x) { return h('li', { text: x }); })); }, 'places — hopeToSee');
      section(el, 'What I want to do', c.activities, function (v) { return h('ul', { class: 'jd__list' }, v.map(function (x) { return h('li', { text: x }); })); }, 'activities — activities');
      section(el, 'Notes', c.notes, function (v) { return h('p', { text: v }); }, null);
    } else {
      el.appendChild(h('p', { class: 'cp__head', text: 'Not explored yet.' }));
      el.appendChild(h('p', { class: 'cp__empty', text: 'This one is still waiting to be discovered. If you know a place here I shouldn’t miss, tell me.' }));
      el.appendChild(h('div', { class: 'btn-row' }, h('a', { class: 'btn btn--ghost', href: SITE.links.linkedin, target: '_blank', rel: 'noopener', text: 'Suggest it on LinkedIn' })));
    }
    if (RJY.draft) el.appendChild(editor(code, st));
    return el;
  }

  function section(el, title, val, render, hint) {
    if (has(val)) { el.appendChild(h('h3', { text: title })); el.appendChild(render(val)); }
    else if (hint) { var p = RJY.ph(hint); if (p) { el.appendChild(h('h3', { text: title })); el.appendChild(p); } }
  }
  // A place's photos as a mosaic: the first one large, the rest in a grid. Long sets show six
  // and a button for the rest. Captions show on the photos unless they only repeat the place's name.
  var SHOW = 6;
  // How wide each kind of tile is drawn — on a phone (vw), in the 600 px drawer (px) — and its shape,
  // so the browser picks the right file (480, 1080 or 2048 px). A photo wider than its tile is cropped
  // at the sides and drawn larger, so it asks for a bigger file.
  var TILE = { one: [90, 500, 3 / 2], half: [45, 250, 1], big: [60, 335, 1], small: [30, 165, 1], wide2: [60, 335, 2], wide3: [90, 500, 3] };
  function coverSizes(vw, px, shape, p) {
    var k = p && p.w && p.h ? Math.max(1, (p.w / p.h) / shape) : 1;
    return '(max-width: 640px) ' + Math.round(vw * k) + 'vw, ' + Math.round(px * k) + 'px';
  }
  function tileSizes(kind, p) { var t = TILE[kind]; return coverSizes(t[0], t[1], t[2], p); }
  // the last photo widens to fill its row: two beside the large photo, then rows of three
  function fitMosaic(grid) {
    var vis = Array.prototype.filter.call(grid.children, function (b) { return !b.hidden; });
    vis.forEach(function (b) { b.classList.remove('is-wide2', 'is-wide3'); });
    var small = vis.length - 1;
    if (vis.length < 3 || small < 2) return;
    var rem = (small - 2) % 3;
    if (!rem) return;
    var last = vis[vis.length - 1], wide = rem === 1 ? 'wide3' : 'wide2', img = last.querySelector('img');
    last.classList.add('is-' + wide);
    // a wider tile needs a larger file (a tile that narrows again keeps the one it has)
    if (img && img.dataset.tile === 'small' && img.hasAttribute('sizes')) { img.setAttribute('sizes', tileSizes(wide, last._photo)); img.dataset.tile = wide; }
  }
  function gallery(list, place) {
    var n = list.length, more = n > SHOW + 1;
    var grid = h('div', { class: 'cp__gallery' + (n === 1 ? ' is-one' : n === 2 ? ' is-two' : '') });
    list.forEach(function (p, k) {
      var label = p.caption || p.alt || (place ? 'Photo from ' + place : 'Photo');
      var big = k === 0 && n > 2, kind = n === 1 ? 'one' : n === 2 ? 'half' : big ? 'big' : 'small';
      var b = h('button', { type: 'button', class: 'cp__shot' + (big ? ' is-big' : ''), hidden: more && k >= SHOW ? true : null, 'aria-label': 'Open photo: ' + label, onclick: function () {
        var ok = list.filter(function (q) { return !q.broken; });
        RJY.lightbox(p, ok, ok.indexOf(p));
      } },
        // alt is empty: the button's label already names the photo
        RJY.picture(p, { sizes: tileSizes(kind, p), alt: '', onerror: function () { p.broken = true; b.hidden = true; b.setAttribute('data-broken', ''); } }),
        has(p.caption) && (!place || RJY.places.norm(p.caption) !== RJY.places.norm(place)) ? h('span', { class: 'cp__shot-cap', text: p.caption }) : null);
      b._photo = p;
      var im = b.querySelector('img'); if (im) im.dataset.tile = kind;
      grid.appendChild(b);
    });
    if (n > 2) fitMosaic(grid);
    if (!more) return grid;
    var btn = h('button', { type: 'button', class: 'cp__more', text: 'Show all ' + n + ' photos', onclick: function (e) {
      var added = grid.querySelectorAll('.cp__shot[hidden]:not([data-broken])');
      added.forEach(function (x) { x.hidden = false; });
      fitMosaic(grid);
      // focus stays in the drawer, on the first new photo (scrolled to only when the keyboard was used)
      if (added[0]) added[0].focus({ preventScroll: e.detail !== 0 });
      btn.remove();
    } });
    return h('div', null, grid, btn);
  }

  /* ---------- places: provinces/states, cities and their photos ----------
     The block appears at once; the province/state map and the grouping fill in as soon as the
     country's regions file (data/regions/<CODE>.js) has loaded. */
  var currentPlaces = null;
  function placesBlock(code, c) {
    var mapBox = h('div', { class: 'cp__map' });
    var list = h('div', { class: 'cp__places' });
    var wrap = h('div', { class: 'cp__places-wrap' }, mapBox, list);
    function fill(R) {
      if (!wrap.isConnected) return;
      var data = RJY.places.forCountry(c);
      var resolved = data.places.map(function (p) { return { p: p, r: RJY.regions.resolve(R, p) }; });
      // a photo folder takes the proper spelling of the city or province it matches
      resolved.forEach(function (x) {
        if (!x.p.discovered) return;
        if (x.r.city) x.p.name = x.r.city.name; else if (x.r.isRegion && x.r.region) x.p.name = x.r.region.name;
      });
      // the province/state map appears once there is a place or photo to show on it
      if (resolved.length || data.photos.length || RJY.draft) drawMiniMap(mapBox, code, R, resolved, list); else mapBox.innerHTML = '';
      renderPlaces(list, code, resolved, data.photos);
    }
    function load() { RJY.regions.load(code).then(fill, function () { fill(null); }); }
    wrap._refresh = load;
    currentPlaces = wrap;
    load();
    return wrap;
  }

  // "the United States", "the Netherlands"… in running text
  function inText(code) {
    var n = nameOf(code);
    return /^(United |Dominican Republic|Central African Republic|Czech Republic|Philippines|Netherlands|Bahamas|Gambia|Maldives|Comoros|Seychelles|.+ Islands$)/.test(n) ? 'the ' + n : n;
  }

  function renderPlaces(list, code, resolved, countryPhotos) {
    list.innerHTML = '';
    var total = countryPhotos.length, cname = inText(code), plain = nameOf(code);
    resolved.forEach(function (x) { total += x.p.photos.length; });
    if (!resolved.length && !countryPhotos.length) {
      list.appendChild(h('p', { class: 'cp__soon', text: 'The places and photos from ' + cname + ' are on their way.' }));
      var ph0 = RJY.ph('the provinces/states and cities you visited: list them under places in data/travel.js, or upload photos into a folder named after each city in ' + RJY.places.folderFor(code));
      if (ph0) list.appendChild(ph0);
      return;
    }
    list.appendChild(h('h3', { text: 'Where I’ve been' }));
    // group by province/state, in the order they first appear; anything unmatched goes last
    var groups = [], byKey = {};
    resolved.forEach(function (x) {
      var key = x.r.region ? 'r' + x.r.region.i : 'other';
      var g = byKey[key];
      if (!g) { g = byKey[key] = { key: key, region: x.r.region, items: [] }; groups.push(g); }
      g.items.push(x);
    });
    groups.sort(function (a, b) { return (a.key === 'other') - (b.key === 'other'); });
    groups.forEach(function (g) {
      var sec = h('section', { class: 'cp__region', 'data-key': g.key });
      var regionName = g.region ? g.region.name : (groups.length > 1 ? 'Other places' : '');
      var head = regionName ? h('h4', { class: 'cp__region-name' }, regionName, g.region && g.region.kind ? h('span', { class: 'cp__region-kind', text: g.region.kind }) : null) : null;
      if (head) sec.appendChild(head);
      g.items.forEach(function (x) {
        // a place that is the province/state itself (Seoul, Beijing…) sits right under its heading
        var p = x.p, own = g.region && (x.r.isRegion || (g.items.length === 1 && RJY.places.norm(p.name) === RJY.places.norm(g.region.name)));
        var art = h('article', { class: 'cp__place' + (own ? ' is-region' : ''), 'data-place': RJY.places.slug(p.name) });
        var count = p.photos.length ? h('span', { class: 'cp__count', text: p.photos.length + (p.photos.length === 1 ? ' photo' : ' photos') }) : null;
        if (!own) art.appendChild(h('h5', { class: 'cp__place-name' }, h('span', { class: 'cp__place-star', html: RJY.starIcon() }), p.name, count));
        else if (count && head && g.items.length === 1) head.appendChild(count);   // its count sits on the heading's line
        else if (count) art.appendChild(h('p', { class: 'cp__place-name is-own' }, count));
        if (has(p.note)) art.appendChild(h('p', { class: 'cp__place-note', text: p.note }));
        if (has(p.story)) art.appendChild(h('p', { class: 'cp__place-story', text: p.story }));
        if (p.photos.length) art.appendChild(gallery(p.photos.map(function (ph) { return Object.assign({ place: p.name + ', ' + plain }, ph); }), p.name));
        else { var ph1 = RJY.ph('photos of ' + p.name + ': upload them to ' + RJY.places.folderFor(code, p)); if (ph1) art.appendChild(ph1); }
        sec.appendChild(art);
      });
      list.appendChild(sec);
    });
    if (countryPhotos.length) {
      list.appendChild(h('section', { class: 'cp__region', 'data-key': 'country' },
        h('h4', { class: 'cp__region-name', text: 'Around ' + cname }),
        gallery(countryPhotos.map(function (ph) { return Object.assign({ place: plain }, ph); }), plain)));
    }
    if (!total) list.appendChild(h('p', { class: 'cp__soon', text: 'Photos from ' + cname + ' are on their way.' }));
    var ph2 = RJY.ph('another place: upload its photos into a folder named after the city or province (lowercase, dashes for spaces) inside ' + RJY.places.folderFor(code) + ' — it appears here and on the map by itself');
    if (ph2) list.appendChild(ph2);
  }

  // Scroll the drawer to a place and make it glow for a moment.
  function focusPlace(list, key, placeSlug) {
    var target = (placeSlug && list.querySelector('[data-place="' + placeSlug + '"]')) || list.querySelector('[data-key="' + key + '"]');
    if (!target) return;
    target.scrollIntoView({ behavior: RJY.reducedMotion ? 'auto' : 'smooth', block: 'center' });
    target.classList.remove('is-flash'); void target.offsetWidth; target.classList.add('is-flash');
  }

  // The parts of a country to frame: its main landmass and nearby islands (not far-flung territories).
  function mainLand(fc) {
    var parts = [];
    fc.features.forEach(function (f) {
      var g = f.geometry; if (!g) return;
      var polys = g.type === 'Polygon' ? [g.coordinates] : g.type === 'MultiPolygon' ? g.coordinates : [];
      polys.forEach(function (pc) {
        var poly = { type: 'Polygon', coordinates: pc }, a = G.geoArea(poly);
        if (a > 0 && a < 2 * Math.PI) parts.push({ poly: poly, a: a, c: G.geoCentroid(poly) });
      });
    });
    if (!parts.length) return fc;
    var total = parts.reduce(function (t, p) { return t + p.a; }, 0);
    var big = parts.filter(function (p) { return p.a >= total * 0.01; });
    var x = 0, y = 0, z = 0;
    big.forEach(function (p) { var l = p.c[0] * Math.PI / 180, t = p.c[1] * Math.PI / 180; x += p.a * Math.cos(t) * Math.cos(l); y += p.a * Math.cos(t) * Math.sin(l); z += p.a * Math.sin(t); });
    var cen = [Math.atan2(y, x) * 180 / Math.PI, Math.atan2(z, Math.sqrt(x * x + y * y)) * 180 / Math.PI];
    var lim = 3 * Math.sqrt(total);
    var keep = parts.filter(function (p) { return G.geoDistance(p.c, cen) <= (p.a >= total * 0.01 ? lim : lim * 0.5); });
    return { type: 'FeatureCollection', features: (keep.length ? keep : parts).map(function (p) { return { type: 'Feature', properties: {}, geometry: p.poly }; }) };
  }

  var STAR = 'M0-8.5l1.6 5.6 5.6 1.3-5.6 1.3L0 6.3l-1.6-6.6-5.6-1.3 5.6-1.3z';
  function drawMiniMap(box, code, R, resolved, list) {
    box.innerHTML = '';
    var own = byCode[code];
    var fc = R ? R.fc : { type: 'FeatureCollection', features: own ? [own] : [] };
    if (!fc.features.length) return;
    var w = Math.max(240, Math.round(box.clientWidth || 420));
    var usa = code === 'USA' && !!R;
    var fit = usa ? fc : mainLand(fc), proj;
    if (usa) proj = G.geoAlbersUsa();
    else { var cen = G.geoCentroid(fit); proj = G.geoAzimuthalEqualArea().rotate([-cen[0], -cen[1]]).clipAngle(90); }
    proj.fitWidth(w - 24, fit);
    var b = G.geoPath(proj).bounds(fit);
    var hh = Math.max(170, Math.min(Math.round(w * 0.86), Math.ceil(b[1][1] - b[0][1]) + 26));
    proj.fitExtent([[12, 12], [w - 12, hh - 12]], fit);
    if (!usa) proj.clipExtent([[0, 0], [w, hh]]);
    var pth = G.geoPath(proj);

    var lit = {}, stars = [], labels = [];
    resolved.forEach(function (x) {
      if (x.r.region) lit[x.r.region.i] = true;
      if (x.r.coords) {
        var pt = proj(x.r.coords);
        if (pt) stars.push({ x: pt[0], y: pt[1], name: x.p.name, slug: RJY.places.slug(x.p.name), key: x.r.region ? 'r' + x.r.region.i : 'other' });
      } else if (x.r.isRegion && x.r.region) {
        var cp = pth.centroid(x.r.region.feature);
        if (cp && isFinite(cp[0])) labels.push({ x: cp[0], y: cp[1], name: x.r.region.name, key: 'r' + x.r.region.i, region: true });
      }
    });
    var litNames = resolved.map(function (x) { return x.p.name + (x.r.region && !x.r.isRegion ? ' (' + x.r.region.name + ')' : ''); });
    var svg = RJY.s('svg', { class: 'cpmap', viewBox: '0 0 ' + w + ' ' + hh, width: w, height: hh, role: 'img',
      'aria-label': 'Map of ' + inText(code) + (litNames.length ? '. Places I’ve been: ' + litNames.join(', ') + '.' : '.') });
    svg.appendChild(RJY.s('defs', null, RJY.s('filter', { id: 'cpGlow', x: '-50%', y: '-50%', width: '200%', height: '200%' },
      RJY.s('feGaussianBlur', { stdDeviation: '2.2', result: 'b' }), RJY.s('feMerge', null, RJY.s('feMergeNode', { in: 'b' }), RJY.s('feMergeNode', { in: 'SourceGraphic' })))));
    if (!usa) {
      var g0 = RJY.s('g', { class: 'cpmap__world' });
      features.forEach(function (f) { if (f.id === code) return; var d = pth(f); if (d) g0.appendChild(RJY.s('path', { d: d })); });
      svg.appendChild(g0);
    }
    var g1 = RJY.s('g', { class: 'cpmap__regions' }), litEls = [];
    fc.features.forEach(function (f, i) {
      var d = pth(f); if (!d) return;
      var on = R ? !!lit[i] : resolved.length > 0;
      var el = RJY.s('path', { d: d, class: on ? 'is-lit' : '' });
      el.appendChild(RJY.s('title', { text: R ? R.regions[i].name : nameOf(code) }));
      if (on && R) el.addEventListener('click', function () { focusPlace(list, 'r' + i); });
      if (on) litEls.push(el); else g1.appendChild(el);
    });
    litEls.forEach(function (el) { g1.appendChild(el); });   // lit provinces on top so their glow shows
    svg.appendChild(g1);
    // labels: provinces/states visited as a whole, then cities (skipping any that would collide)
    var boxes = [];
    function free(r) { return r.x >= 2 && r.x + r.w <= w - 2 && r.y >= 2 && r.y + r.h <= hh - 2 && !boxes.some(function (o) { return r.x < o.x + o.w && r.x + r.w > o.x && r.y < o.y + o.h && r.y + r.h > o.y; }); }
    var g2 = RJY.s('g', { class: 'cpmap__labels' });
    stars.forEach(function (st) { boxes.push({ x: st.x - 8, y: st.y - 8, w: 16, h: 16 }); });
    labels.forEach(function (l) {
      var tw = l.name.length * 6.6 + 4, r = { x: l.x - tw / 2, y: l.y - 8, w: tw, h: 15 };
      if (!free(r)) return;
      boxes.push(r);
      g2.appendChild(RJY.s('text', { class: 'is-region', x: l.x, y: l.y + 4, 'text-anchor': 'middle', text: l.name }));
    });
    var g3 = RJY.s('g', { class: 'cpmap__stars' });
    stars.forEach(function (st) {
      var gg = RJY.s('g', { class: 'cpmap__star', transform: 'translate(' + st.x.toFixed(1) + ' ' + st.y.toFixed(1) + ')' });
      gg.appendChild(RJY.s('circle', { class: 'halo', r: 11 }));
      gg.appendChild(RJY.s('path', { d: STAR }));
      gg.appendChild(RJY.s('title', { text: st.name }));
      gg.addEventListener('click', function () { focusPlace(list, st.key, st.slug); });
      g3.appendChild(gg);
      var tw = st.name.length * 6.4 + 4;
      var spots = [{ x: st.x + 11, y: st.y - 7, a: 'start' }, { x: st.x - 11 - tw, y: st.y - 7, a: 'end' }, { x: st.x - tw / 2, y: st.y + 10, a: 'middle' }, { x: st.x - tw / 2, y: st.y - 24, a: 'middle' }];
      for (var k = 0; k < spots.length; k++) {
        var sp = spots[k], r = { x: sp.x, y: sp.y, w: tw, h: 14 };
        if (!free(r)) continue;
        boxes.push(r);
        g2.appendChild(RJY.s('text', { x: sp.a === 'start' ? sp.x : sp.a === 'end' ? sp.x + tw : sp.x + tw / 2, y: sp.y + 11, 'text-anchor': sp.a, text: st.name }));
        break;
      }
    });
    svg.appendChild(g3);
    svg.appendChild(g2);
    box.appendChild(svg);
  }

  // New photos found in the repository: refresh the map, the numbers and an open country.
  document.addEventListener('rjy:photos', function () {
    counts = null; renderAlbums();
    if (!ready) return;
    paint(); renderBelow();
    if (currentPlaces && currentPlaces.isConnected && currentPlaces._refresh) currentPlaces._refresh();
  });

  /* ---------- draft-mode editor ---------- */
  function editor(code, st) {
    var opts = [['visited', 'Visited'], ['current', 'Currently here'], ['wishlist', 'Wishlist'], ['home', 'Home'], ['none', 'Undiscovered']];
    return h('div', { class: 'cp__edit' },
      h('h3', { text: 'Edit (this browser only)' }),
      h('div', { class: 'btn-row' }, opts.map(function (o) {
        return h('button', { class: 'btn' + (o[0] === st ? '' : ' btn--ghost'), type: 'button', 'aria-pressed': String(o[0] === st), onclick: function () {
          var e = edits(); e[code] = o[0];
          var inFile = (SITE.travel.countries || []).filter(function (x) { return x.code === code; })[0];
          if ((inFile ? inFile.status : 'none') === o[0]) delete e[code];
          saveEdits(e); counts = null; paint(); renderBelow(); renderAlbums(); openCountry(code, false);
        } }, o[1]);
      })),
      h('p', { text: 'Saved only in this browser. Use “Download travel.js” below the map and replace data/travel.js in your repository to publish it.' }));
  }

  function draftTools() {
    var e = edits(), n = Object.keys(e).length;
    return h('div', { class: 'cp__edit' },
      h('p', { text: n ? n + ' local change' + (n === 1 ? '' : 's') + ' not yet published.' : 'No local changes. Open a country and use the edit buttons.' }),
      h('div', { class: 'btn-row' },
        h('button', { class: 'btn', type: 'button', onclick: exportFile, disabled: n ? null : true }, 'Download travel.js'),
        h('button', { class: 'btn btn--ghost', type: 'button', disabled: n ? null : true, onclick: function () { if (confirm('Discard all local atlas changes in this browser?')) { saveEdits({}); counts = null; paint(); renderBelow(); renderAlbums(); } } }, 'Discard local changes')));
  }

  function exportFile() {
    var data = { countries: countries().map(function (c) { var o = Object.assign({}, c); delete o.fromPhotos; return o; }), trips: SITE.travel.trips || [] };
    var head = '/*\n * data/travel.js — exported from the atlas editor on ' + new Date().toISOString().slice(0, 10) + '.\n * Replace data/travel.js in your repository with this file to publish the changes.\n * Field guide: see README.md → "Updating the atlas".\n */\nwindow.SITE = window.SITE || {};\n\nSITE.travel = ';
    var blob = new Blob([head + JSON.stringify(data, null, 2) + ';\n'], { type: 'text/javascript' });
    var a = h('a', { href: URL.createObjectURL(blob), download: 'travel.js' });
    document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  }

  /* ---------- star dust over the map ---------- */
  function startDust(cv) {
    if (RJY.reducedMotion) return;
    var ctx = cv.getContext('2d'), pts = [], vis = false, raf = 0, dpr = Math.min(2, window.devicePixelRatio || 1);
    function size() { cv.width = mapEl.clientWidth * dpr; cv.height = mapEl.clientHeight * dpr; }
    size(); window.addEventListener('resize', size);
    for (var i = 0; i < 70; i++) pts.push({ x: Math.random(), y: Math.random(), r: Math.random() * 1.1 + 0.3, p: Math.random() * 6.28, s: 0.4 + Math.random() * 0.9 });
    function frame(t) {
      ctx.clearRect(0, 0, cv.width, cv.height);
      pts.forEach(function (q) {
        var a = 0.15 + 0.35 * (0.5 + 0.5 * Math.sin(t / 1000 * q.s + q.p));
        ctx.fillStyle = 'rgba(255, 236, 190,' + a.toFixed(3) + ')';
        ctx.beginPath(); ctx.arc(q.x * cv.width, q.y * cv.height, q.r * dpr, 0, 6.283); ctx.fill();
      });
      if (vis) raf = requestAnimationFrame(frame);
    }
    new IntersectionObserver(function (es) { vis = es[0].isIntersecting; cancelAnimationFrame(raf); if (vis) raf = requestAnimationFrame(frame); }).observe(mapEl);
  }

  /* ---------- Memories: the albums under the map ----------
     One album per country with photos (its cover, flag, name and counts). Selecting it opens the
     country's chapter, exactly like selecting the country on the map, and pointing at it lights the
     country up on the map. Photos without a country (data/gallery.js) make albums by category,
     opened at #memories/<album>. */
  var albumsEl = null, counts = null;
  function photosText(n) { return n + (n === 1 ? ' photo' : ' photos'); }
  function ratio(p) { return p && p.w && p.h ? p.w / p.h : 4 / 3; }
  function photosIn(c, P) {
    var n = P.photos.length;
    P.places.forEach(function (x) { n += x.photos.length; });
    (SITE.travel.trips || []).forEach(function (t) { if (t.country === c.code) n += (t.photos || []).length; });
    return n;
  }
  function photoCount(code) {
    if (!counts) {
      counts = {};
      countries().forEach(function (c) { counts[c.code] = photosIn(c, RJY.places.forCountry(c)); });
    }
    return counts[code] || 0;
  }
  function albumCover(c, P) {
    var all = [];
    P.places.forEach(function (x) { all = all.concat(x.photos); });
    all = all.concat(P.photos);
    if (has(c.cover)) return all.filter(function (x) { return x.src === c.cover; })[0] || { src: c.cover };
    return all[0] || null;
  }
  function otherAlbums() {
    var list = [], by = {};
    ((SITE.gallery && SITE.gallery.photos) || []).forEach(function (p) {
      if (!p || !has(p.src) || p.public === false || has(p.country)) return;   // a country's photos are in its chapter
      var title = has(p.category) ? p.category : 'Moments';
      var g = by[title];
      if (!g) { g = by[title] = { title: title, slug: RJY.places.slug(title), photos: [] }; list.push(g); }
      g.photos.push(p);
    });
    return list;
  }
  function lightOnMap(code, on) { if (paths[code]) paths[code].classList.toggle('is-linked', on); }
  function albumCard(o) {
    var meta = photosText(o.count) + (o.places ? ' · ' + o.places + (o.places === 1 ? ' place' : ' places') : '');
    var a = h('a', { class: 'album', href: o.href },
      h('span', { class: 'album__img' }, o.cover ? RJY.picture(o.cover, { sizes: (o.wide ? '(max-width: 520px) ' + Math.round(92 * Math.max(1, ratio(o.cover) / (16 / 9))) + 'vw, ' : '') + coverSizes(46, 240, 4 / 5, o.cover), alt: '' }) : null),
      h('span', { class: 'album__text' },
        h('span', { class: 'album__name' }, o.flag ? h('img', { class: 'album__flag', src: o.flag, alt: '', width: 24, height: 18 }) : null, o.name),
        h('span', { class: 'album__meta', text: meta })));
    if (o.code) ['mouseenter', 'focus'].forEach(function (ev) { a.addEventListener(ev, function () { lightOnMap(o.code, true); }); });
    if (o.code) ['mouseleave', 'blur'].forEach(function (ev) { a.addEventListener(ev, function () { lightOnMap(o.code, false); }); });
    return h('li', null, a);
  }
  function renderAlbums() {
    if (!albumsEl) return;
    var cards = [];
    countries().filter(function (c) { return LIT[c.status]; }).forEach(function (c) {
      var P = RJY.places.forCountry(c), n = photosIn(c, P);
      if (n) cards.push({ href: '#world/' + c.code, code: c.code, name: nameOf(c.code), flag: RJY.flagSrc(c.code), count: n, places: P.places.length, cover: albumCover(c, P) });
    });
    otherAlbums().forEach(function (g) {
      cards.push({ href: '#memories/' + g.slug, name: g.title, count: g.photos.length, cover: g.photos[0] });
    });
    // on phones an odd last album spans the row (site.css), so its cover is drawn wider
    if (cards.length % 2) cards[cards.length - 1].wide = true;
    // nothing changed (e.g. the photo folders were listed and held nothing new): keep the cards as they are
    var sig = JSON.stringify(cards.map(function (o) { return [o.href, o.count, o.places, o.cover && o.cover.src, o.wide]; }));
    if (sig === albumsEl._sig) return;
    albumsEl._sig = sig;
    cards = cards.map(albumCard);
    albumsEl.innerHTML = '';
    albumsEl.hidden = !cards.length;
    if (!cards.length) return;
    albumsEl.appendChild(h('div', { class: 'albums__head' },
      h('h3', { class: 'albums__title' }, h('span', { html: RJY.starIcon() }), 'Memories'),
      h('p', { class: 'albums__lede', text: 'The photos from each country live in its chapter. Choose one here or on the map.' })));
    albumsEl.appendChild(h('ul', { class: 'albums__grid', role: 'list' }, cards));
    balanceAlbums();
  }
  // As many albums to a row as fit (at least ~150 px each), spread so the rows come out even
  // (six albums: one row of six, or two of three — never five and one)
  function balanceAlbums() {
    var ul = albumsEl && albumsEl.querySelector('.albums__grid');
    if (!ul || !ul.clientWidth) return;
    var n = ul.children.length, gap = parseFloat(getComputedStyle(ul).columnGap) || 16;
    var fit = Math.max(1, Math.floor((ul.clientWidth + gap) / (150 + gap)));
    ul.style.setProperty('--cols', Math.ceil(n / Math.ceil(n / fit)));
  }
  var balanceTimer;
  window.addEventListener('resize', function () { clearTimeout(balanceTimer); balanceTimer = setTimeout(balanceAlbums, 150); });
  function openAlbum(slug) {
    var g = otherAlbums().filter(function (x) { return x.slug === slug; })[0];
    if (!g) { RJY.sheet.close(true); RJY.scrollTo(albumsEl); return; }
    RJY.sheet.open({
      kind: 'drawer',
      label: g.title,
      render: function (body) {
        body.appendChild(h('div', { class: 'cp has-cover cp--album' },
          h('figure', { class: 'cp__cover' }, RJY.picture(g.photos[0], { full: true, eager: true, sizes: '(max-width: 640px) 100vw, 640px', alt: '' })),
          h('p', { class: 'cp__status' }, h('span', { class: 'cp__status-star', html: RJY.starIcon() }), 'Memories'),
          h('h2', { class: 'cp__name', text: g.title }),
          h('p', { class: 'cp__head', text: photosText(g.photos.length) }),
          gallery(g.photos, g.title)));
      }
    });
  }
  RJY.renderAlbums = function (el) {
    albumsEl = el;
    renderAlbums();
    RJY.route.on('memories', openAlbum);
  };

  RJY.atlas = { open: function (code) { RJY.route.go('#world/' + code); } };
})();
