import "https://esm.sh/@supabase/functions-js@2.4.1/src/edge-runtime.d.ts"
import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface EmbedRequest {
  title?: string
  body: string
}

// Create a new inference session to be used in the lifetime of this function
// Multiple requests can use the same inference session
const session = new Supabase.ai.Session('gte-small')

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Parse request body
    const { title, body }: EmbedRequest = await req.json()

    if (!body) {
      return new Response(
        JSON.stringify({ error: 'Missing required field: body' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Create Supabase client with service role for database access
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? 'http://127.0.0.1:54321',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? 
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU'
    )

    // Generate the embedding from the body text
    const embedding = await session.run(body, {
      mean_pool: true,
      normalize: true,
    })

    // If no title provided, perform similarity search instead of inserting
    if (!title) {
      const { data: matches, error: searchError } = await supabaseClient.rpc('match_writings', {
        query_embedding: embedding,
        match_threshold: 0.0, // No threshold to get top 5 regardless of similarity
        match_count: 5,
      })

      if (searchError) {
        console.error('Search error:', searchError)
        return new Response(
          JSON.stringify({ error: 'Failed to search writings', details: searchError.message }),
          { 
            status: 500, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }

      return new Response(
        JSON.stringify({
          success: true,
          matches: matches || [],
          message: 'Similarity search completed'
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // If title is provided, check if it already exists
    const { data: existing, error: checkError } = await supabaseClient
      .from('writings')
      .select('id, title')
      .eq('title', title)
      .maybeSingle()

    if (checkError) {
      console.error('Database error:', checkError)
      return new Response(
        JSON.stringify({ error: 'Failed to check existing writing', details: checkError.message }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // If title already exists, don't save it
    if (existing) {
      return new Response(
        JSON.stringify({
          success: false,
          message: 'Writing with this title already exists',
          existing: existing
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Store the vector in Postgres
    const { data, error } = await supabaseClient
      .from('writings')
      .insert({
        title,
        body,
        embedding,
      })

    if (error) {
      console.error('Database error:', error)
      return new Response(
        JSON.stringify({ error: 'Failed to insert writing', details: error.message }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    return new Response(
      JSON.stringify({
        success: true,
        data,
        message: 'Writing embedded and stored successfully'
      }),
      { 
        status: 200, 
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

/* To invoke locally:

  1. Run `supabase start` (see: https://supabase.com/docs/reference/cli/supabase-start)
  2. Make an HTTP request:

  # With title - will check if title exists before inserting
  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/embed' \
    --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
    --header 'Content-Type: application/json' \
    --data '{"title":"First post!","body":"Hello world!"}'

  # Without title - will perform similarity search and return top 5 matches
  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/embed' \
    --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
    --header 'Content-Type: application/json' \
    --data '{"body":"Hello world!"}'

*/

