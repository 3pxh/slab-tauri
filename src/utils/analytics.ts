// Analytics utility for tracking game events
import { Puzzle, supabase } from '../lib/supabase';

// Check if we're running in Tauri (using the same check as elsewhere in the codebase)
const isTauri = () => {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
};

// Deduplication: Track recent events to prevent duplicates
// Key format: eventName|puzzleId|pageRoute
// Value: timestamp of last event
const recentEvents = new Map<string, number>();
const DEDUP_WINDOW_MS = 5000; // 5 seconds cooldown between identical events

// Generate a deduplication key for an event
const getEventKey = (eventName: string, props?: Record<string, string | number>, pageRoute?: string): string => {
  const puzzleId = props?.puzzle_id?.toString() || '';
  const route = pageRoute || (typeof window !== 'undefined' ? window.location.pathname : '');
  return `${eventName}|${puzzleId}|${route}`;
};


// Clean up old entries periodically to prevent memory leaks
if (typeof window !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    const cutoff = now - DEDUP_WINDOW_MS * 2; // Keep entries for 2x the window
    
    for (const [key, timestamp] of recentEvents.entries()) {
      if (timestamp < cutoff) {
        recentEvents.delete(key);
      }
    }
  }, 30000); // Clean up every 30 seconds
}

// Track a custom event by inserting into logs table
export const trackEvent = async (eventName: string, props?: Record<string, string | number>) => {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    // Get current page route
    const pageRoute = window.location.pathname + window.location.search + window.location.hash;
    
    // Check for deduplication
    const eventKey = getEventKey(eventName, props, pageRoute);
    const now = Date.now();
    const lastEventTime = recentEvents.get(eventKey);
    
    if (lastEventTime !== undefined) {
      const timeSinceLastEvent = now - lastEventTime;
      if (timeSinceLastEvent < DEDUP_WINDOW_MS) {
        // Too soon, skip duplicate event
        return;
      }
    }
    
    // Update timestamp for this event key (event will be logged)
    recentEvents.set(eventKey, now);

    // Get current user ID (may be null if not authenticated)
    const { data: { user } } = await supabase.auth.getUser();
    const userId = user?.id || null;

    // Extract puzzle_id from props if available
    const puzzleId = props?.puzzle_id?.toString() || null;

    // Get referrer
    const referrer = document.referrer || null;

    // Check if running in app
    const isApp = isTauri();

    // Insert log entry
    const { error } = await supabase
      .from('logs')
      .insert({
        user_id: userId,
        puzzle_id: puzzleId,
        event_name: eventName,
        page_route: pageRoute,
        referrer: referrer,
        is_app: isApp
      });

    if (error) {
      console.warn('Analytics tracking failed:', error);
    }
  } catch (error) {
    console.warn('Analytics tracking failed:', error);
  }
};

// Query analytics data
export const getPuzzleWinsLast24Hours = async (): Promise<number> => {
  try {
    // Calculate timestamp for 24 hours ago
    const twentyFourHoursAgo = new Date();
    twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);
    
    // Query logs table for 'Puzzle Won' events in the past 24 hours
    const { count, error } = await supabase
      .from('logs')
      .select('*', { count: 'exact', head: true })
      .eq('event_name', 'Puzzle Won')
      .gte('time', twentyFourHoursAgo.toISOString());

    if (error) {
      console.warn('Failed to query puzzle wins:', error);
      return 0;
    }

    return count || 0;
  } catch (error) {
    console.warn('Failed to query puzzle wins:', error);
    return 0;
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

  tutorialViewed: () => {
    trackEvent('Tutorial Viewed');
  },

  tutorialStarted: () => {
    trackEvent('Tutorial Started');
  },

  tutorialCompleted: () => {
    trackEvent('Tutorial Completed');
  },

  tutorialSkipped: () => {
    trackEvent('Tutorial Skipped');
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
