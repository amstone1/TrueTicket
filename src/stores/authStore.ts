import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// This store handles UI preferences related to auth, not the actual auth state.
// The actual auth state is managed by AuthContext.

interface AuthPreferencesState {
  // Preferences
  preferredAuthMethod: 'email' | 'wallet' | null;
  rememberMe: boolean;

  // Actions
  setPreferredAuthMethod: (method: 'email' | 'wallet' | null) => void;
  setRememberMe: (remember: boolean) => void;
}

export const useAuthPreferences = create<AuthPreferencesState>()(
  persist(
    (set) => ({
      preferredAuthMethod: 'email',
      rememberMe: false,

      setPreferredAuthMethod: (method) =>
        set({ preferredAuthMethod: method }),

      setRememberMe: (remember) =>
        set({ rememberMe: remember }),
    }),
    {
      name: 'trueticket-auth-prefs',
    }
  )
);

// Legacy export for backwards compatibility during migration
// TODO: Remove after migration complete
export const useAuthStore = useAuthPreferences;
