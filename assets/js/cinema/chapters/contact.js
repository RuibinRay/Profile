/*
 * Chapter 8 — Beyond the Horizon.
 * Back under the first night sky, brighter now. Every painted star is one way to get in touch: the
 * brightest star, beside the seated figure, is the email address; the moon is LinkedIn; the others are
 * Instagram, GitHub, X, Facebook, the résumé and the telephone. Each one is a real link that sits on
 * its star and follows it as the camera moves, and a line of light joins them all to the email star.
 * The invitation ("Let's talk") stands over the sea at the lower right. On a phone, where only a slice
 * of the sky fits, the same ways are listed under the invitation instead.
 * Every address is from data/site.js → links; a way that is left empty there has no star.
 */
import { PAINTINGS } from '../manifest.js';
import { toScreen, span, ease } from '../view.js';

const ICON = {
  mail: 'M2 4h12v8H2zM2 4l6 5 6-5', linkedin: 'M3 6.5v6M3 3.6v.1M6.5 12.5v-6M6.5 9c0-1.6 1-2.6 2.4-2.6S11 7.4 11 9v3.5',
  github: 'M6 13c-3 1-3-1.5-4-2m8 4v-2.6c0-.8-.3-1.3-.6-1.6 2-.2 4.1-1 4.1-4.4 0-1-.3-1.8-.9-2.4.1-.3.4-1.2-.1-2.4 0 0-.8-.2-2.5.9a8.6 8.6 0 0 0-4.600 0C3.700 1.300 2.900 1.500 2.900 1.500c-.500 1.200-.200 2.100-.100 2.400-.600.600-.900 1.400-.900 2.400 0 3.400 2.100 4.200 4.100 4.400-.300.300-.500.700-.600 1.300',
  instagram: 'M4.6 2h6.8A2.6 2.6 0 0 1 14 4.6v6.8a2.600 2.600 0 0 1-2.600 2.600H4.600A2.600 2.600 0 0 1 2 11.400V4.600A2.600 2.600 0 0 1 4.600 2zM8 5.400a2.600 2.600 0 1 0 0 5.200 2.600 2.600 0 0 0 0-5.200zM11.500 4.400v.100',
  x: 'M3 2.500l10 11M13 2.500L3 13.500',
  facebook: 'M9.600 14V8.600h1.900l.300-2.300H9.600V4.900c0-.700.200-1.100 1.200-1.100h1.100V1.700c-.200 0-.900-.100-1.700-.100-1.700 0-2.800 1-2.800 2.900v1.800H5.500v2.300h1.900V14',
  file: 'M4 1.500h5l3 3v10H4zM9 1.500v3h3M6 8.500h4M6 11h4', phone: 'M3.500 2h2.200l1 2.600-1.400 1c.700 1.500 1.700 2.500 3.200 3.200l1-1.400 2.600 1v2.200c0 .600-.500 1-1 1C6.200 11.300 2.700 7.800 2.500 3c0-.500.400-1 1-1z'
};
const svg = (d) => '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="' + d + '" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/></svg>';

