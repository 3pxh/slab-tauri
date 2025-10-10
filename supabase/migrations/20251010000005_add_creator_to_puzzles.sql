-- Add creator_id to puzzles table and update RLS policies
-- This migration adds creator tracking to puzzles and restricts access to creators only

-- Add creator_id column to puzzles table
ALTER TABLE public.puzzles 
ADD COLUMN IF NOT EXISTS creator_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Drop existing policies
DROP POLICY IF EXISTS "Only service role can access puzzles" ON public.puzzles;

-- Create new restrictive policies for puzzles
-- Users can view their own puzzles
CREATE POLICY "Users can view own puzzles" ON public.puzzles
    FOR SELECT USING (auth.uid() = creator_id);

-- Users can insert puzzles and set themselves as creator
CREATE POLICY "Authenticated users can create puzzles" ON public.puzzles
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Users can update their own puzzles
CREATE POLICY "Users can update own puzzles" ON public.puzzles
    FOR UPDATE USING (auth.uid() = creator_id);

-- Users can delete their own puzzles
CREATE POLICY "Users can delete own puzzles" ON public.puzzles
    FOR DELETE USING (auth.uid() = creator_id);

-- Grant permissions to authenticated users
GRANT SELECT, INSERT, UPDATE, DELETE ON public.puzzles TO authenticated;
