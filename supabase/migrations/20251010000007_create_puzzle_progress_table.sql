-- Create puzzle_progress table for storing user progress on puzzles
-- This migration creates the puzzle_progress table that tracks user progress across puzzles

-- Create puzzle_progress table
CREATE TABLE IF NOT EXISTS public.puzzle_progress (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    puzzle_id UUID NOT NULL REFERENCES public.puzzles(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    trophies INTEGER DEFAULT 0 NOT NULL,
    attempts INTEGER DEFAULT 0 NOT NULL,
    best_score INTEGER,
    completed_at TIMESTAMP WITH TIME ZONE,
    last_played_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    custom_data JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    
    -- Ensure one progress record per user/puzzle combination
    UNIQUE(puzzle_id, user_id)
);

-- Enable RLS on puzzle_progress table
ALTER TABLE public.puzzle_progress ENABLE ROW LEVEL SECURITY;

-- Create policies for puzzle_progress table
-- Users can view their own progress
CREATE POLICY "Users can view own progress" ON public.puzzle_progress
    FOR SELECT USING (auth.uid() = user_id);

-- Users can insert their own progress
CREATE POLICY "Users can insert own progress" ON public.puzzle_progress
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own progress
CREATE POLICY "Users can update own progress" ON public.puzzle_progress
    FOR UPDATE USING (auth.uid() = user_id);

-- Users can delete their own progress
CREATE POLICY "Users can delete own progress" ON public.puzzle_progress
    FOR DELETE USING (auth.uid() = user_id);

-- Create a trigger to automatically update the updated_at timestamp for puzzle_progress
CREATE TRIGGER handle_puzzle_progress_updated_at
    BEFORE UPDATE ON public.puzzle_progress
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- Grant necessary permissions
GRANT ALL ON public.puzzle_progress TO service_role;
GRANT USAGE ON SCHEMA public TO service_role;

-- Grant permissions to authenticated users
GRANT SELECT, INSERT, UPDATE, DELETE ON public.puzzle_progress TO authenticated;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_puzzle_progress_user_id ON public.puzzle_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_puzzle_progress_puzzle_id ON public.puzzle_progress(puzzle_id);
CREATE INDEX IF NOT EXISTS idx_puzzle_progress_last_played_at ON public.puzzle_progress(last_played_at DESC);
