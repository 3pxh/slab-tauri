import { useRef, useEffect, useState } from 'react';
import type { Slab} from '../slab';

interface CanvasGridProps {
  structure: Slab;
  width?: number;
  height?: number;
  duration?: number; // ms
}

// Helper: Map structure to a flat list of cell positions, using ratios
function flattenStructureWithRatios(structure: Slab, totalWidth: number, totalHeight: number) {
  const totalRowRatio = structure.reduce((sum, row) => sum + row.height, 0);
  let y = 0;
  return structure.flatMap((row, rowIdx) => {
    const rowHeightPx = totalRowRatio === 0 ? 0 : row.height / totalRowRatio * totalHeight;
    let x = 0;
    const rowY = y;
    y += rowHeightPx;
    const totalCellRatio = row.cells.reduce((sum, cell) => sum + cell.width, 0);
    const cells = row.cells.map((cell, colIdx) => {
      const cellWidthPx = totalCellRatio === 0 ? 0 : cell.width / totalCellRatio * totalWidth;
      const cellX = x;
      x += cellWidthPx;
      // Generate a synthetic id for mapping/interpolation
      const syntheticId = `r${rowIdx}c${colIdx}`;
      return {
        syntheticId,
        x: cellX,
        y: rowY,
        width: cellWidthPx,
        height: rowHeightPx,
        color: cell.color || '#FFF',
        slab: cell.slab,
        diagonal: cell.diagonal,
      };
    });
    return cells;
  });
}

// Interpolate between two slabs, matching rows and cells by index
function interpolateSlabs(from: Slab, to: Slab, t: number): Slab {
  const maxRows = Math.max(from.length, to.length);
  const result: Slab = [];
  for (let r = 0; r < maxRows; r++) {
    const fromRow = from[r] || { height: 0, cells: [] };
    const toRow = to[r] || { height: 0, cells: [] };
    const maxCells = Math.max(fromRow.cells.length, toRow.cells.length);
    const cells = [];
    for (let c = 0; c < maxCells; c++) {
      const fromCell = fromRow.cells[c] || { width: 0 };
      const toCell = toRow.cells[c] || { width: 0 };
      // Recursively animate nested slabs if present
      let animatedSlab = undefined;
      if (fromCell.slab || toCell.slab) {
        animatedSlab = interpolateSlabs(fromCell.slab || [], toCell.slab || [], t);
      }
      cells.push({
        width: fromCell.width + (toCell.width - fromCell.width) * t,
        color: toCell.color || fromCell.color,
        slab: animatedSlab,
        diagonal: toCell.diagonal ?? fromCell.diagonal,
      });
    }
    result.push({
      height: fromRow.height + (toRow.height - fromRow.height) * t,
      cells,
    });
  }
  return result;
}

class AnimationController {
  ctx: CanvasRenderingContext2D;
  width: number;
  height: number;
  duration: number;
  current: Slab;
  target: Slab | null = null;
  pending: Slab | null = null;
  isAnimating = false;
  noBorders: boolean = false;

  constructor(ctx: CanvasRenderingContext2D, width: number, height: number, duration: number, initial: Slab) {
    this.ctx = ctx;
    this.width = width;
    this.height = height;
    this.duration = duration;
    this.current = initial;
  }

  setStructure(newStructure: Slab) {
    if (this.isAnimating) {
      this.pending = newStructure;
    } else {
      this.animateTo(newStructure);
    }
  }

  animateTo(target: Slab) {
    this.isAnimating = true;
    this.target = target;
    const start = performance.now();
    const from = this.current;
    const duration = this.duration;
    const step = (now: number) => {
      const t = Math.min((now - start) / duration, 1);
      const interp = interpolateSlabs(from, target, t);
      this.draw(interp);
      if (t < 1) {
        requestAnimationFrame(step);
      } else {
        this.current = target;
        this.isAnimating = false;
        this.target = null;
        if (this.pending) {
          const next = this.pending;
          this.pending = null;
          this.animateTo(next);
        } else {
          this.draw(this.current);
        }
      }
    };
    requestAnimationFrame(step);
  }

