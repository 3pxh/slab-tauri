-- Allow public viewing of slabs created by George
-- This migration adds a policy to allow anyone to view slabs where creator_id is George's UUID

-- Add a policy that allows anyone to view slabs created by George
CREATE POLICY "Anyone can view George's slabs" ON public.slabs
    FOR SELECT USING (creator_id = '3996a43b-86dd-4bda-8807-dc3d8e76e5a7'::uuid);

