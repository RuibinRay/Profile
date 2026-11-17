/*
 * games.js — Game City's registry: the five districts and the fifty games, one building each.
 *
 * Both the city on the games page (games.html) and the Game City page (city/index.html) read this file;
 * the buildings are drawn from it (assets/js/pixel/city-draw.js), so adding or renaming a game here changes
 * both. The plan behind the list is docs/GAME-CITY-PLAN.md.
 *
 *   status  'soon' — still being built: the building has scaffolding and its card says which phase
 *           'open' — built: the building is lit and its card opens city/games/<id>/
 *   type    the filter it falls under: puzzle, story, arcade, rhythm or strategy
 *   phase   the build phase (1–10) in which it is planned to open
 */
export const DISTRICTS = [
  { id: 'plaza', name: 'Pixel Plaza', from: 'The city centre', accent: '#f6c443', ink: '#0b0c2e',
    walls: ['#3a2f6b', '#4b3d86'], roof: '#26205a', window: '#ffe08a',
    say: 'The square in the middle of the city, under the planet. Short, friendly games to start with.' },
  { id: 'neon', name: 'Neon Ward', from: 'Shattered Worlds', accent: '#c86bff', ink: '#12072a',
    walls: ['#2a1450', '#3b1c72'], roof: '#1a0a2c', window: '#41e8d8',
    say: 'Violet streets stacked in three layers: the sky city, the surface and the dark below it.' },
  { id: 'moon', name: 'Moon Dock', from: 'MoonKeeper', accent: '#ff9d2e', ink: '#160c02',
    walls: ['#5d6072', '#7a7e92'], roof: '#3d4052', window: '#ffd38a',
    say: 'The landing pads and domes of a Moon base, where every machine eats power.' },
  { id: 'north', name: 'North Harbour', from: 'Blood of the North', accent: '#7fe8c0', ink: '#04140f',
    walls: ['#4a3322', '#5f4129'], roof: '#eef4ff', window: '#ffcf6b',
    say: 'Longhouses, snow and a cold harbour, under the northern lights.' },
  { id: 'neo', name: 'Skyline Center', from: 'Neo Earth 2226', accent: '#58e6ff', ink: '#021820',
    walls: ['#123246', '#1d4a62'], roof: '#0b2230', window: '#ffe08a',
    say: 'Glass towers, sky lanes and an orbital lift, in a city that keeps its own schedule.' }
];

const g = (n, id, name, district, type, genre, phase, blurb) => ({ n, id, name, district, type, genre, phase, blurb, status: 'soon' });

