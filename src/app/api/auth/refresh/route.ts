import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  verifyToken,
  generateAccessToken,
  generateRefreshToken,
  setAuthCookies,
  getTokensFromCookies,
} from '@/lib/auth/jwt';

// POST /api/auth/refresh - Refresh access token
export async function POST(request: NextRequest) {
  try {
    const { refreshToken } = await getTokensFromCookies();

    if (!refreshToken) {
      return NextResponse.json(
        { error: 'No refresh token provided' },
        { status: 401 }
      );
    }

    // Verify refresh token
    const payload = await verifyToken(refreshToken);

    if (!payload || payload.type !== 'refresh') {
      return NextResponse.json(
        { error: 'Invalid refresh token' },
        { status: 401 }
      );
    }

    // Check if session is valid in database
    const session = await prisma.session.findUnique({
      where: { refreshToken },
      include: { user: true },
    });

    if (!session || !session.isValid || session.expiresAt < new Date()) {
      return NextResponse.json(
        { error: 'Session expired or invalidated' },
        { status: 401 }
      );
    }

    // Generate new access token
    const newAccessToken = await generateAccessToken({
      userId: session.user.id,
      email: session.user.email!,
      role: session.user.role,
      walletAddress: session.user.walletAddress || undefined,
    });

    // Optionally rotate refresh token (for enhanced security)
    const rotateRefreshToken = request.headers.get('x-rotate-refresh') === 'true';
    let newRefreshToken = refreshToken;

    if (rotateRefreshToken) {
      newRefreshToken = await generateRefreshToken({
        userId: session.user.id,
        email: session.user.email!,
        role: session.user.role,
        walletAddress: session.user.walletAddress || undefined,
      });

      // Update session with new refresh token
      await prisma.session.update({
        where: { id: session.id },
        data: {
          refreshToken: newRefreshToken,
          lastUsedAt: new Date(),
        },
      });
    } else {
      // Update last used time
      await prisma.session.update({
        where: { id: session.id },
        data: { lastUsedAt: new Date() },
      });
    }

    // Set cookies
    await setAuthCookies(newAccessToken, newRefreshToken);

    return NextResponse.json({
      success: true,
      accessToken: newAccessToken,
    });

  } catch (error) {
    console.error('Refresh token error:', error);
    return NextResponse.json(
      { error: 'Failed to refresh token' },
      { status: 500 }
    );
  }
}
