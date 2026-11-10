/*
 * formats.js — which image format this browser can show, and which file of a painting to fetch.
 *
 * Every painting exists as AVIF (smaller, sharper) and, up to 2560 px, as WebP. A browser that cannot
 * decode AVIF simply gets the WebP files; the 3840 px tier is AVIF only, so such a browser tops out at 2560.
 */
const PROBE = 'data:image/avif;base64,AAAAIGZ0eXBhdmlmAAAAAGF2aWZtaWYxbWlhZk1BMUIAAADrbWV0YQAAAAAAAAAhaGRscgAAAAAAAAAAcGljdAAAAAAAAAAAAAAAAAAAAAAOcGl0bQAAAAAAAQAAAB5pbG9jAAAAAEQAAAEAAQAAAAEAAAETAAAAHAAAAChpaW5mAAAAAAABAAAAGmluZmUCAAAAAAEAAGF2MDFDb2xvcgAAAABqaXBycAAAAEtpcGNvAAAAFGlzcGUAAAAAAAAAAgAAAAIAAAAQcGl4aQAAAAADCAgIAAAADGF2MUOBAAwAAAAAE2NvbHJuY2x4AAEADQAGgAAAABdpcG1hAAAAAAAAAAEAAQQBAoMEAAAAJG1kYXQSAAoFGAA2BCAyERgACiiihAAAsBKcnTZvgfCg';

let avif = false;

/** Resolves (to true or false) once it is known whether AVIF can be shown. Wait for it before asking for a file. */
export const formatsReady = new Promise((resolve) => {
  if (/[?&]webp\b/.test(location.search)) { resolve(false); return; }      // ?webp forces the fallback, for testing
  const im = new Image();
  const done = (ok) => { avif = ok; resolve(ok); };
  im.onload = () => done(im.naturalWidth === 2);
  im.onerror = () => done(false);
  im.src = PROBE;
  setTimeout(() => resolve(avif), 1500);
});

export const hasAvif = () => avif;

/** A file that exists in both formats: `base` without its extension. */
export const best = (base) => base + (avif ? '.avif' : '.webp');

/** The painting itself: the largest size not above `want` that this browser can show. */
export function paintingURL(p, want) {
  const sizes = p.sizes.slice().sort((a, b) => b - a);
  for (const s of sizes) {
    if (s > want) continue;
    const f = (p.formats && p.formats[s]) || ['webp'];
    if (avif && f.indexOf('avif') !== -1) return { url: `${p.base}-${s}.avif`, size: s };
    if (f.indexOf('webp') !== -1) return { url: `${p.base}-${s}.webp`, size: s };
  }
  const s = sizes[sizes.length - 1];
  return { url: `${p.base}-${s}.webp`, size: s };
}

/** A fill layer (what is behind the near or middle layer): `which` is 1 or 2, `want` a width. */
export function fillURL(p, which, want) {
  const sizes = p.layers.fills.slice().sort((a, b) => b - a);
  const s = sizes.find((x) => x <= want) || sizes[sizes.length - 1];
  return best(`${p.layers['fill' + which]}-${s}`);
}
