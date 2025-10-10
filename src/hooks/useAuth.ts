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
    linkAccountWithEmail,
    signOut,
    deleteAccount
  }
}
