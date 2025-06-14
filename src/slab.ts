export interface Cell {
  width: number;
  slab?: Slab;
  color?: string;
}

export interface Row {
  height: number;
  cells: Cell[];
}

export type Slab = Row[];

export enum COMMANDS {
  SLAB = 'a',
  PILLAR = 'w',
  BEAM = 's',
  BLOCK = 'd',

  MODE_COLOR = 'q',
  MODE_GLYPH = 'e',

  COLOR_RED = 'r',
  COLOR_TEAL = 't',
  COLOR_YELLOW = 'y',
  COLOR_GREEN = 'g',
  COLOR_FUCHSIA = 'f',
  COLOR_LIGHTEN = 'h',

  RECURSE = 'i',  
}

// TODO: 
// make lighten / darken work in a palette?
// recursion should be based on area; and un-recursed should be indicated

/*
B - Prepare for a new row (but do not create it); BB will end a slab context
b - New cell or extend current cell
p - Prepare for a new cell (but do not create it); multiple consecutive p's will make a row taller
S - Create a new slab. If preceded by b's, it will occupy that cell. Otherwise, it will create a new cell.
i - Replace with the entire input string (recursion depth limit: 3)
r - Set color to red (#DC2626)
t - Set color to teal (#0D9488)
y - Set color to yellow (#EAB308)
h - Increase lightness by 5% for subsequent cells
*/

