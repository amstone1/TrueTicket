'use client';

/**
 * WebAuthn Hook for Biometric Authentication
 *
 * Provides device biometric authentication (Touch ID, Face ID, Windows Hello)
 * for TrueTicket login. This is a patent-strengthening feature that enables
 * passwordless authentication while maintaining security.
 */

import { useState, useCallback, useEffect } from 'react';
import {
  startRegistration,
  startAuthentication,
  browserSupportsWebAuthn,
  platformAuthenticatorIsAvailable,
} from '@simplewebauthn/browser';
import type {
  PublicKeyCredentialCreationOptionsJSON,
  PublicKeyCredentialRequestOptionsJSON,
} from '@simplewebauthn/browser';

interface WebAuthnState {
  isSupported: boolean;
  isPlatformAvailable: boolean;
  isLoading: boolean;
  error: string | null;
}

interface WebAuthnCredential {
  id: string;
  deviceName: string;
  createdAt: string;
}

interface AuthResult {
  success: boolean;
  user?: {
    id: string;
    email?: string;
    displayName?: string;
  };
  error?: string;
}

export function useWebAuthn() {
  const [state, setState] = useState<WebAuthnState>({
    isSupported: false,
    isPlatformAvailable: false,
    isLoading: false,
    error: null,
  });

  // Check WebAuthn support on mount
  useEffect(() => {
    const checkSupport = async () => {
      const supported = browserSupportsWebAuthn();
      let platformAvailable = false;

      if (supported) {
        try {
          platformAvailable = await platformAuthenticatorIsAvailable();
        } catch {
          // Silently fail - platform authenticator not available
        }
      }

      setState((prev) => ({
        ...prev,
        isSupported: supported,
        isPlatformAvailable: platformAvailable,
      }));
    };

    checkSupport();
  }, []);

  /**
   * Register a new biometric credential for the current user
   * Must be called when user is already authenticated
   */
  const registerBiometric = useCallback(
    async (deviceName?: string): Promise<{ success: boolean; error?: string; credential?: WebAuthnCredential }> => {
      setState((prev) => ({ ...prev, isLoading: true, error: null }));

      try {
        // Step 1: Get registration options from server
        const optionsRes = await fetch('/api/auth/webauthn/register/options', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        });

        if (!optionsRes.ok) {
          const data = await optionsRes.json();
          throw new Error(data.error || 'Failed to get registration options');
        }

        const { options } = (await optionsRes.json()) as {
          options: PublicKeyCredentialCreationOptionsJSON;
        };

        // Step 2: Start WebAuthn registration ceremony
        const registrationResponse = await startRegistration({ optionsJSON: options });

        // Step 3: Verify registration with server
        const verifyRes = await fetch('/api/auth/webauthn/register/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            response: registrationResponse,
            deviceName,
          }),
        });

        if (!verifyRes.ok) {
          const data = await verifyRes.json();
          throw new Error(data.error || 'Registration verification failed');
        }

        const { credential } = (await verifyRes.json()) as { credential: WebAuthnCredential };

        setState((prev) => ({ ...prev, isLoading: false }));

        return { success: true, credential };
      } catch (err) {
        const error = err instanceof Error ? err.message : 'Registration failed';
        setState((prev) => ({ ...prev, isLoading: false, error }));
        return { success: false, error };
      }
    },
    []
  );

  /**
   * Authenticate with biometric (login flow)
   * Call this with user's email to initiate biometric login
   */
  const authenticateWithBiometric = useCallback(
    async (email: string): Promise<AuthResult> => {
      setState((prev) => ({ ...prev, isLoading: true, error: null }));

      try {
        // Step 1: Get authentication options from server
        const optionsRes = await fetch('/api/auth/webauthn/authenticate/options', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email }),
        });

        if (!optionsRes.ok) {
          const data = await optionsRes.json();
          throw new Error(data.error || 'Failed to get authentication options');
        }

        const { options } = (await optionsRes.json()) as {
          options: PublicKeyCredentialRequestOptionsJSON;
        };

        // Step 2: Start WebAuthn authentication ceremony
        const authenticationResponse = await startAuthentication({ optionsJSON: options });

        // Step 3: Verify authentication with server
        const verifyRes = await fetch('/api/auth/webauthn/authenticate/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            response: authenticationResponse,
          }),
        });

        if (!verifyRes.ok) {
          const data = await verifyRes.json();
          throw new Error(data.error || 'Authentication verification failed');
        }

        const { user } = (await verifyRes.json()) as {
          user: { id: string; email?: string; displayName?: string };
        };

        setState((prev) => ({ ...prev, isLoading: false }));

        return { success: true, user };
      } catch (err) {
        const error = err instanceof Error ? err.message : 'Authentication failed';
        setState((prev) => ({ ...prev, isLoading: false, error }));
        return { success: false, error };
      }
    },
    []
  );

  /**
   * Clear any error state
   */
  const clearError = useCallback(() => {
    setState((prev) => ({ ...prev, error: null }));
  }, []);

  return {
    // State
    isSupported: state.isSupported,
    isPlatformAvailable: state.isPlatformAvailable,
    isLoading: state.isLoading,
    error: state.error,

    // Actions
    registerBiometric,
    authenticateWithBiometric,
    clearError,
  };
}

export default useWebAuthn;
