import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { createHash } from 'crypto';

function hashCode(code: string): string {
  return createHash('sha256').update(code).digest('hex');
}

// POST /api/scan - Validate and check in a ticket
const scanSchema = z.object({
  code: z.string().min(1),
  eventId: z.string().optional(),
  gate: z.string().optional(),
  scannedBy: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = scanSchema.parse(body);

    // Hash the code to find the ticket
    const codeHash = hashCode(validated.code);

    const ticket = await prisma.ticket.findFirst({
      where: {
        OR: [
          { checkInCode: validated.code },
          { checkInCodeHash: codeHash },
        ],
      },
      include: {
        event: {
          select: {
            id: true,
            name: true,
            startDate: true,
            endDate: true,
            doorsOpen: true,
            venueName: true,
          },
        },
        tier: {
          select: {
            name: true,
            perks: true,
          },
        },
        owner: {
          select: {
            displayName: true,
            walletAddress: true,
          },
        },
        checkIns: {
          orderBy: { checkedInAt: 'desc' },
          take: 1,
        },
      },
    });

    if (!ticket) {
      // Log failed attempt
      if (validated.eventId) {
        await prisma.checkIn.create({
          data: {
            ticketId: 'unknown',
            eventId: validated.eventId,
            method: 'QR_CODE',
            gate: validated.gate,
            scannedBy: validated.scannedBy,
            status: 'FAILED_INVALID',
            failureReason: 'Ticket not found',
          },
        }).catch(() => {}); // Ignore if eventId doesn't exist
      }

      return NextResponse.json({
        valid: false,
        status: 'INVALID',
        message: 'Invalid ticket code',
        color: 'red',
      });
    }

    // Verify event matches if specified
    if (validated.eventId && ticket.eventId !== validated.eventId) {
      await prisma.checkIn.create({
        data: {
          ticketId: ticket.id,
          eventId: validated.eventId,
          method: 'QR_CODE',
          gate: validated.gate,
          scannedBy: validated.scannedBy,
          status: 'FAILED_WRONG_EVENT',
          failureReason: 'Ticket is for a different event',
        },
      });

      return NextResponse.json({
        valid: false,
        status: 'WRONG_EVENT',
        message: 'This ticket is for a different event',
        ticketEvent: ticket.event.name,
        color: 'orange',
      });
    }

    // Check if already used
    if (ticket.status === 'USED') {
      const lastCheckIn = ticket.checkIns[0];

      return NextResponse.json({
        valid: false,
        status: 'ALREADY_USED',
        message: 'Ticket has already been used',
        checkedInAt: lastCheckIn?.checkedInAt,
        gate: lastCheckIn?.gate,
        color: 'red',
        ticket: {
          tier: ticket.tier.name,
          owner: ticket.owner.displayName || (ticket.owner.walletAddress ? ticket.owner.walletAddress.slice(0, 10) + '...' : 'Unknown'),
        },
      });
    }

    // Check if ticket is valid
    if (ticket.status !== 'VALID') {
      await prisma.checkIn.create({
        data: {
          ticketId: ticket.id,
          eventId: ticket.eventId,
          method: 'QR_CODE',
          gate: validated.gate,
          scannedBy: validated.scannedBy,
          status: 'FAILED_INVALID',
          failureReason: `Ticket status: ${ticket.status}`,
        },
      });

      return NextResponse.json({
        valid: false,
        status: ticket.status,
        message: `Ticket is ${ticket.status.toLowerCase()}`,
        color: 'red',
      });
    }

    // Check event timing
    const now = new Date();
    const eventStart = new Date(ticket.event.startDate);
    const doorsOpen = ticket.event.doorsOpen ? new Date(ticket.event.doorsOpen) : new Date(eventStart.getTime() - 2 * 60 * 60 * 1000);

    // Allow entry starting 4 hours before doors open (for early setup)
    const earliestEntry = new Date(doorsOpen.getTime() - 4 * 60 * 60 * 1000);

    if (now < earliestEntry) {
      return NextResponse.json({
        valid: false,
        status: 'TOO_EARLY',
        message: 'Doors are not open yet',
        doorsOpen: doorsOpen.toISOString(),
        color: 'yellow',
        ticket: {
          tier: ticket.tier.name,
          event: ticket.event.name,
        },
      });
    }

    // Mark ticket as used and record check-in
    await prisma.$transaction(async (tx) => {
      await tx.ticket.update({
        where: { id: ticket.id },
        data: { status: 'USED' },
      });

      await tx.checkIn.create({
        data: {
          ticketId: ticket.id,
          eventId: ticket.eventId,
          method: 'QR_CODE',
          gate: validated.gate,
          scannedBy: validated.scannedBy,
          status: 'SUCCESS',
        },
      });
    });

    return NextResponse.json({
      valid: true,
      status: 'SUCCESS',
      message: 'Welcome! Enjoy the event',
      color: 'green',
      ticket: {
        id: ticket.id,
        tier: ticket.tier.name,
        perks: ticket.tier.perks,
        owner: ticket.owner.displayName || (ticket.owner.walletAddress ? ticket.owner.walletAddress.slice(0, 10) + '...' : 'Unknown'),
        event: {
          name: ticket.event.name,
          venue: ticket.event.venueName,
        },
      },
    });
  } catch (error) {
    console.error('Error scanning ticket:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { valid: false, error: 'Invalid scan data' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { valid: false, error: 'Scan failed' },
      { status: 500 }
    );
  }
}

