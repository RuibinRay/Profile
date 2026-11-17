/*
 * logic.js — Planet Spin's rules, with no drawing and no page: the game (game.js) and the level check
 * (tools/city-checks/planet-spin.mjs) both use it, so what the check proves is what the player plays.
 *
 * A planet seen from above is a fixed core inside rings. Every ring carries the same pattern of lands as
 * the core, cut into S sectors; a ring turned by k sectors shows at sector p the land pattern[(p - k) mod S].
 * The level is solved when every ring shows the same lands as the core, so each strip of land runs
 * unbroken from the core to the coast. Turning a ring may turn others with it (`links`), and a ring in
 * `locked` cannot be turned by hand at all, only through its links.
 *
 * Turns are kept as whole numbers that are never wrapped (so the drawing can turn smoothly the short way);
 * everything that compares states wraps them.
 */
export const mod = (a, n) => ((a % n) + n) % n;

/** The rings the player may turn by hand: every ring except the core (0) and the locked ones. */
export function controls(level) {
  const out = [];
  for (let r = 1; r <= level.rings; r++) if (!(level.locked || []).includes(r)) out.push(r);
  return out;
}

/** Turn `ring` by d sectors (+ clockwise), and every ring linked to it by d × its factor. Changes `turns`. */
export function apply(level, turns, ring, d) {
  turns[ring] += d;
  for (const [j, m] of (level.links && level.links[ring]) || []) turns[j] += d * m;
  return turns;
}

/** The starting turns: the solved planet, scrambled by the level's own list of moves (so it can always be solved). */
export function setup(level) {
  const turns = new Array(level.rings + 1).fill(0);
  for (const [r, d] of level.scramble) apply(level, turns, r, d);
  return turns;
}

/** Does ring r, turned by t, show the same lands as the core? (A pattern that repeats can match more than one way.) */
export function ringMatches(level, t) {
  const p = level.pattern, S = p.length, k = mod(t, S);
  for (let i = 0; i < S; i++) if (p[mod(i - k, S)] !== p[i]) return false;
  return true;
}
export function solved(level, turns) {
  for (let r = 1; r <= level.rings; r++) if (!ringMatches(level, turns[r])) return false;
  return true;
}

/**
 * The fewest moves from `turns` to a solved planet, by breadth-first search over every reachable state
 * (at most 8^4 = 4096 of them). Returns the list of moves [ring, d], or null if it cannot be solved.
 */
export function solve(level, turns) {
  const S = level.pattern.length, hand = controls(level);
  const key = (t) => t.map((v) => mod(v, S)).join(',');
  const start = turns.map((v) => mod(v, S));
  if (solved(level, start)) return [];
  const seen = new Map([[key(start), null]]), queue = [start];
  for (let q = 0; q < queue.length; q++) {
    const cur = queue[q];
    for (const r of hand) for (const d of [1, -1]) {
      const next = apply(level, cur.slice(), r, d).map((v) => mod(v, S)), k = key(next);
      if (seen.has(k)) continue;
      seen.set(k, { from: key(cur), move: [r, d] });
      if (solved(level, next)) {
        const path = [];
        for (let at = k; seen.get(at); at = seen.get(at).from) path.unshift(seen.get(at).move);
        return path;
      }
      queue.push(next);
    }
  }
  return null;
}
