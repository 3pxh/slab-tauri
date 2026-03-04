-- Create writings table with vector embeddings
-- This migration creates the writings table for storing text content with vector embeddings

-- Enable the vector extension if not already enabled
CREATE EXTENSION IF NOT EXISTS vector;

-- Create writings table
CREATE TABLE IF NOT EXISTS public.writings (
    id SERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    embedding vector(384)
);

-- Enable RLS on writings table
ALTER TABLE public.writings ENABLE ROW LEVEL SECURITY;

-- Grant all permissions to service_role only
-- No policies are created, which means only service_role can access the table
GRANT ALL ON public.writings TO service_role;
GRANT USAGE ON SCHEMA public TO service_role;

-- Grant usage on the sequence for the serial id
GRANT USAGE, SELECT ON SEQUENCE public.writings_id_seq TO service_role;

