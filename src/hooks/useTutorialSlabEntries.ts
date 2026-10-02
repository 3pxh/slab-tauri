import { useCallback, useRef, useState } from 'react';
import { SlabData, areSlabsEqual } from '../components/Slab';

export type TutorialSlabEntry = {
  id: number;
  slab: SlabData;
};

export const useTutorialSlabEntries = (initialSlabs: SlabData[]) => {
  const nextEntryIdRef = useRef(initialSlabs.length);
  const [entries, setEntries] = useState<TutorialSlabEntry[]>(() =>
    initialSlabs.map((slab, id) => ({ id, slab }))
  );

  const addSlab = useCallback((slab: SlabData) => {
    const entryId = nextEntryIdRef.current++;

    setEntries(previousEntries => {
      const withoutDuplicate = previousEntries.filter(entry => !areSlabsEqual(entry.slab, slab));
      return [{ id: entryId, slab }, ...withoutDuplicate];
    });
  }, []);

  return { entries, addSlab };
};