  draw(structure: Slab, bounds?: { x: number; y: number; width: number; height: number }) {
    const actualBounds = bounds || { x: 0, y: 0, width: this.width, height: this.height };
    
    if (!bounds) {
      // Only clear the canvas when drawing the main structure
      this.ctx.clearRect(0, 0, this.width, this.height);
      // Fill with white background
      this.ctx.fillStyle = '#FFF';
      this.ctx.fillRect(0, 0, this.width, this.height);
    }
    
    this.ctx.save();
    this.ctx.translate(actualBounds.x, actualBounds.y);
    const cells = flattenStructureWithRatios(structure, actualBounds.width, actualBounds.height);
    for (const cell of cells) {
      this.ctx.save();
      if (!cell.slab || !Array.isArray(cell.slab) || cell.slab.length === 0) {
        this.ctx.fillStyle = cell.color || '#FFF';
        
        if (cell.diagonal) {
          // Draw a triangle based on diagonal type
          this.ctx.beginPath();
          switch (cell.diagonal) {
            case 'forward':
              this.ctx.moveTo(cell.x, cell.y + cell.height + 1);
              this.ctx.lineTo(cell.x + cell.width + 1, cell.y + cell.height + 1);
              this.ctx.lineTo(cell.x + cell.width + 1, cell.y);
              break;
            case 'backward':
              this.ctx.moveTo(cell.x, cell.y);
              this.ctx.lineTo(cell.x, cell.y + cell.height + 1);
              this.ctx.lineTo(cell.x + cell.width + 1, cell.y + cell.height + 1);
              break;
            case 'forward-flip':
              this.ctx.moveTo(cell.x, cell.y);
              this.ctx.lineTo(cell.x + cell.width + 1, cell.y);
              this.ctx.lineTo(cell.x, cell.y + cell.height + 1);
              break;
            case 'backward-flip':
              this.ctx.moveTo(cell.x, cell.y);
              this.ctx.lineTo(cell.x + cell.width + 1, cell.y);
              this.ctx.lineTo(cell.x + cell.width + 1, cell.y + cell.height + 1);
              break;
          }
          this.ctx.closePath();
          this.ctx.fill();
        } else {
          // Draw rectangle
          this.ctx.fillRect(cell.x, cell.y, cell.width + 1, cell.height + 1);
        }
        
        if (!this.noBorders) {
          this.ctx.strokeStyle = '#FFF';
          this.ctx.lineWidth = 1;
          this.ctx.strokeRect(Math.floor(cell.x) + 0.5, Math.floor(cell.y) + 0.5, Math.max(0, Math.ceil(cell.width)), Math.max(0, Math.ceil(cell.height)));
        }
      }
      if (cell.slab) {
        this.draw(cell.slab, { x: cell.x, y: cell.y, width: cell.width, height: cell.height });
      }
      this.ctx.restore();
    }
    this.ctx.restore();
  }
}

export default function CanvasGrid({ structure, width = 800, height = 600, duration = 400 }: CanvasGridProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const controllerRef = useRef<AnimationController | null>(null);
  const [canvasSize, setCanvasSize] = useState({ width, height });
  const [hovered, setHovered] = useState(false);

  // Resize canvas to fit parent with proper pixel density
  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current && canvasRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;
        const displayWidth = rect.width;
        const displayHeight = rect.height;
        
        // Set the canvas size in memory (scaled up for high DPI)
        canvasRef.current.width = displayWidth * dpr;
        canvasRef.current.height = displayHeight * dpr;
        
        // Set the canvas size in CSS pixels
        canvasRef.current.style.width = displayWidth + 'px';
        canvasRef.current.style.height = displayHeight + 'px';
        
        // Scale the drawing context so everything draws at the correct size
        const ctx = canvasRef.current.getContext('2d');
        if (ctx) {
          ctx.scale(dpr, dpr);
        }
        
        setCanvasSize({ width: displayWidth, height: displayHeight });
      }
    };

    updateSize();
    const resizeObserver = new ResizeObserver(updateSize);
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    return () => resizeObserver.disconnect();
  }, []);

  // Redraw on hover state change
  useEffect(() => {
    if (controllerRef.current) {
      controllerRef.current.noBorders = !hovered;
      controllerRef.current.draw(structure);
    }
  }, [hovered, structure]);

  useEffect(() => {
    const ctx = canvasRef.current!.getContext('2d')!;
    if (!controllerRef.current) {
      controllerRef.current = new AnimationController(ctx, canvasSize.width, canvasSize.height, duration, structure);
      controllerRef.current.noBorders = !hovered;
      controllerRef.current.draw(structure);
    } else {
      controllerRef.current.width = canvasSize.width;
      controllerRef.current.height = canvasSize.height;
      controllerRef.current.noBorders = !hovered;
      controllerRef.current.setStructure(structure);
    }
  }, [structure, canvasSize.width, canvasSize.height, duration, hovered]);

  return (
    <div ref={containerRef} style={{ width: '100%', height: '100%' }}>
      <canvas 
        ref={canvasRef} 
        style={{ display: 'block', background: '#222', width: '100%', height: '100%' }} 
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      />
    </div>
  );
} 