/*
 * project-index.js — every project in one list, with a search box and filters by field.
 * Used by the film (#view/projects) and by the plain portfolio. Reads data/work.js; a row opens the
 * project's case study (#projects/<id>).
 */
export const FIELD_LABEL = { digital: 'Digital Creations', finance: 'Finance', analytics: 'Analytics & AI', storage: 'Energy Storage', strategy: 'Strategy & Consulting' };
export const FIELD_ORDER = ['digital', 'finance', 'analytics', 'storage', 'strategy'];
/** The fields a project belongs to: its own, any it is also drawn in, and its tags. */
export function fieldsOf(w) {
  const f = [w.constellation].concat((w.alsoIn || []).map((a) => a.constellation), w.tags || []);
  return f.filter((x, i) => FIELD_LABEL[x] && f.indexOf(x) === i);
}

export function buildProjectIndex(el, { RJY, SITE, h }) {
  const has = RJY.has;
  const state = { q: '', field: 'all' };
  const input = h('input', { class: 'index__search', type: 'search', placeholder: 'Search projects, tools, methods', 'aria-label': 'Search projects', autocomplete: 'off', spellcheck: 'false' });
  const count = h('p', { class: 'index__count', 'aria-live': 'polite' });
  const chips = h('div', { class: 'filters', role: 'group', 'aria-label': 'Filter by field' },
    [['all', 'All']].concat(FIELD_ORDER.map((f) => [f, FIELD_LABEL[f]])).map(([id, label]) =>
      h('button', { type: 'button', class: 'chip', 'aria-pressed': String(id === 'all'), 'data-field': id, onclick() { state.field = id; draw(); }, text: label })));
  const list = h('ul', { class: 'index__list', role: 'list' });
  const text = (w) => [w.title, w.short, w.tagline, w.org, w.when, w.context, w.objective, w.role].concat(w.approach || [], w.tools || [], w.results || [], w.insights || [], fieldsOf(w).map((f) => FIELD_LABEL[f])).join(' ').toLowerCase();
  const rows = SITE.work.map((w) => {
    const f = fieldsOf(w);
    const row = h('li', { class: 'index__row' }, h('a', { href: '#projects/' + w.id },
      h('span', { class: 'index__thumb' }, w.cover ? RJY.picture(w.cover, { sizes: '160px', alt: '' }) : h('i', { 'aria-hidden': 'true', text: (w.short || w.title).slice(0, 1) })),
      h('span', { class: 'index__main' },
        h('b', { text: w.title }),
        h('span', { class: 'index__line', text: w.tagline || w.context || '' })),
      h('span', { class: 'index__meta' },
        h('span', { text: f.map((x) => FIELD_LABEL[x]).join(' · ') }),
        h('span', { text: [w.status === 'in-progress' ? 'In progress' : (w.status === 'live' ? 'Live' : ''), w.when].filter(has).join(' · ') }))));
    return { w, row, text: text(w), fields: f };
  });
  rows.forEach((r) => list.appendChild(r.row));
  const empty = h('p', { class: 'index__empty', hidden: true }, 'Nothing matches that search. ', h('button', { type: 'button', class: 'link', onclick() { state.q = ''; state.field = 'all'; input.value = ''; draw(); input.focus(); }, text: 'Show every project' }));
  function draw() {
    const words = state.q.toLowerCase().split(/\s+/).filter(Boolean);
    let n = 0;
    rows.forEach((r) => {
      const ok = (state.field === 'all' || r.fields.indexOf(state.field) !== -1) && words.every((wd) => r.text.indexOf(wd) !== -1);
      r.row.hidden = !ok; if (ok) n++;
    });
    chips.querySelectorAll('.chip').forEach((c) => c.setAttribute('aria-pressed', String(c.dataset.field === state.field)));
    count.textContent = n === rows.length ? rows.length + ' projects' : n + ' of ' + rows.length + ' projects';
    empty.hidden = n > 0;
  }
  input.addEventListener('input', () => { state.q = input.value; draw(); });
  el.append(h('div', { class: 'index__bar' }, input, count), chips, list, empty);
  draw();
  return {
    focus: () => input.focus({ preventScroll: true }),
    filter: (field) => { state.field = FIELD_LABEL[field] ? field : 'all'; draw(); }
  };
}
