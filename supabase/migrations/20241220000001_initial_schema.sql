-- Initial schema for Slab puzzle game
-- This migration creates the complete database schema for the application

-- Create Puzzles table
CREATE TABLE IF NOT EXISTS public.puzzles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    content_type TEXT NOT NULL,
    evaluate_fn TEXT NOT NULL,
    shown_examples JSONB NOT NULL DEFAULT '[]'::jsonb,
    hidden_examples JSONB NOT NULL DEFAULT '[]'::jsonb,
    publish_date TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Add RLS (Row Level Security) policy
ALTER TABLE public.puzzles ENABLE ROW LEVEL SECURITY;

-- Create a policy that allows read operations for anyone (authenticated or not)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'puzzles' 
        AND policyname = 'Allow read operations for anyone'
    ) THEN
        CREATE POLICY "Allow read operations for anyone" ON public.puzzles
            FOR SELECT USING (true);
    END IF;
END $$;

-- Add INSERT policy to allow puzzle creation only from edge functions
-- This allows the service role (used by edge functions) to insert, but not regular users
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'puzzles' 
        AND policyname = 'Allow insert operations for service role'
    ) THEN
        CREATE POLICY "Allow insert operations for service role" ON public.puzzles
            FOR INSERT WITH CHECK (auth.role() = 'service_role');
    END IF;
END $$;

-- Temporarily disable RLS for local development
-- This allows the edge function to work without authentication issues
ALTER TABLE public.puzzles DISABLE ROW LEVEL SECURITY;

-- Create a function to automatically update the updated_at timestamp
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create a trigger to automatically update the updated_at column
CREATE TRIGGER handle_puzzles_updated_at
    BEFORE UPDATE ON public.puzzles
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();
