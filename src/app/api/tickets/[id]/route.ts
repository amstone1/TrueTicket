import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

// GET /api/tickets/[id] - Get ticket details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const ticket = await prisma.ticket.findUnique({
      where: { id },
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
            venueAddress: true,
            city: true,
            state: true,
            country: true,
            coverImageUrl: true,
            resaleEnabled: true,
            maxResaleMarkupBps: true,
          },
        },
        tier: {
          select: {
            id: true,
            name: true,
            description: true,
            priceUsd: true,
            perks: true,
          },
        },
        owner: {
          select: {
            id: true,
            walletAddress: true,
            displayName: true,
          },
        },
        transfers: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });

    if (!ticket) {
      return NextResponse.json(
        { error: 'Ticket not found' },
        { status: 404 }
      );
    }

    // Check if listed for resale
    const listing = await prisma.resaleListing.findFirst({
      where: {
        ticketId: id,
        status: 'ACTIVE',
      },
    });

    return NextResponse.json({
      ...ticket,
      isListed: !!listing,
      listing,
    });
  } catch (error) {
    console.error('Error fetching ticket:', error);
    return NextResponse.json(
      { error: 'Failed to fetch ticket' },
      { status: 500 }
    );
  }
}

// POST /api/tickets/[id] - Transfer ticket
const transferSchema = z.object({
  action: z.enum(['transfer', 'list', 'unlist']),
  toAddress: z.string().optional(),
  price: z.number().optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const validated = transferSchema.parse(body);

    const ticket = await prisma.ticket.findUnique({
      where: { id },
      include: {
        event: true,
        tier: true,
      },
    });

    if (!ticket) {
      return NextResponse.json(
        { error: 'Ticket not found' },
        { status: 404 }
      );
    }

    if (ticket.status !== 'VALID') {
      return NextResponse.json(
        { error: 'Ticket is not valid for transfer' },
        { status: 400 }
      );
    }

    if (validated.action === 'transfer') {
      if (!validated.toAddress) {
        return NextResponse.json(
          { error: 'Recipient address required' },
          { status: 400 }
        );
      }

      // Get or create recipient user
      let recipient = await prisma.user.findUnique({
        where: { walletAddress: validated.toAddress },
      });

      if (!recipient) {
        recipient = await prisma.user.create({
          data: { walletAddress: validated.toAddress },
        });
      }

      // Transfer ticket
      const updated = await prisma.$transaction(async (tx) => {
        // Cancel any active listings
        await tx.resaleListing.updateMany({
          where: { ticketId: id, status: 'ACTIVE' },
          data: { status: 'CANCELLED', cancelledAt: new Date() },
        });

        // Update ticket owner
        const updatedTicket = await tx.ticket.update({
          where: { id },
          data: {
            ownerId: recipient!.id,
            isListed: false,
          },
        });

        // Record transfer
        await tx.ticketTransfer.create({
          data: {
            ticketId: id,
            fromAddress: ticket.owner?.walletAddress || '',
            toAddress: validated.toAddress!,
            transferType: 'GIFT',
          },
        });

        return updatedTicket;
      });

      return NextResponse.json({ success: true, ticket: updated });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Error processing ticket action:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 }
    );
  }
}
