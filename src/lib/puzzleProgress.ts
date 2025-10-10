import { supabase, PuzzleProgress } from './supabase'
import { authService } from './auth'

export class PuzzleProgressService {
  private static instance: PuzzleProgressService

  private constructor() {}

  static getInstance(): PuzzleProgressService {
    if (!PuzzleProgressService.instance) {
      PuzzleProgressService.instance = new PuzzleProgressService()
    }
    return PuzzleProgressService.instance
  }

  async getProgress(puzzleId: string): Promise<PuzzleProgress | null> {
    const authState = authService.getAuthState()
    console.log('📊 Getting progress for puzzle:', puzzleId, 'User:', authState.user?.id)
    
    if (!authState.isAuthenticated) {
      console.error('❌ User not authenticated for getProgress')
      throw new Error('User not authenticated')
    }

    const { data, error } = await supabase
      .from('puzzle_progress')
      .select('*')
      .eq('puzzle_id', puzzleId)
      .eq('user_id', authState.user.id)
      .maybeSingle()

    console.log('📊 Get progress response:', { data, error })
    if (error) {
      console.error('📊 Full error details:', JSON.stringify(error, null, 2))
      throw new Error(`Failed to get puzzle progress: ${error.message}`)
    }

    return data
  }

  async saveProgress(progress: Omit<PuzzleProgress, 'id' | 'user_id' | 'created_at' | 'updated_at'>): Promise<PuzzleProgress> {
    const authState = authService.getAuthState()
    console.log('💾 Saving progress:', progress, 'User:', authState.user?.id)
    
    if (!authState.isAuthenticated) {
      console.error('❌ User not authenticated for saveProgress')
      throw new Error('User not authenticated')
    }

    const progressData = {
      ...progress,
      user_id: authState.user.id,
      last_played_at: new Date().toISOString()
    }

    console.log('💾 Progress data to save:', progressData)

    const { data, error } = await supabase
      .from('puzzle_progress')
      .upsert(progressData, { 
        onConflict: 'puzzle_id,user_id',
        ignoreDuplicates: false 
      })
      .select()
      .single()

    console.log('💾 Save progress response:', { data, error })

    if (error) {
      console.error('❌ Failed to save puzzle progress:', error)
      throw new Error(`Failed to save puzzle progress: ${error.message}`)
    }

    return data
  }

  async getAllProgress(): Promise<PuzzleProgress[]> {
    const authState = authService.getAuthState()
    
    if (!authState.isAuthenticated) {
      throw new Error('User not authenticated')
    }

    const { data, error } = await supabase
      .from('puzzle_progress')
      .select('*')
      .eq('user_id', authState.user.id)
      .order('last_played_at', { ascending: false })

    if (error) {
      throw new Error(`Failed to get all puzzle progress: ${error.message}`)
    }

    return data || []
  }

  async deleteProgress(puzzleId: string): Promise<void> {
    const authState = authService.getAuthState()
    
    if (!authState.isAuthenticated) {
      throw new Error('User not authenticated')
    }

    const { error } = await supabase
      .from('puzzle_progress')
      .delete()
      .eq('puzzle_id', puzzleId)
      .eq('user_id', authState.user.id)

    if (error) {
      throw new Error(`Failed to delete puzzle progress: ${error.message}`)
    }
  }

  // Helper methods for common operations
  async incrementAttempts(puzzleId: string): Promise<PuzzleProgress> {
    const existing = await this.getProgress(puzzleId)
    
    const progress = {
      puzzle_id: puzzleId,
      trophies: existing?.trophies || 0,
      attempts: (existing?.attempts || 0) + 1,
      best_score: existing?.best_score,
      completed_at: existing?.completed_at,
      last_played_at: new Date().toISOString(),
      custom_data: existing?.custom_data || {}
    }

    return await this.saveProgress(progress)
  }

  async addTrophy(puzzleId: string): Promise<PuzzleProgress> {
    const existing = await this.getProgress(puzzleId)
    
    const progress = {
      puzzle_id: puzzleId,
      trophies: (existing?.trophies || 0) + 1,
      attempts: existing?.attempts || 0,
      best_score: existing?.best_score,
      completed_at: existing?.completed_at,
      last_played_at: new Date().toISOString(),
      custom_data: existing?.custom_data || {}
    }

    return await this.saveProgress(progress)
  }

  async markCompleted(puzzleId: string, score?: number): Promise<PuzzleProgress> {
    const existing = await this.getProgress(puzzleId)
    
    const progress = {
      puzzle_id: puzzleId,
      trophies: existing?.trophies || 0,
      attempts: existing?.attempts || 0,
      best_score: score && (!existing?.best_score || score > existing.best_score) ? score : existing?.best_score,
      completed_at: new Date().toISOString(),
      last_played_at: new Date().toISOString(),
      custom_data: existing?.custom_data || {}
    }

    return await this.saveProgress(progress)
  }

  async updateCustomData(puzzleId: string, customData: Record<string, any>): Promise<PuzzleProgress> {
    const existing = await this.getProgress(puzzleId)
    
    const progress = {
      puzzle_id: puzzleId,
      trophies: existing?.trophies || 0,
      attempts: existing?.attempts || 0,
      best_score: existing?.best_score,
      completed_at: existing?.completed_at,
      last_played_at: new Date().toISOString(),
      custom_data: { ...(existing?.custom_data || {}), ...customData }
    }

    return await this.saveProgress(progress)
  }
}

// Export singleton instance
export const puzzleProgressService = PuzzleProgressService.getInstance()
