/*
 * Last Shift — the story, as data. The runner is city/kit/story.js: its header explains the node shapes.
 *
 * Flags: cells (spare power cells on the rack), heat / green / comms (1 while the ring heaters, the greenhouse
 * and the relay dish are running), dock (1 once the tug is down), tired (times the keeper did a job by hand),
 * woke (1 once the crew are awake in the hub), vents (1 while the greenhouse is cleaning the air).
 * Words are written in ordinary case; the pixel font shows them in capitals.
 */
export const FLAGS = { cells: 4, heat: 1, green: 1, comms: 1, dock: 0, tired: 0, woke: 0, vents: 0 };
export const FIRST = 'intro1';
/* the clock on the wall, by the first letters of a node's id */
export const CLOCK = { intro: '22:00', e1: '22:40', e2: '00:10', e3: '01:30', e4: '03:00', e5: '04:30', end: '06:00' };
/* the lamp that blinks while a trouble is being decided */
export const TROUBLE = { e1: 'heat', e2: 'air', e3: 'comms', e4: 'bank', e5: 'dock' };

const NO = 'NO CELLS';
export const NODES = {
  intro1: { who: 'LAMP, THE BASE COMPUTER', text: 'Evening. Tern Dock runs on stored power until sunrise. Six crew are asleep in Ring B. The supply tug Calder lands at 06:00.', next: 'intro2' },
  intro2: { who: 'YOU', text: 'My first night shift alone. Four spare cells on the rack. Keep the air moving, keep the ring warm, bring the tug in.', next: 'intro3' },
  intro3: { who: 'MIRREN, AT THE RELAY', text: 'Relay to Tern Dock. I am on the far side of the crater if you need a voice. Quiet night to you.', next: 'e1' },

  e1: { who: 'LAMP', text: '22:40. A pebble from the sky has holed the radiator. Ring B is losing heat. The crew will wake cold within the hour.', choices: [
    { text: 'Run the backup heaters on a spare cell', if: 'cells>=1', need: NO, set: { cells: -1 }, next: 'e1cell' },
    { text: 'Shut the greenhouse lamps and heat the ring', set: { green: '=0' }, next: 'e1green' },
    { text: 'Wake the crew and move them to the hub', set: { woke: 1, heat: '=0' }, next: 'e1woke' }] },
  e1cell: { who: 'YOU', text: 'One cell clicks home. The heaters tick, and the ring holds at eighteen degrees. Three cells left on the rack.', next: 'e2' },
  e1green: { who: 'YOU', text: 'The lamps go dark over the seedlings. Warm air sighs back into Ring B. The plants can keep a few hours in the dark. Perhaps.', next: 'e2' },
  e1woke: { who: 'OSEI, OF THE CREW', text: 'Six people in blankets shuffle past you into the hub. "You did right to wake us," says Osei. "Mostly." They lie down on the floor.', next: 'e2' },

  e2: { who: 'LAMP', text: '00:10. The scrubber fan has seized. Carbon dioxide is climbing. I need another way to clean the air.', choices: [
    { text: 'Open the greenhouse vents to clean it', if: 'green>=1', need: 'LAMPS OFF', set: { vents: 1 }, next: 'e2green' },
    { text: 'Run the spare scrubber on a cell', if: 'cells>=1', need: NO, set: { cells: -1 }, next: 'e2cell' },
    { text: 'Strip the fan and free it by hand', set: { tired: 1 }, next: 'e2hand' }] },
  e2green: { who: 'YOU', text: 'The vents fold open and green air rolls down the corridors. It smells of tomato leaves. LAMP\'s numbers fall back into the blue.', next: 'e3' },
  e2cell: { who: 'YOU', text: 'The spare scrubber hums awake. Another cell gone from the rack.', next: 'e3' },
  e2hand: { who: 'YOU', text: 'Forty minutes on my knees with a wrench and a torch. The fan turns. My hands are shaking, and it is not yet one o\'clock.', next: 'e3' },

  e3: { who: 'MIRREN', text: '01:30. Tern Dock, you are breaking up. Your dish is drifting off me. If I lose you, nobody can talk the Calder down.', choices: [
    { text: 'Drive the dish motor with a cell', if: 'cells>=1', need: NO, set: { cells: -1 }, next: 'e3cell' },
    { text: 'Suit up and crank the dish by hand', set: { tired: 1 }, next: 'e3hand' },
    { text: 'Let the relay go, and save what I have', set: { comms: '=0' }, next: 'e3gone' }] },
  e3cell: { who: 'MIRREN', text: 'There you are, clear as a bell. Stay with me till morning.', next: 'e4' },
  e3hand: { who: 'YOU', text: 'Outside, the dust is silver and the Earth is a blue coin. Sixty turns of the crank. Mirren\'s voice comes back just as my arms give up.', next: 'e4' },
  e3gone: { who: 'YOU', text: 'The speaker hisses and goes still. It is very quiet in the control room now.', next: 'e4' },

  e4: { goto: [{ if: 'tired>=2', next: 'e4sleep' }, { next: 'e4bank' }] },
  e4sleep: { who: 'YOU', set: { heat: '=0', green: '=0', vents: '=0', woke: 1 }, text: '03:00. I sit down for one minute. When the alarm wakes me, cell bank C has burst its seals. It took the ring heaters and the greenhouse with it.', next: 'e4sleep2' },
  e4sleep2: { who: 'OSEI', text: 'LAMP has woken the crew. They come into the hub in blankets, see my face, and say nothing. Osei puts a hand on the spare scrubber and starts it herself.', next: 'e5' },
  e4bank: { who: 'LAMP', text: '03:00. Cell bank C is swelling. Vent it, or shed a load so it can cool.', choices: [
    { text: 'Vent bank C: it costs one spare cell', if: 'cells>=1', need: NO, set: { cells: -1 }, next: 'e4vent' },
    { text: 'Cut the greenhouse loose', if: 'green>=1', set: { green: '=0' }, next: 'e4green' },
    { text: 'Cut the relay dish loose', if: 'comms>=1', set: { comms: '=0' }, next: 'e4relay' },
    { text: 'Cut the ring heaters and wake the crew', if: 'heat>=1', set: { heat: '=0', woke: 1 }, next: 'e4heat' }] },
  e4vent: { who: 'YOU', text: 'The bank vents a long grey breath across the regolith. The needle drops back.', next: 'e5' },
  e4green: { goto: [{ if: 'vents>=1', next: 'e4green2' }, { next: 'e4green1' }] },
  e4green1: { who: 'YOU', text: 'The greenhouse goes dark and cold. Bank C settles. I do not look at the seedlings.', next: 'e5' },
  e4green2: { who: 'LAMP', set: { vents: '=0' }, text: 'Bank C settles. But the plants were cleaning our air, and carbon dioxide is climbing again.', choices: [
    { text: 'Run the spare scrubber on a cell', if: 'cells>=1', need: NO, set: { cells: -1 }, next: 'e2cell5' },
    { text: 'Strip the old fan and free it by hand', set: { tired: 1 }, next: 'e2hand5' }] },
  e2cell5: { who: 'YOU', text: 'The spare scrubber hums awake. Another cell gone from the rack.', next: 'e5' },
  e2hand5: { who: 'YOU', text: 'Half an hour with a wrench in the dark. The fan turns. I am too tired to be pleased about it.', next: 'e5' },
  e4relay: { who: 'YOU', text: 'The dish folds flat. Mirren is gone in the middle of a word. Bank C cools.', next: 'e5' },
  e4heat: { who: 'OSEI, OF THE CREW', text: 'The crew file into the hub wrapped in blankets. "Cold ring, warm hearts," Osei mutters. Bank C settles.', next: 'e5' },

  e5: { goto: [{ if: 'comms>=1', next: 'e5call' }, { next: 'e5blind' }] },
  e5call: { who: 'THE TUG CALDER', text: '04:30. Tern Dock, this is Calder, early and thin on fuel. I get one try at your pad. I need your dock lights.', choices: [
    { text: 'Light the dock with a spare cell', if: 'cells>=1', need: NO, set: { cells: -1, dock: 1 }, next: 'e5lit' },
    { text: 'Light it with the greenhouse\'s power', if: 'green>=1', set: { green: '=0', vents: '=0', dock: 1 }, next: 'e5lit' },
    { text: 'Talk the pilot down in the dark', next: 'e5talk' }] },
  e5lit: { who: 'THE TUG CALDER', text: 'I see you, Tern Dock. Prettiest lights on the Moon. Coming down.', next: 'e6' },
  e5talk: { goto: [{ if: 'tired>=1', next: 'e5miss' }, { next: 'e5talked' }] },
  e5talked: { who: 'MIRREN', set: { dock: 1 }, text: 'Between your eyes and my radar we read the pilot down metre by metre. Dust blooms on the pad. "Calder is down," she says. "Now breathe."', next: 'e6' },
  e5miss: { who: 'YOU', text: 'I read the numbers out, and my tired tongue swaps two of them. The Calder flares, drifts wide and climbs away for orbit. Two weeks before it can try again.', next: 'e6' },
  e5blind: { who: 'LAMP', text: '04:30. Something bright is crossing the sky, early. With no relay I cannot hail it. If it is the Calder, it will look for our dock lights.', choices: [
    { text: 'Light the dock with a spare cell', if: 'cells>=1', need: NO, set: { cells: -1, dock: 1 }, next: 'e5seen' },
    { text: 'Light it with the greenhouse\'s power', if: 'green>=1', set: { green: '=0', vents: '=0', dock: 1 }, next: 'e5seen' },
    { text: 'Keep the power. It may be nothing', next: 'e5dark' }] },
  e5seen: { who: 'YOU', text: 'The pad lights come up in a ring. The bright thing turns, slows, and settles on a column of dust. It was the Calder.', next: 'e6' },
  e5dark: { who: 'YOU', text: 'The light passes over and does not come back. At 05:00 LAMP finds its trail: the Calder, gone back up to orbit to wait.', next: 'e6' },

  e6: { goto: [{ if: 'dock>=1&heat>=1&green>=1&woke==0', next: 'endfull' }, { if: 'dock>=1&woke>=1', next: 'enddimwoke' }, { if: 'dock>=1', next: 'enddim' }, { next: 'endwait' }] },
  endfull: { end: 'full-board', good: true, title: 'FULL BOARD', text: '06:00. The sun clears the crater rim and every light on the board is green. The crew wake warm, to the smell of tomato leaves, and find the Calder already on the pad. "Quiet night?" asks Osei. "Quiet enough."' },
  enddim: { end: 'dim-morning', good: true, title: 'DIM MORNING', text: '06:00. Sunrise. The tug is down and everyone slept, but parts of the board stay dark. It will take a week to mend what the night cost. Osei reads the log and nods. "You chose. That is the job."' },
  enddimwoke: { end: 'dim-morning', good: true, title: 'DIM MORNING', text: '06:00. Sunrise finds six crew asleep on the hub floor and the Calder on the pad. Nobody slept well and nobody was lost. "Next time," says Osei, "wake us sooner. Or later. I cannot decide."' },
  endwait: { end: 'long-wait', good: false, title: 'THE LONG WAIT', text: '06:00. The sun comes up on an empty pad. Everyone is alive, and the supplies are in orbit for two more weeks. The crew start counting meal packs. I start the day shift\'s coffee and say nothing.' }
};
