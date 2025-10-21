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
  rule_description?: string
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

// Function to get a puzzle by timestamp for George's puzzles
export async function getPuzzle(timestamp: string): Promise<GetPuzzleResponse> {
  const { data, error } = await supabase
    .from('puzzles')
    .select('*')
    .eq('creator_id', '3996a43b-86dd-4bda-8807-dc3d8e76e5a7')
    .lte('publish_date', timestamp)
    .order('publish_date', { ascending: false })
    .limit(1)

  if (error) {
    throw new Error(`Failed to get puzzle: ${error.message}`)
  }

  if (!data || data.length === 0) {
    throw new Error(`No puzzle found published before the given timestamp: ${timestamp}`)
  }

  const puzzle: Puzzle = data[0]

  return {
    success: true,
    puzzle: puzzle,
    timestamp: timestamp,
    message: `Found puzzle published on ${puzzle.publish_date}`
  }
}

// Function to get a puzzle by UUID (for sharing)
export async function getPuzzleByUuid(uuid: string): Promise<{ success: boolean; puzzle: Puzzle; message: string }> {
  const response = await fetch(`${supabaseUrl}/functions/v1/puzzles`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${supabaseAnonKey}`,
    },
    body: JSON.stringify({
      action: 'get_by_uuid',
      uuid: uuid
    })
  })

  if (!response.ok) {
    const errorData = await response.json()
    throw new Error(`Failed to get puzzle: ${errorData.error || 'Unknown error'}`)
  }

  const data = await response.json()
  return data
}

// Function to get all puzzle dates for George's puzzles
export async function getAllDates(): Promise<GetAllDatesResponse> {
  const { data, error } = await supabase
    .from('puzzles')
    .select('publish_date')
    .eq('creator_id', '3996a43b-86dd-4bda-8807-dc3d8e76e5a7')
    .order('publish_date', { ascending: true })

  if (error) {
    throw new Error(`Failed to get all dates: ${error.message}`)
  }

  const dates = data?.map(row => row.publish_date) || []

  return {
    success: true,
    dates: dates,
    count: dates.length,
    message: `Found ${dates.length} puzzle dates`
  }
}

// Slab management interfaces and functions
export interface Slab {
  id: number
  slab_data: any
  created_at: string
  updated_at: string
  creator_id: string | null
}

export interface SlabResponse {
  success: boolean
  slab?: Slab
  slabs?: Slab[]
  message: string
}

// Function to get all slabs created by the current user
export async function getUserSlabs(): Promise<SlabResponse> {
  const { data, error } = await supabase
    .from('slabs')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    throw new Error(`Failed to get user slabs: ${error.message}`)
  }

  return {
    success: true,
    slabs: data || [],
    message: `Found ${data?.length || 0} slabs`
  }
}

// Function to create a new slab
export async function createSlab(slabData: any): Promise<SlabResponse> {
  const { data, error } = await supabase
    .from('slabs')
    .insert([{ 
      slab_data: slabData,
      creator_id: (await supabase.auth.getUser()).data.user?.id
    }])
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to create slab: ${error.message}`)
  }

  return {
    success: true,
    slab: data,
    message: 'Slab created successfully'
  }
}

