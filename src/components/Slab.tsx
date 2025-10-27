import React from 'react';
import { deepEqual } from '../utils';

// Define the Slab data structure
export interface Group {
  id: number;
  color: number;
}

export interface Cell {
  groupId: number;
}

export interface SlabData {
  cells: Cell[][];
  groups: Record<number, Group>;
}

// Color palette: gray + rainbow order (red, orange, yellow, green, blue, purple)
// Shades chosen to be similar to MUI 600 hues for a rich, modern look
export const COLORS = [
  '#9e9e9e', // gray 600
  '#e53935', // red 600
  '#fb8c00', // orange 600
  '#fdd835', // yellow 600
  '#43a047', // green 600
  '#1e88e5', // blue 600
  '#8e24aa', // purple 600
];

// Helper function to map color index to available colors using modulo
export const mapColorIndex = (originalIndex: number, availableColors: string[]): number => {
  return ((originalIndex % availableColors.length) + availableColors.length) % availableColors.length;
};

// Helper function to get group data
export const getGroup = (groups: Record<number, Group>, groupId: number): Group | undefined => {
  return groups[groupId];
};

// Helper functions for efficient serialization
export const serializeSlab = (slab: SlabData): { grid: string; colors: string[][] } => {
  // Convert groupId to letter (0-9 = a-j, 10-25 = k-z, 26-35 = A-J)
  const groupIdToLetter = (groupId: number): string => {
    if (groupId <= 25) return String.fromCharCode(97 + groupId); // a-z
    return String.fromCharCode(65 + groupId - 26); // A-J
  };

  // Create grid string by reading cells in row-major order
  let grid = '';
  for (let row = 0; row < slab.cells.length; row++) {
    for (let col = 0; col < slab.cells[row].length; col++) {
      grid += groupIdToLetter(slab.cells[row][col].groupId);
    }
  }

  // Create colors array - each index contains letters for that color
  const colors: string[][] = [];
  for (const [groupId, group] of Object.entries(slab.groups)) {
    const colorIndex = group.color;
    if (!colors[colorIndex]) {
      colors[colorIndex] = [];
    }
    colors[colorIndex].push(groupIdToLetter(parseInt(groupId)));
  }

  return { grid, colors };
};

export const deserializeSlab = (serialized: { grid: string; colors: string[][] }): SlabData => {
  // Convert letter back to groupId
  const letterToGroupId = (letter: string): number => {
    const code = letter.charCodeAt(0);
    if (code >= 97 && code <= 122) return code - 97; // a-z -> 0-25
    return code - 65 + 26; // A-J -> 26-35
  };

  // Reconstruct cells from grid
  const cells: Cell[][] = [];
  const gridLength = Math.sqrt(serialized.grid.length);
  
  for (let row = 0; row < gridLength; row++) {
    cells[row] = [];
    for (let col = 0; col < gridLength; col++) {
      const letter = serialized.grid[row * gridLength + col];
      cells[row][col] = { groupId: letterToGroupId(letter) };
    }
  }

  // Reconstruct groups from colors
  const groups: Record<number, Group> = {};
  for (let colorIndex = 0; colorIndex < serialized.colors.length; colorIndex++) {
    if (serialized.colors[colorIndex]) {
      for (const letter of serialized.colors[colorIndex]) {
        const groupId = letterToGroupId(letter);
        groups[groupId] = { id: groupId, color: colorIndex };
      }
    }
  }

  return { cells, groups };
};

// Helper function to compare if two SlabData objects are equal
export const areSlabsEqual = (slab1: SlabData, slab2: SlabData): boolean => {
  return deepEqual(slab1, slab2);
};

// Initialize a new Slab with 6x6 grid
export const createSlab = (): SlabData => {
  const cells: Cell[][] = [];
  const groups: Record<number, Group> = {};
  
  for (let row = 0; row < 6; row++) {
    cells[row] = [];
    for (let col = 0; col < 6; col++) {
      const groupId = 6 * row + col;
      cells[row][col] = {
        groupId: groupId
      };
      
      // Create group if it doesn't exist
      if (!(groupId in groups)) {
        groups[groupId] = {
          id: groupId,
          color: 0 // Initialize to gray
        };
      }
    }
  }
  
  return { cells, groups };
};

