import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth/middleware';
import { z } from 'zod';

// GET /api/events/[slug] - Get event details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;

    const event = await prisma.event.findUnique({
      where: { slug },
      include: {
        ticketTiers: {
          orderBy: { priceUsd: 'asc' },
        },
        organizer: {
          select: {
            id: true,
            displayName: true,
            avatarUrl: true,
            isVerified: true,
          },
        },
        _count: {
          select: {
            tickets: true,
            favorites: true,
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

    // Calculate availability for each tier
    const tiersWithAvailability = event.ticketTiers.map((tier) => ({
      ...tier,
      available: tier.totalQuantity - tier.soldQuantity - tier.reservedQuantity,
      soldOut: tier.soldQuantity >= tier.totalQuantity,
    }));

    // Get active resale listings count
    const resaleCount = await prisma.resaleListing.count({
      where: {
        eventId: event.id,
        status: 'ACTIVE',
      },
    });

    return NextResponse.json({
      ...event,
      ticketTiers: tiersWithAvailability,
      resaleListingsCount: resaleCount,
    });
  } catch (error) {
    console.error('Error fetching event:', error);
    return NextResponse.json(
      { error: 'Failed to fetch event' },
      { status: 500 }
    );
  }
}

// PATCH /api/events/[slug] - Update event (publish, update details, etc.)
const updateEventSchema = z.object({
  status: z.enum(['DRAFT', 'PUBLISHED', 'CANCELLED', 'COMPLETED']).optional(),
  isPublished: z.boolean().optional(),
  isFeatured: z.boolean().optional(),
  name: z.string().min(1).max(200).optional(),
  description: z.string().optional(),
  coverImageUrl: z.string().url().optional().nullable(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  // Require authentication
  const authResult = await requireAuth(request);
  if (authResult instanceof NextResponse) return authResult;

  try {
    const { slug } = await params;
    const body = await request.json();
    const validated = updateEventSchema.parse(body);

    // Find the event and verify ownership
    const event = await prisma.event.findUnique({
      where: { slug },
      select: { id: true, organizerId: true },
    });

    if (!event) {
      return NextResponse.json(
        { error: 'Event not found' },
        { status: 404 }
      );
    }

    // Check if user is the organizer or an admin
    const user = await prisma.user.findUnique({
      where: { id: authResult.user.userId },
      select: { role: true },
    });

    if (event.organizerId !== authResult.user.userId && user?.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Not authorized to update this event' },
        { status: 403 }
      );
    }

    // Build update data
    const updateData: any = {};
    if (validated.status !== undefined) updateData.status = validated.status;
    if (validated.isPublished !== undefined) {
      updateData.isPublished = validated.isPublished;
      if (validated.isPublished) {
        updateData.publishedAt = new Date();
        updateData.status = 'PUBLISHED';
      }
    }
    if (validated.isFeatured !== undefined) updateData.isFeatured = validated.isFeatured;
    if (validated.name !== undefined) updateData.name = validated.name;
    if (validated.description !== undefined) updateData.description = validated.description;
    if (validated.coverImageUrl !== undefined) updateData.coverImageUrl = validated.coverImageUrl;

    const updatedEvent = await prisma.event.update({
      where: { id: event.id },
      data: updateData,
      include: {
        ticketTiers: true,
      },
    });

    return NextResponse.json(updatedEvent);
  } catch (error) {
    console.error('Error updating event:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to update event' },
      { status: 500 }
    );
  }
}
