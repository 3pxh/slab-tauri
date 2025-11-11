import { useState, useRef, useEffect, useCallback } from 'react';
import { Puzzle } from '../lib/supabase';
import { SlabData, areSlabsEqual, COLORS, deserializeSlab } from '../components/Slab';
import { deepCopy } from '../utils';
import { executeCodeSafely } from '../utils/sandbox';
import { usePuzzleProgress } from './usePuzzleProgress';
import { analytics } from '../utils/analytics';

export interface SlabGameState {
  // Core game state
  allSlabs: SlabData[];
  archivedSlabs: SlabData[];
  remainingGuesses: number;
  hasWon: boolean;
  
  // UI state
  draggedIndex: number | null;
  showGuessOverlay: boolean;
  pendingGuessedSlabs: SlabData[];
  isInGuessSession: boolean;
  flashGuessButton: boolean;
  selectedSlabForMaker: SlabData | null;
  colorblindMode: 'none' | 'icon' | 'number' | 'letter';
  showArchivedSlabs: boolean;
  
  // Individual guessing state
  isInIndividualGuessMode: boolean;
  currentGuessIndex: number;
  guessCorrectCount: number;
  guessIncorrectCount: number;
  slabsToGuess: SlabData[];
  
  // Evaluation state
  evaluationResults: Map<string, boolean>;
  
  // Progress tracking
  progress: any;
  isLoading: boolean;
  
  // Optimistic progress values (use these instead of progress for immediate updates)
  optimisticTrophies: number;
  optimisticAttempts: number;
  optimisticTotalCorrect: number | null;
}

export interface SlabGameActions {
  // Slab management
  handleSlabCreate: (newSlab: SlabData) => void;
  handleSlabClick: (clickedSlab: SlabData) => void;
  handleSlabArchive: (slab: SlabData) => void;
  handleSlabUnarchive: (slab: SlabData) => void;
  handleSlabDelete: (slab: SlabData) => void;
  handleShuffle: () => void;
  handleSort: () => void;
  
  // Guess session management
  handleGuessClick: () => void;
  handleCloseOverlay: () => void;
  handleGuessSubmit: (results: any[]) => Promise<void>;
  
  // Individual guessing management
  handleIndividualGuessSubmit: (isStar: boolean) => Promise<boolean>;
  handleProceedToNext: () => Promise<void>;
  handleWinNext: () => Promise<void>;
  handleCloseIndividualGuess: () => void;
  
  // UI controls
  handleColorblindModeToggle: () => void;
  handleToggleArchivedSlabs: () => void;
  
  // Slab reordering
  reorderSlabs: (fromIndex: number, toIndex: number) => void;
  
  // Utility functions
  getSlabKey: (slab: SlabData) => string;
  getCurrentColors: () => string[];
  getColorblindOverlay: (colorIndex: number) => string | null;
  getFilteredHiddenExamples: () => SlabData[];
  getSlabsForOverlay: () => SlabData[];
  getGroundTruth: () => boolean[];
  
  // Progress actions
  incrementAttempts: (puzzleId: string) => Promise<any>;
  addTrophy: (puzzleId: string) => Promise<any>;
  markCompleted: (puzzleId: string, score: number) => Promise<any>;
  updateCustomData: (puzzleId: string, data: any) => Promise<any>;
}

// Helper function to deserialize puzzle examples if needed
const deserializePuzzleExamples = (examples: any[]): SlabData[] => {
  if (!examples || !Array.isArray(examples)) {
    return [];
  }
  
  return examples.map((example: any) => {
    // Check if the example is serialized (has 'grid' property) or deserialized (has 'cells' property)
    const isSerialized = example && typeof example === 'object' && 'grid' in example && 'colors' in example;
    if (isSerialized) {
      return deserializeSlab(example);
    }
    // Already deserialized, use as-is
    return example;
  });
};

