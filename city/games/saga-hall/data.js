/*
 * Saga Hall — the cards and the sagas, as data.
 *
 * A telling is one hero, one deed and one place. CARDS lists the four of each: `name` is what the card says, `say`
 * how it reads inside a sentence, `art` an 8 × 8 drawing ('#' the main colour, 'o' the light one, '.' empty), and
 * `at` the number of sagas the hall must know before the card joins the hand (0: there from the start).
 * SAGAS lists the eight sagas: `is` is [hero, deed, place] as positions in CARDS, `title` and `text` what the hall
 * hears. Every saga must be tellable with cards that are in the hand by then: check() in game.js makes sure.
 * Words are in ordinary case; the pixel font shows them in capitals.
 */
export const KINDS = ['hero', 'deed', 'place'];
export const CARDS = {
  hero: [
    { name: 'Sigrun', say: 'Sigrun the shield-maiden', at: 0, art: ['.######.', '#oo##oo#', '#o####o#', '###oo###', '###oo###', '#o####o#', '.#o##o#.', '..####..'] },
    { name: 'Old Bjarke', say: 'Old Bjarke the fisher', at: 0, art: ['......#.', '.....#o.', '....#.o.', '...#..o.', '..#...o.', '.#....o.', '#...o.o.', '....ooo.'] },
    { name: 'Tove the Skald', say: 'Tove the skald', at: 0, art: ['.##..##.', '#..##..#', '#.o..o.#', '#.o..o.#', '#.o..o.#', '.#o..o#.', '..####..', '...##...'] },
    { name: 'The Raven', say: 'the Raven', at: 2, art: ['..###...', '.##o##..', '.####ooo', '######..', '#######.', '.######.', '..#..#..', '.##.##..'] }],
  deed: [
    { name: 'Sails to', say: 'sailed to', at: 0, art: ['...#....', '...##...', '...#o#..', '...#oo#.', '...#ooo#', '...#....', '########', '.######.'] },
    { name: 'Fights at', say: 'fought at', at: 0, art: ['.##.....', '####....', '####o...', '.##.o...', '....o...', '....o...', '....o...', '....o...'] },
    { name: 'Sings at', say: 'sang at', at: 0, art: ['...####.', '...#oo#.', '...#..#.', '...#..#.', '.###.###', '####.###', '####.##.', '.##.....'] },
    { name: 'Plays a trick at', say: 'played a trick at', at: 4, art: ['#......#', '##....##', '########', '#o####o#', '########', '.##oo##.', '..####..', '...##...'] }],
  place: [
    { name: 'The Frozen Fjord', say: 'the frozen fjord', at: 0, art: ['...#....', '..#o#...', '.#ooo#.#', '#ooooo#o', 'oooooooo', '########', 'o.oo.o.o', '########'] },
    { name: 'The Giant’s Hall', say: 'the giant’s hall', at: 0, art: ['...##...', '..####..', '.######.', '########', '#o#..#o#', '#o#..#o#', '###..###', '###..###'] },
    { name: 'The World’s Edge', say: 'the world’s edge', at: 0, art: ['........', '#.#.....', '.#.#.#..', '######o.', '#####o..', '#####o.o', '#####o..', '#####oo.'] },
    { name: 'The Northern Lights', say: 'the Northern Lights', at: 6, art: ['o..o..o.', 'o.oo.oo.', 'ooo.oo.o', '.oo.o..o', '.o..o...', '........', '..#...#.', '.###.###'] }]
};
export const SAGAS = [
  { is: [0, 1, 1], title: 'Sigrun and the Giant’s Door', text: 'The giant Hrum barred his hall and let no traveller in from the storm. Sigrun did not knock. She fought the door itself, three days, until the hinges begged for peace. It has stood open to travellers ever since.' },
  { is: [1, 0, 2], title: 'The Fisher Who Sailed Too Far', text: 'Old Bjarke followed one fat cod past every map, to where the sea pours off the world. He looked over the edge, said "hm", and let down his line. What he caught he has never told, but he ate well all winter.' },
  { is: [2, 2, 0], title: 'The Song That Broke the Ice', text: 'The fjord froze with the fleet still in it. Tove walked out on the ice and sang the summer song, badly, on purpose. The ice cracked from end to end to get away from it, and the ships came home.' },
  { is: [1, 1, 0], title: 'Bjarke and the Great Pike', text: 'A pike as long as a longship lived under the fjord ice and ate nets. Bjarke fought it through a fishing hole no wider than a shield. Neither won. They meet there every winter still, and both look forward to it.' },
  { is: [3, 2, 1], title: 'The Raven Who Sang the Giant to Sleep', text: 'Hrum the giant could not sleep, and a giant who cannot sleep breaks mountains. The Raven sat on his nose and sang the only song it knew, which is "kraa". By the ninth "kraa" the giant slept, out of sheer despair.' },
  { is: [2, 3, 1], title: 'How Tove Won the Giant’s Cup', text: 'Tove bet the giant she could drink his cup dry. He laughed: it holds a lake. She asked him to hold it steady, then steadier, then higher, until his arms shook and he spilled it all. "Dry," said Tove.' },
  { is: [0, 3, 2], title: 'Sigrun Fools the Sea', text: 'At the world’s edge the sea takes every ship. Sigrun painted her ship’s keel like the sky and sailed it upside down through the mist. The sea took it for a cloud and let it pass. She was sick for a week.' },
  { is: [3, 3, 3], title: 'The Raven Who Stole the Lights', text: 'The Northern Lights once shone only for the gods. The Raven told them the gods had gone to bed, and that far below was a hall that would stay up all night to watch. They have danced over this harbour ever since.' }
];
/* what the hall does when a telling is not a saga: by how many of its three cards belong to a saga not yet found */
export const REACT = {
  0: 'The fire pops. Somebody coughs. There is no saga in that.',
  1: 'A few heads nod. One thing in it rings true. They wait for more.',
  hd: 'The hall leans in. This hero did do such a deed. But not there.',
  hp: 'The hall leans in. This hero did go there. But that is not what was done.',
  dp: 'The hall leans in. Such a thing was done there. But not by this one.'
};
