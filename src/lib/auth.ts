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
        const isTrulyAnonymous = (session.user.is_anonymous && !session.user.email) ?? true;
        
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

  async signInWithPassword(email: string, password: string): Promise<{ success: boolean; message: string }> {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password
      })

      if (error) {
        return { success: false, message: `Sign in failed: ${error.message}` }
      }

      return { success: true, message: 'Signed in successfully!' }
    } catch (error) {
      return { 
        success: false, 
        message: `Sign in failed: ${error instanceof Error ? error.message : 'Unknown error'}` 
      }
    }
  }

  async signUpWithPassword(email: string, password: string): Promise<{ success: boolean; message: string }> {
    try {
      const { error } = await supabase.auth.signUp({
        email: email.trim(),
        password: password,
        options: {
          emailRedirectTo: window.location.origin
        }
      })

      if (error) {
        return { success: false, message: `Sign up failed: ${error.message}` }
      }

      return { success: true, message: 'Account created! Check your email to confirm your account.' }
    } catch (error) {
      return { 
        success: false, 
        message: `Sign up failed: ${error instanceof Error ? error.message : 'Unknown error'}` 
      }
    }
  }

  async linkAccountWithEmail(email: string): Promise<{ success: boolean; message: string; action: 'linked' | 'signin_sent' }> {
    try {
      // Check if current user is anonymous
      const { data: existingUser } = await supabase.auth.getUser()
      if (!existingUser.user || !existingUser.user.is_anonymous) {
        return { success: false, message: 'No anonymous account to link', action: 'linked' }
      }

      // First, try to update the anonymous user with an email
      const { error: updateError } = await supabase.auth.updateUser({
        email: email.trim()
      })

      if (updateError) {
        console.log('Update error:', updateError)
        
        // If update fails, it might be because an account with this email already exists
        // In that case, send a magic link to sign in to the existing account
        const emailExistsErrors = [
          'already registered',
          'already exists', 
          'User already registered',
          'duplicate key value',
          'email address is already in use',
          'Email already registered',
          'A user with this email address has already been registered'
        ]
        
        const isEmailExistsError = emailExistsErrors.some(errorText => 
          updateError.message.toLowerCase().includes(errorText.toLowerCase())
        )
        
        console.log('Is email exists error:', isEmailExistsError, 'for message:', updateError.message)
        
        if (isEmailExistsError) {
          console.log('Email already exists, sending sign-in link...')
          const { error: signInError } = await supabase.auth.signInWithOtp({
            email: email.trim(),
            options: {
              emailRedirectTo: window.location.origin
            }
          })

          if (signInError) {
            console.log('Sign-in error:', signInError)
            return { 
              success: false, 
              message: `Failed to send sign-in link: ${signInError.message}`,
              action: 'signin_sent'
            }
          }

          return { 
            success: true, 
            message: 'An account with this email already exists. Check your email for a sign-in link!',
            action: 'signin_sent'
          }
        }

        return { 
          success: false, 
          message: `Failed to link account: ${updateError.message}`,
          action: 'linked'
        }
      }

      return { 
        success: true, 
        message: 'Account linked successfully! Check your email to verify.',
        action: 'linked'
      }
    } catch (error) {
      return { 
        success: false, 
        message: `Failed to link account: ${error instanceof Error ? error.message : 'Unknown error'}`,
        action: 'linked'
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
