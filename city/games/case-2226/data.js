/*
 * Case 2226 — the story, as data. The runner is city/kit/story.js: its header explains the node shapes.
 *
 * The night before the Orbital Lift opens, its guidance core leaves a sealed lab on floor 90. The inspector (the
 * player) searches the lab, questions four people as often as they like, and names one of them. What a person
 * says depends on what is already in the notebook, so going back to someone with a new clue opens new answers.
 *
 * Flags, each 0 or 1 — the nine clues, in the order the notebook lists them (CLUES below): log, bot, prints (the
 * lab), lost, flaw (Dr. Solvang), lift, saw (Sela Oduya), gala, offer (Castellan Dray).
 * Endings: three wrong names, and three ways of naming the right one — with the witness and the reason
 * (the-right-reason), with the witness only (the-right-name), or with nothing to show (the-lucky-guess).
 * Node ids begin with the place or person they belong to: lab, sol, od, dr, pip; the picture is chosen by that.
 * Words are in ordinary case; the pixel font shows them in capitals.
 */
export const FLAGS = { log: 0, bot: 0, prints: 0, lost: 0, flaw: 0, lift: 0, saw: 0, gala: 0, offer: 0 };
export const FIRST = 'intro1';
export const CLUES = [['log', 'DOOR: SOLVANG CARD, 02:10'], ['bot', 'CLEANER WIPED AT 02:05'], ['prints', 'SMALL BOOT PRINTS'], ['lost', 'CARD LOST TWO DAYS AGO'], ['flaw', 'FLAW REPORT: NO ACTION'],
  ['lift', 'ODUYA ON FLOOR 12 AT 02:10'], ['saw', 'SMALL FIGURE ON STAIRS'], ['gala', 'DRAY AT GALA TILL 03:02'], ['offer', 'DRAY\'S BRIBE REFUSED']];

