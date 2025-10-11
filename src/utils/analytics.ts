// Analytics utility for tracking game events with Plausible
import { Puzzle } from '../lib/supabase';

// Check if we're running in Tauri
const isTauri = () => {
  return typeof window !== 'undefined' && '__TAURI__' in window;
};

// Track a custom event with Plausible
export const trackEvent = (eventName: string, props?: Record<string, string | number>) => {
  if (typeof window !== 'undefined' && window.plausible) {
    try {
      // Add platform context to all events
      const enhancedProps = {
        ...props,
        platform: isTauri() ? 'app' : 'web'
      };
      window.plausible(eventName, { props: enhancedProps });
    } catch (error) {
      console.warn('Analytics tracking failed:', error);
    }
  }
};

// Game-specific tracking functions
export const analytics = {
  // Session tracking
  sessionStarted: () => {
    trackEvent('Session Started');
  },

  sessionEnded: (duration: number, puzzlesPlayed: number) => {
    trackEvent('Session Ended', { 
      duration: Math.round(duration), 
      puzzles_played: puzzlesPlayed 
    });
  },

  // Puzzle events
  puzzleStarted: (puzzle: Puzzle) => {
    trackEvent('Puzzle Started', {
      puzzle_id: puzzle.id,
      puzzle_name: puzzle.name,
      puzzle_date: puzzle.publish_date
    });
  },

  puzzleCompleted: (puzzle: Puzzle, attempts: number, timeSpent: number, slabCount: number) => {
    trackEvent('Puzzle Won', {
      puzzle_id: puzzle.id,
      puzzle_name: puzzle.name,
      attempts,
      time_spent: Math.round(timeSpent),
      slab_count: slabCount
    });
  },

  puzzleAbandoned: (puzzle: Puzzle, timeSpent: number, slabCount: number) => {
    trackEvent('Puzzle Abandoned', {
      puzzle_id: puzzle.id,
      puzzle_name: puzzle.name,
      time_spent: Math.round(timeSpent),
      slab_count: slabCount
    });
  },

  // Slab creation tracking
  slabCreated: (puzzle: Puzzle, slabCount: number) => {
    trackEvent('Slab Created', {
      puzzle_id: puzzle.id,
      slab_count: slabCount
    });
  },

  // Guess tracking
  guessMade: (puzzle: Puzzle, attempt: number, isCorrect: boolean) => {
    trackEvent('Guess Made', {
      puzzle_id: puzzle.id,
      attempt,
      is_correct: isCorrect ? 1 : 0
    });
  },

  // Navigation tracking
  homeViewed: () => {
    trackEvent('Home Viewed');
  },

  archiveViewed: () => {
    trackEvent('Archive Viewed');
  },

  instructionsViewed: () => {
    trackEvent('Instructions Viewed');
  },

  puzzleCreatorViewed: () => {
    trackEvent('Puzzle Creator Viewed');
  },

  // Feature usage
  colorblindModeToggled: (mode: string) => {
    trackEvent('Colorblind Mode Toggled', { mode });
  },

  slabsShuffled: (puzzle: Puzzle) => {
    trackEvent('Slabs Shuffled', {
      puzzle_id: puzzle.id
    });
  },

  slabsSorted: (puzzle: Puzzle) => {
    trackEvent('Slabs Sorted', {
      puzzle_id: puzzle.id
    });
  },

  // Account events
  accountLinked: () => {
    trackEvent('Account Linked');
  },

  // Email signup events
  emailSignupCompleted: () => {
    trackEvent('Email Signup Completed');
  },

  // Error tracking
  errorOccurred: (error: string, context?: string) => {
    trackEvent('Error Occurred', {
      error: error.substring(0, 100), // Limit error message length
      context: context || 'unknown'
    });
  }
};

// Session tracking utility
class SessionTracker {
  private startTime: number = Date.now();
  private puzzleCount: number = 0;

  constructor() {
    this.startTime = Date.now();
    analytics.sessionStarted();
  }

  incrementPuzzleCount() {
    this.puzzleCount++;
  }

  endSession() {
    const duration = (Date.now() - this.startTime) / 1000; // seconds
    analytics.sessionEnded(duration, this.puzzleCount);
  }
}

// Global session tracker instance
export const sessionTracker = new SessionTracker();

// Clean up on page unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    sessionTracker.endSession();
  });
}
