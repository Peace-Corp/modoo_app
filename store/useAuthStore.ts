import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface UserData {
  id: string;
  email: string;
  name?: string;
  avatar_url?: string;
  phone?: string;
  role?: 'admin' | 'customer';
  created_at?: string;
}

interface AuthState {
  user: UserData | null;
  isAuthenticated: boolean;
  isLoading: boolean;

  // Set user data and mark as authenticated
  setUser: (user: UserData) => void;

  // Clear user data and mark as not authenticated
  logout: () => void;

  // Update user profile
  updateUser: (updates: Partial<UserData>) => void;

  // Set loading state
  setLoading: (loading: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      isLoading: true,

      setUser: (user) =>
        set({
          user,
          isAuthenticated: true,
          isLoading: false,
        }),

      logout: () =>
        set({
          user: null,
          isAuthenticated: false,
          isLoading: false,
        }),

      updateUser: (updates) =>
        set((state) => ({
          user: state.user ? { ...state.user, ...updates } : null,
        })),

      setLoading: (loading) =>
        set({
          isLoading: loading,
        }),
    }),
    {
      name: 'auth-storage',
    }
  )
);
