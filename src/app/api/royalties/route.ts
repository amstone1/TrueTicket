import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/royalties - Get royalty earnings for a wallet
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const walletAddress = searchParams.get('wallet');
    const role = searchParams.get('role'); // 'artist', 'venue', 'organizer', or 'all'

    if (!walletAddress) {
      return NextResponse.json(
        { error: 'Wallet address required' },
        { status: 400 }
      );
    }

    // Find user
    const user = await prisma.user.findFirst({
      where: { walletAddress },
    });

    if (!user) {
      return NextResponse.json({
        earnings: {
          primarySales: 0,
          resaleRoyalties: 0,
          totalEarnings: 0,
          pendingPayout: 0,
          paidOut: 0,
        },
        events: [],
        recentTransactions: [],
      });
    }

    // Get events organized by this user
    const events = await prisma.event.findMany({
      where: { organizerId: user.id },
      include: {
        ticketTiers: true,
        tickets: {
          include: {
            tier: true,
          },
        },
        purchases: {
          where: { status: 'COMPLETED' },
        },
      },
    });

    // Calculate earnings per event
    const eventEarnings = events.map((event) => {
      // Primary sales - count completed purchases
      const primarySales = event.purchases.reduce((sum, purchase) => {
        return sum + purchase.subtotalUsd;
      }, 0);

      // Resale royalties - TODO: implement when resale tracking is added
      // For now, estimate from ResaleListing completions
      const resaleRoyalties = 0; // Placeholder

      const ticketsSold = event.tickets.filter(
        (t) => t.status !== 'REVOKED' && t.status !== 'EXPIRED'
      ).length;

      return {
        id: event.id,
        name: event.name,
        slug: event.slug,
        startDate: event.startDate,
        status: event.status,
        ticketsSold,
        totalCapacity: event.totalCapacity,
        primarySales,
        resaleRoyalties,
        totalEarnings: primarySales + resaleRoyalties,
        resaleRoyaltyBps: event.resaleRoyaltyBps,
      };
    });

    // Sum up totals
    const totalPrimarySales = eventEarnings.reduce((sum, e) => sum + e.primarySales, 0);
    const totalResaleRoyalties = eventEarnings.reduce((sum, e) => sum + e.resaleRoyalties, 0);

    // Get payout records
    const payouts = await prisma.payout.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    const paidOut = payouts
      .filter((p) => p.status === 'COMPLETED')
      .reduce((sum, p) => sum + p.amountUsd, 0);

    const pendingPayout = payouts
      .filter((p) => p.status === 'PENDING')
      .reduce((sum, p) => sum + p.amountUsd, 0);

    // Get recent transactions (sales and royalties)
    const recentPurchases = await prisma.purchase.findMany({
      where: {
        ticket: {
          event: {
            organizerId: user.id,
          },
        },
        status: 'COMPLETED',
      },
      include: {
        ticket: {
          include: {
            tier: true,
            event: {
              select: {
                id: true,
                name: true,
                resaleRoyaltyBps: true,
              },
            },
          },
        },
        buyer: {
          select: {
            displayName: true,
            walletAddress: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    const recentTransactions = recentPurchases.map((p) => ({
      id: p.id,
      type: p.purchaseType === 'RESALE' ? 'ROYALTY' : 'PRIMARY_SALE',
      eventName: p.ticket.event.name,
      tierName: p.ticket.tier.name,
      amount:
        p.purchaseType === 'RESALE'
          ? (p.totalUsd || 0) * (p.ticket.event.resaleRoyaltyBps / 10000)
          : p.ticket.tier.priceUsd,
      buyerName: p.buyer?.displayName || 'Anonymous',
      date: p.createdAt,
    }));

    return NextResponse.json({
      user: {
        id: user.id,
        displayName: user.displayName,
        walletAddress: user.walletAddress,
        role: user.role,
      },
      earnings: {
        primarySales: totalPrimarySales,
        resaleRoyalties: totalResaleRoyalties,
        totalEarnings: totalPrimarySales + totalResaleRoyalties,
        pendingPayout,
        paidOut,
      },
      events: eventEarnings,
      recentTransactions,
      payouts: payouts.map((p) => ({
        id: p.id,
        amount: p.amountUsd,
        status: p.status,
        method: p.payoutMethod,
        date: p.createdAt,
        processedAt: p.processedAt,
      })),
    });
  } catch (error) {
    console.error('Error fetching royalties:', error);
    return NextResponse.json(
      { error: 'Failed to fetch royalties' },
      { status: 500 }
    );
  }
}

// POST /api/royalties - Request a payout
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { walletAddress, amount, method } = body;

    if (!walletAddress || !amount) {
      return NextResponse.json(
        { error: 'Wallet address and amount required' },
        { status: 400 }
      );
    }

    // Find user
    const user = await prisma.user.findFirst({
      where: { walletAddress },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Create payout request
    const payout = await prisma.payout.create({
      data: {
        recipientId: user.id,
        amountUsd: amount,
        payoutMethod: method || 'CRYPTO_USDC',
        status: 'PENDING',
        payoutAddress: walletAddress,
      },
    });

    return NextResponse.json({
      success: true,
      payout: {
        id: payout.id,
        amount: payout.amountUsd,
        status: payout.status,
        method: payout.payoutMethod,
      },
    });
  } catch (error) {
    console.error('Error creating payout request:', error);
    return NextResponse.json(
      { error: 'Failed to create payout request' },
      { status: 500 }
    );
  }
}
