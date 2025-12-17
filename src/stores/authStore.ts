import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User } from '@/types';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  authMethod: 'email' | 'wallet' | null;
  isLoading: boolean;

  // Actions
  setUser: (user: User | null) => void;
  setAuthMethod: (method: 'email' | 'wallet' | null) => void;
  setLoading: (loading: boolean) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      authMethod: null,
      isLoading: true,

      setUser: (user) =>
        set({
          user,
          isAuthenticated: !!user,
        }),

      setAuthMethod: (method) =>
        set({
          authMethod: method,
        }),

      setLoading: (loading) =>
        set({
          isLoading: loading,
        }),

      logout: () =>
        set({
          user: null,
          isAuthenticated: false,
          authMethod: null,
        }),
    }),
    {
      name: 'trueticket-auth',
      partialize: (state) => ({
        authMethod: state.authMethod,
      }),
    }
  )
);
