'use client';

import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { getInitials } from '@/lib/utils';
import type { User, UserRole } from '@/types';

// Unified User type that matches our types/index.ts
interface AuthUser {
  id: string;
  email?: string;
  displayName?: string;
  firstName?: string;
  lastName?: string;
  role: UserRole;
  walletAddress?: string;
  avatarUrl?: string;
  emailVerified: boolean;
  isArtist: boolean;
  isVenue: boolean;
  isAdmin: boolean;
}

interface RegisterData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: 'USER' | 'ORGANIZER';
  acceptTerms: boolean;
}

interface AuthContextType {
  // State
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: string | null;

  // Auth actions
  login: (email: string, password: string, rememberMe?: boolean) => Promise<{ success: boolean; error?: string }>;
  register: (data: RegisterData) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  logoutAll: () => Promise<void>;
  refreshUser: () => Promise<void>;
  clearError: () => void;

  // Display helpers
  displayName: string;
  initials: string;
  avatarUrl?: string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function normalizeUser(apiUser: any): AuthUser {
  return {
    id: apiUser.id,
    email: apiUser.email,
    displayName: apiUser.displayName || (apiUser.firstName && apiUser.lastName
      ? `${apiUser.firstName} ${apiUser.lastName}`.trim()
      : apiUser.email?.split('@')[0] || 'User'),
    firstName: apiUser.firstName,
    lastName: apiUser.lastName,
    role: apiUser.role || 'USER',
    walletAddress: apiUser.walletAddress,
    avatarUrl: apiUser.avatarUrl,
    emailVerified: apiUser.emailVerified || false,
    isArtist: apiUser.role === 'ARTIST' || apiUser.isArtist || false,
    isVenue: apiUser.role === 'VENUE' || apiUser.isVenue || false,
    isAdmin: apiUser.role === 'ADMIN' || apiUser.isAdmin || false,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshUser = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/me');

      if (res.ok) {
        const data = await res.json();
        if (data.user) {
          setUser(normalizeUser(data.user));
        } else {
          setUser(null);
        }
      } else {
        setUser(null);
      }
    } catch (err) {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Check authentication on mount
  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  const login = async (
    email: string,
    password: string,
    rememberMe = false
  ): Promise<{ success: boolean; error?: string }> => {
    setError(null);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, rememberMe }),
      });

      const data = await res.json();

      if (!res.ok) {
        const errorMessage = data.error || 'Login failed';
        setError(errorMessage);
        return { success: false, error: errorMessage };
      }

      setUser(normalizeUser(data.user));
      return { success: true };

    } catch (err) {
      const errorMessage = 'An unexpected error occurred';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    }
  };

  const register = async (data: RegisterData): Promise<{ success: boolean; error?: string }> => {
    setError(null);

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          confirmPassword: data.password, // API expects this
        }),
      });

      const result = await res.json();

      if (!res.ok) {
        const errorMessage = result.error || 'Registration failed';
        setError(errorMessage);
        return { success: false, error: errorMessage };
      }

      setUser(normalizeUser(result.user));
      return { success: true };

    } catch (err) {
      const errorMessage = 'An unexpected error occurred';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    }
  };

  const logout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch (err) {
      // Ignore errors
    } finally {
      setUser(null);
      router.push('/');
      router.refresh();
    }
  };

  const logoutAll = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'DELETE' });
    } catch (err) {
      // Ignore errors
    } finally {
      setUser(null);
      router.push('/');
      router.refresh();
    }
  };

  const clearError = () => setError(null);

  // Computed display values
  const displayName = user?.displayName || 'Guest';
  const initials = user?.displayName ? getInitials(user.displayName) : '?';

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        error,
        login,
        register,
        logout,
        logoutAll,
        refreshUser,
        clearError,
        displayName,
        initials,
        avatarUrl: user?.avatarUrl,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// Main auth hook - use this throughout the app
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// Helper hook to require authentication
export function useRequireAuth(redirectTo = '/login') {
  const { user, isLoading, isAuthenticated } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !user) {
      const returnTo = typeof window !== 'undefined'
        ? encodeURIComponent(window.location.pathname)
        : '';
      router.push(`${redirectTo}?returnTo=${returnTo}`);
    }
  }, [user, isLoading, redirectTo, router]);

  return { user, isLoading, isAuthenticated };
}

// Helper hook to require specific roles
export function useRequireRole(allowedRoles: UserRole[], redirectTo = '/') {
  const { user, isLoading, isAuthenticated } = useAuth();
  const router = useRouter();

  const hasAccess = user && allowedRoles.includes(user.role);

  useEffect(() => {
    if (!isLoading) {
      if (!user) {
        const returnTo = typeof window !== 'undefined'
          ? encodeURIComponent(window.location.pathname)
          : '';
        router.push(`/login?returnTo=${returnTo}`);
      } else if (!hasAccess) {
        router.push(redirectTo);
      }
    }
  }, [user, isLoading, hasAccess, redirectTo, router]);

  return { user, isLoading, isAuthenticated, hasAccess };
}

// Helper hook for creator pages (artists, venues, organizers)
export function useRequireCreator(redirectTo = '/') {
  return useRequireRole(['ARTIST', 'VENUE', 'ORGANIZER', 'ADMIN'], redirectTo);
}
