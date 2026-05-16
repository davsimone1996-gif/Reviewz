import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { supabase, signIn, signUp, signOut } from '../lib/supabase'

// Module-level subscription reference to prevent duplicates and enable cleanup
let _authSubscription = null

const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      profile: null,
      loading: true,
      error: null,

      setUser: (user) => set({ user }),
      setProfile: (profile) => set({ profile }),
      setLoading: (loading) => set({ loading }),

      login: async (email, password) => {
        set({ error: null, loading: true })
        try {
          const { data, error } = await signIn(email, password)
          if (error) throw error
          set({ user: data.user, loading: false })
          return data
        } catch (err) {
          set({ error: err.message, loading: false })
          throw err
        }
      },

      register: async (email, password, username) => {
        set({ error: null, loading: true })
        try {
          const { data, error } = await signUp(email, password, username)
          if (error) throw error
          set({ user: data.user, loading: false })
          return data
        } catch (err) {
          set({ error: err.message, loading: false })
          throw err
        }
      },

      logout: async () => {
        if (_authSubscription) {
          _authSubscription.unsubscribe()
          _authSubscription = null
        }
        await signOut()
        set({ user: null, profile: null, loading: false })
      },

      initialize: async () => {
        set({ loading: true })
        const { data: { session } } = await supabase.auth.getSession()
        set({ user: session?.user ?? null, loading: false })

        // Unsubscribe from any existing listener before creating a new one
        if (_authSubscription) {
          _authSubscription.unsubscribe()
        }

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
          set({ user: session?.user ?? null })
        })
        _authSubscription = subscription
      },
    }),
    {
      name: 'reviewz-auth',
      partialize: (state) => ({ user: state.user }),
    }
  )
)

export default useAuthStore
