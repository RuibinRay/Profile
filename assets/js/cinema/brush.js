/*
 * brush.js — the painter's brush, which goes through the whole film with the visitor.
 *
 * It is always on screen, and it always has a job, taken in turn as the film is scrolled:
 *   - painting: it lays the strokes of a motif (brush-motifs.js) into the painting on stage, stroke by
 *     stroke; the paint itself is drawn by the stage (stage-gl.js), or on the lighter stage by the
 *     small canvas here;
 *   - writing: it writes each chapter's title, which appears behind it as if painted (engine.js gives
 *     the title a brush-edged mask that it scrubs open);
 *   - sweeping: in the two transitions that are a brush or a pour of paint, it rides the wet edge;
 *   - between jobs it flies to where the next one starts and waits there, loaded with its next colour.
 * Where it is, which way it leans and which colour it carries are all functions of the film's time, so
 * scrolling back takes it back over the same path, lifting the paint as it goes.
 *
 * It does not appear on the still stage (a small screen that asks for less motion).
 */
import { SHOTS, TRANSITIONS, cameraAt } from './storyboard.js';
import { PAINTINGS } from './manifest.js';
import { toScreen, clampCam, ease, span, lerp } from './view.js';
import { alongDash } from './brush-motifs.js';

const SVGNS = 'http://www.w3.org/2000/svg';
// A filbert brush, drawn lying along x with the tip of its bristles at (4, 16): bristles loaded with
// paint, a crimped metal ferrule, and a lacquered handle with a gold band.
const BRUSH = `
<svg viewBox="0 0 168 32" width="168" height="32" aria-hidden="true" focusable="false">
  <defs>
    <linearGradient id="pb-metal" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fbf7ee"/><stop offset=".45" stop-color="#c9c2b4"/><stop offset="1" stop-color="#6f695f"/></linearGradient>
    <linearGradient id="pb-wood" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e0703c"/><stop offset=".5" stop-color="#a8401f"/><stop offset="1" stop-color="#5e200f"/></linearGradient>
    <linearGradient id="pb-hair" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#cdb487"/><stop offset="1" stop-color="#efe1c2"/></linearGradient>
  </defs>
  <path d="M70 9.6 C 108 11.2 148 12.4 161 12.8 Q 166.5 16 161 19.2 C 148 19.6 108 20.8 70 22.4 Z" fill="url(#pb-wood)"/>
  <path d="M72 11.4 C 108 12.6 146 13.4 160 13.7" stroke="#fff" stroke-opacity=".35" stroke-width="1.2" fill="none" stroke-linecap="round"/>
  <rect x="147" y="12.4" width="4.5" height="7.2" rx="1" fill="#e8bd4f"/>
  <rect x="43" y="8.6" width="28" height="14.8" rx="2.4" fill="url(#pb-metal)"/>
  <path d="M61 8.8 V23.2 M64 8.8 V23.2" stroke="#6d675d" stroke-width=".9"/>
  <path d="M4 16 C 8 9.4 21 7.6 44 9.2 L 44 22.8 C 21 24.4 8 22.6 4 16 Z" fill="url(#pb-hair)"/>
  <path class="pb-paint" d="M4 16 C 7.4 10.6 15.5 8.9 28 9.5 C 25 13 25 19 28 22.5 C 15.5 23.1 7.4 21.4 4 16 Z"/>
  <path d="M6.5 14.6 C 13 11.6 20 10.8 27 11" stroke="#fff" stroke-opacity=".45" stroke-width="1.1" fill="none" stroke-linecap="round"/>
  <path d="M9 18.6 C 18 20 30 20.4 42 20.6 M12 16.4 C 22 16.8 32 16.6 42 16.2 M10 13.4 C 20 12.4 30 12 42 12" stroke="#5a4a32" stroke-opacity=".22" stroke-width=".6" fill="none"/>
</svg>`;

