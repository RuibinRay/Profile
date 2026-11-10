/*
 * stage-lite.js — the lighter stage: the same film without WebGL.
 *
 * Used on phones and low-power devices, when WebGL 2 is missing, when the WebGL stage cannot keep
 * up, and (in its calm form) when the visitor asks for reduced motion. Each painting is two images,
 * a far layer and a cut-out foreground (tools/prepare_paintings.py), moved with CSS transforms from
 * the same storyboard cameras; the transitions are clip-paths with a brushed edge, or plain
 * cross-fades in the calm form. Only compositor properties change while scrolling.
 */
import { PAINTINGS } from './manifest.js';
import { SHOTS, sceneAt, cameraAt } from './storyboard.js';
import { clampCam, toScreen, anchorOf, ease, lerp } from './view.js';

// one jagged edge, reused for every brush sweep: how far each "bristle" runs ahead (fractions of the screen)
const BRISTLES = [0.00, 0.07, 0.02, 0.11, 0.05, 0.14, 0.03, 0.09, 0.01, 0.12, 0.06, 0.10, 0.04];

export function createLiteStage(root, opts = {}) {
  const calm = !!opts.calm;
  root.classList.add('lite');
  root.innerHTML = '';
  const ring = document.createElement('div'); ring.className = 'lite__ring';
  const dimEl = document.createElement('div'); dimEl.className = 'lite__dim';
  root.appendChild(ring); root.appendChild(dimEl);
  let W = 1, H = 1;
  const pool = {};      // painting id → { el, bg, fg, ready }
  const camA = {}, camB = {};
  const state = { shot: SHOTS[0], cam: camA, shotB: null, camB: null, mix: 0 };

  function layer(id) {
    if (pool[id]) { pool[id].used = performance.now(); return pool[id]; }
    const p = PAINTINGS[id];
    const el = document.createElement('div'); el.className = 'lite__layer'; el.style.backgroundImage = `url(${p.blur})`;
    const mk = (src) => { const i = new Image(); i.decoding = 'async'; i.alt = ''; i.draggable = false; i.src = src; el.appendChild(i); return i; };
    const bg = mk(calm ? `${p.base}-1280.webp` : p.layers.bg);
    const fg = calm ? null : mk(p.layers.fg);
    root.insertBefore(el, ring);
    // ready once the file has arrived; decoding ahead of the first paint is a bonus, never something to wait long for
    const done = (img) => (!img ? Promise.resolve() : new Promise((r) => { if (img.complete) r(); else { img.onload = img.onerror = r; } })
      .then(() => (img.decode ? Promise.race([img.decode().catch(() => {}), new Promise((r) => setTimeout(r, 250))]) : null)));
    const L = { el, bg, fg, used: performance.now() };
    L.ready = Promise.all([done(bg), done(fg)]).then(() => { el.classList.add('is-ready'); });
    pool[id] = L;
    return L;
  }
  function needed(t) {
    const sc = sceneAt(t), ids = [];
    const add = (s) => { if (s && ids.indexOf(s.painting) === -1) ids.push(s.painting); };
    add(sc.a); add(sc.b); add(SHOTS[(sc.b || sc.a).index + 1]); add(SHOTS[sc.a.index - 1]);
    return ids;
  }
  function ready(t) {
    const sc = sceneAt(t), ids = needed(t);
    ids.forEach(layer);
    Object.keys(pool).forEach((id) => { if (ids.indexOf(id) === -1) { pool[id].el.remove(); delete pool[id]; } });
    return Promise.all([sc.a.painting].concat(sc.b ? [sc.b.painting] : []).map((id) => layer(id).ready));
  }

  function resize() { W = root.clientWidth || window.innerWidth; H = root.clientHeight || window.innerHeight; }

  function pose(L, shot, c) {
    const ia = PAINTINGS[shot.painting].aspect;
    if (calm) { c.z = Math.min(c.z, 1.35); c.d = 0; }
    clampCam(c, ia, W / H);
    const w = W / H > ia ? W : H * ia, h = w / ia;
    const set = (img, z) => {
      if (!img) return;
      if (img._w !== w) { img.style.width = w + 'px'; img.style.height = h + 'px'; img._w = w; }
      img.style.transform = `translate3d(${(W / 2 - c.x * w * z).toFixed(2)}px,${(H / 2 - c.y * h * z).toFixed(2)}px,0) scale(${z.toFixed(4)})`;
    };
    set(L.bg, c.z);
    set(L.fg, c.z * (1 + c.d * 0.07));     // the foreground comes forward a little faster than the far layer
  }

  function wipe(m, dir) {
    // a polygon whose leading edge is ragged, like the side of a loaded brush
    const pts = [], n = BRISTLES.length, down = Math.abs(dir[1]) > Math.abs(dir[0]);
    const lead = lerp(-0.2, 1.22, m);
    if (down) {
      pts.push('0% 0%', '100% 0%');
      for (let i = n - 1; i >= 0; i--) pts.push(`${(i / (n - 1) * 100).toFixed(1)}% ${((lead + BRISTLES[i] * 1.4 - 0.1) * 100).toFixed(1)}%`);
    } else {
      pts.push('0% 0%');
      for (let i = 0; i < n; i++) pts.push(`${((lead + BRISTLES[i] - 0.06 + (i / n) * 0.08) * 100).toFixed(1)}% ${(i / (n - 1) * 100).toFixed(1)}%`);
      pts.push('0% 100%');
    }
    return `polygon(${pts.join(',')})`;
  }

  let shownA = null, shownB = null;
  function render(t) {
    const sc = sceneAt(t);
    const A = layer(sc.a.painting);
    cameraAt(sc.a, t, camA);
    pose(A, sc.a, camA);
    state.shot = sc.a; state.cam = camA; state.shotB = null; state.camB = null; state.mix = 0;
    let dim = camA.dim, B = null;
    if (sc.b) {
      B = layer(sc.b.painting);
      cameraAt(sc.b, t, camB);
      pose(B, sc.b, camB);
      const tr = sc.tr, m = sc.mix, g = ease.smooth(m);
      dim = lerp(camA.dim, camB.dim, g);
      state.shotB = sc.b; state.camB = camB; state.mix = g;
      let clip = '', op = 1, ringOp = 0;
      if (calm) op = g;
      else if (tr.type === 'portal') {
        const o = toScreen(camA, PAINTINGS[sc.a.painting].aspect, W, H, anchorOf(sc.a.painting, tr.a));
        const ox = lerp(Math.min(W, Math.max(0, o.x)), W / 2, g * 0.6), oy = lerp(Math.min(H, Math.max(0, o.y)), H / 2, g * 0.6);
        const r = Math.pow(m, 1.7) * Math.hypot(W, H) * 1.05;
        clip = `circle(${r.toFixed(1)}px at ${ox.toFixed(1)}px ${oy.toFixed(1)}px)`;
        ringOp = Math.sin(Math.PI * m);
        ring.style.transform = `translate3d(${ox.toFixed(1)}px,${oy.toFixed(1)}px,0) scale(${(r / 100).toFixed(3)})`;
      } else if (tr.type === 'swirl') {
        op = g;
        A.el.style.transform = `rotate(${(g * g * 10).toFixed(2)}deg) scale(${(1 + g * 0.18).toFixed(3)})`;
        B.el.style.transform = `rotate(${(-(1 - g) * (1 - g) * 10).toFixed(2)}deg) scale(${(1.18 - g * 0.18).toFixed(3)})`;
      } else clip = wipe(g, tr.dir || [1, 0]);
      B.el.style.clipPath = clip; B.el.style.webkitClipPath = clip;
      B.el.style.opacity = op;
      ring.style.opacity = ringOp;
    } else ring.style.opacity = 0;
    const swirling = !!(sc.b && !calm && sc.tr.type === 'swirl');
    if (!swirling && wasSwirling) Object.keys(pool).forEach((id) => { pool[id].el.style.transform = ''; });
    wasSwirling = swirling;
    // show only the layers on stage, the incoming one on top
    if (shownA !== A || shownB !== B) {
      Object.keys(pool).forEach((id) => {
        const L = pool[id], on = L === A || L === B;
        L.el.style.visibility = on ? 'visible' : 'hidden';
        L.el.style.zIndex = L === B ? 2 : 1;
        if (L !== B) { L.el.style.clipPath = ''; L.el.style.webkitClipPath = ''; L.el.style.opacity = 1; }
      });
      shownA = A; shownB = B;
    }
    state.dim = dim;
    dimEl.style.opacity = Math.min(0.75, dim * 1.15).toFixed(3);
  }
  let wasSwirling = false;

  resize();
  return {
    kind: 'lite', calm, state, globe: null,
    ready, render, resize,
    info() { return { tier: calm ? 'calm' : 'lite' }; },
    setPointer() {}, setPaused() {}, setTier() {},
    size() { return { W, H }; },
    dispose() { root.innerHTML = ''; root.classList.remove('lite'); }
  };
}
