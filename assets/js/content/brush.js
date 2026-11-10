/*
 * brush.js — painted brushstrokes, drawn as SVG at the size they are shown.
 * Used by My Palette (one band of paint per skill), the All projects list and the About page.
 *
 *   RJY.brush(w, h, options)  → '<svg …>…</svg>'
 *     pigment  a colour from RJY.PIGMENTS
 *     seed     any number: the same seed paints the same stroke
 *     dir      'v' (the brush travels top → bottom) or 'h' (left → right)
 *     inset    { across, start, end } in pixels: bare canvas left around the stroke
 *     dry      how much of the stroke is dry brush at the end (0.05 – 0.4)
 *     texture  strength of the bristle streaks (0 – 1)
 *     solid    keep the paint solid up to this distance along the stroke (for text written on it)
 *   RJY.brushURL(w, h, options) → the same stroke as a CSS url(…) for a background
 *
 * A stroke starts with a rounded, loaded tip, carries bristle streaks in a lighter and a deeper tone
 * of its colour, and runs out of paint into ragged dry-brush marks — never a hard, cut-off end.
 */
(function () {
  'use strict';
  var RJY = window.RJY;

  // [paint, highlight, shadow], mixed from the painting
  var PIGMENTS = {
    gold: ['#f2c14e', '#ffe29a', '#c98f1e'], emerald: ['#2fa36b', '#8fe0b3', '#17694a'], ember: ['#e8892b', '#ffc27a', '#a85512'],
    cobalt: ['#2a4ea6', '#6d93d6', '#152f72'], cornflower: ['#4a73b8', '#9bb8e6', '#2b4f8f'],
    periwinkle: ['#8e9ccb', '#c9d1ef', '#5e6aa1'], foam: ['#cfdcef', '#ffffff', '#93a6c9'],
    moon: ['#f3e3a8', '#fff6d6', '#cdb46a'], umber: ['#8a6a4f', '#c9a37f', '#5a4231'], teal: ['#5fb3b8', '#a7e3e5', '#317f86']
  };
  RJY.PIGMENTS = PIGMENTS;

  var uid = 0;
  function rnd(n) { var x = Math.sin(n * 12.9898 + 78.233) * 43758.5453; return x - Math.floor(x); }
  function smooth(a, b, x) { var t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); }
  function f(v) { return Math.round(v * 10) / 10; }

  RJY.brush = function (w, h, o) {
    o = o || {};
    w = Math.max(8, Math.round(w)); h = Math.max(8, Math.round(h));
    var c = PIGMENTS[o.pigment] || PIGMENTS.gold, seed = o.seed || 1, vert = o.dir !== 'h', ins = o.inset || {};
    var tex = o.texture == null ? 1 : o.texture;
    var L = vert ? h : w, C = vert ? w : h;                     // length along the stroke, size across it
    var mC = ins.across != null ? ins.across : Math.max(4, C * 0.085);
    var m0 = ins.start != null ? ins.start : Math.max(5, Math.min(L * 0.03, 20));
    var m1 = ins.end != null ? ins.end : Math.max(5, Math.min(L * 0.025, 16));
    var T = Math.max(4, C - 2 * mC), a0 = m0, a1 = Math.max(a0 + 20, L - m1), span = a1 - a0;
    var dry = o.dry != null ? o.dry : 0.14 + 0.1 * rnd(seed * 7.1);
    var aEnd = a1 - span * dry;                                 // where the solid paint gives out
    if (o.solid != null) aEnd = Math.min(a1 - 4, Math.max(aEnd, o.solid + 10));
    var cap = Math.max(4, Math.min(T * 0.45, span * 0.14));     // the rounded, loaded tip
    var wob = Math.min(T, 90) * 0.03;
    var id = 'br' + (++uid);
    function P(al, ac) { return vert ? f(ac) + ' ' + f(al) : f(al) + ' ' + f(ac); }
    function centre(a) { var u = (a - a0) / span; return C / 2 + wob * (0.7 * Math.sin(u * 7.1 + seed) + 0.3 * Math.sin(u * 15.3 + seed * 2.3)); }
    function profile(a) {                                       // half-thickness without the wobble
      var u = (a - a0) / span, s = Math.min(1, Math.max(0, (a - a0) / cap));
      return T / 2 * Math.sqrt(Math.max(0, 1 - (1 - s) * (1 - s))) * (1 - 0.1 * u) * (1 - 0.25 * smooth(0.75, 1, (a - a0) / (aEnd - a0)));
    }
    function half(a) { var u = (a - a0) / span; return profile(a) * (0.95 + 0.05 * Math.sin(u * 5.3 + seed * 1.9)); }

    // the body of paint, with a slightly ragged edge
    var n = Math.max(20, Math.min(160, Math.round((aEnd - a0) / 4))), jit = Math.min(1.8, 0.45 + T * 0.012);
    var top = [], bot = [], i, a;
    for (i = 0; i <= n; i++) {
      a = a0 + (aEnd - a0) * i / n;
      var cc = centre(a), hh = half(a), e = i === 0 ? 0 : jit;
      top.push(P(a, cc - hh - (rnd(seed + i * 1.31) - 0.35) * e));
      bot.push(P(a, cc + hh + (rnd(seed * 2 + i * 1.77) - 0.35) * e));
    }
    var body = 'M' + top.join('L') + 'L' + bot.reverse().join('L') + 'Z';

    // the body runs out in ragged, tapering bristle fingers (a comb-shaped mask), not a straight edge
    var comb0 = a0 + (aEnd - a0) * (o.comb != null ? o.comb : 0.8);
    if (o.solid != null) comb0 = Math.max(comb0, Math.min(o.solid, aEnd - 6));
    var fingers = '', fw = Math.max(2.2, Math.min(6, T / 16)), reachMax = aEnd + (a1 - aEnd) * 0.3;
    for (var x = C / 2 - T / 2 - 2, q = 0; x < C / 2 + T / 2 + 2; x += fw * 0.62, q++) {
      var reachF = comb0 + (reachMax - comb0) * (0.12 + 0.88 * Math.pow(rnd(seed + q * 0.731), 0.7));
      fingers += 'M' + P(comb0 - 1, x - fw / 2) + 'L' + P(comb0 - 1, x + fw / 2) + 'L' + P(reachF, x + (rnd(seed + q) - 0.5) * fw * 0.6) + 'Z';
    }
    var solid = vert ? '<rect x="0" y="0" width="' + w + '" height="' + f(comb0) + '" fill="#fff"/>' : '<rect x="0" y="0" width="' + f(comb0) + '" height="' + h + '" fill="#fff"/>';

    // bristle streaks: lighter and deeper tones following the stroke; the lighter ones run on as dry brush
    var K = Math.max(5, Math.min(48, Math.round(T / 4.6))), streaks = '', tail = '';
    var thick = T > 150 ? 1.35 : T > 60 ? 1.1 : 0.9;
    for (var k = 0; k < K; k++) {
      var v = -0.9 + 1.8 * (k + 0.5) / K + (rnd(seed + k * 3.7) - 0.5) * (1.4 / K);
      var s0 = a0 + cap * (0.25 + 0.75 * rnd(seed + k * 5.3)) * (1 - Math.abs(v) * 0.35);
      var deep = k % 3 === 1;
      var s1 = deep ? comb0 - (comb0 - a0) * 0.2 * rnd(seed + k) : comb0 + (aEnd - comb0) * rnd(seed * 3 + k * 2.9);
      var pts = [], m = 14;
      for (var j = 0; j <= m; j++) {
        a = s0 + (s1 - s0) * j / m;
        pts.push(P(a, centre(a) + v * Math.max(profile(Math.min(a, aEnd)), T * 0.36)));
      }
      var tone = k % 3 === 0 ? c[1] : (deep ? c[2] : c[0]);
      streaks += '<path d="M' + pts.join('L') + '" stroke="' + tone + '" stroke-width="' + f((0.6 + 1.5 * rnd(seed + k * 11.3)) * thick) +
        '" stroke-opacity="' + ((0.2 + 0.42 * rnd(seed + k * 13.7)) * tex).toFixed(2) + '"/>';
      // the dry brush: separate bristles of paint, thinning out at different lengths
      var t0 = comb0 - (comb0 - a0) * (0.04 + 0.3 * rnd(seed + k * 2.2)), t1 = aEnd + (a1 - aEnd) * Math.pow(rnd(seed * 5 + k * 1.9), 0.6), tp = [];
      var vt = v * 0.94 + (rnd(seed + k * 6.1) - 0.5) * (0.9 / K);
      for (j = 0; j <= 7; j++) { a = t0 + (t1 - t0) * j / 7; tp.push(P(a, centre(a) + vt * Math.max(profile(aEnd), T * 0.36) * (1 + 0.08 * j / 7))); }
      tail += '<path d="M' + tp.join('L') + '" stroke="' + (k % 2 ? c[1] : c[0]) + '" stroke-width="' + f((0.8 + 1.7 * rnd(seed + k * 4.1)) * thick) + '" stroke-opacity="' + (0.5 + 0.4 * rnd(seed + k * 8.3)).toFixed(2) + '"/>';
    }
    // a soft sheen down one side (the paint stands up from the canvas) and a glint on the loaded tip
    var sheen = [], glint = [];
    for (i = 0; i <= 12; i++) {
      a = a0 + cap * 0.8 + (aEnd - a0 - cap) * 0.82 * i / 12;
      sheen.push(P(a, centre(a) - profile(a) * 0.46));
      var g = a0 + cap * 0.16 + cap * 2.2 * i / 12;
      glint.push(P(g, centre(g) - profile(g) * 0.72));
    }

    var across = vert ? 'x1="' + f(C / 2 - T / 2) + '" y1="0" x2="' + f(C / 2 + T / 2) + '" y2="0"' : 'x1="0" y1="' + f(C / 2 - T / 2) + '" x2="0" y2="' + f(C / 2 + T / 2) + '"';
    var along = vert ? 'x1="0" y1="' + f(aEnd) + '" x2="0" y2="' + f(a1) + '"' : 'x1="' + f(aEnd) + '" y1="0" x2="' + f(a1) + '" y2="0"';
    var box = 'maskUnits="userSpaceOnUse" x="0" y="0" width="' + w + '" height="' + h + '"';
    return '<svg class="' + (o.cls || 'brush') + '" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + w + ' ' + h + '" preserveAspectRatio="none" aria-hidden="true" focusable="false">' +
      '<defs>' +
      '<linearGradient id="' + id + 'p" gradientUnits="userSpaceOnUse" ' + across + '><stop offset="0" stop-color="' + c[1] + '"/><stop offset=".3" stop-color="' + c[0] + '"/><stop offset=".74" stop-color="' + c[0] + '"/><stop offset="1" stop-color="' + c[2] + '"/></linearGradient>' +
      '<mask id="' + id + 'm" ' + box + '>' + solid + '<path d="' + fingers + '" fill="#fff"/></mask>' +
      '<linearGradient id="' + id + 'g" gradientUnits="userSpaceOnUse" ' + along + '><stop offset="0" stop-color="#fff"/><stop offset="1" stop-color="#000"/></linearGradient>' +
      '<mask id="' + id + 'n" ' + box + '><rect width="' + w + '" height="' + h + '" fill="url(#' + id + 'g)"/></mask>' +
      '</defs>' +
      '<g mask="url(#' + id + 'm)">' + (o.shadow === false ? '' : '<path d="' + body + '" fill="#02061e" fill-opacity=".3" transform="translate(1.2 1.8)"/>') +
      '<path d="' + body + '" fill="url(#' + id + 'p)"/></g>' +
      '<g fill="none" stroke-linecap="round" stroke-linejoin="round" mask="url(#' + id + 'n)">' + tail + streaks +
      '<path d="M' + sheen.join('L') + '" stroke="' + c[1] + '" stroke-width="' + f(Math.max(2, T * 0.14)) + '" stroke-opacity="' + (0.13 * tex).toFixed(2) + '"/>' +
      '<path d="M' + glint.join('L') + '" stroke="' + c[1] + '" stroke-width="' + f(Math.max(1.1, T * 0.035)) + '" stroke-opacity="' + (0.6 * tex).toFixed(2) + '"/></g>' +
      '</svg>';
  };

  RJY.brushURL = function (w, h, o) {
    return 'url("data:image/svg+xml,' + encodeURIComponent(RJY.brush(w, h, o)) + '")';
  };
})();
