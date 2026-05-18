import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { supabase, signIn, signUp, signOut } from '../lib/supabase'

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
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ user: state.user }),
    }
  )
)

export default useAuthStore
