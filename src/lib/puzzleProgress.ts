import { supabase, PuzzleProgress, SerializedSlab } from './supabase'
import { authService } from './auth'
import { serializeSlab, deserializeSlab } from '../components/Slab'

export class PuzzleProgressService {
  private static instance: PuzzleProgressService

  private constructor() {}

  static getInstance(): PuzzleProgressService {
    if (!PuzzleProgressService.instance) {
      PuzzleProgressService.instance = new PuzzleProgressService()
    }
    return PuzzleProgressService.instance
  }

  // Helper function to deserialize slabs in progress data
  private deserializeSlabsInProgress(progress: PuzzleProgress): PuzzleProgress {
    if (!progress || !progress.custom_data) return progress;
    
    const deserialized = { ...progress };
    
    // Deserialize savedSlabs if they exist and are serialized
    if (deserialized.custom_data?.savedSlabs && Array.isArray(deserialized.custom_data.savedSlabs)) {
      // Check if slabs are serialized (have grid property) or need deserialization
      if (deserialized.custom_data.savedSlabs[0] && typeof deserialized.custom_data.savedSlabs[0] === 'object' && 'grid' in deserialized.custom_data.savedSlabs[0]) {
        const deserializedSlabs = deserialized.custom_data.savedSlabs.map((slab: SerializedSlab) => deserializeSlab(slab));
        deserialized.custom_data = {
          ...deserialized.custom_data,
          savedSlabs: deserializedSlabs as any
        };
      }
    }
    
    // Deserialize archivedSlabs if they exist and are serialized
    if (deserialized.custom_data?.archivedSlabs && Array.isArray(deserialized.custom_data.archivedSlabs)) {
      // Check if slabs are serialized (have grid property) or need deserialization
      if (deserialized.custom_data.archivedSlabs[0] && typeof deserialized.custom_data.archivedSlabs[0] === 'object' && 'grid' in deserialized.custom_data.archivedSlabs[0]) {
        const deserializedSlabs = deserialized.custom_data.archivedSlabs.map((slab: SerializedSlab) => deserializeSlab(slab));
        deserialized.custom_data = {
          ...deserialized.custom_data,
          archivedSlabs: deserializedSlabs as any
        };
      }
    }
    
    return deserialized;
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

    // Deserialize slabs before returning
    return data ? this.deserializeSlabsInProgress(data) : null
  }

  // Helper function to serialize slabs in progress data
  private serializeSlabsInProgress(progress: Omit<PuzzleProgress, 'id' | 'user_id' | 'created_at' | 'updated_at'>): Omit<PuzzleProgress, 'id' | 'user_id' | 'created_at' | 'updated_at'> {
    const serialized = { ...progress };
    
    // Serialize savedSlabs if they exist and are not already serialized
    if (serialized.custom_data?.savedSlabs && Array.isArray(serialized.custom_data.savedSlabs)) {
      // Check if slabs are already serialized (have grid property) or need serialization
      if (serialized.custom_data.savedSlabs[0] && typeof serialized.custom_data.savedSlabs[0] === 'object' && !('grid' in serialized.custom_data.savedSlabs[0])) {
        const serializedSlabs: SerializedSlab[] = serialized.custom_data.savedSlabs.map((slab: any) => serializeSlab(slab));
        serialized.custom_data = {
          ...serialized.custom_data,
          savedSlabs: serializedSlabs
        };
      }
    }
    
    // Serialize archivedSlabs if they exist and are not already serialized
    if (serialized.custom_data?.archivedSlabs && Array.isArray(serialized.custom_data.archivedSlabs)) {
      // Check if slabs are already serialized (have grid property) or need serialization
      if (serialized.custom_data.archivedSlabs[0] && typeof serialized.custom_data.archivedSlabs[0] === 'object' && !('grid' in serialized.custom_data.archivedSlabs[0])) {
        const serializedSlabs: SerializedSlab[] = serialized.custom_data.archivedSlabs.map((slab: any) => serializeSlab(slab));
        serialized.custom_data = {
          ...serialized.custom_data,
          archivedSlabs: serializedSlabs
        };
      }
    }
    
    return serialized;
  }

  async saveProgress(progress: Omit<PuzzleProgress, 'id' | 'user_id' | 'created_at' | 'updated_at'>): Promise<PuzzleProgress> {
    const authState = authService.getAuthState()
    console.log('💾 Saving progress:', progress, 'User:', authState.user?.id)
    
    if (!authState.isAuthenticated) {
      console.error('❌ User not authenticated for saveProgress')
      throw new Error('User not authenticated')
    }

    // Serialize slabs before saving to database
    const serializedProgress = this.serializeSlabsInProgress(progress);
    
    const progressData = {
      ...serializedProgress,
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
