import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/events/[slug] - Get event details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;

    const event = await prisma.event.findUnique({
      where: { slug },
      include: {
        ticketTiers: {
          orderBy: { priceUsd: 'asc' },
        },
        organizer: {
          select: {
            id: true,
            displayName: true,
            avatarUrl: true,
            isVerified: true,
          },
        },
        _count: {
          select: {
            tickets: true,
            favorites: true,
          },
        },
      },
    });

    if (!event) {
      return NextResponse.json(
        { error: 'Event not found' },
        { status: 404 }
      );
    }

    // Calculate availability for each tier
    const tiersWithAvailability = event.ticketTiers.map((tier) => ({
      ...tier,
      available: tier.totalQuantity - tier.soldQuantity - tier.reservedQuantity,
      soldOut: tier.soldQuantity >= tier.totalQuantity,
    }));

    // Get active resale listings count
    const resaleCount = await prisma.resaleListing.count({
      where: {
        eventId: event.id,
        status: 'ACTIVE',
      },
    });

    return NextResponse.json({
      ...event,
      ticketTiers: tiersWithAvailability,
      resaleListingsCount: resaleCount,
    });
  } catch (error) {
    console.error('Error fetching event:', error);
    return NextResponse.json(
      { error: 'Failed to fetch event' },
      { status: 500 }
    );
  }
}