export const GAMES = [
  // Pixel Plaza
  g(1, 'star-catcher', 'Star Catcher', 'plaza', 'arcade', 'Arcade', 1, 'Catch falling stars in a basket, dodge the meteors, and build a combo from stars of one colour.'),
  g(2, 'planet-spin', 'Planet Spin', 'plaza', 'puzzle', 'Puzzle', 2, 'Turn the rings of a pixel planet until its strips of land join into whole continents.'),
  g(3, 'pixel-painter', 'Pixel Painter', 'plaza', 'puzzle', 'Logic', 3, 'Fill a grid from the number clues on its rows and columns to reveal a pixel picture.'),
  g(4, 'courier-cat', 'Courier Cat', 'plaza', 'story', 'Story', 5, 'A cat delivers letters round the plaza, and every reply changes who the next one is for.'),
  g(5, 'lantern-link', 'Lantern Link', 'plaza', 'puzzle', 'Puzzle', 4, 'Join lanterns of the same colour with paths that never cross and fill the whole board.'),
  g(6, 'mosaic-memory', 'Mosaic Memory', 'plaza', 'puzzle', 'Memory', 8, 'A pattern of tiles flashes and goes. Build it again from memory; each round adds a tile.'),
  g(7, 'rooftop-hop', 'Rooftop Hop', 'plaza', 'arcade', 'Arcade', 6, 'Hop from roof to roof with one button while the day turns into night.'),
  g(8, 'drip-drop', 'Drip Drop', 'plaza', 'puzzle', 'Puzzle', 9, 'Place a few deflectors so the falling drops fill every cup of the fountain.'),
  g(9, 'clocktower-bells', 'Clocktower Bells', 'plaza', 'rhythm', 'Rhythm', 7, 'Ring the right bell as the beat reaches it. Every hour the tune gets busier.'),
  g(10, 'the-torn-map', 'The Torn Map', 'plaza', 'story', 'Story · point and click', 10, 'Search three corners of the plaza and trade with the stall keepers for six pieces of a map.'),
  // Neon Ward
  g(11, 'circuit-rewire', 'Circuit Rewire', 'neon', 'puzzle', 'Puzzle', 1, 'Turn circuit tiles until every node is powered from the core and no wire is left loose.'),
  g(12, 'layer-shift', 'Layer Shift', 'neon', 'puzzle', 'Puzzle platformer', 9, 'Switch between three layers of the same room, each with its own walls, to reach the exit.'),
  g(13, 'neon-runner', 'Neon Runner', 'neon', 'arcade', 'Arcade', 3, 'Run the neon streets: jump, slide, and flip gravity to run along the ceiling.'),
  g(14, 'memory-shards', 'Memory Shards', 'neon', 'story', 'Story', 2, 'A courier with no memory finds shards of the past. Each choice decides who they were.'),
  g(15, 'firewall-slide', 'Firewall Slide', 'neon', 'puzzle', 'Puzzle', 6, 'Slide whole rows and columns of glyphs until they make the pattern on the lock.'),
  g(16, 'drone-swarm', 'Drone Swarm', 'neon', 'arcade', 'Arcade', 5, 'Hold off waves of drones from above, and choose one upgrade between waves.'),
  g(17, 'glitch-hunt', 'Glitch Hunt', 'neon', 'puzzle', 'Observation', 8, 'Two copies of the same street. Find the seven glitches that make them differ.'),
  g(18, 'signal-bounce', 'Signal Bounce', 'neon', 'puzzle', 'Puzzle', 4, 'Place and turn mirrors to bounce a beam of light into every receiver.'),
  g(19, 'deepline-sneak', 'Deepline Sneak', 'neon', 'puzzle', 'Stealth puzzle', 7, 'Each step you take, the guards take one. Stay out of their sight to reach the way out.'),
  g(20, 'skywire', 'Skywire', 'neon', 'story', 'Story · branching', 10, 'A message has to cross the sky city before dawn. Choose the route and talk your way through.'),
  // Moon Dock
  g(21, 'soft-landing', 'Soft Landing', 'moon', 'arcade', 'Arcade', 2, 'Thrust and turn to set a lander down on the pad before the fuel runs out.'),
  g(22, 'power-budget', 'Power Budget', 'moon', 'puzzle', 'Logic', 5, 'Wire panels and batteries to every module of the base with only so much cable.'),
  g(23, 'greenhouse-sols', 'Greenhouse Sols', 'moon', 'strategy', 'Simulation', 9, 'Ten Moon days: share water, light and power between the crops to make enough air and food.'),
  g(24, 'cargo-crawler', 'Cargo Crawler', 'moon', 'puzzle', 'Puzzle', 3, 'Push supply crates onto their pads; the airlock doors open only while a crate holds the switch.'),
  g(25, 'dome-guard', 'Dome Guard', 'moon', 'arcade', 'Arcade', 6, 'Burst the meteors before they reach the domes of the base.'),
  g(26, 'robot-steps', 'Robot Steps', 'moon', 'puzzle', 'Programming puzzle', 4, 'Write the helper robot a program — forward, turn, pick up, repeat — and watch it run.'),
  g(27, 'static-signals', 'Static Signals', 'moon', 'story', 'Story · puzzle', 7, 'Decode the rescue ship’s radio messages with a code wheel. Each one moves the story on.'),
  g(28, 'crater-rover', 'Crater Rover', 'moon', 'arcade', 'Arcade', 8, 'Drive a rover over crater hills in low gravity, and land on the wheels, not the roof.'),
  g(29, 'last-shift', 'Last Shift', 'moon', 'story', 'Story · survival', 1, 'Alone at the base for one night, the systems fail one by one. Decide what to keep running.'),
  g(30, 'star-lines', 'Star Lines', 'moon', 'puzzle', 'Puzzle', 10, 'Draw each constellation in one stroke without going over a line twice.'),
  // North Harbour
  g(31, 'rune-square', 'Rune Square', 'north', 'puzzle', 'Logic', 1, 'Place the runes so that each one appears once in every row, column and box.'),
  g(32, 'oar-beat', 'Oar Beat', 'north', 'rhythm', 'Rhythm', 5, 'Pull the oars on the drum beat and race another longship across the fjord.'),
  g(33, 'shield-line', 'Shield Line', 'north', 'strategy', 'Tactics', 7, 'Place shields on a small field to stop each volley of arrows before it reaches the hall.'),
  g(34, 'saga-hall', 'Saga Hall', 'north', 'story', 'Story · cards', 3, 'Tell a saga with a hero, a deed and a place. The hall reacts, and new sagas open up.'),
  g(35, 'ice-hole', 'Ice Hole', 'north', 'arcade', 'Arcade', 8, 'Fish through the ice: time the pull, keep the line tight, and leave the old boot.'),
  g(36, 'raven-post', 'Raven Post', 'north', 'arcade', 'Arcade', 6, 'Fly a raven through the gaps of the fjord and drop each message on the right roof.'),
  g(37, 'kings-table', 'King’s Table', 'north', 'strategy', 'Board game', 2, 'Tafl, the old Norse board game: bring the king to a corner, or trap him, against the computer.'),
  g(38, 'trade-winds', 'Trade Winds', 'north', 'strategy', 'Strategy', 9, 'Twenty days to sail between five islands, buying low and selling high, between storms.'),
  g(39, 'frozen-fjord', 'Frozen Fjord', 'north', 'puzzle', 'Puzzle', 4, 'On the ice you slide until you hit a rock. Find the way to the boat.'),
  g(40, 'valley-days', 'Valley Days', 'north', 'story', 'Story', 10, 'A short side-scrolling story of a childhood in a northern valley.'),
  // Skyline Center
  g(41, 'signal-junction', 'Signal Junction', 'neo', 'arcade', 'Arcade · puzzle', 1, 'Switch the lights so the aerocars cross the junction without a crash.'),
  g(42, 'metro-builder', 'Metro Builder', 'neo', 'puzzle', 'Puzzle', 2, 'Lay metro lines that link every station without going over the track budget.'),
  g(43, 'neo-cafe', 'Neo Café', 'neo', 'strategy', 'Time management', 6, 'Take the orders, make the drinks and serve them before the customers give up.'),
  g(44, 'lift-logic', 'Lift Logic', 'neo', 'puzzle', 'Puzzle', 7, 'Send the lifts to carry everyone to their floor with as few stops as you can.'),
  g(45, 'case-2226', 'Case 2226', 'neo', 'story', 'Story · mystery', 3, 'Question four suspects, keep the clues in your notebook, and name the one who did it.'),
  g(46, 'parcel-stack', 'Parcel Stack', 'neo', 'arcade', 'Arcade', 8, 'Drop parcels on a drone’s platform and stack them as high as they will go.'),
  g(47, 'sky-lanes', 'Sky Lanes', 'neo', 'arcade', 'Arcade', 4, 'Switch between the lanes of the sky, dodge the traffic and pick up energy.'),
  g(48, 'block-switch', 'Block Switch', 'neo', 'puzzle', 'Logic', 5, 'Switching a block of the city also switches its neighbours. Light up the whole grid.'),
  g(49, 'orbital-lift', 'Orbital Lift', 'neo', 'story', 'Story', 9, 'Ride the lift to orbit, with a small job and a conversation at each of six stops.'),
  g(50, 'a-day-in-neo-central', 'A Day in Neo Central', 'neo', 'story', 'Story · life', 10, 'One day, one schedule: work, eat, race and meet people before midnight. Opens with a stamp from every district.')
];

export const TYPES = [
  { id: 'all', name: 'All' }, { id: 'puzzle', name: 'Puzzle' }, { id: 'story', name: 'Story' },
  { id: 'arcade', name: 'Arcade' }, { id: 'rhythm', name: 'Rhythm' }, { id: 'strategy', name: 'Strategy' }
];

export const districtOf = (game) => DISTRICTS.find((d) => d.id === game.district);
