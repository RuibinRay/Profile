/*
 * story.js — what every story in Game City shares: a dialogue runner over data, a flag store, text that types
 * out and finishes on one press, choices, an auto-save at every step, and a branch walker for tests.
 *
 *   export default story({ id, n, name, district, accent, ink, how,      as for any game (shell.js)
 *     first,                  the id of the first node
 *     flags,                  the flags a new story starts with: { cells: 5, ... } (numbers)
 *     nodes: { id: node },    the story, as data
 *     scene(g, G, run, node)  paint the picture above the text box (y < 96); run = { at, flags }
 *     goal(run)               optional: the line that says what the player is trying to do now })
 *
 * A node is one of:
 *   { who, text, next }                        someone speaks; a press goes on
 *   { who, text, choices: [{ text, next, if, set, need }] }
 *                                              a choice. `if` hides it unless the flags allow; with `need` it is
 *                                              shown greyed instead, with that reason
 *   { goto: [{ if, next }, { next }] }         no text: go to the first entry whose `if` holds
 *   { end, title, text, good }                 an ending: its id, a title and closing words
 * Any node may carry `set`, applied on arriving. Conditions are strings: 'cells>=2', 'heat==0&comms>0'.
 * `set` adds numbers ({ cells: -1 }) or fixes a value with a string ({ heat: '=0' }).
 *
 * Saved under city:<id>: data.run (where you are, so a visit can be continued) and data.ends (endings seen).
 * Reaching any ending stamps the City Pass. The picture and the words are entirely the game's.
 */
import { text, textW, wrap, box } from './draw.js';

export function holds(cond, flags) {
  if (!cond) return true;
  return cond.split('&').every((c) => {
    const m = /^\s*(\w+)\s*(>=|<=|==|!=|>|<)\s*(-?\d+)\s*$/.exec(c);
    if (!m) throw new Error('bad condition: ' + c);
    const a = flags[m[1]] || 0, b = +m[3];
    return m[2] === '>=' ? a >= b : m[2] === '<=' ? a <= b : m[2] === '==' ? a === b : m[2] === '!=' ? a !== b : m[2] === '>' ? a > b : a < b;
  });
}
export function apply(set, flags) {
  const f = { ...flags };
  if (set) Object.entries(set).forEach(([k, v]) => { f[k] = typeof v === 'string' ? +v.replace('=', '') : (f[k] || 0) + v; });
  return f;
}
/** Arrive at a node: apply its `set`, and follow `goto` nodes until one with words. Returns { at, flags }. */
export function arrive(spec, id, flags) {
  for (let hops = 0; hops < 50; hops++) {
    const node = spec.nodes[id];
    if (!node) throw new Error('no such node: ' + id);
    flags = apply(node.set, flags);
    if (!node.goto) return { at: id, flags };
    const way = node.goto.find((w) => holds(w.if, flags));
    if (!way) throw new Error('nowhere to go from ' + id);
    id = way.next;
  }
  throw new Error('a loop of goto nodes at ' + id);
}

/** Visit every branch. Returns { seen: node ids, ends: ending ids, problems: [] }. */
export function walk(spec) {
  const problems = [], seen = new Set(), ends = new Set(), done = new Set();
  const todo = [];
  const push = (id, flags, from) => { try { todo.push(arrive(spec, id, flags)); } catch (e) { problems.push(from + ': ' + e.message); } };
  push(spec.first, { ...spec.flags }, 'start');
  while (todo.length) {
    const run = todo.pop(), key = run.at + JSON.stringify(run.flags);
    if (done.has(key)) continue;
    done.add(key); seen.add(run.at);
    const node = spec.nodes[run.at];
    if (done.size > 200000) { problems.push('too many states'); break; }
    if (node.end) { ends.add(node.end); continue; }
    const lines = wrap(node.text || '', 300).length;
    if (node.choices) {
      const open = node.choices.filter((c) => holds(c.if, run.flags));
      if (!open.length) problems.push(run.at + ': no choice is open with ' + JSON.stringify(run.flags));
      if (lines * 9 + 3 + node.choices.length * 10 > 66) problems.push(run.at + ': text and choices do not fit the box');
      node.choices.forEach((c) => { if (textW('9. ' + c.text + (c.need ? '  (' + c.need + ')' : '')) > 302) problems.push(run.at + ': a choice is too long: ' + c.text); });
      open.forEach((c) => push(c.next, apply(c.set, run.flags), run.at));
    } else if (node.next) { if (lines > 7) problems.push(run.at + ': text does not fit the box'); push(node.next, run.flags, run.at); }
    else problems.push(run.at + ': leads nowhere');
  }
  Object.keys(spec.nodes).forEach((id) => { if (!seen.has(id) && !spec.nodes[id].goto) problems.push(id + ': never reached'); });
  const all = new Set(Object.values(spec.nodes).filter((n) => n.end).map((n) => n.end));
  all.forEach((e) => { if (!ends.has(e)) problems.push('ending never reached: ' + e); });
  return { seen: seen.size, ends: [...ends], states: done.size, problems: [...new Set(problems)] };
}

