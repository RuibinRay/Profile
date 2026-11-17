/*
 * Memory Shards — the story, as data. The runner is city/kit/story.js: its header explains the node shapes.
 *
 * A courier wakes at the bottom of the Neon Ward with a sealed case and no memory, and walks the last route again,
 * from the Drains up to the Sky Garden. Each of seven places shakes loose a shard of the cracked recall pane: a
 * short scene with one choice. What the player chooses is what the courier did, so the choices decide who they were.
 *
 * Flags: n (shards found); oath, take, spark (how many shards showed the carrier who keeps their word, the shade
 * who looks after themself, the spark who breaks a rule for other people); s1 … s7 (which of the three each shard
 * showed: 1 oath, 2 take, 3 spark — only the picture uses these, to colour the shards).
 * Node ids: f<k> finding shard k, m<k> the memory and its choice, r<k>a/b/c what followed. PLACE names the
 * backdrop of each stop. Words are in ordinary case; the pixel font shows them in capitals.
 */
export const FLAGS = { n: 0, oath: 0, take: 0, spark: 0, s1: 0, s2: 0, s3: 0, s4: 0, s5: 0, s6: 0, s7: 0 };
export const FIRST = 'intro1';
export const PLACE = { 0: 'under', 1: 'under', 2: 'under', 3: 'street', 4: 'street', 5: 'street', 6: 'sky', 7: 'sky', 8: 'sky' };
export const WHERE = { 0: 'THE DRAINS', 1: 'DRAIN MARKET', 2: 'PUMP HALL', 3: 'NOODLE ROW', 4: 'DISPATCH', 5: 'THE SKY LIFT', 6: 'GLASS BRIDGE', 7: 'SKY GARDEN', 8: 'SKY GARDEN' };

const pick = (k, which) => ({ n: 1, [['oath', 'take', 'spark'][which - 1]]: 1, ['s' + k]: '=' + which });
const W = 'WICK, A PATCHED DRONE';

