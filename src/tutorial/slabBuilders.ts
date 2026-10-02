import { SlabData, deserializeSlab } from '../components/Slab';

const GRAY_COLOR_INDEX = 0;
const FIRST_GROUP_LETTER_CODE = 'a'.charCodeAt(0);

export type BandOrientation = 'horizontal' | 'vertical';

const getGroupLetter = (groupNumber: number): string => {
  return String.fromCharCode(FIRST_GROUP_LETTER_CODE + groupNumber);
};

const groupLettersByColor = (
  rows: string[],
  colorByGroupLetter: Record<string, number>
): string[][] => {
  const lettersByColor: string[][] = [];
  const uniqueLetters = new Set(rows.join(''));

  uniqueLetters.forEach(letter => {
    const colorIndex = colorByGroupLetter[letter] ?? GRAY_COLOR_INDEX;
    lettersByColor[colorIndex] = [...(lettersByColor[colorIndex] ?? []), letter];
  });

  return lettersByColor;
};

export const buildSlabFromRows = (
  rows: string[],
  colorByGroupLetter: Record<string, number> = {}
): SlabData => {
  return deserializeSlab({
    grid: rows.join(''),
    colors: groupLettersByColor(rows, colorByGroupLetter)
  });
};

export const buildBandedSlab = (
  bandColors: number[],
  orientation: BandOrientation,
  gridSize: number = 6
): SlabData => {
  const bandThickness = gridSize / bandColors.length;

  const rows = Array.from({ length: gridSize }, (_, row) => {
    return Array.from({ length: gridSize }, (_, col) => {
      const position = orientation === 'horizontal' ? row : col;
      return getGroupLetter(Math.floor(position / bandThickness));
    }).join('');
  });

  const colorByGroupLetter = Object.fromEntries(
    bandColors.map((colorIndex, bandIndex) => [getGroupLetter(bandIndex), colorIndex])
  );

  return buildSlabFromRows(rows, colorByGroupLetter);
};
