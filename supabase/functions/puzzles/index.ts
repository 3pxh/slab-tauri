import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface GetPuzzleRequest {
  timestamp: string
}


interface Puzzle {
  id: string
  name: string
  content_type: string
  evaluate_fn: string
  shown_examples: any[]
  hidden_examples: any[]
  publish_date: string
  created_at: string
  updated_at: string
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Create Supabase client - always use service role for database access
    // This ensures the edge function can access the database even with RLS enabled
    const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? 
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';
    
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? 'http://127.0.0.1:54321',
      key
    )

    // Get the user ID for george@hoqqanen.com to restrict queries
    const { data: georgeUser, error: userError } = await supabaseClient
      .from('auth.users')
      .select('id')
      .eq('email', 'george@hoqqanen.com')
      .single()

    if (userError || !georgeUser) {
      console.error('Error finding george@hoqqanen.com user:', userError)
      return new Response(
        JSON.stringify({ error: 'Authorized user not found' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    const georgeUserId = georgeUser.id

    // Parse request body
    const body = await req.json()
    const { action, timestamp, ...puzzleData } = body

    // Handle GET action - retrieve puzzle by timestamp
    if (action === 'get') {
      if (!timestamp) {
        return new Response(
          JSON.stringify({ error: 'Timestamp parameter is required' }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }

      // Validate timestamp format
      const requestTimestamp = new Date(timestamp)
      if (isNaN(requestTimestamp.getTime())) {
        return new Response(
          JSON.stringify({ error: 'Invalid timestamp format. Use ISO 8601 format (e.g., 2024-12-20T10:00:00Z)' }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }

      // Query for the puzzle published most immediately before the given timestamp
      // Only return puzzles created by george@hoqqanen.com
      const { data, error } = await supabaseClient
        .from('puzzles')
        .select('*')
        .eq('creator_id', georgeUserId)
        .lte('publish_date', timestamp)
        .order('publish_date', { ascending: false })
        .limit(1)

      if (error) {
        console.error('Database error:', error)
        return new Response(
          JSON.stringify({ error: 'Database query failed' }),
          { 
            status: 500, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }

      if (!data || data.length === 0) {
        return new Response(
          JSON.stringify({ 
            error: 'No puzzle found published before the given timestamp',
            timestamp: timestamp,
            message: 'Try using a later timestamp or check if any puzzles are published'
          }),
          { 
            status: 404, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }

      const puzzle: Puzzle = data[0]

      return new Response(
        JSON.stringify({
          success: true,
          puzzle: puzzle,
          timestamp: timestamp,
          message: `Found puzzle published on ${puzzle.publish_date}`
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Handle ALL_DATES action - get all puzzle publish dates
    // Only return dates for puzzles created by george@hoqqanen.com
    if (action === 'all_dates') {
      const { data, error } = await supabaseClient
        .from('puzzles')
        .select('publish_date')
        .eq('creator_id', georgeUserId)
        .order('publish_date', { ascending: true })

      if (error) {
        console.error('Database error:', error)
        return new Response(
          JSON.stringify({ error: 'Database query failed' }),
          { 
            status: 500, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }

      const dates = data?.map(row => row.publish_date) || []

      return new Response(
        JSON.stringify({
          success: true,
          dates: dates,
          count: dates.length,
          message: `Found ${dates.length} puzzle dates`
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }


    // Handle unsupported actions
    return new Response(
      JSON.stringify({ error: 'Unsupported action. Use "get" or "all_dates".' }),
      { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Function error:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        details: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
