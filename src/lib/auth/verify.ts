import { NextRequest } from 'next/server';
import { getAuthFromRequest } from './middleware';

export interface AuthResult {
  authenticated: boolean;
  userId?: string;
  email?: string;
  role?: string;
  walletAddress?: string;
}

/**
 * Verify authentication from request and return structured result
 * Useful for API routes that need to check auth without returning a response
 */
export async function verifyAuth(request: NextRequest): Promise<AuthResult> {
  const payload = await getAuthFromRequest(request);

  if (!payload) {
    return { authenticated: false };
  }

  return {
    authenticated: true,
    userId: payload.userId,
    email: payload.email,
    role: payload.role,
    walletAddress: payload.walletAddress,
  };
}

/**
 * Verify authentication and require specific roles
 */
export async function verifyAuthWithRole(
  request: NextRequest,
  allowedRoles: string[]
): Promise<AuthResult & { hasPermission: boolean }> {
  const result = await verifyAuth(request);

  if (!result.authenticated) {
    return { ...result, hasPermission: false };
  }

  const hasPermission = result.role ? allowedRoles.includes(result.role) : false;

  return { ...result, hasPermission };
}
