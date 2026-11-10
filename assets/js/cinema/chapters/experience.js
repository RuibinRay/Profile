/*
 * Chapter 3 — My Journey.
 * Every entry of data/journey.js is a lantern on one golden brushstroke, in date order. Scrolling
 * carries the camera along the stroke; a lantern opens its full entry (#experience/<id>). Something
 * that has not happened yet (upcoming: true) is an unlit lantern.
 */
import { span, ease } from '../view.js';

const KIND = { work: 'work', education: 'education', achievement: 'mark', milestone: 'mark', certification: 'cert', project: 'project' };
const LANTERN = '<svg viewBox="0 0 56 76" aria-hidden="true"><path class="l-cord" d="M28 0v9"/><path class="l-cap" d="M17 9h22l3 6H14z"/><path class="l-body" d="M12 15h32c3 9 3 34 0 44H12c-3-10-3-35 0-44z"/><path class="l-rib" d="M21 15c-2 12-2 32 0 44M35 15c2 12 2 32 0 44M28 15v44"/><path class="l-cap" d="M15 59h26l-3 6H18z"/><path class="l-tassel" d="M28 65v10"/></svg>';

export function build({ ui, SITE, RJY, h, beat, at, engine, calm }) {
  const entries = SITE.journey.slice().sort((a, b) => (a.at < b.at ? -1 : a.at > b.at ? 1 : 0));
  const n = entries.length;
  const done = entries.filter((e) => !e.upcoming).length;
  const first = entries[0].at.slice(0, 4);

  const head = h('div', { class: 'beat exp-head scrim' },
    h('p', { class: 'headline', 'aria-hidden': 'true', 'data-rise': true, text: 'My journey' }),
    h('p', { class: 'lede', 'data-rise': true, text: n + ' lanterns, one for every job, school and milestone since ' + first + '. Choose one to read its story.' }),
    h('div', { class: 'btn-set', 'data-rise': true }, h('a', { class: 'pill', href: '#view/timeline', text: 'Open the full timeline' })));

  // the lanterns sit on a wave; a year is written where it begins
  const track = h('div', { class: 'track' });
  const svg = RJY.s('svg', { class: 'track__stroke', 'aria-hidden': 'true', preserveAspectRatio: 'none' });
  const pathGlow = RJY.s('path', { class: 'track__line track__line--ground' }), path = RJY.s('path', { class: 'track__line' });
  svg.append(pathGlow, path);
  track.appendChild(svg);
  let year = '';
  const items = entries.map((e, i) => {
    const y = e.at.slice(0, 4);
    const mark = y !== year ? h('span', { class: 'track__year', 'aria-hidden': 'true', text: y }) : null;
    year = y;
    if (mark) track.appendChild(mark);
    const a = h('a', { class: 'lantern lantern--' + KIND[e.type] + (e.upcoming ? ' is-unlit' : ''), href: '#experience/' + e.id,
      'aria-label': (e.short || e.title) + ', ' + e.when + (e.upcoming ? ' (upcoming)' : '') + '. ' + (SITE.journeyTypes[e.type] || '') },
      h('span', { class: 'lantern__light', html: LANTERN }),
      h('span', { class: 'lantern__text' }, h('b', { text: e.short || e.title }), h('small', { text: e.when + (e.upcoming ? ' · upcoming' : '') })));
    track.appendChild(a);
    return { e, a, mark, i };
  });
  const rail = h('div', { class: 'beat exp-rail' }, track);
  const kinds = [['work', 'Work'], ['education', 'Education'], ['mark', 'Achievements'], ['cert', 'Certifications'], ['project', 'Projects']];
  const legend = h('ul', { class: 'beat exp-legend', 'aria-label': 'What the lantern colours mean' },
    kinds.map(([k, label]) => h('li', { class: 'lantern--' + k }, h('i'), label)),
    done < n ? h('li', { class: 'is-unlit' }, h('i'), 'Unlit: still ahead') : null);
  ui.append(head, rail, legend);

  let W = 0, H = 0, S = 0, trackW = 0, len = 0, pts = [];
  function layout() {
    W = ui.clientWidth; H = ui.clientHeight;
    S = Math.max(150, Math.min(250, W * 0.17));
    trackW = S * (n + 1);
    const mid = rail.clientHeight * 0.44, amp = Math.min(70, rail.clientHeight * 0.13);
    track.style.width = trackW + 'px';
    pts = items.map((it) => {
      const x = S * (it.i + 1), y = mid + Math.sin(it.i * 1.25 + 0.6) * amp;
      it.x = x;
      it.a.style.transform = `translate3d(${x.toFixed(1)}px,${y.toFixed(1)}px,0)`;
      if (it.mark) it.mark.style.transform = `translate3d(${(x - S * 0.42).toFixed(1)}px,0,0)`;
      return [x, y];
    });
    // one smooth stroke through every lantern's cord
    let d = `M${-S} ${mid}`;
    const all = [[0, mid]].concat(pts, [[trackW + S, mid]]);
    all.forEach((p, i) => {
      if (!i) { d += ` L${p[0]} ${p[1]}`; return; }
      const q = all[i - 1], cx = (q[0] + p[0]) / 2;
      d += ` C${cx} ${q[1]}, ${cx} ${p[1]}, ${p[0]} ${p[1]}`;
    });
    svg.setAttribute('width', trackW); svg.setAttribute('height', rail.clientHeight);
    svg.setAttribute('viewBox', `0 0 ${trackW} ${rail.clientHeight}`);
    path.setAttribute('d', d); pathGlow.setAttribute('d', d);
    len = path.getTotalLength();
    path.style.strokeDasharray = len;
  }
  layout();
  engine.onResize(layout);

  const A = 0.95, B = 4.05;          // the stretch of the chapter (screens) over which the camera walks the stroke
  const uOf = (it) => (it.x - W * 0.5 + S * 0.35) / Math.max(1, trackW - W * 0.5 + S * 0.35 - W * 0.12);
  let near = -1;
  function update(t) {
    const u = ease.clamp(span(t, at(A), at(B)));
    const x = W * 0.62 - u * (trackW - W * 0.5 + S * 0.35 + W * 0.12);
    track.style.transform = `translate3d(${x.toFixed(1)}px,0,0)`;
    // the stroke is painted as far as the middle of the screen
    const reach = ease.clamp((W * 0.5 - x + S * 0.4) / (trackW + S));
    path.style.strokeDashoffset = (len * (1 - reach)).toFixed(1);
    let best = -1, bd = 1e9;
    items.forEach((it) => {
      const sx = it.x + x, d = Math.abs(sx - W * 0.5);
      it.a.classList.toggle('is-lit', sx < W * 0.56);
      if (d < bd) { bd = d; best = it.i; }
    });
    if (best !== near) { if (near >= 0) items[near].a.classList.remove('is-near'); near = best; if (near >= 0) items[near].a.classList.add('is-near'); }
  }
  // a lantern reached with the keyboard is brought to the middle of the screen
  items.forEach((it) => it.a.addEventListener('focus', () => {
    const sx = it.a.getBoundingClientRect().left;
    if (sx > W * 0.1 && sx < W * 0.85) return;
    const u = Math.min(1, Math.max(0, (it.x + W * 0.12) / (trackW - W * 0.5 + S * 0.35 + W * 0.12)));
    engine.travel(at(A + (B - A) * u), { cut: Math.abs(engine.t - at(A + (B - A) * u)) > 1.6 });
  }));
  void uOf; void calm;

  beat(head, 0.6, 1.5);
  beat(rail, 0.95, 4.16, { y: 0 });
  beat(legend, 1.25, 4.1, { y: 12 });
  return { update };
}
