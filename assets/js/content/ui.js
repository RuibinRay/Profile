/*
 * ui.js — small shared helpers: element builder, draft placeholders, cross-links between
 * stars (journey ↔ projects ↔ countries ↔ skills), the sheet (side drawer / chapter overlay),
 * the lightbox and hash routing.
 */
(function () {
  'use strict';
  var RJY = window.RJY = window.RJY || {};
  var SITE = window.SITE || {};

  /* ---------- environment ---------- */
  var params = new URLSearchParams(location.search);
  RJY.draft = params.has('draft');
  RJY.reducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  RJY.finePointer = window.matchMedia && window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  /* ---------- element builder ---------- */
  function h(tag, attrs) {
    var el = document.createElement(tag);
    if (attrs) {
      for (var k in attrs) {
        var v = attrs[k];
        if (v == null || v === false) continue;
        if (k === 'class') el.className = v;
        else if (k === 'text') el.textContent = v;
        else if (k === 'html') el.innerHTML = v;
        else if (k.slice(0, 2) === 'on' && typeof v === 'function') el.addEventListener(k.slice(2), v);
        else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
        else el.setAttribute(k, v === true ? '' : v);
      }
    }
    for (var i = 2; i < arguments.length; i++) append(el, arguments[i]);
    return el;
  }
  function append(el, c) {
    if (c == null || c === false) return;
    if (Array.isArray(c)) { c.forEach(function (x) { append(el, x); }); return; }
    el.appendChild(typeof c === 'object' ? c : document.createTextNode(String(c)));
  }
  var SVGNS = 'http://www.w3.org/2000/svg';
  function s(tag, attrs) {
    var el = document.createElementNS(SVGNS, tag);
    if (attrs) for (var k in attrs) {
      if (attrs[k] == null) continue;
      if (k === 'text') el.textContent = attrs[k];
      else if (k.slice(0, 2) === 'on' && typeof attrs[k] === 'function') el.addEventListener(k.slice(2), attrs[k]);
      else el.setAttribute(k, attrs[k]);
    }
    for (var i = 2; i < arguments.length; i++) append(el, arguments[i]);
    return el;
  }
  RJY.h = h; RJY.s = s;

  RJY.has = function (v) { return Array.isArray(v) ? v.length > 0 : (v != null && String(v).trim() !== ''); };
  // Placeholder shown only in draft mode (?draft)
  RJY.ph = function (text) { return RJY.draft ? h('p', { class: 'ph', text: text }) : null; };

  RJY.starIcon = function (cls) {
    return '<svg class="' + (cls || '') + '" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 1.5l1.6 7.3 7.4 1.6-7.4 1.6L12 19.5l-1.6-7.5L3 10.4l7.4-1.6z"/></svg>';
  };
  /* ---------- images ----------
     Photos and certificates prepared in assets/media/ come in three sizes: name.webp (2048 px on the
     long side), name-1080.webp and name-480.webp. Other images (e.g. uploads to assets/photos/) are
     used as they are. RJY.picture builds an <img> that lets the browser pick the size it needs. */
  function sized(p) { return /^assets\/media\/.+\.webp$/.test((p && p.src) || ''); }
  RJY.img = {
    sized: sized,
    small: function (p) { return sized(p) ? p.src.replace(/\.webp$/, '-480.webp') : p.src; },
    mid: function (p) { return sized(p) ? p.src.replace(/\.webp$/, '-1080.webp') : p.src; },
    // each file's real width (the sizes are the long side, so a portrait photo's files are narrower)
    srcset: function (p) {
      if (!sized(p)) return null;
      var W = +p.w || 2048, L = Math.max(W, +p.h || 0);
      function wide(k) { return Math.round(W * Math.min(1, k / L)); }
      return RJY.img.small(p) + ' ' + wide(480) + 'w, ' + RJY.img.mid(p) + ' ' + wide(1080) + 'w, ' + p.src + ' ' + W + 'w';
    }
  };
  RJY.picture = function (p, o) {
    o = o || {};
    // loading, sizes and srcset go on before src: Chrome starts fetching as soon as src is set if it is not yet told to wait
    var img = h('img', {
      loading: o.eager ? null : 'lazy', decoding: 'async', class: o.cls || null,
      width: p.w || null, height: p.h || null, alt: o.alt != null ? o.alt : (p.alt || p.caption || ''),
      sizes: RJY.img.srcset(p) ? (o.sizes || '240px') : null, srcset: RJY.img.srcset(p), src: o.full ? RJY.img.mid(p) : RJY.img.small(p)
    });
    if (o.onerror) img.addEventListener('error', o.onerror);
    return img;
  };

  RJY.brushRule = function () {
    return '<svg class="brush-rule" viewBox="0 0 360 10" preserveAspectRatio="none" aria-hidden="true"><path d="M2 6.5C40 3 78 7.6 120 5.2S205 2.6 246 5.4 318 7.4 358 4" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/></svg>';
  };

  /* ---------- countries ---------- */
  var A3A2 = 'ABWAWAFGAFAGOAOAIAAIALAAXALBALANDADAREAEARGARARMAMASMASATAAQATFTFATGAGAUSAUAUTATAZEAZBDIBIBELBEBENBJBFABFBGDBDBGRBGBHRBHBHSBSBIHBABLMBLBLRBYBLZBZBMUBMBOLBOBRABRBRBBBBRNBNBTNBTBWABWCAFCFCANCACHECHCHLCLCHNCNCIVCICMRCMCODCDCOGCGCOKCKCOLCOCOMKMCPVCVCRICRCUBCUCUWCWCYMKYCYPCYCZECZDEUDEDJIDJDMADMDNKDKDOMDODZADZECUECEGYEGERIERESHEHESPESESTEEETHETFINFIFJIFJFLKFKFRAFRFROFOFSMFMGABGAGBRGBGEOGEGGYGGGHAGHGINGNGMBGMGNBGWGNQGQGRCGRGRDGDGRLGLGTMGTGUMGUGUYGYHKGHKHMDHMHNDHNHRVHRHTIHTHUNHUIDNIDIMNIMINDINIOTIOIRLIEIRNIRIRQIQISLISISRILITAITJAMJMJEYJEJORJOJPNJPKAZKZKENKEKGZKGKHMKHKIRKIKNAKNKORKRKWTKWLAOLALBNLBLBRLRLBYLYLCALCLIELILKALKLSOLSLTULTLUXLULVALVMACMOMAFMFMARMAMCOMCMDAMDMDGMGMDVMVMEXMXMHLMHMKDMKMLIMLMLTMTMMRMMMNEMEMNGMNMNPMPMOZMZMRTMRMSRMSMUSMUMWIMWMYSMYNAMNANCLNCNERNENFKNFNGANGNICNINIUNUNLDNLNORNONPLNPNRUNRNZLNZOMNOMPAKPKPANPAPCNPNPERPEPHLPHPLWPWPNGPGPOLPLPRIPRPRKKPPRTPTPRYPYPSEPSPYFPFQATQAROURORUSRURWARWSAUSASDNSDSENSNSGPSGSGSGSSHNSHSLBSBSLESLSLVSVSMRSMSOMSOSPMPMSRBRSSSDSSSTPSTSURSRSVKSKSVNSISWESESWZSZSXMSXSYCSCSYRSYTCATCTCDTDTGOTGTHATHTJKTJTKMTMTLSTLTONTOTTOTTTUNTNTURTRTWNTWTZATZUGAUGUKRUAURYUYUSAUSUZBUZVATVAVCTVCVENVEVGBVGVIRVIVNMVNVUTVUWLFWFWSMWSXKXXKYEMYEZAFZAZMBZMZWEZW';
  var a3toA2 = {};
  for (var i = 0; i < A3A2.length; i += 5) a3toA2[A3A2.substr(i, 3)] = A3A2.substr(i + 3, 2);
  RJY.allCountryCodes = Object.keys(a3toA2);
  var regionNames = null;
  try { regionNames = new Intl.DisplayNames(['en'], { type: 'region' }); } catch (e) { regionNames = null; }
  var NAME_FIX = { USA: 'United States', GBR: 'United Kingdom', KOR: 'South Korea', PRK: 'North Korea', RUS: 'Russia', CZE: 'Czechia' };
  RJY.countryA2 = function (a3) { return a3toA2[a3] || ''; };
  RJY.countryName = function (a3, fallback) {
    if (NAME_FIX[a3]) return NAME_FIX[a3];
    var a2 = a3toA2[a3];
    if (a2 && regionNames) { try { var n = regionNames.of(a2); if (n && n !== a2) return n; } catch (e) {} }
    return fallback || a3;
  };
  RJY.flagSrc = function (a3) { var a2 = a3toA2[a3]; return a2 ? 'assets/flags/' + a2.toLowerCase() + '.svg' : ''; };

  /* ---------- cross-links ("connected stars") ---------- */
  function find(list, id) { for (var i = 0; i < (list || []).length; i++) if (list[i].id === id) return list[i]; return null; }
  RJY.findJourney = function (id) { return find(SITE.journey, id); };
  RJY.findWork = function (id) { return find(SITE.work, id); };
  RJY.findSkill = function (id) { return find(SITE.palette, id); };
  RJY.findCountry = function (code) {
    var c = (SITE.travel && SITE.travel.countries) || [];
    for (var i = 0; i < c.length; i++) if (c[i].code === code) return c[i];
    return null;
  };

  RJY.resolve = function (ref) {
    var p = String(ref).split(':'), t = p[0], id = p.slice(1).join(':'), item;
    if (t === 'j' && (item = RJY.findJourney(id))) return { type: 'j', id: id, label: item.short || item.title, title: item.title, href: '#experience/' + id };
    if (t === 'w' && (item = RJY.findWork(id))) return { type: 'w', id: id, label: item.short || item.title, title: item.title, href: '#projects/' + id };
    if (t === 's' && (item = RJY.findSkill(id))) return { type: 's', id: id, label: item.name, href: '#skills/' + id };
    if (t === 'c') return { type: 'c', id: id, label: RJY.countryName(id), href: '#world/' + id };
    return null;
  };

  // Build a row of connected-star links. Navigation happens through the hash router.
  RJY.connections = function (refs, title) {
    var items = (refs || []).map(RJY.resolve).filter(Boolean);
    if (!items.length) return null;
    return h('div', { class: 'connected' },
      h('p', { class: 'links-head', text: title || 'Connected stars' }),
      h('div', { class: 'connect' }, items.map(function (r) {
        return h('a', { href: r.href, title: r.title || null }, h('i', { class: 't-' + r.type }), r.label);
      }))
    );
  };

  /* ---------- scroll lock ---------- */
  var lockCount = 0;
  RJY.lockScroll = function (on) {
    lockCount = Math.max(0, lockCount + (on ? 1 : -1));
    document.documentElement.classList.toggle('is-locked', lockCount > 0);
  };

  /* ---------- sheet: country drawer or full chapter ---------- */
  var sheet = null, lastFocus = null, onCloseCb = null;
  function focusables(root) {
    return Array.prototype.filter.call(root.querySelectorAll('a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])'), function (el) { return el.offsetParent !== null || el === document.activeElement; });
  }
  RJY.sheet = {
    open: function (opts) {
      sheet = sheet || document.getElementById('sheet');
      var panel = sheet.querySelector('.sheet__panel'), body = sheet.querySelector('.sheet__body');
      var wasOpen = sheet.classList.contains('is-open');
      if (wasOpen && onCloseCb) { var cb = onCloseCb; onCloseCb = null; cb('replaced'); }
      body.innerHTML = '';
      opts.render(body);
      sheet.classList.toggle('sheet--chapter', opts.kind === 'chapter');
      var title = body.querySelector('h2, h1');
      if (title) { title.id = 'sheet-title'; }
      panel.setAttribute('aria-label', opts.label || (title ? title.textContent : 'Details'));
      if (!wasOpen) { lastFocus = document.activeElement; RJY.lockScroll(true); }
      sheet.inert = false; sheet.removeAttribute('inert');
      sheet.classList.add('is-open');
      panel.scrollTop = 0;
      onCloseCb = opts.onClose || null;
      setTimeout(function () { panel.focus({ preventScroll: true }); }, 30);
    },
    close: function (silent) {
      if (!sheet || !sheet.classList.contains('is-open')) return;
      sheet.classList.remove('is-open');
      sheet.inert = true; sheet.setAttribute('inert', '');
      RJY.lockScroll(false);
      var cb = onCloseCb; onCloseCb = null;
      if (cb) cb('closed');
      if (lastFocus && lastFocus.focus) { try { lastFocus.focus({ preventScroll: true }); } catch (e) {} }
    },
    isOpen: function () { return !!(sheet && sheet.classList.contains('is-open')); }
  };
  document.addEventListener('click', function (e) {
    if (e.target.closest && e.target.closest('#sheet [data-close]')) { e.preventDefault(); RJY.route.closeDetail(); }
  });
  document.addEventListener('keydown', function (e) {
    if (!RJY.sheet.isOpen()) return;
    var lbox = document.getElementById('lightbox');
    if (lbox && !lbox.hidden) return;   // the photo viewer handles its own keys
    if (e.key === 'Escape') { e.preventDefault(); RJY.route.closeDetail(); return; }
    if (e.key === 'Tab') {
      var panel = sheet.querySelector('.sheet__panel'), f = focusables(panel);
      if (!f.length) return;
      var first = f[0], last = f[f.length - 1];
      if (e.shiftKey && (document.activeElement === first || document.activeElement === panel)) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });

  /* ---------- lightbox ---------- */
  // Photo viewer. Pass a list to move through it with the arrows (← → keys, or swipe on a phone).
  RJY.lightbox = function (photo, list, index) {
    var lb = document.getElementById('lightbox');
    list = list && list.length ? list : [photo];
    var i = Math.max(0, index != null ? index : list.indexOf(photo));
    var prevFocus = document.activeElement, sx = null;
    var close = function () { lb.hidden = true; lb.innerHTML = ''; document.removeEventListener('keydown', onKey); RJY.lockScroll(false); if (prevFocus && prevFocus.focus) prevFocus.focus(); };
    // how wide the photo will be drawn: the screen's width, or less when its height (80vh) is the limit
    function sizesFor(q) {
      var r = q.w && q.h ? q.w / q.h : 0, byH = r ? ', calc(80vh * ' + r.toFixed(3) + ')' : '';
      return '(max-width: 700px) min(100vw' + byH + '), min(90vw, 1600px' + byH + ')';
    }
    function warm(q) {   // fetch a neighbour ahead of time, at the size this screen will use
      if (!q || !RJY.img.sized(q)) return;
      var w = new Image(); w.sizes = sizesFor(q); w.srcset = RJY.img.srcset(q); w.src = RJY.img.mid(q);
    }
    var show = function (k) {
      i = (k + list.length) % list.length;
      var p = list[i];
      img.classList.add('is-loading');
      img.removeAttribute('srcset');
      if (p.w && p.h) { img.width = p.w; img.height = p.h; } else { img.removeAttribute('width'); img.removeAttribute('height'); }
      if (RJY.img.sized(p)) { img.sizes = sizesFor(p); img.srcset = RJY.img.srcset(p); img.src = RJY.img.mid(p); } else { img.removeAttribute('sizes'); img.src = p.src; }
      img.alt = p.alt || p.caption || (p.place ? 'Photo from ' + p.place : 'Photo');
      cap.innerHTML = '';
      var line = [p.caption, p.place, p.date ? (/^\d{4}-\d{2}/.test(p.date) ? RJY.monthYear(p.date) : p.date) : ''].filter(RJY.has).join(' — ');
      if (line) cap.appendChild(document.createTextNode(line));
      if (p.link && p.link.href) { cap.appendChild(document.createTextNode(' ')); cap.appendChild(h('a', { class: 'link', href: p.link.href, target: '_blank', rel: 'noopener', text: p.link.label || 'Open' })); }
      if (RJY.has(p.story)) cap.appendChild(h('p', { text: p.story }));
      count.textContent = list.length > 1 ? (i + 1) + ' / ' + list.length : '';
      if (list.length > 1) { warm(list[(i + 1) % list.length]); warm(list[(i - 1 + list.length) % list.length]); }
    };
    var onKey = function (e) {
      if (e.key === 'Tab') {   // keep focus inside the viewer
        var f = lb.querySelectorAll('button, a[href]'); if (!f.length) return;
        var first = f[0], last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
        else if (!lb.contains(document.activeElement)) { e.preventDefault(); first.focus(); }
        return;
      }
      if (e.key === 'Escape') { e.stopPropagation(); close(); }
      else if (e.key === 'ArrowRight' && list.length > 1) show(i + 1);
      else if (e.key === 'ArrowLeft' && list.length > 1) show(i - 1);
    };
    lb.innerHTML = '';
    var img = h('img', { alt: '', decoding: 'async' }), cap = h('figcaption'), count = h('span', { class: 'lightbox__count', 'aria-live': 'polite' });
    img.addEventListener('load', function () { img.classList.remove('is-loading'); });
    img.addEventListener('error', function () { img.classList.remove('is-loading'); });
    lb.appendChild(h('figure', null, img, cap));
    var icon = function (d) { return '<svg viewBox="0 0 14 14" aria-hidden="true"><path d="' + d + '" stroke="currentColor" stroke-width="1.4" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>'; };
    var btn = h('button', { class: 'sheet__close', type: 'button', 'aria-label': 'Close photo', onclick: close, html: icon('M1 1l12 12M13 1L1 13') });
    lb.appendChild(btn);
    if (list.length > 1) {
      lb.appendChild(h('button', { class: 'lightbox__nav lightbox__nav--prev', type: 'button', 'aria-label': 'Previous photo', onclick: function () { show(i - 1); }, html: icon('M9 2L4 7l5 5') }));
      lb.appendChild(h('button', { class: 'lightbox__nav lightbox__nav--next', type: 'button', 'aria-label': 'Next photo', onclick: function () { show(i + 1); }, html: icon('M5 2l5 5-5 5') }));
      lb.appendChild(count);
    }
    // swipe between photos (set as properties so reopening the viewer replaces them)
    lb.ontouchstart = list.length > 1 ? function (e) { sx = e.touches[0].clientX; } : null;
    lb.ontouchend = list.length > 1 ? function (e) { if (sx == null) return; var dx = e.changedTouches[0].clientX - sx; sx = null; if (Math.abs(dx) > 50) show(i + (dx < 0 ? 1 : -1)); } : null;
    lb.onclick = function (e) { if (e.target === lb) close(); };
    show(i);
    lb.hidden = false;
    RJY.lockScroll(true);
    document.addEventListener('keydown', onKey);
    btn.focus();
  };

  /* ---------- hash routing for detail views ---------- */
  // #projects/<id> opens a case study, #world/<CODE> a country, #experience/<id> a journey entry,
  // #skills/<id> highlights a palette colour. Plain section hashes just scroll.
  var handlers = {};
  var pushed = 0;      // detail views we added to the history stack
  RJY.route = {
    on: function (section, fn) { handlers[section] = fn; },
    parse: function (hash) {
      var m = /^#([a-z]+)\/(.+)$/.exec(hash || '');
      return m ? { section: m[1], id: decodeURIComponent(m[2]) } : null;
    },
    go: function (hash) {
      if (location.hash === hash) { RJY.route.handle(); return; }
      var from = RJY.route.parse(location.hash);
      // moving from one detail to another replaces the entry, so Back returns to the page
      if (from && RJY.sheet.isOpen()) history.replaceState({ rjy: Math.max(1, pushed) }, '', hash);
      else { pushed++; history.pushState({ rjy: pushed }, '', hash); }
      RJY.route.handle();
    },
    handle: function () {
      var r = RJY.route.parse(location.hash);
      if (!r) { if (RJY.sheet.isOpen()) RJY.sheet.close(true); return; }
      var fn = handlers[r.section];
      if (fn) fn(r.id);
    },
    // how many detail views (or full views) deep the visitor is; 0 on a page opened straight from a link
    depth: function () { return pushed; },
    // Close the current detail view and step the address back to its section.
    closeDetail: function () {
      var r = RJY.route.parse(location.hash);
      if (r && pushed > 0) { history.back(); return; }   // popstate closes the sheet
      RJY.sheet.close(true);
      if (r) history.replaceState(null, '', '#' + r.section);
    }
  };
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[href^="#"]');
    if (!a || e.metaKey || e.ctrlKey || e.shiftKey) return;
    var href = a.getAttribute('href');
    if (RJY.route.parse(href)) { e.preventDefault(); RJY.route.go(href); }
  });
  window.addEventListener('popstate', function (e) {
    pushed = (e.state && typeof e.state.rjy === 'number') ? e.state.rjy : 0;
    RJY.route.handle();
  });

  /* ---------- jump without the page's smooth scrolling ---------- */
  // Turning scroll-behavior off inline is not enough on its own: the browser may still use the
  // smooth value it had already computed, so apply the style first and ask for an instant scroll.
  RJY.scrollNow = function (y) {
    var root = document.documentElement;
    root.style.scrollBehavior = 'auto';
    void root.offsetHeight;
    try { window.scrollTo({ top: y, left: 0, behavior: 'instant' }); } catch (e) { window.scrollTo(0, y); }
    root.style.scrollBehavior = '';
  };

  /* ---------- smooth scroll that respects reduced motion ---------- */
  RJY.scrollTo = function (el, opts) {
    if (!el) return;
    var top = el.getBoundingClientRect().top + window.pageYOffset - (opts && opts.offset != null ? opts.offset : 64);
    if (opts && opts.instant) { RJY.scrollNow(Math.max(0, top)); return; }
    window.scrollTo({ top: Math.max(0, top), behavior: RJY.reducedMotion ? 'auto' : 'smooth' });
  };

  /* ---------- formatting ---------- */
  RJY.monthYear = function (ym) {
    if (!ym) return '';
    var p = String(ym).split('-');
    if (p.length < 2) return p[0];
    var m = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][parseInt(p[1], 10) - 1];
    return m + ' ' + p[0];
  };
  RJY.esc = function (str) { return String(str).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
})();
