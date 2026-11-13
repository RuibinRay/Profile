/*
 * brush.js — the painter's brush, which goes through the whole film with the visitor.
 *
 * It is always on screen, and it always has a job, taken in turn as the film is scrolled:
 *   - writing: every heading and paragraph of the film appears under it, line by line, as if it wrote
 *     them (engine.js gives each text a brush-edged mask that the scroll slides along its lines; the
 *     brush rides that edge, with the small up and down of handwriting, and underlines the titles);
 *   - painting: it lays the strokes of a motif (brush-motifs.js) into the painting on stage; the paint
 *     itself is drawn by the stage (stage-gl.js), or on the lighter stage by the small canvas here;
 *   - sweeping: in the two transitions that are a brush or a pour of paint, it rides the wet edge;
 *   - between jobs it lifts off the canvas, flies to where the next one starts and waits there, loaded
 *     with its next colour.
 * Where it is and which colour it carries are functions of the film's time, so scrolling back takes it
 * back over the same path, lifting the paint and the words as it goes. Only its manner is live: it
 * glides rather than jumps, its handle leans into the stroke while the bristles drag behind, it presses
 * down to paint and lifts to travel, and its shadow on the canvas grows as it lifts.
 *
 * When the page opens it writes the name on the first screen by the clock (there is nothing to scroll
 * yet). It does not appear on the still stage (a small screen that asks for less motion).
 */
import { SHOTS, TRANSITIONS, cameraAt } from './storyboard.js';
import { PAINTINGS } from './manifest.js';
import { toScreen, clampCam, ease, span, lerp } from './view.js';
import { alongDash } from './brush-motifs.js';
import { measureText, applyMask, clearMask, pointAt } from './paint-text.js';

// A filbert brush lying along x, the tip of its bristles at (6, 24), the bristles meeting the ferrule
// at x = 62. Two groups: the hair (with the paint it is loaded with) and the handle with its ferrule,
// which turns a little about the joint as the brush is dragged.
const BRUSH = `
<svg viewBox="0 0 240 48" width="240" height="48" aria-hidden="true" focusable="false">
  <defs>
    <linearGradient id="pb-hair" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f3e6c6"/><stop offset=".45" stop-color="#d9bf8c"/><stop offset="1" stop-color="#8f6f42"/></linearGradient>
    <linearGradient id="pb-metal" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset=".22" stop-color="#e9e3d6"/><stop offset=".5" stop-color="#b9b1a1"/><stop offset=".78" stop-color="#7d766a"/><stop offset="1" stop-color="#4f4a42"/></linearGradient>
    <linearGradient id="pb-wood" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f39a5d"/><stop offset=".3" stop-color="#cf5527"/><stop offset=".68" stop-color="#8c2c12"/><stop offset="1" stop-color="#4b1608"/></linearGradient>
    <linearGradient id="pb-gold" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff0b8"/><stop offset=".5" stop-color="#e9b944"/><stop offset="1" stop-color="#8e6417"/></linearGradient>
    <linearGradient id="pb-wet" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".5"/><stop offset=".4" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".34"/></linearGradient>
  </defs>
  <g class="pb-hair">
    <path d="M6 24 C 11 13.5 33 10.4 64 12.6 L 64 35.4 C 33 37.6 11 34.5 6 24 Z" fill="url(#pb-hair)"/>
    <path d="M14 20 C 30 16.5 46 15.6 63 15.8 M12 24 C 30 23 46 22.6 63 22.6 M14 28 C 30 30.6 46 31.6 63 31.8 M22 15.6 C 36 13.6 50 13.2 63 13.6 M22 32.6 C 36 34.4 50 34.8 63 34.6 M30 19 C 42 18 52 18 63 18.4 M30 27.6 C 42 28.6 52 28.6 63 28.2"
          stroke="#5c4526" stroke-opacity=".32" stroke-width=".7" fill="none" stroke-linecap="round"/>
    <path class="pb-paint" d="M6 24 C 10 15.4 24 12.4 43 12.2 C 38.6 19 38.6 29 43 35.8 C 24 35.6 10 32.6 6 24 Z"/>
    <path d="M6 24 C 10 15.4 24 12.4 43 12.2 C 38.6 19 38.6 29 43 35.8 C 24 35.6 10 32.6 6 24 Z" fill="url(#pb-wet)"/>
    <path d="M10.5 20.6 C 18 16.4 28 15 38 15" stroke="#fff" stroke-opacity=".6" stroke-width="1.5" fill="none" stroke-linecap="round"/>
    <ellipse class="pb-paint" cx="7.4" cy="24" rx="3.4" ry="3"/>
    <ellipse cx="6.6" cy="23" rx="1.1" ry=".9" fill="#fff" fill-opacity=".7"/>
  </g>
  <g class="pb-handle">
    <path d="M98 13.6 C 142 15.4 200 19.2 227 21.4 Q 235.5 24 227 26.6 C 200 28.8 142 32.6 98 34.4 Z" fill="url(#pb-wood)"/>
    <path d="M102 16.8 C 142 18.3 198 21.2 226 22.9" stroke="#fff" stroke-opacity=".5" stroke-width="1.5" fill="none" stroke-linecap="round"/>
    <path d="M102 31.8 C 142 30.6 198 27.6 226 25.8" stroke="#2a0c04" stroke-opacity=".35" stroke-width="1.2" fill="none" stroke-linecap="round"/>
    <rect x="97" y="13.2" width="7.5" height="21.6" rx="1.4" fill="url(#pb-gold)"/>
    <rect x="212" y="20.1" width="4" height="7.8" rx="1" fill="url(#pb-gold)"/>
    <path d="M62 11.6 L 98 13 L 98 35 L 62 36.4 Q 59.8 24 62 11.6 Z" fill="url(#pb-metal)"/>
    <path d="M84 12.5 V35.5 M88.5 12.7 V35.3" stroke="#3f3a33" stroke-opacity=".7" stroke-width="1"/>
    <path d="M85.4 12.6 V35.4 M89.9 12.8 V35.2" stroke="#fff" stroke-opacity=".55" stroke-width=".7"/>
    <path d="M64 15.6 L 96 16.6" stroke="#fff" stroke-opacity=".8" stroke-width="1.2" stroke-linecap="round"/>
  </g>
</svg>`;

