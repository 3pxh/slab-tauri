import React from 'react';
import { FiRotateCcw, FiRefreshCw } from 'react-icons/fi';
import { FaArrowDownUpAcrossLine, FaLightbulb } from 'react-icons/fa6';
import { PiShuffleBold, PiGavelFill } from 'react-icons/pi';
import { useGesture } from '@use-gesture/react';
import { SlabData, createSlab, Cell, COLORS, getGroup } from './Slab';
import { deepCopy } from '../utils';
import { analytics } from '../utils/analytics';



type SlabMakerProps = {
  onCreate: (slab: SlabData) => void;
  onGuess?: () => void;
  guessCount?: number;
  maxGuesses?: number;
  hasWon?: boolean;
  flashGuessButton?: boolean;
  isInGuessSession?: boolean;
  initialSlab?: SlabData;
  onShuffle?: () => void;
  onSort?: () => void;
  colors?: string[];
  colorblindMode?: 'none' | 'icon' | 'number' | 'letter';
  getColorblindOverlay?: (colorIndex: number) => string | null;
  puzzle?: any; // Add puzzle prop for analytics
  hideControls?: boolean; // Hide control buttons for tutorial
};

const SlabMaker: React.FC<SlabMakerProps> = ({ 
  onCreate, 
  onGuess, 
  guessCount = 0, 
  maxGuesses = 3, 
  hasWon = false, 
  flashGuessButton = false, 
  isInGuessSession = false, 
  initialSlab, 
  onShuffle, 
  onSort, 
  colors = COLORS,
  colorblindMode = 'none',
  getColorblindOverlay,
  puzzle,
  hideControls = false
}) => {
  const [slab, setSlab] = React.useState<SlabData>(() => createSlab());
  const [history, setHistory] = React.useState<SlabData[]>([]);
  const [, setIsDragging] = React.useState(false);
  const [encounteredCells, setEncounteredCells] = React.useState<Set<string>>(new Set());
  const [firstGroup, setFirstGroup] = React.useState<number | null>(null);
  const [dragStartCell, setDragStartCell] = React.useState<{row: number, col: number} | null>(null);
  const [selectedGroup, setSelectedGroup] = React.useState<number | null>(null);

  // Keep a snapshot from drag start to push at drag end
  const preDragSnapshotRef = React.useRef<SlabData | null>(null);
  // Track last visited cell during drag to detect diagonals
  const lastDragCellRef = React.useRef<{row: number, col: number} | null>(null);

  // Handle initialSlab prop changes
  React.useEffect(() => {
    if (initialSlab) {
      // Push current state to history before setting new slab
      pushHistory();
      setSlab(cloneSlab(initialSlab));
      setSelectedGroup(null);
      setIsDragging(false);
      setEncounteredCells(new Set());
      setFirstGroup(null);
      setDragStartCell(null);
      preDragSnapshotRef.current = null;
    }
  }, [initialSlab]);

  // Helper: deep clone a slab snapshot
  const cloneSlab = (source: SlabData): SlabData => {
    return deepCopy(source);
  };

  // Helper: find all connected components of a group using flood fill
  const findConnectedComponents = (groupId: number, cells: Cell[][]): {row: number, col: number}[][] => {
    const components: {row: number, col: number}[][] = [];
    const visited = new Set<string>();
    
    // Find all cells belonging to this group
    const groupCells: {row: number, col: number}[] = [];
    for (let r = 0; r < 6; r++) {
      for (let c = 0; c < 6; c++) {
        if (cells[r][c].groupId === groupId) {
          groupCells.push({row: r, col: c});
        }
      }
    }
    
    // For each unvisited cell, do flood fill to find connected component
    for (const startCell of groupCells) {
      const cellKey = `${startCell.row},${startCell.col}`;
      if (visited.has(cellKey)) continue;
      
      const component: {row: number, col: number}[] = [];
      const stack = [startCell];
      
      while (stack.length > 0) {
        const current = stack.pop()!;
        const currentKey = `${current.row},${current.col}`;
        
        if (visited.has(currentKey)) continue;
        visited.add(currentKey);
        component.push(current);
        
        // Check all 4 adjacent cells
        const directions = [
          {row: current.row - 1, col: current.col}, // up
          {row: current.row + 1, col: current.col}, // down
          {row: current.row, col: current.col - 1}, // left
          {row: current.row, col: current.col + 1}  // right
        ];
        
        for (const dir of directions) {
          if (dir.row >= 0 && dir.row < 6 && dir.col >= 0 && dir.col < 6) {
            const dirKey = `${dir.row},${dir.col}`;
            if (!visited.has(dirKey) && cells[dir.row][dir.col].groupId === groupId) {
              stack.push(dir);
            }
          }
        }
      }
      
      if (component.length > 0) {
        components.push(component);
      }
    }
    
    return components;
  };

  // Helper: split disconnected groups into separate groups
  const splitDisconnectedGroups = (slab: SlabData): SlabData => {
    const newSlab = cloneSlab(slab);
    const groupsToCheck = Object.keys(slab.groups).map(Number);
    
    for (const groupId of groupsToCheck) {
      const components = findConnectedComponents(groupId, newSlab.cells);
      
      // If there are multiple components, split them into separate groups
      if (components.length > 1) {
        const originalGroup = newSlab.groups[groupId];
        if (!originalGroup) continue;
        
        // Keep the first component with the original group ID
        // Create new groups for the remaining components
        for (let i = 1; i < components.length; i++) {
          const component = components[i];
          const newGroupId = 6 * component[0].row + component[0].col; // Use first cell position as unique ID
          
          // Update all cells in this component to use the new group ID
          for (const cell of component) {
            newSlab.cells[cell.row][cell.col] = {
              ...newSlab.cells[cell.row][cell.col],
              groupId: newGroupId
            };
          }
          
          // Create new group with same color as original
          newSlab.groups[newGroupId] = {
            id: newGroupId,
            color: originalGroup.color
          };
        }
      }
    }
    
    return newSlab;
  };

  // Push current slab into history
  const pushHistory = (snapshot?: SlabData) => {
    setHistory(prev => [...prev, cloneSlab(snapshot ?? slab)]);
  };

  // Undo action
  const handleUndo = () => {
    setHistory(prev => {
      if (prev.length === 0) return prev;
      const nextHistory = prev.slice(0, -1);
      const last = prev[prev.length - 1];
      setSlab(cloneSlab(last));
      setSelectedGroup(null);
      setIsDragging(false);
      setEncounteredCells(new Set());
      setFirstGroup(null);
      setDragStartCell(null);
      preDragSnapshotRef.current = null;
      return nextHistory;
    });
  };

  // Reset to a fresh slab, but allow undo to recover previous state
  const handleReset = () => {
    pushHistory();
    setSlab(createSlab());
    setSelectedGroup(null);
    setIsDragging(false);
    setEncounteredCells(new Set());
    setFirstGroup(null);
    setDragStartCell(null);
    preDragSnapshotRef.current = null;
  };

  // Helper function to get cell coordinates from mouse/touch position
  const getCellFromCoordinates = (clientX: number, clientY: number) => {
    const element = document.elementFromPoint(clientX, clientY);
    if (!element) return null;
    
    const cellElement = element.closest('[data-cell-coords]');
    if (!cellElement) return null;
    
    const coords = cellElement.getAttribute('data-cell-coords');
    if (!coords) return null;
    
    const [row, col] = coords.split(',').map(Number);
    return { row, col };
  };

  // Universal gesture handler using react-use-gesture
  const bindCellGestures = useGesture({
    onDrag: ({ first, last, event, args }) => {
      const [row, col] = args as [number, number];
      if (first) {
        const groupId = slab.cells[row][col].groupId;
        setIsDragging(true);
        setFirstGroup(groupId);
        setEncounteredCells(new Set([`${row},${col}`]));
        setDragStartCell({ row, col });
        preDragSnapshotRef.current = cloneSlab(slab);
        lastDragCellRef.current = { row, col };
        // Select the group we're dragging from
        setSelectedGroup(groupId);
      }
      
      // Handle drag movement - merge cells as we drag over them
      if (!first && !last) {
        const clientX = 'clientX' in event ? event.clientX : ('touches' in event ? event.touches?.[0]?.clientX : undefined);
        const clientY = 'clientY' in event ? event.clientY : ('touches' in event ? event.touches?.[0]?.clientY : undefined);
        
        if (clientX !== undefined && clientY !== undefined) {
          const cellCoords = getCellFromCoordinates(clientX, clientY);
          
          if (cellCoords) {
            const { row: currentRow, col: currentCol } = cellCoords;
            const groupId = slab.cells[currentRow][currentCol].groupId;

            // Only handle dragging if we've left the starting cell
            if (dragStartCell && currentRow === dragStartCell.row && currentCol === dragStartCell.col) {
              return;
            }

            // If moving diagonally from the last visited cell, also merge an adjacent intermediate cell (prefer lower)
            const prevCell = lastDragCellRef.current;
            if (prevCell && (prevCell.row !== currentRow || prevCell.col !== currentCol)) {
              const dRow = Math.abs(currentRow - prevCell.row);
              const dCol = Math.abs(currentCol - prevCell.col);
              if (dRow === 1 && dCol === 1) {
                const candidateA = { row: currentRow, col: prevCell.col }; // vertical then horizontal
                const candidateB = { row: prevCell.row, col: currentCol }; // horizontal then vertical
                const lowerCandidate = candidateA.row >= candidateB.row ? candidateA : candidateB;
                const adjGroupId = slab.cells[lowerCandidate.row][lowerCandidate.col].groupId;
                if (firstGroup !== null && adjGroupId !== firstGroup) {
                  const cellKey = `${lowerCandidate.row},${lowerCandidate.col}`;
                  setEncounteredCells(prev => {
                    if (prev.has(cellKey)) return new Set(prev);
                    setSlab(prevSlab => {
                      const newSlab = { ...prevSlab };
                      const newGroups = { ...prevSlab.groups };
                      // Only merge the individual cell, not the entire group
                      newSlab.cells[lowerCandidate.row][lowerCandidate.col] = {
                        ...newSlab.cells[lowerCandidate.row][lowerCandidate.col],
                        groupId: firstGroup
                      };
                      // Check if the original group still has any cells
                      const hasRemainingCells = newSlab.cells.some(rowArr => 
                        rowArr.some(cell => cell.groupId === adjGroupId)
                      );
                      if (!hasRemainingCells) {
                        delete newGroups[adjGroupId];
                      }
                      newSlab.groups = newGroups;
                      // Immediately check for and split disconnected groups
                      return splitDisconnectedGroups(newSlab);
                    });
                    const next = new Set(prev);
                    next.add(cellKey);
                    return next;
                  });
                }
              }
            }

            // As we drag, merge only the individual cell we're dragging over
            if (firstGroup !== null && groupId !== firstGroup) {
              const cellKey = `${currentRow},${currentCol}`;
              setEncounteredCells(prev => {
                if (prev.has(cellKey)) return new Set(prev);

                setSlab(prevSlab => {
                  const newSlab = { ...prevSlab };
                  const newGroups = { ...prevSlab.groups };
                  // Only merge the individual cell, not the entire group
                  newSlab.cells[currentRow][currentCol] = {
                    ...newSlab.cells[currentRow][currentCol],
                    groupId: firstGroup
                  };
                  // Check if the original group still has any cells
                  const hasRemainingCells = newSlab.cells.some(rowArr => 
                    rowArr.some(cell => cell.groupId === groupId)
                  );
                  if (!hasRemainingCells) {
                    delete newGroups[groupId];
                  }
                  newSlab.groups = newGroups;
                  // Immediately check for and split disconnected groups
                  return splitDisconnectedGroups(newSlab);
                });

                const next = new Set(prev);
                next.add(cellKey);
                return next;
              });
            }

            // Update last visited cell
            lastDragCellRef.current = { row: currentRow, col: currentCol };
          }
        }
      }
      
      if (last) {
        // If anything merged during drag, persist the pre-drag snapshot
        if (preDragSnapshotRef.current && encounteredCells.size > 1) {
          pushHistory(preDragSnapshotRef.current);
        }

        // Reset drag state (cells have already been updated during drag)
        setIsDragging(false);
        setEncounteredCells(new Set());
        setFirstGroup(null);
        setDragStartCell(null);
        preDragSnapshotRef.current = null;
        lastDragCellRef.current = null;
      }
    },
    onClick: ({ args }) => {
      const [row, col] = args as [number, number];
      // Single tap - select/deselect group
      const groupId = slab.cells[row][col].groupId;
      if (selectedGroup === groupId) {
        // Tapping the selected group again deselects it
        setSelectedGroup(null);
      } else {
        setSelectedGroup(groupId);
      }
    },
    onDoubleClick: ({ event, args }) => {
      const [row, col] = args as [number, number];
      // Double tap - split group into unique IDs
      event.preventDefault();
      pushHistory(cloneSlab(slab));
      const targetGroupId = slab.cells[row][col].groupId;
      
      // Find all cells in the same group
      const cellsInGroup: {row: number, col: number}[] = [];
      for (let r = 0; r < 6; r++) {
        for (let c = 0; c < 6; c++) {
          if (slab.cells[r][c].groupId === targetGroupId) {
            cellsInGroup.push({row: r, col: c});
          }
        }
      }
      
      // Assign unique group IDs to each cell in the group
      setSlab(prevSlab => {
        const newSlab = { ...prevSlab };
        const newGroups = { ...prevSlab.groups };
        const originalGroup = prevSlab.groups[targetGroupId];
        
        if (!originalGroup) return newSlab; // Safety check
        
        cellsInGroup.forEach((cell) => {
          const newGroupId = 6 * cell.row + cell.col; // Use cell position as unique ID
          
          // Update cell to point to new group
          newSlab.cells[cell.row][cell.col] = {
            ...newSlab.cells[cell.row][cell.col],
            groupId: newGroupId
          };
          
          // Create new group with same color as original
          newGroups[newGroupId] = {
            id: newGroupId,
            color: originalGroup.color
          };
        });
        
        newSlab.groups = newGroups;
        return newSlab;
      });
      
      // After breaking apart, check for and split any disconnected groups
      setSlab(prevSlab => splitDisconnectedGroups(prevSlab));
    }
  }, {
    drag: {
      filterTaps: true, // Prevent tap events when dragging
      threshold: 5, // Minimum movement to start drag
    }
  });

  // Helper function to get border styles and corner radii based on neighbors
  const getBorderStyles = (row: number, col: number) => {
    const currentGroupId = slab.cells[row][col].groupId;
    const isSelected = selectedGroup === currentGroupId;
    const borderColor = isSelected ? '#ffff00' : 'white'; // Yellow for selected, white for normal
    const borderWidth = isSelected ? '3px' : '3px';
    
    const sameTop = row > 0 && slab.cells[row - 1][col].groupId === currentGroupId;
    const sameRight = col < 5 && slab.cells[row][col + 1].groupId === currentGroupId;
    const sameBottom = row < 5 && slab.cells[row + 1][col].groupId === currentGroupId;
    const sameLeft = col > 0 && slab.cells[row][col - 1].groupId === currentGroupId;

    const radiusValue = '8px';

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
  const getConcaveCorners = (row: number, col: number) => {
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

  // Apply color to selected group
  const applyColorToGroup = (colorIndex: number) => {
    if (selectedGroup === null) return;
    // Persist snapshot before coloring
    pushHistory();
    
    setSlab(prevSlab => {
      const newSlab = { ...prevSlab };
      const newGroups = { ...prevSlab.groups };
      
      // Update the group's color
      const group = newGroups[selectedGroup];
      if (group) {
        newGroups[selectedGroup] = {
          ...group,
          color: colorIndex
        };
      }
      
      newSlab.groups = newGroups;
      return newSlab;
    });
  };


  return (
    <div className="p-4 w-full max-w-md mx-auto">
      {/* Color Swatches */}
      <div className="mb-2">
        <div className="flex justify-center gap-1 w-full">
          {colors.map((color, index) => (
            <button
              key={index}
              className={`flex-1 rounded cursor-pointer transition-all hover:scale-110 ${
                selectedGroup !== null ? 'opacity-100' : 'opacity-0 pointer-events-none'
              }`}
              style={{ 
                backgroundColor: color,
                aspectRatio: '1',
                maxWidth: '48px',
                maxHeight: '48px'
              }}
              onClick={() => applyColorToGroup(index)}
              title={`Color ${index}`}
            />
          ))}
        </div>
      </div>
      
      <div className="grid grid-cols-6 w-full" style={{ gridAutoRows: '1fr' }}>
        {slab.cells.map((row, rowIndex) => (
          <React.Fragment key={rowIndex}>
            {row.map((cell, colIndex) => (
              <div
                key={`${rowIndex}-${colIndex}`}
                className="relative aspect-square w-full h-full flex items-center justify-center text-xs font-mono cursor-pointer transition-opacity select-none"
                style={{
                  backgroundColor: colors[getGroup(slab.groups, cell.groupId)?.color || 0],
                  color: (getGroup(slab.groups, cell.groupId)?.color || 0) === 0 ? '#000' : '#fff',
                  ...getBorderStyles(rowIndex, colIndex),
                  touchAction: 'none'
                }}
                title={`Group: ${cell.groupId}, Color: ${getGroup(slab.groups, cell.groupId)?.color || 0}`}
                data-cell-coords={`${rowIndex},${colIndex}`}
                {...bindCellGestures(rowIndex, colIndex)}
              >
                {/* Colorblind overlay */}
                {colorblindMode !== 'none' && getColorblindOverlay && (() => {
                  const colorIndex = getGroup(slab.groups, cell.groupId)?.color || 0;
                  const overlay = getColorblindOverlay(colorIndex);
                  if (!overlay) return null;
                  
                  return (
                    <div 
                      className="absolute inset-0 flex items-center justify-center text-sm font-normal pointer-events-none"
                      style={{
                        color: colorIndex === 0 ? '#000' : '#fff',
                        textShadow: colorIndex === 0 ? '1px 1px 2px rgba(255,255,255,0.8)' : '1px 1px 2px rgba(0,0,0,0.8)',
                        zIndex: 2
                      }}
                    >
                      {overlay}
                    </div>
                  );
                })()}
                {(() => {
                  const concave = getConcaveCorners(rowIndex, colIndex);
                  const dotSize = 8;
                  const offset = '-5px'
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
      
      {/* Control Buttons */}
      {!hideControls && (
      <div className="mt-2">
        <div className="flex justify-between items-center">
          {/* Left group: Undo, Reset */}
          <div className="flex gap-2">
            <button
              className={`px-3 py-2 rounded text-sm bg-gray-100 h-12 flex items-center justify-center ${history.length === 0 ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-200'}`}
              onClick={handleUndo}
              disabled={history.length === 0}
              title={history.length === 0 ? 'Nothing to undo' : 'Undo last action'}
            >
              <FiRotateCcw size={16} />
            </button>
            <button
              className="px-3 py-2 rounded text-sm bg-gray-100 hover:bg-gray-200 h-12 flex items-center justify-center"
              onClick={handleReset}
              title="Reset to a new slab"
            >
              <FiRefreshCw size={16} />
            </button>
          </div>
          
          {/* Center group: Shuffle, Sort */}
          <div className="flex gap-2">
            {onShuffle && (
              <button
                className="px-3 py-2 rounded text-sm bg-gray-100 hover:bg-gray-200 flex items-center justify-center h-12"
                onClick={() => {
                  if (puzzle) analytics.slabsShuffled(puzzle);
                  onShuffle();
                }}
                title="Randomize slab order"
              >
                <PiShuffleBold size={16} />
              </button>
            )}
            {onSort && (
              <button
                className="px-3 py-2 rounded text-sm bg-gray-100 hover:bg-gray-200 flex items-center justify-center h-12"
                onClick={() => {
                  if (puzzle) analytics.slabsSorted(puzzle);
                  onSort();
                }}
                title="Sort by evaluation (black first, then white)"
              >
                <FaArrowDownUpAcrossLine size={16} />
              </button>
            )}
          </div>
          
          {/* Right group: Create, Guess */}
          <div className="flex gap-2">
            <button
              className={`px-3 py-2 rounded text-sm h-12 flex items-center justify-center ${
                isInGuessSession 
                  ? 'bg-gray-400 text-white' 
                  : 'bg-blue-500 text-white hover:bg-blue-600'
              }`}
              onClick={() => {
                if (puzzle) analytics.slabCreated(puzzle, Object.keys(slab.groups).length);
                onCreate(slab);
              }}
              title={isInGuessSession ? "Complete your guess first" : "Create puzzle from current slab"}
            >
              <PiGavelFill size={24} />
            </button>
            {onGuess && (
              <button
                className={`px-3 py-2 rounded text-sm flex flex-col items-center justify-center h-12 transition-all duration-300 ${
                  flashGuessButton 
                    ? 'animate-pulse bg-yellow-400 text-white shadow-lg scale-110' 
                    : guessCount <= 0
                      ? 'bg-gray-400 text-white cursor-not-allowed'
                      : hasWon
                        ? 'bg-yellow-500 text-white hover:bg-yellow-600'
                        : isInGuessSession
                          ? 'bg-green-500 text-white hover:bg-green-600'
                          : 'bg-yellow-500 text-white hover:bg-yellow-600'
                }`}
                onClick={onGuess}
                disabled={guessCount <= 0}
                title={
                  hasWon 
                    ? "Puzzle completed!" 
                    : guessCount > 0 
                      ? "Attempt a guess" 
                      : "No guesses remaining"
                }
              >
                <FaLightbulb size={16} />
                <span className="text-xs">
                  {`${guessCount}/${maxGuesses}`}
                </span>
              </button>
            )}
          </div>
        </div>
      </div>
      )}
    </div>
  );
};

export default SlabMaker;
