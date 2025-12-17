'use client';

import { usePrivy, useWallets } from '@privy-io/react-auth';
import { useEffect } from 'react';
import { useAuthStore } from '@/stores/authStore';
import type { User } from '@/types';
import { getInitials } from '@/lib/utils';

export function useAuth() {
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

  const handleLogin = async (method: 'email' | 'wallet' = 'email') => {
    try {
      if (method === 'email') {
        login();
      } else {
        login();
      }
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
