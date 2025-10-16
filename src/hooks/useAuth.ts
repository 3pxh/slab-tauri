import { useState, useEffect } from 'react'
import { authService, AuthState } from '../lib/auth'

export function useAuth() {
  const [authState, setAuthState] = useState<AuthState>(authService.getAuthState())

  useEffect(() => {
    const unsubscribe = authService.subscribe(setAuthState)
    return unsubscribe
  }, [])

  const signInWithEmail = async (email: string) => {
    return await authService.signInWithEmail(email)
  }

  const signInWithPassword = async (email: string, password: string) => {
    return await authService.signInWithPassword(email, password)
  }

  const signUpWithPassword = async (email: string, password: string) => {
    return await authService.signUpWithPassword(email, password)
  }

  const linkAccountWithEmail = async (email: string) => {
    return await authService.linkAccountWithEmail(email)
  }

  const signOut = async () => {
    await authService.signOut()
  }

  const deleteAccount = async () => {
    return await authService.deleteAccount()
  }

  return {
    ...authState,
    signInWithEmail,
    signInWithPassword,
    signUpWithPassword,
    linkAccountWithEmail,
    signOut,
    deleteAccount
  }
}
