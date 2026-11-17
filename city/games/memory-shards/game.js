/*
 * Memory Shards — Game City No. 14 (Neon Ward, story).
 *
 * What it does: a courier with no memory walks their last route again, from the Drains up through the street to the
 * Sky Garden. Seven places each give back one shard of memory: a short scene with one choice. The choices decide who
 * the courier was, and there are three endings. Every step is saved, so a visit can be continued. The runner is the
 * story kit (city/kit/story.js); this file only paints the picture above the words.
 * What it leaves alone: everything outside its canvas; it saves where you are and the endings you have seen.
 * To turn its effects off: the rain, the drips and the blinking signs stand still with the visitor's reduced-motion
 * setting. The story is in data.js. check() walks every branch for tools/city-check.mjs.
 */
import { story, walk } from '../../kit/story.js';
import { text, box, rnd } from '../../kit/draw.js';
import { NODES, FLAGS, FIRST, PLACE, WHERE } from './data.js';

const A = '#c86bff', INK = '#12072a';
const TINT = ['#3a2a5c', '#f6c443', '#ff5c9a', '#41e8d8'];             // a shard not yet found, then oath, take, spark
const stop = (id) => { const m = /^[fmr](\d)/.exec(id); return m ? +m[1] : /^intro/.test(id) ? 0 : 8; };

