import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface VersionInfo {
  minimumVersion: string;
  iosUrl: string;
  androidUrl: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Return version information
    // This can be easily updated without redeploying the app
    const versionInfo: VersionInfo = {
      minimumVersion: "1.0.0",
      iosUrl: "https://apps.apple.com/app/slab/id123456789",
      androidUrl: "https://play.google.com/store/apps/details?id=com.hoqqanen.slab"
    }

    return new Response(
      JSON.stringify(versionInfo),
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

