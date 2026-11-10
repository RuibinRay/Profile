/*
 * Chapter 1 — Enter the Painting.
 * The name over the night ocean; the camera then finds the seated figure and pushes into the bright
 * star beside it. The words come from data/site.js.
 */
export function build({ ui, SITE, beat }) {
  const edu = (SITE.education || [])[0];
  const langs = ((SITE.about && SITE.about.glance) || []).find((g) => g.label === 'Languages');
  const intro = ui.querySelector('[data-fill="intro"]'), facts = ui.querySelector('[data-fill="facts"]');
  if (intro) intro.textContent = SITE.profile.intro;
  if (facts && edu) facts.textContent = [edu.degree + ', ' + edu.school, edu.place + '. ' + edu.when, langs ? langs.value : ''].filter(Boolean).join(' · ');
  const tag = ui.querySelector('.home-tagline');
  if (tag && SITE.profile.tagline) tag.textContent = SITE.profile.tagline;

  const q = (n) => ui.querySelector('[data-beat="' + n + '"]');
  beat(q('title'), 0, 0.95, { first: true });
  beat(q('intro'), 0, 0.85, { first: true });
  beat(q('cue'), 0, 0.3, { first: true, y: 0 });
  beat(q('line'), 1.0, 1.85);
  return {};
}
