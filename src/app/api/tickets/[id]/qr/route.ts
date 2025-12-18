import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import QRCode from 'qrcode';

// GET /api/tickets/[id]/qr - Generate QR code for ticket
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const searchParams = request.nextUrl.searchParams;
    const format = searchParams.get('format') || 'svg';
    const size = parseInt(searchParams.get('size') || '300');

    const ticket = await prisma.ticket.findUnique({
      where: { id },
      select: {
        id: true,
        checkInCode: true,
        status: true,
        event: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!ticket) {
      return NextResponse.json(
        { error: 'Ticket not found' },
        { status: 404 }
      );
    }

    if (!ticket.checkInCode) {
      return NextResponse.json(
        { error: 'No check-in code available' },
        { status: 400 }
      );
    }

    // Create QR data payload
    const qrData = JSON.stringify({
      code: ticket.checkInCode,
      ticketId: ticket.id,
      eventId: ticket.event.id,
      v: 1, // version for future compatibility
    });

    if (format === 'svg') {
      const svg = await QRCode.toString(qrData, {
        type: 'svg',
        width: size,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#ffffff',
        },
      });

      return new NextResponse(svg, {
        headers: {
          'Content-Type': 'image/svg+xml',
          'Cache-Control': 'private, max-age=3600',
        },
      });
    }

    if (format === 'png') {
      const png = await QRCode.toBuffer(qrData, {
        type: 'png',
        width: size,
        margin: 2,
      });

      return new NextResponse(png, {
        headers: {
          'Content-Type': 'image/png',
          'Cache-Control': 'private, max-age=3600',
        },
      });
    }

    // Return data URL for embedding
    const dataUrl = await QRCode.toDataURL(qrData, {
      width: size,
      margin: 2,
    });

    return NextResponse.json({ qrCode: dataUrl, ticketId: ticket.id });
  } catch (error) {
    console.error('Error generating QR code:', error);
    return NextResponse.json(
      { error: 'Failed to generate QR code' },
      { status: 500 }
    );
  }
}
