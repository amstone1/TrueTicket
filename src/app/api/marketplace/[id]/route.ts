import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

// GET /api/marketplace/[id] - Get listing details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const listing = await prisma.resaleListing.findUnique({
      where: { id },
      include: {
        ticket: {
          include: {
            tier: true,
            event: true,
          },
        },
        seller: {
          select: {
            displayName: true,
            walletAddress: true,
            isVerified: true,
          },
        },
        event: true,
      },
    });

    if (!listing) {
      return NextResponse.json(
        { error: 'Listing not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(listing);
  } catch (error) {
    console.error('Error fetching listing:', error);
    return NextResponse.json(
      { error: 'Failed to fetch listing' },
      { status: 500 }
    );
  }
}

// POST /api/marketplace/[id] - Buy listing or cancel
const actionSchema = z.object({
  action: z.enum(['buy', 'cancel']),
  buyerWallet: z.string().optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const validated = actionSchema.parse(body);

    const listing = await prisma.resaleListing.findUnique({
      where: { id },
      include: {
        ticket: {
          include: { tier: true },
        },
        seller: true,
        event: true,
      },
    });

    if (!listing) {
      return NextResponse.json(
        { error: 'Listing not found' },
        { status: 404 }
      );
    }

    if (listing.status !== 'ACTIVE') {
      return NextResponse.json(
        { error: 'Listing is no longer active' },
        { status: 400 }
      );
    }

    if (validated.action === 'cancel') {
      // Only seller can cancel
      // TODO: Add proper auth check
      const result = await prisma.$transaction(async (tx) => {
        const updated = await tx.resaleListing.update({
          where: { id },
          data: {
            status: 'CANCELLED',
            cancelledAt: new Date(),
          },
        });

        await tx.ticket.update({
          where: { id: listing.ticketId },
          data: { isListed: false },
        });

        return updated;
      });

      return NextResponse.json({ success: true, listing: result });
    }

    if (validated.action === 'buy') {
      if (!validated.buyerWallet) {
        return NextResponse.json(
          { error: 'Buyer wallet required' },
          { status: 400 }
        );
      }

      // Get or create buyer
      let buyer = await prisma.user.findUnique({
        where: { walletAddress: validated.buyerWallet },
      });

      if (!buyer) {
        buyer = await prisma.user.create({
          data: { walletAddress: validated.buyerWallet },
        });
      }

      // Can't buy your own listing
      if (listing.sellerId === buyer.id) {
        return NextResponse.json(
          { error: 'Cannot buy your own listing' },
          { status: 400 }
        );
      }

      // Process purchase
      const result = await prisma.$transaction(async (tx) => {
        // Update listing
        const updatedListing = await tx.resaleListing.update({
          where: { id },
          data: {
            status: 'SOLD',
            soldAt: new Date(),
            buyerId: buyer!.id,
          },
        });

        // Transfer ticket ownership
        const updatedTicket = await tx.ticket.update({
          where: { id: listing.ticketId },
          data: {
            ownerId: buyer!.id,
            isListed: false,
          },
        });

        // Record transfer
        await tx.ticketTransfer.create({
          data: {
            ticketId: listing.ticketId,
            fromAddress: listing.seller.walletAddress || 'platform',
            toAddress: validated.buyerWallet || 'platform',
            transferType: 'RESALE',
            priceUsd: listing.priceUsd,
          },
        });

        // Create purchase record
        const purchase = await tx.purchase.create({
          data: {
            userId: buyer!.id,
            eventId: listing.eventId,
            paymentMethod: 'CRYPTO_MATIC', // Default for resale
            subtotalUsd: listing.priceUsd,
            feesUsd: listing.priceUsd * 0.025, // 2.5% buyer fee
            totalUsd: listing.priceUsd * 1.025,
            status: 'COMPLETED',
            ticketQuantity: 1,
            ticketIds: JSON.stringify([listing.ticketId]),
            completedAt: new Date(),
          },
        });

        return { listing: updatedListing, ticket: updatedTicket, purchase };
      });

      return NextResponse.json({
        success: true,
        message: 'Purchase completed',
        ...result,
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Error processing marketplace action:', error);

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
