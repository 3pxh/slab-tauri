import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { SlabData, areSlabsEqual } from '../components/Slab';

const DEFAULT_STAR_VIEWING_MS = 1000;

type EvaluationFlightOptions = {
  onLanded: (slab: SlabData) => void;
};

type PendingFlight = {
  slab: SlabData;
  viewingDelayMilliseconds: number;
};

export const useEvaluationFlight = ({ onLanded }: EvaluationFlightOptions) => {
  const slotRef = useRef<HTMLDivElement>(null);
  const [pendingFlight, setPendingFlight] = useState<PendingFlight | null>(null);
  const [isSlotReserved, setIsSlotReserved] = useState(false);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const pendingSlab = pendingFlight?.slab ?? null;

  useEffect(() => {
    if (!pendingFlight) return;

    const timer = setTimeout(() => setIsSlotReserved(true), pendingFlight.viewingDelayMilliseconds);
    return () => clearTimeout(timer);
  }, [pendingFlight]);

  useLayoutEffect(() => {
    const slot = slotRef.current;
    if (!isSlotReserved || !slot) return;

    slot.scrollIntoView({ block: 'nearest' });
    setTargetRect(slot.getBoundingClientRect());
  }, [isSlotReserved]);

  const begin = useCallback(
    (slab: SlabData, viewingDelayMilliseconds: number = DEFAULT_STAR_VIEWING_MS) => {
      setPendingFlight({ slab, viewingDelayMilliseconds });
    },
    []
  );

  const cancelIfSlabEdited = useCallback(
    (editedSlab: SlabData) => {
      const isEditedBeforeFlight =
        pendingSlab && !isSlotReserved && !areSlabsEqual(pendingSlab, editedSlab);
      if (isEditedBeforeFlight) setPendingFlight(null);
    },
    [pendingSlab, isSlotReserved]
  );

  const handleFlightEnd = useCallback(() => {
    const landedSlab = pendingSlab;
    setPendingFlight(null);
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
