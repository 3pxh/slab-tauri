// Setup type definitions for built-in Supabase Runtime APIs
import "https://esm.sh/@supabase/functions-js@2.4.1/src/edge-runtime.d.ts"
import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface EvaluateRequest {
  puzzle_id: string
  user_solution: string
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Create Supabase client with service role for database access
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? 'http://127.0.0.1:54321',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? 
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU'
    )

    const { puzzle_id, user_solution }: EvaluateRequest = await req.json()

    if (!puzzle_id || !user_solution) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: puzzle_id and user_solution' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Get the puzzle to retrieve the evaluation function
    const { data: puzzle, error: puzzleError } = await supabaseClient
      .from('puzzles')
      .select('evaluate_fn, hidden_examples')
      .eq('id', puzzle_id)
      .single()

    if (puzzleError || !puzzle) {
      return new Response(
        JSON.stringify({ error: 'Puzzle not found' }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Evaluate the user's solution against the hidden examples
    // This is a simplified evaluation - you may want to implement more sophisticated logic
    const hiddenExamples = puzzle.hidden_examples || []
    const evaluateFunction = puzzle.evaluate_fn

    // For now, we'll do a simple evaluation
    // In a real implementation, you'd execute the evaluate_fn safely
    let passedTests = 0
    let totalTests = hiddenExamples.length

    for (const example of hiddenExamples) {
      try {
        // This is a placeholder - you'd implement the actual evaluation logic here
        // based on your evaluate_fn format
        const result = evaluateUserSolution(user_solution, example, evaluateFunction)
        if (result) {
          passedTests++
        }
      } catch (error) {
        console.error('Evaluation error:', error)
      }
    }

    const success = passedTests === totalTests && totalTests > 0

    return new Response(
      JSON.stringify({
        success,
        passed_tests: passedTests,
        total_tests: totalTests,
        message: success 
          ? 'All tests passed! Great job!' 
          : `${passedTests}/${totalTests} tests passed. Keep trying!`
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

// Placeholder function for evaluating user solutions
// You'll need to implement this based on your specific evaluation logic
function evaluateUserSolution(userSolution: string, testCase: any, evaluateFn: string): boolean {
  // This is a simplified example - implement your actual evaluation logic here
  // You might want to use a sandboxed environment to safely execute user code
  try {
    // For now, just return true as a placeholder
    // In a real implementation, you'd parse and execute the evaluateFn
    return true
  } catch (error) {
    return false
  }
}

/* To invoke locally:

  1. Run `supabase start` (see: https://supabase.com/docs/reference/cli/supabase-start)
  2. Make an HTTP request:

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/evaluate' \
    --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
    --header 'Content-Type: application/json' \
    --data '{"name":"Functions"}'

*/
