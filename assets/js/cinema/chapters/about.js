/*
 * Chapter 2 — Where My Story Begins.
 * Two paintings: the flying house (three cultures, where I grew up) and the blossom tree hung with
 * prayer flags (three languages, school, what drives me). Every sentence is from data/site.js → about,
 * education and profile.languages; the three windows open the countries in the atlas.
 */
export function build({ ui, SITE, RJY, h, beat }) {
  const a = SITE.about, p = SITE.profile, ch = a.chapters || [];
  const pig = (name) => ((RJY.PIGMENTS || {})[name] || ['#f6c443'])[0];

  /* A — the opening: three cultures */
  const places = [
    { code: 'CRI', name: 'Costa Rica' }, { code: 'CHN', name: 'China' }, { code: 'USA', name: 'Boston' }
  ].map((pl) => {
    const c = RJY.findCountry(pl.code) || {};
    const line = String(c.headline || '').split(',')[0];
    return h('a', { class: 'window', href: '#world/' + pl.code, 'data-rise': true, 'aria-label': pl.name + (line ? ': ' + line : '') + '. Open its photographs.' },
      h('span', { class: 'window__pane' }, c.cover ? RJY.picture({ src: c.cover }, { sizes: '(max-width: 860px) 30vw, 200px', alt: '' }) : null),
      h('img', { class: 'window__flag', src: RJY.flagSrc(pl.code), alt: '', width: 30, height: 22 }),
      h('span', { class: 'window__text' }, h('b', { text: pl.name }), line ? h('small', { text: line }) : null));
  });
  const open = h('div', { class: 'beat about-open scrim' },
    h('p', { class: 'headline', 'aria-hidden': 'true', 'data-rise': true, text: 'Where my story begins' }),
    h('p', { class: 'statement', 'data-rise': true, text: a.tagline }),
    h('p', { class: 'lede', 'data-rise': true, text: a.intro[0] }));
  const windows = h('div', { class: 'beat windows' }, places);
  if (RJY.draft) open.appendChild(h('p', { class: 'ph', text: 'To add: paintings of Costa Rica and Boston for this chapter (tools/prepare_paintings.py). Until then the three windows show the photographs.' }));

  /* B — where I'm from */
  const first = ch[0] || { text: [] };
  const roots = h('div', { class: 'beat about-roots scrim' },
    h('p', { class: 'statement', 'data-rise': true, text: first.text[0] }),
    first.text[2] ? h('p', { class: 'lede', 'data-rise': true, text: first.text[2] }) : null);

  /* C — three languages, as the flags on the tree */
  const second = ch[1] || { title: '', text: [] };
  const flagColours = ['#f6c443', '#f3a35c', '#8fd9b0'];
  const tongues = h('div', { class: 'beat about-tongues scrim' },
    h('h3', { class: 'subhead', 'data-rise': true, text: second.title }),
    h('p', { class: 'lede', 'data-rise': true, text: second.text[0] }),
    h('ul', { class: 'pennants', 'aria-label': 'Languages' }, (p.languages || []).map((l, i) =>
      h('li', { class: 'pennant', 'data-rise': true, style: '--pc:' + flagColours[i % 3] },
        h('b', { text: l.name }), l.native && l.native !== l.name ? h('i', { lang: l.native === '中文' ? 'zh' : 'es', text: l.native }) : h('i'),
        h('span', { text: [l.level, l.note].filter(RJY.has).join(' · ') })))));

  /* D — school and what drives me */
  const third = ch[2] || { list: [] };
  const school = h('div', { class: 'beat about-school scrim' },
    (SITE.education || []).map((e) => h('p', { class: 'school', 'data-rise': true },
      h('b', { text: e.degree }), h('span', { text: [e.school + ', ' + e.place, e.when].concat(e.notes || []).join(' · ') }))),
    h('ul', { class: 'dabs', 'aria-label': 'What drives me', 'data-rise': true }, (third.list || []).map((it) =>
      h('li', { style: '--dc:' + pig(it.pigment), title: it.text, text: it.title }))),
    h('ul', { class: 'dabs dabs--quiet', 'aria-label': 'Off the clock', 'data-rise': true }, (a.offTheClock || []).map((x) => h('li', { text: x }))),
    h('div', { class: 'btn-set', 'data-rise': true },
      h('a', { class: 'pill pill--gold', href: '#view/story', text: 'Read the full story' }),
      SITE.links.resume ? h('a', { class: 'pill', href: SITE.links.resume, download: '', text: 'Download my résumé' }) : null));

  [open, windows, roots, tongues, school].forEach((el) => ui.appendChild(el));
  beat(open, 0.72, 1.62);
  beat(windows, 0.86, 1.62);
  beat(roots, 1.58, 2.16);
  beat(tongues, 2.72, 3.52);
  beat(school, 3.46, 4.28);
  return {};
}