// Create a random slab with various colors and groups
export const createRandomSlab = (): SlabData => {
  const cells: Cell[][] = [];
  const groups: Record<number, Group> = {};
  
  // Create 3-8 random groups with different colors
  const numGroups = Math.floor(Math.random() * 4) + 2; // 3-8 groups
  const groupIds = Array.from({ length: numGroups }, (_, i) => i);
  
  // Assign random colors to groups (excluding gray for more visual interest)
  const availableColors = [1, 2, 3, 4, 5, 6]; // Red, Orange, Yellow, Green, Blue, Purple
  groupIds.forEach((groupId, index) => {
    groups[groupId] = {
      id: groupId,
      color: availableColors[index % availableColors.length]
    };
  });
  
  // Fill the 6x6 grid with random group assignments
  for (let row = 0; row < 6; row++) {
    cells[row] = [];
    for (let col = 0; col < 6; col++) {
      const randomGroupId = groupIds[Math.floor(Math.random() * groupIds.length)];
      cells[row][col] = {
        groupId: randomGroupId
      };
    }
  }
  
  return { cells, groups };
};

// Helper function to get border styles and corner radii based on neighbors
const getBorderStyles = (row: number, col: number, slab: SlabData) => {
  const currentGroupId = slab.cells[row][col].groupId;
  const borderColor = 'white';
  const borderWidth = '1px';
  
  const sameTop = row > 0 && slab.cells[row - 1][col].groupId === currentGroupId;
  const sameRight = col < 5 && slab.cells[row][col + 1].groupId === currentGroupId;
  const sameBottom = row < 5 && slab.cells[row + 1][col].groupId === currentGroupId;
  const sameLeft = col > 0 && slab.cells[row][col - 1].groupId === currentGroupId;

  const radiusValue = '3px';

  const borders: React.CSSProperties = {
    borderTop: `${borderWidth} solid ${borderColor}`,
    borderRight: `${borderWidth} solid ${borderColor}`,
    borderBottom: `${borderWidth} solid ${borderColor}`,
    borderLeft: `${borderWidth} solid ${borderColor}`,
    borderTopLeftRadius: !sameTop && !sameLeft ? radiusValue : '0px',
    borderTopRightRadius: !sameTop && !sameRight ? radiusValue : '0px',
    borderBottomRightRadius: !sameBottom && !sameRight ? radiusValue : '0px',
    borderBottomLeftRadius: !sameBottom && !sameLeft ? radiusValue : '0px'
  };

  // Check top neighbor
  if (sameTop) {
    borders.borderTop = 'none';
  }

  // Check right neighbor
  if (sameRight) {
    borders.borderRight = 'none';
  }

  // Check bottom neighbor
  if (sameBottom) {
    borders.borderBottom = 'none';
  }

  // Check left neighbor
  if (sameLeft) {
    borders.borderLeft = 'none';
  }

  return borders;
};

// Determine which corners are inner-concave (L-bend) for a cell
const getConcaveCorners = (row: number, col: number, slab: SlabData) => {
  const currentGroupId = slab.cells[row][col].groupId;

  const sameTop = row > 0 && slab.cells[row - 1][col].groupId === currentGroupId;
  const sameRight = col < 5 && slab.cells[row][col + 1].groupId === currentGroupId;
  const sameBottom = row < 5 && slab.cells[row + 1][col].groupId === currentGroupId;
  const sameLeft = col > 0 && slab.cells[row][col - 1].groupId === currentGroupId;

  const sameTopLeftDiag = row > 0 && col > 0 && slab.cells[row - 1][col - 1].groupId === currentGroupId;
  const sameTopRightDiag = row > 0 && col < 5 && slab.cells[row - 1][col + 1].groupId === currentGroupId;
  const sameBottomRightDiag = row < 5 && col < 5 && slab.cells[row + 1][col + 1].groupId === currentGroupId;
  const sameBottomLeftDiag = row < 5 && col > 0 && slab.cells[row + 1][col - 1].groupId === currentGroupId;

  // Inner concave if both adjacent sides are same-group but diagonal is not (prevents fully interior corners)
  return {
    topLeft: sameTop && sameLeft && !sameTopLeftDiag,
    topRight: sameTop && sameRight && !sameTopRightDiag,
    bottomRight: sameBottom && sameRight && !sameBottomRightDiag,
    bottomLeft: sameBottom && sameLeft && !sameBottomLeftDiag,
  };
};

