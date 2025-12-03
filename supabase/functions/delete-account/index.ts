import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "supabase"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "http://127.0.0.1:54321"
    const anonKey =
      Deno.env.get("SUPABASE_ANON_KEY") ??
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdmZGZoYnVseHFjamZtbXVmc21mIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg2ODU1MzYsImV4cCI6MjA3NDI2MTUzNn0.fXz6LGRwyrYnDpGhJZ8eirRz6N9C06aiaYfyMBucYwg"
    const serviceRoleKey =
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ??
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU"

    const authHeader = req.headers.get("authorization")
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authentication token" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      )
    }

    // 1) Client bound to the caller's JWT for auth verification
    const supabaseUserClient = createClient(supabaseUrl, anonKey, {
      global: {
        headers: {
          Authorization: authHeader,
        },
      },
    })

    const {
      data: { user },
      error: getUserError,
    } = await supabaseUserClient.auth.getUser()

    if (getUserError || !user) {
      console.error("Error getting authenticated user:", getUserError)
      return new Response(
        JSON.stringify({
          error: "Not authenticated",
          debug: {
            stage: "getUser",
            getUserError,
          },
        }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      )
    }

    // 2) Service-role client for privileged admin operations (no user JWT)
    const supabaseAdminClient = createClient(supabaseUrl, serviceRoleKey)

    // Delete the authenticated user using the admin API (service role)
    const { error: deleteError } =
      await supabaseAdminClient.auth.admin.deleteUser(user.id)

    if (deleteError) {
      console.error("Error deleting user:", deleteError)
      return new Response(
        JSON.stringify({
          error: "Failed to delete account",
          debug: {
            stage: "deleteUser",
            code: deleteError.code,
            message: deleteError.message,
          },
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      )
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Account deleted successfully",
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    )
  } catch (error) {
    console.error("Function error:", error)
    return new Response(
      JSON.stringify({
        error: "Internal server error",
        debug: {
          stage: "handlerCatch",
          message: error instanceof Error ? error.message : String(error),
        },
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    )
  }
})


