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

    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '10');
    const page = parseInt(searchParams.get('page') || '1');
    const status = searchParams.get('status');

    const where: any = { organizerId: authResult.userId };
    if (status) {
      where.status = status;
    }

    const [events, total] = await Promise.all([
      prisma.event.findMany({
        where,
        orderBy: { startDate: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          ticketTiers: {
            select: {
              id: true,
              name: true,
              priceUsd: true,
              totalQuantity: true,
              soldQuantity: true,
            },
          },
          _count: {
            select: { tickets: true, resaleListings: true },
          },
        },
      }),
      prisma.event.count({ where }),
    ]);

    // Transform events
    const transformedEvents = events.map((event) => ({
      id: event.id,
      name: event.name,
      slug: event.slug,
      category: event.category,
      startDate: event.startDate.toISOString(),
      endDate: event.endDate?.toISOString(),
      venueName: event.venueName,
      city: event.city,
      coverImageUrl: event.coverImageUrl,
      status: event.status,
      isPublished: event.isPublished,
      isFeatured: event.isFeatured,
      ticketTiers: event.ticketTiers,
      ticketsSold: event._count.tickets,
      totalCapacity: event.totalCapacity,
      activeListings: event._count.resaleListings,
    }));

    return NextResponse.json({
      events: transformedEvents,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching dashboard events:', error);
    return NextResponse.json(
      { error: 'Failed to fetch events' },
      { status: 500 }
    );
  }
}
