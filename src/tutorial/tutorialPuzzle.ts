import { SlabData, createSlab } from '../components/Slab';
import { buildBandedSlab, buildSlabFromRows } from './slabBuilders';
import { INTRO_BLUE_COLOR_INDEX } from './tutorialRules';

const RED = 1;
const ORANGE = 2;
const YELLOW = 3;
const GREEN = 4;
const BLUE = 5;
const PURPLE = 6;

const INTRO_GRID_SIZE = 3;

export const INTRO_UNPAINTED_SLAB: SlabData = createSlab(INTRO_GRID_SIZE);

export const INTRO_SECOND_ROW_SLAB: SlabData = buildSlabFromRows(
  ['abc', 'ddd', 'ghi'],
  { d: INTRO_BLUE_COLOR_INDEX }
);

export const INTRO_GUESS_SLABS: SlabData[] = [
  buildSlabFromRows(['abj', 'dej', 'ghj'], { j: INTRO_BLUE_COLOR_INDEX }),
  buildSlabFromRows(['abc', 'def', 'ghi'])
];

export const PUZZLE_EXAMPLE_SLABS: SlabData[] = [
  buildBandedSlab([RED, ORANGE, YELLOW, GREEN, BLUE, PURPLE], 'horizontal'),
  buildBandedSlab([BLUE, YELLOW, RED], 'vertical'),
  buildBandedSlab([BLUE, YELLOW, RED], 'horizontal'),
  buildBandedSlab([RED, ORANGE, YELLOW, GREEN, BLUE, PURPLE], 'vertical')
];

export const PUZZLE_REVEAL_SLAB: SlabData = PUZZLE_EXAMPLE_SLABS[0];

const FIRST_ROUND_SLABS: SlabData[] = [
  buildBandedSlab([GREEN, PURPLE], 'horizontal'),
  buildSlabFromRows(
    ['aabbcc', 'aabbcc', 'ddeeff', 'ddeeff', 'gghhii', 'gghhii'],
    { a: RED, b: ORANGE, c: YELLOW, d: GREEN, e: BLUE, f: PURPLE, g: RED, h: ORANGE, i: YELLOW }
  ),
  buildBandedSlab([ORANGE, YELLOW, ORANGE, YELLOW, ORANGE, YELLOW], 'horizontal'),
  buildBandedSlab([BLUE, RED, BLUE], 'vertical'),
  buildSlabFromRows(
    ['aaaaaa', 'bbbbbb', 'cccccc', 'dddddd', 'eeeeee', 'ffgggg'],
    { a: RED, b: ORANGE, c: YELLOW, d: GREEN, e: BLUE, f: PURPLE, g: YELLOW }
  )
];

const SECOND_ROUND_SLABS: SlabData[] = [
  buildBandedSlab([RED, ORANGE, YELLOW], 'horizontal'),
  buildBandedSlab([ORANGE, ORANGE, ORANGE, ORANGE, ORANGE, ORANGE], 'vertical'),
  buildSlabFromRows(
    ['aaabbb', 'aaabbb', 'aaabbb', 'cccddd', 'cccddd', 'cccddd'],
    { a: RED, b: BLUE, c: BLUE, d: RED }
  ),
  buildBandedSlab([PURPLE, RED, PURPLE, RED, PURPLE, RED], 'horizontal'),
  buildSlabFromRows(
    ['aaaaaa', 'bbbbbb', 'ccdddd', 'eeeeee', 'ffffff', 'gggggg'],
    { a: GREEN, b: BLUE, c: RED, d: ORANGE, e: PURPLE, f: YELLOW, g: GREEN }
  )
];

export const GUESS_ROUNDS: SlabData[][] = [FIRST_ROUND_SLABS, SECOND_ROUND_SLABS];

export const TEXT_HINTS: string[] = [
  'Notice all the starred slabs have horizontal stripes!',
  "It's almost like a rainbow!"
];

export const FIRST_VISUAL_HINT_LEVEL = TEXT_HINTS.length + 1;
