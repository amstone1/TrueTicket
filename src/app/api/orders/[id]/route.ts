import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAuth } from '@/lib/auth/verify';

export async function GET(
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

    // Fetch purchase with related data
    const purchase = await prisma.purchase.findUnique({
      where: { id },
      include: {
        event: {
          select: {
            id: true,
            name: true,
            slug: true,
            startDate: true,
            venueName: true,
            city: true,
            state: true,
            coverImageUrl: true,
          },
        },
        user: {
          select: {
            id: true,
            email: true,
            displayName: true,
          },
        },
      },
    });

    if (!purchase) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // Verify ownership
    if (purchase.userId !== authResult.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Fetch tickets for this purchase
    const ticketIds = JSON.parse(purchase.ticketIds) as string[];
    const tickets = ticketIds.length > 0
      ? await prisma.ticket.findMany({
          where: { id: { in: ticketIds } },
          select: {
            id: true,
            checkInCode: true,
            status: true,
            tier: {
              select: {
                name: true,
              },
            },
          },
        })
      : [];

    return NextResponse.json({
      id: purchase.id,
      userId: purchase.userId,
      eventId: purchase.eventId,
      event: {
        ...purchase.event,
        startDate: purchase.event.startDate.toISOString(),
      },
      paymentMethod: purchase.paymentMethod,
      subtotalUsd: purchase.subtotalUsd,
      feesUsd: purchase.feesUsd,
      totalUsd: purchase.totalUsd,
      status: purchase.status,
      ticketQuantity: purchase.ticketQuantity,
      ticketIds,
      tickets,
      createdAt: purchase.createdAt.toISOString(),
      completedAt: purchase.completedAt?.toISOString(),
    });
  } catch (error) {
    console.error('Error fetching order:', error);
    return NextResponse.json({ error: 'Failed to fetch order' }, { status: 500 });
  }
}
