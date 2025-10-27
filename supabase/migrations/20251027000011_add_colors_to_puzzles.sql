-- Add colors column to puzzles table
-- This migration adds a colors JSONB column to store custom color palettes for puzzles

-- Add colors column to puzzles table
ALTER TABLE public.puzzles 
ADD COLUMN colors JSONB DEFAULT NULL;

-- Add comment to explain the column
COMMENT ON COLUMN public.puzzles.colors IS 'Custom color palette for the puzzle as an array of hex color strings. If NULL, uses default colors.';
