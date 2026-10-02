import { SlabData, COLORS } from '../components/Slab';
import type { CellCoordinate } from '../components/SlabMaker';

export const GRAY_COLOR_INDEX = 0;
export const INTRO_BLUE_COLOR_INDEX = 1;
export const INTRO_COLORS = [COLORS[GRAY_COLOR_INDEX], COLORS[5]];
export const RAINBOW_COLOR_INDICES = [1, 2, 3, 4, 5, 6];

const getCellColorIndex = (slab: SlabData, row: number, col: number): number => {
  return slab.groups[slab.cells[row][col].groupId]?.color ?? GRAY_COLOR_INDEX;
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

export const everyRowIsSingleGroup = (slab: SlabData): boolean => {
  return slab.cells.every((_, rowIndex) => isRowSingleGroup(slab, rowIndex));
};

export const getRowColorIndex = (slab: SlabData, rowIndex: number): number => {
  return getCellColorIndex(slab, rowIndex, 0);
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
    const isFinished =
      isRowSingleGroup(slab, rowIndex) && getRowColorIndex(slab, rowIndex) === colorIndex;

    if (!isFinished) {
      return { rowIndex, colorIndex };
    }
  }

  return null;
};
