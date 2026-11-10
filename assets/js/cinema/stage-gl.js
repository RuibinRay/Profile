/*
 * stage-gl.js — the painted stage, drawn with Three.js / WebGL.
 *
 * One full-screen shader draws the painting (or two, during a transition) from the storyboard's
 * cameras; a second, orthographic scene carries the things that float in front of it: the motes of
 * paint in the air and the globe of chapter four.
 *
 * Memory is kept low on purpose: only the paintings on stage, the next one and the previous one hold
 * textures; the rest are released. The pixel ratio is capped and steps down by itself when frames are
 * slow; if even the lowest setting cannot keep up, `onTooSlow` hands over to the lighter stage.
 */
import * as THREE from '../../vendor/three.module.min.js';
import { PAINTINGS } from './manifest.js';
import { SHOTS, TRANSITIONS, sceneAt, cameraAt } from './storyboard.js';
import { clampCam, toScreen, anchorOf, ease, lerp } from './view.js';
import { PAINT_VERT, PAINT_FRAG, DUST_VERT, DUST_FRAG } from './shaders.js';
import { createGlobe } from './globe.js';

const TIERS = {
  high: { dpr: 1.75, size: 2048, relief: 1, dust: 1 },
  mid: { dpr: 1.25, size: 2048, relief: 1, dust: 1 },
  low: { dpr: 1.0, size: 1280, relief: 0, dust: 0.6 }
};
const ORDER = ['high', 'mid', 'low'];

