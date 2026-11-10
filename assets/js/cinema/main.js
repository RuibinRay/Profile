/*
 * main.js — puts the film together.
 *
 *   1. choose a stage: WebGL (Three.js) on capable screens; the lighter layered stage on phones,
 *      low-power devices and without WebGL 2; the calm stage when the visitor prefers reduced motion
 *   2. build the engine (one scroll-scrubbed timeline), the eight chapters, the interface and the panels
 *   3. load the first painting, then let the page be scrolled
 *
 * Address options, for testing:  ?lite  the lighter stage ·  ?calm  the reduced-motion stage ·
 *   ?gl  force WebGL ·  ?why  show which stage is running and why ·  ?draft  mark what is still to add ·
 *   ?step  no scroll smoothing (the film is exactly where the scrollbar is)
 */
import { CHAPTERS, T, setPortrait } from './storyboard.js';
import { createEngine } from './engine.js';
import { createLiteStage } from './stage-lite.js';
import { formatsReady } from './formats.js';
import { createChrome } from './chrome.js';
import { createPanels } from './panels.js';
import * as home from './chapters/home.js';
import * as about from './chapters/about.js';
import * as experience from './chapters/experience.js';
import * as world from './chapters/world.js';
import * as projects from './chapters/projects.js';
import * as energy from './chapters/energy.js';
import * as skills from './chapters/skills.js';
import * as contact from './chapters/contact.js';

const RJY = window.RJY, SITE = window.SITE, h = RJY.h;
const root = document.documentElement;
const params = new URLSearchParams(location.search);
const BUILDERS = { home, about, experience, world, projects, energy, skills, contact };

RJY.cinema = { view: null };
// content drawn by the shared components fades in as it enters the page on the plain portfolio; here it is simply shown
RJY.reveal = (scope) => (scope || document).querySelectorAll('.reveal:not(.is-in)').forEach((el) => el.classList.add('is-in'));

/* ---------- 1. which stage ---------- */
// A device can ask for less motion (macOS: Accessibility → Display → Reduce motion). The film then plays
// in its gentle form: the same paintings, alive, but the camera stays put and pictures cross-fade. A
// visitor's own choice on this site ("Play the full film" / "Calm version") outranks the device setting
// and is remembered.
const prefersLess = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
let choice = null;
try { choice = localStorage.getItem('rjy.motion'); } catch (e) {}
if (params.has('gl')) choice = 'full';
const reduced = params.has('calm') || (choice === 'full' ? false : choice === 'gentle' ? true : prefersLess);
const small = window.matchMedia('(max-width: 820px), (pointer: coarse) and (max-width: 1100px)').matches;
const lowPower = (navigator.deviceMemory && navigator.deviceMemory <= 3) || (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 2) || (navigator.connection && navigator.connection.saveData);
let why = '';
let want = 'gl';
if (params.has('lite')) { want = 'lite'; why = '?lite'; }
else if (params.has('calm')) { want = 'calm'; why = '?calm'; }
else if (!params.has('gl') && (small || lowPower)) { want = reduced ? 'calm' : 'lite'; why = small ? 'a small or touch screen' : 'a low-power device'; }
const gentle = want === 'gl' && reduced;         // WebGL, with the camera held still
const calm = want === 'calm' || gentle;          // words fade in place, nothing follows the pointer
if (gentle) why = 'the device asks for less motion';
root.classList.toggle('is-calm', calm);
root.classList.toggle('is-gentle', gentle);
root.classList.toggle('is-full', choice === 'full');
if (!RJY.finePointer) root.classList.add('is-touch');
if (RJY.draft) root.classList.add('is-draft');

