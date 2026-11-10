/*
 * constellation.js — "How it all connects".
 * Every place, milestone, project and skill on the site as one star chart. Lines come only from
 * the `related` / `seenIn` / `country` fields in /data, so every connection is a real one.
 * Rows: skills (top) · projects · the journey in time order · places (on the horizon).
 * Hover or focus a star to trace its lines; select it to open it.
 * No chart library: plain SVG. The stars float gently (a few units each, out of step), and the lines
 * follow them; the drifting pauses off-screen and with the site's pause button.
 */
(function () {
  'use strict';
  var RJY = window.RJY, SITE = window.SITE, h = RJY.h, s = RJY.s;

  var W = 1240, ROWS = { s: 70, w: 236, j: 410, c: 560 }, H = 610, M = 120;
  var ROW_NAMES = { s: 'Skills', w: 'Projects', j: 'Journey', c: 'Places' };
  var SKILL_SHORT = { finance: 'Finance', strategy: 'Strategy', analytics: 'Analytics', 'data-science': 'Data science', 'market-research': 'Market research', marketing: 'Digital marketing', 'intl-bd': 'Intl. business', ai: 'AI & automation', communication: 'Communication', web: 'Web development' };
  var PIG = { gold: '#f2c14e', ember: '#e8892b', cobalt: '#6d93d6', cornflower: '#9bb8e6', periwinkle: '#a7b3e0', foam: '#cfdcef', moon: '#f3e3a8', umber: '#c9a37f', teal: '#5fb3b8', emerald: '#52c48c' };

  function buildGraph() {
    var nodes = {}, edges = {}, list = [];
    function add(key, type, label, extra) { if (!nodes[key]) { nodes[key] = Object.assign({ key: key, type: type, label: label, adj: {} }, extra || {}); list.push(nodes[key]); } return nodes[key]; }
    function link(a, b) {
      if (!nodes[a] || !nodes[b] || a === b) return;
      var k = a < b ? a + '|' + b : b + '|' + a;
      edges[k] = [a, b]; nodes[a].adj[b] = 1; nodes[b].adj[a] = 1;
    }
    (SITE.palette || []).forEach(function (p) { add('s:' + p.id, 's', SKILL_SHORT[p.id] || p.name, { full: p.name, color: PIG[p.pigment] }); });
    (SITE.work || []).forEach(function (w) { add('w:' + w.id, 'w', w.short || w.title, { full: w.title }); });
    var js = (SITE.journey || []).slice().sort(function (a, b) { return a.at < b.at ? -1 : 1; });
    js.forEach(function (j) { add('j:' + j.id, 'j', j.short || j.title, { full: j.title + (j.org ? ' — ' + j.org : ''), at: j.at, when: j.when }); });
    var codes = {};
    (SITE.travel.countries || []).forEach(function (c) { if (c.status !== 'wishlist') codes[c.code] = 1; });
    js.forEach(function (j) { if (j.country) codes[j.country] = 1; });
    Object.keys(codes).forEach(function (c) { add('c:' + c, 'c', RJY.countryName(c), { full: RJY.countryName(c) }); });
    // edges from the data
    (SITE.palette || []).forEach(function (p) { (p.seenIn || []).forEach(function (r) { link('s:' + p.id, r); }); });
    (SITE.work || []).forEach(function (w) { (w.related || []).forEach(function (r) { link('w:' + w.id, r); }); });
    js.forEach(function (j) { (j.related || []).forEach(function (r) { link('j:' + j.id, r); }); if (j.country) link('j:' + j.id, 'c:' + j.country); });
    (SITE.travel.countries || []).forEach(function (c) { (c.related || []).forEach(function (r) { link('c:' + c.code, r); }); });
    return { nodes: nodes, list: list, edges: Object.keys(edges).map(function (k) { return edges[k]; }) };
  }

  function layout(g) {
    var rows = { s: [], w: [], j: [], c: [] };
    g.list.forEach(function (n) { rows[n.type].push(n); });
    function spread(row) {
      var n = row.length, x0 = M + 10, x1 = W - 70;
      row.forEach(function (nd, i) {
        nd.x = n === 1 ? (x0 + x1) / 2 : x0 + (x1 - x0) * i / (n - 1);
        // a little vertical scatter so the rows read as bands of stars, not a table
        var j = Math.sin((i + 1) * 12.9898 + nd.type.charCodeAt(0) * 78.233) * 43758.5453;
        nd.y = ROWS[nd.type] + (nd.type === 'c' ? 0 : ((j - Math.floor(j)) - 0.5) * 18);
      });
    }
    function bary(nd, types) {
      var xs = Object.keys(nd.adj).map(function (k) { return g.nodes[k]; }).filter(function (o) { return types.indexOf(o.type) !== -1 && o.x != null; }).map(function (o) { return o.x; });
      return xs.length ? xs.reduce(function (a, b) { return a + b; }, 0) / xs.length : null;
    }
    function order(row, types) {
      row.forEach(function (nd, i) { var b = bary(nd, types); nd._b = b == null ? (nd.x != null ? nd.x : i * 1e3) : b; });
      row.sort(function (a, b) { return a._b - b._b; });
      spread(row);
    }
    spread(rows.j);                       // the journey keeps its time order
    order(rows.c, ['j']);
    order(rows.w, ['j', 'c']);
    order(rows.s, ['w', 'j']);
    order(rows.w, ['j', 'c', 's']);       // one more sweep to untangle
    order(rows.s, ['w', 'j']);
    return rows;
  }

  RJY.renderConstellation = function (root) {
    var g = buildGraph(), rows = layout(g);
    var svg = s('svg', { class: 'graph', viewBox: '0 0 ' + W + ' ' + H, role: 'application', 'aria-roledescription': 'star chart', 'aria-label': 'How it all connects: ' + g.list.length + ' stars and ' + g.edges.length + ' connections. Use the arrow keys to move between stars and Enter to open one.' });
    svg.appendChild(s('defs', null,
      s('radialGradient', { id: 'gGlow' }, s('stop', { offset: '0', 'stop-color': '#fff6dc', 'stop-opacity': '.9' }), s('stop', { offset: '.3', 'stop-color': '#f2c14e', 'stop-opacity': '.28' }), s('stop', { offset: '1', 'stop-color': '#f2c14e', 'stop-opacity': '0' }))));
    // row names
    Object.keys(ROWS).forEach(function (t) { svg.appendChild(s('text', { class: 'graph__row', x: 0, y: ROWS[t] + 4, text: ROW_NAMES[t] })); });
    // horizon line under the places
    svg.appendChild(s('path', { class: 'graph__horizon', d: 'M' + (M - 30) + ' ' + (ROWS.c + 22) + ' C' + W * 0.4 + ' ' + (ROWS.c + 16) + ' ' + W * 0.7 + ' ' + (ROWS.c + 28) + ' ' + (W - 20) + ' ' + (ROWS.c + 21) }));
    var gEdges = s('g', { class: 'graph__edges' }), gNodes = s('g', { class: 'graph__nodes' });
    svg.appendChild(gEdges); svg.appendChild(gNodes);
    // each star drifts on its own slow loop around its place; dx/dy are the current offsets
    g.list.forEach(function (n, i) {
      var r = function (k) { var v = Math.sin((i + 1) * 91.7 + k * 12.3) * 43758.5453; return v - Math.floor(v); };
      n.dx = 0; n.dy = 0;
      n.fl = { ax: 2.5 + 3.5 * r(1), ay: 2 + 3 * r(2), wx: 0.16 + 0.2 * r(3), wy: 0.13 + 0.18 * r(4), px: 6.283 * r(5), py: 6.283 * r(6) };
    });
    // a line between two stars: a gentle arc within a row, an S-curve between rows
    function edgeD(A, B) {
      var ax = A.x + A.dx, ay = A.y + A.dy, bx = B.x + B.dx, by = B.y + B.dy;
      if (A.y === B.y) { var mx = (ax + bx) / 2, lift = Math.min(70, Math.abs(bx - ax) * 0.3); return 'M' + ax.toFixed(1) + ' ' + ay.toFixed(1) + ' Q' + mx.toFixed(1) + ' ' + ((ay + by) / 2 - lift).toFixed(1) + ' ' + bx.toFixed(1) + ' ' + by.toFixed(1); }
      var my = (ay + by) / 2;
      return 'M' + ax.toFixed(1) + ' ' + ay.toFixed(1) + ' C' + ax.toFixed(1) + ' ' + my.toFixed(1) + ' ' + bx.toFixed(1) + ' ' + my.toFixed(1) + ' ' + bx.toFixed(1) + ' ' + by.toFixed(1);
    }
    var edgeEls = g.edges.map(function (e) {
      var p = s('path', { d: edgeD(g.nodes[e[0]], g.nodes[e[1]]), class: 'graph__edge' }); p._a = e[0]; p._b = e[1];
      gEdges.appendChild(p); return p;
    });
    // nodes
    var order = ['s', 'w', 'j', 'c'];
    var nodeEls = {};
    order.forEach(function (t) {
      rows[t].forEach(function (n, i) {
        var deg = Object.keys(n.adj).length;
        var r = n.type === 'c' ? 7.5 : n.type === 's' ? 6 : 3 + Math.min(3, deg * 0.35);
        var gg = s('g', { class: 'gnode gnode--' + n.type, tabindex: '-1', role: 'link', 'aria-label': (ROW_NAMES[n.type].replace(/s$/, '')) + ': ' + n.full + '. ' + deg + ' connection' + (deg === 1 ? '' : 's') + '.' });
        gg.appendChild(s('circle', { class: 'gnode__halo', cx: n.x, cy: n.y, r: r * 4.2, fill: 'url(#gGlow)' }));
        gg.appendChild(s('circle', { class: 'gnode__ring', cx: n.x, cy: n.y, r: r + 6 }));
        gg.appendChild(s('circle', { class: 'gnode__core', cx: n.x, cy: n.y, r: r, style: n.color ? 'fill:' + n.color : null }));
        gg.appendChild(s('circle', { cx: n.x, cy: n.y, r: 15, fill: 'transparent' }));
        var below = n.type === 'c' || (n.type !== 's' && i % 2 === 1);
        var ly = n.type === 's' ? n.y - r - 12 : below ? n.y + r + 17 : n.y - r - 10;
        gg.appendChild(s('text', { class: 'gnode__label', x: n.x, y: ly, 'text-anchor': 'middle', text: n.label }));
        if (n.type === 'j' && n.when) gg.appendChild(s('text', { class: 'gnode__when', x: n.x, y: below ? ly + 13 : ly - 13, 'text-anchor': 'middle', text: String(n.at).slice(0, 4) }));
        gg._n = n; nodeEls[n.key] = gg;
        gNodes.appendChild(gg);
      });
    });

    // info line (live region)
    var touch = !RJY.finePointer;
    var idle = touch ? 'Tap a star to trace its connections, then tap it again to open it.' : 'Hover or tab to a star to trace its connections.';
    var info = h('p', { class: 'graph__info', 'aria-live': 'polite', text: idle });
    var lit = null;

    function light(key) {
      var n = g.nodes[key];
      lit = n ? key : null;
      svg.classList.toggle('is-tracing', !!n);
      edgeEls.forEach(function (p) { p.classList.toggle('is-on', !!n && (p._a === key || p._b === key)); });
      Object.keys(nodeEls).forEach(function (k) { nodeEls[k].classList.toggle('is-on', !!n && (k === key || !!n.adj[k])); nodeEls[k].classList.toggle('is-self', k === key); });
      if (!n) { info.textContent = idle; return; }
      var names = Object.keys(n.adj).map(function (k) { return g.nodes[k].label; });
      info.textContent = n.full + ' — connected to ' + (names.length ? names.join(', ') : 'nothing yet') + '.';
      var r = RJY.resolve(key);
      if (touch && r) info.appendChild(h('a', { class: 'link', href: r.href, text: 'Open' }));
    }
    function go(key) {
      var r = RJY.resolve(key);
      if (r) RJY.route.go(r.href);
    }

    // pointer
    Object.keys(nodeEls).forEach(function (k) {
      var el = nodeEls[k];
      el.addEventListener('mouseenter', function () { if (!touch) light(k); });
      el.addEventListener('mouseleave', function () { if (!touch && document.activeElement !== el) light(null); });
      el.addEventListener('click', function () {
        if (touch && lit !== k) { light(k); return; }   // first tap traces, second tap opens
        go(k);
      });
      el.addEventListener('focus', function () { light(k); });
      el.addEventListener('blur', function () { if (!touch) light(null); });
    });

    // keyboard: one tab stop, arrows move between stars and rows
    var grid = order.map(function (t) { return rows[t].map(function (n) { return n.key; }); });
    var cur = { r: 2, c: grid[2].length - 1 };
    function setCurrent(r, c, focus) {
      var prev = nodeEls[grid[cur.r][cur.c]]; if (prev) prev.setAttribute('tabindex', '-1');
      cur = { r: r, c: c };
      var el = nodeEls[grid[r][c]]; el.setAttribute('tabindex', '0');
      if (focus) el.focus();
    }
    setCurrent(cur.r, cur.c, false);
    svg.addEventListener('keydown', function (e) {
      var r = cur.r, c = cur.c;
      if (e.key === 'ArrowRight') c = Math.min(grid[r].length - 1, c + 1);
      else if (e.key === 'ArrowLeft') c = Math.max(0, c - 1);
      else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        var nr = Math.max(0, Math.min(grid.length - 1, r + (e.key === 'ArrowUp' ? -1 : 1)));
        if (nr !== r) {   // jump to the nearest star in the next row
          var x = g.nodes[grid[r][c]].x, best = 0, bd = 1e9;
          grid[nr].forEach(function (k, i) { var d = Math.abs(g.nodes[k].x - x); if (d < bd) { bd = d; best = i; } });
          r = nr; c = best;
        }
      } else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(grid[r][c]); return; }
      else if (e.key === 'Home') c = 0;
      else if (e.key === 'End') c = grid[r].length - 1;
      else return;
      e.preventDefault();
      setCurrent(r, c, true);
    });

    var scroller = h('div', { class: 'graph__scroll' }, svg);
    root.appendChild(h('div', { class: 'graph__wrap reveal' }, scroller, info,
      h('p', { class: 'graph__hint', text: 'Swipe sideways to see the whole sky. Tap a star to open it.' })));

    // draw the lines in when first seen
    if (!RJY.reducedMotion && 'IntersectionObserver' in window) {
      svg.classList.add('is-hidden');
      var io = new IntersectionObserver(function (es) { if (es[0].isIntersecting) { svg.classList.remove('is-hidden'); io.disconnect(); } }, { threshold: 0.3 });
      io.observe(svg);
    }

    // the floating: only while the chart is on screen, at ~30 frames a second, calmer with reduced motion
    var onScreen = false, raf = 0, last = 0, t0 = performance.now(), calm = RJY.reducedMotion ? 0.5 : 1;
    function float(now) {
      raf = 0;
      if (!onScreen || (RJY.motion && RJY.motion.paused)) return;
      raf = requestAnimationFrame(float);
      if (now - last < 32) return;
      last = now;
      var t = (now - t0) / 1000 * calm;
      g.list.forEach(function (n) {
        var f = n.fl;
        n.dx = f.ax * calm * Math.sin(t * f.wx * 6.283 + f.px);
        n.dy = f.ay * calm * Math.sin(t * f.wy * 6.283 + f.py);
        nodeEls[n.key].setAttribute('transform', 'translate(' + n.dx.toFixed(2) + ' ' + n.dy.toFixed(2) + ')');
      });
      edgeEls.forEach(function (p) { p.setAttribute('d', edgeD(g.nodes[p._a], g.nodes[p._b])); });
    }
    function wake() { if (!raf && onScreen && !(RJY.motion && RJY.motion.paused)) raf = requestAnimationFrame(float); }
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (es) { onScreen = es[0].isIntersecting; wake(); }, { rootMargin: '80px' }).observe(svg);
    }
    document.addEventListener('rjy:motion', wake);
  };
})();
