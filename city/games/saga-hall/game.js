/*
 * Saga Hall — Game City No. 34 (North Harbour, story with cards).
 *
 * What it does: you are the teller in a longhouse. Choose a hero, a deed and a place, and tell it. If it is one of
 * the eight sagas the hall knows in its bones, you hear it in full and it joins your collection; if not, the hall
 * shows how close you were. New cards join your hand as the collection grows. Finding all eight stamps the pass.
 * What it leaves alone: everything outside its canvas; it saves the sagas found and how many tellings it took.
 * To turn its effects off: the fire and the listeners stand still with the visitor's reduced-motion setting.
 * The cards and sagas are in data.js. check() tells every saga through the real controls for tools/city-check.mjs.
 */
import { text, wrap, box, sprite, rnd } from '../../kit/draw.js';
import { KINDS, CARDS, SAGAS, REACT } from './data.js';

const A = '#7fe8c0', INK = '#04140f';
const TINT = { hero: ['#ffcf6b', '#fff0c8'], deed: ['#ff7a8a', '#ffd0d6'], place: ['#7fb8ff', '#e0f0ff'] };
const S = { mode: 'pick', sel: [0, 0, 0], col: 0, found: {}, told: 0, mood: 0, moodT: 0, pages: [], page: 0, shown: 0, t: 0, fresh: -1 };
const inside = (p, x, y, w, h) => p.x >= x && p.x < x + w && p.y >= y && p.y < y + h;
const count = () => Object.keys(S.found).length;
/** the cards of one kind that are in the hand with n sagas found */
export const hand = (kind, n) => CARDS[kind].map((c, i) => i).filter((i) => CARDS[kind][i].at <= n);
/** what a telling is: { saga } when it is one, else { react } — the line the hall answers with */
export function judge(sel, found) {
  const k = SAGAS.findIndex((s) => s.is.every((v, i) => v === sel[i]));
  if (k >= 0) return { saga: k };
  let best = 0, pair = '';
  SAGAS.forEach((s, i) => {
    if (found[i]) return;
    const m = s.is.map((v, j) => v === sel[j]), n = m.filter(Boolean).length;
    if (n > best) { best = n; pair = m[0] && m[1] ? 'hd' : m[0] && m[2] ? 'hp' : 'dp'; }
  });
  return { react: best === 2 ? pair : best, mood: best };
}
function cycle(G, col, d) {
  const list = hand(KINDS[col], count()), at = list.indexOf(S.sel[col]);
  S.sel[col] = list[(at + d + list.length) % list.length]; S.col = col; G.sfx('move');
}
function tell(G) {
  const names = S.sel.map((v, i) => CARDS[KINDS[i]][v]), line = names[0].say[0].toUpperCase() + names[0].say.slice(1) + ' ' + names[1].say + ' ' + names[2].say + '.';
  const res = judge(S.sel, S.found);
  S.told++; S.pages = []; S.page = 0; S.shown = 0; S.t = 0; S.mode = 'tell'; S.fresh = -1;
  if (res.saga != null) {
    const s = SAGAS[res.saga], isNew = !S.found[res.saga], before = count();
    S.mood = 3;
    S.pages.push({ head: s.title, text: s.text });
    if (isNew) {
      S.found[res.saga] = true; S.fresh = res.saga;
      const n = count(), joins = KINDS.flatMap((kind) => CARDS[kind].filter((c) => c.at > before && c.at <= n).map((c) => c.name));
      S.pages.push({ head: 'A NEW SAGA FOR THE HALL', text: 'The benches thunder. That makes ' + n + ' of ' + SAGAS.length + '.' + (joins.length ? '\nA new card joins your hand: ' + joins.join(', ') + '.' : '') });
    } else S.pages[0].head = s.title + ' (THEY KNOW IT, AND LOVE IT STILL)';
    G.sfx(isNew ? 'win' : 'good');
  } else { S.mood = res.mood; S.pages.push({ head: 'YOU TELL IT', text: line + '\n' + REACT[res.react] }); G.sfx(res.mood ? 'pick' : 'bad'); }
  S.moodT = 0;
  G.save.data.found = S.found; G.save.data.told = S.told; G.commit();
}

