/*
 * Chapter 8 — Beyond the Horizon.
 * Back under the first night sky, brighter now. The painted stars are joined into one constellation:
 * the fields of work (data/work.js → constellations), the countries, the journey and what comes next.
 * Each label sits on its own painted star and follows it as the camera moves; each one is a way back
 * into the site. Then the camera pulls out to the whole painting for the invitation to get in touch:
 * every address is from data/site.js → links.
 */
import { PAINTINGS } from '../manifest.js';
import { toScreen, span, ease } from '../view.js';

const ICON = {
  mail: 'M2 4h12v8H2zM2 4l6 5 6-5', linkedin: 'M3 6.5v6M3 3.6v.1M6.5 12.5v-6M6.5 9c0-1.6 1-2.6 2.4-2.6S11 7.4 11 9v3.5', github: 'M6 13c-3 1-3-1.5-4-2m8 4v-2.6c0-.8-.3-1.3-.6-1.6 2-.2 4.1-1 4.1-4.4 0-1-.3-1.8-.9-2.4.1-.3.4-1.2-.1-2.4 0 0-.8-.2-2.5.9a8.600 8.600 0 00-4.500 0C3.800 1.400 3 1.600 3 1.600c-.5 1.200-.2 2.100-.1 2.400C2.300 4.600 2 5.400 2 6.400c0 3.400 2.100 4.200 4.100 4.400-.3.300-.5.700-.6 1.300',
  file: 'M4 1.5h5l3 3v10H4zM9 1.5v3h3M6 8.500h4M6 11h4', phone: 'M3.500 2h2.200l1 2.600-1.400 1c.700 1.500 1.700 2.500 3.200 3.200l1-1.400 2.600 1v2.200c0 .600-.500 1-1 1C6.200 11.300 2.700 7.800 2.500 3c0-.500.400-1 1-1z'
};
const svg = (d) => '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="' + d + '" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/></svg>';

