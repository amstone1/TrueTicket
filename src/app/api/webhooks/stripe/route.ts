import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { stripe } from '@/lib/stripe';
import { prisma } from '@/lib/prisma';
import { v4 as uuidv4 } from 'uuid';
import type Stripe from 'stripe';

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

export async function POST(request: NextRequest) {
  if (!webhookSecret) {
    console.error('STRIPE_WEBHOOK_SECRET is not set');
    return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 });
  }

  const body = await request.text();
  const headersList = await headers();
  const signature = headersList.get('stripe-signature');

  if (!signature) {
    return NextResponse.json({ error: 'Missing stripe-signature header' }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutComplete(session);
        break;
      }

      case 'checkout.session.expired': {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutExpired(session);
        break;
      }

      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        await handlePaymentFailed(paymentIntent);
        break;
      }

      case 'charge.refunded': {
        const charge = event.data.object as Stripe.Charge;
        await handleRefund(charge);
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook handler error:', error);
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 });
  }
}

async function handleCheckoutComplete(session: Stripe.Checkout.Session) {
  const purchaseId = session.metadata?.purchaseId;

  if (!purchaseId) {
    console.error('No purchaseId in session metadata');
    return;
  }

  const purchase = await prisma.purchase.findUnique({
    where: { id: purchaseId },
    include: { event: true },
  });

  if (!purchase) {
    console.error(`Purchase not found: ${purchaseId}`);
    return;
  }

  if (purchase.status === 'COMPLETED') {
    console.log(`Purchase ${purchaseId} already completed`);
    return;
  }

  // Parse items from metadata
  const items = JSON.parse(session.metadata?.items || '[]') as {
    tierId: string;
    eventId: string;
    quantity: number;
    priceUsd: number;
  }[];

  // Create tickets
  const ticketIds: string[] = [];
  const ticketsToCreate: {
    id: string;
    eventId: string;
    tierId: string;
    ownerId: string;
    purchaseId: string;
    originalPriceUsd: number;
    status: 'PENDING_MINT';
    checkInCode: string;
  }[] = [];

  for (const item of items) {
    for (let i = 0; i < item.quantity; i++) {
      const ticketId = uuidv4().replace(/-/g, '').slice(0, 24);
      const checkInCode = `TT-${uuidv4().slice(0, 8).toUpperCase()}`;

      ticketIds.push(ticketId);
      ticketsToCreate.push({
        id: ticketId,
        eventId: item.eventId,
        tierId: item.tierId,
        ownerId: purchase.userId,
        purchaseId: purchase.id,
        originalPriceUsd: item.priceUsd,
        status: 'PENDING_MINT',
        checkInCode,
      });
    }
  }

  // Use transaction to update everything atomically
  await prisma.$transaction(async (tx) => {
    // Create all tickets
    await tx.ticket.createMany({
      data: ticketsToCreate,
    });

    // Update tier sold quantities and decrease reserved
    for (const item of items) {
      await tx.ticketTier.update({
        where: { id: item.tierId },
        data: {
          soldQuantity: { increment: item.quantity },
          reservedQuantity: { decrement: item.quantity },
        },
      });
    }

    // Update purchase status
    await tx.purchase.update({
      where: { id: purchaseId },
      data: {
        status: 'COMPLETED',
        stripePaymentIntentId: session.payment_intent as string,
        ticketIds: JSON.stringify(ticketIds),
        completedAt: new Date(),
      },
    });

    // Create notification for user
    await tx.notification.create({
      data: {
        userId: purchase.userId,
        type: 'TICKET_PURCHASED',
        title: 'Purchase Confirmed!',
        message: `Your ${ticketIds.length} ticket(s) for ${purchase.event.name} have been confirmed.`,
        data: {
          purchaseId: purchase.id,
          eventId: purchase.eventId,
          ticketCount: ticketIds.length,
        },
      },
    });
  });

  console.log(`Purchase ${purchaseId} completed with ${ticketIds.length} tickets`);

  // Mint NFTs on blockchain
  // In production, this should be a background job (BullMQ) for reliability
  try {
    const { mintTicketsForPurchase } = await import('@/lib/blockchain/minting');
    const mintResults = await mintTicketsForPurchase(purchaseId);

    const successCount = mintResults.filter(r => r.success).length;
    const failCount = mintResults.filter(r => !r.success).length;

    console.log(`Minting complete: ${successCount} succeeded, ${failCount} failed`);

    if (failCount > 0) {
      // Log failures for retry
      console.error('Failed mints:', mintResults.filter(r => !r.success));
    }
  } catch (error) {
    // Minting failure should not fail the purchase - tickets are in PENDING_MINT state
    // A background job can retry minting later
    console.error('Minting failed (will retry):', error);
  }
}

async function handleCheckoutExpired(session: Stripe.Checkout.Session) {
  const purchaseId = session.metadata?.purchaseId;

  if (!purchaseId) return;

  const purchase = await prisma.purchase.findUnique({
    where: { id: purchaseId },
  });

  if (!purchase || purchase.status !== 'PENDING') return;

  // Parse items to release reserved tickets
  const items = JSON.parse(session.metadata?.items || '[]') as {
    tierId: string;
    quantity: number;
  }[];

  await prisma.$transaction(async (tx) => {
    // Release reserved tickets
    for (const item of items) {
      await tx.ticketTier.update({
        where: { id: item.tierId },
        data: {
          reservedQuantity: { decrement: item.quantity },
        },
      });
    }

    // Update purchase status
    await tx.purchase.update({
      where: { id: purchaseId },
      data: { status: 'FAILED' },
    });
  });

  console.log(`Purchase ${purchaseId} expired, tickets released`);
}

async function handlePaymentFailed(paymentIntent: Stripe.PaymentIntent) {
  const purchase = await prisma.purchase.findFirst({
    where: { stripePaymentIntentId: paymentIntent.id },
  });

  if (!purchase) return;

  await prisma.purchase.update({
    where: { id: purchase.id },
    data: { status: 'FAILED' },
  });

  console.log(`Payment failed for purchase ${purchase.id}`);
}

async function handleRefund(charge: Stripe.Charge) {
  if (!charge.payment_intent) return;

  const purchase = await prisma.purchase.findFirst({
    where: { stripePaymentIntentId: charge.payment_intent as string },
  });

  if (!purchase) return;

  const refundAmount = charge.amount_refunded / 100;
  const isFullRefund = refundAmount >= purchase.totalUsd;

  await prisma.$transaction(async (tx) => {
    // Update purchase status
    await tx.purchase.update({
      where: { id: purchase.id },
      data: {
        status: isFullRefund ? 'REFUNDED' : 'PARTIALLY_REFUNDED',
        refundedAt: new Date(),
      },
    });

    if (isFullRefund) {
      // Revoke all tickets
      const ticketIds = JSON.parse(purchase.ticketIds) as string[];
      await tx.ticket.updateMany({
        where: { id: { in: ticketIds } },
        data: { status: 'REVOKED' },
      });
    }

    // Create notification
    await tx.notification.create({
      data: {
        userId: purchase.userId,
        type: 'TICKET_PURCHASED', // TODO: Add REFUND notification type
        title: isFullRefund ? 'Refund Processed' : 'Partial Refund Processed',
        message: `A refund of $${refundAmount.toFixed(2)} has been processed for your order.`,
        data: { purchaseId: purchase.id, refundAmount },
      },
    });
  });

  console.log(`Refund processed for purchase ${purchase.id}: $${refundAmount}`);
}
