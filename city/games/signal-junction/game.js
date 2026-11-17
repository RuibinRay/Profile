/*
 * Signal Junction — Game City No. 41 (Skyline Center, arcade and puzzle).
 *
 * What it does: aerocars fly along one main sky lane and the lanes that cross it. Each crossing has a light
 * that lets either the main lane or the crossing lane through; a click (or its number key) switches it. Get the
 * quota of aerocars through each of ten junctions. An aerocar already in a crossing keeps going, so switching
 * with one inside lets the others fly into it: that is a crash, and three end the run. A lane left waiting
 * until it backs up to its entrance is a gridlock, which also ends it.
 * What it leaves alone: everything outside its canvas; it saves its best score and the furthest checkpoint.
 * To turn its effects off: the shake follows the visitor's reduced-motion setting; sound has the bar's switch.
 * The junctions and numbers are in data.js. check() is the bot that plays 20 runs for tools/city-check.mjs.
 */
import { text, box, night, rnd } from '../../kit/draw.js';
import { TUNE, JUNCTIONS, CARS } from './data.js';

const A = '#58e6ff', INK = '#021820', MY = 96, HALF = 8, LINE = 10;
let S = null;

/* a lane: 'main' flies left to right across every crossing; a crossing lane meets it once */
function load(G, i) {
  const J = JUNCTIONS[i];
  S.i = i; S.J = J; S.passed = 0; S.clear = 0; S.bits = [];
  S.lanes = [{ main: true, len: 320, every: J.main, cars: [], next: 40, block: 0, at: J.roads.map((r) => r.x) }]
    .concat(J.roads.map((r, k) => ({ main: false, k, x: r.x, dir: r.dir, len: 180, every: r.every, cars: [], next: 70 + k * 35, block: 0, at: [r.dir > 0 ? MY : 180 - MY] })));
  S.lights = J.roads.map(() => ({ main: true, cool: 0 }));
  S.banner = { text: 'JUNCTION ' + (i + 1) + ': ' + J.name, t: 110 };
}
function start(G) {
  const from = Math.min(G.save.data.reached || 0, JUNCTIONS.length - 1);
  const cp = TUNE.checkpoints.filter((c) => c <= from).pop() || 0;
  S = { lives: TUNE.lives, score: 0, t: 0, from: cp };
  load(G, cp);
}
/* the rectangle an aerocar fills on the screen */
function rect(lane, car) {
  if (lane.main) return [car.s - TUNE.car, MY - 3, TUNE.car, 6];
  const y = lane.dir > 0 ? car.s : 180 - car.s;
  return [lane.x - 3, lane.dir > 0 ? y - TUNE.car : y, 6, TUNE.car];
}
const green = (lane, j) => S.lights[lane.main ? j : lane.k].main === lane.main;
function flip(G, k) {
  const L = S.lights[k];
  if (!L || L.cool > 0) return;
  L.main = !L.main; L.cool = TUNE.cool; G.sfx('turn');
}

