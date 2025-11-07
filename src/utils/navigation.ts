import { useNavigate } from 'react-router';

// Navigation utilities for programmatic routing
export const useNavigation = () => {
  const navigate = useNavigate();

  return {
    // Navigate to home
    goHome: () => navigate('/'),
    
    // Navigate to archive/level select
    goToArchive: () => navigate('/archive'),
    
    // Navigate to a specific puzzle by date
    goToPuzzle: (date: Date) => {
      const dateStr = date.toISOString().split('T')[0];
      navigate(`/puzzle/${dateStr}`);
    },
    
    // Navigate to today's puzzle
    goToTodayPuzzle: () => navigate('/puzzle/today'),
    
    // Navigate to a shared puzzle by UUID
    goToSharedPuzzle: (uuid: string) => navigate(`/puzzle/shared/${uuid}`),
    
    // Navigate to puzzle creator
    goToCreate: () => navigate('/create'),
    
    // Navigate to puzzles list
    goToPuzzlesList: () => navigate('/puzzles'),
    
    // Navigate to tutorial
    goToTutorial: () => navigate('/tutorial'),
    
    // Navigate to logs
    goToLogs: () => navigate('/logs'),
    
    // Navigate back
    goBack: () => navigate(-1),
    
    // Replace current route (useful for redirects)
    replace: (path: string) => navigate(path, { replace: true })
  };
};

// Utility functions for generating URLs
export const getPuzzleUrl = (date: Date): string => {
  const dateStr = date.toISOString().split('T')[0];
  return `/puzzle/${dateStr}`;
};

export const getTodayPuzzleUrl = (): string => {
  return '/puzzle/today';
};

export const getSharedPuzzleUrl = (uuid: string): string => {
  return `/puzzle/shared/${uuid}`;
};

export const getCreateUrl = (): string => {
  return '/create';
};

export const getPuzzlesListUrl = (): string => {
  return '/puzzles';
};

export const getTutorialUrl = (): string => {
  return '/tutorial';
};

export const getArchiveUrl = (): string => {
  return '/archive';
};
