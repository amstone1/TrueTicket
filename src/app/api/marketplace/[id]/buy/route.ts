import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAuth } from '@/lib/auth/verify';
import { getStripe, calculateFees, formatAmountForStripe } from '@/lib/stripe';

// POST /api/marketplace/[id]/buy - Buy a resale listing
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Verify authentication
    const authResult = await verifyAuth(request);
    if (!authResult.authenticated || !authResult.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get listing with all needed info
    const listing = await prisma.resaleListing.findUnique({
      where: { id },
      include: {
        ticket: {
          include: {
            tier: true,
            event: true,
          },
        },
        seller: true,
        event: true,
      },
    });

    if (!listing) {
      return NextResponse.json({ error: 'Listing not found' }, { status: 404 });
    }

    if (listing.status !== 'ACTIVE') {
      return NextResponse.json(
        { error: 'Listing is no longer available' },
        { status: 400 }
      );
    }

    // Check expiry
    if (listing.expiresAt && new Date() > listing.expiresAt) {
      // Mark as expired
      await prisma.resaleListing.update({
        where: { id },
        data: { status: 'EXPIRED' },
      });
      return NextResponse.json({ error: 'Listing has expired' }, { status: 400 });
    }

    // Can't buy your own listing
    if (listing.sellerId === authResult.userId) {
      return NextResponse.json(
        { error: 'Cannot purchase your own listing' },
        { status: 400 }
      );
    }

    // Calculate fees (10% service fee)
    const { fees, total } = calculateFees(listing.priceUsd);

    // Create purchase record
    const purchase = await prisma.purchase.create({
      data: {
        userId: authResult.userId,
        eventId: listing.eventId,
        paymentMethod: 'CREDIT_CARD',
        paymentProvider: 'stripe',
        subtotalUsd: listing.priceUsd,
        feesUsd: fees,
        totalUsd: total,
        status: 'PENDING',
        ticketQuantity: 1,
        ticketIds: JSON.stringify([listing.ticketId]),
      },
    });

    // Get base URL for redirects
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ||
      `${request.headers.get('x-forwarded-proto') || 'http'}://${request.headers.get('host')}`;

    // Create Stripe checkout session
    const session = await getStripe().checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: `${listing.event.name} - ${listing.ticket.tier.name}`,
              description: 'Resale Ticket',
            },
            unit_amount: formatAmountForStripe(listing.priceUsd),
          },
          quantity: 1,
        },
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: 'Service Fee',
              description: 'Platform service and processing fee',
            },
            unit_amount: formatAmountForStripe(fees),
          },
          quantity: 1,
        },
      ],
      success_url: `${baseUrl}/orders/${purchase.id}?success=true`,
      cancel_url: `${baseUrl}/marketplace?cancelled=true`,
      metadata: {
        purchaseId: purchase.id,
        userId: authResult.userId,
        listingId: listing.id,
        ticketId: listing.ticketId,
        sellerId: listing.sellerId,
        isResale: 'true',
      },
      expires_at: Math.floor(Date.now() / 1000) + 30 * 60, // 30 minutes
    });

    // Update purchase with session ID
    await prisma.purchase.update({
      where: { id: purchase.id },
      data: { stripeSessionId: session.id },
    });

    return NextResponse.json({
      sessionId: session.id,
      sessionUrl: session.url,
      purchaseId: purchase.id,
    });
  } catch (error) {
    console.error('Error purchasing resale listing:', error);
    return NextResponse.json(
      { error: 'Failed to process purchase' },
      { status: 500 }
    );
  }
}