// What hangs in the air of each painting: [colour A, colour B, amount, size px, drift x, drift y, wander]
const DUST = {
  night:    ['#f6c443', '#fff1c2', 0.55, 5, 0.004, 0.010, 1.0],
  house:    ['#dfeaff', '#ffffff', 0.30, 5, 0.012, 0.004, 1.2],
  blossom:  ['#ff8fb8', '#ffd3e2', 0.85, 9, 0.022, -0.014, 2.2],
  lanterns: ['#ffb347', '#ffe9a8', 0.75, 6, 0.002, 0.016, 1.4],
  yak:      ['#ffffff', '#dff3ff', 0.22, 5, 0.010, 0.002, 1.0],
  bookshop: ['#ffcf7a', '#fff0cc', 0.45, 4, 0.003, 0.006, 1.0],
  field:    ['#f9d55c', '#fff3bf', 0.55, 5, 0.020, 0.004, 1.6],
  terraces: ['#e8fbff', '#bfe9ff', 0.28, 4, 0.006, 0.008, 1.0],
  return:   ['#f6c443', '#fff6d6', 0.70, 6, 0.003, 0.008, 1.0]
};

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
  const noise = (() => {
    const n = 64, data = new Uint8Array(n * n * 4);
    let s = 20261110;
    for (let i = 0; i < data.length; i++) { s = (s * 16807) % 2147483647; data[i] = s & 255; }
    const t = new THREE.DataTexture(data, n, n, THREE.RGBAFormat);
    t.wrapS = t.wrapT = THREE.RepeatWrapping; t.magFilter = t.minFilter = THREE.LinearFilter; t.needsUpdate = true;
    return t;
  })();
  const blank = new THREE.DataTexture(new Uint8Array([8, 14, 60, 255]), 1, 1, THREE.RGBAFormat); blank.needsUpdate = true;
  const flat = new THREE.DataTexture(new Uint8Array([128, 128, 0, 255]), 1, 1, THREE.RGBAFormat); flat.needsUpdate = true;

  const loader = new THREE.TextureLoader();
  // every painting has a tiny blurred preview in the manifest: it stands in while the real one loads
  const preview = {};
  Object.keys(PAINTINGS).forEach((id) => {
    loader.load(PAINTINGS[id].blur, (t) => { t.wrapS = t.wrapT = THREE.MirroredRepeatWrapping; t.minFilter = t.magFilter = THREE.LinearFilter; t.generateMipmaps = false; preview[id] = t; });
  });
  const cache = {};   // painting id → { tex, aux, promise, used }
  const maxAniso = Math.min(4, renderer.capabilities.getMaxAnisotropy());
  function load(id) {
    if (cache[id]) { cache[id].used = performance.now(); return cache[id].promise; }
    const p = PAINTINGS[id], entry = { tex: null, aux: null, used: performance.now() };
    const one = (url, mip) => new Promise((res) => {
      loader.load(url, (t) => {
        t.wrapS = t.wrapT = THREE.MirroredRepeatWrapping;
        t.generateMipmaps = mip; t.minFilter = mip ? THREE.LinearMipmapLinearFilter : THREE.LinearFilter; t.magFilter = THREE.LinearFilter;
        if (mip) t.anisotropy = maxAniso;
        res(t);
      }, undefined, () => res(null));
    });
    entry.promise = Promise.all([one(`${p.base}-${tier.size}.webp`, true), one(p.aux, false)]).then(([tex, aux]) => {
      if (!cache[id] || cache[id] !== entry) { if (tex) tex.dispose(); if (aux) aux.dispose(); return; }
      entry.tex = tex; entry.aux = aux;
      if (tex) renderer.initTexture(tex);   // upload now, not in the middle of a transition
      if (aux) renderer.initTexture(aux);
    });
    cache[id] = entry;
    return entry.promise;
  }
  function release(keep) {
    Object.keys(cache).forEach((id) => {
      if (keep.indexOf(id) !== -1) return;
      const e = cache[id];
      if (e.tex) e.tex.dispose(); if (e.aux) e.aux.dispose();
      delete cache[id];
    });
  }
  /** The paintings that must be in memory around time t: on stage, and one shot either side. */
  function needed(t) {
    const sc = sceneAt(t), ids = [];
    const add = (s) => { if (s && ids.indexOf(s.painting) === -1) ids.push(s.painting); };
    add(sc.a); add(sc.b);
    const i = (sc.b || sc.a).index;
    add(SHOTS[i + 1]); add(SHOTS[sc.a.index - 1]);
    return ids;
  }
  function ready(t) {
    const sc = sceneAt(t);
    const now = [sc.a.painting].concat(sc.b ? [sc.b.painting] : []);
    const ids = needed(t);
    ids.forEach(load);
    release(ids);
    return Promise.all(now.map(load));
  }

  /* ---------- the painting ---------- */
  const uniforms = {
    tA: { value: blank }, tAuxA: { value: flat }, tB: { value: blank }, tAuxB: { value: flat }, tNoise: { value: noise },
    uCamA: { value: new THREE.Vector4(0.5, 0.5, 1, 0) }, uCamB: { value: new THREE.Vector4(0.5, 0.5, 1, 0) },
    uFxA: { value: new THREE.Vector4(0, 1, 1, 1.78) }, uFxB: { value: new THREE.Vector4(0, 1, 1, 1.78) },
    uPar: { value: new THREE.Vector2() }, uAspect: { value: 1.78 }, uTime: { value: 0 }, uFlowT: { value: 0 },
    uMix: { value: 0 }, uType: { value: 0 }, uRelief: { value: tier.relief },
    uOrigin: { value: new THREE.Vector2(0.5, 0.5) }, uDir: { value: new THREE.Vector2(1, 0) },
    uGrade: { value: new THREE.Vector3(0, 1, 0.5) }, uGold: { value: new THREE.Color(0xf9c84a) }
  };
  const bgScene = new THREE.Scene(), bgCam = new THREE.Camera();
  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.ShaderMaterial({ uniforms, vertexShader: PAINT_VERT, fragmentShader: PAINT_FRAG, depthTest: false, depthWrite: false }));
  quad.frustumCulled = false;
  bgScene.add(quad);

  /* ---------- things in front: motes and the globe ---------- */
  const scene = new THREE.Scene();
  const cam = new THREE.OrthographicCamera(-1, 1, 1, -1, -4000, 4000);
  const N = 380, seeds = new Float32Array(N * 4);
  { let s = 97531; for (let i = 0; i < seeds.length; i++) { s = (s * 48271) % 2147483647; seeds[i] = s / 2147483647; } }
  const dustGeo = new THREE.BufferGeometry();
  dustGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(N * 3), 3));
  dustGeo.setAttribute('seed', new THREE.BufferAttribute(seeds, 4));
  const dustU = {
    uOffset: { value: new THREE.Vector2() }, uPar: { value: new THREE.Vector2() }, uSize: { value: 5 }, uPx: { value: 1 }, uTime: { value: 0 },
    uSwirl: { value: 1 }, uColA: { value: new THREE.Color('#f6c443') }, uColB: { value: new THREE.Color('#fff') }, uAlpha: { value: 0.5 }
  };
  const dust = new THREE.Points(dustGeo, new THREE.ShaderMaterial({ uniforms: dustU, vertexShader: DUST_VERT, fragmentShader: DUST_FRAG, transparent: true, depthTest: false, depthWrite: false, blending: THREE.AdditiveBlending }));
  dust.frustumCulled = false; dust.renderOrder = 10;
  scene.add(dust);
  const colA = new THREE.Color(), colB = new THREE.Color(), tmpA = new THREE.Color(), tmpB = new THREE.Color();
  const dustOffset = new THREE.Vector2();

  const globe = createGlobe(THREE, scene, noise);

  /* ---------- per frame ---------- */
  const camA = {}, camB = {};
  const state = { shot: SHOTS[0], cam: camA, shotB: null, camB: null, mix: 0 };
  let lastClock = 0, flowT = 0, clockT = 0;

  function resize() {
    const w = canvas.clientWidth || window.innerWidth, h = canvas.clientHeight || window.innerHeight;
    W = w; H = h;
    const dpr = Math.min(window.devicePixelRatio || 1, tier.dpr);
    renderer.setPixelRatio(dpr);
    renderer.setSize(w, h, false);
    uniforms.uAspect.value = w / h;
    cam.left = -w / 2; cam.right = w / 2; cam.top = h / 2; cam.bottom = -h / 2; cam.updateProjectionMatrix();
    dustU.uPx.value = dpr;
  }

  function setLayer(which, shot, c) {
    const p = PAINTINGS[shot.painting], e = cache[shot.painting];
    const ia = p.aspect;
    clampCam(c, ia, W / H);
    uniforms['t' + which].value = (e && e.tex) || preview[shot.painting] || blank;
    uniforms['tAux' + which].value = (e && e.aux) || flat;
    uniforms['uCam' + which].value.set(c.x, c.y, c.z, c.r || 0);
    uniforms['uFx' + which].value.set(c.d, paused ? 0 : 1, c.glow, ia);
  }

  function render(t, clock) {
    const raw = Math.max(0, clock - lastClock), dt = Math.min(0.1, raw); lastClock = clock;
    if (!paused) { clockT += dt; }
    pointer.x += (pointer.tx - pointer.x) * Math.min(1, dt * 4);
    pointer.y += (pointer.ty - pointer.y) * Math.min(1, dt * 4);

    const sc = sceneAt(t);
    cameraAt(sc.a, t, camA);
    setLayer('A', sc.a, camA);
    let dim = camA.dim, sat = camA.sat, flow = camA.flow, mix = 0;
    state.shot = sc.a; state.cam = camA; state.shotB = null; state.camB = null;
    const da = DUST[sc.a.id];
    colA.set(da[0]); colB.set(da[1]);
    let dAmt = da[2], dSize = da[3], dx = da[4], dy = da[5], dSw = da[6];
    if (sc.b) {
      cameraAt(sc.b, t, camB);
      setLayer('B', sc.b, camB);
      const tr = sc.tr;
      mix = tr.type === 'portal' ? sc.mix : ease.smooth(sc.mix);
      uniforms.uType.value = tr.type === 'portal' ? 0 : tr.type === 'swirl' ? 2 : 1;
      if (tr.a) {
        const o = toScreen(camA, PAINTINGS[sc.a.painting].aspect, W, H, anchorOf(sc.a.painting, tr.a));
        // the light opens where the old painting's anchor is, and drifts to the centre as it grows
        const k = ease.smooth(sc.mix);
        uniforms.uOrigin.value.set(lerp(Math.min(1.1, Math.max(-0.1, o.x / W)), 0.5, k * 0.6), lerp(Math.min(1.1, Math.max(-0.1, 1 - o.y / H)), 0.5, k * 0.6));
      } else uniforms.uOrigin.value.set(0.5, 0.5);
      if (tr.dir) uniforms.uDir.value.set(tr.dir[0], -tr.dir[1]);
      const g = ease.smooth(sc.mix);
      dim = lerp(camA.dim, camB.dim, g); sat = lerp(camA.sat, camB.sat, g); flow = lerp(camA.flow, camB.flow, g);
      const db = DUST[sc.b.id];
      tmpA.set(db[0]); tmpB.set(db[1]); colA.lerp(tmpA, g); colB.lerp(tmpB, g);
      dAmt = lerp(dAmt, db[2], g); dSize = lerp(dSize, db[3], g); dx = lerp(dx, db[4], g); dy = lerp(dy, db[5], g); dSw = lerp(dSw, db[6], g);
      state.shotB = sc.b; state.camB = camB;
    }
    state.mix = mix; state.dim = dim;
    if (!paused) flowT += dt * 0.075 * flow;
    uniforms.uMix.value = mix;
    uniforms.uTime.value = clockT; uniforms.uFlowT.value = flowT;
    uniforms.uGrade.value.set(dim, sat, 0.55);
    const par = opts.reduced ? 0 : 0.014;
    uniforms.uPar.value.set(-pointer.x * par, pointer.y * par);

    if (!paused) dustOffset.set(dustOffset.x + dx * dt * 6, dustOffset.y + dy * dt * 6);
    dustU.uOffset.value.copy(dustOffset); dustU.uTime.value = clockT;
    dustU.uColA.value.copy(colA); dustU.uColB.value.copy(colB);
    dustU.uAlpha.value = dAmt * tier.dust * (opts.reduced ? 0.4 : 1) * (1 - dim * 0.5);
    dustU.uSize.value = dSize; dustU.uSwirl.value = dSw;
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
  function setTier(name) {
    if (!TIERS[name] || name === tierName) return;
    const sizeChanged = TIERS[name].size !== tier.size;
    tierName = name; tier = TIERS[name];
    uniforms.uRelief.value = tier.relief;
    resize();
    if (sizeChanged) { const ids = Object.keys(cache); release([]); ids.forEach(load); }
    if (opts.onTier) opts.onTier(name);
  }

  canvas.addEventListener('webglcontextlost', (e) => { e.preventDefault(); if (opts.onLost) opts.onLost(); });
  canvas.addEventListener('webglcontextrestored', () => { release([]); if (opts.onRestored) opts.onRestored(); });

  resize();
  return {
    kind: 'gl', THREE, state, globe,
    ready, render, resize, setTier,
    get tier() { return tierName; },
    info() { const d = gl.getExtension('WEBGL_debug_renderer_info'); return { tier: tierName, dpr: renderer.getPixelRatio(), gpu: d ? gl.getParameter(d.UNMASKED_RENDERER_WEBGL) : '' }; },
    setPointer(x, y) { pointer.tx = x; pointer.ty = y; },
    setPaused(p) { paused = p; },
    size() { return { W, H }; },
    dispose() { release([]); globe.dispose(); renderer.dispose(); }
  };
}
