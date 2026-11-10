/*
 * panels.js — the full views that open over the film, and the detail routes.
 *
 * The film shows fragments; these hold everything, using the same content components as the plain
 * portfolio (assets/js/content/*.js), so nothing is written twice:
 *
 *   #view/story        the whole biography, At a Glance, education, the résumé
 *   #view/timeline     the full journey with its filters by kind and year
 *   #view/atlas        the interactive world map, statistics, year filter, replay, and the albums
 *   #view/projects     every project: search, filters by field, straight to any case study
 *   #view/credentials  languages, tools, certificates (with their verification links), coursework, awards
 *
 * Detail routes are the ones the first site used, so old links keep working:
 *   #projects/<id> a case study · #world/<CODE> a country · #experience/<id> a journey entry ·
 *   #skills/<id> a colour of the palette · #memories/<album> a photo album.
 */
import { buildProjectIndex, FIELD_LABEL, FIELD_ORDER, fieldsOf } from './project-index.js';

export function createPanels({ RJY, SITE, h, engine, hooks }) {
  const panel = document.getElementById('panel'), body = document.getElementById('panel-body'), titleEl = document.getElementById('panel-title');
  const has = RJY.has;
  let current = null, lastFocus = null;
  const built = {};

  function head(title, lede) {
    return h('header', { class: 'sec__head' }, h('h2', { class: 'sec__title', text: title }), lede ? h('p', { class: 'sec__lede', text: lede }) : null);
  }
  function shell(id, title, lede) {
    const sec = h('section', { class: 'view', 'data-view': id }, h('div', { class: 'sec__inner' }, head(title, lede)));
    body.appendChild(sec);
    return sec.firstChild;
  }
  const reveal = (scope) => RJY.reveal(scope);

  const VIEWS = {
    story: {
      name: 'The full story',
      build() {
        const el = shell('story', 'Beyond the Horizon');
        const about = h('div', { class: 'about' }), edu = h('div', { class: 'edu' }), off = h('div', { class: 'offclock' });
        el.append(about, edu, off);
        RJY.renderAbout(about); RJY.renderEducation(edu); RJY.renderOffclock(off);
      }
    },
    timeline: {
      name: 'The full timeline',
      build() {
        const el = shell('timeline', 'The Journey So Far', 'Education, work and milestones as one path. Select a star to read its story, or filter by kind and year.');
        const j = h('div', { class: 'journey' });
        el.appendChild(j);
        RJY.renderJourney(j);
        RJY.route.on('experience', openEntry);     // the film's entry sheet, not the timeline's own handler
      }
    },
    atlas: {
      name: 'The world atlas',
      build() {
        const el = shell('atlas', 'A world still waiting to be discovered', 'Countries I know light up. Select one to open its chapter and photos; the dark ones are still ahead of me.');
        const atlas = h('div', { class: 'atlas' }, h('div', { class: 'map' }, h('div', { class: 'map__loading', text: 'Drawing the map…' })));
        const albums = h('div', { class: 'albums', id: 'memories', hidden: true });
        el.append(atlas, albums);
        RJY.renderAtlas(atlas);
        RJY.renderAlbums(albums);
      }
    },
    projects: { name: 'All projects', build: buildIndex },
    credentials: {
      name: 'Credentials',
      build() {
        const el = shell('credentials', 'Languages, certificates and coursework', 'Each certificate opens full size; where the issuer offers it, a link verifies it.');
        const aux = h('div', { class: 'palette-aux' }), certs = h('div', { class: 'certs' }), courses = h('div', { class: 'courses' }), edu = h('div', { class: 'edu' });
        el.append(aux, certs, courses, edu);
        RJY.renderPaletteAux(aux); RJY.renderCertificates(certs); RJY.renderCourses(courses); RJY.renderEducation(edu);
        const awards = (SITE.awards || []).filter((a) => has(a.title));
        if (awards.length) el.appendChild(h('div', { class: 'awards' }, h('h3', { class: 'awards__title', text: 'Awards' }),
          h('ul', { class: 'awards__list' }, awards.map((a) => h('li', null, h('b', { text: a.title + (a.year ? ', ' + a.year : '') }), ' ', a.text,
            has(a.evidence) ? [' ', h('a', { class: 'link', href: a.evidence, target: '_blank', rel: 'noopener', text: 'See the evidence' })] : null)))));
      }
    }
  };

  /* ---------- the project index: search, filters, every project (project-index.js) ---------- */
  function buildIndex() {
    const el = shell('projects', 'Every project', 'Type to search titles, tools and methods, or choose a field. Each row opens the full case study.');
    const index = buildProjectIndex(el, { RJY, SITE, h });
    VIEWS.projects.focus = index.focus;
    VIEWS.projects.filter = index.filter;
  }

  /* ---------- open / close ---------- */
  function show(id) {
    const v = VIEWS[id]; if (!v) return false;
    if (!built[id]) { v.build(); built[id] = true; reveal(body); }
    body.querySelectorAll('.view').forEach((s) => s.classList.toggle('is-active', s.dataset.view === id));
    titleEl.textContent = v.name;
    if (!current) { lastFocus = document.activeElement; RJY.lockScroll(true); }
    current = id;
    RJY.cinema.view = id;
    panel.inert = false;
    panel.classList.add('is-open');
    body.scrollTop = 0;
    if (id === 'atlas') window.dispatchEvent(new Event('resize'));
    setTimeout(() => { if (v.focus) v.focus(); else body.focus({ preventScroll: true }); }, 60);
    if (hooks && hooks.onOpen) hooks.onOpen(id);
    return true;
  }
  function hide() {
    if (!current) return;
    current = null; RJY.cinema.view = null;
    panel.classList.remove('is-open');
    panel.inert = true;
    RJY.lockScroll(false);
    if (lastFocus && lastFocus.focus) { try { lastFocus.focus({ preventScroll: true }); } catch (e) {} }
    if (hooks && hooks.onClose) hooks.onClose();
  }
  /** Close the panel and put the address back on the chapter. */
  function close(silent) {
    const r = RJY.route.parse(location.hash);
    if (!silent && r && r.section === 'view' && RJY.route.depth() > 0) { history.back(); return; }   // popstate hides it
    hide();
    if (r && r.section === 'view') { try { history.replaceState(null, '', '#' + (engine.chapter ? engine.chapter.id : 'home')); } catch (e) {} }
  }
  document.getElementById('panel-close').addEventListener('click', () => close());
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape' || !current || RJY.sheet.isOpen()) return;
    const lb = document.getElementById('lightbox'); if (lb && !lb.hidden) return;
    e.preventDefault(); close();
  });
  window.addEventListener('popstate', () => {
    const r = RJY.route.parse(location.hash);
    if (current && !r) hide();
  });

  /* ---------- detail routes ---------- */
  // "#view/projects.finance" opens the project index already filtered to a field
  RJY.route.on('view', (id) => {
    const parts = String(id).split('.');
    if (RJY.sheet.isOpen()) RJY.sheet.close(true);
    if (!show(parts[0])) { hide(); return; }
    if (parts[0] === 'projects' && VIEWS.projects.filter) VIEWS.projects.filter(parts[1] || 'all');
  });
  RJY.route.on('projects', (id) => RJY.openWork(id));
  // A journey entry opens as a drawer over the film (the full timeline lives in #view/timeline).
  function openEntry(id) {
    const e = RJY.findJourney(id); if (!e) return;
    const list = SITE.journey.slice().sort((a, b) => (a.at < b.at ? -1 : a.at > b.at ? 1 : 0)), i = list.indexOf(e);
    RJY.sheet.open({
      kind: 'drawer', label: e.title,
      render(el) {
        const place = e.country ? h('a', { class: 'link', href: '#world/' + e.country, text: e.place || RJY.countryName(e.country) }) : (e.place || '');
        el.appendChild(h('div', { class: 'entry' },
          h('p', { class: 'entry__when' }, e.when, e.upcoming ? h('span', { class: 'entry__ahead', text: 'Upcoming' }) : null, ' · ', SITE.journeyTypes[e.type] || ''),
          h('h2', { class: 'cp__name', text: e.title }),
          has(e.org) ? h('p', { class: 'cp__head', text: e.org }) : null,
          place ? h('p', { class: 'jd__place' }, place) : null,
          h('div', { class: 'entry__body' }, RJY.journeyDetail(e)),
          h('div', { class: 'jd__nav' },
            i > 0 ? h('a', { class: 'link', href: '#experience/' + list[i - 1].id }, '← ' + (list[i - 1].short || list[i - 1].title)) : h('span'),
            i < list.length - 1 ? h('a', { class: 'link', href: '#experience/' + list[i + 1].id }, (list[i + 1].short || list[i + 1].title) + ' →') : h('span'))));
      }
    });
  }
  RJY.route.on('experience', openEntry);
  // Countries and albums belong to the atlas: build it (out of sight) the first time one is asked for.
  function viaAtlas(section) {
    RJY.route.on(section, () => {
      if (!built.atlas) { VIEWS.atlas.build(); built.atlas = true; reveal(body); }
      RJY.route.handle();      // the atlas has now registered its own handler for this route
    });
  }
  viaAtlas('world'); viaAtlas('memories');

  return {
    open(id) { RJY.route.go('#view/' + id); },
    show, close, hide,
    isOpen: () => !!current,
    filterProjects(field) { if (!built.projects) { VIEWS.projects.build(); built.projects = true; } VIEWS.projects.filter(field); },
    FIELD_LABEL, FIELD_ORDER, fieldsOf
  };
}