// Function to update an existing slab
export async function updateSlab(slabId: number, slabData: any): Promise<SlabResponse> {
  const { data, error } = await supabase
    .from('slabs')
    .update({ slab_data: slabData })
    .eq('id', slabId)
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to update slab: ${error.message}`)
  }

  return {
    success: true,
    slab: data,
    message: 'Slab updated successfully'
  }
}

// Function to delete a slab
export async function deleteSlab(slabId: number): Promise<SlabResponse> {
  const { error } = await supabase
    .from('slabs')
    .delete()
    .eq('id', slabId)

  if (error) {
    throw new Error(`Failed to delete slab: ${error.message}`)
  }

  return {
    success: true,
    message: 'Slab deleted successfully'
  }
}

// Serialized slab format (stored in database)
export interface SerializedSlab {
  grid: string;
  colors: string[][];
}

// Custom data structure for puzzle progress
export interface PuzzleProgressCustomData {
  hasWon?: boolean;
  savedSlabs?: SerializedSlab[];
  archivedSlabs?: SerializedSlab[];
  remainingGuesses?: number;
  // Optional fields for individual guessing mode
  isInIndividualGuessMode?: boolean;
  currentGuessIndex?: number;
  guessCorrectCount?: number;
  guessIncorrectCount?: number;
  slabsToGuess?: any[]; // This would be SlabData[] but we don't serialize these
  lastGuessResult?: boolean | null;
}

// Puzzle Progress interfaces and functions
export interface PuzzleProgress {
  id?: string
  puzzle_id: string
  user_id: string
  trophies: number
  attempts: number
  best_score?: number
  completed_at?: string
  last_played_at: string
  custom_data?: PuzzleProgressCustomData
  created_at?: string
  updated_at?: string
}

export interface PuzzleProgressResponse {
  success: boolean
  progress?: PuzzleProgress
  progressList?: PuzzleProgress[]
  message: string
}

// Function to get puzzle progress for current user
export async function getPuzzleProgress(puzzleId: string): Promise<PuzzleProgressResponse> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    throw new Error('User not authenticated')
  }

  const { data, error } = await supabase
    .from('puzzle_progress')
    .select('*')
    .eq('puzzle_id', puzzleId)
    .eq('user_id', user.id)
    .single()

  if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
    throw new Error(`Failed to get puzzle progress: ${error.message}`)
  }

  return {
    success: true,
    progress: data || null,
    message: data ? 'Progress found' : 'No progress found'
  }
}

// Function to save puzzle progress
export async function savePuzzleProgress(progress: Omit<PuzzleProgress, 'id' | 'user_id' | 'created_at' | 'updated_at'>): Promise<PuzzleProgressResponse> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    throw new Error('User not authenticated')
  }

  const progressData = {
    ...progress,
    user_id: user.id,
    last_played_at: new Date().toISOString()
  }

  const { data, error } = await supabase
    .from('puzzle_progress')
    .upsert(progressData, { 
      onConflict: 'puzzle_id,user_id',
      ignoreDuplicates: false 
    })
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to save puzzle progress: ${error.message}`)
  }

  return {
    success: true,
    progress: data,
    message: 'Progress saved successfully'
  }
}

// Function to get all puzzle progress for current user
export async function getAllPuzzleProgress(): Promise<PuzzleProgressResponse> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    throw new Error('User not authenticated')
  }

  const { data, error } = await supabase
    .from('puzzle_progress')
    .select('*')
    .eq('user_id', user.id)
    .order('last_played_at', { ascending: false })

  if (error) {
    throw new Error(`Failed to get all puzzle progress: ${error.message}`)
  }

  return {
    success: true,
    progressList: data || [],
    message: `Found ${data?.length || 0} progress records`
  }
}

// Function to delete puzzle progress
export async function deletePuzzleProgress(puzzleId: string): Promise<PuzzleProgressResponse> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    throw new Error('User not authenticated')
  }

  const { error } = await supabase
    .from('puzzle_progress')
    .delete()
    .eq('puzzle_id', puzzleId)
    .eq('user_id', user.id)

  if (error) {
    throw new Error(`Failed to delete puzzle progress: ${error.message}`)
  }

  return {
    success: true,
    message: 'Progress deleted successfully'
  }
}

// Email signup interfaces and functions
export interface EmailSignupResponse {
  success: boolean
  message: string
  email?: string
  already_signed_up?: boolean
}

// Function to sign up for app launch notifications
export async function signupForLaunch(email: string): Promise<EmailSignupResponse> {
  const response = await fetch(`${supabaseUrl}/functions/v1/email-signup`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${supabaseAnonKey}`,
    },
    body: JSON.stringify({
      email: email
    })
  })

  if (!response.ok) {
    const errorData = await response.json()
    throw new Error(errorData.error || 'Failed to sign up for launch notifications')
  }

  const data = await response.json()
  return data
}
