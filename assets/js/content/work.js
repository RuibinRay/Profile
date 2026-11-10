/*
 * work.js — "My Constellations": projects drawn as constellations, the All projects list (titles
 * written on brushstrokes), and the case-study chapter that opens over the page (#projects/<id>).
 */
(function () {
  'use strict';
  var RJY = window.RJY, SITE = window.SITE, h = RJY.h, s = RJY.s, has = RJY.has;
  var HUES = { gold: '#f2c14e', ember: '#f0a04a', foam: '#cfdcef', periwinkle: '#a7b3e0', teal: '#7fd0d4' };
  var STATUS = { live: 'Live', 'in-progress': 'In progress', 'coming-soon': 'Coming soon' };
  // not yet finished: still being built, or only announced
  function unfinished(w) { return w.status === 'in-progress' || w.status === 'coming-soon'; }
  function consOf(w) { return SITE.constellations.filter(function (c) { return c.id === w.constellation; })[0] || {}; }
  function hueOf(w) { return HUES[consOf(w).hue] || HUES.gold; }
  // The projects drawn in a constellation: its own, plus any that belong elsewhere but are also shown
  // here (`alsoIn: [{ constellation, star }]`) — the same project, with its own place in this drawing.
  function membersOf(c) {
    var own = [], also = [];
    SITE.work.forEach(function (w) {
      if (w.constellation === c.id) own.push(w);
      else (w.alsoIn || []).forEach(function (a) {
        if (a.constellation === c.id) { var e = Object.create(w); e.star = a.star || w.star; e.echo = true; also.push(e); }
      });
    });
    return own.concat(also);
  }
  function tagNames(w) {
    return (w.tags || []).map(function (id) { var c = SITE.constellations.filter(function (x) { return x.id === id; })[0]; return c ? c.name : null; }).filter(Boolean);
  }

  /* ---------- Featured projects: one big star per website ----------
     Each star has its own way of answering the pointer (`glyph`): the sun sends out rays, the ripple
     spreads rings, the orbit sets a small moon circling, the flow runs two
     electrolyte loops, the shot traces a ball's arc into a hoop. Selecting one flies through the star into its
     case study (a circle of the project's colour grows from the star, then the chapter opens). */
  function featuredStar(w, color) {
    var g = w.glyph || 'sun', id = 'fs-' + w.id;
    var svg = s('svg', { class: 'fstar fstar--' + g, viewBox: '-60 -60 120 120', 'aria-hidden': 'true' });
    svg.appendChild(s('defs', null, s('radialGradient', { id: id },
      s('stop', { offset: '0', 'stop-color': '#fff8e6', 'stop-opacity': '1' }),
      s('stop', { offset: '.25', 'stop-color': color, 'stop-opacity': '.55' }),
      s('stop', { offset: '1', 'stop-color': color, 'stop-opacity': '0' }))));
    svg.appendChild(s('circle', { class: 'fstar__halo', r: 54, fill: 'url(#' + id + ')' }));
    var fx = s('g', { class: 'fstar__fx' });
    if (g === 'sun') {
      for (var i = 0; i < 12; i++) {
        var a = i * 30, L = i % 2 ? 30 : 40;
        fx.appendChild(s('line', { class: 'ray', x1: 0, y1: -14, x2: 0, y2: -L, transform: 'rotate(' + a + ')', stroke: color }));
      }
    } else if (g === 'ripple') {
      [0, 1, 2].forEach(function (i) { fx.appendChild(s('circle', { class: 'ring ring-' + i, r: 14, stroke: color })); });
    } else if (g === 'flow') {
      // a flow battery's two electrolyte loops: dashes running round either side of the cell
      fx.appendChild(s('path', { class: 'loop loop-a', d: 'M-5 -15 C-44 -34 -44 34 -5 15', stroke: '#b9a3f0' }));
      fx.appendChild(s('path', { class: 'loop loop-b', d: 'M5 -15 C44 -34 44 34 5 15', stroke: color }));
    } else if (g === 'goal') {
      // a curling shot: the ball's path bends in from the left and ends inside a goal on the right
      fx.appendChild(s('path', { class: 'arc', d: 'M-44 20 Q-20 -52 32 -6', stroke: color, pathLength: 100 }));
      fx.appendChild(s('path', { class: 'hoop', d: 'M26 6 V-14 H46 V6', stroke: '#c8ff3d' }));
    } else if (g === 'agents') {
      // several agents at work: three small lights share one orbit
      fx.appendChild(s('circle', { class: 'orbit', r: 30, stroke: color }));
      fx.appendChild(s('g', { class: 'moon-arm' }, [0, 120, 240].map(function (a) { return s('circle', { class: 'moon', cx: 30, cy: 0, r: 2.8, fill: '#fff4d0', transform: 'rotate(' + a + ')' }); })));
    } else if (g === 'shot') {
      // a jump shot: the ball's arc is traced from the left and drops through a hoop on the right
      fx.appendChild(s('path', { class: 'arc', d: 'M-42 14 Q-4 -70 34 -3', stroke: color, pathLength: 100 }));
      fx.appendChild(s('ellipse', { class: 'hoop', cx: 36, cy: 0, rx: 8, ry: 2.6, stroke: '#ff9a5a' }));
    } else {
      fx.appendChild(s('circle', { class: 'orbit', r: 30, stroke: color }));
      fx.appendChild(s('g', { class: 'moon-arm' }, s('circle', { class: 'moon', cx: 30, cy: 0, r: 3.2, fill: '#fff4d0' })));
    }
    svg.appendChild(fx);
    // the star itself: a four-point spark over a core
    svg.appendChild(s('path', { class: 'fstar__spark', d: 'M0 -22 L4 -4 L22 0 L4 4 L0 22 L-4 4 L-22 0 L-4 -4 Z', fill: '#fff8e6' }));
    svg.appendChild(s('circle', { class: 'fstar__core', r: 5.5, fill: '#fff' }));
    return svg;
  }

  function featuredCover(w, hue) {
    var box = h('div', { class: 'feat__cover' + (w.cover ? '' : ' is-blank') });
    if (w.cover) {
      box.appendChild(RJY.picture(w.cover, { sizes: '(max-width: 760px) 92vw, 400px', alt: w.title + ' — the homepage' }));
    } else {
      // a canvas still being painted: a few strokes of the constellation's colour on the night
      var pig = RJY.PIGMENTS[hue] ? hue : 'gold';
      box.appendChild(h('span', { class: 'feat__strokes', 'aria-hidden': 'true' },
        h('span', { html: RJY.brush(220, 26, { pigment: pig, seed: 3.3 + w.id.length, dir: 'h', dry: 0.35, texture: 0.8 }) }),
        h('span', { html: RJY.brush(150, 22, { pigment: pig, seed: 9.1 + w.id.length, dir: 'h', dry: 0.4, texture: 0.8 }) }),
        h('span', { html: RJY.brush(90, 18, { pigment: 'moon', seed: 5.7 + w.id.length, dir: 'h', dry: 0.5, texture: 0.8 }) })));
      box.appendChild(h('span', { class: 'feat__blank', text: 'Still painting…' }));
    }
    return box;
  }

  // Fly through the star into the case study: a disc of the project's colour grows from the star
  // until it fills the window, the chapter opens underneath, and the disc fades away.
  function flyInto(fromEl, color, go) {
    if (RJY.reducedMotion || !fromEl || !fromEl.getBoundingClientRect) { go(); return; }
    var r = fromEl.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    var R = Math.hypot(Math.max(cx, window.innerWidth - cx), Math.max(cy, window.innerHeight - cy));
    var disc = h('div', { class: 'portal-disc', 'aria-hidden': 'true' });
    disc.style.left = cx + 'px'; disc.style.top = cy + 'px';
    disc.style.setProperty('--c', color); disc.style.setProperty('--R', (R * 2.2) + 'px');
    document.body.appendChild(disc);
    requestAnimationFrame(function () { requestAnimationFrame(function () { disc.classList.add('is-grown'); }); });
    setTimeout(function () { go(); disc.classList.add('is-gone'); }, 520);
    setTimeout(function () { disc.remove(); }, 1400);
  }

  function renderFeatured(root) {
    var items = SITE.work.filter(function (w) { return w.featured; });
    if (!items.length) return;
    var wrap = h('div', { class: 'featured reveal' },
      h('div', { class: 'featured__head' },
        h('h3', { text: 'Featured projects' }),
        h('p', { class: 'featured__lede', text: 'The websites: each one its own world. Point at a star to wake it; select it to step inside.' })));
    var row = h('ul', { class: 'feat-row', role: 'list' }, items.map(function (w) {
      var cons = consOf(w), color = hueOf(w), live = !unfinished(w);
      var star = featuredStar(w, color);
      var card = h('a', { class: 'feat' + (live ? ' is-live' : ' is-wip'), href: '#projects/' + w.id, 'aria-label': w.title + (live ? '' : ' (in progress)') + ' — open the case study' },
        h('span', { class: 'feat__star' }, star),
        featuredCover(w, cons.hue),
        h('span', { class: 'feat__body' },
          h('span', { class: 'feat__kicker' },
            h('span', { class: 'feat__status', text: STATUS[w.status] || STATUS.live }),
            h('span', { class: 'feat__tags', text: [cons.name].concat(tagNames(w)).join(' · ') })),
          h('span', { class: 'feat__title', text: w.title }),
          has(w.tagline) ? h('span', { class: 'feat__tagline', text: w.tagline }) : null,
          h('span', { class: 'feat__go', text: live ? 'Read the case study →' : 'See what’s coming →' })));
      card.style.setProperty('--hue', color);
      card.addEventListener('click', function (e) {
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.button > 0) return;
        e.preventDefault();
        flyInto(star, color, function () { RJY.route.go('#projects/' + w.id); });
      });
      return h('li', null, card);
    }));
    wrap.appendChild(row);
    root.appendChild(wrap);
  }

  // Minimum spanning tree gives a natural, uncluttered constellation shape.
  function mst(pts) {
    var n = pts.length, inTree = [0], edges = [];
    if (n < 2) return edges;
    while (inTree.length < n) {
      var best = null;
      inTree.forEach(function (a) {
        for (var b = 0; b < n; b++) {
          if (inTree.indexOf(b) !== -1) continue;
          var d = Math.hypot(pts[a].x - pts[b].x, pts[a].y - pts[b].y);
          if (!best || d < best.d) best = { a: a, b: b, d: d };
        }
      });
      edges.push(best); inTree.push(best.b);
    }
    return edges;
  }

  // Depth-first order through the tree, so neighbours in a phone layout are connected stars.
  function treeOrder(n, edges) {
    var adj = {}; for (var i = 0; i < n; i++) adj[i] = [];
    edges.forEach(function (e) { adj[e.a].push(e.b); adj[e.b].push(e.a); });
    var seen = {}, out = [];
    (function visit(i) { seen[i] = 1; out.push(i); adj[i].forEach(function (j) { if (!seen[j]) visit(j); }); })(0);
    for (var k = 0; k < n; k++) if (!seen[k]) out.push(k);
    return out;
  }

  // Split a label into lines that fit a width (approximate: 0.52em per character).
  function wrap(text, maxPx, fs) {
    var max = Math.max(8, Math.floor(maxPx / (fs * 0.52))), words = text.split(' '), lines = [''];
    words.forEach(function (w) {
      var cur = lines[lines.length - 1];
      if ((cur + ' ' + w).trim().length > max && cur) lines.push(w); else lines[lines.length - 1] = (cur + ' ' + w).trim();
    });
    return lines;
  }

  function drawConstellation(c, items, wide, compact) {
    var VW, VH, pad = 40, pts;
    var base = items.map(function (w) { return { w: w, x: w.star[0], y: w.star[1] }; });
    var edges = mst(base);
    if (compact) {
      // phones: a vertical chain of stars, labels to the right
      var order = treeOrder(base.length, edges), gap = 64;
      VW = 340; VH = 40 + gap * (base.length - 1) + 40;
      pts = base.slice();
      order.forEach(function (idx, k) {
        var j = Math.sin((k + 3) * 91.7) * 1000; j = j - Math.floor(j);
        pts[idx] = { w: base[idx].w, x: 34 + (k % 2 ? 54 : 0) + j * 18, y: 36 + k * gap };
      });
    } else {
      VW = wide ? 1000 : 500; VH = wide ? 300 : 320;
      pts = base.map(function (p) { return { w: p.w, x: pad + p.x * (VW - 2 * pad), y: pad + p.y * (VH - 2 * pad) }; });
    }
    var color = HUES[c.hue] || HUES.gold;
    var svg = s('svg', { viewBox: '0 0 ' + VW + ' ' + VH, role: 'group', 'aria-label': c.name + ' constellation, ' + items.length + ' projects', class: compact ? 'is-compact' : null });
    var gid = 'wg-' + c.id;
    svg.appendChild(s('defs', null, s('radialGradient', { id: gid }, s('stop', { offset: '0', 'stop-color': '#fff6dc', 'stop-opacity': '.95' }), s('stop', { offset: '.22', 'stop-color': color, 'stop-opacity': '.45' }), s('stop', { offset: '1', 'stop-color': color, 'stop-opacity': '0' }))));
    var edgeEls = [];
    edges.forEach(function (e) {
      var A = pts[e.a], B = pts[e.b];
      var len = Math.hypot(B.x - A.x, B.y - A.y);
      var bend = compact ? 0.18 : 0.08;
      var mx = (A.x + B.x) / 2 + (B.y - A.y) * bend, my = (A.y + B.y) / 2 - (B.x - A.x) * bend;
      var line = s('path', { class: 'edge', d: 'M' + A.x + ' ' + A.y + ' Q' + mx + ' ' + my + ' ' + B.x + ' ' + B.y, 'data-a': A.w.id, 'data-b': B.w.id });
      line.style.setProperty('--len', Math.ceil(len * 1.15));
      svg.appendChild(line); edgeEls.push(line);
    });
    pts.forEach(function (p) {
      var w = p.w, r = 4 + 3 * (w.magnitude || 0.8);
      var wip = unfinished(w);
      var g = s('g', { class: 'wstar' + (wip ? ' is-wip' : ''), tabindex: '0', role: 'button', 'aria-label': w.title + (w.when ? ', ' + w.when : '') + (wip ? ' (in progress)' : '') + ' — open case study', 'data-id': w.id });
      g.appendChild(s('circle', { class: 'halo', cx: p.x, cy: p.y, r: r * 6, fill: 'url(#' + gid + ')' }));
      g.appendChild(s('circle', { class: 'ring', cx: p.x, cy: p.y, r: r + 7 }));
      g.appendChild(s('circle', { class: 'core', cx: p.x, cy: p.y, r: r }));
      g.appendChild(s('circle', { cx: p.x, cy: p.y, r: 22, fill: 'transparent' }));
      if (compact) {
        var fs = 14, lx = p.x + r + 14, lines = wrap(w.short || w.title, VW - lx - 6, fs);
        var t = s('text', { x: lx, y: p.y + 5 - (lines.length - 1) * 8, 'font-size': fs });
        lines.forEach(function (ln, i) { t.appendChild(s('tspan', { x: lx, dy: i ? 17 : 0, text: ln })); });
        // a wide invisible hit area over the label too
        g.appendChild(s('rect', { x: p.x - 20, y: p.y - 22, width: VW - p.x + 14, height: 44, fill: 'transparent' }));
        g.appendChild(t);
      } else {
        var right = p.x < VW * 0.72;
        g.appendChild(s('text', { x: right ? p.x + r + 12 : p.x - r - 12, y: p.y + 4, 'text-anchor': right ? 'start' : 'end', text: w.short || w.title }));
      }
      var hot = function (on) { edgeEls.forEach(function (l) { if (l.dataset.a === w.id || l.dataset.b === w.id) l.classList.toggle('is-hot', on); }); };
      g.addEventListener('mouseenter', function () { hot(true); });
      g.addEventListener('mouseleave', function () { hot(false); });
      g.addEventListener('focus', function () { hot(true); });
      g.addEventListener('blur', function () { hot(false); });
      g.addEventListener('click', function () { RJY.route.go('#projects/' + w.id); });
      g.addEventListener('keydown', function (ev) { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); RJY.route.go('#projects/' + w.id); } });
      svg.appendChild(g);
    });
    return svg;
  }

  /* The homepage: the featured websites as small stars under the calls to action. */
  RJY.renderHeroFeatured = function (root) {
    var items = SITE.work.filter(function (w) { return w.featured; });
    if (!items.length) return;
    root.appendChild(h('span', { class: 'hero__featured-label', text: 'Things I’ve built' }));
    items.forEach(function (w) {
      var live = !unfinished(w);
      var a = h('a', { class: 'hstar' + (live ? '' : ' is-wip'), href: '#projects/' + w.id, 'aria-label': w.title + (live ? '' : ' (in progress)') + ' — open the case study', html: RJY.starIcon() },
        h('span', { text: w.short || w.title }), live ? null : h('small', { text: 'soon' }));
      a.style.setProperty('--hue', hueOf(w));
      root.appendChild(a);
    });
  };

  RJY.renderWork = function (root) {
    renderFeatured(root);
    var sky = h('div', { class: 'sky' });
    var boxes = [];
    SITE.constellations.forEach(function (c, ci) {
      var items = membersOf(c);
      if (!items.length) return;
      var wide = ci === 0;
      var box = h('div', { class: 'cons reveal', style: wide ? { gridColumn: '1 / -1' } : null },
        h('h3', { class: 'cons__name', text: c.name }), has(c.note) ? h('p', { class: 'cons__note', text: c.note }) : null);
      box._c = c; box._items = items; box._wide = wide;
      sky.appendChild(box); boxes.push(box);
    });
    root.appendChild(sky);
    var modeNow = null;
    function draw() {
      // full: two columns · narrow: one column, everything drawn at its normal size · compact: phones
      var cw = sky.clientWidth || window.innerWidth;
      var mode = cw < 700 ? 'compact' : cw < 860 ? 'narrow' : 'full';
      if (mode === modeNow) return;
      modeNow = mode;
      boxes.forEach(function (box) {
        var old = box.querySelector('svg'); if (old) old.remove();
        box.appendChild(drawConstellation(box._c, box._items, box._wide && mode === 'full', mode === 'compact'));
      });
    }
    draw();
    var rt; window.addEventListener('resize', function () { clearTimeout(rt); rt = setTimeout(draw, 200); });
    // Constellations draw themselves the first time they are seen
    var cons = root.querySelectorAll('.cons');
    if (RJY.reducedMotion || !('IntersectionObserver' in window)) cons.forEach(function (c) { c.classList.add('is-drawn'); });
    else {
      var io = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('is-drawn'); io.unobserve(e.target); } }); }, { threshold: 0.3 });
      cons.forEach(function (c) { io.observe(c); });
    }

    // All projects — every project in one list, grouped by constellation. Each title is written on a
    // brushstroke in its constellation's colour, painted at the title's real size (brush.js).
    var n = 0, rows = [], numOf = {}, k = 0;
    // each project keeps one number, its place in its own constellation, even where it is also listed
    SITE.constellations.forEach(function (c) { SITE.work.forEach(function (w) { if (w.constellation === c.id) numOf[w.id] = ++k; }); });
    var groups = SITE.constellations.map(function (c) {
      var items = membersOf(c);
      if (!items.length) return null;
      var pig = RJY.PIGMENTS[c.hue] ? c.hue : 'gold';
      return h('li', { class: 'ix-group' },
        h('h4', { class: 'ix-group__name' },
          h('span', { class: 'ix-group__dab', 'aria-hidden': 'true', html: RJY.brush(44, 16, { pigment: pig, seed: n + 4.1, dir: 'h', dry: 0.3, inset: { across: 2, start: 1, end: 1 } }) }),
          c.name,
          h('span', { class: 'ix-group__count', text: items.length + (items.length === 1 ? ' project' : ' projects') })),
        h('ul', { class: 'ix-list' }, items.map(function (w) {
          n++;
          var num = numOf[w.id] || n;
          var paint = h('span', { class: 'ix-paint', 'aria-hidden': 'true' }), text = h('span', { class: 'ix-text', text: w.title });
          rows.push({ paint: paint, text: text, pigment: pig, seed: n * 7.3 + 2, key: '' });
          return h('li', null, h('button', { type: 'button', class: 'ix-row', onclick: function () { RJY.route.go('#projects/' + w.id); } },
            h('span', { class: 'ix-num', 'aria-hidden': 'true', text: (num < 10 ? '0' : '') + num }),
            h('span', { class: 'ix-title' }, paint, text),
            h('span', { class: 'ix-when' }, unfinished(w) ? h('span', { class: 'wip', text: STATUS[w.status] }) : null, w.when || ''),
            h('span', { class: 'ix-go', 'aria-hidden': 'true', text: '→' })));
        })));
    }).filter(Boolean);
    var index = h('div', { class: 'index reveal' },
      h('div', { class: 'index__head' }, h('h3', { text: 'All projects' }), h('span', { class: 'muted', style: { fontSize: '.8125rem' }, text: SITE.work.length + ' case studies' })),
      h('ul', { class: 'ix-groups' }, groups));
    root.appendChild(index);
    function paintRows() {
      rows.forEach(function (r) {
        var w = r.text.offsetWidth, ht = r.text.offsetHeight;
        if (!w || !ht) return;
        var key = w + 'x' + ht;
        if (key === r.key) return;
        r.key = key;
        r.paint.style.width = w + 'px'; r.paint.style.height = ht + 'px';
        var padR = parseFloat(getComputedStyle(r.text).paddingRight) || 0;
        r.paint.innerHTML = RJY.brush(w, ht, { pigment: r.pigment, seed: r.seed, dir: 'h', texture: 0.5, dry: 0.06, solid: w - padR + 6, inset: { across: 2, start: 2, end: 3 } });
      });
    }
    paintRows();
    var pr; function later() { clearTimeout(pr); pr = setTimeout(paintRows, 150); }
    if ('ResizeObserver' in window) new ResizeObserver(later).observe(index); else window.addEventListener('resize', later);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(paintRows);

    RJY.route.on('projects', open);
  };

  function section(title, content) {
    return [h('h3', { text: title }), h('div', null, content)];
  }
  function bullets(list) { return h('ul', { class: 'jd__list' }, list.map(function (x) { return h('li', { text: x }); })); }

  function open(id) {
    var w = RJY.findWork(id); if (!w) return;
    var cons = SITE.constellations.filter(function (c) { return c.id === w.constellation; })[0] || {};
    var all = SITE.work, i = all.indexOf(w);
    RJY.sheet.open({
      kind: 'chapter',
      label: w.title,
      render: function (body) {
        var grid = h('div', { class: 'chapter__grid' });
        function add(title, val, render, hint) {
          if (has(val)) {
            grid.appendChild(h('h3', { text: title }));
            grid.appendChild(h('div', null, render(val)));
          } else if (RJY.draft) {
            grid.appendChild(h('h3', { text: title }));
            grid.appendChild(h('div', null, RJY.ph(hint)));
          }
        }
        add('The opportunity', w.context, function (v) { return h('p', { text: v }); }, 'the problem or opportunity — context');
        add('Objective', w.objective, function (v) { return h('p', { text: v }); }, 'what the work set out to do — objective');
        add('My role', w.role, function (v) { return h('p', { text: v }); }, 'your role and contribution — role');
        add('Approach', w.approach, bullets, 'the methods and steps — approach');
        add('Tools', w.tools, function (v) { return h('div', { class: 'chapter__tools' }, v.map(function (t) { return h('span', { text: t }); })); }, 'tools you used — tools');
        add('Insights', w.insights, bullets, 'what you found — insights');
        add('Results & deliverables', w.results, bullets, 'documented results — results (no estimates)');
        // researched context: facts about the subject (not about my work), each with its sources
        add('Background', w.background, function (v) {
          return h('div', { class: 'chapter__bg' },
            h('p', { class: 'chapter__bg-note', text: 'Context I researched for this page, with the sources.' }),
            v.map(function (b) {
              var src = [];
              (b.sources || []).forEach(function (s, k) { if (k) src.push(' · '); src.push(h('a', { href: s.url, target: '_blank', rel: 'noopener', text: s.label })); });
              return h('p', null, b.text, ' ', src.length ? h('span', { class: 'chapter__src' }, '(', src, ')') : null);
            }));
        }, 'researched context with sources — background');
        add('Images', w.images, function (v) {
          var pics = v.map(function (im) { return Object.assign({ place: w.title }, im); });
          return h('div', { class: 'chapter__images' }, pics.map(function (im, k) {
            return h('figure', null,
              h('button', { type: 'button', class: 'chapter__shot', 'aria-label': 'Open image: ' + (im.caption || im.alt || w.title), onclick: function () { RJY.lightbox(im, pics, k); } },
                RJY.picture(im, { sizes: '(max-width: 1100px) 92vw, 640px', alt: '' })),
              has(im.caption) ? h('figcaption', { text: im.caption }) : null);
          }));
        }, 'screenshots, charts or slides — images');
        // documents: open the public ones; the rest can be requested from me by email
        var mail = SITE.links && SITE.links.email;
        function ask(subject) { return 'mailto:' + mail + '?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent('Hi Ray,\n\nI saw “' + w.title + '” on your website and would like to read ' + (subject.indexOf('Request: ') === 0 ? '“' + subject.slice(9) + '”' : 'more about it') + '.\n\n'); }
        if (has(w.documents) || mail) grid.appendChild(h('h3', { text: 'Related documents' }));
        if (has(w.documents) || mail) grid.appendChild(h('div', null, h('ul', { class: 'docs' }, (w.documents || []).map(function (d) {
          var open = has(d.url);
          return h('li', { class: 'doc' + (open ? '' : ' is-request') },
            h('span', { class: 'doc__kind', text: d.kind || 'Document' }),
            h('span', { class: 'doc__text' }, h('b', { text: d.title }), has(d.note) ? h('small', { text: d.note }) : null),
            open ? h('a', { class: 'doc__go', href: d.url, target: '_blank', rel: 'noopener', 'aria-label': 'Open ' + d.title + ' (new tab)', text: 'Open' })
                 : (mail ? h('a', { class: 'doc__go', href: ask('Request: ' + d.title), 'aria-label': 'Ask Ray for ' + d.title + ' by email', text: 'Ask for it' }) : null));
        })), mail ? h('p', { class: 'docs__ask' }, w.status === 'coming-soon' ? 'Want to know more before it is ready? ' : 'Want to see more of the work behind this? ', h('a', { class: 'link', href: ask('About ' + w.title), text: w.status === 'coming-soon' ? 'Ask me about it' : 'Ask me for the documents' }), '.') : null));
        add('Links', w.featured ? [] : w.links, function (v) {
          return h('div', { class: 'btn-row' }, v.map(function (l) { return h('a', { class: 'btn', href: l.url, target: '_blank', rel: 'noopener', text: l.label }); }));
        }, 'a live demo, repository or deck — links');
        var prev = all[(i - 1 + all.length) % all.length], next = all[(i + 1) % all.length];
        var wip = unfinished(w), tags = tagNames(w);
        body.appendChild(h('p', { class: 'chapter__eyebrow' },
          wip ? h('span', { class: 'wip', text: STATUS[w.status] }) : null,
          [cons.name].concat(tags).join(' · ') + (has(w.when) ? ', ' + w.when : '')));
        body.appendChild(h('h2', { class: 'chapter__title', text: w.title }));
        body.appendChild(h('p', { class: 'chapter__meta' }, has(w.tagline) ? h('span', { class: 'chapter__tagline', text: w.tagline }) : null, [w.org].filter(has).join('')));
        if (w.featured) {
          var top = h('div', { class: 'chapter__actions' });
          if (has(w.links)) top.appendChild(h('div', { class: 'btn-row' }, w.links.map(function (l, k) { return h('a', { class: 'btn' + (k === 0 ? ' btn--primary' : ''), href: l.url, target: '_blank', rel: 'noopener', text: l.label }); })));
          else if (wip) top.appendChild(h('p', { class: 'chapter__soon', text: (w.status === 'coming-soon' ? 'Coming soon' : 'Still in the making') + ' — the link will appear here when it is ready.' }));
          if (w.cover) top.appendChild(h('figure', { class: 'chapter__cover' }, RJY.picture(w.cover, { sizes: '(max-width: 1100px) 92vw, 1040px', alt: w.title + ' — the homepage', full: true })));
          body.appendChild(top);
        }
        body.appendChild(grid);
        var c = RJY.connections(w.related); if (c) body.appendChild(c);
        body.appendChild(h('div', { class: 'jd__nav', style: { marginTop: '48px' } },
          h('a', { class: 'link', href: '#projects/' + prev.id }, '← ' + prev.short),
          h('a', { class: 'link', href: '#projects/' + next.id }, next.short + ' →')));
      }
    });
  }
  RJY.openWork = open;
})();
