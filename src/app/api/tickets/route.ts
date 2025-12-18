import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { randomBytes, createHash } from 'crypto';
import { verifyAuth } from '@/lib/auth/verify';
import { serializeForJson } from '@/lib/utils';

function generateCheckInCode(): string {
  return randomBytes(16).toString('hex').toUpperCase();
}

function hashCode(code: string): string {
  return createHash('sha256').update(code).digest('hex');
}

// GET /api/tickets - Get user's tickets
export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const authResult = await verifyAuth(request);
    if (!authResult.authenticated || !authResult.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status'); // upcoming, past, all

    const now = new Date();
    let dateFilter = {};

    if (status === 'upcoming') {
      dateFilter = { event: { startDate: { gte: now } } };
    } else if (status === 'past') {
      dateFilter = { event: { startDate: { lt: now } } };
    }

    const tickets = await prisma.ticket.findMany({
      where: {
        ownerId: authResult.userId,
        ...dateFilter,
      },
      include: {
        event: {
          select: {
            id: true,
            name: true,
            slug: true,
            startDate: true,
            endDate: true,
            doorsOpen: true,
            venueName: true,
            city: true,
            state: true,
            coverImageUrl: true,
            thumbnailUrl: true,
            resaleEnabled: true,
            maxResaleMarkupBps: true,
          },
        },
        tier: {
          select: {
            id: true,
            name: true,
            priceUsd: true,
            perks: true,
          },
        },
      },
      orderBy: {
        event: { startDate: 'asc' },
      },
    });

    // Transform tickets for response
    const transformedTickets = tickets.map((ticket) => ({
      ...ticket,
      event: {
        ...ticket.event,
        startDate: ticket.event.startDate.toISOString(),
        endDate: ticket.event.endDate?.toISOString(),
        doorsOpen: ticket.event.doorsOpen?.toISOString(),
      },
      tier: {
        ...ticket.tier,
        perks: typeof ticket.tier.perks === 'string'
          ? JSON.parse(ticket.tier.perks || '[]')
          : ticket.tier.perks,
      },
      mintedAt: ticket.mintedAt?.toISOString(),
      createdAt: ticket.createdAt.toISOString(),
      updatedAt: ticket.updatedAt.toISOString(),
    }));

    return NextResponse.json(serializeForJson({ tickets: transformedTickets }));
  } catch (error) {
    console.error('Error fetching tickets:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tickets' },
      { status: 500 }
    );
  }
}

// POST /api/tickets - Purchase tickets
const purchaseSchema = z.object({
  eventId: z.string(),
  tierId: z.string(),
  quantity: z.number().int().min(1).max(10),
  walletAddress: z.string(),
  paymentMethod: z.enum(['CREDIT_CARD', 'CRYPTO_MATIC', 'CRYPTO_USDC', 'FREE']),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = purchaseSchema.parse(body);

    // Get or create user
    let user = await prisma.user.findUnique({
      where: { walletAddress: validated.walletAddress },
    });

    if (!user) {
      user = await prisma.user.create({
        data: { walletAddress: validated.walletAddress },
      });
    }

    // Get tier and validate availability
    const tier = await prisma.ticketTier.findUnique({
      where: { id: validated.tierId },
      include: { event: true },
    });

    if (!tier) {
      return NextResponse.json(
        { error: 'Ticket tier not found' },
        { status: 404 }
      );
    }

    const available = tier.totalQuantity - tier.soldQuantity - tier.reservedQuantity;
    if (available < validated.quantity) {
      return NextResponse.json(
        { error: 'Not enough tickets available' },
        { status: 400 }
      );
    }

    // Check max per wallet
    const existingTickets = await prisma.ticket.count({
      where: {
        ownerId: user.id,
        tierId: validated.tierId,
      },
    });

    if (existingTickets + validated.quantity > tier.maxPerWallet) {
      return NextResponse.json(
        { error: `Maximum ${tier.maxPerWallet} tickets per wallet for this tier` },
        { status: 400 }
      );
    }

    // Calculate totals
    const subtotal = tier.priceUsd * validated.quantity;
    const fees = subtotal * 0.05; // 5% platform fee
    const total = subtotal + fees;

    // Create purchase and tickets in transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create tickets
      const ticketIds: string[] = [];
      for (let i = 0; i < validated.quantity; i++) {
        const checkInCode = generateCheckInCode();
        const ticket = await tx.ticket.create({
          data: {
            eventId: validated.eventId,
            tierId: validated.tierId,
            ownerId: user!.id,
            status: 'VALID',
            checkInCode,
            checkInCodeHash: hashCode(checkInCode),
            originalPriceUsd: tier.priceUsd,
            mintedAt: new Date(),
          },
        });
        ticketIds.push(ticket.id);
      }

      // Update tier sold count
      await tx.ticketTier.update({
        where: { id: validated.tierId },
        data: { soldQuantity: { increment: validated.quantity } },
      });

      // Create purchase record
      const purchase = await tx.purchase.create({
        data: {
          userId: user!.id,
          eventId: validated.eventId,
          paymentMethod: validated.paymentMethod,
          subtotalUsd: subtotal,
          feesUsd: fees,
          totalUsd: total,
          status: 'COMPLETED',
          ticketQuantity: validated.quantity,
          ticketIds: JSON.stringify(ticketIds),
          completedAt: new Date(),
        },
      });

      return { purchase, ticketIds };
    });

    // Fetch created tickets with details
    const tickets = await prisma.ticket.findMany({
      where: { id: { in: result.ticketIds } },
      include: {
        event: { select: { name: true, startDate: true, venueName: true } },
        tier: { select: { name: true } },
      },
    });

    return NextResponse.json({
      success: true,
      purchase: result.purchase,
      tickets,
    }, { status: 201 });
  } catch (error) {
    console.error('Error purchasing tickets:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to purchase tickets' },
      { status: 500 }
    );
  }
}