export function useSlabGameState(puzzle: Puzzle, onPerfectGuess?: () => void): SlabGameState & SlabGameActions {
  // Core game state
  const [allSlabs, setAllSlabs] = useState<SlabData[]>([]);
  const [archivedSlabs, setArchivedSlabs] = useState<SlabData[]>([]);
  const [remainingGuesses, setRemainingGuesses] = useState(3);
  const [hasWon, setHasWon] = useState(false);
  // Ref to track current hasWon for immediate access (used when overlay needs to check win state)
  const hasWonRef = useRef(false);
  
  // UI state
  const [draggedIndex] = useState<number | null>(null);
  const [showGuessOverlay, setShowGuessOverlay] = useState(false);
  const [pendingGuessedSlabs, setPendingGuessedSlabs] = useState<SlabData[]>([]);
  const [isInGuessSession, setIsInGuessSession] = useState(false);
  const [flashGuessButton, setFlashGuessButton] = useState(false);
  const [selectedSlabForMaker, setSelectedSlabForMaker] = useState<SlabData | null>(null);
  const [colorblindMode, setColorblindMode] = useState<'none' | 'icon' | 'number' | 'letter'>('none');
  const [showArchivedSlabs, setShowArchivedSlabs] = useState(false);
  
  // Individual guessing state
  const [isInIndividualGuessMode, setIsInIndividualGuessMode] = useState(false);
  const [currentGuessIndex, setCurrentGuessIndex] = useState(0);
  const [guessCorrectCount, setGuessCorrectCount] = useState(0);
  const [guessIncorrectCount, setGuessIncorrectCount] = useState(0);
  const [slabsToGuess, setSlabsToGuess] = useState<SlabData[]>([]);
  const [lastGuessResult, setLastGuessResult] = useState<boolean | null>(null);
  
  // Evaluation state
  const [evaluationResults, setEvaluationResults] = useState<Map<string, boolean>>(new Map());
  
  // Progress tracking
  const { progress, isLoading, incrementAttempts, addTrophy, markCompleted, updateCustomData, addToTotalCorrect } = usePuzzleProgress(puzzle.id);
  
  // Optimistic local state for progress values (updated immediately, synced to remote async)
  // These ensure VictoryOverlay shows correct data even before remote sync completes
  // Initialize to 0/null so they're never null after initialization
  const [optimisticTrophies, setOptimisticTrophies] = useState<number>(0);
  const [optimisticAttempts, setOptimisticAttempts] = useState<number>(0);
  const [optimisticTotalCorrect, setOptimisticTotalCorrect] = useState<number | null>(null);
  
  // Refs for preventing race conditions
  const isSubmittingGuessRef = useRef(false);
  const hasInitializedRef = useRef(false);
  // Refs to track current local state for merging during re-initialization
  const currentLocalSlabsRef = useRef<SlabData[]>([]);
  const currentArchivedSlabsRef = useRef<SlabData[]>([]);
  // Refs to capture current guess mode state for use in initialization effect
  const currentGuessModeRef = useRef({
    isInIndividualGuessMode: false,
    currentGuessIndex: 0,
    guessCorrectCount: 0,
    guessIncorrectCount: 0,
    slabsToGuess: [] as SlabData[],
    lastGuessResult: null as boolean | null
  });

  // Colorblind mode definitions
  const COLORBLIND_ICONS = ['●', '≈', '▲', '■', '♥', '⬡']; // circle, squiggles, triangle, square, heart, hexagon
  const COLORBLIND_NUMBERS = ['1', '2', '3', '4', '5', '6'];
  const COLORBLIND_LETTERS = ['a', 'b', 'c', 'd', 'e', 'f'];

  // Keep guess mode ref in sync with state
  useEffect(() => {
    currentGuessModeRef.current = {
      isInIndividualGuessMode,
      currentGuessIndex,
      guessCorrectCount,
      guessIncorrectCount,
      slabsToGuess,
      lastGuessResult
    };
  }, [isInIndividualGuessMode, currentGuessIndex, guessCorrectCount, guessIncorrectCount, slabsToGuess, lastGuessResult]);

  // Keep local state refs in sync (for merging during re-initialization)
  useEffect(() => {
    currentLocalSlabsRef.current = allSlabs;
  }, [allSlabs]);
  
  useEffect(() => {
    currentArchivedSlabsRef.current = archivedSlabs;
  }, [archivedSlabs]);
  
  // Keep hasWon ref in sync for immediate access
  useEffect(() => {
    hasWonRef.current = hasWon;
  }, [hasWon]);

  // Helper function to merge local and remote slabs without duplicates
  const mergeSlabs = useCallback((localSlabs: SlabData[], remoteSlabs: SlabData[]): SlabData[] => {
    // First, deduplicate local slabs
    const deduplicatedLocal: SlabData[] = [];
    for (const localSlab of localSlabs) {
      const exists = deduplicatedLocal.some(existing => areSlabsEqual(existing, localSlab));
      if (!exists) {
        deduplicatedLocal.push(localSlab);
      }
    }
    
    // Then, deduplicate remote slabs
    const deduplicatedRemote: SlabData[] = [];
    for (const remoteSlab of remoteSlabs) {
      const exists = deduplicatedRemote.some(existing => areSlabsEqual(existing, remoteSlab));
      if (!exists) {
        deduplicatedRemote.push(remoteSlab);
      }
    }
    
    // Finally, merge: start with deduplicated local, add remote slabs that don't exist in local
    const merged: SlabData[] = [...deduplicatedLocal];
    for (const remoteSlab of deduplicatedRemote) {
      const exists = merged.some(localSlab => areSlabsEqual(localSlab, remoteSlab));
      if (!exists) {
        merged.push(remoteSlab);
      }
    }
    
    return merged;
  }, []);

  // Reset all state when puzzle changes
  useEffect(() => {
    console.log('🔄 Puzzle changed, resetting state for puzzle:', puzzle.id);
    hasInitializedRef.current = false;
    
    // Reset all state to initial values (but preserve user preferences like colorblindMode)
    setAllSlabs([]);
    setArchivedSlabs([]);
    setRemainingGuesses(3);
    setHasWon(false);
    setShowGuessOverlay(false);
    setPendingGuessedSlabs([]);
    setIsInGuessSession(false);
    setFlashGuessButton(false);
    setSelectedSlabForMaker(null);
    setShowArchivedSlabs(false);
    setIsInIndividualGuessMode(false);
    setCurrentGuessIndex(0);
    setGuessCorrectCount(0);
    setGuessIncorrectCount(0);
    setSlabsToGuess([]);
    setLastGuessResult(null);
    setEvaluationResults(new Map());
    // Reset optimistic progress state
    setOptimisticTrophies(0);
    setOptimisticAttempts(0);
    setOptimisticTotalCorrect(null);
    // Note: colorblindMode is preserved as it's a user preference
    console.log('🔄 State reset complete');
  }, [puzzle.id]);

  // Force re-initialization when progress changes (to handle progress loading)
  // But only if we're not in an active guessing session
  useEffect(() => {
    if (hasInitializedRef.current && progress !== null) {
      // Don't re-initialize if we're actively in individual guess mode
      // This prevents sync from bouncing us out of guessing mode
      if (currentGuessModeRef.current.isInIndividualGuessMode) {
        console.log('🔄 Progress updated but in active guess mode, skipping re-initialization');
        return;
      }
      console.log('🔄 Progress loaded, re-initializing for puzzle:', puzzle.id);
      hasInitializedRef.current = false;
    }
  }, [progress, puzzle.id]);

  // Initialize state from puzzle and progress data
  useEffect(() => {
    console.log('🚀 Initialization effect running for puzzle:', puzzle.id);
    console.log('🚀 hasInitializedRef.current:', hasInitializedRef.current);
    console.log('🚀 puzzle.shown_examples:', puzzle.shown_examples);
    console.log('🚀 isLoading:', isLoading);
    
    if (hasInitializedRef.current) {
      console.log('🚀 Already initialized, skipping');
      return; // Prevent re-initialization
    }
    
    // We need at least the puzzle data to initialize
    if (!puzzle.shown_examples) {
      console.log('🚀 No shown examples, skipping initialization');
      return;
    }
    
    // If we're still loading progress data, wait for it to complete
    if (isLoading) {
      console.log('🚀 Still loading, skipping initialization');
      return;
    }
    
    // Start with shown examples as the base state
    // Deserialize them if they're in serialized format
    let initialSlabs = deserializePuzzleExamples(puzzle.shown_examples || []);
    let initialArchivedSlabs: SlabData[] = [];
    let initialRemainingGuesses = 3;
    let initialHasWon = false;
    let initialEvaluationResults = new Map<string, boolean>();
    let initialIsInIndividualGuessMode = false;
    let initialCurrentGuessIndex = 0;
    let initialGuessCorrectCount = 0;
    let initialGuessIncorrectCount = 0;
    let initialSlabsToGuess: SlabData[] = [];
    let initialLastGuessResult: boolean | null = null;
    
    console.log('🚀 Initial slabs from puzzle:', initialSlabs);
    
    // Check if we have existing local slabs (re-initialization case)
    const hasExistingLocalSlabs = currentLocalSlabsRef.current.length > 0;
    const existingLocalSlabs = currentLocalSlabsRef.current;
    
    // Only override with saved progress if we have meaningful saved data AND it's for the current puzzle
    if (progress && progress.custom_data && progress.puzzle_id === puzzle.id) {
      console.log('🚀 Found saved progress for current puzzle:', progress.custom_data);
      // Use saved slabs if available and not empty, otherwise fall back to shown examples
      if (progress.custom_data.savedSlabs && progress.custom_data.savedSlabs.length > 0) {
        const remoteSlabs = progress.custom_data.savedSlabs;
        if (hasExistingLocalSlabs) {
          // Re-initialization: merge remote slabs with local slabs to avoid losing local changes
          console.log('🔄 Re-initialization detected, merging remote slabs with local slabs');
          console.log('🔄 Local slabs:', existingLocalSlabs.length);
          console.log('🔄 Remote slabs:', remoteSlabs.length);
          initialSlabs = mergeSlabs(existingLocalSlabs, remoteSlabs);
          console.log('🔄 Merged slabs:', initialSlabs.length);
        } else {
          // First initialization: use remote slabs directly
          console.log('🚀 First initialization, using saved slabs from remote:', remoteSlabs);
          initialSlabs = remoteSlabs;
        }
      } else {
        if (hasExistingLocalSlabs) {
          // Re-initialization but no remote slabs: keep local slabs
          console.log('🔄 Re-initialization but no remote slabs, preserving local slabs');
          initialSlabs = existingLocalSlabs;
        } else {
          // First initialization: use shown examples
          console.log('🚀 No saved slabs, using puzzle shown_examples');
        }
      }
      
      // Restore archived slabs if available (merge on re-initialization)
      if (Array.isArray(progress.custom_data.archivedSlabs)) {
        if (hasExistingLocalSlabs) {
          // Re-initialization: merge remote archived slabs with local archived slabs
          const existingArchivedSlabs = currentArchivedSlabsRef.current;
          initialArchivedSlabs = mergeSlabs(existingArchivedSlabs, progress.custom_data.archivedSlabs);
        } else {
          // First initialization: use remote archived slabs directly
          initialArchivedSlabs = progress.custom_data.archivedSlabs;
        }
      } else if (hasExistingLocalSlabs) {
        // Re-initialization but no remote archived slabs: keep local archived slabs
        initialArchivedSlabs = currentArchivedSlabsRef.current;
      }
      
      // Restore remaining guesses if available
      if (typeof progress.custom_data.remainingGuesses === 'number') {
        initialRemainingGuesses = progress.custom_data.remainingGuesses;
      }
      
      // Restore win state if available
      if (typeof progress.custom_data.hasWon === 'boolean') {
        initialHasWon = progress.custom_data.hasWon;
      }
      
      // Note: evaluationResults are not saved in progress, they get recalculated
      
      // Restore individual guess mode state if available
      // BUT: Don't restore if we're currently in an active guessing session
      // This prevents sync from bouncing us out of guessing mode
      const currentGuessMode = currentGuessModeRef.current;
      if (!currentGuessMode.isInIndividualGuessMode) {
        if (typeof progress.custom_data.isInIndividualGuessMode === 'boolean') {
          initialIsInIndividualGuessMode = progress.custom_data.isInIndividualGuessMode;
        }
        
        if (typeof progress.custom_data.currentGuessIndex === 'number') {
          initialCurrentGuessIndex = progress.custom_data.currentGuessIndex;
        }
        
        if (typeof progress.custom_data.guessCorrectCount === 'number') {
          initialGuessCorrectCount = progress.custom_data.guessCorrectCount;
        }
        
        if (typeof progress.custom_data.guessIncorrectCount === 'number') {
          initialGuessIncorrectCount = progress.custom_data.guessIncorrectCount;
        }
        
        if (Array.isArray(progress.custom_data.slabsToGuess)) {
          initialSlabsToGuess = progress.custom_data.slabsToGuess;
        }
        
        if (typeof progress.custom_data.lastGuessResult === 'boolean') {
          initialLastGuessResult = progress.custom_data.lastGuessResult;
        }
      } else {
        console.log('🚀 In active guess mode, preserving current guess state');
        // Preserve current state when in active guessing mode
        initialIsInIndividualGuessMode = currentGuessMode.isInIndividualGuessMode;
        initialCurrentGuessIndex = currentGuessMode.currentGuessIndex;
        initialGuessCorrectCount = currentGuessMode.guessCorrectCount;
        initialGuessIncorrectCount = currentGuessMode.guessIncorrectCount;
        initialSlabsToGuess = currentGuessMode.slabsToGuess;
        initialLastGuessResult = currentGuessMode.lastGuessResult;
      }
    } else if (progress && progress.puzzle_id !== puzzle.id) {
      console.log('🚀 Found progress for different puzzle, ignoring:', progress.puzzle_id, 'vs', puzzle.id);
    } else {
      console.log('🚀 No progress data, using puzzle shown_examples');
    }
    
    // Set all initial state at once to prevent multiple renders
    setAllSlabs(initialSlabs);
    setArchivedSlabs(initialArchivedSlabs);
    setRemainingGuesses(initialRemainingGuesses);
    setHasWon(initialHasWon);
    hasWonRef.current = initialHasWon; // Update ref immediately
    setEvaluationResults(initialEvaluationResults);
    setIsInIndividualGuessMode(initialIsInIndividualGuessMode);
    setCurrentGuessIndex(initialCurrentGuessIndex);
    setGuessCorrectCount(initialGuessCorrectCount);
    setGuessIncorrectCount(initialGuessIncorrectCount);
    setSlabsToGuess(initialSlabsToGuess);
    setLastGuessResult(initialLastGuessResult);
    
    // Initialize optimistic progress state from remote progress
    if (progress && progress.puzzle_id === puzzle.id) {
      setOptimisticTrophies(progress.trophies ?? 0);
      setOptimisticAttempts(progress.attempts ?? 0);
      setOptimisticTotalCorrect(progress.total_correct ?? null);
    } else {
      // No progress yet, start with defaults
      setOptimisticTrophies(0);
      setOptimisticAttempts(0);
      setOptimisticTotalCorrect(null);
    }
    
    // Mark as initialized
    hasInitializedRef.current = true;
    console.log('🚀 Final slabs being set:', initialSlabs);
    console.log('🚀 Initialization complete for puzzle:', puzzle.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [puzzle.shown_examples, progress, isLoading]);

  // Sync optimistic state when progress updates (to catch up with remote after async operations)
  useEffect(() => {
    if (progress && progress.puzzle_id === puzzle.id) {
      // Only update if remote has higher values (prevents overwriting optimistic updates that haven't synced yet)
      // This ensures we don't overwrite local optimistic updates with stale remote data
      if ((progress.trophies ?? 0) > optimisticTrophies) {
        setOptimisticTrophies(progress.trophies ?? 0);
      }
      if ((progress.attempts ?? 0) > optimisticAttempts) {
        setOptimisticAttempts(progress.attempts ?? 0);
      }
      // For total_correct, always sync from remote when it's more up-to-date
      // (we check if remote value is different and not null)
      if (progress.total_correct !== null && progress.total_correct !== optimisticTotalCorrect) {
        setOptimisticTotalCorrect(progress.total_correct ?? null);
      }
    }
  }, [progress, puzzle.id, optimisticTrophies, optimisticAttempts, optimisticTotalCorrect]);

  // Pre-evaluate all slabs when puzzle loads (only after initialization)
  useEffect(() => {
    if (!hasInitializedRef.current) return; // Wait for initialization
    
    const preEvaluateAllSlabs = async () => {
      if (!puzzle.evaluate_fn.trim()) {
        return;
      }

      // Get all slabs that need evaluation (shown examples + hidden examples)
      // Deserialize them if they're in serialized format
      const allSlabsToEvaluate = [
        ...deserializePuzzleExamples(puzzle.shown_examples || []),
        ...deserializePuzzleExamples(puzzle.hidden_examples || [])
      ];

      // Filter out slabs that are already evaluated
      const slabsToEvaluate = allSlabsToEvaluate.filter(slab => {
        const key = getSlabKey(slab);
        return !evaluationResults.has(key);
      });

      if (slabsToEvaluate.length > 0) {
        try {
          const results = await Promise.all(
            slabsToEvaluate.map(slab => evaluateSlab(slab))
          );

          // Add new results to the map
          setEvaluationResults(prev => {
            const newMap = new Map(prev);
            slabsToEvaluate.forEach((slab, index) => {
              const key = getSlabKey(slab);
              newMap.set(key, results[index]);
            });
            return newMap;
          });
        } catch (error) {
          console.error('Error pre-evaluating slabs:', error);
        }
      }
    };

    preEvaluateAllSlabs();
  }, [puzzle.evaluate_fn, puzzle.shown_examples, puzzle.hidden_examples, evaluationResults]);

  // Update evaluation results when slabs change (only after initialization)
  useEffect(() => {
    if (!hasInitializedRef.current) return; // Wait for initialization
    updateEvaluationResults();
  }, [allSlabs, puzzle.evaluate_fn]);

  // Utility functions
  const getSlabKey = useCallback((slab: SlabData): string => {
    return JSON.stringify(slab);
  }, []);

  const getCurrentColors = useCallback((): string[] => {
    // Use puzzle colors if available, otherwise fall back to default COLORS
    return puzzle.colors && puzzle.colors.length > 0 ? puzzle.colors : COLORS;
  }, [puzzle.colors]);

  const getColorblindOverlay = useCallback((colorIndex: number): string | null => {
    if (colorIndex === 0) return null; // Gray has no overlay
    if (colorIndex < 1 || colorIndex > 6) return null;
    
    const overlayIndex = colorIndex - 1; // Convert to 0-based index
    
    switch (colorblindMode) {
      case 'icon':
        return COLORBLIND_ICONS[overlayIndex];
      case 'number':
        return COLORBLIND_NUMBERS[overlayIndex];
      case 'letter':
        return COLORBLIND_LETTERS[overlayIndex];
      default:
        return null;
    }
  }, [colorblindMode]);

  const evaluateSlab = useCallback(async (slab: SlabData): Promise<boolean> => {
    if (!puzzle.evaluate_fn.trim()) {
      return false;
    }

    try {
      // Execute the evaluation function in a secure sandbox
      const result = await executeCodeSafely(puzzle.evaluate_fn, slab, 5000);
      if (result.success) {
        return result.result;
      } else {
        console.error('Error evaluating slab:', result.error);
        return false;
      }
    } catch (error) {
      console.error('Error evaluating slab:', error);
      return false;
    }
  }, [puzzle.evaluate_fn]);

  // Function to immediately evaluate a single slab
  const evaluateSingleSlab = useCallback(async (slab: SlabData) => {
    if (!puzzle.evaluate_fn.trim()) {
      return;
    }

    const key = getSlabKey(slab);
    
    // Skip if already evaluated
    if (evaluationResults.has(key)) {
      return;
    }

    try {
      const result = await evaluateSlab(slab);
      setEvaluationResults(prev => {
        const newMap = new Map(prev);
        newMap.set(key, result);
        return newMap;
      });
    } catch (error) {
      console.error('Error evaluating single slab:', error);
    }
  }, [puzzle.evaluate_fn, getSlabKey, evaluationResults, evaluateSlab]);

  // Function to update evaluation results for all slabs
  const updateEvaluationResults = useCallback(async () => {
    if (!puzzle.evaluate_fn.trim()) {
      setEvaluationResults(new Map());
      return;
    }

    try {
      const newResults = new Map<string, boolean>();
      
      // Only evaluate slabs that don't already have results
      const slabsToEvaluate = allSlabs.filter(slab => {
        const key = getSlabKey(slab);
        return !evaluationResults.has(key);
      });

      if (slabsToEvaluate.length > 0) {
        const results = await Promise.all(
          slabsToEvaluate.map(slab => evaluateSlab(slab))
        );

        // Add new results to the map
        slabsToEvaluate.forEach((slab, index) => {
          const key = getSlabKey(slab);
          newResults.set(key, results[index]);
        });
      }

      // Merge with existing results
      setEvaluationResults(prev => {
        const merged = new Map(prev);
        newResults.forEach((value, key) => {
          merged.set(key, value);
        });
        return merged;
      });
    } catch (error) {
      console.error('Error updating evaluation results:', error);
    }
  }, [puzzle.evaluate_fn, allSlabs, getSlabKey, evaluationResults, evaluateSlab]);

  // Helper function to compare slabs ignoring the id property
  const areSlabsEqualIgnoringId = useCallback((slab1: any, slab2: any): boolean => {
    // Create copies without id property for comparison
    const slab1ForComparison = { ...slab1 };
    delete slab1ForComparison.id;
    const slab2ForComparison = { ...slab2 };
    delete slab2ForComparison.id;
    
    return areSlabsEqual(slab1ForComparison, slab2ForComparison);
  }, []);

  // Get hidden examples that are not already in the current slabs list
  const getFilteredHiddenExamples = useCallback((): SlabData[] => {
    if (!puzzle.hidden_examples || puzzle.hidden_examples.length === 0) {
      return [];
    }

    // Deserialize hidden examples if they're in serialized format
    const hiddenSlabs = deserializePuzzleExamples(puzzle.hidden_examples);
    
    // Get all slabs that have been guessed (from current state + saved progress)
    const allGuessedSlabs = [...allSlabs];
    if (progress && progress.custom_data && progress.custom_data.savedSlabs) {
      // Add saved slabs that aren't already in allSlabs to avoid duplicates
      progress.custom_data.savedSlabs.forEach(savedSlab => {
        if (!allGuessedSlabs.some(existingSlab => areSlabsEqualIgnoringId(savedSlab, existingSlab))) {
          allGuessedSlabs.push(savedSlab);
        }
      });
    }
    
    // Filter out hidden examples that are already guessed
    const filteredHidden = hiddenSlabs.filter(hiddenSlab => 
      !allGuessedSlabs.some(existingSlab => areSlabsEqualIgnoringId(hiddenSlab, existingSlab))
    );

    // Return the first 5 filtered hidden examples
    return filteredHidden.slice(0, 5);
  }, [puzzle.hidden_examples, allSlabs, progress, areSlabsEqualIgnoringId]);

  // Get slabs to display in the guess overlay
  const getSlabsForOverlay = useCallback((): SlabData[] => {
    // If we have pending guessed slabs (after submission), show those
    if (pendingGuessedSlabs.length > 0) {
      return pendingGuessedSlabs;
    }
    
    // Otherwise, show filtered hidden examples
    return getFilteredHiddenExamples();
  }, [pendingGuessedSlabs, getFilteredHiddenExamples]);

  // Get ground truth for the slabs in the overlay
  const getGroundTruth = useCallback((): boolean[] => {
    const slabsForOverlay = getSlabsForOverlay();
    return slabsForOverlay.map(slab => {
      const key = getSlabKey(slab);
      return evaluationResults.get(key) || false;
    });
  }, [getSlabsForOverlay, getSlabKey, evaluationResults]);

  // Action handlers
  const handleSlabCreate = useCallback((newSlab: SlabData) => {
    // If we're in a guess session, flash the guess button instead of creating a slab
    if (isInGuessSession) {
      setFlashGuessButton(true);
      setTimeout(() => setFlashGuessButton(false), 1000); // Flash for 1 second
      return;
    }
    
    // Deep clone the slab to prevent reference sharing with SlabMaker
    const clonedSlab: SlabData = deepCopy(newSlab);
    
    setAllSlabs(prev => {
      // Remove any existing slabs that are identical to the new one
      const filteredSlabs = prev.filter(existingSlab => !areSlabsEqual(clonedSlab, existingSlab));
      const newSlabs = [clonedSlab, ...filteredSlabs];
      
      // Save the updated state with the new slab
      const stateToSave = {
        savedSlabs: newSlabs,
        remainingGuesses,
        hasWon
      };
      
      updateCustomData(puzzle.id, stateToSave).catch(error => {
        console.error('❌ Failed to save progress after slab creation:', error);
      });
      
      return newSlabs;
    });
    
    // Immediately evaluate the new slab for instant feedback
    evaluateSingleSlab(clonedSlab);
    
    // Clear the selected slab after creating
    setSelectedSlabForMaker(null);
  }, [isInGuessSession, remainingGuesses, hasWon, updateCustomData, puzzle.id, evaluateSingleSlab]);

  const handleSlabClick = useCallback((clickedSlab: SlabData) => {
    // Deep clone the slab to prevent reference sharing
    const clonedSlab: SlabData = deepCopy(clickedSlab);
    
    setSelectedSlabForMaker(clonedSlab);
  }, []);

  const handleSlabArchive = useCallback((slabToArchive: SlabData) => {
    setAllSlabs(prev => {
      const filteredSlabs = prev.filter(slab => !areSlabsEqual(slab, slabToArchive));
      
      // Save the updated state
      const stateToSave = {
        savedSlabs: filteredSlabs,
        archivedSlabs: [...archivedSlabs, slabToArchive],
        remainingGuesses,
        hasWon
      };
      
      updateCustomData(puzzle.id, stateToSave).catch(error => {
        console.error('❌ Failed to save progress after archiving slab:', error);
      });
      
      return filteredSlabs;
    });
    
    setArchivedSlabs(prev => [...prev, slabToArchive]);
  }, [archivedSlabs, remainingGuesses, hasWon, updateCustomData, puzzle.id]);

  const handleSlabUnarchive = useCallback((slabToUnarchive: SlabData) => {
    setArchivedSlabs(prev => {
      const filteredArchived = prev.filter(slab => !areSlabsEqual(slab, slabToUnarchive));
      
      // Save the updated state
      const stateToSave = {
        savedSlabs: [...allSlabs, slabToUnarchive],
        archivedSlabs: filteredArchived,
        remainingGuesses,
        hasWon
      };
      
      updateCustomData(puzzle.id, stateToSave).catch(error => {
        console.error('❌ Failed to save progress after unarchiving slab:', error);
      });
      
      return filteredArchived;
    });
    
    setAllSlabs(prev => [...prev, slabToUnarchive]);
  }, [allSlabs, remainingGuesses, hasWon, updateCustomData, puzzle.id]);

  const handleSlabDelete = useCallback((slabToDelete: SlabData) => {
    setArchivedSlabs(prev => {
      const filteredArchived = prev.filter(slab => !areSlabsEqual(slab, slabToDelete));
      
      // Save the updated state
      const stateToSave = {
        savedSlabs: allSlabs,
        archivedSlabs: filteredArchived,
        remainingGuesses,
        hasWon
      };
      
      updateCustomData(puzzle.id, stateToSave).catch(error => {
        console.error('❌ Failed to save progress after deleting slab:', error);
      });
      
      return filteredArchived;
    });
    
    // Clear selection if the deleted slab was selected
    if (selectedSlabForMaker && areSlabsEqual(selectedSlabForMaker, slabToDelete)) {
      setSelectedSlabForMaker(null);
    }
  }, [allSlabs, remainingGuesses, hasWon, updateCustomData, puzzle.id, selectedSlabForMaker]);

  const handleShuffle = useCallback(() => {
    setAllSlabs(prev => {
      const shuffled = [...prev];
      // Fisher-Yates shuffle algorithm
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      return shuffled;
    });
  }, []);

  const handleSort = useCallback(() => {
    // Use cached evaluation results for sorting
    const sortedSlabs = [...allSlabs].sort((a, b) => {
      const keyA = getSlabKey(a);
      const keyB = getSlabKey(b);
      const resultA = evaluationResults.get(keyA) || false;
      const resultB = evaluationResults.get(keyB) || false;
      
      // Black (true) comes first, then white (false)
      if (resultA && !resultB) return -1;
      if (!resultA && resultB) return 1;
      return 0;
    });
    
    setAllSlabs(sortedSlabs);
  }, [allSlabs, getSlabKey, evaluationResults]);

  const handleGuessClick = useCallback(() => {
    // Don't allow guessing if no attempts remaining
    if (remainingGuesses <= 0) {
      return;
    }
    
    // Get the slabs to guess on (first 5 hidden examples not already in allSlabs)
    const filteredHidden = getFilteredHiddenExamples();
    
    if (filteredHidden.length === 0) {
      return; // No slabs to guess on
    }
    
    // Start individual guessing mode
    setIsInIndividualGuessMode(true);
    setCurrentGuessIndex(0);
    setGuessCorrectCount(0);
    setGuessIncorrectCount(0);
    setSlabsToGuess(filteredHidden);
    setLastGuessResult(null);
    setIsInGuessSession(true);
  }, [remainingGuesses, getFilteredHiddenExamples]);

  const handleCloseOverlay = useCallback(() => {
    setShowGuessOverlay(false);
    setIsInGuessSession(false);
    
    // Clear pending guessed slabs (they were already added in handleGuessSubmit)
    setPendingGuessedSlabs([]);
  }, []);

  const handleIndividualGuessSubmit = useCallback(async (isStar: boolean): Promise<boolean> => {
    if (currentGuessIndex >= slabsToGuess.length) {
      return false; // No more slabs to guess
    }

    const currentSlab = slabsToGuess[currentGuessIndex];
    const key = getSlabKey(currentSlab);
    const actualResult = evaluationResults.get(key) || false;
    const isCorrect = (isStar && actualResult) || (!isStar && !actualResult);

    // Store the result for use in proceedToNext
    setLastGuessResult(isCorrect);

    // Track analytics
    analytics.guessMade(puzzle, 3 - remainingGuesses + 1, isCorrect);

    // Return the result without moving to next slab or adding to main list yet
    // The component will handle showing the confirmation and then call proceedToNext
    return isCorrect;
  }, [currentGuessIndex, slabsToGuess, getSlabKey, evaluationResults, remainingGuesses, puzzle]);

  const handleProceedToNext = useCallback(async () => {
    if (currentGuessIndex >= slabsToGuess.length) {
      return;
    }

    const currentSlab = slabsToGuess[currentGuessIndex];
    
    // Update counters based on the last guess result
    if (lastGuessResult !== null) {
      if (lastGuessResult) {
        setGuessCorrectCount(prev => prev + 1);
      } else {
        setGuessIncorrectCount(prev => prev + 1);
      }
    }
    
    // Add the guessed slab to the main list
    setAllSlabs(prev => [currentSlab, ...prev]);

    // Move to next slab or finish
    if (currentGuessIndex + 1 >= slabsToGuess.length) {
      // Finished all guesses - move to results state, don't exit yet
      setCurrentGuessIndex(prev => prev + 1); // This will make currentIndex >= totalSlabs
      setLastGuessResult(null);
    } else {
      // Move to next slab
      setCurrentGuessIndex(prev => prev + 1);
      setLastGuessResult(null);
    }
  }, [currentGuessIndex, slabsToGuess, lastGuessResult, guessCorrectCount, remainingGuesses, allSlabs, puzzle, incrementAttempts, updateCustomData, markCompleted, addTrophy]);

  const handleCloseIndividualGuess = useCallback(() => {
    setIsInIndividualGuessMode(false);
    setIsInGuessSession(false);
    setCurrentGuessIndex(0);
    setGuessCorrectCount(0);
    setGuessIncorrectCount(0);
    setSlabsToGuess([]);
    setLastGuessResult(null);
  }, []);

  const handleWinNext = useCallback(async () => {
    // This is called when they click next after finishing all guesses (win or lose)
    const allCorrect = guessCorrectCount === slabsToGuess.length;
    
    // Close the guessing mode immediately for responsive UI
    setIsInIndividualGuessMode(false);
    setIsInGuessSession(false);
    setCurrentGuessIndex(0);
    setGuessCorrectCount(0);
    setGuessIncorrectCount(0);
    setSlabsToGuess([]);
    setLastGuessResult(null);
    
    // Set hasWon based on whether they got all correct
    // But preserve existing win state (once won, always won)
    // Use ref to get current value immediately for synchronous updates
    const currentHasWon = hasWonRef.current;
    const newHasWon = currentHasWon || allCorrect;
    setHasWon(newHasWon);
    hasWonRef.current = newHasWon; // Update ref immediately
    
    // Notify parent if all slabs in this guess attempt were correct
    if (allCorrect && onPerfectGuess) {
      onPerfectGuess();
    }
    
    // Decrement remaining guesses
    setRemainingGuesses(prev => Math.max(0, prev - 1));
    
    // Update optimistic state immediately (before async sync)
    setOptimisticAttempts(prev => prev + 1);
    setOptimisticTotalCorrect(prev => (prev ?? 0) + guessCorrectCount);
    if (allCorrect) {
      setOptimisticTrophies(prev => prev + 1);
    }
    
    // Do all the async operations in the background
    (async () => {
      try {
        // Track progress: increment attempts
        await incrementAttempts(puzzle.id);

        // Update total correct count with the number of correct guesses from this attempt
        await addToTotalCorrect(puzzle.id, guessCorrectCount);

        // Save state (slabs are already in allSlabs from handleProceedToNext)
        // Note: hasWon is preserved on the server side (once won, always won), so we can pass allCorrect here
        const stateToSave = {
          savedSlabs: allSlabs,
          remainingGuesses: Math.max(0, remainingGuesses - 1),
          hasWon: allCorrect,
          isInIndividualGuessMode: false,
          currentGuessIndex: 0,
          guessCorrectCount: 0,
          guessIncorrectCount: 0,
          slabsToGuess: [],
          lastGuessResult: null
        };
        
        await updateCustomData(puzzle.id, stateToSave);

        // Track analytics for puzzle completion (only if they won)
        if (allCorrect) {
          const timeSpent = Date.now() - (window as any).puzzleStartTime || 0;
          analytics.puzzleCompleted(puzzle, 3 - remainingGuesses + 1, timeSpent / 1000, allSlabs.length);
          
          // Track progress: mark as completed and add trophy
          await markCompleted(puzzle.id, slabsToGuess.length);
          await addTrophy(puzzle.id);
        }
      } catch (error) {
        console.error('Failed to save completion progress:', error);
      }
    })();
  }, [currentGuessIndex, slabsToGuess, guessCorrectCount, remainingGuesses, allSlabs, puzzle, incrementAttempts, updateCustomData, markCompleted, addTrophy, addToTotalCorrect, onPerfectGuess]);

  const handleGuessSubmit = useCallback(async (results: any[]) => {
    const filteredHidden = getFilteredHiddenExamples();
    let allCorrect = true;
    let hasAnyGuess = false;

    results.forEach((result) => {
      if (result.index < filteredHidden.length) {
        hasAnyGuess = true;
        
        if (!result.isCorrect) {
          allCorrect = false;
        }
      }
    });

    // Only process if there are actual guesses made
    if (hasAnyGuess) {
      // Set flag to prevent race conditions during guess submission
      isSubmittingGuessRef.current = true;
      
      try {
        // Decrement remaining guesses
        setRemainingGuesses(prev => Math.max(0, prev - 1));
        
        // Store guessed slabs in pending state (will be added to main list when overlay closes)
        const guessedSlabs = results
          .filter(result => result.index < filteredHidden.length)
          .map(result => filteredHidden[result.index]);
        setPendingGuessedSlabs(guessedSlabs);
        
        // Also add the slabs immediately to ensure they're always added
        setAllSlabs(prev => [...guessedSlabs, ...prev]);
        
        // Immediately evaluate the newly added slabs
        guessedSlabs.forEach(slab => {
          evaluateSingleSlab(slab);
        });
        
        // Count correct guesses for optimistic update
        const correctCount = results.filter(r => r.isCorrect && r.index < filteredHidden.length).length;
        
        // Update optimistic state immediately (before async sync)
        setOptimisticAttempts(prev => prev + 1);
        setOptimisticTotalCorrect(prev => (prev ?? 0) + correctCount);
        if (allCorrect) {
          setOptimisticTrophies(prev => prev + 1);
          // Set hasWon to true if all correct, but preserve existing win state (once won, always won)
          const currentHasWon = hasWonRef.current;
          const newHasWon = currentHasWon || true;
          setHasWon(newHasWon);
          hasWonRef.current = newHasWon; // Update ref immediately
        }
        
        // Track progress: increment attempts
        try {
          await incrementAttempts(puzzle.id);
        } catch (error) {
          console.error('Failed to save progress:', error);
        }
        
        // Update total_correct
        try {
          await addToTotalCorrect(puzzle.id, correctCount);
        } catch (error) {
          console.error('Failed to update total correct:', error);
        }
        
        // Force immediate save of the new state (do this first to avoid overwriting trophy count)
        const stateToSave = {
          savedSlabs: [...guessedSlabs, ...allSlabs],
          remainingGuesses: Math.max(0, remainingGuesses - 1),
          hasWon: allCorrect
        };
        
        // Save immediately without debounce
        await updateCustomData(puzzle.id, stateToSave);
        
        // Check if player won (all guesses correct) - do this AFTER updateCustomData
        // Preserve existing win state (once won, always won)
        if (allCorrect) {
          const currentHasWon = hasWonRef.current;
          const newHasWon = currentHasWon || true;
          setHasWon(newHasWon);
          hasWonRef.current = newHasWon; // Update ref immediately
          
          // Track analytics for puzzle completion
          const timeSpent = Date.now() - (window as any).puzzleStartTime || 0;
          analytics.puzzleCompleted(puzzle, 3 - remainingGuesses + 1, timeSpent / 1000, allSlabs.length);
          
          // Track progress: mark as completed and add trophy
          try {
            await markCompleted(puzzle.id, results.filter(r => r.isCorrect).length);
            await addTrophy(puzzle.id);
          } catch (error) {
            console.error('Failed to save completion progress:', error);
          }
        }
        
      } finally {
        // Clear the flag after a short delay to allow state updates to complete
        setTimeout(() => {
          isSubmittingGuessRef.current = false;
        }, 100);
      }
    }

    setIsInGuessSession(false); // Reset guess session when guesses are submitted
  }, [getFilteredHiddenExamples, remainingGuesses, allSlabs, incrementAttempts, puzzle.id, updateCustomData, markCompleted, addTrophy, addToTotalCorrect, evaluateSingleSlab]);

  const handleColorblindModeToggle = useCallback(() => {
    setColorblindMode(prev => {
      switch (prev) {
        case 'none': return 'icon';
        case 'icon': return 'number';
        case 'number': return 'letter';
        case 'letter': return 'none';
        default: return 'none';
      }
    });
  }, []);

  const handleToggleArchivedSlabs = useCallback(() => {
    setShowArchivedSlabs(prev => !prev);
  }, []);

  const reorderSlabs = useCallback((fromIndex: number, toIndex: number) => {
    setAllSlabs(prev => {
      const newSlabs = [...prev];
      const draggedSlab = newSlabs[fromIndex];
      
      // Remove the dragged item
      newSlabs.splice(fromIndex, 1);
      
      // Insert at the new position
      newSlabs.splice(toIndex, 0, draggedSlab);
      
      return newSlabs;
    });
  }, []);

  return {
    // State
    allSlabs,
    archivedSlabs,
    remainingGuesses,
    hasWon,
    draggedIndex,
    showGuessOverlay,
    pendingGuessedSlabs,
    isInGuessSession,
    flashGuessButton,
    selectedSlabForMaker,
    colorblindMode,
    showArchivedSlabs,
    isInIndividualGuessMode,
    currentGuessIndex,
    guessCorrectCount,
    guessIncorrectCount,
    slabsToGuess,
    evaluationResults,
    progress,
    isLoading,
    // Optimistic progress values (use these instead of progress for immediate updates)
    // These are always up-to-date and never fall back to stale progress
    optimisticTrophies,
    optimisticAttempts,
    optimisticTotalCorrect,
    
    // Actions
    handleSlabCreate,
    handleSlabClick,
    handleSlabArchive,
    handleSlabUnarchive,
    handleSlabDelete,
    handleShuffle,
    handleSort,
    handleGuessClick,
    handleCloseOverlay,
    handleGuessSubmit,
    handleIndividualGuessSubmit,
    handleProceedToNext,
    handleWinNext,
    handleCloseIndividualGuess,
    handleColorblindModeToggle,
    handleToggleArchivedSlabs,
    reorderSlabs,
    getSlabKey,
    getCurrentColors,
    getColorblindOverlay,
    getFilteredHiddenExamples,
    getSlabsForOverlay,
    getGroundTruth,
    incrementAttempts,
    addTrophy,
    markCompleted,
    updateCustomData,
  };
}
