/*
 * Chapter 5 — Gallery of Creations.
 * The camera walks into the spiral library and the projects of data/work.js come toward it as
 * framed canvases: first the five featured websites, one at a time, each with its real screenshot
 * (kept sharp: an interface is shown as it is, never repainted); then a wall for each field with
 * every other project. A canvas opens its full case study (#projects/<id>); "Search all projects"
 * opens the index with search and filters (#view/projects).
 *
 * Each station's place in space is a pure function of the scroll, so the walk reverses exactly.
 */
import { ease } from '../view.js';

const HUE = { gold: '#f6c443', ember: '#f3a35c', foam: '#dfe8fa', periwinkle: '#b6c1ee', teal: '#7fd6cf' };

export function build({ ui, SITE, RJY, h, beat, at, panels, calm }) {
  const has = RJY.has, cons = SITE.constellations;
  const conOf = (id) => cons.find((c) => c.id === id) || {};
  const featured = SITE.work.filter((w) => w.featured);
  const members = (field) => SITE.work.filter((w) => w.constellation === field || (w.alsoIn || []).some((a) => a.constellation === field));
  const WALLS = ['finance', 'analytics', 'storage', 'strategy'];

  const head = h('div', { class: 'beat gal-head scrim' },
    h('p', { class: 'headline', 'aria-hidden': 'true', 'data-rise': true, text: 'Gallery of creations' }),
    h('p', { class: 'lede', 'data-rise': true, text: SITE.work.length + ' projects in ' + cons.length + ' rooms: the websites I build, then finance, analytics, energy storage and strategy. Every canvas opens its case study.' }),
    h('div', { class: 'btn-set', 'data-rise': true }, h('a', { class: 'pill pill--gold', href: '#view/projects', text: 'Search all projects' })));

  const gallery = h('div', { class: 'gallery' });
  const stations = [];
  featured.forEach((w, i) => {
    const live = (w.links || [])[0];
    const kind = [panels.FIELD_LABEL[w.constellation], w.status === 'in-progress' ? 'In progress' : (w.status === 'live' ? 'Live' : ''), w.when].filter(has).join(' · ');
    const canvas = h('a', { class: 'frame__canvas' + (w.cover ? '' : ' frame__canvas--plain'), href: '#projects/' + w.id, 'aria-label': w.title + ': open the case study' },
      w.cover ? RJY.picture(w.cover, { sizes: '(max-width: 860px) 86vw, 52vw', alt: 'The homepage of ' + w.title, full: true })
        : h('span', { class: 'frame__blank' }, h('b', { text: w.title }), h('small', { text: 'Still in the making' })));
    const el = h('article', { class: 'frame frame--feature' + (i % 2 ? ' is-flipped' : '') },
      canvas,
      h('div', { class: 'frame__text' },
        h('p', { class: 'frame__kind', text: kind }),
        h('h3', { class: 'frame__title', text: w.title }),
        has(w.tagline) ? h('p', { class: 'frame__tag', text: w.tagline }) : null,
        h('div', { class: 'btn-set' },
          h('a', { class: 'pill pill--gold', href: '#projects/' + w.id, text: 'Read the case study' }),
          live ? h('a', { class: 'pill', href: live.url, target: '_blank', rel: 'noopener', text: live.label }) : null)));
    stations.push({ el, weight: 1, side: i % 2 ? -1 : 1 });
  });
  WALLS.forEach((field, i) => {
    const c = conOf(field), list = members(field);
    const el = h('section', { class: 'frame frame--wall', style: '--hue:' + (HUE[c.hue] || HUE.gold) },
      h('div', { class: 'wall__head' }, h('h3', { class: 'frame__title', text: panels.FIELD_LABEL[field] || c.name }), h('p', { class: 'frame__tag', text: c.note || '' })),
      h('ul', { class: 'wall__list', role: 'list' }, list.map((w, k) => h('li', null,
        h('a', { class: 'canvas', href: '#projects/' + w.id, style: '--tilt:' + (((k * 37 + i * 11) % 7) - 3) * 0.5 + 'deg' },
          h('b', { text: w.short || w.title }), h('span', { text: w.title }),
          h('small', { text: [w.when, w.org].filter(has).join(' · ') }))))));
    stations.push({ el, weight: 0.72, side: i % 2 ? 1 : -1 });
  });
  stations.forEach((s) => gallery.appendChild(s.el));
  const rail = h('div', { class: 'beat gal-rail' }, gallery);
  const tools = h('div', { class: 'beat gal-tools' }, h('a', { class: 'pill', href: '#view/projects', text: 'Search all projects' }));
  ui.append(head, rail, tools);

  // the stations share the stretch between A and B (screens into the chapter) in proportion to their weight
  const A = 1.12, B = 5.06, total = stations.reduce((n, s) => n + s.weight, 0);
  let acc = 0;
  stations.forEach((s) => { s.w = (B - A) * s.weight / total; s.c = at(A + acc + s.w / 2); acc += s.w; s.shown = false; });

  // a canvas comes forward a little before its case study opens
  gallery.addEventListener('click', (e) => {
    const a = e.target.closest && e.target.closest('.frame__canvas, .canvas');
    if (!a || e.metaKey || e.ctrlKey || e.shiftKey || calm) return;
    e.preventDefault(); e.stopPropagation();
    a.classList.add('is-opening');
    setTimeout(() => { a.classList.remove('is-opening'); RJY.route.go(a.getAttribute('href')); }, 240);
  }, true);
  // a station reached with the keyboard is brought to the front
  stations.forEach((s) => s.el.addEventListener('focusin', () => { if (!s.el.classList.contains('is-front')) window.scrollTo({ top: s.c * window.innerHeight, behavior: calm ? 'auto' : 'smooth' }); }));

  let fetched = false;
  function update(t) {
    if (!fetched) { fetched = true; gallery.querySelectorAll('img[loading="lazy"]').forEach((im) => { im.loading = 'eager'; }); }
    for (let i = 0; i < stations.length; i++) {
      const s = stations[i];
      const u = (t - s.c) / s.w;                 // −0.5 … 0.5 while this station holds the floor
      const far = u < -0.84 || u > 0.68;
      if (far) { if (s.shown) { s.el.style.visibility = 'hidden'; s.shown = false; } continue; }
      if (!s.shown) { s.el.style.visibility = 'visible'; s.shown = true; }
      // rest in front for the middle of the station, come from the tunnel before it, pass the shoulder after it
      const hold = 0.3;
      const k = u < -hold ? (u + hold) : u > hold ? (u - hold) : 0;
      let z, x = 0, y = 0, o = 1, ry = 0;
      if (calm) { o = 1 - ease.clamp(Math.abs(k) / 0.3); z = 0; }
      else if (k <= 0) {
        // arriving: it only shows once the canvas before it has all but left
        const a = ease.clamp(-k / 0.5);
        z = -2400 * a * a; o = 1 - ease.clamp((a - 0.04) / 0.36); y = -60 * a; x = s.side * 90 * a; ry = s.side * -8 * a;
      } else {
        const a = ease.clamp(k / 0.34);
        z = 620 * a; o = 1 - ease.smooth(a); x = s.side * -520 * a * a; ry = s.side * 16 * a;
      }
      s.el.style.opacity = o.toFixed(3);
      s.el.style.transform = `translate3d(calc(-50% + ${x.toFixed(1)}px), calc(-50% + ${y.toFixed(1)}px), ${z.toFixed(1)}px) rotateY(${ry.toFixed(2)}deg)`;
      const front = Math.abs(u) < 0.5 && o > 0.6;
      if (front !== s.front) { s.front = front; s.el.classList.toggle('is-front', front); }
    }
  }

  beat(head, 0.6, 1.3);
  beat(rail, 1.0, 5.22, { y: 0 });
  beat(tools, 1.35, 5.2, { y: 10 });
  return { update };
}
