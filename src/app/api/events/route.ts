import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { serializeForJson } from '@/lib/utils';
import type { EventFilters, PaginatedResponse, Event } from '@/types';

// GET /api/events - List events with filters
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;

    // Parse query params
    const filters: EventFilters = {
      page: parseInt(searchParams.get('page') || '1'),
      limit: parseInt(searchParams.get('limit') || '12'),
      category: searchParams.get('category') as EventFilters['category'],
      city: searchParams.get('city') || undefined,
      state: searchParams.get('state') || undefined,
      startDateFrom: searchParams.get('startDateFrom') || undefined,
      startDateTo: searchParams.get('startDateTo') || undefined,
      minPrice: searchParams.get('minPrice') ? parseFloat(searchParams.get('minPrice')!) : undefined,
      maxPrice: searchParams.get('maxPrice') ? parseFloat(searchParams.get('maxPrice')!) : undefined,
      search: searchParams.get('search') || undefined,
      sortBy: (searchParams.get('sortBy') as EventFilters['sortBy']) || 'date',
      sortOrder: (searchParams.get('sortOrder') as EventFilters['sortOrder']) || 'asc',
    };

    // Build where clause
    const where: any = {
      status: 'PUBLISHED',
      isPublished: true,
    };

    if (filters.category) {
      where.category = filters.category;
    }

    if (filters.city) {
      where.city = { contains: filters.city };
    }

    if (filters.state) {
      where.state = { contains: filters.state };
    }

    if (filters.startDateFrom || filters.startDateTo) {
      where.startDate = {};
      if (filters.startDateFrom) {
        where.startDate.gte = new Date(filters.startDateFrom);
      }
      if (filters.startDateTo) {
        where.startDate.lte = new Date(filters.startDateTo);
      }
    }

    if (filters.search) {
      where.OR = [
        { name: { contains: filters.search } },
        { description: { contains: filters.search } },
        { venueName: { contains: filters.search } },
      ];
    }

    // Build orderBy
    const orderBy: any = {};
    switch (filters.sortBy) {
      case 'date':
        orderBy.startDate = filters.sortOrder;
        break;
      case 'price':
        orderBy.ticketTiers = { _min: { priceUsd: filters.sortOrder } };
        break;
      default:
        orderBy.startDate = 'asc';
    }

    // Execute query
    const [events, total] = await Promise.all([
      prisma.event.findMany({
        where,
        orderBy,
        skip: ((filters.page || 1) - 1) * (filters.limit || 12),
        take: filters.limit || 12,
        include: {
          ticketTiers: {
            where: { isActive: true },
            orderBy: { priceUsd: 'asc' },
          },
          organizer: {
            select: {
              id: true,
              displayName: true,
              avatarUrl: true,
            },
          },
        },
      }),
      prisma.event.count({ where }),
    ]);

    const response: PaginatedResponse<typeof events[0]> = {
      data: events,
      pagination: {
        page: filters.page || 1,
        limit: filters.limit || 12,
        total,
        totalPages: Math.ceil(total / (filters.limit || 12)),
      },
    };

    return NextResponse.json(serializeForJson(response));
  } catch (error) {
    console.error('Error fetching events:', error);
    return NextResponse.json(
      { error: 'Failed to fetch events' },
      { status: 500 }
    );
  }
}

// POST /api/events - Create new event
const createEventSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().min(1),
  shortDescription: z.string().max(500).optional(),
  category: z.enum(['MUSIC', 'SPORTS', 'ARTS', 'THEATER', 'COMEDY', 'CONFERENCE', 'FESTIVAL', 'NETWORKING', 'OTHER']),
  tags: z.array(z.string()).optional(),
  startDate: z.string().datetime(),
  endDate: z.string().datetime().optional(),
  doorsOpen: z.string().datetime().optional(),
  timezone: z.string().default('America/New_York'),
  locationType: z.enum(['IN_PERSON', 'VIRTUAL', 'HYBRID']),
  venueName: z.string().optional(),
  venueAddress: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  country: z.string().optional(),
  virtualUrl: z.string().url().optional(),
  totalCapacity: z.number().int().positive(),
  resaleEnabled: z.boolean().default(true),
  maxResaleMarkupBps: z.number().int().min(0).max(10000).optional(),
  resaleRoyaltyBps: z.number().int().min(0).max(2500).default(1000),
  tiers: z.array(z.object({
    name: z.string(),
    description: z.string().optional(),
    priceUsd: z.number().min(0),
    totalQuantity: z.number().int().positive(),
    maxPerWallet: z.number().int().positive().default(10),
    saleStartDate: z.string().datetime().optional(),
    saleEndDate: z.string().datetime().optional(),
    perks: z.array(z.string()).optional(),
  })).min(1),
});

export async function POST(request: NextRequest) {
  try {
    // TODO: Add authentication check
    // const session = await getServerSession();
    // if (!session) {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    // }

    const body = await request.json();
    const validated = createEventSchema.parse(body);

    // Generate slug
    const baseSlug = validated.name
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');

    // Check for existing slug and make unique
    const existingEvents = await prisma.event.count({
      where: { slug: { startsWith: baseSlug } },
    });

    const slug = existingEvents > 0 ? `${baseSlug}-${existingEvents + 1}` : baseSlug;

    // Create event with tiers
    const event = await prisma.event.create({
      data: {
        name: validated.name,
        slug,
        description: validated.description,
        shortDescription: validated.shortDescription,
        category: validated.category,
        tags: JSON.stringify(validated.tags || []),
        startDate: new Date(validated.startDate),
        endDate: validated.endDate ? new Date(validated.endDate) : null,
        doorsOpen: validated.doorsOpen ? new Date(validated.doorsOpen) : null,
        timezone: validated.timezone,
        locationType: validated.locationType,
        venueName: validated.venueName,
        venueAddress: validated.venueAddress,
        city: validated.city,
        state: validated.state,
        country: validated.country,
        virtualUrl: validated.virtualUrl,
        totalCapacity: validated.totalCapacity,
        resaleEnabled: validated.resaleEnabled,
        maxResaleMarkupBps: validated.maxResaleMarkupBps,
        resaleRoyaltyBps: validated.resaleRoyaltyBps,
        status: 'DRAFT',
        organizerId: 'temp-user-id', // TODO: Get from session
        ticketTiers: {
          create: validated.tiers.map((tier) => ({
            name: tier.name,
            description: tier.description,
            priceUsd: tier.priceUsd,
            totalQuantity: tier.totalQuantity,
            maxPerWallet: tier.maxPerWallet,
            saleStartDate: tier.saleStartDate ? new Date(tier.saleStartDate) : null,
            saleEndDate: tier.saleEndDate ? new Date(tier.saleEndDate) : null,
            perks: JSON.stringify(tier.perks || []),
          })),
        },
      },
      include: {
        ticketTiers: true,
      },
    });

    return NextResponse.json(event, { status: 201 });
  } catch (error) {
    console.error('Error creating event:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to create event' },
      { status: 500 }
    );
  }
}