type SlabProps = {
  slab: SlabData;
  size?: 'small' | 'medium' | 'large';
  className?: string;
  colors?: string[];
  colorblindMode?: 'none' | 'icon' | 'number' | 'letter';
  getColorblindOverlay?: (colorIndex: number) => string | null;
};

const Slab: React.FC<SlabProps> = ({ 
  slab, 
  size = 'medium', 
  className = '', 
  colors = COLORS,
  colorblindMode = 'none',
  getColorblindOverlay
}) => {
  const sizeClasses = {
    small: 'w-32 h-32',
    medium: 'w-48 h-48',
    large: 'w-64 h-64'
  };

  return (
    <div className={`grid grid-cols-6 rounded-sm border border-white ${className.includes('w-full') ? 'w-full h-full' : sizeClasses[size]} ${className}`} style={{ gridAutoRows: '1fr', backgroundColor: 'white' }}>
      {slab.cells.map((row, rowIndex) => (
        <React.Fragment key={rowIndex}>
          {row.map((cell, colIndex) => (
            <div
              key={`${rowIndex}-${colIndex}`}
              className="relative aspect-square w-full h-full flex items-center justify-center text-xs font-mono select-none"
              style={{
                backgroundColor: colors[mapColorIndex(getGroup(slab.groups, cell.groupId)?.color || 0, colors)],
                color: (getGroup(slab.groups, cell.groupId)?.color || 0) === 0 ? '#000' : '#fff',
                ...getBorderStyles(rowIndex, colIndex, slab)
              }}
            >
              {/* Colorblind overlay */}
              {colorblindMode !== 'none' && getColorblindOverlay && (() => {
                const originalColorIndex = getGroup(slab.groups, cell.groupId)?.color || 0;
                const mappedColorIndex = mapColorIndex(originalColorIndex, colors);
                const overlay = getColorblindOverlay(mappedColorIndex);
                if (!overlay) return null;
                
                const overlayWeight = colorblindMode === 'letter' ? 'font-bold' : 'font-normal';
                
                return (
                  <div 
                    className={`absolute inset-0 flex items-center justify-center ${overlayWeight} pointer-events-none`}
                    style={{
                      fontSize: size === 'small' ? '8px' : size === 'medium' ? '16px' : '18px',
                      color: mappedColorIndex === 0 ? '#000' : '#fff',
                      textShadow: mappedColorIndex === 0 ? '1px 1px 2px rgba(255,255,255,0.8)' : '1px 1px 2px rgba(0,0,0,0.8)',
                      zIndex: 2
                    }}
                  >
                    {overlay}
                  </div>
                );
              })()}
              {(() => {
                const concave = getConcaveCorners(rowIndex, colIndex, slab);
                const dotSize = size === 'small' ? 3 : size === 'medium' ? 3 : 3;
                const offset = size === 'small' ? '-2px' : size === 'medium' ? '-2px' : '-2px';
                const dotStyleBase: React.CSSProperties = {
                  position: 'absolute',
                  width: `${dotSize}px`,
                  height: `${dotSize}px`,
                  backgroundColor: 'white',
                  borderRadius: '9999px',
                  zIndex: 1,
                };

                return (
                  <>
                    {concave.topLeft && (
                      <span style={{ ...dotStyleBase, top: offset, left: offset }} />
                    )}
                    {concave.topRight && (
                      <span style={{ ...dotStyleBase, top: offset, right: offset }} />
                    )}
                    {concave.bottomRight && (
                      <span style={{ ...dotStyleBase, bottom: offset, right: offset }} />
                    )}
                    {concave.bottomLeft && (
                      <span style={{ ...dotStyleBase, bottom: offset, left: offset }} />
                    )}
                  </>
                );
              })()}
            </div>
          ))}
        </React.Fragment>
      ))}
    </div>
  );
};

export default Slab;
