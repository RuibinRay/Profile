/*
 * Chapter 7 — My Palette of Skills.
 * The terraced pools become wells of paint: each skill group of data/palette.js is a brushstroke
 * that flows in from the left as the page is scrolled. Choosing one shows what it is for, the tools
 * confirmed for it, and the projects and experience where it was used (its `seenIn` links). There are
 * no percentages or self-ratings. Languages, certificates, coursework and awards open in full from
 * here (#view/credentials), with their verification links.
 */
import { span, ease } from '../view.js';

export function build({ ui, SITE, RJY, h, beat, at, engine }) {
  const has = RJY.has, skills = SITE.palette || [], n = skills.length;
  const certs = (SITE.certifications || []).length;
  const verifiable = (SITE.certifications || []).filter((c) => has(c.url)).length;

  const head = h('div', { class: 'beat sk-head scrim' },
    h('p', { class: 'headline', 'aria-hidden': 'true', 'data-rise': true, text: 'My palette of skills' }),
    h('p', { class: 'lede', 'data-rise': true, text: n + ' colours, each mixed from real work. No ratings: choose one to see its tools and where it shows.' }));

  const strokes = skills.map((g, i) => {
    const hex = (RJY.PIGMENTS[g.pigment] || RJY.PIGMENTS.gold)[0];
    const lum = (parseInt(hex.slice(1, 3), 16) * 0.299 + parseInt(hex.slice(3, 5), 16) * 0.587 + parseInt(hex.slice(5, 7), 16) * 0.114) / 255;
    const b = h('button', { type: 'button', class: 'stroke' + (lum < 0.45 ? ' stroke--dark' : ''), 'aria-pressed': 'false', 'data-id': g.id, style: '--i:' + i },
      h('span', { class: 'stroke__paint', 'aria-hidden': 'true' }), h('span', { class: 'stroke__name', text: g.name }));
    b.addEventListener('click', () => select(g.id, true));
    return b;
  });
  const list = h('div', { class: 'beat sk-list', role: 'group', 'aria-label': 'Skills' }, strokes);
  const detail = h('div', { class: 'beat sk-detail glass', 'aria-live': 'polite' });
  const creds = h('div', { class: 'beat sk-creds scrim' },
    h('h3', { class: 'subhead', 'data-rise': true, text: 'Languages and credentials' }),
    h('ul', { class: 'dabs', 'data-rise': true, 'aria-label': 'Languages' }, (SITE.profile.languages || []).map((l) =>
      h('li', { text: l.name + ' — ' + [l.level, l.note].filter(has).join(', ') }))),
    h('p', { class: 'lede', 'data-rise': true, text: certs + ' certificates, ' + verifiable + ' of them with a link to verify, plus coursework, education and awards.' }),
    h('div', { class: 'btn-set', 'data-rise': true }, h('a', { class: 'pill pill--gold', href: '#view/credentials', text: 'See the certificates' })));
  ui.append(head, list, detail, creds);

  function paint() {
    strokes.forEach((b, i) => {
      const el = b.firstChild, w = Math.round(b.clientWidth), hgt = Math.round(b.clientHeight);
      if (!w || !hgt || !RJY.brush) return;
      el.innerHTML = RJY.brush(w, hgt, { pigment: skills[i].pigment, seed: i * 3.7 + 1, dir: 'h', dry: 0.16, texture: 0.75, solid: w * 0.82 });
    });
  }
  let chosen = null, manual = false;
  function select(id, byHand) {
    const g = skills.find((x) => x.id === id); if (!g) return;
    if (byHand) manual = true;
    if (chosen === id) return;
    chosen = id;
    strokes.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.id === id)));
    const c = (RJY.PIGMENTS[g.pigment] || RJY.PIGMENTS.gold)[0];
    detail.innerHTML = '';
    detail.style.setProperty('--hue', c);
    detail.append(...[
      h('h3', { class: 'subhead', text: g.name }),
      h('p', { class: 'lede', text: g.text }),
      has(g.tools) ? h('ul', { class: 'dabs dabs--quiet', 'aria-label': 'Tools' }, g.tools.map((t) => h('li', { text: t }))) : null,
      RJY.connections(g.seenIn, 'Where it shows')
    ].filter(Boolean));
  }
  select(skills[0].id);

  const A = 1.26, B = 2.68;
  // The painter's brush lays the palette: one stroke of colour after another, each in its own pigment.
  // GAP is the scroll between two strokes starting, LAY how long one takes (screens).
  const GAP = 0.07, LAY = 0.1, flowAt = (t, i) => ease.out(ease.clamp((t - at(A) - 0.02 - i * GAP) / LAY));
  let boxes = null;
  engine.onResize(() => { boxes = null; });
  if (engine.jobs) engine.jobs.push({
    t0: at(A) + 0.02, t1: at(A) + 0.02 + (n - 1) * GAP + LAY,
    at(t) {
      // where each stroke lies when it is fully laid (its layout box: it slides in from 46px to the left as it flows)
      if (!boxes) { const L = list.getBoundingClientRect(); boxes = strokes.map((b) => ({ left: L.left + b.offsetLeft, top: L.top + b.offsetTop, width: b.offsetWidth, height: b.offsetHeight })); }
      const i = Math.max(0, Math.min(n - 1, Math.floor((t - at(A) - 0.02) / GAP))), r = boxes[i], k = flowAt(t, i);
      const hex = (RJY.PIGMENTS[skills[i].pigment] || RJY.PIGMENTS.gold)[0];
      return { x: r.left - (1 - k) * 46 + 14 + (r.width - 18) * k, y: r.top + r.height * 0.5, ang: 0, col: [parseInt(hex.slice(1, 3), 16) / 255, parseInt(hex.slice(3, 5), 16) / 255, parseInt(hex.slice(5, 7), 16) / 255] };
    }
  });
  function update(t, s, dt, on) {
    strokes.forEach((b, i) => { b.style.setProperty('--flow', flowAt(t, i).toFixed(3)); });
    if (!on) { manual = false; return; }
    // left alone, the chapter walks through the colours as it is scrolled
    if (!manual) {
      const i = Math.min(n - 1, Math.floor(ease.clamp(span(t, at(A + 0.3), at(B))) * n));
      select(skills[i].id);
    }
  }
  engine.onResize(paint);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(paint);
  requestAnimationFrame(paint);

  beat(head, 0.62, 1.3);
  beat(list, 1.26, 2.8, { y: 0 });
  beat(detail, 1.5, 2.8);
  beat(creds, 2.76, 3.36);
  return { update, select: (id) => select(id, true) };
}
