import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, TokenPayload } from './jwt';

export type UserRole = 'USER' | 'ORGANIZER' | 'VENUE' | 'ARTIST' | 'ADMIN';

/**
 * Extract and verify token from request
 */
export async function getAuthFromRequest(request: NextRequest): Promise<TokenPayload | null> {
  // Try to get token from Authorization header first
  const authHeader = request.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    const payload = await verifyToken(token);
    if (payload && payload.type === 'access') {
      return payload;
    }
  }

  // Fall back to cookies
  const accessToken = request.cookies.get('access_token')?.value;
  if (accessToken) {
    const payload = await verifyToken(accessToken);
    if (payload && payload.type === 'access') {
      return payload;
    }
  }

  // Try refresh token and refresh session
  const refreshToken = request.cookies.get('refresh_token')?.value;
  if (refreshToken) {
    const payload = await verifyToken(refreshToken);
    if (payload && payload.type === 'refresh') {
      return payload;
    }
  }

  return null;
}

/**
 * Require authentication middleware
 */
export async function requireAuth(
  request: NextRequest
): Promise<{ user: TokenPayload } | NextResponse> {
  const user = await getAuthFromRequest(request);

  if (!user) {
    return NextResponse.json(
      { error: 'Authentication required' },
      { status: 401 }
    );
  }

  return { user };
}

/**
 * Require specific role(s) middleware
 */
export async function requireRole(
  request: NextRequest,
  allowedRoles: UserRole[]
): Promise<{ user: TokenPayload } | NextResponse> {
  const authResult = await requireAuth(request);

  if (authResult instanceof NextResponse) {
    return authResult;
  }

  const { user } = authResult;

  if (!allowedRoles.includes(user.role as UserRole)) {
    return NextResponse.json(
      { error: 'Insufficient permissions' },
      { status: 403 }
    );
  }

  return { user };
}

/**
 * Optional authentication - returns user if authenticated, null otherwise
 */
export async function optionalAuth(
  request: NextRequest
): Promise<TokenPayload | null> {
  return getAuthFromRequest(request);
}

/**
 * Check if user is admin
 */
export function isAdmin(user: TokenPayload): boolean {
  return user.role === 'ADMIN';
}

/**
 * Check if user is organizer or admin
 */
export function isOrganizerOrAdmin(user: TokenPayload): boolean {
  return user.role === 'ORGANIZER' || user.role === 'ADMIN';
}

/**
 * Check if user can manage events
 */
export function canManageEvents(user: TokenPayload): boolean {
  return ['ORGANIZER', 'VENUE', 'ARTIST', 'ADMIN'].includes(user.role);
}

/**
 * Check if user can scan tickets
 */
export function canScanTickets(user: TokenPayload): boolean {
  return ['VENUE', 'ORGANIZER', 'ADMIN'].includes(user.role);
}

/**
 * Get server session from cookies (for use in API routes)
 * Returns a session-like object compatible with common auth patterns
 */
export async function getServerSession(): Promise<{
  user: { id: string; email?: string; role: string };
} | null> {
  // In Next.js App Router, we need to use the cookies() function
  // But for API routes, we get cookies from the request
  // This helper is meant to be called with the request context

  // For now, return null - caller should use requireAuth or getAuthFromRequest
  // This is a placeholder for a more sophisticated session management
  return null;
}

/**
 * Get server session from a request object
 * Use this in API routes where you have access to the request
 */
export async function getServerSessionFromRequest(request: NextRequest): Promise<{
  user: { id: string; email?: string; role: string };
} | null> {
  const tokenPayload = await getAuthFromRequest(request);

  if (!tokenPayload) {
    return null;
  }

  return {
    user: {
      id: tokenPayload.userId,
      email: tokenPayload.email,
      role: tokenPayload.role,
    },
  };
}
