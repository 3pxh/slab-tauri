-- Add puzzle_id column to logs table
-- This migration adds an optional puzzle_id field to link logs to specific puzzles

-- Add puzzle_id column to logs table
ALTER TABLE public.logs 
ADD COLUMN IF NOT EXISTS puzzle_id UUID REFERENCES public.puzzles(id) ON DELETE SET NULL;

-- Create index on puzzle_id for better query performance
CREATE INDEX IF NOT EXISTS idx_logs_puzzle_id ON public.logs(puzzle_id) WHERE puzzle_id IS NOT NULL;

