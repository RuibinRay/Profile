/*
 * shell.js — the shell every Game City game runs in.
 *
 * What it does: owns the 320 × 180 canvas, a fixed clock of 60 ticks a second, the input (keys, mouse, touch),
 * the screens around a game (title, pause, game over), the save (city:<id>, versioned), the best score, the
 * City Pass stamp (city:pass), the sounds, and the test harness. A game is a plain object, its "def":
 *
 *   { id, n, name, district, accent, how,          who it is, and one line on how to play (shown on the title)
 *     start(G)      begin a round: called from the title and on every restart
 *     tick(G)       one sixtieth of a second of the game
 *     draw(g, G)    paint the whole frame on the 2D context g
 *     title(g, G)   optional: paint the picture behind the title
 *     best(save)    optional: the line that tells the best result, e.g. 'BEST 1200'
 *     check()       optional, never called here: the game's own test (solver, branch walker or bot), run by
 *                   tools/city-check.mjs }
 *
 * and what a game gets is G:
 *
 *   G.hit.<name>    true for the one tick a control was pressed: left right up down ok undo reset note levels
 *                   d1 … d9 (the number keys)          G.held.<name>  true while it is held down
 *   G.ptr           the pointer in canvas pixels: { x, y, down, hit, up } (hit and up last one tick), and
 *                   { x0, y0 }, where the press began (for drags)
 *   G.t             ticks since the current screen began      G.rnd()  seeded random, 0..1
 *   G.save.data     the game's own saved things; G.commit() writes them
 *   G.hud           a short line shown in the bar at the top (score, level)
 *   G.finish({ title, lines, score, won, stamp })   end the round: shows the result, keeps the best score
 *   G.stamp()       stamp this game in the City Pass        G.toast(text)  a short notice
 *   G.sfx(name)     a sound (city/kit/sfx.js)               G.shake(n)     shake the screen for n ticks
 *   G.calm          the visitor asked for reduced motion: no shake, slower effects
 *
 * What it leaves alone: anything outside the game's page, and every other game's save.
 * To turn its effects off: sounds with the Sound button (or sfx.setMuted(true)); shake by G.calm = true;
 * saving and sound are already off while a test runs (G.manual = true).
 *
 * Test harness (in the browser console, or tools/city-check.mjs): G.manual = true stops the clock, then
 * T.step(n) runs n ticks, T.press('ok') presses a control, T.tap(x, y) taps the canvas, T.paint() draws.
 * A game's errors are caught into G.lastError and shown on the screen instead of freezing the page.
 */
import { text, textW, wrap, box, rnd, night } from './draw.js';
import * as sound from './sfx.js';

export const W = 320, H = 180;
const PASS = 'city:pass';
const KEYS = {
  arrowleft: 'left', a: 'left', arrowright: 'right', d: 'right', arrowup: 'up', w: 'up', arrowdown: 'down', s: 'down',
  ' ': 'ok', enter: 'ok', z: 'undo', u: 'undo', backspace: 'undo', r: 'reset', escape: 'pause', p: 'pause',
  n: 'note', m: 'mute', l: 'levels', delete: 'd0', 0: 'd0'
};
for (let i = 1; i <= 9; i++) KEYS[i] = 'd' + i;

/* a 2D context that draws nothing: lets a test run a game's draw code without a screen */
const voidCtx = () => new Proxy({}, { get: (t, k) => (k in t ? t[k] : () => {}), set: () => true });
const memory = () => { const m = {}; return { get: (k) => (k in m ? m[k] : null), set: (k, v) => { m[k] = v; } }; };

/** The Game City pass: { id: time stamped }. Read by the city page too. */
export function readPass(store) {
  try { const p = JSON.parse(store.get(PASS) || 'null'); return p && p.v === 1 && p.got ? p.got : {}; } catch (e) { return {}; }
}

/**
 * The game itself, with no page around it. env.ctx: a 2D context (none: draws nothing); env.store: { get, set }
 * (none: memory only); env.seed: the random seed; env.calm: reduced motion. Returns { G, T }.
 */
