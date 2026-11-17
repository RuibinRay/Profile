/*
 * sfx.js — Game City's sounds, made in Web Audio. Nothing is downloaded.
 *
 *   play(name)        one of the short sounds below (a few notes each)
 *   tone(hz, s, o)    a single note: o.type 'square' | 'triangle' | 'sawtooth' | 'sine', o.vol, o.at (seconds from now)
 *   muted()           whether the city is muted
 *   setMuted(on)      mute or unmute every game: the choice is kept in the browser under city:mute
 *
 * No sound is made before the first key or tap (browsers require it), nor in a test. To turn sound off for good,
 * call setMuted(true) or make play() return at its first line.
 */
const KEY = 'city:mute';
let ctx = null, off = false;
try { off = localStorage.getItem(KEY) === '1'; } catch (e) {}

const SOUNDS = {
  blip: [[660, 0.05]], move: [[330, 0.04, 'triangle']], turn: [[440, 0.04, 'triangle'], [554, 0.04, 'triangle']],
  pick: [[784, 0.05], [1047, 0.07]], good: [[523, 0.07], [659, 0.07], [784, 0.1]],
  bad: [[196, 0.12, 'sawtooth'], [147, 0.16, 'sawtooth']], undo: [[392, 0.04, 'triangle'], [330, 0.05, 'triangle']],
  win: [[523, 0.09], [659, 0.09], [784, 0.09], [1047, 0.2]], lose: [[392, 0.14, 'triangle'], [330, 0.14, 'triangle'], [262, 0.3, 'triangle']],
  tick: [[1200, 0.02]], type: [[880, 0.012, 'square', 0.25]], stamp: [[262, 0.06], [392, 0.06], [523, 0.06], [784, 0.06], [1047, 0.25]],
  crash: [[110, 0.2, 'sawtooth'], [82, 0.25, 'sawtooth']], go: [[587, 0.06], [880, 0.1]]
};

function audio() {
  if (ctx || typeof window === 'undefined') return ctx;
  const A = window.AudioContext || window.webkitAudioContext;
  if (A) try { ctx = new A(); } catch (e) { ctx = null; }
  return ctx;
}
/** Called by the shell on the first key or tap, so the browser lets sound start. */
export function wake() { const a = audio(); if (a && a.state === 'suspended') a.resume(); }

export function tone(hz, s = 0.08, o = {}) {
  if (off || !ctx) return;
  const t = ctx.currentTime + (o.at || 0), osc = ctx.createOscillator(), amp = ctx.createGain(), vol = (o.vol == null ? 1 : o.vol) * 0.06;
  osc.type = o.type || 'square'; osc.frequency.value = hz;
  amp.gain.setValueAtTime(vol, t); amp.gain.linearRampToValueAtTime(0, t + s);
  osc.connect(amp); amp.connect(ctx.destination);
  osc.start(t); osc.stop(t + s + 0.02);
}
export function play(name) {
  if (off || !ctx) return;
  let at = 0;
  (SOUNDS[name] || SOUNDS.blip).forEach(([hz, s, type, vol]) => { tone(hz, s, { type, vol, at }); at += s; });
}
export const muted = () => off;
export function setMuted(on) { off = !!on; try { localStorage.setItem(KEY, off ? '1' : '0'); } catch (e) {} }