const canvas = document.querySelector('.cine-stage__canvas'), liteRoot = document.querySelector('.cine-stage__lite');
let stage = null, lastT = -1;
function useLite(isCalm, reason) {
  if (stage && stage.kind === 'gl') stage.dispose();
  stage = createLiteStage(liteRoot, { calm: isCalm });
  root.classList.remove('is-gl'); root.classList.add('is-lite');
  why = reason || why;
  stage.setPaused(chrome ? chrome.isPaused() : false);
  lastT = -1;                                   // draw the new stage on the next frame, scrolled or not
  return stage.ready(engine ? engine.t : 0).then(() => { lastT = -1; });
}
async function useGL() {
  try {
    const { createGLStage } = await import('./stage-gl.js');
    const s = createGLStage(canvas, {
      reduced: gentle, tier: (navigator.deviceMemory && navigator.deviceMemory <= 4) ? 'mid' : 'high',
      onTooSlow() { useLite(calm, 'WebGL could not keep up on this device'); },
      onLost() { useLite(calm, 'the graphics context was lost'); }
    });
    if (!s) return false;
    stage = s; root.classList.add('is-gl'); root.classList.remove('is-lite');
    return true;
  } catch (e) { console.warn('WebGL stage unavailable', e); return false; }
}

/* ---------- 2. engine, chapters, interface ---------- */
let engine = null, chrome = null;
const setFraming = () => setPortrait(window.innerWidth / window.innerHeight < 0.82);
setFraming();
engine = createEngine({ main: document.getElementById('film'), calm, exact: params.has('step') });
engine.onResize(() => { setFraming(); if (stage) stage.resize(); });
engine.setPrepare((t) => (stage ? stage.ready(t) : Promise.resolve()));

const panels = createPanels({ RJY, SITE, h, engine });
const controllers = [];
CHAPTERS.forEach((c) => {
  const section = document.getElementById(c.id), ui = section && section.querySelector('.chapter__ui');
  const mod = BUILDERS[c.id];
  if (!ui || !mod) return;
  try {
    const ctl = mod.build({
      ui, section, chapter: c, SITE, RJY, h, engine, panels, calm,
      stage: () => stage,
      at: (t) => T(c.id, t),
      beat: (el, a, b, o) => engine.beat(el, T(c.id, a), b == null ? null : T(c.id, b), o)
    }) || {};
    ctl.chapter = c;
    controllers.push(ctl);
  } catch (e) { console.error('Could not build chapter ' + c.id, e); }
});
chrome = createChrome({ engine, RJY, SITE, h, getStage: () => stage, panels });

/* ---------- the motion switch ---------- */
// Shown only where it means something: on a device that asks for less motion, or after a choice was made.
if (prefersLess || choice) {
  const set = (v) => {
    try { localStorage.setItem('rjy.motion', v); } catch (e) {}
    const here = engine.chapter && engine.chapter.id !== 'home' ? '#' + engine.chapter.id : '';
    const url = new URL(location.href); url.searchParams.delete('gl'); url.searchParams.delete('calm'); url.hash = here;
    // a change of chapter mark alone does not load the page again, so ask for that outright
    if (url.pathname === location.pathname && url.search === location.search) { history.replaceState(null, '', url.toString()); location.reload(); }
    else location.replace(url.toString());
  };
  const say = reduced ? 'Play the full film' : 'Calm version';
  root.classList.add('has-switch');
  const tools = document.querySelector('.topbar__tools');
  const btn = h('button', { type: 'button', class: 'topbar__link topbar__motion', text: say,
    title: reduced ? 'This device asks for less motion, so the camera is holding still. Play everything instead.' : 'Hold the camera still and cross-fade between paintings.' });
  btn.addEventListener('click', () => set(reduced ? 'full' : 'gentle'));
  if (tools) tools.insertBefore(btn, tools.firstChild);
  // the same switch in the menu, where a phone (which has no room for it in the top bar) finds it
  const quick = document.getElementById('menu-quick');
  if (quick) {
    const item = h('a', { href: location.pathname, role: 'button' }, say, h('span', { text: reduced ? 'every camera move' : 'the camera holds still' }));
    item.addEventListener('click', (e) => { e.preventDefault(); set(reduced ? 'full' : 'gentle'); });
    quick.appendChild(h('li', null, item));
  }
  if (reduced && prefersLess) {
    // and once, in words, on the first screen: why nothing is flying
    const foot = document.querySelector('.home-foot');
    if (foot) {
      const go = h('button', { type: 'button', class: 'textlink home-note__go', text: 'Play the full film' });
      go.addEventListener('click', () => set('full'));
      foot.appendChild(h('p', { class: 'home-note' }, 'Your device asks for less motion, so the camera is holding still. ', go));
    }
  }
}

