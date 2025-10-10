-- Restrict slabs view policy to only allow users to see their own slabs
-- This migration updates the RLS policy to be more restrictive

-- Drop the existing overly permissive view policy
DROP POLICY IF EXISTS "Anyone can view slabs" ON public.slabs;

-- Create a restrictive policy that only allows users to view their own slabs
CREATE POLICY "Users can view own slabs" ON public.slabs
    FOR SELECT USING (auth.uid() = creator_id);
