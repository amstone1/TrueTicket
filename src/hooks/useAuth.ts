'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuthStore } from '@/stores/authStore';
import type { User } from '@/types';
import { getInitials } from '@/lib/utils';

// Check if Privy is configured
const privyAppId = process.env.NEXT_PUBLIC_PRIVY_APP_ID;
const isPrivyConfigured = privyAppId && privyAppId !== 'your_privy_app_id' && privyAppId.startsWith('cl');

export function useAuth() {
  const { setUser, setLoading, logout: clearStore, user, isAuthenticated, isLoading } = useAuthStore();
  const [privyReady, setPrivyReady] = useState(!isPrivyConfigured);
  const [sessionChecked, setSessionChecked] = useState(false);

  // Dynamic import of Privy hooks only when configured
  const [privyHooks, setPrivyHooks] = useState<{
    usePrivy: () => any;
    useWallets: () => any;
  } | null>(null);

  // Check session-based authentication
  const checkSession = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/me');
      if (res.ok) {
        const data = await res.json();
        if (data.user) {
          // Map session user to our User type
          const sessionUser: User = {
            id: data.user.id,
            email: data.user.email,
            displayName: data.user.displayName || `${data.user.firstName} ${data.user.lastName}`,
            avatarUrl: data.user.avatarUrl,
            walletAddress: data.user.walletAddress,
            isVerified: data.user.emailVerified,
            isArtist: data.user.role === 'ARTIST',
            isVenue: data.user.role === 'VENUE',
            isAdmin: data.user.role === 'ADMIN',
            role: data.user.role,
          };
          setUser(sessionUser);
        }
      }
    } catch (error) {
      // Session check failed, user is not authenticated via session
    } finally {
      setSessionChecked(true);
      if (!isPrivyConfigured) {
        setLoading(false);
      }
    }
  }, [setUser, setLoading]);

  useEffect(() => {
    // Check session-based auth first
    checkSession();

    if (isPrivyConfigured) {
      import('@privy-io/react-auth').then((module) => {
        setPrivyHooks({
          usePrivy: module.usePrivy,
          useWallets: module.useWallets,
        });
      });
    }
  }, [checkSession]);

  // This effect handles syncing Privy state when configured
  useEffect(() => {
    if (!isPrivyConfigured) {
      setPrivyReady(true);
      return;
    }
  }, []);

  const handleLogin = async () => {
    // Redirect to login page for session-based auth
    window.location.href = '/login';
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch (error) {
      // Ignore errors
    }
    clearStore();
    window.location.href = '/';
  };

  return {
    user,
    isAuthenticated,
    isLoading: isLoading || !privyReady || !sessionChecked,
    login: handleLogin,
    logout: handleLogout,
    isPrivyConfigured,
    refreshSession: checkSession,

    // User display helpers
    displayName: user?.displayName || 'Guest',
    initials: user?.displayName ? getInitials(user.displayName) : '?',
    avatarUrl: user?.avatarUrl,
  };
}

// Hook to use when Privy is confirmed to be available
export function usePrivyAuth() {
  // This hook can be used in components that are wrapped by PrivyProvider
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { usePrivy, useWallets } = require('@privy-io/react-auth');
  const { user: privyUser, login, logout: privyLogout, authenticated, ready } = usePrivy();
  const { wallets } = useWallets();
  const { setUser, setLoading, logout: clearStore, user, isAuthenticated } = useAuthStore();

  // Sync Privy user to our store
  useEffect(() => {
    if (!ready) {
      setLoading(true);
      return;
    }

    setLoading(false);

    if (authenticated && privyUser) {
      // Get the embedded or connected wallet
      const wallet = wallets[0];
      const walletAddress = wallet?.address || privyUser.wallet?.address || '';

      // Normalize user data - NEVER expose wallet addresses to UI
      const normalizedUser: User = {
        id: privyUser.id,
        email: privyUser.email?.address,
        displayName:
          privyUser.email?.address?.split('@')[0] ||
          privyUser.google?.name ||
          'Ticket Holder',
        avatarUrl: privyUser.google?.picture,
        walletAddress,
        isVerified: !!privyUser.email?.address,
        isArtist: false,
        isVenue: false,
        isAdmin: false,
      };

      setUser(normalizedUser);
    } else {
      setUser(null);
    }
  }, [authenticated, privyUser, ready, wallets, setUser, setLoading]);

  const handleLogin = async () => {
    try {
      login();
    } catch (error) {
      console.error('Login error:', error);
    }
  };

  const handleLogout = async () => {
    await privyLogout();
    clearStore();
  };

  return {
    user,
    isAuthenticated,
    isLoading: !ready,
    login: handleLogin,
    logout: handleLogout,

    // User display helpers
    displayName: user?.displayName || 'Guest',
    initials: user?.displayName ? getInitials(user.displayName) : '?',
    avatarUrl: user?.avatarUrl,
  };
}
