/*
 * Signal Junction — the junctions and the numbers of the game. Change these, not game.js, to tune it.
 * Lengths are in ticks (60 a second), speeds in pixels a tick, on the 320 × 180 screen.
 *
 * A junction: roads — where each crossing lane meets the main lane (x), and which way it flies (dir 1 down,
 * -1 up); every — ticks between aerocars on the crossing lane; main — ticks between aerocars on the main lane;
 * quota — how many must get through.
 */
export const TUNE = {
  speed: 1.25, accel: 0.06, react: 12,     // an aerocar's top speed, how fast it gets there, how long it takes to move off
  car: 10, gap: 4,                         // an aerocar's length, the room it keeps
  lives: 3,                                // crashes allowed in a run
  jam: 360,                                // a lane blocked at its entrance for this long is a gridlock
  rush: 0.78,                              // in the second half of a junction, aerocars come this much sooner
  cool: 14,                                // ticks before a light can be switched again
  checkpoints: [0, 3, 6]                   // a new run starts at the furthest of these junctions reached
};
export const JUNCTIONS = [
  { name: 'FIRST LIGHT', main: 110, quota: 12, roads: [{ x: 160, dir: 1, every: 130 }] },
  { name: 'MARKET CROSS', main: 90, quota: 16, roads: [{ x: 160, dir: -1, every: 100 }] },
  { name: 'TWIN TOWERS', main: 100, quota: 18, roads: [{ x: 110, dir: 1, every: 150 }, { x: 210, dir: 1, every: 150 }] },
  { name: 'UP AND DOWN', main: 88, quota: 22, roads: [{ x: 110, dir: 1, every: 125 }, { x: 210, dir: -1, every: 140 }] },
  { name: 'RUSH HOUR', main: 62, quota: 24, roads: [{ x: 160, dir: 1, every: 72 }] },
  { name: 'THREE BRIDGES', main: 100, quota: 24, roads: [{ x: 80, dir: 1, every: 170 }, { x: 160, dir: -1, every: 170 }, { x: 240, dir: 1, every: 170 }] },
  { name: 'GLASS MILE', main: 72, quota: 28, roads: [{ x: 100, dir: -1, every: 100 }, { x: 220, dir: 1, every: 100 }] },
  { name: 'THE WEAVE', main: 86, quota: 30, roads: [{ x: 80, dir: 1, every: 140 }, { x: 160, dir: 1, every: 150 }, { x: 240, dir: -1, every: 140 }] },
  { name: 'LIFT PLAZA', main: 58, quota: 32, roads: [{ x: 110, dir: 1, every: 84 }, { x: 210, dir: -1, every: 88 }] },
  { name: 'NEO CENTRAL', main: 72, quota: 40, roads: [{ x: 70, dir: -1, every: 112 }, { x: 160, dir: 1, every: 120 }, { x: 250, dir: -1, every: 112 }] }
];
export const CARS = ['#ffe08a', '#ff6fae', '#7fe8c0', '#c86bff', '#ff9d2e', '#fff8e6'];
