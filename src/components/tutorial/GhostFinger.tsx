import React from 'react';
import '../../slabAnimations.css';

const FINGER_GLYPH = '👆';

type GhostFingerSwipeProps = {
  startColumn: number;
  endColumn: number;
  rowIndex: number;
  gridSize: number;
};

const toGridPercent = (index: number, gridSize: number): string => {
  return `${((index + 0.5) / gridSize) * 100}%`;
};

export const GhostFingerSwipe: React.FC<GhostFingerSwipeProps> = ({
  startColumn,
  endColumn,
  rowIndex,
  gridSize
}) => (
  <span
    className="ghost-finger ghost-finger-swipe"
    style={
      {
        '--finger-start-x': toGridPercent(startColumn, gridSize),
        '--finger-end-x': toGridPercent(endColumn, gridSize),
        '--finger-y': toGridPercent(rowIndex, gridSize)
      } as React.CSSProperties
    }
  >
    {FINGER_GLYPH}
  </span>
);

export const GhostFingerTap: React.FC = () => (
  <span className="ghost-finger ghost-finger-tap">{FINGER_GLYPH}</span>
);
