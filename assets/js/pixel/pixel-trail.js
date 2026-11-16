/*
 * pixel-trail.js — the mouse leaves pixels behind it in the pixel world.
 *
 * As the pointer moves, square pixels the size of the world's own pixels are shed along its path: they
 * snap to the grid, take the colour of the world on screen (with a few white and gold ones), drift down
 * a little and go out in three steps. A press throws a small ring of them outward. They are drawn on
 * a canvas over the page that takes no clicks; it only runs while there are pixels to draw.
 *
 *   createTrail({ accent })   accent: a function returning the current world's colour
 */
export function createTrail(o = {}) {
  const cv = document.createElement('canvas');
  cv.className = 'px-trail'; cv.setAttribute('aria-hidden', 'true');
  document.body.appendChild(cv);
  const g = cv.getContext('2d');
  let cell = 4, cols = 1, rows = 1;
  const bits = [];            // { x, y (in cells), vx, vy (cells a second), age, life, c }
  let raf = 0, last = 0, px = null, py = null, owed = 0;

  function resize() {
    const W = window.innerWidth, H = window.innerHeight;
    cell = Math.max(2, Math.ceil(Math.max(W / 340, H / 210)));        // the same pixel as the landscape behind
    cols = Math.ceil(W / cell); rows = Math.ceil(H / cell);
    cv.width = cols; cv.height = rows;
    cv.style.width = cols * cell + 'px'; cv.style.height = rows * cell + 'px';
  }
  const colour = () => { const r = Math.random(); return r < 0.6 ? (o.accent ? o.accent() : '#f6c443') : r < 0.82 ? '#fff8e6' : '#f6c443'; };
  function add(x, y, vx, vy, life) {
    if (bits.length > 260) bits.shift();
    bits.push({ x: x / cell, y: y / cell, vx, vy, age: 0, life, c: colour(), s: Math.random() < 0.28 ? 2 : 1 });      // a few are four pixels big
    if (!raf) { last = 0; raf = requestAnimationFrame(tick); }
  }
  function tick(now) {
    const dt = last ? Math.min(0.05, (now - last) / 1000) : 0.016; last = now;
    g.clearRect(0, 0, cols, rows);
    for (let i = bits.length - 1; i >= 0; i--) {
      const b = bits[i];
      b.age += dt;
      if (b.age >= b.life) { bits.splice(i, 1); continue; }
      b.x += b.vx * dt; b.y += b.vy * dt; b.vy += 26 * dt;               // they fall a little
      const k = b.age / b.life;
      g.globalAlpha = k < 0.4 ? 1 : k < 0.7 ? 0.62 : 0.3;                 // out in three steps, not a fade
      g.fillStyle = b.c;
      g.fillRect(Math.round(b.x), Math.round(b.y), b.s, b.s);
    }
    g.globalAlpha = 1;
    raf = bits.length ? requestAnimationFrame(tick) : 0;
  }

  window.addEventListener('pointermove', (e) => {
    if (e.pointerType === 'touch') return;                                // a finger is scrolling, not pointing
    if (px == null) { px = e.clientX; py = e.clientY; return; }
    const dx = e.clientX - px, dy = e.clientY - py, d = Math.hypot(dx, dy);
    // one pixel for about every 6 px travelled, laid along the path so a fast sweep leaves a line, not gaps
    owed += d / 6;
    const n = Math.min(8, Math.floor(owed)); owed -= n;
    for (let i = 0; i < n; i++) {
      const t = (i + 1) / n;
      add(px + dx * t + (Math.random() - 0.5) * cell * 3, py + dy * t + (Math.random() - 0.5) * cell * 3 + cell * 2,
        (Math.random() - 0.5) * 5 - dx * 0.02, 2 + Math.random() * 5, 0.45 + Math.random() * 0.4);
    }
    px = e.clientX; py = e.clientY;
  }, { passive: true });
  window.addEventListener('pointerdown', (e) => {
    for (let i = 0; i < 14; i++) { const a = (i / 14) * Math.PI * 2, s = 16 + Math.random() * 14; add(e.clientX, e.clientY, Math.cos(a) * s, Math.sin(a) * s - 6, 0.4 + Math.random() * 0.3); }
  }, { passive: true });
  window.addEventListener('pointerleave', () => { px = null; });
  window.addEventListener('resize', resize);
  resize();
  return { el: cv };
}