export function createCore(def, env = {}) {
  const g = env.ctx || voidCtx(), store = env.store || memory();
  let pend = {}, ptrPend = { hit: false, up: false }, toast = null, shake = 0, over = null;
  const G = {
    def, W, H, state: 'title', t: 0, manual: !env.ctx || !!env.manual, lastError: null, calm: !!env.calm,
    hit: {}, held: {}, ptr: { x: -1, y: -1, x0: -1, y0: -1, down: false, hit: false, up: false },
    hud: '', save: { v: def.version || 1, best: 0, data: {} }, stamped: false, rnd: rnd(env.seed || 1),
    seed(n) { G.rnd = rnd(n); },
    sfx(name) { if (!G.manual) sound.play(name); },
    shake(n) { if (!G.calm) shake = Math.max(shake, n); },
    toast(msg, ticks = 150) { toast = { msg, left: ticks }; },
    commit() { if (G.manual) return; try { store.set('city:' + def.id, JSON.stringify(G.save)); } catch (e) {} },
    stamp() {
      if (G.stamped) return;
      G.stamped = true;
      G.toast('CITY PASS STAMPED', 200);
      G.sfx('stamp');
      if (G.manual) return;
      try { const got = readPass(store); got[def.id] = Date.now(); store.set(PASS, JSON.stringify({ v: 1, got })); } catch (e) {}
    },
    start() { go('play'); over = null; def.start(G); },
    finish(o = {}) {
      const score = o.score == null ? null : Math.round(o.score), isBest = score != null && score > (G.save.best || 0);
      if (isBest) G.save.best = score;
      over = { title: o.title || (o.won ? 'WELL DONE' : 'GAME OVER'), lines: o.lines || [], score, isBest, won: !!o.won };
      G.commit();
      if (o.stamp) G.stamp();
      G.sfx(o.won ? 'win' : 'lose');
      go('over');
    }
  };
  function go(state) { G.state = state; G.t = 0; }
  try {
    const raw = JSON.parse(store.get('city:' + def.id) || 'null');
    if (raw && raw.v === G.save.v) G.save = { ...G.save, ...raw, data: raw.data || {} };
    else if (raw && def.migrate) G.save = def.migrate(raw) || G.save;
  } catch (e) {}
  G.stamped = !!readPass(store)[def.id];

  function tick() {
    G.hit = pend; pend = {};
    G.ptr.hit = ptrPend.hit; G.ptr.up = ptrPend.up; ptrPend = { hit: false, up: false };
    const press = G.hit.ok || G.ptr.hit;
    try {
      if (G.state === 'title') { if (press && G.t > 8) G.start(); }
      else if (G.state === 'play') { if (G.hit.pause) go('pause'); else def.tick(G); }
      else if (G.state === 'pause') { if (G.hit.pause || press) { const t = G.t; go('play'); G.t = t; } }
      else if (G.state === 'over') { if (press && G.t > 40) G.start(); else if (G.hit.pause) go('title'); }
    } catch (e) { G.lastError = e; go('error'); }
    G.t++;
    if (shake > 0) shake--;
    if (toast && --toast.left <= 0) toast = null;
  }

  function panel(title, lines, foot) {
    const h = 34 + lines.length * 10 + (foot ? 12 : 0), y = Math.round((H - h) / 2);
    box(g, 36, y, 248, h, '#0b0c2e', def.accent);
    text(g, title, 160, y + 8, def.accent, { align: 'center', scale: textW(title, 2) <= 236 ? 2 : 1 });
    lines.forEach((l, i) => text(g, l, 160, y + 28 + i * 10, '#fff8e6', { align: 'center' }));
    if (foot) text(g, foot, 160, y + h - 13, '#d9dcf2', { align: 'center' });
  }
  function drawTitle() {
    if (def.title) def.title(g, G); else night(g, W, H);
    const s = textW(def.name, 3) <= 300 ? 3 : 2;
    text(g, def.name, 160, 30, def.accent, { align: 'center', scale: s, shadow: '#04041a' });
    text(g, 'NO. ' + def.n + ' - ' + def.district, 160, 30 + 7 * s + 8, '#d9dcf2', { align: 'center', shadow: '#04041a' });
    const how = wrap(def.how, 280);
    box(g, 12, 86, 296, 14 + how.length * 10, 'rgba(8,9,34,.9)', '#d9dcf2');
    how.forEach((l, i) => text(g, l, 160, 94 + i * 10, '#fff8e6', { align: 'center' }));
    if (G.calm || Math.floor(G.t / 30) % 2 === 0) text(g, 'PRESS SPACE OR TAP TO PLAY', 160, 142, def.accent, { align: 'center', shadow: '#04041a' });
    const best = def.best ? def.best(G.save) : (G.save.best ? 'BEST ' + G.save.best : '');
    text(g, (best ? best + (G.stamped ? '  -  ' : '') : '') + (G.stamped ? '* STAMPED IN YOUR CITY PASS' : ''), 160, 160, '#d9dcf2', { align: 'center', shadow: '#04041a' });
  }
  function draw() {
    try {
      g.save();
      if (shake > 0) g.translate((shake % 2 ? 1 : -1) * Math.min(2, Math.ceil(shake / 4)), 0);
      if (G.state === 'title') drawTitle();
      else if (G.state === 'error') {
        g.fillStyle = '#2a0a14'; g.fillRect(0, 0, W, H);
        text(g, 'SOMETHING BROKE IN THIS GAME', 160, 60, '#ff8a8a', { align: 'center' });
        wrap(String(G.lastError && G.lastError.message || G.lastError), 290).slice(0, 4).forEach((l, i) => text(g, l, 160, 80 + i * 10, '#fff8e6', { align: 'center' }));
        text(g, 'RELOAD THE PAGE TO TRY AGAIN', 160, 140, '#d9dcf2', { align: 'center' });
      } else {
        def.draw(g, G);
        if (G.state === 'pause') { g.fillStyle = 'rgba(4,4,20,.7)'; g.fillRect(0, 0, W, H); panel('PAUSED', [], 'SPACE OR TAP TO GO ON'); }
        if (G.state === 'over' && over && G.t > 20) {
          const lines = over.lines.slice();
          if (over.score != null) lines.push('SCORE ' + over.score + '   BEST ' + (G.save.best || 0) + (over.isBest ? '   NEW BEST!' : ''));
          g.fillStyle = 'rgba(4,4,20,.6)'; g.fillRect(0, 0, W, H);
          panel(over.title, lines, 'SPACE OR TAP: PLAY AGAIN');
        }
      }
      g.restore();
      if (toast) {
        const w = textW(toast.msg) + 14;
        box(g, Math.round(160 - w / 2), 4, w, 15, def.accent, '#0b0c2e');
        text(g, toast.msg, 160, 8, def.ink || '#0b0c2e', { align: 'center' });
      }
    } catch (e) { G.lastError = e; if (G.state !== 'error') go('error'); try { g.restore(); } catch (x) {} }
  }

  const T = {
    step(n = 1) { for (let i = 0; i < n; i++) tick(); draw(); return G; },
    press(name) { pend[name] = true; },
    hold(name, on = true) { G.held[name] = on; },
    tap(x, y) { G.ptr.x = G.ptr.x0 = x; G.ptr.y = G.ptr.y0 = y; ptrPend.hit = true; ptrPend.up = true; },
    move(x, y) { G.ptr.x = x; G.ptr.y = y; },
    paint: draw
  };
  return { G, T, tick, draw, input: { press: T.press, hold: T.hold, ptr(x, y, down, edge) { G.ptr.x = x; G.ptr.y = y; if (down != null) G.ptr.down = down; if (edge === 'hit') { ptrPend.hit = true; G.ptr.x0 = x; G.ptr.y0 = y; } if (edge === 'up') ptrPend.up = true; } }, pause() { if (G.state === 'play') go('pause'); else if (G.state === 'pause') { const t = G.t; go('play'); G.t = t; } } };
}

