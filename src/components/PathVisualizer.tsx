import { useEffect, useRef, useState } from 'react';

interface PathVisualizerProps {
  path: string;
}

const PathVisualizer: React.FC<PathVisualizerProps> = ({ path }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // The canvas is set to 100% width and height, so we observe it directly.
    const resizeObserver = new ResizeObserver(entries => {
      for (let entry of entries) {
        const { width, height } = entry.contentRect;
        setDimensions({ width, height });
      }
    });

    resizeObserver.observe(canvas);

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const { width, height } = dimensions;

    if (width === 0 || height === 0) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.scale(dpr, dpr);

    // Clear the canvas
    ctx.clearRect(0, 0, width, height);

    // Calculate step size (3.5% of min dimension)
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
        case '/':
          y -= stepSize;
          x += stepSize;
          break;
        case '\\':
          y -= stepSize;
          x -= stepSize;
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
  }, [path, dimensions]);

  return (
    <canvas
      ref={canvasRef}
      style={{ border: '1px solid #ccc', width: '100%', height: '100%', display: 'block' }}
    />
  );
};

export default PathVisualizer; 