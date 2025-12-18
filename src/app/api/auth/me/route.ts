import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth/middleware';

// GET /api/auth/me - Get current user
export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth(request);

    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const { user: tokenUser } = authResult;

    // Get full user data from database
    const user = await prisma.user.findUnique({
      where: { id: tokenUser.userId },
      select: {
        id: true,
        email: true,
        phone: true,
        walletAddress: true,
        displayName: true,
        firstName: true,
        lastName: true,
        avatarUrl: true,
        bio: true,
        role: true,
        emailVerified: true,
        isVerified: true,
        isArtist: true,
        isVenue: true,
        isAdmin: true,
        createdAt: true,
        lastLoginAt: true,
        _count: {
          select: {
            ownedTickets: true,
            createdEvents: true,
            resaleListings: true,
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      user: {
        ...user,
        ticketCount: user._count.ownedTickets,
        eventCount: user._count.createdEvents,
        listingCount: user._count.resaleListings,
      },
    });

  } catch (error) {
    console.error('Get user error:', error);
    return NextResponse.json(
      { error: 'Failed to get user data' },
      { status: 500 }
    );
  }
}

// PATCH /api/auth/me - Update current user profile
export async function PATCH(request: NextRequest) {
  try {
    const authResult = await requireAuth(request);

    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const { user: tokenUser } = authResult;
    const body = await request.json();

    // Only allow updating specific fields
    const allowedFields = ['displayName', 'firstName', 'lastName', 'bio', 'avatarUrl', 'phone'];
    const updateData: Record<string, any> = {};

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updateData[field] = body[field];
      }
    }

    // Update displayName if firstName or lastName changed
    if (body.firstName || body.lastName) {
      const user = await prisma.user.findUnique({
        where: { id: tokenUser.userId },
        select: { firstName: true, lastName: true },
      });

      const firstName = body.firstName || user?.firstName || '';
      const lastName = body.lastName || user?.lastName || '';
      updateData.displayName = `${firstName} ${lastName}`.trim();
    }

    const updatedUser = await prisma.user.update({
      where: { id: tokenUser.userId },
      data: updateData,
      select: {
        id: true,
        email: true,
        displayName: true,
        firstName: true,
        lastName: true,
        avatarUrl: true,
        bio: true,
        role: true,
        walletAddress: true,
      },
    });

    return NextResponse.json({
      success: true,
      user: updatedUser,
    });

  } catch (error) {
    console.error('Update user error:', error);
    return NextResponse.json(
      { error: 'Failed to update profile' },
      { status: 500 }
    );
  }
}
