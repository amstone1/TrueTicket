import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth/middleware';
import { Prisma } from '@prisma/client';

export async function GET(request: NextRequest) {
  const authResult = await requireAuth(request);
  if (authResult instanceof NextResponse) return authResult;

  const { searchParams } = new URL(request.url);
  const search = searchParams.get('search') || '';
  const status = searchParams.get('status');

  try {
    // Get user's events
    const userEvents = await prisma.event.findMany({
      where: { organizerId: authResult.user.userId },
      select: { id: true },
    });

    const eventIds = userEvents.map((e) => e.id);

    if (eventIds.length === 0) {
      return NextResponse.json({
        tickets: [],
        stats: { total: 0, valid: 0, used: 0, revoked: 0 },
      });
    }

    // Build where clause - query by eventId directly
    const whereClause: Prisma.TicketWhereInput = {
      eventId: { in: eventIds },
    };

    if (status && status !== 'all') {
      whereClause.status = status as Prisma.EnumTicketStatusFilter;
    }

    if (search) {
      const searchLower = search.toLowerCase();
      whereClause.OR = [
        { owner: { email: { contains: searchLower } } },
        { event: { name: { contains: search } } },
      ];
    }

    // Fetch tickets
    const tickets = await prisma.ticket.findMany({
      where: whereClause,
      include: {
        tier: true,
        owner: { select: { email: true } },
        event: { select: { name: true, startDate: true } },
        checkIns: { take: 1, orderBy: { checkedInAt: 'desc' } },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    // Get stats
    const stats = await prisma.ticket.groupBy({
      by: ['status'],
      where: { eventId: { in: eventIds } },
      _count: { status: true },
    });

    const statsMap = {
      total: 0,
      valid: 0,
      used: 0,
      revoked: 0,
    };

    stats.forEach((s) => {
      statsMap.total += s._count.status;
      if (s.status === 'VALID') statsMap.valid = s._count.status;
      if (s.status === 'USED') statsMap.used = s._count.status;
      if (s.status === 'REVOKED') statsMap.revoked = s._count.status;
    });

    const formattedTickets = tickets.map((ticket) => ({
      id: ticket.id,
      ticketNumber: ticket.id.slice(-8).toUpperCase(),
      eventName: ticket.event.name,
      eventDate: ticket.event.startDate.toISOString(),
      tierName: ticket.tier?.name || 'General',
      buyerEmail: ticket.owner?.email || 'Unknown',
      pricePaid: ticket.originalPriceUsd,
      status: ticket.status,
      purchasedAt: ticket.createdAt.toISOString(),
      usedAt: ticket.checkIns?.[0]?.checkedInAt?.toISOString(),
    }));

    return NextResponse.json({
      tickets: formattedTickets,
      stats: statsMap,
    });
  } catch (error) {
    console.error('Failed to fetch tickets:', error);
    return NextResponse.json({ error: 'Failed to fetch tickets' }, { status: 500 });
  }
}
