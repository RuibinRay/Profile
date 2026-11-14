/*
 * globe-flat.js — the painted globe without WebGL, for the lighter stage.
 *
 * The WebGL stage draws the globe of chapter four as a lit sphere (globe.js). The lighter stage —
 * phones, and any computer where the WebGL stage is not running (no WebGL 2, a graphics chip that
 * cannot keep up, a browser with hardware acceleration switched off) — had no globe at all. This one
 * looks the same and answers to the same calls (build, place, face, show, drag, pick), but is drawn on
 * an ordinary canvas: every pixel of the disc is turned back into a longitude and latitude
 * (orthographic projection) and takes its colour from the same painted map, shaded like a ball of
 * wet paint. The lit countries get a glowing pin. It redraws only when it has turned.
 */
import { paintMap, readCountries, pickCountry, LIT } from './globe.js';

const D = Math.PI / 180;

export function createFlatGlobe(host) {
  const cv = document.createElement('canvas');
  cv.className = 'globe-flat';
  cv.setAttribute('aria-hidden', 'true');
  host.appendChild(cv);
  const g = cv.getContext('2d');
  let G = null, features = [], bounds = {}, statusOf = () => 'none', built = false;
  let map = null, mw = 0, mh = 0, pins = [];
  let N = 0, img = null, disc = null;          // the disc's pixels, and where each lies on the unit sphere
  const view = { lon: -84, lat: 10, tlon: -84, tlat: 10, alpha: 0, talpha: 0, scale: 1, dragging: false, idle: 0, paused: false };
  const rect = { sx: 0, sy: 0, r: 100 };
  let drawn = '', raf = 0, last = 0;

  /** The disc at N × N pixels: for each pixel inside it, its x, y (up) and z (towards the viewer), and its light. */
  function size(n) {
    if (n === N) return;
    N = n; cv.width = cv.height = N;
    img = g.createImageData(N, N);
    disc = { x: new Float32Array(N * N), y: new Float32Array(N * N), z: new Float32Array(N * N), lit: new Float32Array(N * N), a: new Float32Array(N * N) };
    const L = [-0.48, 0.58, 0.66], ln = Math.hypot(L[0], L[1], L[2]);
    for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
      const k = j * N + i, x = (i + 0.5) / N * 2 - 1, y = 1 - (j + 0.5) / N * 2, d = x * x + y * y;
      const edge = Math.min(1, Math.max(0, (1 - Math.sqrt(d)) * N * 0.5));     // a soft, anti-aliased rim
      disc.a[k] = edge;
      if (edge <= 0) continue;
      const z = Math.sqrt(Math.max(0, 1 - d));
      disc.x[k] = x; disc.y[k] = y; disc.z[k] = z;
      const dot = (x * L[0] + y * L[1] + z * L[2]) / ln;
      const spec = Math.pow(Math.max(0, dot), 24) * 0.35;
      // lit from the upper left, darker towards the rim, a wet highlight
      disc.lit[k] = (0.5 + 0.62 * Math.max(0, dot)) * (0.72 + 0.28 * z) + spec;
    }
  }

  /** Paint the disc for the current turn. */
  function paint() {
    const key = N + ':' + view.lon.toFixed(2) + ':' + view.lat.toFixed(2);
    if (key === drawn || !map) return;
    drawn = key;
    const px = img.data, src = map, l0 = view.lon * D, p0 = view.lat * D, sp = Math.sin(p0), cp = Math.cos(p0);
    for (let k = 0, n = N * N; k < n; k++) {
      const a = disc.a[k], o = k * 4;
      if (a <= 0) { px[o + 3] = 0; continue; }
      const x = disc.x[k], y = disc.y[k], z = disc.z[k];
      // orthographic projection, inverted: the point of the sphere under this pixel
      const lat = Math.asin(Math.max(-1, Math.min(1, z * sp + y * cp)));
      let lon = l0 + Math.atan2(x, z * cp - y * sp);
      let u = (lon / (2 * Math.PI) + 0.5) % 1; if (u < 0) u += 1;
      const mx = (u * mw) | 0, my = Math.min(mh - 1, ((0.5 - lat / Math.PI) * mh) | 0), m = (my * mw + mx) * 4;
      const s = disc.lit[k];
      px[o] = Math.min(255, src[m] * s); px[o + 1] = Math.min(255, src[m + 1] * s); px[o + 2] = Math.min(255, src[m + 2] * s);
      px[o + 3] = a * 255;
    }
    g.putImageData(img, 0, 0);
    // a glowing pin on each lit country that faces us
    pins.forEach((p) => {
      const dl = p.lon * D - l0, cl = Math.cos(p.lat * D), sl = Math.sin(p.lat * D);
      const c = sp * sl + cp * cl * Math.cos(dl);
      if (c <= 0.05) return;
      const x = cl * Math.sin(dl), y = cp * sl - sp * cl * Math.cos(dl);
      const cx = (x + 1) / 2 * N, cy = (1 - y) / 2 * N, r = N * 0.03;
      const gr = g.createRadialGradient(cx, cy, 0, cx, cy, r);
      gr.addColorStop(0, 'rgba(255,255,255,' + (0.95 * c).toFixed(2) + ')'); gr.addColorStop(0.25, 'rgba(255,236,170,' + (0.8 * c).toFixed(2) + ')'); gr.addColorStop(1, 'rgba(250,196,70,0)');
      g.fillStyle = gr; g.beginPath(); g.arc(cx, cy, r, 0, Math.PI * 2); g.fill();
    });
  }

  /* ---------- its own little loop: it turns while it is on screen, and rests when it is not ---------- */
  function tick(now) {
    raf = 0;
    const dt = last ? Math.min(0.1, (now - last) / 1000) : 0.016; last = now;
    view.alpha += (view.talpha - view.alpha) * Math.min(1, dt * 6);
    cv.style.opacity = view.alpha.toFixed(3);
    cv.style.visibility = view.alpha > 0.01 && built ? 'visible' : 'hidden';
    if (view.alpha > 0.01 && built) {
      if (!view.dragging && !view.paused) { view.idle += dt; if (view.idle > 4) view.tlon += dt * 3.5; }
      let dl = view.tlon - view.lon; dl = ((dl + 540) % 360) - 180;
      view.lon += dl * Math.min(1, dt * 3.2);
      view.lat += (view.tlat - view.lat) * Math.min(1, dt * 3.2);
      paint();
    }
    if (view.alpha > 0.01 || view.talpha > 0) raf = requestAnimationFrame(tick); else last = 0;
  }
  const wake = () => { if (!raf) raf = requestAnimationFrame(tick); };

  return {
    /** Build the map once the country borders are loaded (the same call as the WebGL globe). */
    build(geo, world, status, mapSize) {
      G = geo; statusOf = status;
      ({ features, bounds } = readCountries(G, world));
      const c = paintMap(Math.min(1024, mapSize || 1024), features, statusOf);
      mw = c.width; mh = c.height;
      map = c.getContext('2d').getImageData(0, 0, mw, mh).data;
      pins = features.filter((f) => LIT[statusOf(f.id)]).map((f) => { const p = G.geoCentroid(f); return { lon: p[0], lat: p[1] }; });
      built = true; drawn = ''; wake();
    },
    get built() { return built; },
    /** Where it sits: centre and radius in CSS pixels. Its sharpness follows its size (capped, for phones). */
    place(cx, cy, r) {
      rect.sx = cx; rect.sy = cy; rect.r = r;
      const n = Math.max(160, Math.min(480, Math.round(r * 2 * Math.min(1.5, window.devicePixelRatio || 1))));
      size(n - (n % 2));
      const d = r * 2 * view.scale;
      cv.style.width = cv.style.height = d.toFixed(1) + 'px';
      cv.style.transform = `translate3d(${(cx - d / 2).toFixed(1)}px,${(cy - d / 2).toFixed(1)}px,0)`;
    },
    show(a) { view.talpha = a; if (a > 0 || view.alpha > 0.01) wake(); },
    face(code, lat) {
      const f = features.find((x) => x.id === code); if (!f) return;
      const c = G.geoCentroid(f);
      view.tlon = c[0]; view.tlat = Math.max(-50, Math.min(55, lat != null ? lat : c[1] * 0.75)); view.idle = 0; wake();
    },
    turnTo(lon, lat) { view.tlon = lon; view.tlat = lat; view.idle = 0; wake(); },
    drag(dx, dy) {
      const k = 57.3 / Math.max(40, rect.r * view.scale);
      view.tlon -= dx * k; view.tlat = Math.max(-70, Math.min(70, view.tlat + dy * k));
      view.lon = view.tlon; view.lat = view.tlat; view.idle = 0; wake();
    },
    setDragging(d) { view.dragging = d; view.idle = 0; },
    setScale(s) { view.scale = s; },
    setPaused(p) { view.paused = p; },
    /** The longitude and latitude under a screen point, or null when it misses the globe. */
    lonLatAt(sx, sy) {
      const r = rect.r * view.scale, x = (sx - rect.sx) / r, y = -(sy - rect.sy) / r, d = x * x + y * y;
      if (d > 1) return null;
      const z = Math.sqrt(1 - d), p0 = view.lat * D, sp = Math.sin(p0), cp = Math.cos(p0);
      const lat = Math.asin(Math.max(-1, Math.min(1, z * sp + y * cp)));
      let lon = view.lon + Math.atan2(x, z * cp - y * sp) / D;
      lon = ((lon + 540) % 360) - 180;
      return [lon, lat / D];
    },
    pick(sx, sy) {
      if (!built) return null;
      const ll = this.lonLatAt(sx, sy); if (!ll) return null;
      const hit = pickCountry(G, features, bounds, ll);
      return hit ? { code: hit.id, name: (hit.properties && hit.properties.name) || hit.id, status: statusOf(hit.id) } : { code: null, lonLat: ll };
    },
    continentOf(code) { const f = features.find((x) => x.id === code); return f && f.properties ? f.properties.cont : ''; },
    update() {},
    dispose() { if (raf) cancelAnimationFrame(raf); cv.remove(); }
  };
}
