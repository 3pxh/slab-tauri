import React from 'react';
import '../../slabAnimations.css';

const SPARKLE_COUNT = 8;
const BURST_RADIUS_PIXELS = 130;

const getSparkleOffsets = (sparkleIndex: number) => {
  const angle = (sparkleIndex / SPARKLE_COUNT) * Math.PI * 2;
  return {
    '--dx': `${Math.cos(angle) * BURST_RADIUS_PIXELS}px`,
    '--dy': `${Math.sin(angle) * BURST_RADIUS_PIXELS}px`
  } as React.CSSProperties;
};

const SparkleBurst: React.FC = () => (
  <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
    {Array.from({ length: SPARKLE_COUNT }, (_, sparkleIndex) => (
      <span
        key={sparkleIndex}
        className="sparkle-burst-item text-2xl"
        style={getSparkleOffsets(sparkleIndex)}
      >
        ✨
      </span>
    ))}
  </div>
);

export default SparkleBurst;
