import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface Announcement {
  title: string;
  body: string;
  active: boolean;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Return announcement information
    // This can be easily updated without redeploying the app
    // Set active to false to hide the announcement
    // 
    // Link format examples:
    // - Markdown style: [link text](https://example.com)
    // - Plain URL: https://example.com (will be automatically converted to a link)
    const announcement: Announcement = {
      title: "Join the community!",
      body: "Join our [subreddit](https://www.reddit.com/r/slab17/) for discussions and community puzzles.",
      active: false
    }

    // If announcement is not active, return null
    if (!announcement.active) {
      return new Response(
        JSON.stringify(null),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    return new Response(
      JSON.stringify(announcement),
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