export function build({ ui, SITE, RJY, h, beat, at, stage, engine, panels }) {
  const has = RJY.has, L = SITE.links, P = SITE.profile;
  const ia = PAINTINGS.ocean.aspect, anchors = PAINTINGS.ocean.anchors;
  const lit = (SITE.travel.countries || []).filter((c) => ({ home: 1, visited: 1, current: 1 })[c.status]);
  const next = SITE.journey.find((e) => e.upcoming);
  const field = (id) => (SITE.constellations.find((c) => c.id === id) || {}).name || panels.FIELD_LABEL[id];

  // which painted star carries which part of the story
  const stars = [
    { a: 'star', label: P.goesBy || P.name, hub: true },
    { a: 'star2', label: panels.FIELD_LABEL.finance, sub: SITE.work.filter((w) => w.constellation === 'finance').length + ' projects', href: '#view/projects.finance' },
    { a: 'star8', label: panels.FIELD_LABEL.analytics, sub: 'Data, machine learning, automation', href: '#view/projects.analytics' },
    { a: 'star3', label: panels.FIELD_LABEL.storage, sub: field('storage'), href: '#energy' },
    { a: 'star4', label: panels.FIELD_LABEL.strategy, sub: 'Markets, customers, operations', href: '#view/projects.strategy' },
    { a: 'star5', label: panels.FIELD_LABEL.digital, sub: SITE.work.filter((w) => w.constellation === 'digital').length + ' websites', href: '#view/projects.digital' },
    { a: 'star6', label: lit.length + ' countries', sub: lit.map((c) => RJY.countryName(c.code)).slice(0, 3).join(', ') + (lit.length > 3 ? ' and more' : ''), href: '#view/atlas' },
    { a: 'star7', label: SITE.journey.length + ' milestones', sub: 'Since ' + SITE.journey.map((e) => e.at.slice(0, 4)).sort()[0], href: '#view/timeline' },
    next ? { a: 'moon', label: next.short || next.title, sub: next.when + ', ahead', href: '#experience/' + next.id } : null
  ].filter(Boolean);

  const lines = RJY.s('svg', { class: 'sky__lines', 'aria-hidden': 'true' });
  const sky = h('div', { class: 'beat sky' }, lines);
  stars.forEach((s, i) => {
    s.el = h(s.href ? 'a' : 'span', { class: 'sky__star' + (s.hub ? ' sky__star--hub' : ''), href: s.href || null },
      h('i', { 'aria-hidden': 'true' }), h('span', null, h('b', { text: s.label }), s.sub ? h('small', { text: s.sub }) : null));
    sky.appendChild(s.el);
    if (i) { s.line = RJY.s('path', { class: 'sky__line', pathLength: 1 }); lines.appendChild(s.line); }
  });
  const ring = RJY.s('path', { class: 'sky__line sky__line--ring' });
  lines.appendChild(ring);

  const head = h('div', { class: 'beat sky-head scrim' },
    h('p', { class: 'headline', 'aria-hidden': 'true', 'data-rise': true, text: 'Beyond the horizon' }),
    h('p', { class: 'lede', 'data-rise': true, text: 'The same sky as the first painting, with the journey drawn on it. Every star is a way back in.' }));

  /* ---------- the invitation ---------- */
  function vcard() {
    const n = (P.legalName || P.name).split(' ');
    const rows = ['BEGIN:VCARD', 'VERSION:3.0', 'N:' + n.slice(1).join(' ') + ';' + n[0] + ';;;', 'FN:' + P.name, has(P.goesBy) ? 'NICKNAME:' + P.goesBy : '',
      has(L.email) ? 'EMAIL;TYPE=INTERNET:' + L.email : ''].concat((L.phones || []).filter((p) => has(p.number)).map((p) => 'TEL;TYPE=CELL:' + p.number.replace(/\s+/g, '')),
      [has(SITE.meta.siteUrl) ? 'URL:' + SITE.meta.siteUrl : '', has(L.linkedin) ? 'X-SOCIALPROFILE;TYPE=linkedin:' + L.linkedin : '', 'END:VCARD']);
    const blob = new Blob([rows.filter(Boolean).join('\r\n')], { type: 'text/vcard' });
    const a = h('a', { href: URL.createObjectURL(blob), download: P.name.replace(/\s+/g, '_') + '.vcf' });
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  }
  function copyBtn(text, what) {
    const b = h('button', { type: 'button', class: 'copy', 'aria-label': 'Copy ' + what, text: 'Copy' });
    b.addEventListener('click', () => {
      const ok = () => { b.textContent = 'Copied'; setTimeout(() => { b.textContent = 'Copy'; }, 1600); };
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(ok, () => {}); 
    });
    return b;
  }
  const social = [['LinkedIn', L.linkedin], ['GitHub', L.github], ['Instagram', L.instagram], ['X', L.x], ['Facebook', L.facebook]].concat((L.other || []).map((o) => [o.label, o.url])).filter((x) => has(x[1]));
  const closing = ((SITE.about.chapters || []).find((c) => has(c.closing)) || {}).closing;
  const invite = h('div', { class: 'beat invite scrim' },
    h('p', { class: 'headline', 'aria-hidden': 'true', 'data-rise': true, text: 'Let’s talk' }),
    h('p', { class: 'statement', 'data-rise': true, text: P.contactLine }),
    h('div', { class: 'invite__main', 'data-rise': true },
      has(L.email) ? h('p', { class: 'invite__mail' }, h('a', { href: 'mailto:' + L.email, text: L.email }), copyBtn(L.email, 'the email address')) : null,
      h('div', { class: 'btn-set' },
        has(L.linkedin) ? h('a', { class: 'pill pill--gold', href: L.linkedin, target: '_blank', rel: 'noopener me', html: svg(ICON.linkedin) + 'LinkedIn' }) : null,
        has(L.github) ? h('a', { class: 'pill', href: L.github, target: '_blank', rel: 'noopener me', html: svg(ICON.github) + 'GitHub' }) : null,
        has(L.resume) ? h('a', { class: 'pill', href: L.resume, download: '', html: svg(ICON.file) + 'Download my résumé' }) : null,
        h('button', { type: 'button', class: 'pill', onclick: vcard, text: 'Save my contact card' }))),
    h('ul', { class: 'invite__more', 'data-rise': true },
      (L.phones || []).filter((p) => has(p.number)).map((p) => h('li', null, h('a', { class: 'textlink', href: 'tel:' + p.number.replace(/\s+/g, ''), text: p.number }), ' ', h('span', { text: p.label }))),
      social.filter((x) => x[0] !== 'LinkedIn' && x[0] !== 'GitHub').map((x) => h('li', null, h('a', { class: 'textlink', href: x[1], target: '_blank', rel: 'noopener me', text: x[0] }))),
      h('li', null, h('span', { text: [P.basedIn, P.relocation].filter(has).join(' — ') }))),
    has(closing) ? h('p', { class: 'invite__close', 'data-rise': true, text: closing }) : null);
  const foot = h('footer', { class: 'beat endnote' },
    h('p', null, '© ' + (SITE.meta.year || new Date().getFullYear()) + ' ' + P.name + '. ', h('a', { class: 'textlink', href: 'portfolio.html', text: 'View the plain portfolio' }), ' · ',
      h('a', { class: 'textlink', href: '#home', text: 'Back to the first painting' })));
  ui.append(sky, head, invite, foot);

  let pts = [];
  function update(t, s, dt, on) {
    if (!on) return;
    const st = stage(); if (!st) return;
    const state = st.state;
    // the labels belong to the ocean painting: use its camera whether it is arriving or already on stage
    const cam = state.shotB && state.shotB.id === 'return' ? state.camB : (state.shot.id === 'return' ? state.cam : null);
    if (!cam) return;
    const { W, H } = st.size();
    lines.setAttribute('viewBox', `0 0 ${W} ${H}`);
    const draw = ease.clamp(span(t, at(0.55), at(1.25)));
    pts = stars.map((sx) => toScreen(cam, ia, W, H, anchors[sx.a]));
    const hub = pts[0];
    stars.forEach((sx, i) => {
      const p = pts[i];
      const inside = p.x > 30 && p.x < W - 30 && p.y > 24 && p.y < H - 90;
      sx.el.style.transform = `translate3d(${p.x.toFixed(1)}px,${p.y.toFixed(1)}px,0)`;
      const k = ease.clamp((draw - (i / stars.length) * 0.7) / 0.3);
      sx.el.style.opacity = inside ? k.toFixed(3) : 0;
      sx.el.style.pointerEvents = inside && k > 0.5 ? '' : 'none';
      sx.el.classList.toggle('is-left', p.x > W * 0.72);
      sx.el.classList.toggle('is-below', p.y < 96);      // a star under the top bar is labelled beneath itself
      if (sx.line) {
        const mx = (hub.x + p.x) / 2, my = (hub.y + p.y) / 2 - Math.abs(p.x - hub.x) * 0.08;
        sx.line.setAttribute('d', `M${hub.x.toFixed(1)} ${hub.y.toFixed(1)} Q${mx.toFixed(1)} ${my.toFixed(1)} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`);
        sx.line.style.opacity = (k * 0.9).toFixed(3);
        sx.line.style.strokeDashoffset = (1 - k).toFixed(3);
      }
    });
    // an outline through the outer stars, clockwise from the left
    const outer = pts.slice(1).map((p, i) => ({ p, a: Math.atan2(p.y - hub.y, p.x - hub.x), i })).sort((a, b) => a.a - b.a);
    ring.setAttribute('d', outer.map((o, i) => (i ? 'L' : 'M') + o.p.x.toFixed(1) + ' ' + o.p.y.toFixed(1)).join(' '));
    ring.style.opacity = (ease.clamp((draw - 0.75) / 0.25) * 0.5).toFixed(3);
  }
  void engine;

  beat(sky, 0.5, 1.62, { y: 0 });
  beat(head, 0.5, 1.5);
  beat(invite, 1.72, null);
  beat(foot, 2.1, null, { y: 0 });
  return { update };
}
