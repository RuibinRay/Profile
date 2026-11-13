/*
 * paint-text.js — words that are painted on, line by line.
 *
 * A piece of text is "written" by sliding the ragged edge of a loaded brush (assets/img/paint-reveal.svg)
 * along each of its lines in turn. The lines are measured from the text as the browser has laid it out
 * (so it works for any wrapping, alignment and language), and each gets its own strip of mask whose
 * position is a CSS calculation on one custom property, --paint, going from 0 (nothing written) to 1
 * (all of it). Whoever drives --paint (engine.js with the scroll; brush.js with the clock, for the name
 * on the first screen) only changes that one number per frame.
 *
 *   measureText(el)   the lines of el: position and size inside el, and the share of the writing each takes
 *   applyMask(el, m)  give el the mask for those lines
 *   clearMask(el)     take it off (once everything is written, so shadows and descenders are whole again)
 *   pointAt(m, p)     where the brush is when the share p has been written: line, x, y (inside el)
 */
const IMG = "url('assets/img/paint-reveal.svg')";
const PAD = 7;            // room either side of a line, so the ragged edge starts and ends off the letters

/** The lines of text in el, top to bottom. Returns null if el has no size yet. */
export function measureText(el) {
  const R = el.getBoundingClientRect();
  if (R.width < 2 || R.height < 2) return null;
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  const range = document.createRange(), rows = [];
  let node;
  while ((node = walker.nextNode())) {
    if (!node.nodeValue.trim()) continue;
    const pe = node.parentElement;
    if (pe && pe.closest('.visually-hidden, .swash')) continue;      // read aloud, not shown
    range.selectNodeContents(node);
    const rects = range.getClientRects();
    for (let i = 0; i < rects.length; i++) {
      const r = rects[i];
      if (r.width < 1 || r.height < 1) continue;
      const mid = r.top + r.height / 2;
      const row = rows.find((q) => mid > q.t && mid < q.b);          // another piece of the same line
      if (row) { row.l = Math.min(row.l, r.left); row.r = Math.max(row.r, r.right); row.t = Math.min(row.t, r.top); row.b = Math.max(row.b, r.bottom); }
      else rows.push({ l: r.left, r: r.right, t: r.top, b: r.bottom });
    }
  }
  if (!rows.length) return null;
  rows.sort((a, b) => a.t - b.t || a.l - b.l);
  // where the boxes of two lines overlap (tight headlines), each keeps its half, so the tops of the next
  // line's letters are not shown before their turn
  for (let i = 1; i < rows.length; i++) {
    if (rows[i].t < rows[i - 1].b) { const cut = (rows[i].t + rows[i - 1].b) / 2; rows[i - 1].b = cut; rows[i].t = cut; }
  }
  const lines = rows.map((q) => ({ x: q.l - R.left, y: q.t - R.top, w: q.r - q.l, h: q.b - q.t }));
  return weigh({ lines, W: R.width, H: R.height });
}

/** Share of the writing each line takes: its length (a short last line is not written in slow motion). */
export function weigh(m) {
  const total = m.lines.reduce((n, ln) => n + ln.w + 30, 0);
  let acc = 0;
  m.lines.forEach((ln) => { ln.s = acc / total; acc += ln.w + 30; ln.e = acc / total; });
  return m;
}

const PROPS = ['mask-image', 'mask-size', 'mask-position', 'mask-repeat'];
export function applyMask(el, m) {
  const img = [], size = [], pos = [];
  m.lines.forEach((ln) => {
    const w = ln.w + PAD * 2, x = ln.x - PAD, k = 1 / Math.max(1e-4, ln.e - ln.s);
    img.push(IMG);
    size.push((w * 3).toFixed(1) + 'px ' + (ln.h + 2).toFixed(1) + 'px');
    // the mask is three line-lengths wide: solid, then the ragged edge, then clear. As this line's share q
    // goes 0 → 1 its edge crosses the line from just before its start to just past its end.
    pos.push('calc(' + x.toFixed(1) + 'px + (1.3 * clamp(0, (var(--paint) - ' + ln.s.toFixed(4) + ') * ' + k.toFixed(3) + ', 1) - 1.65) * ' + w.toFixed(1) + 'px) ' + (ln.y - 1).toFixed(1) + 'px');
  });
  const v = [img.join(', '), size.join(', '), pos.join(', '), 'no-repeat'];
  PROPS.forEach((p, i) => { el.style.setProperty('-webkit-' + p, v[i]); el.style.setProperty(p, v[i]); });
  el.classList.add('is-writing');
}
export function clearMask(el) {
  PROPS.forEach((p) => { el.style.removeProperty('-webkit-' + p); el.style.removeProperty(p); });
  el.classList.remove('is-writing');
}

/** The brush's place when the share p (0–1) of the text has been written. */
export function pointAt(m, p) {
  const L = m.lines;
  let i = 0;
  while (i < L.length - 1 && p >= L[i].e) i++;
  const ln = L[i], q = Math.min(1, Math.max(0, (p - ln.s) / Math.max(1e-4, ln.e - ln.s)));
  const along = Math.min(1, Math.max(0, 1.3 * q - 0.15));
  return { line: i, q, x: ln.x + along * ln.w, y: ln.y + ln.h * 0.56, h: ln.h, w: ln.w, swash: !!ln.swash };
}
