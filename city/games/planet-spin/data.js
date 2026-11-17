/*
 * data.js — Planet Spin's fifteen planets, as data (rules in logic.js).
 *
 *   pattern   the lands round the core, one letter per sector, clockwise from the top:
 *             V violet ruin (Shattered Worlds), M moon grey (MoonKeeper), N northern snow (Blood of the North),
 *             E teal city (Neo Earth 2226), S sea
 *   rings     how many rings round the core
 *   links     { ring: [[other ring, factor], ...] } — turning `ring` by d also turns `other` by d × factor
 *   locked    rings that cannot be turned by hand, only through links
 *   scramble  the moves that mixed the planet up, applied to the solved planet: so every level can be solved
 *   say       one line shown with the level: what is new on this planet
 *
 * The level check (tools/city-checks/planet-spin.mjs) solves every level and prints its par.
 */
export const LEVELS = [
  { name: 'First Light', pattern: 'VVSEES', rings: 1, scramble: [[1, 2]],
    say: 'Pick the ring and turn it until the lands line up with the core.' },
  { name: 'Two Rings', pattern: 'VVSNNS', rings: 2, scramble: [[1, 2], [2, -1]],
    say: 'Each ring turns on its own. Line them both up.' },
  { name: 'Eight Lands', pattern: 'VVSMMSEN', rings: 2, scramble: [[1, 3], [2, -2]],
    say: 'Eight sectors now: four lands and the sea between them.' },
  { name: 'Dragged Along', pattern: 'NNSEESVM', rings: 2, links: { 2: [[1, 1]] }, scramble: [[2, 2], [1, -3]],
    say: 'Turning the outer ring drags the inner ring along with it.' },
  { name: 'Counter-Turn', pattern: 'MMSVVSNE', rings: 2, links: { 1: [[2, -1]] }, scramble: [[1, 3], [2, 2]],
    say: 'The rings are geared: turn the inner one and the outer turns the other way.' },
  { name: 'Three Rings', pattern: 'VVSSMMEN', rings: 3, links: { 1: [[2, 1]] }, scramble: [[1, 2], [2, 3], [3, -2]],
    say: 'A third ring. The inner ring still drags the middle one.' },
  { name: 'Gear Train', pattern: 'EESNNSVM', rings: 3, links: { 1: [[2, -1]], 2: [[3, -1]] }, scramble: [[3, 2], [2, 1], [1, -2]],
    say: 'Each ring turns the next one out the other way.' },
  { name: 'Locked Middle', pattern: 'VMSNESVV', rings: 3, locked: [2], links: { 1: [[2, 1]], 3: [[2, -1]] }, scramble: [[1, 3], [3, 1]],
    say: 'The middle ring is locked. It only moves when its neighbours pull it.' },
  { name: 'Double Gear', pattern: 'NNMSEEVS', rings: 3, links: { 2: [[1, -1], [3, -1]] }, scramble: [[2, 3], [1, 2], [3, -1]],
    say: 'The middle ring turns both of the others against it.' },
  { name: 'Two Steps', pattern: 'VSMSNSES', rings: 3, links: { 1: [[2, 2]], 3: [[2, 1]] }, scramble: [[1, 1], [3, 3], [2, -2]],
    say: 'One turn of the inner ring moves the middle ring two.' },
  { name: 'Four Rings', pattern: 'MMSNNSEV', rings: 4, links: { 1: [[2, 1]], 3: [[4, -1]] }, scramble: [[1, 2], [3, 3], [2, -1], [4, 2]],
    say: 'Four rings, in two geared pairs.' },
  { name: 'The Chain', pattern: 'EEVSNNMS', rings: 4, links: { 1: [[2, 1]], 2: [[3, 1]], 3: [[4, 1]] }, scramble: [[4, 3], [3, -2], [2, 2], [1, -1]],
    say: 'Every ring drags the next one out. Work from the coast inward.' },
  { name: 'Locked Coast', pattern: 'VVSMEESN', rings: 4, locked: [4], links: { 1: [[4, 1]], 2: [[4, -1]], 3: [[4, 2]] }, scramble: [[1, 2], [2, 3], [3, 1]],
    say: 'The coast ring is locked, and every other ring pulls it.' },
  { name: 'Mirror Gears', pattern: 'NSVVSMES', rings: 4, links: { 1: [[4, -1]], 4: [[1, -1]], 2: [[3, 1]], 3: [[2, -1]] }, scramble: [[1, 3], [2, 2], [4, -2], [3, 1]],
    say: 'Rings pair up across the planet, each turning its partner.' },
  { name: 'The Whole World', pattern: 'VMSNESEV', rings: 4, locked: [2, 4], links: { 1: [[2, 1], [4, -1]], 3: [[2, -1], [4, 1]] }, scramble: [[1, 3], [3, 2], [1, -1], [3, 3]],
    say: 'Two rings to turn, two locked between them. Every world at once.' }
];
