/*
 * stage-gl.js — the painted stage, drawn with Three.js / WebGL.
 *
 * One full-screen shader (shaders.js) draws the painting, or two during a transition, from the
 * storyboard's cameras. Each painting is a small bundle of textures: the picture, three maps (flow and
 * depth; layer mattes; wind, water and sky), two fills (what is behind the near and the middle layer)
 * and, for the shot on stage, a close-up of the region its camera enters. A second, orthographic scene
 * carries what floats in front: motes and petals in the air, and the globe of chapter four.
 *
 * The painter's brush (brush.js) lays fresh strokes into the paintings. They are drawn each frame into
 * a "paint layer" that covers just the part of the painting in view (so they stay sharp at any zoom),
 * and the painting shader mixes that layer in at its own depth, with the same light on its ridges.
 *
 * Memory is kept low on purpose: only the paintings on stage and their neighbours hold textures, the
 * rest are released; big pictures are decoded off the main thread; the pixel ratio is capped and steps
 * down by itself when frames are slow. If even the lowest setting cannot keep up, `onTooSlow` hands
 * over to the lighter stage.
 */
import * as THREE from '../../vendor/three.module.min.js';
import { PAINTINGS } from './manifest.js';
import { SHOTS, TRANSITIONS, sceneAt, cameraAt } from './storyboard.js';
import { clampCam, toScreen, anchorOf, ease, lerp, span } from './view.js';
import { PAINT_VERT, PAINT_FRAG, DUST_VERT, DUST_FRAG, CLIP_FRAG, STROKE_VERT, STROKE_FRAG } from './shaders.js';
import { CLIPS } from './clips.js';
import { createGlobe } from './globe.js';
import { paintingURL, fillURL, best } from './formats.js';

// `size` is the widest painting file a tier may load; `high` takes the 3840 px one only when the
// canvas really has that many pixels to show it on (see texSize). `layers` turns on the three depth
// layers, the focus and the close-ups; the low tier bends one flat picture instead.
const TIERS = {
  high: { dpr: 1.75, size: 3840, relief: 1, dust: 1, layers: true },
  mid: { dpr: 1.25, size: 2560, relief: 1, dust: 1, layers: true },
  low: { dpr: 1.0, size: 1280, relief: 0, dust: 0.6, layers: false }
};
const ORDER = ['high', 'mid', 'low'];

// What hangs in the air of each painting:
// [colour A, colour B, amount, size px, drift x, drift y, wander, shape (0 = glowing mote, 1 = petal)]
const DUST = {
  night:    ['#f6c443', '#fff1c2', 0.55, 5, 0.004, 0.010, 1.0, 0],
  house:    ['#dfeaff', '#ffffff', 0.30, 5, 0.012, 0.004, 1.2, 0],
  blossom:  ['#ff8fb8', '#ffe1ec', 0.95, 13, 0.024, -0.016, 2.4, 1],
  lanterns: ['#ffb347', '#ffe9a8', 0.75, 6, 0.002, 0.016, 1.4, 0],
  yak:      ['#ffffff', '#dff3ff', 0.22, 5, 0.010, 0.002, 1.0, 0],
  bookshop: ['#ffcf7a', '#fff0cc', 0.45, 4, 0.003, 0.006, 1.0, 0],
  field:    ['#f9d55c', '#fff3bf', 0.60, 5, 0.022, 0.004, 1.6, 0],
  terraces: ['#e8fbff', '#bfe9ff', 0.28, 4, 0.006, 0.008, 1.0, 0],
  return:   ['#f6c443', '#fff6d6', 0.70, 6, 0.003, 0.008, 1.0, 0]
};
const TYPE = { portal: 0, brush: 1, pour: 1, swirl: 2, star: 3, petals: 4, lantern: 5 };

