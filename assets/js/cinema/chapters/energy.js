/*
 * Chapter 6 — Energy and International Business.
 * The golden field becomes an energy landscape: solar panels rise from the wheat, a vanadium flow
 * battery (two tanks and a stack) stands in the middle, and a line runs on to the village on the
 * horizon. One current flows through it all, and the six pieces of work from the HJAT internship sit
 * on it as stops. Everything written here is from data/journey.js (hjat) and data/work.js
 * (constellation "storage"): titles, results and the one documented insight. No figure is added.
 */
import { span, ease } from '../view.js';

// where each stop sits on the drawing (viewBox 1200 × 460), in the order the current reaches them
const STOPS = [
  { id: 'market-maps', x: 150, y: 250, group: 0 },
  { id: 'tenders', x: 318, y: 214, group: 0 },
  { id: 'proposals', x: 468, y: 258, group: 0 },
  { id: 'lifecycle', x: 640, y: 178, group: 1 },
  { id: 'study-guides', x: 842, y: 232, group: 2 },
  { id: 'outreach', x: 1010, y: 196, group: 2 }
];
const FLOW = 'M40 318 C110 250 120 250 150 250 S270 214 318 214 S420 258 468 258 S560 178 640 178 S760 232 842 232 S960 196 1010 196 S1120 150 1168 132';

function drawing() {
  const panel = (x, y) => `<g transform="translate(${x} ${y})"><path class="e-leg" d="M22 58v34M74 52v36"/><path class="e-panel" d="M0 62L16 4l84-10-12 58z"/><path class="e-grid" d="M10 42l84-10M13 23l84-10M30 2L16 60M58-1L44 57M86-4L72 54"/></g>`;
  return `<svg class="energy__svg" viewBox="0 0 1200 460" preserveAspectRatio="xMidYMax meet" aria-hidden="true">
    <g class="e-solar">${panel(44, 300)}${panel(150, 316)}${panel(258, 300)}${panel(364, 318)}</g>
    <g class="e-battery" transform="translate(548 250)">
      <path class="e-tank e-tank--a" d="M0 34c0-16 62-16 62 0v96c0 16-62 16-62 0z"/><path class="e-tank-top e-tank--a" d="M0 34c0 16 62 16 62 0s-62-16-62 0z"/>
      <path class="e-tank e-tank--b" d="M124 34c0-16 62-16 62 0v96c0 16-62 16-62 0z"/><path class="e-tank-top e-tank--b" d="M124 34c0 16 62 16 62 0s-62-16-62 0z"/>
      <path class="e-stack" d="M70 6h46v62H70z"/><path class="e-stack-line" d="M78 6v62M86 6v62M93 6v62M100 6v62M108 6v62"/>
      <path class="e-pipe e-pipe--a" d="M31 22V-8h48v14M79 68v84H31v-22"/><path class="e-pipe e-pipe--b" d="M155 22V-8h-48v14M107 68v84h48v-22"/>
    </g>
    <g class="e-grid-out" transform="translate(906 150)">
      <path class="e-pylon" d="M40 210L58 0l18 210M46 150h24M49 96h18M26 44h64M34 44l-8 14M82 44l8 14"/>
      <path class="e-pylon" transform="translate(150 -34) scale(.72)" d="M40 210L58 0l18 210M46 150h24M49 96h18M26 44h64M34 44l-8 14M82 44l8 14"/>
      <path class="e-wire" d="M26 44C80 70 130 30 168 -2M90 44c40 18 90 -8 126 -46"/>
    </g>
    <path class="e-flow e-flow--ground" d="${FLOW}"/>
    <path class="e-flow e-flow--lit" d="${FLOW}"/>
    <path class="e-flow e-flow--spark" d="${FLOW}"/>
  </svg>`;
}

// the chart a brushstroke turns into: cost against hours of storage, with the one documented result
const CHART = `<svg class="cost" viewBox="0 0 320 170" role="img" aria-label="Illustration: as the hours of storage grow, the lifecycle cost line of the lithium battery rises above the flow battery's. At 4 hours lithium is ahead; at 8 hours the flow battery is.">
  <path class="cost__axis" d="M34 22v116h272"/>
  <text x="34" y="14">Cost over its life</text>
  <path class="cost__line cost__line--lfp" d="M40 112C110 100 190 74 300 30"/>
  <path class="cost__line cost__line--vrfb" d="M40 76C120 74 200 70 300 62"/>
  <path class="cost__tick" d="M110 30v108M236 30v108"/>
  <text x="110" y="158" text-anchor="middle">4 hours</text><text x="236" y="158" text-anchor="middle">8 hours</text>
  <text x="300" y="22" text-anchor="end" class="cost__lfp">Lithium (LFP)</text><text x="300" y="80" text-anchor="end" class="cost__vrfb">Flow battery (VRFB)</text>
</svg>`;

