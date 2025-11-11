-- Update total_correct column to be nullable with NULL as default
-- This migration drops and recreates the column to change the default from 0 to NULL

-- Drop the existing column
ALTER TABLE public.puzzle_progress
DROP COLUMN IF EXISTS total_correct;

-- Add the column back with NULL as default
ALTER TABLE public.puzzle_progress
ADD COLUMN total_correct INTEGER DEFAULT NULL;

-- Add comment to document the column
COMMENT ON COLUMN public.puzzle_progress.total_correct IS 'Total number of correctly guessed slabs across all guess attempts';

