import { useEffect, useRef } from 'react';

interface PathVisualizerProps {
  path: string;
  width?: number;
  height?: number;
}

const PathVisualizer: React.FC<PathVisualizerProps> = ({ 
  path, 
  width = 400, 
  height = 400 
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear the canvas
    ctx.clearRect(0, 0, width, height);

    // Calculate step size (2% of min dimension)
    const stepSize = Math.min(width, height) * 0.035;

    // Start from center
    let x = width / 2;
    let y = height / 2;

    // Set up path drawing
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;

    // Process each direction
    for (const direction of path.toLowerCase()) {
      switch (direction) {
        case 'w':
          y -= stepSize;
          break;
        case 's':
          y += stepSize;
          break;
        case 'a':
          x -= stepSize;
          break;
        case 'd':
          x += stepSize;
          break;
      }
      ctx.lineTo(x, y);
    }

    // Draw the path
    ctx.stroke();

    // Draw the end point
    ctx.beginPath();
    ctx.arc(x, y, 4, 0, Math.PI * 2);
    ctx.fillStyle = '#ff0000';
    ctx.fill();
  }, [path, width, height]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      style={{ border: '1px solid #ccc' }}
    />
  );
};

export default PathVisualizer; 