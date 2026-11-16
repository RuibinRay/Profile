/*
 * Chapter 5 — Gallery of Creations.
 * The camera walks into the spiral library and the projects of data/work.js come toward it as
 * framed canvases: first the featured websites, one at a time, each with its real screenshot
 * (kept sharp: an interface is shown as it is, never repainted; one still being made, or only
 * announced, hangs as a plain canvas with its name); then a wall for each field with
 * every other project. A canvas opens its full case study (#projects/<id>); "Search all projects"
 * opens the index with search and filters (#view/projects).
 *
 * Each canvas starts on a shelf down the tunnel, lifts off, turns to face the visitor, rests in the
 * centre and passes the shoulder. Its place in space is a pure function of the scroll, so the walk
 * reverses exactly.
 */
import { ease } from '../view.js';
import { pixelText, createPlanet, BIOMES } from '../../pixel/pixel-kit.js';
import { leaveTo } from '../../pixel/pixel-wipe.js';

const STATUS = { live: 'Live', 'in-progress': 'In progress', 'coming-soon': 'Coming soon' };
const HUE = { gold: '#f6c443', ember: '#f3a35c', foam: '#dfe8fa', periwinkle: '#b6c1ee', teal: '#7fd6cf' };

export function build({ ui, SITE, RJY, h, beat, at, panels, calm, engine }) {
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
    const kind = [panels.FIELD_LABEL[w.constellation], STATUS[w.status] || '', w.when].filter(has).join(' · ');
    const canvas = h('a', { class: 'frame__canvas' + (w.cover ? '' : ' frame__canvas--plain'), href: '#projects/' + w.id, 'aria-label': w.title + (w.status === 'coming-soon' ? ', coming soon: about the project' : ': open the case study') },
      w.cover ? RJY.picture(w.cover, { sizes: '(max-width: 860px) 86vw, 52vw', alt: 'The homepage of ' + w.title, full: true })
        : h('span', { class: 'frame__blank' }, h('b', { text: w.title }), h('small', { text: w.status === 'coming-soon' ? 'Coming soon' : 'Still in the making' })));
    const el = h('article', { class: 'frame frame--feature' + (i % 2 ? ' is-flipped' : '') },
      canvas,
      h('div', { class: 'frame__text' },
        h('p', { class: 'frame__kind', text: kind }),
        h('h3', { class: 'frame__title', text: w.title }),
        has(w.tagline) ? h('p', { class: 'frame__tag', text: w.tagline }) : null,
        h('div', { class: 'btn-set' },
          h('a', { class: 'pill pill--gold', href: '#projects/' + w.id, text: w.status === 'coming-soon' ? 'About the project' : 'Read the case study' }),
          live ? h('a', { class: 'pill', href: live.url, target: '_blank', rel: 'noopener', text: live.label }) : null)));
    // a canvas with nothing to look at yet holds the floor for less of the walk
    stations.push({ el, weight: w.cover ? 1 : 0.7, side: i % 2 ? -1 : 1, feature: true });
  });
  // At the end of Digital Creations: the pixel world. A small planet with a land for each game I have made;
  // it turns by itself, can be spun by dragging, and a click on it (or the button) opens the games page.
  let planet = null;
  {
    const globe = h('a', { class: 'px-planet', href: 'games.html', 'aria-label': 'Pixel World: open the page of my games' });
    planet = createPlanet(globe, { size: 104 });
    const title = h('h3', { class: 'px-title' }, h('span', { class: 'visually-hidden', text: 'Pixel World' }));
    title.appendChild(pixelText('Pixel World', { shadow: true }));
    const el = h('article', { class: 'frame frame--feature frame--planet' },
      globe,
      h('div', { class: 'frame__text' },
        h('p', { class: 'frame__kind', text: 'Digital Creations · Games' }),
        title,
        h('p', { class: 'frame__tag', text: 'The games I have made, as four lands of one small planet. Drag it to spin it; click or tap it to land.' }),
        h('ul', { class: 'px-lands', role: 'list' }, BIOMES.map((b) => h('li', { style: '--land:' + b.land[0], text: b.name }))),
        h('div', { class: 'btn-set' }, h('a', { class: 'pill pill--gold', href: 'games.html', text: 'Enter the pixel world' }))));
    stations.push({ el, weight: 1, side: -1, planet: true });
    // Landing: the planet grows toward the visitor while big pixels close in on it, then the games page opens
    // the same way (pixel-wipe.js). A drag is not a click; a click with a modifier key opens a tab as usual.
    const land = (e) => {
      if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button) return;
      e.preventDefault();
      const r = globe.getBoundingClientRect();
      document.documentElement.classList.add('is-landing');
      leaveTo('games.html', { x: r.left + r.width / 2, y: r.top + r.height / 2 }, true);
    };
    globe.addEventListener('click', land);
    el.querySelector('.btn-set a').addEventListener('click', land);
  }
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
  const A = 1.12, B = 6.26, total = stations.reduce((n, s) => n + s.weight, 0);
  let acc = 0;
  stations.forEach((s) => { s.w = (B - A) * s.weight / total; s.c = at(A + acc + s.w / 2); acc += s.w; s.shown = false; });
  // the brush writes each featured canvas's title and line once the canvas has come to rest in the centre
  if (engine && engine.write) stations.forEach((s) => {
    if (!s.feature) return;
    const title = s.el.querySelector('.frame__title'), tag = s.el.querySelector('.frame__tag'), t0 = s.c - 0.31 * s.w;
    engine.write(title, t0, 0.2 * s.w);
    if (tag) engine.write(tag, t0 + 0.21 * s.w, 0.17 * s.w);
  });

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

  // Each canvas hangs on a shelf of the library until its turn: far down the tunnel, to one side,
  // turned along the wall and in shadow. Then it lifts off, swings round to face the visitor as it
  // floats to the centre, rests there (sharp, lit, clickable) and finally passes the other shoulder.
  const root = document.documentElement;
  let fetched = false;
  function update(t, sec) {
    if (!fetched) { fetched = true; gallery.querySelectorAll('img[loading="lazy"]').forEach((im) => { im.loading = 'eager'; }); }
    const vw = window.innerWidth, vh = window.innerHeight;
    const still = calm || root.classList.contains('is-paused');
    for (let i = 0; i < stations.length; i++) {
      const s = stations[i];
      const u = (t - s.c) / s.w;                 // −0.5 … 0.5 while this station holds the floor
      const far = u < -0.86 || u > 0.68;
      if (far) { if (s.shown) { s.el.style.visibility = 'hidden'; s.shown = false; if (s.planet && planet) { planet.setActive(false); s.front = false; s.el.classList.remove('is-front'); } } continue; }
      if (!s.shown) { s.el.style.visibility = 'visible'; s.shown = true; }
      const hold = 0.3;
      const k = u < -hold ? (u + hold) : u > hold ? (u - hold) : 0;
      let x = 0, y = 0, z = 0, o = 1, rx = 0, ry = 0, rz = 0, shade = 0, txt = 1;
      if (calm) { o = 1 - ease.clamp(Math.abs(k) / 0.3); }
      else if (k <= 0) {
        // off the shelf and round to the front
        const a = ease.clamp(-k / 0.56), ea = ease.smooth(a);
        x = s.side * vw * 0.60 * ea;
        y = -vh * 0.10 * a - vh * 0.05 * Math.sin(Math.PI * a);
        z = -2100 * Math.pow(a, 1.5);
        ry = s.side * -58 * ea; rz = s.side * 2.5 * a; rx = 5 * a;
        o = 1 - ease.clamp((a - 0.70) / 0.30);
        shade = 0.6 * a; txt = 1 - ease.clamp(a / 0.35);
      } else {
        // past the visitor's shoulder
        const a = ease.clamp(k / 0.34);
        z = 760 * a; x = s.side * -vw * 0.40 * a * a; y = vh * 0.03 * a;
        ry = s.side * 24 * a; rz = s.side * -2 * a;
        o = 1 - ease.smooth(a); txt = 1 - ease.clamp(a / 0.5);
      }
      // at rest a canvas is never quite still: it floats on the air of the room
      if (!still && k === 0) { y += Math.sin(sec * 0.7 + i * 1.7) * 5; rz += Math.sin(sec * 0.5 + i) * 0.25; }
      const st = s.el.style;
      st.opacity = o.toFixed(3);
      st.transform = `translate3d(calc(-50% + ${x.toFixed(1)}px), calc(-50% + ${y.toFixed(1)}px), ${z.toFixed(1)}px) rotateX(${rx.toFixed(2)}deg) rotateY(${ry.toFixed(2)}deg) rotateZ(${rz.toFixed(2)}deg)`;
      // light: in shadow on the shelf, and a glint crosses the glass as it turns
      st.setProperty('--shade', shade.toFixed(3));
      st.setProperty('--txt', txt.toFixed(3));
      st.setProperty('--glint', Math.min(1, Math.abs(ry) / 26).toFixed(3));
      st.setProperty('--sheen', (50 + ry * 1.9).toFixed(1) + '%');
      const front = Math.abs(u) < 0.5 && o > 0.6;
      if (front !== s.front) { s.front = front; s.el.classList.toggle('is-front', front); if (s.planet && planet) planet.setActive(front); }
    }
  }

  beat(head, 0.6, 1.3);
  beat(rail, 1.0, 6.42, { y: 0 });
  beat(tools, 1.35, 6.4, { y: 10 });
  return { update };
}
