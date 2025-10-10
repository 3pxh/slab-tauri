-- Secure database access - only allow edge functions to access data
-- This migration removes public access and ensures only service role can access the database

-- Re-enable RLS on the puzzles table
ALTER TABLE public.puzzles ENABLE ROW LEVEL SECURITY;

-- Drop the existing overly permissive policies
DROP POLICY IF EXISTS "Allow read operations for anyone" ON public.puzzles;
DROP POLICY IF EXISTS "Allow insert operations for service role" ON public.puzzles;

-- Create a restrictive policy that only allows service role access
-- This ensures only edge functions (using service role key) can access the data
CREATE POLICY "Only service role can access puzzles" ON public.puzzles
    FOR ALL USING (auth.role() = 'service_role');

-- Optional: Create a more granular policy if you want to allow specific operations
-- Uncomment and modify these if you need different permissions for different operations

-- Allow service role to read puzzles
-- CREATE POLICY "Service role can read puzzles" ON public.puzzles
--     FOR SELECT USING (auth.role() = 'service_role');

-- Allow service role to insert puzzles
-- CREATE POLICY "Service role can insert puzzles" ON public.puzzles
--     FOR INSERT WITH CHECK (auth.role() = 'service_role');

-- Allow service role to update puzzles
-- CREATE POLICY "Service role can update puzzles" ON public.puzzles
--     FOR UPDATE USING (auth.role() = 'service_role');

-- Allow service role to delete puzzles
-- CREATE POLICY "Service role can delete puzzles" ON public.puzzles
--     FOR DELETE USING (auth.role() = 'service_role');

-- Grant necessary permissions to the service role
-- (This is usually already set up by Supabase, but we'll be explicit)
GRANT ALL ON public.puzzles TO service_role;
GRANT USAGE ON SCHEMA public TO service_role;