RJY.route.on('skills', (id) => {
  if (RJY.sheet.isOpen()) RJY.sheet.close(true);
  if (panels.isOpen()) panels.hide();
  const ctl = controllers.find((c) => c.chapter.id === 'skills');
  engine.travel(T('skills', 1.5), { cut: true }).then(() => { if (ctl && ctl.select) ctl.select(id); });
});

/* ---------- pointer ---------- */
if (RJY.finePointer && !calm) {
  window.addEventListener('pointermove', (e) => {
    if (e.pointerType && e.pointerType !== 'mouse' && e.pointerType !== 'pen') return;
    if (stage) stage.setPointer(e.clientX / window.innerWidth * 2 - 1, e.clientY / window.innerHeight * 2 - 1);
  }, { passive: true });
}

/* ---------- frames ---------- */
let lastPrep = 0, hidden = false;
document.addEventListener('visibilitychange', () => { hidden = document.hidden; });
engine.onFrame((t, s, dt) => {
  if (!stage || hidden) return;
  if (panels.isOpen() || chrome.isMenuOpen()) return;      // the film is covered: nothing to draw
  const moving = Math.abs(t - lastT) > 1e-5;
  // the WebGL paintings move by themselves; the lighter stage only changes when the page is scrolled
  if (stage.kind === 'gl' || moving) stage.render(t, s);
  if (moving && s - lastPrep > 0.25) { lastPrep = s; stage.ready(t); }
  for (let i = 0; i < controllers.length; i++) {
    const c = controllers[i];
    if (!c.update) continue;
    const on = t > c.chapter.start - 0.6 && t < c.chapter.end + 0.6;
    if (on || c.awake) { c.update(t, s, dt, on); c.awake = on; }
  }
  if (moving) chrome.update(t);
  lastT = t;
});

/* ---------- 3. go ---------- */
function startTime() {
  const r = RJY.route.parse(location.hash);
  const id = r ? ({ projects: 'projects', world: 'world', experience: 'experience', skills: 'skills', memories: 'world' }[r.section] || null) : location.hash.slice(1);
  const c = CHAPTERS.find((x) => x.id === id);
  return c && c.id !== 'home' ? c.start + c.land : 0;
}
async function boot() {
  await formatsReady;      // AVIF or WebP: known before the first painting is asked for
  if (want === 'gl' && !(await useGL())) { want = 'lite'; why = 'WebGL 2 is not available'; }
  if (!stage) useLite(calm);
  const t0 = startTime();
  try { await Promise.race([stage.ready(t0), new Promise((r) => setTimeout(r, 6000))]); } catch (e) {}
  engine.start();
  if (t0 > 0) await engine.travel(t0, { cut: true, silent: true });
  stage.setPaused(chrome.isPaused());
  stage.render(engine.t, performance.now() / 1000);
  chrome.update(engine.t);
  root.classList.remove('is-loading');
  if (RJY.route.parse(location.hash)) setTimeout(() => RJY.route.handle(), 80);
  if (params.has('why')) {
    const el = h('p', { class: 'why' });
    document.body.appendChild(el);
    setInterval(() => { const i = stage.info(); el.textContent = 'Stage: ' + stage.kind + ' (' + i.tier + (i.dpr ? ', ' + i.dpr.toFixed(2) + '× pixels' : '') + ')' + (why ? ' — ' + why : '') + (i.gpu ? ' — ' + i.gpu : ''); }, 800);
  }
}
// for the console and for tests: RJY.film.engine.travel(12), RJY.film.stage.info()
RJY.film = { get engine() { return engine; }, get stage() { return stage; }, panels, controllers };
window.addEventListener('hashchange', () => {
  if (RJY.route.parse(location.hash)) return;
  const c = CHAPTERS.find((x) => x.id === location.hash.slice(1));
  if (c && c !== engine.chapter) engine.toChapter(c.id, { cut: true });
});
boot();
