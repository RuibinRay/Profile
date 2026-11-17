/*
 * Case 2226 — Game City No. 45 (Skyline Center, story and mystery).
 *
 * What it does: one case. The guidance core of the Orbital Lift has gone from a sealed lab. Search the lab,
 * question four people — going back to them when you know more — and name the one who took it. The notebook on
 * the right of the picture keeps every clue found. Three wrong names and three ways of being right: six endings.
 * Every step is saved, so a visit can be continued. The runner is the story kit (city/kit/story.js); this file
 * only paints the picture and the notebook above the words.
 * What it leaves alone: everything outside its canvas; it saves where you are and the endings you have seen.
 * To turn its effects off: the sky lanes and the blinking lamp stand still with the visitor's reduced-motion setting.
 * The story is in data.js. check() walks every branch for tools/city-check.mjs.
 */
import { story, walk } from '../../kit/story.js';
import { text, box, rnd } from '../../kit/draw.js';
import { NODES, FLAGS, FIRST, CLUES } from './data.js';

const A = '#58e6ff', INK = '#021820';
/* the four people: [name, skin, hair, coat, what marks them] */
const CAST = { sol: ['DR. SOLVANG', '#e0b890', '#d9dcf2', '#fff8e6', 'glasses'], od: ['SELA ODUYA', '#8a5a3c', '#1a1a24', '#2b4a8a', 'cap'], dr: ['CASTELLAN DRAY', '#f0c8a0', '#3a2a1c', '#5a1a3a', 'tie'], pip: ['PIP ARANDA', '#c98a5a', '#ff7a4a', '#3a7f5a', 'hood'] };
const who = (id) => (/^end(sol|od|dr)/.test(id) ? id.slice(3) : /^(endt|endh|endg|acpip)/.test(id) ? 'pip' : (Object.keys(CAST).find((k) => id.startsWith(k)) || ''));

