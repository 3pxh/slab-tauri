import React from 'react';
import { FiArrowLeft, FiStar, FiX, FiChevronUp, FiChevronDown } from 'react-icons/fi';
import { Puzzle, getAllDates, supabase, createSlab, Slab as SlabRecord } from '../lib/supabase';
import SlabMaker from './SlabMaker';
import SlabComponent, { SlabData, areSlabsEqual, serializeSlab, deserializeSlab } from './Slab';
import { deepCopy, isIOS } from '../utils';
import { executeCodeSafely } from '../utils/sandbox';
import { ShareButton } from './ShareButton';

const GEORGE_USER_ID = '3996a43b-86dd-4bda-8807-dc3d8e76e5a7';

// Global rule creation guide text
const RULE_CREATION_GUIDE = `SLAB RULE CREATION GUIDE FOR LLMs
=====================================

This guide explains how to create evaluation rules for the SLAB puzzle game. These rules are JavaScript functions that determine whether a given slab configuration should return true or false.

SLAB DATA STRUCTURE
-------------------
\`\`\`typescript
interface Cell {
  groupId: number;
}

interface Group {
  id: number;
  color: number; // 0-6: Gray, Red, Orange, Yellow, Green, Blue, Purple
}

interface SlabData {
  cells: Cell[][]; // 6x6 grid
  groups: Record<number, Group>;
}
\`\`\`

COLOR INDICES
-------------
- 0 = Gray (#9e9e9e)
- 1 = Red (#e53935)
- 2 = Orange (#fb8c00)
- 3 = Yellow (#fdd835)
- 4 = Green (#43a047)
- 5 = Blue (#1e88e5)
- 6 = Purple (#8e24aa)

RULE CODE REQUIREMENTS
----------------------
Your rule code should:
1. Be a block of JavaScript code (NOT a function definition)
2. Have access to a \`slab\` parameter (automatically provided)
3. Return \`true\` or \`false\`
4. Be written as JavaScript code that will be passed to \`new Function('slab', yourCode)\`
5. Not use any external libraries or APIs
6. Complete execution within 5 seconds

IMPORTANT: Do NOT write \`function(slab) { ... }\` or \`(slab) => { ... }\`
The code you provide will be wrapped in a function automatically.

It must have a return statement to return a value.

Output the code for a rule that returns true if`;

type SlabWithId = SlabData & { id: number };

type SlabPuzzleCreatorProps = {
  onHome: () => void;
  onViewPuzzles: () => void;
  puzzle: Puzzle;
};

