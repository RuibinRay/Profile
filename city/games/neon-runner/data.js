/*
 * Neon Runner — the numbers and the pieces of track. Change these, not logic.js or game.js, to tune it.
 * Lengths in ticks (60 a second), distances in pixels of the 320 × 180 screen, speeds in pixels a tick.
 * The street (floor) is at y = 152 and the overpass (ceiling) at y = 28; the runner stays at x = 64 and the
 * world moves past.
 */
export const TUNE = {
  speed: [2.4, 5.0],         // running speed at the start, and the most it reaches
  accel: 0.0004,             // speed gained per tick
  gravity: 0.42,             // toward whichever surface the runner is on
  jump: 6.0,                 // jump speed, away from the surface
  maxFall: 7,
  coyote: 6,                 // ticks after running off an edge when a jump still works
  buffer: 6,                 // ticks a jump pressed in the air is remembered for the landing
  stand: 14, low: 7,         // the runner's height standing and sliding
  chip: 25,                  // points for an energy chip
  gapTicks: 34,              // the shortest pause between two pieces of track, in ticks at the current speed
  first: 420,                // clear street before the first piece
  stamp: 1500                // the score that stamps the City Pass
};

/*
 * The pieces of track, drawn for the street (side 'F'); each is mirrored onto the overpass ('C') half the time.
 * k: block (a crate: jump it), beam (a laser at head height: slide under it), gap (a hole: jump it, or flip),
 * drone (floats between the two surfaces, y ± amp: mind it when flipping), chip (h pixels off the surface).
 * x and w are in pixels from the start of the piece; len is the piece's length; from: the distance (pixels)
 * the run must have gone before the piece can appear; weight: how often it is picked.
 */
const chips = (x0, n, step, h = 4, side = 'F') => Array.from({ length: n }, (_, i) => ({ k: 'chip', x: x0 + i * step, h: typeof h === 'function' ? h(i) : h, side }));
export const PIECES = [
  { name: 'hop', len: 12, from: 0, weight: 4, obs: [{ k: 'block', x: 0, w: 12, side: 'F' }] },
  { name: 'chips', len: 80, from: 0, weight: 2, obs: chips(0, 5, 20) },
  { name: 'duck', len: 40, from: 300, weight: 3, obs: [{ k: 'beam', x: 0, w: 40, side: 'F' }] },
  { name: 'pit', len: 46, from: 500, weight: 3, obs: [{ k: 'gap', x: 0, w: 46, side: 'F' }] },
  { name: 'arc', len: 70, from: 600, weight: 2, obs: [{ k: 'block', x: 29, w: 12, side: 'F' }, ...chips(5, 5, 15, (i) => [12, 28, 38, 28, 12][i])] },
  { name: 'double hop', len: 108, from: 1200, weight: 2, obs: [{ k: 'block', x: 0, w: 12, side: 'F' }, { k: 'block', x: 96, w: 12, side: 'F' }] },
  { name: 'hop then duck', len: 150, from: 1600, weight: 2, obs: [{ k: 'block', x: 0, w: 12, side: 'F' }, { k: 'beam', x: 110, w: 40, side: 'F' }] },
  { name: 'long pit', len: 180, from: 2000, weight: 2, obs: [{ k: 'gap', x: 0, w: 180, side: 'F' }, ...chips(40, 4, 30, 4, 'C')] },
  { name: 'switchback', len: 230, from: 3200, weight: 2, obs: [{ k: 'gap', x: 0, w: 180, side: 'F' }, { k: 'beam', x: 150, w: 40, side: 'C' }] },
  { name: 'drone gate', len: 190, from: 4200, weight: 2, obs: [{ k: 'gap', x: 0, w: 190, side: 'F' }, { k: 'drone', x: 70, y: 90, amp: 24 }] },
  { name: 'crate on the other side', len: 200, from: 5200, weight: 1, obs: [{ k: 'gap', x: 0, w: 170, side: 'F' }, { k: 'block', x: 120, w: 12, side: 'C' }] },
  { name: 'pit and laser', len: 130, from: 6000, weight: 1, obs: [{ k: 'gap', x: 0, w: 46, side: 'F' }, { k: 'beam', x: 90, w: 40, side: 'F' }] }
];