export function story(spec) {
  const S = { run: null, shown: 0, pick: 0, ask: false, t: 0 };
  const node = () => spec.nodes[S.run.at];
  const open = (G) => (node().choices || []).map((c) => ({ c, ok: holds(c.if, S.run.flags) })).filter((o) => o.ok || o.c.need);
  function to(G, id, flags) {
    S.run = arrive(spec, id, flags); S.shown = 0; S.t = 0;
    S.pick = Math.max(0, open(G).findIndex((o) => o.ok));
    const n = node();
    if (n.end) { const e = (G.save.data.ends = G.save.data.ends || {}); e[n.end] = true; delete G.save.data.run; }
    else G.save.data.run = S.run;
    G.commit();
  }
  return {
    ...spec,
    best: (save) => { const n = Object.keys((save.data && save.data.ends) || {}).length, all = new Set(Object.values(spec.nodes).filter((x) => x.end).map((x) => x.end)).size; return n ? n + ' OF ' + all + ' ENDINGS SEEN' : ''; },
    start(G) {
      const kept = G.save.data.run;
      S.ask = !!(kept && spec.nodes[kept.at] && kept.at !== spec.first); S.pick = 0;
      if (!S.ask) to(G, spec.first, { ...spec.flags });
    },
    tick(G) {
      S.t++;
      if (S.ask) {                                                 // continue the visit that was saved, or begin again
        if (G.hit.up || G.hit.down) { S.pick = 1 - S.pick; G.sfx('move'); }
        for (let k = 0; k < 2; k++) if (G.ptr.y >= 84 + k * 16 && G.ptr.y < 98 + k * 16 && G.ptr.x > 80 && G.ptr.x < 240) { if (G.ptr.hit) { S.pick = k; G.hit.ok = true; } }
        if (G.hit.ok) { S.ask = false; if (S.pick === 0) { S.run = G.save.data.run; S.shown = 0; S.pick = Math.max(0, open(G).findIndex((o) => o.ok)); } else to(G, spec.first, { ...spec.flags }); G.sfx('go'); }
        return;
      }
      const n = node(), full = (n.text || '').length;
      if (spec.goal) G.hud = spec.goal(S.run) || '';
      if (S.shown < full) {
        S.shown = Math.min(full, S.shown + (G.calm ? 4 : 1.5));
        if (S.t % 4 === 0) G.sfx('type');
        if (G.hit.ok || G.ptr.hit) S.shown = full;                 // one press finishes the line
        return;
      }
      if (n.end) { if ((G.hit.ok || G.ptr.hit) && S.t > 30) G.finish({ title: n.title, lines: ['ENDING: ' + n.end.toUpperCase().replace(/-/g, ' ')], won: !!n.good, stamp: true }); return; }
      if (n.choices) {
        const list = open(G), y0 = this._choiceY(n);
        const step = (d) => { for (let k = 0; k < list.length; k++) { S.pick = (S.pick + d + list.length) % list.length; if (list[S.pick].ok) break; } G.sfx('move'); };
        if (G.hit.up) step(-1);
        if (G.hit.down) step(1);
        let tapped = false;
        list.forEach((o, k) => { if (o.ok && G.ptr.y >= y0 + k * 10 - 1 && G.ptr.y < y0 + k * 10 + 9 && G.ptr.x > 6 && G.ptr.x < 314) { if (G.ptr.hit) { S.pick = k; tapped = true; } } });
        for (let k = 1; k <= list.length; k++) if (G.hit['d' + k] && list[k - 1].ok) { S.pick = k - 1; tapped = true; }
        if ((G.hit.ok || tapped) && list[S.pick] && list[S.pick].ok) { const c = list[S.pick].c; G.sfx('pick'); to(G, c.next, apply(c.set, S.run.flags)); }
        return;
      }
      if (G.hit.ok || G.ptr.hit) { G.sfx('blip'); to(G, n.next, S.run.flags); }
    },
    _choiceY(n) { return 110 + wrap(n.text || '', 300).length * 9 + 3; },
    draw(g, G) {
      g.fillStyle = '#0b0c2e'; g.fillRect(0, 0, 320, 180);
      if (S.ask) {
        if (spec.title) spec.title(g, G);
        box(g, 70, 56, 180, 64, '#0b0c2e', spec.accent);
        text(g, 'A VISIT WAS SAVED', 160, 64, spec.accent, { align: 'center' });
        ['CONTINUE', 'START AGAIN'].forEach((l, k) => { box(g, 84, 84 + k * 16, 152, 13, S.pick === k ? spec.accent : '#1b1d4e', spec.accent); text(g, l, 160, 87 + k * 16, S.pick === k ? (spec.ink || '#0b0c2e') : '#fff8e6', { align: 'center' }); });
        return;
      }
      const n = node();
      spec.scene(g, G, S.run, n);
      box(g, 2, 96, 316, 82, 'rgba(8,9,34,.96)', n.end ? spec.accent : '#d9dcf2');
      if (n.end) text(g, n.title, 9, 100, spec.accent);
      else if (n.who) text(g, n.who, 9, 100, spec.accent);
      const lines = wrap(n.text || '', 300);
      let left = Math.floor(S.shown);
      lines.forEach((l, i) => { if (left <= 0) return; text(g, l.slice(0, left), 9, 110 + i * 9, '#fff8e6'); left -= l.length + 1; });
      if (S.shown < (n.text || '').length) return;
      if (n.choices) {
        const y0 = this._choiceY(n);
        open(G).forEach((o, k) => {
          const on = k === S.pick && o.ok;
          if (on) { g.fillStyle = spec.accent; g.fillRect(6, y0 + k * 10 - 1, 308, 9); }
          text(g, (k + 1) + '. ' + o.c.text + (o.ok ? '' : '  (' + o.c.need + ')'), 9, y0 + k * 10, on ? (spec.ink || '#0b0c2e') : o.ok ? '#d9dcf2' : '#6a6e9c');
        });
      } else if (G.calm || Math.floor(S.t / 25) % 2 === 0) text(g, n.end ? 'PRESS' : '>', 311, 168, spec.accent, { align: 'right' });
    },
    _s: S
  };
}
