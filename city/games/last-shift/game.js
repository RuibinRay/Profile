/*
 * Last Shift — Game City No. 29 (Moon Dock, story and survival).
 *
 * What it does: one night alone in the control room of a Moon base. Five times something fails, and each time
 * you choose what to spend — a spare power cell, another system, or your own strength — to keep the crew warm,
 * the air clean and the supply tug able to land. Three endings. The text types out and finishes on one press;
 * every step is saved, so a visit can be continued. The runner is the story kit (city/kit/story.js).
 * What it leaves alone: everything outside its canvas; it saves where you are and the endings you have seen.
 * To turn its effects off: the blinking lamp and the typing slow down with the visitor's reduced-motion setting.
 * The story is in data.js. check() walks every branch for tools/city-check.mjs.
 */
import { story, walk } from '../../kit/story.js';
import { text, box, rnd } from '../../kit/draw.js';
import { NODES, FLAGS, FIRST, CLOCK, TROUBLE } from './data.js';

const A = '#ff9d2e', INK = '#160c02';
const stage = (id) => (id.startsWith('intro') ? 'intro' : id.startsWith('end') || id === 'e6' ? 'end' : id.slice(0, 2));

function room(g, G, run) {
  const f = run ? run.flags : FLAGS, st = run ? stage(run.at) : 'intro', dawn = st === 'end', t = G.t;
  g.fillStyle = '#15161f'; g.fillRect(0, 0, 320, 96);
  // the window: the sky, the Earth, the crater rim, the landing pad
  box(g, 8, 6, 196, 62, dawn ? '#2a1620' : '#04040c', '#5d6072');
  const r = rnd(29);
  for (let i = 0; i < 46; i++) { g.fillStyle = i % 4 ? '#7a7e92' : '#ffffff'; g.fillRect(10 + Math.floor(r() * 192), 8 + Math.floor(r() * 34), 1, 1); }
  if (dawn) { g.fillStyle = '#ff9d2e'; g.fillRect(9, 40, 194, 3); g.fillStyle = '#ffd38a'; g.fillRect(9, 43, 194, 3); g.fillStyle = '#fff8e6'; g.fillRect(150, 34, 12, 12); }
  g.fillStyle = '#3b7de0'; g.fillRect(40, 14, 9, 9); g.fillStyle = '#04040c'; g.fillRect(40, 14, 2, 2); g.fillRect(47, 14, 2, 2); g.fillRect(40, 21, 2, 2); g.fillRect(47, 21, 2, 2);
  g.fillStyle = '#e8f2ff'; g.fillRect(43, 16, 3, 2); g.fillRect(45, 19, 2, 1);
  g.fillStyle = '#5d6072';
  for (let x = 9; x < 203; x++) { const h = 14 + Math.round(Math.sin(x / 17) * 4 + Math.sin(x / 5.3) * 1.5); g.fillRect(x, 67 - h, 1, h); }
  g.fillStyle = '#7a7e92'; for (let x = 9; x < 203; x += 2) g.fillRect(x, 60 + (x % 3), 2, 7 - (x % 3));
  g.fillStyle = '#3d4052'; g.fillRect(120, 58, 44, 3);                                       // the pad
  const lit = f.dock >= 1;
  for (let i = 0; i < 5; i++) { g.fillStyle = lit && (G.calm || (Math.floor(t / 12) + i) % 2) ? '#ffd38a' : '#22232e'; g.fillRect(122 + i * 10, 56, 2, 2); }
  if (lit && (st === 'end')) { g.fillStyle = '#d9dcf2'; g.fillRect(134, 44, 16, 10); g.fillStyle = '#ff9d2e'; g.fillRect(138, 47, 8, 3); g.fillStyle = '#7a7e92'; g.fillRect(132, 54, 3, 4); g.fillRect(149, 54, 3, 4); }
  // the board: one lamp for each system
  box(g, 210, 6, 104, 62, '#0c0d16', '#5d6072');
  text(g, CLOCK[st] || '', 262, 10, A, { align: 'center', scale: 2 });
  const now = TROUBLE[st];
  const rows = [['HEAT', f.heat >= 1, 'heat'], ['AIR', true, 'air'], ['GREENHOUSE', f.green >= 1, 'green'], ['RELAY', f.comms >= 1, 'comms'], ['DOCK', f.dock >= 1, 'dock']];
  rows.forEach(([name, on, key], i) => {
    const y = 28 + i * 8, blink = now === key || (now === 'bank' && false);
    text(g, name, 216, y, '#d9dcf2');
    g.fillStyle = blink ? ((G.calm || Math.floor(t / 15) % 2) ? '#ffb347' : '#3a2a10') : on ? '#5cf08a' : key === 'dock' ? '#3d4052' : '#ff5c7a';
    g.fillRect(300, y, 8, 6);
  });
  // the desk: the rack of spare cells, the keeper
  g.fillStyle = '#22232e'; g.fillRect(0, 70, 320, 26); g.fillStyle = '#3d4052'; g.fillRect(0, 70, 320, 1);
  text(g, 'SPARE CELLS', 10, 76, '#d9dcf2');
  for (let i = 0; i < 4; i++) { box(g, 10 + i * 16, 85, 13, 8, i < f.cells ? A : '#15161f', '#7a7e92'); if (i < f.cells) { g.fillStyle = '#ffd38a'; g.fillRect(12 + i * 16, 87, 2, 4); } }
  if (now === 'bank') { box(g, 92, 74, 58, 19, (G.calm || Math.floor(t / 15) % 2) ? '#5a1a10' : '#2a1410', '#ff5c7a'); text(g, 'BANK C', 121, 77, '#fff8e6', { align: 'center' }); text(g, 'HOT', 121, 85, '#ffb347', { align: 'center' }); }
  // the keeper, at the desk (standing in blankets with the crew once they are awake)
  const kx = 176, ky = 72, nod = f.tired >= 2 ? 2 : 0;
  g.fillStyle = '#7a7e92'; g.fillRect(kx - 2, ky + 14, 14, 10);
  g.fillStyle = A; g.fillRect(kx, ky + 8 + nod, 10, 10);
  g.fillStyle = '#f0c8a0'; g.fillRect(kx + 2, ky + nod, 6, 7);
  g.fillStyle = '#3a2a1c'; g.fillRect(kx + 2, ky + nod, 6, 2);
  if (f.woke >= 1) for (let i = 0; i < 6; i++) { const x = 216 + i * 15; g.fillStyle = ['#8a6fb0', '#6f9ab0', '#b08a6f', '#6fb08a', '#b06f8a', '#9ab06f'][i]; g.fillRect(x, 80, 9, 14); g.fillStyle = i % 2 ? '#f0c8a0' : '#b98a62'; g.fillRect(x + 2, 75, 5, 6); }
}

const spec = {
  id: 'last-shift', n: 29, name: 'Last Shift', district: 'MOON DOCK', accent: A, ink: INK,
  how: 'One night alone at a Moon base. Things fail one by one, and you decide what to keep running with the power you have. Three endings.',
  first: FIRST, flags: FLAGS, nodes: NODES,
  scene: (g, G, run) => room(g, G, run),
  goal: (run) => 'Spare cells ' + run.flags.cells,
  title: (g, G) => { g.fillStyle = '#0b0c2e'; g.fillRect(0, 0, 320, 180); room(g, G, null); g.fillStyle = 'rgba(8,9,34,.55)'; g.fillRect(0, 0, 320, 180); },
  check() {
    const w = walk(spec);
    return { ok: !w.problems.length, note: w.problems.length ? 'branch walker: ' + w.problems.join('; ') : 'branch walker: ' + w.seen + ' nodes, ' + w.states + ' states, endings reached: ' + w.ends.join(', ') };
  }
};
export default story(spec);