const def = {
  id: 'saga-hall', n: 34, name: 'Saga Hall', district: 'NORTH HARBOUR', accent: A, ink: INK,
  how: 'Choose a hero, a deed and a place, and tell it to the hall. Eight sagas are waiting to be found; the hall shows how close you are.',
  best: (save) => { const n = Object.keys((save.data && save.data.found) || {}).length; return n ? n + ' OF ' + SAGAS.length + ' SAGAS' : ''; },
  start(G) {
    S.found = { ...(G.save.data.found || {}) }; S.told = G.save.data.told || 0;
    if (count() === SAGAS.length) { S.found = {}; S.told = 0; }             // the whole collection: begin a new one
    S.mode = 'pick'; S.sel = [0, 0, 0]; S.col = 0; S.mood = 0; S.t = 0;
  },
  tick(G) {
    S.t++; S.moodT++;
    G.hud = 'Sagas ' + count() + ' of ' + SAGAS.length + ' · told ' + S.told;
    if (S.mode === 'book') { if (G.hit.ok || G.hit.levels || G.ptr.hit) { S.mode = 'pick'; G.sfx('blip'); } return; }
    if (S.mode === 'tell') {
      const p = S.pages[S.page], full = p.text.length;
      if (S.shown < full) { S.shown = Math.min(full, S.shown + (G.calm ? 4 : 1.5)); if (S.t % 4 === 0) G.sfx('type'); if (G.hit.ok || G.ptr.hit) S.shown = full; return; }
      if (G.hit.ok || G.ptr.hit) {
        if (S.page < S.pages.length - 1) { S.page++; S.shown = 0; G.sfx('blip'); return; }
        S.mode = 'pick'; S.mood = 0;
        KINDS.forEach((kind, i) => { if (!hand(kind, count()).includes(S.sel[i])) S.sel[i] = 0; });
        if (count() === SAGAS.length) G.finish({ title: 'THE HALL IS FULL OF SAGAS', won: true, stamp: true, lines: ['ALL ' + SAGAS.length + ' SAGAS FOUND IN ' + S.told + ' TELLINGS.', 'THEY WILL BE TOLD HERE ALL WINTER.'] });
      }
      return;
    }
    if (G.hit.left) { S.col = (S.col + 2) % 3; G.sfx('move'); }
    if (G.hit.right) { S.col = (S.col + 1) % 3; G.sfx('move'); }
    if (G.hit.up) cycle(G, S.col, -1);
    if (G.hit.down) cycle(G, S.col, 1);
    for (let k = 1; k <= 3; k++) if (G.hit['d' + k]) cycle(G, k - 1, 1);
    if (G.hit.levels) { S.mode = 'book'; G.sfx('blip'); return; }
    if (G.ptr.hit) {
      for (let c = 0; c < 3; c++) if (inside(G.ptr, 6 + c * 104, 70, 100, 56)) { cycle(G, c, 1); return; }
      if (inside(G.ptr, 222, 134, 92, 18)) { S.mode = 'book'; G.sfx('blip'); return; }
      if (inside(G.ptr, 6, 134, 210, 18)) { tell(G); return; }
    }
    if (G.hit.ok) tell(G);
  },
  draw(g, G) {
    hall(g, G);
    if (S.mode === 'book') { book(g); return; }
    if (S.mode === 'tell') { telling(g, G); return; }
    const n = count();
    KINDS.forEach((kind, c) => {
      const x = 6 + c * 104, card = CARDS[kind][S.sel[c]], on = S.col === c, list = hand(kind, n);
      box(g, x, 70, 100, 56, '#241a14', on ? '#fff8e6' : '#7a5632');
      g.fillStyle = TINT[kind][0]; g.fillRect(x + 1, 71, 98, 10);
      text(g, kind.toUpperCase(), x + 4, 73, INK); text(g, (list.indexOf(S.sel[c]) + 1) + '/' + list.length, x + 96, 73, INK, { align: 'right' });
      box(g, x + 5, 86, 22, 22, '#12100c', TINT[kind][0]);
      sprite(g, card.art, x + 8, 89, { '#': TINT[kind][0], o: TINT[kind][1] }, { scale: 2 });
      wrap(card.name, 64).forEach((l, i) => text(g, l, x + 32, 86 + i * 9, '#fff8e6'));
      const next = CARDS[kind].find((cd) => cd.at > n);
      text(g, next ? 'MORE AT ' + next.at + ' SAGAS' : '', x + 50, 116, '#8a7a60', { align: 'center' });
    });
    const hot = inside(G.ptr, 6, 134, 210, 18);
    box(g, 6, 134, 210, 18, hot ? '#fff8e6' : A, '#fff8e6'); text(g, 'TELL IT TO THE HALL', 111, 140, INK, { align: 'center' });
    box(g, 222, 134, 92, 18, inside(G.ptr, 222, 134, 92, 18) ? A : '#241a14', A); text(g, 'SAGAS ' + n + '/' + SAGAS.length, 268, 140, inside(G.ptr, 222, 134, 92, 18) ? INK : '#fff8e6', { align: 'center' });
    text(g, 'TAP A CARD TO CHANGE IT, OR USE THE ARROWS.', 160, 160, '#8a7a60', { align: 'center' });
    text(g, S.told ? 'TOLD ' + S.told + (S.told === 1 ? ' TIME' : ' TIMES') : 'THE HALL IS WAITING.', 160, 170, '#b9a58a', { align: 'center' });
  },
  title: (g, G) => { hall(g, G); g.fillStyle = 'rgba(8,9,34,.55)'; g.fillRect(0, 0, 320, 180); },
  check,
  _s: S
};
export default def;

