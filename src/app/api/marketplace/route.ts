import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { serializeForJson } from '@/lib/utils';

// GET /api/marketplace - Get resale listings
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const eventId = searchParams.get('eventId');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');

    const where: any = {
      status: 'ACTIVE',
      expiresAt: { gt: new Date() },
    };

    if (eventId) {
      where.eventId = eventId;
    }

    const [listings, total] = await Promise.all([
      prisma.resaleListing.findMany({
        where,
        orderBy: { priceUsd: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          ticket: {
            include: {
              tier: {
                select: { name: true, priceUsd: true },
              },
            },
          },
          event: {
            select: {
              id: true,
              name: true,
              slug: true,
              startDate: true,
              venueName: true,
              city: true,
              state: true,
              thumbnailUrl: true,
              maxResaleMarkupBps: true,
            },
          },
          seller: {
            select: {
              displayName: true,
              walletAddress: true,
            },
          },
        },
      }),
      prisma.resaleListing.count({ where }),
    ]);

    // Calculate savings/markup for each listing
    const listingsWithStats = listings.map((listing) => {
      const originalPrice = listing.ticket.tier.priceUsd;
      const markup = ((listing.priceUsd - originalPrice) / originalPrice) * 100;
      return {
        ...listing,
        originalPrice,
        markupPercent: Math.round(markup * 10) / 10,
      };
    });

    return NextResponse.json(serializeForJson({
      listings: listingsWithStats,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    }));
  } catch (error) {
    console.error('Error fetching marketplace:', error);
    return NextResponse.json(
      { error: 'Failed to fetch marketplace listings' },
      { status: 500 }
    );
  }
}

// POST /api/marketplace - Create listing
const createListingSchema = z.object({
  ticketId: z.string(),
  priceUsd: z.number().positive(),
  walletAddress: z.string(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = createListingSchema.parse(body);

    // Get ticket with event info
    const ticket = await prisma.ticket.findUnique({
      where: { id: validated.ticketId },
      include: {
        event: true,
        tier: true,
        owner: true,
      },
    });

    if (!ticket) {
      return NextResponse.json(
        { error: 'Ticket not found' },
        { status: 404 }
      );
    }

    // Verify ownership
    if (!ticket.owner.walletAddress || ticket.owner.walletAddress.toLowerCase() !== validated.walletAddress.toLowerCase()) {
      return NextResponse.json(
        { error: 'You do not own this ticket' },
        { status: 403 }
      );
    }

    // Check if resale is enabled
    if (!ticket.event.resaleEnabled) {
      return NextResponse.json(
        { error: 'Resale is not enabled for this event' },
        { status: 400 }
      );
    }

    // Check if already listed
    const existingListing = await prisma.resaleListing.findFirst({
      where: {
        ticketId: validated.ticketId,
        status: 'ACTIVE',
      },
    });

    if (existingListing) {
      return NextResponse.json(
        { error: 'Ticket is already listed' },
        { status: 400 }
      );
    }

    // Check price cap
    if (ticket.event.maxResaleMarkupBps) {
      const maxPrice = ticket.tier.priceUsd * (1 + ticket.event.maxResaleMarkupBps / 10000);
      if (validated.priceUsd > maxPrice) {
        return NextResponse.json(
          {
            error: `Price exceeds maximum allowed`,
            maxPrice: Math.round(maxPrice * 100) / 100,
            maxMarkup: ticket.event.maxResaleMarkupBps / 100,
          },
          { status: 400 }
        );
      }
    }

    // Create listing
    const listing = await prisma.$transaction(async (tx) => {
      const newListing = await tx.resaleListing.create({
        data: {
          ticketId: validated.ticketId,
          eventId: ticket.eventId,
          sellerId: ticket.ownerId,
          priceUsd: validated.priceUsd,
          status: 'ACTIVE',
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        },
      });

      await tx.ticket.update({
        where: { id: validated.ticketId },
        data: { isListed: true },
      });

      return newListing;
    });

    return NextResponse.json(serializeForJson({ success: true, listing }), { status: 201 });
  } catch (error) {
    console.error('Error creating listing:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to create listing' },
      { status: 500 }
    );
  }
}