function tick(G) {
  S.t++;
  if (S.banner && --S.banner.t <= 0) S.banner = null;
  if (S.clear > 0) {                                             // between junctions
    if (--S.clear === 0) {
      if (S.i + 1 >= JUNCTIONS.length) {
        G.finish({ title: 'ALL CLEAR', score: S.score, won: true, stamp: true, lines: ['ALL TEN JUNCTIONS FLOW.', 'NEO CENTRAL THANKS ITS SIGNAL KEEPER.'] });
      } else load(G, S.i + 1);
    }
    return;
  }
  // the lights
  S.lights.forEach((L, k) => {
    if (L.cool > 0) L.cool--;
    const x = S.J.roads[k].x;
    if (G.hit['d' + (k + 1)] || (G.ptr.hit && Math.abs(G.ptr.x - x) < 20 && Math.abs(G.ptr.y - MY) < 26)) flip(G, k);
  });
  const rush = S.passed >= S.J.quota / 2 ? TUNE.rush : 1;
  for (const lane of S.lanes) {
    // new aerocars
    if (--lane.next <= 0) {
      const last = lane.cars[lane.cars.length - 1];
      if (!last || last.s - TUNE.car > 6) {
        lane.cars.push({ s: -2, v: TUNE.speed, wait: 0, c: Math.floor(G.rnd() * CARS.length) });
        lane.next = Math.round(lane.every * rush * (0.55 + G.rnd() * 0.9)); lane.block = 0;
      }
    }
    if (lane.next <= 0) lane.block++;
    // flying: the front one first
    let ahead = null;
    for (const car of lane.cars) {
      let limit = ahead ? ahead.s - TUNE.car - TUNE.gap : Infinity;
      lane.at.forEach((c, j) => { const line = c - LINE; if (car.s <= line && !green(lane, j)) limit = Math.min(limit, line); });
      if (car.s + 0.01 < limit) {
        if (car.v === 0 && car.wait < TUNE.react) car.wait++;
        else { car.v = Math.min(TUNE.speed, car.v + TUNE.accel); car.s = Math.min(limit, car.s + car.v); }
      } else { car.v = 0; car.wait = 0; }
      ahead = car;
    }
    const n = lane.cars.length;
    lane.cars = lane.cars.filter((car) => car.s < lane.len + TUNE.car + 2);
    if (lane.cars.length < n) { S.passed += n - lane.cars.length; S.score += (n - lane.cars.length) * 10; G.sfx('tick'); }
  }
  // crashes: an aerocar of the main lane and one of a crossing lane in the same place
  const main = S.lanes[0];
  for (const lane of S.lanes.slice(1)) {
    for (const a of lane.cars) {
      const ra = rect(lane, a);
      for (const b of main.cars) {
        const rb = rect(main, b);
        if (ra[0] < rb[0] + rb[2] && rb[0] < ra[0] + ra[2] && ra[1] < rb[1] + rb[3] && rb[1] < ra[1] + ra[3]) { a.dead = b.dead = true; }
      }
    }
    if (lane.cars.some((c) => c.dead)) {
      lane.cars = lane.cars.filter((c) => !c.dead); main.cars = main.cars.filter((c) => !c.dead);
      S.lives--; G.shake(14); G.sfx('crash');
      for (let i = 0; i < 14; i++) S.bits.push({ x: lane.x, y: MY, vx: Math.cos(i * 0.45) * (1 + (i % 3) * 0.5), vy: Math.sin(i * 0.45) * (1 + (i % 3) * 0.5), life: 26 });
      S.banner = { text: 'CRASH! WAIT FOR THE CROSSING TO EMPTY', t: 120 };
    }
  }
  S.bits = S.bits.filter((b) => { b.x += b.vx; b.y += b.vy; return --b.life > 0; });
  G.hud = 'Junction ' + (S.i + 1) + ' of ' + JUNCTIONS.length + ' · score ' + S.score;
  const jammed = S.lanes.find((l) => l.block > TUNE.jam);
  if (S.lives <= 0 || jammed) {
    G.finish({ title: jammed ? 'GRIDLOCK' : 'TOO MANY CRASHES', score: S.score, won: false,
      lines: [jammed ? (jammed.main ? 'THE MAIN LANE' : 'A CROSSING LANE') + ' BACKED UP TO ITS ENTRANCE.' : 'THREE CRASHES CLOSE THE JUNCTION.', 'REACHED JUNCTION ' + (S.i + 1) + ' OF ' + JUNCTIONS.length + '.'] });
  } else if (S.passed >= S.J.quota) {
    S.clear = 100; S.score += 50; S.lives = Math.min(TUNE.lives, S.lives + 1);
    if (S.i + 1 > (G.save.data.reached || 0)) { G.save.data.reached = S.i + 1; G.commit(); }
    S.banner = { text: 'JUNCTION CLEAR  +50', t: 100 }; G.sfx('good');
  }
}

