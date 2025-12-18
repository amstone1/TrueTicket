import { SignJWT, jwtVerify, JWTPayload } from 'jose';
import { cookies } from 'next/headers';

// Use environment variable for JWT secret, with a fallback for development
const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'trueticket-development-secret-key-change-in-production'
);

const ISSUER = 'trueticket';
const AUDIENCE = 'trueticket-users';

// Token expiration times
export const TOKEN_EXPIRY = {
  ACCESS: '15m',      // 15 minutes
  REFRESH: '7d',      // 7 days
  REMEMBER_ME: '30d', // 30 days
};

export interface TokenPayload extends JWTPayload {
  userId: string;
  email: string;
  role: string;
  walletAddress?: string;
  type: 'access' | 'refresh';
}

/**
 * Generate an access token
 */
export async function generateAccessToken(payload: Omit<TokenPayload, 'type' | 'iat' | 'exp'>): Promise<string> {
  return new SignJWT({ ...payload, type: 'access' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setIssuer(ISSUER)
    .setAudience(AUDIENCE)
    .setExpirationTime(TOKEN_EXPIRY.ACCESS)
    .sign(JWT_SECRET);
}

/**
 * Generate a refresh token
 */
export async function generateRefreshToken(
  payload: Omit<TokenPayload, 'type' | 'iat' | 'exp'>,
  rememberMe: boolean = false
): Promise<string> {
  return new SignJWT({ ...payload, type: 'refresh' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setIssuer(ISSUER)
    .setAudience(AUDIENCE)
    .setExpirationTime(rememberMe ? TOKEN_EXPIRY.REMEMBER_ME : TOKEN_EXPIRY.REFRESH)
    .sign(JWT_SECRET);
}

/**
 * Verify and decode a token
 */
export async function verifyToken(token: string): Promise<TokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET, {
      issuer: ISSUER,
      audience: AUDIENCE,
    });
    return payload as TokenPayload;
  } catch (error) {
    return null;
  }
}

/**
 * Generate both access and refresh tokens
 */
export async function generateTokenPair(
  payload: Omit<TokenPayload, 'type' | 'iat' | 'exp'>,
  rememberMe: boolean = false
): Promise<{ accessToken: string; refreshToken: string }> {
  const [accessToken, refreshToken] = await Promise.all([
    generateAccessToken(payload),
    generateRefreshToken(payload, rememberMe),
  ]);

  return { accessToken, refreshToken };
}

/**
 * Set auth cookies
 */
export async function setAuthCookies(
  accessToken: string,
  refreshToken: string,
  rememberMe: boolean = false
): Promise<void> {
  const cookieStore = await cookies();

  // Access token cookie - short lived, httpOnly
  cookieStore.set('access_token', accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 15 * 60, // 15 minutes
  });

  // Refresh token cookie - longer lived, httpOnly
  cookieStore.set('refresh_token', refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: rememberMe ? 30 * 24 * 60 * 60 : 7 * 24 * 60 * 60, // 30 days or 7 days
  });
}

/**
 * Clear auth cookies
 */
export async function clearAuthCookies(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete('access_token');
  cookieStore.delete('refresh_token');
}

/**
 * Get tokens from cookies
 */
export async function getTokensFromCookies(): Promise<{
  accessToken: string | undefined;
  refreshToken: string | undefined;
}> {
  const cookieStore = await cookies();
  return {
    accessToken: cookieStore.get('access_token')?.value,
    refreshToken: cookieStore.get('refresh_token')?.value,
  };
}

/**
 * Get current user from cookies
 */
export async function getCurrentUser(): Promise<TokenPayload | null> {
  const { accessToken, refreshToken } = await getTokensFromCookies();

  // Try access token first
  if (accessToken) {
    const payload = await verifyToken(accessToken);
    if (payload && payload.type === 'access') {
      return payload;
    }
  }

  // If access token is invalid/expired, try refresh token
  if (refreshToken) {
    const payload = await verifyToken(refreshToken);
    if (payload && payload.type === 'refresh') {
      // Generate new access token
      const newAccessToken = await generateAccessToken({
        userId: payload.userId,
        email: payload.email,
        role: payload.role,
        walletAddress: payload.walletAddress,
      });

      // Set new access token cookie
      const cookieStore = await cookies();
      cookieStore.set('access_token', newAccessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 15 * 60,
      });

      return payload;
    }
  }

  return null;
}
