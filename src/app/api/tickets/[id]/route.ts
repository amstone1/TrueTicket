import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { verifyAuth } from '@/lib/auth/verify';
import { serializeForJson } from '@/lib/utils';

// GET /api/tickets/[id] - Get ticket details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const ticket = await prisma.ticket.findUnique({
      where: { id },
      include: {
        event: {
          select: {
            id: true,
            name: true,
            slug: true,
            startDate: true,
            endDate: true,
            doorsOpen: true,
            venueName: true,
            venueAddress: true,
            city: true,
            state: true,
            country: true,
            coverImageUrl: true,
            resaleEnabled: true,
            maxResaleMarkupBps: true,
          },
        },
        tier: {
          select: {
            id: true,
            name: true,
            description: true,
            priceUsd: true,
            perks: true,
          },
        },
        owner: {
          select: {
            id: true,
            walletAddress: true,
            displayName: true,
          },
        },
        transfers: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });

    if (!ticket) {
      return NextResponse.json(
        { error: 'Ticket not found' },
        { status: 404 }
      );
    }

    // Check if listed for resale
    const listing = await prisma.resaleListing.findFirst({
      where: {
        ticketId: id,
        status: 'ACTIVE',
      },
    });

    return NextResponse.json({
      ...ticket,
      isListed: !!listing,
      listing,
    });
  } catch (error) {
    console.error('Error fetching ticket:', error);
    return NextResponse.json(
      { error: 'Failed to fetch ticket' },
      { status: 500 }
    );
  }
}