const S = 'DR. SOLVANG', O = 'SELA ODUYA', D = 'CASTELLAN DRAY', P = 'PIP ARANDA', Y = 'YOU';
export const NODES = {
  intro1: { who: 'CASE 2226', text: 'Skyline Center, 05:40. The Orbital Lift opens at ten. Its guidance core, the only one there is, left a sealed lab on floor 90 during the night. Nobody saw it go.', next: 'intro2' },
  intro2: { who: Y, text: 'Four people had a reason to be near floor 90. I have a notebook, a tower pass, and until the ribbon is cut. One name goes in my report.', next: 'hub' },

  hub: { who: 'FLOOR 90', text: 'Where next?', choices: [
    { text: 'Search the core lab', if: 'log==0', next: 'lab1' },
    { text: 'Look over the lab again', if: 'log>=1', next: 'labx' },
    { text: 'Question someone', next: 'ask' },
    { text: 'Make the accusation', if: 'log>=1', need: 'SEARCH THE LAB FIRST', next: 'accuse' }] },
  ask: { who: 'FLOOR 90', text: 'Who?', choices: [
    { text: 'Dr. Solvang, the chief engineer', next: 'sol' },
    { text: 'Sela Oduya, the night guard', next: 'od' },
    { text: 'Castellan Dray, of Meridian Skyhook', next: 'dr' },
    { text: 'Pip Aranda, the maintenance apprentice', next: 'pip' },
    { text: 'Nobody yet', next: 'hub' }] },

  lab1: { who: Y, text: 'The lab is cold and tidy. The cradle where the core sat is empty, its clamps opened, not forced. Whoever came knew the release order.', next: 'lab2' },
  lab2: { who: Y, set: { log: 1 }, text: 'The door log has one entry in the night. 02:10, the key card of Dr. I. Solvang, chief engineer. Nothing after it until the alarm at 05:00.', next: 'lab3' },
  lab3: { who: Y, set: { bot: 1 }, text: 'The cleaning robot in the corner should have filmed everything. Its memory was wiped at 02:05, with a maintenance code.', next: 'lab4' },
  lab4: { who: Y, set: { prints: 1 }, text: 'And on the floor, a thin spill of coolant, dried, with two boot prints in it. Small feet. A work tread, not a dress shoe.', next: 'hub' },
  labx: { who: Y, text: 'Nothing new in the lab. An empty cradle, a wiped robot, two small boot prints.', next: 'hub' },

  sol: { goto: [{ if: 'log==0', next: 'sol0' }, { if: 'lost==0', next: 'sol1' }, { if: 'flaw==0', next: 'sol3' }, { next: 'solx' }] },
  sol0: { who: S, text: 'I have a launch in four hours and no core. Go and look at my lab before you look at me, Inspector.', next: 'hub' },
  sol1: { who: S, text: 'My card? I lost my card two days ago. I reported it at the front desk within the hour: go and read the report. I have signed in by hand ever since.', next: 'sol2' },
  sol2: { who: Y, set: { lost: 1 }, text: 'The desk confirms it. Reported lost on the 14th, never handed in. So somebody found a chief engineer\'s card, and kept it.', next: 'hub' },
  sol3: { who: S, text: 'A maintenance code? Then ask maintenance. Old Brandt is on leave. That leaves the apprentice, Aranda. Bright girl. She filed some report about the core last month. I had no time for it.', next: 'sol4' },
  sol4: { who: Y, set: { flaw: 1 }, text: 'I find the report in the engineering queue. "Hairline flaw in the core housing. Do not fly." Filed by P. Aranda. Stamped: NO ACTION.', next: 'hub' },
  solx: { who: S, text: 'I have told you everything I know. Find my core.', next: 'hub' },

  od: { goto: [{ if: 'log==0', next: 'od0' }, { if: 'lift==0', next: 'od1' }, { if: 'saw==0', next: 'od3' }, { next: 'odx' }] },
  od0: { who: O, text: 'Quiet night, Inspector. Well. Until it was not. Have you seen the lab yet?', next: 'hub' },
  od1: { who: O, text: 'Where was I at ten past two? On my rounds. ... All right. I was on floor 12, in the staff room, with my boots off. The lift log will show it.', next: 'od2' },
  od2: { who: Y, set: { lift: 1 }, text: 'It does. Her pass rode down to floor 12 at 01:50 and did not come up again until 02:40. Asleep on the job, but not on floor 90.', next: 'hub' },
  od3: { who: O, text: 'Small boot prints? ... Coming back up I took the stairs from 88, to look busy. Somebody passed me going down. Small. Maintenance overalls, hood up, a heavy bag. I thought nothing of it.', next: 'od4' },
  od4: { who: Y, set: { saw: 1 }, text: 'A small figure in overalls on the stairs, carrying something heavy, a little after half past two. She did not see a face.', next: 'hub' },
  odx: { who: O, text: 'That is all I saw. I will lose my job for the sleeping, won\'t I?', next: 'hub' },

  dr: { goto: [{ if: 'gala==0', next: 'dr1' }, { if: 'saw>=1&offer==0', next: 'dr3' }, { next: 'drx' }] },
  dr1: { who: D, text: 'Inspector. A terrible thing. Meridian Skyhook wishes its rival every success. I was at the opening gala until three: I believe I am in most of the photographs.', next: 'dr2' },
  dr2: { who: Y, set: { gala: 1 }, text: 'He is. The photo wall stamps every picture. Dray is smiling in forty-one of them, the last at 03:02, sixty floors below the lab.', next: 'hub' },
  dr3: { who: D, text: 'Overalls? ... Very well. Last week I offered one of the maintenance staff a sum for an hour alone with the core. The young one. She told me where to put my money. I respected that.', next: 'dr4' },
  dr4: { who: Y, set: { offer: 1 }, text: 'So Dray tried to buy his way in through the apprentice, and she turned him down. She did not want his money. What did she want?', next: 'hub' },
  drx: { who: D, text: 'If the core does turn up, Inspector, Meridian would still be glad of a look.', next: 'hub' },

  pip: { goto: [{ if: 'log==0', next: 'pip0' }, { if: 'flaw==0', next: 'pip1' }, { next: 'pip2' }] },
  pip0: { who: P, text: 'I only fix the cleaners, Inspector. I would start with the lab, if I were you.', next: 'hub' },
  pip1: { who: P, text: 'A maintenance code wiped it? Every cleaner in the tower takes the same code. Brandt has it. I have it. It is written inside the cupboard door. ... She does not look down at her boots.', next: 'hub' },
  pip2: { who: P, text: 'You read my report. Then you know more than the board does. Ask yourself what happens at ten o\'clock if that core flies, Inspector. Then ask me again where it is.', next: 'hub' },

  accuse: { who: Y, text: 'One name goes in the report.', choices: [
    { text: 'Dr. Solvang: it was her card', next: 'endsol' },
    { text: 'Sela Oduya: she left her post', next: 'endod' },
    { text: 'Castellan Dray: he wanted the core', next: 'enddr' },
    { text: 'Pip Aranda: the apprentice', next: 'acpip' },
    { text: 'Not yet', next: 'hub' }] },
  acpip: { goto: [{ if: 'flaw>=1&saw>=1', next: 'pipt' }, { if: 'saw>=1', next: 'piph' }, { next: 'pipg' }] },
  pipt: { who: P, text: 'It is in locker nine, wrapped in my coat. I found the card in a cleaner\'s dust bag. I was never going to sell it. I only needed ten o\'clock to come and go.', next: 'endt' },
  piph: { who: P, text: 'A figure on the stairs. Small boots. Yes. It is in locker nine. You have not asked me why, Inspector. Nobody ever does.', next: 'endh' },
  pipg: { who: P, text: 'Me? On what evidence, Inspector? ... She is right. I have nothing that would stand.', next: 'endg' },

  endt: { end: 'the-right-reason', good: true, title: 'CASE CLOSED', text: 'You take the core and her report to the board together. The launch moves by a month and the housing is recast. Aranda keeps her job, and gets Brandt\'s when he retires.' },
  endh: { end: 'the-right-name', title: 'CASE CLOSED, MORE OR LESS', text: 'The core is back in its cradle by eight and flies at ten. At forty kilometres the housing cracks and the lift stops dead. Nobody is hurt. Her report is found the next day.' },
  endg: { end: 'the-lucky-guess', title: 'NO CASE', text: 'She is released by noon. The core stays wherever it is, the lift stays on the ground, and the file stays open on your desk. You had the right name and nothing else.' },
  endsol: { end: 'wrong-engineer', title: 'THE WRONG NAME', text: 'Her card, her lab, her arrest. A week later the lost-card report turns up, and so does a very good lawyer. The core never does. You are moved to traffic duty.' },
  endod: { end: 'wrong-guard', title: 'THE WRONG NAME', text: 'A sleeping guard makes an easy culprit. The lift log clears her within the day. By then the trail on floor 90 is cold, and so is your career.' },
  enddr: { end: 'wrong-rival', title: 'THE WRONG NAME', text: 'Meridian\'s lawyers arrive before your report is dry, with forty-one photographs. The apology is public. The core is never found.' }
};
