-- Add difficulty column to puzzles table
-- This migration adds a difficulty rating field (1-5) to puzzles for categorizing puzzle complexity

-- Add difficulty column to puzzles table with constraint
ALTER TABLE public.puzzles 
ADD COLUMN IF NOT EXISTS difficulty INTEGER DEFAULT 1;

-- Add constraint to ensure difficulty is between 1 and 5
ALTER TABLE public.puzzles 
ADD CONSTRAINT check_difficulty_range CHECK (difficulty >= 1 AND difficulty <= 5);

-- Add a comment to document the column
COMMENT ON COLUMN public.puzzles.difficulty IS 'Difficulty rating for the puzzle, ranging from 1 (easiest) to 5 (hardest)';
