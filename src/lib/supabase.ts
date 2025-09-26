import { createClient } from '@supabase/supabase-js'

// Remote Supabase project configuration
const supabaseUrl = 'https://gfdfhbulxqcjfmmufsmf.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdmZGZoYnVseHFjamZtbXVmc21mIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg2ODU1MzYsImV4cCI6MjA3NDI2MTUzNn0.fXz6LGRwyrYnDpGhJZ8eirRz6N9C06aiaYfyMBucYwg'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Interface for the puzzle data returned by get_puzzle function
export interface Puzzle {
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

// Interface for the get_puzzle function response
export interface GetPuzzleResponse {
  success: boolean
  puzzle: Puzzle
  timestamp: string
  message: string
}

// Interface for the all_dates function response
export interface GetAllDatesResponse {
  success: boolean
  dates: string[]
  count: number
  message: string
}

// Function to get a puzzle by timestamp using the puzzles function
export async function getPuzzle(timestamp: string): Promise<GetPuzzleResponse> {
  const { data, error } = await supabase.functions.invoke('puzzles', {
    method: 'POST',
    body: { action: 'get', timestamp }
  })

  if (error) {
    throw new Error(`Failed to get puzzle: ${error.message}`)
  }

  return data
}

// Function to create a new puzzle using the puzzles function
export async function createPuzzle(puzzleData: {
  name: string
  content_type: string
  evaluate_fn: string
  shown_examples?: any[]
  hidden_examples?: any[]
  publish_date?: string
}): Promise<{ success: boolean; puzzle: Puzzle; message: string }> {
  const { data, error } = await supabase.functions.invoke('puzzles', {
    method: 'POST',
    body: { action: 'create', ...puzzleData }
  })

  if (error) {
    throw new Error(`Failed to create puzzle: ${error.message}`)
  }

  return data
}

// Function to get all puzzle dates using the puzzles function
export async function getAllDates(): Promise<GetAllDatesResponse> {
  const { data, error } = await supabase.functions.invoke('puzzles', {
    method: 'POST',
    body: { action: 'all_dates' }
  })

  if (error) {
    throw new Error(`Failed to get all dates: ${error.message}`)
  }

  return data
}
