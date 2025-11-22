import React, { useState, useEffect } from 'react';
import { FiArrowLeft, FiTrash2, FiCalendar } from 'react-icons/fi';
import { supabase, Puzzle } from '../lib/supabase';
import { formatDateUTC, isIOS } from '../utils';
import { ShareButton } from './ShareButton';

interface PuzzlesListProps {
  onHome: () => void;
}

const PuzzlesList: React.FC<PuzzlesListProps> = ({ onHome }) => {
  const [puzzles, setPuzzles] = useState<Puzzle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingPuzzleId, setDeletingPuzzleId] = useState<string | null>(null);
  const [confirmDeletePuzzleId, setConfirmDeletePuzzleId] = useState<string | null>(null);

  useEffect(() => {
    fetchUserPuzzles();
  }, []);

  const fetchUserPuzzles = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('Not authenticated');
      }

      const { data, error } = await supabase
        .from('puzzles')
        .select('*')
        .eq('creator_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        throw new Error(`Failed to fetch puzzles: ${error.message}`);
      }

      setPuzzles(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load puzzles');
      console.error('Error fetching user puzzles:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleInitiateDelete = (puzzleId: string, e?: React.MouseEvent) => {
    // Prevent event propagation
    e?.stopPropagation();
    e?.preventDefault();
    
    // Set this puzzle to confirm delete mode
    setConfirmDeletePuzzleId(puzzleId);
  };

  const handleConfirmDelete = async (puzzleId: string, e?: React.MouseEvent) => {
    // Prevent event propagation
    e?.stopPropagation();
    e?.preventDefault();

    try {
      setDeletingPuzzleId(puzzleId);
      setConfirmDeletePuzzleId(null); // Clear confirm state
      
      // Verify user is authenticated
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        throw new Error('Not authenticated');
      }

      console.log('Attempting to delete puzzle:', puzzleId);
      
      const { data, error } = await supabase
        .from('puzzles')
        .delete()
        .eq('id', puzzleId)
        .eq('creator_id', user.id) // Ensure we can only delete our own puzzles
        .select();

      if (error) {
        console.error('Supabase delete error:', error);
        throw new Error(`Failed to delete puzzle: ${error.message}`);
      }

      console.log('Delete successful, response:', data);

      // Remove the puzzle from the local state
      setPuzzles(prev => prev.filter(p => p.id !== puzzleId));
    } catch (err) {
      console.error('Error deleting puzzle:', err);
    } finally {
      setDeletingPuzzleId(null);
    }
  };

  const handleCancelDelete = (e?: React.MouseEvent) => {
    // Prevent event propagation
    e?.stopPropagation();
    e?.preventDefault();
    
    setConfirmDeletePuzzleId(null);
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

  const formatPublishDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return formatDateUTC(date.toISOString());
    } catch {
      return 'Invalid date';
    }
  };

  if (loading) {
    return (
      <div className="w-full h-full flex flex-col">
        <div className="flex items-center justify-between p-4 border-b">
          <button
            onClick={onHome}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-800"
          >
            <FiArrowLeft className="w-5 h-5" />
            Back to Home
          </button>
          <h1 className="text-xl font-bold">My Puzzles</h1>
          <div className="w-20"></div> {/* Spacer for centering */}
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="text-gray-600">Loading your puzzles...</div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full h-full flex flex-col">
        <div className="flex items-center justify-between p-4 border-b">
          <button
            onClick={onHome}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-800"
          >
            <FiArrowLeft className="w-5 h-5" />
            Back to Home
          </button>
          <h1 className="text-xl font-bold">My Puzzles</h1>
          <div className="w-20"></div> {/* Spacer for centering */}
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="text-red-600 mb-2">Error loading puzzles</div>
            <div className="text-sm text-gray-600 mb-4">{error}</div>
            <button
              onClick={fetchUserPuzzles}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col">
      <div className="flex items-center justify-between p-4 border-b">
        <button
          onClick={onHome}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-800"
        >
          <FiArrowLeft className="w-5 h-5" />
          Back to Home
        </button>
        <h1 className="text-xl font-bold">My Puzzles</h1>
        <div className="w-20"></div> {/* Spacer for centering */}
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {puzzles.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-gray-600 mb-2">No puzzles created yet</div>
            <div className="text-sm text-gray-500">Create your first puzzle to see it here!</div>
          </div>
        ) : (
          <div className="space-y-3">
            {puzzles.map((puzzle) => (
              <div
                key={puzzle.id}
                className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 truncate">
                      {puzzle.name}
                    </h3>
                    <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                      <div className="flex items-center gap-1">
                        <FiCalendar className="w-4 h-4" />
                        <span>Published: {formatPublishDate(puzzle.publish_date)}</span>
                      </div>
                      <div>
                        Type: {puzzle.content_type}
                      </div>
                    </div>
                    <div className="mt-2 text-sm text-gray-500">
                      {puzzle.shown_examples?.length || 0} shown examples, {puzzle.hidden_examples?.length || 0} hidden examples
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    {confirmDeletePuzzleId === puzzle.id ? (
                      <>
                        <button
                          onClick={(e) => handleCancelDelete(e)}
                          className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-50 rounded"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={(e) => handleConfirmDelete(puzzle.id, e)}
                          disabled={deletingPuzzleId === puzzle.id}
                          className="px-3 py-1.5 text-sm text-white bg-red-600 hover:bg-red-700 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {deletingPuzzleId === puzzle.id ? (
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto" />
                          ) : (
                            'Confirm Delete'
                          )}
                        </button>
                      </>
                    ) : (
                      <>
                        <ShareButton
                          onClick={() => handleSharePuzzle(puzzle.id, puzzle.name)}
                          title="Share puzzle"
                          ariaLabel="Share puzzle"
                          size={16}
                          variant="icon"
                        />
                        <button
                          onClick={(e) => handleInitiateDelete(puzzle.id, e)}
                          disabled={deletingPuzzleId === puzzle.id}
                          className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                          title="Delete puzzle"
                        >
                          <FiTrash2 className="w-4 h-4" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default PuzzlesList;
