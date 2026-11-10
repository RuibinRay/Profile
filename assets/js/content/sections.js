/*
 * sections.js — About, education, palette (skills), languages, credentials, contact, footer.
 * All text comes from /data/*.js.
 */
(function () {
  'use strict';
  var RJY = window.RJY, SITE = window.SITE, h = RJY.h, has = RJY.has;

  /* ---------------- About ---------------- */
  // Small flags for "At a Glance" (decorative: the text already names the country).
  function starPts(cx, cy, R, rot) {
    var p = [];
    for (var i = 0; i < 10; i++) {
      var r = i % 2 ? R * 0.382 : R, a = rot + i * Math.PI / 5;
      p.push((cx + r * Math.sin(a)).toFixed(2) + ',' + (cy - r * Math.cos(a)).toFixed(2));
    }
    return p.join(' ');
  }
  var FLAGS = {
    CRI: function () { return '<svg viewBox="0 0 30 18"><rect width="30" height="18" fill="#002b7f"/><rect y="3" width="30" height="12" fill="#fff"/><rect y="6" width="30" height="6" fill="#ce1126"/></svg>'; },
    CHN: function () {
      var small = [[10, 2], [12, 4], [12, 7], [10, 9]].map(function (c) {
        return '<polygon fill="#ffde00" points="' + starPts(c[0], c[1], 1, Math.atan2(5 - c[0], -(5 - c[1]))) + '"/>';
      }).join('');
      return '<svg viewBox="0 0 30 20"><rect width="30" height="20" fill="#ee1c25"/><polygon fill="#ffde00" points="' + starPts(5, 5, 3, 0) + '"/>' + small + '</svg>';
    },
    USA: function () {
      var st = '', i, j;
      for (i = 0; i < 13; i += 2) st += '<rect y="' + (i * 20 / 13).toFixed(2) + '" width="38" height="' + (20 / 13).toFixed(2) + '" fill="#b22234"/>';
      var dots = '';
      for (j = 0; j < 9; j++) for (i = 0; i < (j % 2 ? 5 : 6); i++) dots += '<circle cx="' + (1.3 + i * 2.5 + (j % 2 ? 1.25 : 0)).toFixed(2) + '" cy="' + (1.1 + j * 1.07).toFixed(2) + '" r=".42" fill="#fff"/>';
      return '<svg viewBox="0 0 38 20"><rect width="38" height="20" fill="#fff"/>' + st + '<rect width="15.2" height="10.77" fill="#3c3b6e"/>' + dots + '</svg>';
    }
  };
  function flag(code) { return FLAGS[code] ? h('span', { class: 'flag', 'aria-hidden': 'true', html: FLAGS[code]() }) : null; }
  // text with any Chinese wrapped so it gets a Chinese font and is read in Chinese
  function withScripts(text) {
    return String(text).split(/([\u3400-\u9fff\uf900-\ufaff]+)/).filter(has).map(function (part) {
      return /[\u3400-\u9fff\uf900-\ufaff]/.test(part) ? h('span', { class: 'zh', lang: 'zh', text: part }) : document.createTextNode(part);
    });
  }

  RJY.renderAbout = function (root) {
    var A = SITE.about;
    var head = root.closest('section') && root.closest('section').querySelector('.sec__head');
    if (head && has(A.tagline) && !head.querySelector('.about__tagline')) head.appendChild(h('p', { class: 'about__tagline', text: A.tagline }));

    root.appendChild(h('div', { class: 'about__intro reveal' }, (A.intro || []).filter(has).map(function (t, i) {
      return h('p', { class: i ? 'about__more' : 'about__lead', text: t });
    })));

    var chapters = h('div', { class: 'about__chapters' }, (A.chapters || []).map(function (c, i) {
      var parts = [h('h3', { class: 'about__h' }, h('span', { class: 'about__no', 'aria-hidden': 'true', text: (i < 9 ? '0' : '') + (i + 1) }), c.title)];
      (c.text || []).filter(has).forEach(function (t) { parts.push(h('p', { text: t })); });
      if (has(c.list)) {
        parts.push(h('ul', { class: 'drives' }, c.list.map(function (it, k) {
          return h('li', null,
            h('span', { class: 'drives__dab', 'aria-hidden': 'true', html: RJY.brush(54, 20, { pigment: it.pigment, seed: k * 4.3 + 2, dir: 'h', dry: 0.24, inset: { across: 1.5, start: 2, end: 1 } }) }),
            h('span', { class: 'drives__t', text: it.title }),
            has(it.text) ? h('span', { class: 'drives__d', text: it.text }) : null);
        })));
      }
      (c.after || []).filter(has).forEach(function (t) { parts.push(h('p', { text: t })); });
      if (has(c.closing)) parts.push(h('p', { class: 'about__closing' }, h('span', { class: 'about__closing-star', 'aria-hidden': 'true', html: RJY.starIcon ? RJY.starIcon() : '' }), c.closing));
      return h('div', { class: 'about__ch reveal' }, parts);
    }));

    var photo = has(A.photo && A.photo.src)
      ? h('figure', { class: 'about__photo' }, h('img', { src: A.photo.src, alt: A.photo.alt || 'Portrait of Ray', loading: 'lazy' }))
      : RJY.ph('a portrait or travel photo — about.photo in data/site.js');
    // the résumé, to download, at the foot of the card (links.resume in data/site.js)
    var cvUrl = SITE.links && SITE.links.resume, cvName = has(cvUrl) ? String(cvUrl).split('/').pop() : '';
    var cv = has(cvUrl)
      ? h('a', { class: 'glance__cv', href: cvUrl, download: cvName, type: /\.pdf$/i.test(cvName) ? 'application/pdf' : null },
          h('span', { class: 'glance__cv-icon', 'aria-hidden': 'true', html: '<svg viewBox="0 0 16 16"><path d="M8 2v8.2M4.4 6.9 8 10.5l3.6-3.6M3 13.5h10" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>' }),
          h('span', { class: 'glance__cv-text' }, h('b', { text: 'Download my résumé' }), has(SITE.links.resumeNote) ? h('small', { text: SITE.links.resumeNote }) : null))
      : RJY.ph('your résumé — put the PDF in assets/docs/ and set links.resume in data/site.js');
    var glance = h('div', { class: 'glance reveal', role: 'group', 'aria-labelledby': 'glance-title' },
      photo,
      h('h3', { class: 'glance__title', id: 'glance-title', text: 'At a Glance' }),
      h('dl', null, (A.glance || []).filter(function (g) { return has(g.value); }).map(function (g) {
        return h('div', null, h('dt', { text: g.label }), h('dd', null, withScripts(g.value), (g.flags || []).map(flag)));
      })),
      cv);

    root.appendChild(h('div', { class: 'about__body' }, chapters, glance));
    // the card stays in view while the chapters scroll only when all of it fits on the screen
    function fitGlance() { glance.classList.toggle('is-tall', glance.offsetHeight + 110 > window.innerHeight); }
    requestAnimationFrame(fitGlance);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(fitGlance);
    var ft; window.addEventListener('resize', function () { clearTimeout(ft); ft = setTimeout(fitGlance, 150); });
  };

  RJY.renderEducation = function (root) {
    SITE.education.forEach(function (e) {
      root.appendChild(h('div', { class: 'edu__item' },
        h('p', { class: 'edu__when', text: e.when }),
        h('h3', { text: e.school }),
        h('p', { text: e.degree }),
        h('p', { text: e.place }),
        e.notes.map(function (n) { return h('p', { class: 'gold', text: n }); })
      ));
    });
    var award = SITE.awards[0];
    if (award) {
      root.appendChild(h('div', { class: 'edu__item' },
        h('p', { class: 'edu__when', text: award.year }),
        h('h3', { text: award.title }),
        h('p', { text: award.text }),
        has(award.evidence) ? h('p', null, h('a', { class: 'link', href: award.evidence, target: '_blank', rel: 'noopener', text: 'See the announcement' })) : RJY.ph('link to the certificate or announcement — awards[0].evidence')
      ));
    }
  };

  RJY.renderOffclock = function (root) {
    root.appendChild(h('h3', { text: 'Off the clock' }));
    SITE.about.offTheClock.forEach(function (x) { root.appendChild(h('span', { text: x })); });
  };

  /* ---------------- Palette ---------------- */
  /* My Palette: one band of paint per skill. Pointing at a band (wide screens), focusing it from the
     keyboard, or clicking / tapping it opens it: the band widens and the skill, its tools and where it
     shows appear beside the paint; the other colours dim. Each stroke is painted at the size it is
     shown (brush.js), so nothing is stretched or cut off. Everything stays in the page for screen
     readers; only the view changes. */
  var GROW = 4.6;   // an open band's share of the width against 1 for each of the others (as in the CSS)
  RJY.renderPalette = function (root) {
    var list = h('ul', { class: 'pal reveal', role: 'list' });
    var items = SITE.palette.map(function (g) {
      var tools = has(g.tools) ? h('ul', { class: 'pal__tools', 'aria-label': 'Tools' }, g.tools.map(function (t) { return h('li', { text: t }); })) : null;
      var paint = h('div', { class: 'pal__paint', 'aria-hidden': 'true' });
      var inner = h('div', { class: 'pal__in' },
        h('h3', { class: 'pal__name', id: 'skill-' + g.id + '-name', text: g.name }),
        h('p', { class: 'pal__text', text: g.text }),
        tools,
        RJY.connections(g.seenIn, 'Where it shows'));
      var el = h('li', { class: 'pal__item', id: 'skill-' + g.id, tabindex: '0', 'aria-labelledby': 'skill-' + g.id + '-name' },
        paint,
        h('span', { class: 'pal__label', 'aria-hidden': 'true', text: g.name }),
        h('div', { class: 'pal__more' }, inner));
      var c = RJY.PIGMENTS[g.pigment] || RJY.PIGMENTS.gold;
      el.style.setProperty('--pig', c[0]); el.style.setProperty('--pig-light', c[1]); el.style.setProperty('--pig-deep', c[2]);
      el._paint = paint; el._in = inner; el._g = g;
      // pointing (wide screens) and keyboard focus show a colour while they last
      el.addEventListener('pointerenter', function (e) { if (e.pointerType !== 'touch' && wide.matches) mark('is-hover', 'has-hover', el); });
      el.addEventListener('pointerleave', function () { if (el.classList.contains('is-hover')) mark('is-hover', 'has-hover', null); });
      el.addEventListener('focusin', function (e) { mark('is-kbd', 'has-kbd', keyboardFocus(e.target) ? el : null); });
      el.addEventListener('focusout', function (e) { if (!el.contains(e.relatedTarget) && el.classList.contains('is-kbd')) mark('is-kbd', 'has-kbd', null); });
      // a tap (or click, or Enter) keeps a colour open; the links inside work as usual
      el.addEventListener('click', function (e) { if (e.target.closest('a')) return; toggle(el); });
      el.addEventListener('keydown', function (e) { if ((e.key === 'Enter' || e.key === ' ') && e.target === el) { e.preventDefault(); toggle(el); } });
      list.appendChild(el);
      return el;
    });
    // The state lives in classes (hover, then keyboard, then kept open — see the CSS), which every
    // browser updates reliably, rather than in :has() selectors.
    var wide = window.matchMedia ? window.matchMedia('(min-width: 900px)') : { matches: true };
    function keyboardFocus(t) { try { return t.matches(':focus-visible'); } catch (err) { return true; } }
    function mark(cls, flag, el) {
      items.forEach(function (x) { x.classList.toggle(cls, x === el); });
      list.classList.toggle(flag, !!el);
    }
    function toggle(el, open) {
      var on = open == null ? !el.classList.contains('is-open') : open;
      mark('is-open', 'has-open', on ? el : null);
    }
    list._open = function (el) { toggle(el, true); };
    var hint = h('p', { class: 'pal__hint' });
    function hintText() {
      hint.textContent = (!RJY.finePointer ? 'Tap' : wide.matches ? 'Point at' : 'Click') + ' a colour to see the skill behind it.';
    }
    hintText();
    root.appendChild(hint);
    root.appendChild(list);

    // Sizes: a closed band, an open band, and the height the tallest description needs (so no text is
    // ever cut off). The details of an open colour are laid out at their final width, beside the paint.
    var painted = '', pt = 0;
    function measure() {
      var desk = wide.matches, n = items.length, W = list.clientWidth;
      if (!W) return;
      if (desk) {
        var gap = parseFloat(getComputedStyle(list).columnGap) || 0, free = W - gap * (n - 1);
        var idle = Math.floor(free / n), open = Math.floor(free * GROW / (GROW + n - 1));
        list.style.setProperty('--pal-idle', idle + 'px');
        list.style.setProperty('--pal-open', open + 'px');
        var need = 0;
        items.forEach(function (el) { need = Math.max(need, el._in.offsetHeight); });
        list.style.setProperty('--pal-need', Math.ceil(need + 56) + 'px');
      }
      clearTimeout(pt); pt = setTimeout(paintAll, painted ? 160 : 0);
    }
    function paintAll() {
      var desk = wide.matches, W = list.clientWidth;
      var size = desk ? [parseInt(list.style.getPropertyValue('--pal-idle'), 10) || 100, list.clientHeight] : [W, 64];
      var key = (desk ? 'd' : 'm') + size.join('x');
      if (!W || key === painted) return;
      painted = key;
      items.forEach(function (el, i) {
        el._paint.innerHTML = RJY.brush(size[0], size[1], { pigment: el._g.pigment, seed: i * 3.7 + 1, dir: desk ? 'v' : 'h' });
      });
    }
    measure();
    if ('ResizeObserver' in window) new ResizeObserver(measure).observe(list); else window.addEventListener('resize', measure);
    if (wide.addEventListener) wide.addEventListener('change', function () { hintText(); measure(); });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(measure);
  };

  RJY.flashSkill = function (id) {
    var el = document.getElementById('skill-' + id);
    if (!el) return;
    var list = el.closest('.pal');
    if (list && list._open) list._open(el);
    RJY.scrollTo(list || el, { offset: 120 });
    el.classList.remove('is-flash'); void el.offsetWidth; el.classList.add('is-flash');
  };

  RJY.renderPaletteAux = function (root) {
    var P = SITE.profile;
    root.appendChild(h('div', { class: 'langs-wrap reveal' },
      h('h3', { text: 'Languages' }),
      h('ul', { class: 'langs' }, P.languages.map(function (l) {
        var zh = /[\u3400-\u9fff]/.test(l.native), es = l.native === 'Español';
        return h('li', null,
          h('span', { class: 'native' + (zh ? ' zh' : ''), lang: zh ? 'zh' : (es ? 'es' : 'en'), text: l.native }),
          h('span', { class: 'langs__about' },
            l.native !== l.name ? h('span', { class: 'en', text: l.name }) : null,
            has(l.level) ? h('span', { class: 'level', text: l.level }) : null,
            has(l.note) ? h('span', { class: 'note', text: l.note }) : null));
      }))
    ));
    root.appendChild(h('div', { class: 'creds reveal' },
      h('h3', { text: 'Tools I use' }),
      h('div', { class: 'tools-all' }, SITE.tools.map(function (g) { return h('p', { style: { margin: 0 } }, h('b', { text: g.group }), g.items.join(', ')); }))
    ));
  };

  /* Certificates: each one as an image (click to see it full size, with a link to verify it where
     there is one), filtered by kind. Certificates without an image are listed in text below. */
  RJY.renderCertificates = function (root) {
    var all = (SITE.certifications || []).filter(function (c) { return has(c.title); });
    var withImg = all.filter(function (c) { return has(c.img); }), textOnly = all.filter(function (c) { return !has(c.img); });
    var state = 'all';
    var groups = [];
    withImg.forEach(function (c) { if (has(c.group) && groups.indexOf(c.group) === -1) groups.push(c.group); });
    function asPhoto(c) {
      return { src: c.img, w: c.w, h: c.h, alt: 'Certificate: ' + c.title + ', ' + c.issuer, caption: c.title, place: c.issuer, date: c.date,
        link: has(c.url) ? { href: c.url, label: 'Verify' } : null };
    }
    var grid = h('ul', { class: 'certs__grid', role: 'list' }, withImg.map(function (c, i) {
      var li = h('li', { class: 'cert', 'data-group': c.group || '' },
        h('button', { type: 'button', class: 'cert__img', 'aria-label': 'View the certificate: ' + c.title, onclick: function () {
          var shown = withImg.filter(function (x) { return state === 'all' || x.group === state; });
          RJY.lightbox(asPhoto(c), shown.map(asPhoto), shown.indexOf(c));
        } }, RJY.picture({ src: c.img, w: c.w, h: c.h }, { sizes: '(max-width: 640px) 92vw, 300px', alt: '' })),
        h('div', { class: 'cert__meta' },
          h('p', { class: 'cert__title', text: c.title }),
          h('p', { class: 'cert__by', text: [c.issuer, c.date].filter(has).join(' · ') }),
          has(c.url) ? h('a', { class: 'cert__verify', href: c.url, target: '_blank', rel: 'noopener', 'aria-label': 'Verify ' + c.title + ' (opens in a new tab)', text: 'Verify' }) : null));
      return li;
    }));
    var chips = groups.length > 1 ? h('div', { class: 'filters', role: 'group', 'aria-label': 'Filter certificates' },
      [['all', 'All']].concat(groups.map(function (g) { return [g, g]; })).map(function (pair) {
        return h('button', { class: 'chip', type: 'button', 'data-value': pair[0], 'aria-pressed': String(pair[0] === 'all'), text: pair[1], onclick: function () {
          state = pair[0];
          chips.querySelectorAll('.chip').forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.value === state)); });
          grid.querySelectorAll('.cert').forEach(function (li) { li.hidden = !(state === 'all' || li.dataset.group === state); });
        } });
      })) : null;
    root.appendChild(h('div', { class: 'certs__head' },
      h('h3', { text: 'Certificates' }),
      h('span', { class: 'muted', text: all.length + ' in all' })));
    if (chips) root.appendChild(chips);
    root.appendChild(grid);
    if (textOnly.length) {
      root.appendChild(h('div', { class: 'certs__also' },
        h('h4', { text: 'Also completed' }),
        h('ul', { role: 'list' }, textOnly.map(function (c) {
          var t = has(c.url) ? h('a', { class: 'link', href: c.url, target: '_blank', rel: 'noopener', text: c.title }) : h('span', { class: 't', text: c.title });
          return h('li', null, t, h('span', { class: 'i', text: [c.issuer, c.date].filter(has).join(' · ') }));
        }))));
    }
  };

  RJY.renderCourses = function (root) {
    root.appendChild(h('h3', { class: 'visually-hidden', text: 'Coursework' }));
    SITE.coursework.forEach(function (g) {
      root.appendChild(h('div', null, h('h4', { text: g.group + ' coursework' }), h('ul', null, g.courses.map(function (c) { return h('li', { text: c }); }))));
    });
  };

  /* ---------------- Contact ---------------- */
  // The page ends where it began: the full painting. Five painted stars are the social links, joined by
  // a gold constellation line (on narrow screens the same constellation is drawn under the text).
  // Email and phone numbers sit with the text.
  function firstSegment(url) {
    try { return decodeURIComponent(new URL(url).pathname.split('/').filter(Boolean)[0] || ''); } catch (e) { return ''; }
  }
  var NETWORKS = [
    // star: the painted star (index in RJY.Painting.LIGHTS) the link lives on, in constellation order
    { key: 'instagram', label: 'Instagram', star: 9, handle: function (u) { var s = firstSegment(u); return s ? '@' + s : ''; } },
    { key: 'x', label: 'X', star: 8, handle: function (u) { var s = firstSegment(u); return s ? '@' + s : ''; } },
    { key: 'facebook', label: 'Facebook', star: 5, handle: function (u) { return firstSegment(u); } },
    { key: 'github', label: 'GitHub', star: 7, handle: function (u) { var s = firstSegment(u); return s ? '@' + s : ''; } },
    { key: 'linkedin', label: 'LinkedIn', star: 10, handle: function () { return SITE.profile.legalName; } }
  ];

  // A vCard 3.0 file: name, email, phones, the website and the profiles shown on the page.
  function downloadCard(L, P, phones, items) {
    var esc = function (v) { return String(v).replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/([,;])/g, '\\$1'); };
    var parts = String(P.name || '').split(' '), family = parts.slice(1).join(' ');
    var given = String(P.legalName || P.name || '').replace(new RegExp('\\s*' + family.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$'), '') || parts[0];
    var lines = ['BEGIN:VCARD', 'VERSION:3.0', 'N:' + esc(family) + ';' + esc(given) + ';;;', 'FN:' + esc(P.name)];
    if (has(P.goesBy)) lines.push('NICKNAME:' + esc(P.goesBy));
    if (has(L.email)) lines.push('EMAIL;TYPE=INTERNET:' + L.email);
    phones.forEach(function (p) { lines.push('TEL;TYPE=CELL:' + p.number.replace(/[^\d+]/g, '')); });
    var site = (SITE.meta && SITE.meta.siteUrl) || location.href.split('#')[0];
    lines.push('URL:' + site);
    items.forEach(function (it) { lines.push('X-SOCIALPROFILE;TYPE=' + it.key + ':' + it.href); });
    lines.push('END:VCARD');
    var blob = new Blob([lines.join('\r\n') + '\r\n'], { type: 'text/vcard;charset=utf-8' });
    var a = h('a', { href: URL.createObjectURL(blob), download: String(P.name || 'contact').replace(/\s+/g, '-') + '.vcf' });
    document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1500);
  }

  RJY.renderContact = function (root) {
    var L = SITE.links, P = SITE.profile;
    var items = NETWORKS.filter(function (n) { return has(L[n.key]); }).map(function (n) {
      return { key: n.key, label: n.label, star: n.star, href: L[n.key], handle: n.handle(L[n.key]) };
    });
    (L.other || []).forEach(function (o, i) {
      if (has(o.url)) items.push({ key: 'other' + i, label: o.label, star: [6, 4, 0][i], href: o.url, handle: '' });
    });
    function accName(it) { return it.label + (it.handle ? ', ' + it.handle : '') + ' (opens in a new tab)'; }

    // email and phones, beside the words
    var phones = (L.phones || []).filter(function (p) { return has(p.number); });
    var rows = [];
    function copyBtn(value, what) {
      if (!navigator.clipboard) return null;
      return h('button', { class: 'cdetails__copy', type: 'button', text: 'Copy', 'aria-label': 'Copy ' + what, onclick: function () {
        var b = this;
        navigator.clipboard.writeText(value).then(function () {
          b.textContent = 'Copied'; b.setAttribute('aria-label', what + ' copied');
          setTimeout(function () { b.textContent = 'Copy'; b.setAttribute('aria-label', 'Copy ' + what); }, 1600);
        }, function () {});
      } });
    }
    if (has(L.email)) {
      rows.push(h('div', null, h('dt', { text: 'Email' }), h('dd', null, h('a', { href: 'mailto:' + L.email, text: L.email }), copyBtn(L.email, 'email address'))));
    }
    if (phones.length) {
      rows.push(h('div', null, h('dt', { text: phones.length > 1 ? 'Phones' : 'Phone' }), phones.map(function (p) {
        return h('dd', null, h('a', { href: 'tel:' + p.number.replace(/[^\d+]/g, ''), text: p.number }),
          has(p.label) ? h('span', { class: 'cdetails__where', text: p.label }) : null,
          copyBtn(p.number, (has(p.label) ? p.label + ' ' : '') + 'phone number'));
      })));
    }
    // a contact card (.vcf) with the same details, for a phone's or computer's address book
    var save = (has(L.email) || phones.length) ? h('p', { class: 'cdetails__save' },
      h('button', { class: 'btn btn--ghost', type: 'button', onclick: function () { downloadCard(L, P, phones, items); } },
        h('span', { html: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 2v8M4.5 6.8L8 10.3l3.5-3.5M3 13.5h10" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>' }),
        'Save my contact card')) : null;
    var missingPhones = (L.phones || []).filter(function (p) { return !has(p.number); });

    // the constellation drawn in the page (phones, tablets, or when the painted stars are covered)
    var inline = h('ol', { class: 'cconst', 'aria-label': 'Find me online' }, items.map(function (it, i) {
      return h('li', null, h('a', { href: it.href, target: '_blank', rel: 'noopener', 'aria-label': accName(it), 'data-link': it.key, 'data-star': it.star },
        h('span', { class: 'cconst__star', html: RJY.starIcon() }),
        h('span', { class: 'cconst__name', text: it.label }),
        it.handle ? h('span', { class: 'cconst__handle', text: it.handle }) : null));
    }));
    var inlineSvg = RJY.s('svg', { class: 'cconst__lines', 'aria-hidden': 'true' });
    var inlineWrap = h('div', { class: 'cconst-wrap' }, inlineSvg, inline);

    var words = h('div', { class: 'contact__words' },
      h('p', { class: 'sec__kicker', 'data-kicker': '' }, 'Contact'),
      h('h2', { class: 'contact__title', id: 'contact-title', text: 'Under the Same Sky' }),
      has(P.contactLine) ? h('p', { class: 'contact__text', text: P.contactLine }) : null,
      h('p', { class: 'contact__sub', text: 'Based in ' + P.basedIn + ', ' + P.relocation.charAt(0).toLowerCase() + P.relocation.slice(1, -1) + '. I work in English, Spanish and Mandarin.' }),
      rows.length ? h('dl', { class: 'cdetails' }, rows) : null,
      save,
      missingPhones.length ? RJY.ph('your ' + missingPhones.map(function (p) { return p.label; }).join(' and ') + ' phone number — links.phones in data/site.js') : null,
      !has(L.email) ? RJY.ph('your public email — links.email in data/site.js') : null,
      inlineWrap);
    root.appendChild(words);

    // the same links pinned to the painted stars (desktop): fixed over the painting
    var layer = h('div', { class: 'skylinks', role: 'group', 'aria-label': 'Find me online' });
    var svg = RJY.s('svg', { class: 'skylinks__lines', 'aria-hidden': 'true' });
    layer.appendChild(svg);
    var markers = items.map(function (it) {
      var lab = h('span', { class: 'skylink__label' }, h('span', { class: 'skylink__name', text: it.label }), it.handle ? h('span', { class: 'skylink__handle', text: it.handle }) : null);
      var a = h('a', { class: 'skylink', href: it.href, target: '_blank', rel: 'noopener', 'aria-label': accName(it), 'data-link': it.key, 'data-star': it.star }, lab);
      a._it = it; a._lab = lab;
      layer.appendChild(a);
      return a;
    });
    root.appendChild(layer);

    // pointing at a link wakes its star (in the painting) and lights its lines
    function wake(key, on) {
      document.querySelectorAll('[data-link="' + key + '"]').forEach(function (el) { el.classList.toggle('is-lit', on); });
      svg.querySelectorAll('[data-a="' + key + '"],[data-b="' + key + '"]').forEach(function (el) { el.classList.toggle('is-hot', on); });
      inlineSvg.querySelectorAll('[data-a="' + key + '"],[data-b="' + key + '"]').forEach(function (el) { el.classList.toggle('is-hot', on); });
      var it = items.filter(function (x) { return x.key === key; })[0];
      if (it && RJY.starHover && skyMode && shown) RJY.starHover(it.star, on);
    }
    root.querySelectorAll('[data-link]').forEach(function (el) {
      var k = el.getAttribute('data-link');
      el.addEventListener('pointerenter', function () { wake(k, true); });
      el.addEventListener('pointerleave', function () { if (document.activeElement !== el) wake(k, false); });
      el.addEventListener('focus', function () { wake(k, true); });
      el.addEventListener('blur', function () { wake(k, false); });
    });
    // keyboard: arriving on the links scrolls all the way down so the painted stars line up
    layer.addEventListener('focusin', function () {
      var max = document.documentElement.scrollHeight - window.innerHeight;
      if (window.pageYOffset < max - 2) RJY.scrollNow(max);
    });

    var skyMode = false, shown = false, drawn = false, lastKey = '';
    var section = root.closest('section');

    function detailRects() {
      return Array.prototype.map.call(words.querySelectorAll('.sec__kicker, .contact__title, .contact__text, .contact__sub, .cdetails, .cdetails__save, .ph'), function (e) { return e.getBoundingClientRect(); })
        .filter(function (r) { return r.width > 0; });
    }
    function hits(a, b) { return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y; }

    // Place every star link for a camera; returns false when a star or its label cannot be shown.
    var why = '';   // why the links last fell back to the in-page constellation (handy when adjusting the layout)
    function place(cam, commit, offsetY) {
      var w = window.innerWidth, hh = window.innerHeight;
      why = '';
      if (w <= 760) { why = 'narrow screen'; return false; }
      var m = RJY.Painting.viewMap(w, hh, RJY.Painting.focalFor(w, hh), cam);
      var navH = 64, foot = 76, oy = offsetY || 0;
      var blocks = detailRects().map(function (r) { return { x: r.left - 18, y: r.top - 14 + oy, w: r.width + 36, h: r.height + 28 }; });
      var pts = [], ok = true;
      markers.forEach(function (a) {
        var s = RJY.Painting.LIGHTS[a._it.star];
        var x = m[0] + s.x * m[2], y = m[1] + s.y * m[3];
        var r = Math.max(20, Math.min(60, RJY.Painting.effectRadius(a._it.star) * m[2] * 0.7));
        pts.push({ a: a, x: x, y: y, r: r });
        if (x < 24 || x > w - 24 || y < navH + 14 || y > hh - foot) { ok = false; why = a._it.key + ': star outside the free area'; }
        blocks.forEach(function (b) { if (hits({ x: x - r, y: y - r, w: 2 * r, h: 2 * r }, b)) { ok = false; why = a._it.key + ': star under the text'; } });
      });
      if (!ok) return false;
      // labels: try right, below, left, above — the first spot that stays clear of everything
      // (a label may sit inside its own star's invisible hit circle, but not over another star or label)
      var placed = pts.map(function (p) { return { x: p.x - p.r, y: p.y - p.r, w: 2 * p.r, h: 2 * p.r }; });
      pts.forEach(function (p, idx) {
        var lw = p.a._lab.offsetWidth || 140, lh = p.a._lab.offsetHeight || 44, g = p.r * 0.75 + 10;
        // centred spots may slide sideways to stay on screen (a star near the edge)
        var cx = Math.max(12, Math.min(w - 12 - lw, p.x - lw / 2));
        var spots = [
          { side: 'right', x: p.x + g, y: p.y - lh / 2 },
          { side: 'below', x: cx, y: p.y + g },
          { side: 'left', x: p.x - g - lw, y: p.y - lh / 2 },
          { side: 'above', x: cx, y: p.y - g - lh }
        ];
        var pick = null;
        for (var k = 0; k < spots.length && !pick; k++) {
          var c = spots[k], box = { x: c.x - 6, y: c.y - 6, w: lw + 12, h: lh + 12 };
          if (c.x < 12 || c.x + lw > w - 12 || c.y < navH + 6 || c.y + lh > hh - foot + 20) continue;
          if (blocks.some(function (b) { return hits(box, b); })) continue;
          if (placed.some(function (b, k) { return k !== idx && hits(box, b); })) continue;
          pick = c;
        }
        if (!pick) { ok = false; why = p.a._it.key + ': no room for the label'; return; }
        placed.push({ x: pick.x, y: pick.y, w: lw, h: lh });
        p.lx = pick.x - p.x; p.ly = pick.y - p.y; p.side = pick.side;
      });
      if (!ok || !commit) return ok;
      pts.forEach(function (p) {
        p.a.style.transform = 'translate(' + p.x.toFixed(1) + 'px,' + p.y.toFixed(1) + 'px)';
        p.a.style.setProperty('--r', p.r.toFixed(1) + 'px');
        p.a._lab.style.transform = 'translate(' + p.lx.toFixed(1) + 'px,' + p.ly.toFixed(1) + 'px)';
        p.a.dataset.side = p.side;
      });
      // the gold constellation line: star to star, stopping short of each painted star
      // (paths are created once and then only moved, so the drawing-in animation plays once)
      var paths = svg.querySelectorAll('path');
      if (paths.length !== pts.length - 1) {
        svg.innerHTML = '';
        for (var j = 1; j < pts.length; j++) svg.appendChild(RJY.s('path', { 'data-a': pts[j - 1].a._it.key, 'data-b': pts[j].a._it.key }));
        paths = svg.querySelectorAll('path');
      }
      for (var i = 1; i < pts.length; i++) {
        var A = pts[i - 1], B = pts[i], dx = B.x - A.x, dy = B.y - A.y, len = Math.sqrt(dx * dx + dy * dy) || 1;
        var ga = Math.min(A.r * 0.62, len / 3), gb = Math.min(B.r * 0.62, len / 3);
        var x1 = A.x + dx / len * ga, y1 = A.y + dy / len * ga, x2 = B.x - dx / len * gb, y2 = B.y - dy / len * gb;
        var mx = (x1 + x2) / 2 + dy * 0.06, my = (y1 + y2) / 2 - dx * 0.06;
        paths[i - 1].setAttribute('d', 'M' + x1.toFixed(1) + ' ' + y1.toFixed(1) + 'Q' + mx.toFixed(1) + ' ' + my.toFixed(1) + ' ' + x2.toFixed(1) + ' ' + y2.toFixed(1));
        paths[i - 1].style.setProperty('--len', Math.ceil(len - ga - gb + 2));
      }
      return true;
    }

    // Lines for the in-page constellation: through the centre of each star glyph.
    function drawInline() {
      if (!inline.offsetParent) return;
      var box = inlineWrap.getBoundingClientRect(), stars = inline.querySelectorAll('.cconst__star'), d = '';
      inlineSvg.setAttribute('viewBox', '0 0 ' + box.width.toFixed(0) + ' ' + box.height.toFixed(0));
      var pts = Array.prototype.map.call(stars, function (s) { var r = s.getBoundingClientRect(); return [r.left + r.width / 2 - box.left, r.top + r.height / 2 - box.top]; });
      for (var i = 1; i < pts.length; i++) {
        var A = pts[i - 1], B = pts[i], dx = B[0] - A[0], dy = B[1] - A[1], len = Math.sqrt(dx * dx + dy * dy) || 1, g = 11;
        d += '<path data-a="' + items[i - 1].key + '" data-b="' + items[i].key + '" d="M' + (A[0] + dx / len * g).toFixed(1) + ' ' + (A[1] + dy / len * g).toFixed(1) + 'L' + (B[0] - dx / len * g).toFixed(1) + ' ' + (B[1] - dy / len * g).toFixed(1) + '"/>';
      }
      inlineSvg.innerHTML = d;
    }

    // Choose: links on the painted stars, or the drawn constellation under the text.
    function chooseMode() {
      var w = window.innerWidth, hh = window.innerHeight;
      var key = w + 'x' + hh;
      if (!RJY.Painting) { skyMode = false; section.classList.remove('is-sky'); lastKey = key; drawInline(); return; }   // no painted stars to sit on: the drawn constellation
      var hero = RJY.Painting.heroView(w, hh);
      // judge with the page scrolled to the very end (the final framing), whatever the scroll is now
      var max = document.documentElement.scrollHeight - hh, offset = max - window.pageYOffset;
      skyMode = items.length > 1 && place(hero, false, -offset);
      section.classList.toggle('is-sky', skyMode);
      lastKey = key;
      drawInline();
    }

    var raf = 0;
    function relayout() { cancelAnimationFrame(raf); raf = requestAnimationFrame(function () { chooseMode(); RJY.skyLinks.update(lastProgress, lastCam); }); }
    window.addEventListener('resize', relayout);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(relayout);
    window.addEventListener('load', relayout);

    var lastProgress = 0, lastCam = null;
    RJY.skyLinks = {
      why: function () { return why; },
      update: function (progress, cam) {
        lastProgress = progress; lastCam = cam;
        if (!lastKey) chooseMode();
        var show = skyMode && progress > 0.9;
        if (show) {
          var fits = place(cam, true, 0);
          if (!fits && progress > 0.995) { chooseMode(); show = skyMode && place(cam, true, 0); }
        }
        if (show !== shown) {
          shown = show;
          layer.classList.toggle('is-visible', show);
          if (show && !drawn) { drawn = true; layer.classList.add('is-drawing'); setTimeout(function () { layer.classList.remove('is-drawing'); }, 3200); }
          if (!show) items.forEach(function (it) { if (RJY.starHover) RJY.starHover(it.star, false); });
        }
      },
      activeStars: function () { return shown ? items.map(function (it) { return it.star; }) : []; }
    };
  };

  RJY.renderFooter = function (root) {
    var y = SITE.meta.year;
    var credit = has(SITE.meta.paintingCredit) ? ' ' + SITE.meta.paintingCredit + '.' : '';
    root.appendChild(h('p', { style: { margin: 0 } }, '© ' + y + ' Ruibin Jin Yao. Paintings in the manner of Vincent van Gogh, from my own photographs and a Starry Night ocean scene.' + credit));
    if (!credit && RJY.draft) root.appendChild(RJY.ph('credit for the painting — meta.paintingCredit in data/site.js'));
    root.appendChild(h('p', { style: { margin: 0 } }, 'Map: Natural Earth. Built with HTML, CSS and JavaScript — no trackers. ', h('a', { href: '#home', text: 'Back to the sky' })));
  };
})();