// GET /api/scan - Get check-in stats for an event
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const eventId = searchParams.get('eventId');

    if (!eventId) {
      return NextResponse.json(
        { error: 'Event ID required' },
        { status: 400 }
      );
    }

    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: {
        id: true,
        name: true,
        totalCapacity: true,
        _count: {
          select: {
            tickets: true,
            checkIns: true,
          },
        },
      },
    });

    if (!event) {
      return NextResponse.json(
        { error: 'Event not found' },
        { status: 404 }
      );
    }

    // Get detailed stats
    const [ticketsSold, checkedIn, checkInsByGate] = await Promise.all([
      prisma.ticket.count({
        where: { eventId, status: { in: ['VALID', 'USED'] } },
      }),
      prisma.ticket.count({
        where: { eventId, status: 'USED' },
      }),
      prisma.checkIn.groupBy({
        by: ['gate'],
        where: { eventId, status: 'SUCCESS' },
        _count: true,
      }),
    ]);

    // Recent check-ins
    const recentCheckIns = await prisma.checkIn.findMany({
      where: { eventId, status: 'SUCCESS' },
      orderBy: { checkedInAt: 'desc' },
      take: 10,
      include: {
        ticket: {
          include: {
            tier: { select: { name: true } },
            owner: { select: { displayName: true, walletAddress: true } },
          },
        },
      },
    });

    return NextResponse.json({
      event: {
        id: event.id,
        name: event.name,
        capacity: event.totalCapacity,
      },
      stats: {
        ticketsSold,
        checkedIn,
        remaining: ticketsSold - checkedIn,
        checkInRate: ticketsSold > 0 ? Math.round((checkedIn / ticketsSold) * 100) : 0,
      },
      byGate: checkInsByGate.map((g) => ({
        gate: g.gate || 'Unknown',
        count: g._count,
      })),
      recentCheckIns: recentCheckIns.map((c) => ({
        time: c.checkedInAt,
        gate: c.gate,
        tier: c.ticket.tier.name,
        guest: c.ticket.owner.displayName || (c.ticket.owner.walletAddress ? c.ticket.owner.walletAddress.slice(0, 10) + '...' : 'Unknown'),
      })),
    });
  } catch (error) {
    console.error('Error fetching check-in stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch stats' },
      { status: 500 }
    );
  }
}
