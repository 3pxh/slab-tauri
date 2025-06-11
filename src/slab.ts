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
  if (input.includes('i') && doRecursion) {
    let recursedInput = input;
    while (recursedInput.length < 800 / (input.match(/S/i) || [1]).length) {
      // Count S's in the input
      const sCount = 1 + (input.match(/S/g) || []).length;
      // Create the BB's needed to close all S's
      const closingBBs = 'BB'.repeat(sCount);
      recursedInput = recursedInput.replace(/i/g, 'S' + input + closingBBs);
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
      case 'h':
        currentLightness = currentLightness + 0.05;
        lastChar = 'h';
        break;

      case 'r':
        currentColor = '#DC2626';
        lastChar = 'r';
        break;

      case 't':
        currentColor = '#0D9488';
        lastChar = 't';
        break;

      case 'y':
        currentColor = '#EAB308';
        lastChar = 'y';
        break;

      case 'B':
        if (nextChar === 'B') {
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
        lastChar = 'B';
        hasPrecedingB = false;
        nextRowHeight = 1;
        afterB = true;
        break;

      case 'i':
      case 'b':
        if (!currentRow) {
          currentRow = { height: nextRowHeight, cells: [] };
        }
        const color = char === 'b' ? getCurrentColor() : '#FAA'
        
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
        lastChar = 'b';
        hasPrecedingB = true;
        afterB = false;
        break;

      case 'p':
        if (afterB) {
          // If we're after a B, these p's set the height for the next row
          consecutivePs++;
          nextRowHeight = Math.max(nextRowHeight, consecutivePs + 1);
        } else if (currentRow) {
          // Otherwise they work as before
          if (lastChar === 'p') {
            consecutivePs++;
            currentRow.height = Math.max(currentRow.height, consecutivePs);
          } else {
            consecutivePs = 1;
          }
        }
        pendingCells++;
        lastChar = 'p';
        hasPrecedingB = false;
        break;

      case 'S':
        currentColor = undefined;
        if (!currentRow) {
          currentRow = { height: nextRowHeight, cells: [] };
        }

        // Find the matching BB or end of string
        let nestedContent = '';
        let slabDepth = 1;
        let j = i + 1;
        let foundMatchingBB = false;
        let sCount = 1; // Count of S's we've seen

        while (j < input.length && slabDepth > 0) {
          if (input[j] === 'S') {
            sCount++;
            slabDepth++;
            nestedContent += 'S';
          } else if (input[j] === 'B' && input[j + 1] === 'B') {
            slabDepth--;
            if (slabDepth > 0) {
              nestedContent += 'BB';
            }
            j++;
            if (slabDepth === 0) {
              foundMatchingBB = true;
            }
          } else {
            nestedContent += input[j];
          }
          j++;
        }

        // If we hit the end of string, treat it as having all necessary BB's
        if (j >= input.length && slabDepth > 0) {
          foundMatchingBB = true;
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
        lastChar = 'S';
        hasPrecedingB = false;
        afterB = false;
        break;
    }
  }

  // Add the last row if it exists
  if (currentRow) {
    rows.push(currentRow);
  }

  console.log("rows", rows)
  return rows;
} 