export function createGLStage(canvas, opts = {}) {
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: false, powerPreference: 'high-performance', stencil: false });
  } catch (e) { return null; }
  const gl = renderer.getContext();
  if (!gl || !renderer.capabilities.isWebGL2) { try { renderer.dispose(); } catch (e) {} return null; }
  renderer.autoClear = false;
  renderer.setClearColor(0x050a2e, 1);

  let tierName = opts.tier || 'high', tier = TIERS[tierName];
  let W = 1, H = 1, paused = false;
  const pointer = { x: 0, y: 0, tx: 0, ty: 0 };

  /* ---------- textures ---------- */
  const data = (bytes) => { const t = new THREE.DataTexture(new Uint8Array(bytes), 1, 1, THREE.RGBAFormat); t.needsUpdate = true; return t; };
  const noise = (() => {
    const n = 64, px = new Uint8Array(n * n * 4);
    let s = 20261110;
    for (let i = 0; i < px.length; i++) { s = (s * 16807) % 2147483647; px[i] = s & 255; }
    const t = new THREE.DataTexture(px, n, n, THREE.RGBAFormat);
    t.wrapS = t.wrapT = THREE.RepeatWrapping; t.magFilter = t.minFilter = THREE.LinearFilter; t.needsUpdate = true;
    return t;
  })();
  const blank = data([8, 14, 60, 255]);      // no picture yet
  const flat = data([128, 128, 0, 255]);     // no flow, far away
  const zero = data([0, 0, 0, 255]);         // no mattes, no masks
  const clear = data([0, 0, 0, 0]);          // a fill that fills nothing

  const loader = new THREE.TextureLoader();
  // every painting has a tiny blurred preview in the manifest: it stands in while the real one loads
  const preview = {};
  Object.keys(PAINTINGS).forEach((id) => {
    loader.load(PAINTINGS[id].blur, (t) => { t.wrapS = t.wrapT = THREE.MirroredRepeatWrapping; t.minFilter = t.magFilter = THREE.LinearFilter; t.generateMipmaps = false; preview[id] = t; });
  });
  const maxAniso = Math.min(4, renderer.capabilities.getMaxAnisotropy());

  // A 4K painting takes a moment to decode. Doing that in the browser's own worker (createImageBitmap)
  // keeps scrolling smooth while the next scene arrives; where that is not possible, an <img> is used.
  const flipOK = (() => {
    if (typeof createImageBitmap !== 'function' || typeof ImageData !== 'function') return Promise.resolve(false);
    try {
      const px = new ImageData(new Uint8ClampedArray([255, 0, 0, 255, 0, 0, 255, 255]), 1, 2);     // red above blue
      return createImageBitmap(px, { imageOrientation: 'flipY', premultiplyAlpha: 'none' }).then((bmp) => {
        const c = document.createElement('canvas'); c.width = 1; c.height = 2;
        const g = c.getContext('2d'); g.drawImage(bmp, 0, 0);
        return g.getImageData(0, 0, 1, 1).data[2] > 200;                                           // blue is on top: flipped
      }).catch(() => false);
    } catch (e) { return Promise.resolve(false); }
  })();
  function fetchTexture(url) {
    const viaImg = () => new Promise((res) => loader.load(url, res, undefined, () => res(null)));
    return flipOK.then((ok) => {
      if (!ok) return viaImg();
      return fetch(url).then((r) => { if (!r.ok) throw new Error(r.status); return r.blob(); })
        .then((blob) => createImageBitmap(blob, { imageOrientation: 'flipY', premultiplyAlpha: 'none', colorSpaceConversion: 'none' }))
        .then((bmp) => { const t = new THREE.Texture(bmp); t.flipY = false; t.needsUpdate = true; return t; })
        .catch(viaImg);
    });
  }
  /** Free a texture and the decoded picture behind it. */
  function drop(t) { if (!t) return; t.dispose(); if (t.image && t.image.close) { try { t.image.close(); } catch (e) {} } }
  function dress(t, mip, edge) {
    t.wrapS = t.wrapT = edge ? THREE.ClampToEdgeWrapping : THREE.MirroredRepeatWrapping;
    t.generateMipmaps = mip; t.minFilter = mip ? THREE.LinearMipmapLinearFilter : THREE.LinearFilter; t.magFilter = THREE.LinearFilter;
    if (mip) t.anisotropy = maxAniso;
    return t;
  }

  /** The widest painting file worth loading: 3840 only on a canvas wider than 2200 real pixels with memory to spare. */
  function texSize() {
    if (tier.size < 3840) return tier.size;
    const px = W * Math.min(window.devicePixelRatio || 1, tier.dpr);
    const roomy = (navigator.deviceMemory || 8) >= 8 && renderer.capabilities.maxTextureSize >= 4096;
    return px > 2200 && roomy ? 3840 : 2560;
  }

  const cache = {};   // painting id → the bundle of textures (see load)
  const KEYS = ['tex', 'a', 'b', 'c', 'f1', 'f2'];
  // Pictures arrive decoded; sending one to the graphics card takes a few milliseconds (a 4K painting with
  // its mipmaps, more). They queue here and go up one per frame, so no frame carries a whole bundle.
  // A texture joins its bundle only once it is up. Behind the curtain (a jump) they all go at once.
  const uploads = [];
  function upload(all) {
    while (uploads.length) {
      const u = uploads.shift();
      if (cache[u.id] !== u.e) { drop(u.t); continue; }
      renderer.initTexture(u.t);
      if (u.det) u.e.det[u.det] = u.t; else u.e[u.key] = u.t;
      if (!all) break;
    }
  }
  function load(id) {
    if (cache[id]) { cache[id].used = performance.now(); return cache[id].promise; }
    const p = PAINTINGS[id];
    const e = { size: texSize(), layers: tier.layers, tex: null, a: null, b: null, c: null, f1: null, f2: null, det: {}, used: performance.now() };
    cache[id] = e;
    const keep = (key, mip) => (t) => {
      if (!t) return;
      if (cache[id] !== e) { drop(t); return; }
      uploads.push({ id, e, key, t: dress(t, mip) });
    };
    // the picture and its flow-and-depth map are what a first frame needs; the layers follow
    e.promise = Promise.all([fetchTexture(paintingURL(p, e.size).url).then(keep('tex', true)), fetchTexture(p.aux.a).then(keep('a', false))]);
    if (e.layers) {
      const fw = e.size >= 3840 ? 1920 : 960;
      e.promise.then(() => {
        if (cache[id] !== e) return;
        fetchTexture(p.aux.b).then(keep('b', false));
        fetchTexture(p.aux.c).then(keep('c', false));
        fetchTexture(fillURL(p, 1, fw)).then(keep('f1', true));
        fetchTexture(fillURL(p, 2, fw)).then(keep('f2', true));
        // and the close-ups its shots go into, so none has to arrive in the middle of a transition
        Object.keys(p.details || {}).forEach((name) => fetchDetail(id, e, name));
      });
    }
    return e.promise;
  }
  /** A close-up of painting `id` (fetched with its layers; wantDetail asks again in case it was missed). */
  function fetchDetail(id, e, name) {
    const p = PAINTINGS[id];
    if (!e || !e.layers || !name || !p.details || !p.details[name] || e.det[name] !== undefined) return;
    e.det[name] = null;
    fetchTexture(best(p.details[name].src)).then((t) => {
      if (!t) return;
      if (cache[id] !== e) { drop(t); return; }
      uploads.push({ id, e, det: name, t: dress(t, true, true) });
    });
  }
  function wantDetail(shot) { fetchDetail(shot.painting, cache[shot.painting], shot.detail); }
  function release(keepIds) {
    Object.keys(cache).forEach((id) => {
      if (keepIds.indexOf(id) !== -1) return;
      const e = cache[id];
      KEYS.forEach((k) => drop(e[k]));
      Object.keys(e.det).forEach((k) => drop(e.det[k]));
      delete cache[id];
    });
  }
  /** The paintings that must be in memory around time t: on stage, and one shot either side. At the
      3840 px size each one is about 90 MB on the graphics card with its layers, so only the neighbour
      in the direction of travel is kept. */
  let lastReady = 0, heading = 1;
  function needed(t) {
    const sc = sceneAt(t), ids = [];
    const add = (s) => { if (s && ids.indexOf(s.painting) === -1) ids.push(s.painting); };
    add(sc.a); add(sc.b);
    const next = SHOTS[(sc.b || sc.a).index + 1], prev = SHOTS[sc.a.index - 1];
    if (texSize() < 3840) { add(next); add(prev); }
    else add(heading >= 0 ? next : prev);
    return ids;
  }
  function ready(t, urgent) {
    if (Math.abs(t - lastReady) > 0.02) { heading = t > lastReady ? 1 : -1; lastReady = t; }
    const sc = sceneAt(t);
    const now = [sc.a.painting].concat(sc.b ? [sc.b.painting] : []);
    const ids = needed(t);
    ids.forEach(load);
    release(ids);
    // a clip one screen ahead (or behind, scrolling back) starts loading from the end we will enter by
    let near = null;
    for (const tr of TRANSITIONS) {
      const name = clipOf(tr);
      if (!name || t < tr.span[0] - 1.2 || t > tr.span[1] + 1.2) continue;
      near = name;
      const m = span(t, tr.span[0], tr.span[1]);
      clipWindow(name, Math.round(span(m, 0.12, 0.88) * (CLIPS[name].frames - 1)));
    }
    dropClips(near);
    return Promise.all(now.map(load)).then(() => { if (urgent) upload(true); wantDetail(sc.a); if (sc.b) wantDetail(sc.b); });
  }

  /* ---------- the painting ---------- */
  const v4 = (x, y, z, w) => ({ value: new THREE.Vector4(x, y, z, w) });
  const uniforms = {
    tNoise: { value: noise },
    uPar: { value: new THREE.Vector2() }, uAspect: { value: 1.78 }, uTime: { value: 0 }, uFlowT: { value: 0 },
    uMix: { value: 0 }, uType: { value: 0 }, uRelief: { value: tier.relief }, uMotion: { value: 1 }, uWarm: { value: 0 },
    uOrigin: { value: new THREE.Vector2(0.5, 0.5) }, uDir: { value: new THREE.Vector2(1, 0) },
    uGrade: v4(0, 1, 0.55, 1), uGold: { value: new THREE.Color(0xf9c84a) },
    uEdgeA: { value: new THREE.Color(0xf9c84a) }, uEdgeB: { value: new THREE.Color(0xf9c84a) }
  };
  ['A', 'B'].forEach((w) => {
    uniforms['t' + w] = { value: blank }; uniforms['t' + w + '1'] = { value: flat };
    uniforms['t' + w + '2'] = { value: zero }; uniforms['t' + w + '3'] = { value: zero };
    uniforms['t' + w + 'f1'] = { value: clear }; uniforms['t' + w + 'f2'] = { value: clear }; uniforms['t' + w + 'd'] = { value: blank };
    uniforms['uCam' + w] = v4(0.5, 0.5, 1, 0); uniforms['uFx' + w] = v4(0, 1, 1, 1.78);
    uniforms['uLay' + w] = v4(0.6, 0.3, 0, 0); uniforms['uDet' + w] = v4(0, 0, 1, 0); uniforms['uLens' + w] = v4(0, 0, 0.5, 0);
    uniforms['uPw' + w] = v4(0, 0, 1, 1); uniforms['uPs' + w] = v4(0.15, 0, 0, 0.5);
  });
  const bgScene = new THREE.Scene(), bgCam = new THREE.Camera();
  const paintMat = new THREE.ShaderMaterial({ uniforms, vertexShader: PAINT_VERT, fragmentShader: PAINT_FRAG, depthTest: false, depthWrite: false });
  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), paintMat);
  quad.frustumCulled = false;
  bgScene.add(quad);

  /* ---------- the brush's paint ---------- */
  // One strip of 10 segments, bent along each stroke's arc in the vertex shader; one instance per stroke.
  const work = opts.brushwork || null;
  const strokeGeo = (() => {
    const n = 10, pos = [], idx = [];
    for (let i = 0; i <= n; i++) pos.push(i / n, -1, 0, i / n, 1, 0);
    for (let i = 0; i < n; i++) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx);
    return g;
  })();
  const strokeScene = new THREE.Scene(), strokeCam = new THREE.Camera(), strokes = {};
  if (work) Object.keys(work.byPainting).forEach((id) => {
    const bk = work.byPainting[id], n = bk.dashes.length;
    const A = new Float32Array(n * 4), B = new Float32Array(n * 4), C = new Float32Array(n * 4);
    bk.dashes.forEach((d, i) => {
      A.set([d.X, d.Y, d.a, d.L], i * 4); B.set([d.w, d.b, d.d, (i * 0.6180339) % 1], i * 4); C.set([d.col[0], d.col[1], d.col[2], d.k], i * 4);
    });
    const g = new THREE.InstancedBufferGeometry();
    g.index = strokeGeo.index; g.setAttribute('position', strokeGeo.getAttribute('position'));
    g.setAttribute('aA', new THREE.InstancedBufferAttribute(A, 4)); g.setAttribute('aB', new THREE.InstancedBufferAttribute(B, 4)); g.setAttribute('aC', new THREE.InstancedBufferAttribute(C, 4));
    g.instanceCount = n;
    const mat = new THREE.RawShaderMaterial({
      uniforms: { uWin: { value: new THREE.Vector4(0, 0, 1, 1) }, uIa: { value: bk.ia }, uT: { value: 0 }, uFrom: { value: -1 }, tNoise: { value: noise } },
      vertexShader: STROKE_VERT, fragmentShader: STROKE_FRAG, transparent: true, depthTest: false, depthWrite: false,
      blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor, blendEquation: THREE.AddEquation
    });
    const mesh = new THREE.Mesh(g, mat);
    mesh.frustumCulled = false; mesh.visible = false;
    strokeScene.add(mesh);
    strokes[id] = { mesh, mat, first: bk.first, depth: bk.depth };
  });
  // compile the stroke shader now (it would otherwise compile on the first stroke, mid-scroll)
  Object.keys(strokes).forEach((id) => { strokes[id].mesh.visible = true; });
  try { renderer.compile(strokeScene, strokeCam); } catch (e) {}
  Object.keys(strokes).forEach((id) => { strokes[id].mesh.visible = false; });
  // one texture, two layers side by side: painting A's on the left, painting B's on the right, a gutter between
  const paintRT = new THREE.WebGLRenderTarget(4, 4, { depthBuffer: false, stencilBuffer: false, generateMipmaps: false, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter });
  const GUT = 8;
  let layerW = 1, layerH = 1, paintCleared = false;
  uniforms.tP = { value: paintRT.texture }; uniforms.uPSize = { value: new THREE.Vector2(1, 1) };
  const clearCol = new THREE.Color(0x050a2e);
  /** Paint the brush's strokes for the painting of `shot`, as far as time t, over the part in view. */
  function paintLayer(w, shot, c, t) {
    const s = strokes[shot.painting], ps = uniforms['uPs' + w].value;
    if (!s || t < s.first) { ps.y = 0; return; }
    const ia = PAINTINGS[shot.painting].aspect, asp = W / H, fit = asp > ia ? ia / asp : 1;
    // the painting's part on screen, as a box in the painting (rolled cameras need a bigger box), with a margin for parallax
    let hx = 0.5 * asp / ia * fit / c.z * ia, hy = 0.5 * fit / c.z;
    if (c.r) { const cs = Math.abs(Math.cos(c.r)), sn = Math.abs(Math.sin(c.r)); const X = hx * cs + hy * sn; hy = hx * sn + hy * cs; hx = X; }
    hx = hx / ia * 1.12 + 0.012; hy = hy * 1.12 + 0.012;
    s.mat.uniforms.uWin.value.set(c.x - hx, 1 - c.y - hy, 2 * hx, 2 * hy);
    s.mat.uniforms.uT.value = t;
    // only what is painted in this shot: the last chapter returns to the first painting with a clean sky
    s.mat.uniforms.uFrom.value = shot.keys[0].t - 0.5;
    Object.keys(strokes).forEach((id) => { strokes[id].mesh.visible = id === shot.painting; });
    const x0 = w === 'A' ? 0 : layerW + GUT;
    renderer.setRenderTarget(paintRT);
    if (!paintCleared) { renderer.setClearColor(0x000000, 0); renderer.clear(true, false, false); paintCleared = true; }
    paintRT.viewport.set(x0, 0, layerW, layerH);
    renderer.setRenderTarget(paintRT);
    renderer.render(strokeScene, strokeCam);
    renderer.setRenderTarget(null);
    renderer.setClearColor(clearCol, 1);
    uniforms['uPw' + w].value.set(c.x - hx, 1 - c.y - hy, 2 * hx, 2 * hy);
    ps.set(s.depth, 1, x0 / paintRT.width, layerW / paintRT.width);
  }

  /* ---------- film clips: a transition played from pre-rendered frames ---------- */
  // A transition that has a clip (clips.js, made by tools/prepare_transition.py from a video) is not
  // drawn by the shader: its frames are scrubbed by the scroll, with a short cross-fade to the painting
  // at each end. Only the frames around the scroll position are in memory; until they have arrived the
  // shader's own transition plays, so there is never a gap.
  const clipU = { tF0: { value: blank }, tF1: { value: blank }, uFrac: { value: 0 }, uAlpha: { value: 0 }, uFit: { value: new THREE.Vector2(1, 1) } };
  const clipQuad = new THREE.Mesh(quad.geometry, new THREE.ShaderMaterial({ uniforms: clipU, vertexShader: PAINT_VERT, fragmentShader: CLIP_FRAG, transparent: true, depthTest: false, depthWrite: false }));
  clipQuad.frustumCulled = false; clipQuad.visible = false; clipQuad.renderOrder = 1;
  bgScene.add(clipQuad);
  const clipFrames = {};   // clip name → { index: texture | null (on its way) }
  const clipOf = (tr) => CLIPS[tr.from + '-' + tr.to] ? tr.from + '-' + tr.to : null;
  function clipFrame(name, i) {
    const set = clipFrames[name] || (clipFrames[name] = {});
    if (set[i] !== undefined) return set[i];
    set[i] = null;
    fetchTexture(best(CLIPS[name].base + String(i).padStart(3, '0'))).then((t) => {
      if (!t) { delete set[i]; return; }
      if (clipFrames[name] !== set || set[i] !== null) { drop(t); return; }
      set[i] = dress(t, false, true);
      renderer.initTexture(t);
    });
    return null;
  }
  /** Ask for the frames around frame i (more ahead than behind) and let go of the ones far away. */
  function clipWindow(name, i) {
    const n = CLIPS[name].frames, set = clipFrames[name] || (clipFrames[name] = {});
    for (let j = Math.max(0, i - 3); j <= Math.min(n - 1, i + 8); j++) clipFrame(name, j);
    Object.keys(set).forEach((k) => { if (Math.abs(k - i) > 16) { drop(set[k]); delete set[k]; } });
  }
  function dropClips(keepName) {
    Object.keys(clipFrames).forEach((name) => {
      if (name === keepName) return;
      Object.keys(clipFrames[name]).forEach((k) => drop(clipFrames[name][k]));
      delete clipFrames[name];
    });
  }

  /* ---------- things in front: motes, petals and the globe ---------- */
  const scene = new THREE.Scene();
  const cam = new THREE.OrthographicCamera(-1, 1, 1, -1, -4000, 4000);
  const N = 420, seeds = new Float32Array(N * 4);
  { let s = 97531; for (let i = 0; i < seeds.length; i++) { s = (s * 48271) % 2147483647; seeds[i] = s / 2147483647; } }
  const dustGeo = new THREE.BufferGeometry();
  dustGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(N * 3), 3));
  dustGeo.setAttribute('seed', new THREE.BufferAttribute(seeds, 4));
  const dustU = {
    uOffset: { value: new THREE.Vector2() }, uPar: { value: new THREE.Vector2() }, uSize: { value: 5 }, uPx: { value: 1 }, uTime: { value: 0 },
    uSwirl: { value: 1 }, uShape: { value: 0 }, uColA: { value: new THREE.Color('#f6c443') }, uColB: { value: new THREE.Color('#fff') }, uAlpha: { value: 0.5 }
  };
  // premultiplied blending: a mote (alpha 0) is added like light, a petal (alpha a) covers like paint
  const dust = new THREE.Points(dustGeo, new THREE.ShaderMaterial({
    uniforms: dustU, vertexShader: DUST_VERT, fragmentShader: DUST_FRAG, transparent: true, depthTest: false, depthWrite: false,
    blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor, blendEquation: THREE.AddEquation
  }));
  dust.frustumCulled = false; dust.renderOrder = 10;
  scene.add(dust);
  const colA = new THREE.Color(), colB = new THREE.Color(), tmpA = new THREE.Color(), tmpB = new THREE.Color();
  const dustOffset = new THREE.Vector2();

  const globe = createGlobe(THREE, scene, noise);

  /* ---------- per frame ---------- */
  const camA = {}, camB = {};
  const state = { shot: SHOTS[0], cam: camA, shotB: null, camB: null, mix: 0, dim: 0 };
  let lastClock = 0, flowT = 0, clockT = 0, lastT = null;

  function resize() {
    const w = canvas.clientWidth || window.innerWidth, h = canvas.clientHeight || window.innerHeight;
    W = w; H = h;
    const dpr = Math.min(window.devicePixelRatio || 1, tier.dpr);
    renderer.setPixelRatio(dpr);
    renderer.setSize(w, h, false);
    uniforms.uAspect.value = w / h;
    // the paint layers: a little under the screen's own sharpness is plenty for strokes this soft
    const ls = tierName === 'low' ? 0.55 : 0.8, lw = Math.min(2400, Math.round(w * dpr * ls)), lh = Math.min(1500, Math.round(h * dpr * ls));
    layerW = lw; layerH = lh;
    paintRT.setSize(lw * 2 + GUT, lh);
    uniforms.uPSize.value.set(lw * 2 + GUT, lh);
    cam.left = -w / 2; cam.right = w / 2; cam.top = h / 2; cam.bottom = -h / 2; cam.updateProjectionMatrix();
    dustU.uPx.value = dpr;
    reloadIfChanged();
  }

  function setLayer(w, shot, c) {
    const p = PAINTINGS[shot.painting], e = cache[shot.painting];
    clampCam(c, p.aspect, W / H);
    const layered = !!(tier.layers && e && e.b && e.c && e.f1 && e.f2);
    uniforms['t' + w].value = (e && e.tex) || preview[shot.painting] || blank;
    uniforms['t' + w + '1'].value = (e && e.a) || flat;
    uniforms['t' + w + '2'].value = layered ? e.b : zero;
    uniforms['t' + w + '3'].value = (e && e.c) || zero;
    uniforms['t' + w + 'f1'].value = layered ? e.f1 : clear;
    uniforms['t' + w + 'f2'].value = layered ? e.f2 : clear;
    const d = shot.detail && p.details && p.details[shot.detail], dt = d && e && e.det[shot.detail];
    uniforms['t' + w + 'd'].value = dt || blank;
    // the close-up takes over as the camera goes in: nothing below zoom 1.25, all of it from 1.9
    uniforms['uDet' + w].value.set(d ? d.x : 0, d ? d.y : 0, d ? d.f : 1, dt && e.tex ? ease.smooth(span(c.z, 1.25, 1.9)) : 0);
    uniforms['uCam' + w].value.set(c.x, c.y, c.z, c.r || 0);
    uniforms['uFx' + w].value.set(c.d, paused ? 0 : 1, c.glow, p.aspect);
    uniforms['uLay' + w].value.set(p.layers.near, p.layers.mid, layered ? 1 : 0, p.layers.ceil == null ? p.layers.near : p.layers.ceil);
    const quiet = opts.reduced ? 0 : 1;
    uniforms['uLens' + w].value.set(c.ox * quiet, c.oy * quiet, c.f, tier.layers ? c.b : 0);
  }

  /** The gentle film (a device that asks for less motion): the camera never goes in close, never dollies, never orbits. */
  function tame(c) { if (opts.reduced) { c.z = Math.min(c.z, 1.4); c.d = 0; c.ox = 0; c.oy = 0; } return c; }

  function render(t, clock) {
    const raw = Math.max(0, clock - lastClock), dt = Math.min(0.1, raw); lastClock = clock;
    upload(false);
    if (!paused) { clockT += dt; }
    pointer.x += (pointer.tx - pointer.x) * Math.min(1, dt * 4);
    pointer.y += (pointer.ty - pointer.y) * Math.min(1, dt * 4);
    // how far the film moved since the last frame: the air drifts with the scroll as well as with time
    const moved = lastT == null || opts.reduced ? 0 : Math.max(-0.5, Math.min(0.5, t - lastT)); lastT = t;

    const sc = sceneAt(t);
    tame(cameraAt(sc.a, t, camA));
    setLayer('A', sc.a, camA);
    paintCleared = false; uniforms.uPsB.value.y = 0;
    paintLayer('A', sc.a, camA, t);
    let dim = camA.dim, sat = camA.sat, flow = camA.flow, ex = camA.ex, warm = camA.warm, mix = 0;
    state.shot = sc.a; state.cam = camA; state.shotB = null; state.camB = null;
    const da = DUST[sc.a.id];
    colA.set(da[0]); colB.set(da[1]);
    let dAmt = da[2], dSize = da[3], dx = da[4], dy = da[5], dSw = da[6], dShape = da[7];
    if (sc.b) {
      tame(cameraAt(sc.b, t, camB));
      setLayer('B', sc.b, camB);
      paintLayer('B', sc.b, camB, t);
      const tr = sc.tr, kind = TYPE[tr.type] || 0;
      // the portals and the petals pace themselves; the sweeps ease in and out
      mix = (kind === 0 || kind >= 3) ? sc.mix : ease.smooth(sc.mix);
      uniforms.uType.value = kind;
      if (opts.reduced) { mix = ease.smooth(sc.mix); uniforms.uType.value = 6; }      // the gentle film cross-fades
      if (tr.a) {
        const o = toScreen(camA, PAINTINGS[sc.a.painting].aspect, W, H, anchorOf(sc.a.painting, tr.a));
        // the light opens where the old painting's anchor is, and drifts to the centre as it grows
        const k = ease.smooth(sc.mix);
        uniforms.uOrigin.value.set(lerp(Math.min(1.1, Math.max(-0.1, o.x / W)), 0.5, k * 0.6), lerp(Math.min(1.1, Math.max(-0.1, 1 - o.y / H)), 0.5, k * 0.6));
      } else uniforms.uOrigin.value.set(0.5, 0.5);
      if (tr.dir) uniforms.uDir.value.set(tr.dir[0], -tr.dir[1]);
      if (!tr._edge) tr._edge = [new THREE.Color((tr.edge && tr.edge[0]) || '#f9c84a'), new THREE.Color((tr.edge && tr.edge[1]) || '#f9c84a')];
      uniforms.uEdgeA.value.copy(tr._edge[0]); uniforms.uEdgeB.value.copy(tr._edge[1]);
      const g = ease.smooth(sc.mix);
      dim = lerp(camA.dim, camB.dim, g); sat = lerp(camA.sat, camB.sat, g); flow = lerp(camA.flow, camB.flow, g);
      ex = lerp(camA.ex, camB.ex, g); warm = lerp(camA.warm, camB.warm, g);
      const db = DUST[sc.b.id];
      tmpA.set(db[0]); tmpB.set(db[1]); colA.lerp(tmpA, g); colB.lerp(tmpB, g);
      dAmt = lerp(dAmt, db[2], g); dSize = lerp(dSize, db[3], g); dx = lerp(dx, db[4], g); dy = lerp(dy, db[5], g); dSw = lerp(dSw, db[6], g);
      dShape = lerp(dShape, db[7], ease.smooth(span(sc.mix, 0.6, 1)));
      // blossom and poured gold fill the air while they carry one painting into the next
      if (tr.type === 'petals' || tr.type === 'pour') { const surge = Math.sin(Math.PI * sc.mix); dAmt *= 1 + 2.2 * surge; dSize *= 1 + 0.5 * surge; }
      state.shotB = sc.b; state.camB = camB;
    }
    state.mix = mix; state.dim = dim;
    if (!paused) flowT += dt * 0.075 * flow * (opts.reduced ? 0.6 : 1);
    uniforms.uMix.value = mix;
    // a transition with a clip: its frames play between 12% and 88% of the way, cross-fading with the paintings at the ends
    clipQuad.visible = false;
    const clip = sc.b && clipOf(sc.tr);
    if (clip) {
      const c = CLIPS[clip], pos = span(sc.mix, 0.12, 0.88) * (c.frames - 1), i = Math.min(c.frames - 2, Math.floor(pos));
      const f0 = clipFrame(clip, i), f1 = clipFrame(clip, i + 1);
      clipWindow(clip, i);
      if (f0 && f1) {
        clipQuad.visible = true;
        clipU.tF0.value = f0; clipU.tF1.value = f1; clipU.uFrac.value = pos - i;
        clipU.uAlpha.value = ease.smooth(span(sc.mix, 0.02, 0.12)) * (1 - ease.smooth(span(sc.mix, 0.88, 0.98)));
        const ca = c.w / c.h, sa = W / H;
        clipU.uFit.value.set(sa > ca ? 1 : sa / ca, sa > ca ? ca / sa : 1);
        uniforms.uMix.value = sc.mix < 0.5 ? 0 : 1;        // under the clip, just the one painting it is fading from or to
      }
    }
    uniforms.uTime.value = clockT; uniforms.uFlowT.value = flowT;
    uniforms.uGrade.value.set(dim, sat, 0.55, ex);
    uniforms.uWarm.value = warm;
    uniforms.uMotion.value = paused ? 0 : opts.reduced ? 0.6 : 1;
    const par = opts.reduced ? 0 : 0.014;
    uniforms.uPar.value.set(-pointer.x * par, pointer.y * par);

    const len = Math.hypot(dx, dy) || 1;
    if (!paused) dustOffset.set(dustOffset.x + dx * dt * 6, dustOffset.y + dy * dt * 6);
    dustOffset.set(dustOffset.x + dx / len * moved * 0.45, dustOffset.y + dy / len * moved * 0.45);
    dustU.uOffset.value.copy(dustOffset); dustU.uTime.value = clockT;
    dustU.uColA.value.copy(colA); dustU.uColB.value.copy(colB);
    dustU.uAlpha.value = Math.min(1, dAmt * tier.dust * (opts.reduced ? 0.5 : 1) * (1 - dim * 0.5));
    dustU.uSize.value = dSize; dustU.uSwirl.value = dSw; dustU.uShape.value = dShape;
    dustU.uPar.value.set(-pointer.x * 0.01, pointer.y * 0.01);
    globe.update(dt, clockT, paused);

    renderer.clear();
    renderer.render(bgScene, bgCam);
    renderer.clearDepth();
    renderer.render(scene, cam);
    watch(raw);
  }

  /* ---------- adaptive quality ---------- */
  // A frame counts as slow when it took longer than two refreshes but is still a frame (under a
  // quarter of a second). Anything longer is the browser holding frames back — a hidden tab, a
  // window in the background — which says nothing about this device, so it resets the count.
  let slow = 0, frames = 0, settled = 0;
  function watch(dt) {
    if (document.hidden || dt <= 0) return;
    if (dt > 0.25) { slow = 0; frames = 0; return; }
    frames++;
    if (frames < 40) return;               // let the first uploads pass
    slow = slow * 0.96 + (dt > 0.034 ? 1 : 0) * 0.04;
    if (slow > 0.55 && performance.now() - settled > 2500) {
      const i = ORDER.indexOf(tierName);
      settled = performance.now(); slow = 0;
      if (i < ORDER.length - 1) setTier(ORDER[i + 1]);
      else if (opts.onTooSlow) opts.onTooSlow();
    }
  }
  /** Fetch the bundles again when the size or the layer setting they were loaded for no longer holds. */
  function reloadIfChanged() {
    const want = texSize(), ids = Object.keys(cache);
    if (ids.some((id) => cache[id].size !== want || cache[id].layers !== tier.layers)) { release([]); ids.forEach(load); }
  }
  function setTier(name) {
    if (!TIERS[name] || name === tierName) return;
    tierName = name; tier = TIERS[name];
    uniforms.uRelief.value = tier.relief;
    resize();
    if (opts.onTier) opts.onTier(name);
  }

  canvas.addEventListener('webglcontextlost', (e) => { e.preventDefault(); if (opts.onLost) opts.onLost(); });
  canvas.addEventListener('webglcontextrestored', () => { release([]); if (opts.onRestored) opts.onRestored(); });

  resize();
  return {
    kind: 'gl', THREE, state, globe,
    ready, render, resize, setTier,
    get tier() { return tierName; },
    info() {
      const d = gl.getExtension('WEBGL_debug_renderer_info');
      const e = cache[state.shot.painting];
      return { tier: tierName, dpr: renderer.getPixelRatio(), size: texSize(), layers: !!(tier.layers && e && e.b && e.c && e.f1 && e.f2),
        detail: !!(e && state.shot.detail && e.det[state.shot.detail]), gpu: d ? gl.getParameter(d.UNMASKED_RENDERER_WEBGL) : '',
        shader: paintMat.program ? 'compiled' : 'pending' };
    },
    setPointer(x, y) { pointer.tx = x; pointer.ty = y; },
    setPaused(p) { paused = p; },
    size() { return { W, H }; },
    dispose() { release([]); dropClips(null); globe.dispose(); paintRT.dispose(); Object.keys(strokes).forEach((id) => { strokes[id].mesh.geometry.dispose(); strokes[id].mat.dispose(); }); renderer.dispose(); }
  };
}
