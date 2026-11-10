/*
 * globe.js — the painted globe of chapter four.
 *
 * The countries come from data/world.js (Natural Earth, the same file the flat atlas uses) and their
 * colours from data/travel.js: only countries marked home, visited or current are lit. The whole map
 * is brushed onto one canvas, wrapped around a sphere and shaded like a ball of wet paint. The page
 * tells the globe where on screen to sit (`place`), which country to turn toward (`face`) and reads
 * back which country is under the pointer (`pick`).
 */
import { GLOBE_VERT, GLOBE_FRAG, HALO_FRAG } from './shaders.js';

const FILL = { none: '#3b4a96', visited: '#f6c443', home: '#f6c443', current: '#3fbf86', wishlist: '#b5c0f0' };
const LIT = { home: 1, visited: 1, current: 1 };

export function createGlobe(THREE, scene, noise) {
  const group = new THREE.Group();
  group.visible = false;
  scene.add(group);
  const uniforms = { tMap: { value: null }, tNoise: { value: noise }, uAlpha: { value: 0 }, uTime: { value: 0 } };
  const ball = new THREE.Mesh(new THREE.SphereGeometry(1, 72, 48), new THREE.ShaderMaterial({ uniforms, vertexShader: GLOBE_VERT, fragmentShader: GLOBE_FRAG, transparent: true }));
  const spin = new THREE.Group();          // the turning part: the ball and its pins
  spin.add(ball);
  group.add(spin);
  const haloU = { uAlpha: { value: 0 } };
  const halo = new THREE.Mesh(new THREE.PlaneGeometry(2.9, 2.9), new THREE.ShaderMaterial({
    uniforms: haloU, vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: HALO_FRAG, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  halo.position.z = -1.2; halo.renderOrder = -1;
  group.add(halo);

  let G = null, features = [], bounds = {}, statusOf = () => 'none', built = false, pins = null;
  const view = { lon: -84, lat: 10, tlon: -84, tlat: 10, alpha: 0, talpha: 0, scale: 1, dragging: false, idle: 0 };
  const q = new THREE.Quaternion(), v = new THREE.Vector3();
  const rect = { cx: 0, cy: 0, r: 100 };

  function ring(ctx, pts, W, H, dx) {
    let prev = null, shift = 0;
    for (let i = 0; i < pts.length; i++) {
      let lon = pts[i][0];
      if (prev != null) { if (lon - prev > 180) shift -= 360; else if (lon - prev < -180) shift += 360; }
      prev = lon;
      const x = (lon + shift + 180) / 360 * W + dx, y = (90 - pts[i][1]) / 180 * H;
      if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y);
    }
    ctx.closePath();
  }
  function shape(ctx, f, W, H) {
    const g = f.geometry; if (!g) return;
    const polys = g.type === 'Polygon' ? [g.coordinates] : g.type === 'MultiPolygon' ? g.coordinates : [];
    ctx.beginPath();
    polys.forEach((poly) => poly.forEach((r) => { ring(ctx, r, W, H, 0); ring(ctx, r, W, H, -W); ring(ctx, r, W, H, W); }));
  }

  function paintMap(size) {
    const W = size, H = size / 2;
    const c = document.createElement('canvas'); c.width = W; c.height = H;
    const x = c.getContext('2d');
    let s = 1234567; const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
    const k = W / 2048;
    // the sea: a field of ultramarine dabs that follow a slow swirl
    x.fillStyle = '#14318f'; x.fillRect(0, 0, W, H);
    const blues = ['#0d2374', '#1a3fa6', '#2b5bd0', '#4379e0', '#0a1a5c', '#6f9df0', '#1c4bb8'];
    x.lineCap = 'round';
    for (let i = 0; i < 5200; i++) {
      const px = rnd() * W, py = rnd() * H;
      const a = Math.sin(px / W * 12.566 + py / H * 5) * 0.7 + Math.cos(py / H * 9) * 0.4;
      const len = (14 + rnd() * 30) * k;
      x.strokeStyle = blues[(rnd() * blues.length) | 0]; x.globalAlpha = 0.3 + rnd() * 0.4; x.lineWidth = (2 + rnd() * 5) * k;
      x.beginPath(); x.moveTo(px, py);
      x.quadraticCurveTo(px + Math.cos(a) * len * 0.5, py + Math.sin(a) * len * 0.5 + (rnd() - 0.5) * 6 * k, px + Math.cos(a) * len, py + Math.sin(a) * len);
      x.stroke();
    }
    x.globalAlpha = 1;
    // the land, on its own layer so its brushwork stays inside the coasts
    const lc = document.createElement('canvas'); lc.width = W; lc.height = H;
    const l = lc.getContext('2d');
    features.forEach((f) => { shape(l, f, W, H); l.fillStyle = FILL.none; l.fill(); });
    l.globalCompositeOperation = 'source-atop';
    const violets = ['#2f3d86', '#4a5bb0', '#5a6cc4', '#33408c', '#6b7bd0'];
    l.lineCap = 'round';
    for (let i = 0; i < 3600; i++) {
      const px = rnd() * W, py = rnd() * H, a = rnd() * 6.283, len = (8 + rnd() * 18) * k;
      l.strokeStyle = violets[(rnd() * violets.length) | 0]; l.globalAlpha = 0.35 + rnd() * 0.35; l.lineWidth = (2 + rnd() * 4) * k;
      l.beginPath(); l.moveTo(px, py); l.lineTo(px + Math.cos(a) * len, py + Math.sin(a) * len); l.stroke();
    }
    l.globalAlpha = 1; l.globalCompositeOperation = 'source-over';
    features.forEach((f) => { shape(l, f, W, H); l.strokeStyle = 'rgba(8, 16, 70, .55)'; l.lineWidth = 1.1 * k; l.stroke(); });
    x.drawImage(lc, 0, 0);
    // the countries I know: lit, with a soft halo so even a small one can be found
    features.forEach((f) => {
      const st = statusOf(f.id);
      if (!LIT[st] && st !== 'wishlist') return;
      shape(x, f, W, H);
      x.save();
      x.shadowColor = st === 'current' ? 'rgba(90, 230, 160, .9)' : 'rgba(255, 205, 80, .9)'; x.shadowBlur = 22 * k;
      x.fillStyle = FILL[st]; x.fill(); x.fill();
      x.restore();
      x.strokeStyle = st === 'current' ? '#0f6b46' : '#a86a10'; x.lineWidth = 1.4 * k; x.stroke();
    });
    return c;
  }

  function pinTexture() {
    const c = document.createElement('canvas'); c.width = c.height = 64;
    const x = c.getContext('2d');
    const g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.18, 'rgba(255,236,170,.95)'); g.addColorStop(0.5, 'rgba(250,196,70,.35)'); g.addColorStop(1, 'rgba(250,196,70,0)');
    x.fillStyle = g; x.fillRect(0, 0, 64, 64);
    return new THREE.CanvasTexture(c);
  }

  function lonLatToVec(lon, lat, r) {
    const L = lon * Math.PI / 180, P = lat * Math.PI / 180;
    return new THREE.Vector3(Math.cos(P) * Math.cos(L) * r, Math.sin(P) * r, -Math.cos(P) * Math.sin(L) * r);
  }

  /** Build the map once the country borders are loaded. `status(code)` → home | visited | current | wishlist | none. */
  function build(geo, world, status, size) {
    G = geo; statusOf = status;
    features = G.feature(world, world.objects.countries).features.filter((f) => f.id !== 'ATA');
    features.forEach((f) => { bounds[f.id] = G.geoBounds(f); });
    const tex = new THREE.CanvasTexture(paintMap(size || 2048));
    tex.wrapS = THREE.RepeatWrapping; tex.anisotropy = 4;
    if (uniforms.tMap.value) uniforms.tMap.value.dispose();
    uniforms.tMap.value = tex;
    if (pins) { spin.remove(pins); pins.geometry.dispose(); }
    const lit = features.filter((f) => LIT[statusOf(f.id)]);
    const pos = new Float32Array(lit.length * 3);
    lit.forEach((f, i) => { const c = G.geoCentroid(f); const p = lonLatToVec(c[0], c[1], 1.015); pos.set([p.x, p.y, p.z], i * 3); });
    const pg = new THREE.BufferGeometry(); pg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    pins = new THREE.Points(pg, new THREE.PointsMaterial({ size: 34, map: pinTexture(), transparent: true, depthWrite: false, sizeAttenuation: false, blending: THREE.AdditiveBlending, opacity: 0 }));
    spin.add(pins);
    built = true;
  }

  function update(dt, clock, paused) {
    view.alpha += (view.talpha - view.alpha) * Math.min(1, dt * 6);
    const on = view.alpha > 0.01 && built;
    group.visible = on;
    if (!on) return;
    if (!view.dragging && !paused) { view.idle += dt; if (view.idle > 4) view.tlon += dt * 3.5; }   // a slow turn when left alone
    let dl = view.tlon - view.lon; dl = ((dl + 540) % 360) - 180;
    view.lon += dl * Math.min(1, dt * 3.2);
    view.lat += (view.tlat - view.lat) * Math.min(1, dt * 3.2);
    spin.rotation.set(view.lat * Math.PI / 180, -Math.PI / 2 - view.lon * Math.PI / 180, 0);
    const sc = rect.r * view.scale * (0.86 + 0.14 * view.alpha);
    group.scale.setScalar(sc);
    group.position.set(rect.cx, rect.cy, 0);
    uniforms.uAlpha.value = view.alpha; uniforms.uTime.value = clock;
    haloU.uAlpha.value = view.alpha;
    if (pins) pins.material.opacity = view.alpha * (0.75 + 0.25 * Math.sin(clock * 2.2));
  }

  /** Where the globe sits: centre and radius in CSS pixels, measured from the top-left of the screen. */
  function place(cx, cy, r, W, H) { rect.cx = cx - W / 2; rect.cy = H / 2 - cy; rect.r = r; rect.sx = cx; rect.sy = cy; }

  /** The longitude and latitude under a screen point, or null when the point misses the globe. */
  function lonLatAt(sx, sy) {
    const r = rect.r * view.scale;
    const x = (sx - rect.sx) / r, y = -(sy - rect.sy) / r, d = x * x + y * y;
    if (d > 1) return null;
    v.set(x, y, Math.sqrt(1 - d)).applyQuaternion(q.copy(spin.quaternion).invert());
    return [Math.atan2(-v.z, v.x) * 180 / Math.PI, Math.asin(Math.max(-1, Math.min(1, v.y))) * 180 / Math.PI];
  }
  function pick(sx, sy) {
    if (!built) return null;
    const ll = lonLatAt(sx, sy); if (!ll) return null;
    let hit = null;
    for (const f of features) {
      const b = bounds[f.id];
      const inLon = b[0][0] <= b[1][0] ? (ll[0] >= b[0][0] && ll[0] <= b[1][0]) : (ll[0] >= b[0][0] || ll[0] <= b[1][0]);
      if (!inLon || ll[1] < b[0][1] || ll[1] > b[1][1]) continue;
      if (G.geoContains(f, ll)) { hit = f; break; }
    }
    return hit ? { code: hit.id, name: (hit.properties && hit.properties.name) || hit.id, status: statusOf(hit.id) } : { code: null, lonLat: ll };
  }
  function face(code, lat) {
    const f = features.find((x) => x.id === code); if (!f) return;
    const c = G.geoCentroid(f);
    view.tlon = c[0]; view.tlat = Math.max(-50, Math.min(55, lat != null ? lat : c[1] * 0.75)); view.idle = 0;
  }

  return {
    build, update, place, pick, face, lonLatAt,
    get built() { return built; },
    show(a) { view.talpha = a; },
    turnTo(lon, lat) { view.tlon = lon; view.tlat = lat; view.idle = 0; },
    // dragging: the surface follows the finger (one radius of travel turns the globe one radian)
    drag(dx, dy) { const k = 57.3 / Math.max(40, rect.r * view.scale); view.tlon -= dx * k; view.tlat = Math.max(-70, Math.min(70, view.tlat + dy * k)); view.lon = view.tlon; view.lat = view.tlat; view.idle = 0; },
    setDragging(d) { view.dragging = d; view.idle = 0; },
    setScale(s) { view.scale = s; },
    continentOf(code) { const f = features.find((x) => x.id === code); return f && f.properties ? f.properties.cont : ''; },
    dispose() { if (uniforms.tMap.value) uniforms.tMap.value.dispose(); }
  };
}
