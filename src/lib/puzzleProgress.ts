import { supabase, PuzzleProgress, PuzzleProgressDeserialized, SerializedSlab } from './supabase'
import { SlabData } from '../components/Slab'
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
  private deserializeSlabsInProgress(progress: PuzzleProgress): PuzzleProgressDeserialized {
    if (!progress || !progress.custom_data) return progress as PuzzleProgressDeserialized;
    
    const deserialized: PuzzleProgressDeserialized = {
      ...progress,
      custom_data: {
        ...progress.custom_data,
        savedSlabs: undefined,
        archivedSlabs: undefined,
        slabsToGuess: undefined
      }
    };
    
    // Deserialize savedSlabs if they exist (convert from SerializedSlab[] to SlabData[])
    if (progress.custom_data.savedSlabs && Array.isArray(progress.custom_data.savedSlabs)) {
      // Check if slabs are already deserialized (have cells property) or need deserialization
      if (progress.custom_data.savedSlabs[0] && typeof progress.custom_data.savedSlabs[0] === 'object' && 'grid' in progress.custom_data.savedSlabs[0]) {
        const deserializedSlabs: SlabData[] = progress.custom_data.savedSlabs.map(deserializeSlab);
        if (deserialized.custom_data) {
          deserialized.custom_data.savedSlabs = deserializedSlabs;
        }
      } else {
        // Already deserialized, just copy over
        if (deserialized.custom_data) {
          deserialized.custom_data.savedSlabs = progress.custom_data.savedSlabs as unknown as SlabData[];
        }
      }
    }
    
    // Deserialize archivedSlabs if they exist (convert from SerializedSlab[] to SlabData[])
    if (progress.custom_data.archivedSlabs && Array.isArray(progress.custom_data.archivedSlabs)) {
      // Check if slabs are already deserialized (have cells property) or need deserialization
      if (progress.custom_data.archivedSlabs[0] && typeof progress.custom_data.archivedSlabs[0] === 'object' && 'grid' in progress.custom_data.archivedSlabs[0]) {
        const deserializedSlabs: SlabData[] = progress.custom_data.archivedSlabs.map(deserializeSlab);
        if (deserialized.custom_data) {
          deserialized.custom_data.archivedSlabs = deserializedSlabs;
        }
      } else {
        // Already deserialized, just copy over
        if (deserialized.custom_data) {
          deserialized.custom_data.archivedSlabs = progress.custom_data.archivedSlabs as unknown as SlabData[];
        }
      }
    }
    
    // Deserialize slabsToGuess if they exist
    if (progress.custom_data.slabsToGuess && Array.isArray(progress.custom_data.slabsToGuess)) {
      // Check if slabs are already deserialized (have cells property) or need deserialization
      if (progress.custom_data.slabsToGuess[0] && typeof progress.custom_data.slabsToGuess[0] === 'object' && 'grid' in progress.custom_data.slabsToGuess[0]) {
        const deserializedSlabs: SlabData[] = progress.custom_data.slabsToGuess.map(deserializeSlab);
        if (deserialized.custom_data) {
          deserialized.custom_data.slabsToGuess = deserializedSlabs;
        }
      } else {
        // Already deserialized, just copy over
        if (deserialized.custom_data) {
          deserialized.custom_data.slabsToGuess = progress.custom_data.slabsToGuess as unknown as SlabData[];
        }
      }
    }
    
    return deserialized;
  }

  async getProgress(puzzleId: string): Promise<PuzzleProgressDeserialized | null> {
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
  private serializeSlabsInProgress(progress: Omit<PuzzleProgressDeserialized, 'id' | 'user_id' | 'created_at' | 'updated_at'>): Omit<PuzzleProgress, 'id' | 'user_id' | 'created_at' | 'updated_at'> {
    const serialized: Omit<PuzzleProgress, 'id' | 'user_id' | 'created_at' | 'updated_at'> = {
      ...progress,
      custom_data: {
        ...progress.custom_data,
        savedSlabs: undefined,
        archivedSlabs: undefined,
        slabsToGuess: undefined
      }
    };
    
    // Serialize savedSlabs if they exist (convert from SlabData[] to SerializedSlab[])
    if (progress.custom_data?.savedSlabs && Array.isArray(progress.custom_data.savedSlabs)) {
      const serializedSlabs: SerializedSlab[] = progress.custom_data.savedSlabs.map(serializeSlab);
      if (serialized.custom_data) {
        serialized.custom_data.savedSlabs = serializedSlabs;
      }
    }
    
    // Serialize archivedSlabs if they exist (convert from SlabData[] to SerializedSlab[])
    if (progress.custom_data?.archivedSlabs && Array.isArray(progress.custom_data.archivedSlabs)) {
      const serializedSlabs: SerializedSlab[] = progress.custom_data.archivedSlabs.map(serializeSlab);
      if (serialized.custom_data) {
        serialized.custom_data.archivedSlabs = serializedSlabs;
      }
    }
    
    // Serialize slabsToGuess if they exist
    if (progress.custom_data?.slabsToGuess && Array.isArray(progress.custom_data.slabsToGuess)) {
      const serializedSlabs: SerializedSlab[] = progress.custom_data.slabsToGuess.map(serializeSlab);
      if (serialized.custom_data) {
        serialized.custom_data.slabsToGuess = serializedSlabs;
      }
    }
    
    return serialized;
  }

  async saveProgress(progress: Omit<PuzzleProgressDeserialized, 'id' | 'user_id' | 'created_at' | 'updated_at'>): Promise<PuzzleProgressDeserialized> {
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

    // Deserialize the saved data before returning
    return this.deserializeSlabsInProgress(data)
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

  async getSolvedPuzzlesCount(): Promise<number> {
    const authState = authService.getAuthState()
    
    if (!authState.isAuthenticated) {
      return 0
    }

    // Join with puzzles table to filter by George's creator_id
    const { count, error } = await supabase
      .from('puzzle_progress')
      .select('*, puzzles!inner(creator_id)', { count: 'exact', head: true })
      .eq('user_id', authState.user.id)
      .eq('puzzles.creator_id', '3996a43b-86dd-4bda-8807-dc3d8e76e5a7')
      .gte('trophies', 1)

    if (error) {
      console.error('Failed to get solved puzzles count:', error)
      return 0
    }

    return count || 0
  }

  // Helper methods for common operations
  async incrementAttempts(puzzleId: string): Promise<PuzzleProgressDeserialized> {
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

  async addTrophy(puzzleId: string): Promise<PuzzleProgressDeserialized> {
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

  async markCompleted(puzzleId: string, score?: number): Promise<PuzzleProgressDeserialized> {
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

  async updateCustomData(puzzleId: string, customData: Record<string, any>): Promise<PuzzleProgressDeserialized> {
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
