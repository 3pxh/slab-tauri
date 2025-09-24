import React from 'react';

// Define the Slab data structure
interface Group {
  id: number;
  color: number;
}

interface Cell {
  groupId: number;
}

interface Slab {
  cells: Cell[][];
  groups: Map<number, Group>;
}

// Color array: gray, red, blue, yellow, and secondary colors
const COLORS = [
  '#808080', // gray
  '#FF0000', // red
  '#0000FF', // blue
  '#FFFF00', // yellow
  '#FF8000', // orange
  '#8000FF', // purple
  '#00FF00', // green
  '#FF0080', // pink
  '#00FFFF', // cyan
  '#800000', // maroon
  '#008000', // olive
  '#000080', // navy
];

// Initialize a new Slab with 6x6 grid
const createSlab = (): Slab => {
  const cells: Cell[][] = [];
  const groups = new Map<number, Group>();
  
  for (let row = 0; row < 6; row++) {
    cells[row] = [];
    for (let col = 0; col < 6; col++) {
      const groupId = 6 * row + col;
      cells[row][col] = {
        groupId: groupId
      };
      
      // Create group if it doesn't exist
      if (!groups.has(groupId)) {
        groups.set(groupId, {
          id: groupId,
          color: 0 // Initialize to gray
        });
      }
    }
  }
  
  return { cells, groups };
};

