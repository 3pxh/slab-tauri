import { SlabData, COLORS } from '../components/Slab';
import type { CellCoordinate } from '../components/SlabMaker';

export const GRAY_COLOR_INDEX = 0;
export const INTRO_BLUE_COLOR_INDEX = 1;
export const INTRO_COLORS = [COLORS[GRAY_COLOR_INDEX], COLORS[5]];
export const RAINBOW_COLOR_INDICES = [1, 2, 3, 4, 5, 6];

const getCellColorIndex = (slab: SlabData, row: number, col: number): number => {
  return slab.groups[slab.cells[row][col].groupId]?.color ?? GRAY_COLOR_INDEX;
};

const getRowColorIndices = (slab: SlabData, rowIndex: number): number[] => {
  return slab.cells[rowIndex].map((_, col) => getCellColorIndex(slab, rowIndex, col));
};

const getSolidRowColorIndex = (slab: SlabData, rowIndex: number): number | null => {
  const [firstColorIndex, ...otherColorIndices] = getRowColorIndices(slab, rowIndex);
  const isSolid = otherColorIndices.every(colorIndex => colorIndex === firstColorIndex);
  return isSolid ? firstColorIndex : null;
};

export const containsBlue = (slab: SlabData): boolean => {
  return slab.cells.some((cellRow, row) =>
    cellRow.some((_, col) => getCellColorIndex(slab, row, col) === INTRO_BLUE_COLOR_INDEX)
  );
};

export const isRowSingleGroup = (slab: SlabData, rowIndex: number): boolean => {
  const row = slab.cells[rowIndex];
  return row.every(cell => cell.groupId === row[0].groupId);
};

export const isStripedSlab = (slab: SlabData): boolean => {
  const solidRowColors = slab.cells.map((_, rowIndex) => getSolidRowColorIndex(slab, rowIndex));
  const everyRowIsSolid = solidRowColors.every(colorIndex => colorIndex !== null);
  const rowColorsVary = new Set(solidRowColors).size > 1;
  return everyRowIsSolid && rowColorsVary;
};

export const getRowCells = (slab: SlabData, rowIndex: number): CellCoordinate[] => {
  return slab.cells[rowIndex].map((_, col) => ({ row: rowIndex, col }));
};

export type RainbowRowTarget = {
  rowIndex: number;
  colorIndex: number;
};

export const findNextRainbowRow = (slab: SlabData): RainbowRowTarget | null => {
  for (let rowIndex = 0; rowIndex < RAINBOW_COLOR_INDICES.length; rowIndex++) {
    const colorIndex = RAINBOW_COLOR_INDICES[rowIndex];

    if (getSolidRowColorIndex(slab, rowIndex) !== colorIndex) {
      return { rowIndex, colorIndex };
    }
  }

  return null;
};
