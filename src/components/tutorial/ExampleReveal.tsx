import React from 'react';
import { FiStar, FiX } from 'react-icons/fi';
import Slab, { SlabData } from '../Slab';
import NextArrowButton from './NextArrowButton';
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

const BADGE_OUTLINE_FILTER =
  'drop-shadow(1px 1px 0 white) drop-shadow(-1px -1px 0 white) drop-shadow(1px -1px 0 white) drop-shadow(-1px 1px 0 white)';

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
        <div
          className="verdict-mark-pop absolute -top-5 -right-5"
          style={{ filter: BADGE_OUTLINE_FILTER }}
        >
          {passes ? (
            <FiStar size={44} className="fill-yellow-400 text-yellow-500" />
          ) : (
            <FiX size={44} className="text-red-500" />
          )}
        </div>
      </div>

      <div className="h-16 flex items-center justify-center">
        {!isProceeding && <NextArrowButton onClick={onNext} />}
      </div>
    </div>
  );
};

export default ExampleReveal;
