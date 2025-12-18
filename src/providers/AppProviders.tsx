'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PrivyProvider } from '@privy-io/react-auth';
import { useState, Suspense, type ReactNode } from 'react';
import { AuthProvider } from '@/contexts/AuthContext';
import { LoadingBar } from '@/components/ui/LoadingBar';

const privyAppId = process.env.NEXT_PUBLIC_PRIVY_APP_ID;
const isPrivyConfigured = privyAppId && privyAppId !== 'your_privy_app_id' && privyAppId.startsWith('cl');

interface AppProvidersProps {
  children: ReactNode;
}

export function AppProviders({ children }: AppProvidersProps) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 1000 * 60 * 5, // 5 minutes
            refetchOnWindowFocus: false,
          },
        },
      })
  );

  // If Privy is not configured, render without it (development mode)
  if (!isPrivyConfigured) {
    return (
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <Suspense fallback={null}>
            <LoadingBar />
          </Suspense>
          {children}
        </AuthProvider>
      </QueryClientProvider>
    );
  }

  return (
    <PrivyProvider
      appId={privyAppId}
      config={{
        loginMethods: ['email', 'wallet', 'google'],
        appearance: {
          theme: 'light',
          showWalletLoginFirst: false,
          logo: '/logo.png',
        },
        embeddedWallets: {
          createOnLogin: 'users-without-wallets',
        },
        defaultChain: {
          id: 137,
          name: 'Polygon',
          network: 'matic',
          nativeCurrency: {
            name: 'MATIC',
            symbol: 'MATIC',
            decimals: 18,
          },
          rpcUrls: {
            default: { http: ['https://polygon-rpc.com'] },
            public: { http: ['https://polygon-rpc.com'] },
          },
          blockExplorers: {
            default: { name: 'PolygonScan', url: 'https://polygonscan.com' },
          },
        },
      }}
    >
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <Suspense fallback={null}>
            <LoadingBar />
          </Suspense>
          {children}
        </AuthProvider>
      </QueryClientProvider>
    </PrivyProvider>
  );
}
