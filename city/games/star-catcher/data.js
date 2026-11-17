/*
 * Star Catcher — the numbers of the game. Change these, not game.js, to tune it.
 * Lengths are in ticks (60 a second), speeds in pixels a tick, on the 320 × 180 screen.
 */
export const TUNE = {
  round: 90 * 60,            // one round
  lives: 3,                  // meteors you can take
  basket: { w: 26, y: 158, speed: 3.2, chase: 6 },      // chase: how fast it follows the mouse
  spawn: [46, 20],           // ticks between drops: at the start, at the end
  fall: [0.85, 1.9],         // fall speed: at the start, at the end
  meteor: [0.1, 0.3],        // share of drops that are meteors: at the start, at the end
  points: 10,                // a star, times the streak
  streakMax: 9,
  stamp: 1200                // the score that stamps the City Pass
};
export const COLOURS = [
  { name: 'gold', main: '#ffd75e', lite: '#fff6c8', dark: '#c98a1c' },
  { name: 'cyan', main: '#58e6ff', lite: '#d6faff', dark: '#1c8fb3' },
  { name: 'rose', main: '#ff6fae', lite: '#ffd3e6', dark: '#b3306c' }
];
export const ART = {
  star: ['...l...', '..lml..', 'llmmmdd', '.mmmmd.', '..mmd..', '.mm.md.', '.d...d.'],
  meteor: ['..ooo..', '.orrro.', 'orrRrro', 'orRRRro', 'orrRrro', '.orrro.', '..ooo..'],
  heart: ['.#.#.', '#####', '#####', '.###.', '..#..']
};
