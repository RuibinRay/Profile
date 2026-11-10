/*
 * Chapter 8 — Beyond the Horizon.
 * Back under the first night sky, brighter now. Every painted star is one way to get in touch: the
 * brightest star, beside the seated figure, is the email address; the moon is LinkedIn; the others are
 * Instagram, GitHub, X, Facebook, the résumé and the telephone. Nothing is drawn over a star: the star
 * in the painting is itself the button. It glows when pointed at or reached with the keyboard, a ring of
 * light breathes round it to show it can be pressed, and its name sits beside it on dark glass.
 * The invitation ("Let's talk") stands over the sea at the lower right. On a phone, where only a slice
 * of the sky fits, the same ways are listed under the invitation instead.
 * Every address is from data/site.js → links; a way that is left empty there has no star.
 */
import { PAINTINGS } from '../manifest.js';
import { toScreen, span, ease } from '../view.js';

export function build({ ui, SITE, RJY, h, beat, at, stage, engine }) {
  const has = RJY.has, L = SITE.links, P = SITE.profile;
  const ia = PAINTINGS.ocean.aspect, anchors = PAINTINGS.ocean.anchors;
  // the last part of a profile's address is its handle: instagram.com/ruibin.jin/ → ruibin.jin
  const handle = (url) => { try { const seg = new URL(url).pathname.split('/').filter(Boolean); return seg[seg.length - 1] || ''; } catch (e) { return ''; } };
  const tel = (n) => 'tel:' + n.replace(/\s+/g, '');
  const phones = (L.phones || []).filter((p) => has(p.number));

  // which painted star carries which way of getting in touch (`r` is the star's radius as a share of the
  // painting's width, so the button covers the painted star exactly), and where its words sit so they
  // stay clear of the figure, the top bar and each other
  const stars = [
    has(L.email) ? { a: 'star', r: 0.040, key: 'mail', label: 'Email', sub: L.email, href: 'mailto:' + L.email, hub: true } : null,
    has(L.linkedin) ? { a: 'moon', r: 0.056, key: 'linkedin', label: 'LinkedIn', sub: P.legalName || P.name, href: L.linkedin, ext: true, place: 'under' } : null,
    has(L.instagram) ? { a: 'star2', r: 0.031, key: 'instagram', label: 'Instagram', sub: '@' + handle(L.instagram), href: L.instagram, ext: true, place: 'below' } : null,
    has(L.github) ? { a: 'star4', r: 0.027, key: 'github', label: 'GitHub', sub: handle(L.github), href: L.github, ext: true, place: 'below' } : null,
    has(L.x) ? { a: 'star7', r: 0.021, key: 'x', label: 'X', sub: '@' + handle(L.x), href: L.x, ext: true } : null,
    has(L.facebook) ? { a: 'star6', r: 0.029, key: 'facebook', label: 'Facebook', sub: handle(L.facebook), href: L.facebook, ext: true, place: 'below' } : null,
    has(L.resume) ? { a: 'star3', r: 0.030, key: 'file', label: 'Résumé', sub: L.resumeNote || 'Download', href: L.resume, download: true, place: 'below' } : null,
    phones.length ? { a: 'star8', r: 0.021, key: 'phone', label: 'Phone', phones, href: tel(phones[0].number), place: 'below' } : null
  ].filter(Boolean);
  const linkOf = (w, cls, kids, label) => h('a', { class: cls, href: w.href, target: w.ext ? '_blank' : null, rel: w.ext ? 'noopener me' : null, download: w.download ? '' : null, 'aria-label': label || null }, kids);
  const said = (w) => w.label + (w.sub ? ': ' + w.sub : w.phones ? ': call ' + w.phones[0].number + ' (' + w.phones[0].label + ')' : '') + (w.ext ? ' (opens in a new tab)' : '');

  const sky = h('div', { class: 'beat sky' });
  stars.forEach((w, i) => {
    const dot = linkOf(w, 'sky__dot', null, said(w));        // empty on purpose: the painted star shows through
    const words = w.phones
      ? h('span', { class: 'sky__label' }, h('b', { text: w.label }), w.phones.map((ph) => h('a', { class: 'sky__tel', href: tel(ph.number) }, ph.number, ' ', h('small', { text: ph.label }))))
      : h('span', { class: 'sky__label' }, linkOf(w, 'sky__text', [h('b', { text: w.label }), w.sub ? h('small', { text: w.sub }) : null]));
    if (!w.phones) words.firstChild.tabIndex = -1;          // the star itself is the link a keyboard reaches; the words repeat it
    w.el = h('div', { class: 'sky__star sky__star--' + w.key + (w.hub ? ' sky__star--hub' : '') + (w.place ? ' is-' + w.place : ''), style: '--i:' + i }, dot, words);
    sky.appendChild(w.el);
  });

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
      // the same ways as the stars, as a list: shown where the sky does not fit (a phone), and for any
      // star that a very wide or very narrow screen leaves outside the picture. Each carries a small
      // star of light, not a logo.
      (ways = h('ul', { class: 'invite__ways', role: 'list' }, stars.filter((w) => !w.hub).map((w) => (w.li = h('li', null,
        w.phones ? w.phones.map((ph) => h('a', { class: 'way', href: tel(ph.number) }, h('i', { class: 'way__star', 'aria-hidden': 'true' }), h('span', null, h('b', { text: ph.number }), h('small', { text: ph.label }))))
          : linkOf(w, 'way', [h('i', { class: 'way__star', 'aria-hidden': 'true' }), h('span', null, h('b', { text: w.label }), w.sub ? h('small', { text: w.sub }) : null)])))))),
      h('div', { class: 'btn-set' }, h('button', { type: 'button', class: 'pill', onclick: vcard, text: 'Save my contact card' }))),
    h('p', { class: 'invite__where', 'data-rise': true, text: [P.basedIn, P.relocation].filter(has).join(' — ') }),
    has(closing) ? h('p', { class: 'invite__close', 'data-rise': true, text: closing }) : null);
  const foot = h('footer', { class: 'beat endnote' },
    h('p', null, '© ' + (SITE.meta.year || new Date().getFullYear()) + ' ' + P.name + '. ', h('a', { class: 'textlink', href: 'portfolio.html', text: 'View the plain portfolio' }), ' · ',
      h('a', { class: 'textlink', href: '#home', text: 'Back to the first painting' })));
  ui.append(sky, head, invite, foot);

  // sizes that only change with the window or the fonts: each label's, and the invitation's place
  let measured = false, box = null, listed = -1;
  const remeasure = () => { measured = false; box = null; };
  engine.onResize(remeasure);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(remeasure);
  const hits = (l, t, r, b) => box && l < box.r && r > box.l && t < box.b && b > box.t;

  function update(t, s, dt, on) {
    if (!on) return;
    const st = stage(); if (!st) return;
    const state = st.state;
    // the labels belong to the ocean painting: use its camera whether it is arriving or already on stage
    const cam = state.shotB && state.shotB.id === 'return' ? state.camB : (state.shot.id === 'return' ? state.cam : null);
    if (!cam) return;
    const { W, H } = st.size();
    if (!measured) { stars.forEach((sx) => { const l = sx.el.lastChild; sx.lw = l.offsetWidth; sx.lh = l.offsetHeight; }); measured = true; }
    // where the invitation stands once it has arrived (its layout box: the rise it enters with is left out)
    if (t > at(1.6)) { if (!box) box = { l: invite.offsetLeft - 10, t: invite.offsetTop - 10, r: invite.offsetLeft + invite.offsetWidth + 10, b: invite.offsetTop + invite.offsetHeight }; }
    else box = null;
    const draw = ease.clamp(span(t, at(0.55), at(1.35)));
    const wide = (W / H > ia ? W : H * ia) * cam.z;          // how wide the painting is on screen, in pixels
    const pad = 10;
    let missing = 0;
    stars.forEach((sx, i) => {
      const p = toScreen(cam, ia, W, H, anchors[sx.a]);
      const r = Math.max(22, sx.r * wide);
      // keep the words on the screen: slide the ones under a star sideways, flip the ones beside it
      let dx = 0, flip = false, lx, ly;
      if (sx.place === 'below') { lx = p.x - sx.lw / 2; dx = lx < pad ? pad - lx : Math.min(0, W - pad - lx - sx.lw); lx += dx; ly = p.y + r + 4; }
      else if (sx.place === 'under') { lx = p.x - sx.lw; dx = lx < pad ? pad - lx : 0; lx += dx; ly = p.y + r + 4; }
      else { flip = p.x + r + 6 + sx.lw > W - pad && p.x - r - 6 - sx.lw > pad; lx = flip ? p.x - r - 6 - sx.lw : p.x + r + 6; ly = p.y - sx.lh / 2; }
      // a star that is off the picture, or that the invitation would stand on, is listed in the invitation instead
      const inside = p.x > 34 && p.x < W - 34 && p.y > 20 && p.y < H - 90
        && !hits(p.x - r, p.y - r, p.x + r, p.y + r) && !hits(lx, ly, lx + sx.lw, ly + sx.lh);
      sx.el.style.transform = `translate3d(${p.x.toFixed(1)}px,${p.y.toFixed(1)}px,0)`;
      sx.el.style.setProperty('--r', r.toFixed(1) + 'px');
      sx.el.style.setProperty('--dx', dx.toFixed(1) + 'px');
      if (!sx.place) sx.el.classList.toggle('is-left', flip);
      // the stars wake one after another as the camera settles on the sky
      const k = ease.clamp((draw - (i / stars.length) * 0.7) / 0.3);
      sx.el.style.opacity = inside ? k.toFixed(3) : 0;
      sx.el.style.visibility = inside && k > 0.02 ? 'visible' : 'hidden';
      if (sx.li) { sx.li.hidden = inside; if (!inside) missing++; }
    });
    if (ways) ways.classList.toggle('is-needed', missing > 0);
    if (missing !== listed) { listed = missing; box = null; }      // the list changed the invitation's height: measure it again
  }

  beat(sky, 0.5, null, { y: 0 });          // the stars stay to the end: they are the way out
  beat(head, 0.5, 1.5);
  beat(invite, 1.66, null);
  beat(foot, 2.1, null, { y: 0 });
  return { update };
}