export function build({ ui, SITE, RJY, h, beat, at, stage, engine }) {
  const has = RJY.has, L = SITE.links, P = SITE.profile;
  const ia = PAINTINGS.ocean.aspect, anchors = PAINTINGS.ocean.anchors;
  // the last part of a profile's address is its handle: instagram.com/ruibin.jin/ → ruibin.jin
  const handle = (url) => { try { const seg = new URL(url).pathname.split('/').filter(Boolean); return seg[seg.length - 1] || ''; } catch (e) { return ''; } };
  const tel = (n) => 'tel:' + n.replace(/\s+/g, '');
  const phones = (L.phones || []).filter((p) => has(p.number));

  // which painted star carries which way of getting in touch, and where its words sit so they stay
  // clear of the figure, the top bar and each other
  const stars = [
    has(L.email) ? { a: 'star', key: 'mail', label: 'Email', sub: L.email, href: 'mailto:' + L.email, hub: true } : null,
    has(L.linkedin) ? { a: 'moon', key: 'linkedin', label: 'LinkedIn', sub: P.legalName || P.name, href: L.linkedin, ext: true, place: 'left' } : null,
    has(L.instagram) ? { a: 'star2', key: 'instagram', label: 'Instagram', sub: '@' + handle(L.instagram), href: L.instagram, ext: true } : null,
    has(L.github) ? { a: 'star4', key: 'github', label: 'GitHub', sub: handle(L.github), href: L.github, ext: true, place: 'below' } : null,
    has(L.x) ? { a: 'star7', key: 'x', label: 'X', sub: '@' + handle(L.x), href: L.x, ext: true } : null,
    has(L.facebook) ? { a: 'star6', key: 'facebook', label: 'Facebook', sub: handle(L.facebook), href: L.facebook, ext: true, place: 'below' } : null,
    has(L.resume) ? { a: 'star3', key: 'file', label: 'Résumé', sub: L.resumeNote || 'Download', href: L.resume, download: true, place: 'below' } : null,
    phones.length ? { a: 'star8', key: 'phone', label: 'Phone', phones, href: tel(phones[0].number), place: 'below' } : null
  ].filter(Boolean);
  const linkOf = (w, cls, kids, label) => h('a', { class: cls, href: w.href, target: w.ext ? '_blank' : null, rel: w.ext ? 'noopener me' : null, download: w.download ? '' : null, 'aria-label': label || null }, kids);
  const said = (w) => w.label + (w.sub ? ': ' + w.sub : w.phones ? ': call ' + w.phones[0].number + ' (' + w.phones[0].label + ')' : '') + (w.ext ? ' (opens in a new tab)' : '');

  const lines = RJY.s('svg', { class: 'sky__lines', 'aria-hidden': 'true' });
  const sky = h('div', { class: 'beat sky' }, lines);
  stars.forEach((w, i) => {
    const dot = linkOf(w, 'sky__dot', null, said(w)); dot.innerHTML = svg(ICON[w.key]);
    const words = w.phones
      ? h('span', { class: 'sky__label' }, h('b', { text: w.label }), w.phones.map((ph) => h('a', { class: 'sky__tel', href: tel(ph.number) }, ph.number, ' ', h('small', { text: ph.label }))))
      : h('span', { class: 'sky__label' }, linkOf(w, 'sky__text', [h('b', { text: w.label }), w.sub ? h('small', { text: w.sub }) : null]));
    if (!w.phones) words.firstChild.tabIndex = -1;          // the star itself is the link a keyboard reaches; the words repeat it
    w.el = h('div', { class: 'sky__star sky__star--' + w.key + (w.hub ? ' sky__star--hub' : '') + (w.place ? ' is-' + w.place : '') }, dot, words);
    sky.appendChild(w.el);
    if (i) { w.line = RJY.s('path', { class: 'sky__line', pathLength: 1 }); lines.appendChild(w.line); }
  });
  const ring = RJY.s('path', { class: 'sky__line sky__line--ring' });
  lines.appendChild(ring);

  const head = h('div', { class: 'beat sky-head scrim' },
    h('p', { class: 'headline', 'aria-hidden': 'true', 'data-rise': true, text: 'Beyond the horizon' }),
    h('p', { class: 'lede', 'data-rise': true, text: 'The same sky as the first painting. Every star is a way to reach me.' }));

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
  let ways = null;
  const closing = ((SITE.about.chapters || []).find((c) => has(c.closing)) || {}).closing;
  const invite = h('div', { class: 'beat invite scrim' },
    h('p', { class: 'headline', 'aria-hidden': 'true', 'data-rise': true, text: 'Let’s talk' }),
    h('p', { class: 'statement', 'data-rise': true, text: P.contactLine }),
    h('div', { class: 'invite__main', 'data-rise': true },
      has(L.email) ? h('p', { class: 'invite__mail' }, h('a', { href: 'mailto:' + L.email, text: L.email }), copyBtn(L.email, 'the email address')) : null,
      // the same ways as the stars, as a list: shown where the sky does not fit (phones)
      // the same ways as the stars, as a list: shown where the sky does not fit (a phone), and for any
      // star that a very wide or very narrow screen leaves outside the picture
      (ways = h('ul', { class: 'invite__ways', role: 'list' }, stars.filter((w) => !w.hub).map((w) => (w.li = h('li', null,
        w.phones ? w.phones.map((ph) => h('a', { class: 'way', href: tel(ph.number), html: svg(ICON.phone) + '<span><b>' + ph.number + '</b><small>' + ph.label + '</small></span>' }))
          : (() => { const el = linkOf(w, 'way', null); el.innerHTML = svg(ICON[w.key]) + '<span><b>' + w.label + '</b>' + (w.sub ? '<small>' + w.sub + '</small>' : '') + '</span>'; return el; })()))))),
      h('div', { class: 'btn-set' }, h('button', { type: 'button', class: 'pill', onclick: vcard, text: 'Save my contact card' }))),
    h('p', { class: 'invite__where', 'data-rise': true, text: [P.basedIn, P.relocation].filter(has).join(' — ') }),
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
    const draw = ease.clamp(span(t, at(0.55), at(1.35)));
    pts = stars.map((sx) => toScreen(cam, ia, W, H, anchors[sx.a]));
    const hub = pts[0];
    let missing = 0;
    stars.forEach((sx, i) => {
      const p = pts[i];
      const inside = p.x > 34 && p.x < W - 34 && p.y > 20 && p.y < H - 90;
      sx.el.style.transform = `translate3d(${p.x.toFixed(1)}px,${p.y.toFixed(1)}px,0)`;
      const k = ease.clamp((draw - (i / stars.length) * 0.7) / 0.3);
      sx.el.style.opacity = inside ? k.toFixed(3) : 0;
      sx.el.style.visibility = inside && k > 0.02 ? 'visible' : 'hidden';
      if (sx.li) { sx.li.hidden = inside; if (!inside) missing++; }
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
    if (ways) ways.classList.toggle('is-needed', missing > 0);
  }
  void engine;

  beat(sky, 0.5, null, { y: 0 });          // the stars stay to the end: they are the way out
  beat(head, 0.5, 1.5);
  beat(invite, 1.66, null);
  beat(foot, 2.1, null, { y: 0 });
  return { update };
}
