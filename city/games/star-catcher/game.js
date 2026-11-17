/*
 * Star Catcher — Game City No. 1 (Pixel Plaza, arcade).
 *
 * What it does: stars of three colours and meteors fall on the plaza for 90 seconds. Slide the basket to catch
 * the stars; each star of the same colour as the last one makes the streak longer and is worth more. A star of
 * another colour starts the streak again; a meteor costs a heart and the streak. Three meteors end the round.
 * What it leaves alone: everything outside its canvas; it saves only its best score (city:star-catcher).
 * To turn its effects off: the shake follows the visitor's reduced-motion setting; sound has the bar's switch.
 * The numbers are in data.js. check() is the bot that plays 20 rounds for tools/city-check.mjs.
 */
import { text, sprite, box, night, rnd } from '../../kit/draw.js';
import { TUNE, COLOURS, ART } from './data.js';

const lerp = (a, b, k) => a + (b - a) * k;
let S = null;

function start(G) {
  S = { t: 0, x: 160, lives: TUNE.lives, score: 0, streak: 0, colour: -1, drops: [], bits: [], next: 30, lastPtr: G.ptr.x, flash: 0, caught: 0, why: '' };
}
function burst(x, y, col, n) { for (let i = 0; i < n; i++) S.bits.push({ x, y, vx: (i - (n - 1) / 2) * 0.5, vy: -1 - (i % 3) * 0.4, life: 22, col }); }

function tick(G) {
  const B = TUNE.basket, k = S.t / TUNE.round;
  S.t++;
  // the basket: keys, or wherever the pointer went last
  if (G.ptr.x !== S.lastPtr || G.ptr.down) { S.lastPtr = G.ptr.x; S.goal = G.ptr.x; }
  if (G.held.left || G.held.right) { S.goal = null; S.x += (G.held.right ? 1 : 0) * B.speed - (G.held.left ? 1 : 0) * B.speed; }
  else if (S.goal != null) { const d = S.goal - S.x; S.x += Math.max(-B.chase, Math.min(B.chase, d)); }
  S.x = Math.max(B.w / 2 + 2, Math.min(320 - B.w / 2 - 2, S.x));
  // new drops
  if (--S.next <= 0) {
    S.next = Math.round(lerp(TUNE.spawn[0], TUNE.spawn[1], k) * (0.7 + G.rnd() * 0.6));
    const meteor = G.rnd() < lerp(TUNE.meteor[0], TUNE.meteor[1], k);
    S.drops.push({ x: 12 + G.rnd() * 296, y: -6, vy: lerp(TUNE.fall[0], TUNE.fall[1], k) * (0.85 + G.rnd() * 0.3) * (meteor ? 1.25 : 1), c: meteor ? -1 : Math.floor(G.rnd() * 3) });
  }
  // falling, catching
  S.drops = S.drops.filter((d) => {
    d.y += d.vy;
    if (d.y >= B.y - 4 && d.y <= B.y + 5 && Math.abs(d.x - S.x) <= B.w / 2 + 1) {
      if (d.c < 0) {
        S.lives--; S.streak = 0; S.colour = -1; S.flash = 18; G.shake(10); G.sfx('crash'); burst(d.x, B.y, '#ff7a4a', 7);
      } else {
        S.streak = d.c === S.colour ? Math.min(TUNE.streakMax, S.streak + 1) : 1;
        S.colour = d.c; S.caught++;
        S.score += TUNE.points * S.streak;
        G.sfx(S.streak > 1 ? 'pick' : 'blip'); burst(d.x, B.y - 2, COLOURS[d.c].main, 5);
        S.pop = { x: d.x, y: B.y - 12, n: TUNE.points * S.streak, life: 30, c: d.c };
      }
      return false;
    }
    return d.y < 176;
  });
  S.bits = S.bits.filter((b) => { b.x += b.vx; b.y += b.vy; b.vy += 0.12; return --b.life > 0; });
  if (S.pop && --S.pop.life <= 0) S.pop = null;
  if (S.flash) S.flash--;
  G.hud = 'Score ' + S.score;
  const out = S.lives <= 0, done = S.t >= TUNE.round;
  if (out || done) {
    const won = S.score >= TUNE.stamp;
    G.finish({
      title: out ? 'OUT OF HEARTS' : 'TIME!', score: S.score, won, stamp: won,
      lines: [out ? 'THREE METEORS LANDED IN THE BASKET.' : 'YOU CAUGHT ' + S.caught + ' STARS.', won ? 'A FULL BASKET FOR THE PLAZA.' : TUNE.stamp + ' POINTS STAMPS YOUR CITY PASS.']
    });
  }
}

