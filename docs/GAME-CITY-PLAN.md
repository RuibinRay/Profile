# Game City — plan for 50 mini games

A city of 50 small 2D browser games, reached from the Pixel World page of the portfolio
(`PersonalWeb/Profile/games.html`). Game City is **its own page**, not a section of Pixel World:
Pixel World only gets a gate that leads to it, and every game is **its own page** linked from the city.

Status: **Phase 1 is built** — the shared kit (`city/kit/`), the test tool (`tools/city-check.mjs`), the City Pass, and
the first five games: 1 Star Catcher, 11 Circuit Rewire, 29 Last Shift, 31 Rune Square, 41 Signal Junction. Phase 2 has
begun with 2 Planet Spin. The other 44 buildings still stand in scaffolding. Nothing is published until you say so.
Open questions are at the end.

---

## 1. Rules taken from the Game Workflow Notebook

These come from your notebook and apply to all 50 games.

| Rule | What it means here |
|---|---|
| Pick the target first | Every game below has a genre, a core loop and a **first playable slice** written down before code. |
| Smallest stack | Plain JavaScript + Canvas 2D, no build step, no libraries. Opens as static files on GitHub Pages. |
| Fixed internal resolution | Every game canvas is **320 × 180** true pixels, scaled up without smoothing — the same scale as the Pixel World sky. Never changed later. |
| One mechanic, done well | Mini games: rounds of 30 s – 3 min, restart in under a second, best score saved, a clear reason for every loss. |
| Puzzle feel | Unlimited undo, instant reset, moves animated in under 150 ms, levels stored as strings. |
| Story feel | Text types out but finishes on one press, auto-save before choices, a clear current goal, dialogue as data with a flag store. |
| Content is data | Levels, dialogue, waves and tuning numbers live in a `data.js` per game, never inside the code. |
| Engine rules | One root object, fixed 60 ticks a second, state stack (title / play / pause / dialogue), versioned saves, errors caught into `G.lastError`. |
| Art without an artist | All art drawn by code from small string templates, one palette per district, 1 px outline. No downloaded images. |
| Sound | Synthesised in Web Audio; one mute switch shared by the whole city. |
| Originality | Genres and control layouts are borrowed, never names, characters, art or music of existing games. Every title below is original. |
| Test without a human | Each game exposes the harness (`G.manual`, `T.step`, `T.press`, `T.paint`). Puzzles get a **solver run on every level**, stories a **branch walker**, arcade games a **bot that plays a round**. |
| Publish on your word | Nothing is pushed to GitHub Pages until you say so. |

---

## 2. How it connects to the Pixel World

```
games.html (Pixel World)
  World 1 Shattered Worlds
  World 2 MoonKeeper
  World 3 Blood of the North
  World 4 Neo Earth 2226
  ► NEW gate screen: "Game City · 50 mini games"  ── Enter ──►  city/index.html (Game City hub)
  The end (+ a "Game City" button)                                  │
                                                                    ├─► city/games/star-catcher/
                                                                    ├─► city/games/circuit-rewire/
                                                                    └─► … 50 game pages, each with "< Game City"
```

Changes to the Pixel World page (built):

- One new screen between World 4 and the end: `data-world="game-city"`, with its own pixel night-city scene
  (`city` in `scenes.js`), the title in the pixel font, an **Enter Game City** button and a **clickable city**:
  a window onto the street of all 50 buildings that pans by itself. Hovering a building names it; clicking it
  goes into the city and opens at that building's card (`city/#game-N`).
- A fifth dot in the top bar, and a **Game City** button on the end screen.
- The way in is its own transition (`assets/js/pixel/city-wipe.js`): the city zooms toward the point clicked while
  a skyline of big pixel towers in the five districts' colours rises from the street and lights its windows, until it
  covers the screen; the city page then opens as the towers sink. Going back to Pixel World works the same way.

---

## 3. The Game City hub (`city/index.html`)

**Look.** A side-view pixel street drawn in code, in the same style as the Pixel World landscapes: parallax
skyline, twinkling windows, the same little traveller walking along the bottom. The street runs through
**five districts**, one per world of your portfolio plus a central plaza, each in that world's accent colour.

