-- Create slabs table with foreign key relationship to auth.users
-- This migration creates the slabs table that references Supabase's built-in auth.users table

-- Create Slabs table
CREATE TABLE IF NOT EXISTS public.slabs (
    id SERIAL PRIMARY KEY,
    slab_data JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    creator_id UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Enable RLS on slabs table
ALTER TABLE public.slabs ENABLE ROW LEVEL SECURITY;

-- Create policies for slabs table
-- Users can view all slabs (for now, can be made more restrictive later)
CREATE POLICY "Anyone can view slabs" ON public.slabs
    FOR SELECT USING (true);

-- Users can insert slabs and set themselves as creator
CREATE POLICY "Authenticated users can create slabs" ON public.slabs
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Users can update their own slabs
CREATE POLICY "Users can update own slabs" ON public.slabs
    FOR UPDATE USING (auth.uid() = creator_id);

-- Users can delete their own slabs
CREATE POLICY "Users can delete own slabs" ON public.slabs
    FOR DELETE USING (auth.uid() = creator_id);

-- Create a trigger to automatically update the updated_at timestamp for slabs
CREATE TRIGGER handle_slabs_updated_at
    BEFORE UPDATE ON public.slabs
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- Grant necessary permissions
GRANT ALL ON public.slabs TO service_role;
GRANT USAGE ON SCHEMA public TO service_role;

-- Grant permissions to authenticated users
GRANT SELECT, INSERT, UPDATE, DELETE ON public.slabs TO authenticated;
GRANT USAGE ON SEQUENCE public.slabs_id_seq TO authenticated;