function plaza(g, t) {
  night(g, 320, 180, ['#0b0c2e', '#141244', '#22195a', '#3a2f6b'], 11);
  const r = rnd(5);
  for (let x = 0; x < 320;) {                              // the skyline behind the plaza
    const w = 10 + Math.floor(r() * 14), h = 22 + Math.floor(r() * 46);
    g.fillStyle = '#1a1648'; g.fillRect(x, 164 - h, w, h);
    for (let wy = 164 - h + 3; wy < 160; wy += 5) for (let wx = x + 2; wx < x + w - 2; wx += 4) { if (r() > 0.6) { g.fillStyle = (Math.floor(t / 90 + wx + wy) % 7) ? '#f6c443' : '#8a6a20'; g.fillRect(wx, wy, 1, 2); } }
    x += w + 1;
  }
  g.fillStyle = '#26205a'; g.fillRect(0, 164, 320, 16);
  g.fillStyle = '#f6c443'; g.fillRect(0, 164, 320, 1);
  for (let x = 4; x < 320; x += 16) { g.fillStyle = '#3a2f6b'; g.fillRect(x, 170, 8, 1); }
}
function basket(g, x, y, hurt) {
  const w = TUNE.basket.w, l = Math.round(x - w / 2);
  g.fillStyle = hurt ? '#ff7a4a' : '#fff8e6'; g.fillRect(l, y, w, 1);
  g.fillStyle = '#b9772c'; g.fillRect(l + 1, y + 1, w - 2, 6);
  g.fillStyle = '#8a531a'; for (let i = 2; i < w - 2; i += 3) g.fillRect(l + i, y + 1, 1, 6);
  g.fillStyle = '#5c360f'; g.fillRect(l + 2, y + 7, w - 4, 1);
  g.fillStyle = '#d9dcf2'; g.fillRect(l + 4, y + 8, 2, 2); g.fillRect(l + w - 6, y + 8, 2, 2);
}
function draw(g, G) {
  plaza(g, S.t);
  S.drops.forEach((d) => {
    if (d.c < 0) {
      g.fillStyle = '#ff7a4a'; g.fillRect(Math.round(d.x), Math.round(d.y) - 12, 1, 7);
      g.fillStyle = '#ffb347'; g.fillRect(Math.round(d.x) - 1, Math.round(d.y) - 7, 3, 4);
      sprite(g, ART.meteor, d.x - 3, d.y - 3, { o: '#3d2a2a', r: '#8a4a3a', R: '#ff7a4a' });
    } else { const c = COLOURS[d.c]; sprite(g, ART.star, d.x - 3, d.y - 3, { l: c.lite, m: c.main, d: c.dark }); }
  });
  basket(g, S.x, TUNE.basket.y, S.flash > 0 && S.flash % 4 < 2);
  S.bits.forEach((b) => { g.fillStyle = b.col; g.fillRect(Math.round(b.x), Math.round(b.y), 1, 1); });
  if (S.pop) text(g, '+' + S.pop.n, S.pop.x, S.pop.y - (30 - S.pop.life) / 3, COLOURS[S.pop.c].main, { align: 'center', shadow: '#04041a' });
  // the top: time left, hearts, the streak
  const left = Math.max(0, 1 - S.t / TUNE.round);
  box(g, 4, 4, 104, 7, '#0b0c2e', '#d9dcf2');
  g.fillStyle = left < 0.15 ? '#ff7a4a' : '#f6c443'; g.fillRect(5, 5, Math.round(102 * left), 5);
  text(g, Math.ceil((TUNE.round - S.t) / 60) + 'S', 112, 4, '#fff8e6', { shadow: '#04041a' });
  for (let i = 0; i < TUNE.lives; i++) sprite(g, ART.heart, 300 - i * 8 + 10 - 5, 5, { '#': i < S.lives ? '#ff6fae' : '#3a2f6b' });
  text(g, String(S.score), 160, 4, '#fff8e6', { align: 'center', shadow: '#04041a' });
  if (S.streak > 0) {
    const c = COLOURS[S.colour];
    sprite(g, ART.star, 236, 4, { l: c.lite, m: c.main, d: c.dark });
    text(g, 'X' + S.streak, 246, 4, c.main, { shadow: '#04041a' });
  }
}

/** The bot: goes for the nearest star that keeps the streak (any star when none does), and steps away from meteors. */
function check({ createCore }) {
  const scores = [];
  for (let round = 0; round < 20; round++) {
    const { G, T } = createCore(def, { seed: 100 + round });
    T.step(10); T.press('ok'); T.step(1);
    while (G.state === 'play') {
      const B = TUNE.basket;
      let goal = S.x, bestV = -1e9;
      S.drops.forEach((d) => {
        if (d.c < 0) return;
        const eta = (B.y - d.y) / d.vy, reach = Math.abs(d.x - S.x) / B.speed;
        if (eta < 0 || reach > eta + 2) return;
        const v = (d.c === S.colour ? 40 : S.streak > 3 ? -30 : 10) - eta * 0.4;
        if (v > bestV) { bestV = v; goal = d.x; }
      });
      S.drops.forEach((d) => { if (d.c < 0 && B.y - d.y < 30 && B.y - d.y > -6 && Math.abs(d.x - goal) < B.w / 2 + 4) goal = d.x + (S.x >= d.x ? 1 : -1) * (B.w / 2 + 8); });
      T.hold('left', goal < S.x - 2); T.hold('right', goal > S.x + 2);
      T.step(1);
      if (G.lastError) return { ok: false, note: String(G.lastError.stack || G.lastError) };
    }
    scores.push(S.score);
  }
  const avg = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
  return { ok: avg > 300, note: 'bot, 20 rounds: average ' + avg + ', lowest ' + Math.min(...scores) + ', highest ' + Math.max(...scores) + ' (stamp at ' + TUNE.stamp + ')' };
}

const def = {
  id: 'star-catcher', n: 1, name: 'Star Catcher', district: 'PIXEL PLAZA', accent: '#f6c443', ink: '#0b0c2e',
  how: 'Catch the falling stars. Stars of one colour in a row are worth more and more. Keep away from the meteors: three of them end the round.',
  start, tick, draw, check,
  title: (g, G) => plaza(g, G.t)
};
export default def;
