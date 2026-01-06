import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth/middleware';

export async function GET(request: NextRequest) {
  const authResult = await requireAuth(request);
  if (authResult instanceof NextResponse) return authResult;

  try {
    // Get user's events with tiers and purchases
    const userEvents = await prisma.event.findMany({
      where: { organizerId: authResult.user.userId },
      include: {
        ticketTiers: true,
        purchases: true,
        tickets: true,
      },
    });

    const eventIds = userEvents.map((e) => e.id);

    // Calculate totals
    let totalRevenue = 0;
    let totalTicketsSold = 0;

    userEvents.forEach((event) => {
      event.purchases.forEach((purchase) => {
        if (purchase.status === 'COMPLETED') {
          totalRevenue += purchase.totalUsd;
        }
      });
      totalTicketsSold += event.tickets.length;
    });

    const avgTicketPrice = totalTicketsSold > 0 ? totalRevenue / totalTicketsSold : 0;

    // Top events by revenue
    const topEvents = userEvents
      .map((event) => {
        let eventRevenue = 0;
        event.purchases.forEach((p) => {
          if (p.status === 'COMPLETED') {
            eventRevenue += p.totalUsd;
          }
        });
        const ticketsSold = event.tickets.length;
        const capacity = event.ticketTiers.reduce((sum, t) => sum + t.totalQuantity, 0);
        return {
          id: event.id,
          name: event.name,
          ticketsSold,
          revenue: eventRevenue,
          capacity: capacity || 100,
        };
      })
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    // Tier breakdown
    const tierCounts: Record<string, number> = {};
    userEvents.forEach((event) => {
      event.tickets.forEach((ticket) => {
        const tierName = event.ticketTiers.find((t) => t.id === ticket.tierId)?.name || 'General';
        tierCounts[tierName] = (tierCounts[tierName] || 0) + 1;
      });
    });

    const tierBreakdown = Object.entries(tierCounts).map(([tier, count]) => ({
      tier,
      count,
      percentage: totalTicketsSold > 0 ? Math.round((count / totalTicketsSold) * 100) : 0,
    }));

    return NextResponse.json({
      overview: {
        totalRevenue: Math.round(totalRevenue * 100) / 100,
        revenueChange: 12, // Placeholder - would calculate from historical data
        totalTicketsSold,
        ticketsChange: 8,
        totalEvents: userEvents.length,
        eventsChange: 5,
        avgTicketPrice: Math.round(avgTicketPrice * 100) / 100,
        priceChange: -2,
      },
      topEvents,
      tierBreakdown,
      recentSales: [], // Would need time-series data
    });
  } catch (error) {
    console.error('Failed to fetch analytics:', error);
    return NextResponse.json({ error: 'Failed to fetch analytics' }, { status: 500 });
  }
}
