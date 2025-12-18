import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAuth } from '@/lib/auth/verify';

export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const authResult = await verifyAuth(request);
    if (!authResult.authenticated || !authResult.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const now = new Date();

    // Get stats for organizer's events
    const [totalEvents, upcomingEvents, ticketsSold, revenue, royalties] = await Promise.all([
      // Total events count
      prisma.event.count({
        where: { organizerId: authResult.userId },
      }),

      // Upcoming events count
      prisma.event.count({
        where: {
          organizerId: authResult.userId,
          startDate: { gte: now },
          status: 'PUBLISHED',
        },
      }),

      // Total tickets sold across all events
      prisma.ticket.count({
        where: {
          event: { organizerId: authResult.userId },
        },
      }),

      // Total revenue from purchases
      prisma.purchase.aggregate({
        where: {
          event: { organizerId: authResult.userId },
          status: 'COMPLETED',
        },
        _sum: { subtotalUsd: true },
      }),

      // Royalties from resales (simplified - just count resale transactions)
      prisma.resaleListing.aggregate({
        where: {
          event: { organizerId: authResult.userId },
          status: 'SOLD',
        },
        _sum: { priceUsd: true },
      }),
    ]);

    // Calculate royalties (10% of resale value by default)
    const totalRoyalties = (royalties._sum.priceUsd || 0) * 0.1;

    return NextResponse.json({
      totalEvents,
      upcomingEvents,
      totalTicketsSold: ticketsSold,
      totalRevenue: revenue._sum.subtotalUsd || 0,
      totalRoyalties,
    });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dashboard stats' },
      { status: 500 }
    );
  }
}
