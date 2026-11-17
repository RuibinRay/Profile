/*
 * city-check.mjs — runs every open Game City game without a browser and reports.
 *
 *   node tools/city-check.mjs            every game whose folder exists
 *   node tools/city-check.mjs rune-square star-catcher
 *
 * For each game it: imports city/games/<id>/game.js; plays title → play → pause → play for a few seconds with
 * random input on a canvas that draws nothing, and fails on any error caught into G.lastError; then runs the
 * game's own check() — a solver over every level for puzzles, a branch walker for stories, a bot for arcade
 * games. It also runs any extra script in tools/city-checks/<id>.mjs. Nothing is saved: tests use memory only.
 * Exits with 1 if anything failed.
 */
import { existsSync, readdirSync, statSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { createCore } from '../city/kit/shell.js';
import { GAMES } from '../city/data/games.js';

const root = new URL('../city/games/', import.meta.url);
const want = process.argv.slice(2);
const ids = (want.length ? want : GAMES.map((g) => g.id)).filter((id) => existsSync(new URL(id + '/game.js', root)));
let failed = 0;
const size = (dir) => readdirSync(dir).reduce((n, f) => { const s = statSync(new URL(f, dir)); return n + (s.isFile() ? s.size : 0); }, 0);

for (const id of ids) {
  const gm = GAMES.find((g) => g.id === id), out = [];
  let ok = true;
  try {
    const def = (await import(new URL(id + '/game.js', root))).default;
    if (def.id !== id || def.n !== gm.n) { ok = false; out.push('id or number differs from the registry'); }
    // smoke: random presses and taps for 40 seconds of game time
    const { G, T } = createCore(def, { seed: 42 });
    const names = ['left', 'right', 'up', 'down', 'ok', 'undo', 'reset', 'note', 'levels', 'd1', 'd2', 'd3', 'd4', 'pause', 'ok', 'ok'];
    let r = 12345;
    const rand = () => ((r = (r * 1103515245 + 12345) >>> 0) / 4294967296);
    for (let i = 0; i < 2400 && !G.lastError; i++) {
      if (i % 7 === 0) T.press(names[Math.floor(rand() * names.length)]);
      if (i % 11 === 0) T.tap(rand() * 320, rand() * 180);
      T.hold('left', rand() < 0.3); T.hold('right', rand() < 0.3);
      T.step(1);
    }
    if (G.lastError) { ok = false; out.push('error while playing: ' + (G.lastError.stack || G.lastError)); }
    else out.push('smoke run clean');
    if (def.check) { const res = await def.check({ createCore }); if (!res.ok) ok = false; out.push(res.note); }
    else out.push('no check() of its own');
    const extra = new URL('./city-checks/' + id + '.mjs', import.meta.url);
    if (existsSync(extra)) { const p = spawnSync(process.execPath, [fileURLToPath(extra)], { encoding: 'utf8' }); if (p.status) ok = false; out.push('city-checks/' + id + '.mjs: ' + (p.status ? 'FAILED\n' + p.stdout + p.stderr : 'passed')); }
    const kb = size(new URL(id + '/', root)) / 1024;
    if (kb > 150) { ok = false; out.push('folder is ' + kb.toFixed(0) + ' KB, over the 150 KB limit'); } else out.push(kb.toFixed(0) + ' KB');
    if ((gm.status === 'open') !== true) out.push('note: still "soon" in the registry');
  } catch (e) { ok = false; out.push('could not run: ' + (e.stack || e)); }
  if (!ok) failed++;
  console.log((ok ? 'PASS ' : 'FAIL ') + 'No. ' + String(gm.n).padStart(2) + ' ' + id + '\n     ' + out.join('\n     '));
}
console.log('\n' + ids.length + ' games checked, ' + failed + ' failed.');
process.exit(failed ? 1 : 0);