// POST /api/tickets/[id] - Transfer, list, or unlist ticket
const actionSchema = z.object({
  action: z.enum(['transfer', 'list', 'unlist']),
  // For transfer: email or wallet address of recipient
  toEmail: z.string().email().optional(),
  toAddress: z.string().optional(),
  // For list: price in USD
  priceUsd: z.number().positive().optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Verify authentication
    const authResult = await verifyAuth(request);
    if (!authResult.authenticated || !authResult.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const validated = actionSchema.parse(body);

    // Get ticket with relations
    const ticket = await prisma.ticket.findUnique({
      where: { id },
      include: {
        event: true,
        tier: true,
        owner: true,
      },
    });

    if (!ticket) {
      return NextResponse.json(
        { error: 'Ticket not found' },
        { status: 404 }
      );
    }

    // Verify ownership
    if (ticket.ownerId !== authResult.userId) {
      return NextResponse.json(
        { error: 'You do not own this ticket' },
        { status: 403 }
      );
    }

    if (ticket.status !== 'VALID') {
      return NextResponse.json(
        { error: 'Ticket is not valid for this action' },
        { status: 400 }
      );
    }

    // Handle different actions
    switch (validated.action) {
      case 'transfer': {
        if (!validated.toEmail && !validated.toAddress) {
          return NextResponse.json(
            { error: 'Recipient email or wallet address required' },
            { status: 400 }
          );
        }

        if (ticket.isListed) {
          return NextResponse.json(
            { error: 'Cannot transfer a listed ticket. Please unlist first.' },
            { status: 400 }
          );
        }

        // Find or create recipient user
        let recipient;
        if (validated.toEmail) {
          recipient = await prisma.user.findUnique({
            where: { email: validated.toEmail },
          });
          if (!recipient) {
            // Create a pending user with just email
            recipient = await prisma.user.create({
              data: { email: validated.toEmail },
            });
          }
        } else if (validated.toAddress) {
          recipient = await prisma.user.findUnique({
            where: { walletAddress: validated.toAddress },
          });
          if (!recipient) {
            recipient = await prisma.user.create({
              data: { walletAddress: validated.toAddress },
            });
          }
        }

        if (!recipient) {
          return NextResponse.json(
            { error: 'Could not find or create recipient' },
            { status: 400 }
          );
        }

        // Cannot transfer to yourself
        if (recipient.id === authResult.userId) {
          return NextResponse.json(
            { error: 'Cannot transfer ticket to yourself' },
            { status: 400 }
          );
        }

        // Transfer ticket
        const transferResult = await prisma.$transaction(async (tx) => {
          // Cancel any active listings (shouldn't exist but just in case)
          await tx.resaleListing.updateMany({
            where: { ticketId: id, status: 'ACTIVE' },
            data: { status: 'CANCELLED', cancelledAt: new Date() },
          });

          // Update ticket owner
          const updatedTicket = await tx.ticket.update({
            where: { id },
            data: {
              ownerId: recipient!.id,
              isListed: false,
            },
          });

          // Record transfer
          await tx.ticketTransfer.create({
            data: {
              ticketId: id,
              fromAddress: ticket.owner?.walletAddress || ticket.owner?.email || authResult.userId,
              toAddress: recipient!.walletAddress || recipient!.email || recipient!.id,
              transferType: 'GIFT',
            },
          });

          return updatedTicket;
        });

        return NextResponse.json(serializeForJson({
          success: true,
          message: `Ticket transferred to ${validated.toEmail || validated.toAddress}`,
          ticket: transferResult,
        }));
      }

      case 'list': {
        if (!validated.priceUsd) {
          return NextResponse.json(
            { error: 'Price is required for listing' },
            { status: 400 }
          );
        }

        if (!ticket.event.resaleEnabled) {
          return NextResponse.json(
            { error: 'Resale is not enabled for this event' },
            { status: 400 }
          );
        }

        if (ticket.isListed) {
          return NextResponse.json(
            { error: 'Ticket is already listed' },
            { status: 400 }
          );
        }

        // Check price cap
        if (ticket.event.maxResaleMarkupBps) {
          const maxPrice = ticket.tier.priceUsd * (1 + ticket.event.maxResaleMarkupBps / 10000);
          if (validated.priceUsd > maxPrice) {
            return NextResponse.json(
              {
                error: `Price exceeds maximum allowed ($${maxPrice.toFixed(2)})`,
                maxPrice: Math.round(maxPrice * 100) / 100,
                maxMarkupPercent: ticket.event.maxResaleMarkupBps / 100,
              },
              { status: 400 }
            );
          }
        }

        // Try to list on-chain if ticket is tokenized
        let onChainListingId: bigint | null = null;
        let onChainTxHash: string | null = null;

        if (ticket.tokenId && ticket.contractAddress) {
          try {
            const { blockchainService } = await import('@/lib/blockchain');
            const { ethers } = await import('ethers');

            // Convert USD to wei (simplified - in production use price oracle)
            const priceWei = ethers.parseEther((validated.priceUsd! / 1000).toString());

            // List for 14 days
            const listingResult = await blockchainService.listTicketOnChain(
              ticket.contractAddress,
              BigInt(ticket.tokenId.toString()),
              priceWei,
              14 * 24 * 60 * 60 // 14 days in seconds
            );

            onChainListingId = listingResult.listingId;
            onChainTxHash = listingResult.txHash;
          } catch (error) {
            console.error('On-chain listing failed (continuing with DB only):', error);
            // Continue with database listing even if on-chain fails
          }
        }

        // Create listing in database
        const listResult = await prisma.$transaction(async (tx) => {
          const listing = await tx.resaleListing.create({
            data: {
              ticketId: id,
              eventId: ticket.eventId,
              sellerId: authResult.userId!,
              priceUsd: validated.priceUsd!,
              status: 'ACTIVE',
              expiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days
              listingIdOnChain: onChainListingId,
              listingTxHash: onChainTxHash,
            },
          });

          await tx.ticket.update({
            where: { id },
            data: { isListed: true },
          });

          return listing;
        });

        return NextResponse.json(serializeForJson({
          success: true,
          message: `Ticket listed for $${validated.priceUsd.toFixed(2)}`,
          listing: listResult,
          onChain: !!onChainListingId,
        }));
      }

      case 'unlist': {
        if (!ticket.isListed) {
          return NextResponse.json(
            { error: 'Ticket is not listed' },
            { status: 400 }
          );
        }

        // Cancel listing
        await prisma.$transaction(async (tx) => {
          await tx.resaleListing.updateMany({
            where: { ticketId: id, status: 'ACTIVE' },
            data: { status: 'CANCELLED', cancelledAt: new Date() },
          });

          await tx.ticket.update({
            where: { id },
            data: { isListed: false },
          });
        });

        return NextResponse.json({
          success: true,
          message: 'Ticket listing cancelled',
        });
      }

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Error processing ticket action:', error);

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
