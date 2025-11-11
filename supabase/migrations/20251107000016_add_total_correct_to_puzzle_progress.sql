-- Add total_correct column to puzzle_progress table
-- This column tracks the total number of correctly guessed slabs across all attempts

ALTER TABLE public.puzzle_progress
ADD COLUMN IF NOT EXISTS total_correct INTEGER DEFAULT 0 NOT NULL;

-- Add comment to document the column
COMMENT ON COLUMN public.puzzle_progress.total_correct IS 'Total number of correctly guessed slabs across all guess attempts';

