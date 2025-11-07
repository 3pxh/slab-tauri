-- Add retention policy for logs table
-- This migration sets up automatic deletion of logs older than 30 days

-- Create a function to delete logs older than 30 days
CREATE OR REPLACE FUNCTION public.delete_old_logs()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Delete logs where the time column is older than 30 days
  DELETE FROM public.logs
  WHERE time < (timezone('utc'::text, now()) - INTERVAL '30 days');
  
  -- Log the number of deleted rows (optional, for monitoring)
  RAISE NOTICE 'Deleted logs older than 30 days';
END;
$$;

-- Grant execute permission to service_role
GRANT EXECUTE ON FUNCTION public.delete_old_logs() TO service_role;

-- Enable pg_cron extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule the cleanup job to run daily at 2 AM UTC
-- This will delete logs older than 30 days every day
SELECT cron.schedule(
  'delete-old-logs-daily',
  '0 2 * * *', -- Run daily at 2 AM UTC (cron format: minute hour day month weekday)
  $$SELECT public.delete_old_logs();$$
);