export const NODES = {
  intro1: { who: W, text: 'Up. Up! You fell four levels into the Drains. Your recall pane is cracked in seven places. Do you know your name?', next: 'intro2' },
  intro2: { who: 'YOU', text: 'No name. No yesterday. Only a sealed case locked to my wrist, and a tag on it: SKY GARDEN, BEFORE DAWN.', next: 'intro3' },
  intro3: { who: W, text: 'Then we walk your route again, bottom to top. Each place where you once felt something will shake a shard loose. What you see in it is who you were.', next: 'f1' },

  f1: { who: W, text: 'The drain market. You came through here every night. Look: a shard, caught in the grating.', next: 'm1' },
  m1: { who: 'SHARD 1 OF 7', text: 'A child with a cough holds out two coins for a filter mask that costs five. The stall keeper is looking the other way.', choices: [
    { text: 'I paid the other three coins myself', set: pick(1, 1), next: 'r1a' },
    { text: 'I pocketed a mask of my own, unseen', set: pick(1, 2), next: 'r1b' },
    { text: 'I slipped the child a mask and walked on', set: pick(1, 3), next: 'r1c' }] },
  r1a: { who: 'YOU', text: 'Three coins on the counter. I went without supper that night, and did not mind.', next: 'f2' },
  r1b: { who: 'YOU', text: 'The air down here is bad. Nobody was going to look after my lungs but me.', next: 'f2' },
  r1c: { who: 'YOU', text: 'The stall keeper counted his masks twice that evening. The child stopped coughing by the end of the week.', next: 'f2' },

  f2: { who: W, text: 'The pump hall. Mind the wet. Your second shard is under that valve wheel.', next: 'm2' },
  m2: { who: 'SHARD 2 OF 7', text: 'A foreman offers double pay to carry an unmarked parcel past the checkpoint tonight. No list, no questions.', choices: [
    { text: 'I refused: I carry only what is listed', set: pick(2, 1), next: 'r2a' },
    { text: 'I took the money and the parcel', set: pick(2, 2), next: 'r2b' },
    { text: 'I told the pump crews what he was moving', set: pick(2, 3), next: 'r2c' }] },
  r2a: { who: 'YOU', text: 'He laughed at me. But every parcel I ever carried was written down, and every one arrived.', next: 'f3' },
  r2b: { who: 'YOU', text: 'It was light and it rattled. Double pay spends the same as honest pay.', next: 'f3' },
  r2c: { who: 'YOU', text: 'Pump parts, sold off while the pumps failed. The crews met him at the checkpoint. I lost the fee and kept the stairs dry.', next: 'f3' },

  f3: { who: W, text: 'Surface level. Rain, as always. You ate at this stall. The shard is in the gutter, shining.', next: 'm3' },
  m3: { who: 'SHARD 3 OF 7', text: 'Old Harrow, your dispatcher, slides you a bowl. "The company is cutting every runner\'s pay by a third," she says.', choices: [
    { text: 'I said I would run anyway: people wait', set: pick(3, 1), next: 'r3a' },
    { text: 'I asked which rival pays better', set: pick(3, 2), next: 'r3b' },
    { text: 'I said we should all stop at once', set: pick(3, 3), next: 'r3c' }] },
  r3a: { who: 'OLD HARROW', text: '"I knew you would say that," Harrow said. She did not sound glad. She paid for my noodles.', next: 'f4' },
  r3b: { who: 'OLD HARROW', text: '"Redline. Ask for Voss," Harrow said, very quietly. I had the address before my bowl was empty.', next: 'f4' },
  r3c: { who: 'OLD HARROW', text: 'Harrow looked at me for a long time. "Then I never heard you say it," she said, and wrote down eleven names.', next: 'f4' },

  f4: { who: W, text: 'The dispatch office, dark and locked. You had a key once. There, by the rota board: number four.', next: 'm4' },
  m4: { who: 'SHARD 4 OF 7', text: 'The rota board, unlocked, at night. Young Pim is down for the dangerous Drains run again. You have the easy one.', choices: [
    { text: 'I left the board and ran beside Pim', set: pick(4, 1), next: 'r4a' },
    { text: 'I left it. An easy night is an easy night', set: pick(4, 2), next: 'r4b' },
    { text: 'I swapped our names and said nothing', set: pick(4, 3), next: 'r4c' }] },
  r4a: { who: 'YOU', text: 'The rota is the rota. But nothing in it says a runner may not have company. We did both runs, and I slept on my feet.', next: 'f5' },
  r4b: { who: 'YOU', text: 'Pim came back at dawn with a limp. I had been asleep for five hours.', next: 'f5' },
  r4c: { who: 'YOU', text: 'Pim thought the company had been kind for once. I never said otherwise.', next: 'f5' },

  f5: { who: W, text: 'The sky lift. Your pass still works. Shard five is stuck in the gate, where it closed.', next: 'm5' },
  m5: { who: 'SHARD 5 OF 7', text: 'The guard waves you in. Behind you he stops a woman with a sick man on her arm. No pass, no lift, no clinic.', choices: [
    { text: 'I rode up. My delivery could not wait', set: pick(5, 1), next: 'r5a' },
    { text: 'I sold her my spare pass for all she had', set: pick(5, 2), next: 'r5b' },
    { text: 'I jammed the gate open with my case', set: pick(5, 3), next: 'r5c' }] },
  r5a: { who: 'YOU', text: 'I delivered on the minute. On the way down I left my week\'s pay at the gate, with her name on it.', next: 'f6' },
  r5b: { who: 'YOU', text: 'She did not bargain. A spare pass is worth what somebody will give for it.', next: 'f6' },
  r5c: { who: 'YOU', text: 'Eleven people went through before the guard got it shut. It cost me a fine and a dent in the case.', next: 'f6' },

  f6: { who: W, text: 'The glass bridge. Do not look down: you have done enough falling. Number six is on the rail.', next: 'm6' },
  m6: { who: 'SHARD 6 OF 7', text: 'Tessel, a broker in a white coat, falls into step. "Whatever is in that case, I pay ten times your fee for one look."', choices: [
    { text: 'I walked on. A sealed case stays sealed', set: pick(6, 1), next: 'r6a' },
    { text: 'I asked for twenty times', set: pick(6, 2), next: 'r6b' },
    { text: 'I asked what she feared was inside', set: pick(6, 3), next: 'r6c' }] },
  r6a: { who: 'TESSEL', text: '"They do not make many like you," Tessel said. It was not praise. She let me pass.', next: 'f7' },
  r6b: { who: 'TESSEL', text: 'Tessel smiled like a door opening. "Tomorrow night, then," she said. "Before the garden."', next: 'f7' },
  r6c: { who: 'TESSEL', text: 'Her smile went away. "Something that belongs to people who cannot pay for it," she said, and left quickly.', next: 'f7' },

  f7: { who: W, text: 'The garden gate. This is where the chain broke and you went over. The last shard is in the hedge.', next: 'm7' },
  m7: { who: 'SHARD 7 OF 7', text: 'Last night. Two collectors in grey step out of the hedge. "The case, runner. Name a price, or lose the arm."', choices: [
    { text: 'I said it goes to the name on the tag', set: pick(7, 1), next: 'r7' },
    { text: 'I named a price', set: pick(7, 2), next: 'r7' },
    { text: 'I shouted for the whole garden to hear', set: pick(7, 3), next: 'r7' }] },
  r7: { who: 'YOU', text: 'A hand on the chain. The rail giving way. Then the long fall, down through all three layers, into the dark.', next: 'whole' },
  whole: { who: W, text: 'Seven shards. Hold still: there. The pane is whole again. Look into it.', next: 'who' },

  who: { goto: [{ if: 'oath>=4', next: 'a1' }, { if: 'take>=4', next: 'b1' }, { if: 'spark>=4', next: 'c1' },
    { if: 'oath>=3&take<=2&spark<=2', next: 'a1' }, { if: 'take>=3&oath<=2&spark<=2', next: 'b1' }, { if: 'spark>=3&oath<=2&take<=2', next: 'c1' },
    { next: 'two' }] },
  two: { who: W, text: 'Two faces look out of it. Both are yours. Which one do you keep?', choices: [
    { text: 'The one who keeps their word', if: 'oath>=3', next: 'a1' },
    { text: 'The one who looks after themself', if: 'take>=3', next: 'b1' },
    { text: 'The one who breaks the rule', if: 'spark>=3', next: 'c1' }] },

  a1: { who: 'YOU', text: 'Iri Calloway. That is my name. Nine years a runner, and never a parcel lost. The tag says Sky Garden, before dawn. There is still time.', next: 'a2' },
  a2: { end: 'the-carrier', good: true, title: 'THE CARRIER', text: 'The registrar signs for the case and opens it: the water deed of the Drains, filed at last in the name of the people who live there. You never knew. You never needed to.' },
  b1: { who: 'YOU', text: 'Iri Calloway. That is my name, and it has never been on anybody\'s list but my own. Wick, find me a quiet corner and a thin piece of wire.', next: 'b2' },
  b2: { end: 'the-shade', good: true, title: 'THE SHADE', text: 'The lock gives at dawn. A water deed, worth more than the tower it was going to. By noon you are somebody else, somewhere else, and the Drains never learn how close it came.' },
  c1: { who: 'YOU', text: 'Iri Calloway. That is my name. And I remember now why I ran for the rail. Wick, how many screens can you reach from the bridge?', next: 'c2' },
  c2: { end: 'the-spark', good: true, title: 'THE SPARK', text: 'You break the seal and read the deed aloud to every screen in the ward. The water belongs to the Drains. It always did. By sunrise all three layers know it.' }
};
