import React from 'react';
import Slab, { SlabData } from '../Slab';
import NextArrowButton from './NextArrowButton';
import { VerdictBadge } from './GuessIcons';
import { useSlabFlight } from '../../hooks/useSlabFlight';
import '../../slabAnimations.css';

type ExampleRevealProps = {
  slab: SlabData;
  colors: string[];
  passes: boolean;
  isProceeding: boolean;
  flightTargetRect: DOMRect | null;
  onFlightEnd: () => void;
  onNext: () => void;
};

const CORNER_BADGE_SIZE_PX = 64;

const ExampleReveal: React.FC<ExampleRevealProps> = ({
  slab,
  colors,
  passes,
  isProceeding,
  flightTargetRect,
  onFlightEnd,
  onNext
}) => {
  const flightRef = useSlabFlight(flightTargetRect, onFlightEnd);

  return (
    <div className="flex flex-col items-center gap-4 py-2">
      <div ref={flightRef} className="relative w-64 h-64">
        <div className="pop-in w-full h-full">
          <Slab slab={slab} size="large" className="w-full h-full shadow-lg" colors={colors} />
        </div>
        <div className="verdict-mark-pop absolute -top-6 -right-6 z-10">
          <VerdictBadge isStar={passes} sizePx={CORNER_BADGE_SIZE_PX} />
        </div>
      </div>

      <div className="h-16 flex items-center justify-center">
        {!isProceeding && <NextArrowButton onClick={onNext} />}
      </div>
    </div>
  );
};

export default ExampleReveal;
