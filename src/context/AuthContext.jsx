import React, { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../services/supabase'

const AuthContext = createContext(undefined)

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [userProfile, setUserProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Enhanced error logging
  const logError = (operation, error) => {
    console.error(`Auth Error in ${operation}:`, {
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint,
      stack: error.stack
    })
  }

  const fetchUserProfile = async (userId) => {
    try {
      console.log('Fetching profile for user:', userId)
      
      // Check if users table exists first
      const { data, error, status } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single()
      
      if (error) {
        if (status === 404) {
          console.log('User profile not found (404)')
          return null
        }
        if (error.code === '42P01') {
          console.error('Users table does not exist:', error)
          return null
        }
        logError('fetchUserProfile', error)
        return null
      }
      
      console.log('User profile fetched successfully:', data)
      return data
    } catch (error) {
      logError('fetchUserProfile-catch', error)
      return null
    }
  }

  const createUserProfile = async (userId, email, role = 'user') => {
    try {
      console.log('Creating user profile for:', userId)
      
      const { data, error } = await supabase
        .from('users')
        .insert({
          id: userId,
          email: email,
          role: role,
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single()

      if (error) {
        logError('createUserProfile', error)
        
        // Handle specific errors
        if (error.code === '42501') {
          throw new Error('Permission denied: Cannot create user profile')
        }
        if (error.code === '42P01') {
          throw new Error('Users table does not exist')
        }
        if (error.code === '23505') {
          // User already exists, fetch it
          console.log('User profile already exists')
          return await fetchUserProfile(userId)
        }
        
        throw error
      }

      console.log('User profile created successfully')
      return data
    } catch (error) {
      logError('createUserProfile-catch', error)
      throw error
    }
  }

  useEffect(() => {
    let mounted = true

    const initializeAuth = async () => {
      try {
        setLoading(true)
        setError(null)
        
        console.log('Initializing auth...')
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()
        
        if (sessionError) {
          logError('getSession', sessionError)
          setError(`Session error: ${sessionError.message}`)
          return
        }

        if (mounted) {
          if (session?.user) {
            console.log('Session found for user:', session.user.email)
            setUser(session.user)
            
            // Try to fetch profile, but don't fail if it doesn't exist
            try {
              const profile = await fetchUserProfile(session.user.id)
              setUserProfile(profile)
              console.log('Profile loaded:', profile ? 'Yes' : 'No')
            } catch (profileError) {
              console.warn('Could not load user profile:', profileError)
              setUserProfile(null)
            }
          } else {
            console.log('No session found')
            setUser(null)
            setUserProfile(null)
          }
        }
      } catch (err) {
        logError('initializeAuth', err)
        setError(`Initialization failed: ${err.message}`)
      } finally {
        if (mounted) {
          setLoading(false)
        }
      }
    }

    initializeAuth()

    // Auth state change listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return
      
      console.log('Auth state changed:', event)
      
      try {
        if (session?.user) {
          setUser(session.user)
          
          if (event === 'SIGNED_IN') {
            console.log('User signed in, checking profile...')
            try {
              let profile = await fetchUserProfile(session.user.id)
              
              if (!profile) {
                console.log('No profile found, creating one...')
                profile = await createUserProfile(session.user.id, session.user.email, 'user')
              }
              
              setUserProfile(profile)
            } catch (profileError) {
              console.warn('Profile handling failed:', profileError)
              // Don't block sign-in if profile creation fails
            }
          }
        } else if (event === 'SIGNED_OUT') {
          setUser(null)
          setUserProfile(null)
        }
      } catch (err) {
        logError('authStateChange', err)
      }
    })

    return () => {
      mounted = false
      subscription?.unsubscribe()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const signUp = async (email, password, role = 'user') => {
    try {
      setLoading(true)
      setError(null)
      console.log('Starting signup for:', email)
      
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            role: role
          },
          emailRedirectTo: `${window.location.origin}/auth/callback`
        }
      })

      if (error) {
        logError('signUp', error)
        
        // Provide user-friendly error messages
        let userMessage = error.message
        
        if (error.message.includes('500')) {
          userMessage = 'Server error during signup. Please try again or contact support.'
        } else if (error.message.includes('user already exists')) {
          userMessage = 'An account with this email already exists.'
        } else if (error.message.includes('password')) {
          userMessage = 'Password does not meet requirements.'
        }
        
        setError(userMessage)
        return { data: null, error: new Error(userMessage) }
      }

      console.log('Signup successful, confirmation email sent')
      return { data, error: null }
      
    } catch (err) {
      logError('signUp-catch', err)
      const userMessage = err.message || 'An unexpected error occurred during signup.'
      setError(userMessage)
      return { data: null, error: new Error(userMessage) }
    } finally {
      setLoading(false)
    }
  }

  const signIn = async (email, password) => {
    try {
      setLoading(true)
      setError(null)
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        logError('signIn', error)
        setError(error.message)
        return { data: null, error }
      }

      return { data, error: null }
    } catch (err) {
      logError('signIn-catch', err)
      setError(err.message)
      return { data: null, error: err }
    } finally {
      setLoading(false)
    }
  }

  const signOut = async () => {
    try {
      setLoading(true)
      const { error } = await supabase.auth.signOut()
      if (error) throw error
      return { error: null }
    } catch (err) {
      logError('signOut', err)
      return { error: err }
    } finally {
      setLoading(false)
    }
  }

  const isAdmin = () => {
    return userProfile?.role === 'admin'
  }

  const getUserRole = () => {
    return userProfile?.role || 'user'
  }

  const clearError = () => setError(null)

  const value = {
    user,
    profile: userProfile,
    signUp,
    signIn,
    signOut,
    isAdmin,
    getUserRole,
    loading,
    error,
    clearError
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}