function city(g, t) {
  night(g, 320, 180, ['#031018', '#06202c', '#0b2e3e', '#123c50'], 41);
  const r = rnd(41);
  for (let x = 0; x < 320;) {
    const w = 12 + Math.floor(r() * 16), h = 18 + Math.floor(r() * 52);
    g.fillStyle = '#0b2230'; g.fillRect(x, 180 - h, w, h);
    g.fillStyle = '#123246'; g.fillRect(x, 180 - h, 1, h);
    for (let wy = 180 - h + 4; wy < 178; wy += 6) for (let wx = x + 3; wx < x + w - 2; wx += 4) if (r() > 0.55) { g.fillStyle = (Math.floor(t / 120 + wx * 3 + wy) % 9) ? '#1d6a82' : '#ffe08a'; g.fillRect(wx, wy, 2, 2); }
    x += w + 2;
  }
}
function draw(g, G) {
  city(g, S.t);
  // the lanes
  g.fillStyle = 'rgba(2,16,24,.72)'; g.fillRect(0, MY - HALF, 320, HALF * 2);
  S.J.roads.forEach((r) => g.fillRect(r.x - HALF, 14, HALF * 2, 166));
  g.fillStyle = '#1d6a82';
  for (let x = (S.t >> 2) % 8; x < 320; x += 8) { g.fillRect(x, MY - HALF, 3, 1); g.fillRect(x, MY + HALF - 1, 3, 1); }
  S.J.roads.forEach((r) => { for (let y = 14 + ((r.dir > 0 ? S.t >> 2 : 800 - (S.t >> 2)) % 8); y < 180; y += 8) { g.fillRect(r.x - HALF, y, 1, 3); g.fillRect(r.x + HALF - 1, y, 1, 3); } });
  // the lights: a bar across each way in, green to go and red to wait
  S.J.roads.forEach((r, k) => {
    const L = S.lights[k], go = '#5cf08a', stop = '#ff5c7a';
    g.fillStyle = '#021820'; g.fillRect(r.x - HALF, MY - HALF, HALF * 2, HALF * 2);
    const vy = r.dir > 0 ? MY - HALF - 3 : MY + HALF + 1;
    g.fillStyle = L.main ? go : stop; g.fillRect(r.x - HALF - 3, MY - HALF, 2, HALF * 2);      // across the main lane
    g.fillStyle = L.main ? stop : go; g.fillRect(r.x - HALF, vy, HALF * 2, 2);                 // across the crossing lane
    box(g, r.x + HALF + 3, MY - HALF - 13, 9, 11, '#021820', L.cool ? '#fff8e6' : A);
    text(g, String(k + 1), r.x + HALF + 5, MY - HALF - 11, '#fff8e6');
    // an arrow in the crossing for the way that is open
    g.fillStyle = '#1d6a82';
    if (L.main) { g.fillRect(r.x - 4, MY - 1, 7, 2); g.fillRect(r.x + 2, MY - 3, 2, 6); }
    else { g.fillRect(r.x - 1, MY - 4, 2, 7); if (r.dir > 0) g.fillRect(r.x - 3, MY + 2, 6, 2); else g.fillRect(r.x - 3, MY - 4, 6, 2); }
  });
  // the aerocars
  for (const lane of S.lanes) for (const car of lane.cars) {
    const [x, y, w, h] = rect(lane, car).map(Math.round);
    g.fillStyle = '#021820'; g.fillRect(x - 1, y - 1, w + 2, h + 2);
    g.fillStyle = CARS[car.c]; g.fillRect(x, y, w, h);
    g.fillStyle = '#58e6ff';
    if (lane.main) g.fillRect(x + w - 4, y + 1, 2, h - 2); else g.fillRect(x + 1, lane.dir > 0 ? y + h - 4 : y + 2, w - 2, 2);
    g.fillStyle = car.v === 0 ? '#ff5c7a' : '#ffffff';
    if (lane.main) g.fillRect(x, y + 1, 1, h - 2); else g.fillRect(x + 1, lane.dir > 0 ? y : y + h - 1, w - 2, 1);
  }
  // a lane that is backing up warns at its entrance
  for (const lane of S.lanes) if (lane.block > 90 && (S.t >> 3) % 2) {
    const k = Math.min(1, lane.block / TUNE.jam), x = lane.main ? 2 : lane.x - 14, y = lane.main ? MY - 20 : lane.dir > 0 ? 16 : 166;
    box(g, x, y, 28, 9, '#2a0a14', '#ff5c7a'); g.fillStyle = '#ff5c7a'; g.fillRect(x + 1, y + 1, Math.round(26 * k), 7);
    text(g, 'JAM', x + 14, y + 1, '#fff8e6', { align: 'center' });
  }
  S.bits.forEach((b) => { g.fillStyle = b.life % 4 < 2 ? '#ffe08a' : '#ff9d2e'; g.fillRect(Math.round(b.x), Math.round(b.y), 2, 2); });
  // the top: where we are, the quota, the crashes left
  g.fillStyle = '#021820'; g.fillRect(0, 0, 320, 13); g.fillStyle = A; g.fillRect(0, 13, 320, 1);
  text(g, (S.i + 1) + '/' + JUNCTIONS.length + ' ' + S.J.name, 3, 3, '#fff8e6');
  box(g, 150, 3, 82, 7, '#06202c', '#d9dcf2');
  g.fillStyle = A; g.fillRect(151, 4, Math.round(80 * Math.min(1, S.passed / S.J.quota)), 5);
  text(g, S.passed + '/' + S.J.quota, 236, 3, '#fff8e6');
  for (let i = 0; i < TUNE.lives; i++) { g.fillStyle = i < S.lives ? '#ff6fae' : '#123246'; g.fillRect(296 + i * 8, 4, 6, 5); }
  if (S.banner) {
    box(g, 30, 150, 260, 15, '#021820', A);
    text(g, S.banner.text, 160, 154, '#fff8e6', { align: 'center' });
  }
}

