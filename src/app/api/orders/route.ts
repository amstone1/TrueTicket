import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth/middleware';

export async function GET(request: NextRequest) {
  const authResult = await requireAuth(request);
  if (authResult instanceof NextResponse) return authResult;

  try {
    const purchases = await prisma.purchase.findMany({
      where: { userId: authResult.user.userId },
      include: {
        event: {
          select: {
            name: true,
            slug: true,
            startDate: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const orders = purchases.map((purchase) => ({
      id: purchase.id,
      orderNumber: purchase.id.slice(-8).toUpperCase(),
      eventName: purchase.event.name,
      eventDate: purchase.event.startDate.toISOString(),
      eventSlug: purchase.event.slug,
      ticketCount: purchase.ticketQuantity,
      totalAmount: purchase.totalUsd,
      status: purchase.status,
      createdAt: purchase.createdAt.toISOString(),
    }));

    return NextResponse.json({ orders });
  } catch (error) {
    console.error('Failed to fetch orders:', error);
    return NextResponse.json({ error: 'Failed to fetch orders' }, { status: 500 });
  }
}