function under(g, t, calm) {
  g.fillStyle = '#071318'; g.fillRect(0, 0, 320, 96);
  g.fillStyle = '#0d2a2e'; g.fillRect(0, 0, 320, 14); g.fillStyle = '#123c40'; g.fillRect(0, 14, 320, 2);
  for (let i = 0; i < 4; i++) { const x = 30 + i * 84; g.fillStyle = '#16484a'; g.fillRect(x, 0, 10, 80); g.fillStyle = '#0d2a2e'; g.fillRect(x + 7, 0, 3, 80); g.fillStyle = '#1e6466'; g.fillRect(x - 2, 30, 14, 3); g.fillRect(x - 2, 60, 14, 3); }
  g.fillStyle = '#123c40'; g.fillRect(0, 40, 320, 5); g.fillStyle = '#1e6466'; g.fillRect(0, 40, 320, 1);
  for (let i = 0; i < 5; i++) { const x = 14 + i * 70; g.fillStyle = '#41e8d8'; g.fillRect(x, 18, 4, 3); g.fillStyle = 'rgba(65,232,216,.10)'; g.fillRect(x - 8, 21, 20, 20); }
  const r = rnd(14);
  for (let i = 0; i < 9; i++) { const x = Math.floor(r() * 316), y = calm ? 50 : (Math.floor(t * (0.5 + r()) + r() * 60) % 46) + 45; g.fillStyle = '#41e8d8'; g.fillRect(x, y, 1, 2); }
  g.fillStyle = '#0a1c20'; g.fillRect(0, 86, 320, 10); g.fillStyle = '#1e6466'; for (let x = 0; x < 320; x += 6) g.fillRect(x, 86, 3, 1);
}
function street(g, t, calm) {
  g.fillStyle = '#12072a'; g.fillRect(0, 0, 320, 96);
  const r = rnd(41);
  for (let i = 0; i < 9; i++) {
    const x = i * 37 - 6, h = 40 + Math.floor(r() * 40), w = 30 + Math.floor(r() * 8);
    g.fillStyle = i % 2 ? '#2a1450' : '#3b1c72'; g.fillRect(x, 88 - h, w, h);
    for (let wy = 92 - h; wy < 80; wy += 7) for (let wx = x + 3; wx < x + w - 3; wx += 6) if (r() < 0.45) { g.fillStyle = r() < 0.5 ? '#41e8d8' : '#ffe08a'; g.fillRect(wx, wy, 3, 3); }
  }
  [['NOODLE', 22, 46, '#ff5c9a'], ['RUN', 130, 30, '#41e8d8'], ['LIFT', 236, 40, A]].forEach(([s, x, y, c], i) => {
    const on = calm || Math.floor(t / 20 + i * 3) % 7 !== 0;
    box(g, x - 3, y - 3, s.length * 6 + 5, 13, '#12072a', on ? c : '#3a2a5c'); text(g, s, x, y, on ? c : '#3a2a5c');
  });
  g.fillStyle = '#1a0a2c'; g.fillRect(0, 86, 320, 10); g.fillStyle = '#5a2f9a'; g.fillRect(0, 86, 320, 1);
  for (let i = 0; i < 40; i++) { const x = Math.floor(r() * 330), y = calm ? Math.floor(r() * 84) : Math.floor(t * 3 + r() * 90) % 90; g.fillStyle = 'rgba(190,170,255,.55)'; g.fillRect(x - Math.floor(y / 8), y, 1, 3); }
}
function sky(g, t, calm, dawn) {
  const bands = dawn ? ['#3b1c72', '#7a3aa0', '#c86bff', '#ff9d8a', '#ffd38a'] : ['#0b0c2e', '#161650', '#2a1450', '#3b1c72', '#5a2f9a'];
  bands.forEach((c, i) => { g.fillStyle = c; g.fillRect(0, i * 18, 320, 18); });
  const r = rnd(7);
  if (!dawn) for (let i = 0; i < 40; i++) { g.fillStyle = i % 3 ? '#9a8ad0' : '#ffffff'; g.fillRect(Math.floor(r() * 320), Math.floor(r() * 50), 1, 1); }
  for (let i = 0; i < 3; i++) { const x = ((i * 130 + (calm ? 0 : Math.floor(t / 14))) % 400) - 60; g.fillStyle = 'rgba(217,220,242,.22)'; g.fillRect(x, 58 + i * 7, 60, 4); g.fillRect(x + 10, 55 + i * 7, 34, 3); }
  [[10, 44], [250, 60], [290, 36]].forEach(([x, h]) => { g.fillStyle = '#1a0a2c'; g.fillRect(x, 90 - h, 22, h); g.fillStyle = '#41e8d8'; g.fillRect(x + 10, 86 - h, 2, 2); for (let y = 96 - h; y < 86; y += 6) { g.fillStyle = '#ffe08a'; g.fillRect(x + 4, y, 3, 2); g.fillRect(x + 14, y, 3, 2); } });
  g.fillStyle = '#d9dcf2'; g.fillRect(0, 84, 320, 2); g.fillStyle = 'rgba(88,230,255,.25)'; g.fillRect(0, 86, 320, 10);
  for (let x = 6; x < 320; x += 22) { g.fillStyle = '#d9dcf2'; g.fillRect(x, 72, 1, 12); } g.fillRect(0, 72, 320, 1);
}
function garden(g) {                                                  // the hedge and the gate, at the last stop
  g.fillStyle = '#1f5a3c'; g.fillRect(180, 52, 140, 32); g.fillStyle = '#2f8a58'; for (let x = 182; x < 320; x += 5) g.fillRect(x, 50 + (x % 3), 3, 3);
  g.fillStyle = '#12072a'; g.fillRect(228, 46, 30, 38); g.fillStyle = '#d9dcf2'; for (let x = 230; x < 258; x += 5) g.fillRect(x, 48, 1, 36); g.fillRect(228, 46, 30, 1); g.fillRect(228, 64, 30, 1);
}
function person(g, x, y, coat, skin, o = {}) {
  g.fillStyle = coat; g.fillRect(x, y + 7, 9, 12); g.fillStyle = '#12072a'; g.fillRect(x + 4, y + 15, 1, 4);
  g.fillStyle = skin; g.fillRect(x + 2, y, 5, 6);
  g.fillStyle = o.hair || '#1a0a2c'; g.fillRect(x + 2, y, 5, 2);
  if (o.small) { g.fillStyle = '#071318'; g.fillRect(x, y, 9, 4); g.fillStyle = skin; g.fillRect(x + 2, y + 4, 5, 4); g.fillStyle = o.hair || '#1a0a2c'; g.fillRect(x + 2, y + 4, 5, 1); }
}
function courier(g, x, y) {
  person(g, x, y, '#5a2f9a', '#e0b890', { hair: '#41e8d8' });
  g.fillStyle = '#ffe08a'; g.fillRect(x + 1, y + 9, 7, 1);                                    // the runner's stripe
  g.fillStyle = '#d9dcf2'; g.fillRect(x + 9, y + 11, 2, 1);                                   // the chain
  box(g, x + 11, y + 10, 9, 7, '#2a2c3a', '#d9dcf2'); g.fillStyle = A; g.fillRect(x + 15, y + 13, 1, 1);
}
function drone(g, x, y, t, calm) {
  const bob = calm ? 0 : Math.round(Math.sin(t / 14) * 2);
  box(g, x, y + bob, 9, 6, '#3d4052', '#d9dcf2'); g.fillStyle = '#41e8d8'; g.fillRect(x + 3, y + 2 + bob, 3, 2);
  g.fillStyle = '#ff9d2e'; g.fillRect(x + 6, y + 4 + bob, 2, 1);                               // the patch
  g.fillStyle = '#d9dcf2'; const spin = calm || Math.floor(t / 3) % 2; g.fillRect(x - 2 + (spin ? 0 : 1), y - 2 + bob, spin ? 5 : 3, 1); g.fillRect(x + 6 + (spin ? 0 : 1), y - 2 + bob, spin ? 5 : 3, 1);
}
function shardShape(g, x, y, c) { g.fillStyle = c; g.fillRect(x + 2, y, 2, 1); g.fillRect(x + 1, y + 1, 4, 2); g.fillRect(x, y + 3, 5, 2); g.fillRect(x + 1, y + 5, 3, 2); g.fillRect(x + 2, y + 7, 1, 1); }