function hall(g, G) {
  const t = G.t, calm = G.calm, mood = S.mode === 'tell' ? S.mood : 0;
  g.fillStyle = '#16100c'; g.fillRect(0, 0, 320, 180);
  for (let x = 0; x < 320; x += 16) { g.fillStyle = (x / 16) % 2 ? '#2c1e14' : '#33241a'; g.fillRect(x, 0, 15, 50); }      // the plank wall
  g.fillStyle = '#4a3322'; g.fillRect(0, 0, 320, 4); for (let x = 30; x < 320; x += 86) { g.fillRect(x, 0, 6, 50); }
  [[62, '#7fe8c0'], [148, '#ffcf6b'], [234, '#ff7a8a']].forEach(([x, c]) => { g.fillStyle = '#12100c'; g.fillRect(x, 10, 16, 18); g.fillStyle = c; g.fillRect(x + 1, 11, 14, 16); g.fillStyle = '#12100c'; g.fillRect(x + 7, 11, 2, 16); g.fillRect(x + 1, 18, 14, 2); });   // shields
  g.fillStyle = '#241a14'; g.fillRect(0, 50, 320, 18); g.fillStyle = '#3a2a1c'; g.fillRect(0, 50, 320, 1);
  // the fire, higher the better the telling goes
  const fx = 160, h = 8 + mood * 4 + (calm ? 0 : Math.floor(Math.sin(t / 5) * 2));
  g.fillStyle = '#3a2a1c'; g.fillRect(fx - 14, 60, 28, 4);
  g.fillStyle = '#ff7a2e'; g.fillRect(fx - 8, 60 - h, 16, h); g.fillStyle = '#ffcf6b'; g.fillRect(fx - 4, 60 - h + 3, 8, h - 3); g.fillStyle = '#fff8e6'; g.fillRect(fx - 1, 60 - Math.floor(h / 2), 3, Math.floor(h / 2));
  g.fillStyle = 'rgba(255,160,60,.10)'; g.fillRect(fx - 60, 20, 120, 46);
  if (!calm) { const r = rnd(Math.floor(t / 6)); for (let i = 0; i < 3 + mood * 2; i++) { g.fillStyle = '#ffcf6b'; g.fillRect(fx - 10 + Math.floor(r() * 20), 58 - h - Math.floor(r() * 14), 1, 1); } }
  // the listeners on their benches; they raise their horns as the telling gets warmer
  const cloaks = ['#8a3a4a', '#3a5a8a', '#5a7a3a', '#8a6a2a', '#5a3a7a', '#2a6a6a', '#7a4a2a', '#4a4a6a'];
  for (let i = 0; i < 8; i++) {
    const x = (i < 4 ? 22 : 190) + (i % 4) * 28, up = mood === 3 || (mood === 2 && i % 2 === 0) || (mood === 1 && i % 4 === 1);
    const hop = up && !calm && mood === 3 ? (Math.floor(S.moodT / 8 + i) % 2) : 0;
    g.fillStyle = cloaks[i]; g.fillRect(x, 46 - hop, 12, 14); g.fillStyle = i % 3 ? '#e0b890' : '#b98a62'; g.fillRect(x + 3, 39 - hop, 6, 7);
    g.fillStyle = i % 2 ? '#d9a04a' : '#7a4a2a'; g.fillRect(x + 3, 38 - hop, 6, 2); if (i % 3 === 0) g.fillRect(x + 3, 44 - hop, 6, 2);
    if (up) { g.fillStyle = cloaks[i]; g.fillRect(x + 11, 38 - hop, 2, 9); g.fillStyle = '#fff8e6'; g.fillRect(x + 10, 34 - hop, 4, 4); g.fillStyle = '#ffcf6b'; g.fillRect(x + 10, 34 - hop, 4, 1); }
  }
  g.fillStyle = '#4a3322'; g.fillRect(16, 60, 116, 3); g.fillRect(186, 60, 116, 3);
  g.fillStyle = A; g.fillRect(148, 46, 2, 14); g.fillStyle = '#04140f'; g.fillRect(140, 40, 8, 20); g.fillStyle = A; g.fillRect(140, 44, 8, 12); g.fillStyle = '#e0b890'; g.fillRect(141, 37, 6, 7);      // the teller
}
function telling(g, G) {
  const p = S.pages[S.page];
  box(g, 2, 70, 316, 108, 'rgba(12,8,6,.96)', S.mood === 3 ? A : '#d9dcf2');
  wrap(p.head, 300).forEach((l, i) => text(g, l, 9, 75 + i * 9, A));
  const y0 = 75 + wrap(p.head, 300).length * 9 + 3;
  let left = Math.floor(S.shown);
  wrap(p.text, 300).forEach((l, i) => { if (left <= 0) return; text(g, l.slice(0, left), 9, y0 + i * 9, '#fff8e6'); left -= l.length + 1; });
  if (S.shown >= p.text.length && (G.calm || Math.floor(S.t / 25) % 2 === 0)) text(g, '>', 311, 168, A, { align: 'right' });
}
function book(g) {
  box(g, 20, 6, 280, 168, 'rgba(12,8,6,.97)', A);
  text(g, 'THE SAGAS OF THIS HALL', 160, 13, A, { align: 'center' });
  SAGAS.forEach((s, i) => { const got = S.found[i]; text(g, (i + 1) + '.', 30, 30 + i * 14, got ? A : '#5f4a36'); text(g, got ? s.title : '? ? ?', 44, 30 + i * 14, got ? '#fff8e6' : '#5f4a36'); });
  text(g, 'TELL A SAGA AGAIN TO HEAR IT AGAIN.', 160, 148, '#8a7a60', { align: 'center' });
  text(g, 'SPACE OR TAP: BACK', 160, 160, '#b9a58a', { align: 'center' });
}