export function createBrush({ engine, getStage, work, reduced, writes }) {
  if (!work) return null;
  const root = document.documentElement;

  /* ---------- the brush on screen, and its shadow on the canvas ---------- */
  const shadow = document.createElement('div');
  shadow.className = 'painter-shadow';
  shadow.setAttribute('aria-hidden', 'true');
  const el = document.createElement('div');
  el.className = 'painter';
  el.setAttribute('aria-hidden', 'true');
  el.innerHTML = BRUSH;
  document.body.append(shadow, el);

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
  (writes || []).forEach((w) => acts.push({ kind: 'write', w, t0: w.t0, t1: w.t1, col: null }));
  // and what the chapters give it to do: the golden stroke of the journey, the colours of the palette
  (engine.jobs || []).forEach((j) => acts.push({ kind: 'job', job: j, t0: j.t0, t1: j.t1 }));
  acts.sort((a, b) => a.t0 - b.t0);
  const CREAM = [0.965, 0.925, 0.83];
  const hexRGB = (h) => [parseInt(h.slice(1, 3), 16) / 255, parseInt(h.slice(3, 5), 16) / 255, parseInt(h.slice(5, 7), 16) / 255];
  acts.forEach((a) => { if (a.kind === 'ride') a.cols = [hexRGB(a.tr.edge[0]), hexRGB(a.tr.edge[1])]; });
  /** The colour a text is set in: what the brush is loaded with to write it. */
  function inkOf(node) {
    const m = /rgba?\(([\d.]+)[, ]+([\d.]+)[, ]+([\d.]+)/.exec(getComputedStyle(node).color || '');
    return m ? [m[1] / 255, m[2] / 255, m[3] / 255] : CREAM;
  }

  let W = window.innerWidth, H = window.innerHeight;
  const cam = {};
  function camAt(shot, t) {
    cameraAt(shot, t, cam);
    if (reduced) cam.z = Math.min(cam.z, 1.4);          // the gentle film never goes in close (stage-gl.js: tame)
    return clampCam(cam, PAINTINGS[shot.painting].aspect, W / H);
  }
  /** The brush on a text of which the share pr is written: the edge of its mask, with the up and down of letters. */
  function onText(node, m, pr, col) {
    const R = node.getBoundingClientRect();
    if (!m) return { x: R.left, y: R.top + R.height / 2, ang: 0, col };
    const q = pointAt(m, pr);
    const wig = q.swash ? 0 : Math.sin(q.q * q.w / 10) * Math.min(9, q.h * 0.14);
    return { x: R.left + q.x, y: R.top + q.y + wig, ang: 0, col };
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
    if (a.kind === 'job') return a.job.at(t);
    if (a.kind === 'write') {
      if (!a.col) a.col = inkOf(a.w.el);
      return onText(a.w.el, a.w.measure(), span(t, a.t0, a.t1), a.col);
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
  const inView = (p) => ({ x: Math.min(W - 26, Math.max(26, p.x)), y: Math.min(H - 70, Math.max(56, p.y)), ang: p.ang, col: p.col });

  /** The brush at time t: on a job, or flying between two and waiting where the next one starts. */
  function at(t) {
    let i = -1;
    for (let k = 0; k < acts.length; k++) { if (acts[k].t0 <= t) i = k; else break; }
    const cur = i >= 0 ? acts[i] : null, next = acts[i + 1] || null;
    if (cur && t <= cur.t1) return { p: inView(posOf(cur, t)), busy: true, writing: cur.kind === 'write' };
    if (!next) return { p: safe(posOf(cur, cur.t1)), busy: false };
    // waiting: where the next job starts, as the camera shows it now (but not before it is near)
    const wait = safe(posOf(next, Math.max(t, next.t0 - 0.6)));
    if (!cur) return { p: wait, busy: false };
    const gap = next.t0 - cur.t1, fly = Math.min(0.38, gap * 0.8), u = span(t, cur.t1, cur.t1 + fly);
    if (u >= 1) return { p: wait, busy: false };
    const from = inView(posOf(cur, cur.t1)), e = ease.inOut(u), dist = Math.hypot(wait.x - from.x, wait.y - from.y);
    // a hand's arc: up and over
    const lift = Math.sin(Math.PI * u) * Math.min(110, dist * 0.28);
    const col = u < 0.5 ? from.col : wait.col;
    return { p: { x: lerp(from.x, wait.x, e), y: lerp(from.y, wait.y, e) - lift, ang: Math.atan2(wait.y - from.y, wait.x - from.x), col }, busy: false };
  }

  /* ---------- the name on the first screen, written by the clock ---------- */
  // Nothing has been scrolled yet when the page opens, so the first words are written in time: the
  // name, the line under it, the introduction. Scrolling during it finishes it at once.
  let intro = null;
  function startIntro(items, now, done) {
    let at0 = 0.25;
    const list = items.filter((it) => it.el).map((it) => {
      const o = { el: it.el, t0: at0, t1: at0 + it.dur, m: null, masked: false, col: inkOf(it.el), shown: false };
      it.el.style.setProperty('--paint', '0'); it.el.style.visibility = 'hidden';
      at0 += it.dur + 0.08;
      return o;
    });
    intro = { list, start: now, end: at0, done };
  }
  function endIntro() {
    if (!intro) return;
    intro.list.forEach((o) => { clearMask(o.el); o.el.style.removeProperty('--paint'); o.el.style.visibility = ''; });
    const done = intro.done; intro = null;
    if (done) done();
  }
  /** Advances the opening; returns where the brush is, or null once it is over. */
  function introAt(now, t) {
    const e = now - intro.start;
    if (e >= intro.end || t > 0.03) { endIntro(); return null; }
    let cur = null;
    intro.list.forEach((o) => {
      const pr = span(e, o.t0, o.t1);
      if (pr <= 0) return;
      if (!o.shown) { o.shown = true; o.el.style.visibility = ''; }
      if (pr >= 1) { if (o.masked) { clearMask(o.el); o.masked = false; } o.el.style.setProperty('--paint', '1'); return; }
      if (!o.m) o.m = measureText(o.el);
      if (o.m && !o.masked) { applyMask(o.el, o.m); o.masked = true; }
      o.el.style.setProperty('--paint', pr.toFixed(4));
      cur = o;
    });
    if (!cur) {                                   // between two texts, or before the first: by the one coming
      const nx = intro.list.find((o) => e < o.t0) || intro.list[intro.list.length - 1];
      if (!nx.m) nx.m = measureText(nx.el);
      return { p: onText(nx.el, nx.m, e < nx.t0 ? 0 : 1, nx.col), busy: false };
    }
    return { p: onText(cur.el, cur.m, span(e, cur.t0, cur.t1), cur.col), busy: true, writing: true };
  }

  /* ---------- per frame ---------- */
  let shown = false, lastCol = '', lastT = -1, covered = false;
  const curtain = document.querySelector('.curtain');
  let sx = null, sy = 0, lean = -0.68, bend = 0, press = 1, lift = 12;
  const rgb = (c) => 'rgb(' + Math.round(c[0] * 255) + ',' + Math.round(c[1] * 255) + ',' + Math.round(c[2] * 255) + ')';
  function show(on) { if (on !== shown) { shown = on; el.classList.toggle('is-on', on); shadow.classList.toggle('is-on', on); } }

  function update(t, s, dt) {
    const st = getStage();
    const still = !st || (st.kind === 'lite' && st.calm);
    if (still || covered) { show(false); if (lite) lite.c.style.display = 'none'; if (intro && still) endIntro(); return; }
    if (curtain && curtain.classList.contains('is-on')) { show(false); sx = null; return; }      // a jump to another chapter: it reappears there
    const sz = st.size ? st.size() : { W: window.innerWidth, H: window.innerHeight };
    W = sz.W; H = sz.H;
    const now = (intro && introAt(s, t)) || at(t);
    const p = now.p, busy = now.busy;
    const paused = root.classList.contains('is-paused');
    // it glides to where it should be: at once when it is close (so it stays on its stroke), in an arc of a
    // third of a second when the next place is far (a new job somewhere else)
    if (sx == null) { sx = p.x; sy = p.y; }
    const far = Math.hypot(p.x - sx, p.y - sy);
    const rate = Math.min(1, dt * (far > 140 ? 7 : far > 40 ? 16 : 34));
    const px = sx, py = sy;
    sx += (p.x - sx) * rate; sy += (p.y - sy) * rate;
    const vx = (sx - px) / Math.max(dt, 0.008), vy = (sy - py) / Math.max(dt, 0.008);
    // it leans with its stroke: dragged to the right the handle leans right, to the left it stands up
    const target = -0.68 + 0.3 * Math.cos(p.ang) + (busy ? 0.06 * Math.sin(p.ang) : 0) + (now.writing ? 0.1 : 0);
    lean += (target - lean) * Math.min(1, dt * 8);
    // the handle leads and the bristles drag: the handle turns about the ferrule toward the way it is going
    const nx = -Math.sin(lean), ny = Math.cos(lean);
    const want = Math.max(-15, Math.min(15, (vx * nx + vy * ny) * 0.02));
    bend += (want - bend) * Math.min(1, dt * 10);
    // pressed down to paint (the bristles spread), lifted to travel
    press += ((busy ? 1.16 : 0.96) - press) * Math.min(1, dt * 9);
    lift += ((busy ? 0 : 13) - lift) * Math.min(1, dt * 7);
    let x = sx, y = sy - lift, rot = lean;
    if (!busy && !paused && !reduced) { y += Math.sin(s * 1.7) * 3; rot += Math.sin(s * 1.3) * 0.035; }   // a hand, waiting
    el.style.transform = `translate3d(${x.toFixed(1)}px,${y.toFixed(1)}px,0) rotate(${rot.toFixed(3)}rad)`;
    el.style.setProperty('--bend', bend.toFixed(2) + 'deg');
    el.style.setProperty('--press', press.toFixed(3));
    // its shadow stays on the canvas: small and dark when it touches, wide and faint when it is lifted
    const k = lift / 13;
    shadow.style.transform = `translate3d(${(sx + 5 + 9 * k).toFixed(1)}px,${(sy + 6 + 13 * k).toFixed(1)}px,0) scale(${(0.7 + 0.9 * k).toFixed(3)})`;
    shadow.style.opacity = shown ? (0.5 - 0.26 * k).toFixed(3) : '0';
    const col = rgb(p.col);
    if (col !== lastCol) { lastCol = col; el.style.setProperty('--paint-col', col); }
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
    /** Write these texts by the clock, one after another: [{ el, dur (seconds) }]. `done` runs when it is over. */
    intro(items, done) { startIntro(items, performance.now() / 1000, done); },
    endIntro,
    el
  };
}
