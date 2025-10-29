import React from 'react';
import { FiRotateCcw, FiRefreshCw } from 'react-icons/fi';
import { useGesture } from '@use-gesture/react';
import { SlabData, createSlab, Cell, COLORS, getGroup, mapColorIndex } from './Slab';
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
  colors?: string[];
  colorblindMode?: 'none' | 'icon' | 'number' | 'letter';
  getColorblindOverlay?: (colorIndex: number) => string | null;
  puzzle?: any; // Add puzzle prop for analytics
  hideControls?: boolean; // Hide control buttons for tutorial
  showRuleButton?: boolean; // Show the rule description button
  onShowRuleModal?: () => void; // Callback to show rule modal
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
  colors = COLORS,
  colorblindMode = 'none',
  getColorblindOverlay,
  puzzle,
  hideControls = false,
  showRuleButton = false,
  onShowRuleModal
}) => {
  const [slab, setSlab] = React.useState<SlabData>(() => createSlab());
  const [history, setHistory] = React.useState<SlabData[]>([]);
  const [, setIsDragging] = React.useState(false);
  const [encounteredCells, setEncounteredCells] = React.useState<Set<string>>(new Set());
  const [firstGroup, setFirstGroup] = React.useState<number | null>(null);
  const [dragStartCell, setDragStartCell] = React.useState<{row: number, col: number} | null>(null);
  const [selectedCell, setSelectedCell] = React.useState<{row: number, col: number} | null>(null);
  const [activeColor, setActiveColor] = React.useState<number | null>(null);

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
      setSelectedCell(null);
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


  // Helper: reallocate all group IDs to ensure they're within 0-35 range while preserving colors
  const reallocateGroupIds = (slab: SlabData): SlabData => {
    const newSlab = cloneSlab(slab);
    const usedIds = new Set<number>();
    const groupMapping = new Map<number, number>();
    
    // First, collect all unique group IDs from cells
    const allGroupIds = new Set<number>();
    for (let r = 0; r < 6; r++) {
      for (let c = 0; c < 6; c++) {
        allGroupIds.add(slab.cells[r][c].groupId);
      }
    }
    
    // Create a mapping from old group ID to new group ID, preserving colors
    let nextId = 0;
    for (const oldGroupId of allGroupIds) {
      // Find next available ID
      while (nextId <= 35 && usedIds.has(nextId)) {
        nextId++;
      }
      
      if (nextId > 35) {
        console.error('Cannot reallocate all group IDs within 0-35 range');
        return newSlab; // Return unchanged if we can't fit
      }
      
      groupMapping.set(oldGroupId, nextId);
      usedIds.add(nextId);
      nextId++;
    }
    
    // Update all cells with new group IDs
    for (let r = 0; r < 6; r++) {
      for (let c = 0; c < 6; c++) {
        const oldGroupId = newSlab.cells[r][c].groupId;
        const newGroupId = groupMapping.get(oldGroupId);
        if (newGroupId !== undefined) {
          newSlab.cells[r][c] = {
            ...newSlab.cells[r][c],
            groupId: newGroupId
          };
        }
      }
    }
    
    // Update groups object with new IDs, preserving colors
    const newGroups: Record<number, any> = {};
    for (const [oldGroupId, newGroupId] of groupMapping) {
      const originalGroup = newSlab.groups[oldGroupId];
      if (originalGroup) {
        newGroups[newGroupId] = {
          ...originalGroup,
          id: newGroupId
        };
      }
    }
    newSlab.groups = newGroups;
    
    return newSlab;
  };

  // Helper: reassign group IDs to ensure they're all within 0-35 range
  const reassignGroupIds = (slab: SlabData): SlabData => {
    const newSlab = cloneSlab(slab);
    const usedIds = new Set<number>();
    const groupMapping = new Map<number, number>();
    
    // First, collect all unique group IDs from cells
    const allGroupIds = new Set<number>();
    for (let r = 0; r < 6; r++) {
      for (let c = 0; c < 6; c++) {
        allGroupIds.add(slab.cells[r][c].groupId);
      }
    }
    
    // Only reassign groups that are outside the 0-35 range
    const groupsToReassign = Array.from(allGroupIds).filter(id => id < 0 || id > 35);
    const groupsToKeep = Array.from(allGroupIds).filter(id => id >= 0 && id <= 35);
    
    // Mark existing valid IDs as used
    groupsToKeep.forEach(id => usedIds.add(id));
    
    // Assign new IDs for groups that need reassignment
    let nextId = 0;
    for (const oldGroupId of groupsToReassign) {
      // Find next available ID
      while (nextId <= 35 && usedIds.has(nextId)) {
        nextId++;
      }
      
      if (nextId > 35) {
        console.error('Cannot reassign all group IDs within 0-35 range');
        return newSlab; // Return unchanged if we can't fit
      }
      
      groupMapping.set(oldGroupId, nextId);
      usedIds.add(nextId);
      nextId++;
    }
    
    // Update cells with new group IDs (only for reassigned groups)
    for (let r = 0; r < 6; r++) {
      for (let c = 0; c < 6; c++) {
        const oldGroupId = newSlab.cells[r][c].groupId;
        const newGroupId = groupMapping.get(oldGroupId);
        if (newGroupId !== undefined) {
          newSlab.cells[r][c] = {
            ...newSlab.cells[r][c],
            groupId: newGroupId
          };
        }
      }
    }
    
    // Update groups object with new IDs (only for reassigned groups)
    for (const [oldGroupId, newGroupId] of groupMapping) {
      const originalGroup = newSlab.groups[oldGroupId];
      if (originalGroup) {
        newSlab.groups[newGroupId] = {
          ...originalGroup,
          id: newGroupId
        };
        // Remove the old group entry
        delete newSlab.groups[oldGroupId];
      }
    }
    
    return newSlab;
  };

  // Helper: split disconnected groups into separate groups
  const splitDisconnectedGroups = (slab: SlabData): SlabData => {
    const newSlab = cloneSlab(slab);
    const groupsToCheck = Object.keys(slab.groups).map(Number);
    
    // Track which groups need to be split
    const groupsToSplit: {groupId: number, components: {row: number, col: number}[][]}[] = [];
    
    // First pass: identify groups that need splitting
    for (const groupId of groupsToCheck) {
      const components = findConnectedComponents(groupId, newSlab.cells);
      if (components.length > 1) {
        groupsToSplit.push({ groupId, components });
      }
    }
    
    // If no groups need splitting, return early
    if (groupsToSplit.length === 0) {
      return newSlab;
    }
    
    // Second pass: split the groups
    for (const { groupId, components } of groupsToSplit) {
      const originalGroup = newSlab.groups[groupId];
      if (!originalGroup) continue;
      
      // Keep the first component with the original group ID
      // Create new groups for the remaining components
      for (let i = 1; i < components.length; i++) {
        const component = components[i];
        // Use a temporary high ID that won't conflict with existing groups
        // We'll clean these up later with reallocateGroupIds
        const newGroupId = 2000 + (groupId * 100) + i; // Ensure uniqueness
        
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
    
    // Final step: ensure all group IDs are within 0-35 range
    return reallocateGroupIds(newSlab);
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
      setSelectedCell(null);
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
    setSelectedCell(null);
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
        // Select the cell we're dragging from
        setSelectedCell({ row, col });
        // If there's an active color, apply it to the group we're dragging from
        if (activeColor !== null) {
          applyColorToGroup(activeColor, { row, col });
        }
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
                      return newSlab;
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
                  return newSlab;
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
        
        // Now that dragging is complete, check for and split any disconnected groups
        setSlab(prevSlab => {
          const splitSlab = splitDisconnectedGroups(prevSlab);
          // Check if we need to reallocate due to too many groups
          const allGroupIds = new Set<number>();
          for (let r = 0; r < 6; r++) {
            for (let c = 0; c < 6; c++) {
              allGroupIds.add(splitSlab.cells[r][c].groupId);
            }
          }
          const hasInvalidIds = Array.from(allGroupIds).some(id => id < 0 || id > 35);
          return hasInvalidIds ? reallocateGroupIds(splitSlab) : reassignGroupIds(splitSlab);
        });
      }
    },
    onClick: ({ args }) => {
      const [row, col] = args as [number, number];
      // Single tap - select/deselect cell
      if (selectedCell && selectedCell.row === row && selectedCell.col === col) {
        // Tapping the selected cell again deselects it
        setSelectedCell(null);
      } else {
        setSelectedCell({ row, col });
        // If there's an active color, apply it to the newly selected group
        if (activeColor !== null) {
          applyColorToGroup(activeColor, { row, col });
        }
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
        
        cellsInGroup.forEach((cell, index) => {
          // Use a temporary high ID that won't conflict with existing groups
          // We'll clean these up later with reallocateGroupIds
          const newGroupId = 1000 + (cell.row * 6 + cell.col) + (index * 100); // Ensure uniqueness
          
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
      
      // After breaking apart, always reallocate to clean up temporary high IDs
      setSlab(prevSlab => {
        const splitSlab = splitDisconnectedGroups(prevSlab);
        // Always use reallocateGroupIds to clean up temporary high IDs and ensure all IDs are in 0-35 range
        return reallocateGroupIds(splitSlab);
      });
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
    const selectedGroupId = selectedCell ? slab.cells[selectedCell.row][selectedCell.col].groupId : null;
    const isSelected = selectedCell && currentGroupId === selectedGroupId;
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
  const applyColorToGroup = (colorIndex: number, cellCoords?: {row: number, col: number}) => {
    const targetCell = cellCoords || selectedCell;
    if (targetCell === null) return;
    // Persist snapshot before coloring
    pushHistory();
    
    setSlab(prevSlab => {
      const newSlab = { ...prevSlab };
      const newGroups = { ...prevSlab.groups };
      
      // Get the group ID from the target cell
      const selectedGroupId = prevSlab.cells[targetCell.row][targetCell.col].groupId;
      
      // Update the group's color
      const group = newGroups[selectedGroupId];
      if (group) {
        newGroups[selectedGroupId] = {
          ...group,
          color: colorIndex
        };
      }
      
      newSlab.groups = newGroups;
      return newSlab;
    });
  };

  // Handle color swatch click - toggle active color
  const handleColorSwatchClick = (colorIndex: number) => {
    if (activeColor === colorIndex) {
      // If clicking the active color, deactivate it
      setActiveColor(null);
    } else {
      // Set this color as active
      setActiveColor(colorIndex);
      // If a group is selected, apply the color immediately
      if (selectedCell !== null) {
        applyColorToGroup(colorIndex);
      }
    }
  };


  return (
    <div className="p-4 w-full max-w-md mx-auto">
      <div className="grid grid-cols-6 w-full" style={{ gridAutoRows: '1fr' }}>
        {slab.cells.map((row, rowIndex) => (
          <React.Fragment key={rowIndex}>
            {row.map((cell, colIndex) => (
              <div
                key={`${rowIndex}-${colIndex}`}
                className="relative aspect-square w-full h-full flex items-center justify-center text-xs font-mono cursor-pointer transition-opacity select-none"
                style={{
                  backgroundColor: colors[mapColorIndex(getGroup(slab.groups, cell.groupId)?.color || 0, colors)],
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
                  const originalColorIndex = getGroup(slab.groups, cell.groupId)?.color || 0;
                  const mappedColorIndex = mapColorIndex(originalColorIndex, colors);
                  const overlay = getColorblindOverlay(mappedColorIndex);
                  if (!overlay) return null;
                  
                  return (
                    <div 
                      className="absolute inset-0 flex items-center justify-center text-sm font-normal pointer-events-none"
                      style={{
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
      
      {/* Color Swatches with Undo/Reset */}
      <div className="mt-2 mb-2">
        <div className="flex justify-center gap-1 w-full">
          {/* Undo button */}
          <button
            className={`px-2 py-2 rounded text-sm bg-gray-100 h-12 flex items-center justify-center ${history.length === 0 ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-200'}`}
            onClick={handleUndo}
            disabled={history.length === 0}
            title={history.length === 0 ? 'Nothing to undo' : 'Undo last action'}
          >
            <FiRotateCcw size={16} />
          </button>
          
          {/* Color swatches */}
          {colors.map((color, index) => (
            <button
              key={index}
              className="flex-1 rounded cursor-pointer transition-all hover:scale-110 relative"
              style={{ 
                backgroundColor: color,
                aspectRatio: '1',
                maxWidth: '48px',
                maxHeight: '48px'
              }}
              onClick={() => handleColorSwatchClick(index)}
              title={
                activeColor === index 
                  ? `Active color ${index} - click to deactivate` 
                  : `Color ${index} - click to activate`
              }
            >
              {activeColor === index && (
                <div 
                  className="absolute inset-0 flex items-center justify-center"
                  style={{ pointerEvents: 'none' }}
                >
                  <div 
                    className="rounded-full"
                    style={{
                      width: '16px',
                      height: '16px',
                      backgroundColor: 'white',
                      opacity: 0.9
                    }}
                  />
                </div>
              )}
            </button>
          ))}
          
          {/* Reset button */}
          <button
            className="px-2 py-2 rounded text-sm bg-gray-100 hover:bg-gray-200 h-12 flex items-center justify-center"
            onClick={handleReset}
            title="Reset to a new slab"
          >
            <FiRefreshCw size={16} />
          </button>
        </div>
      </div>
      
      {/* Control Buttons */}
      {!hideControls && (
      <div className="mt-2">
        <div className="flex justify-center items-center">
          {/* Create, Guess buttons */}
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
              <span className="text-sm font-medium">Evaluate Slab</span>
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
                <span className="text-sm font-medium">Guess</span>
                <span className="text-xs">
                  {`${guessCount}/${maxGuesses}`}
                </span>
              </button>
            )}
            {showRuleButton && puzzle?.rule_description && onShowRuleModal && (
              <button
                className="px-3 py-2 rounded text-sm flex items-center justify-center h-12 bg-gray-500 text-white hover:bg-gray-600 transition-colors"
                onClick={onShowRuleModal}
                title="View puzzle rules"
                aria-label="View puzzle rules"
              >
                <span className="text-sm font-medium">Show Rule</span>
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
