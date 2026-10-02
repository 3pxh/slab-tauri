import assert from 'node:assert/strict';
import { buildBandedSlab, buildSlabFromRows } from './slabBuilders';
import {
  containsBlue,
  isStripedSlab,
  findNextRainbowRow,
  RAINBOW_COLOR_INDICES
} from './tutorialRules';
import {
  GUESS_ROUNDS,
  INTRO_GUESS_SLABS,
  INTRO_BOTTOM_ROW_MERGED_SLAB,
  INTRO_UNPAINTED_SLAB,
  PUZZLE_EXAMPLE_SLABS
} from './tutorialPuzzle';

const countPassing = (slabs: ReturnType<typeof buildBandedSlab>[]) =>
  slabs.filter(isStripedSlab).length;

assert.equal(containsBlue(INTRO_UNPAINTED_SLAB), false);
assert.equal(containsBlue(INTRO_BOTTOM_ROW_MERGED_SLAB), false);
assert.equal(INTRO_BOTTOM_ROW_MERGED_SLAB.cells.length, 3);
assert.deepEqual(INTRO_GUESS_SLABS.map(containsBlue), [true, false]);
INTRO_GUESS_SLABS.forEach(slab => assert.equal(slab.cells.length, 3));

assert.deepEqual(PUZZLE_EXAMPLE_SLABS.map(isStripedSlab), [true, false, true, false]);

GUESS_ROUNDS.forEach((round, index) => {
  assert.equal(round.length, 5, `round ${index} size`);
  assert.equal(countPassing(round), 2, `round ${index} stars`);
  round.forEach(slab => assert.equal(slab.cells.length, 6));
});
assert.deepEqual(GUESS_ROUNDS[0].map(isStripedSlab), [true, false, true, false, false]);
assert.deepEqual(GUESS_ROUNDS[1].map(isStripedSlab), [true, false, false, true, false]);

const rainbow = buildBandedSlab(RAINBOW_COLOR_INDICES, 'horizontal');
assert.equal(findNextRainbowRow(rainbow), null);

const blankSlab = buildSlabFromRows(
  ['abcdef', 'ghijkl', 'mnopqr', 'stuvwx', 'yzABCD', 'EFGHIJ']
);
assert.deepEqual(findNextRainbowRow(blankSlab), { rowIndex: 0, colorIndex: 1 });

const firstRowDone = buildSlabFromRows(
  ['aaaaaa', 'ghijkl', 'mnopqr', 'stuvwx', 'yzABCD', 'EFGHIJ'],
  { a: 1 }
);
assert.deepEqual(findNextRainbowRow(firstRowDone), { rowIndex: 1, colorIndex: 2 });

const firstRowWrongColor = buildSlabFromRows(
  ['aaaaaa', 'ghijkl', 'mnopqr', 'stuvwx', 'yzABCD', 'EFGHIJ'],
  { a: 4 }
);
assert.deepEqual(findNextRainbowRow(firstRowWrongColor), { rowIndex: 0, colorIndex: 1 });

const everyCellSeparateGroup = ['abcdef', 'ghijkl', 'mnopqr', 'stuvwx', 'yzABCD', 'EFGHIJ'];
const paintRowLetters = (rowIndex: number, colorIndex: number) =>
  Object.fromEntries([...everyCellSeparateGroup[rowIndex]].map(letter => [letter, colorIndex]));

assert.equal(isStripedSlab(blankSlab), false, 'all gray is not striped');
assert.equal(
  isStripedSlab(buildSlabFromRows(['aaaaaa', 'bbbbbb', 'cccccc', 'dddddd', 'eeeeee', 'ffffff'])),
  false,
  'merged gray rows are not striped'
);
assert.equal(
  isStripedSlab(buildBandedSlab([2, 2, 2, 2, 2, 2], 'horizontal')),
  false,
  'one color everywhere is not striped'
);

const unmergedStripes = buildSlabFromRows(everyCellSeparateGroup, {
  ...paintRowLetters(0, 1),
  ...paintRowLetters(1, 1),
  ...paintRowLetters(2, 5),
  ...paintRowLetters(3, 5),
  ...paintRowLetters(4, 3),
  ...paintRowLetters(5, 3)
});
assert.equal(isStripedSlab(unmergedStripes), true, 'unmerged same-color rows still count');

console.log('tutorial content checks passed');