export function parseSlab(
  input: string, 
  doRecursion: boolean = true,
  parentColor?: string,
  parentLightness: number = 1.0
): Slab {
  if (!input) return [];
  
  // Replace all 'i's with the entire input string
  if (input.includes(COMMANDS.RECURSE) && doRecursion) {
    let recursedInput = input;
    while (recursedInput.length < 200 / (input.match(/w/i) || [1]).length) {
      // Count S's in the input
      const slabCount = 1 + (input.match(new RegExp(COMMANDS.SLAB, 'g')) || []).length;
      // Create the BB's needed to close all S's
      const closingBeams = COMMANDS.BEAM.repeat(2 * slabCount);
      recursedInput = recursedInput.replace(new RegExp(COMMANDS.RECURSE, 'g'), COMMANDS.SLAB + input + closingBeams);
    }
    console.log("recursed", recursedInput)
    return parseSlab(recursedInput, false, parentColor, parentLightness)
  }
  
  const rows: Row[] = [];
  let currentRow: Row | null = null;
  let currentSlab: Slab | null = null;
  let stack: Slab[] = [];
  let pendingCells = 0;
  let consecutivePs = 0;
  let lastChar = '';
  let currentColor: string | undefined = parentColor;
  let currentLightness = parentLightness;
  let hasPrecedingB = false;
  let nextRowHeight = 1;
  let afterB = false;

  const lightenColor = (hex: string, lightness: number): string => {
    // Convert hex to RGB
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    
    // Lighten by percentage
    const newR = Math.round(r + (255 - r) * (lightness - 1));
    const newG = Math.round(g + (255 - g) * (lightness - 1));
    const newB = Math.round(b + (255 - b) * (lightness - 1));
    // Convert back to hex
    return `#${newR.toString(16).padStart(2, '0')}${newG.toString(16).padStart(2, '0')}${newB.toString(16).padStart(2, '0')}`;
  };

  const getCurrentColor = (): string | undefined => {
    if (!currentColor) return undefined;
    return lightenColor(currentColor, currentLightness);
  };

  for (let i = 0; i < input.length; i++) {
    const char = input[i];
    const nextChar = input[i + 1];

    switch (char) {
      case COMMANDS.COLOR_LIGHTEN:
        currentLightness = currentLightness + 0.05;
        break;

      case COMMANDS.COLOR_RED:
        currentColor = '#DC2626';
        break;

      case COMMANDS.COLOR_GREEN:
        currentColor = '#0D9488';
        break;

      case COMMANDS.COLOR_TEAL:
        currentColor = '#3B82F6';
        break;

      case COMMANDS.COLOR_YELLOW:
        currentColor = '#EAB308';
        break;

      case COMMANDS.BEAM:
        if (nextChar === COMMANDS.BEAM) {
          // End current slab context
          if (stack.length > 0) {
            currentSlab = stack.pop() || null;
          }
          i++; // Skip next B
        } else {
          // Prepare for new row
          if (currentRow) {
            rows.push(currentRow);
          }
          currentRow = null;
          pendingCells = 0;
          consecutivePs = 0;
        }
        hasPrecedingB = false;
        nextRowHeight = 1;
        afterB = true;
        break;

      case COMMANDS.RECURSE:
      case COMMANDS.BLOCK:
        if (!currentRow) {
          currentRow = { height: nextRowHeight, cells: [] };
        }
        const color = char === COMMANDS.BLOCK ? getCurrentColor() : '#FAA'
        
        if (pendingCells > 0) {
          // Create a single cell for all pending p's
          if (currentSlab) {
            currentSlab[currentSlab.length - 1].cells.push({ width: 1, color: color });
          } else if (currentRow) {
            currentRow.cells.push({ width: 1, color: color });
          }
        } else {
          // Extend current cell or create new one if none exists
          if (currentSlab) {
            const lastRow = currentSlab[currentSlab.length - 1];
            const lastIndex = lastRow.cells.length - 1;
            if (lastIndex >= 0) {
              lastRow.cells[lastIndex].width++;
              lastRow.cells[lastIndex].color = color;
            } else {
              lastRow.cells.push({ width: 1, color: color });
            }
          } else if (currentRow) {
            const lastIndex = currentRow.cells.length - 1;
            if (lastIndex >= 0) {
              currentRow.cells[lastIndex].width++;
              currentRow.cells[lastIndex].color = color;
            } else {
              currentRow.cells.push({ width: 1, color: color });
            }
          }
        }
        pendingCells = 0;
        consecutivePs = 0;
        hasPrecedingB = true;
        afterB = false;
        break;

      case COMMANDS.PILLAR:
        if (afterB) {
          // If we're after a B, these p's set the height for the next row
          consecutivePs++;
          nextRowHeight = Math.max(nextRowHeight, consecutivePs + 1);
        } else if (currentRow) {
          // Otherwise they work as before
          if (lastChar === COMMANDS.PILLAR) {
            consecutivePs++;
            currentRow.height = Math.max(currentRow.height, consecutivePs);
          } else {
            consecutivePs = 1;
          }
        }
        pendingCells++;
        hasPrecedingB = false;
        break;

      case COMMANDS.SLAB:
        if (!currentRow) {
          currentRow = { height: nextRowHeight, cells: [] };
        }

        // Find the matching BB or end of string
        let nestedContent = '';
        let slabDepth = 1;
        let j = i + 1;
        let sCount = 1; // Count of S's we've seen

        while (j < input.length && slabDepth > 0) {
          if (input[j] === COMMANDS.SLAB) {
            sCount++;
            slabDepth++;
            nestedContent += COMMANDS.SLAB;
          } else if (input[j] === COMMANDS.BEAM && input[j + 1] === COMMANDS.BEAM) {
            slabDepth--;
            if (slabDepth > 0) {
              nestedContent += COMMANDS.BEAM.repeat(2);
            }
            j++;
          } else {
            nestedContent += input[j];
          }
          j++;
        }

        // Parse the nested content
        const nestedSlab = parseSlab(nestedContent, false, currentColor, currentLightness);
        
        // Add the nested slab to the current context
        if (currentSlab) {
          const lastRow = currentSlab[currentSlab.length - 1];
          const lastIndex = lastRow.cells.length - 1;
          if (lastIndex >= 0 && hasPrecedingB) {
            // If preceded by b's, use the current cell
            lastRow.cells[lastIndex].slab = nestedSlab;
            lastRow.cells[lastIndex].color = getCurrentColor();
          } else {
            // Otherwise create a new cell
            lastRow.cells.push({ width: 1, slab: nestedSlab, color: getCurrentColor() });
          }
        } else if (currentRow) {
          const lastIndex = currentRow.cells.length - 1;
          if (lastIndex >= 0 && hasPrecedingB) {
            // If preceded by b's, use the current cell
            currentRow.cells[lastIndex].slab = nestedSlab;
            currentRow.cells[lastIndex].color = getCurrentColor();
          } else {
            // Otherwise create a new cell
            currentRow.cells.push({ width: 1, slab: nestedSlab, color: getCurrentColor() });
          }
        }

        // Update position to after the BB or end of string
        i = j - 1;
        pendingCells = 0;
        consecutivePs = 0;
        hasPrecedingB = false;
        afterB = false;
        break;
    }
    lastChar = char;
  }

  // Add the last row if it exists
  if (currentRow) {
    rows.push(currentRow);
  }

  // console.log("rows", rows)

  return rows;
} 