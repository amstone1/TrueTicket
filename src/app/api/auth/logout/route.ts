import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { clearAuthCookies, getTokensFromCookies, verifyToken } from '@/lib/auth/jwt';

// POST /api/auth/logout - Logout current session
export async function POST(request: NextRequest) {
  try {
    const { refreshToken } = await getTokensFromCookies();

    if (refreshToken) {
      // Invalidate the session in database
      await prisma.session.updateMany({
        where: { refreshToken },
        data: { isValid: false },
      });
    }

    // Clear cookies
    await clearAuthCookies();

    return NextResponse.json({
      success: true,
      message: 'Logged out successfully',
    });

  } catch (error) {
    console.error('Logout error:', error);
    // Still clear cookies even if there's an error
    await clearAuthCookies();

    return NextResponse.json({
      success: true,
      message: 'Logged out successfully',
    });
  }
}

// DELETE /api/auth/logout - Logout all sessions
export async function DELETE(request: NextRequest) {
  try {
    const { refreshToken } = await getTokensFromCookies();

    if (refreshToken) {
      const payload = await verifyToken(refreshToken);

      if (payload) {
        // Invalidate all sessions for this user
        await prisma.session.updateMany({
          where: { userId: payload.userId },
          data: { isValid: false },
        });
      }
    }

    // Clear cookies
    await clearAuthCookies();

    return NextResponse.json({
      success: true,
      message: 'Logged out from all devices',
    });

  } catch (error) {
    console.error('Logout all error:', error);
    await clearAuthCookies();

    return NextResponse.json({
      success: true,
      message: 'Logged out successfully',
    });
  }
}
