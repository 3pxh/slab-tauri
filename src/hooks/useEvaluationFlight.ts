import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { SlabData, areSlabsEqual } from '../components/Slab';

const STAR_VIEWING_MS = 1000;

type EvaluationFlightOptions = {
  onLanded: (slab: SlabData) => void;
};

export const useEvaluationFlight = ({ onLanded }: EvaluationFlightOptions) => {
  const slotRef = useRef<HTMLDivElement>(null);
  const [pendingSlab, setPendingSlab] = useState<SlabData | null>(null);
  const [isSlotReserved, setIsSlotReserved] = useState(false);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);

  useEffect(() => {
    if (!pendingSlab) return;

    const timer = setTimeout(() => setIsSlotReserved(true), STAR_VIEWING_MS);
    return () => clearTimeout(timer);
  }, [pendingSlab]);

  useLayoutEffect(() => {
    const slot = slotRef.current;
    if (!isSlotReserved || !slot) return;

    slot.scrollIntoView({ block: 'nearest' });
    setTargetRect(slot.getBoundingClientRect());
  }, [isSlotReserved]);

  const begin = useCallback((slab: SlabData) => {
    setPendingSlab(slab);
  }, []);

  const cancelIfSlabEdited = useCallback(
    (editedSlab: SlabData) => {
      const isEditedBeforeFlight =
        pendingSlab && !isSlotReserved && !areSlabsEqual(pendingSlab, editedSlab);
      if (isEditedBeforeFlight) setPendingSlab(null);
    },
    [pendingSlab, isSlotReserved]
  );

  const handleFlightEnd = useCallback(() => {
    const landedSlab = pendingSlab;
    setPendingSlab(null);
    setIsSlotReserved(false);
    setTargetRect(null);
    if (landedSlab) onLanded(landedSlab);
  }, [pendingSlab, onLanded]);

  return {
    slotRef,
    pendingSlab,
    isSlotReserved,
    targetRect,
    begin,
    cancelIfSlabEdited,
    handleFlightEnd
  };
};