**Buildings are games.** 50 buildings, one per game. A finished game is a lit building with a sign;
a game not built yet is scaffolding with a crane and a "Coming soon" board — so the city visibly grows
as games are added.

**Controls.** Scroll or drag to move along the street; arrows walk the traveller; Enter or a click on a
door opens the game through the pixel wipe. A **list view** button shows all 50 as plain cards
(also the no-JavaScript fallback and the accessible version), with filters: Puzzle · Story · Arcade · Rhythm · Strategy.

**City Pass.** Finishing a game (solving its last level, reaching an ending, or beating a target score)
stamps it in a City Pass saved in the browser. The hub shows the stamps; game 50 opens with stamps
from every district.

---

## 4. File layout

Location (decided): inside the portfolio repo, so the city shares the Pixel World's font, pixel kit,
transitions and cursors, and deploys with the site. Built so far: `city/index.html`, `city.css`, `city.js`,
`city/data/games.js`, `assets/js/pixel/city-draw.js`, `assets/js/pixel/city-wipe.js`.
Phase 1 added `city/kit/` (shell, draw, sfx, puzzle, story, ui.css), `tools/city-check.mjs`, `tools/city-new-game.mjs`
(writes a game's page from the registry) and the level makers `tools/city-make-circuit.mjs` and `tools/city-make-runes.mjs`.
A puzzle keeps its rules in a `logic.js` beside `game.js`, so the solver and the level maker share them with the game.

```
PersonalWeb/Profile/
  games.html                       (+ gate screen, dot, end button)
  assets/js/pixel/scenes.js        (+ one "game-city" scene)
  city/
    index.html                     the hub
    city.css  city.js              street, buildings, list view, City Pass
    data/games.js                  the registry: 50 entries { n, id, name, district, genre, blurb, status }
    kit/
      shell.js                     shared game shell: 320×180 canvas, fixed tick, input (keys / pointer / touch),
                                   state stack, pause, versioned save, best score, harness hooks
      ui.css                       HUD, buttons, dialogs — hard edges, 2 px borders, stepped shadows
      sfx.js                       Web Audio sounds + city-wide mute
      draw.js                      pixel helpers: sprites from strings, palette, pixel text (reuses pixel-kit.js)
      puzzle.js                    level strings, undo stack, reset, level select, solver hook
      story.js                     dialogue runner { id, speaker, text, next | choices, if, set }, flag store,
                                   auto-save before choices
    games/
      <id>/index.html  game.js  data.js      one folder per game, ~50–150 KB each
  tools/
    city-harness.js                drives any game: manual ticks, inputs, paint, errors
    city-check.mjs                 runs every game's solver / branch walker / bot and reports
```

Each `game.js` opens with the notebook's header comment: what it does, what it leaves alone, how to turn
its effects off.

---

## 5. The five districts and 50 games

Genre mix: **20 puzzle and logic · 11 story · 11 arcade · 2 rhythm · 6 strategy and sim**. All 2D.

### District A — Pixel Plaza (city centre · gold `#f6c443` · the planet and the stars)
Warm-up games: short, simple, good first impressions.

| # | Game | Genre | Core loop | First playable slice |
|---|---|---|---|---|
| 1 | **Star Catcher** | Arcade | Slide a basket along the street, catch falling stars, dodge meteors; same-colour streaks build a combo | 90 s round, 3 star colours, combo meter, best score |
| 2 | **Planet Spin** | Puzzle | Rotate the rings of a pixel planet until its land strips line up into whole continents | 15 levels, 2–4 rings, undo, solver |
| 3 | **Pixel Painter** | Logic | Fill a grid from row and column number clues to reveal a pixel picture (picture-logic) | 12 pictures from 5×5 to 15×15, mistakes allowed, solver |
| 4 | **Courier Cat** | Story | A cat delivers letters around the plaza; each neighbour's reply changes who the next letter is for | 6 deliveries, one small mystery, 2 endings |
| 5 | **Lantern Link** | Puzzle | Draw paths joining lanterns of the same colour; paths may not cross and must fill the board | 20 boards 5×5 – 9×9, solver |
| 6 | **Mosaic Memory** | Memory | A tile pattern flashes; rebuild it from memory; each round adds tiles | Endless rounds, 3 lives, best round |
| 7 | **Rooftop Hop** | Arcade | The traveller hops roof to roof — one button, hold longer to jump further — as day turns to night | Endless run, 3 roof types, best distance, bot |
| 8 | **Drip Drop** | Puzzle | Place a few deflectors so falling water drops fill every fountain cup | 15 levels, limited pieces, solver |
| 9 | **Clocktower Bells** | Rhythm | Ring the right bell when the beat reaches it; patterns get denser each hour | 3 songs (synthesised), Easy / Hard, accuracy grade |
| 10 | **The Torn Map** | Story · point-and-click | Search three plaza scenes and trade with stall keepers for six torn map pieces | 3 scenes, 6 pieces, inventory, 1 ending |

### District B — Neon Ward (Shattered Worlds · violet `#c86bff` · cyberpunk, three layers: sky, surface, underground)

| # | Game | Genre | Core loop | First playable slice |
|---|---|---|---|---|
| 11 | **Circuit Rewire** | Puzzle | Rotate circuit tiles until every node is powered from the core with no loose wires | 20 levels, timer-free, solver |
| 12 | **Layer Shift** | Puzzle-platformer | Switch between three layers of the same room; walls differ per layer; reach the exit | 10 rooms, coyote time and jump buffer, replay test |
| 13 | **Neon Runner** | Arcade | Side runner through neon streets: jump, slide, and flip gravity onto the ceiling | Endless, speed-up curve, best distance, bot |
| 14 | **Memory Shards** | Story | A courier with no memory finds shards; each is a short scene with one choice; choices decide who they were | 7 shards, 3 endings, auto-save |
| 15 | **Firewall Slide** | Puzzle | Slide whole rows and columns of a grid to line up matching glyphs into the target pattern | 15 levels 3×3 – 5×5, move counter, solver |
| 16 | **Drone Swarm** | Arcade | Top-down: move and auto-fire against waves of drones, pick one upgrade between waves | 8 waves, 6 upgrades, bot |
| 17 | **Glitch Hunt** | Observation | Two copies of a pixel street — find the 7 glitches that differ | 10 scenes, hint button, timer bonus |
| 18 | **Signal Bounce** | Puzzle | Place and turn mirrors to bounce a light beam into every receiver | 20 levels, colour filters from level 10, solver |
| 19 | **Deepline Sneak** | Stealth puzzle | Turn-based: each step you take, the guards take one; stay out of their sight cones | 15 levels, undo, solver |
| 20 | **Skywire** | Story · branching | A message must cross the sky city before dawn; pick routes and talk your way past checkpoints | 3 routes, 4 endings, branch walker |

### District C — Moon Dock (MoonKeeper · orange `#ff9d2e` · a Moon base, power and air)

| # | Game | Genre | Core loop | First playable slice |
|---|---|---|---|---|
| 21 | **Soft Landing** | Arcade | Thrust and turn a lander onto a pad before the fuel runs out | 10 pads, wind from pad 5, fuel score |
| 22 | **Power Budget** | Logic | Wire solar panels and batteries to modules; every module needs power but cables are limited | 15 levels, solver |
| 23 | **Greenhouse Sols** | Sim | Ten Moon days: share water, light and power between crops to make enough air and food | 10-day run, 4 crops, events, 3 result grades |
| 24 | **Cargo Crawler** | Puzzle (box-pushing) | Push supply crates onto pads; airlock doors open only when a crate sits on their switch | 20 levels, undo, solver |
| 25 | **Dome Guard** | Arcade | Tap to burst incoming meteors before they hit the domes | 10 waves, 3 domes, best score |
| 26 | **Robot Steps** | Programming puzzle | Write the helper robot's program — forward, turn, pick up, repeat — then run it to reach every goal | 20 levels, loops from level 8, shortest-program stars |
| 27 | **Static Signals** | Puzzle · story | Decode radio messages from the rescue ship with a code wheel; each decoded message moves the story on | 8 messages, 1 ending |
| 28 | **Crater Rover** | Arcade (physics) | Drive a rover over crater hills in low gravity; land on the wheels, not the roof | 3 tracks, fuel pickups, best distance |
| 29 | **Last Shift** | Story · survival | Alone at the base for one night: systems fail one by one; decide what to save with the power you have | One night (~10 min), 3 endings, auto-save |
| 30 | **Star Lines** | Puzzle | Draw each constellation in one stroke without going over a line twice | 20 constellations, solver |

### District D — North Harbour (Blood of the North · mint `#7fe8c0` · Vikings, snow and sea)

| # | Game | Genre | Core loop | First playable slice |
|---|---|---|---|---|
| 31 | **Rune Square** | Logic | Place runes so each appears once in every row, column and box | 12 grids 4×4 – 6×6, notes, solver |
| 32 | **Oar Beat** | Rhythm | Pull the oars on the drum beat to race another longship | 3 races, crew stamina, Easy / Hard |
| 33 | **Shield Line** | Tactics | Turn-based: place shields on a small grid to stop arrow volleys before they reach the hall | 10 battles, 3 shield types, solver for each |
| 34 | **Saga Hall** | Story · cards | Tell a saga by playing a hero, a deed and a place; the hall reacts; new combinations unlock new sagas | 8 sagas to unlock, saved collection |
| 35 | **Ice Hole** | Arcade | Fish through the ice: time the pull, keep tension in the line, avoid the old boot | 2 min round, 8 fish, best catch |
| 36 | **Raven Post** | Arcade | Fly a raven through fjord gaps and drop messages on the right roofs; wind gusts | Endless, deliveries for points, bot |
| 37 | **King's Table** | Board game | Tafl, the historical Norse board game: escort the king to a corner, or capture him, against the computer | 9×9 board, 3 AI levels |
| 38 | **Trade Winds** | Strategy | Sail between five islands for 20 days, buying low and selling high; storms and raiders | 20-day run, 6 goods, best gold |
| 39 | **Frozen Fjord** | Puzzle | Slide on ice — you only stop when you hit a rock — and reach the boat | 20 levels, undo, solver |
| 40 | **Valley Days** | Story | A short side-scrolling story of a childhood in a northern valley | 5 short scenes, 1 ending — *needs your decision, see questions* |

### District E — Skyline Center (Neo Earth 2226 · cyan `#58e6ff` · a future city)

| # | Game | Genre | Core loop | First playable slice |
|---|---|---|---|---|
| 41 | **Signal Junction** | Arcade · puzzle | Tap traffic lights so aerocars cross the junction without crashing | 10 junctions, rush hour, best flow |
| 42 | **Metro Builder** | Puzzle | Lay metro lines so every station is linked within the track budget | 15 maps, solver |
| 43 | **Neo Café** | Time management | Take orders, make drinks, serve before customers lose patience | 5-day shift, upgrades, best tips |
| 44 | **Lift Logic** | Puzzle | Send lifts to carry passengers to their floors with the fewest stops | 12 buildings, move score, solver |
| 45 | **Case 2226** | Story · mystery | Question four suspects, gather clues in a notebook, accuse the right one | 1 case, 4 suspects, wrong-accusation endings, branch walker |
| 46 | **Parcel Stack** | Arcade (physics) | Drop parcels onto a drone platform and stack them high without toppling | Endless, wind, best height |
| 47 | **Sky Lanes** | Arcade | Switch between sky lanes, dodge traffic, collect energy | Endless, speed-up, best distance, bot |
| 48 | **Block Switch** | Logic | Toggling a city block also toggles its neighbours; light the whole grid | 20 grids, solver |
| 49 | **Orbital Lift** | Story | Ride the lift to orbit; a small task and a conversation at each of six stops | 6 stops, 2 endings |
| 50 | **A Day in Neo Central** | Story · life sim | One day, one schedule: work, eat, race, meet people — reach your goals before midnight | 3 goals, 5 endings — **opens with stamps from every district** |

---

## 6. What every game page has

- Top bar: **< Game City** (pixel wipe back), the game's name in the pixel font, best score or progress, mute, pause.
- Title screen with a one-line how-to; **Play**; level select for puzzles; **Continue** for stories.
- Keyboard, mouse and touch. Gamepad where it fits (arcade games).
- `prefers-reduced-motion`: no screen shake, slower effects.
- Saves under one key per game (`city:<id>`, versioned); the City Pass under `city:pass`.

---

## 7. Build order

Each step ends with something you can open and play.

| Phase | What | Done when |
|---|---|---|
| 0 | **Foundation**: `kit/` (shell, ui, sfx, draw, puzzle, story), the registry of 50 games, the hub with all 50 buildings as scaffolding, the Pixel World gate | You can walk the city from Pixel World and every building says "Coming soon" |
| 1 | **Vertical slice — 5 games, one per district and one per kit**: 1 Star Catcher (arcade), 11 Circuit Rewire (puzzle), 29 Last Shift (story), 31 Rune Square (logic), 41 Signal Junction (arcade-puzzle) | Five lit buildings, City Pass stamps work, harness checks pass |
| 2 | 2 Planet Spin · 14 Memory Shards · 21 Soft Landing · 37 King's Table · 42 Metro Builder | |
| 3 | 3 Pixel Painter · 13 Neon Runner · 24 Cargo Crawler · 34 Saga Hall · 45 Case 2226 | |
| 4 | 5 Lantern Link · 18 Signal Bounce · 26 Robot Steps · 39 Frozen Fjord · 47 Sky Lanes | |
| 5 | 4 Courier Cat · 16 Drone Swarm · 22 Power Budget · 32 Oar Beat · 48 Block Switch | |
| 6 | 7 Rooftop Hop · 15 Firewall Slide · 25 Dome Guard · 36 Raven Post · 43 Neo Café | |
| 7 | 9 Clocktower Bells · 19 Deepline Sneak · 27 Static Signals · 33 Shield Line · 44 Lift Logic | |
| 8 | 6 Mosaic Memory · 17 Glitch Hunt · 28 Crater Rover · 35 Ice Hole · 46 Parcel Stack | |
| 9 | 8 Drip Drop · 12 Layer Shift · 23 Greenhouse Sols · 38 Trade Winds · 49 Orbital Lift | |
| 10 | 10 The Torn Map · 20 Skywire · 30 Star Lines · 40 Valley Days · 50 A Day in Neo Central (capstone) | All 50 lit; full city check passes |

Every phase mixes districts and genres so the city grows evenly. After each phase: run `city-check.mjs`
(solvers, branch walkers, bots, errors), screenshot each new game, update the README, and publish only when you say so.

---

## 8. Testing

| Check | How |
|---|---|
| Errors | Open every game, run title → play → pause → restart in the harness; collect `G.lastError` |
| Puzzles solvable | The solver solves every level in `data.js` before it ships |
| Stories complete | The branch walker visits every choice; no branch leaves you stuck; every ending reachable |
| Arcade balance | A simple bot plays 20 rounds; average score is written to the README and compared after changes |
| Saves | Save, reload, compare; old save versions load through a migration |
| Looks | Screenshot each game at desktop and phone width |
| Size | Each game folder under 150 KB; the whole city under 8 MB |

Tests never clear your browser storage: saving is stubbed while a test runs.

---

## 9. Questions for you

1. ~~Where the city lives~~ — decided: inside the portfolio, `city/`.
2. **Your characters.** (Until you answer, story games use new characters: Last Shift has its own keeper, crew and base.)
    May story games use your own characters — REGO from MoonKeeper, the Shattered Worlds heroes,
   Eirik from *The Rise of the Raven King* (Valley Days, #40) — or should every story game have new characters?
3. **The list.** Swap or drop any of the 50 before Phase 1 starts.
4. **Languages.** English only first (translations last, as the notebook says), or any of your other languages from the start?
