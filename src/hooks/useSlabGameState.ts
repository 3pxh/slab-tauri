import { useState, useRef, useEffect, useCallback } from 'react';
import { Puzzle } from '../lib/supabase';
import { SlabData, areSlabsEqual, COLORS } from '../components/Slab';
import { deepCopy } from '../utils';
import { executeCodeSafely } from '../utils/sandbox';
import { usePuzzleProgress } from './usePuzzleProgress';
import { analytics } from '../utils/analytics';

export interface SlabGameState {
  // Core game state
  allSlabs: SlabData[];
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
  
  // Evaluation state
  evaluationResults: Map<string, boolean>;
  
  // Progress tracking
  progress: any;
  isLoading: boolean;
}

export interface SlabGameActions {
  // Slab management
  handleSlabCreate: (newSlab: SlabData) => void;
  handleSlabClick: (clickedSlab: SlabData) => void;
  handleShuffle: () => void;
  handleSort: () => void;
  
  // Guess session management
  handleGuessClick: () => void;
  handleCloseOverlay: () => void;
  handleGuessSubmit: (results: any[]) => Promise<void>;
  
  // UI controls
  handleColorblindModeToggle: () => void;
  
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

export function useSlabGameState(puzzle: Puzzle): SlabGameState & SlabGameActions {
  // Core game state
  const [allSlabs, setAllSlabs] = useState<SlabData[]>([]);
  const [remainingGuesses, setRemainingGuesses] = useState(3);
  const [hasWon, setHasWon] = useState(false);
  
  // UI state
  const [draggedIndex] = useState<number | null>(null);
  const [showGuessOverlay, setShowGuessOverlay] = useState(false);
  const [pendingGuessedSlabs, setPendingGuessedSlabs] = useState<SlabData[]>([]);
  const [isInGuessSession, setIsInGuessSession] = useState(false);
  const [flashGuessButton, setFlashGuessButton] = useState(false);
  const [selectedSlabForMaker, setSelectedSlabForMaker] = useState<SlabData | null>(null);
  const [colorblindMode, setColorblindMode] = useState<'none' | 'icon' | 'number' | 'letter'>('none');
  
  // Evaluation state
  const [evaluationResults, setEvaluationResults] = useState<Map<string, boolean>>(new Map());
  
  // Progress tracking
  const { progress, isLoading, incrementAttempts, addTrophy, markCompleted, updateCustomData } = usePuzzleProgress(puzzle.id);
  
  // Refs for preventing race conditions
  const isSubmittingGuessRef = useRef(false);
  const hasInitializedRef = useRef(false);

  // Colorblind mode definitions
  const COLORBLIND_ICONS = ['●', '≈', '▲', '■', '♥', '⬡']; // circle, squiggles, triangle, square, heart, hexagon
  const COLORBLIND_NUMBERS = ['1', '2', '3', '4', '5', '6'];
  const COLORBLIND_LETTERS = ['R', 'O', 'Y', 'G', 'B', 'P']; // Red, Orange, Yellow, Green, Blue, Purple

  // Initialize state from puzzle and progress data
  useEffect(() => {
    if (hasInitializedRef.current) {
      return; // Prevent re-initialization
    }
    
    // We need at least the puzzle data to initialize
    if (!puzzle.shown_examples) {
      return;
    }
    
    // If we're still loading progress data, wait for it to complete
    if (isLoading) {
      return;
    }
    
    // Start with shown examples as the base state
    let initialSlabs = puzzle.shown_examples;
    let initialRemainingGuesses = 3;
    let initialHasWon = false;
    let initialEvaluationResults = new Map<string, boolean>();
    
    // Only override with saved progress if we have meaningful saved data
    if (progress && progress.custom_data) {
      // Use saved slabs if available and not empty, otherwise fall back to shown examples
      if (progress.custom_data.savedSlabs && progress.custom_data.savedSlabs.length > 0) {
        initialSlabs = progress.custom_data.savedSlabs;
      }
      
      // Restore remaining guesses if available
      if (typeof progress.custom_data.remainingGuesses === 'number') {
        initialRemainingGuesses = progress.custom_data.remainingGuesses;
      }
      
      // Restore hasWon state if available
      if (typeof progress.custom_data.hasWon === 'boolean') {
        initialHasWon = progress.custom_data.hasWon;
      }
      
      // Restore evaluation results if available
      if (Array.isArray(progress.custom_data.evaluationResults)) {
        initialEvaluationResults = new Map<string, boolean>(progress.custom_data.evaluationResults);
      }
    } else if (progress) {
      // If we have progress but no custom_data, still restore basic progress info
      initialRemainingGuesses = Math.max(0, 3 - progress.attempts);
      initialHasWon = !!progress.completed_at;
    }
    
    // Set all initial state at once to prevent multiple renders
    setAllSlabs(initialSlabs);
    setRemainingGuesses(initialRemainingGuesses);
    setHasWon(initialHasWon);
    setEvaluationResults(initialEvaluationResults);
    
    // Mark as initialized
    hasInitializedRef.current = true;
  }, [puzzle.shown_examples, progress, isLoading]);

  // Pre-evaluate all slabs when puzzle loads (only after initialization)
  useEffect(() => {
    if (!hasInitializedRef.current) return; // Wait for initialization
    
    const preEvaluateAllSlabs = async () => {
      if (!puzzle.evaluate_fn.trim()) {
        return;
      }

      // Get all slabs that need evaluation (shown examples + hidden examples)
      const allSlabsToEvaluate = [
        ...(puzzle.shown_examples || []),
        ...(puzzle.hidden_examples || [])
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
    return COLORS;
  }, []);

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

  // Get hidden examples that are not already in the current slabs list
  const getFilteredHiddenExamples = useCallback((): SlabData[] => {
    if (!puzzle.hidden_examples || puzzle.hidden_examples.length === 0) {
      return [];
    }

    const hiddenSlabs = puzzle.hidden_examples;
    
    // Filter out hidden examples that are already in allSlabs
    const filteredHidden = hiddenSlabs.filter(hiddenSlab => 
      !allSlabs.some(existingSlab => areSlabsEqual(hiddenSlab, existingSlab))
    );

    // Return the first 5 filtered hidden examples
    return filteredHidden.slice(0, 5);
  }, [puzzle.hidden_examples, allSlabs]);

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
        hasWon,
        evaluationResults: Array.from(evaluationResults.entries())
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
  }, [isInGuessSession, remainingGuesses, hasWon, evaluationResults, updateCustomData, puzzle.id, evaluateSingleSlab]);

  const handleSlabClick = useCallback((clickedSlab: SlabData) => {
    // Deep clone the slab to prevent reference sharing
    const clonedSlab: SlabData = deepCopy(clickedSlab);
    
    setSelectedSlabForMaker(clonedSlab);
  }, []);

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
    
    setShowGuessOverlay(true);
    
    // Only start a new guess session if we're not already in one
    if (!isInGuessSession) {
      setIsInGuessSession(true);
      // Reset pending guessed slabs when starting a new guess session
      setPendingGuessedSlabs([]);
    }
  }, [remainingGuesses, isInGuessSession]);

  const handleCloseOverlay = useCallback(() => {
    setShowGuessOverlay(false);
    setIsInGuessSession(false);
    
    // Clear pending guessed slabs (they were already added in handleGuessSubmit)
    setPendingGuessedSlabs([]);
  }, []);

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
        
        // Track progress: increment attempts
        try {
          await incrementAttempts(puzzle.id);
        } catch (error) {
          console.error('Failed to save progress:', error);
        }
        
        // Force immediate save of the new state (do this first to avoid overwriting trophy count)
        const stateToSave = {
          savedSlabs: [...guessedSlabs, ...allSlabs],
          remainingGuesses: Math.max(0, remainingGuesses - 1),
          hasWon: allCorrect,
          evaluationResults: Array.from(evaluationResults.entries())
        };
        
        // Save immediately without debounce
        await updateCustomData(puzzle.id, stateToSave);
        
        // Check if player won (all guesses correct) - do this AFTER updateCustomData
        if (allCorrect) {
          setHasWon(true);
          
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
  }, [getFilteredHiddenExamples, remainingGuesses, allSlabs, evaluationResults, incrementAttempts, puzzle.id, updateCustomData, markCompleted, addTrophy, evaluateSingleSlab]);

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
    remainingGuesses,
    hasWon,
    draggedIndex,
    showGuessOverlay,
    pendingGuessedSlabs,
    isInGuessSession,
    flashGuessButton,
    selectedSlabForMaker,
    colorblindMode,
    evaluationResults,
    progress,
    isLoading,
    
    // Actions
    handleSlabCreate,
    handleSlabClick,
    handleShuffle,
    handleSort,
    handleGuessClick,
    handleCloseOverlay,
    handleGuessSubmit,
    handleColorblindModeToggle,
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
