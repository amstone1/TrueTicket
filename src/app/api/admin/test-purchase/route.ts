import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth/middleware';
import { z } from 'zod';

// Test purchase endpoint - ADMIN ONLY
// This bypasses Stripe for testing purposes

const TestPurchaseSchema = z.object({
  eventId: z.string(),
  tierId: z.string(),
  quantity: z.number().min(1).max(10).default(1),
  // Optional: specify a different user to receive the tickets
  recipientUserId: z.string().optional(),
});

export async function POST(request: NextRequest) {
  // Require authentication
  const authResult = await requireAuth(request);
  if (authResult instanceof NextResponse) return authResult;

  try {
    // Verify admin role
    const user = await prisma.user.findUnique({
      where: { id: authResult.user.userId },
      select: { role: true },
    });

    if (user?.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validated = TestPurchaseSchema.parse(body);

    const recipientId = validated.recipientUserId || authResult.user.userId;

    // Fetch the tier
    const tier = await prisma.ticketTier.findUnique({
      where: { id: validated.tierId },
      include: {
        event: true,
      },
    });

    if (!tier) {
      return NextResponse.json(
        { error: 'Ticket tier not found' },
        { status: 404 }
      );
    }

    if (tier.eventId !== validated.eventId) {
      return NextResponse.json(
        { error: 'Tier does not belong to specified event' },
        { status: 400 }
      );
    }

    const available = tier.totalQuantity - tier.soldQuantity - tier.reservedQuantity;
    if (validated.quantity > available) {
      return NextResponse.json(
        { error: `Only ${available} tickets available` },
        { status: 400 }
      );
    }

    // Create purchase record
    const subtotal = tier.priceUsd * validated.quantity;
    const fees = Math.round(subtotal * 0.05 * 100) / 100; // 5% fee
    const total = subtotal + fees;

    const purchase = await prisma.purchase.create({
      data: {
        userId: recipientId,
        eventId: validated.eventId,
        paymentMethod: 'CRYPTO_MATIC', // Mark as crypto to indicate test/bypass
        paymentProvider: 'test',
        subtotalUsd: subtotal,
        feesUsd: fees,
        totalUsd: total,
        status: 'COMPLETED',
        ticketQuantity: validated.quantity,
        ticketIds: JSON.stringify([]),
      },
    });

    // Create tickets
    const tickets = [];
    for (let i = 0; i < validated.quantity; i++) {
      // Generate a unique token ID
      const tokenId = `TEST-${Date.now()}-${i}-${Math.random().toString(36).substring(7)}`;

      const ticket = await prisma.ticket.create({
        data: {
          eventId: validated.eventId,
          tierId: validated.tierId,
          ownerId: recipientId,
          purchaseId: purchase.id,
          status: 'VALID',
          tokenId,
          originalPriceUsd: tier.priceUsd,
          mintedAt: new Date(),
        },
      });
      tickets.push(ticket);
    }

    // Update tier sold quantity
    await prisma.ticketTier.update({
      where: { id: validated.tierId },
      data: {
        soldQuantity: { increment: validated.quantity },
      },
    });

    // Update purchase with ticket IDs
    await prisma.purchase.update({
      where: { id: purchase.id },
      data: {
        ticketIds: JSON.stringify(tickets.map(t => t.id)),
      },
    });

    return NextResponse.json({
      success: true,
      purchase: {
        id: purchase.id,
        totalUsd: total,
        status: purchase.status,
      },
      tickets: tickets.map(t => ({
        id: t.id,
        tokenId: t.tokenId,
        status: t.status,
      })),
    }, { status: 201 });

  } catch (error) {
    console.error('Test purchase error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to create test purchase' },
      { status: 500 }
    );
  }
}
