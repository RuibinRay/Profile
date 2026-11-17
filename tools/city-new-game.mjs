/*
 * city-new-game.mjs — writes the page of a Game City game: city/games/<id>/index.html, from the registry.
 *
 *   node tools/city-new-game.mjs star-catcher "<b>Arrows</b> or the mouse move the basket."
 *
 * The page is the same for every game except its name, number, colours and the line of controls under the
 * canvas. It never touches game.js or data.js, and it will not overwrite a page unless --force is given.
 */
import { writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { GAMES, districtOf } from '../city/data/games.js';

const [id, keys = '', flag] = process.argv.slice(2);
const gm = GAMES.find((x) => x.id === id);
if (!gm) { console.error('No game with the id "' + id + '" in city/data/games.js'); process.exit(1); }
const d = districtOf(gm), dir = new URL('../city/games/' + id + '/', import.meta.url), file = new URL('index.html', dir);
if (existsSync(file) && flag !== '--force') { console.error(file.pathname + ' exists; add --force to write it again'); process.exit(1); }
const esc = (s) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;');
const html = `<!doctype html>
<html lang="en" class="no-js">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <title>${gm.name} — Game City No. ${gm.n}</title>
  <meta name="description" content="${esc(gm.name + ': ' + gm.blurb)} A small game in Ruibin (Ray) Jin Yao's Game City.">
  <meta name="author" content="Ruibin Jin Yao">
  <meta name="theme-color" content="#0b0c2e">
  <meta name="color-scheme" content="dark">
  <link rel="canonical" href="https://ruibinray.github.io/Profile/city/games/${gm.id}/">
  <meta property="og:type" content="website">
  <meta property="og:title" content="${esc(gm.name)} — Game City">
  <meta property="og:description" content="${esc(gm.blurb)}">
  <link rel="icon" href="../../../assets/img/favicon.svg" type="image/svg+xml">
  <link rel="icon" href="../../../assets/img/favicon-32.png" sizes="32x32" type="image/png">
  <link rel="stylesheet" href="../../../assets/css/games.css?v=20261117b">
  <link rel="stylesheet" href="../../kit/ui.css?v=20261117a">
  <style>:root { --accent: ${d.accent}; --accent-ink: ${d.ink}; }</style>
  <!-- Arrived through the towers from the city: start covered, so nothing flashes before they sink -->
  <script>try { if (sessionStorage.getItem('px-city')) document.documentElement.classList.add('is-arriving'); } catch (e) {}</script>
</head>
<body class="game">
  <header class="hud">
    <a class="hud__back" href="../../#game-${gm.n}" data-back><span aria-hidden="true">&lt;</span> Game City</a>
    <h1 class="hud__name">${gm.name}</h1>
    <div class="hud__tools">
      <p class="hud__stat" id="stat" aria-live="off" hidden></p>
      <button class="hud__btn" id="mute" type="button" aria-pressed="true">Sound on</button>
      <button class="hud__btn" id="pause" type="button">Pause</button>
    </div>
  </header>
  <main class="stage">
    <canvas id="game" width="320" height="180" role="img" aria-label="${esc(gm.name + ', ' + gm.genre.toLowerCase() + '. ' + gm.blurb)}"></canvas>
    <p class="keys">${keys}</p>
    <noscript><p class="lead game-nojs">${gm.name} is drawn and played with JavaScript. Turn it on to play.</p></noscript>
  </main>
  <script type="module">
    import { boot } from '../../kit/shell.js?v=20261117a';
    import def from './game.js?v=20261117a';
    boot(def);
  </script>
</body>
</html>
`;
mkdirSync(dir, { recursive: true });
writeFileSync(file, html);
console.log('wrote city/games/' + id + '/index.html');
