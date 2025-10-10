import React from 'react';
import { FiArrowLeft } from 'react-icons/fi';
import { Puzzle, getAllDates, getPuzzle, supabase, getUserSlabs, createSlab, deleteSlab, Slab as SlabRecord } from '../lib/supabase';
import SlabMaker from './SlabMaker';
import SlabComponent, { SlabData, areSlabsEqual } from './Slab';
import { deepCopy, formatDateUTC } from '../utils';
import { executeCodeSafely } from '../utils/sandbox';

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
  const [isCreating, setIsCreating] = React.useState(false);
  const [shownExamples, setShownExamples] = React.useState<boolean[]>([]);
  const [hiddenExamples, setHiddenExamples] = React.useState<boolean[]>([]);
  const [evaluationResults, setEvaluationResults] = React.useState<boolean[]>([]);
  const [isRunning, setIsRunning] = React.useState(false);
  const [displayDate, setDisplayDate] = React.useState(puzzle.publish_date);
  const [isLoadingHistory, setIsLoadingHistory] = React.useState(false);
  
  // Authentication state
  const [email, setEmail] = React.useState('');
  const [isAuthenticated, setIsAuthenticated] = React.useState(false);
  const [user, setUser] = React.useState<any>(null);
  const [isAuthLoading, setIsAuthLoading] = React.useState(false);
  const [authMessage, setAuthMessage] = React.useState('');
  
  // Slab management state
  const [savedSlabs, setSavedSlabs] = React.useState<SlabRecord[]>([]);
  const [isLoadingSlabs, setIsLoadingSlabs] = React.useState(false);
  const [slabMessage, setSlabMessage] = React.useState('');
  const [editingSlab, setEditingSlab] = React.useState<SlabRecord | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = React.useState(false);

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

  // Function to load all puzzles and their examples with deduplication
  const loadAllPuzzles = async () => {
    setIsLoadingHistory(true);
    try {
      const response = await getAllDates();
      console.log('All puzzle dates:', response.dates);
      
      if (response.dates.length === 0) {
        console.log('No existing puzzles found');
        return;
      }
      
      // Sort dates in descending order (most recent first)
      const sortedDates = response.dates.sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
      console.log('Loading puzzles for all dates:', sortedDates);
      
      const allExamples: SlabWithId[] = [];
      
      // Fetch each puzzle and extract examples
      for (const date of sortedDates) {
        try {
          const puzzleResponse = await getPuzzle(date);
          if (puzzleResponse.success && puzzleResponse.puzzle) {
            const puzzleData = puzzleResponse.puzzle;
            console.log(`Loading examples from puzzle: ${puzzleData.name} (${date})`);
            
            // Add shown examples
            if (puzzleData.shown_examples && puzzleData.shown_examples.length > 0) {
              puzzleData.shown_examples.forEach((example: any, index: number) => {
                const deserializedSlab = example;
                allExamples.push({
                  ...deserializedSlab,
                  id: Date.now() + Math.random() + index // Ensure unique IDs
                });
              });
            }
            
            // Add hidden examples
            if (puzzleData.hidden_examples && puzzleData.hidden_examples.length > 0) {
              puzzleData.hidden_examples.forEach((example: any, index: number) => {
                const deserializedSlab = example;
                allExamples.push({
                  ...deserializedSlab,
                  id: Date.now() + Math.random() + index + 1000 // Ensure unique IDs
                });
              });
            }
          }
        } catch (error) {
          console.error(`Failed to load puzzle for date ${date}:`, error);
        }
      }
      
      if (allExamples.length > 0) {
        console.log(`Starting with ${allExamples.length} total examples from all puzzles`);
        
        // Deduplicate slabs using the equality function
        const uniqueExamples: SlabWithId[] = [];
        let duplicatesFound = 0;
        
        for (const example of allExamples) {
          const isDuplicate = uniqueExamples.some(existing => {
            // Compare slab data without the id field
            const { id: _, ...exampleData } = example;
            const { id: __, ...existingData } = existing;
            const isEqual = areSlabsEqual(exampleData, existingData);
            if (isEqual) {
              duplicatesFound++;
            }
            return isEqual;
          });
          
          if (!isDuplicate) {
            uniqueExamples.push(example);
          }
        }
        
        console.log(`After deduplication: ${uniqueExamples.length} unique examples (${duplicatesFound} duplicates removed)`);
        
        // Get current slabs and deduplicate against them
        setCreatedSlabs(prev => {
          console.log(`Current slabs in creator: ${prev.length}`);
          
          const combined = [...prev, ...uniqueExamples];
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
            setEvaluationResults(prevResults => [...prevResults, ...new Array(newSlabsCount).fill(false)]);
          }
          
          console.log(`Added ${newSlabsCount} new unique examples to creator`);
          
          return finalUnique;
        });
      }
      
    } catch (error) {
      console.error('Failed to load puzzle history:', error);
    } finally {
      setIsLoadingHistory(false);
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
        // Load user's slabs when they sign in
        loadUserSlabs();
      } else {
        setUser(null);
        setIsAuthenticated(false);
        setEmail('');
        setAuthMessage('');
        setSavedSlabs([]); // Clear saved slabs on sign out
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Load user slabs when authentication state changes
  React.useEffect(() => {
    if (isAuthenticated) {
      loadUserSlabs();
    }
  }, [isAuthenticated]);

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
        setDisplayDate(nextDate);
        console.log('Set puzzle publish_date to:', puzzle.publish_date);
      } catch (error) {
        console.error('Failed to fetch dates, using current date:', error);
        // Fallback to current date if fetching fails
        const fallbackDate = new Date().toISOString();
        puzzle.publish_date = fallbackDate;
        setDisplayDate(fallbackDate);
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
      setSavedSlabs([]); // Clear saved slabs on sign out
    } catch (error) {
      setAuthMessage(`Sign out failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsAuthLoading(false);
    }
  };

  // Slab management functions
  const loadUserSlabs = async () => {
    if (!isAuthenticated) return;
    
    setIsLoadingSlabs(true);
    setSlabMessage('');
    
    try {
      const response = await getUserSlabs();
      setSavedSlabs(response.slabs || []);
      setSlabMessage(response.message);
    } catch (error) {
      setSlabMessage(`Failed to load slabs: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoadingSlabs(false);
    }
  };



  const deleteSlabFromDatabase = async (slabId: number) => {
    if (!isAuthenticated) {
      setSlabMessage('Please sign in to delete slabs');
      return;
    }

    if (!confirm('Are you sure you want to delete this slab?')) {
      return;
    }

    try {
      const response = await deleteSlab(slabId);
      setSlabMessage(response.message);
      
      // Reload slabs to remove the deleted one
      await loadUserSlabs();
    } catch (error) {
      setSlabMessage(`Failed to delete slab: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  // Function to check if a slab already exists in the database
  const isSlabInDatabase = (slabData: SlabData): boolean => {
    // Only check against saved slabs in database (compare only the slab JSON data)
    return savedSlabs.some(savedSlab => areSlabsEqual(slabData, savedSlab.slab_data));
  };

  // Function to save a slab to database if it doesn't already exist
  const saveSlabIfNotExists = async (slabData: SlabData) => {
    if (!isAuthenticated) {
      setSlabMessage('Please sign in to save slabs');
      return;
    }

    // Check against saved slabs in database (compare only the slab JSON data)
    if (isSlabInDatabase(slabData)) {
      setSlabMessage('This slab is already saved in your database');
      return;
    }

    try {
      await createSlab(slabData);
      setSlabMessage('Slab saved to database');
      // Reload slabs to show the new one
      await loadUserSlabs();
    } catch (error) {
      setSlabMessage(`Failed to save slab: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const loadSlabIntoCreator = (slab: SlabRecord) => {
    const slabWithId: SlabWithId = { 
      ...deepCopy(slab.slab_data),
      id: Date.now() + Math.random() 
    };
    
    setCreatedSlabs(prev => [...prev, slabWithId]);
    setShownExamples(prev => [...prev, false]);
    setHiddenExamples(prev => [...prev, false]);
    setEvaluationResults(prev => [...prev, false]);
    setSlabMessage(`Loaded slab "${slab.id}" into puzzle creator`);
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
        setSlabMessage('This slab already exists in the list');
        return prev; // Don't add duplicate
      }
      
      // Add the new slab
      return [...prev, slabWithId];
    });
    
    // Only update other arrays if we actually added a new slab
    setCreatedSlabs(prev => {
      const currentLength = prev.length;
      setShownExamples(prevShown => {
        if (currentLength > prevShown.length) {
          return [...prevShown, false];
        }
        return prevShown;
      });
      setHiddenExamples(prevHidden => {
        if (currentLength > prevHidden.length) {
          return [...prevHidden, false];
        }
        return prevHidden;
      });
      setEvaluationResults(prevResults => {
        if (currentLength > prevResults.length) {
          return [...prevResults, false];
        }
        return prevResults;
      });
      return prev;
    });

    // Automatically save to database if user is authenticated
    if (isAuthenticated) {
      try {
        await createSlab(slab);
        setSlabMessage('Slab created and saved to database');
        // Reload slabs to show the new one in the saved slabs section
        await loadUserSlabs();
      } catch (error) {
        setSlabMessage(`Slab created but failed to save to database: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
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

    setEvaluationResults(prev => {
      const newResults = [...prev];
      const clickedResult = newResults.splice(index, 1)[0];
      return [clickedResult, ...newResults];
    });
  };

  const handleRunEvaluation = async () => {
    if (!evaluationFn.trim()) {
      alert('Please enter an evaluation function');
      return;
    }

    if (createdSlabs.length === 0) {
      alert('Please create some slabs first');
      return;
    }

    setIsRunning(true);
    try {
      // Run evaluation on each slab using secure sandbox
      const results = await Promise.all(
        createdSlabs.map(async (slab) => {
          try {
            const result = await executeCodeSafely(evaluationFn, slab, 5000);
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
        })
      );

      setEvaluationResults(results);
    } catch (error) {
      console.error('Error running evaluation:', error);
      alert(`Error in evaluation: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsRunning(false);
    }
  };

  const handleCopyRulePrompt = async () => {
    try {
      // Fetch the rule creation guide from the assets
      const response = await fetch('/src/assets/rule-creation-guide.txt');
      if (!response.ok) {
        throw new Error('Failed to fetch rule guide');
      }
      const ruleGuide = await response.text();
      
      // Copy to clipboard
      await navigator.clipboard.writeText(ruleGuide);
      alert('Rule creation guide copied to clipboard!');
    } catch (error) {
      console.error('Failed to copy rule guide:', error);
      alert('Failed to copy rule guide to clipboard');
    }
  };

  const handleCreatePuzzle = async () => {
    if (!puzzleName.trim() || !evaluationFn.trim()) {
      alert('Please fill in both puzzle name and evaluation function');
      return;
    }

    setIsCreating(true);
    try {
      // Separate slabs into shown and hidden examples
      const shownSlabs = createdSlabs.filter((_, index) => shownExamples[index]);
      const hiddenSlabs = createdSlabs.filter((_, index) => hiddenExamples[index]);

      // Slabs are now natively serializable (no conversion needed)
      const serializedShownSlabs = shownSlabs;
      const serializedHiddenSlabs = hiddenSlabs;

      const { data, error } = await supabase
        .from('puzzles')
        .insert([{
          name: puzzleName.trim(),
          content_type: puzzle.content_type,
          evaluate_fn: evaluationFn.trim(),
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

      alert(`Puzzle "${data.name}" created successfully!`);
      // Optionally navigate back to home or show success message
    } catch (error) {
      console.error('Failed to create puzzle:', error);
      alert(`Failed to create puzzle: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsCreating(false);
    }
  };

  // If not authenticated, only show authentication UI
  if (!isAuthenticated) {
    return (
      <div className="p-4 w-full max-w-7xl mx-auto">
        {/* Back to Home Button */}
        <div className="mb-4 flex items-center justify-between">
          <button
            onClick={onHome}
            className="flex items-center space-x-2 text-gray-600 hover:text-gray-800 transition-colors"
          >
            <FiArrowLeft size={20} />
            <span>Back to Home</span>
          </button>
          <button
            onClick={onViewPuzzles}
            className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
          >
            View My Puzzles
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
      </div>
    );
  }

  return (
    <div className="p-4 w-full max-w-7xl mx-auto">
      {/* Back to Home Button */}
      <div className="mb-4 flex items-center justify-between">
        <button
          onClick={onHome}
          className="flex items-center space-x-2 text-gray-600 hover:text-gray-800 transition-colors"
        >
          <FiArrowLeft size={20} />
          <span>Back to Home</span>
        </button>
        <button
          onClick={onViewPuzzles}
          className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
        >
          View My Puzzles
        </button>
      </div>

      {/* Authentication Section - Only show when authenticated */}
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

      {/* Saved Slabs Management */}
      {isAuthenticated && (
        <details 
          className="mb-4 p-3 bg-green-50 rounded-lg border border-green-200"
          open={isDetailsOpen}
          onToggle={(e) => setIsDetailsOpen(e.currentTarget.open)}
        >
          <summary className="flex items-center justify-between cursor-pointer">
            <div className="flex items-center space-x-2">
              <span 
                className="text-green-600 transition-transform duration-200"
                style={{ transform: isDetailsOpen ? 'rotate(90deg)' : 'rotate(0deg)' }}
              >
                ▶
              </span>
              <h3 className="text-lg font-semibold text-green-800">My Saved Slabs</h3>
            </div>
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                loadUserSlabs();
              }}
              disabled={isLoadingSlabs}
              className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-medium py-1 px-3 rounded-md transition-colors duration-200 text-sm"
            >
              {isLoadingSlabs ? 'Loading...' : 'Refresh'}
            </button>
          </summary>
          
          {slabMessage && (
            <div className={`p-2 rounded-md text-sm mb-3 mt-3 ${
              slabMessage.includes('Failed') || slabMessage.includes('Please sign in')
                ? 'bg-red-100 text-red-700 border border-red-200'
                : 'bg-green-100 text-green-700 border border-green-200'
            }`}>
              {slabMessage}
            </div>
          )}

          {savedSlabs.length > 0 ? (
            <div className="flex flex-wrap gap-4 mt-3">
              {savedSlabs.map((slab) => (
                <div key={slab.id} className="bg-white p-4 rounded-lg border border-green-200 flex-shrink-0">
                  <div className="mb-2">
                    <SlabComponent slab={slab.slab_data} size="small" />
                  </div>
                  <div className="text-xs text-gray-500 mb-2">
                    ID: {slab.id} • {new Date(slab.created_at).toLocaleDateString()}
                  </div>
                  <div className="flex flex-col space-y-1">
                    <button
                      onClick={() => loadSlabIntoCreator(slab)}
                      className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium py-1 px-2 rounded transition-colors duration-200"
                    >
                      Load
                    </button>
                    <div className="flex space-x-1">
                      <button
                        onClick={() => setEditingSlab(slab)}
                        className="flex-1 bg-yellow-600 hover:bg-yellow-700 text-white text-xs font-medium py-1 px-2 rounded transition-colors duration-200"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => deleteSlabFromDatabase(slab.id)}
                        className="flex-1 bg-red-600 hover:bg-red-700 text-white text-xs font-medium py-1 px-2 rounded transition-colors duration-200"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-4 text-gray-500 mt-3">
              <p>No saved slabs yet. Create some slabs and save them to see them here!</p>
            </div>
          )}
        </details>
      )}

      {/* Puzzle Information */}
      <div className="mb-4 p-3 bg-gray-100 rounded-lg">
        <h2 className="text-lg font-semibold mb-2">Creating Puzzle for {formatDateUTC(displayDate)}</h2>
        <div className="text-sm text-gray-600 mb-4">
          <p><strong>Content Type:</strong> {puzzle.content_type}</p>
          <p><strong>Puzzle ID:</strong> {puzzle.id}</p>
        </div>
        
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

        {/* Evaluation Function Field */}
        <div className="mb-4">
          <label htmlFor="evaluation-fn" className="block text-sm font-medium text-gray-700 mb-1">
            Evaluation Function
          </label>
          <textarea
            id="evaluation-fn"
            value={evaluationFn}
            onChange={(e) => setEvaluationFn(e.target.value)}
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Enter evaluation function code..."
          />
          <div className="mt-2 flex gap-2">
            <button
              onClick={handleRunEvaluation}
              disabled={isRunning || !evaluationFn.trim() || createdSlabs.length === 0}
              className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-medium py-2 px-4 rounded-md transition-colors duration-200"
            >
              {isRunning ? 'Running...' : 'Run'}
            </button>
            <button
              onClick={handleCopyRulePrompt}
              className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md transition-colors duration-200"
            >
              Copy Rule Prompt
            </button>
          </div>
          <p>
              Copy the rule prompt to your clipboard and paste it into an AI with whatever rule idea you have. Copy the code it makes into the box. Make slabs and run it.
          </p>
          <p>
            Hidden slabs are revealed in the order in which they are presented in the list below.
          </p>
        </div>
      </div>
      
      {/* Load History Button */}
      <div className="mb-4">
        <button
          onClick={loadAllPuzzles}
          disabled={isLoadingHistory}
          className="bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-medium py-2 px-4 rounded-md transition-colors duration-200"
        >
          {isLoadingHistory ? 'Loading...' : 'Load All Public Slabs'}
        </button>
      </div>

      {/* SlabMaker for creating slabs */}
      <div className="mb-8">
        <SlabMaker onCreate={handleSlabCreate} />
      </div>
      
      {/* Created Slabs Display */}
      {createdSlabs.length > 0 && (
        <div className="mt-8">
          <h3 className="text-lg font-semibold mb-4">Created Slabs ({createdSlabs.length})</h3>
          <div className="flex flex-wrap gap-6">
            {createdSlabs.map((slab, index) => (
              <div key={slab.id} className="flex flex-col items-center flex-shrink-0 p-2">
                <div className="mb-2 text-sm font-medium">Slab #{index + 1}</div>
                <div 
                  onClick={() => handleSlabClick(index)}
                  className="cursor-pointer hover:opacity-80 transition-opacity duration-200"
                  title="Click to move to front"
                >
                  <SlabComponent slab={slab} size="small" />
                </div>
                <div className="mt-3 flex flex-col gap-1">
                  <div className="flex gap-1">
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
                  {isAuthenticated && (
                    <button
                      onClick={() => saveSlabIfNotExists(slab)}
                      disabled={isSlabInDatabase(slab)}
                      className={`px-2 py-1 text-xs font-medium rounded transition-colors duration-200 ${
                        isSlabInDatabase(slab)
                          ? 'bg-gray-400 text-gray-600 cursor-not-allowed'
                          : 'bg-green-600 hover:bg-green-700 text-white'
                      }`}
                    >
                      {isSlabInDatabase(slab) ? 'Already Saved' : 'Save to my slabs'}
                    </button>
                  )}
                </div>
                {/* Evaluation Result Dot */}
                {evaluationResults.length > index && (
                  <div className="mt-1 flex justify-center">
                    <div
                      className={`w-3 h-3 rounded-full ${
                        evaluationResults[index] 
                          ? 'bg-black' 
                          : 'bg-white border-2 border-black'
                      }`}
                      title={evaluationResults[index] ? 'True' : 'False'}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

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
        <button
          onClick={handleCreatePuzzle}
          disabled={isCreating || !puzzleName.trim() || !evaluationFn.trim()}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200"
        >
          {isCreating ? 'Creating Puzzle...' : 'Create Puzzle'}
        </button>
      </div>

      {/* Edit Slab Modal */}
      {editingSlab && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Edit Slab</h3>
            <div className="mb-4">
              <SlabComponent slab={editingSlab.slab_data} size="medium" />
            </div>
            <div className="text-sm text-gray-600 mb-4">
              <p><strong>ID:</strong> {editingSlab.id}</p>
              <p><strong>Created:</strong> {new Date(editingSlab.created_at).toLocaleString()}</p>
              <p><strong>Updated:</strong> {new Date(editingSlab.updated_at).toLocaleString()}</p>
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => {
                  loadSlabIntoCreator(editingSlab);
                  setEditingSlab(null);
                }}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md transition-colors duration-200"
              >
                Load into Creator
              </button>
              <button
                onClick={() => setEditingSlab(null)}
                className="flex-1 bg-gray-600 hover:bg-gray-700 text-white font-medium py-2 px-4 rounded-md transition-colors duration-200"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SlabPuzzleCreator;