export function build({ ui, SITE, RJY, h, beat, at }) {
  const has = RJY.has;
  const job = RJY.findJourney('hjat') || {};
  const win = RJY.findJourney('vrfb-competition');
  const site = RJY.findWork('vrfb-info');
  const W = (id) => RJY.findWork(id) || { title: id, results: [], insights: [] };

  const head = h('div', { class: 'beat en-head scrim' },
    h('p', { class: 'headline headline--long', 'aria-hidden': 'true', 'data-rise': true, text: 'Energy and international business' }),
    h('p', { class: 'statement', 'data-rise': true, text: [job.title, 'HJAT (恒久安泰)', job.place, job.when].filter(has).join(' · ') }),
    h('p', { class: 'lede', 'data-rise': true, text: job.summary || '' }));

  const scene = h('div', { class: 'beat energy', html: drawing() });
  const stops = STOPS.map((s, i) => {
    const w = W(s.id);
    const a = h('a', { class: 'stop', href: '#projects/' + s.id, style: `left:${(s.x / 12).toFixed(2)}%;top:${(s.y / 4.6).toFixed(2)}%`, 'data-group': s.group },
      h('i', { 'aria-hidden': 'true' }), h('span', { text: w.short || w.title }));
    scene.appendChild(a);
    return { a, at: (i + 0.6) / (STOPS.length + 0.6), group: s.group };
  });

  const row = (id, n) => {
    const w = W(id);
    return h('li', null, h('a', { class: 'textlink', href: '#projects/' + id, text: w.title }),
      h('ul', null, (w.insights || []).concat(w.results || []).slice(0, n || 2).map((r) => h('li', { text: r }))));
  };
  const photos = (job.photos || []).filter((p) => p && has(p.src));
  const proof = (label, i) => (photos[i] ? h('button', { type: 'button', class: 'pill', onclick() { RJY.lightbox(photos[i], photos.map((p) => Object.assign({ place: 'HJAT, Shenyang' }, p)), i); }, text: label }) : null);

  const cards = [
    h('div', { class: 'beat en-card glass' },
      h('h3', { class: 'subhead', 'data-rise': true, text: 'Mapping the market' }),
      h('ul', { class: 'en-list', 'data-rise': true }, row('market-maps', 3), row('tenders', 2), row('proposals', 2))),
    h('div', { class: 'beat en-card en-card--left en-card--cost glass' },
      h('h3', { class: 'subhead', 'data-rise': true, text: 'Counting the cost' }),
      h('div', { class: 'en-cost', 'data-rise': true, html: CHART }),
      h('p', { class: 'note', 'data-rise': true, text: 'An illustration of the documented result, not the model’s figures.' }),
      h('ul', { class: 'en-list', 'data-rise': true }, row('lifecycle', 3))),
    h('div', { class: 'beat en-card en-card--left glass' },
      h('h3', { class: 'subhead', 'data-rise': true, text: 'Sharing what I learned' }),
      h('ul', { class: 'en-list', 'data-rise': true }, row('study-guides', 1), row('outreach', 3),
        win ? h('li', null, h('a', { class: 'textlink', href: '#experience/' + win.id, text: win.title }), h('ul', null, h('li', { text: win.summary }))) : null),
      h('div', { class: 'btn-set', 'data-rise': true },
        proof('See the certificate', 1), proof('The completion letter', 2),
        site && has(site.links) ? h('a', { class: 'pill pill--gold', href: site.links[0].url, target: '_blank', rel: 'noopener', text: 'Open my VRFB site' }) : null))
  ];
  const foot = h('div', { class: 'beat en-foot' }, h('a', { class: 'pill', href: '#experience/hjat', text: 'Read the whole internship' }));
  ui.append(head, scene, ...cards, foot);

  const lit = scene.querySelector('.e-flow--lit'), chartLines = cards[1].querySelectorAll('.cost__line');
  let len = 0;
  function measure() { len = lit.getTotalLength(); lit.style.strokeDasharray = len; chartLines.forEach((l) => { l._len = l.getTotalLength(); l.style.strokeDasharray = l._len; }); }
  measure();

  const A = 1.25, B = 3.55;
  let group = -1;
  function update(t) {
    const u = ease.clamp(span(t, at(A), at(B)));
    lit.style.strokeDashoffset = (len * (1 - u)).toFixed(1);
    stops.forEach((s) => s.a.classList.toggle('is-lit', u >= s.at - 0.02));
    const g = u < 0.46 ? 0 : u < 0.62 ? 1 : 2;
    if (g !== group) { group = g; scene.dataset.group = g; stops.forEach((s) => s.a.classList.toggle('is-now', s.group === g)); }
    // the two cost lines are brushed in while their card is on stage
    const c = ease.clamp(span(t, at(2.36), at(2.74)));
    chartLines.forEach((l) => { l.style.strokeDashoffset = (l._len * (1 - c)).toFixed(1); });
    scene.style.setProperty('--rise', ease.out(ease.clamp(span(t, at(1.0), at(1.5)))).toFixed(3));
  }

  beat(head, 0.62, 1.42);
  beat(scene, 1.0, 3.72, { y: 0 });
  beat(cards[0], 1.42, 2.3);
  beat(cards[1], 2.3, 2.98);
  beat(cards[2], 2.98, 3.7);
  beat(foot, 1.5, 3.7, { y: 10 });
  return { update };
}