const SlabPuzzleCreator: React.FC<SlabPuzzleCreatorProps> = ({ 
  onHome,
  onViewPuzzles,
  puzzle
}) => {
  const [createdSlabs, setCreatedSlabs] = React.useState<SlabWithId[]>([]);
  const [puzzleName, setPuzzleName] = React.useState(puzzle.name || '');
  const [evaluationFn, setEvaluationFn] = React.useState(puzzle.evaluate_fn || '');
  const [ruleDescription, setRuleDescription] = React.useState(puzzle.rule_description || '');
  const [difficulty, setDifficulty] = React.useState(puzzle.difficulty || 1);
  const [isCreating, setIsCreating] = React.useState(false);
  const [shownExamples, setShownExamples] = React.useState<boolean[]>([]);
  const [hiddenExamples, setHiddenExamples] = React.useState<boolean[]>([]);
  // Store evaluation results keyed by serialized slab data for stable caching
  const [evaluationResults, setEvaluationResults] = React.useState<Map<string, boolean>>(new Map());
  const [isLoadingHistory, setIsLoadingHistory] = React.useState(false);
  const [slabsLoaded, setSlabsLoaded] = React.useState(false);
  const [copyButtonText, setCopyButtonText] = React.useState('Copy Prompt and Load Slabs');
  const copyButtonTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);
  const [createdPuzzleId, setCreatedPuzzleId] = React.useState<string | null>(null);
  // Pagination state
  const [slabsOffset, setSlabsOffset] = React.useState(0);
  const [hasMoreSlabs, setHasMoreSlabs] = React.useState(true);
  const [isLoadingMoreSlabs, setIsLoadingMoreSlabs] = React.useState(false);
  
  // Authentication state
  const [email, setEmail] = React.useState('');
  const [isAuthenticated, setIsAuthenticated] = React.useState(false);
  const [user, setUser] = React.useState<any>(null);
  const [isAuthLoading, setIsAuthLoading] = React.useState(false);
  const [authMessage, setAuthMessage] = React.useState('');
  
  // Check if current user is George
  const isGeorge = user?.id === GEORGE_USER_ID;
  
  // Rule guide modal state
  const [showRuleGuideModal, setShowRuleGuideModal] = React.useState(false);
  const [ruleGuideText, setRuleGuideText] = React.useState('');

  // Helper function to get a stable cache key from slab data
  const getSlabCacheKey = (slab: SlabData): string => {
    const { id, ...slabData } = slab as any; // Remove id if present
    const serialized = serializeSlab(slabData);
    return JSON.stringify(serialized);
  };

  // Function to calculate the next date after the last puzzle date
  const calculateNextDate = (dates: string[]): string => {
    if (dates.length === 0) {
      // If no dates exist, use today
      return new Date().toISOString();
    }
    
    // Find the latest date
    const latestDate = new Date(Math.max(...dates.map(date => new Date(date).getTime())));
    
    // Add one day to the latest date
    const nextDate = new Date(latestDate);
    nextDate.setDate(nextDate.getDate() + 1);
    
    return nextDate.toISOString();
  };

  // Function to load George's slabs from the slabs table with pagination and deduplication
  const loadSlabs = async (offset: number = 0, isInitialLoad: boolean = false) => {
    if (isInitialLoad) {
      setIsLoadingHistory(true);
    } else {
      setIsLoadingMoreSlabs(true);
    }
    
    try {
      const PAGE_SIZE = 100;
      
      // Query only George's slabs with pagination
      const { data, error } = await supabase
        .from('slabs')
        .select('*')
        .eq('creator_id', GEORGE_USER_ID)
        .order('created_at', { ascending: false })
        .range(offset, offset + PAGE_SIZE - 1);

      if (error) {
        throw new Error(`Failed to get George's slabs: ${error.message}`);
      }

      if (!data || data.length === 0) {
        if (isInitialLoad) {
          console.log('No George slabs found');
        } else {
          console.log('No more slabs to load');
        }
        setHasMoreSlabs(false);
        return;
      }

      // Check if there are more slabs to load
      setHasMoreSlabs(data.length === PAGE_SIZE);
      
      const allSlabs: SlabWithId[] = [];
      
      // Convert slabs from database to SlabWithId format
      data.forEach((slab: SlabRecord, index: number) => {
        // Deserialize if needed
        const slabData = slab.slab_data;
        const isSerialized = slabData && typeof slabData === 'object' && 'grid' in slabData && 'colors' in slabData;
        const deserializedSlab = isSerialized ? deserializeSlab(slabData) : slabData;
        
        allSlabs.push({
          ...deserializedSlab,
          id: Date.now() + Math.random() + index + offset // Ensure unique IDs for creator interface only
        });
      });
      
      if (allSlabs.length > 0) {
        console.log(`Loaded ${allSlabs.length} slabs from database (offset: ${offset})`);
        
        // Deduplicate slabs using the equality function
        const uniqueSlabs: SlabWithId[] = [];
        let duplicatesFound = 0;
        
        for (const slab of allSlabs) {
          const isDuplicate = uniqueSlabs.some(existing => {
            // Compare slab data without the id field
            const { id: _, ...slabData } = slab;
            const { id: __, ...existingData } = existing;
            const isEqual = areSlabsEqual(slabData, existingData);
            if (isEqual) {
              duplicatesFound++;
            }
            return isEqual;
          });
          
          if (!isDuplicate) {
            uniqueSlabs.push(slab);
          }
        }
        
        console.log(`After deduplication: ${uniqueSlabs.length} unique slabs (${duplicatesFound} duplicates removed)`);
        
        // Get current slabs and deduplicate against them
        setCreatedSlabs(prev => {
          console.log(`Current slabs in creator: ${prev.length}`);
          
          const combined = [...prev, ...uniqueSlabs];
          const finalUnique: SlabWithId[] = [];
          let additionalDuplicates = 0;
          
          for (const slab of combined) {
            const isDuplicate = finalUnique.some(existing => {
              // Compare slab data without the id field
              const { id: _, ...slabData } = slab;
              const { id: __, ...existingData } = existing;
              const isEqual = areSlabsEqual(slabData, existingData);
              if (isEqual) {
                additionalDuplicates++;
              }
              return isEqual;
            });
            
            if (!isDuplicate) {
              finalUnique.push(slab);
            }
          }
          
          console.log(`Final result: ${finalUnique.length} total slabs (${additionalDuplicates} additional duplicates removed against existing slabs)`);
          
          // Calculate how many new slabs were actually added
          const newSlabsCount = finalUnique.length - prev.length;
          
          // Update the other state arrays to match the new total
          if (newSlabsCount > 0) {
            setShownExamples(prevShown => [...prevShown, ...new Array(newSlabsCount).fill(false)]);
            setHiddenExamples(prevHidden => [...prevHidden, ...new Array(newSlabsCount).fill(false)]);
            // Evaluation results are now cached by slab data, so no need to initialize array
          }
          
          console.log(`Added ${newSlabsCount} new unique slabs to creator`);
          
          return finalUnique;
        });
        
        // Update offset for next load (use data.length, not allSlabs.length, to track database position)
        setSlabsOffset(offset + data.length);
      }
      
    } catch (error) {
      console.error('Failed to load George slabs:', error);
    } finally {
      if (isInitialLoad) {
        setIsLoadingHistory(false);
        setSlabsLoaded(true); // Mark as loaded even on error to prevent retrying
      } else {
        setIsLoadingMoreSlabs(false);
      }
    }
  };
  
  // Wrapper function for initial load (backwards compatibility)
  const loadAllPuzzles = async () => {
    setSlabsOffset(0);
    setHasMoreSlabs(true);
    await loadSlabs(0, true);
  };
  
  // Function to load next page of slabs
  const loadMoreSlabs = async () => {
    if (!isLoadingMoreSlabs && hasMoreSlabs) {
      await loadSlabs(slabsOffset, false);
    }
  };

  // Check authentication status on component mount and listen for changes
  React.useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUser(user);
        setIsAuthenticated(true);
        setEmail(user.email || '');
      }
    };
    checkAuth();

    // Listen for authentication state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser(session.user);
        setIsAuthenticated(true);
        setEmail(session.user.email || '');
        setAuthMessage('');
      } else {
        setUser(null);
        setIsAuthenticated(false);
        setEmail('');
        setAuthMessage('');
      }
    });

    return () => subscription.unsubscribe();
  }, []);


  // Set the publish date automatically when component mounts
  React.useEffect(() => {
    const setAutoDate = async () => {
      try {
        const response = await getAllDates();
        console.log('All puzzle dates:', response.dates);
        console.log('Total dates found:', response.count);
        
        const nextDate = calculateNextDate(response.dates);
        console.log('Calculated next date:', nextDate);
        
        // Update both the puzzle object and the display state
        puzzle.publish_date = nextDate;
        console.log('Set puzzle publish_date to:', puzzle.publish_date);
      } catch (error) {
        console.error('Failed to fetch dates, using current date:', error);
        // Fallback to current date if fetching fails
        const fallbackDate = new Date().toISOString();
        puzzle.publish_date = fallbackDate;
        console.log('Fallback: Set puzzle publish_date to current date:', puzzle.publish_date);
      }
    };

    setAutoDate();
  }, []);

  // Authentication functions
  const handleSignUp = async () => {
    if (!email.trim()) {
      setAuthMessage('Please enter an email address');
      return;
    }

    setIsAuthLoading(true);
    setAuthMessage('');
    
    try {
      const { error } = await supabase.auth.signUp({
        email: email.trim(),
        password: 'temp-password-' + Math.random().toString(36).substring(7), // Temporary password
        options: {
          emailRedirectTo: window.location.origin
        }
      });

      if (error) {
        setAuthMessage(`Sign up failed: ${error.message}`);
      } else {
        setAuthMessage('Check your email for a confirmation link!');
      }
    } catch (error) {
      setAuthMessage(`Sign up failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsAuthLoading(false);
    }
  };

  const handleSignIn = async () => {
    if (!email.trim()) {
      setAuthMessage('Please enter an email address');
      return;
    }

    setIsAuthLoading(true);
    setAuthMessage('');
    
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: {
          emailRedirectTo: window.location.origin
        }
      });

      if (error) {
        setAuthMessage(`Sign in failed: ${error.message}`);
      } else {
        setAuthMessage('Check your email for a sign-in link!');
      }
    } catch (error) {
      setAuthMessage(`Sign in failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsAuthLoading(false);
    }
  };

  const handleSignOut = async () => {
    setIsAuthLoading(true);
    try {
      await supabase.auth.signOut();
      setUser(null);
      setIsAuthenticated(false);
      setEmail('');
      setAuthMessage('');
    } catch (error) {
      setAuthMessage(`Sign out failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsAuthLoading(false);
    }
  };

  const handleSlabCreate = async (slab: SlabData) => {
    // Deep clone the slab to prevent reference sharing
    const slabWithId: SlabWithId = { 
      ...deepCopy(slab),
      id: Date.now() + Math.random() 
    };
    
    setCreatedSlabs(prev => {
      // Check if this slab already exists (compare without id field)
      const isDuplicate = prev.some(existing => {
        const { id: _, ...existingData } = existing;
        return areSlabsEqual(slab, existingData);
      });
      if (isDuplicate) {
        return prev; // Don't add duplicate
      }
      
      // Add the new slab at the beginning of the list
      return [slabWithId, ...prev];
    });
    
    // Only update other arrays if we actually added a new slab
    setCreatedSlabs(prev => {
      const currentLength = prev.length;
      setShownExamples(prevShown => {
        if (currentLength > prevShown.length) {
          return [false, ...prevShown]; // Add at beginning to match slab order
        }
        return prevShown;
      });
      setHiddenExamples(prevHidden => {
        if (currentLength > prevHidden.length) {
          return [false, ...prevHidden]; // Add at beginning to match slab order
        }
        return prevHidden;
      });
      return prev;
    });

    // Automatically save to database if user is authenticated
    if (isAuthenticated) {
      try {
        await createSlab(slab);
      } catch (error) {
        console.error('Slab created but failed to save to database:', error);
      }
    }

    // Automatically run evaluation on the new slab only if there's an evaluation function
    if (evaluationFn.trim()) {
      // Use setTimeout to ensure state updates are complete before running evaluation
      setTimeout(async () => {
        try {
          // Only evaluate the new slab - use cached results for existing slabs
          const cacheKey = getSlabCacheKey(slab);
          
          try {
            const result = await executeCodeSafely(evaluationFn, slab, 5000);
            if (result.success) {
              // Update cache with the new result
              setEvaluationResults(prev => {
                const newMap = new Map(prev);
                newMap.set(cacheKey, result.result);
                return newMap;
              });
            } else {
              console.error('Error evaluating new slab:', result.error);
              // Cache false result on error
              setEvaluationResults(prev => {
                const newMap = new Map(prev);
                newMap.set(cacheKey, false);
                return newMap;
              });
            }
          } catch (error) {
            console.error('Error evaluating new slab:', error);
            // Cache false result on error
            setEvaluationResults(prev => {
              const newMap = new Map(prev);
              newMap.set(cacheKey, false);
              return newMap;
            });
          }
        } catch (error) {
          console.error('Error running automatic evaluation:', error);
        }
      }, 0);
    }
  };

  const handleShownExampleChange = (index: number, isShown: boolean) => {
    setShownExamples(prev => {
      const newShown = [...prev];
      newShown[index] = isShown;
      return newShown;
    });
  };

  const handleHiddenExampleChange = (index: number, isHidden: boolean) => {
    setHiddenExamples(prev => {
      const newHidden = [...prev];
      newHidden[index] = isHidden;
      return newHidden;
    });
  };

  const handleSlabClick = (index: number) => {
    // Move the clicked slab to the beginning of the list
    setCreatedSlabs(prev => {
      const newSlabs = [...prev];
      const clickedSlab = newSlabs.splice(index, 1)[0];
      return [clickedSlab, ...newSlabs];
    });

    // Reorder the corresponding state arrays
    setShownExamples(prev => {
      const newShown = [...prev];
      const clickedShown = newShown.splice(index, 1)[0];
      return [clickedShown, ...newShown];
    });

    setHiddenExamples(prev => {
      const newHidden = [...prev];
      const clickedHidden = newHidden.splice(index, 1)[0];
      return [clickedHidden, ...newHidden];
    });

    // Evaluation results are keyed by slab data, so no need to reorder
  };

  const handleSortSlabs = () => {
    // Create array of indices with their evaluation results
    const slabsWithResults = createdSlabs.map((slab, index) => {
      const cacheKey = getSlabCacheKey(slab);
      const result = evaluationResults.get(cacheKey);
      // Treat undefined as false for sorting purposes
      return {
        index,
        slab,
        result: result ?? false,
        shown: shownExamples[index],
        hidden: hiddenExamples[index]
      };
    });

    // Sort: true results first, then false results
    slabsWithResults.sort((a, b) => {
      // If both have same result, maintain original order
      if (a.result === b.result) {
        return a.index - b.index;
      }
      // True results come first
      return a.result ? -1 : 1;
    });

    // Reorder slabs and corresponding arrays
    const newSlabs: SlabWithId[] = [];
    const newShown: boolean[] = [];
    const newHidden: boolean[] = [];

    slabsWithResults.forEach(({ slab, shown, hidden }) => {
      newSlabs.push(slab);
      newShown.push(shown);
      newHidden.push(hidden);
    });

    setCreatedSlabs(newSlabs);
    setShownExamples(newShown);
    setHiddenExamples(newHidden);
  };


  const handleEvaluationFnBlur = async () => {
    // Clear cache when evaluation function changes
    setEvaluationResults(new Map());
    
    // Auto-run evaluation if there are slabs and a function
    if (evaluationFn.trim() && createdSlabs.length > 0) {
      // Use setTimeout to ensure blur event completes before running evaluation
      setTimeout(() => {
        handleRunEvaluation();
      }, 0);
    }
  };

  const handleRunEvaluation = async () => {
    if (!evaluationFn.trim()) {
      return;
    }

    if (createdSlabs.length === 0) {
      return;
    }

    try {
      // Read current cache
      let currentCache: Map<string, boolean> = new Map();
      setEvaluationResults(prev => {
        currentCache = new Map(prev);
        return prev;
      });
      
      // Build new cache starting with existing cached results
      const newCache = new Map<string, boolean>(currentCache);
      
      // Filter out slabs that are already cached
      const slabsToEvaluate = createdSlabs.filter(slab => {
        const cacheKey = getSlabCacheKey(slab);
        return !newCache.has(cacheKey);
      });
      
      if (slabsToEvaluate.length === 0) {
        console.log('All slabs already evaluated');
        return;
      }
      
      // Process slabs in batches of 50
      const BATCH_SIZE = 50;
      for (let i = 0; i < slabsToEvaluate.length; i += BATCH_SIZE) {
        const batch = slabsToEvaluate.slice(i, i + BATCH_SIZE);
        const batchNumber = Math.floor(i / BATCH_SIZE) + 1;
        const totalBatches = Math.ceil(slabsToEvaluate.length / BATCH_SIZE);
        
        console.log(`Evaluating batch ${batchNumber}/${totalBatches} (${batch.length} slabs)`);
        
        // Evaluate this batch
        await Promise.all(
          batch.map(async (slab) => {
            const cacheKey = getSlabCacheKey(slab);
            
            // Evaluate this slab
            try {
              const result = await executeCodeSafely(evaluationFn, slab, 5000);
              if (result.success) {
                newCache.set(cacheKey, result.result);
              } else {
                console.error('Error evaluating slab:', result.error);
                newCache.set(cacheKey, false);
              }
            } catch (error) {
              console.error('Error evaluating slab:', error);
              newCache.set(cacheKey, false);
            }
          })
        );
        
        // Update cache after each batch so UI can show progress
        setEvaluationResults(new Map(newCache));
      }
      
      console.log(`Finished evaluating ${slabsToEvaluate.length} slabs`);
      
    } catch (error) {
      console.error('Error running evaluation:', error);
    }
  };

  const handleSharePuzzle = async (puzzleId: string, puzzleName: string) => {
    const shareUrl = `${window.location.origin}/puzzle/shared/${puzzleId}`;
    
    // Use Web Share API on iOS/mobile if available
    const ios = isIOS();
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    if (navigator.share && (ios || isMobile)) {
      try {
        await navigator.share({
          title: `Check out "${puzzleName}" on Slab!`,
          text: `Try solving this puzzle: ${puzzleName}`,
          url: shareUrl,
        });
        return;
      } catch (err) {
        // User cancelled or share failed, fall through to clipboard
        if ((err as Error).name === 'AbortError') {
          return; // User cancelled, don't show error
        }
        console.warn('Web Share API failed, falling back to clipboard:', err);
      }
    }
    
    // Fallback to clipboard for desktop or if Web Share API fails
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(shareUrl);
      } else {
        // Fallback for browsers that don't support clipboard API
        const textArea = document.createElement('textarea');
        textArea.value = shareUrl;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
    } catch (err) {
      console.error('Failed to copy to clipboard:', err);
    }
  };

  const handleCopyRulePrompt = async () => {
    // Load all slabs if they haven't been loaded yet
    if (!slabsLoaded && !isLoadingHistory) {
      await loadAllPuzzles();
    }
    
    // Append rule description to the prompt if it exists
    const promptText = ruleDescription.trim() 
      ? `${RULE_CREATION_GUIDE} ${ruleDescription.trim()}`
      : RULE_CREATION_GUIDE;
    
    try {
      // Clear any existing timeout
      if (copyButtonTimeoutRef.current) {
        clearTimeout(copyButtonTimeoutRef.current);
      }
      
      // Try modern clipboard API first
      if (navigator.clipboard && window.isSecureContext) {
        try {
          await navigator.clipboard.writeText(promptText);
          setCopyButtonText('AI instructions copied');
          copyButtonTimeoutRef.current = setTimeout(() => {
            setCopyButtonText('Copy Prompt and Load Slabs');
            copyButtonTimeoutRef.current = null;
          }, 3000);
          return;
        } catch (clipboardError) {
          console.warn('Clipboard API failed, trying fallback:', clipboardError);
        }
      }
      
      // Fallback for mobile and non-secure contexts
      const textArea = document.createElement('textarea');
      textArea.value = promptText;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      textArea.style.top = '-999999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      
      try {
        const successful = document.execCommand('copy');
        if (successful) {
          setCopyButtonText('AI instructions copied');
          copyButtonTimeoutRef.current = setTimeout(() => {
            setCopyButtonText('Copy Rule Prompt');
            copyButtonTimeoutRef.current = null;
          }, 3000);
        } else {
          throw new Error('execCommand copy failed');
        }
      } catch (execError) {
        console.error('execCommand failed:', execError);
        // Last resort: show the text in a modal for manual copying
        setShowRuleGuideModal(true);
        setRuleGuideText(promptText);
      } finally {
        document.body.removeChild(textArea);
      }
    } catch (error) {
      console.error('Failed to copy rule guide:', error);
    }
  };

  const scrollToTop = () => {
    // The page scrolls on #root, not window (see index.css)
    const rootElement = document.getElementById('root');
    if (rootElement) {
      rootElement.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
    } else {
      // Fallback to window scroll
      window.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
    }
  };

  const scrollToBottom = () => {
    // The page scrolls on #root, not window (see index.css)
    const rootElement = document.getElementById('root');
    if (rootElement) {
      rootElement.scrollTo({
        top: rootElement.scrollHeight,
        behavior: 'smooth'
      });
    } else {
      // Fallback to window scroll
      window.scrollTo({
        top: document.documentElement.scrollHeight,
        behavior: 'smooth'
      });
    }
  };

  const handleCreatePuzzle = async () => {
    if (!puzzleName.trim() || !evaluationFn.trim()) {
      return;
    }

    setIsCreating(true);
    try {
      // Separate slabs into shown and hidden examples
      const shownSlabs = createdSlabs.filter((_, index) => shownExamples[index]);
      const hiddenSlabs = createdSlabs.filter((_, index) => hiddenExamples[index]);

      // Serialize slabs before saving to database
      // Remove the id field before serializing (it's only for the creator interface)
      const serializedShownSlabs = shownSlabs.map(slab => {
        const { id, ...slabData } = slab;
        return serializeSlab(slabData);
      });
      const serializedHiddenSlabs = hiddenSlabs.map(slab => {
        const { id, ...slabData } = slab;
        return serializeSlab(slabData);
      });

      const { data, error } = await supabase
        .from('puzzles')
        .insert([{
          name: puzzleName.trim(),
          content_type: puzzle.content_type,
          evaluate_fn: evaluationFn.trim(),
          rule_description: ruleDescription.trim() || null,
          difficulty: difficulty,
          shown_examples: serializedShownSlabs,
          hidden_examples: serializedHiddenSlabs,
          publish_date: puzzle.publish_date || new Date().toISOString(),
          creator_id: (await supabase.auth.getUser()).data.user?.id
        }])
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to create puzzle: ${error.message}`);
      }

      setCreatedPuzzleId(data.id);
      // Optionally navigate back to home or show success message
    } catch (error) {
      console.error('Failed to create puzzle:', error);
    } finally {
      setIsCreating(false);
    }
  };

  // If not authenticated, only show authentication UI
  if (!isAuthenticated) {
    return (
      <div className="p-4 w-full max-w-7xl mx-auto">
        {/* Back to Home Button */}
        <div className="mb-4">
          <button
            onClick={onHome}
            className="flex items-center space-x-2 text-gray-600 hover:text-gray-800 transition-colors"
          >
            <FiArrowLeft size={20} />
            <span>Back to Home</span>
          </button>
        </div>

        {/* Authentication Section */}
        <div className="max-w-md mx-auto">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-gray-800 mb-2">Puzzle Creator</h1>
            <p className="text-gray-600">Sign in to create and manage your puzzles</p>
          </div>
          
          <div className="p-6 bg-blue-50 rounded-lg border border-blue-200">
            <h3 className="text-lg font-semibold mb-4 text-blue-800 text-center">Authentication Required</h3>
            
            <div className="space-y-4">
              <div>
                <label htmlFor="auth-email" className="block text-sm font-medium text-gray-700 mb-1">
                  Email Address
                </label>
                <input
                  id="auth-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter your email address..."
                  disabled={isAuthLoading}
                />
              </div>
              
              <div className="flex space-x-2">
                <button
                  onClick={handleSignIn}
                  disabled={isAuthLoading || !email.trim()}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-medium py-2 px-4 rounded-md transition-colors duration-200"
                >
                  {isAuthLoading ? 'Loading...' : 'Sign In'}
                </button>
                <button
                  onClick={handleSignUp}
                  disabled={isAuthLoading || !email.trim()}
                  className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-medium py-2 px-4 rounded-md transition-colors duration-200"
                >
                  {isAuthLoading ? 'Loading...' : 'Create Account'}
                </button>
              </div>
              
              {authMessage && (
                <div className={`p-3 rounded-md text-sm ${
                  authMessage.includes('failed') || authMessage.includes('Please enter')
                    ? 'bg-red-100 text-red-700 border border-red-200'
                    : 'bg-green-100 text-green-700 border border-green-200'
                }`}>
                  {authMessage}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Scroll Buttons - Always Visible */}
        <button
          onClick={scrollToTop}
          className="fixed top-2 right-2 w-12 h-12 bg-blue-500 hover:bg-blue-600 text-white rounded-full shadow-lg transition-all duration-200 hover:shadow-xl hover:scale-110 flex items-center justify-center z-50"
          title="Scroll to top"
          aria-label="Scroll to top of page"
        >
          <FiChevronUp size={24} />
        </button>
        <button
          onClick={scrollToBottom}
          className="fixed bottom-2 right-2 w-12 h-12 bg-blue-500 hover:bg-blue-600 text-white rounded-full shadow-lg transition-all duration-200 hover:shadow-xl hover:scale-110 flex items-center justify-center z-50"
          title="Scroll to bottom"
          aria-label="Scroll to bottom of page"
        >
          <FiChevronDown size={24} />
        </button>
      </div>
    );
  }

  return (
    <div className="p-4 w-full max-w-7xl mx-auto">
      {/* Back to Home Button */}
      <div className="mb-4">
        <button
          onClick={onHome}
          className="flex items-center space-x-2 text-gray-600 hover:text-gray-800 transition-colors"
        >
          <FiArrowLeft size={20} />
          <span>Back to Home</span>
        </button>
      </div>

      {/* Authentication Section - Only show when authenticated and user is George */}
      {isGeorge && (
        <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
          <h3 className="text-lg font-semibold mb-3 text-blue-800">Authentication</h3>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                <span className="text-white text-sm font-medium">✓</span>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-700">Signed in as</p>
                <p className="text-sm text-gray-600">{user?.email}</p>
              </div>
            </div>
            <button
              onClick={handleSignOut}
              disabled={isAuthLoading}
              className="bg-red-600 hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-medium py-2 px-4 rounded-md transition-colors duration-200"
            >
              {isAuthLoading ? 'Signing out...' : 'Sign Out'}
            </button>
          </div>
        </div>
      )}

      {/* View My Puzzles Button - Centered */}
      <div className="mb-4 flex justify-center">
        <button
          onClick={onViewPuzzles}
          className="px-6 py-3 text-base font-medium bg-green-500 text-white rounded hover:bg-green-600 transition-colors"
        >
          View My Puzzles
        </button>
      </div>

      {/* Puzzle Information */}
      <div className="mb-4 p-3 bg-gray-100 rounded-lg">
        {/* Puzzle Name Field */}
        <div className="mb-4">
          <label htmlFor="puzzle-name" className="block text-sm font-medium text-gray-700 mb-1">
            Puzzle Name
          </label>
          <input
            id="puzzle-name"
            type="text"
            value={puzzleName}
            onChange={(e) => setPuzzleName(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Enter puzzle name..."
          />
        </div>

        {/* Rule Description Field */}
        <div className="mb-4">
          <label htmlFor="rule-description" className="block text-sm font-medium text-gray-700 mb-1">
            Rule Description
          </label>
          <textarea
            id="rule-description"
            value={ruleDescription}
            onChange={(e) => setRuleDescription(e.target.value)}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Enter a description of the puzzle rule (e.g. 'no red groups', 'all blue groups have at least three cells')"
          />
          <div className="mt-2">
            <button
              onClick={handleCopyRulePrompt}
              disabled={!ruleDescription.trim()}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed disabled:hover:bg-gray-400 text-white font-medium py-2 px-4 rounded-md transition-colors duration-200"
            >
              {copyButtonText}
            </button>
          </div>
        </div>

        {/* Evaluation Function Field */}
        <div className="mb-4">
          <p className='mb-2'>
            Paste the rule prompt into an AI. It will write some code. Copy the code into the evaluation function box below. Make slabs and check that they get stars and x's in accord with your description.
          </p>
          <label htmlFor="evaluation-fn" className="block text-sm font-medium text-gray-700 mb-1">
            Evaluation Function
          </label>
          <textarea
            id="evaluation-fn"
            value={evaluationFn}
            onChange={(e) => setEvaluationFn(e.target.value)}
            onBlur={handleEvaluationFnBlur}
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Enter evaluation function code..."
          />
          
          <p className='mt-2'>
            Shown slabs are given when the puzzle starts, give at least 2 (one X, one star) if you're generous. Hidden slabs are revealed 5 at a time in the order in which they are presented in the list below, so make 15 of them so there are 3 guesses. All shown slabs are available when starting a level (it's recommended to make 2, one which follows the rule and one which doesn't).
          </p>
          <p className='mt-2'>
            Clicking on a slab will bring it to the front of the list (works in the shown/hidden slab lists too for reordering).
          </p>
        </div>

        {/* Difficulty Field */}
        <div className="mb-4">
          <label htmlFor="difficulty" className="block text-sm font-medium text-gray-700 mb-1">
            Estimated Difficulty Level
          </label>
          <select
            id="difficulty"
            value={difficulty}
            onChange={(e) => setDifficulty(parseInt(e.target.value))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value={1}>1 - Very Easy</option>
            <option value={2}>2 - Easy</option>
            <option value={3}>3 - Medium</option>
            <option value={4}>4 - Hard</option>
            <option value={5}>5 - Very Hard</option>
          </select>
        </div>
      </div>

      {/* SlabMaker for creating slabs */}
      <div className="mb-8">
        <SlabMaker onCreate={handleSlabCreate} />
      </div>

      {/* Example Count Summary */}
      {createdSlabs.length > 0 && (
        <div className="mt-8 pt-6 border-t border-gray-200">
          <div className="mb-4 p-4 bg-gray-50 rounded-lg">
            <h4 className="text-sm font-medium text-gray-700 mb-2">Example Summary</h4>
            <div className="flex justify-between text-sm">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-blue-600 rounded-full mr-2"></div>
                <span className="text-gray-600">Shown Examples: <strong>{shownExamples.filter(Boolean).length}</strong></span>
              </div>
              <div className="flex items-center">
                <div className="w-3 h-3 bg-red-600 rounded-full mr-2"></div>
                <span className="text-gray-600">Hidden Examples: <strong>{hiddenExamples.filter(Boolean).length}</strong></span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Puzzle Button */}
      <div className="mt-4">
        {(() => {
          const hiddenCount = hiddenExamples.filter(Boolean).length;
          const neededCount = 15 - hiddenCount;
          const hasEnoughHidden = hiddenCount >= 15;
          const isDisabled = isCreating || !puzzleName.trim() || !evaluationFn.trim() || !hasEnoughHidden;
          
          let buttonText = 'Create Puzzle';
          if (isCreating) {
            buttonText = 'Creating Puzzle...';
          } else if (!hasEnoughHidden) {
            buttonText = `Need ${neededCount} more hidden slab${neededCount === 1 ? '' : 's'}`;
          }
          
          return (
            <div className="space-y-3">
              <button
                onClick={handleCreatePuzzle}
                disabled={isDisabled}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200"
              >
                {buttonText}
              </button>
              {createdPuzzleId && (
                <ShareButton
                  onClick={() => handleSharePuzzle(createdPuzzleId, puzzleName)}
                  title="Share puzzle"
                  ariaLabel="Share puzzle"
                  size={20}
                  variant="button"
                  className="w-full"
                />
              )}
            </div>
          );
        })()}
      </div>

      {/* Shown Examples Section */}
      {createdSlabs.length > 0 && shownExamples.some(Boolean) && (
        <div className="mt-8">
          <h3 className="text-lg font-semibold mb-4">Shown Examples</h3>
          <div className="flex flex-wrap gap-2">
            {createdSlabs.map((slab, index) => {
              if (!shownExamples[index]) return null;
              return (
                <div key={slab.id} className="flex flex-col items-center flex-shrink-0">
                  <div className="mb-1 text-xs font-medium">#{index + 1}</div>
                  <div 
                    onClick={() => handleSlabClick(index)}
                    className="cursor-pointer hover:opacity-80 transition-opacity duration-200 relative"
                    style={{ width: '80px', height: '80px' }}
                    title="Click to move to front"
                  >
                    <SlabComponent slab={slab} size="small" className="w-full h-full" />
                    {/* Evaluation annotation directly on slab */}
                    {(() => {
                      const cacheKey = getSlabCacheKey(slab);
                      const result = evaluationResults.get(cacheKey);
                      return result !== undefined && (
                        <div 
                          className="absolute"
                          style={{
                            top: '-4px',
                            right: '-4px',
                            color: '#000000',
                            filter: 'drop-shadow(1px 1px 0 white) drop-shadow(-1px -1px 0 white) drop-shadow(1px -1px 0 white) drop-shadow(-1px 1px 0 white)'
                          }}
                        >
                          {result ? (
                            <FiStar size={16} className="fill-yellow-400 text-yellow-500" />
                          ) : (
                            <FiX size={16} className="text-red-500" />
                          )}
                        </div>
                      );
                    })()}
                  </div>
                  <div className="mt-3 flex gap-1">
                    <button
                      onClick={() => handleShownExampleChange(index, !shownExamples[index])}
                      className={`px-2 py-1 text-xs font-medium rounded transition-colors duration-200 ${
                        shownExamples[index] 
                          ? 'bg-blue-600 text-white' 
                          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      }`}
                    >
                      Shown
                    </button>
                    <button
                      onClick={() => handleHiddenExampleChange(index, !hiddenExamples[index])}
                      className={`px-2 py-1 text-xs font-medium rounded transition-colors duration-200 ${
                        hiddenExamples[index] 
                          ? 'bg-red-600 text-white' 
                          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      }`}
                    >
                      Hidden
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Guessing Slabs Section */}
      {createdSlabs.length > 0 && hiddenExamples.some(Boolean) && (
        <div className="mt-8">
          <h3 className="text-lg font-semibold mb-4">Guessing Slabs</h3>
          <div className="flex flex-wrap gap-2">
            {createdSlabs.map((slab, index) => {
              if (!hiddenExamples[index]) return null;
              return (
                <div key={slab.id} className="flex flex-col items-center flex-shrink-0">
                  <div className="mb-1 text-xs font-medium">#{index + 1}</div>
                  <div 
                    onClick={() => handleSlabClick(index)}
                    className="cursor-pointer hover:opacity-80 transition-opacity duration-200 relative"
                    style={{ width: '80px', height: '80px' }}
                    title="Click to move to front"
                  >
                    <SlabComponent slab={slab} size="small" className="w-full h-full" />
                    {/* Evaluation annotation directly on slab */}
                    {(() => {
                      const cacheKey = getSlabCacheKey(slab);
                      const result = evaluationResults.get(cacheKey);
                      return result !== undefined && (
                        <div 
                          className="absolute"
                          style={{
                            top: '-4px',
                            right: '-4px',
                            color: '#000000',
                            filter: 'drop-shadow(1px 1px 0 white) drop-shadow(-1px -1px 0 white) drop-shadow(1px -1px 0 white) drop-shadow(-1px 1px 0 white)'
                          }}
                        >
                          {result ? (
                            <FiStar size={16} className="fill-yellow-400 text-yellow-500" />
                          ) : (
                            <FiX size={16} className="text-red-500" />
                          )}
                        </div>
                      );
                    })()}
                  </div>
                  <div className="mt-3 flex gap-1">
                    <button
                      onClick={() => handleShownExampleChange(index, !shownExamples[index])}
                      className={`px-2 py-1 text-xs font-medium rounded transition-colors duration-200 ${
                        shownExamples[index] 
                          ? 'bg-blue-600 text-white' 
                          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      }`}
                    >
                      Shown
                    </button>
                    <button
                      onClick={() => handleHiddenExampleChange(index, !hiddenExamples[index])}
                      className={`px-2 py-1 text-xs font-medium rounded transition-colors duration-200 ${
                        hiddenExamples[index] 
                          ? 'bg-red-600 text-white' 
                          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      }`}
                    >
                      Hidden
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
      
      {/* Created Slabs Display */}
      {createdSlabs.length > 0 && (
        <div className="mt-8">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Created Slabs ({createdSlabs.length})</h3>
            <button
              onClick={handleSortSlabs}
              className="px-3 py-1 text-sm bg-gray-600 hover:bg-gray-700 text-white font-medium rounded transition-colors duration-200"
              title="Sort slabs by evaluation result (true first)"
            >
              Sort by Result
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {createdSlabs.map((slab, index) => (
              <div key={slab.id} className="flex flex-col items-center flex-shrink-0">
                <div className="mb-1 text-xs font-medium">#{index + 1}</div>
                <div 
                  onClick={() => handleSlabClick(index)}
                  className="cursor-pointer hover:opacity-80 transition-opacity duration-200 relative"
                  style={{ width: '80px', height: '80px' }}
                  title="Click to move to front"
                >
                  <SlabComponent slab={slab} size="small" className="w-full h-full" />
                  {/* Evaluation annotation directly on slab */}
                  {(() => {
                    const cacheKey = getSlabCacheKey(slab);
                    const result = evaluationResults.get(cacheKey);
                    return result !== undefined && (
                      <div 
                        className="absolute"
                        style={{
                          top: '-4px',
                          right: '-4px',
                          color: '#000000',
                          filter: 'drop-shadow(1px 1px 0 white) drop-shadow(-1px -1px 0 white) drop-shadow(1px -1px 0 white) drop-shadow(-1px 1px 0 white)'
                        }}
                      >
                        {result ? (
                          <FiStar size={16} className="fill-yellow-400 text-yellow-500" />
                        ) : (
                          <FiX size={16} className="text-red-500" />
                        )}
                      </div>
                    );
                  })()}
                </div>
                <div className="mt-3 flex gap-1">
                  <button
                    onClick={() => handleShownExampleChange(index, !shownExamples[index])}
                    className={`px-2 py-1 text-xs font-medium rounded transition-colors duration-200 ${
                      shownExamples[index] 
                        ? 'bg-blue-600 text-white' 
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    Shown
                  </button>
                  <button
                    onClick={() => handleHiddenExampleChange(index, !hiddenExamples[index])}
                    className={`px-2 py-1 text-xs font-medium rounded transition-colors duration-200 ${
                      hiddenExamples[index] 
                        ? 'bg-red-600 text-white' 
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    Hidden
                  </button>
                </div>
              </div>
              ))}
          </div>
          
          {/* Load More Button */}
          {slabsLoaded && hasMoreSlabs && (
            <div className="mt-4 flex justify-center">
              <button
                onClick={loadMoreSlabs}
                disabled={isLoadingMoreSlabs}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-medium rounded-md transition-colors duration-200"
              >
                {isLoadingMoreSlabs ? 'Loading...' : 'Load More Slabs (Next 100)'}
              </button>
            </div>
          )}
        </div>
      )}


      {/* Rule Guide Modal - Fallback for when clipboard fails */}
      {showRuleGuideModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[80vh] flex flex-col">
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Rule Creation Guide</h3>
                <button
                  onClick={() => setShowRuleGuideModal(false)}
                  className="text-gray-500 hover:text-gray-700 text-xl font-bold"
                >
                  ×
                </button>
              </div>
              <p className="text-sm text-gray-600 mt-1">
                Copy the text below manually since automatic clipboard copy failed
              </p>
            </div>
            <div className="flex-1 overflow-auto p-4">
              <textarea
                value={ruleGuideText}
                readOnly
                className="w-full h-full min-h-[400px] p-3 border border-gray-300 rounded-md font-mono text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                onClick={(e) => {
                  e.currentTarget.select();
                }}
              />
            </div>
            <div className="p-4 border-t border-gray-200">
              <div className="flex space-x-2">
                <button
                  onClick={() => {
                    const textarea = document.querySelector('textarea') as HTMLTextAreaElement;
                    if (textarea) {
                      textarea.select();
                      try {
                        document.execCommand('copy');
                      } catch (error) {
                        // Copy failed, text is already selected for manual copying
                      }
                    }
                  }}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md transition-colors duration-200"
                >
                  Select All
                </button>
                <button
                  onClick={() => setShowRuleGuideModal(false)}
                  className="flex-1 bg-gray-600 hover:bg-gray-700 text-white font-medium py-2 px-4 rounded-md transition-colors duration-200"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Scroll Buttons - Always Visible */}
      <button
        onClick={scrollToTop}
        className="fixed top-2 right-2 w-12 h-12 bg-blue-500 hover:bg-blue-600 text-white rounded-full shadow-lg transition-all duration-200 hover:shadow-xl hover:scale-110 flex items-center justify-center z-50"
        title="Scroll to top"
        aria-label="Scroll to top of page"
      >
        <FiChevronUp size={24} />
      </button>
      <button
        onClick={scrollToBottom}
        className="fixed bottom-2 right-2 w-12 h-12 bg-blue-500 hover:bg-blue-600 text-white rounded-full shadow-lg transition-all duration-200 hover:shadow-xl hover:scale-110 flex items-center justify-center z-50"
        title="Scroll to bottom"
        aria-label="Scroll to bottom of page"
      >
        <FiChevronDown size={24} />
      </button>
    </div>
  );
};

export default SlabPuzzleCreator;
