import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getStripe, calculateFees, createLineItems, createFeeLineItem } from '@/lib/stripe';
import { verifyAuth } from '@/lib/auth/verify';
import { z } from 'zod';

const CheckoutSchema = z.object({
  items: z.array(
    z.object({
      eventId: z.string(),
      tierId: z.string(),
      quantity: z.number().min(1).max(10),
    })
  ).min(1),
});

export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const authResult = await verifyAuth(request);
    if (!authResult.authenticated || !authResult.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validation = CheckoutSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: validation.error.flatten() },
        { status: 400 }
      );
    }

    const { items } = validation.data;

    // Fetch all tiers and events
    const tierIds = items.map((item) => item.tierId);
    const tiers = await prisma.ticketTier.findMany({
      where: { id: { in: tierIds } },
      include: {
        event: {
          select: {
            id: true,
            name: true,
            slug: true,
            startDate: true,
            status: true,
            isPublished: true,
          },
        },
      },
    });

    // Validate tiers exist and are available
    const tierMap = new Map(tiers.map((t) => [t.id, t]));
    const lineItemsData: { eventName: string; tierName: string; priceUsd: number; quantity: number }[] = [];
    let subtotal = 0;
    const purchaseItems: { tierId: string; eventId: string; quantity: number; priceUsd: number }[] = [];

    for (const item of items) {
      const tier = tierMap.get(item.tierId);

      if (!tier) {
        return NextResponse.json(
          { error: `Ticket tier not found: ${item.tierId}` },
          { status: 400 }
        );
      }

      if (!tier.isActive) {
        return NextResponse.json(
          { error: `Ticket tier is no longer available: ${tier.name}` },
          { status: 400 }
        );
      }

      if (!tier.event.isPublished || tier.event.status !== 'PUBLISHED') {
        return NextResponse.json(
          { error: `Event is not currently available for purchase` },
          { status: 400 }
        );
      }

      const available = tier.totalQuantity - tier.soldQuantity - tier.reservedQuantity;
      if (item.quantity > available) {
        return NextResponse.json(
          { error: `Only ${available} tickets available for ${tier.name}` },
          { status: 400 }
        );
      }

      if (item.quantity > tier.maxPerWallet) {
        return NextResponse.json(
          { error: `Maximum ${tier.maxPerWallet} tickets allowed per purchase for ${tier.name}` },
          { status: 400 }
        );
      }

      const itemTotal = tier.priceUsd * item.quantity;
      subtotal += itemTotal;

      lineItemsData.push({
        eventName: tier.event.name,
        tierName: tier.name,
        priceUsd: tier.priceUsd,
        quantity: item.quantity,
      });

      purchaseItems.push({
        tierId: tier.id,
        eventId: tier.event.id,
        quantity: item.quantity,
        priceUsd: tier.priceUsd,
      });
    }

    // Calculate fees
    const { fees, total } = calculateFees(subtotal);

    // Create line items for Stripe
    const lineItems = createLineItems(lineItemsData);

    // Add service fee as a line item
    if (fees > 0) {
      lineItems.push(createFeeLineItem(fees));
    }

    // Get unique event ID (for now, assume single event per checkout)
    const eventId = purchaseItems[0].eventId;
    const totalQuantity = purchaseItems.reduce((sum, item) => sum + item.quantity, 0);

    // Create pending purchase record
    const purchase = await prisma.purchase.create({
      data: {
        userId: authResult.userId,
        eventId,
        paymentMethod: 'CREDIT_CARD',
        paymentProvider: 'stripe',
        subtotalUsd: subtotal,
        feesUsd: fees,
        totalUsd: total,
        status: 'PENDING',
        ticketQuantity: totalQuantity,
        ticketIds: JSON.stringify([]), // Will be populated after payment
      },
    });

    // Reserve tickets
    for (const item of purchaseItems) {
      await prisma.ticketTier.update({
        where: { id: item.tierId },
        data: {
          reservedQuantity: { increment: item.quantity },
        },
      });
    }

    // Get base URL for redirects
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ||
      `${request.headers.get('x-forwarded-proto') || 'http'}://${request.headers.get('host')}`;

    // Create Stripe checkout session
    const session = await getStripe().checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: lineItems,
      success_url: `${baseUrl}/orders/${purchase.id}?success=true`,
      cancel_url: `${baseUrl}/checkout?cancelled=true`,
      customer_email: (await prisma.user.findUnique({ where: { id: authResult.userId } }))?.email || undefined,
      metadata: {
        purchaseId: purchase.id,
        userId: authResult.userId,
        eventId,
        items: JSON.stringify(purchaseItems),
      },
      expires_at: Math.floor(Date.now() / 1000) + 30 * 60, // 30 minutes
    });

    // Update purchase with Stripe session ID
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
    console.error('Checkout error:', error);
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}