export function createBrush({ engine, getStage, work, reduced, writes }) {
  if (!work) return null;
  const root = document.documentElement;

  /* ---------- the brush on screen ---------- */
  const el = document.createElement('div');
  el.className = 'painter';
  el.setAttribute('aria-hidden', 'true');
  el.innerHTML = BRUSH;
  document.body.appendChild(el);

  /* ---------- the paint, on the lighter stage ---------- */
  // The WebGL stage paints the strokes into the painting itself. The lighter stage (phones) has no
  // shader, so the same strokes are drawn here, on a canvas laid over its pictures.
  let lite = null;
  function liteCanvas() {
    if (lite) return lite;
    const c = document.createElement('canvas');
    c.className = 'cine-stage__paint';
    const host = document.querySelector('.cine-stage');
    if (host) host.appendChild(c);
    lite = { c, g: c.getContext('2d'), w: 0, h: 0, dpr: 1 };
    return lite;
  }

  /* ---------- its jobs ---------- */
  const shotById = {};
  SHOTS.forEach((s) => { shotById[s.id] = s; });
  const acts = work.acts.slice();
  // the brush and the pour: the brush rides their wet edge (the gentle film cross-fades instead)
  if (!reduced) TRANSITIONS.filter((tr) => tr.type === 'brush' || tr.type === 'pour').forEach((tr) => acts.push({ kind: 'ride', tr, t0: tr.span[0], t1: tr.span[1] }));
  (writes || []).forEach((w) => acts.push({ kind: 'write', el: w.el, t0: w.t0, t1: w.t1, rect: null }));
  acts.sort((a, b) => a.t0 - b.t0);
  const CREAM = [0.965, 0.925, 0.83];
  const hexRGB = (h) => [parseInt(h.slice(1, 3), 16) / 255, parseInt(h.slice(3, 5), 16) / 255, parseInt(h.slice(5, 7), 16) / 255];
  acts.forEach((a) => { if (a.kind === 'ride') a.cols = [hexRGB(a.tr.edge[0]), hexRGB(a.tr.edge[1])]; });
  engine.onResize(() => acts.forEach((a) => { a.rect = null; }));

  let W = window.innerWidth, H = window.innerHeight;
  const cam = {};
  function camAt(shot, t) {
    cameraAt(shot, t, cam);
    if (reduced) cam.z = Math.min(cam.z, 1.4);          // the gentle film never goes in close (stage-gl.js: tame)
    return clampCam(cam, PAINTINGS[shot.painting].aspect, W / H);
  }

  /** Where the brush is at time t while doing job `a`: screen point, direction of travel, paint colour. */
  function posOf(a, t) {
    if (a.kind === 'paint') {
      const n = a.dashes.length;
      const i = Math.max(0, Math.min(n - 1, Math.floor((t - a.t0) / a.slot)));
      const d = a.dashes[i], g = Math.max(0, Math.min(1, (t - d.b) / d.d));
      const P = alongDash(d, d.L * g), c = camAt(shotById[a.shot], t);
      const p = toScreen(c, a.ia, W, H, [P.X / a.ia, P.Y]);
      return { x: p.x, y: p.y, ang: P.a - (c.r || 0), col: d.col };
    }
    if (a.kind === 'write') {
      if (!a.rect) { const r = a.el.getBoundingClientRect(); a.rect = { l: r.left, t: r.top, w: r.width, h: r.height }; }
      const r = a.rect, pr = span(t, a.t0, a.t1);
      const lines = Math.max(1, Math.round(r.h / 90));
      // the revealing edge of the title's mask (see .is-painted in cinema.css), worked up and down the lines
      const x = r.l + Math.max(0, Math.min(1, 1.3 * pr - 0.15)) * r.w;
      const y = r.t + r.h * (0.5 + 0.36 * Math.sin(pr * Math.PI * (4 + 3 * lines)));
      return { x, y, ang: 0, col: CREAM };
    }
    // ride: the leading edge of the brush or pour transition (shaders.js), worked up and down along it
    const tr = a.tr, m = ease.smooth(span(t, tr.span[0], tr.span[1])), asp = W / H;
    let dx = tr.dir[0], dy = -tr.dir[1];
    const l = Math.hypot(dx, dy) || 1; dx /= l; dy /= l;
    const sp = 0.5 * (Math.abs(dx) * asp + Math.abs(dy));
    const lead = lerp(-sp - 0.62, sp + 0.06, m) + 0.31, across = 0.34 * Math.sin(m * Math.PI * 5);
    const ux = 0.5 + (dx * lead - dy * across) / asp, uy = 0.5 + dy * lead + dx * across;
    const c0 = a.cols[0], c1 = a.cols[1];
    return { x: ux * W, y: (1 - uy) * H, ang: Math.atan2(-dy, dx), col: [lerp(c0[0], c1[0], m), lerp(c0[1], c1[1], m), lerp(c0[2], c1[2], m)] };
  }
  const safe = (p) => ({ x: Math.min(W * 0.94, Math.max(W * 0.06, p.x)), y: Math.min(H * 0.84, Math.max(H * 0.14, p.y)), ang: p.ang, col: p.col });
  // at work on strokes the screen does not show (a narrow phone, say), it stays in view at the edge, still working
  const inView = (p) => ({ x: Math.min(W - 26, Math.max(26, p.x)), y: Math.min(H - 70, Math.max(70, p.y)), ang: p.ang, col: p.col });

  /** The brush at time t: on a job, or flying between two and waiting where the next one starts. */
  function at(t) {
    let i = -1;
    for (let k = 0; k < acts.length; k++) { if (acts[k].t0 <= t) i = k; else break; }
    const cur = i >= 0 ? acts[i] : null, next = acts[i + 1] || null;
    if (cur && t <= cur.t1) return { p: inView(posOf(cur, t)), busy: true };
    if (!next) return { p: safe(posOf(cur, cur.t1)), busy: false };
    // waiting: where the next job starts, as the camera shows it now (but not before it is near)
    const wait = safe(posOf(next, Math.max(t, next.t0 - 0.6)));
    if (!cur) return { p: wait, busy: false };
    const gap = next.t0 - cur.t1, fly = Math.min(0.38, gap * 0.7), u = span(t, cur.t1, cur.t1 + fly);
    if (u >= 1) return { p: wait, busy: false };
    const from = posOf(cur, cur.t1), e = ease.inOut(u), dist = Math.hypot(wait.x - from.x, wait.y - from.y);
    // a hand's arc: up and over
    const lift = Math.sin(Math.PI * u) * Math.min(110, dist * 0.28);
    const col = u < 0.5 ? from.col : wait.col;
    return { p: { x: lerp(from.x, wait.x, e), y: lerp(from.y, wait.y, e) - lift, ang: Math.atan2(wait.y - from.y, wait.x - from.x), col }, busy: false };
  }

  /* ---------- per frame ---------- */
  let shown = false, lean = -0.68, lastCol = '', lastT = -1, covered = false;
  const rgb = (c) => 'rgb(' + Math.round(c[0] * 255) + ',' + Math.round(c[1] * 255) + ',' + Math.round(c[2] * 255) + ')';
  function show(on) { if (on !== shown) { shown = on; el.classList.toggle('is-on', on); } }

  function update(t, s, dt) {
    const st = getStage();
    const still = !st || (st.kind === 'lite' && st.calm);
    if (still || covered) { show(false); if (lite) lite.c.style.display = 'none'; return; }
    const sz = st.size ? st.size() : { W: window.innerWidth, H: window.innerHeight };
    W = sz.W; H = sz.H;
    const { p, busy } = at(t);
    const paused = root.classList.contains('is-paused');
    // it leans with its stroke: dragged to the right the handle leans right, to the left it stands up
    const target = -0.68 + 0.3 * Math.cos(p.ang) + (busy ? 0.06 * Math.sin(p.ang) : 0);
    lean += (target - lean) * Math.min(1, dt * 9);
    let x = p.x, y = p.y, rot = lean;
    if (!busy && !paused && !reduced) { y += Math.sin(s * 1.7) * 3; rot += Math.sin(s * 1.3) * 0.035; }   // a hand, waiting
    el.style.transform = `translate3d(${x.toFixed(1)}px,${y.toFixed(1)}px,0) rotate(${rot.toFixed(3)}rad)`;
    const col = rgb(p.col);
    if (col !== lastCol) { lastCol = col; el.style.setProperty('--paint-col', col); }
    el.classList.toggle('is-busy', busy);
    show(true);
    if (st.kind === 'lite') { if (Math.abs(t - lastT) > 1e-5 || !lite) drawLite(st, t); }
    else if (lite) lite.c.style.display = 'none';
    lastT = t;
  }

  /** The strokes on the lighter stage: the same strokes, drawn flat onto a canvas over its pictures. */
  function drawLite(st, t) {
    const L = liteCanvas(), dpr = Math.min(1.5, window.devicePixelRatio || 1);
    L.c.style.display = '';
    if (L.w !== W || L.h !== H || L.dpr !== dpr) { L.w = W; L.h = H; L.dpr = dpr; L.c.width = Math.round(W * dpr); L.c.height = Math.round(H * dpr); }
    const g = L.g;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, W, H);
    g.lineCap = 'round'; g.lineJoin = 'round';
    const layer = (shot, c, alpha) => {
      const bk = shot && work.byPainting[shot.painting];
      if (!bk || t < bk.first || alpha <= 0.01) return;
      const ia = bk.ia, fit = W / H > ia ? ia / (W / H) : 1, unit = c.z / fit * H;
      for (let i = 0; i < bk.dashes.length; i++) {
        const d = bk.dashes[i];
        if (d.b >= t) break;                               // in the order they are painted
        const gr = Math.min(1, (t - d.b) / d.d);
        g.beginPath();
        for (let j = 0; j <= 4; j++) {
          const P = alongDash(d, d.L * gr * j / 4), q = toScreen(c, ia, W, H, [P.X / ia, P.Y]);
          if (j) g.lineTo(q.x, q.y); else g.moveTo(q.x, q.y);
        }
        const w = Math.max(1, d.w * unit);
        g.globalAlpha = alpha * 0.92; g.strokeStyle = rgb(d.col); g.lineWidth = w; g.stroke();
        g.globalAlpha = alpha * 0.22; g.strokeStyle = '#fff'; g.lineWidth = w * 0.3; g.stroke();
      }
    };
    const s = st.state;
    layer(s.shot, s.cam, 1 - (s.shotB ? s.mix : 0));
    if (s.shotB) layer(s.shotB, s.camB, s.mix);
    g.globalAlpha = 1;
  }

  return {
    update,
    /** The film is covered (menu, a panel): the brush steps out of the way. */
    cover(on) { covered = on; if (on) show(false); },
    el
  };
}