const SlabMaker: React.FC = () => {
  const [slab, setSlab] = React.useState<Slab>(() => createSlab());
  const [isDragging, setIsDragging] = React.useState(false);
  const [encounteredGroups, setEncounteredGroups] = React.useState<Set<number>>(new Set());
  const [firstGroup, setFirstGroup] = React.useState<number | null>(null);
  const [dragStartCell, setDragStartCell] = React.useState<{row: number, col: number} | null>(null);
  const [selectedGroup, setSelectedGroup] = React.useState<number | null>(null);
  const [lastTapTime, setLastTapTime] = React.useState<number>(0);
  const [lastTapCell, setLastTapCell] = React.useState<{row: number, col: number} | null>(null);

  // Helper function to get coordinates from event
  const getEventCoordinates = (event: React.MouseEvent | React.TouchEvent) => {
    if ('touches' in event) {
      return {
        clientX: event.touches[0].clientX,
        clientY: event.touches[0].clientY
      };
    }
    return {
      clientX: event.clientX,
      clientY: event.clientY
    };
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

  // Start drag operation
  const handleDragStart = (event: React.MouseEvent | React.TouchEvent, row: number, col: number) => {
    event.preventDefault();
    const groupId = slab.cells[row][col].groupId;
    
    setIsDragging(true);
    setFirstGroup(groupId);
    setEncounteredGroups(new Set([groupId]));
    setDragStartCell({ row, col });
  };

  // Continue drag operation
  const handleDragMove = (event: React.MouseEvent | React.TouchEvent) => {
    if (!isDragging) return;
    
    const { clientX, clientY } = getEventCoordinates(event);
    const cellCoords = getCellFromCoordinates(clientX, clientY);
    
    if (cellCoords) {
      const { row, col } = cellCoords;
      const groupId = slab.cells[row][col].groupId;

      // Only handle dragging if we've left the starting cell
      if (dragStartCell && row === dragStartCell.row && col === dragStartCell.col) {
        return;
      }

      // As we drag, merge the entire encountered group into the starting group
      if (firstGroup !== null && groupId !== firstGroup) {
        setEncounteredGroups(prev => {
          if (prev.has(groupId)) return new Set(prev);

          setSlab(prevSlab => {
            const newSlab = { ...prevSlab };
            const newGroups = new Map(prevSlab.groups);
            // Reassign all cells of the encountered group to the first group
            newSlab.cells = prevSlab.cells.map(rowArr =>
              rowArr.map(cell => (
                cell.groupId === groupId ? { ...cell, groupId: firstGroup } : cell
              ))
            );
            // Remove the merged group's entry
            newGroups.delete(groupId);
            newSlab.groups = newGroups;
            return newSlab;
          });

          const next = new Set(prev);
          next.add(groupId);
          return next;
        });
      }
    }
  };

  // End drag operation and merge groups
  const handleDragEnd = () => {
    if (!isDragging) return;

    // Reset drag state (cells have already been updated during drag)
    setIsDragging(false);
    setEncounteredGroups(new Set());
    setFirstGroup(null);
    setDragStartCell(null);
  };

  // Handle double-tap to split group into unique IDs
  const handleDoubleTap = (row: number, col: number) => {
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
      const newGroups = new Map(prevSlab.groups);
      const originalGroup = prevSlab.groups.get(targetGroupId);
      
      if (!originalGroup) return newSlab; // Safety check
      
      cellsInGroup.forEach((cell) => {
        const newGroupId = 6 * cell.row + cell.col; // Use cell position as unique ID
        
        // Update cell to point to new group
        newSlab.cells[cell.row][cell.col] = {
          ...newSlab.cells[cell.row][cell.col],
          groupId: newGroupId
        };
        
        // Create new group with same color as original
        newGroups.set(newGroupId, {
          id: newGroupId,
          color: originalGroup.color
        });
      });
      
      newSlab.groups = newGroups;
      return newSlab;
    });
  };

  // Handle single tap/click
  const handleTap = (event: React.MouseEvent | React.TouchEvent, row: number, col: number) => {
    const currentTime = Date.now();
    const timeDiff = currentTime - lastTapTime;
    const isDoubleTap = timeDiff < 300 && // Within 300ms
                       lastTapCell && 
                       lastTapCell.row === row && 
                       lastTapCell.col === col;
    
    if (isDoubleTap) {
      event.preventDefault();
      handleDoubleTap(row, col);
      setLastTapTime(0); // Reset to prevent triple-tap
      setLastTapCell(null);
    } else {
      setLastTapTime(currentTime);
      setLastTapCell({row, col});
      
      // Select the group on single tap
      const groupId = slab.cells[row][col].groupId;
      setSelectedGroup(groupId);
    }
  };

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
    
    setSlab(prevSlab => {
      const newSlab = { ...prevSlab };
      const newGroups = new Map(prevSlab.groups);
      
      // Update the group's color
      const group = newGroups.get(selectedGroup);
      if (group) {
        newGroups.set(selectedGroup, {
          ...group,
          color: colorIndex
        });
      }
      
      newSlab.groups = newGroups;
      return newSlab;
    });
    
    // Deselect the group after applying color
    setSelectedGroup(null);
  };

  // Add global event listeners for drag operations
  React.useEffect(() => {
    const handleGlobalMouseMove = (event: MouseEvent) => {
      handleDragMove(event as any);
    };

    const handleGlobalMouseUp = () => {
      handleDragEnd();
    };

    const handleGlobalTouchMove = (event: TouchEvent) => {
      handleDragMove(event as any);
    };

    const handleGlobalTouchEnd = () => {
      handleDragEnd();
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleGlobalMouseMove);
      document.addEventListener('mouseup', handleGlobalMouseUp);
      document.addEventListener('touchmove', handleGlobalTouchMove, { passive: false });
      document.addEventListener('touchend', handleGlobalTouchEnd);
    }

    return () => {
      document.removeEventListener('mousemove', handleGlobalMouseMove);
      document.removeEventListener('mouseup', handleGlobalMouseUp);
      document.removeEventListener('touchmove', handleGlobalTouchMove);
      document.removeEventListener('touchend', handleGlobalTouchEnd);
    };
  }, [isDragging, encounteredGroups, firstGroup]);

  return (
    <div className="p-4 w-full">
      <div className="grid grid-cols-6 w-full max-w-screen mx-auto" style={{ gridAutoRows: '1fr' }}>
        {slab.cells.map((row, rowIndex) => (
          <React.Fragment key={rowIndex}>
            {row.map((cell, colIndex) => (
              <div
                key={`${rowIndex}-${colIndex}`}
                className="relative aspect-square w-full h-full flex items-center justify-center text-xs font-mono cursor-pointer hover:opacity-80 transition-opacity select-none"
                style={{
                  backgroundColor: COLORS[slab.groups.get(cell.groupId)?.color || 0],
                  color: (slab.groups.get(cell.groupId)?.color || 0) === 0 ? '#000' : '#fff',
                  ...getBorderStyles(rowIndex, colIndex)
                }}
                title={`Group: ${cell.groupId}, Color: ${slab.groups.get(cell.groupId)?.color || 0}`}
                data-cell-coords={`${rowIndex},${colIndex}`}
                onMouseDown={(e) => {
                  handleTap(e, rowIndex, colIndex);
                  handleDragStart(e, rowIndex, colIndex);
                }}
                onTouchStart={(e) => {
                  handleTap(e, rowIndex, colIndex);
                  handleDragStart(e, rowIndex, colIndex);
                }}
              >
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
      
      {/* Color Swatches */}
      {selectedGroup !== null && (
        <div className="mt-8">
          <div className="flex flex-wrap justify-center gap-2">
            {COLORS.map((color, index) => (
              <button
                key={index}
                className="w-12 h-12 border-2 border-gray-300 hover:border-gray-500 rounded cursor-pointer transition-all hover:scale-110"
                style={{ backgroundColor: color }}
                onClick={() => applyColorToGroup(index)}
                title={`Color ${index}`}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default SlabMaker;
