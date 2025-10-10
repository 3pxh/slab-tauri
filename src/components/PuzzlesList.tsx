import React, { useState, useEffect } from 'react';
import { FiArrowLeft, FiEdit, FiTrash2, FiCalendar, FiShare2 } from 'react-icons/fi';
import { supabase, Puzzle } from '../lib/supabase';
import { formatDateUTC } from '../utils';

interface PuzzlesListProps {
  onHome: () => void;
}

const PuzzlesList: React.FC<PuzzlesListProps> = ({ onHome }) => {
  const [puzzles, setPuzzles] = useState<Puzzle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  const handleDeletePuzzle = async (puzzleId: string, puzzleName: string) => {
    if (!confirm(`Are you sure you want to delete "${puzzleName}"? This action cannot be undone.`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('puzzles')
        .delete()
        .eq('id', puzzleId);

      if (error) {
        throw new Error(`Failed to delete puzzle: ${error.message}`);
      }

      // Remove the puzzle from the local state
      setPuzzles(prev => prev.filter(p => p.id !== puzzleId));
    } catch (err) {
      alert(`Failed to delete puzzle: ${err instanceof Error ? err.message : 'Unknown error'}`);
      console.error('Error deleting puzzle:', err);
    }
  };

  const handleSharePuzzle = async (puzzleId: string, puzzleName: string) => {
    try {
      const shareUrl = `${window.location.origin}${window.location.pathname}#/puzzle/${puzzleId}`;
      await navigator.clipboard.writeText(shareUrl);
      alert(`Link to "${puzzleName}" copied to clipboard!`);
    } catch (err) {
      // Fallback for browsers that don't support clipboard API
      const shareUrl = `${window.location.origin}${window.location.pathname}#/puzzle/${puzzleId}`;
      const textArea = document.createElement('textarea');
      textArea.value = shareUrl;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      alert(`Link to "${puzzleName}" copied to clipboard!`);
    }
  };

  const formatPublishDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return formatDateUTC(date);
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
                    <button
                      onClick={() => handleSharePuzzle(puzzle.id, puzzle.name)}
                      className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded"
                      title="Share puzzle"
                    >
                      <FiShare2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeletePuzzle(puzzle.id, puzzle.name)}
                      className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded"
                      title="Delete puzzle"
                    >
                      <FiTrash2 className="w-4 h-4" />
                    </button>
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
