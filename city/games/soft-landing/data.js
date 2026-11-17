/*
 * Soft Landing — the numbers and the ten pads. Change these, not game.js or logic.js, to tune it.
 * Lengths are in ticks (60 a second), distances in pixels of the 320 × 180 screen (y grows downward),
 * speeds in pixels a tick, accelerations in pixels a tick per tick, angles in degrees (0 = upright,
 * positive = nose to the right).
 */
export const TUNE = {
  gravity: 0.012,                         // the Moon's pull
  thrust: 0.034,                          // the engine, along the nose
  turn: 2.4,                              // how fast the lander turns
  tilt: 80,                               // the furthest it turns either way
  burn: 1,                                // fuel used per tick of thrust
  safe: { vy: 0.55, vx: 0.32, tilt: 9 },  // the most a landing can take: down speed, side speed, lean
  landers: 3,                             // crashes allowed in a run
  intro: 180,                             // ticks the lander hangs at the start of a pad (or until a key)
  pause: 100,                             // ticks after a landing or a crash before the next try
  score: { land: 100, fuel: 0.25, centre: 40, gentle: 30 }   // per landing: base, per unit of fuel left, best aim, softest touch
};

/*
 * A pad: name, one line of what is new, the ground's seed and shape, where the pad is, where the lander
 * starts, its fuel, and the wind. base: the ground's height (y); rough: how hilly; hills: [centre x, half
 * width, height] bumps added to the ground; pad: [left x, width] (flattened); start: [x, y, sideways speed];
 * wind: a steady push (+ to the right); gust: how much it swings, over `period` ticks.
 */
export const PADS = [
  { name: 'Tranquil Pad', say: 'Hold up to fire the engine. Come down slowly onto the pad.', seed: 11, base: 152, rough: 6, pad: [138, 44], start: [160, 22, 0], fuel: 420 },
  { name: 'Step Left', say: 'Turn with left and right. Lean to drift, then stand up straight to land.', seed: 23, base: 150, rough: 12, pad: [36, 40], start: [228, 22, 0], fuel: 420 },
  { name: 'Crater Rim', say: 'The pad sits in a crater. Stay above the rim.', seed: 37, base: 156, rough: 8, hills: [[176, 18, 28], [262, 20, 32]], pad: [200, 36], start: [70, 22, 0], fuel: 420 },
  { name: 'Narrow Shelf', say: 'A narrow pad. Aim for the middle.', seed: 41, base: 158, rough: 8, hills: [[178, 34, 34]], pad: [246, 24], start: [60, 22, 0.4], fuel: 420 },
  { name: 'First Wind', say: 'A steady wind pushes you to the right.', seed: 53, base: 152, rough: 10, pad: [56, 32], start: [232, 22, 0], fuel: 440, wind: 0.0022 },
  { name: 'The Ridge', say: 'A ridge stands between you and the pad. Go over it.', seed: 67, base: 156, rough: 8, hills: [[160, 30, 86]], pad: [242, 32], start: [50, 22, 0], fuel: 470 },
  { name: 'Gusts', say: 'The wind comes and goes. Watch the arrow.', seed: 71, base: 154, rough: 10, pad: [144, 28], start: [40, 22, 0.5], fuel: 520, gust: 0.0034, period: 240 },
  { name: 'Low Fuel', say: 'Little fuel left. Fall first, burn late.', seed: 83, base: 152, rough: 10, pad: [112, 34], start: [250, 22, -0.4], fuel: 260 },
  { name: 'The Canyon', say: 'The pad is at the bottom of a canyon. Come straight down.', seed: 97, base: 166, rough: 6, hills: [[118, 26, 72], [200, 26, 72]], pad: [146, 26], start: [160, 18, 0], fuel: 400 },
  { name: 'Tranquility Deep', say: 'Home. Wind, a ridge and a narrow pad, all at once.', seed: 101, base: 156, rough: 10, hills: [[150, 28, 78], [206, 16, 36]], pad: [258, 22], start: [40, 22, 0.5], fuel: 460, wind: -0.0016, gust: 0.0026, period: 300 }
];