/** Put a game on its page (city/games/<id>/index.html): the canvas #game, the bar, the buttons, the clock. */
export async function boot(def) {
  const root = document.documentElement, cv = document.getElementById('game');
  root.classList.remove('no-js'); root.classList.add('js');
  root.style.setProperty('--accent', def.accent); root.style.setProperty('--accent-ink', def.ink || '#0b0c2e');
  const ctx = cv.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  const store = { get: (k) => { try { return localStorage.getItem(k); } catch (e) { return null; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} } };
  const calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const core = createCore(def, { ctx, store, calm, seed: (Date.now() ^ (Math.random() * 1e9)) >>> 0, manual: /[?&]manual\b/.test(window.location.search) });
  const { G, T } = core;
  window.G = G; window.T = T;

  /* the canvas takes the largest whole multiple of 320 × 180 that fits (a fraction on very small screens) */
  const stage = cv.parentElement;
  function fit() {
    const availW = stage.clientWidth, availH = Math.max(120, window.innerHeight - stage.getBoundingClientRect().top - 54);
    const k = Math.min(availW / W, availH / H), scale = k >= 2 ? Math.floor(k) : k;        // whole pixels when there is room for them
    cv.style.width = Math.round(W * scale) + 'px'; cv.style.height = Math.round(H * scale) + 'px';
  }
  window.addEventListener('resize', fit); fit();

  /* keys */
  const name = (e) => KEYS[e.key.length === 1 ? e.key.toLowerCase() : e.key.toLowerCase()];
  window.addEventListener('keydown', (e) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const k = name(e);
    if (!k) return;
    if (e.target && /^(BUTTON|A)$/.test(e.target.tagName) && k === 'ok') return;      // let Enter and Space press a focused button
    e.preventDefault();
    sound.wake();
    if (k === 'mute') { toggleMute(); return; }
    if (!e.repeat) core.input.press(k);
    core.input.hold(k, true);
  });
  window.addEventListener('keyup', (e) => { const k = name(e); if (k) core.input.hold(k, false); });
  window.addEventListener('blur', () => { Object.keys(G.held).forEach((k) => { G.held[k] = false; }); });

  /* pointer: mouse, pen and touch alike */
  const at = (e) => { const r = cv.getBoundingClientRect(); return [(e.clientX - r.left) / r.width * W, (e.clientY - r.top) / r.height * H]; };
  cv.addEventListener('pointerdown', (e) => { e.preventDefault(); sound.wake(); try { cv.setPointerCapture(e.pointerId); } catch (x) {} const [x, y] = at(e); core.input.ptr(x, y, true, 'hit'); });
  cv.addEventListener('pointermove', (e) => { const [x, y] = at(e); core.input.ptr(x, y); });
  const lift = (e) => { const [x, y] = at(e); core.input.ptr(x, y, false, 'up'); };
  cv.addEventListener('pointerup', lift); cv.addEventListener('pointercancel', lift);
  cv.addEventListener('contextmenu', (e) => e.preventDefault());

  /* the bar: the line the game sets, sound, pause */
  const stat = document.getElementById('stat'), muteBtn = document.getElementById('mute'), pauseBtn = document.getElementById('pause');
  function showMute() { if (muteBtn) { muteBtn.textContent = sound.muted() ? 'Sound off' : 'Sound on'; muteBtn.setAttribute('aria-pressed', String(!sound.muted())); } }
  function toggleMute() { sound.setMuted(!sound.muted()); showMute(); }
  if (muteBtn) muteBtn.addEventListener('click', () => { sound.wake(); toggleMute(); muteBtn.blur(); });
  if (pauseBtn) pauseBtn.addEventListener('click', () => { core.pause(); pauseBtn.blur(); });
  showMute();
  document.addEventListener('visibilitychange', () => { if (document.hidden && G.state === 'play') core.pause(); });

  /* in and out through the towers, like the rest of the city */
  try {
    const wipe = await import('../../assets/js/pixel/city-wipe.js?v=20261117a');
    const label = wipe.cityArriving();
    if (label || root.classList.contains('is-arriving')) { wipe.cityReveal({ card: label || def.name }); root.classList.remove('is-arriving'); }
    document.querySelectorAll('a[data-back]').forEach((a) => a.addEventListener('click', (e) => {
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button) return;
      e.preventDefault();
      wipe.enterCity(a.getAttribute('href'), { x: e.clientX || window.innerWidth / 2, y: e.clientY || window.innerHeight / 2 }, { label: 'Game City' });
    }));
  } catch (e) { root.classList.remove('is-arriving'); }

  /* the clock: 60 ticks a second whatever the screen's refresh rate; at most 5 ticks are made up after a stall */
  let last = performance.now(), acc = 0, shown = null;
  (function loop(now) {
    requestAnimationFrame(loop);
    const dt = Math.min(100, now - last); last = now;
    if (G.manual) return;
    acc += dt;
    let n = 0;
    while (acc >= 1000 / 60 && n++ < 5) { core.tick(); acc -= 1000 / 60; }
    if (n > 5) acc = 0;
    core.draw();
    const line = G.state === 'title' ? '' : G.hud;
    if (stat && line !== shown) { shown = line; stat.textContent = line; stat.hidden = !line; }
    if (pauseBtn) pauseBtn.textContent = G.state === 'pause' ? 'Go on' : 'Pause';
  })(last);
  core.draw();
  return core;
}
