-- Create email_signups table for app launch notifications
-- This migration creates a simple table to store email addresses for launch notifications

-- Create email_signups table
CREATE TABLE IF NOT EXISTS public.email_signups (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS on email_signups table
ALTER TABLE public.email_signups ENABLE ROW LEVEL SECURITY;

-- Create policies for email_signups table
-- Allow anyone to insert email signups (no auth required)
CREATE POLICY "Anyone can sign up for email notifications" ON public.email_signups
    FOR INSERT WITH CHECK (true);

-- Only service role can view email signups (for admin purposes)
CREATE POLICY "Service role can view email signups" ON public.email_signups
    FOR SELECT USING (auth.role() = 'service_role');

-- Create a trigger to automatically update the updated_at timestamp for email_signups
CREATE TRIGGER handle_email_signups_updated_at
    BEFORE UPDATE ON public.email_signups
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- Grant necessary permissions
GRANT ALL ON public.email_signups TO service_role;
GRANT USAGE ON SCHEMA public TO service_role;

-- Grant permissions to anonymous users for inserting
GRANT INSERT ON public.email_signups TO anon;
