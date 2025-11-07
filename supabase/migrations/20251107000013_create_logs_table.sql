-- Create logs table for analytics events
-- This migration creates a table to store analytics events, writable by anyone but only viewable by George

-- Create logs table
CREATE TABLE IF NOT EXISTS public.logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    event_name TEXT NOT NULL,
    page_route TEXT,
    time TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    referrer TEXT,
    is_app BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS on logs table
ALTER TABLE public.logs ENABLE ROW LEVEL SECURITY;

-- Create policies for logs table
-- Allow anyone to insert logs (no auth required)
CREATE POLICY "Anyone can insert logs" ON public.logs
    FOR INSERT WITH CHECK (true);

-- Only George can view logs
CREATE POLICY "George can view logs" ON public.logs
    FOR SELECT USING (auth.uid() = '3996a43b-86dd-4bda-8807-dc3d8e76e5a7'::uuid);

-- Grant necessary permissions
GRANT ALL ON public.logs TO service_role;
GRANT USAGE ON SCHEMA public TO service_role;

-- Grant permissions to anonymous users for inserting
GRANT INSERT ON public.logs TO anon;

-- Create index on time for better query performance
CREATE INDEX IF NOT EXISTS idx_logs_time ON public.logs(time DESC);

-- Create index on event_name for filtering
CREATE INDEX IF NOT EXISTS idx_logs_event_name ON public.logs(event_name);

-- Create index on user_id for user-specific queries
CREATE INDEX IF NOT EXISTS idx_logs_user_id ON public.logs(user_id) WHERE user_id IS NOT NULL;

