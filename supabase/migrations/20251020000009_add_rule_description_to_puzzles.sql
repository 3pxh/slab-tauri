-- Add rule_description column to puzzles table
-- This migration adds a plain English description field to puzzles for displaying rules to players

-- Add rule_description column to puzzles table
ALTER TABLE public.puzzles 
ADD COLUMN IF NOT EXISTS rule_description TEXT;

-- Add a comment to document the column
COMMENT ON COLUMN public.puzzles.rule_description IS 'Plain English description of the puzzle rules, shown to players after they complete or fail the puzzle';