/** The bot: lets the longer queue go, but switches only when the crossing is empty and nothing is about to enter it. */
function check({ createCore }) {
  const reached = [], scores = [];
  for (let run = 0; run < 20; run++) {
    const { G, T } = createCore(def, { seed: 500 + run });
    T.step(10); T.press('ok'); T.step(1);
    let guard = 0;
    while (G.state === 'play' && guard++ < 60 * 60 * 12) {
      if (!S.clear) S.J.roads.forEach((r, k) => {
        const main = S.lanes[0], cross = S.lanes[k + 1], L = S.lights[k], c = cross.at[0];
        const near = (lane, at) => lane.cars.filter((car) => car.s <= at - LINE && car.s > at - 70).length;
        const inBox = (lane, at) => lane.cars.some((car) => car.s > at - LINE + 0.01 && car.s - TUNE.car < at + HALF + 1);
        const qm = near(main, r.x) + main.block / 40, qc = near(cross, c) + cross.block / 40;
        const want = L.main ? qc > qm + 1 || (qc > 0 && qm === 0) : qm > qc + 1 || (qm > 0 && qc === 0);
        if (want && !L.cool && !inBox(main, r.x) && !inBox(cross, c)) T.press('d' + (k + 1));
      });
      T.step(1);
      if (G.lastError) return { ok: false, note: String(G.lastError.stack || G.lastError) };
    }
    reached.push(G.state === 'over' && S.i === JUNCTIONS.length - 1 && S.passed >= S.J.quota ? 10 : S.i); scores.push(S.score);
  }
  const all = reached.filter((x) => x === 10).length, avg = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
  return { ok: all >= 10, note: 'bot, 20 runs: cleared all ten junctions in ' + all + ', average score ' + avg + ', runs ended at junction ' + reached.map((x) => (x === 10 ? 'end' : x + 1)).join(' ') };
}

const def = {
  id: 'signal-junction', n: 41, name: 'Signal Junction', district: 'SKYLINE CENTER', accent: A, ink: INK,
  how: 'Click a light to switch which lane may cross. Switch only when the crossing is empty. Three crashes or a jammed lane end the run.',
  start, tick, draw, check,
  best: (save) => (save.best ? 'BEST ' + save.best : '') + (save.data.reached ? '  REACHED JUNCTION ' + Math.min(10, save.data.reached + 1) : ''),
  title: (g, G) => city(g, G.t)
};
export default def;
