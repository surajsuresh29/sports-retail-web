import { create } from 'zustand'
import { supabase } from '../supabaseClient'

export const useAuthStore = create((set) => ({
    user: null,
    profile: null,
    loading: true,
    setUser: (user) => set({ user }),
    setProfile: (profile) => set({ profile }),
    setLoading: (loading) => set({ loading }),

    fetchProfile: async (userId) => {
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', userId)
                .single()

            if (data) {
                set({ profile: data })
            }
        } catch (e) {
            console.error('Error fetching profile:', e)
        } finally {
            set({ loading: false })
        }
    },

    signOut: async () => {
        await supabase.auth.signOut()
        set({ user: null, profile: null })
    }
}))