function corridor(g, t, calm, dawn) {                                  // floor 90: a long window on the city
  g.fillStyle = '#0d2230'; g.fillRect(4, 4, 148, 88);
  const sky = dawn ? ['#3b2a5a', '#8a4a6a', '#ff9d8a', '#ffd38a'] : ['#06101c', '#0a1a2c', '#0f2a40', '#143a52'];
  sky.forEach((c, i) => { g.fillStyle = c; g.fillRect(8, 8 + i * 14, 140, 14); });
  const r = rnd(45);
  for (let x = 8; x < 148;) { const w = 6 + Math.floor(r() * 10), h = 10 + Math.floor(r() * 30); g.fillStyle = dawn ? '#2a1a3a' : '#0b2230'; g.fillRect(x, 64 - h, Math.min(w, 148 - x), h); for (let y = 66 - h; y < 62; y += 4) if (r() < 0.5) { g.fillStyle = '#ffe08a'; g.fillRect(x + 2, y, 1, 1); } x += w + 1; }
  g.fillStyle = '#d9dcf2'; g.fillRect(110, 8, 1, 56);                                         // the lift's cable
  g.fillStyle = A; g.fillRect(108, 20 + (calm ? 0 : Math.floor(t / 6) % 30), 5, 6);
  for (let i = 0; i < 3; i++) { g.fillStyle = '#ff9d2e'; g.fillRect(8 + ((i * 53 + (calm ? 0 : Math.floor(t / 3))) % 138), 22 + i * 9, 3, 1); }
  g.fillStyle = '#123246'; for (let x = 8; x < 150; x += 35) g.fillRect(x - 1, 8, 2, 56);
  g.fillStyle = '#1d4a62'; g.fillRect(4, 64, 148, 28); g.fillStyle = '#2b6a88'; g.fillRect(4, 64, 148, 1);
  for (let x = 10; x < 150; x += 16) { g.fillStyle = '#184054'; g.fillRect(x, 70, 10, 1); g.fillRect(x + 4, 80, 10, 1); }
}
function lab(g, t, calm, f) {
  g.fillStyle = '#0f2a38'; g.fillRect(4, 4, 148, 88);
  g.fillStyle = '#143a4c'; for (let x = 4; x < 152; x += 12) g.fillRect(x, 4, 1, 60);
  g.fillStyle = '#1d4a62'; g.fillRect(4, 64, 148, 28); g.fillStyle = '#2b6a88'; g.fillRect(4, 64, 148, 1);
  box(g, 56, 34, 44, 30, '#0b2230', '#58e6ff');                                              // the empty cradle
  g.fillStyle = '#d9dcf2'; g.fillRect(60, 30, 3, 8); g.fillRect(93, 30, 3, 8); g.fillRect(60, 30, 8, 2); g.fillRect(88, 30, 8, 2);
  g.fillStyle = '#06141c'; g.fillRect(66, 40, 24, 18);
  text(g, 'CORE', 78, 46, '#2f7f96', { align: 'center' });
  box(g, 14, 22, 24, 14, '#06141c', '#2b6a88');                                              // the door log
  if (f.log) { text(g, '02:10', 26, 26, '#ff7a4a', { align: 'center' }); }
  box(g, 118, 54, 16, 12, '#3d4052', '#d9dcf2');                                             // the cleaning robot
  g.fillStyle = f.bot ? '#ff5c7a' : (calm || Math.floor(t / 20) % 2) ? '#5cf08a' : '#12301e'; g.fillRect(124, 58, 4, 2);
  g.fillStyle = '#22232e'; g.fillRect(119, 66, 4, 2); g.fillRect(129, 66, 4, 2);
  g.fillStyle = '#2f9ab4'; g.fillRect(40, 76, 34, 6); g.fillRect(46, 74, 20, 10);              // the coolant
  if (f.prints) { g.fillStyle = '#0b2230'; g.fillRect(50, 76, 4, 6); g.fillRect(60, 78, 4, 6); g.fillStyle = '#2f9ab4'; g.fillRect(51, 78, 2, 1); g.fillRect(61, 80, 2, 1); }
}
function bust(g, x, y, c) {
  const [, skin, hair, coat, mark] = c;
  g.fillStyle = coat; g.fillRect(x - 22, y + 44, 44, 26); g.fillRect(x - 16, y + 40, 32, 6);
  g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(x - 2, y + 46, 4, 24);
  g.fillStyle = skin; g.fillRect(x - 5, y + 34, 10, 8); g.fillRect(x - 12, y + 8, 24, 28);
  g.fillStyle = 'rgba(0,0,0,.18)'; g.fillRect(x - 12, y + 32, 24, 4);
  g.fillStyle = hair; g.fillRect(x - 13, y + 4, 26, 8); g.fillRect(x - 13, y + 8, 3, 14); g.fillRect(x + 10, y + 8, 3, 10);
  g.fillStyle = '#12202c'; g.fillRect(x - 7, y + 19, 3, 3); g.fillRect(x + 4, y + 19, 3, 3); g.fillRect(x - 4, y + 29, 8, 1);
  if (mark === 'glasses') { g.fillStyle = '#12202c'; g.fillRect(x - 10, y + 17, 9, 1); g.fillRect(x + 1, y + 17, 9, 1); g.fillRect(x - 10, y + 23, 9, 1); g.fillRect(x + 1, y + 23, 9, 1); g.fillRect(x - 10, y + 17, 1, 7); g.fillRect(x - 2, y + 17, 1, 7); g.fillRect(x + 1, y + 17, 1, 7); g.fillRect(x + 9, y + 17, 1, 7); g.fillRect(x - 1, y + 19, 2, 1); }
  if (mark === 'cap') { g.fillStyle = coat; g.fillRect(x - 14, y + 1, 28, 8); g.fillRect(x - 16, y + 9, 22, 3); g.fillStyle = '#ffe08a'; g.fillRect(x - 3, y + 3, 6, 4); }
  if (mark === 'tie') { g.fillStyle = '#fff8e6'; g.fillRect(x - 6, y + 42, 12, 8); g.fillStyle = '#ffd38a'; g.fillRect(x - 2, y + 44, 4, 16); g.fillStyle = '#12202c'; g.fillRect(x - 6, y + 28, 12, 1); }
  if (mark === 'hood') { g.fillStyle = coat; g.fillRect(x - 16, y + 2, 32, 6); g.fillRect(x - 16, y + 2, 5, 40); g.fillRect(x + 11, y + 2, 5, 40); g.fillStyle = '#ffd38a'; g.fillRect(x - 14, y + 50, 8, 2); }
}
function scene(g, G, run) {
  const f = run ? run.flags : FLAGS, at = run ? run.at : 'intro1', t = G.t, p = who(at);
  g.fillStyle = '#06141c'; g.fillRect(0, 0, 320, 96);
  if (at.startsWith('lab')) lab(g, t, G.calm, f);
  else {
    corridor(g, t, G.calm, at.startsWith('end'));
    if (p) { g.fillStyle = 'rgba(6,20,28,.55)'; g.fillRect(4, 4, 148, 88); bust(g, 78, 14, CAST[p]); box(g, 8, 80, textWide(CAST[p][0]), 11, 'rgba(6,20,28,.9)', A); text(g, CAST[p][0], 11, 82, '#fff8e6'); }
  }
  g.fillStyle = A; g.fillRect(4, 4, 148, 1); g.fillRect(4, 91, 148, 1); g.fillRect(4, 4, 1, 88); g.fillRect(151, 4, 1, 88);
  // the notebook
  box(g, 156, 4, 160, 88, '#f2ead6', '#b9a58a');
  g.fillStyle = '#c9bfa6'; for (let y = 22; y < 90; y += 8) g.fillRect(158, y, 156, 1);
  g.fillStyle = '#ff7a4a'; g.fillRect(166, 5, 1, 86);
  const n = CLUES.filter(([k]) => f[k]).length;
  text(g, 'NOTEBOOK', 170, 7, '#3a2a1c'); text(g, n + ' OF ' + CLUES.length, 312, 7, '#8a7a60', { align: 'right' });
  let y = 16;
  CLUES.forEach(([k, line]) => { if (f[k]) { text(g, line, 170, y, '#1c2a4a'); y += 8; } });
  if (!n) text(g, 'NOTHING YET.', 170, 16, '#8a7a60');
}
const textWide = (s) => s.length * 6 + 5;

const spec = {
  id: 'case-2226', n: 45, name: 'Case 2226', district: 'SKYLINE CENTER', accent: A, ink: INK,
  how: 'Search the lab, question four people, and go back to them when you know more. Then name the one who took the core. Six endings.',
  first: FIRST, flags: FLAGS, nodes: NODES,
  scene: (g, G, run) => scene(g, G, run),
  goal: (run) => 'Clues ' + CLUES.filter(([k]) => run.flags[k]).length + ' of ' + CLUES.length,
  title: (g, G) => { scene(g, G, null); g.fillStyle = 'rgba(8,9,34,.5)'; g.fillRect(0, 0, 320, 180); },
  check() {
    const w = walk(spec);
    return { ok: !w.problems.length && w.ends.length === 6, note: w.problems.length ? 'branch walker: ' + w.problems.join('; ') : 'branch walker: ' + w.seen + ' nodes, ' + w.states + ' states, endings reached: ' + w.ends.join(', ') };
  }
};
export default story(spec);