/**
 * The check: the data is sound (every saga can be told with cards that are in the hand by then, every page fits),
 * and a teller who follows the hall's hints finds all eight through the real controls.
 */
function check({ createCore }) {
  const problems = [];
  SAGAS.forEach((s, i) => {
    if (wrap(s.text, 300).length + wrap(s.title + ' (THEY KNOW IT, AND LOVE IT STILL)', 300).length > 10) problems.push('saga ' + (i + 1) + ' does not fit the box');
    if (wrap(s.title, 236).length > 1) problems.push('the title of saga ' + (i + 1) + ' is too long for the list');
    if (SAGAS.some((o, j) => j < i && o.is.join() === s.is.join())) problems.push('saga ' + (i + 1) + ' repeats another');
  });
  const { G, T } = createCore(def, { seed: 3 });
  T.step(10); T.press('ok'); T.step(2);
  const pressTo = (col, want) => {                                       // move to a column, then turn its card
    for (let k = 0; k < 3 && S.col !== col; k++) { T.press('right'); T.step(1); }
    for (let k = 0; k < 5 && S.sel[col] !== want; k++) { T.press('down'); T.step(1); }
    return S.sel[col] === want;
  };
  let guard = 0;
  while (G.state === 'play' && count() < SAGAS.length && guard++ < 80) {
    const n = count(), tried = (def._tried = def._tried || {});
    // every telling the hand allows that has not been tried; prefer the one the hints so far make likeliest
    const options = [];
    hand('hero', n).forEach((h) => hand('deed', n).forEach((d) => hand('place', n).forEach((p) => { if (!tried[[h, d, p]]) options.push([h, d, p]); })));
    if (!options.length) { problems.push('no telling left with ' + n + ' sagas found'); break; }
    const hint = def._hint;
    const fits = (o) => !hint || (hint.kind === 'hd' ? o[0] === hint.sel[0] && o[1] === hint.sel[1] : hint.kind === 'hp' ? o[0] === hint.sel[0] && o[2] === hint.sel[2] : o[1] === hint.sel[1] && o[2] === hint.sel[2]);
    const sel = options.find(fits) || options[0];
    tried[sel] = true;
    if (!sel.every((v, c) => pressTo(c, v))) { problems.push('the controls could not choose ' + sel); break; }
    T.press('ok'); T.step(2);
    const res = judge(sel, Object.fromEntries(Object.keys(S.found).filter((k) => SAGAS[k].is.join() !== sel.join()).map((k) => [k, true])));
    def._hint = res.saga == null && typeof res.react === 'string' ? { kind: res.react, sel } : null;
    for (let k = 0; k < 6 && S.mode === 'tell'; k++) { T.press('ok'); T.step(2); T.press('ok'); T.step(2); }
  }
  const told = S.told;
  if (count() < SAGAS.length && !problems.length) problems.push('only ' + count() + ' sagas found');
  if (G.state !== 'over' && !problems.length) problems.push('finding every saga did not end the round');
  if (!G.stamped && !problems.length) problems.push('the City Pass was not stamped');
  if (G.lastError) problems.push(String(G.lastError));
  delete def._tried; delete def._hint;
  return { ok: !problems.length, note: problems.length ? problems.join('; ') : 'a teller following the hall\'s hints found all ' + SAGAS.length + ' sagas in ' + told + ' tellings, through the controls; City Pass stamped' };
}
