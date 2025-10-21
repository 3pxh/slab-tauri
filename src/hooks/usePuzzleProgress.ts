import { useState, useEffect, useCallback } from 'react'
import { puzzleProgressService } from '../lib/puzzleProgress'
import { PuzzleProgress, PuzzleProgressDeserialized } from '../lib/supabase'

export function usePuzzleProgress(puzzleId?: string) {
  const [progress, setProgress] = useState<PuzzleProgressDeserialized | null>(null)
  const [allProgress, setAllProgress] = useState<PuzzleProgress[]>([])
  const [isLoading, setIsLoading] = useState(!!puzzleId) // Start as true if we have a puzzleId
  const [error, setError] = useState<string | null>(null)

  // Load progress for specific puzzle
  const loadProgress = useCallback(async (id: string) => {
    setIsLoading(true)
    setError(null)
    
    try {
      const data = await puzzleProgressService.getProgress(id)
      setProgress(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load progress')
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Load all progress
  const loadAllProgress = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    
    try {
      const data = await puzzleProgressService.getAllProgress()
      setAllProgress(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load progress')
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Save progress
  const saveProgress = useCallback(async (progressData: Omit<PuzzleProgressDeserialized, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
    setIsLoading(true)
    setError(null)
    
    try {
      const data = await puzzleProgressService.saveProgress(progressData)
      setProgress(data)
      return data
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save progress')
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Increment attempts
  const incrementAttempts = useCallback(async (id: string) => {
    setIsLoading(true)
    setError(null)
    
    try {
      const data = await puzzleProgressService.incrementAttempts(id)
      setProgress(data)
      return data
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to increment attempts')
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Add trophy
  const addTrophy = useCallback(async (id: string) => {
    setIsLoading(true)
    setError(null)
    
    try {
      const data = await puzzleProgressService.addTrophy(id)
      setProgress(data)
      return data
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add trophy')
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Mark completed
  const markCompleted = useCallback(async (id: string, score?: number) => {
    setIsLoading(true)
    setError(null)
    
    try {
      const data = await puzzleProgressService.markCompleted(id, score)
      setProgress(data)
      return data
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to mark completed')
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Update custom data
  const updateCustomData = useCallback(async (id: string, customData: Record<string, any>) => {
    setIsLoading(true)
    setError(null)
    
    try {
      const data = await puzzleProgressService.updateCustomData(id, customData)
      setProgress(data)
      return data
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update custom data')
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Delete progress
  const deleteProgress = useCallback(async (id: string) => {
    setIsLoading(true)
    setError(null)
    
    try {
      await puzzleProgressService.deleteProgress(id)
      setProgress(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete progress')
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Load progress when puzzleId changes
  useEffect(() => {
    if (puzzleId) {
      loadProgress(puzzleId)
    }
  }, [puzzleId, loadProgress])

  return {
    progress,
    allProgress,
    isLoading,
    error,
    loadProgress,
    loadAllProgress,
    saveProgress,
    incrementAttempts,
    addTrophy,
    markCompleted,
    updateCustomData,
    deleteProgress
  }
}