/* who else is in each memory: [coat, skin, options] */
const CAST = { 1: [['#b08a6f', '#b98a62', { small: true }], ['#6f7a8a', '#f0c8a0', {}]], 2: [['#ff9d2e', '#b98a62', { hair: '#fff8e6' }]], 3: [['#8a3a4a', '#f0c8a0', { hair: '#d9dcf2' }]],
  4: [['#41a0a8', '#e0b890', { small: true, hair: '#ff5c9a' }]], 5: [['#3d4052', '#b98a62', {}], ['#8a6fb0', '#f0c8a0', {}], ['#6fb08a', '#e0b890', {}]], 6: [['#fff8e6', '#b98a62', { hair: '#c86bff' }]], 7: [['#7a7e92', '#f0c8a0', {}], ['#7a7e92', '#b98a62', {}]] };

function scene(g, G, run) {
  const f = run ? run.flags : FLAGS, at = run ? run.at : 'intro1', k = stop(at), t = G.t, calm = G.calm;
  const end = /^[abc]\d|^whole|^who|^two/.test(at), place = PLACE[k];
  if (place === 'under') under(g, t, calm); else if (place === 'street') street(g, t, calm); else sky(g, t, calm, /^[abc]\d/.test(at));
  if (k >= 7) garden(g);
  const memory = at[0] === 'm' || at[0] === 'r';
  courier(g, 96, 66);
  if (memory) {                                                        // the past: other people, seen through violet glass
    (CAST[k] || []).forEach((c, i) => person(g, 150 + i * 22, 66, c[0], c[1], c[2]));
    g.fillStyle = 'rgba(200,107,255,.16)'; g.fillRect(0, 0, 320, 96);
    g.fillStyle = A; g.fillRect(0, 0, 320, 1); g.fillRect(0, 0, 1, 96); g.fillRect(319, 0, 1, 96);
    for (let i = 0; i < 6; i++) { g.fillRect(i * 3, 12 - i * 2, 3, 1); g.fillRect(317 - i * 3, 12 - i * 2, 3, 1); }
  } else {
    drone(g, 124, 52, t, calm);
    if (at[0] === 'f' && (calm || Math.floor(t / 10) % 2)) { shardShape(g, 172, 76, '#ffffff'); g.fillStyle = A; g.fillRect(170, 79, 1, 1); g.fillRect(178, 79, 1, 1); g.fillRect(174, 73, 1, 1); }
    else if (at[0] === 'f') shardShape(g, 172, 76, A);
  }
  // the pane: seven shards, each the colour of what it showed
  box(g, 232, 3, 85, 14, 'rgba(8,9,34,.85)', end ? A : '#5a2f9a');
  for (let i = 1; i <= 7; i++) shardShape(g, 237 + (i - 1) * 11, 6, TINT[f['s' + i] || 0]);
  box(g, 3, 3, textWide(WHERE[k]) + 7, 11, 'rgba(8,9,34,.85)', '#5a2f9a'); text(g, memory ? 'A MEMORY' : WHERE[k], 6, 5, memory ? A : '#d9dcf2');
}
const textWide = (s) => Math.max(s.length, 8) * 6;

const spec = {
  id: 'memory-shards', n: 14, name: 'Memory Shards', district: 'NEON WARD', accent: A, ink: INK,
  how: 'A courier with no memory walks their last route again. Seven shards, one choice in each: what you choose is who they were. Three endings.',
  first: FIRST, flags: FLAGS, nodes: NODES,
  scene: (g, G, run) => scene(g, G, run),
  goal: (run) => 'Shards ' + run.flags.n + ' of 7',
  title: (g, G) => { scene(g, G, null); g.fillStyle = 'rgba(8,9,34,.5)'; g.fillRect(0, 0, 320, 180); },
  check() {
    const w = walk(spec);
    return { ok: !w.problems.length && w.ends.length === 3, note: w.problems.length ? 'branch walker: ' + w.problems.join('; ') : 'branch walker: ' + w.seen + ' nodes, ' + w.states + ' states, endings reached: ' + w.ends.join(', ') };
  }
};
export default story(spec);
