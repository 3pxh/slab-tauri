import { supabase } from './supabase'

export interface AuthState {
  user: any | null
  isAuthenticated: boolean
  isAnonymous: boolean
  isLoading: boolean
}

export class AuthService {
  private static instance: AuthService
  private authState: AuthState = {
    user: null,
    isAuthenticated: false,
    isAnonymous: false,
    isLoading: true
  }
  private listeners: ((state: AuthState) => void)[] = []

  private constructor() {
    this.initializeAuth()
  }

  static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService()
    }
    return AuthService.instance
  }

  private async initializeAuth() {
    console.log('🔐 Initializing auth...')
    
    // Check if user is already authenticated
    const { data: { user } } = await supabase.auth.getUser()
    console.log('🔐 Current user check:', { user: user?.id, isAnonymous: user?.is_anonymous })
    
    if (user) {
      console.log('✅ User already authenticated:', user.id, user.email)
      // A user is truly anonymous if they have no email AND is_anonymous is true
      const isTrulyAnonymous = (user.is_anonymous && !user.email) ?? true;
      this.updateAuthState({
        user,
        isAuthenticated: true,
        isAnonymous: isTrulyAnonymous,
        isLoading: false
      })
    } else {
      console.log('🔐 No user found, creating anonymous user...')
      // Create anonymous user if no user exists
      await this.createAnonymousUser()
    }

    // Listen for auth state changes
    supabase.auth.onAuthStateChange((event, session) => {
      console.log('🔐 Auth state change:', { event, userId: session?.user?.id, isAnonymous: session?.user?.is_anonymous, email: session?.user?.email })
      
      if (session?.user) {
        // A user is truly anonymous if they have no email AND is_anonymous is true
        const isTrulyAnonymous = (session.user.is_anonymous && !session.user.email);
        
        // For INITIAL_SESSION, don't override if we already have the correct state
        if (event === 'INITIAL_SESSION' && this.authState.user?.id === session.user.id) {
          console.log('🔐 INITIAL_SESSION: keeping existing anonymous state:', this.authState.isAnonymous);
          return; // Don't update state for INITIAL_SESSION if user is the same
        }
        
        this.updateAuthState({
          user: session.user,
          isAuthenticated: true,
          isAnonymous: isTrulyAnonymous,
          isLoading: false
        })
      } else {
        console.log('🔐 User signed out, creating new anonymous user...')
        // If user signs out, create a new anonymous user
        this.createAnonymousUser()
      }
    })
  }

  private async createAnonymousUser() {
    console.log('🔐 Creating anonymous user...')
    try {
      const { data, error } = await supabase.auth.signInAnonymously()
      
      console.log('🔐 Anonymous sign-in response:', { data, error })
      
      if (error) {
        console.error('❌ Failed to create anonymous user:', error)
        this.updateAuthState({
          user: null,
          isAuthenticated: false,
          isAnonymous: false,
          isLoading: false
        })
      } else if (data.user) {
        console.log('✅ Anonymous user created successfully:', data.user.id)
        this.updateAuthState({
          user: data.user,
          isAuthenticated: true,
          isAnonymous: true,
          isLoading: false
        })
      }
    } catch (error) {
      console.error('❌ Error creating anonymous user:', error)
      this.updateAuthState({
        user: null,
        isAuthenticated: false,
        isAnonymous: false,
        isLoading: false
      })
    }
  }

  private updateAuthState(newState: AuthState) {
    this.authState = newState
    this.listeners.forEach(listener => listener(newState))
  }

  // Public methods
  getAuthState(): AuthState {
    return { ...this.authState }
  }

  subscribe(listener: (state: AuthState) => void): () => void {
    this.listeners.push(listener)
    // Call immediately with current state
    listener(this.authState)
    
    // Return unsubscribe function
    return () => {
      const index = this.listeners.indexOf(listener)
      if (index > -1) {
        this.listeners.splice(index, 1)
      }
    }
  }

  async signInWithEmail(email: string): Promise<{ success: boolean; message: string }> {
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: {
          emailRedirectTo: window.location.origin
        }
      })

      if (error) {
        return { success: false, message: `Sign in failed: ${error.message}` }
      }

      return { success: true, message: 'Check your email for a sign-in link!' }
    } catch (error) {
      return { 
        success: false, 
        message: `Sign in failed: ${error instanceof Error ? error.message : 'Unknown error'}` 
      }
    }
  }

  async linkAccountWithEmail(email: string): Promise<{ success: boolean; message: string }> {
    try {
      // Check if email already exists
      const { data: existingUser } = await supabase.auth.getUser()
      if (!existingUser.user || !existingUser.user.is_anonymous) {
        return { success: false, message: 'No anonymous account to link' }
      }

      // Update the anonymous user with an email
      const { error } = await supabase.auth.updateUser({
        email: email.trim()
      })

      if (error) {
        return { success: false, message: `Failed to link account: ${error.message}` }
      }

      return { 
        success: true, 
        message: 'Account linked successfully! Check your email to verify.' 
      }
    } catch (error) {
      return { 
        success: false, 
        message: `Failed to link account: ${error instanceof Error ? error.message : 'Unknown error'}` 
      }
    }
  }

  async signOut(): Promise<void> {
    await supabase.auth.signOut()
    // The auth state change listener will handle creating a new anonymous user
  }

  async deleteAccount(): Promise<{ success: boolean; message: string }> {
    try {
      const { error } = await supabase.auth.admin.deleteUser(
        this.authState.user?.id || ''
      )

      if (error) {
        return { success: false, message: `Failed to delete account: ${error.message}` }
      }

      return { success: true, message: 'Account deleted successfully' }
    } catch (error) {
      return { 
        success: false, 
        message: `Failed to delete account: ${error instanceof Error ? error.message : 'Unknown error'}` 
      }
    }
  }
}

// Export singleton instance
export const authService = AuthService.getInstance()
