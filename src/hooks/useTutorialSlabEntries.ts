import { useCallback, useRef, useState } from 'react';
import { SlabData, areSlabsEqual } from '../components/Slab';

export type TutorialSlabEntry = {
  id: number;
  slab: SlabData;
};

type SlabEntriesOptions = {
  insertAt?: 'start' | 'end';
};

export const useTutorialSlabEntries = (
  initialSlabs: SlabData[],
  { insertAt = 'start' }: SlabEntriesOptions = {}
) => {
  const nextEntryIdRef = useRef(initialSlabs.length);
  const [entries, setEntries] = useState<TutorialSlabEntry[]>(() =>
    initialSlabs.map((slab, id) => ({ id, slab }))
  );

  const addSlab = useCallback(
    (slab: SlabData) => {
      const entryId = nextEntryIdRef.current++;
      const newEntry = { id: entryId, slab };

      setEntries(previousEntries => {
        const withoutDuplicate = previousEntries.filter(entry => !areSlabsEqual(entry.slab, slab));
        return insertAt === 'start'
          ? [newEntry, ...withoutDuplicate]
          : [...withoutDuplicate, newEntry];
      });
    },
    [insertAt]
  );

  return { entries, addSlab };
};
