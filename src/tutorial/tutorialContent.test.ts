import assert from 'node:assert/strict';
import { buildBandedSlab, buildSlabFromRows } from './slabBuilders';
import {
  containsBlue,
  everyRowIsSingleGroup,
  findNextRainbowRow,
  RAINBOW_COLOR_INDICES
} from './tutorialRules';
import {
  GUESS_ROUNDS,
  INTRO_GUESS_SLABS,
  INTRO_SECOND_ROW_SLAB,
  INTRO_UNPAINTED_SLAB,
  PUZZLE_EXAMPLE_SLABS
} from './tutorialPuzzle';

const countPassing = (slabs: ReturnType<typeof buildBandedSlab>[]) =>
  slabs.filter(everyRowIsSingleGroup).length;

assert.equal(containsBlue(INTRO_UNPAINTED_SLAB), false);
assert.equal(containsBlue(INTRO_SECOND_ROW_SLAB), true);
assert.equal(INTRO_SECOND_ROW_SLAB.cells.length, 3);
assert.deepEqual(INTRO_GUESS_SLABS.map(containsBlue), [true, false]);
INTRO_GUESS_SLABS.forEach(slab => assert.equal(slab.cells.length, 3));

assert.deepEqual(PUZZLE_EXAMPLE_SLABS.map(everyRowIsSingleGroup), [true, false, true, false]);

GUESS_ROUNDS.forEach((round, index) => {
  assert.equal(round.length, 5, `round ${index} size`);
  assert.equal(countPassing(round), 2, `round ${index} stars`);
  round.forEach(slab => assert.equal(slab.cells.length, 6));
});
assert.deepEqual(GUESS_ROUNDS[0].map(everyRowIsSingleGroup), [true, false, true, false, false]);
assert.deepEqual(GUESS_ROUNDS[1].map(everyRowIsSingleGroup), [true, false, false, true, false]);

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

console.log('tutorial content checks passed');
